import { create } from "zustand";
import { persist, PersistStorage, StorageValue } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  ThemeType,
  ViewType,
  THEMES,
  ThemeConfig,
  ProxyConfig,
  GameMessage,
  SaveFile,
  StatusData,
  SystemLogItem,
  PromptPreset,
} from "../types";
import { storageService } from "../services/storageService";
import { ragService } from "../services/ragService";
import { ensureUniqueNpcIds } from "../utils/relationshipUtils";

export interface StreamStats {
  usedApiKey: boolean;
  activeApiKey?: string | null;
  usedProxy: string | null;
  model: string;
  firstResponseTimeMs: number | null;
  totalTimeMs: number | null;
  vietnameseWordCount: number;
  inputTokens: number;
  outputTokens: number;
  timestamp: number | null;
}

interface GameState {
  currentThemeId: ThemeType;
  currentView: ViewType;
  theme: ThemeConfig;
  proxies: ProxyConfig[];
  promptPresets: PromptPreset[];
  activeProxyId: string | null;
  personalApiKeys: string[];
  isFullScreenStream: boolean;
  isGeneratingStream: boolean;
  isGenerating?: boolean;
  streamStartTime: number | null;
  fullScreenStreamData: string;
  pendingReparseStreamData: string | null;
  setPendingReparseStreamData: (data: string | null) => void;
  systemLogs: SystemLogItem[];
  currentStreamStats: StreamStats | null;
  updateCurrentStreamStats: (
    stats: Partial<StreamStats> | ((prev: StreamStats | null) => StreamStats),
  ) => void;
  resetStreamStats: () => void;
  setSystemLogs: (
    log:
      | string
      | { message: string; type?: "error" | "notification" | "warning" }
      | SystemLogItem[]
      | ((prev: SystemLogItem[]) => SystemLogItem[]),
  ) => void;
  saves: SaveFile[];
  messages: GameMessage[];
  targetWordCount: number;
  temperature: number;
  topP: number;
  topK: number;
  fontFamily: string;
  fontSize: number;
  uiMode: "auto" | "pc" | "mobile";
  selectedAIModel: string;
  setUiMode: (mode: "auto" | "pc" | "mobile") => void;
  setSelectedAIModel: (model: string) => void;
  // World Creation State
  worldCreation: {
    blankSlateMode?: boolean;
    playerRules?: string;
    initialIdea: string;
    developedIdea: string;
    mcIdea?: string;
    npcIdea?: string;
    locationIdea?: string;
    referenceImages?: string[];
    mcReferenceImages?: string[];
    npcReferenceImages?: string[];
    locationReferenceImages?: string[];
    worldData: {
      name: string;
      difficulty: {
        sfw: string;
        nsfw: string;
      };
      background: string;
      starterTimeline: string;
      starterScenario: string;
      worldRules: string;
      namingConventions: string;
      genre: string;
      mainMood: string;
      pacing: string;
      geography: string;
      worldHistory: string;
      culture: string;
      economy: string;
      religion: string;
      factions: string;
      factionRelations: string;
      uniqueElements: string;
      powerSystem: string;
      logicControl: string;
      writingStyle: string;
      narrativePerspective: string;
      worldState: string;
    };
    mcsData?: Array<any>;
    selectedMcIndex?: number;
    mcTemplateMode?: "default" | "custom";
    npcTemplateMode?: "default" | "custom";
    disableDefaultNpcRelationships?: boolean;
    customMcFields?: Array<{ id: string; label: string; type: "input" | "textarea"; description?: string; aiRequirement?: string; isArray?: boolean; subFields?: Array<{ label: string; description: string; aiRequirement: string }> }>;
    customNpcFields?: Array<{ id: string; label: string; type: "input" | "textarea"; description?: string; aiRequirement?: string; isArray?: boolean; subFields?: Array<{ label: string; description: string; aiRequirement: string }> }>;
    customMcConditions?: {
      enabled: boolean;
      groups?: Array<{
        id: string;
        name?: string;
        logicOperator?: 'AND' | 'OR';
        conditions: Array<{
          id?: string;
          fieldId: string;
          valueType: 'number' | 'text';
          numOperator?: string;
          threshold?: number;
          thresholdMax?: number;
          textOperator?: string;
          textValue?: string;
        }>;
        targetFieldIds: string[];
        referenceFieldId?: string;
        rules?: Array<{ targetFieldId: string; threshold: number; operator?: string }>;
      }>;
      referenceFieldId?: string;
      rules?: Array<{ targetFieldId: string; threshold: number; operator?: string }>;
    };
    customNpcConditions?: {
      enabled: boolean;
      groups?: Array<{
        id: string;
        name?: string;
        logicOperator?: 'AND' | 'OR';
        conditions: Array<{
          id?: string;
          fieldId: string;
          valueType: 'number' | 'text';
          numOperator?: string;
          threshold?: number;
          thresholdMax?: number;
          textOperator?: string;
          textValue?: string;
        }>;
        targetFieldIds: string[];
        referenceFieldId?: string;
        rules?: Array<{ targetFieldId: string; threshold: number; operator?: string }>;
      }>;
      referenceFieldId?: string;
      rules?: Array<{ targetFieldId: string; threshold: number; operator?: string }>;
    };
    mcData: {
      name: string;
      fullName: string;
      titles: string;
      hideTitle?: boolean;
      occupation: string;
      gender: string;
      age: string;
      dob: string;
      height: string;
      weight: string;
      measurements: string;
      appearance: string;
      background: string;
      rank: string;
      powers: Array<{
        name: string;
        description: string;
        type?: string;
        level?: string;
      }>;
      skills: Array<{
        name: string;
        description: string;
        type?: string;
        level?: string;
      }>;
      personality: string;
      personalityCore: string;
      philosophy: string;
      distinguishingFeatures: string;
      innerSecret: string;
      impression?: string;
      relationships: Array<{
        name: string;
        relation: string;
        status?: string;
        impression?: string;
        termsOfAddress?: string[];
        selfAppellation?: string[];
        description: string;
      }>;
      loveViews: string;
      experience: string;
      nsfwPersonality: string;
      nsfwReactions: string;
      literaryDescription: string;
      goal: string;
      inventory: Array<{ name: string; description: string; quantity: number }>;
      statusData?: StatusData;
      customData?: Record<string, any>;
    };
    npcs: Array<{
      name: string;
      fullName: string;
      titles: string;
      hideTitle?: boolean;
      occupation: string;
      gender: string;
      age: string;
      dob: string;
      height: string;
      weight: string;
      measurements: string;
      appearance: string;
      appearanceLite: string;
      background: string;
      rank: string;
      powers: Array<{
        name: string;
        description: string;
        type?: string;
        level?: string;
      }>;
      skills: Array<{
        name: string;
        description: string;
        type?: string;
        level?: string;
      }>;
      role: string;
      personality: string;
      personalityCore: string;
      philosophy: string;
      distinguishingFeatures: string;
      innerSecret: string;
      impression?: string;
      relationships: Array<{
        name: string;
        relation: string;
        status?: string;
        impression?: string;
        termsOfAddress?: string[];
        selfAppellation?: string[];
        description: string;
      }>;
      loveViews: string;
      experience: string;
      nsfwPersonality: string;
      nsfwReactions: string;
      literaryDescription: string;
      goal: string;
      needs?: {
        sfw: string;
        nsfw: string;
      };
      preferences?: {
        sfw: string;
        nsfw: string;
      };
      isPinned?: boolean;
      statusData?: StatusData;
      pendingUpdates?: any;
      customData?: Record<string, any>;
    }>;
    worldDetails: {
      places: string;
      locations: Array<{ name: string; description: string }>;
    };
    mmoChatMessages?: Record<string, any[]>;
    phoneChats?: any[];
  };
  playerRules: string;
  setPlayerRules: (rules: string) => void;
  setTargetWordCount: (count: number) => void;
  setTemperature: (temp: number) => void;
  setTopP: (topP: number) => void;
  setTopK: (topK: number) => void;
  setFontFamily: (font: string) => void;
  setFontSize: (size: number) => void;
  setTheme: (themeId: ThemeType) => void;
  setView: (view: ViewType) => void;
  addProxy: (proxy: ProxyConfig) => void;
  updateProxy: (id: string, proxy: Partial<ProxyConfig>) => void;
  removeProxy: (id: string) => void;
  addPromptPreset: (preset: PromptPreset) => void;
  updatePromptPreset: (id: string, preset: Partial<PromptPreset>) => void;
  removePromptPreset: (id: string) => void;
  togglePromptPreset: (id: string) => void;
  clearPromptPresets: () => void;
  reorderPromptPresets: (startIndex: number, endIndex: number) => void;
  setActiveProxy: (id: string | null) => void;
  globalProxyEnabled: boolean;
  setGlobalProxyEnabled: (enabled: boolean) => void;
  addPersonalApiKey: (key: string) => void;
  removePersonalApiKey: (key: string) => void;
  setFullScreenStream: (active: boolean) => void;
  setIsGeneratingStream: (active: boolean) => void;
  updateStreamData: (data: string | ((prev: string) => string)) => void;
  updateWorldCreation: (
    data:
      | Partial<GameState["worldCreation"]>
      | ((state: GameState["worldCreation"]) => void),
  ) => void;
  resetWorldCreation: () => void;
  gameData: any;
  setGameData: (data: any) => void;
  setMessages: (
    messages: GameMessage[] | ((prev: GameMessage[]) => GameMessage[]),
  ) => void;
  saveCurrentGame: () => Promise<void>;
  autoSaveCurrentGame: () => Promise<void>;
  loadSave: (id: string) => Promise<boolean>;
  deleteSave: (id: string) => void;
  clearSaves: () => void;
  importSaves: (saves: SaveFile[]) => void;
  resumeLatestGame: () => Promise<boolean>;
  clearApiConfig: () => void;
  resetSettings: () => void;
  memoryFullTurnsCount: number;
  memoryLogsCount: number;
  setMemoryFullTurnsCount: (count: number) => void;
  setMemoryLogsCount: (count: number) => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  useColorEnabled: boolean;
  setUseColorEnabled: (enabled: boolean) => void;
  colorConfig: Record<string, string>;
  previousColorConfig: Record<string, string> | null;
  setColorConfig: (config: Record<string, string>) => void;
  resetColorConfig: () => void;
  undoColorConfig: () => void;
  isDramaticEnabled: boolean;
  setIsDramaticEnabled: (enabled: boolean) => void;
  dramaPrompt: string;
  setDramaPrompt: (prompt: string) => void;
  dramaChance: number;
  pendingDramaResult: any;
  setPendingDramaResult: (result: any) => void;
  setDramaChance: (chance: number) => void;
  
  
  isStrictEndEnabled: boolean;
  setIsStrictEndEnabled: (enabled: boolean) => void;
  isSuggestionsLocked: boolean;
  setIsSuggestionsLocked: (enabled: boolean) => void;
  isHardModeEnabled: boolean;
  setIsHardModeEnabled: (enabled: boolean) => void;
  isVNDialogueModeEnabled: boolean;
  setIsVNDialogueModeEnabled: (enabled: boolean) => void;
  isFanfictionModeEnabled: boolean;
  setIsFanfictionModeEnabled: (enabled: boolean) => void;
  actionSuggestionsConfig: string;
  setActionSuggestionsConfig: (config: string) => void;
  showTitles: boolean;
  setShowTitles: (show: boolean) => void;
  autoUpdateMc: boolean;
  autoUpdateNpc: boolean;
  autoUpdateCodex: boolean;
  setAutoUpdateMc: (val: boolean) => void;
  setAutoUpdateNpc: (val: boolean) => void;
  setAutoUpdateCodex: (val: boolean) => void;
  npcBuilder: {
    prompt: string;
    images: string[];
    generatedNPCs: any[];
    streamedText: string;
    streamedThought: string;
    isInputOpen: boolean;
    expandedNpcIndexes: number[];
  };
  setNpcBuilder: (data: Partial<GameState["npcBuilder"]>) => void;
  phoneWallpaper: string;
  setPhoneWallpaper: (url: string) => void;
  phoneTheme: 'dark' | 'light';
  setPhoneTheme: (theme: 'dark' | 'light') => void;
  phoneAppControl: { messenger: boolean; discord: boolean };
  setPhoneAppControl: (controls: { messenger?: boolean; discord?: boolean }) => void;
  unreadMessages: number;
  setUnreadMessages: (count: number) => void;
  messengerReadChatIds: Record<string, number>;
  setMessengerReadChatIds: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
}

