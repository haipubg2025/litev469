import { useStore } from "../store/useStore";

export interface SillyTavernMetadata {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_length?: number;
  system_prompt?: string;
  main_prompt?: string;
  post_history_instructions?: string;
  jailbreak_prompt?: string;
  char_name?: string;
  char_persona?: string;
  scenario?: string;
  world_scenario?: string;
  character_book?: any;
}

/**
 * Đệ quy tìm kiếm các thuộc tính cấu hình SillyTavern phổ biến trong JSON Object
 */
function deepFindSillyTavernKeys(obj: any, metadata: SillyTavernMetadata): void {
  if (!obj || typeof obj !== "object") return;

  // 1. Quét các key trực tiếp ở cấp độ này
  const keys = Object.keys(obj);

  // Tìm kiếm các thông số cấu hình AI (phần cứng)
  for (const key of keys) {
    const val = obj[key];
    const lowerKey = key.toLowerCase().replace(/_/g, "");

    if (lowerKey === "temperature" || lowerKey === "temp") {
      if (typeof val === "number") metadata.temperature = val;
      else if (typeof val === "string" && !isNaN(Number(val))) metadata.temperature = Number(val);
    } else if (lowerKey === "topp" || lowerKey === "topparameter") {
      if (typeof val === "number") metadata.top_p = val;
      else if (typeof val === "string" && !isNaN(Number(val))) metadata.top_p = Number(val);
    } else if (lowerKey === "topk" || lowerKey === "topkparameter") {
      if (typeof val === "number") metadata.top_k = val;
      else if (typeof val === "string" && !isNaN(Number(val))) metadata.top_k = Number(val);
    } else if (lowerKey === "maxlength" || lowerKey === "maxoutputtokens" || lowerKey === "maxtokens" || lowerKey === "maxoutputlength") {
      if (typeof val === "number") metadata.max_length = val;
      else if (typeof val === "string" && !isNaN(Number(val))) metadata.max_length = Number(val);
    } 
    
    // Tìm kiếm các prompt hệ thống
    else if (lowerKey === "systemprompt" || lowerKey === "systemprompttemplate" || lowerKey === "systempromptcontent") {
      if (typeof val === "string" && val.trim()) metadata.system_prompt = val;
    } else if (lowerKey === "mainprompt" || lowerKey === "mainprompttemplate") {
      if (typeof val === "string" && val.trim()) metadata.main_prompt = val;
    } else if (lowerKey === "posthistoryinstructions" || lowerKey === "posthistoryinstruction") {
      if (typeof val === "string" && val.trim()) metadata.post_history_instructions = val;
    } else if (lowerKey === "jailbreak" || lowerKey === "jailbreakprompt" || lowerKey === "jailbreaktスキル") {
      if (typeof val === "string" && val.trim()) metadata.jailbreak_prompt = val;
    } 
    
    // Tìm kiếm thông tin nhân vật SillyTavern V1 / V2
    else if (lowerKey === "charname" || lowerKey === "charactername") {
      if (typeof val === "string" && val.trim()) metadata.char_name = val;
    } else if (lowerKey === "charpersona" || lowerKey === "personality" || lowerKey === "persona") {
      if (typeof val === "string" && val.trim()) metadata.char_persona = val;
    } else if (lowerKey === "scenario") {
      if (typeof val === "string" && val.trim()) metadata.scenario = val;
    } else if (lowerKey === "worldscenario") {
      if (typeof val === "string" && val.trim()) metadata.world_scenario = val;
    } else if (lowerKey === "characterbook") {
      if (val && typeof val === "object") metadata.character_book = val;
    }
  }

  // 2. Đi sâu vào các object con nếu không phải mảng nguyên thủy
  for (const key of keys) {
    const val = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      // Hỗ trợ cấu hình SillyTavern lồng nhau như generation_settings hoặc data của character card
      deepFindSillyTavernKeys(val, metadata);
    }
  }
}

/**
 * Phân tích nội dung tệp SillyTavern (JSON/TXT) để trích xuất metadata cấu hình
 */
