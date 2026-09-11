import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { isRelationshipField, ensureUniqueNpcIds } from "../utils/relationshipUtils";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  PanelLeft,
  PanelRight,
  Send,
  ArrowUp,
  ArrowDown,
  User,
  Sparkles,
  Loader2,
  Copy,
  Save,
  Download,
  ImageIcon,
  Book,
  BrainCircuit,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  X,
  ListTodo,
  Edit3,
  Clock,
  MapPin,
  Maximize2,
  Trash2,
  RotateCcw,
  Activity,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Palette,
  Flame,
  ArrowUpToLine,
  ArrowDownToLine,
  CloudSun,
  AlertTriangle,
  Smartphone,
  Search,
  Users,
  Edit2,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { useDeviceMode } from "../hooks/useDeviceMode";
import { toast } from "../utils/toast";
import { aiService } from "../services/aiService";
import { ragService } from "../services/ragService";
import { streamEmitter } from "../services/streamEmitter";
import Settings from "./Settings";
import {
  generateSysLog,
  cleanErrorMessage,
  normalizeUsage,
} from "../utils/errorHandler";
import CharacterModal from "./CharacterModal";
import CodexModal from "./CodexModal";
import GalleryModal from "./GalleryModal";
import StatusModal from "./StatusModal";
import PartyModal from "./PartyModal";
import LazyImage from "./LazyImage";
import { getGameplaySystemInstruction } from "../utils/gameplaySystemInstruction";
import { buildDetailedRecentTurnsMemories, synthesizeTurnStoryMemory } from "../utils/memoryUtils";
import Markdown from "react-markdown";

import rehypeRaw from "rehype-raw";
import NPCBuilderModal from "./NPCBuilderModal";
import {
  robustParseGameplayJSON,
  cleanRawOutputText,
  safeParseJSON,
} from "../utils/jsonRepair";
import { sanitizeAndFixInlineHtml } from "../utils/htmlSanitizer";
import { filterSensitiveWords, stripShortTags, processShortCustomTags } from "../utils/wordFilter";
import { DEFAULT_COLOR_CONFIG, DEFAULT_LIGHT_COLOR_CONFIG } from "./ColorModal";
import { getActiveCustomFields } from "../utils/conditionalFields";

const isBuiltInField = (key: string): boolean => {
  const BUILT_IN_FIELDS = [
    "id", "name", "role", "avatar", "appearance", "appearanceLite", 
    "distinguishingFeatures", "personality", "personalityCore", "philosophy", 
    "goal", "innerSecret", "impression", "background", "relationships", 
    "powers", "skills", "inventory", "location", "status", "statusdata", "fashion", 
    "preferences", "needs", "loveviews", "experience", "nsfwpersonality", 
    "nsfwreactions", "literarydescription", "titles"
  ];
  return BUILT_IN_FIELDS.includes(key.toLowerCase());
};

const getCharacterFieldValue = (charObj: any, fieldId: string): string => {
  if (!charObj) return "";
  if (
    charObj.customData &&
    charObj.customData[fieldId] !== undefined &&
    charObj.customData[fieldId] !== null &&
    String(charObj.customData[fieldId]).trim() !== ""
  ) {
    return String(charObj.customData[fieldId]).trim();
  }
  if (
    charObj[fieldId] !== undefined &&
    charObj[fieldId] !== null &&
    String(charObj[fieldId]).trim() !== ""
  ) {
    return String(charObj[fieldId]).trim();
  }
  const lowerFieldId = fieldId.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, val] of Object.entries(charObj)) {
    if (key === "customData" || key === "pendingUpdates" || typeof val === "object") continue;
    if (
      key.toLowerCase().replace(/[^a-z0-9]/g, "") === lowerFieldId &&
      val !== undefined &&
      val !== null &&
      String(val).trim() !== ""
    ) {
      return String(val).trim();
    }
  }
  if (charObj.customData && typeof charObj.customData === "object") {
    for (const [key, val] of Object.entries(charObj.customData)) {
      if (
        key.toLowerCase().replace(/[^a-z0-9]/g, "") === lowerFieldId &&
        val !== undefined &&
        val !== null &&
        String(val).trim() !== ""
      ) {
        return String(val).trim();
      }
    }
  }
  return "";
};

const formatCodexData = (
  obj: any,
  excludeKeys: string[] = [],
  templateMode: "default" | "custom" = "default",
  customFields: any[] = []
) => {
  if (!obj) return "Không có thông tin.";
  const lines = [];

  if (templateMode === "custom") {
    lines.push(`>>> [CHẾ ĐỘ BẢNG THÔNG TIN: BẢNG TÙY CHỈNH (CUSTOM)] <<<`);
    if (customFields && customFields.length > 0) {
      lines.push(
        `CẤU TRÚC VÀ HƯỚNG DẪN CÁC TRƯỜNG TÙY CHỈNH:\n` +
          customFields
            .map(
              (f) =>
                `- ${f.label} (ID: "${f.id}"): ${f.description || "Không có hướng dẫn thêm"}`
            )
            .join("\n")
      );

      const customFieldLines: string[] = [];
      const handledKeys = new Set<string>();

      customFields.forEach((f) => {
        handledKeys.add(f.id);
        const val = getCharacterFieldValue(obj, f.id);
        if (val) {
          customFieldLines.push(`  + ${f.label} (${f.id}): ${val}`);
        }
      });

      if (obj.customData && typeof obj.customData === "object") {
        Object.entries(obj.customData).forEach(([fId, fVal]) => {
          if (!handledKeys.has(fId) && fVal !== undefined && fVal !== null && String(fVal).trim() !== "") {
            customFieldLines.push(`  + ${fId}: ${typeof fVal === "object" ? JSON.stringify(fVal) : fVal}`);
          }
        });
      }

      if (customFieldLines.length > 0) {
        lines.push(`[ DỮ LIỆU BẢNG TÙY CHỈNH (CUSTOM DATA) ]\n${customFieldLines.join("\n")}`);
      }
    }
  } else {
    lines.push(`>>> [CHẾ ĐỘ BẢNG THÔNG TIN: BẢNG MẶC ĐỊNH (DEFAULT)] <<<`);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (excludeKeys.includes(key)) continue;
    if (templateMode === "custom" && key === "customData") continue;

    if (value) {
      const formattedKey = key
        .replace(/([A-Z])/g, " $1")
        .trim()
        .toUpperCase();

      if (key === "customData" && typeof value === "object" && value !== null) {
        const customEntries = Object.entries(value);
        if (customEntries.length > 0) {
          const customLines = customEntries.map(([fId, fVal]) => {
            const fieldDef = customFields.find((f) => f.id === fId);
            const labelStr = fieldDef ? `${fieldDef.label} (${fId})` : fId;
            return `  + ${labelStr}: ${typeof fVal === "object" ? JSON.stringify(fVal) : fVal}`;
          });
          lines.push(`[ DỮ LIỆU BẢNG TÙY CHỈNH (CUSTOM DATA) ]\n${customLines.join("\n")}`);
        }
      } else if (key === "locations" && Array.isArray(value)) {
        const locationText = value
          .filter(Boolean)
          .map((loc: any) => `- **${loc?.name || "Vị trí"}**: ${loc?.description || ""}`)
          .join("\n");
        if (locationText) {
          lines.push(`[ ${formattedKey} ]\n${locationText}`);
        }
      } else if (typeof value === "string" && value.trim() !== "") {
        let finalValue = value.trim();
        // Lược bỏ phần số đo trong ngoặc vuông đối với measurements
        if (key === "measurements") {
          finalValue = finalValue.replace(/^\[.*?\]\.?\s*/, "");
        }
        lines.push(`[ ${formattedKey} ]\n${finalValue}`);
      } else if (typeof value === "object") {
        lines.push(`[ ${formattedKey} ]\n${JSON.stringify(value)}`);
      }
    }
  }
  return lines.length > 0 ? lines.join("\n\n") : "Không có thông tin.";
};

const formatNPCsCodex = (
  npcs: any[],
  mcLocation?: string,
  userInput?: string,
  mcData?: any,
  messages?: any[],
  npcTemplateMode: "default" | "custom" = "default",
  customNpcFields: any[] = [],
  disableDefaultNpcRelationships: boolean = false,
  partyTags?: Record<string, string[]>,
  customNpcConditions?: any
) => {
  if (!npcs || !Array.isArray(npcs)) return "Không có NPC nào.";
  const validNpcs = npcs.filter(Boolean);
  if (!validNpcs.length) return "Không có NPC nào.";

  const selectedNPCs: any[] = [];
  const lowerInput = (userInput || "").toLowerCase();
  const lowerMcLocation = (mcLocation || "").toLowerCase();

  // Tìm tin nhắn AI gần nhất để kiểm tra xem NPC có được nhắc tới gần đây không nhằm duy trì bối cảnh
  const latestAiMsg = messages && Array.isArray(messages)
    ? messages
        .slice()
        .reverse()
        .find((m: any) => m && m.sender === "ai" && !m.isStreaming)
    : null;
  const latestAiContent = latestAiMsg ? String(latestAiMsg.content || "").toLowerCase() : "";
  const latestAiThought = latestAiMsg ? String(latestAiMsg.thought || "").toLowerCase() : "";

  // Trích xuất tên các NPC hoạt động trong lượt cũ (lượt gần nhất) từ npcLocations của AI
  const lastTurnActiveNpcNames = latestAiMsg && Array.isArray(latestAiMsg.npcLocations)
    ? latestAiMsg.npcLocations
        .filter(Boolean)
        .map((loc: any) => String(loc?.id || loc?.name || "").toLowerCase().trim())
        .filter(Boolean)
    : [];

  const appearedNpcNames = new Set<string>();
  if (messages && Array.isArray(messages)) {
    messages.forEach(m => {
      if (m && m.sender === "ai" && Array.isArray(m.npcLocations)) {
        m.npcLocations.forEach((loc: any) => {
          if (loc && (loc.id || loc.name)) {
            appearedNpcNames.add(String(loc.id || loc.name).toLowerCase().trim());
          }
        });
      }
    });
  }

  validNpcs.forEach((npc) => {
    if (!npc) return;
    const lowerNpcName = (npc.name || "").toLowerCase();
    const lowerNpcFullName = (npc.fullName || "").toLowerCase();
    const lowerNpcTitles = (npc.titles || "").toLowerCase();
    const titleParts = lowerNpcTitles
      .split(/[,;|"'\(\)]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    const lowerNpcLocation =
      typeof npc.location === "string" ? npc.location.toLowerCase() : "";
    const lowerNpcOccupation = (npc.occupation || "").toLowerCase();

    // "Hệ Thống" hoặc các NPC của hệ thống thường đi theo MC hoặc ở khắp nơi.
    if (
      lowerNpcName.includes("hệ thống") ||
      lowerNpcFullName.includes("hệ thống")
    ) {
      selectedNPCs.push(npc);
      return;
    }

    // 1. Kiểm tra so khớp tên trực tiếp (bao gồm cả các phần của tước hiệu/nghệ danh/biệt danh)
    let isMentioned =
      (lowerNpcName &&
        lowerNpcName.trim() !== "" &&
        lowerInput.includes(lowerNpcName)) ||
      (lowerNpcFullName &&
        lowerNpcFullName.trim() !== "" &&
        lowerInput.includes(lowerNpcFullName)) ||
      titleParts.some((part) => lowerInput.includes(part));

    // 2. So khớp một phần tên riêng (ví dụ "Nhạc Dao" hay "Dao" trong "Tố Nhạc Dao")
    if (!isMentioned && lowerNpcName) {
      const parts = lowerNpcName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const lastName = parts[parts.length - 1];
        const lastTwoNames = parts.slice(-2).join(" ");
        if (
          (lastName && lastName.length >= 2 && lowerInput.includes(lastName)) ||
          (lastTwoNames && lowerInput.includes(lastTwoNames))
        ) {
          isMentioned = true;
        }
      } else if (parts.length === 1 && parts[0].length >= 2) {
        if (lowerInput.includes(parts[0])) {
          isMentioned = true;
        }
      }
    }

    // 3. So khớp vai trò/occupation (ví dụ người chơi gõ "sư tôn" hay "sư phụ" trong userInput)
    if (!isMentioned && lowerNpcOccupation) {
      if (lowerNpcOccupation.length >= 2 && lowerInput.includes(lowerNpcOccupation)) {
        isMentioned = true;
      }
    }

    // 4. So khớp danh xưng đối với MC trong relationships (termsOfAddress hoặc selfAppellation)
    if (!isMentioned && npc.relationships && Array.isArray(npc.relationships) && mcData) {
      const mcNameStr = (mcData.name || "MC").toLowerCase();
      const mcFullNameStr = (mcData.fullName || "MC").toLowerCase();

      // Tìm mối quan hệ của NPC với MC
      const mcRelation = npc.relationships.find((rel: any) => {
        if (!rel) return false;
        const relName = (rel.name || "").toLowerCase();
        return (
          relName &&
          (relName.includes(mcNameStr) ||
            mcNameStr.includes(relName) ||
            relName.includes(mcFullNameStr) ||
            mcFullNameStr.includes(relName))
        );
      });

      if (mcRelation) {
        // Kiểm tra termsOfAddress (danh xưng MC dùng để gọi NPC)
        if (Array.isArray(mcRelation.termsOfAddress)) {
          for (const term of mcRelation.termsOfAddress) {
            const lowerTerm = String(term || "").toLowerCase().trim();
            if (lowerTerm && lowerInput.includes(lowerTerm)) {
              isMentioned = true;
              break;
            }
          }
        }
        // Kiểm tra selfAppellation (cách NPC tự xưng với MC)
        if (!isMentioned && Array.isArray(mcRelation.selfAppellation)) {
          for (const selfApp of mcRelation.selfAppellation) {
            const lowerSelf = String(selfApp || "").toLowerCase().trim();
            if (lowerSelf && lowerInput.includes(lowerSelf)) {
              isMentioned = true;
              break;
            }
          }
        }
        // Kiểm tra mối quan hệ (ví dụ: "sư phụ", "sư tôn")
        if (!isMentioned && mcRelation.relation) {
          const lowerRel = String(mcRelation.relation).toLowerCase().trim();
          if (lowerRel && lowerRel.length >= 3 && lowerInput.includes(lowerRel)) {
            isMentioned = true;
          }
        }
      }
    }

    // 5. [ĐẶC BIỆT]: Kiểm tra xem NPC có xuất hiện trong lượt chơi AI gần nhất (lượt cũ) hay không
    let isRecentlyActive = false;

    const isNpcInLastTurnLocations = lastTurnActiveNpcNames.some((activeName: string) => {
      if (!activeName) return false;
      return (
        (lowerNpcName && (lowerNpcName === activeName || activeName.includes(lowerNpcName) || lowerNpcName.includes(activeName))) ||
        (lowerNpcFullName && (lowerNpcFullName === activeName || activeName.includes(lowerNpcFullName) || lowerNpcFullName.includes(activeName)))
      );
    });

    let isNpcMentionedInLastTurnText = false;
    if (latestAiContent || latestAiThought) {
      if (
        (lowerNpcName && latestAiContent.includes(lowerNpcName)) ||
        (lowerNpcFullName && latestAiContent.includes(lowerNpcFullName)) ||
        titleParts.some((part) => latestAiContent.includes(part)) ||
        (lowerNpcName && latestAiThought.includes(lowerNpcName)) ||
        (lowerNpcFullName && latestAiThought.includes(lowerNpcFullName)) ||
        titleParts.some((part) => latestAiThought.includes(part))
      ) {
        isNpcMentionedInLastTurnText = true;
      }
    }

    if (isNpcInLastTurnLocations || isNpcMentionedInLastTurnText) {
      isRecentlyActive = true;
    }

    // 6. Kiểm tra vị trí giống nhau, cùng tổ hợp không gian (Macro Venue), hoặc thuộc Tổ đội/Harem/Nhóm
    const isSameLocation =
      (lowerMcLocation &&
        lowerNpcLocation &&
        (lowerMcLocation.includes(lowerNpcLocation) ||
          lowerNpcLocation.includes(lowerMcLocation))) ||
      (lowerMcLocation === lowerNpcLocation && lowerMcLocation !== "");

    // So khớp từ khóa địa danh/tòa nhà chung (Ví dụ: cùng thuộc "nhà trọ", "công hội", "tông môn", "học viện")
    const extractVenueWords = (loc: string) => {
      if (!loc) return [];
      return loc
        .toLowerCase()
        .split(/[,;\-\.\s\/]+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3 && !["đang", "trong", "ngoài", "phòng", "khu", "tại", "ở"].includes(w));
    };

    const mcVenueWords = extractVenueWords(lowerMcLocation);
    const npcVenueWords = extractVenueWords(lowerNpcLocation);
    const sharesVenue = mcVenueWords.length > 0 && npcVenueWords.length > 0 &&
      mcVenueWords.some((w) => npcVenueWords.includes(w));

    // Kiểm tra NPC có thuộc danh sách Tổ đội / Harem / Nhóm đi cùng MC không
    const mcPartyListStr = String(mcData?.partyList || "").toLowerCase();
    const isPartyMember =
      (lowerNpcName && mcPartyListStr.includes(lowerNpcName)) ||
      (lowerNpcFullName && mcPartyListStr.includes(lowerNpcFullName)) ||
      (npc.role && /tổ đội|đồng hành|harem|bạn đồng hành|đi cùng|thành viên|nhóm/i.test(String(npc.role)));

    const hasAppeared = appearedNpcNames.has(lowerNpcName) || appearedNpcNames.has(lowerNpcFullName);

    const clonedNpc = { ...npc, _hasAppeared: hasAppeared, _isUnused: !hasAppeared };

    if (!hasAppeared) {
      selectedNPCs.push(clonedNpc);
    } else if (isSameLocation || sharesVenue || isPartyMember || isMentioned || isRecentlyActive || npc.isPinned) {
      selectedNPCs.push(clonedNpc);
    }
  });

  const formatNPC = (npc: any, idx: number) => {
    if (!npc) return "";
    const npcId = npc.id || npc.name || npc.fullName || `npc_${idx + 1}`;
    const lines = [
      `NPC ${idx + 1}:`,
      `  + ID (MÃ ĐỊNH DẠNG DUY NHẤT / TÊN GỐC - BẮT BUỘC GIỮ NGUYÊN ID NÀY TRONG JSON UPDATE KỂ CẢ KHI ĐỔI TÊN): ${npcId}`
    ];
    
    if (partyTags && partyTags[npcId] && partyTags[npcId].length > 0) {
      lines.push(`  + TAG TỔ ĐỘI / QUAN HỆ (BẮT BUỘC CHÚ Ý ĐỂ XỬ LÝ TÌNH HUỐNG): ${partyTags[npcId].join(", ")}`);
    }

    const activeCustomFields = getActiveCustomFields(customNpcFields, customNpcConditions, npc);

    if (npcTemplateMode === "custom" && activeCustomFields && activeCustomFields.length > 0) {
      const customFieldLines: string[] = [];
      const handledKeys = new Set<string>();

      activeCustomFields.forEach((f: any) => {
        handledKeys.add(f.id);
        const val = getCharacterFieldValue(npc, f.id);
        if (val) {
          customFieldLines.push(`    * ${f.label} (${f.id}): ${val}`);
        }
      });

      if (npc.customData && typeof npc.customData === "object") {
        Object.entries(npc.customData).forEach(([fId, fVal]) => {
          if (!handledKeys.has(fId) && fVal !== undefined && fVal !== null && String(fVal).trim() !== "") {
            customFieldLines.push(`    * ${fId}: ${typeof fVal === "object" ? JSON.stringify(fVal) : fVal}`);
          }
        });
      }

      if (customFieldLines.length > 0) {
        lines.push(`  + DỮ LIỆU TÙY CHỈNH (CUSTOM DATA):\n${customFieldLines.join("\n")}`);
      }
    }

    for (const [key, value] of Object.entries(npc)) {
      if (["id", "avatar", "isPinned", "appearance", "_hasAppeared", "_isUnused"].includes(key)) continue;
      if (npcTemplateMode === "custom" && key === "customData") continue;

      if (value) {
        const formattedKey = key
          .replace(/([A-Z])/g, " $1")
          .trim()
          .toUpperCase();

        if (key === "customData" && typeof value === "object" && value !== null) {
          const customEntries = Object.entries(value);
          if (customEntries.length > 0) {
            const customLines = customEntries.map(([fId, fVal]) => {
              const fieldDef = customNpcFields.find(f => f.id === fId);
              const labelStr = fieldDef ? `${fieldDef.label} (${fId})` : fId;
              return `    * ${labelStr}: ${typeof fVal === "object" ? JSON.stringify(fVal) : fVal}`;
            });
            lines.push(`  + DỮ LIỆU TÙY CHỈNH (CUSTOM DATA):\n${customLines.join("\n")}`);
          }
        } else if (typeof value === "string" && value.trim() !== "") {
          let finalValue = value.trim();
          if (key === "measurements") {
            finalValue = finalValue.replace(/^\[.*?\]\.?\s*/, "");
          }
          lines.push(`  + ${formattedKey}: ${finalValue}`);
        } else if (typeof value === "object") {
          lines.push(`  + ${formattedKey}: ${JSON.stringify(value)}`);
        }
      }
    }
    return lines.join("\n");
  };

  let output = "";

  if (npcTemplateMode === "custom") {
    output += `>>> [CHẾ ĐỘ BẢNG NPC: BẢNG TÙY CHỈNH (CUSTOM)] <<<\n`;
    if (customNpcFields && customNpcFields.length > 0) {
      output += `CẤU TRÚC VÀ HƯỚNG DẪN CÁC TRƯỜNG TÙY CHỈNH CỦA NPC:\n` + customNpcFields.map(f => {
        if (isRelationshipField(f, disableDefaultNpcRelationships)) {
          return `- ${f.label} (ID: "${f.id}"): ${f.description || "Không có hướng dẫn thêm"} [LƯU Ý: Đây là mục duy nhất về mối quan hệ/nhân quả của NPC, BẮT BUỘC tuân thủ cấu trúc mảng đối tượng JSON như mục relationships của Bảng Mặc Định: [{"name":"...", "relation":"...", "status":"...", "impression":"...", "termsOfAddress":["..."], "selfAppellation":["..."], "description":"..."}]`;
        }
        return `- ${f.label} (ID: "${f.id}"): ${f.description || "Không có hướng dẫn thêm"}`;
      }).join("\n") + "\n\n";
    }
  } else {
    output += `>>> [CHẾ ĐỘ BẢNG NPC: BẢNG MẶC ĐỊNH (DEFAULT)] <<<\n\n`;
  }

  if (selectedNPCs.length > 0) {
    output += `--- DANH SÁCH NPC TRONG TẦM MẮT HOẶC ĐANG LIÊN LẠC (DỮ LIỆU ĐẦY ĐỦ 100%) ---\n`;
    output += `[CHÚ Ý TỐI QUAN TRỌNG: ĐÂY LÀ NHỮNG NPC DUY NHẤT BẠN ĐƯỢC PHÉP MIÊU TẢ TRONG CẢNH NÀY]\n\n`;
    selectedNPCs.forEach((npc, index) => {
      if (npc) {
        output += formatNPC(npc, index) + "\n\n";
      }
    });
  } else {
    output += "Không có NPC nào trong tầm mắt hoặc được nhắc đến.\n\n";
  }

  output += `\n--- DANH SÁCH TÓM TẮT TOÀN BỘ NPC ĐÃ TỒN TẠI TRONG THẾ GIỚI (CHỈ ĐỂ THAM KHẢO) ---\n`;
  output += `[CẢNH BÁO: BẠN CHỈ DÙNG DANH SÁCH NÀY ĐỂ BIẾT AI ĐÃ TỒN TẠI NHẰM TRÁNH TẠO TRÙNG LẶP. TUYỆT ĐỐI KHÔNG ĐƯỢC CHO CÁC NPC Ở ĐÂY BẤT THẦN XUẤT HIỆN TRONG CẢNH NẾU HỌ KHÔNG CÓ TÊN Ở DANH SÁCH "TRONG TẦM MẮT" BÊN TRÊN!]\n`;
  output += validNpcs
    .map((npc) => {
      if (!npc) return "";
      const namePart = npc.titles ? `${npc.fullName || npc.name} (${npc.titles})` : (npc.fullName || npc.name || "Unknown");
      const idStr = npc.id ? ` [ID: "${npc.id}"]` : "";
      return `- ${namePart}${idStr} (Vai trò: ${npc.occupation || npc.role || "Không rõ"})`;
    })
    .filter(Boolean)
    .join("\n");

  return output.trim();
};

const LocalTimer = ({
  isGenerating,
  processingTime,
}: {
  isGenerating: boolean;
  processingTime: number;
}) => {
  const [timer, setTimer] = useState(0);

  const formatTimeStr = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number;

    const updateTimer = () => {
      setTimer(performance.now() - startTime);
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    if (isGenerating) {
      startTime = performance.now();
      setTimer(0);
      animationFrameId = requestAnimationFrame(updateTimer);
    } else {
      setTimer(0);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isGenerating]);

  return <>{formatTimeStr(isGenerating ? timer : processingTime)}</>;
};

export interface ActionInputRef {
  clear: () => void;
  setText: (text: string) => void;
}

const ActionInput = forwardRef<
  ActionInputRef,
  { isGenerating: boolean; theme: any; onSend: (text: string) => void }
>(({ isGenerating, theme, onSend }, ref) => {
  const [inputAction, setInputAction] = useState("");

  useImperativeHandle(ref, () => ({
    clear: () => setInputAction(""),
    setText: (text: string) => setInputAction(text),
  }));

  const handleSend = () => {
    if (!inputAction.trim() || isGenerating) return;
    onSend(inputAction.trim());
    setInputAction("");
  };

  return (
    <div className="w-full max-w-5xl mx-auto relative group">
      <textarea
        value={inputAction}
        onChange={(e) => setInputAction(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={
          isGenerating
            ? "Matrix Lite v6 đang vận hành..."
            : "Hành động tiếp theo của bạn (hỗ trợ xuống dòng bằng Shift+Enter)..."
        }
        className={`w-full theme-input border-transparent focus:border-blue-500/50 rounded-xl py-4 pl-4 pr-14 theme-text-base placeholder:text-slate-500 dark-theme:placeholder:text-white/30 outline-none resize-none min-h-[60px] max-h-[150px] custom-scrollbar focus:ring-1 focus:ring-blue-500/30 transition-all font-medium disabled:opacity-50 ${
          theme.group === "Dark"
            ? "focus:bg-black/60"
            : "bg-white text-[#0f172a]"
        }`}
        rows={
          inputAction.split("\n").length > 1
            ? Math.min(inputAction.split("\n").length, 5)
            : 1
        }
        disabled={isGenerating}
      />
      <button
        onClick={handleSend}
        disabled={!inputAction.trim() || isGenerating}
        className="absolute right-2 bottom-2 p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 theme-text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 cursor-pointer"
      >
        <Send
          size={18}
          className={"translate-x-0.5 " + (isGenerating ? "opacity-50" : "")}
        />
      </button>
    </div>
  );
});

const StreamLogViewer = ({
  theme,
  isExpanded,
  expandedLog,
}: {
  theme: any;
  isExpanded?: boolean;
  expandedLog?: "reasoning" | "error" | null;
}) => {
  const [localText, setLocalText] = useState("");
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  const fullScreenStreamData = useStore((state) => state.fullScreenStreamData);
  const isGeneratingGlobal = useStore(
    (state) => state.isGenerating || state.isGeneratingStream,
  );
  const streamScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = streamEmitter.subscribe((data) => {
      setLocalText(data.thought ? data.thought + "\n\n" + data.text : data.text);
      setIsGeneratingLocal(data.isGenerating);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (streamScrollRef.current) {
      streamScrollRef.current.scrollTop = streamScrollRef.current.scrollHeight;
    }
  }, [localText, fullScreenStreamData]);

  const rawText =
    localText.trim()
      ? localText
      : fullScreenStreamData.trim()
      ? fullScreenStreamData
      : "Matrix Lite x Annie xin chào cou nhé dấu<3\nĐang chờ dữ liệu...";

  const isStillProcessing = isGeneratingLocal || isGeneratingGlobal;

  // Cắt bớt chỉ khi AI ĐANG xử lý/stream dồn dập (isStillProcessing = true).
  // Sau khi AI phản hồi xong (isStillProcessing = false), BẮT BUỘC hiển thị 100% nội dung phản hồi đầy đủ.
  const displayText =
    isStillProcessing && rawText.length > 2500
      ? "...\n[Đang stream dồn dập - tạm thời cắt bớt cho mượt...]\n...\n" + rawText.slice(-2500)
      : rawText;

  const renderLines = (textClass: string) => (
    <div
      className={`font-mono text-xs leading-relaxed break-words whitespace-pre-wrap px-1 ${textClass}`}
    >
      {displayText}
    </div>
  );

  if (isExpanded) {
    return renderLines(
      expandedLog === "error" ? "text-red-400/80" : "text-green-400/80",
    );
  }

  return (
    <div
      ref={streamScrollRef}
      className={`flex-1 min-h-[200px] shrink-0 p-4 overflow-y-auto custom-scrollbar scroll-smooth ${theme.group === "Light" ? `border border-black/10 rounded-xl m-2 shadow-inner ${theme.sidebarClass}` : "theme-panel !border-none"}`}
    >
      {renderLines(
        theme.group === "Dark"
          ? "text-green-400/80"
          : "text-[#0f172a] font-medium",
      )}
    </div>
  );
};

import { SysLogViewer } from "./SysLogViewer";
import { ColorModal } from "./ColorModal";
import PhoneModal from "./PhoneModal";
import DramaModal from "./DramaModal";
import ActionSuggestionsModal from "./ActionSuggestionsModal";
import { nanoid } from "nanoid";

const sanitizeStatusData = (statusObj: any) => {
  if (!statusObj) return undefined;
  const cleanObj: any = {};
  [
    "mood",
    "psychological",
    "physiological",
    "health",
    "condition",
  ].forEach((key: string) => {
    if (Array.isArray(statusObj[key])) {
      cleanObj[key] = statusObj[key]
        .map((item: any) => {
          if (typeof item === "string") {
            return {
              name: item,
              description: "",
              type: "temporary",
              solvable: "solvable"
            };
          }
          return item;
        })
        .filter(
          (item: any) =>
            item &&
            typeof item === "object" &&
            item.name &&
            item.name.trim().length > 0,
        );
    }
  });
  return cleanObj;
};

const applyMcUpdates = (mcData: any, mcUpdatesSource: any) => {
  if (!mcUpdatesSource || typeof mcUpdatesSource !== "object") {
    return { updatedMcData: mcData, hasUpdate: false };
  }

  let hasUpdate = false;
  let updatedMcData = JSON.parse(JSON.stringify(mcData || {}));

  const cMc = { ...mcUpdatesSource };
  if (cMc.customData && typeof cMc.customData === "object" && cMc.customData !== null) {
    Object.entries(cMc.customData).forEach(([fId, fVal]) => {
      cMc[fId] = fVal;
    });
    delete cMc.customData;
  }

  [
    "ghi_chu",
    "ghi_chu_quan_trong",
    "LƯU_Ý_KHI_XUẤT_JSON",
    "TÊN_TRƯỜNG_ĐÃ_TỒN_TẠI",
    "VÍ DỤ TÊN_CÁC_TRƯỜNG (KEYS) ĐƯỢC PHÉP",
    "TÊN_CÁC_TRƯỜNG (KEYS) ĐƯỢC PHÉP UPDATE",
    "IN_THIS_JSON_OUTPUT"
  ].forEach((k) => delete cMc[k]);

  // Normalize inventory aliases
  const inventoryAliases = [
    "Túi",
    "túi",
    "Túi đồ",
    "Túi Đồ",
    "tui_do",
    "túi đồ",
    "items",
    "Inventory",
    "tuis",
    "Tài sản",
    "tài sản",
  ];
  for (const alias of inventoryAliases) {
    if (cMc[alias] !== undefined) {
      if (!cMc.inventory) {
        cMc.inventory = cMc[alias];
      } else if (
        typeof cMc.inventory === "string" &&
        typeof cMc[alias] === "string"
      ) {
        cMc.inventory += "\n" + cMc[alias];
      }
      delete cMc[alias];
    }
  }

  // Normalize other common aliases
  const goalAliases = [
    "Mục tiêu",
    "mục tiêu",
    "nhiệm vụ",
    "Nhiệm vụ",
    "Quest",
    "quest",
    "quests",
    "Quests",
  ];
  for (const alias of goalAliases) {
    if (cMc[alias] !== undefined) {
      if (!cMc.goal) {
        cMc.goal = cMc[alias];
      } else if (
        typeof cMc.goal === "string" &&
        typeof cMc[alias] === "string"
      ) {
        cMc.goal += "\n" + cMc[alias];
      }
      delete cMc[alias];
    }
  }

  // Handle inventoryChanges
  if (cMc.inventoryChanges) {
    const changes = cMc.inventoryChanges;
    let currentInventory = Array.isArray(updatedMcData.inventory)
      ? [...updatedMcData.inventory]
      : typeof updatedMcData.inventory === "string" &&
          updatedMcData.inventory.trim().length > 0
        ? [
            {
              id: "item_1",
              name: "Đồ vật lúc đầu",
              quantity: 1,
              description: updatedMcData.inventory,
            },
          ]
        : [];

    if (Array.isArray(changes)) {
      changes.forEach((item: any) => {
        if (item.name) {
          const idx = currentInventory.findIndex(
            (i) => i.name.toLowerCase() === item.name.toLowerCase(),
          );
          if (idx >= 0) {
            currentInventory[idx].quantity += item.quantity || 1;
            if (item.description)
              currentInventory[idx].description = item.description;
          } else {
            currentInventory.push({
              id: item.id || `item_${nanoid()}`,
              name: item.name,
              quantity: item.quantity || 1,
              description: item.description || "",
            });
          }
        }
      });
    } else if (changes && typeof changes === "object") {
      if (changes.add && Array.isArray(changes.add)) {
        changes.add.forEach((item: any) => {
          if (item.name) {
            const idx = currentInventory.findIndex(
              (i) => i.name.toLowerCase() === item.name.toLowerCase(),
            );
            if (idx >= 0) {
              currentInventory[idx].quantity += item.quantity || 1;
              if (item.description)
                currentInventory[idx].description = item.description;
            } else {
              currentInventory.push({
                id: item.id || `item_${nanoid()}`,
                name: item.name,
                quantity: item.quantity || 1,
                description: item.description || "",
              });
            }
          }
        });
      }

      if (changes.update && Array.isArray(changes.update)) {
        changes.update.forEach((item: any) => {
          if (item.name) {
            const idx = currentInventory.findIndex(
              (i) => i.name.toLowerCase() === item.name.toLowerCase(),
            );
            if (idx >= 0) {
              if (item.quantity !== undefined)
                currentInventory[idx].quantity = item.quantity;
              if (item.description)
                currentInventory[idx].description = item.description;
            }
          }
        });
      }

      if (changes.remove && Array.isArray(changes.remove)) {
        changes.remove.forEach((nameToRemove: any) => {
          if (typeof nameToRemove === "string") {
            currentInventory = currentInventory.filter(
              (i) => i.name.toLowerCase() !== nameToRemove.toLowerCase(),
            );
          } else if (
            typeof nameToRemove === "object" &&
            nameToRemove.name
          ) {
            currentInventory = currentInventory.filter(
              (i) => i.name.toLowerCase() !== nameToRemove.name.toLowerCase(),
            );
          }
        });
      }
    }

    cMc.inventory = currentInventory;
    delete cMc.inventoryChanges;
  }

  const smartMergeArray = (oldArr: any[], newArr: any[]) => {
    if (!Array.isArray(oldArr)) return newArr ? JSON.parse(JSON.stringify(newArr)) : [];
    if (!Array.isArray(newArr)) return JSON.parse(JSON.stringify(oldArr));

    let merged = JSON.parse(JSON.stringify(oldArr));
    newArr.forEach((newItem) => {
      if (!newItem.name) return;
      const idx = merged.findIndex((i: any) => i.name === newItem.name);
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], ...newItem };
      } else {
        merged.push(newItem);
      }
    });
    return merged;
  };

  const arrayKeys = ["powers", "skills", "relationships"];
  arrayKeys.forEach((key) => {
    if (cMc[key] && Array.isArray(cMc[key])) {
      cMc[key] = smartMergeArray(updatedMcData[key] || [], cMc[key]);
    }
  });

  const mcStatusDataKey = Object.keys(cMc).find(k => k.trim().toLowerCase() === 'statusdata');
  if (mcStatusDataKey) {
    updatedMcData.statusData = sanitizeStatusData(cMc[mcStatusDataKey]);
    delete cMc[mcStatusDataKey];
    hasUpdate = true;
  }

  // === DỌN DẸP CÁC TRƯỜNG ẢO DO AI BỊA RA ===
  const storeGameData = useStore.getState().gameData;
  const isCustomModeLocal = storeGameData?.mcTemplateMode === "custom";
  const customFields = storeGameData?.customMcFields || [];
  const defaultFields = [
      "fullname", "gender", "age", "dob", "height", "weight", "measurements", "rank", "occupation",
      "appearance", "appearancelite", "distinguishingfeatures", 
      "personality", "personalitycore", "philosophy", "goal", 
      "innersecret", "impression", "background", "relationships", 
      "powers", "skills", "inventory", "fashion", "preferences", "needs", "needssfw", "needsnsfw",
      "likesdislikesfears", "likesdislikesfearsnsfw", "loveviews", "experience", 
      "nsfwpersonality", "nsfwreactions", "literarydescription", "titles",
      "id", "name", "role", "avatar", "objectives", "partylist", "customdata"
  ];
  const directFieldsLowerForCleanup = ["location", "currentlocation", "status", "statusdata", "fashion", "partylist", "objectives"];

  Object.keys(cMc).forEach(key => {
      const keyLower = key.trim().toLowerCase();
      if (directFieldsLowerForCleanup.includes(keyLower)) return;

      let isAllowed = false;
      if (isCustomModeLocal) {
         isAllowed = customFields.some((f: any) => f.id.toLowerCase() === keyLower) || ["id", "name", "role", "avatar", "objectives", "partylist", "inventory", "customdata"].includes(keyLower);
      } else {
         isAllowed = defaultFields.includes(keyLower);
      }

      if (!isAllowed) {
         delete cMc[key];
      }
  });

  // === CẬP NHẬT TRỰC TIẾP CÁC TRƯỜNG THỰC TẾ GAMEPLAY ===
  const directFieldsLower = ["location", "currentlocation", "status", "fashion", "partylist", "objectives"];
  Object.keys(cMc).forEach((key) => {
    if (directFieldsLower.includes(key.trim().toLowerCase())) {
      // Map correctly to camelCase
      const lowerKey = key.trim().toLowerCase();
      let actualKey = key.toLowerCase();
      if (lowerKey === "partylist") actualKey = "partyList";
      if (lowerKey === "objectives") actualKey = "objectives";
      if (lowerKey === "fashion") actualKey = "fashion";
      
      updatedMcData[actualKey] = cMc[key];
      if (lowerKey === "currentlocation") {
        updatedMcData.location = cMc[key];
      }
      delete cMc[key];
      hasUpdate = true;
    }
  });

  // Dọn dẹp cả pendingUpdates cũ của MC nếu có chứa statusData, status, location, currentLocation, fashion, partyList, objectives
  if (updatedMcData.pendingUpdates) {
    let pendingChanged = false;
    const oldPending = { ...updatedMcData.pendingUpdates };

    const oldMcStatusDataKey = Object.keys(oldPending).find(k => k.trim().toLowerCase() === 'statusdata');
    if (oldMcStatusDataKey) {
      updatedMcData.statusData = sanitizeStatusData(oldPending[oldMcStatusDataKey]);
      delete oldPending[oldMcStatusDataKey];
      pendingChanged = true;
      hasUpdate = true;
    }

    const oldDirectFieldsLower = ["location", "currentlocation", "status", "fashion", "partylist", "objectives"];
    Object.keys(oldPending).forEach((key) => {
      if (oldDirectFieldsLower.includes(key.trim().toLowerCase())) {
        const lowerKey = key.trim().toLowerCase();
        let actualKey = key.toLowerCase();
        if (lowerKey === "partylist") actualKey = "partyList";
        if (lowerKey === "objectives") actualKey = "objectives";
        
        updatedMcData[actualKey] = oldPending[key];
        if (lowerKey === "currentlocation") {
          updatedMcData.location = oldPending[key];
        }
        delete oldPending[key];
        pendingChanged = true;
        hasUpdate = true;
      }
    });

    if (pendingChanged) {
      if (Object.keys(oldPending).length === 0) {
        delete updatedMcData.pendingUpdates;
      } else {
        updatedMcData.pendingUpdates = oldPending;
      }
    }
  }

  Object.keys(cMc).forEach(key => {
    let currentVal = updatedMcData[key];
    if (currentVal === undefined && updatedMcData.customData && updatedMcData.customData[key] !== undefined) {
      currentVal = updatedMcData.customData[key];
    }
    if (JSON.stringify(cMc[key]) === JSON.stringify(currentVal)) {
      delete cMc[key];
    }
  });

  if (Object.keys(cMc).length > 0) {
    const autoUpdateMc = useStore.getState().autoUpdateMc;
    if (autoUpdateMc) {
      Object.keys(cMc).forEach((key) => {
        updatedMcData[key] = cMc[key];
        if (key === "customData" && typeof cMc.customData === "object" && cMc.customData !== null) {
          updatedMcData.customData = {
            ...(updatedMcData.customData || {}),
            ...cMc.customData,
          };
          Object.entries(cMc.customData).forEach(([fId, fVal]) => {
            updatedMcData[fId] = fVal;
            if (isBuiltInField(fId)) {
              delete updatedMcData.customData[fId];
            }
          });
        } else {
          if (!isBuiltInField(key)) {
            if (!updatedMcData.customData) updatedMcData.customData = {};
            updatedMcData.customData[key] = cMc[key];
          } else if (updatedMcData.customData) {
            delete updatedMcData.customData[key];
          }
        }
      });
    } else {
      if (!updatedMcData.pendingUpdates) {
        updatedMcData.pendingUpdates = {};
      }
      updatedMcData.pendingUpdates = {
        ...updatedMcData.pendingUpdates,
        ...cMc,
      };
    }
    hasUpdate = true;
  }

  return { updatedMcData, hasUpdate };
};