const INITIAL_WORLD_CREATION = {
  blankSlateMode: true,
  playerRules: "",
  initialIdea: "",
  developedIdea: "",
  mcIdea: "",
  npcIdea: "",
  locationIdea: "",
  referenceImages: [],
  mcReferenceImages: [],
  npcReferenceImages: [],
  locationReferenceImages: [],
  worldData: {
    name: "",
    difficulty: {
      sfw: "",
      nsfw: "",
    },
    background: "",
    starterTimeline: "",
    starterScenario: "",
    worldRules: "",
    namingConventions: "",
    genre: "",
    mainMood: "",
    pacing: "",
    geography: "",
    worldHistory: "",
    culture: "",
    economy: "",
    religion: "",
    factions: "",
    factionRelations: "",
    uniqueElements: "",
    powerSystem: "",
    logicControl: "",
    writingStyle: "",
    narrativePerspective: "",
    worldState: "",
  },
  mcsData: [],
  selectedMcIndex: 0,
  mcData: {
    name: "",
    fullName: "",
    titles: "",
    hideTitle: false,
    occupation: "",
    gender: "",
    age: "",
    dob: "",
    height: "",
    weight: "",
    measurements: "",
    appearance: "",
    background: "",
    rank: "",
    powers: [],
    skills: [],
    personality: "",
    personalityCore: "",
    philosophy: "",
    distinguishingFeatures: "",
    innerSecret: "",
    impression: "",
    relationships: [],
    loveViews: "",
    experience: "",
    nsfwPersonality: "",
    nsfwReactions: "",
    literaryDescription: "",
    goal: "",
    inventory: [],
    statusData: {
      mood: [],
      psychological: [],
      physiological: [],
      health: [],
      condition: [],
    },
  },
  npcs: [
    {
      name: "",
      fullName: "",
      titles: "",
    hideTitle: false,
      occupation: "",
      gender: "",
      age: "",
      dob: "",
      height: "",
      weight: "",
      measurements: "",
      appearance: "",
      appearanceLite: "",
      background: "",
      rank: "",
      powers: [],
      skills: [],
      role: "",
      personality: "",
      personalityCore: "",
      philosophy: "",
      distinguishingFeatures: "",
      innerSecret: "",
      impression: "",
      relationships: [],
      loveViews: "",
      experience: "",
      nsfwPersonality: "",
      nsfwReactions: "",
      literaryDescription: "",
      goal: "",
      needs: {
        sfw: "",
        nsfw: "",
      },
      preferences: {
        sfw: "",
        nsfw: "",
      },
      isPinned: false,
      statusData: {
        mood: [],
        psychological: [],
        physiological: [],
        health: [],
        condition: [],
      },
    },
  ],
  worldDetails: {
    places: "",
    locations: [],
  },
  mmoChatMessages: {},
  phoneChats: [],
  disableDefaultNpcRelationships: false,
};

