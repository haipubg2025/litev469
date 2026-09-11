/**
 * Memory Utility Functions for Hierarchical Memory System (Phân cấp ký ức)
 * Supporting:
 * 1. Synthesis of full turn story text into comprehensive memory (without truncating)
 * 2. Building the 10-turn detailed memory buffer with highest priority & detail
 * 3. Sorting & extracting turn index for recency-based priority
 */

export interface TurnData {
  index: number;
  userMsg?: { content: string };
  aiMsg?: {
    mainText?: string;
    content?: string;
    outline?: string;
    memory?: string;
    mcLocation?: string;
    worldTime?: string;
    weather?: string;
  };
}

/**
 * Extract turn index number from memory text or turn string (e.g. "Lượt 12:" -> 12)
 */
export function extractTurnIndexFromText(text: string): number | null {
  if (!text) return null;
  const match = text.match(/Lượt\s+(\d+)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) return num;
  }
  return null;
}

/**
 * Synthesizes the full story text (chính văn) of a turn into a detailed, structured memory.
 * CRITICAL REQUIREMENT: Synthesize events from across the ENTIRE text (beginning, middle, climax, outcome)
 * and key dialogues rather than truncating at the first N characters.
 */
export function synthesizeTurnStoryMemory(
  turnIndex: number,
  mcLocation: string,
  worldTime: string,
  weather: string,
  userAction: string,
  outline: string,
  fullMainText: string
): string {
  if (!fullMainText) {
    const weatherInfo = weather ? ` (${weather})` : "";
    return `[LƯỢT ${turnIndex} - KÝ ỨC CHI TIẾT TỔNG HỢP]
• Thời gian & Vị trí: ${mcLocation || "Không xác định"} lúc ${worldTime || ""}${weatherInfo}
• Hành động MC: ${userAction || "Khởi đầu"}
• Ký Ức Lượt: ${outline || "Không có tóm tắt"}`;
  }

  // Clean raw story text from codeblocks, tag markers, and excess blank lines
  let cleanText = fullMainText
    .replace(/```[a-z]*\n[\s\S]*?```/g, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/<json_ToMau>[\s\S]*?<\/json_ToMau>/g, "")
    .trim();
    
  cleanText = cleanText.replace(/\[mau:dâm thủy\]/gi, "[damThuy:dâm thủy]");
  cleanText = cleanText.replace(/\[mau:tinh dịch\]/gi, "[damThuy:tinh dịch]");
  cleanText = cleanText.replace(/\[mau:mồ hôi\]/gi, "[damThuy:mồ hôi]");
  cleanText = cleanText.replace(/\[mau:nước bọt\]/gi, "[damThuy:nước bọt]");
  cleanText = cleanText.replace(/\[mau:/g, "[huyet:");


  // Extract key dialogue quotes (e.g., 「...」, 《...》, 【...】:, "...")
  const dialogues: string[] = [];
  const dialogueRegex = /(?:【([^】]+)】:\s*)?(?:「([^」]+)」|《([^»]+)》|"([^"]{4,150})")/g;
  let match: RegExpExecArray | null;
  while ((match = dialogueRegex.exec(cleanText)) !== null) {
    const speaker = match[1] ? match[1].trim() : "Nhân vật";
    const quote = match[2] || match[3] || match[4];
    if (quote && quote.trim().length > 3) {
      dialogues.push(`${speaker}: "${quote.trim()}"`);
    }
  }

  // Select representative key dialogues spread across the turn
  let keyDialogueBlock = "";
  if (dialogues.length > 0) {
    const selectedQuotes =
      dialogues.length <= 4
        ? dialogues
        : [
            dialogues[0],
            dialogues[Math.floor(dialogues.length / 3)],
            dialogues[Math.floor((2 * dialogues.length) / 3)],
            dialogues[dialogues.length - 1],
          ];
    keyDialogueBlock =
      "\n+ Lời thoại & Cam kết chìa khóa: " + selectedQuotes.join(" | ");
  }

  const weatherStr = weather ? ` (${weather})` : "";
  const locationStr = mcLocation || "Không xác định";
  const timeStr = worldTime || "Chưa rõ thời gian";

  return `[LƯỢT ${turnIndex} - KÝ ỨC CHI TIẾT TỔNG HỢP]
• Số lượt: ${turnIndex} (Lượt càng lớn = Càng mới = Ưu tiên tối cao)
• Vị trí & Thời gian: ${locationStr} [Thời điểm: ${timeStr}${weatherStr}]
• Hành động MC: ${userAction || "Tiến trình câu chuyện"}
• Ký Ức Lượt (Tóm tắt sự kiện): ${outline || "Chưa có dàn ý"}${keyDialogueBlock}`;
}

/**
 * Builds the explicit 10-turn detailed memory buffer string formatted for AI context injection.
 * Each of the 10 most recent turns is synthesized into a detailed memory block.
 */
export function buildDetailedRecentTurnsMemories(
  turns: TurnData[],
  maxCount: number = 10
): string {
  if (!turns || turns.length === 0) return "";

  // Get the up to `maxCount` most recent turns
  const recentTurns = turns.slice(-maxCount);
  if (recentTurns.length === 0) return "";

  const memoryBlocks: string[] = [];

  recentTurns.forEach((t) => {
    const turnIdx = t.index;
    const userAct = t.userMsg?.content || "Hành động theo kịch bản";
    const outline = t.aiMsg?.memory || t.aiMsg?.outline || "Chưa có dàn ý";
    const location = t.aiMsg?.mcLocation || "Không xác định";
    const time = t.aiMsg?.worldTime || "";
    const weather = t.aiMsg?.weather || "";
    const fullText = t.aiMsg?.mainText || t.aiMsg?.content || "";

    const synthesized = synthesizeTurnStoryMemory(
      turnIdx,
      location,
      time,
      weather,
      userAct,
      outline,
      fullText
    );

    memoryBlocks.push(synthesized);
  });

  return (
    `===[ BỘ KÝ ỨC CHI TIẾT ${recentTurns.length} LƯỢT CHƠI MỚI NHẤT (ƯU TIÊN CAO NHẤT & ĐỘ CHI TIẾT CAO NHẤT) ]===\n` +
    `AI BẮT BUỘC PHẢI TÔN TRỌNG VÀ ƯU TIÊN TUYỆT ĐỐI CÁC CHI TIẾT NÀY. SỐ LƯỢT CÀNG LỚN (LƯỢT CÀNG MỚI) THÌ ĐỘ ƯU TIÊN VÀ ĐỘ CHI TIẾT CÀNG CAO. AI KHÔNG ĐƯỢC MÂU THUẪN HOẶC QUÊN CÁC SỰ KIỆN, LỜI HỨA VÀ TÌNH TIẾT TRONG CÁC LƯỢT NÀY.\n\n` +
    memoryBlocks.join("\n\n---\n\n") +
    "\n\n"
  );
}