const applyCodexPendingUpdates = (gameData: any, parsedData: any) => {
  const rawCodexUpdatesData =
    parsedData.codexUpdates ||
    parsedData.codexUpdate;
  
  let codexUpdatesData = rawCodexUpdatesData;
  if (Array.isArray(rawCodexUpdatesData)) {
    codexUpdatesData = rawCodexUpdatesData.length > 0 ? rawCodexUpdatesData[0] : null;
  }

  let hasCodexUpdate = false;
  const targetCodexUpdates: any = {};

  if (codexUpdatesData && typeof codexUpdatesData === "object") {
    // Auto-heal: Fix if AI mistakenly placed locations or places directly into worldData or root
    const worldDataKeys = ["name","difficulty","worldState","leaderboards","background","starterTimeline","starterScenario","mainScenario","worldRules","namingConventions","genre","mainMood","pacing","geography","worldHistory","culture","economy","religion","factions","factionRelations","uniqueElements","powerSystem","logicControl","writingStyle","narrativePerspective"];
    
    if (codexUpdatesData.worldData && typeof codexUpdatesData.worldData === "object") {
      if (codexUpdatesData.worldData.locations || codexUpdatesData.worldData.places) {
        if (!codexUpdatesData.worldDetails) codexUpdatesData.worldDetails = {};
        if (codexUpdatesData.worldData.locations) {
          codexUpdatesData.worldDetails.locations = codexUpdatesData.worldData.locations;
          delete codexUpdatesData.worldData.locations;
        }
        if (codexUpdatesData.worldData.places) {
          codexUpdatesData.worldDetails.places = codexUpdatesData.worldData.places;
          delete codexUpdatesData.worldData.places;
        }
      }
    }
    
    // Auto-heal: Move root-level worldDetails properties to worldDetails
    if (codexUpdatesData.locations || codexUpdatesData.places) {
      if (!codexUpdatesData.worldDetails) codexUpdatesData.worldDetails = {};
      if (codexUpdatesData.locations) {
        codexUpdatesData.worldDetails.locations = codexUpdatesData.locations;
        delete codexUpdatesData.locations;
      }
      if (codexUpdatesData.places) {
        codexUpdatesData.worldDetails.places = codexUpdatesData.places;
        delete codexUpdatesData.places;
      }
    }

    // Auto-heal: Move root-level worldData properties to worldData
    for (const key of worldDataKeys) {
      if (codexUpdatesData[key] !== undefined) {
        if (!codexUpdatesData.worldData) codexUpdatesData.worldData = {};
        codexUpdatesData.worldData[key] = codexUpdatesData[key];
        delete codexUpdatesData[key];
      }
    }
    
    if (codexUpdatesData.worldDetails && codexUpdatesData.worldDetails.locations) {
      if (!Array.isArray(codexUpdatesData.worldDetails.locations)) {
         if (typeof codexUpdatesData.worldDetails.locations === 'string') {
            try {
                const parsed = JSON.parse(codexUpdatesData.worldDetails.locations);
                codexUpdatesData.worldDetails.locations = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                codexUpdatesData.worldDetails.locations = [{ name: "New Location", description: codexUpdatesData.worldDetails.locations }];
            }
         } else {
            codexUpdatesData.worldDetails.locations = [codexUpdatesData.worldDetails.locations];
         }
      }
    }

    // Auto-heal: Move worldDetails properties mistakenly placed in worldData to worldDetails (if we missed any)
    if (codexUpdatesData.worldData && typeof codexUpdatesData.worldData === "object") {
       if (codexUpdatesData.worldData.creativeRules) {
           codexUpdatesData.creativeRules = codexUpdatesData.worldData.creativeRules;
           delete codexUpdatesData.worldData.creativeRules;
       }
    }

    if (codexUpdatesData.worldData && typeof codexUpdatesData.worldData === "object" && Object.keys(codexUpdatesData.worldData).length > 0) {
      targetCodexUpdates.worldData = { ...codexUpdatesData.worldData };
      hasCodexUpdate = true;
    }
    if (codexUpdatesData.worldDetails && typeof codexUpdatesData.worldDetails === "object" && Object.keys(codexUpdatesData.worldDetails).length > 0) {
      let details = { ...codexUpdatesData.worldDetails };
      if (typeof details.locations === 'string') {
        try {
          details.locations = JSON.parse(details.locations);
        } catch (e) {
          // If parsing fails, just leave it as string (though array is expected)
        }
      }
      targetCodexUpdates.worldDetails = details;
      hasCodexUpdate = true;
    }
    if (codexUpdatesData.creativeRules) {
      targetCodexUpdates.creativeRules = codexUpdatesData.creativeRules;
      hasCodexUpdate = true;
    }
  }

  const worldDataUpdates = parsedData.worldDataUpdates || parsedData.worldDataUpdate;
  if (worldDataUpdates && typeof worldDataUpdates === "object" && Object.keys(worldDataUpdates).length > 0) {
    const prevWD = targetCodexUpdates.worldData || {};
    const nextWD = {
      ...prevWD,
      ...worldDataUpdates
    };
    if (prevWD.difficulty !== undefined && worldDataUpdates.difficulty !== undefined) {
      const d1 = typeof prevWD.difficulty === 'object' && prevWD.difficulty !== null ? prevWD.difficulty : { sfw: typeof prevWD.difficulty === 'string' ? prevWD.difficulty : '', nsfw: '' };
      const d2 = typeof worldDataUpdates.difficulty === 'object' && worldDataUpdates.difficulty !== null ? worldDataUpdates.difficulty : { sfw: typeof worldDataUpdates.difficulty === 'string' ? worldDataUpdates.difficulty : '', nsfw: '' };
      nextWD.difficulty = { ...d1, ...d2 };
    }
    targetCodexUpdates.worldData = nextWD;
    hasCodexUpdate = true;
  }

  const worldDetailsUpdates = parsedData.worldDetailsUpdates || parsedData.worldDetailsUpdate;
  if (worldDetailsUpdates && typeof worldDetailsUpdates === "object" && Object.keys(worldDetailsUpdates).length > 0) {
    targetCodexUpdates.worldDetails = {
      ...(targetCodexUpdates.worldDetails || {}),
      ...worldDetailsUpdates
    };
    hasCodexUpdate = true;
  }

  if (hasCodexUpdate) {
    const autoUpdateCodex = useStore.getState().autoUpdateCodex;
    if (autoUpdateCodex) {
      if (targetCodexUpdates.worldData) {
        const prevWD = gameData.worldData || {};
        const nextWD = {
          ...prevWD,
          ...targetCodexUpdates.worldData
        };
        if (prevWD.difficulty !== undefined && targetCodexUpdates.worldData.difficulty !== undefined) {
          const d1 = typeof prevWD.difficulty === 'object' && prevWD.difficulty !== null ? prevWD.difficulty : { sfw: typeof prevWD.difficulty === 'string' ? prevWD.difficulty : '', nsfw: '' };
          const d2 = typeof targetCodexUpdates.worldData.difficulty === 'object' && targetCodexUpdates.worldData.difficulty !== null ? targetCodexUpdates.worldData.difficulty : { sfw: typeof targetCodexUpdates.worldData.difficulty === 'string' ? targetCodexUpdates.worldData.difficulty : '', nsfw: '' };
          nextWD.difficulty = { ...d1, ...d2 };
        }
        gameData.worldData = nextWD;
      }
      
      if (targetCodexUpdates.worldDetails) {
        const prevWD = gameData.worldDetails || {};
        const nextWD = {
          ...prevWD,
        };
        if (targetCodexUpdates.worldDetails.locations) {
          if (!nextWD.locations) nextWD.locations = [];
          targetCodexUpdates.worldDetails.locations.forEach((item: any) => {
            const existingIdx = nextWD.locations.findIndex((loc: any) => loc.name === item.name);
            if (existingIdx >= 0) {
              nextWD.locations[existingIdx] = item;
            } else {
              nextWD.locations.push(item);
            }
          });
        }
        if (targetCodexUpdates.worldDetails.places) {
          nextWD.places = targetCodexUpdates.worldDetails.places;
        }
        gameData.worldDetails = nextWD;
      }
      
      if (targetCodexUpdates.creativeRules) {
        gameData.creativeRules = targetCodexUpdates.creativeRules;
      }
      
      delete gameData.codexPendingUpdates;
      return { codexPendingUpdates: undefined, hasUpdate: true };
    }

    const updatedPending = JSON.parse(JSON.stringify(gameData.codexPendingUpdates || {}));
    
    if (targetCodexUpdates.worldData) {
      const prevWD = updatedPending.worldData || {};
      const nextWD = {
        ...prevWD,
        ...targetCodexUpdates.worldData
      };
      if (prevWD.difficulty !== undefined && targetCodexUpdates.worldData.difficulty !== undefined) {
        const d1 = typeof prevWD.difficulty === 'object' && prevWD.difficulty !== null ? prevWD.difficulty : { sfw: typeof prevWD.difficulty === 'string' ? prevWD.difficulty : '', nsfw: '' };
        const d2 = typeof targetCodexUpdates.worldData.difficulty === 'object' && targetCodexUpdates.worldData.difficulty !== null ? targetCodexUpdates.worldData.difficulty : { sfw: typeof targetCodexUpdates.worldData.difficulty === 'string' ? targetCodexUpdates.worldData.difficulty : '', nsfw: '' };
        nextWD.difficulty = { ...d1, ...d2 };
      }
      updatedPending.worldData = nextWD;
    }
    
    if (targetCodexUpdates.worldDetails) {
      updatedPending.worldDetails = {
        ...(updatedPending.worldDetails || {}),
        ...targetCodexUpdates.worldDetails
      };
    }
    
    if (targetCodexUpdates.creativeRules) {
      updatedPending.creativeRules = targetCodexUpdates.creativeRules;
    }
    
    return { codexPendingUpdates: updatedPending, hasUpdate: true };
  }
  
  return { codexPendingUpdates: gameData.codexPendingUpdates, hasUpdate: false };
};