const PARTITION_KEYS = {
  settings: "game-settings-v1",
  presets: "game-presets-v1",
  worldCreation: "game-worldcreation-v1",
  saves: "game-saves-v1",
  logs: "game-logs-v1",
};

let saveTimeout: any = null;
let pendingResolves: (() => void)[] = [];
let cachedSaveMap: Record<string, number> = {};

const customIdbStorage: PersistStorage<GameState> = {
  getItem: async (name: string): Promise<StorageValue<GameState> | null> => {
    try {
      // 1. Đọc dữ liệu từ các phần lưu trữ độc lập
      const [settingsPart, presetsPart, worldCreationPart, savesPart, logsPart] = await Promise.all([
        storageService.loadItem<any>(PARTITION_KEYS.settings).catch(() => null),
        storageService.loadItem<any>(PARTITION_KEYS.presets).catch(() => null),
        storageService.loadItem<any>(PARTITION_KEYS.worldCreation).catch(() => null),
        storageService.loadItem<any>(PARTITION_KEYS.saves).catch(() => null),
        storageService.loadItem<any>(PARTITION_KEYS.logs).catch(() => null),
      ]);

      // Nếu bất kỳ phân vùng mới nào tồn tại, ghép lại an toàn
      if (settingsPart || presetsPart || worldCreationPart || savesPart || logsPart) {
        let loadedSaves: any[] = [];
        try {
          const allKeys = await storageService.getAllKeys();
          const saveKeys = allKeys.filter((k: string) => k.startsWith('save_file_'));
          const saves = await Promise.all(saveKeys.map((k: string) => storageService.loadItem(k)));
          loadedSaves = saves.filter(s => s !== null);
        } catch(err) {
          console.error("Lỗi khi load decentralized saves:", err);
        }

        const combinedState: any = {
          ...(settingsPart || {}),
          ...(presetsPart || {}),
          ...(worldCreationPart || {}),
          ...(savesPart || {}),
          ...(logsPart || {}),
        };
        
        if (loadedSaves.length > 0) {
          combinedState.saves = loadedSaves;
          // Cập nhật lại cache map
          loadedSaves.forEach((s: any) => {
             if (s.id && s.updatedAt) {
                 cachedSaveMap[s.id] = s.updatedAt;
             }
          });
        }

        return {
          state: combinedState,
          version: 0,
        };
      }

      // 2. Nếu chưa có phân vùng mới, đọc từ tệp lưu cũ 'game-storage' để chuyển đổi tự động
      const oldVal = await storageService.loadItem<StorageValue<GameState>>(name);
      if (oldVal && oldVal.state) {
        // Tự động phân chia lưu vào các phân vùng độc lập cho lần sau
        await customIdbStorage.setItem(name, oldVal);
        return oldVal;
      }

      return null;
    } catch (err) {
      console.error("Lỗi khi đọc dữ liệu phân vùng IndexedDB:", err);
      return null;
    }
  },

  setItem: (name: string, value: StorageValue<GameState>): Promise<void> => {
    return new Promise((resolve) => {
      pendingResolves.push(resolve);
      if (saveTimeout) clearTimeout(saveTimeout);
      
      saveTimeout = setTimeout(async () => {
        const resolvesToCall = pendingResolves;
        pendingResolves = [];
        
        if (!value || !value.state) {
           resolvesToCall.forEach(r => r());
           return;
        }
        
        try {
            const state: any = value.state;
            
            // Tách dữ liệu thành 5 phân vùng độc lập hoàn toàn
            const settingsData = {
              currentThemeId: state.currentThemeId,
              theme: state.theme,
              proxies: state.proxies,
              activeProxyId: state.activeProxyId,
              personalApiKeys: state.personalApiKeys,
              targetWordCount: state.targetWordCount,
              temperature: state.temperature,
              topP: state.topP,
              topK: state.topK,
              fontFamily: state.fontFamily,
              fontSize: state.fontSize,
              uiMode: state.uiMode,
              selectedAIModel: state.selectedAIModel,
              memoryFullTurnsCount: state.memoryFullTurnsCount,
              memoryLogsCount: state.memoryLogsCount,
              autoSaveEnabled: state.autoSaveEnabled,
              autoUpdateMc: state.autoUpdateMc,
              autoUpdateNpc: state.autoUpdateNpc,
              autoUpdateCodex: state.autoUpdateCodex,
              useColorEnabled: state.useColorEnabled,
              colorConfig: state.colorConfig,
              isDramaticEnabled: state.isDramaticEnabled,
              isStrictEndEnabled: state.isStrictEndEnabled,
              isSuggestionsLocked: state.isSuggestionsLocked,
              isHardModeEnabled: state.isHardModeEnabled,
              phoneAppControl: state.phoneAppControl,
              isVNDialogueModeEnabled: state.isVNDialogueModeEnabled,
              isFanfictionModeEnabled: state.isFanfictionModeEnabled,
              actionSuggestionsConfig: state.actionSuggestionsConfig,
              showTitles: state.showTitles,
            };
        
            const presetsData = {
              promptPresets: state.promptPresets,
            };
        
            const worldCreationData = {
              worldCreation: state.worldCreation,
              playerRules: state.playerRules,
              npcBuilder: state.npcBuilder,
            };
        
            const savesData = {
              saves: state.saves,
              messengerReadChatIds: state.messengerReadChatIds,
              fullScreenStreamData: state.fullScreenStreamData,
            };
        
            const logsData = {
              systemLogs: state.systemLogs,
              currentStreamStats: state.currentStreamStats,
            };
        
            // Ghi riêng từng phân vùng trong try-catch, lỡ 1 cái lỗi cũng không ảnh hưởng các cái khác
            await Promise.all([
              storageService.saveItem(PARTITION_KEYS.settings, settingsData).catch(e => console.error("Lỗi lưu partition settings:", e)),
              storageService.saveItem(PARTITION_KEYS.presets, presetsData).catch(e => console.error("Lỗi lưu partition presets:", e)),
              storageService.saveItem(PARTITION_KEYS.worldCreation, worldCreationData).catch(e => console.error("Lỗi lưu partition worldCreation:", e)),
              (async () => {
                try {
                  const savesWithoutFullData = {
                    messengerReadChatIds: savesData.messengerReadChatIds,
                    fullScreenStreamData: savesData.fullScreenStreamData,
                    saves: [] // array rỗng để tránh lưu đè
                  };
                  
                  await storageService.saveItem(PARTITION_KEYS.saves, savesWithoutFullData);
                  
                  // Lưu từng save riêng biệt - CHỈ LƯU NHỮNG SAVE BỊ THAY ĐỔI DỰA VÀO updatedAt
                  const savePromises = savesData.saves.map((s: any) => {
                     const prevUpdate = cachedSaveMap[s.id];
                     if (prevUpdate && prevUpdate === s.updatedAt) {
                         return Promise.resolve(); // Không thay đổi thì bỏ qua
                     }
                     cachedSaveMap[s.id] = s.updatedAt;
                     return storageService.saveItem(`save_file_${s.id}`, s).catch(e => console.error("Lỗi lưu tệp save:", s.id, e));
                  });
                  await Promise.all(savePromises);
                } catch (e) {
                  console.error("Lỗi lưu partition saves (decentralized):", e);
                }
              })(),
              storageService.saveItem(PARTITION_KEYS.logs, logsData).catch(e => console.error("Lỗi lưu partition logs:", e)),
            ]);
        } catch (error) {
            console.error("Lỗi trong setItem debounce:", error);
        }
        
        resolvesToCall.forEach(r => r());
      }, 2000);
    });
  },
  removeItem: async (name: string): Promise<void> => {
    await Promise.all([
      storageService.removeItem(PARTITION_KEYS.settings),
      storageService.removeItem(PARTITION_KEYS.presets),
      storageService.removeItem(PARTITION_KEYS.worldCreation),
      storageService.removeItem(PARTITION_KEYS.saves),
      storageService.removeItem(PARTITION_KEYS.logs),
      storageService.removeItem(name),
    ]);
  },
};

