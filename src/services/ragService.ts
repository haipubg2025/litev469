import { get, set } from 'idb-keyval';
import { nanoid } from 'nanoid';
// @ts-ignore
import BM25Worker from '../workers/bm25.worker?worker';
import { extractTurnIndexFromText } from '../utils/memoryUtils';

export interface Memory {
  id: string;
  text: string;
  timestamp: number;
  isCore?: boolean;
  turnId?: string;
}

export interface SearchMemoryOptions {
  topK?: number;
  threshold?: number;
  entities?: string[];
  currentTurn?: number;
  proxy?: any;
}

export interface MemorySearchResult {
  core: Memory[];
  standard: Memory[];
  scores?: Record<string, number>;
}

// Bộ lọc Stop Words Tiếng Việt cho Fallback đồng bộ (Synchronous Fallback Engine)
const STOP_WORDS_FALLBACK = new Set([
  'bị', 'bởi', 'cả', 'các', 'cái', 'cần', 'càng', 'chỉ', 'chiếc', 'cho', 'chứ', 'chưa', 
  'chuyện', 'có', 'có_thể', 'cứ', 'của', 'cùng', 'cũng', 'đã', 'đang', 'đây', 'để', 
  'đến_nỗi', 'đều', 'điều', 'do', 'đó', 'được', 'dưới', 'gì', 'khi', 'không', 'là', 
  'lại', 'lên', 'lúc', 'mà', 'mỗi', 'một_cách', 'này', 'nên', 'nếu', 'ngay', 'nhiều', 
  'như', 'nhưng', 'những', 'nơi', 'nữa', 'phải', 'qua', 'ra', 'rằng', 'rất', 'rồi', 
  'sau', 'sẽ', 'so', 'sự', 'tại', 'theo', 'thì', 'trên', 'trong', 'trước', 'từ', 
  'từng', 'và', 'vẫn', 'vào', 'vậy', 'vì', 'việc', 'với', 'vừa'
]);

