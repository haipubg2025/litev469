// Enhanced Hybrid RAG Worker: BM25 + Character N-Gram Vector Cosine + Temporal Recency + Entity Boosting
// Chạy trên Web Worker độc lập (đa luồng) 100% offline, 0 byte tải về, 0 tốn API Key.

// 1. Danh sách Stop Words Tiếng Việt tinh chỉnh (giữ lại các từ khóa ngữ cảnh quan trọng)
const STOP_WORDS = new Set([
  'bị', 'bởi', 'cả', 'các', 'cái', 'cần', 'càng', 'chỉ', 'chiếc', 'cho', 'chứ', 'chưa', 
  'chuyện', 'có', 'có_thể', 'cứ', 'của', 'cùng', 'cũng', 'đã', 'đang', 'đây', 'để', 
  'đến_nỗi', 'đều', 'điều', 'do', 'đó', 'được', 'dưới', 'gì', 'khi', 'không', 'là', 
  'lại', 'lên', 'lúc', 'mà', 'mỗi', 'một_cách', 'này', 'nên', 'nếu', 'ngay', 'nhiều', 
  'như', 'nhưng', 'những', 'nơi', 'nữa', 'phải', 'qua', 'ra', 'rằng', 'rất', 'rồi', 
  'sau', 'sẽ', 'so', 'sự', 'tại', 'theo', 'thì', 'trên', 'trong', 'trước', 'từ', 
  'từng', 'và', 'vẫn', 'vào', 'vậy', 'vì', 'việc', 'với', 'vừa'
]);

// 2. Chuyển đổi bỏ dấu tiếng Việt để đối sánh không dấu (Accent-insensitive)
function removeVietnameseTones(str: string, keepCase: boolean = false): string {
  if (!str) return '';
  const res = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  return keepCase ? res : res.toLowerCase();
}

// 3. Token ID Hashing: Chuyển string thành Integer ID để tiết kiệm bộ nhớ và tăng tốc độ xử lý
let nextTokenId = 1;
const tokenToId = new Map<string, number>();

function getTokenId(token: string, addIfMissing: boolean = true): number | undefined {
  let id = tokenToId.get(token);
  if (id !== undefined) return id;
  if (!addIfMissing) return undefined;
  id = nextTokenId++;
  tokenToId.set(token, id);
  return id;
}

// 4. Tokenizer: Sinh Word Unigrams, Bigrams, Trigrams (kèm phiên bản không dấu)
function tokenizeWords(text: string, addIfMissing: boolean = true): number[] {
  const cleanTextLower = text.toLowerCase().replace(/[^\p{L}\p{N}\s_]/gu, ' ');
  const cleanTextExact = text.replace(/[^\p{L}\p{N}\s_]/gu, ' ');
  
  const wordsLower = cleanTextLower.split(/\s+/).filter(w => w.length > 0 && !STOP_WORDS.has(w));
  const wordsExact = cleanTextExact.split(/\s+/).filter(w => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));
  
  const tokens: number[] = [];

  // Single word tokens (Unigrams)
  for (let i = 0; i < wordsLower.length; i++) {
    const wL = wordsLower[i];
    const wE = wordsExact[i];
    
    const id = getTokenId(wL, addIfMissing);
    if (id !== undefined) tokens.push(id);

    // Tokens phân biệt chữ hoa/thường (Exact Case Boost)
    if (wE !== wL) {
      const idEx = getTokenId(`ex_${wE}`, addIfMissing);
      if (idEx !== undefined) tokens.push(idEx);
    }

    // Thêm bản không dấu nếu khác bản có dấu
    const noTone = removeVietnameseTones(wL);
    if (noTone !== wL && noTone.length > 0) {
      const ntId = getTokenId(`nt_${noTone}`, addIfMissing);
      if (ntId !== undefined) tokens.push(ntId);
    }
  }

  // 2-word combinations (Bigrams)
  for (let i = 0; i < wordsLower.length - 1; i++) {
    const bigramL = `${wordsLower[i]}_${wordsLower[i + 1]}`;
    const bigramE = `${wordsExact[i]}_${wordsExact[i + 1]}`;
    
    const id = getTokenId(bigramL, addIfMissing);
    if (id !== undefined) tokens.push(id);

    // Tokens phân biệt chữ hoa/thường (Exact Case Boost)
    if (bigramE !== bigramL) {
      const idEx = getTokenId(`ex_${bigramE}`, addIfMissing);
      if (idEx !== undefined) tokens.push(idEx);
    }

    const noToneBigram = removeVietnameseTones(bigramL);
    if (noToneBigram !== bigramL) {
      const ntId = getTokenId(`nt_${noToneBigram}`, addIfMissing);
      if (ntId !== undefined) tokens.push(ntId);
    }
  }

  // 3-word combinations (Trigrams cho các thuật ngữ cụm từ ghép nhập vai)
  for (let i = 0; i < wordsLower.length - 2; i++) {
    const trigramL = `${wordsLower[i]}_${wordsLower[i + 1]}_${wordsLower[i + 2]}`;
    const trigramE = `${wordsExact[i]}_${wordsExact[i + 1]}_${wordsExact[i + 2]}`;
    
    const id = getTokenId(trigramL, addIfMissing);
    if (id !== undefined) tokens.push(id);
    
    // Tokens phân biệt chữ hoa/thường (Exact Case Boost)
    if (trigramE !== trigramL) {
      const idEx = getTokenId(`ex_${trigramE}`, addIfMissing);
      if (idEx !== undefined) tokens.push(idEx);
    }
  }

  return tokens;
}