const applyNpcUpdates = (npcs: any[], npcUpdatesSource: any) => {
  const validNpcs = Array.isArray(npcs) ? npcs.filter(Boolean) : [];
  if (!npcUpdatesSource) return { updatedNpcs: ensureUniqueNpcIds(validNpcs), hasUpdate: false };

  let hasUpdate = false;
  let updatedNpcs = ensureUniqueNpcIds(JSON.parse(JSON.stringify(validNpcs)));

  const normalizedUpdates: Array<{ id: string; updates: any }> = [];

  if (Array.isArray(npcUpdatesSource)) {
    npcUpdatesSource.forEach((upd: any) => {
      if (upd && typeof upd === "object") {
        const targetId = upd.id || upd.name || upd.fullName;
        if (targetId && upd.updates && typeof upd.updates === "object") {
          normalizedUpdates.push({ id: targetId, updates: upd.updates });
        } else if (targetId && typeof upd === "object") {
          const { id: _ignoreId, ...rest } = upd;
          normalizedUpdates.push({ id: targetId, updates: rest });
        }
      }
    });
  } else if (typeof npcUpdatesSource === "object") {
    Object.entries(npcUpdatesSource).forEach(([key, val]: [string, any]) => {
      if (val && typeof val === "object") {
        if (val.updates && typeof val.updates === "object") {
          normalizedUpdates.push({ id: key, updates: val.updates });
        } else {
          normalizedUpdates.push({ id: key, updates: val });
        }
      }
    });
  }

  normalizedUpdates.forEach((upd) => {
    const targetId = upd.id;
    if (!targetId || !upd.updates || typeof upd.updates !== "object") return;

    const targetStr = String(targetId).trim().toLowerCase();
    const idx = updatedNpcs.findIndex((n: any) => {
      if (!n) return false;
      const nId = n.id ? String(n.id).trim().toLowerCase() : "";
      const nName = n.name ? String(n.name).trim().toLowerCase() : "";
      const nFullName = n.fullName ? String(n.fullName).trim().toLowerCase() : "";

      // Priority 1: Persistent ID match
      if (nId && nId === targetStr) return true;
      // Priority 2: Exact Name / FullName match
      if (nName && nName === targetStr) return true;
      if (nFullName && nFullName === targetStr) return true;
      // Priority 3: Stricter substring match (only if both strings are long enough to avoid false positives)
      if (targetStr.length > 3) {
        if (nName && nName.length > 3 && (targetStr === nName || targetStr.startsWith(nName + " ") || targetStr.endsWith(" " + nName) || nName.startsWith(targetStr + " ") || nName.endsWith(" " + targetStr))) return true;
        if (nFullName && nFullName.length > 3 && (targetStr === nFullName || targetStr.startsWith(nFullName + " ") || targetStr.endsWith(" " + nFullName) || nFullName.startsWith(targetStr + " ") || nFullName.endsWith(" " + targetStr))) return true;
      }

      return false;
    });

    if (idx !== -1) {
      const cNpc = { ...upd.updates };
      if (cNpc.customData && typeof cNpc.customData === "object" && cNpc.customData !== null) {
        Object.entries(cNpc.customData).forEach(([fId, fVal]) => {
          cNpc[fId] = fVal;
        });
        delete cNpc.customData;
      }
      [
        "ghi_chu",
        "ghi_chu_quan_trong",
        "LƯU_Ý_KHI_XUẤT_JSON",
        "TÊN_TRƯỜNG_ĐÃ_TỒN_TẠI",
        "VÍ DỤ TÊN_CÁC_TRƯỜNG (KEYS) ĐƯỢC PHÉP",
        "TÊN_CÁC_TRƯỜNG (KEYS) ĐƯỢC PHÉP UPDATE",
        "IN_THIS_JSON_OUTPUT"
      ].forEach((k) => delete cNpc[k]);
      delete cNpc.inventory;
      delete cNpc.items;


      const smartMergeArray = (oldArr: any[], newArr: any[]) => {
        if (!Array.isArray(oldArr))
          return newArr ? JSON.parse(JSON.stringify(newArr)) : [];
        if (!Array.isArray(newArr))
          return JSON.parse(JSON.stringify(oldArr));

        let merged = JSON.parse(JSON.stringify(oldArr));
        newArr.forEach((newItem) => {
          if (!newItem.name) return;
          const existIdx = merged.findIndex(
            (i: any) => i.name === newItem.name
          );
          if (existIdx !== -1) {
            merged[existIdx] = { ...merged[existIdx], ...newItem };
          } else {
            merged.push(JSON.parse(JSON.stringify(newItem)));
          }
        });
        return merged;
      };

      const arrayKeys = ["powers", "skills", "relationships"];
      arrayKeys.forEach((key) => {
        if (cNpc[key] && Array.isArray(cNpc[key])) {
          cNpc[key] = smartMergeArray(
            updatedNpcs[idx][key] || [],
            cNpc[key]
          );
        }
      });

      const npcStatusDataKey = Object.keys(cNpc).find(k => k.trim().toLowerCase() === 'statusdata');
      if (npcStatusDataKey) {
        updatedNpcs[idx].statusData = sanitizeStatusData(cNpc[npcStatusDataKey]);
        delete cNpc[npcStatusDataKey];
        hasUpdate = true;
      }

      // === DỌN DẸP CÁC TRƯỜNG ẢO DO AI BỊA RA ===
      const storeGameData = useStore.getState().gameData;
      const isCustomModeLocal = storeGameData?.npcTemplateMode === "custom";
      const customFields = storeGameData?.customNpcFields || [];
      const defaultFields = [
          "fullname", "gender", "age", "dob", "height", "weight", "measurements", "rank", "occupation",
          "appearance", "appearancelite", "distinguishingfeatures", 
          "personality", "personalitycore", "philosophy", "goal", 
          "innersecret", "impression", "background", "relationships", 
          "powers", "skills", "inventory", "fashion", "preferences", "needs", "needssfw", "needsnsfw",
          "likesdislikesfears", "likesdislikesfearsnsfw", "loveviews", "experience", 
          "nsfwpersonality", "nsfwreactions", "literarydescription", "titles",
          "id", "name", "role", "avatar", "objectives", "partylist", "customdata"
      ];
      const directFieldsLowerForCleanup = ["location", "currentlocation", "status", "statusdata", "fashion"];

      Object.keys(cNpc).forEach(key => {
          const keyLower = key.trim().toLowerCase();
          if (directFieldsLowerForCleanup.includes(keyLower)) return;

          let isAllowed = false;
          if (isCustomModeLocal) {
             isAllowed = customFields.some((f: any) => f.id.toLowerCase() === keyLower) || ["id", "name", "role", "avatar", "objectives", "partylist", "customdata"].includes(keyLower);
          } else {
             isAllowed = defaultFields.includes(keyLower);
          }

          if (!isAllowed) {
             delete cNpc[key];
          }
      });

      // === CẬP NHẬT TRỰC TIẾP CÁC TRƯỜNG THỰC TẾ GAMEPLAY ===
      const directFieldsLower = ["location", "currentlocation", "status", "fashion"];
      Object.keys(cNpc).forEach((key) => {
        if (directFieldsLower.includes(key.trim().toLowerCase())) {
          updatedNpcs[idx][key.toLowerCase()] = cNpc[key];
          if (key.trim().toLowerCase() === "currentlocation") {
            updatedNpcs[idx].location = cNpc[key];
          }
          delete cNpc[key];
          hasUpdate = true;
        }
      });

      // Dọn dẹp cả pendingUpdates cũ của NPC nếu có chứa statusData, status, location, currentLocation, fashion
      if (updatedNpcs[idx].pendingUpdates) {
        let pendingChanged = false;
        const oldPending = { ...updatedNpcs[idx].pendingUpdates };

        const oldNpcStatusDataKey = Object.keys(oldPending).find(k => k.trim().toLowerCase() === 'statusdata');
        if (oldNpcStatusDataKey) {
          updatedNpcs[idx].statusData = sanitizeStatusData(oldPending[oldNpcStatusDataKey]);
          delete oldPending[oldNpcStatusDataKey];
          pendingChanged = true;
          hasUpdate = true;
        }

        const oldDirectFieldsLower = ["location", "currentlocation", "status", "fashion"];
        Object.keys(oldPending).forEach((key) => {
          if (oldDirectFieldsLower.includes(key.trim().toLowerCase())) {
            updatedNpcs[idx][key.toLowerCase()] = oldPending[key];
            if (key.trim().toLowerCase() === "currentlocation") {
              updatedNpcs[idx].location = oldPending[key];
            }
            delete oldPending[key];
            pendingChanged = true;
            hasUpdate = true;
          }
        });

        if (pendingChanged) {
          if (Object.keys(oldPending).length === 0) {
            delete updatedNpcs[idx].pendingUpdates;
          } else {
            updatedNpcs[idx].pendingUpdates = oldPending;
          }
        }
      }

      Object.keys(cNpc).forEach(key => {
        let currentVal = updatedNpcs[idx][key];
        if (currentVal === undefined && updatedNpcs[idx].customData && updatedNpcs[idx].customData[key] !== undefined) {
          currentVal = updatedNpcs[idx].customData[key];
        }
        if (JSON.stringify(cNpc[key]) === JSON.stringify(currentVal)) {
          delete cNpc[key];
        }
      });

      if (Object.keys(cNpc).length > 0) {
        const autoUpdateNpc = useStore.getState().autoUpdateNpc;
        if (autoUpdateNpc) {
          Object.keys(cNpc).forEach((key) => {
            updatedNpcs[idx][key] = cNpc[key];
            if (key === "customData" && typeof cNpc.customData === "object" && cNpc.customData !== null) {
              updatedNpcs[idx].customData = {
                ...(updatedNpcs[idx].customData || {}),
                ...cNpc.customData,
              };
              Object.entries(cNpc.customData).forEach(([fId, fVal]) => {
                updatedNpcs[idx][fId] = fVal;
                if (isBuiltInField(fId)) {
                  delete updatedNpcs[idx].customData[fId];
                }
              });
            } else {
              if (!isBuiltInField(key)) {
                if (!updatedNpcs[idx].customData) updatedNpcs[idx].customData = {};
                updatedNpcs[idx].customData[key] = cNpc[key];
              } else if (updatedNpcs[idx].customData) {
                delete updatedNpcs[idx].customData[key];
              }
            }
          });
        } else {
          if (!updatedNpcs[idx].pendingUpdates) {
            updatedNpcs[idx].pendingUpdates = {};
          }
          updatedNpcs[idx].pendingUpdates = {
            ...updatedNpcs[idx].pendingUpdates,
            ...cNpc,
          };
        }
        hasUpdate = true;
      }
    }
  });

  return { updatedNpcs: ensureUniqueNpcIds(updatedNpcs), hasUpdate };
};
const autoColorizeQuotes = (
  rawText: string,
  useColorEnabled: boolean,
  colorConfig: any,
  isDarkTheme: boolean,
  mcName: string = ""
) => {
  if (!rawText) return rawText;
  try {
    let text = sanitizeAndFixInlineHtml(rawText);

    const getColor = (key: string) => {
      if (!key) return "";
      const canonicalKey = getCanonicalKey(key);
      return (
        colorConfig?.[canonicalKey] ||
        colorConfig?.[key] ||
        (isDarkTheme ? (DEFAULT_COLOR_CONFIG as Record<string, string>)[canonicalKey] : (DEFAULT_LIGHT_COLOR_CONFIG as Record<string, string>)[canonicalKey]) ||
        (isDarkTheme ? (DEFAULT_COLOR_CONFIG as Record<string, string>)[key] : (DEFAULT_LIGHT_COLOR_CONFIG as Record<string, string>)[key]) ||
        ""
      );
    };

    const removeVietnameseTones = (str: string) => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    };

    const knownKeysMap: Record<string, string> = {};
    const registerKey = (k: string) => {
      if (!k) return;
      knownKeysMap[k] = k;
      knownKeysMap[k.toLowerCase()] = k;
      const noTone = removeVietnameseTones(k);
      knownKeysMap[noTone] = k;
      knownKeysMap[noTone.toLowerCase()] = k;
    };

    const aliasesMap: Record<string, string> = {
      "dâm thủy": "damThuy",
      "dâm dịch": "damThuy",
      "dâmdịch": "damThuy",
      "dâmthủy": "damThuy",
      "tình dịch": "damThuy",
      "tơ dâm": "damThuy",
      "tinh dịch": "damThuy",
      "dịch sinh lý": "damThuy",
      "dịch âm đạo": "damThuy",
      "nước dâm": "damThuy",
      "damthuy": "damThuy",
      "damdich": "damThuy",
      "tinhdich": "damThuy",
      "tinhdịch": "damThuy",
      "tìnhdịch": "damThuy",
    };

    [
      "mc", "npcNam", "npcNu", "npcQuanChung", "linhThieng", "danhHieu", "coThe", "trangPhuc", "itemConLai", "thought",
      "diaDanh", "quocGia", "toChuc", "vuKhi", "kyNang", "khoBau", "thuoc", "thucAn", "nuocUong", "vatPham",
      "taiSan", "tinNhan", "suKien", "quaiVat", "thuCung", "thuCuoi", "amThanhMoiTruong", "amThanhMayMoc",
      "mau", "damThuy", "mana", "thucVat", "maPhap", "thanThanh", "camXuc", "bangGia", "canhGioi", "chucNghiep", "thienNhien",
      "luatPhap", "luat", "quydinh", "luatdongthuan",
      ...Object.keys(colorConfig || {}),
      ...Object.keys(DEFAULT_COLOR_CONFIG),
      ...Object.keys(DEFAULT_LIGHT_COLOR_CONFIG)
    ].forEach(registerKey);

    const getCanonicalKey = (key: string) => {
      if (!key) return key;
      const cleanKey = key.replace(/^#/, "").trim();
      const lower = cleanKey.toLowerCase();
      if (aliasesMap[lower]) return aliasesMap[lower];
      const noTone = removeVietnameseTones(lower);
      if (aliasesMap[noTone]) return aliasesMap[noTone];
      if (knownKeysMap[cleanKey]) return knownKeysMap[cleanKey];
      if (knownKeysMap[lower]) return knownKeysMap[lower];
      if (knownKeysMap[noTone]) return knownKeysMap[noTone];
      return cleanKey;
    };

    const wrapHtmlSpan = (colorHex: string, innerContent: string): string => {
      if (!colorHex || !innerContent) return innerContent;
      if (/\n\s*\n/.test(innerContent)) {
        const parts = innerContent.split(/(\n\s*\n)/);
        return parts
          .map((part) => {
            if (/^\n\s*\n$/.test(part)) return part;
            if (!part.trim()) return part;
            return `<span style="color: ${colorHex}">${part}</span>`;
          })
          .join("");
      }
      return `<span style="color: ${colorHex}">${innerContent}</span>`;
    };

    if (!useColorEnabled) {
      let cleanText = text;
      // 0. Strip short bracket custom tags e.g. [vuKhi:Trầm Hương Kiếm] -> Trầm Hương Kiếm
      let prevShort = "";
      do {
        prevShort = cleanText;
        cleanText = cleanText.replace(/\[#?([^\s:\]\n]+)\s*:\s*([^\[\]\n]+)\]/g, "$2");
      } while (cleanText !== prevShort);

      // 1. Strip attribute-based custom tags e.g. <tag key="vuKhi">text</tag>
      cleanText = cleanText.replace(/<(?:tag|color|c)\s+(?:key|name|id)=['"]([a-zA-Z0-9_]+)['"][^>]*>([\s\S]*?)<\/(?:tag|color|c)>/gi, "$2");
      // 2. Strip custom element tags e.g. <vuKhi>sword</vuKhi> -> sword
      cleanText = cleanText.replace(/<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/gi, "$2");

      let prev = "";
      do {
        prev = cleanText;
        cleanText = cleanText.replace(/<span\s+style=['"]color:\s*[^'"]+['"][^>]*>([\s\S]*?)<\/span>/gi, "$1");
      } while (cleanText !== prev);

      return cleanText
        .replace(/<span\s+style=['"]color:\s*[^'"]+['"][^>]*>/gi, "")
        .replace(/<\/span>/gi, "");
    }

    // Move isPlaceholder up so it can be used by all custom tag processors
    const isPlaceholder = (s: string) => {
      if (!s) return true;
      const norm = removeVietnameseTones(s.trim().toLowerCase());
      const placeholders = [
        "khong co", "chua co", "khong ro", "chua ro", "chua biet", "chua xac dinh",
        "bi mat", "khong tiet lo", "chua cap nhat", "n/a", "none", "unknown", "null",
        "undefined", "khong", "chua", "tat ca", "nguoi choi", "vo danh", "an", "khong biet",
        "nam", "nu", "phu", "mob", "extra", "quan chung"
      ];
      return placeholders.includes(norm);
    };

    // Convert custom tags into <span style='color: ...'> using color table
    // 0. Short bracket custom tags e.g. [vuKhi:Trầm Hương Kiếm], [mc:【Lâm Thiên】: 「...」], [npcNu:Thẩm Ngọc Nhan: 「...」]
    text = processShortCustomTags(text, (rawKey, innerContent) => {
      if (isPlaceholder(innerContent)) return innerContent;
      const canonicalKey = getCanonicalKey(rawKey);
      const color = getColor(canonicalKey) || getColor(rawKey) || getColor("itemConLai") || getColor("vatPham") || "#CC5500";
      return color ? wrapHtmlSpan(color, innerContent) : innerContent;
    });

    // 1. Attribute-based custom tags e.g. <tag key="vuKhi">content</tag>
    text = text.replace(/<(?:tag|color|c)\s+(?:key|name|id)=['"]([a-zA-Z0-9_]+)['"][^>]*>([\s\S]*?)<\/(?:tag|color|c)>/gi, (m, key, content) => {
      if (isPlaceholder(content)) return content;
      const canonicalKey = getCanonicalKey(key);
      const color = getColor(canonicalKey) || getColor(key);
      return color ? wrapHtmlSpan(color, content) : content;
    });

    // 2. Direct custom tags e.g. <vuKhi>content</vuKhi>, <quaiVat>content</quaiVat>
    text = text.replace(/<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/gi, (match, tagName, innerContent) => {
      if (isPlaceholder(innerContent)) return innerContent;
      const canonicalKey = getCanonicalKey(tagName);
      if (knownKeysMap[canonicalKey] || knownKeysMap[tagName]) {
        const color = getColor(canonicalKey) || getColor(tagName);
        return color ? wrapHtmlSpan(color, innerContent) : innerContent;
      }
      return match;
    });

    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mcRegex = mcName ? new RegExp(escapeRegExp(mcName), "i") : null;

                        const regexThoai = /((?:【[^】]+】|\\*\\*[^*]+\\*\\*|[*_][^*_]+[*_]|[A-ZÀ-Ỹa-zà-ỹ0-9\\s_]+)\\s*:\\s*(?:\\([^)]+\\)\\s*)?)?(「[^」]+」)/g;
    const regexSuyNghi = /\*\([^)]+\)\*/g;
    const regexAmThanh = /\*~[^~]+~\*/g;

    const wrapWithSpan = (regex: RegExp, defaultColorKey: string) => {
      text = text.replace(regex, (...args: any[]) => {
        const match = args[0];
        const fullStr = typeof args[args.length - 1] === 'string' ? args[args.length - 1] : text;
        const offset = typeof args[args.length - 2] === 'number' ? args[args.length - 2] : 0;
        const p1 = args.length > 3 && typeof args[1] === 'string' ? args[1] : undefined;

        const preText = fullStr.slice(0, offset);
        const openSpans = (preText.match(/<span\b[^>]*>/gi) || []).length;
        const closeSpans = (preText.match(/<\/span>/gi) || []).length;
        if (openSpans > closeSpans) {
          return match;
        }
        let colorKey = defaultColorKey;
        if (p1) {
          if (mcRegex && mcRegex.test(p1)) {
            colorKey = "mc";
          } else {
            const cleanP1 = p1.replace(/[*_【】]/g, "").trim().toLowerCase();
            if (/lính|bảo vệ|gác cổng|quần chúng|dân làng|mạo hiểm giả|an ninh|tên\s+|quái|sát thủ|tên lính|phụ|mob|extra/i.test(cleanP1)) {
              colorKey = "npcQuanChung";
            }
          }
        }
        const colorHex = getColor(colorKey);
        return colorHex ? wrapHtmlSpan(colorHex, match) : match;
      });
    };

                    wrapWithSpan(regexThoai, "npcNam"); // Default to npcNam for untagged dialog
    wrapWithSpan(regexSuyNghi, "thought");
    wrapWithSpan(regexAmThanh, "amThanhMoiTruong");

    // 2.5 Auto-colorize untagged raw brackets [Skill/Item/Name] (e.g. [Làm Sạch]) if AI forgot key
    text = text.replace(/(^|[^a-zA-Z0-9_="'#])\[([^\[\]:<>\n]{2,40})\](?!\()/g, (match, prefix, innerContent) => {
      const trimmed = innerContent.trim();
      if (!trimmed || isPlaceholder(trimmed)) return match;
      const color = getColor("kyNang") || getColor("itemConLai") || getColor("vatPham") || "#2DD4BF";
      return color ? prefix + wrapHtmlSpan(color, `[${trimmed}]`) : match;
    });

    // 3. Fallback Auto-Colorize character names, nicknames, full names & titles in prose if AI forgot tag
    try {
      const storeState = (useStore as any)?.getState ? (useStore as any).getState() : null;
      const gameData = storeState?.gameData;
      const namesToColor: { name: string; key: string }[] = [];

      const addCandidateName = (str: any, key: string) => {
        if (!str || typeof str !== 'string') return;
        // Clean any tags/brackets from candidate name e.g. [npcNu:Ana] -> Ana
        let cleanedName = str.replace(/\[#?[a-zA-Z0-9_]+:\s*([^\]]+)\]/g, "$1").replace(/[*_【】\[\]]/g, "").trim();
        if (cleanedName.length < 2 || isPlaceholder(cleanedName)) return;
        namesToColor.push({ name: cleanedName, key });

        if (cleanedName.includes(',') || cleanedName.includes(';') || cleanedName.includes('|') || cleanedName.includes('/')) {
          const parts = cleanedName.split(/[,;|/]/);
          parts.forEach(p => {
            const cleaned = p.trim();
            if (cleaned.length >= 2 && !isPlaceholder(cleaned)) {
              namesToColor.push({ name: cleaned, key });
            }
          });
        }
      };

      // --- MC: Name, Full Name, Nickname, Titles ---
      const currentMcName = mcName || storeState?.mcName || storeState?.characterName || gameData?.mcData?.name || "";
      addCandidateName(currentMcName, "mc");
      addCandidateName(gameData?.mcData?.fullName || storeState?.mcData?.fullName, "mc");
      addCandidateName(gameData?.mcData?.nickname || gameData?.mcData?.nickName || storeState?.mcData?.nickname, "mc");
      addCandidateName(gameData?.mcData?.titles || gameData?.mcData?.title || storeState?.mcData?.titles, "mc");

      if (Array.isArray(gameData?.mcsData)) {
        gameData.mcsData.forEach((mcObj: any) => {
          addCandidateName(mcObj?.name, "mc");
          addCandidateName(mcObj?.fullName, "mc");
          addCandidateName(mcObj?.nickname || mcObj?.nickName, "mc");
          addCandidateName(mcObj?.titles || mcObj?.title, "mc");
        });
      }

      // --- NPCs: Name, Full Name, Nickname, Titles ---
      const rawNpcs = [...(storeState?.npcs || []), ...(gameData?.npcs || [])];
      if (Array.isArray(rawNpcs)) {
        rawNpcs.forEach((npc: any) => {
          if (!npc) return;
          const gender = String(npc.gender || "").toLowerCase();
          const role = String(npc.role || "").toLowerCase();
          let key = "npcNam";
          if (gender.includes("nữ") || gender.includes("female") || gender.includes("gái") || gender.includes("nu")) {
            key = "npcNu";
          } else if (
            gender.includes("quần chúng") || gender.includes("extra") || gender.includes("phụ") || gender.includes("mob") || gender.includes("quanchung") ||
            role.includes("quần chúng") || role.includes("extra") || role.includes("phụ")
          ) {
            key = "npcQuanChung";
          }

          addCandidateName(npc?.name, key);
          addCandidateName(npc?.fullName, key);
          addCandidateName(npc?.nickname || npc?.nickName, key);
          addCandidateName(npc?.titles || npc?.title, key);
        });
      }

      namesToColor.sort((a, b) => b.name.length - a.name.length);

      const uniqueNamesMap = new Map<string, string>();
      namesToColor.forEach(item => {
        const lower = item.name.toLowerCase();
        if (!uniqueNamesMap.has(lower)) {
          uniqueNamesMap.set(lower, item.key);
        }
      });

      uniqueNamesMap.forEach((key, nameLower) => {
        try {
          const item = namesToColor.find(i => i.name.toLowerCase() === nameLower);
          if (!item) return;
          const targetName = item.name;
          const colorHex = getColor(key);
          if (!colorHex) return;

          const escaped = escapeRegExp(targetName);
          const nameRegex = new RegExp(`(^|[^a-zA-Z0-9_À-ỹ])(${escaped})(?![a-zA-Z0-9_À-ỹ])`, 'gi');
          text = text.replace(nameRegex, (match, prefix, capturedName, offset, fullStr) => {
            const actualOffset = offset + prefix.length;
            const preText = fullStr.slice(0, actualOffset);
            const openSpans = (preText.match(/<span\b[^>]*>/gi) || []).length;
            const closeSpans = (preText.match(/<\/span>/gi) || []).length;
            if (openSpans > closeSpans) {
              return match;
            }
            const lastOpenTag = preText.lastIndexOf('<');
            const lastCloseTag = preText.lastIndexOf('>');
            if (lastOpenTag > lastCloseTag) {
              return match;
            }
            const lastOpenBracket = preText.lastIndexOf('[');
            const lastCloseBracket = preText.lastIndexOf(']');
            if (lastOpenBracket > lastCloseBracket) {
              return match;
            }
            return prefix + wrapHtmlSpan(colorHex, capturedName);
          });
        } catch (e) {
          // ignore single name error
        }
      });

      // --- 4. Fallback Auto-Colorize Body Parts (coThe) if AI forgot custom tag ---
      const coTheColorHex = getColor("coThe");
      if (coTheColorHex) {
        const bodyPartTerms = [
          "bầu ngực căng tròn", "đôi gò bồng đảo", "đôi mắt long lanh", "vòng một quyến rũ", "gương mặt kiều diễm",
          "bầu ngực", "bờ ngực", "vòm ngực", "vòng một", "bầu vú", "cặp vú", "núm vú", "đầu ti", "nhũ hoa", "đầu vú",
          "bờ môi", "làn môi", "chiếc lưỡi", "gương mặt", "khuôn mặt", "mái tóc", "sống mũi", "vành tai", "đôi tai", "lỗ tai", "hàng lông mày", "gò má",
          "đôi mắt", "ánh mắt", "tròng mắt", "bờ vai", "bờ lưng", "lồng ngực", "thắt lưng", "vòng eo",
          "bàn tay", "cánh tay", "ngón tay", "cổ tay", "khuỷu tay", "đôi chân", "bàn chân", "cổ chân", "gót chân",
          "cặp đùi", "đùi non", "bắp đùi", "cặp mông", "bờ mông", "vòng ba", "vùng háng",
          "dương vật", "quy đầu", "đầu khất", "thân cu", "tinh hoàn", "cậu nhỏ", "thằng nhỏ", "cụm lông mu", "lông mu",
          "âm đạo", "âm hộ", "cửa mình", "mép lồn", "khe lồn", "hạt le", "tử cung", "dâm thủy", "dâm dịch",
          "vùng kín", "bộ phận sinh dục", "khe nhạy cảm", "vóc dáng", "hình thể", "cơ thể", "thân thể", "làn da", "da thịt",
          "vú", "mông", "đùi", "dái", "mu", "cặc", "lồn"
        ];

        bodyPartTerms.sort((a, b) => b.length - a.length);

        bodyPartTerms.forEach((term) => {
          try {
            const escaped = escapeRegExp(term);
            const termRegex = new RegExp(`(^|[^a-zA-Z0-9_À-ỹ])(${escaped})(?![a-zA-Z0-9_À-ỹ])`, 'gi');
            text = text.replace(termRegex, (match, prefix, capturedName, offset, fullStr) => {
              const actualOffset = offset + prefix.length;
              const preText = fullStr.slice(0, actualOffset);
              const openSpans = (preText.match(/<span\b[^>]*>/gi) || []).length;
              const closeSpans = (preText.match(/<\/span>/gi) || []).length;
              if (openSpans > closeSpans) {
                return match;
              }
              const lastOpenTag = preText.lastIndexOf('<');
              const lastCloseTag = preText.lastIndexOf('>');
              if (lastOpenTag > lastCloseTag) {
                return match;
              }
              const lastOpenBracket = preText.lastIndexOf('[');
              const lastCloseBracket = preText.lastIndexOf(']');
              if (lastOpenBracket > lastCloseBracket) {
                return match; // Inside raw bracket tag e.g. [coThe:làn da]
              }
              return prefix + wrapHtmlSpan(coTheColorHex, capturedName);
            });
          } catch (e) {
            // ignore
          }
        });
      }
    } catch (err) {
      // Fail-safe catch for fallback colorizer
    }

    // Final sweep: process any remaining short bracket custom tags
    text = processShortCustomTags(text, (rawKey, innerContent) => {
      const canonicalKey = getCanonicalKey(rawKey);
      const color = getColor(canonicalKey) || getColor(rawKey) || getColor("itemConLai") || getColor("vatPham") || "#CC5500";
      return color ? wrapHtmlSpan(color, innerContent) : innerContent;
    });

    return text;
  } catch (globalErr) {
    console.error("autoColorizeQuotes global error:", globalErr);
    return rawText;
  }
};

const useFPS = () => {
  const [fps, setFps] = React.useState(0);
  React.useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId;
    const calculateFPS = (time) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(calculateFPS);
    };
    animationFrameId = requestAnimationFrame(calculateFPS);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
  return fps;
};

export default function Gameplay() {
  const currentFPS = useFPS();
  const theme = useStore((state) => state.theme);
  const showTitles = useStore((state) => state.showTitles);
  const gameData = useStore((state) => state.gameData);
  const setGameData = useStore((state) => state.setGameData);
  const updateStreamData = useStore((state) => state.updateStreamData);
  const setIsGeneratingStream = useStore(
    (state) => state.setIsGeneratingStream,
  );
  const messages = useStore((state) => state.messages);
  const unreadMessages = useStore((state) => state.unreadMessages);
  const phoneAppControl = useStore((state) => state.phoneAppControl) || { messenger: true, discord: true };
  const setMessages = useStore((state) => state.setMessages);
  const saveCurrentGame = useStore((state) => state.saveCurrentGame);
  const autoSaveCurrentGame = useStore((state) => state.autoSaveCurrentGame);
  const resumeLatestGame = useStore((state) => state.resumeLatestGame);
  const useColorEnabled = useStore((state) => state.useColorEnabled);
  const colorConfig = useStore((state) => state.colorConfig);
  const setUseColorEnabled = useStore((state) => state.setUseColorEnabled);
  const targetWordCount = useStore((state) => state.targetWordCount);
  const temperature = useStore((state) => state.temperature);
  const topP = useStore((state) => state.topP);
  const topK = useStore((state) => state.topK);
  const playerRules = useStore((state) => state.playerRules);
  const setPlayerRules = useStore((state) => state.setPlayerRules);
  const setSystemLogs = useStore((state) => state.setSystemLogs);
  const memoryFullTurnsCount = useStore((state) => state.memoryFullTurnsCount);
  const memoryLogsCount = useStore((state) => state.memoryLogsCount);
  const setMemoryFullTurnsCount = useStore(
    (state) => state.setMemoryFullTurnsCount,
  );
  const setMemoryLogsCount = useStore((state) => state.setMemoryLogsCount);
  const autoUpdateMc = useStore((state) => state.autoUpdateMc);
  const autoUpdateNpc = useStore((state) => state.autoUpdateNpc);
  const autoUpdateCodex = useStore((state) => state.autoUpdateCodex);
  const setAutoUpdateCodex = useStore((state) => state.setAutoUpdateCodex);
  const navigate = useNavigate();
  const isMobile = useDeviceMode();
  const [leftOpen, setLeftOpen] = useState(!isMobile);
  const [rightOpen, setRightOpen] = useState(!isMobile);
  const [expandedLog, setExpandedLog] = useState<"reasoning" | "error" | null>(
    null,
  );
  const expandedLogScrollRef = useRef<HTMLDivElement>(null);

  const scrollExpandedLogToTop = () => {
    if (expandedLogScrollRef.current) {
      expandedLogScrollRef.current.scrollTop = 0;
    }
  };

  const scrollExpandedLogToBottom = () => {
    if (expandedLogScrollRef.current) {
      expandedLogScrollRef.current.scrollTop =
        expandedLogScrollRef.current.scrollHeight;
    }
  };

  // Update panel states when device mode changes
  useEffect(() => {
    setLeftOpen(!isMobile);
    setRightOpen(!isMobile);
  }, [isMobile]);
  const actionInputRef = useRef<ActionInputRef>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const isDramatic = useStore((state) => state.isDramaticEnabled);
  const setIsDramatic = useStore((state) => state.setIsDramaticEnabled);
  const [showDramaMenuHeader, setShowDramaMenuHeader] = useState(false);
  const [showDramaMenuSidebar, setShowDramaMenuSidebar] = useState(false);

  const triggerDramaticEvent = () => {
    if (isGenerating) return;

    // Gieo lệnh đặc biệt
    const command = `[KÍCH HOẠT SỰ KIỆN KỊCH TÍNH BẤT NGỜ]`;

    // Gửi tin nhắn User đẹp đẽ hiển thị trên khung chat
    const userMsgId = nanoid() + "_u";
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        content: "🎬 [Hệ Thống]: Yêu cầu Hội đồng AI bùng nổ một sự kiện kịch tính bất ngờ ngay lập tức!"
      },
    ]);

    generateTurn(command);
  };

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeDuration, setSummarizeDuration] = useState(0);

  const isSuggestionsLocked = useStore((state) => state.isSuggestionsLocked);
  const setIsSuggestionsLocked = useStore(
    (state) => state.setIsSuggestionsLocked,
  );
  const isHardModeEnabled = useStore((state) => state.isHardModeEnabled);
  const isFanfictionModeEnabled = useStore((state) => state.isFanfictionModeEnabled);
  const isVNDialogueModeEnabled = useStore((state) => state.isVNDialogueModeEnabled);
  const setIsHardModeEnabled = useStore((state) => state.setIsHardModeEnabled);
  const [collapsedSuggestions, setCollapsedSuggestions] = useState<
    Record<string, boolean>
  >({});

  const [showFemaleNPCs, setShowFemaleNPCs] = useState(true);
  const [showMaleNPCs, setShowMaleNPCs] = useState(true);
  const [npcSearchQuery, setNpcSearchQuery] = useState("");

  const getHeaderBtnClass = (
    colorType:
      | "green"
      | "amber"
      | "blue"
      | "emerald"
      | "indigo"
      | "teal"
      | "pink"
      | "purple"
      | "gray"
      | "orange"
      | "cyan"
      | "rose",
  ) => {
    const isDark = theme.group === "Dark";
    switch (colorType) {
      case "green":
        return isDark
          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
          : "bg-green-600 hover:bg-green-700 text-white shadow-sm";
      case "amber":
        return isDark
          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
          : "bg-amber-600 hover:bg-amber-700 text-white shadow-sm";
      case "blue":
        return isDark
          ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm";
      case "emerald":
        return isDark
          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm";
      case "indigo":
        return isDark
          ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm";
      case "teal":
        return isDark
          ? "bg-teal-500/20 text-teal-400 hover:bg-teal-500/30"
          : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm";
      case "pink":
        return isDark
          ? "bg-pink-500/20 text-pink-400 hover:bg-pink-500/30"
          : "bg-pink-600 hover:bg-pink-700 text-white shadow-sm";
      case "purple":
        return isDark
          ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
          : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm";
      case "orange":
        return isDark
          ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
          : "bg-orange-600 hover:bg-orange-700 text-white shadow-sm";
      case "cyan":
        return isDark
          ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
          : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm";
      case "rose":
        return isDark
          ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
          : "bg-rose-600 hover:bg-rose-700 text-white shadow-sm";
      default:
        return isDark
          ? "bg-white/10 text-white/80 hover:bg-white/20"
          : "bg-slate-600 hover:bg-slate-700 text-white shadow-sm";
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSummarizing) {
      setSummarizeDuration(0);
      interval = setInterval(() => {
        setSummarizeDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setSummarizeDuration(0);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isSummarizing]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const npcListRef = useRef<HTMLDivElement>(null);

  // Init RAG
  useEffect(() => {
    let isMounted = true;
    const initRAG = async () => {
      try {
        await ragService.init();
        if (!isMounted) return;
        // Mute instant success message
      } catch (err) {
        if (!isMounted) return;
        toast.error("Lỗi khởi tạo mô hình RAG.");
      }
    };
    initRAG();
    return () => {
      isMounted = false;
    };
  }, []);

  // States for new modals
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isDramaModalOpen, setIsDramaModalOpen] = useState(false);
  const [isActionSuggestionsModalOpen, setIsActionSuggestionsModalOpen] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [memoryActiveTab, setMemoryActiveTab] = useState<
    "settings" | "logs" | "state"
  >("settings");
  const [showGallery, setShowGallery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMC, setShowMC] = useState(false);
  const [showParty, setShowParty] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showNPCBuilder, setShowNPCBuilder] = useState(false);
  const [selectedNPCIndex, setSelectedNPCIndex] = useState<number | null>(null);

  // Stats & Timers
  const [currentStats, setCurrentStats] = useState({
    processingTime: 0,
    wordCount: 0,
    tokensIn: 0,
    tokensOut: 0,
    tokensTotal: 0,
  });

  const lastAiMsg = React.useMemo(() => {
    const aiMsgs = messages.filter((m: any) => m.sender === "ai");
    return aiMsgs[aiMsgs.length - 1];
  }, [messages]);

  const latestAiMsg = React.useMemo(() => {
    return messages
      .slice()
      .reverse()
      .find((m: any) => m.sender === "ai" && !m.isStreaming);
  }, [messages]);

  const currentWorldTime = latestAiMsg?.worldTime || "N/A";
  const currentWeather = latestAiMsg?.weather || "";
  const currentLoc = (latestAiMsg?.mcLocation || "N/A")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_~`]/g, "");

  useEffect(() => {
    if (!isGenerating && lastAiMsg?.stats) {
      setCurrentStats(lastAiMsg.stats);
    }
  }, [isGenerating, lastAiMsg]);

  // Turns


  const prevMessagesLengthForNPCs = React.useRef(messages.length);
  const prevLatestAiMsgId = React.useRef(latestAiMsg?.id);
  const prevProcessedNPCsMap = React.useRef(new Map()); // Map<npcName, { lastKnownLoc, isStrikethrough }>

  const processedNPCs = React.useMemo(() => {
    // Only recompute last known locations if the amount of messages changed OR latestAiMsg changed
    // We ignore streaming changes for this because streaming message (latestAiMsg = prev) 
    // does not affect last known locations of previous turns!
    const shouldRecomputeLocations = messages.length !== prevMessagesLengthForNPCs.current || latestAiMsg?.id !== prevLatestAiMsgId.current;
    
    if (shouldRecomputeLocations) {
      prevMessagesLengthForNPCs.current = messages.length;
      prevLatestAiMsgId.current = latestAiMsg?.id;
      prevProcessedNPCsMap.current.clear();
      
      const npcs = (gameData?.npcs || []).filter(Boolean);
      npcs.forEach(npc => {
        if (!npc || !npc.name) return;
        let lastKnownLoc = undefined;
        let isStrikethrough = false;
        
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (
            msg &&
            msg.sender === "ai" &&
            Array.isArray(msg.npcLocations) &&
            msg.id !== latestAiMsg?.id
          ) {
            const locObj = msg.npcLocations.find(
              (loc: any) =>
                loc && npc &&
                ((loc.id && npc.id && String(loc.id).toLowerCase().trim() === String(npc.id).toLowerCase().trim()) || (loc.id && npc.name && String(loc.id).toLowerCase().trim() === String(npc.name).toLowerCase().trim()) || (loc.id && npc.fullName && String(loc.id).toLowerCase().trim() === String(npc.fullName).toLowerCase().trim()) || (loc.name && npc.id && String(loc.name).toLowerCase().trim() === String(npc.id).toLowerCase().trim()) || (loc.name && npc.name && String(loc.name).toLowerCase().trim() === String(npc.name).toLowerCase().trim()) || (loc.name && npc.fullName && String(loc.name).toLowerCase().trim() === String(npc.fullName).toLowerCase().trim())),
            );
            if (locObj) {
              const cleanOldLoc = (locObj.location || "")
                .replace(/<[^>]+>/g, "")
                .replace(/[*_~`]/g, "");

              const isOldUnknown =
                !cleanOldLoc ||
                cleanOldLoc.toLowerCase().includes("chưa rõ") ||
                cleanOldLoc.toLowerCase().includes("không rõ") ||
                cleanOldLoc.toLowerCase() === "n/a" ||
                cleanOldLoc.toLowerCase().includes("unknown");

              if (!isOldUnknown) {
                lastKnownLoc = locObj.location;
                isStrikethrough = true;
                break;
              }
            }
          }
        }
        
        if (npc.name) {
          prevProcessedNPCsMap.current.set(npc.name, { lastKnownLoc, isStrikethrough });
        }
      });
    }

    return [
      ...(gameData?.npcs || []).filter(Boolean).map((npc, index) => ({
        npc,
        index,
        isLite: false,
      })),
    ]
      .filter(item => item && item.npc)
      .map(({ npc, index, isLite }) => {
        const currentNpcLoc = Array.isArray(latestAiMsg?.npcLocations) ? latestAiMsg.npcLocations.find(
          (loc: any) =>
            loc && npc &&
            ((loc.id && npc.id && String(loc.id).toLowerCase().trim() === String(npc.id).toLowerCase().trim()) || (loc.id && npc.name && String(loc.id).toLowerCase().trim() === String(npc.name).toLowerCase().trim()) || (loc.id && npc.fullName && String(loc.id).toLowerCase().trim() === String(npc.fullName).toLowerCase().trim()) || (loc.name && npc.id && String(loc.name).toLowerCase().trim() === String(npc.id).toLowerCase().trim()) || (loc.name && npc.name && String(loc.name).toLowerCase().trim() === String(npc.name).toLowerCase().trim()) || (loc.name && npc.fullName && String(loc.name).toLowerCase().trim() === String(npc.fullName).toLowerCase().trim())),
        )?.location : undefined;

        const isCurrentUnknown =
          !currentNpcLoc ||
          currentNpcLoc.toLowerCase().includes("chưa rõ") ||
          currentNpcLoc.toLowerCase().includes("không rõ") ||
          currentNpcLoc.toLowerCase() === "n/a" ||
          currentNpcLoc.toLowerCase().includes("unknown");

        let lastKnownLoc = currentNpcLoc;
        let isStrikethrough = false;

        if (isCurrentUnknown) {
           const historyData = prevProcessedNPCsMap.current.get(npc.name);
           if (historyData && historyData.lastKnownLoc) {
             lastKnownLoc = historyData.lastKnownLoc;
             isStrikethrough = historyData.isStrikethrough;
           }
        }

        const locStr = lastKnownLoc || npc.location || "";
        const cleanLocStr = locStr
          .replace(/<[^>]+>/g, "")
          .replace(/[*_~`]/g, "");

        const isUnknownLoc =
          !cleanLocStr ||
          cleanLocStr.toLowerCase().includes("chưa rõ") ||
          cleanLocStr.toLowerCase().includes("không rõ") ||
          cleanLocStr.toLowerCase() === "n/a" ||
          cleanLocStr.toLowerCase().includes("unknown");

        const isMale =
          npc.gender?.toLowerCase() === "nam" ||
          npc.gender?.toLowerCase() === "male" ||
          npc.gender?.toLowerCase().includes("nam giới");

        const isAtMCLoc =
          !isStrikethrough &&
          !isUnknownLoc &&
          (cleanLocStr.toLowerCase() === currentLoc.toLowerCase() ||
            (cleanLocStr.length > 5 &&
              currentLoc
                .toLowerCase()
                .includes(cleanLocStr.toLowerCase())) ||
            (currentLoc.length > 5 &&
              cleanLocStr
                .toLowerCase()
                .includes(currentLoc.toLowerCase())));

        return {
          npc,
          index,
          isLite,
          locStr: cleanLocStr || "Vị trí chưa rõ",
          isUnknownLoc,
          isAtMCLoc,
          isStrikethrough,
          isMale,
        };
      })
      .filter(
        ({ isMale, npc }) => {
          if (!((isMale && showMaleNPCs) || (!isMale && showFemaleNPCs))) return false;
          if (npcSearchQuery.trim()) {
            const query = npcSearchQuery.trim().toLowerCase();
            const nameMatch = (npc.name || "").toLowerCase().includes(query);
            const fullNameMatch = (npc.fullName || "").toLowerCase().includes(query);
            if (!nameMatch && !fullNameMatch) return false;
          }
          return true;
        }
      )
      .sort((a, b) => {
        const hasUpdateA = !autoUpdateNpc && !!(a.npc.pendingUpdates && Object.keys(a.npc.pendingUpdates).some(k => !['location', 'currentlocation', 'status', 'statusdata'].includes(k.trim().toLowerCase())));
        const hasUpdateB = !autoUpdateNpc && !!(b.npc.pendingUpdates && Object.keys(b.npc.pendingUpdates).some(k => !['location', 'currentlocation', 'status', 'statusdata'].includes(k.trim().toLowerCase())));
        
        if (hasUpdateA && !hasUpdateB) return -1;
        if (!hasUpdateA && hasUpdateB) return 1;

        const getCategory = (item) => {
          if (item.isAtMCLoc) return 1;
          if (!item.isStrikethrough && !item.isUnknownLoc) return 2;
          if (item.isStrikethrough) return 3;
          return 4;
        };

        const catA = getCategory(a);
        const catB = getCategory(b);

        if (catA !== catB) {
          return catA - catB;
        }

        if (a.isMale !== b.isMale) {
          return a.isMale ? 1 : -1;
        }

        if (a.isLite !== b.isLite) {
          return a.isLite ? 1 : -1;
        }

        return 0;
      });
  }, [gameData?.npcs, latestAiMsg, messages, currentLoc, showMaleNPCs, showFemaleNPCs, npcSearchQuery]);


  const prevMessagesRef = React.useRef<any[]>([]);
  const prevTurnsRef = React.useRef<any[]>([]);

  const turns = React.useMemo(() => {
    const prevMsgs = prevMessagesRef.current;
    
    // Fast path: if length is same, and only last msg content changed (streaming)
    if (prevMsgs.length === messages.length && messages.length > 0) {
      let sameExceptLast = true;
      for (let i = 0; i < messages.length - 1; i++) {
        if (prevMsgs[i] !== messages[i]) {
          sameExceptLast = false;
          break;
        }
      }
      
      if (sameExceptLast) {
        // Reuse previous turns array and just update the last turn
        const list = [...prevTurnsRef.current];
        if (list.length > 0) {
          const lastTurn = { ...list[list.length - 1] };
          const lastMsg = messages[messages.length - 1];
          if (lastMsg.sender === "user") {
            lastTurn.userMsg = lastMsg;
          } else {
            lastTurn.aiMsg = lastMsg;
          }
          list[list.length - 1] = lastTurn;
          
          prevMessagesRef.current = messages;
          prevTurnsRef.current = list;
          return list;
        }
      }
    }

    // Full calculation fallback with Lazy Load for older turns
    const list: any[] = [];
    let startIdx = 0;
    let turnIndex = 0;

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.sender === "ai" || m.sender === "system") {
        list.push({ _lazy: true, id: m.id, index: turnIndex++, start: startIdx, end: i });
        startIdx = i + 1;
      }
    }
    // Handle waiting state
    if (startIdx < messages.length) {
      list.push({ _lazy: true, id: messages[startIdx].id, index: turnIndex++, start: startIdx, end: messages.length - 1 });
    }
    
    const totalPages = Math.max(1, list.length - 1);
    
    // Chỉ render tối đa 20 lượt chơi gần nhất (đánh giá trực tiếp)
    list.forEach((turnStub, idx) => {
      let pageOfTurn = idx === 0 ? 1 : idx;
      if (pageOfTurn >= totalPages - 19) {
        let currentTurn: any = { _lazy: false, index: turnStub.index, id: turnStub.id, start: turnStub.start, end: turnStub.end };
        for (let j = turnStub.start; j <= turnStub.end; j++) {
           const m = messages[j];
           if (m.sender === "user") currentTurn.userMsg = m;
           else if (m.sender === "ai" || m.sender === "system") currentTurn.aiMsg = m;
        }
        list[idx] = currentTurn;
      }
    });

    prevMessagesRef.current = messages;
    prevTurnsRef.current = list;
    return list;
  }, [messages]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const [isEditingPage, setIsEditingPage] = useState<boolean>(false);
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editingOutlineId, setEditingOutlineId] = useState<string | null>(null);
  const editingOutlineRef = useRef<string>('');
  const editingContentRef = useRef<string>("");
  const playerRulesRef = useRef<string>(playerRules || "");
  const [localPlayerRules, setLocalPlayerRules] = useState<string>(playerRules || "");

  useEffect(() => {
    playerRulesRef.current = playerRules || "";
    setLocalPlayerRules(playerRules || "");
  }, [playerRules]);

  const closeRulesModal = () => {
    if (playerRulesRef.current !== playerRules) {
      setPlayerRules(playerRulesRef.current);
    }
    setShowRules(false);
  };
  const isStrictEndEnabled = useStore((state) => state.isStrictEndEnabled);
  const setIsStrictEndEnabled = useStore(
    (state) => state.setIsStrictEndEnabled,
  );
  const totalPages = Math.max(1, turns.length - 1);

  useEffect(() => {
    setCurrentPage(Math.max(1, turns.length - 1));
  }, [turns.length]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageSubmit = () => {
    setIsEditingPage(false);
    const parsed = parseInt(pageInput, 10);
    if (isNaN(parsed)) {
      setPageInput(String(currentPage));
      return;
    }
    const validPage = Math.max(1, Math.min(totalPages, parsed));
    setCurrentPage(validPage);
    setPageInput(String(validPage));
  };

  const computeTurn = (turnStub: any, idx: number) => {
    if (!turnStub || turnStub._lazy === false) return turnStub;
    let currentTurn: any = { _lazy: false, index: turnStub.index, id: turnStub.id, start: turnStub.start, end: turnStub.end };
    for (let j = turnStub.start; j <= turnStub.end; j++) {
       const m = messages[j];
       if (m.sender === "user") currentTurn.userMsg = m;
       else if (m.sender === "ai" || m.sender === "system") currentTurn.aiMsg = m;
    }
    turns[idx] = currentTurn; // Cache it for future renders
    return currentTurn;
  };

  const getPageTurns = (page: number) => {
    if (page === 1) {
      return turns.slice(0, 2).map((t, i) => computeTurn(t, i));
    }
    const idx = page;
    if (idx >= 0 && idx < turns.length) {
      return [computeTurn(turns[idx], idx)];
    }
    return [];
  };

  // Quản lý bộ nhớ: Tự động dọn dẹp các trang đã tải cũ khỏi cache
  useEffect(() => {
    turns.forEach((turn, idx) => {
      let pageOfTurn = idx === 0 ? 1 : idx;
      
      // Giữ lại 20 trang mới nhất và giữ các trang xung quanh trang hiện tại (khoảng cách 5 trang)
      if (
        turn && 
        turn._lazy === false &&
        pageOfTurn < totalPages - 19 && 
        Math.abs(pageOfTurn - currentPage) > 5
      ) {
        // Revert về dạng lazy stub (giải phóng tham chiếu tới các object messages cũ)
        turns[idx] = { 
          _lazy: true, 
          id: turn.id, 
          index: turn.index, 
          start: turn.start, 
          end: turn.end 
        };
      }
    });
  }, [currentPage, turns, totalPages]);

  // Modals
  const hasInitialized = useRef(false);

  const pendingReparseStreamData = useStore(
    (state) => state.pendingReparseStreamData,
  );
  const setPendingReparseStreamData = useStore(
    (state) => state.setPendingReparseStreamData,
  );

  useEffect(() => {
    if (pendingReparseStreamData) {
      const handleReparse = async () => {
        try {
          setIsGenerating(true);
          const fullText = pendingReparseStreamData;
          setPendingReparseStreamData(null); // Clear immediately to prevent loop

          const lastAiMsg = [...messages]
            .reverse()
            .find((m) => m.sender === "ai" || m.sender === "system");
          if (!lastAiMsg) {
            toast.error("Không tìm thấy lượt AI cuối cùng để reparse.");
            setIsGenerating(false);
            return;
          }

          const aiMsgId = lastAiMsg.id;

          // Thực hiện parsing lại
          const { parsedData } = robustParseGameplayJSON(fullText);

          if (parsedData) {
            let currentState = useStore.getState();
            if (currentState.gameData) {
              let newData = JSON.parse(JSON.stringify(currentState.gameData));
              let hasUpdate = false;

              if (newData.mcData.statusData)
                newData.mcData.statusData = sanitizeStatusData(
                  newData.mcData.statusData,
                );
              if (Array.isArray(newData.npcs)) {
                newData.npcs.forEach((npc: any) => {
                  if (npc.statusData)
                    npc.statusData = sanitizeStatusData(npc.statusData);
                });
              }

              // Apply MC & NPC Updates
              const mcUpdatesDataReparse =
                parsedData.mcUpdates ||
                parsedData.mcUpdate ||
                parsedData.playerUpdate ||
                parsedData.mc_updates;
              if (mcUpdatesDataReparse) {
                const mcResult = applyMcUpdates(newData.mcData, mcUpdatesDataReparse);
                if (mcResult.hasUpdate) {
                  newData.mcData = mcResult.updatedMcData;
                  hasUpdate = true;
                }
              }

              const npcUpdatesDataReparse =
                parsedData.npcUpdates ||
                parsedData.npcUpdate ||
                parsedData.npcsUpdate ||
                parsedData.npc_updates;
              if (npcUpdatesDataReparse) {
                const npcResult = applyNpcUpdates(newData.npcs, npcUpdatesDataReparse);
                if (npcResult.hasUpdate) {
                  newData.npcs = npcResult.updatedNpcs;
                  hasUpdate = true;
                }
              }

              // Apply Codex Updates
              const codexResult = applyCodexPendingUpdates(newData, parsedData);
              if (codexResult.hasUpdate) {
                newData.codexPendingUpdates = codexResult.codexPendingUpdates;
                hasUpdate = true;
              }

              if (hasUpdate) currentState.setGameData(newData);
            }

            const assembledText = filterSensitiveWords(
              parsedData.mainText || "",
              gameData?.worldData?.tags || []
            );

            const rawSuggestedActions = Array.isArray(
              parsedData.suggestedActions,
            )
              ? parsedData.suggestedActions
              : Array.isArray(parsedData.options)
                ? parsedData.options
                : Array.isArray(parsedData.choices)
                  ? parsedData.choices
                  : typeof parsedData.suggestedActions === "object" &&
                      parsedData.suggestedActions !== null
                    ? Object.values(parsedData.suggestedActions)
                    : [];

            const suggestedActionsData = rawSuggestedActions.map((item: any) => {
              if (!item) return item;
              if (typeof item === "string") return stripShortTags(filterSensitiveWords(item, gameData?.worldData?.tags || []));
              if (typeof item === "object") {
                const newItem: any = { ...item };
                if (typeof newItem.action === "string") newItem.action = stripShortTags(filterSensitiveWords(newItem.action, gameData?.worldData?.tags || []));
                if (typeof newItem.details === "string") newItem.details = stripShortTags(filterSensitiveWords(newItem.details, gameData?.worldData?.tags || []));
                if (typeof newItem.text === "string") newItem.text = stripShortTags(filterSensitiveWords(newItem.text, gameData?.worldData?.tags || []));
                if (typeof newItem.title === "string") newItem.title = stripShortTags(filterSensitiveWords(newItem.title, gameData?.worldData?.tags || []));
                if (typeof newItem.gainsLosses === "string") newItem.gainsLosses = stripShortTags(filterSensitiveWords(newItem.gainsLosses, gameData?.worldData?.tags || []));
                return newItem;
              }
              return item;
            });

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? {
                      ...msg,
                      isStreaming: false,
                      fullStreamLog: fullText,
                      outline: parsedData.memory || parsedData.outline,
                      mainText: assembledText,
                      suggestedActions: suggestedActionsData as any[],
                      worldTime: parsedData.worldTime,
                      weather: parsedData.weather,
                      mcLocation: parsedData.mcLocation,
                      npcLocations: parsedData.npcLocations,
                    }
                  : msg,
              ),
            );

            useStore.getState().updateStreamData(fullText);

            // Ghi nhớ vector sau khi reparse
            try {
              const lastUserMsg = [...messages]
                .reverse()
                .find(
                  (m) =>
                    m.sender === "user" &&
                    Number(m.id.replace("_u", "")) < Number(aiMsgId),
                );
              const userAction = lastUserMsg ? lastUserMsg.content : "Bắt đầu";
              const logMsg = synthesizeTurnStoryMemory(
                turns.length,
                parsedData.mcLocation || "Không xác định",
                parsedData.worldTime || "",
                parsedData.weather || "",
                userAction,
                parsedData.memory || parsedData.outline || "",
                assembledText
              );
              await ragService.addMemory(
                gameData.id,
                logMsg,
                false,
                undefined,
                aiMsgId,
              );
            } catch (e) {
              console.error("Lỗi khi thêm bộ nhớ RAG (Reparse):", e);
            }

            // Tự động lưu game
            try {
              useStore.getState().autoSaveCurrentGame();
            } catch (e) {
              console.error("Lỗi tự động lưu game (Reparse):", e);
            }

            toast.success("Đã nạp lại dữ liệu thành công!");
          } else {
            toast.error("Lỗi JSON: Không thể phân tích dữ liệu đã sửa.");
          }
        } catch (error) {
          console.error("Lỗi khi reparse:", error);
          toast.error("Có lỗi xảy ra khi nạp lại dữ liệu!");
        } finally {
          setIsGenerating(false);
        }
      };

      handleReparse();
    }
  }, [pendingReparseStreamData]);

  useEffect(() => {
    if (!gameData) {
      toast.error("Không tìm thấy dữ liệu trò chơi, vui lòng tạo mới!");
      navigate("/world-creation");
      return;
    }

    // Nếu chưa có tin nhắn nào, tự động sinh lượt đầu tiên
    // Chỉ chạy đúng 1 lần nhờ hasInitialized
    if (messages.length === 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      generateTurn(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "instant") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  };

  const scrollToTop = (behavior: ScrollBehavior = "instant") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior });
    }
  };

  const scrollToTurn = (id: string, behavior: ScrollBehavior = "instant") => {
    setTimeout(() => {
      const el = document.getElementById(`turn-${id}`);
      if (el && scrollRef.current) {
        const elOffset = el.offsetTop;
        scrollRef.current.scrollTo({
          top: Math.max(0, elOffset - 20),
          behavior,
        });
      }
    }, 100);
  };

  const generateTurn = async (userAction: string | null, retryCount: number = 0) => {
    if (isGenerating && retryCount === 0) return;
    setIsGenerating(true);
    setIsGeneratingStream(true);
    setRightOpen(true); // Tự động mở khung stream

    const isFirstTurn = userAction === null;
    let effectiveUserAction = userAction;

    // Kiểm tra nếu là hành động kích hoạt kịch tính đặc biệt
    const isDramaTriggeredAction = userAction === "[KÍCH HOẠT SỰ KIỆN KỊCH TÍNH BẤT NGỜ]";

    if (isStrictEndEnabled && userAction && !isDramaTriggeredAction) {
      effectiveUserAction =
        userAction +
        "\n\n[GHI CHÚ HỆ THỐNG YÊU CẦU BẮT BUỘC TỪ NGƯỜI CHƠI: HÃY DỪNG MẠCH TRUYỆN CHÍNH VĂN NGAY LẬP TỨC TẠI ĐÚNG THỜI ĐIỂM HÀNH ĐỘNG NÀY KẾT THÚC! TUYỆT ĐỐI KHÔNG TỰ CHẾ THÊM SỰ KIỆN, KHÔNG TUA NHANH THỜI GIAN THÊM BẤT KỲ GIÂY PHÚT NÀO NỮA! CHỈ ĐẾN ĐÂY THÔI KHÔNG HƠN KHÔNG KÉM!]";
    }

    let willRetry = false;
    const aiMsgId = nanoid();

    // Reset stream
    updateStreamData(() =>
      isFirstTurn
        ? ">>> KHỞI TẠO MA TRẬN LUÂN HỒI BẮT ĐẦU...\n"
        : ">>> ĐANG XỬ LÝ HÀNH ĐỘNG CỦA NGƯỜI CHƠI...\n",
    );

    const mcLocationStr =
      turns.length > 0 ? turns[turns.length - 1].aiMsg?.mcLocation || "" : "";
    const actionStr = effectiveUserAction || gameData.startingContext || "";

    const mcTemplateMode = gameData?.mcTemplateMode || "default";

    // Khởi tạo bộ lọc các từ khóa liên quan đến nhân quả/mối quan hệ cho MC
    const forbiddenKeywords = [
      "nhân quả", "nhan qua", "karma", "cause", "effect", "consequence", "destiny", "fate", "số phận", "so phan", "vận mệnh", "van menh",
      "mối quan hệ", "moi quan he", "relationship", "relation", "connection", "nhân duyên", "nhan duyen", "tình duyên", "tinh duyen", "hữu duyên", "huu duyen", "liên kết", "lien ket"
    ];

    const isForbiddenField = (id: string, label: string, desc: string = "") => {
      const lowerId = String(id || "").toLowerCase();
      const lowerLabel = String(label || "").toLowerCase();
      const lowerDesc = String(desc || "").toLowerCase();
      return forbiddenKeywords.some(keyword => lowerId.includes(keyword) || lowerLabel.includes(keyword) || lowerDesc.includes(keyword));
    };

    const isForbiddenKey = (key: string) => {
      const lowerKey = key.toLowerCase();
      return forbiddenKeywords.some(keyword => lowerKey.includes(keyword));
    };

    // Tiến hành lọc bỏ hoàn toàn các trường cấm trong dữ liệu thực tế của MC (mcData và originalMcData)
    const sanitizeMcObj = (mcObj: any) => {
      if (!mcObj) return mcObj;
      const copy = { ...mcObj };
      for (const key of Object.keys(copy)) {
        if (isForbiddenKey(key)) {
          delete copy[key];
        }
      }
      if (copy.customData && typeof copy.customData === "object") {
        const sanitizedCustomData = { ...copy.customData };
        for (const key of Object.keys(sanitizedCustomData)) {
          if (isForbiddenKey(key)) {
            delete sanitizedCustomData[key];
          }
        }
        copy.customData = sanitizedCustomData;
      }
      return copy;
    };

    const mcDataSanitized = sanitizeMcObj(gameData.mcData);
    const originalMcDataSanitized = sanitizeMcObj(gameData.originalMcData || gameData.mcData);

    // Lọc bỏ customMcFields liên quan đến nhân quả hoặc mối quan hệ
    const customMcFields = getActiveCustomFields(
      (gameData?.customMcFields || []).filter((f: any) => !isForbiddenField(f?.id, f?.label, f?.description)),
      gameData?.customMcConditions,
      mcDataSanitized
    );

    const npcTemplateMode = gameData?.npcTemplateMode || "default";
    const customNpcFields = gameData?.customNpcFields || [];

    const excludedKeys = ["worldState"];
    let contextStr = "";
    if (isFirstTurn) {
      contextStr = `===[ HƯỚNG DẪN QUAN TRỌNG VỀ NGÔI KỂ & VĂN PHONG ]===
- Ngôi kể (Narrative Perspective): ${gameData.worldData?.narrativePerspective || "Không có"}
- Văn phong (Writing Style): ${gameData.worldData?.writingStyle || "Không có"}
===[ YÊU CẦU: ÁP DỤNG NGHIÊM NGẶT NGÔI KỂ VÀ VĂN PHONG NÀY CHO TOÀN BỘ CÂU CHUYỆN ]===

Ý TƯỞNG SƠ KHAI:
${gameData.initialIdea || "Không có"}

Ý TƯỞNG ĐÃ PHÁT TRIỂN:
${gameData.developedIdea || "Không có"}

THÔNG TIN THẾ GIỚI (Lấy từ bảng Tạo Mới Thế Giới):
${formatCodexData(gameData.worldData, excludedKeys)}

QUY TẮC & SÁNG TẠO DO NGƯỜI CHƠI BỔ SUNG:
${gameData.creativeRules || "Không có"}

THÔNG TIN ĐỊA DANH & VẬT PHẨM (Lấy từ bảng Tạo Mới Địa Danh/Vật Phẩm):
${formatCodexData(gameData.worldDetails)}

THÔNG TIN NHÂN VẬT CHÍNH - MC (BẢN HIỆN HÀNH / SỐ 2 - ĐƯỢC PHÉP CẬP NHẬT & DÙNG LÀM CHUẨN: BẠN CẦN LƯU VÀ CẬP NHẬT MỌI SỰ THAY ĐỔI VÀO ĐÂY. LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: KHI CẬP NHẬT TRƯỜNG NÀO, BẮT BUỘC PHẢI XEM XÉT DỮ LIỆU CŨ TRƯỚC; TUYỆT ĐỐI KHÔNG CẮT NGẮN HAY RÚT GỌN NỘI DUNG CŨ; CÁI GÌ CÒN PHÙ HỢP THÌ GIỮ NGUYÊN, CÁI GÌ THAY ĐỔI MỚI SỬA LẠI HOẶC THAY THẾ/NỐI TIẾP):
${formatCodexData(mcDataSanitized, [], mcTemplateMode, customMcFields)}

THÔNG TIN NHÂN VẬT CHÍNH - MC (BẢN GỐC / SỐ 1 - CHỈ ĐỌC. TUYỆT ĐỐI NGHIÊM CẤM VIỆC CẬP NHẬT/THAY ĐỔI DỮ LIỆU NÀY DƯỚI MỌI HÌNH THỨC):
${formatCodexData(originalMcDataSanitized || mcDataSanitized, [], mcTemplateMode, customMcFields)}

DANH SÁCH NPCs (BẢN HIỆN HÀNH / SỐ 2 - ĐƯỢC PHÉP CẬP NHẬT. LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: KHI CẬP NHẬT TRƯỜNG NÀO, BẮT BUỘC PHẢI XEM XÉT DỮ LIỆU CŨ TRƯỚC; TUYỆT ĐỐI KHÔNG CẮT NGẮN HAY RÚT GỌN NỘI DUNG CŨ; CÁI GÌ CÒN PHÙ HỢP THÌ GIỮ NGUYÊN, CÁI GÌ THAY ĐỔI MỚI SỬA LẠI HOẶC THAY THẾ/NỐI TIẾP):
${formatNPCsCodex(gameData.npcs, mcLocationStr, actionStr, mcDataSanitized, messages, npcTemplateMode, customNpcFields, gameData?.disableDefaultNpcRelationships || false, gameData?.partyTags, gameData?.customNpcConditions)}

DANH SÁCH NPCs (BẢN GỐC / SỐ 1 - CHỈ ĐỌC. TUYỆT ĐỐI NGHIÊM CẤM SỬA ĐỔI):
${formatNPCsCodex(gameData.originalNpcs || gameData.npcs, mcLocationStr, actionStr, mcDataSanitized, messages, npcTemplateMode, customNpcFields, gameData?.disableDefaultNpcRelationships || false, gameData?.partyTags, gameData?.customNpcConditions)}

NHIỆM VỤ CỦA BẠN: HÃY TẠO RA LƯỢT CHƠI ĐẦU TIÊN (MỞ MÀN) - LƯỢT 0000. 
ĐẶC BIỆT QUAN TRỌNG VỀ "KỊCH BẢN MỞ ĐẦU" (starterScenario): Bạn BẮT BUỘC phải mang trọn vẹn toàn bộ nội dung của mục "KỊCH BẢN MỞ ĐẦU" (nếu có trong Thông tin thế giới) vào chính văn Lượt 0000. Bạn phải diễn giải, phân chia và triển khai nội dung đó sao cho hợp lý, sinh động, logic và đạt đủ số chữ (Target Word Count) được yêu cầu. NGHIÊM CẤM TUYỆT ĐỐI việc cắt xén, làm mất, tóm tắt sơ sài hay rút gọn nội dung mà người chơi đã duyệt trong mục KỊCH BẢN MỞ ĐẦU.
Cực kỳ quan trọng: Bắt buộc xác lập và tạo lập chuẩn xác, hợp logic các trường báo cáo về VỊ TRÍ CỦA MC, VỊ TRÍ CỦA NPC để thiết lập mốc sinh tồn vững chắc cho cốt truyện. ĐỐI VỚI "THỜI GIAN THẾ GIỚI" (worldTime): BẮT BUỘC PHẢI lấy nội dung từ "MỐC THỜI GIAN MỞ ĐẦU" (starterTimeline: ${gameData.worldData?.starterTimeline || "Không có"}). BẮT BUỘC DUY TRÌ ĐẦY ĐỦ CÁC ĐƠN VỊ: Giờ, Phút, Thứ, Ngày, Tháng, Năm để điền vào trường worldTime trong JSON, có thể thêm diễn tiến chi tiết nếu cần. TUYỆT ĐỐI KHÔNG TỰ Ý RÚT GỌN BỎ ĐI THÁNG HAY NĂM!
LƯU Ý ĐẶC BIỆT VỀ NPC Ở LƯỢT 0000: Các NPC đã có mặt trong "DANH SÁCH NPCs" là những nhân vật người chơi đã dày công thiết lập sẵn từ trước. Bạn BẮT BUỘC phải tôn trọng và đưa thẳng các NPC này vào bối cảnh Gameplay. BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC TẠO LẠI (duplicate/recreate) BẤT KỲ NPC NÀO ĐÃ CÓ SẴN (tuyệt đối không đưa họ vào mảng \`newNPCs\`). Bạn chỉ được phép cập nhật thêm trạng thái/vị trí của họ qua mảng \`npcUpdates\`. Mảng \`newNPCs\` CHỈ DÀNH CHO việc sáng tạo ra NPC MỚI HOÀN TOÀN chưa từng xuất hiện.
Suy luận sâu (Deep Reasoning) về yếu tố Thời Gian và Vị Trí Không Gian để kịch bản khởi đầu thật lôi cuốn, logic với bối cảnh, và phản ánh đúng TÍNH CÁCH cốt lõi của MC. Đưa MC vào một tình huống cụ thể ngay lúc này.
LƯU Ý NGHIÊM KHẮC CHO LƯỢT 0000: Có thể do khởi đầu có quá nhiều Data JSON nên AI thường có xu hướng bỏ qua hoặc viết rất ngắn phần THINKING_PROCESS, AI cũng hay bỏ quên việc khai báo THỜI GIAN VÀ VỊ TRÍ. BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC MẮC SAI LẦM NÀY NỮA! BẮT BUỘC PHẢI KHAI TRIỂN CHUỖI SUY NGHĨ (THINKING_PROCESS) VÔ CÙNG CHI TIẾT VÀ TÍNH TOÁN KỸ VỀ THỜI GIAN VÀ KHÔNG GIAN TƯƠNG TỰ NHƯ CÁC LƯỢT SAU!`;
    } else {
      const recentTurns = turns.slice(-memoryFullTurnsCount);
      const historyText = recentTurns
        .map(
          (t: any) => `[LƯỢT ${t.index}]
HÀNH ĐỘNG CỦA MC (NGƯỜI CHƠI) YÊU CẦU:
${t.userMsg?.content || ""}

DIỄN BIẾN CHÍNH VĂN (KẾT QUẢ TỪ AI):
${t.aiMsg?.mainText || t.aiMsg?.content || ""}

DÀN Ý / TÓM TẮT LƯỢT NÀY:
${t.aiMsg?.outline || ""}

=> KẾT QUẢ TRẠNG THÁI CUỐI LƯỢT ${t.index}:
- THỜI GIAN THẾ GIỚI: ${t.aiMsg?.worldTime || "Vô định"}
- THỜI TIẾT: ${t.aiMsg?.weather || "Vô định"}
- VỊ TRÍ CỦA MC: ${t.aiMsg?.mcLocation || "Vô định"}
- VỊ TRÍ CỦA NPC: ${JSON.stringify(t.aiMsg?.npcLocations || [])}

---KẾT THÚC LƯỢT ${t.index}---
`,
        )
        .join("\n\n");

      const memTurnsLength = turns.length - memoryFullTurnsCount;
      const memStartIndex = Math.max(0, memTurnsLength - memoryLogsCount);
      const memoryTurns =
        memTurnsLength > 0 ? turns.slice(memStartIndex, memTurnsLength) : [];

      let memoryText = "";
      if (turns.length >= 3 || (turns.length >= 1 && memoryLogsCount > 0)) {
        try {
          const rawAction = userAction ? String(userAction).trim() : "khởi đầu";

          // Thu thập các NPC & Thực thể có mặt hoặc xuất hiện trong hành động
          const activeEntities: string[] = [];
          if (mcLocationStr && mcLocationStr !== "Vô định") {
            activeEntities.push(mcLocationStr);
          }
          const activeNpcNames: string[] = [];
          if (Array.isArray(gameData.npcs)) {
            gameData.npcs.filter(Boolean).forEach((npc: any) => {
              const name = npc.name || npc.fullName;
              if (name) {
                activeEntities.push(name);
                if (rawAction.includes(name) || (npc.location && mcLocationStr && npc.location.includes(mcLocationStr))) {
                  if (!activeNpcNames.includes(name)) activeNpcNames.push(name);
                }
              }
            });
          }

          // Xây dựng query mở rộng đa chiều (Context-Aware Query Expansion): [Hành động] + [NPC/Đối tượng] + [Địa điểm]
          const npcPart = activeNpcNames.length > 0 ? ` [NPC: ${activeNpcNames.join(", ")}]` : "";
          const locPart = (mcLocationStr && mcLocationStr !== "Vô định") ? ` [Địa điểm: ${mcLocationStr}]` : "";
          const expandedQuery = `${rawAction}${npcPart}${locPart}`;

          console.log("Tìm kiếm ký ức RAG nâng cao với Query:", expandedQuery);

          // Tăng giới hạn số lượng kết quả liên quan từ RAG để có đủ ngữ cảnh
          const searchLimit = Math.max(
            3,
            Math.min(12, Math.round(memoryLogsCount / 6) || 4)
          );

          const searchRes = await ragService.searchMemory(
            gameData.id,
            expandedQuery,
            {
              topK: searchLimit,
              threshold: 0.1,
              entities: activeEntities,
              currentTurn: turns.length,
            },
          );

          // Phân loại ký ức RAG thành 2 nhóm: "NPC/Đối tượng" và "Bối cảnh/Sự kiện", kèm khử trùng lặp (Deduplication)
          const seenTexts = new Set<string>();
          const coreList: string[] = [];
          const npcMemories: string[] = [];
          const eventMemories: string[] = [];

          const norm = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();

          if (searchRes.core && searchRes.core.length > 0) {
            searchRes.core.forEach((m: any) => {
              if (!m || !m.text) return;
              const key = norm(m.text);
              if (!seenTexts.has(key)) {
                seenTexts.add(key);
                coreList.push(m.text);
              }
            });
          }

          const knownNpcNames = (gameData.npcs || [])
            .filter(Boolean)
            .map((n: any) => (n.name || n.fullName || '').toLowerCase())
            .filter((n: string) => n.length > 1);

          if (searchRes.standard && searchRes.standard.length > 0) {
            searchRes.standard.forEach((m: any) => {
              if (!m || !m.text) return;
              const key = norm(m.text);
              if (seenTexts.has(key)) return;
              seenTexts.add(key);

              const textLower = m.text.toLowerCase();
              const isNpcRelated = knownNpcNames.some((npcName: string) => textLower.includes(npcName)) ||
                /npc|nói chuyện|gặp|đối thoại|quan hệ|giao tiếp|thân thiết|tình cảm|hẹn hò|xưng hô|tên/i.test(m.text);

              if (isNpcRelated) {
                npcMemories.push(m.text);
              } else {
                eventMemories.push(m.text);
              }
            });
          }

          let memorySections: string[] = [];

          if (coreList.length > 0) {
            memorySections.push(
              "[CORE MEMORY - KÝ ỨC CỐT LÕI (BẮT BUỘC BẢO TOÀN TRONG SUY NGHĨ)]\n" +
                coreList.map((txt) => `* ${txt}`).join("\n")
            );
          }

          if (npcMemories.length > 0) {
            memorySections.push(
              "[NPC & ENTITY MEMORIES - KÝ ỨC LIÊN QUAN NPC VÀ ĐỐI TƯỢNG]\n" +
                npcMemories.map((txt, idx) => `(${idx + 1}): ${txt}`).join("\n\n")
            );
          }

          if (eventMemories.length > 0) {
            memorySections.push(
              "[CONTEXT & EVENT MEMORIES - KÝ ỨC LIÊN QUAN BỐI CẢNH VÀ SỰ KIỆN]\n" +
                eventMemories.map((txt, idx) => `(${idx + 1}): ${txt}`).join("\n\n")
            );
          }

          if (memorySections.length > 0) {
            memoryText =
              "===[ RAG MEMORY - HỆ THỐNG KÝ ỨC BỎ TÚI TRUY XUẤT THÔNG MINH ]===\n" +
              "AI BẮT BUỘC PHẢI ĐƯA CÁC KÝ ỨC NÀY VÀO BƯỚC 1 (THINKING PROCESS) ĐỂ PHÂN TÍCH, ĐẢM BẢO MẠCH CỐT TRUYỆN LIÊN TỤC VÀ KHÔNG BỊ MÂU THUẪN HOẶC QUÊN SỰ KIỆN QUÁ KHỨ.\n\n" +
              memorySections.join("\n\n") +
              "\n\n";
          }
        } catch (err) {
          console.error("Lỗi khi lấy ký ức từ RAG:", err);
        }
      }

      // Dự phòng nếu RAG chưa lấy được hoặc lỗi, có thể dùng kiểu cũ
      if (!memoryText && memoryTurns.length > 0) {
        // memoryText = "[MEMORY - KÝ ỨC CỦA TỐI ĐA 200 LƯỢT CHƠI TRƯỚC ĐÓ DẠNG TÓM TẮT]\n" +
        //  memoryTurns.map((t: any) => `Lượt ${t.index}: ${t.aiMsg?.outline || 'Không có tóm tắt. Hành động của MC: ' + (t.userMsg?.content || 'Chưa rõ')}`).join("\n") + "\n\n";
      }

      // Tạo bộ ký ức chi tiết của 10 lượt mới nhất (Độ ưu tiên cao nhất & độ chi tiết cao nhất)
      const detailed10TurnsMemoryText = buildDetailedRecentTurnsMemories(turns, 10);

      contextStr = `===[ HƯỚNG DẪN QUAN TRỌNG VỀ NGÔI KỂ & VĂN PHONG ]===
- Ngôi kể: ${gameData.worldData?.narrativePerspective || "Không có"}
- Văn phong: ${gameData.worldData?.writingStyle || "Không có"}

===[ ĐỊNH HƯỚNG THỂ LOẠI & NHỊP ĐỘ (PHẢI TUÂN THỦ TỪNG LƯỢT) ]===
- Thể loại (Genre): ${gameData.worldData?.genre || "Không có"}
- Âm hưởng chủ đạo (Main Mood): ${gameData.worldData?.mainMood || "Không có"}
- Nhịp độ (Pacing): ${gameData.worldData?.pacing || "Không có"}

===[ QUY TẮC THẾ GIỚI & LOGIC BAN ĐẦU ]===
- Hệ thống sức mạnh/phân bậc: ${gameData.worldData?.powerSystem || "Không có"}
- Kiểm soát logic & Loại trừ: ${gameData.worldData?.logicControl || "Không có"}

[THÔNG TIN TỪ CODEX - CẬP NHẬT GẦN NHẤT]
CỐT TRUYỆN CHÍNH: ${gameData.developedIdea || gameData.initialIdea || ""}

[THÔNG TIN THẾ GIỚI (TỪ CODEX)]
TRẠNG THÁI CUỐN CHIẾU HIỆN TẠI (WORLD STATE): ${gameData.worldData?.worldState || "Chưa có cập nhật trạng thái cuốn chiếu nào."}
${formatCodexData(gameData.worldData, excludedKeys)}

[QUY TẮC & SÁNG TẠO DO NGƯỜI CHƠI BỔ SUNG]
${gameData.creativeRules || "Không có"}

[ĐỊA DANH & VẬT PHẨM (TỪ CODEX)]
${formatCodexData(gameData.worldDetails)}

[THÔNG TIN NHÂN VẬT CHÍNH - MC (BẢN HIỆN HÀNH / SỐ 2 - ĐƯỢC PHÉP CẬP NHẬT & DÙNG LÀM CHUẨN: BẠN CẦN LƯU VÀ CẬP NHẬT MỌI SỰ THAY ĐỔI VÀO ĐÂY. LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: KHI CẬP NHẬT TRƯỜNG NÀO, BẮT BUỘC PHẢI XEM XÉT DỮ LIỆU CŨ TRƯỚC; TUYỆT ĐỐI KHÔNG CẮT NGẮN HAY RÚT GỌN NỘI DUNG CŨ; CÁI GÌ CÒN PHÙ HỢP THÌ GIỮ NGUYÊN, CÁI GÌ THAY ĐỔI MỚI SỬA LẠI HOẶC THAY THẾ/NỐI TIẾP)]
${formatCodexData(mcDataSanitized, [], mcTemplateMode, customMcFields)}

[THÔNG TIN NHÂN VẬT CHÍNH - MC (BẢN GỐC / SỐ 1 - CHỈ ĐỌC. TUYỆT ĐỐI NGHIÊM CẤM VIỆC CẬP NHẬT/THAY ĐỔI DỮ LIỆU NÀY DƯỚI MỌI HÌNH THỨC)]
${formatCodexData(originalMcDataSanitized || mcDataSanitized, [], mcTemplateMode, customMcFields)}

[DANH SÁCH NPCs VÀ BẢNG THÔNG TIN RIÊNG CHI TIẾT (BẢN HIỆN HÀNH / SỐ 2 - ĐƯỢC PHÉP CẬP NHẬT. LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: KHI CẬP NHẬT TRƯỜNG NÀO, BẮT BUỘC PHẢI XEM XÉT DỮ LIỆU CŨ TRƯỚC; TUYỆT ĐỐI KHÔNG CẮT NGẮN HAY RÚT GỌN NỘI DUNG CŨ; CÁI GÌ CÒN PHÙ HỢP THÌ GIỮ NGUYÊN, CÁI GÌ THAY ĐỔI MỚI SỬA LẠI HOẶC THAY THẾ/NỐI TIẾP)]
${formatNPCsCodex(gameData.npcs, mcLocationStr, actionStr, mcDataSanitized, messages, npcTemplateMode, customNpcFields, gameData?.disableDefaultNpcRelationships || false, gameData?.partyTags, gameData?.customNpcConditions)}

[DANH SÁCH NPCs (BẢN GỐC / SỐ 1 - CHỈ ĐỌC. TUYỆT ĐỐI NGHIÊM CẤM SỬA ĐỔI)]
${formatNPCsCodex(gameData.originalNpcs || gameData.npcs, mcLocationStr, actionStr, mcDataSanitized, messages, npcTemplateMode, customNpcFields, gameData?.disableDefaultNpcRelationships || false, gameData?.partyTags, gameData?.customNpcConditions)}

${detailed10TurnsMemoryText}${memoryText}[QUAN TRỌNG] TOÀN BỘ DIỄN BIẾN CHI TIẾT CỦA ${memoryFullTurnsCount} LƯỢT CHƠI GẦN ĐÂY NHẤT ĐỂ AI LIÊN KẾT LIỀN MẠCH KHÔNG GIAN/THỜI GIAN:
${historyText}

BẠN ĐANG XỬ LÝ LƯỢT CHƠI THỨ: ${turns.length}

Hành động tiếp theo của Nhân vật chính (MC): ${effectiveUserAction}`;
    }

    // Thêm nhật ký Messenger chat từ điện thoại vào bối cảnh
    let phoneChatsStr = "";
    const phoneAppControl = useStore.getState().phoneAppControl || { messenger: true, discord: true };
    if (phoneAppControl.messenger !== false && gameData?.phone?.chats && gameData.phone.chats.length > 0) {
      const activeChatsWithMessages = gameData.phone.chats.filter((c: any) => c.messages && c.messages.length > 0);
      if (activeChatsWithMessages.length > 0) {
        phoneChatsStr = "\n\n[NHẬT KÝ TIN NHẮN TRÊN ĐIỆN THOẠI (MESSENGER CHAT) GẦN ĐÂY]:\n";
        phoneChatsStr += "Dưới đây là nội dung trò chuyện gần đây của MC với các NPC qua ứng dụng Messenger. Hãy lưu ý các thông tin, thỏa thuận, lời hứa hoặc tình cảm này để đối xử và trò chuyện với MC trong chính văn của lượt chơi một cách đồng nhất, không bị mâu thuẫn bối cảnh:\n";
        activeChatsWithMessages.forEach((chat: any) => {
          phoneChatsStr += `- Hội thoại với ${chat.chatName} (Thành viên: ${chat.participants?.join(", ")}):\n`;
          chat.messages.slice(-15).forEach((msg: any) => {
            phoneChatsStr += `  + [${msg.timestamp}] ${msg.sender}: "${msg.content}"\n`;
          });
        });
        phoneChatsStr += "\n";
      }
    }
    
    // Thêm nhật ký Discord
    let discordChatsStr = "";
    if (phoneAppControl.discord !== false) {
      if (gameData?.mmoChatMessages || gameData?.mmoDMs) {
        discordChatsStr = "\n\n[NHẬT KÝ TIN NHẮN TRÊN MẠNG XÃ HỘI (DISCORD) GẦN ĐÂY]:\n";
        discordChatsStr += "Dưới đây là nội dung trò chuyện trên mạng xã hội Discord của MC và các NPC. MC có thể nhắn trên kênh thế giới hoặc nhắn riêng (DM). Hãy để NPC (chính thức hoặc ảo) phản ứng, trả lời hoặc chủ động tương tác với MC qua Discord (bằng updateDiscordUpdates) nếu thấy phù hợp với kịch bản.\n";
        
        if (gameData?.mmoChatMessages) {
           Object.entries(gameData.mmoChatMessages as Record<string, any[]>).forEach(([channel, msgs]) => {
              if (msgs.length > 0) {
                 discordChatsStr += `- Kênh ${channel}:\n`;
                 msgs.slice(-10).forEach((msg: any) => {
                    discordChatsStr += `  + [${new Date(msg.timestamp).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}] ${msg.sender}: "${msg.text}"\n`;
                 });
              }
           });
        }
        if (gameData?.mmoDMs) {
           Object.entries(gameData.mmoDMs as Record<string, any[]>).forEach(([userId, msgs]) => {
              if (msgs.length > 0) {
                 discordChatsStr += `- Tin nhắn riêng (DM) với ${userId}:\n`;
                 msgs.slice(-10).forEach((msg: any) => {
                    discordChatsStr += `  + [${new Date(msg.timestamp).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}] ${msg.sender}: "${msg.text}"\n`;
                 });
              }
           });
        }
        discordChatsStr += "\n";
      }
    }

    contextStr += phoneChatsStr + discordChatsStr;

    const dramaPromptText = useStore.getState().dramaPrompt?.trim();
    let activeDrama = isDramaTriggeredAction;
    let rollText = "";
    
    const dramaChanceVal = useStore.getState().dramaChance ?? 0;
    if (dramaChanceVal > 0 && !activeDrama) {
        const pendingResult = useStore.getState().pendingDramaResult;
        let roll, chance;
        
        if (pendingResult) {
            roll = pendingResult.roll;
            chance = pendingResult.chance;
            useStore.getState().setPendingDramaResult(null);
        } else {
            chance = useStore.getState().dramaChance ?? 0;
            roll = Math.floor(Math.random() * 100) + 1;
        }

        if (roll <= chance && chance > 0) {
            activeDrama = true;
            rollText = `\n\n[HỆ THỐNG GHI NHẬN TUNG XÚC XẮC DRAMA TRƯỚC KHI GỌI AI]: Xúc xắc ra ${roll} (Tỉ lệ cài đặt: ${chance}%). KẾT QUẢ: BẮT BUỘC TẠO DRAMA TRONG LƯỢT NÀY.`;
        } else {
            rollText = `\n\n[HỆ THỐNG GHI NHẬN TUNG XÚC XẮC DRAMA TRƯỚC KHI GỌI AI]: Xúc xắc ra ${roll} (Tỉ lệ cài đặt: ${chance}%). KẾT QUẢ: KHÔNG TẠO DRAMA TRONG LƯỢT NÀY. Hãy giữ nhịp độ cốt truyện phát triển bình thường, tự nhiên theo diễn biến.`;
        }
    } else if (isDramaTriggeredAction) {
        rollText = `\n\n[HỆ THỐNG GHI NHẬN LỆNH ÉP BUỘC DRAMA TỪ NGƯỜI CHƠI]: KẾT QUẢ: BẮT BUỘC TẠO DRAMA TRONG LƯỢT NÀY.`;
    }

    if (rollText) {
        contextStr += rollText;
    }

    if (activeDrama) {
      contextStr += `\n\n[CHỈ THỊ ĐẶC BIỆT TỪ HỆ THỐNG - CHẾ ĐỘ KỊCH TÍNH (DRAMA MODE) ĐANG BẬT - BẮT BUỘC THỰC THI 100%]:
Chế độ "KỊCH TÍNH" đang được BẬT trên hệ thống. Giao phó cho [Chuyên Gia Đạo Diễn Kịch Tính & Cú Twist] kết hợp cùng [Các Chuyên Gia Chấp Bút Chính Văn] BẮT BUỘC phải thực hiện suy nghĩ sâu (deep thinking) ở Bước 1 để tự mình định đoạt và thiết kế 1 sự kiện kịch tính/biến cố/plot twist bùng nổ ngay lập tức trong lượt này:
${dramaPromptText ? `- GỢI Ý/YÊU CẦU KỊCH TÍNH TỪ NGƯỜI CHƠI (AI BẮT BUỘC PHẢI ĐỌC HIỂU VÀ ÁP DỤNG TRỰC TIẾP VÀO SỰ KIỆN KỊCH TÍNH): "${dramaPromptText}"` : '- Bản chất sự kiện: Có thể là SFW (lành mạnh, an toàn) hoặc NSFW (nhạy cảm, ghen tuông tình ái thể xác bạo liệt, cưỡng ôm cưỡng hôn, ân ái hoang dại...) - hoàn toàn do AI tự định đoạt dựa trên suy nghĩ sâu và logic của bối cảnh thế giới hiện tại.'}
- Mức độ nghiêm trọng và tầm ảnh hưởng: Có thể từ biến cố nhỏ mang tính chất cá nhân rắc rối đến thảm họa lớn mang tầm ảnh hưởng rộng lớn - hoàn toàn do AI tự định đoạt qua phân tích sâu sắc.
- Đối tượng xoay quanh: Có thể xoay quanh MC (nhân vật chính) hoặc hoàn toàn không liên quan gì tới MC (ví dụ: biến cố xảy ra giữa các NPC khác với nhau, thảm họa thiên tai đột ngột tàn phá khu vực lân cận, một cuộc trở mặt phản bội dữ dội của các NPC mà MC chỉ gián tiếp nghe thấy hoặc chịu tác động lây lan...). Sự kiện phải mang sắc thái bất ngờ, đột ngột, làm bẻ hướng mạch truyện để tạo nên sự lôi cuốn tột bộc phát lập tức!
- Yêu cầu thực thi chính văn ở Bước 2: Sự kiện kịch tính này BẮT BUỘC phải diễn ra trực tiếp và bùng nổ ngay lập tức trong chính văn của lượt chơi này! Cấm chỉ việc viết bình yên, êm ả hay bỏ quên biến cố. Sự kiện phải thay đổi hoàn toàn cục diện hiện tại, ảnh hưởng mạnh mẽ đến tinh thần, thể chất, cảm xúc hoặc vật phẩm (statusData) của các nhân vật liên quan!`;
    }

    const activePresetsText = (useStore.getState().promptPresets || [])
      .filter((p) => p.isActive)
      .map((p) => `\n--- [PRESET: ${p.name}] ---\n${p.content}\n------------------------\n`)
      .join("");
    const finalPlayerRules = (playerRules || "") + activePresetsText;

    let systemInstruction = getGameplaySystemInstruction(
      isFirstTurn,
      targetWordCount,
      temperature,
      finalPlayerRules,
      useColorEnabled,
      theme.group,
      activeDrama,
      colorConfig,
      isHardModeEnabled,
      topP,
      topK,
      phoneAppControl,
      useStore.getState().dramaPrompt || "",
      isFanfictionModeEnabled,
      isVNDialogueModeEnabled,
      useStore.getState().actionSuggestionsConfig || "",
      mcTemplateMode,
      customMcFields,
      npcTemplateMode,
      customNpcFields,
      gameData?.disableDefaultNpcRelationships || false,
      gameData?.blankSlateMode ?? true
    );

    // [PATCH] Final scrub of the system instruction to catch any leaked old tags from user presets or other places
    systemInstruction = systemInstruction.replace(/<json_ToMau>[\s\S]*?<\/json_ToMau>/g, "");
    systemInstruction = systemInstruction.replace(/\[mau:dâm thủy\]/gi, "[damThuy:dâm thủy]");
    systemInstruction = systemInstruction.replace(/\[mau:tinh dịch\]/gi, "[damThuy:tinh dịch]");
    systemInstruction = systemInstruction.replace(/\[mau:mồ hôi\]/gi, "[damThuy:mồ hôi]");
    systemInstruction = systemInstruction.replace(/\[mau:nước bọt\]/gi, "[damThuy:nước bọt]");


    const prompt = `Đây là dữ liệu của lượt chơi này:\n\n${contextStr}\n\n[LỜI NHẮC CỐT LÕI]:\n1. BẮT BUỘC DUY TRÌ ĐẦY ĐỦ Tháng và Năm trong trường worldTime (Tuyệt đối không cắt bỏ).\n2. KIỂM TRA CHÉO TÊN, TUỔI, NGOẠI HÌNH CỦA TỪNG NPC ĐANG ĐI CÙNG TRONG CẢNH, TUYỆT ĐỐI KHÔNG LẤY RÂU ÔNG NỌ CẮM CẰM BÀ KIA, KHÔNG NHẦM LẪN TUỔI HAY NGOẠI HÌNH CỦA NPC NÀY SANG NPC KHÁC!\n\nHãy tiến hành BƯỚC 0, BƯỚC 1, và BƯỚC 2 theo đúng thứ tự.

[CẢNH BÁO TỐI THƯỢNG]: KÝ TỰ ĐẦU TIÊN TRONG CÂU TRẢ LỜI CỦA BẠN BẮT BUỘC PHẢI LÀ THẺ <npc_list>, KHÔNG ĐƯỢC VIẾT BẤT CỨ CHỮ GÌ KHÁC (kể cả lời chào hay dấu phân cách) TRƯỚC THẺ NÀY!`;

    // Thêm tin nhắn tạm thời của AI
    setMessages((prev) => [
      ...prev,
      {
        id: aiMsgId,
        sender: "ai",
        content: "",
        isStreaming: true,
      },
    ]);

    scrollToTurn(aiMsgId, "instant");

    try {
      let fullText = "";
      let fullThought = "";
      let lastUsage: any = null;
      const startTime = performance.now();
      // [PATCH] Scrub the prompt of any lingering <json_ToMau> or [mau:dâm thủy] from past memory
      let sanitizedPrompt = prompt;
      sanitizedPrompt = sanitizedPrompt.replace(/<json_ToMau>[\s\S]*?<\/json_ToMau>/g, "");
      sanitizedPrompt = sanitizedPrompt.replace(/\[mau:dâm thủy\]/gi, "[damThuy:dâm thủy]");
      sanitizedPrompt = sanitizedPrompt.replace(/\[mau:tinh dịch\]/gi, "[damThuy:tinh dịch]");
      sanitizedPrompt = sanitizedPrompt.replace(/\[mau:mồ hôi\]/gi, "[damThuy:mồ hôi]");
      sanitizedPrompt = sanitizedPrompt.replace(/\[mau:nước bọt\]/gi, "[damThuy:nước bọt]");
      sanitizedPrompt = sanitizedPrompt.replace(/\[mau:/g, "[huyet:"); // Any remaining [mau: becomes [huyet:

      const stream = aiService.generateStreamingContent(
        sanitizedPrompt,
        undefined,
        systemInstruction,
      );

      streamEmitter.emitStart();
      let lastStreamDataUpdate = Date.now();
      for await (const chunk of stream) {
        if (chunk.text === "[CLEAR_STREAM_BUFFER]" || chunk.thought === "[CLEAR_STREAM_BUFFER]") {
          fullText = "";
          fullThought = "";
          streamEmitter.emitProgress("", "");
          updateStreamData(() => "");
          continue;
        }
        if (chunk.thought) {
          fullThought += chunk.thought;
        }
        if (chunk.text) {
          fullText += chunk.text;
        }
        
        streamEmitter.emitProgress(fullThought, fullText);

        const now = Date.now();
        if (now - lastStreamDataUpdate > 2000) {
          updateStreamData(fullThought + "\n\n" + fullText);
          lastStreamDataUpdate = now;
        }
        
        if (chunk.usage) {
          lastUsage = chunk.usage;
        }
      }
      streamEmitter.emitEnd();
      // Ensure final state is written
      updateStreamData(fullThought + "\n\n" + fullText);

      const pTime = performance.now() - startTime;

      // Xử lý bù đắp thought nếu SDK không tách nó ra (AI ném thẻ THINKING_PROCESS thẳng vào chunk.text)
      if (!fullThought && fullText) {
        const tStartMatch = fullText.match(/(<npc_list>|<thinking_process>)/i);
        if (tStartMatch && tStartMatch.index !== undefined) {
          const tStart = tStartMatch.index;
          const tEnd = fullText.toLowerCase().indexOf("</thinking_process>");
          if (tEnd !== -1 && tEnd > tStart) {
            fullThought = fullText.substring(tStart, tEnd).trim();
            // Remove the starting tags for clean display if desired, or keep them.
            // Let's just keep the full block from the start of the match.
          } else {
            // Chỉ lấy tạm một phần hiển thị cho đến JSON block
            const jStartMatch = fullText.match(/(<json_output>|```json|{)/i);
            if (
              jStartMatch &&
              jStartMatch.index !== undefined &&
              jStartMatch.index > tStart
            ) {
              fullThought = fullText
                .substring(tStart, jStartMatch.index)
                .trim();
            } else {
              fullThought = fullText.substring(tStart).trim();
            }
          }
        }
      }

      // Xử lý JSON bằng Parser kiên cường của Matrix Lite
      const { parsedData } = robustParseGameplayJSON(fullText);

      let statsObj: any = null;
      if (parsedData) {
        let currentState = useStore.getState();
        if (currentState.gameData) {
          let newData = JSON.parse(JSON.stringify(currentState.gameData)); // deep clone
          let hasUpdate = false;

          // Cleaning up existing empty items in DB to fix legacy bugs
          if (newData.mcData.statusData) {
            newData.mcData.statusData = sanitizeStatusData(
              newData.mcData.statusData,
            );
          }
          if (Array.isArray(newData.npcs)) {
            newData.npcs = newData.npcs.filter(Boolean);
            newData.npcs.forEach((npc: any) => {
              if (npc && npc.statusData) {
                npc.statusData = sanitizeStatusData(npc.statusData);
              }
            });
          }

          // MC Updates
          const mcUpdatesData =
            parsedData.mcUpdates ||
            parsedData.mcUpdate ||
            parsedData.playerUpdate ||
            parsedData.mc_updates;
          if (mcUpdatesData) {
            const mcResult = applyMcUpdates(newData.mcData, mcUpdatesData);
            if (mcResult.hasUpdate) {
              newData.mcData = mcResult.updatedMcData;
              hasUpdate = true;
            }
          }

          // NPC Updates
          const npcUpdatesData =
            parsedData.npcUpdates ||
            parsedData.npcUpdate ||
            parsedData.npcsUpdate ||
            parsedData.npc_updates;
          if (npcUpdatesData) {
            const npcResult = applyNpcUpdates(newData.npcs, npcUpdatesData);
            if (npcResult.hasUpdate) {
              newData.npcs = npcResult.updatedNpcs;
              hasUpdate = true;
            }
          }

          // New NPCs Registration
          const newNPCsData =
            parsedData.newNPCs || parsedData.newNpcs || parsedData.new_npcs;
          if (newNPCsData && Array.isArray(newNPCsData)) {
            if (!newData.npcs) newData.npcs = [];
            newNPCsData.filter(Boolean).forEach((npc: any) => {
              if (npc && (npc.name || npc.fullName)) {
                const targetName = npc.name || npc.fullName;
                const targetFullName = npc.fullName || npc.name;
                const exist = newData.npcs.some((n: any) => {
                  if (!n) return false;
                  if (npc.id && n.id === npc.id) return true;
                  const nName = (n.name || "").trim().toLowerCase();
                  const nFullName = (n.fullName || "").trim().toLowerCase();
                  const tName = (targetName || "").trim().toLowerCase();
                  const tFullName = (targetFullName || "").trim().toLowerCase();
                  return (
                    (nName && (nName === tName || nName === tFullName)) ||
                    (nFullName && (nFullName === tName || nFullName === tFullName))
                  );
                });
                if (!exist) {
                  const defaultNpc = {
                    id: npc.id || npc.name || npc.fullName || ("npc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6)),
                    name: "",
                    fullName: "",
                    titles: "",
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
                    relation: "",
                    personality: "",
                    personalityCore: "",
                    philosophy: "",
                    distinguishingFeatures: "",
                    innerSecret: "",
                    relationships: [],
                    loveViews: "",
                    experience: "",
                    nsfwPersonality: "",
                    nsfwReactions: "",
                    literaryDescription: "",
                    goal: "",
                  };
                  const finalNpc = { ...defaultNpc, ...npc };
                  if (finalNpc.statusData) {
                    finalNpc.statusData = sanitizeStatusData(
                      finalNpc.statusData,
                    );
                  }
                  newData.npcs.push(finalNpc);
                  hasUpdate = true;
                  toast.success(`Nhân vật mới xuất hiện:\n${targetName}`);
                }
              }
            });
            newData.npcs = ensureUniqueNpcIds(newData.npcs);
          }

          // World State Updates
          if (
            parsedData.worldStateUpdate &&
            typeof parsedData.worldStateUpdate === "string"
          ) {
            if (!newData.worldData) newData.worldData = {};
            newData.worldData.worldState = parsedData.worldStateUpdate;
            hasUpdate = true;
          }

          // Phone Updates
          if (parsedData.phoneUpdates && parsedData.phoneUpdates.chats) {
            if (!newData.phone) newData.phone = { chats: [] };
            
            // Lấy danh sách NPCs đang có trong worldData
            const worldNpcs = newData.worldData?.npcs || [];
            
            parsedData.phoneUpdates.chats.forEach((updateChat: any) => {
              if (!updateChat.chatId) return;
              
              let targetChatId = updateChat.chatId;
              let isGroup = updateChat.isGroup || false;
              
              // Nếu chat cá nhân, cố gắng ánh xạ thông minh về ID gốc của NPC để chống rác nhân bản
              if (!isGroup) {
                const matchedNpc = worldNpcs.find((n: any) => {
                  const targetChatIdStr = String(targetChatId || "").toLowerCase();
                  const chatNameStr = String(updateChat.chatName || "").toLowerCase();
                  const nIdStr = String(n.id || "").toLowerCase();
                  const nNameStr = String(n.name || "").toLowerCase();
                  const nFullNameStr = String(n.fullName || "").toLowerCase();
                  
                  const idMatch = n.id && (nIdStr === targetChatIdStr);
                  const nameMatch = n.name && (nNameStr === targetChatIdStr || nNameStr === chatNameStr);
                  const fullNameMatch = n.fullName && (nFullNameStr === chatNameStr || nFullNameStr === targetChatIdStr);
                  return idMatch || nameMatch || fullNameMatch;
                });
                
                if (matchedNpc) {
                  // Ép buộc dùng ID định danh chuẩn của NPC gốc (thường là matchedNpc.id hoặc matchedNpc.name)
                  targetChatId = matchedNpc.id || matchedNpc.name;
                }
              }
              
              let existingChat = newData.phone.chats.find((c: any) => String(c.chatId).toLowerCase() === String(targetChatId).toLowerCase());
              
              // Dự phòng: So khớp thêm bằng chatName nếu vẫn không tìm thấy
              if (!existingChat && !isGroup) {
                existingChat = newData.phone.chats.find((c: any) => 
                  !c.isGroup && 
                  (String(c.chatName || "").toLowerCase() === String(updateChat.chatName || "").toLowerCase() || 
                   String(c.chatId || "").toLowerCase() === String(updateChat.chatName || "").toLowerCase() || 
                   String(c.chatName || "").toLowerCase() === String(targetChatId || "").toLowerCase())
                );
                if (existingChat) {
                  targetChatId = existingChat.chatId;
                }
              }

              // Dự phòng: So khớp thêm bằng chatName hoặc set participants cho Group Chat nếu ID bị sai lệch
              if (!existingChat && isGroup) {
                existingChat = newData.phone.chats.find((c: any) => 
                  c.isGroup && 
                  String(c.chatName || "").toLowerCase() === String(updateChat.chatName || "").toLowerCase()
                );
                if (existingChat) {
                  targetChatId = existingChat.chatId;
                }
              }
              
              if (existingChat) {
                // Giữ lại biệt danh người chơi tự đổi nếu có, chỉ thay đổi nếu chatName mới hoàn toàn khác biệt do AI cập nhật
                if (updateChat.chatName && existingChat.chatName === existingChat.chatId) {
                  existingChat.chatName = updateChat.chatName;
                }
                if (updateChat.avatar) existingChat.avatar = updateChat.avatar;
                if (updateChat.participants) existingChat.participants = updateChat.participants;
                if (updateChat.suggestedReplies) existingChat.suggestedReplies = updateChat.suggestedReplies;
                
                if (updateChat.newMessages && Array.isArray(updateChat.newMessages)) {
                  if (!existingChat.messages) existingChat.messages = [];
                  const mappedNew = updateChat.newMessages.map((m: any) => ({
                    ...m,
                    isPendingStream: true
                  }));
                  existingChat.messages = [...existingChat.messages, ...mappedNew];
                }
              } else {
                const mappedNew = Array.isArray(updateChat.newMessages)
                  ? updateChat.newMessages.map((m: any) => ({ ...m, isPendingStream: true }))
                  : [];
                  
                // Tìm NPC tương ứng để lấy tên chuẩn làm mặc định nếu AI không gửi tên
                const npcDefault = worldNpcs.find((n: any) => String(n.id || n.name || "").toLowerCase() === String(targetChatId || "").toLowerCase());
                const defaultName = npcDefault ? npcDefault.name : targetChatId;
                
                newData.phone.chats.push({
                  chatId: targetChatId,
                  chatName: updateChat.chatName || defaultName,
                  isGroup: isGroup,
                  avatar: updateChat.avatar,
                  participants: updateChat.participants || [],
                  messages: mappedNew,
                  suggestedReplies: updateChat.suggestedReplies || []
                });
              }
            });
            hasUpdate = true;
          }

          // Discord Updates
          if (parsedData.discordUpdates && parsedData.discordUpdates.chats) {
            parsedData.discordUpdates.chats.forEach((chat: any) => {
               if (chat.channel) {
                  const channel = chat.channel;
                  const isWorldChannel = ['world', 'trade', 'help', 'combat'].includes(channel);
                  
                  if (isWorldChannel) {
                     if (!newData.mmoChatMessages) newData.mmoChatMessages = {};
                     if (!newData.mmoChatMessages[channel]) newData.mmoChatMessages[channel] = [];
                     
                     (chat.messages || []).forEach((msg: any) => {
                        newData.mmoChatMessages[channel].push({
                           id: Date.now().toString() + Math.random(),
                           sender: msg.sender,
                           senderId: msg.senderId || msg.sender,
                           isRealNpc: !!msg.isRealNpc,
                           role: msg.role || 'npc',
                           avatar: '',
                           text: msg.text,
                           timestamp: Date.now()
                        });
                     });
                     hasUpdate = true;
                  } else {
                     // DMs
                     if (!newData.mmoDMs) newData.mmoDMs = {};
                     if (!newData.mmoDMs[channel]) newData.mmoDMs[channel] = [];
                     
                     (chat.messages || []).forEach((msg: any) => {
                        newData.mmoDMs[channel].push({
                           id: Date.now().toString() + Math.random(),
                           sender: msg.sender,
                           senderId: msg.senderId || msg.sender,
                           isRealNpc: !!msg.isRealNpc,
                           role: msg.role || 'npc',
                           avatar: '',
                           text: msg.text,
                           timestamp: Date.now()
                        });
                     });
                     
                     // Make sure friend exists
                     if (!newData.mmoFriends) newData.mmoFriends = [];
                     if (!newData.mmoFriends.some((f: any) => f.id === channel)) {
                        // Check if the NPC is in the new messages
                        const theMsg = (chat.messages || []).find((m: any) => m.senderId === channel || m.sender === channel);
                        newData.mmoFriends.push({
                           id: channel,
                           name: theMsg ? theMsg.sender : channel,
                           isRealNpc: theMsg ? !!theMsg.isRealNpc : channel.startsWith('real_')
                        });
                     }
                     hasUpdate = true;
                  }
               }
            });
          }

                    // MC Location Update from root
          if (parsedData.mcLocation && typeof parsedData.mcLocation === "string") {
            if (newData.mcData.location !== parsedData.mcLocation) {
              newData.mcData.location = parsedData.mcLocation;
              hasUpdate = true;
            }
          }
          
          // NPC Locations Update from root
          if (parsedData.npcLocations && Array.isArray(parsedData.npcLocations)) {
            parsedData.npcLocations.forEach((npcLoc: any) => {
              if (npcLoc && npcLoc.id && typeof npcLoc.location === "string") {
                const npcIndex = newData.npcs.findIndex(
                  (n: any) => n && ((n.id && npcLoc.id && String(n.id).toLowerCase().trim() === String(npcLoc.id).toLowerCase().trim()) || (n.name && npcLoc.id && String(n.name).toLowerCase().trim() === String(npcLoc.id).toLowerCase().trim()) || (n.fullName && npcLoc.id && String(n.fullName).toLowerCase().trim() === String(npcLoc.id).toLowerCase().trim()) || (n.name && npcLoc.name && String(n.name).toLowerCase().trim() === String(npcLoc.name).toLowerCase().trim()) || (n.fullName && npcLoc.name && String(n.fullName).toLowerCase().trim() === String(npcLoc.name).toLowerCase().trim()))
                );
                if (npcIndex !== -1 && newData.npcs[npcIndex].location !== npcLoc.location) {
                  newData.npcs[npcIndex].location = npcLoc.location;
                  hasUpdate = true;
                }
              }
            });
          }

          // Codex Updates
          const codexResult = applyCodexPendingUpdates(newData, parsedData);
          if (codexResult.hasUpdate) {
            newData.codexPendingUpdates = codexResult.codexPendingUpdates;
            hasUpdate = true;
          }

          if (hasUpdate) {
            useStore.getState().setGameData(newData);
          }
        }

        // Fallback for older saves or if the model ignored the split request


        // Fallback for older saves or if the model ignored the split request
        let assembledText = parsedData.mainText || "";
        if (!assembledText) {
          const parts = Object.keys(parsedData)
            .filter(
              (k) => /^part\d+/i.test(k) && !k.toLowerCase().includes("audit"),
            )
            .sort((a, b) => {
              const matchA = a.match(/^part(\d+)/i);
              const matchB = b.match(/^part(\d+)/i);
              const numA = matchA ? parseInt(matchA[1], 10) : 0;
              const numB = matchB ? parseInt(matchB[1], 10) : 0;
              return numA - numB;
            })
            .map((k) => (parsedData as any)[k]);

          if (parts.length > 0) {
            assembledText = parts
              .filter(Boolean)
              .map((t: any) =>
                typeof t === "string" ? t.replace(/\\n/g, "\n") : t,
              )
              .join("\n\n");
          }
        }

        // Dọn dẹp các điểm neo cũ trong văn bản nếu có, không hiển thị lên UI game
        assembledText = assembledText.replace(
          /<div(?:[^>]*?)>[\s\S]*?\[ĐIỂM NEO K[I|Ì]ỂM TOÁN LƯỢNG TỪ\][\s\S]*?<\/div>/gi,
          "",
        );
        // Or strip any div with display: none just in case
        assembledText = assembledText.replace(
          /<div[^>]*style=["']display:\s*none;?["'][^>]*>[\s\S]*?<\/div>/gi,
          "",
        );
        // And strip markdown anchors not wrapped in div just in case
        assembledText = assembledText.replace(
          /\*\*\s*\[ĐIỂM NEO KIỂM TOÁN LƯỢNG TỪ\][\s\S]*?\*\*/gi,
          "",
        );

        assembledText = filterSensitiveWords(assembledText, gameData?.worldData?.tags || []);

        const wordCount = assembledText
          ? (assembledText.match(/[\p{L}\p{N}_]+/gu) || []).length
          : 0;
        const norm = normalizeUsage(lastUsage);
        statsObj = {
          processingTime: pTime,
          wordCount: wordCount,
          tokensIn: norm.promptTokenCount,
          tokensOut: norm.candidatesTokenCount,
          tokensTotal: norm.totalTokenCount,
        };
        setCurrentStats(statsObj);

        const rawSuggestedActionsFinal = Array.isArray(
          parsedData.suggestedActions,
        )
          ? parsedData.suggestedActions
          : Array.isArray(parsedData.options)
            ? parsedData.options
            : Array.isArray(parsedData.choices)
              ? parsedData.choices
              : typeof parsedData.suggestedActions === "object" &&
                  parsedData.suggestedActions !== null
                ? Object.values(parsedData.suggestedActions)
                : [];

        const suggestedActionsDataFinal = rawSuggestedActionsFinal.map((item: any) => {
          if (!item) return item;
          if (typeof item === "string") return stripShortTags(filterSensitiveWords(item, gameData?.worldData?.tags || []));
          if (typeof item === "object") {
            const newItem: any = { ...item };
            if (typeof newItem.action === "string") newItem.action = stripShortTags(filterSensitiveWords(newItem.action, gameData?.worldData?.tags || []));
            if (typeof newItem.details === "string") newItem.details = stripShortTags(filterSensitiveWords(newItem.details, gameData?.worldData?.tags || []));
            if (typeof newItem.text === "string") newItem.text = stripShortTags(filterSensitiveWords(newItem.text, gameData?.worldData?.tags || []));
            if (typeof newItem.title === "string") newItem.title = stripShortTags(filterSensitiveWords(newItem.title, gameData?.worldData?.tags || []));
            if (typeof newItem.gainsLosses === "string") newItem.gainsLosses = stripShortTags(filterSensitiveWords(newItem.gainsLosses, gameData?.worldData?.tags || []));
            return newItem;
          }
          return item;
        });

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  isStreaming: false,
                  thought: fullThought,
                  fullStreamLog: useStore.getState().fullScreenStreamData,
                  outline: parsedData.memory || parsedData.outline,
                  mainText: assembledText,
                  suggestedActions: suggestedActionsDataFinal as any[],
                  worldTime: parsedData.worldTime,
                  weather: parsedData.weather,
                  mcLocation: parsedData.mcLocation,
                  npcLocations: parsedData.npcLocations,
                  stats: statsObj,
                }
              : msg,
          ),
        );
        if (parsedData.phoneUpdates && parsedData.phoneUpdates.chats && parsedData.phoneUpdates.chats.length > 0) {
          useStore.getState().setUnreadMessages(useStore.getState().unreadMessages + 1);
        }

        // Chạy ngầm các tác vụ nặng (Lưu vector, Lưu game) để giải phóng UI ngay lập tức
        (async () => {
          // Thêm vào RAG DB (Ghi nhớ vector)
          try {
            const logMsg = synthesizeTurnStoryMemory(
              turns.length,
              parsedData.mcLocation || "Không xác định",
              parsedData.worldTime || "",
              parsedData.weather || "",
              userAction || "Bắt đầu",
              parsedData.memory || parsedData.outline || "",
              assembledText
            );
            await ragService.addMemory(
              gameData.id,
              logMsg,
              false,
              undefined,
              aiMsgId,
            );
          } catch (e) {
            console.error("Lỗi khi thêm bộ nhớ RAG:", e);
          }

          // Tự động lưu game
          try {
            await autoSaveCurrentGame();
          } catch (e) {
            console.error("Lỗi tự động lưu game (Chế độ Parse):", e);
          }
        })();
      } else {
        const cleanText = filterSensitiveWords(cleanRawOutputText(fullText), gameData?.worldData?.tags || []);
        const wordCount = (cleanText.match(/[\p{L}\p{N}_]+/gu) || []).length;
        const norm = normalizeUsage(lastUsage);
        statsObj = {
          processingTime: pTime,
          wordCount: wordCount,
          tokensIn: norm.promptTokenCount,
          tokensOut: norm.candidatesTokenCount,
          tokensTotal: norm.totalTokenCount,
        };
        setCurrentStats(statsObj);

        if (!cleanText) {
          throw new Error("Có lỗi xảy ra khi tạo luồng, không thu được kịch bản hoàn chỉnh.");
        }

        // Fallback
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  isStreaming: false,
                  thought: fullThought,
                  fullStreamLog: useStore.getState().fullScreenStreamData,
                  content: cleanText,
                  stats: statsObj,
                }
              : msg,
          ),
        );

        // Chạy ngầm các tác vụ nặng (Lưu vector, Lưu game) để giải phóng UI ngay lập tức
        (async () => {
          // Thêm vào RAG DB (Ghi nhớ vector)
          try {
            const logMsg = synthesizeTurnStoryMemory(
              turns.length,
              "Không xác định",
              "",
              "",
              userAction || "Bắt đầu",
              "",
              cleanText
            );
            await ragService.addMemory(
              gameData.id,
              logMsg,
              false,
              undefined,
              aiMsgId,
            );
          } catch (e) {
            console.error("Lỗi khi thêm bộ nhớ RAG:", e);
          }

          // Tự động lưu game
          try {
            await autoSaveCurrentGame();
          } catch (e) {
            console.error("Lỗi tự động lưu game (Chế độ Fallback):", e);
          }
        })();
      }
    } catch (error: any) {
      const errorMsg = cleanErrorMessage(error?.message || String(error));
      const newSysLog = generateSysLog(error);
      setSystemLogs(newSysLog);

      if (retryCount < 3) {
        willRetry = true;
        let countdown = 2;
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  isStreaming: false,
                  content: `Matrix Lite v6 bị nhiễu loạn băng thông, quá trình tính toán bị ngắt quãng. \nĐang thử lại sau ${countdown} giây...\nLỗi hệ thống: ` + errorMsg,
                }
              : msg,
          ),
        );
        
        const timer = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? {
                      ...msg,
                      content: `Matrix Lite v6 bị nhiễu loạn băng thông, quá trình tính toán bị ngắt quãng. \nĐang thử lại sau ${countdown} giây...\nLỗi hệ thống: ` + errorMsg,
                    }
                  : msg,
              ),
            );
          } else {
            clearInterval(timer);
            setMessages((prev) => prev.filter((msg) => msg.id !== aiMsgId));
            generateTurn(userAction, retryCount + 1);
          }
        }, 1000);
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  isStreaming: false,
                  content:
                    "Matrix Lite v6 bị nhiễu loạn băng thông, quá trình tính toán bị ngắt quãng. Vui lòng thử lại.\nLỗi hệ thống: " +
                    errorMsg,
                }
              : msg,
          ),
        );
      }
    } finally {
      if (!willRetry) {
        setIsGenerating(false);
        setIsGeneratingStream(false);
        
        // 🎲 Roll drama dice for NEXT turn (after 10s delay as requested)
        const dramaChance = useStore.getState().dramaChance ?? 0;
        if (dramaChance > 0) {
           setTimeout(() => {
             let dividingLine = 100 - dramaChance;
             let roll = 0;
             while(true) {
                 roll = Math.floor(Math.random() * 100) + 1;
                 if (roll === dividingLine) continue;
                 break;
             }
             const isDrama = roll > dividingLine;
             useStore.getState().setIsDramaticEnabled(isDrama);
             
             if (isDrama) {
                 toast.error(`🎲 [KỊCH TÍNH ĐÃ BẬT] Xúc xắc ra: [${roll}] (Số lớn > mốc ${dividingLine}). Cảnh báo: Biến cố sẽ ập đến ở lượt kế tiếp!`, { duration: 6000 });
             } else {
                 toast.success(`🎲 [KỊCH TÍNH ĐÃ TẮT] Xúc xắc ra: [${roll}] (Số nhỏ < mốc ${dividingLine}). Nhịp độ sẽ bình yên ở lượt kế tiếp.`, { duration: 6000 });
             }
           }, 10000);
        } else {
           // Reset if chance is 0
           if (useStore.getState().isDramaticEnabled) {
               useStore.getState().setIsDramaticEnabled(false);
           }
        }
      }
      scrollToTurn(aiMsgId, "instant");
    }
  };

  const handleSend = (actionText: string) => {
    if (isGenerating) return;

    // Thêm User message
    const userMsgId = nanoid() + "_u";
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", content: actionText },
    ]);

    generateTurn(actionText);
  };

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && handleSendRef.current) {
        handleSendRef.current(customEvent.detail);
      }
    };
    window.addEventListener('triggerGameplayAction', handleTrigger);
    return () => window.removeEventListener('triggerGameplayAction', handleTrigger);
  }, []);

  const handleSendSummarize = async () => {
    if (isGenerating || isSummarizing) return;
    setIsGenerating(true);
    setIsSummarizing(true);

    try {
      const outlineMessages = messages.filter((m) => m.outline);
      const lastSummarizedTurnIndex =
        gameData.worldData?.lastSummarizedTurnIndex || 0;

      const newMessages = outlineMessages.slice(lastSummarizedTurnIndex);
      if (newMessages.length === 0) {
        toast.info("Chưa có lượt chơi mới nào để tóm tắt.");
        setIsGenerating(false);
        setIsSummarizing(false);
        return;
      }

      const newLogsStr = newMessages
        .map(
          (m, idx) =>
            `[LƯỢT ${lastSummarizedTurnIndex + idx + 1}]\n- Tóm tắt: ${m.outline}\n- Diễn biến chi tiết: ${m.mainText}`,
        )
        .join("\n\n");

      const oldWorldState =
        gameData.worldData?.worldState || "Chưa có trạng thái thế giới cũ.";

      const promptText = `TRẠNG THÁI THẾ GIỚI CŨ LƯU TRONG NÃO BỘ AI:\n"""\n${oldWorldState}\n"""\n\nDIỄN BIẾN MỚI CẦN CẬP NHẬT (TỪ LƯỢT ${lastSummarizedTurnIndex + 1} ĐẾN CHUỖI TƯƠNG TÁC HIỆN TẠI):\n"""\n${newLogsStr}\n"""\n\nYÊU CẦU: Hãy đọc kỹ Trạng thái thế giới cũ và kết hợp với các Diễn biến mới để ĐÚC KẾT & CẬP NHẬT lại một TRẠNG THÁI THẾ GIỚI MỚI NHẤT. Hãy cập nhật lại tình trạng chung của cảnh vật, trạng thái sinh lý/tâm lý, đồ đạc của Nhân Vật Chính và các NPC đang tương tác, những thay đổi quan trọng nếu có. Bỏ bớt các nội dung đã cũ không còn phù hợp. Chỉ trả lời MỘT bảng tóm tắt súc tích, hoàn chỉnh và cô đọng. Định dạng JSON output với key là "worldState".`;

      const stream = aiService.summarizeWorldStateStream(promptText);
      let fullText = "";
      for await (const chunk of stream) {
        if (chunk.text) {
          fullText += chunk.text;
        }
      }

      let finalWorldState = "";
      let cleanOutput = fullText.trim();

      // Attempt 1: Raw JSON extraction
      try {
        const startIdx = cleanOutput.indexOf("{");
        const endIdx = cleanOutput.lastIndexOf("}");
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const jsonStr = cleanOutput.substring(startIdx, endIdx + 1);
          const parsed = safeParseJSON(jsonStr);
          if (parsed.worldState) {
            finalWorldState = parsed.worldState;
          }
        }
      } catch (e) {}

      // Attempt 2: Fallback to robust parser
      if (!finalWorldState) {
        const { parsedData } = robustParseGameplayJSON(fullText);
        if (parsedData && parsedData.worldState) {
          finalWorldState = parsedData.worldState;
        }
      }

      // Attempt 3: If AI just printed markdown or string
      if (!finalWorldState && fullText.length > 10) {
        finalWorldState = fullText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        // If it still looks like an object, try removing opening brackets
        if (finalWorldState.startsWith("{") && finalWorldState.endsWith("}")) {
          finalWorldState = finalWorldState.slice(1, -1).trim();
        }
      }

      if (finalWorldState) {
        let currentState = useStore.getState();
        if (currentState.gameData && currentState.gameData.worldData) {
          let newData = JSON.parse(JSON.stringify(currentState.gameData));
          newData.worldData.worldState = finalWorldState;
          newData.worldData.lastSummarizedTurnIndex = outlineMessages.length; // Update the index
          currentState.setGameData(newData);
          toast.success(
            `Trí nhớ AI (World State) đã cập nhật ${newMessages.length} lượt thành công!`,
          );

          // Thêm worldState vào RAG để AI tương lai có thể recall được
          await ragService.addMemory(
            newData.id,
            "[CẬP NHẬT TRẠNG THÁI CUỐN CHIẾU]: " + finalWorldState,
            true,
          );
        }
      } else {
        toast.error(
          "Không tìm thấy thông tin worldState trong nội dung trả về.",
        );
      }
    } catch (e: any) {
      toast.error(
        "Quá trình tạo tóm tắt gặp lỗi: " +
          cleanErrorMessage(e?.message || String(e)),
      );
    } finally {
      setIsGenerating(false);
      setIsSummarizing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã copy hành động!");
  };

  const handleDownloadSave = async () => {
    if (playerRulesRef.current !== playerRules) {
      setPlayerRules(playerRulesRef.current);
    }
    const state = useStore.getState();
    if (!state.gameData) return;

    const gameName = "Matrix Lite v6";
    const worldName = state.gameData.worldData?.name || "Untitled World";
    const mcName = state.gameData.mcData?.name || "MC";
    const aiMsgsCount = state.messages.filter(
      (m) => m.sender === "ai" || m.sender === "system",
    ).length;
    const turnCount = Math.max(0, aiMsgsCount - 1);

    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, "0")}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getFullYear()}`;
    const saveName = `${gameName} - ${worldName} - Lượt ${turnCount} - ${mcName} - ${dateStr}`;

    const currentId = state.gameData.id || Date.now().toString();
    const ragMemories = await ragService.getMemories(currentId);
    const activeRules = playerRulesRef.current || state.playerRules || state.gameData.playerRules || "";
    const activeSuggestionsConfig = state.actionSuggestionsConfig || state.gameData.actionSuggestionsConfig || "";

    const enrichedGameData = {
      ...state.gameData,
      playerRules: activeRules,
      actionSuggestionsConfig: activeSuggestionsConfig,
    };

    const saveObj = {
      id: currentId,
      name: saveName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: state.messages,
      gameData: enrichedGameData,
      ragMemories: ragMemories,
      playerRules: activeRules,
      actionSuggestionsConfig: activeSuggestionsConfig,
    };

    setTimeout(() => {
      const blob = new Blob([JSON.stringify(saveObj, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = saveName + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải tệp tiến trình về máy!");
    }, 50);
  };

  if (!gameData) return null;

  const currentTurnsArr = getPageTurns(currentPage);



  // === HELPER CẬP NHẬT TRẠNG THÁI (ĐÈN XANH) ===
  const defaultFieldsForCheck = [
      "fullname", "gender", "age", "dob", "height", "weight", "measurements", "rank", "occupation",
      "appearance", "appearancelite", "distinguishingfeatures", 
      "personality", "personalitycore", "philosophy", "goal", 
      "innersecret", "impression", "background", "relationships", 
      "powers", "skills", "inventory", "preferences", "needs", "needssfw", "needsnsfw",
      "likesdislikesfears", "likesdislikesfearsnsfw", "loveviews", "experience", 
      "nsfwpersonality", "nsfwreactions", "literarydescription", "titles",
      "id", "name", "role", "avatar", "objectives", "partylist", "customdata"
  ];

  const hasPendingUpdatesForChar = (char: any, templateMode: string, customFields: any[]) => {
      if (!char?.pendingUpdates) return false;
      return Object.keys(char.pendingUpdates).some(k => {
          const keyLower = k.trim().toLowerCase();
          if (['location', 'currentlocation', 'status', 'statusdata'].includes(keyLower)) return false;
          if (templateMode === "custom") {
             return (customFields || []).some((f: any) => f.id.toLowerCase() === keyLower) || ["id", "name", "role", "avatar", "objectives", "partylist", "inventory", "customdata"].includes(keyLower);
          }
          return defaultFieldsForCheck.includes(keyLower);
      });
  };

  const hasAnyNpcUpdate = !autoUpdateNpc && !!gameData?.npcs?.some((npc: any) => 
      hasPendingUpdatesForChar(npc, gameData?.npcTemplateMode || "default", gameData?.customNpcFields || [])
  );

  const hasMcUpdate = !autoUpdateMc && hasPendingUpdatesForChar(gameData?.mcData, gameData?.mcTemplateMode || "default", gameData?.customMcFields || []);
  const hasCodexUpdate = !autoUpdateCodex && !!(gameData?.codexPendingUpdates && (
    (gameData.codexPendingUpdates.worldData && Object.keys(gameData.codexPendingUpdates.worldData).length > 0) ||
    (gameData.codexPendingUpdates.worldDetails && (
      (gameData.codexPendingUpdates.worldDetails.locations && gameData.codexPendingUpdates.worldDetails.locations.length > 0) ||
      (gameData.codexPendingUpdates.worldDetails.places && gameData.codexPendingUpdates.worldDetails.places !== gameData.worldDetails?.places)
    )) ||
    (gameData.codexPendingUpdates.creativeRules && gameData.codexPendingUpdates.creativeRules !== gameData.creativeRules)
  ));
  const hasRightUpdate = hasMcUpdate || hasCodexUpdate;

  return (
    <div
      className="w-full h-full flex flex-col bg-transparent relative overflow-hidden"
      style={
        {
          "--thought-color": useColorEnabled ? (colorConfig.thought || "inherit") : "inherit",
          ...(colorConfig.text
            ? { "--normal-text-color": colorConfig.text }
            : {}),
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className={`min-h-[64px] py-2 relative shrink-0 border-b flex items-center justify-between px-4 z-40 backdrop-blur-md theme-panel shadow-none overflow-x-auto no-scrollbar scrollbar-hide ${theme.group === "Dark" ? "border-white/10" : "border-black/10"}`}>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="p-2 rounded-xl theme-panel-hover transition-colors theme-text-base cursor-pointer relative"
            title="Đóng/Mở danh sách NPCs"
          >
            <PanelLeft size={18} />
            {hasAnyNpcUpdate && !leftOpen && (
              <span className="absolute top-1 right-1 flex h-2 w-2 z-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </button>
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl theme-panel-hover transition-colors theme-text-base cursor-pointer"
            title="Trang Chủ"
          >
            <Home size={18} />
          </button>

          <div
            className={`hidden md:flex items-center gap-1.5 md:gap-2 px-2 ml-2 border-l ${theme.group === "Dark" ? "border-white/10" : "border-black/10"}`}
          >
            <button
              onClick={() => {
                if (playerRulesRef.current !== playerRules) {
                  setPlayerRules(playerRulesRef.current);
                }
                setTimeout(async () => {
                  await saveCurrentGame();
                  toast.success("Đã lưu tiến trình!");
                }, 50);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider ${getHeaderBtnClass("green")}`}
            >
              <Save size={14} /> <span>LƯU</span>
            </button>
            <button
              onClick={async () => {
                const success = await resumeLatestGame();
                if (success) {
                  toast.success("Đã tải nhanh tệp lưu mới nhất!");
                } else {
                  toast.error("Không tìm thấy tệp lưu nào để tải!");
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider ${getHeaderBtnClass("orange")}`}
              title="Tải tiến trình mới nhất"
            >
              <RotateCcw size={14} /> <span>LOAD</span>
            </button>
            <button
              onClick={handleDownloadSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider ${getHeaderBtnClass("blue")}`}
            >
              <Download size={14} /> <span>SAVE</span>
            </button>
            <button
              onClick={() => setShowMC(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider relative ${getHeaderBtnClass("emerald")}`}
            >
              <User size={14} /> <span>MC</span>
              {hasMcUpdate && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 z-10">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white dark:border-slate-900"></span>
                  </span>
                )}
            </button>
            <button
              onClick={() => setShowParty(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider ${getHeaderBtnClass("purple")}`}
            >
              <Users size={14} /> <span>PARTY</span>
            </button>
            <button
              onClick={() => setShowRules(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider ${getHeaderBtnClass("indigo")}`}
            >
              <ListTodo size={14} /> <span>RULES</span>
            </button>
            <button
              onClick={() => setShowStatus(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider ${getHeaderBtnClass("teal")}`}
            >
              <Activity size={14} /> <span>STATUS</span>
            </button>
            <button
              onClick={() => setShowGallery(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider ${getHeaderBtnClass("pink")}`}
            >
              <ImageIcon size={14} /> <span>ẢNH</span>
            </button>
            <button
              onClick={() => setShowCodex(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider relative ${getHeaderBtnClass("cyan")}`}
            >
              <Book size={14} /> <span>CODEX</span>
              {!autoUpdateCodex && gameData?.codexPendingUpdates && (
                (gameData.codexPendingUpdates.worldData && Object.keys(gameData.codexPendingUpdates.worldData).length > 0) ||
                (gameData.codexPendingUpdates.worldDetails && Object.keys(gameData.codexPendingUpdates.worldDetails).length > 0) ||
                gameData.codexPendingUpdates.creativeRules
              ) && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-white dark:border-slate-900"></span>
                </span>
              )}
            </button>
            <button
              onClick={() => setShowMemory(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider ${getHeaderBtnClass("purple")}`}
            >
              <BrainCircuit size={14} /> <span>MEMORY</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider ${getHeaderBtnClass("gray")}`}
            >
              <SettingsIcon size={14} /> <span>CẤU HÌNH</span>
            </button>
            <button
              onClick={() => setIsColorModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider border text-white ${useColorEnabled ? "bg-green-600 border-white hover:bg-green-500" : "bg-black border-white hover:bg-zinc-900"}`}
              title="Cấu hình màu sắc"
            >
              <Palette size={14} /> <span>MÀU SẮC</span>
            </button>
            <button
              onClick={() => setIsPhoneModalOpen(true)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider border text-white bg-indigo-600 border-white hover:bg-indigo-500`}
              title="Điện thoại thông minh"
            >
              <Smartphone size={14} /> <span>PHONE</span>
              {unreadMessages > 0 && phoneAppControl.messenger !== false && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black border border-white">
                  {unreadMessages}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsDramaModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider border text-white ${isDramatic ? "bg-red-600 border-white hover:bg-red-500" : "bg-black border-white hover:bg-zinc-900"}`}
              title="Cài đặt chế độ Kịch Tính: AI sẽ tạo ra biến cố bất ngờ xoay quanh MC hoặc không liên quan tới MC"
            >
              <Flame size={14} className={isDramatic ? "animate-pulse" : ""} />{" "}
              <span>KỊCH TÍNH</span>
            </button>
            <button
              onClick={() => setIsStrictEndEnabled(!isStrictEndEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold tracking-wider border text-white ${isStrictEndEnabled ? "bg-red-600 border-white hover:bg-red-500" : "bg-black border-white hover:bg-zinc-900"}`}
              title="Bật/Tắt chế độ: Ép AI kết thúc chính văn ngay sau hành động (Không tự viết thêm)"
            >
              <AlertTriangle size={14} className={isStrictEndEnabled ? "animate-pulse" : ""} />{" "}
              <span>END</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto py-1">
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className="p-2 rounded-xl theme-panel-hover transition-colors theme-text-base cursor-pointer relative"
            title="Đóng/Mở Streaming"
          >
            <PanelRight
              size={18}
              className={isGenerating ? "text-purple-400" : ""}
            />
            {isGenerating && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
              </span>
            )}
            {hasRightUpdate && !rightOpen && !isGenerating && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Overlay for Sidebars */}
        <AnimatePresence>
          {(leftOpen || rightOpen) && (
            <motion.div
              key="gameplay-mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setLeftOpen(false);
                setRightOpen(false);
              }}
              className="md:hidden absolute inset-0 bg-black/60 backdrop-blur-sm z-20"
            />
          )}
        </AnimatePresence>

        {/* Left Sidebar - NPCs */}
        <AnimatePresence>
          {leftOpen && (
            <motion.div
              key="gameplay-left-sidebar"
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`absolute md:relative left-0 top-0 bottom-0 w-72 md:w-80 border-r z-30 flex flex-col ${theme.group === "Dark" ? "theme-panel !border-y-0 !border-l-0 text-white backdrop-blur-2xl" : "border-black/10 bg-[#F4EFE6]/95 backdrop-blur-md shadow-lg text-[#0f172a]"}`}
            >
              <div
                className={`p-3 border-b flex flex-col gap-3 shrink-0 ${theme.group === "Dark" ? "border-white/10" : "border-black/10"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <h3
                      className={
                        "text-xs font-bold uppercase tracking-widest opacity-50 " +
                        theme.textPrimary
                      }
                    >
                      NPCs ({gameData.npcs?.length || 0})
                    </h3>
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        onClick={() => setShowMaleNPCs(!showMaleNPCs)}
                        className={`p-1 rounded-full transition-all cursor-pointer ${showMaleNPCs ? (theme.group === "Dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600") : "opacity-30 grayscale"}`}
                        title="Hiện/Ẩn Nam"
                      >
                        <User size={13} />
                      </button>
                      <button
                        onClick={() => setShowFemaleNPCs(!showFemaleNPCs)}
                        className={`p-1 rounded-full transition-all cursor-pointer ${showFemaleNPCs ? (theme.group === "Dark" ? "bg-pink-500/20 text-pink-400" : "bg-pink-100 text-pink-600") : "opacity-30 grayscale"}`}
                        title="Hiện/Ẩn Nữ"
                      >
                        <User size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => npcListRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        theme.group === "Dark"
                          ? "bg-white/5 hover:bg-white/15 text-white/70 hover:text-white"
                          : "bg-black/5 hover:bg-black/10 text-slate-600 hover:text-slate-900"
                      }`}
                      title="Lên đầu danh sách"
                    >
                      <ArrowUpToLine size={13} />
                    </button>
                    <button
                      onClick={() => setShowNPCBuilder(true)}
                      className="px-2 py-1 flex items-center gap-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer text-[10px] font-bold uppercase tracking-wider"
                    >
                      <User size={12} /> Tạo Mới
                    </button>
                  </div>
                </div>
                <div className="relative w-full">
                  <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.group === "Dark" ? "text-white/40" : "text-black/40"}`} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm npc..."
                    value={npcSearchQuery}
                    onChange={(e) => setNpcSearchQuery(e.target.value)}
                    className={`w-full text-[11px] font-medium pl-7 pr-2 py-1.5 rounded-lg outline-none transition-all ${
                      theme.group === "Dark" 
                        ? "bg-black/30 focus:bg-black/50 border border-white/5 focus:border-white/20 text-white placeholder-white/30" 
                        : "bg-black/5 focus:bg-white border border-black/5 focus:border-black/15 text-[#0f172a] placeholder-[#0f172a]/40"
                    }`}
                  />
                </div>
              </div>
              <div ref={npcListRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {processedNPCs
                  .map(
                    (
                      {
                        npc,
                        index,
                        isLite,
                        locStr,
                        isUnknownLoc,
                        isStrikethrough,
                        isMale,
                      },
                      renderIndex,
                    ) => {
                      const bgClass = isMale
                        ? theme.group === "Dark"
                          ? "bg-blue-500/5 hover:bg-blue-500/10"
                          : "bg-sky-50/70 hover:bg-sky-100/70 text-[#0f172a]"
                        : theme.group === "Dark"
                          ? "bg-pink-500/5 hover:bg-pink-500/10"
                          : "bg-pink-50/70 hover:bg-pink-100/70 text-[#0f172a]";
                      const borderClass = isMale
                        ? theme.group === "Dark"
                          ? "border-blue-500/20 hover:border-blue-500/30"
                          : "border-black/10 hover:border-sky-300/80"
                        : theme.group === "Dark"
                          ? "border-pink-500/20 hover:border-pink-500/30"
                          : "border-black/10 hover:border-pink-300/80";
                      const iconBgClass = isMale
                        ? theme.group === "Dark"
                          ? "bg-blue-500/10"
                          : "bg-sky-100"
                        : theme.group === "Dark"
                          ? "bg-pink-500/10"
                          : "bg-pink-100";
                      const iconBorderClass = isMale
                        ? theme.group === "Dark"
                          ? "border-blue-500/20"
                          : "border-sky-200"
                        : theme.group === "Dark"
                          ? "border-pink-500/20"
                          : "border-pink-200";
                      const textClass = isMale
                        ? "text-sky-600 font-bold"
                        : "text-pink-600 font-bold";
                      const opacityClass =
                        isUnknownLoc || isStrikethrough
                          ? "opacity-60 hover:opacity-100"
                          : "opacity-100";
                      return (
                        <div
                          key={`npc-${npc.id || index}`}
                          onClick={() => {
                            setSelectedNPCIndex(index);
                            if (isMobile) setLeftOpen(false);
                          }}
                          className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${bgClass} ${borderClass} ${opacityClass}`}
                        >
                          {!autoUpdateNpc && hasPendingUpdatesForChar(npc, gameData?.npcTemplateMode || "default", gameData?.customNpcFields || []) && (
                              <div
                                className="absolute -top-1 -right-1 flex h-4 w-4 z-10"
                                title="Có cập nhật NPC cần xác nhận"
                              >
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white dark:border-slate-900"></span>
                              </div>
                            )}
                          <div className="flex items-start gap-3">
                            {npc.avatar ? (
                              <div
                                className={`w-16 shrink-0 overflow-hidden rounded-md border aspect-[2/3] ${iconBorderClass}`}
                              >
                                <LazyImage
                                  src={npc.avatar}
                                  alt="Avatar"
                                  className="w-full h-full"
                                />
                              </div>
                            ) : (
                              <div
                                className={`w-16 shrink-0 flex items-center justify-center rounded-md border aspect-[2/3] relative overflow-hidden ${iconBgClass} ${iconBorderClass}`}
                              >
                                <User size={32} className={textClass} />
                              </div>
                            )}
                            <div className="flex flex-col gap-1 items-start flex-1 min-w-0">
                              <h4
                                className={
                                  "font-bold leading-tight break-words whitespace-pre-wrap flex items-center gap-1.5 " +
                                  theme.textPrimary
                                }
                              >
                                <span>
                                  {npc.fullName || npc.name || "Chưa đặt tên"}
                                  {npc.titles && showTitles && (
                                    <span className="text-xs font-normal opacity-75 italic block sm:inline sm:ml-1.5">
                                      ("{npc.titles}")
                                    </span>
                                  )}
                                </span>
                              </h4>
                              <div
                                className={`flex items-start gap-1 text-[10px] border px-2 py-1.5 rounded-md w-full mt-0.5 ${theme.group === "Dark" ? "text-white/70 bg-white/5 border-transparent" : "text-[#334155] bg-white/80 border-black/10"}`}
                                title="Vị trí & Hoạt động"
                              >
                                <MapPin
                                  size={12}
                                  className={`text-green-500 shrink-0 mt-0.5 ${isStrikethrough ? "opacity-50" : ""}`}
                                />
                                <span
                                  className={`whitespace-pre-wrap break-words leading-tight ${isStrikethrough ? "line-through opacity-70" : ""}`}
                                >
                                  {locStr}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                {(!gameData.npcs || gameData.npcs.length === 0) && (
                  <div className="text-center p-8 opacity-50 text-sm">
                    Chưa có NPC nào
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center - Gameplay Content */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${theme.group === "Dark" ? "bg-transparent" : "bg-[#FAF6F0]"}`}
        >
          <div
            className="flex-1 overflow-y-auto py-4 md:py-8 px-4 md:px-0 space-y-8 custom-scrollbar"
            ref={scrollRef}
          >
            {currentTurnsArr.map((turn: any, turnArrIdx: number) => (
              <div
                key={`turn-${turn.id}-${turnArrIdx}`}
                id={`turn-${turn.id}`}
                className="w-full relative mb-12 flex flex-col gap-6"
              >
                {turn.userMsg && (
                  // USER MESSAGE (Full width)
                  <div
                    className={`w-full rounded-2xl border p-5 md:p-6 shadow-md backdrop-blur-md relative overflow-hidden ${theme.group === "Dark" ? "bg-blue-900/10 border-blue-500/20 text-blue-50" : "bg-black/5 border-black/10 text-[#0f172a]"}`}
                  >
                    <div
                      className={`absolute top-0 left-0 w-1 h-full ${theme.group === "Dark" ? "bg-blue-500/50" : "bg-slate-800/60"}`}
                    />
                    <div className="flex items-center gap-2 mb-3">
                      <User
                        size={16}
                        className={
                          theme.group === "Dark"
                            ? "text-blue-400"
                            : "text-slate-700"
                        }
                      />
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${theme.group === "Dark" ? "text-blue-400/80" : "text-slate-700/80"}`}
                      >
                        Người chơi hành động:
                      </span>
                    </div>
                    <div
                      className={`whitespace-pre-wrap leading-relaxed text-base md:text-lg font-medium opacity-95 ${theme.group === "Dark" ? "text-blue-5" : "text-[#0f172a]"}`}
                    >
                      {turn.userMsg.content}
                    </div>
                  </div>
                )}

                {turn.aiMsg && (
                  // AI/SYSTEM MESSAGE (Full width)
                  <div
                    className={`w-full rounded-2xl border shadow-xl backdrop-blur-md overflow-hidden flex flex-col ${theme.group === "Dark" ? "bg-black/60 border-transparent text-white/90" : "bg-white/60 border-black/10 text-[#0f172a]"}`}
                  >
                    {/* Header AI Message */}
                    <div className="flex items-center gap-2 p-3 theme-panel shadow-none border-b border-transparent">
                      <Sparkles
                        size={16}
                        className={
                          turn.aiMsg.isStreaming
                            ? "text-purple-400 animate-pulse"
                            : "text-purple-500"
                        }
                      />
                      <span
                        className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.group === "Dark" ? "text-purple-400/80" : "text-[#334155]/80"}`}
                      >
                        <span>
                          {turn.aiMsg.isStreaming
                            ? "Matrix Lite v6 đang kiến tạo..."
                            : "Lượt " + String(turn.index).padStart(4, "0")}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-[10px] font-mono whitespace-nowrap">
                          {(turn.aiMsg.mainText || "").trim().split(/\s+/).filter((w: string) => w.length > 0).length} chữ
                        </span>
                      </span>
                      <div className="flex-1" />
                      {!turn.aiMsg.isStreaming && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              if (editingTurnId === turn.aiMsg.id) {
                                setMessages((prev) =>
                                  prev.map((m) =>
                                    m.id === turn.aiMsg.id
                                      ? {
                                          ...m,
                                          mainText: editingContentRef.current,
                                          content: editingContentRef.current,
                                        }
                                      : m,
                                  ),
                                );
                                setEditingTurnId(null);
                              } else {
                                setEditingTurnId(turn.aiMsg.id);
                                editingContentRef.current = turn.aiMsg.mainText || turn.aiMsg.content || "";
                              }
                            }}
                            className="px-3 py-1.5 flex items-center gap-1.5 rounded-lg theme-panel shadow-none border-transparent theme-panel-hover text-slate-500 dark-theme:text-white/60 hover:theme-text-base transition-all text-[10px] font-bold tracking-wider"
                            title={
                              editingTurnId === turn.aiMsg.id
                                ? "Lưu"
                                : "Chỉnh sửa lượt (Edit Draw)"
                            }
                          >
                            {editingTurnId === turn.aiMsg.id ? (
                              <>
                                <Save size={12} /> LƯU DIỄN BIẾN
                              </>
                            ) : (
                              <>
                                <Edit3 size={12} /> EDIT DRAW
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              // Xóa ngay lập tức không cần xác nhận rườm rà nhưng có thông báo ngắn gọn.
                              // Nếu turn có userMsg tương ứng (hành động trước đó), ta xóa cả userMsg và aiMsg
                              // để tránh rỗng dở dang gây kẹt trò chơi. Nếu không có userMsg (lượt 0000), ta chỉ xóa aiMsg.
                              const idsToDelete = [turn.aiMsg.id];
                              if (turn.userMsg?.id) {
                                idsToDelete.push(turn.userMsg.id);
                              }
                              setMessages((prev) =>
                                prev.filter((m) => !idsToDelete.includes(m.id)),
                              );

                              // Xóa tàn dư RAG của lượt này
                              ragService
                                .deleteMemoriesByTurnId(
                                  gameData.id,
                                  turn.aiMsg.id,
                                )
                                .catch(console.error);

                              toast.success(
                                "Đã xóa phản hồi và quay lại lượt trước thành công!",
                              );
                            }}
                            className="px-3 py-1.5 flex items-center gap-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all text-[10px] font-bold tracking-wider border border-red-500/10 hover:border-red-500/20 cursor-pointer"
                            title="Xóa phản hồi này ngay lập tức"
                          >
                            <Trash2 size={12} /> XÓA
                          </button>
                        </div>
                      )}
                      {turn.aiMsg.isStreaming && (
                        <Loader2
                          size={12}
                          className="ml-auto flex animate-spin text-purple-400"
                        />
                      )}
                    </div>

                    <div className="p-5 md:p-6 space-y-6">
                      {turn.aiMsg.isStreaming ? (
                        <div className={`text-sm italic animate-pulse ${theme.group === "Dark" ? "text-white/50" : "text-slate-500"}`}>
                          Đang thu thập dữ liệu luân hồi... (Xem chi tiết ở cột
                          bên phải)
                        </div>
                      ) : (
                        <>
                          {/* Outline */}
                          {turn.aiMsg.outline && (
                            <div className="hidden">
                              <span className="absolute -top-2.5 left-4 px-2 bg-black uppercase tracking-widest text-[10px] font-black text-emerald-400">
                                Dàn ý & Tóm tắt
                              </span>
                              {turn.aiMsg.outline}
                            </div>
                          )}

                          {/* Main Text */}
                          {editingTurnId === turn.aiMsg.id ? (
                            <textarea
                              defaultValue={turn.aiMsg.mainText || turn.aiMsg.content || ""}
                              onChange={(e) => {
                                editingContentRef.current = e.target.value;
                              }}
                              className={`w-full h-80 rounded-xl border p-4 text-base md:text-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 resize-y custom-scrollbar leading-loose transition-colors ${theme.group === "Dark" ? "bg-black/40 border-white/10 text-white/90" : "bg-[#FDFBF7] border-black/10 text-[#2C1D11]"}`}
                            />
                          ) : (
                            (turn.aiMsg.mainText || turn.aiMsg.content) && (
                              <div
                                className={`markdown-body whitespace-pre-wrap leading-loose text-base md:text-lg opacity-95 font-medium ${theme.group === "Dark" ? "" : "text-[#2C1D11]"}`}
                              >
                                <Markdown
                                  
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    del: ({ node, ...props }) => <span className="not-italic" {...props} />,
                                    s: ({ node, ...props }) => <span className="not-italic" {...props} />,
                                  }}
                                >
                                  {autoColorizeQuotes(
                                    (
                                      turn.aiMsg.mainText ||
                                      turn.aiMsg.content ||
                                      ""
                                    )
                                      .replace(/<br\s*\/?>/gi, "\n")
                                      .replace(/\\"/g, '"'),
                                    useColorEnabled,
                                    colorConfig,
                                    theme.group === "Dark",
                                    gameData?.mcData?.name
                                  )}
                                </Markdown>
                              </div>
                            )
                          )}

                          {/* Suggested Actions */}
                          {turn.aiMsg.suggestedActions &&
                            turn.aiMsg.suggestedActions.length > 0 && (
                              <div
                                className={`pt-4 mt-6 border-t ${theme.group === "Dark" ? "border-white/10" : "border-black/10"}`}
                              >
                                {(() => {
                                  const msgId = turn.aiMsg.id;
                                  const isLatestTurn =
                                    turn.index === turns.length - 1;
                                  const isCollapsed =
                                    collapsedSuggestions[msgId] !== undefined
                                      ? collapsedSuggestions[msgId]
                                      : !isLatestTurn;

                                  return (
                                    <>
                                      <div className="flex items-center justify-between mb-4">
                                        <h4
                                          className={`text-sm font-bold uppercase tracking-widest opacity-80 ${theme.group === "Dark" ? "text-blue-400" : "text-slate-700"}`}
                                        >
                                          Gợi ý hành động:
                                        </h4>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() =>
                                              setIsHardModeEnabled(!isHardModeEnabled)
                                            }
                                            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-colors ${
                                              isHardModeEnabled
                                                ? theme.group === "Dark"
                                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                                  : "bg-red-100 text-red-600 border-red-200"
                                                : theme.group === "Dark"
                                                  ? "bg-white/5 text-white/50 border-white/10 hover:text-white"
                                                  : "bg-black/5 text-black/50 border-black/10 hover:text-black"
                                            }`}
                                            title={
                                              isHardModeEnabled
                                                ? "Chế độ Hard: Đang BẬT"
                                                : "Chế độ Hard: Đang TẮT"
                                            }
                                          >
                                            <span className="text-[10px] font-bold tracking-wider">HARD</span>
                                          </button>
                                          <button
                                            onClick={() =>
                                              setIsSuggestionsLocked(
                                                !isSuggestionsLocked,
                                              )
                                            }
                                            className={`p-1.5 rounded-lg border transition-colors ${
                                              isSuggestionsLocked
                                                ? theme.group === "Dark"
                                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                                  : "bg-red-100 text-red-600 border-red-200"
                                                : theme.group === "Dark"
                                                  ? "bg-white/5 text-white/50 border-white/10 hover:text-white"
                                                  : "bg-black/5 text-black/50 border-black/10 hover:text-black"
                                            }`}
                                            title={
                                              isSuggestionsLocked
                                                ? "Đã khóa (Chỉ copy vào khung nhập)"
                                                : "Chưa khóa (Nhấn là thực hiện ngay)"
                                            }
                                          >
                                            {isSuggestionsLocked ? (
                                              <Lock size={14} />
                                            ) : (
                                              <Unlock size={14} />
                                            )}
                                          </button>
                                          <button
                                            onClick={() =>
                                              setCollapsedSuggestions(
                                                (prev) => ({
                                                  ...prev,
                                                  [msgId]: !isCollapsed,
                                                }),
                                              )
                                            }
                                            className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 rounded-lg border transition-colors ${theme.group === "Dark" ? "border-white/10 text-white/50 hover:bg-white/5 hover:text-white" : "border-black/10 text-black/50 hover:bg-black/5 hover:text-black"}`}
                                          >
                                            {isCollapsed ? (
                                              <>
                                                <ChevronDown size={14} /> Mở
                                                rộng
                                              </>
                                            ) : (
                                              <>
                                                <ChevronUp size={14} /> Thu gọn
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {!isCollapsed && (
                                        <div className="grid grid-cols-1 gap-0 -mx-5 md:-mx-6 border-t border-transparent">
                                          {turn.aiMsg.suggestedActions.map(
                                            (actionItem: any, idx: number) => {
                                              if (!actionItem) return null;
                                              let actionTitle =
                                                typeof actionItem === "string"
                                                  ? actionItem
                                                  : actionItem.action ||
                                                    actionItem.text ||
                                                    actionItem.title ||
                                                    actionItem.name ||
                                                    actionItem.option;

                                              if (
                                                typeof actionTitle === "string"
                                              ) {
                                                actionTitle = actionTitle
                                                  .replace(
                                                    /^Dàn ý nhánh \d+:\s*(?:\[)?/,
                                                    "",
                                                  )
                                                  .replace(/(?:\])?$/, "");
                                              }

                                              const details =
                                                typeof actionItem === "object"
                                                  ? actionItem.details ||
                                                    actionItem.description
                                                  : null;
                                              const timeCost =
                                                typeof actionItem === "object"
                                                  ? actionItem.timeCost
                                                  : null;
                                              const successRate =
                                                typeof actionItem === "object"
                                                  ? actionItem.successRate
                                                  : null;
                                              const gainsLosses =
                                                typeof actionItem === "object"
                                                  ? actionItem.gainsLosses
                                                  : null;

                                              let actionText =
                                                actionTitle ||
                                                "Gợi ý hành động (Trống)";

                                              // Object fallback if actionTitle was not resolved properly but there is an object
                                              if (
                                                actionText ===
                                                  "Gợi ý hành động (Trống)" &&
                                                typeof actionItem === "object"
                                              ) {
                                                const values = Object.values(
                                                  actionItem,
                                                ).filter(
                                                  (v) =>
                                                    typeof v === "string" &&
                                                    v.length > 0,
                                                );
                                                if (values.length > 0) {
                                                  actionText =
                                                    values[0] as string;
                                                }
                                              }
                                              
                                              if (details) {
                                                actionText += `\n${details}`;
                                              }
                                              
                                              let extraInfo = [];
                                              if (timeCost) extraInfo.push(`Thời gian dự kiến: ${timeCost}`);
                                              if (successRate) extraInfo.push(`Tỉ lệ thành công: ${successRate}`);
                                              if (gainsLosses) extraInfo.push(`Được/Mất: ${gainsLosses}`);
                                              
                                              if (extraInfo.length > 0) {
                                                actionText += `\n[${extraInfo.join(" | ")}]`;
                                              }

                                              return (
                                                <div
                                                  key={`suggested-action-${turn.id}-${idx}`}
                                                  className="relative group flex items-start"
                                                >
                                                  <button
                                                    onClick={() => {
                                                      if (!isGenerating) {
                                                        const userMsgId = nanoid() + "_u";
                                                        if (
                                                          isSuggestionsLocked
                                                        ) {
                                                          actionInputRef.current?.setText(
                                                            actionText,
                                                          );
                                                        } else {
                                                          actionInputRef.current?.clear();
                                                          setMessages(
                                                            (prev) => [
                                                              ...prev,
                                                              {
                                                                id: userMsgId,
                                                                sender: "user",
                                                                content:
                                                                  actionText,
                                                              },
                                                            ],
                                                          );
                                                          generateTurn(
                                                            actionText,
                                                          );
                                                        }
                                                      }
                                                    }}
                                                    disabled={isGenerating}
                                                    className={`w-full text-left px-5 md:px-6 py-4 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex flex-col relative overflow-hidden bg-transparent border-b ${
                                                      theme.group === "Dark"
                                                        ? "border-white/5 hover:bg-black/20"
                                                        : "border-black/10 hover:${theme.bgClass}0/5"
                                                    }`}
                                                  >
                                                    <div className="flex flex-col items-start w-full md:pr-10">
                                                      <div className="flex items-start">
                                                        <span
                                                          className={`font-bold leading-tight text-base ${theme.group === "Dark" ? "text-white/95" : "text-[#0f172a]"}`}
                                                        >
                                                          {actionTitle}
                                                        </span>
                                                      </div>
                                                      {details && (
                                                        <div
                                                          className={`text-sm mt-1.5 leading-relaxed ${theme.group === "Dark" ? "text-slate-500 dark-theme:text-white/60" : "text-[#334155]/85"}`}
                                                        >
                                                          {details}
                                                        </div>
                                                      )}
                                                      {(timeCost || successRate || gainsLosses) && (
                                                        <div className="mt-2 text-left flex flex-wrap gap-2">
                                                          {timeCost && (
                                                            <span
                                                              className={`text-[11px] font-mono border px-2 py-1 rounded inline-flex items-center gap-1.5 ${
                                                                theme.group === "Dark"
                                                                  ? "text-white/40 border-transparent bg-black/20"
                                                                  : "text-[#334155] border-black/10 bg-black/5"
                                                              }`}
                                                            >
                                                              <Clock className="w-3 h-3 opacity-70" />
                                                              Tiêu tốn {timeCost}
                                                            </span>
                                                          )}
                                                          {successRate && (
                                                            <span
                                                              className={`text-[11px] font-mono border px-2 py-1 rounded inline-flex items-center gap-1.5 ${
                                                                theme.group === "Dark"
                                                                  ? "text-blue-400/80 border-transparent bg-blue-500/10"
                                                                  : "text-blue-600 border-blue-200 bg-blue-50"
                                                              }`}
                                                            >
                                                              Tỉ lệ: {successRate}
                                                            </span>
                                                          )}
                                                          {gainsLosses && (
                                                            <span
                                                              className={`text-[11px] font-mono border px-2 py-1 rounded inline-flex items-center gap-1.5 ${
                                                                theme.group === "Dark"
                                                                  ? "text-green-400/80 border-transparent bg-green-500/10"
                                                                  : "text-green-600 border-green-200 bg-green-50"
                                                              }`}
                                                            >
                                                              Được/Mất: {gainsLosses}
                                                            </span>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      copyToClipboard(
                                                        actionText,
                                                      );
                                                    }}
                                                    className={`absolute top-4 right-5 md:right-6 p-2 rounded-lg transition-all border ${
                                                      theme.group === "Dark"
                                                        ? "bg-white/10 border-transparent hover:bg-white/20 text-white/70"
                                                        : "bg-black/5 border-black/10 hover:bg-black/5 text-[#334155]"
                                                    }`}
                                                    title="Copy hành động"
                                                  >
                                                    <Copy size={14} />
                                                  </button>
                                                </div>
                                              );
                                            },
                                          )}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {currentTurnsArr.length === 0 && (
              <div className="flex items-center justify-center h-full opacity-50">
                <p>Đang chờ luồng luân hồi...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer
            className={`shrink-0 border-t z-20 flex flex-col gap-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg ${
              theme.group === "Dark"
                ? "theme-panel !border-none backdrop-blur-2xl"
                : "border-black/10 bg-[#EFE9DD]/90 backdrop-blur-xl"
            }`}
          >
            <ActionInput
              ref={actionInputRef}
              isGenerating={isGenerating}
              theme={theme}
              onSend={handleSend}
            />
            <div className="w-full max-w-5xl mx-auto flex items-center justify-between mt-3">
              {/* Pagination */}
              <div
                className={`flex items-center gap-1.5 md:gap-3 theme-panel shadow-none rounded-lg p-1 border ${theme.group === "Dark" ? "border-white/5" : "border-black/10 bg-[#FAF6F0]"}`}
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`p-1.5 md:p-2 rounded transition-all disabled:opacity-30 cursor-pointer ${theme.group === "Dark" ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20" : "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-sm"}`}
                  title="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>
                {isEditingPage ? (
                  <div className="flex items-center gap-1 px-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={pageInput}
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handlePageSubmit();
                        if (e.key === "Escape") {
                          setPageInput(String(currentPage));
                          setIsEditingPage(false);
                        }
                      }}
                      onBlur={handlePageSubmit}
                      className={`w-12 text-center text-xs md:text-sm font-black rounded border px-1 py-0.5 outline-none transition-all ${
                        theme.group === "Dark"
                          ? "bg-black/80 border-blue-500/60 text-blue-400 focus:ring-1 focus:ring-blue-400"
                          : "bg-white border-blue-500 text-blue-600 focus:ring-1 focus:ring-blue-500 shadow-sm"
                      }`}
                    />
                    <span
                      className={`text-xs md:text-sm font-normal ${
                        theme.group === "Dark" ? "text-white/30" : "text-[#334155]/60"
                      }`}
                    >
                      / {totalPages}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingPage(true)}
                    className={`text-xs md:text-sm font-black text-center cursor-pointer px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1 ${
                      theme.group === "Dark" ? "text-blue-400" : "text-blue-600"
                    }`}
                    title="Nhấp vào đây để nhập số trang nhảy nhanh"
                  >
                    <span className="underline decoration-dotted underline-offset-2">
                      {currentPage}
                    </span>{" "}
                    <span
                      className={`${
                        theme.group === "Dark" ? "text-white/30" : "text-[#334155]/60"
                      } font-normal`}
                    >
                      / {totalPages}
                    </span>
                  </button>
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={`p-1.5 md:p-2 rounded transition-all disabled:opacity-30 cursor-pointer ${theme.group === "Dark" ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20" : "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-sm"}`}
                  title="Trang sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Action Suggestions Config Toggle */}
              <button
                onClick={() => setIsActionSuggestionsModalOpen(true)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer border ${
                  theme.group === "Dark"
                    ? "bg-blue-500/10 text-slate-400 border-blue-500/20 hover:text-blue-300"
                    : "bg-blue-50/50 text-slate-500 border-blue-200/50 hover:text-slate-700"
                }`}
                title="Cài đặt yêu cầu Gợi ý hành động từ AI"
              >
                SET
              </button>

              {/* Scroll Controls & Toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollToTop("auto")}
                  className={`p-2 md:p-2.5 rounded-lg transition-colors cursor-pointer border ${theme.group === "Dark" ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20 shadow-none" : "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-sm"}`}
                  title="Lên đầu"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => scrollToBottom("auto")}
                  className={`p-2 md:p-2.5 rounded-lg transition-colors cursor-pointer border ${theme.group === "Dark" ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20 shadow-none" : "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 shadow-sm"}`}
                  title="Xuống cuối"
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>
          </footer>
        </div>

        {/* Right Sidebar - Streaming & Stats */}
        <AnimatePresence>
          {rightOpen && (
            <motion.div
              key="gameplay-right-sidebar"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`absolute md:relative right-0 top-0 bottom-0 w-72 md:w-96 border-l z-30 flex flex-col shadow-2xl overflow-y-auto custom-scrollbar ${theme.group === "Dark" ? "theme-panel !border-y-0 !border-r-0 backdrop-blur-2xl text-white" : "border-black/10 bg-[#F4EFE6]/95 backdrop-blur-md shadow-xl text-[#0f172a]"}`}
            >
              {/* Phần 1: Các nút thao tác trên mobile */}
              <div
                className={`md:hidden p-4 border-b shrink-0 ${theme.group === "Dark" ? "theme-panel !border-l-0 !border-r-0 !border-t-0 shadow-none" : "border-black/10 bg-[#EFE9DD]/90 backdrop-blur-xl"}`}
              >
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      if (playerRulesRef.current !== playerRules) {
                        setPlayerRules(playerRulesRef.current);
                      }
                      setTimeout(async () => {
                        await saveCurrentGame();
                        toast.success("Đã lưu tiến trình!");
                      }, 50);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider ${getHeaderBtnClass("green")}`}
                  >
                    <Save size={16} /> <span>LƯU</span>
                  </button>
                  <button
                    onClick={async () => {
                      const success = await resumeLatestGame();
                      if (success) {
                        toast.success("Đã tải nhanh tệp lưu mới nhất!");
                      } else {
                        toast.error("Không tìm thấy tệp lưu nào để tải!");
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider ${getHeaderBtnClass("orange")}`}
                    title="Tải tiến trình mới nhất"
                  >
                    <RotateCcw size={16} /> <span>LOAD</span>
                  </button>
                  <button
                    onClick={handleDownloadSave}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider ${getHeaderBtnClass("blue")}`}
                  >
                    <Download size={16} /> <span>SAVE</span>
                  </button>
                  <button
                    onClick={() => setShowMC(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider relative ${getHeaderBtnClass("emerald")}`}
                  >
                    <User size={16} /> <span>MC</span>
                    {hasMcUpdate && (
                      <span className="absolute top-1 right-2 flex h-2.5 w-2.5 z-10">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-white dark:border-slate-900"></span>
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowParty(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider ${getHeaderBtnClass("purple")}`}
                  >
                    <Users size={16} /> <span>PARTY</span>
                  </button>
                  <button
                    onClick={() => setShowRules(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider ${getHeaderBtnClass("indigo")}`}
                  >
                    <ListTodo size={16} /> <span>RULES</span>
                  </button>
                  <button
                    onClick={() => setShowStatus(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider ${getHeaderBtnClass("teal")}`}
                  >
                    <Activity size={16} /> <span>STATUS</span>
                  </button>
                  <button
                    onClick={() => setShowGallery(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider ${getHeaderBtnClass("pink")}`}
                  >
                    <ImageIcon size={16} /> <span>ẢNH</span>
                  </button>
                  <button
                    onClick={() => setShowCodex(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider relative ${getHeaderBtnClass("cyan")}`}
                  >
                    <Book size={16} /> <span>CODEX</span>
                    {!autoUpdateCodex && gameData?.codexPendingUpdates && (
                      (gameData.codexPendingUpdates.worldData && Object.keys(gameData.codexPendingUpdates.worldData).length > 0) ||
                      (gameData.codexPendingUpdates.worldDetails && Object.keys(gameData.codexPendingUpdates.worldDetails).length > 0) ||
                      gameData.codexPendingUpdates.creativeRules
                    ) && (
                      <span className="absolute top-1 right-2 flex h-2.5 w-2.5 z-10">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-white dark:border-slate-900"></span>
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowMemory(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider ${getHeaderBtnClass("purple")}`}
                  >
                    <BrainCircuit size={16} /> <span>MEMORY</span>
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider ${getHeaderBtnClass("gray")}`}
                  >
                    <SettingsIcon size={16} /> <span>CẤU HÌNH</span>
                  </button>

                  <button
                    onClick={() => setIsColorModalOpen(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider border text-white ${useColorEnabled ? "bg-green-600 border-white hover:bg-green-500" : "bg-black border-white hover:bg-zinc-900"}`}
                  >
                    <Palette size={16} /> <span>MÀU SẮC</span>
                  </button>
                  <button
                    onClick={() => setIsPhoneModalOpen(true)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider border text-white bg-indigo-600 border-white hover:bg-indigo-500`}
                  >
                    <Smartphone size={16} /> <span>PHONE</span>
                    {unreadMessages > 0 && phoneAppControl.messenger !== false && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black border border-white">
                        {unreadMessages}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setIsDramaModalOpen(true)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider border text-white ${isDramatic ? "bg-red-600 border-white hover:bg-red-500" : "bg-black border-white hover:bg-zinc-900"}`}
                    title="Cài đặt chế độ Kịch Tính"
                  >
                    <Flame
                      size={16}
                      className={isDramatic ? "animate-pulse" : ""}
                    />{" "}
                    <span>KỊCH TÍNH</span>
                  </button>
                  <button
                    onClick={() => setIsStrictEndEnabled(!isStrictEndEnabled)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors cursor-pointer text-[10px] font-bold tracking-wider border text-white ${isStrictEndEnabled ? "bg-red-600 border-white hover:bg-red-500" : "bg-black border-white hover:bg-zinc-900"}`}
                    title="Bật/Tắt chế độ END"
                  >
                    <AlertTriangle
                      size={16}
                      className={isStrictEndEnabled ? "animate-pulse" : ""}
                    />{" "}
                    <span>END</span>
                  </button>
                </div>
              </div>

              {/* Tên Thế Giới */}
              <div
                className={`p-4 border-b shrink-0 flex flex-col gap-3 ${theme.group === "Dark" ? "theme-panel !border-l-0 !border-r-0 !border-t-0" : "border-black/10 bg-white/60"}`}
              >
                <div>
                  <div
                    className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme.group === "Dark" ? "text-white/50" : "text-[#334155]/80"}`}
                  >
                    THẾ GIỚI HIỆN TẠI
                  </div>
                  <div className="text-sm font-bold theme-text-base drop-shadow-sm">
                    {gameData.worldData?.name || "Thế giới vô danh"}
                  </div>
                </div>
                <div
                  className={`flex flex-col gap-2 pt-3 border-t ${theme.group === "Dark" ? "border-white/10" : "border-black/10"}`}
                >
                  <div className="flex gap-2">
                    <Clock
                      size={14}
                      className={
                        theme.group === "Dark"
                          ? "text-blue-500 shrink-0 mt-0.5"
                          : "text-slate-700 shrink-0 mt-0.5"
                      }
                    />
                    <span
                      className={`text-[11px] font-mono whitespace-pre-wrap break-words leading-tight ${theme.group === "Dark" ? "text-white/70" : "text-[#0f172a]"}`}
                    >
                      {currentWorldTime}
                    </span>
                  </div>
                  {currentWeather && (
                    <div className="flex gap-2">
                      <CloudSun
                        size={14}
                        className={
                          theme.group === "Dark"
                            ? "text-amber-500 shrink-0 mt-0.5"
                            : "text-orange-600 shrink-0 mt-0.5"
                        }
                      />
                      <span
                        className={`text-[11px] font-mono whitespace-pre-wrap break-words leading-tight ${theme.group === "Dark" ? "text-white/70" : "text-[#0f172a]"}`}
                      >
                        {currentWeather}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <MapPin
                      size={14}
                      className={
                        theme.group === "Dark"
                          ? "text-green-500 shrink-0 mt-0.5"
                          : "text-emerald-700 shrink-0 mt-0.5"
                      }
                    />
                    <span
                      className={`text-[11px] font-mono whitespace-pre-wrap break-words leading-tight ${theme.group === "Dark" ? "text-white/70" : "text-[#0f172a]"}`}
                    >
                      {currentLoc}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phần 2: Màn Hình Stats */}
              <div
                className={`p-4 border-b shrink-0 relative ${theme.group === "Dark" ? "theme-panel !border-l-0 !border-r-0 !border-t-0" : "border-black/10 bg-[#F4EFE6]/50"}`}
              >
                {isGenerating && (
                  <Loader2
                    size={16}
                    className="absolute top-4 right-4 animate-spin text-purple-400"
                  />
                )}
                <div className="flex items-center justify-between mb-3">
                  <h4
                    className={`text-[10px] font-black uppercase tracking-widest ${theme.group === "Dark" ? "text-blue-500" : "text-sky-700"}`}
                  >
                    Màn Hình Stats
                  </h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-black/20 rounded-md text-emerald-400 border border-emerald-400/30">
                    {currentFPS} FPS
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="theme-panel shadow-none border-transparent p-2 rounded-lg">
                    <div
                      className={`text-[10px] mb-1 ${theme.group === "Dark" ? "text-white/50" : "text-[#334155]/80 font-bold"}`}
                    >
                      THỜI GIAN NGAY LÚC NÀY
                    </div>
                    <div className="text-sm font-mono theme-text-base">
                      <LocalTimer
                        isGenerating={isGenerating}
                        processingTime={currentStats.processingTime}
                      />
                    </div>
                  </div>
                  <div className="theme-panel shadow-none border-transparent p-2 rounded-lg">
                    <div
                      className={`text-[10px] mb-1 ${theme.group === "Dark" ? "text-white/50" : "text-[#334155]/80 font-bold"}`}
                    >
                      SỐ CHỮ (VĂN BẢN)
                    </div>
                    <div className="text-sm font-mono theme-text-base">
                      {currentStats.wordCount} chữ
                    </div>
                  </div>
                  <div className="theme-panel shadow-none border-transparent p-2 rounded-lg col-span-2">
                    <div
                      className={`text-[10px] mb-1 ${theme.group === "Dark" ? "text-white/50" : "text-[#334155]/80 font-bold"}`}
                    >
                      TOKENS (IN / OUT / TỔNG)
                    </div>
                    <div className="text-sm font-mono theme-text-base flex gap-1">
                      <span>{currentStats.tokensIn}</span> /{" "}
                      <span>{currentStats.tokensOut}</span> /{" "}
                      <span
                        className={
                          theme.group === "Dark"
                            ? "text-purple-400 font-bold"
                            : "text-purple-700 font-extrabold"
                        }
                      >
                        {currentStats.tokensTotal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phần 3: Deep Reasoning */}
              <div
                className={`p-3 border-b flex justify-between items-center shrink-0 ${theme.group === "Dark" ? "theme-panel !border-l-0 !border-r-0 !border-t-0" : "border-black/10 bg-white/60"}`}
              >
                <h4
                  className={`text-[10px] font-black uppercase tracking-widest ${theme.group === "Dark" ? "text-purple-400" : "text-purple-700"}`}
                >
                  Hội Đồng AI Suy Luận
                </h4>
                <button
                  onClick={() => setExpandedLog("reasoning")}
                  className={`p-1 rounded transition-colors ${theme.group === "Dark" ? "text-white/50 hover:text-white hover:bg-white/10" : "text-[#334155] hover:text-[#0f172a] hover:bg-black/5"}`}
                >
                  <Maximize2 size={12} />
                </button>
              </div>
              <StreamLogViewer theme={theme} isExpanded={false} />

              {/* Phần 4: Error & Diagnostic */}
              <div
                className={`p-3 border-b flex justify-between items-center shrink-0 ${theme.group === "Dark" ? "theme-panel !border-l-0 !border-r-0 !border-t-0" : "border-black/10 bg-white/60"}`}
              >
                <div className="flex items-center gap-2">
                  <h4
                    className={`text-[10px] font-black uppercase tracking-widest ${theme.group === "Dark" ? "text-red-400" : "text-red-700"}`}
                  >
                    Nhật Ký Hệ Thống (SYS LOGS)
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSystemLogs([]);
                    }}
                    className={`p-1 rounded transition-colors ${theme.group === "Dark" ? "text-white/50 hover:text-white hover:bg-white/10" : "text-[#334155] hover:text-[#0f172a] hover:bg-black/5"}`}
                    title="Xóa nhật ký"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    onClick={() => setExpandedLog("error")}
                    className={`p-1 rounded transition-colors ${theme.group === "Dark" ? "text-white/50 hover:text-white hover:bg-white/10" : "text-[#334155] hover:text-[#0f172a] hover:bg-black/5"}`}
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>
              </div>
              <SysLogViewer theme={theme} isExpanded={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals placeholders */}
      <AnimatePresence>
        {showMC && (
          <CharacterModal key="gameplay-character-modal-mc" type="mc" onClose={() => setShowMC(false)} />
        )}

        {selectedNPCIndex !== null && (
          <CharacterModal
            key={`gameplay-character-modal-npc-${selectedNPCIndex}`}
            type="npc"
            npcIndex={selectedNPCIndex}
            onClose={() => setSelectedNPCIndex(null)}
          />
        )}

        <PartyModal 
          isOpen={showParty} 
          onClose={() => setShowParty(false)} 
          gameData={gameData} 
          setGameData={setGameData} 
          theme={theme} 
        />

        {showStatus && <StatusModal key="gameplay-status-modal" onClose={() => setShowStatus(false)} />}

        {showNPCBuilder && (
          <NPCBuilderModal key="gameplay-npc-builder-modal" onClose={() => setShowNPCBuilder(false)} />
        )}

        {showRules && (
          <motion.div
            key="gameplay-rules-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col w-full h-full max-w-full max-h-full p-0 m-0 overflow-hidden"
            onClick={closeRulesModal}
          >
            <div
              className={`w-full h-full flex flex-col rounded-none border-0 shadow-none overflow-hidden ${theme.group === "Dark" ? "theme-panel !border-none text-white" : theme.bgClass}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`p-4 border-b flex items-center justify-between shrink-0 ${theme.group === "Dark" ? "border-white/10 bg-black/10" : `border-black/10 ${theme.sidebarClass}`}`}
              >
                <h2 className="text-xl font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                  <ListTodo size={20} /> PLAYER RULES
                </h2>
                <button
                  onClick={closeRulesModal}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${theme.group === "Dark" ? "text-white/50 hover:text-white" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"}`}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-slate-700 dark-theme:text-white/80 flex flex-col">
                <p
                  className={`text-sm ${theme.group === "Dark" ? "text-white/50" : "text-slate-600 font-medium"}`}
                >
                  Thêm các quy tắc bối cảnh, hành vi hoặc phong cách kể chuyện
                  mà AI phải tuân thủ trong suốt quá trình chơi.
                </p>
                <textarea
                  className="w-full flex-1 min-h-[300px] theme-input border rounded-xl p-4 focus:outline-none focus:border-indigo-500/50 resize-none font-mono text-sm leading-relaxed"
                  placeholder={`Mô tả các quy tắc theo dạng gạch đầu dòng:\n- Không được sử dụng phép thuật trong 5 lượt tới.\n- AI phải viết dài hơn bình thường.\n- ...`}
                  value={localPlayerRules}
                  onChange={(e) => {
                    setLocalPlayerRules(e.target.value);
                    playerRulesRef.current = e.target.value;
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {showCodex && <CodexModal key="gameplay-codex-modal" onClose={() => setShowCodex(false)} />}

        {showMemory && (
          <motion.div
            key="gameplay-memory-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col w-full h-full max-w-full max-h-full p-0 m-0 overflow-hidden"
            onClick={() => setShowMemory(false)}
          >
            <div
              className={`w-full h-full flex flex-col rounded-none border-0 overflow-hidden shadow-none ${theme.group === "Dark" ? "theme-panel !border-none text-white" : `${theme.bgClass} ${theme.textPrimary}`}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={`p-4 md:p-6 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 px-6 md:px-8 ${theme.group === "Dark" ? "border-white/10 text-white bg-black/20" : `border-black/10 ${theme.sidebarClass} ${theme.textPrimary} shadow-sm`}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-500">
                    <BrainCircuit size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-widest theme-text-base leading-none">
                      TRÍ NHỚ AI
                    </h2>
                    <span
                      className={`text-[10px] tracking-wider uppercase font-mono mt-1 block ${theme.group === "Dark" ? "text-white/40" : "text-slate-500"}`}
                    >
                      AI Memory Matrix & Context Config
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <div
                  className={`flex gap-1.5 p-1 rounded-xl border uppercase font-bold text-xs ${theme.group === "Dark" ? "theme-panel shadow-none border-transparent bg-white/5" : "${theme.sidebarClass} border-black/10 shadow-inner"}`}
                >
                  <button
                    onClick={() => setMemoryActiveTab("settings")}
                    className={`px-4 py-2 rounded-lg tracking-wider transition-all cursor-pointer ${
                      memoryActiveTab === "settings"
                        ? theme.group === "Dark"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                          : "${theme.accentClass} ${theme.bgAccentClass} font-bold shadow-md"
                        : theme.group === "Dark"
                          ? "text-white/60 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Thiết Lập
                  </button>
                  <button
                    onClick={() => setMemoryActiveTab("state")}
                    className={`px-4 py-2 rounded-lg tracking-wider transition-all cursor-pointer ${
                      memoryActiveTab === "state"
                        ? theme.group === "Dark"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                          : "${theme.accentClass} ${theme.bgAccentClass} font-bold shadow-md"
                        : theme.group === "Dark"
                          ? "text-white/60 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Trí nhớ Cuốn chiếu
                  </button>
                  <button
                    onClick={() => setMemoryActiveTab("logs")}
                    className={`px-4 py-2 rounded-lg tracking-wider transition-all cursor-pointer ${
                      memoryActiveTab === "logs"
                        ? theme.group === "Dark"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                          : "${theme.accentClass} ${theme.bgAccentClass} font-bold shadow-md"
                        : theme.group === "Dark"
                          ? "text-white/60 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Log Ký Ức ({messages.filter((m) => m.outline).length})
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMemoryFullTurnsCount(10);
                      setMemoryLogsCount(50);
                      toast.success("Đã khôi phục cài đặt gốc bộ nhớ");
                    }}
                    className="px-3.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-bold text-xs transition-colors cursor-pointer tracking-wider uppercase"
                  >
                    Mặc Định
                  </button>
                  <button
                    onClick={() => setShowMemory(false)}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer tracking-wider uppercase ${theme.group === "Dark" ? "bg-white/10 hover:bg-white/20 text-white" : `${theme.sidebarClass} hover:opacity-80 ${theme.textPrimary}`}`}
                  >
                    Đóng
                  </button>
                </div>
              </div>

              {/* Main space */}
              <div
                className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar ${theme.group === "Dark" ? "theme-panel !border-none" : theme.bgClass}`}
              >
                {memoryActiveTab === "settings" && (
                  <div className="w-full space-y-8 py-4 px-4 md:px-8">
                    {/* Intro card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                      <p className="text-slate-700 dark-theme:text-white/80 text-sm leading-relaxed">
                        Chào mừng bạn đến với{" "}
                        <strong className="text-purple-400 font-bold">
                          Ma Trận Trí Nhớ AI
                        </strong>
                        . Game Matrix Lite v6 sử dụng hệ thống RAG
                        (Retrieval-Augmented Generation) kết hợp với cửa sổ lịch
                        sử trích xuất động để gửi dữ liệu tối ưu nhất cho mô
                        hình{" "}
                        <strong className="text-purple-400 font-bold">
                          Gemini 3.1 Pro
                        </strong>
                        . Tại đây, bạn hoàn toàn có thể tinh chỉnh cách AI lưu
                        giữ ký ức hoàn toàn miễn phí mà không lo tốn kém tài
                        nguyên.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Config 1 */}
                      <div className="p-6 theme-panel shadow-none border-transparent rounded-2xl flex flex-col justify-between space-y-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-bold theme-text-base flex items-center gap-2">
                                Số lượng lượt chơi đầy đủ gửi cho AI
                              </h3>
                              <p className={`text-xs ${theme.group === "Dark" ? "text-white/50" : "text-slate-500"}`}>
                                (Full Turns Context Size)
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-lg font-black font-mono">
                              {memoryFullTurnsCount}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark-theme:text-white/70 leading-relaxed">
                            Số lượt trò chơi mới nhất được gửi{" "}
                            <strong>toàn văn (full text)</strong> bao gồm cả dàn
                            ý, bối cảnh diễn biến và hành động người chơi. Giúp
                            AI hiểu rõ nét nhất văn phong, diễn biến cực kỳ mượt
                            mà và trực tiếp tại khung bối cảnh hiện tại.
                          </p>
                        </div>
                        <div className="flex items-center gap-4 pt-2">
                          <input
                            type="number"
                            min="2"
                            max="30"
                            step="1"
                            value={memoryFullTurnsCount}
                            onChange={(e) =>
                              setMemoryFullTurnsCount(Number(e.target.value))
                            }
                            className="flex-1 theme-input px-3 py-2 rounded-lg text-center font-bold min-w-0"
                          />
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() =>
                                setMemoryFullTurnsCount(
                                  Math.max(2, memoryFullTurnsCount - 1),
                                )
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg theme-panel shadow-none border-transparent theme-panel-hover theme-text-base border border-transparent cursor-pointer"
                            >
                              -
                            </button>
                            <button
                              onClick={() =>
                                setMemoryFullTurnsCount(
                                  Math.min(30, memoryFullTurnsCount + 1),
                                )
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg theme-panel shadow-none border-transparent theme-panel-hover theme-text-base border border-transparent cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Config 2 */}
                      <div className="p-6 theme-panel shadow-none border-transparent rounded-2xl flex flex-col justify-between space-y-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-bold theme-text-base flex items-center gap-2">
                                Số lượng Log ký ức gửi cho AI
                              </h3>
                              <p className={`text-xs ${theme.group === "Dark" ? "text-white/50" : "text-slate-500"}`}>
                                (Memory Summary Retrieval Limit)
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-lg font-black font-mono">
                              {memoryLogsCount}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark-theme:text-white/70 leading-relaxed">
                            Số lượng log tóm tắt tối đa trong quá khứ được RAG
                            tìm kiếm thông minh từ cơ sở dữ liệu ký ức dựa trên
                            ngữ cảnh phát ngôn hiện tại, hoặc truyền nén lịch sử
                            để AI nhớ lại các hành trình sâu trong ký ức. Tối ưu
                            trí nhớ vĩnh viễn không giới hạn.
                          </p>
                        </div>
                        <div className="flex items-center gap-4 pt-2">
                          <input
                            type="number"
                            min="5"
                            max="300"
                            step="5"
                            value={memoryLogsCount}
                            onChange={(e) =>
                              setMemoryLogsCount(Number(e.target.value))
                            }
                            className="flex-1 theme-input px-3 py-2 rounded-lg text-center font-bold min-w-0"
                          />
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() =>
                                setMemoryLogsCount(
                                  Math.max(5, memoryLogsCount - 5),
                                )
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg theme-panel shadow-none border-transparent theme-panel-hover theme-text-base border border-transparent cursor-pointer"
                            >
                              -
                            </button>
                            <button
                              onClick={() =>
                                setMemoryLogsCount(
                                  Math.min(300, memoryLogsCount + 5),
                                )
                              }
                              className="px-2.5 py-1 text-xs font-bold rounded-lg theme-panel shadow-none border-transparent theme-panel-hover theme-text-base border border-transparent cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pro Tip logic */}
                    <div className="p-4 ${theme.bgClass}0/5 border border-amber-500/20 text-slate-700 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed theme-panel shadow-none border-transparent">
                      <span className="font-bold text-base shrink-0 mt-[-3px]">
                        💡
                      </span>
                      <p>
                        <strong>Gợi ý cài đặt hoàn hảo:</strong> Đặt số lượng
                        lượt chơi full từ <strong>8 - 15 lượt</strong> giúp AI
                        giữ được bối cảnh mượt mà có liên kết chặt chẽ nhất. Đặt
                        số log ký ức từ <strong>30 - 80 tóm tắt</strong> giúp AI
                        tìm kiếm hoặc lội dòng lịch sử một cách thông minh,
                        không lo tràn token mà vẫn đảm bảo ký ức dài hạn tuyệt
                        đối bền vững!
                      </p>
                    </div>
                  </div>
                )}

                {memoryActiveTab === "state" && (
                  <div className="w-full space-y-6 px-4 md:px-8 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider">
                        Trí nhớ Cuốn chiếu (World State)
                      </h3>
                    </div>
                    <div className="p-6 theme-panel shadow-none border-transparent rounded-2xl flex flex-col space-y-4 text-slate-700 dark-theme:text-white/80 leading-relaxed text-sm">
                      <p>
                        <strong>Tóm tắt cuốn chiếu là gì?</strong> Ký ức AI sẽ
                        dần bị phai nhạt và dẫn tới nhầm lẫn chi tiết theo thời
                        gian (VD: Quên MC đã cởi áo, quên mất NPC đã bị
                        thương...). Việc tóm tắt Cuốn Chiếu sẽ yêu cầu AI tự đọc
                        lại các lượt chơi kết hợp với Trạng thái cũ để cập nhật
                        một bộ não mới.
                      </p>
                      <p>
                        <strong>Khi nào nên bấm?</strong> Kể từ{" "}
                        <strong>lượt thứ 10</strong> trở đi, hoặc sau bất cứ sự
                        kiện lớn nào (đổi map, chuyển cảnh, kết thúc một trận
                        chiến/vấn đề), bạn nên bấm để cập nhật trí nhớ cho hệ
                        thống.
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={async () => {
                            if (isGenerating) return;
                            toast.info(
                              "Yêu cầu AI phân tích và tóm tắt cuốn chiếu... đang xử lý!",
                            );
                            handleSendSummarize();
                          }}
                          disabled={
                            isGenerating ||
                            isSummarizing ||
                            messages.filter((m) => m.outline).length ===
                              (gameData.worldData?.lastSummarizedTurnIndex || 0)
                          }
                          className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 theme-text-base font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 w-full disabled:opacity-50"
                        >
                          {isSummarizing ? (
                            <Loader2
                              size={18}
                              className="animate-spin text-slate-700"
                            />
                          ) : (
                            <Sparkles size={18} className="animate-pulse" />
                          )}
                          {isSummarizing
                            ? " ĐANG TỐM TẮT CUỐN CHIẾU... (" +
                              formatDuration(summarizeDuration) +
                              ")"
                            : " THỰC HIỆN TÓM TẮT CUỐN CHIẾU LỊCH SỬ THẾ GIỚI"}
                        </button>
                      </div>

                      <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
                        <div className="flex gap-4">
                          <div className="flex-1 theme-panel shadow-none border-transparent p-3 rounded-lg text-center">
                            <p className={`text-xs mb-1 tracking-wider uppercase ${theme.group === "Dark" ? "text-white/50" : "text-slate-500"}`}>
                              ĐÃ LƯU KÝ ỨC
                            </p>
                            <p className="text-xl font-bold theme-text-base">
                              {gameData.worldData?.lastSummarizedTurnIndex || 0}
                            </p>
                          </div>
                          <div className="flex-1 bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg text-center">
                            <p className="text-xs text-purple-400 mb-1 tracking-wider uppercase">
                              LƯỢT CHỜ TÓM TẮT
                            </p>
                            <p className="text-xl font-bold text-purple-300">
                              {messages.filter((m) => m.outline).length -
                                (gameData.worldData?.lastSummarizedTurnIndex ||
                                  0)}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-purple-300 mt-4">
                          Dữ liệu World State mới nhất đang lưu trong não bộ AI:
                        </p>
                        <div className="p-4 theme-panel shadow-none border-transparent rounded-xl font-mono text-xs text-purple-300 whitespace-pre-wrap border border-purple-500/10 min-h-24">
                          {(gameData.worldData?.worldState || "").replace(
                            /<br\s*\/?>/gi,
                            "\n",
                          ) ||
                            "Chưa có dữ liệu thống kê cuốn chiếu nào. Hãy tạo những lượt chơi đầu tiên và nhấn nút phía trên để bắt đầu!"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {memoryActiveTab === "logs" && (
                  <div className="w-full space-y-6 px-4 md:px-8 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider">
                        Danh sách các đoạn tóm tắt dòng chảy thời gian
                      </h3>
                      <div className="flex gap-2"></div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                      {messages
                        .filter((m) => m.outline)
                        .map((m, idx) => (
                          <div
                            key={`outline-${m.id}-${idx}`}
                            className="p-4 theme-panel shadow-none border-transparent rounded-2xl hover:border-purple-500/30 transition-all flex flex-col gap-2 relative group overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-full pointer-events-none group-hover:scale-110 transition-transform"></div>
                            <div className="flex items-center justify-between shrink-0">
                              <span className="px-2.5 py-0.5 bg-purple-500/15 text-purple-400 rounded-md text-[10px] font-black uppercase tracking-widest border border-purple-500/10">
                                Lượt {idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                
                                {m.worldTime && (
                                  <span className={`text-[10px] font-mono flex items-center gap-1 ${theme.group === "Dark" ? "text-white/40" : "text-slate-500"}`}>
                                    <Clock size={10} />
                                    {m.worldTime}
                                  </span>
                                )}
                                {m.weather && (
                                  <span className={`text-[10px] font-mono flex items-center gap-1 ${theme.group === "Dark" ? "text-white/40" : "text-slate-500"}`}>
                                    <CloudSun size={10} />
                                    {m.weather}
                                  </span>
                                )}
                              </div>
                            </div>
                            {editingOutlineId === m.id ? (
                              <textarea
                                className="w-full h-32 p-3 bg-white/10 dark:bg-black/20 text-slate-800 dark-theme:text-white/90 text-sm rounded-xl border border-purple-500/50 outline-none resize-none custom-scrollbar"
                                defaultValue={m.outline}
                                onChange={(e) => editingOutlineRef.current = e.target.value}
                                autoFocus
                              />
                            ) : (
                              <p className="text-slate-700 dark-theme:text-white/80 text-xs md:text-sm leading-relaxed whitespace-pre-line bg-transparent">
                                {m.outline}
                              </p>
                            )}
                            <div className="flex justify-end gap-2 mt-2">
                              {editingOutlineId === m.id ? (
                                <>
                                  <button
                                    onClick={() => setEditingOutlineId(null)}
                                    className="px-3 py-1 bg-slate-500/20 hover:bg-slate-500/30 text-slate-700 dark-theme:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    HỦY
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (editingOutlineRef.current.trim() !== '') {
                                        setMessages(prev => prev.map(msg => 
                                          msg.id === m.id ? { ...msg, outline: editingOutlineRef.current } : msg
                                        ));
                                        
                                        // Update the RAG DB synchronously for this specific turn memory
                                        // RAG memory saves it as "[CORE MEMORY - KÝ ỨC CỐT LÕI (BẮT BUỘC BẢO TOÀN TRONG SUY NGHĨ)]" if it's core, else plain outline.
                                        // But the ragService doesn't have a direct "updateByTurnId" yet. Wait, we added updateMemory but it requires memoryId.
                                        // Actually, if we just want to replace the RAG memory for a specific turn, we can do it by finding it.
                                        (async () => {
                                          try {
                                            const memories = await ragService.getMemories(gameData.id);
                                            // The default memory text starts with the outline text, or we can just replace the turn's memory by match.
                                            // A memory has turnId if added recently, but maybe it doesn't.
                                            // Since it's complex, we can just delete by turnId and re-add.
                                            await ragService.deleteMemoriesByTurnId(gameData.id, m.id);
                                            // And then re-add it 
                                            const synthLogMsg = synthesizeTurnStoryMemory(
                                              idx, // Use the map index
                                              m.mcLocation || "",
                                              m.worldTime || "",
                                              m.weather || "",
                                              "",
                                              editingOutlineRef.current,
                                              m.mainText || ""
                                            );
                                            await ragService.addMemory(gameData.id, synthLogMsg, false, undefined, m.id);
                                          } catch (e) {
                                            console.error("Lỗi cập nhật RAG:", e);
                                          }
                                        })();
                                      }
                                      setEditingOutlineId(null);
                                    }}
                                    className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shadow-purple-500/20"
                                  >
                                    LƯU LẠI
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingOutlineId(m.id);
                                    editingOutlineRef.current = m.outline || '';
                                  }}
                                  className="px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark-theme:text-purple-400 border border-purple-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                >
                                  <Edit2 size={12} />
                                  CHỈNH SỬA
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {messages.filter((m) => m.outline).length === 0 && (
                      <div className="text-center opacity-40 py-20 border border-dashed border-white/10 rounded-2xl theme-panel shadow-none border-transparent flex flex-col items-center justify-center gap-3">
                        <BrainCircuit
                          size={48}
                          className="text-purple-400 stroke-[1.5] opacity-50"
                        />
                        <div>
                          <p className="font-bold text-sm theme-text-base">
                            Chưa ghi nhận ký ức hệ thống
                          </p>
                          <p className={`text-xs mt-1 max-w-sm ${theme.group === "Dark" ? "text-white/50" : "text-slate-500"}`}>
                            Khi bạn tiến hành chơi lượt tiếp theo, trí tuệ nhân
                            tạo sẽ tự động phân tích và ghi nhận dàn ý tóm tắt
                            câu chuyện vào đây!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {showGallery && <GalleryModal key="gameplay-gallery-modal" onClose={() => setShowGallery(false)} />}

        <ColorModal
          key="gameplay-color-modal"
          isOpen={isColorModalOpen}
          onClose={() => setIsColorModalOpen(false)}
        />
        <PhoneModal
          key="gameplay-phone-modal"
          isOpen={isPhoneModalOpen}
          onClose={() => setIsPhoneModalOpen(false)}
        />
        <DramaModal
          key="gameplay-drama-modal"
          isOpen={isDramaModalOpen}
          onClose={() => setIsDramaModalOpen(false)}
          theme={theme}
        />
        <ActionSuggestionsModal
          key="gameplay-actions-modal"
          isOpen={isActionSuggestionsModalOpen}
          onClose={() => setIsActionSuggestionsModalOpen(false)}
          theme={theme}
        />

        {showSettings && (
          <motion.div
            key="gameplay-settings-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 backdrop-blur-xl flex flex-col w-full h-full max-w-full max-h-full p-0 m-0 overflow-hidden ${theme.group === "Dark" ? "bg-black/80" : "bg-amber-900/15"}`}
            onClick={() => setShowSettings(false)}
          >
            <div
              className={`w-full h-full flex flex-col border-0 rounded-none overflow-hidden shadow-none ${theme.group === "Dark" ? "theme-panel !border-none text-white" : "bg-[#FAF7F0]"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`p-4 md:p-6 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 theme-panel shadow-none border-transparent ${theme.group === "Dark" ? "border-white/10" : `border-black/10 ${theme.sidebarClass}`}`}
              >
                <h2 className="text-xl font-black uppercase tracking-widest theme-text-base flex items-center gap-2">
                  <SettingsIcon size={20} /> CẤU HÌNH IN-GAME
                </h2>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      toast.success("Đã lưu cấu hình hiện tại");
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-colors cursor-pointer tracking-wider shadow-lg shadow-blue-500/20"
                  >
                    LƯU CẤU HÌNH
                  </button>
                </div>
              </div>
              <div
                className={`flex-1 overflow-y-auto relative ${theme.group === "Dark" ? "theme-panel !border-none" : theme.bgClass}`}
              >
                <Settings />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expandedLog && (
          <motion.div
            key={`gameplay-expanded-log-${expandedLog}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center"
            onClick={() => setExpandedLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full h-full flex flex-col overflow-hidden shadow-2xl ${theme.group === "Dark" ? "bg-slate-900/95" : `${theme.sidebarClass}`}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <h4
                    className={`text-sm font-black uppercase tracking-widest ${expandedLog === "error" ? "text-red-400" : "text-purple-400"}`}
                  >
                    {expandedLog === "error"
                      ? "Nhật Ký Hệ Thống (SYS LOGS)"
                      : "Hội Đồng AI Suy Luận (Deep Reasoning)"}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {expandedLog === "error" && (
                    <button
                      onClick={() => {
                        setSystemLogs([]);
                        setExpandedLog(null);
                      }}
                      className="p-2 theme-panel-hover rounded-lg transition-colors text-red-500 hover:text-red-400"
                      title="Xóa nhật ký"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button
                    onClick={scrollExpandedLogToTop}
                    className="p-2 theme-panel-hover rounded-lg transition-colors text-slate-600 dark-theme:text-white/70 hover:theme-text-base"
                    title="Lên đầu trang"
                  >
                    <ArrowUpToLine size={20} />
                  </button>
                  <button
                    onClick={scrollExpandedLogToBottom}
                    className="p-2 theme-panel-hover rounded-lg transition-colors text-slate-600 dark-theme:text-white/70 hover:theme-text-base"
                    title="Xuống cuối trang"
                  >
                    <ArrowDownToLine size={20} />
                  </button>
                  <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
                  <button
                    onClick={() => setExpandedLog(null)}
                    className="p-2 theme-panel-hover rounded-lg transition-colors text-slate-600 dark-theme:text-white/70 hover:theme-text-base"
                    title="Đóng"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div
                ref={expandedLogScrollRef}
                className={`flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar ${theme.group === "Dark" ? "theme-panel !border-none" : theme.bgClass}`}
              >
                {expandedLog === "error" ? (
                  <SysLogViewer theme={theme} isExpanded={true} />
                ) : (
                  <StreamLogViewer
                    theme={theme}
                    isExpanded={true}
                    expandedLog={expandedLog}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