export function extractSillyTavernMetadata(content: string): SillyTavernMetadata {
  const metadata: SillyTavernMetadata = {};
  if (!content) return metadata;

  const trimmed = content.trim();
  
  // Thử parse JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      deepFindSillyTavernKeys(parsed, metadata);
      
      // Trường hợp đặc biệt: SillyTavern Character Card V2 lưu thông tin trong thuộc tính "data"
      if (parsed.data && typeof parsed.data === "object") {
        deepFindSillyTavernKeys(parsed.data, metadata);
      }
    } catch (e) {
      console.warn("Không thể phân tích JSON của tệp SillyTavern:", e);
    }
  } else {
    // Nếu là TXT, cố gắng trích xuất các dòng cấu hình thô bằng regex
    const lines = trimmed.split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*(temperature|temp|top_p|top_k|max_length|max_tokens|max_output_tokens)\s*:\s*([^\s]+)/i);
      if (match) {
        const key = match[1].toLowerCase().replace(/_/g, "");
        const valStr = match[2].trim();
        const numVal = Number(valStr);
        if (!isNaN(numVal)) {
          if (key === "temperature" || key === "temp") metadata.temperature = numVal;
          else if (key === "topp") metadata.top_p = numVal;
          else if (key === "topk") metadata.top_k = numVal;
          else if (key === "maxlength" || key === "maxtokens" || key === "maxoutputtokens") metadata.max_length = numVal;
        }
      }
    }
  }

  return metadata;
}

/**
 * Tổng hợp toàn bộ các cấu hình từ các tệp SillyTavern đang hoạt động (isActive)
 * Các tệp này sẽ đóng vai trò là "cột sống", đè lên tất cả cài đặt trong game
 */
export function getActiveSillyTavernConfig(): {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxLength?: number;
  mergedSystemPrompts: string[];
  activeCharName?: string;
  activeCharPersona?: string;
  activeScenario?: string;
} {
  const state = useStore.getState();
  const activePresets = (state.promptPresets || []).filter(p => p.isActive);
  
  const config: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxLength?: number;
    mergedSystemPrompts: string[];
    activeCharName?: string;
    activeCharPersona?: string;
    activeScenario?: string;
  } = {
    mergedSystemPrompts: []
  };

  // Duyệt qua các preset đang hoạt động để gộp cấu hình. Preset nào xếp sau/dưới sẽ đè lên preset trước (hoặc gộp lại)
  for (const preset of activePresets) {
    const meta = extractSillyTavernMetadata(preset.content);

    // Ghi đè các thông số phần cứng nếu có
    if (meta.temperature !== undefined) config.temperature = meta.temperature;
    if (meta.top_p !== undefined) config.topP = meta.top_p;
    if (meta.top_k !== undefined) config.topK = meta.top_k;
    if (meta.max_length !== undefined) config.maxLength = meta.max_length;

    // Ghi nhận tên nhân vật và mô tả nếu đó là character card SillyTavern
    if (meta.char_name) config.activeCharName = meta.char_name;
    if (meta.char_persona) config.activeCharPersona = meta.char_persona;
    if (meta.scenario || meta.world_scenario) config.activeScenario = meta.scenario || meta.world_scenario;

    // Gộp các system prompt hoặc prompt thô từ preset
    const promptsToCollect = [];
    if (meta.system_prompt) promptsToCollect.push(meta.system_prompt);
    if (meta.main_prompt) promptsToCollect.push(meta.main_prompt);
    if (meta.jailbreak_prompt) promptsToCollect.push(meta.jailbreak_prompt);
    if (meta.post_history_instructions) promptsToCollect.push(meta.post_history_instructions);

    if (promptsToCollect.length > 0) {
      config.mergedSystemPrompts.push(
        `--- CHỈ THỊ TỪ PRESET SILLYTAVERN [${preset.name}] ---\n${promptsToCollect.join("\n\n")}`
      );
    } else {
      // Nếu preset thô không parse được prompt cụ thể (hoặc là tệp văn bản thô), ta dùng toàn bộ nội dung của nó làm chỉ thị
      const textPrompt = preset.content;
      if (textPrompt && textPrompt.trim() && !textPrompt.trim().startsWith("{")) {
        config.mergedSystemPrompts.push(
          `--- CHỈ THỊ TRỰC TIẾP TỪ PRESET SILLYTAVERN [${preset.name}] ---\n${textPrompt}`
        );
      }
    }
  }

  return config;
}