// 5. Character Tri-gram Generator (Sparse Vector cho Cosine Similarity)
interface SparseVector {
  indices: number[];
  values: number[];
  norm: number;
}

function createCharacterTrigramVector(text: string, addIfMissing: boolean = true): SparseVector {
  const normalizedLower = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedExact = text.replace(/\s+/g, ' ').trim();
  const counts = new Map<number, number>();

  // Cắt chuỗi thành các cụm 3 ký tự liên tiếp (Bản Lowercase - Nhạy cao)
  for (let i = 0; i <= normalizedLower.length - 3; i++) {
    const tri = normalizedLower.substring(i, i + 3);
    const id = getTokenId(`chr3_${tri}`, addIfMissing);
    if (id !== undefined) {
      counts.set(id, (counts.get(id) || 0) + 1.0);
    }
  }

  // Thêm phiên bản không dấu để hỗ trợ tìm kiếm mờ
  const noTone = removeVietnameseTones(normalizedLower);
  if (noTone !== normalizedLower) {
    for (let i = 0; i <= noTone.length - 3; i++) {
      const tri = noTone.substring(i, i + 3);
      const id = getTokenId(`chr3_nt_${tri}`, addIfMissing);
      if (id !== undefined) {
        counts.set(id, (counts.get(id) || 0) + 0.7); // Trọng số nhỏ hơn một chút cho bản không dấu
      }
    }
  }
  
  // Thêm phiên bản Exact Case phân biệt chữ Hoa/Thường
  if (normalizedExact !== normalizedLower) {
    for (let i = 0; i <= normalizedExact.length - 3; i++) {
      const tri = normalizedExact.substring(i, i + 3);
      const triLower = normalizedLower.substring(i, i + 3);
      if (tri !== triLower) {
        const id = getTokenId(`chr3_ex_${tri}`, addIfMissing);
        if (id !== undefined) {
          counts.set(id, (counts.get(id) || 0) + 1.2); // Trọng số cao hơn cho match chính xác hoa/thường
        }
      }
    }
  }

  const indices: number[] = [];
  const values: number[] = [];
  let sumSquares = 0;

  for (const [id, count] of counts.entries()) {
    indices.push(id);
    values.push(count);
    sumSquares += count * count;
  }

  return {
    indices,
    values,
    norm: Math.sqrt(sumSquares) || 1.0,
  };
}

// Tính Cosine Similarity giữa 2 Sparse Vector
function computeCosineSimilarity(v1: SparseVector, v2: SparseVector): number {
  if (v1.norm === 0 || v2.norm === 0 || v1.indices.length === 0 || v2.indices.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let i = 0;
  let j = 0;

  while (i < v1.indices.length && j < v2.indices.length) {
    const idx1 = v1.indices[i];
    const idx2 = v2.indices[j];

    if (idx1 === idx2) {
      dotProduct += v1.values[i] * v2.values[j];
      i++;
      j++;
    } else if (idx1 < idx2) {
      i++;
    } else {
      j++;
    }
  }

  return dotProduct / (v1.norm * v2.norm);
}

// 6. Trích xuất chỉ số lượt chơi từ nội dung ký ức (nếu có dạng "Lượt X:")
function extractTurnIndex(text: string): number | null {
  const match = text.match(/Lượt\s+(\d+)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) return num;
  }
  return null;
}