function removeVietnameseTonesFallback(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

class RAGService {
  // Biến ảo để tương thích ngược với code cũ trong Setting và Gameplay
  public downloadProgress = 100;
  public downloadStatus: 'idle' | 'downloading' | 'success' | 'error' = 'success';
  public currentModel = 'ai-native-hybrid-rag';
  
  public get getDownloadStatus() { return this.downloadStatus; }
  public get getDownloadProgress() { return this.downloadProgress; }

  // Các hàm ảo để không bị lỗi code cũ gọi đến
  public async checkModelCached() { return true; }
  public async forceCheckModelCached() { return true; }
  public async preloadModelFromSettings(onProgress?: (progress: number, status: string) => void) {
    if (onProgress) onProgress(100, 'success');
  }
  public async init(modelName?: string, onProgress?: (progress: number, status: string) => void) {
    if (onProgress) onProgress(100, 'success');
  }

  private getDBKey(saveId: string) {
    const cleanId = saveId || 'temp_session';
    return `rag_memories_${cleanId}`;
  }

  public async getMemories(saveId: string): Promise<Memory[]> {
    if (!saveId) return [];
    try {
      const data = await get(this.getDBKey(saveId));
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn("Không thể tải ký ức từ IndexedDB, sử dụng mảng rỗng:", err);
      return [];
    }
  }

  // Quản lý Web Worker (Đa luồng chống giật UI)
  private worker: Worker | null = null;
  private messageCounter = 0;
  private resolves = new Map<number, (value: any) => void>();
  private rejects = new Map<number, (reason?: any) => void>();
  private syncedSaveIds = new Set<string>();
  private isWorkerFailed = false;

  private initWorker() {
    if (typeof Worker === 'undefined' || this.isWorkerFailed) {
      return;
    }

    if (!this.worker) {
      try {
        this.worker = new BM25Worker();
        this.worker.onmessage = (e) => {
          const { type, messageId, payload } = e.data;
          if (type === 'ERROR') {
            const reject = this.rejects.get(messageId);
            if (reject) reject(new Error(payload));
          } else {
            const resolve = this.resolves.get(messageId);
            if (resolve) resolve(payload);
          }
          this.resolves.delete(messageId);
          this.rejects.delete(messageId);
        };
        this.worker.onerror = (err) => {
          console.warn("Web Worker RAG gặp sự cố, chuyển sang bộ xử lý nội bộ:", err);
          this.isWorkerFailed = true;
          // Giải phóng các promise đang đợi
          this.rejects.forEach((reject) => reject(err));
          this.resolves.clear();
          this.rejects.clear();
        };
      } catch (err) {
        console.warn("Không thể khởi tạo Web Worker RAG:", err);
        this.isWorkerFailed = true;
      }
    }
  }

  private runWorkerTask(type: string, payload: any): Promise<any> {
    this.initWorker();
    if (this.isWorkerFailed || !this.worker) {
      return Promise.reject(new Error("Worker is not available"));
    }

    return new Promise((resolve, reject) => {
      const messageId = ++this.messageCounter;
      this.resolves.set(messageId, resolve);
      this.rejects.set(messageId, reject);

      // Thêm timeout 10 giây phòng trường hợp Worker bị treo
      const timer = setTimeout(() => {
        if (this.rejects.has(messageId)) {
          this.resolves.delete(messageId);
          this.rejects.delete(messageId);
          reject(new Error("Worker task timed out"));
        }
      }, 10000);

      const wrappedResolve = (val: any) => {
        clearTimeout(timer);
        resolve(val);
      };
      this.resolves.set(messageId, wrappedResolve);

      try {
        this.worker!.postMessage({ type, messageId, payload });
      } catch (postErr) {
        clearTimeout(timer);
        this.resolves.delete(messageId);
        this.rejects.delete(messageId);
        reject(postErr);
      }
    });
  }

  private async syncWorkerCache(saveId: string, force: boolean = false) {
    if (this.syncedSaveIds.has(saveId) && !force) return;
    const memories = await this.getMemories(saveId);
    const standardMemories = memories.filter(m => !m.isCore);
    
    try {
      await this.runWorkerTask('SYNC_CACHE', { 
        saveId, 
        memories: standardMemories.map(m => ({
          id: m.id,
          text: m.text,
          timestamp: m.timestamp,
          turnId: m.turnId,
          isCore: m.isCore
        })) 
      });
      this.syncedSaveIds.add(saveId);
    } catch (err) {
      console.warn("Lỗi đồng bộ cache Worker RAG, dùng fallback nội bộ:", err);
    }
  }

  public async addMemory(saveId: string, text: string, isCore: boolean = false, proxy?: any, turnId?: string): Promise<Memory> {
    const memory: Memory = {
      id: nanoid(),
      text,
      timestamp: Date.now(),
      isCore,
      turnId
    };

    const targetId = saveId || 'temp_session';
    const memories = await this.getMemories(targetId);
    memories.push(memory);
    await set(this.getDBKey(targetId), memories);

    // Cập nhật lại Cache trên Worker
    await this.syncWorkerCache(targetId, true);

    return memory;
  }

  public async deleteMemoriesByTurnId(saveId: string, turnId: string) {
    if (!turnId) return;
    const memories = await this.getMemories(saveId);
    const updated = memories.filter(m => m.turnId !== turnId);
    if (updated.length !== memories.length) {
      await set(this.getDBKey(saveId), updated);
      await this.syncWorkerCache(saveId, true);
    }
  }

  // Thuật toán tìm kiếm Hybrid dự phòng chạy trực tiếp trên main thread nếu Web Worker gặp sự cố
  private synchronousSearchFallback(
    memories: Memory[],
    query: string,
    topK: number = 5,
    threshold: number = 0.1,
    entities: string[] = []
  ): { id: string; score: number }[] {
    const qLower = query.toLowerCase().trim();
    const qNoTone = removeVietnameseTonesFallback(qLower);
    const qWords = qLower.split(/\s+/).filter(w => w.length > 0 && !STOP_WORDS_FALLBACK.has(w));
    
    const cleanEntities = (entities || []).map(e => e.trim().toLowerCase()).filter(e => e.length > 1);

    const candidates = memories.map(m => {
      const mTextLower = m.text.toLowerCase();
      const mTextNoTone = removeVietnameseTonesFallback(mTextLower);
      let score = 0;

      // Word matching
      for (const w of qWords) {
        if (mTextLower.includes(w)) score += 1.5;
        const wNoTone = removeVietnameseTonesFallback(w);
        if (wNoTone.length > 2 && mTextNoTone.includes(wNoTone)) score += 0.8;
      }

      // Substring match
      if (qLower.length > 2 && mTextLower.includes(qLower)) score += 4.0;
      else if (qNoTone.length > 2 && mTextNoTone.includes(qNoTone)) score += 2.0;

      // Entity boost
      for (const ent of cleanEntities) {
        if (mTextLower.includes(ent)) score *= 1.3;
      }

      return { id: m.id, score };
    });

    return candidates
      .filter(c => c.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Thuật toán Hybrid Search đa luồng (BM25 + N-Gram Cosine + Recency + Entity)
  public async searchMemory(
    saveId: string,
    query: string,
    topKOrOptions: number | SearchMemoryOptions = 5,
    thresholdParam: number = 0.1,
    proxy?: any
  ): Promise<MemorySearchResult> {
    const memories = await this.getMemories(saveId);
    if (memories.length === 0) return { core: [], standard: [] };

    const coreMemories = memories.filter(m => m.isCore);
    const standardMemories = memories.filter(m => !m.isCore);

    let topK = 5;
    let threshold = 0.1;
    let entities: string[] = [];
    let currentTurn: number | undefined = undefined;

    if (typeof topKOrOptions === 'object' && topKOrOptions !== null) {
      topK = topKOrOptions.topK ?? 5;
      threshold = topKOrOptions.threshold ?? 0.1;
      entities = topKOrOptions.entities ?? [];
      currentTurn = topKOrOptions.currentTurn;
    } else if (typeof topKOrOptions === 'number') {
      topK = topKOrOptions;
      threshold = thresholdParam;
    }

    let searchResults: Array<{ id: string; score: number }> = [];

    try {
      // Đảm bảo Worker đã nạp dữ liệu
      await this.syncWorkerCache(saveId);

      // Ủy quyền tính toán cho luồng ngầm (Web Worker)
      searchResults = await this.runWorkerTask('SEARCH', {
        saveId,
        query,
        topK,
        threshold,
        entities,
        currentTurn
      });
    } catch (workerErr) {
      console.warn("Worker RAG lỗi, dùng fallback nội bộ:", workerErr);
      searchResults = this.synchronousSearchFallback(standardMemories, query, topK, threshold, entities);
    }

    // Lookup lại full Memory object từ DB nội bộ
    const scores: Record<string, number> = {};
    const standardResultMemories: Memory[] = [];

    for (const res of searchResults) {
      const mem = memories.find(m => m.id === res.id);
      if (mem) {
        scores[mem.id] = res.score;
        standardResultMemories.push(mem);
      }
    }

    // Sắp xếp ký ức theo phân cấp số lượt: lượt càng lớn (lượt càng mới) thì có độ ưu tiên càng cao
    standardResultMemories.sort((a, b) => {
      const turnA = extractTurnIndexFromText(a.text) ?? 0;
      const turnB = extractTurnIndexFromText(b.text) ?? 0;
      if (turnA !== turnB) {
        return turnB - turnA; // Turn lớn hơn xếp lên trước
      }
      return (scores[b.id] || 0) - (scores[a.id] || 0);
    });

    return {
      core: coreMemories,
      standard: standardResultMemories,
      scores
    };
  }

  /**
   * Lấy danh sách ký ức của N lượt chơi gần nhất (sắp xếp theo số lượt giảm dần)
   */
  public async getRecentTurnMemories(saveId: string, count: number = 10): Promise<Memory[]> {
    const memories = await this.getMemories(saveId);
    if (!memories || memories.length === 0) return [];

    const turnMemories = memories.filter(m => !m.isCore);
    turnMemories.sort((a, b) => {
      const turnA = extractTurnIndexFromText(a.text) ?? (a.timestamp || 0);
      const turnB = extractTurnIndexFromText(b.text) ?? (b.timestamp || 0);
      return turnB - turnA;
    });

    return turnMemories.slice(0, count);
  }

  public async retrieveContext(
    saveId: string,
    query: string,
    maxTokens: number = 1000,
    proxy?: any,
    options?: { entities?: string[]; currentTurn?: number }
  ): Promise<string> {
    const { core, standard } = await this.searchMemory(saveId, query, {
      topK: 6,
      threshold: 0.1,
      entities: options?.entities,
      currentTurn: options?.currentTurn,
      proxy
    });
    
    if (core.length === 0 && standard.length === 0) return "";

    let context = "--- NHỮNG KÝ ỨC VÀ KIẾN THỨC BẠN NHỚ LẠI ĐƯỢC ---\n\n";
    if (core.length > 0) {
      context += "[KÝ ỨC CỐT LÕI (Không bao giờ quên)]:\n";
      core.forEach(m => context += `- ${m.text}\n`);
      context += "\n";
    }

    if (standard.length > 0) {
      context += "[KÝ ỨC LIÊN QUAN ĐẾN HOÀN CẢNH HIỆN TẠI (ĐÃ TỰ ĐỘNG LỌC THEO THỜI GIAN & THỰC THỂ)]:\n";
      standard.forEach((m, idx) => context += `(${idx + 1}): ${m.text}\n\n`);
    }

    const approximateCharLimit = maxTokens * 4;
    if (context.length > approximateCharLimit) {
      return context.substring(0, approximateCharLimit) + "...";
    }
    return context + "\n------------------------------------------------";
  }

    public async updateMemory(saveId: string, memoryId: string, newText: string) {
    const memories = await this.getMemories(saveId);
    const updated = memories.map(m => m.id === memoryId ? { ...m, text: newText } : m);
    await set(this.getDBKey(saveId), updated);
    await this.syncWorkerCache(saveId, true);
  }

  public async deleteMemory(saveId: string, memoryId: string) {
    const memories = await this.getMemories(saveId);
    const updated = memories.filter(m => m.id !== memoryId);
    await set(this.getDBKey(saveId), updated);
    await this.syncWorkerCache(saveId, true);
  }

  public async clearAllMemories(saveId: string) {
    await set(this.getDBKey(saveId), []);
    await this.syncWorkerCache(saveId, true);
  }

  public async clearMemories(saveId: string) {
    await this.clearAllMemories(saveId);
  }

  public async setMemories(saveId: string, memories: Memory[]) {
    await set(this.getDBKey(saveId), memories || []);
    await this.syncWorkerCache(saveId, true);
  }

  public get isFallback() { return false; }
}

export const ragService = new RAGService();