const sanitizeGameData = (gd: any) => {
  if (!gd || typeof gd !== "object") return gd;
  const clean = { ...gd };
  if (Array.isArray(clean.npcs)) {
    clean.npcs = ensureUniqueNpcIds(clean.npcs.filter(Boolean));
  }
  if (Array.isArray(clean.originalNpcs)) {
    clean.originalNpcs = ensureUniqueNpcIds(clean.originalNpcs.filter(Boolean));
  }
  if (clean.worldData && typeof clean.worldData === "object") {
    clean.worldData = { ...clean.worldData };
    if (Array.isArray(clean.worldData.npcs)) {
      clean.worldData.npcs = ensureUniqueNpcIds(clean.worldData.npcs.filter(Boolean));
    }
    if (Array.isArray(clean.worldData.locations)) {
      clean.worldData.locations = clean.worldData.locations.filter(Boolean);
    }
  }
  if (clean.mcData && typeof clean.mcData === "object") {
    clean.mcData = { ...clean.mcData };
    if (Array.isArray(clean.mcData.inventory)) {
      clean.mcData.inventory = clean.mcData.inventory.filter(Boolean);
    }
  }
  return clean;
};

export const useStore = create<GameState>()(
  persist(
    immer((set) => ({
      currentThemeId: "deepsea",
      currentView: "characters",
      theme: THEMES.find((t) => t.id === "deepsea") || THEMES[0],
      proxies: [],
      promptPresets: [],
      activeProxyId: null,
      globalProxyEnabled: true,
      personalApiKeys: [],
      isFullScreenStream: false,
      isGeneratingStream: false,
      streamStartTime: null,
      fullScreenStreamData: "",
      pendingReparseStreamData: null,
      setPendingReparseStreamData: (data) =>
        set((state) => {
          state.pendingReparseStreamData = data;
        }),
      systemLogs: [],
      currentStreamStats: null,
      updateCurrentStreamStats: (stats) =>
        set((state) => {
          if (typeof stats === "function") {
            state.currentStreamStats = stats(state.currentStreamStats);
          } else {
            if (!state.currentStreamStats) {
              state.currentStreamStats = {
                usedApiKey: false,
                usedProxy: null,
                model: "gemini-3.5-flash",
                firstResponseTimeMs: null,
                totalTimeMs: null,
                vietnameseWordCount: 0,
                inputTokens: 0,
                outputTokens: 0,
                timestamp: Date.now(),
              };
            }
            state.currentStreamStats = {
              ...state.currentStreamStats,
              ...stats,
            };
          }
        }),
      resetStreamStats: () =>
        set((state) => {
          state.currentStreamStats = null;
        }),
      worldCreation: INITIAL_WORLD_CREATION,
      saves: [],
      messages: [],
      targetWordCount: 2000,
      temperature: 1.0,
      topP: 0.95,
      topK: 40,
      fontFamily: "Inter",
      fontSize: 16,
      uiMode: "auto",
      selectedAIModel: "gemini-3.5-flash",
      playerRules: "",
      setUiMode: (mode) =>
        set((state) => {
          state.uiMode = mode;
        }),
      setSelectedAIModel: (model) =>
        set((state) => {
          state.selectedAIModel = model;
        }),
      setPlayerRules: (rules) =>
        set((state) => {
          state.playerRules = rules;
          if (state.gameData) {
            state.gameData.playerRules = rules;
          }
        }),
      setTheme: (themeId) =>
        set((state) => {
          const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
          state.currentThemeId = themeId;
          state.theme = theme;
        }),
      setView: (view) =>
        set((state) => {
          state.currentView = view;
        }),
      addProxy: (proxy) =>
        set((state) => {
          state.proxies = [
            ...state.proxies.filter((p) => p.id !== proxy.id),
            proxy,
          ];
          if (!state.activeProxyId) state.activeProxyId = proxy.id;
        }),
      updateProxy: (id, newProxy) =>
        set((state) => {
          const index = state.proxies.findIndex((p) => p.id === id);
          if (index !== -1) {
            state.proxies[index] = { ...state.proxies[index], ...newProxy };
          }
        }),
      removeProxy: (id) =>
        set((state) => {
          state.proxies = state.proxies.filter((p) => p.id !== id);
          if (state.activeProxyId === id) state.activeProxyId = null;
        }),
      addPromptPreset: (preset) =>
        set((state) => {
          if (!state.promptPresets) state.promptPresets = [];
          state.promptPresets.push(preset);
        }),
      updatePromptPreset: (id, newPreset) =>
        set((state) => {
          if (!state.promptPresets) state.promptPresets = [];
          const index = state.promptPresets.findIndex((p) => p.id === id);
          if (index >= 0) {
            state.promptPresets[index] = { ...state.promptPresets[index], ...newPreset };
          }
        }),
      removePromptPreset: (id) =>
        set((state) => {
          if (!state.promptPresets) state.promptPresets = [];
          state.promptPresets = state.promptPresets.filter((p) => p.id !== id);
        }),
      togglePromptPreset: (id) =>
        set((state) => {
          if (!state.promptPresets) state.promptPresets = [];
          const index = state.promptPresets.findIndex((p) => p.id === id);
          if (index >= 0) {
            state.promptPresets[index].isActive = !state.promptPresets[index].isActive;
          }
        }),
      clearPromptPresets: () =>
        set((state) => {
          state.promptPresets = [];
        }),
      reorderPromptPresets: (startIndex, endIndex) =>
        set((state) => {
          if (!state.promptPresets) return;
          const result = Array.from(state.promptPresets);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          state.promptPresets = result;
        }),
      setActiveProxy: (id) =>
        set((state) => {
          state.activeProxyId = id;
        }),
      setGlobalProxyEnabled: (enabled) =>
        set((state) => {
          state.globalProxyEnabled = enabled;
        }),
      addPersonalApiKey: (key) =>
        set((state) => {
          if (!state.personalApiKeys.includes(key)) {
            state.personalApiKeys.push(key);
          }
        }),
      removePersonalApiKey: (key) =>
        set((state) => {
          state.personalApiKeys = state.personalApiKeys.filter(
            (k) => k !== key,
          );
        }),
      setTargetWordCount: (count) =>
        set((state) => {
          state.targetWordCount = count;
        }),
      setTemperature: (temp) =>
        set((state) => {
          state.temperature = temp;
        }),
      setTopP: (p) =>
        set((state) => {
          state.topP = p;
        }),
      setTopK: (k) =>
        set((state) => {
          state.topK = k;
        }),
      setFontFamily: (font) =>
        set((state) => {
          state.fontFamily = font;
        }),
      setFontSize: (size) =>
        set((state) => {
          state.fontSize = size;
        }),
      memoryFullTurnsCount: 20,
      memoryLogsCount: 200,
      autoSaveEnabled: true,
      autoUpdateMc: typeof window !== "undefined" ? localStorage.getItem("autoUpdateMc") === "true" : false,
      autoUpdateNpc: typeof window !== "undefined" ? localStorage.getItem("autoUpdateNpc") === "true" : false,
      autoUpdateCodex: typeof window !== "undefined" ? localStorage.getItem("autoUpdateCodex") === "true" : false,
      setAutoUpdateMc: (val) =>
        set((state) => {
          state.autoUpdateMc = val;
          if (typeof window !== "undefined") {
            localStorage.setItem("autoUpdateMc", String(val));
          }
          if (val && state.gameData?.mcData?.pendingUpdates) {
            const pending = state.gameData.mcData.pendingUpdates;
            const filteredKeys = Object.keys(pending).filter(
              k => !['location', 'currentlocation', 'status', 'statusdata'].includes(k.trim().toLowerCase())
            );
            if (filteredKeys.length > 0) {
              const updatedFields: any = {};
              filteredKeys.forEach(key => {
                updatedFields[key] = pending[key];
              });
              const newCharData = { ...state.gameData.mcData, ...updatedFields };
              delete newCharData.pendingUpdates;
              state.gameData.mcData = newCharData;
            }
          }
        }),
      setAutoUpdateNpc: (val) =>
        set((state) => {
          state.autoUpdateNpc = val;
          if (typeof window !== "undefined") {
            localStorage.setItem("autoUpdateNpc", String(val));
          }
          if (val && state.gameData?.npcs) {
            state.gameData.npcs = state.gameData.npcs.map((npc: any) => {
              if (npc.pendingUpdates) {
                const pending = npc.pendingUpdates;
                const filteredKeys = Object.keys(pending).filter(
                  k => !['location', 'currentlocation', 'status', 'statusdata'].includes(k.trim().toLowerCase())
                );
                if (filteredKeys.length > 0) {
                  const updatedFields: any = {};
                  filteredKeys.forEach(key => {
                    updatedFields[key] = pending[key];
                  });
                  const newCharData = { ...npc, ...updatedFields };
                  delete newCharData.pendingUpdates;
                  return newCharData;
                }
              }
              return npc;
            });
          }
        }),
      setAutoUpdateCodex: (val) =>
        set((state) => {
          state.autoUpdateCodex = val;
          if (typeof window !== "undefined") {
            localStorage.setItem("autoUpdateCodex", String(val));
          }
          if (val && state.gameData?.codexPendingUpdates) {
            const origPending = state.gameData.codexPendingUpdates;
            const newData = { ...state.gameData };
            
            if (origPending.worldData) {
              const prevWD = newData.worldData || {};
              newData.worldData = {
                ...prevWD,
                ...origPending.worldData
              };
              if (origPending.worldData.difficulty !== undefined) {
                const getDiffObj = (d: any) => {
                  if (typeof d === "object" && d !== null) {
                    return { sfw: d.sfw || "", nsfw: d.nsfw || "" };
                  }
                  return { sfw: typeof d === "string" ? d : "", nsfw: "" };
                };
                const diffVal = getDiffObj(origPending.worldData.difficulty);
                const currentDiff = getDiffObj(prevWD.difficulty);
                newData.worldData.difficulty = {
                  sfw: origPending.worldData.difficulty?.sfw !== undefined ? diffVal.sfw : (diffVal.sfw || currentDiff.sfw),
                  nsfw: origPending.worldData.difficulty?.nsfw !== undefined ? diffVal.nsfw : (diffVal.nsfw || currentDiff.nsfw)
                };
              }
            }
            if (origPending.worldDetails) {
              if (!newData.worldDetails) newData.worldDetails = {};
              if (origPending.worldDetails.locations) {
                if (!newData.worldDetails.locations) newData.worldDetails.locations = [];
                origPending.worldDetails.locations.forEach((item: any) => {
                  const existingIdx = newData.worldDetails.locations.findIndex((loc: any) => loc.name === item.name);
                  if (existingIdx >= 0) {
                    newData.worldDetails.locations[existingIdx] = item;
                  } else {
                    newData.worldDetails.locations.push(item);
                  }
                });
              }
              if (origPending.worldDetails.places) {
                newData.worldDetails.places = origPending.worldDetails.places;
              }
            }
            if (origPending.creativeRules) {
              newData.creativeRules = origPending.creativeRules;
            }
            
            delete newData.codexPendingUpdates;
            state.gameData = newData;
          }
        }),
      useColorEnabled: true,
      colorConfig: {},
      isDramaticEnabled: false,
      dramaPrompt: "",
      dramaChance: 0,
      pendingDramaResult: null,
      setPendingDramaResult: (result: any) => set({ pendingDramaResult: result }),
      setDramaChance: (chance) =>
        set((state) => {
          state.dramaChance = chance;
        }),
      
      
      setDramaPrompt: (prompt) =>
        set((state) => {
          state.dramaPrompt = prompt;
        }),
      isStrictEndEnabled: false,
      isSuggestionsLocked: false,
      isHardModeEnabled: false,
      isVNDialogueModeEnabled: false,
      setIsVNDialogueModeEnabled: (enabled) =>
        set((state) => {
          state.isVNDialogueModeEnabled = enabled;
        }),
      isFanfictionModeEnabled: false,
      actionSuggestionsConfig: "",
      setActionSuggestionsConfig: (config) =>
        set((state) => {
          state.actionSuggestionsConfig = config;
          if (state.gameData) {
            state.gameData.actionSuggestionsConfig = config;
          }
        }),
      showTitles: true,
      setShowTitles: (show) =>
        set((state) => {
          state.showTitles = show;
        }),
      setIsHardModeEnabled: (enabled) =>
        set((state) => {
          state.isHardModeEnabled = enabled;
        }),
      setIsFanfictionModeEnabled: (enabled) =>
        set((state) => {
          state.isFanfictionModeEnabled = enabled;
        }),
      setIsDramaticEnabled: (enabled) =>
        set((state) => {
          state.isDramaticEnabled = enabled;
        }),
      setIsStrictEndEnabled: (enabled) =>
        set((state) => {
          state.isStrictEndEnabled = enabled;
        }),
      setIsSuggestionsLocked: (enabled) =>
        set((state) => {
          state.isSuggestionsLocked = enabled;
        }),
      setUseColorEnabled: (enabled) =>
        set((state) => {
          state.useColorEnabled = enabled;
        }),
      previousColorConfig: null,
      setColorConfig: (config) =>
        set((state) => {
          const updated = { ...state.colorConfig, ...config };
          Object.keys(config).forEach((key) => {
            if (!config[key] || config[key] === '') {
              delete updated[key];
            }
          });
          state.colorConfig = updated;
        }),
      resetColorConfig: () =>
        set((state) => {
          state.previousColorConfig = state.colorConfig;
          state.colorConfig = {};
        }),
      undoColorConfig: () =>
        set((state) => {
          if (state.previousColorConfig) {
            state.colorConfig = state.previousColorConfig;
            state.previousColorConfig = null;
          }
        }),
      setAutoSaveEnabled: (enabled) =>
        set((state) => {
          state.autoSaveEnabled = enabled;
        }),
      setMemoryFullTurnsCount: (count) =>
        set((state) => {
          state.memoryFullTurnsCount = count;
        }),
      setMemoryLogsCount: (count) =>
        set((state) => {
          state.memoryLogsCount = count;
        }),
      setFullScreenStream: (active) =>
        set((state) => {
          state.isFullScreenStream = active;
        }),
      npcBuilder: {
        prompt: "",
        images: [],
        generatedNPCs: [],
        streamedText: "",
        streamedThought: "",
        isInputOpen: true,
        expandedNpcIndexes: [],
      },
      setNpcBuilder: (data) =>
        set((state) => {
          state.npcBuilder = { ...state.npcBuilder, ...data };
          if (state.gameData) {
            state.gameData.npcBuilderData = state.npcBuilder;
          }
        }),
      phoneWallpaper: "https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?q=80&w=2560&auto=format&fit=crop",
      setPhoneWallpaper: (url: string) =>
        set((state) => {
          state.phoneWallpaper = url;
          if (state.gameData) {
            state.gameData.phoneWallpaper = url;
          }
        }),
      phoneTheme: 'dark',
      setPhoneTheme: (theme: 'dark' | 'light') =>
        set((state) => {
          state.phoneTheme = theme;
          if (state.gameData) {
            state.gameData.phoneTheme = theme;
          }
        }),
      phoneAppControl: { messenger: true, discord: true },
      setPhoneAppControl: (controls) =>
        set((state) => {
          const currentControl = state.phoneAppControl || { messenger: true, discord: true };
          state.phoneAppControl = { ...currentControl, ...controls };
          if (state.gameData) {
            state.gameData.phoneAppControl = state.phoneAppControl;
          }
        }),
      unreadMessages: 1,
      setUnreadMessages: (count: number) =>
        set((state) => {
          state.unreadMessages = count;
          if (state.gameData) {
            state.gameData.unreadMessages = count;
          }
        }),
      messengerReadChatIds: {},
      setMessengerReadChatIds: (updater) =>
        set((state) => {
          const next = updater(state.messengerReadChatIds);
          state.messengerReadChatIds = next;
          if (state.gameData) {
            state.gameData.messengerReadChatIds = next;
          }
        }),
      setIsGeneratingStream: (active: boolean) =>
        set((state) => {
          state.isGeneratingStream = active;
          if (active) {
            state.streamStartTime = Date.now();
          }
        }),
      updateStreamData: (data) =>
        set((state) => {
          state.fullScreenStreamData =
            typeof data === "function"
              ? data(state.fullScreenStreamData)
              : data;
        }),
      setSystemLogs: (log) =>
        set((state) => {
          if (typeof log === "function") {
            state.systemLogs = log(state.systemLogs).slice(-100);
          } else if (typeof log === "string") {
            if (!log) {
              state.systemLogs = [];
            } else {
              state.systemLogs = [
                ...state.systemLogs,
                {
                  id:
                    Date.now().toString() +
                    Math.random().toString(36).substring(2, 11),
                  timestamp: Date.now(),
                  message: log,
                },
              ].slice(-100);
            }
          } else if (
            log &&
            typeof log === "object" &&
            !Array.isArray(log) &&
            "message" in log
          ) {
            state.systemLogs = [
              ...state.systemLogs,
              {
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substring(2, 11),
                timestamp: Date.now(),
                message: log.message,
                type: log.type,
              },
            ].slice(-100);
          } else {
            state.systemLogs = (log as SystemLogItem[]).slice(-100);
          }
        }),
      updateWorldCreation: (data) =>
        set((state) => {
          if (typeof data === "function") {
            data(state.worldCreation);
          } else {
            state.worldCreation = { ...state.worldCreation, ...data };
          }
        }),
      resetWorldCreation: () =>
        set((state) => {
          state.worldCreation = INITIAL_WORLD_CREATION;
          state.fullScreenStreamData = "";
        }),
      gameData: null,
      setGameData: (data) =>
        set((state) => {
          let updatedData =
            typeof data === "function" ? data(state.gameData) : data;
          if (updatedData) {
            if (!updatedData.id) {
              updatedData.id = Date.now().toString();
            }
            if (updatedData.playerRules === undefined && state.playerRules !== undefined) {
              updatedData.playerRules = state.playerRules;
            }
            if (updatedData.actionSuggestionsConfig === undefined && state.actionSuggestionsConfig !== undefined) {
              updatedData.actionSuggestionsConfig = state.actionSuggestionsConfig;
            }
            updatedData = sanitizeGameData(updatedData);
          }
          state.gameData = updatedData;
        }),
      setMessages: (updater) =>
        set((state) => {
          if (typeof updater === "function") {
            state.messages = updater(state.messages);
          } else {
            state.messages = updater;
          }
        }),
      saveCurrentGame: async () => {
        const state = useStore.getState();
        if (!state.gameData) return;
        const now = Date.now();

        const gameName = "Matrix Lite v6";
        const worldName = state.gameData.worldData?.name || "Untitled World";
        const mcName = state.gameData.mcData?.name || "MC";

        // Helper tính số lượt chơi chính xác theo turn.index hiển thị trên đầu mỗi phản hồi AI
        const getExactTurnCount = (msgs: GameMessage[]) => {
          const aiMsgsCount = msgs.filter(
            (m) => m.sender === "ai" || m.sender === "system",
          ).length;
          return Math.max(0, aiMsgsCount - 1);
        };

        const turnCount = getExactTurnCount(state.messages);

        const today = new Date();
        const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;

        // Cấu trúc tên: Tên game + tên thế giới + số lượt chơi + tên MC + ngày tháng năm
        const saveName = `${gameName} - ${worldName} - Lượt ${turnCount} - ${mcName} - ${dateStr}`;

        let currentId = state.gameData.id;
        if (!currentId) {
          currentId = now.toString();
        }

        const ragMemories = await ragService.getMemories(currentId);

        set((draft) => {
          if (!draft.gameData.id) draft.gameData.id = currentId;
          draft.gameData.isDramaticEnabled = draft.isDramaticEnabled;
          draft.gameData.dramaPrompt = draft.dramaPrompt;
          draft.gameData.dramaChance = draft.dramaChance;
          draft.gameData.phoneAppControl = draft.phoneAppControl;

          const existingIdx = draft.saves.findIndex((s) => {
            const sTurnCount = getExactTurnCount(s.messages);
            return (
              s.gameData?.id === draft.gameData.id &&
              !s.id.endsWith("_auto") &&
              sTurnCount === turnCount
            );
          });

          if (existingIdx >= 0) {
            draft.saves[existingIdx].name = saveName;
            draft.saves[existingIdx].updatedAt = now;
            draft.saves[existingIdx].messages = draft.messages;
            if (draft.gameData) {
              draft.gameData.playerRules = draft.playerRules;
              draft.gameData.actionSuggestionsConfig = draft.actionSuggestionsConfig;
            }
            draft.saves[existingIdx].gameData = draft.gameData;
            draft.saves[existingIdx].ragMemories = ragMemories;
            draft.saves[existingIdx].playerRules = draft.playerRules;
            draft.saves[existingIdx].actionSuggestionsConfig = draft.actionSuggestionsConfig;
          } else {
            if (draft.gameData) {
              draft.gameData.playerRules = draft.playerRules;
              draft.gameData.actionSuggestionsConfig = draft.actionSuggestionsConfig;
            }
            draft.saves.push({
              id: now.toString(),
              name: saveName,
              createdAt: now,
              updatedAt: now,
              messages: draft.messages,
              gameData: draft.gameData,
              ragMemories: ragMemories,
              playerRules: draft.playerRules,
              actionSuggestionsConfig: draft.actionSuggestionsConfig,
            });
          }
        });
      },
      autoSaveCurrentGame: async () => {
        const state = useStore.getState();
        if (!state.autoSaveEnabled || !state.gameData) return;
        const now = Date.now();

        const gameName = "Matrix Lite v6";
        const worldName = state.gameData.worldData?.name || "Untitled World";
        const mcName = state.gameData.mcData?.name || "MC";

        const saveName = `AUTO - ${gameName} - ${worldName} - ${mcName}`;

        let currentId = state.gameData.id;
        if (!currentId) {
          currentId = now.toString();
        }

        const ragMemories = await ragService.getMemories(currentId);
        const autoSaveId = `${currentId}_auto`;

        set((draft) => {
          if (!draft.gameData.id) draft.gameData.id = currentId;
          draft.gameData.isDramaticEnabled = draft.isDramaticEnabled;
          draft.gameData.dramaPrompt = draft.dramaPrompt;
          draft.gameData.dramaChance = draft.dramaChance;
          draft.gameData.phoneAppControl = draft.phoneAppControl;

          const existingIdx = draft.saves.findIndex((s) => s.id === autoSaveId);

          if (existingIdx >= 0) {
            draft.saves[existingIdx].name = saveName;
            draft.saves[existingIdx].updatedAt = now;
            draft.saves[existingIdx].messages = draft.messages;
            if (draft.gameData) {
              draft.gameData.playerRules = draft.playerRules;
              draft.gameData.actionSuggestionsConfig = draft.actionSuggestionsConfig;
            }
            draft.saves[existingIdx].gameData = draft.gameData;
            draft.saves[existingIdx].ragMemories = ragMemories;
            draft.saves[existingIdx].playerRules = draft.playerRules;
            draft.saves[existingIdx].actionSuggestionsConfig = draft.actionSuggestionsConfig;
          } else {
            if (draft.gameData) {
              draft.gameData.playerRules = draft.playerRules;
              draft.gameData.actionSuggestionsConfig = draft.actionSuggestionsConfig;
            }
            draft.saves.push({
              id: autoSaveId,
              name: saveName,
              createdAt: now,
              updatedAt: now,
              messages: draft.messages,
              gameData: draft.gameData,
              ragMemories: ragMemories,
              playerRules: draft.playerRules,
              actionSuggestionsConfig: draft.actionSuggestionsConfig,
            });
          }
        });
      },
      loadSave: async (id) => {
        const state = useStore.getState();
        const save = state.saves.find((s) => s.id === id);
        if (!save) return false;

        if (save.ragMemories && save.gameData && save.gameData.id) {
          await ragService.setMemories(save.gameData.id, save.ragMemories);
        }

        let success = false;
        set((draft) => {
          const s = draft.saves.find((x) => x.id === id);
          if (s) {
            draft.gameData = sanitizeGameData(s.gameData);
            draft.messages = s.messages || [];
            draft.messengerReadChatIds = s.gameData?.messengerReadChatIds || {};
            draft.phoneAppControl = s.gameData?.phoneAppControl || draft.phoneAppControl || { messenger: true, discord: true };
            draft.unreadMessages = s.gameData?.unreadMessages || 0;
            draft.phoneWallpaper = s.gameData?.phoneWallpaper || "https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?q=80&w=2560&auto=format&fit=crop";
            draft.phoneTheme = s.gameData?.phoneTheme || 'dark';
            if (s.gameData?.npcBuilderData) {
              draft.npcBuilder = s.gameData.npcBuilderData;
            } else {
              draft.npcBuilder = {
                prompt: "",
                images: [],
                generatedNPCs: [],
                streamedText: "",
                streamedThought: "",
                isInputOpen: true,
                expandedNpcIndexes: [],
              };
            }
            if (s.gameData?.isDramaticEnabled !== undefined) {
              draft.isDramaticEnabled = s.gameData.isDramaticEnabled;
            } else {
              draft.isDramaticEnabled = false;
            }
            if (s.gameData?.dramaPrompt !== undefined) {
              draft.dramaPrompt = s.gameData.dramaPrompt;
            } else {
              draft.dramaPrompt = "";
            }
            if (s.gameData?.dramaChance !== undefined) {
              draft.dramaChance = s.gameData.dramaChance;
            } else {
              draft.dramaChance = 0;
            }
            if (s.playerRules !== undefined && s.playerRules !== null) {
              draft.playerRules = s.playerRules;
            } else if (s.gameData && s.gameData.playerRules !== undefined && s.gameData.playerRules !== null) {
              draft.playerRules = s.gameData.playerRules;
            } else if (s.gameData && s.gameData.worldCreation && s.gameData.worldCreation.playerRules !== undefined && s.gameData.worldCreation.playerRules !== null) {
              draft.playerRules = s.gameData.worldCreation.playerRules;
            } else {
              draft.playerRules = "";
            }
            if (draft.gameData) {
              draft.gameData.playerRules = draft.playerRules;
            }
            if (s.actionSuggestionsConfig !== undefined && s.actionSuggestionsConfig !== null) {
              draft.actionSuggestionsConfig = s.actionSuggestionsConfig;
            } else if (s.gameData && s.gameData.actionSuggestionsConfig !== undefined && s.gameData.actionSuggestionsConfig !== null) {
              draft.actionSuggestionsConfig = s.gameData.actionSuggestionsConfig;
            } else {
              draft.actionSuggestionsConfig = "";
            }
            if (draft.gameData) {
              draft.gameData.actionSuggestionsConfig = draft.actionSuggestionsConfig;
            }
            const lastAiMsg = [...s.messages]
              .reverse()
              .find((m) => m.sender === "ai" || m.sender === "system");
            if (lastAiMsg && lastAiMsg.fullStreamLog) {
              draft.fullScreenStreamData = lastAiMsg.fullStreamLog;
            } else if (lastAiMsg && lastAiMsg.thought) {
              draft.fullScreenStreamData = lastAiMsg.thought;
            } else {
              draft.fullScreenStreamData = "";
            }
            success = true;
          }
        });
        return success;
      },
      deleteSave: (id) => {
        set((state) => {
          state.saves = state.saves.filter((s) => s.id !== id);
        });
        storageService.removeItem(`save_file_${id}`).catch(e => console.error("Lỗi xóa tệp save:", e));
        // Dọn sạch cache (RAG Memories) khi xóa tệp lưu
        ragService.clearMemories(id).catch(err => console.error("Lỗi xóa cache RAG:", err));
      },
      clearSaves: () => {
        const state = useStore.getState();
        const saveIds = state.saves.map(s => s.id);
        
        set((state) => {
          state.saves = [];
        });

        // Dọn sạch cache của toàn bộ tệp lưu
        saveIds.forEach(id => {
          storageService.removeItem(`save_file_${id}`).catch(e => console.error("Lỗi xóa tệp save:", e));
          ragService.clearMemories(id).catch(err => console.error("Lỗi xóa cache RAG:", err));
        });
      },
      importSaves: (newSaves) =>
        set((state) => {
          if (Array.isArray(newSaves)) {
            const validSaves = newSaves.filter(
              (s) => s.id && s.name && s.gameData,
            );
            validSaves.forEach((newSave) => {
              if (newSave.gameData) {
                newSave.gameData = sanitizeGameData(newSave.gameData);
              }
              if (newSave.playerRules === undefined || newSave.playerRules === null) {
                newSave.playerRules = newSave.gameData?.playerRules || newSave.gameData?.worldCreation?.playerRules || "";
              }
              if (newSave.actionSuggestionsConfig === undefined || newSave.actionSuggestionsConfig === null) {
                newSave.actionSuggestionsConfig = newSave.gameData?.actionSuggestionsConfig || "";
              }
              // Khi tải từ máy lên, nếu tên lưu y hệt thì lưu đè
              const existingIdx = state.saves.findIndex(
                (s) => s.name === newSave.name,
              );
              if (existingIdx >= 0) {
                state.saves[existingIdx] = newSave;
              } else {
                state.saves.push(newSave);
              }
            });
          }
        }),
      resumeLatestGame: async () => {
        let success = false;
        const state = useStore.getState();
        if (state.saves.length > 0) {
          const latest = [...state.saves].sort(
            (a, b) => b.updatedAt - a.updatedAt,
          )[0];
          if (latest.ragMemories && latest.gameData && latest.gameData.id) {
            await ragService.setMemories(
              latest.gameData.id,
              latest.ragMemories,
            );
          }
          set((draft) => {
            draft.gameData = sanitizeGameData(latest.gameData);
            draft.messages = latest.messages;
            draft.messengerReadChatIds = latest.gameData?.messengerReadChatIds || {};
            draft.phoneAppControl = latest.gameData?.phoneAppControl || draft.phoneAppControl || { messenger: true, discord: true };
            draft.unreadMessages = latest.gameData?.unreadMessages || 0;
            draft.phoneWallpaper = latest.gameData?.phoneWallpaper || "https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?q=80&w=2560&auto=format&fit=crop";
            draft.phoneTheme = latest.gameData?.phoneTheme || 'dark';
            if (latest.gameData?.npcBuilderData) {
              draft.npcBuilder = latest.gameData.npcBuilderData;
            } else {
              draft.npcBuilder = {
                prompt: "",
                images: [],
                generatedNPCs: [],
                streamedText: "",
                streamedThought: "",
                isInputOpen: true,
                expandedNpcIndexes: [],
              };
            }
            if (latest.gameData?.isDramaticEnabled !== undefined) {
              draft.isDramaticEnabled = latest.gameData.isDramaticEnabled;
            } else {
              draft.isDramaticEnabled = false;
            }
            if (latest.gameData?.dramaPrompt !== undefined) {
              draft.dramaPrompt = latest.gameData.dramaPrompt;
            } else {
              draft.dramaPrompt = "";
            }
            if (latest.gameData?.dramaChance !== undefined) {
              draft.dramaChance = latest.gameData.dramaChance;
            } else {
              draft.dramaChance = 0;
            }
            if (latest.playerRules !== undefined && latest.playerRules !== null) {
              draft.playerRules = latest.playerRules;
            } else if (latest.gameData && latest.gameData.playerRules !== undefined && latest.gameData.playerRules !== null) {
              draft.playerRules = latest.gameData.playerRules;
            } else if (latest.gameData && latest.gameData.worldCreation && latest.gameData.worldCreation.playerRules !== undefined && latest.gameData.worldCreation.playerRules !== null) {
              draft.playerRules = latest.gameData.worldCreation.playerRules;
            } else {
              draft.playerRules = "";
            }
            if (draft.gameData) {
              draft.gameData.playerRules = draft.playerRules;
            }
            if (latest.actionSuggestionsConfig !== undefined && latest.actionSuggestionsConfig !== null) {
              draft.actionSuggestionsConfig = latest.actionSuggestionsConfig;
            } else if (latest.gameData && latest.gameData.actionSuggestionsConfig !== undefined && latest.gameData.actionSuggestionsConfig !== null) {
              draft.actionSuggestionsConfig = latest.gameData.actionSuggestionsConfig;
            } else {
              draft.actionSuggestionsConfig = "";
            }
            if (draft.gameData) {
              draft.gameData.actionSuggestionsConfig = draft.actionSuggestionsConfig;
            }
            const lastAiMsg = [...latest.messages]
              .reverse()
              .find((m) => m.sender === "ai" || m.sender === "system");
            if (lastAiMsg && lastAiMsg.fullStreamLog) {
              draft.fullScreenStreamData = lastAiMsg.fullStreamLog;
            } else if (lastAiMsg && lastAiMsg.thought) {
              draft.fullScreenStreamData = lastAiMsg.thought;
            } else {
              draft.fullScreenStreamData = "";
            }
            success = true;
          });
        }
        return success;
      },
      clearApiConfig: () =>
        set((state) => {
          state.proxies = [];
          state.activeProxyId = null;
          state.personalApiKeys = [];
        }),
      resetSettings: () =>
        set((state) => {
          state.currentThemeId = "deepsea";
          state.theme = THEMES.find((t) => t.id === "deepsea") || THEMES[0];
          state.proxies = [];
          state.activeProxyId = null;
          state.personalApiKeys = [];
          state.targetWordCount = 2000;
          state.temperature = 1.0;
          state.topP = 0.95;
          state.topK = 40;
          state.fontFamily = "Inter";
          state.fontSize = 16;
          state.uiMode = "auto";
          state.showTitles = true;
          state.selectedAIModel = "gemini-3.5-flash";
          state.memoryFullTurnsCount = 20;
          state.memoryLogsCount = 200;
          state.autoSaveEnabled = true;
          state.autoUpdateMc = false;
          state.autoUpdateNpc = false;
          state.autoUpdateCodex = false;
          if (typeof window !== "undefined") {
            localStorage.setItem("autoUpdateMc", "false");
            localStorage.setItem("autoUpdateNpc", "false");
            localStorage.setItem("autoUpdateCodex", "false");
          }
          state.useColorEnabled = true;
        }),
    })),
    {
      name: "game-storage",
      storage: customIdbStorage,
      partialize: (state) => ({
        currentThemeId: state.currentThemeId,
        theme: state.theme,
        proxies: state.proxies,
        promptPresets: state.promptPresets,
        activeProxyId: state.activeProxyId,
        personalApiKeys: state.personalApiKeys,
        worldCreation: state.worldCreation,
        playerRules: state.playerRules,
        saves: state.saves,
        targetWordCount: state.targetWordCount,
        temperature: state.temperature,
        topP: state.topP,
        topK: state.topK,
        fontFamily: state.fontFamily,
        fontSize: state.fontSize,
        uiMode: state.uiMode,
        selectedAIModel: state.selectedAIModel,
        currentStreamStats: state.currentStreamStats,
        memoryFullTurnsCount: state.memoryFullTurnsCount,
        memoryLogsCount: state.memoryLogsCount,
        autoSaveEnabled: state.autoSaveEnabled,
        autoUpdateMc: state.autoUpdateMc,
        autoUpdateNpc: state.autoUpdateNpc,
        autoUpdateCodex: state.autoUpdateCodex,
        useColorEnabled: state.useColorEnabled,
        colorConfig: state.colorConfig,
        isDramaticEnabled: state.isDramaticEnabled,
        dramaChance: state.dramaChance,
        isStrictEndEnabled: state.isStrictEndEnabled,
        isSuggestionsLocked: state.isSuggestionsLocked,
        isHardModeEnabled: state.isHardModeEnabled,
        actionSuggestionsConfig: state.actionSuggestionsConfig,
        phoneAppControl: state.phoneAppControl,
        isVNDialogueModeEnabled: state.isVNDialogueModeEnabled,
        isFanfictionModeEnabled: state.isFanfictionModeEnabled,
        showTitles: state.showTitles,
        fullScreenStreamData: state.fullScreenStreamData,
        npcBuilder: state.npcBuilder,
        systemLogs: state.systemLogs,
        messengerReadChatIds: state.messengerReadChatIds,
      }),
      merge: (persistedState: any, currentState: GameState) => {
        const merged = { ...currentState, ...persistedState };
        if (persistedState.playerRules !== undefined && persistedState.playerRules !== null) {
          merged.playerRules = persistedState.playerRules;
        }
        if (persistedState.actionSuggestionsConfig !== undefined && persistedState.actionSuggestionsConfig !== null) {
          merged.actionSuggestionsConfig = persistedState.actionSuggestionsConfig;
        }
        if (persistedState.theme?.id) {
          merged.theme =
            THEMES.find((t) => t.id === persistedState.theme.id) ||
            currentState.theme;
        }
        if (persistedState.colorConfig) {
          merged.colorConfig = { ...currentState.colorConfig, ...persistedState.colorConfig };
        } else {
          merged.colorConfig = currentState.colorConfig;
        }
        if (persistedState.messengerReadChatIds) {
          merged.messengerReadChatIds = { ...currentState.messengerReadChatIds, ...persistedState.messengerReadChatIds };
        } else {
          merged.messengerReadChatIds = currentState.messengerReadChatIds;
        }

        if (!merged.npcBuilder) {
          merged.npcBuilder = {
            prompt: "",
            images: [],
            generatedNPCs: [],
            streamedText: "",
            streamedThought: "",
            isInputOpen: true,
            expandedNpcIndexes: [],
          };
        }
        return merged;
      },
    },
  ),
);
