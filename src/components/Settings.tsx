import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, ThemeType } from '../types';
import { Check, Palette, Settings as SettingsIcon, ShieldCheck, Zap, Plus, Trash2, Play, Download, Upload, Database, FileText, RefreshCw, CheckCircle2, Server, X } from 'lucide-react';
import PromptPresetManagerModal from './PromptPresetManagerModal';
import { useStore } from '../store/useStore';
import confetti from 'canvas-confetti';
import { toast } from '../utils/toast';
import { ProxyConfig } from '../types';
import { ragService } from '../services/ragService';

type TabType = 'general' | 'appearance' | 'api';

/**
 * Hàm sắp xếp danh sách models theo đúng yêu cầu đặc biệt của người dùng:
 * 1. Chữ Latinh xếp ở trên (ưu tiên hơn số và các ký tự đặc biệt).
 * 2. Đến số (số lớn xếp ở trên).
 * 3. Đến ký tự Latinh thì ký tự Latinh trước tiên (chữ Latinh xếp ở trên).
 * 4. Nếu phần đầu giống nhau hết thì cái nào ngắn hơn sẽ xếp ở trên.
 */
export function sortModels(models: string[]): string[] {
  const parseToken = (s: string) => {
    return s.match(/([a-zA-Z]+)|([0-9]+(?:\.[0-9]+)?)|([^a-zA-Z0-9])/g) || [];
  };

  return [...models].sort((a, b) => {
    if (a === b) return 0;
    
    const tokensA = parseToken(a);
    const tokensB = parseToken(b);
    const minLen = Math.min(tokensA.length, tokensB.length);

    for (let i = 0; i < minLen; i++) {
      const tA = tokensA[i];
      const tB = tokensB[i];

      if (tA === tB) continue;

      const isLatA = /^[a-zA-Z]+$/.test(tA);
      const isLatB = /^[a-zA-Z]+$/.test(tB);
      const isNumA = /^[0-9]+(?:\.[0-9]+)?$/.test(tA);
      const isNumB = /^[0-9]+(?:\.[0-9]+)?$/.test(tB);

      // 1. Chữ Latinh xếp trên số hoặc ký tự khác
      if (isLatA && !isLatB) return -1;
      if (!isLatA && isLatB) return 1;

      // 2. Cả hai là chữ Latinh -> chữ Latinh xếp trước (mặc định bảng chữ cái)
      if (isLatA && isLatB) {
        return tA.localeCompare(tB);
      }

      // 3. Số xếp trên ký tự đặc biệt khác
      if (isNumA && !isNumB) return -1;
      if (!isNumA && isNumB) return 1;

      // 4. Cả hai đều là Số -> số lớn hơn xếp ở trên (giảm dần)
      if (isNumA && isNumB) {
        const valA = parseFloat(tA);
        const valB = parseFloat(tB);
        if (valA !== valB) {
          return valB - valA; // Số lớn hơn xếp ở trên
        }
      }

      // 5. Nếu cùng loại ký tự khác -> so sánh thông thường
      const comp = tA.localeCompare(tB);
      if (comp !== 0) return comp;
    }

    // 6. Nếu phần đầu giống nhau hết thì cái nào ngắn hơn xếp ở trên
    return a.length - b.length;
  });
}

function ThemeCard({ theme, isActive, onSelect, currentTheme }: { 
  theme: any, 
  isActive: boolean, 
  onSelect: () => void, 
  currentTheme: any 
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`flex flex-col p-5 rounded-2xl border-2 transition-all duration-500 text-left relative overflow-hidden group cursor-pointer ${
        isActive 
          ? theme.accentClass.split(' ')[1] || 'border-current'
          : `border-transparent theme-panel shadow-none border border-transparent theme-panel-hover`
      }`}
    >
      {/* Theme Preview Background */}
      <div className={`absolute inset-0 opacity-10 transition-transform duration-700 group-hover:scale-110 ${theme.bgClass}`} />
      
      <div className="flex items-center justify-between z-10 w-full">
        <span className={`text-sm font-bold truncate pr-2 ${isActive ? currentTheme.textPrimary : theme.textPrimary}`}>
          {theme.name}
        </span>
        {isActive && (
          <div className="p-1 rounded-full shrink-0" style={{ backgroundColor: currentTheme.accentHex || '#fff' }}>
            <Check className="w-3 h-3 text-black" />
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-1 z-10">
        <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: theme.accentHex }} />
        <div className="w-6 h-1.5 rounded-full bg-gray-500/20" />
      </div>
    </motion.button>
  );
}