// 7. Cấu trúc lưu trữ Cache
interface MemoryDoc {
  id: string;
  text: string;
  timestamp?: number;
  turnId?: string;
  isCore?: boolean;
}

interface CacheData {
  standardMemories: MemoryDoc[];
  docWordTokens: number[][];
  docTrigramVectors: SparseVector[];
  df: Record<number, number>;
  totalDocLength: number;
  avgDocLength: number;
}

const caches: Record<string, CacheData> = {};

// 8. Lắng nghe và xử lý đa luồng (Web Worker Event Listener)
self.onmessage = (e: MessageEvent) => {
  const { type, messageId, payload } = e.data;

  try {
    if (type === 'SYNC_CACHE') {
      const { saveId, memories } = payload as { saveId: string; memories: MemoryDoc[] };

      let totalDocLength = 0;
      const docWordTokens: number[][] = [];
      const docTrigramVectors: SparseVector[] = [];
      const df: Record<number, number> = {};

      for (const m of memories) {
        // Build Word Tokens cho BM25
        const tokens = tokenizeWords(m.text, true);
        docWordTokens.push(tokens);
        totalDocLength += tokens.length;

        const uniqueTokens = new Set(tokens);
        for (const t of uniqueTokens) {
          df[t] = (df[t] || 0) + 1;
        }

        // Build Tri-gram Vector cho Cosine Similarity (được sắp xếp theo index để so sánh nhanh)
        const trigramVec = createCharacterTrigramVector(m.text, true);
        // Sắp xếp indices và values song song để dot product O(N+M)
        const paired = trigramVec.indices.map((idx, k) => ({ idx, val: trigramVec.values[k] }));
        paired.sort((a, b) => a.idx - b.idx);
        trigramVec.indices = paired.map(p => p.idx);
        trigramVec.values = paired.map(p => p.val);
        docTrigramVectors.push(trigramVec);
      }

      const N = memories.length;
      const avgDocLength = totalDocLength / Math.max(N, 1);

      caches[saveId] = {
        standardMemories: memories,
        docWordTokens,
        docTrigramVectors,
        df,
        totalDocLength,
        avgDocLength,
      };

      self.postMessage({ type: 'SYNC_CACHE_SUCCESS', messageId });
    } 
    else if (type === 'SEARCH') {
      const { saveId, query, topK = 5, threshold = 0.1, entities = [], currentTurn } = payload as {
        saveId: string;
        query: string;
        topK?: number;
        threshold?: number;
        entities?: string[];
        currentTurn?: number;
      };

      const cache = caches[saveId];

      if (!cache || cache.standardMemories.length === 0) {
        self.postMessage({ type: 'SEARCH_SUCCESS', messageId, payload: [] });
        return;
      }

      const { standardMemories, docWordTokens, docTrigramVectors, df, avgDocLength } = cache;
      const N = standardMemories.length;

      // Tokenize truy vấn (không tạo thêm token mới)
      const qTokenIds = tokenizeWords(query, false).filter((id): id is number => id !== undefined);
      const qTrigramVec = createCharacterTrigramVector(query, false);
      const paired = qTrigramVec.indices.map((idx, k) => ({ idx, val: qTrigramVec.values[k] }));
      paired.sort((a, b) => a.idx - b.idx);
      qTrigramVec.indices = paired.map(p => p.idx);
      qTrigramVec.values = paired.map(p => p.val);

      const k1 = 1.5;
      const b = 0.75;
      const queryLower = query.toLowerCase().trim();
      const queryNoTone = removeVietnameseTones(queryLower);

      // Chuẩn bị danh sách thực thể để boost điểm
      const cleanEntities = (entities || [])
        .filter(Boolean)
        .map(e => e.trim().toLowerCase())
        .filter(e => e.length > 1);

      const candidates: Array<{
        id: string;
        score: number;
        bm25Score: number;
        cosineScore: number;
        recencyBoost: number;
        entityBoost: number;
      }> = [];

      for (let i = 0; i < standardMemories.length; i++) {
        const memory = standardMemories[i];
        const tokens = docWordTokens[i];
        const docLength = tokens.length;
        const memTextLower = memory.text.toLowerCase();
        const memTextNoTone = removeVietnameseTones(memTextLower);

        // 1. Tính BM25 Score
        let bm25Score = 0;
        if (qTokenIds.length > 0) {
          const tf: Record<number, number> = {};
          for (const t of tokens) {
            tf[t] = (tf[t] || 0) + 1;
          }

          for (const qId of qTokenIds) {
            const fq = tf[qId] || 0;
            if (fq > 0) {
              const docFreq = df[qId] || 1;
              const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
              const termScore = idf * (fq * (k1 + 1)) / (fq + k1 * (1 - b + b * (docLength / Math.max(avgDocLength, 1))));
              bm25Score += termScore;
            }
          }
        }

        // 2. Tính Character Trigram Cosine Similarity (Fuzzy & Semantic Cosine)
        const trigramDocVec = docTrigramVectors[i];
        const cosineSim = computeCosineSimilarity(qTrigramVec, trigramDocVec);
        const cosineScore = cosineSim * 6.0; // Scale tương thích với dải điểm BM25

        // 3. Substring & Exact Match Boost
        let substringBoost = 0;
        if (query.length > 2 && memory.text.includes(query)) {
          substringBoost += 6.0; // Điểm thưởng rất lớn cho việc match chính xác tuyệt đối cả Hoa/Thường và Dấu
        } else if (queryLower.length > 2 && memTextLower.includes(queryLower)) {
          substringBoost += 4.0; // Match chính xác chuỗi nhưng khác hoa/thường
        } else if (queryNoTone.length > 2 && memTextNoTone.includes(queryNoTone)) {
          substringBoost += 2.5; // Match mờ không dấu
        }

        // 4. Entity Matching Boost (Tên NPC, Địa điểm, Bảo vật)
        let entityBoost = 1.0;
        if (cleanEntities.length > 0) {
          let matchedEntities = 0;
          for (const ent of cleanEntities) {
            if (memTextLower.includes(ent)) {
              matchedEntities++;
            }
          }
          if (matchedEntities > 0) {
            entityBoost += Math.min(0.8, matchedEntities * 0.3); // Boost tối đa +80%
          }
        }

        // 5. Temporal Recency Decay / Boost (Trọng số thời gian)
        let recencyBoost = 1.0;
        const memoryTurn = extractTurnIndex(memory.text);
        if (currentTurn !== undefined && currentTurn > 0 && memoryTurn !== null) {
          const deltaTurns = Math.max(0, currentTurn - memoryTurn);
          // Hàm suy giảm mũ nhẹ: lượt gần nhất được cộng tới +35%, giảm dần về 1.0 sau 20 lượt
          recencyBoost = 1.0 + 0.35 * Math.exp(-deltaTurns / 15);
        } else if (memory.timestamp) {
          const ageHours = (Date.now() - memory.timestamp) / (1000 * 60 * 60);
          if (ageHours < 24) {
            recencyBoost = 1.0 + 0.15 * Math.exp(-ageHours / 12);
          }
        }

        // 6. Tổng hợp điểm Hybrid (BM25 + Cosine + Substring) * EntityBoost * RecencyBoost
        const rawScore = (bm25Score + cosineScore + substringBoost);
        const finalScore = rawScore * entityBoost * recencyBoost;

        if (finalScore >= threshold) {
          candidates.push({
            id: memory.id,
            score: finalScore,
            bm25Score,
            cosineScore,
            recencyBoost,
            entityBoost,
          });
        }
      }

      // Sắp xếp theo điểm giảm dần
      candidates.sort((a, b) => b.score - a.score);

      // Dynamic Cutoff: Lọc bỏ các kết quả quá yếu so với ứng viên dẫn đầu
      let filteredResults = candidates;
      if (candidates.length > 0) {
        const topScore = candidates[0].score;
        const dynamicMinScore = Math.max(threshold, topScore * 0.25);
        filteredResults = candidates.filter(c => c.score >= dynamicMinScore);
      }

      const topResults = filteredResults.slice(0, topK);

      self.postMessage({ type: 'SEARCH_SUCCESS', messageId, payload: topResults });
    }
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', messageId, payload: error?.message || String(error) });
  }
};