/**
 * Phân giải tất cả các macro (biến hệ thống) trong chuỗi văn bản thô dựa trên dữ liệu hiện tại của game
 */
export function resolveSillyTavernMacros(text: string, activeNpcName?: string): string {
  if (!text) return text;

  const state = useStore.getState();
  const gameData = state.gameData;
  const mcData = gameData?.mcData;

  // 1. Phân giải Macro của người chơi (MC)
  const mcName = mcData?.fullName || mcData?.name || "Người chơi";
  const mcFirstName = mcData?.name || "Người chơi";
  const mcBio = mcData?.appearance || mcData?.background || "";
  const mcPersonality = mcData?.personality || mcData?.personalityCore || "";

  // 2. Phân giải Macro của NPC hoạt động (char)
  let charName = activeNpcName || "NPC";
  let charPersona = "";
  let charBio = "";

  // Nếu người chơi không truyền NPC hoạt động cụ thể, tìm kiếm thông minh từ gameData
  if (!activeNpcName && gameData?.npcs && gameData.npcs.length > 0) {
    // Ưu tiên NPC được ghim
    const pinnedNpc = gameData.npcs.find((n: any) => n.isPinned);
    const activeNpc = pinnedNpc || gameData.npcs[0];
    charName = activeNpc.fullName || activeNpc.name || "NPC";
    charPersona = activeNpc.personality || activeNpc.personalityCore || "";
    charBio = activeNpc.appearance || activeNpc.background || "";
  } else if (activeNpcName && gameData?.npcs) {
    const foundNpc = gameData.npcs.find(
      (n: any) => n.name === activeNpcName || n.fullName === activeNpcName
    );
    if (foundNpc) {
      charPersona = foundNpc.personality || foundNpc.personalityCore || "";
      charBio = foundNpc.appearance || foundNpc.background || "";
    }
  }

  // 3. Phân giải các macro SillyTavern tiêu chuẩn
  let resolved = text;

  // User macros
  resolved = resolved.replace(/\{\{user\}\}/g, mcName);
  resolved = resolved.replace(/\{\{user_name\}\}/g, mcName);
  resolved = resolved.replace(/\{\{user_firstname\}\}/g, mcFirstName);
  resolved = resolved.replace(/\{\{persona\}\}/g, mcPersonality);
  resolved = resolved.replace(/\{\{user_description\}\}/g, mcBio);
  resolved = resolved.replace(/\{\{user_persona\}\}/g, mcPersonality);

  // Character macros
  resolved = resolved.replace(/\{\{char\}\}/g, charName);
  resolved = resolved.replace(/\{\{char_name\}\}/g, charName);
  resolved = resolved.replace(/\{\{description\}\}/g, charBio);
  resolved = resolved.replace(/\{\{char_description\}\}/g, charBio);
  resolved = resolved.replace(/\{\{char_persona\}\}/g, charPersona);

  // World Scenario macro
  const scenarioStr = gameData?.worldData?.starterScenario || gameData?.initialIdea || "Trò chơi nhập vai";
  resolved = resolved.replace(/\{\{scenario\}\}/g, scenarioStr);
  resolved = resolved.replace(/\{\{world_scenario\}\}/g, scenarioStr);

  // Thêm một số biến bổ sung cho game nhập vai này
  resolved = resolved.replace(/\{\{mc\}\}/g, mcName);
  resolved = resolved.replace(/\{\{mc_name\}\}/g, mcName);
  resolved = resolved.replace(/\{\{current_location\}\}/g, mcData?.location || "Chưa rõ");

  return resolved;
}