export default function Settings() {
  const currentTheme = useStore(state => state.theme);
  const setTheme = useStore(state => state.setTheme);
  const proxies = useStore(state => state.proxies);
  const activeProxyId = useStore(state => state.activeProxyId);
  const addProxy = useStore(state => state.addProxy);
  const updateProxy = useStore(state => state.updateProxy);
  const removeProxy = useStore(state => state.removeProxy);
  const setActiveProxy = useStore(state => state.setActiveProxy);
  const globalProxyEnabled = useStore(state => state.globalProxyEnabled);
  const setGlobalProxyEnabled = useStore(state => state.setGlobalProxyEnabled);
  const personalApiKeys = useStore(state => state.personalApiKeys);
  const addPersonalApiKey = useStore(state => state.addPersonalApiKey);
  const removePersonalApiKey = useStore(state => state.removePersonalApiKey);
  const clearApiConfig = useStore(state => state.clearApiConfig);
  const targetWordCount = useStore(state => state.targetWordCount);
  const setTargetWordCount = useStore(state => state.setTargetWordCount);
  const temperature = useStore(state => state.temperature);
  const setTemperature = useStore(state => state.setTemperature);
  const topP = useStore(state => state.topP);
  const setTopP = useStore(state => state.setTopP);
  const topK = useStore(state => state.topK);
  const setTopK = useStore(state => state.setTopK);
  const fontFamily = useStore(state => state.fontFamily);
  const setFontFamily = useStore(state => state.setFontFamily);
  const fontSize = useStore(state => state.fontSize);
  const setFontSize = useStore(state => state.setFontSize);
  const uiMode = useStore(state => state.uiMode);
  const setUiMode = useStore(state => state.setUiMode);
  const resetSettings = useStore(state => state.resetSettings);
  const selectedAIModel = useStore(state => state.selectedAIModel);
  const setSelectedAIModel = useStore(state => state.setSelectedAIModel);
  const phoneAppControl = useStore((state) => state.phoneAppControl) || { messenger: true, discord: true };
  const setPhoneAppControl = useStore(state => state.setPhoneAppControl);
  const autoSaveEnabled = useStore(state => state.autoSaveEnabled);
  const setAutoSaveEnabled = useStore(state => state.setAutoSaveEnabled);
  const isFanfictionModeEnabled = useStore(state => state.isFanfictionModeEnabled);
  const setIsFanfictionModeEnabled = useStore(state => state.setIsFanfictionModeEnabled);
  const isVNDialogueModeEnabled = useStore(state => state.isVNDialogueModeEnabled);
  const setIsVNDialogueModeEnabled = useStore(state => state.setIsVNDialogueModeEnabled);
  const promptPresets = useStore(state => state.promptPresets) || [];
  const addPromptPreset = useStore(state => state.addPromptPreset);
  const removePromptPreset = useStore(state => state.removePromptPreset);
  const togglePromptPreset = useStore(state => state.togglePromptPreset);
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [proxyForm, setProxyForm] = useState<{ url: string, key: string, format: 'auto' | 'gemini' | 'openai' }>({ url: '', key: '', format: 'auto' });
  const [newPersonalKey, setNewPersonalKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingAllModels, setIsLoadingAllModels] = useState(false);
  const [editingProxyModelId, setEditingProxyModelId] = useState<string | null>(null);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const handleExportAllConfig = () => {
    try {
      const state = useStore.getState();
      const exportData: any = {
        metadata: {
          app: "Matrix Lite v6",
          exportedAt: new Date().toISOString(),
          version: "5.0"
        },
        settings: {
          currentThemeId: state.currentThemeId,
          theme: state.theme,
          proxies: state.proxies,
          activeProxyId: state.activeProxyId,
          personalApiKeys: state.personalApiKeys,
          targetWordCount: state.targetWordCount,
          temperature: state.temperature,
          fontFamily: state.fontFamily,
          fontSize: state.fontSize,
          uiMode: state.uiMode,
          selectedAIModel: state.selectedAIModel,
          autoSaveEnabled: state.autoSaveEnabled,
          useColorEnabled: state.useColorEnabled,
          colorConfig: state.colorConfig,
          isDramaticEnabled: state.isDramaticEnabled,
          isStrictEndEnabled: state.isStrictEndEnabled,
          isSuggestionsLocked: state.isSuggestionsLocked,
          memoryFullTurnsCount: state.memoryFullTurnsCount,
          memoryLogsCount: state.memoryLogsCount
        }
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `matrix_lite_v6_config_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Đã xuất tệp cấu hình hệ thống thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Gặp lỗi khi xuất tệp cấu hình.");
    }
  };

  const handleImportAllConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        
        // Validation check
        if (!imported || !imported.metadata?.app?.toString().startsWith("Matrix Lite")) {
          toast.error("Tệp tin không hợp lệ hoặc không thuộc về dự án Matrix Lite.");
          return;
        }

        const settings = imported.settings;
        if (!settings) {
          toast.error("Không tìm thấy dữ liệu cấu hình trong tệp tin.");
          return;
        }

        // Tạo object để update store
        const updateObj: any = {};
        const allowedKeys = [
          'currentThemeId', 'theme', 'proxies', 'activeProxyId', 'personalApiKeys',
          'targetWordCount', 'temperature', 'fontFamily', 'fontSize', 'uiMode',
          'selectedAIModel', 'autoSaveEnabled', 'useColorEnabled', 'colorConfig',
          'isDramaticEnabled', 'isStrictEndEnabled', 'isSuggestionsLocked', 'isFanfictionModeEnabled',
          'memoryFullTurnsCount', 'memoryLogsCount'
        ];

        allowedKeys.forEach(key => {
          if (settings[key] !== undefined) {
            updateObj[key] = settings[key];
          }
        });

        // Cập nhật Zustand Store
        useStore.setState(updateObj);
        
        // Thổi pháo hoa ăn mừng và thông báo thành công
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        toast.success("Đã khôi phục cấu hình và trạng thái thiết lập thành công!");
        setIsBackupModalOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("Gặp lỗi khi xử lý tệp tin JSON cấu hình.");
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  const loadModelsForProxies = async (targetProxies: ProxyConfig[]) => {
    setIsLoadingAllModels(true);
    let successCount = 0;
    
    await Promise.all(targetProxies.map(async (proxy) => {
      try {
        let baseUrl = proxy.url.trim().replace(/\/+$/, '');
        
        let data;
        let fetchSuccess = false;
        let serverErrorMsg = "";

        try {
          const res = await fetch('/api/proxy-models', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ baseUrl: proxy.url, key: proxy.key, format: proxy.format })
          });
          
          if (res.ok) {
            data = await res.json();
            fetchSuccess = true;
          } else {
             const errorData = await res.json();
             serverErrorMsg = errorData.error || `HTTP ${res.status}`;
          }
        } catch (apiErr) {
          console.warn('Backend /api/proxy-models is not available, falling back to direct fetch', apiErr);
        }

        if (!fetchSuccess) {
          // Fallback mechanism: direct fetch from client
          let cleanedUrl = proxy.url.trim().replace(/\/+$/, '');
          if (cleanedUrl.endsWith('/chat/completions')) {
             cleanedUrl = cleanedUrl.replace(/\/chat\/completions$/, '');
          }
          let baseWithoutSuffix = cleanedUrl.replace(/\/v1$/, '').replace(/\/v1beta$/, '');
          
          let possibleRequests: { url: string, headers: Record<string, string> }[] = [];
          
          const proxyKey = proxy.key ? proxy.key.trim() : '';

          const baseDirectHeaders: Record<string, string> = {};

          const openaiHeaders = { ...baseDirectHeaders };
          if (proxyKey) {
             openaiHeaders['Authorization'] = `Bearer ${proxyKey}`;
          }

          const geminiHeaders = { ...baseDirectHeaders };
          if (proxyKey) {
             geminiHeaders['x-goog-api-key'] = proxyKey;
             if (!proxy.url.includes('generativelanguage.googleapis.com')) {
               geminiHeaders['Authorization'] = `Bearer ${proxyKey}`;
             }
          }

          if (proxy.format === 'openai') {
            possibleRequests.push({ url: `${baseWithoutSuffix}/v1/models`, headers: openaiHeaders });
          } else if (proxy.format === 'gemini') {
            possibleRequests.push({ url: `${baseWithoutSuffix}/v1beta/models?key=${proxyKey}`, headers: geminiHeaders });
            possibleRequests.push({ url: `${baseWithoutSuffix}/v1beta/models`, headers: geminiHeaders });
          } else {
            possibleRequests.push({ url: `${baseWithoutSuffix}/v1/models`, headers: openaiHeaders });
            possibleRequests.push({ url: `${baseWithoutSuffix}/v1beta/models?key=${proxyKey}`, headers: geminiHeaders });
            possibleRequests.push({ url: `${baseWithoutSuffix}/v1beta/models`, headers: geminiHeaders });
          }
          if (!possibleRequests.some(r => r.url === `${cleanedUrl}/models`)) {
            possibleRequests.push({ url: `${cleanedUrl}/models`, headers: openaiHeaders });
          }
          
          let clientErrorMsg = "";
          for (const reqConfig of possibleRequests) {
            try {
               const directRes = await fetch(reqConfig.url, { headers: reqConfig.headers });
               if (directRes.ok) {
                  data = await directRes.json();
                  fetchSuccess = true;
                  break;
               } else {
                  clientErrorMsg = `HTTP ${directRes.status} từ trình duyệt`;
                  if (directRes.status === 401 || directRes.status === 403) {
                    break;
                  }
                  if (proxyKey && !reqConfig.url.includes('?key=')) {
                    const altRes = await fetch(`${reqConfig.url}?key=${proxyKey}`, { headers: reqConfig.headers });
                    if (altRes.ok) {
                      data = await altRes.json();
                      fetchSuccess = true;
                      break;
                    } else if (altRes.status === 401 || altRes.status === 403) {
                      break;
                    }
                  }
               }
            } catch (err: any) {
               clientErrorMsg = err.message || "Failed to fetch (CORS block)";
            }
          }
          
          if (!fetchSuccess) {
            // Silently try CORS proxies as last resort
            const corsProxies = [
              (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
              (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
            ];
            
            for (const proxyBuilder of corsProxies) {
              if (fetchSuccess) break;
              for (const reqConfig of possibleRequests) {
                try {
                  const corsUrl = proxyBuilder(reqConfig.url);
                  const corsRes = await fetch(corsUrl, { headers: reqConfig.headers });
                  if (corsRes.ok) {
                     data = await corsRes.json();
                     fetchSuccess = true;
                     break;
                  }
                } catch (ignored) {}
              }
            }
          }
          
          if (!fetchSuccess && clientErrorMsg) {
             serverErrorMsg = `Backend: ${serverErrorMsg} | Client: ${clientErrorMsg}`;
          }
        }
        
        let modelsListToSet: string[] = [];
        if (data) {
          if (Array.isArray(data)) {
            modelsListToSet = data.map((m: any) => typeof m === 'string' ? m : (m.id || m.name || ''));
          } else if (data.data && Array.isArray(data.data)) {
            modelsListToSet = data.data.map((m: any) => typeof m === 'string' ? m : (m.id || m.name || ''));
          } else if (data.models && Array.isArray(data.models)) {
            modelsListToSet = data.models.map((m: any) => typeof m === 'string' ? m : (m.name || m.id || ''));
          } else {
            const arrayField = Object.values(data).find(v => Array.isArray(v));
            if (arrayField && Array.isArray(arrayField)) {
              modelsListToSet = arrayField.map((m: any) => typeof m === 'string' ? m : (m.id || m.name || ''));
            }
          }
        }
        
        let models: string[] = modelsListToSet
          .map((m: any) => {
            if (typeof m !== 'string') return '';
            let cleaned = m.trim();
            if (cleaned.startsWith('models/')) {
              cleaned = cleaned.replace('models/', '');
            }
            return cleaned;
          })
          .filter(Boolean);

        if (models.length === 0) {
          if (!fetchSuccess && serverErrorMsg) {
             throw new Error(serverErrorMsg);
          }
          // Nếu fetch thành công nhưng server trả về mảng rỗng thì cũng xoá danh sách model
          updateProxy(proxy.id, { models: [], selectedModel: '' });
          return;
        }
        
        // Sắp xếp tự động danh sách models theo đúng yêu cầu: Ưu tiên models có chữ 'pro'
        const sortedModels = sortModels(models).sort((a, b) => {
          const aIsPro = a.toLowerCase().includes('pro');
          const bIsPro = b.toLowerCase().includes('pro');
          if (aIsPro && !bIsPro) return -1;
          if (!aIsPro && bIsPro) return 1;
          return 0;
        });
        
        let newSelectedModel = proxy.selectedModel;
        if (!newSelectedModel || !sortedModels.includes(newSelectedModel)) {
          newSelectedModel = sortedModels[0];
        }
        
        updateProxy(proxy.id, { models: sortedModels, selectedModel: newSelectedModel });
        successCount++;
      } catch (error: any) {
        console.warn(`[Proxy Load Models] Ngoại lệ khi tải models cho proxy ${proxy.name || proxy.id}:`, error);
        toast.error(`Lỗi tải proxy ${proxy.name || 'ẩn danh'}: ${error.message || 'Không xác định'}`);
        // Quan trọng: Phải xoá danh sách models rác (nếu có) từ lần cũ khi fetch thất bại để nó không lưu cache sai
        updateProxy(proxy.id, { models: [], selectedModel: '' });
      }
    }));

    setIsLoadingAllModels(false);
    return successCount;
  };

  const handleLoadAllModels = async () => {
    if (proxies.length === 0) {
      toast.info('Không có proxy nào để load models');
      return;
    }
    const count = await loadModelsForProxies(proxies);
    if (count > 0) {
      toast.success(`Đã tải models thành công cho ${count}/${proxies.length} proxy`);
    } else {
      toast.error('Không thể tải models cho proxy nào');
    }
  };

  const handleSetTheme = (themeId: ThemeType) => {
    setTheme(themeId);
    const selectedTheme = THEMES.find(t => t.id === themeId);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: [selectedTheme?.accentHex || '#ffffff']
    });
    toast.success(`Đã áp dụng giao diện ${selectedTheme?.name}`);
  };

  const handleAddProxy = async () => {
    if (!proxyForm.url) {
      toast.error('Vui lòng nhập URL proxy');
      return;
    }

    setIsTesting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const newProxy: ProxyConfig = {
        id: crypto.randomUUID(),
        name: `Proxy ${proxies.length + 1}`,
        url: proxyForm.url,
        key: proxyForm.key,
        format: proxyForm.format,
        createdAt: Date.now()
      };
      addProxy(newProxy);
      setProxyForm({ url: '', key: '', format: 'auto' });
      toast.success(`Kết nối thành công và đã lưu Proxy ${proxies.length + 1}`);
      loadModelsForProxies([newProxy]);
    } catch (error) {
      toast.error('Không thể kết nối tới proxy này');
    } finally {
      setIsTesting(false);
    }
  };

  const exportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(proxies));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "matrix_proxies.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('Đã xuất cấu hình thành công');
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          imported.forEach(p => addProxy(p));
          toast.success('Đã nhập cấu hình thành công');
        }
      } catch (err) {
        toast.error('File không hợp lệ');
      }
    };
    reader.readAsText(file);
  };

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let workingText = (event.target?.result as string) || '';
      
      // 1. Lọc tất cả Gemini API Keys (đặc điểm: AIzaSy + >= 30 ký tự)
      const geminiRegex = /AIzaSy[A-Za-z0-9_\-]{30,}/g;
      const geminiKeys = workingText.match(geminiRegex) || [];
      geminiKeys.forEach(k => workingText = workingText.replace(k, ' '));
      
      // 2. Lọc tất cả Proxy Keys đặc thù (vd: gg-*, sk-*, pk-*, dài >= 15)
      const specificKeyRegex = /(?:gg-[a-zA-Z0-9\-]+-|sk-[a-zA-Z0-9]+-|pk-[a-zA-Z0-9]+-|sk-)[A-Za-z0-9_\-]{15,}/gi;
      const specificKeys = workingText.match(specificKeyRegex) || [];
      specificKeys.forEach(k => workingText = workingText.replace(k, ' '));

      // 3. Lọc tất cả URLs
      const urlRegex = /https?:\/\/[a-zA-Z0-9\-._~]+(?::\d+)?(?:\/[a-zA-Z0-9\-._~%]*)*\b/gi;
      const urls = workingText.match(urlRegex) || [];
      urls.forEach(u => workingText = workingText.replace(u, ' '));

      // 4. Lọc các proxy keys dạng chuỗi ngẫu nhiên (dài >= 15 ký tự, chữ và số)
      const remainingWords = workingText.split(/[\s,|;="'<>\/\\[\]]+/).filter(Boolean);
      const otherKeys = remainingWords.filter(w => w.length >= 15 && /^[A-Za-z0-9_\-]+$/.test(w));
      
      const allProxyKeys = [...specificKeys, ...otherKeys];

      // Đặt API Key cá nhân
      geminiKeys.forEach(key => {
        addPersonalApiKey(key);
      });

      const proxyPairs: {url: string, key: string}[] = [];

      // Phân bổ các key cho URL
      urls.forEach((url, index) => {
         const key = allProxyKeys[index] || allProxyKeys[allProxyKeys.length - 1] || '';
         if (key) {
             proxyPairs.push({ url, key });
         }
      });
      
      // Nếu có nhiều key hơn url, ta ghép các key còn lại vào url cuối cùng
      const hasExtraKeys = allProxyKeys.length > urls.length;
      if (hasExtraKeys && urls.length > 0) {
        const lastUrl = urls[urls.length - 1];
        for (let i = urls.length; i < allProxyKeys.length; i++) {
           proxyPairs.push({ url: lastUrl, key: allProxyKeys[i] });
        }
      }

      const newProxies = proxyPairs.map((pair, i) => {
          const newProxy: ProxyConfig = {
            id: Math.random().toString(36).substring(7),
            name: `Proxy nhập từ TXT ${Math.floor(Math.random()*1000)}`,
            url: pair.url,
            key: pair.key,
            createdAt: Date.now()
          };
          addProxy(newProxy);
          return newProxy;
      });
      if (newProxies.length > 0) {
        loadModelsForProxies(newProxies);
      }

      if (geminiKeys.length > 0 || proxyPairs.length > 0) {
        toast.success(`Đã trích xuất thành công: ${geminiKeys.length > 0 ? geminiKeys.length + ' Gemini Key ' : ''}${proxyPairs.length > 0 ? (geminiKeys.length > 0 ? '& ' : '') + proxyPairs.length + ' Proxy ' : ''}từ tệp TXT!`);
      } else {
        toast.error('Không tìm thấy API Key hoặc cặp Proxy (URL+Key) hợp lệ trong tệp TXT.');
      }
      
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'general', label: 'Chung', icon: SettingsIcon },
    { id: 'appearance', label: 'Giao Diện', icon: Palette },
    { id: 'api', label: 'Api & Proxy', icon: ShieldCheck },
  ] as const;

  return (
    <div className="p-6 md:p-12 lg:p-16 pb-32 md:pb-16 w-full h-full overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16 px-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => {
                resetSettings();
              }}
              className={`py-3 px-8 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border-2 border-red-500/20 font-black tracking-widest transition-all cursor-pointer shadow-xl shadow-red-900/10 active:scale-95`}
            >
              RESET
            </button>
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className={`py-3 px-6 rounded-2xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-2 border-cyan-500/30 font-black tracking-widest transition-all cursor-pointer shadow-xl shadow-cyan-900/10 active:scale-95 flex items-center gap-2`}
            >
              <Database className="w-5 h-5 animate-pulse text-cyan-400" />
              TẢI/LOAD CẤU HÌNH
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 md:flex p-1.5 rounded-2xl theme-panel border-2 border-cyan-500/50 backdrop-blur-md self-start md:self-center gap-1.5 md:gap-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isDark = currentTheme.group === 'Dark';
              return (
                <button
                  key={`settings-navigation-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center md:justify-start gap-2 transition-all relative cursor-pointer ${
                    isActive 
                      ? (isDark ? currentTheme.textPrimary : 'text-white font-bold') 
                      : (isDark ? 'text-white/40 hover:text-white/70' : 'text-[#334155]/70 hover:text-[#0f172a]')
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-settings-tab"
                      className={`absolute inset-0 rounded-xl ${isDark ? 'theme-panel shadow-none border-transparent' : 'bg-slate-800 shadow-md border-transparent'}`}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon className={`w-4 h-4 z-10`} />
                  <span className="z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-16"
          >
            {activeTab === 'general' && (
              <section className="w-full space-y-12">
                <div className="p-8 rounded-[2.5rem] theme-panel border-transparent backdrop-blur-xl">
                  <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${currentTheme.textPrimary}`}>
                    <FileText className="w-6 h-6 text-blue-400" /> Ngữ cảnh & Giao diện
                  </h3>
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>P&P Manager</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>
                          Prompt & Preset Manager - Tải các tệp json/txt, sắp xếp và quản lý ngữ cảnh
                        </p>
                      </div>
                      <button 
                        onClick={() => setIsPresetManagerOpen(true)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                          currentTheme.group === 'Dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                        }`}
                      >
                        <SettingsIcon size={16} /> Mở Bảng MANAGER
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-black/5 dark:bg-white/5 backdrop-blur-[1.5px] z-10 flex items-center justify-center">
                         <span className="text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-full text-center">Tạm khóa do giới hạn API Key Free</span>
                      </div>
                      <div className="opacity-40 pointer-events-none w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className={`font-bold ${currentTheme.textPrimary}`}>Mô hình AI chính</p>
                          <p className={`text-sm ${currentTheme.textSecondary}`}>Thay đổi khi gặp lỗi 429 Hết hạn ngạch / Quota Limits</p>
                        </div>
                        <select 
                          value={selectedAIModel}
                          onChange={(e) => {
                            setSelectedAIModel(e.target.value);
                            toast.success(`Đã chọn mô hình: ${e.target.value}`);
                          }}
                          className="theme-input border-transparent rounded-xl px-4 py-2 theme-text-base outline-none focus:border-blue-500 min-w-[200px] text-sm"
                          disabled
                          >
                          {Array.from(new Set([
                            "gemini-3.7-flash",
                            "gemini-2.5-flash",
                            "gemini-2.5-pro",
                            "gemini-3.6-flash",
                            "gemini-3.5-flash",
                            ...(proxies.flatMap(p => p.models || []))
                          ])).map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Điện thoại (PHONE)</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>Bật/tắt toàn bộ các ứng dụng trong điện thoại</p>
                      </div>
                      <button
                        onClick={() => {
                          const next = !(phoneAppControl?.messenger || phoneAppControl?.discord);
                          setPhoneAppControl({ messenger: next, discord: next });
                          toast.success(next ? 'Đã bật Điện thoại' : 'Đã tắt Điện thoại');
                        }}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                          (phoneAppControl?.messenger || phoneAppControl?.discord) ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            (phoneAppControl?.messenger || phoneAppControl?.discord) ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Tự động lưu (Auto-Save)</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>Hệ thống sẽ tự động tạo file lưu trữ sau mỗi lượt chơi</p>
                      </div>
                      <button
                        onClick={() => {
                          const next = !autoSaveEnabled;
                          setAutoSaveEnabled(next);
                          toast.success(next ? 'Đã bật Tự động lưu' : 'Đã tắt Tự động lưu');
                        }}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                          autoSaveEnabled ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            autoSaveEnabled ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Chế độ Đồng Nhân (Fanfiction)</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>AI sẽ bám sát tác phẩm gốc, hạn chế bịa đặt thông tin</p>
                      </div>
                      <button
                        onClick={() => {
                          const next = !isFanfictionModeEnabled;
                          setIsFanfictionModeEnabled(next);
                          toast.success(next ? 'Đã bật Chế độ Đồng Nhân' : 'Đã tắt Chế độ Đồng Nhân');
                        }}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                          isFanfictionModeEnabled ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            isFanfictionModeEnabled ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Chế độ Hội thoại Light Novel</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>Định dạng thoại dùng Kaomoji (˵ ¬ᴗ¬˵) để biểu cảm thay vì động từ rập khuôn, và có cấu trúc: 【Tên】: Kaomoji 「Nội dung」 (Hỗ trợ tô màu chữ)</p>
                      </div>
                      <button
                        onClick={() => {
                          const next = !isVNDialogueModeEnabled;
                          setIsVNDialogueModeEnabled(next);
                          toast.success(next ? 'Đã bật Hội thoại Light Novel' : 'Đã tắt Hội thoại Light Novel');
                        }}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none cursor-pointer shrink-0 ${
                          isVNDialogueModeEnabled ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            isVNDialogueModeEnabled ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Số Chữ (Mục tiêu)</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>Số lượng chữ yêu cầu AI viết cho phần chính văn mỗi lượt</p>
                      </div>
                      <select 
                        value={targetWordCount}
                        onChange={(e) => setTargetWordCount(Number(e.target.value))}
                        className="theme-input border-transparent rounded-xl px-4 py-2 theme-text-base outline-none focus:border-blue-500 min-w-[140px]"
                        >
                        <option value={500}>500 chữ</option>
                        <option value={1000}>1000 chữ</option>
                        <option value={2000}>2000 chữ</option>
                        <option value={3000}>3000 chữ</option>
                        <option value={4000}>4000 chữ</option>
                        <option value={6000}>6000 chữ</option>
                        <option value={8000}>8000 chữ</option>
                        <option value={10000}>10000 chữ</option>
                      </select>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Temp</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>Độ sáng tạo của AI (Giá trị từ 0.0 đến 2.0). Mặc định là 1</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="0.05"
                          value={temperature}
                          onChange={(e) => setTemperature(Number(e.target.value))}
                          className="w-32 accent-blue-500"
                        />
                        <span className={`w-12 text-center text-sm font-mono ${currentTheme.textPrimary}`}>{temperature.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Top P</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>Độ đa dạng ngôn từ dựa trên phân phối xác suất tích lũy (Giá trị từ 0.0 đến 1.0). Mặc định là 0.95</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01"
                          value={topP}
                          onChange={(e) => setTopP(Number(e.target.value))}
                          className="w-32 accent-blue-500"
                        />
                        <span className={`w-12 text-center text-sm font-mono ${currentTheme.textPrimary}`}>{topP.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Top K</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>Giới hạn số lượng từ ứng viên tối đa được cân nhắc (Giá trị từ 1 đến 100). Mặc định là 40</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="1" 
                          max="100" 
                          step="1"
                          value={topK}
                          onChange={(e) => setTopK(Number(e.target.value))}
                          className="w-32 accent-blue-500"
                        />
                        <span className={`w-12 text-center text-sm font-mono ${currentTheme.textPrimary}`}>{topK}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Phông Chữ</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>Áp dụng 100% lên toàn bộ game</p>
                      </div>
                      <select 
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="theme-input border-transparent rounded-xl px-4 py-2 theme-text-base outline-none focus:border-blue-500 min-w-[180px]"
                        style={{ fontFamily: fontFamily }}
                      >
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Noto Sans">Noto Sans</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Lato">Lato</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Oswald">Oswald</option>
                        <option value="Raleway">Raleway</option>
                        <option value="Source Sans 3">Source Sans 3</option>
                        <option value="Nunito">Nunito</option>
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Merriweather">Merriweather</option>
                        <option value="Lora">Lora</option>
                        <option value="Fira Sans">Fira Sans</option>
                        <option value="Quicksand">Quicksand</option>
                        <option value="Work Sans">Work Sans</option>
                        <option value="Rubik">Rubik</option>
                        <option value="Inconsolata">Inconsolata</option>
                        <option value="Be Vietnam Pro">Be Vietnam Pro</option>
                      </select>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl theme-input border-transparent gap-4">
                      <div>
                        <p className={`font-bold ${currentTheme.textPrimary}`}>Cỡ Chữ (Base)</p>
                        <p className={`text-sm ${currentTheme.textSecondary}`}>Kích thước chữ gốc: {fontSize}px</p>
                      </div>
                      <input 
                        type="range"
                        min="10"
                        max="20"
                        step="1"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-32 md:w-48 accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'appearance' && (
              <>
                {/* Nhóm Giao Diện Tối */}
                <section>
                  <div className="flex items-center justify-between mb-8 px-4">
                    <h3 className={`text-2xl font-bold flex items-center gap-3 ${currentTheme.textPrimary}`}>
                      <div className="w-3 h-8 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                      Giao Diện Tối
                    </h3>
                    <span className={`text-sm font-mono opacity-50 ${currentTheme.textSecondary}`}>10 PRESETS</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {THEMES.filter(t => t.group === 'Dark').map((theme) => {
                      const isActive = currentTheme.id === theme.id;
                      return (
                        <ThemeCard 
                          key={`settings-theme-dark-${theme.id}`} 
                          theme={theme} 
                          isActive={isActive} 
                          onSelect={() => handleSetTheme(theme.id)} 
                          currentTheme={currentTheme}
                        />
                      );
                    })}
                  </div>
                </section>

                {/* Nhóm Giao Diện Sáng */}
                <section>
                  <div className="flex items-center justify-between mb-8 px-4">
                    <h3 className={`text-2xl font-bold flex items-center gap-3 ${currentTheme.textPrimary}`}>
                      <div className="w-3 h-8 bg-orange-400 rounded-full shadow-[0_0_15px_rgba(251,146,60,0.5)]" />
                      Giao Diện Sáng
                    </h3>
                    <span className={`text-sm font-mono opacity-50 ${currentTheme.textSecondary}`}>10 PRESETS</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {THEMES.filter(t => t.group === 'Light').map((theme) => {
                      const isActive = currentTheme.id === theme.id;
                      return (
                        <ThemeCard 
                          key={`settings-theme-light-${theme.id}`} 
                          theme={theme} 
                          isActive={isActive} 
                          onSelect={() => handleSetTheme(theme.id)} 
                          currentTheme={currentTheme}
                        />
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {activeTab === 'api' && (
              <div className="space-y-8">
                {/* Nút Tải TXT và CLEAR */}
                <div className="flex justify-end gap-3 pr-4">
                  <button 
                    onClick={() => {
                      clearApiConfig();
                    }}
                    className="py-2.5 px-6 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-red-900/10"
                  >
                    <Trash2 className="w-5 h-5" />
                    CLEAR
                  </button>
                  <label className="py-2.5 px-6 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-green-900/10">
                    <FileText className="w-5 h-5" />
                    Tải TXT
                    <input type="file" className="hidden" accept=".txt" onChange={handleTxtUpload} />
                  </label>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 text-left">
                  {/* Cột 1: Proxy Ngược */}
                <section className="space-y-8">
                  <div className="px-4 flex items-center justify-between">
                    <div>
                      <h3 className={`text-2xl font-bold ${currentTheme.textPrimary}`}>Proxy Ngược</h3>
                      <p className={`text-sm mt-1 ${currentTheme.textSecondary}`}>Quản lý các kết nối qua Proxy tùy chỉnh</p>
                    </div>
                    <div className="flex items-center gap-4">
                      
                      <button
                        onClick={handleLoadAllModels}
                        disabled={isLoadingAllModels || proxies.length === 0}
                        className="px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-all text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isLoadingAllModels ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Đang tải...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Load Models
                          </>
                        )}
                      </button>
                      <span className="text-xs font-mono opacity-30 text-white">{proxies.length} SAVED</span>
                    </div>
                  </div>

                  {/* Danh sách Proxy & Form Thêm Mới */}
                  <div className="space-y-6">
                    
                    {/* Các Proxy Đã Lưu (Có thể sửa trực tiếp) */}
                    {proxies.map((proxy, index) => (
                      <div 
                        key={`settings-proxy-${proxy.id}`}
                        className={`p-8 rounded-[2.5rem] border backdrop-blur-xl space-y-6 transition-all ${
                          activeProxyId === proxy.id 
                            ? 'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/20' 
                            : 'theme-panel border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <h3 className={`text-lg font-bold ${currentTheme.textPrimary} uppercase tracking-wider`}>Proxy {index + 1}</h3>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => removeProxy(proxy.id)}
                              className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                              title="Xóa Proxy"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2 text-left">
                            <label className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${currentTheme.textPrimary}`}>Proxy URL</label>
                            <input 
                              type="text"
                              value={proxy.url}
                              onChange={(e) => updateProxy(proxy.id, { url: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl theme-input border-transparent focus:border-blue-500/50 text-blue-400 outline-none text-sm font-mono transition-colors"
                            />
                          </div>
                          <div className="space-y-2 text-left">
                            <label className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${currentTheme.textPrimary}`}>Internal Key</label>
                            <input 
                              type="text"
                              value={proxy.key}
                              onChange={(e) => updateProxy(proxy.id, { key: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl theme-input border-transparent focus:border-blue-500/50 text-white/70 outline-none text-sm font-mono transition-colors"
                            />
                          </div>
                          
                          <div className="space-y-2 text-left">
                            <label className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${currentTheme.textPrimary}`}>Định dạng API (Format)</label>
                            <select
                              value={proxy.format || 'auto'}
                              onChange={(e) => updateProxy(proxy.id, { format: e.target.value as any })}
                              className="w-full px-5 py-4 rounded-xl theme-input border-transparent focus:border-blue-500/50 theme-text-base outline-none text-sm font-mono transition-colors">
                              <option value="auto">Tự Động Nhận Diện</option>
                              <option value="openai">Chuẩn OpenAI Compatbile</option>
                              <option value="gemini">Chuẩn Gemini Google</option>
                            </select>
                          </div>
                          
                          <div className="space-y-2 text-left">
                            <label className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${currentTheme.textPrimary}`}>Model AI</label>
                            <select
                              value={proxy.selectedModel || (proxy.models && proxy.models.length > 0 ? proxy.models[0] : '')}
                              onChange={(e) => updateProxy(proxy.id, { selectedModel: e.target.value })}
                              className="w-full px-5 py-4 rounded-xl theme-input border-transparent focus:border-blue-500/50 theme-text-base outline-none text-sm font-mono transition-colors">
                              {proxy.models && proxy.models.length > 0 ? (
                                proxy.models.map((modelChoice, idx) => (
                                  <option key={`settings-model-choice-${proxy.id}-${modelChoice}-${idx}`} value={modelChoice}>{modelChoice}</option>
                                ))
                              ) : (
                                <option value="" disabled>Hãy bấm Load Models để sử dụng proxy</option>
                              )}
                            </select>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            if (activeProxyId !== proxy.id) {
                              setActiveProxy(proxy.id);
                              toast.success(`Đã kích hoạt: Proxy ${index + 1}`);
                            } else {
                              setActiveProxy(null);
                              toast.info(`Đã hủy kích hoạt: Proxy ${index + 1}`);
                            }
                          }}
                          className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg ${
                            activeProxyId === proxy.id
                              ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                          }`}
                        >
                          {activeProxyId === proxy.id ? (
                            <>
                              <Check className="w-5 h-5" />
                              ĐANG SỬ DỤNG
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5 fill-current" />
                              KÍCH HOẠT PROXY NÀY
                            </>
                          )}
                        </button>
                      </div>
                    ))}

                    {/* Form Thêm Proxy (Luôn nằm dưới cùng) */}
                    <div className="p-8 rounded-[2.5rem] theme-panel border-transparent backdrop-blur-xl space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl theme-panel shadow-none border border-transparent text-white/50">
                          <Plus className="w-5 h-5" />
                        </div>
                        <h3 className={`text-lg font-bold ${currentTheme.textPrimary} uppercase tracking-wider`}>Proxy {proxies.length + 1}</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2 text-left">
                          <label className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${currentTheme.textPrimary}`}>URL Proxy</label>
                          <input 
                            type="text"
                            placeholder="https://your-proxy-domain.com"
                            value={proxyForm.url}
                            onChange={(e) => setProxyForm({...proxyForm, url: e.target.value})}
                            className="w-full px-5 py-4 rounded-xl theme-input border-transparent theme-text-base outline-none focus:border-blue-500/50 transition-colors text-sm font-mono"
                          />
                        </div>
                        <div className="space-y-2 text-left">
                          <label className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${currentTheme.textPrimary}`}>API Key / Password</label>
                          <input 
                            type="text"
                            placeholder="••••••••••••••••"
                            value={proxyForm.key}
                            onChange={(e) => setProxyForm({...proxyForm, key: e.target.value})}
                            className="w-full px-5 py-4 rounded-xl theme-input border-transparent theme-text-base outline-none focus:border-blue-500/50 transition-colors text-sm font-mono"
                          />
                        </div>
                        <div className="space-y-2 text-left">
                          <label className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${currentTheme.textPrimary}`}>Định dạng API (Format)</label>
                          <select
                            value={proxyForm.format}
                            onChange={(e) => setProxyForm({...proxyForm, format: e.target.value as any})}
                            className="w-full px-5 py-4 rounded-xl theme-input border-transparent theme-text-base outline-none focus:border-blue-500/50 transition-colors text-sm font-mono">
                            <option value="auto">Tự Động Nhận Diện (Khuyên dùng)</option>
                            <option value="openai">Chuẩn OpenAI (Bao gồm Anthropic, Claude, v.v...)</option>
                            <option value="gemini">Chuẩn Gemini Google</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        onClick={handleAddProxy}
                        disabled={isTesting || !proxyForm.url}
                        className={`w-full py-4 rounded-xl bg-blue-600/30 hover:bg-blue-500 text-white font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer`}
                      >
                        {isTesting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <Plus className="w-5 h-5" />
                            THÊM VÀO DANH SÁCH
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-white/10 mt-6">
                    <button 
                      onClick={exportConfig}
                      className="flex-1 py-3 rounded-xl theme-panel border-transparent theme-panel-hover text-white text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Xuất JSON
                    </button>
                    <label className="flex-1 py-3 rounded-xl theme-panel border-transparent theme-panel-hover text-white text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer group text-center">
                      <Upload className="w-4 h-4" /> Nhập JSON
                      <input type="file" className="hidden" accept=".json" onChange={importConfig} />
                    </label>
                  </div>
                </section>
                {/* Cột 2: Api Key Cá Nhân */}
                  <section className="space-y-8 relative">
                  <div className="absolute inset-0 bg-black/5 dark:bg-white/5 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center rounded-3xl p-6 text-center shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]">
                     <span className="text-sm font-bold text-red-500 bg-red-500/10 px-4 py-2 rounded-full mb-3 border border-red-500/20">🔒 Tạm khóa API Key Cá Nhân</span>
                     <span className={`text-xs ${currentTheme.textSecondary} leading-relaxed max-w-sm`}>Chức năng bị khóa do API Key Free Tier của Google chỉ cho phép <b>250.000 tokens/phút</b>. Lượng ngữ cảnh của game quá lớn sẽ lập tức gây lỗi 429. Vui lòng dùng Proxy mặc định.</span>
                  </div>
                  <div className="opacity-30 pointer-events-none space-y-8">
                  <div className="px-4">
                    <h3 className={`text-2xl font-bold ${currentTheme.textPrimary}`}>Api Key Cá Nhân</h3>
                    <p className={`text-sm mt-1 ${currentTheme.textSecondary}`}>Thiết lập Gemini API Key của riêng bạn</p>
                  </div>
                  
                  <div className="p-8 rounded-[2.5rem] theme-panel border-transparent backdrop-blur-xl space-y-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-widest opacity-50 ${currentTheme.textPrimary}`}>Thêm Gemini API Key mới</label>
                        <div className="flex gap-2">
                          <input 
                            type="password"
                            placeholder="Nhập API Key bắt đầu bằng AIza..."
                            value={newPersonalKey}
                            onChange={(e) => setNewPersonalKey(e.target.value)}
                            className="flex-1 px-5 py-4 rounded-xl theme-input border-transparent theme-text-base outline-none focus:border-purple-500/50 transition-colors text-sm"
                          />
                          <button
                            onClick={() => {
                              if (newPersonalKey.trim()) {
                                addPersonalApiKey(newPersonalKey.trim());
                                setNewPersonalKey('');
                                toast.success('Đã thêm API Key thành công');
                              }
                            }}
                            className="p-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Danh sách keys */}
                    <div className="space-y-3">
                      {personalApiKeys.length === 0 ? (
                        <div className="p-6 rounded-2xl theme-panel border-transparent border-dashed text-center">
                          <p className={`text-xs ${currentTheme.textSecondary}`}>Chưa có API Key cá nhân nào được thêm.</p>
                        </div>
                      ) : (
                        personalApiKeys.map((key, index) => (
                          <div 
                            key={`settings-personal-key-${key}-${index}`}
                            className={`p-4 rounded-2xl border flex items-center justify-between group ${currentTheme.group === 'Dark' ? 'bg-black/30 border-white/5' : 'bg-black/5 border-black/10'}`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                <span className="text-xs font-bold">{index + 1}</span>
                              </div>
                              <p className={`text-xs font-mono truncate italic ${currentTheme.group === 'Dark' ? 'text-white/60' : 'text-slate-600'}`}>
                                {key.substring(0, 8)}••••••••{key.substring(key.length - 4)}
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                removePersonalApiKey(key);
                                toast.success('Đã xóa API Key');
                              }}
                              className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className={`p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20`}>
                      <p className="text-xs text-purple-400 leading-relaxed italic text-left">
                        * Ghi chú: Hệ thống sẽ tự động xoay vòng (round-robin) các Key trong danh sách. Nếu có Key bị lỗi sẽ tạm thời đưa vào danh sách đen.
                      </p>
                    </div>
                  </div>
                  </div>
                </section>
              </div>
            </div>
          )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Modal Tải/Load Cấu Hình Toàn Diện */}
      <AnimatePresence>
        {isBackupModalOpen && (
          <motion.div
            key="gameplay-backup-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={`w-full max-w-lg rounded-3xl p-6 md:p-8 border border-cyan-500/30 relative overflow-hidden shadow-2xl shadow-cyan-500/20 bg-slate-950`}
            >
              {/* Decorative glows */}
              <div className="absolute top-0 left-1/4 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-cyan-400 animate-pulse" />
                  <h3 className={`text-lg font-black uppercase tracking-widest text-white`}>
                    Tải / Load Cấu Hình & Gameplay
                  </h3>
                </div>
                <button
                  onClick={() => setIsBackupModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-xs md:text-sm opacity-75 text-slate-300 leading-relaxed">
                  Bảng điều khiển giúp bạn <b>Tải về máy (Backup)</b> hoặc <b>Nạp từ máy (Load)</b> toàn bộ các API keys, Proxy, cỡ chữ, font chữ, các ổ khóa thông minh, nút bấm và trạng thái cấu hình hệ thống của trò chơi.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export Button */}
                  <button
                    onClick={handleExportAllConfig}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-cyan-500/20 hover:border-cyan-500/50 bg-cyan-500/5 hover:bg-cyan-500/10 text-white transition-all group cursor-pointer active:scale-[0.98]"
                  >
                    <Download className="w-8 h-8 text-cyan-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm font-bold tracking-wider">XUẤT RA MÁY</span>
                    <span className="text-[10px] opacity-40 text-slate-400 mt-1 text-center font-mono">TẢI FILE CONFIG .JSON</span>
                  </button>

                  {/* Import Button */}
                  <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-purple-500/20 hover:border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 text-white transition-all group cursor-pointer active:scale-[0.98] text-center">
                    <Upload className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-sm font-bold tracking-wider">NẠP VÀO GAME</span>
                    <span className="text-[10px] opacity-40 text-slate-400 mt-1 font-mono">CHỌN TỆP CONFIG .JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportAllConfig}
                    />
                  </label>
                </div>

                {/* Close Button at the bottom */}
                <div className="pt-2">
                  <button
                    onClick={() => setIsBackupModalOpen(false)}
                    className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs md:text-sm font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 border border-white/10 hover:border-white/20"
                  >
                    ĐÓNG
                  </button>
                </div>
              </div>

              {/* Footer status indicator */}
              <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] opacity-40 text-slate-400 font-mono">
                <span>REMIX MATRIX LITE v6</span>
                <span>SECURE CONFIGURATION ENGINE</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <PromptPresetManagerModal isOpen={isPresetManagerOpen} onClose={() => setIsPresetManagerOpen(false)} />
    </div>
  );
}
