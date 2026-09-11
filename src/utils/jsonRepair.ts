/**
 * Tiện ích làm sạch và sửa chữa lỗi JSON / Văn bản dòng stream của game Matrix Lite v6
 * Đảm bảo người chơi không bao giờ nhìn thấy các thẻ hệ thống, ngoặc nhọn hoặc JSON thô.
 */


import { jsonrepair } from 'jsonrepair';
import { toast } from '../utils/toast';
import { stripShortTags } from './wordFilter';

export interface JsonRepairReportItem {
  symbol: string;
  category: 'comma' | 'brace' | 'bracket' | 'paren' | 'quote' | 'singleQuote' | 'slash' | 'backslash';
  line: number;
  column: number;
  action: string;
}

/**
 * CƠ CHẾ SIÊU PHỤC HỒI JSON (Ultra Deep Intelligent JSON Auto-Fixer)
 * Tự động tìm, đếm và khôi phục triệt để từng dấu ',' , dấu ngoặc, dấu '/' hay '\' , dấu nháy đơn/kép.
 */
export function performDeepJsonAutoFixAndTrack(jsonStr: string, fullRawText: string = jsonStr): {
  repairedJson: string;
  reports: JsonRepairReportItem[];
  summaryText: string | null;
  stats: { comma: number; brace: number; bracket: number; paren: number; quote: number; singleQuote: number; slash: number; backslash: number };
} {
  const stats = {
    comma: 0,
    brace: 0,
    bracket: 0,
    paren: 0,
    quote: 0,
    singleQuote: 0,
    slash: 0,
    backslash: 0
  };
  const reports: JsonRepairReportItem[] = [];

  // 1. Tính toán tọa độ dòng và cột ban đầu của chuỗi JSON so với toàn bộ phản hồi của AI
  let baseLine = 1;
  let baseCol = 1;
  const idxInFull = fullRawText.indexOf(jsonStr);
  if (idxInFull !== -1 && idxInFull > 0) {
    const beforeText = fullRawText.substring(0, idxInFull);
    const newlineMatches = beforeText.match(/\n/g);
    if (newlineMatches) {
      baseLine += newlineMatches.length;
      const lastNewlineIdx = beforeText.lastIndexOf('\n');
      baseCol += beforeText.length - lastNewlineIdx - 1;
    } else {
      baseCol += beforeText.length;
    }
  }

  // 2. Chuẩn bị buffer và cờ quét
  let output = "";
  let curLine = baseLine;
  let curCol = baseCol;
  let inString = false;
  let escape = false;
  let lastTokenTerminated = false;
  let lastNonWhitespaceChar = '';
  const openBrackets: string[] = [];

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    const thisLine = curLine;
    const thisCol = curCol;

    // Cập nhật tọa độ cho bước lặp tiếp theo
    if (char === '\n') {
      curLine++;
      curCol = 1;
    } else {
      curCol++;
    }

    if (escape) {
      output += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      output += char;
      escape = true;
      continue;
    }

    if (char === '"') {
      if (!inString) {
        // Kiểm tra xem giữa giá trị trước đó và dấu nháy kép này có thiếu dấu phẩy (,) hay dấu hai chấm (:) không
        if (lastTokenTerminated && lastNonWhitespaceChar !== ',' && lastNonWhitespaceChar !== ':' && lastNonWhitespaceChar !== '{' && lastNonWhitespaceChar !== '[') {
          output += ',';
          stats.comma++;
          reports.push({
            symbol: ',',
            category: 'comma',
            line: thisLine,
            column: thisCol,
            action: 'Bổ sung dấu phẩy (,) ngăn cách thuộc tính/phần tử bị thiếu'
          });
        }
        inString = true;
        lastTokenTerminated = false;
        lastNonWhitespaceChar = '"';
        output += char;
      } else {
        // Lookahead kiểm tra dấu nháy kép này là đóng chuỗi hợp lệ hay nháy kép chưa escape bên trong lời thoại/văn bản
        let isRealClosingQuote = false;
        if (i === jsonStr.length - 1) {
          isRealClosingQuote = true;
        } else {
          let nextSigIdx = -1;
          for (let j = i + 1; j < jsonStr.length; j++) {
            if (!/\s/.test(jsonStr[j])) {
              nextSigIdx = j;
              break;
            }
          }
          if (nextSigIdx !== -1) {
            const nextChar = jsonStr[nextSigIdx];
            if (nextChar === ':' || nextChar === '}' || nextChar === ']') {
              isRealClosingQuote = true;
            } else if (nextChar === ',') {
              // Nếu gặp dấu phẩy, phải kiểm tra xem đằng sau dấu phẩy có phải là một key JSON tiếp theo hoặc ngoặc đóng không
              const textAfterComma = jsonStr.substring(nextSigIdx + 1);
              if (/^\s*("[a-zA-Z0-9_]+"|'([a-zA-Z0-9_]+)'|[a-zA-Z0-9_]+)\s*:/.test(textAfterComma) || /^\s*[\}\]]/.test(textAfterComma)) {
                isRealClosingQuote = true;
              }
            }
          }
        }

        if (isRealClosingQuote) {
          inString = false;
          lastTokenTerminated = true;
          lastNonWhitespaceChar = '"';
          output += char;
        } else {
          // AI gõ thiếu escape cho dấu nháy kép bên trong văn bản truyện (hoặc tự ý chèn dấu nháy kép thô)
          output += '\\"';
          stats.quote++;
          stats.backslash++;
          reports.push({
            symbol: '"',
            category: 'quote',
            line: thisLine,
            column: thisCol,
            action: 'Tự động escape dấu nháy kép (") bên trong chuỗi văn bản'
          });
        }
      }
      continue;
    }

    if (inString) {
      if (char === '\n') {
        output += '\\n';
        stats.backslash++;
        reports.push({
          symbol: '\\n',
          category: 'backslash',
          line: thisLine,
          column: thisCol,
          action: 'Chuyển xuống dòng thực tế thành chuỗi hợp lệ "\\n"'
        });
      } else if (char === '\t') {
        output += '\\t';
      } else if (char === '\r') {
        // Bỏ qua carriage return
      } else {
        output += char;
      }
      continue;
    }

    // Khi ở ngoài chuỗi (!inString)
    if (/\s/.test(char)) {
      output += char;
      continue;
    }

    if (char === '{' || char === '[') {
      if (lastTokenTerminated && lastNonWhitespaceChar !== ',' && lastNonWhitespaceChar !== ':' && lastNonWhitespaceChar !== '{' && lastNonWhitespaceChar !== '[') {
        output += ',';
        stats.comma++;
        reports.push({
          symbol: ',',
          category: 'comma',
          line: thisLine,
          column: thisCol,
          action: 'Bổ sung dấu phẩy (,) trước ngoặc mở'
        });
      }
      openBrackets.push(char);
      lastTokenTerminated = false;
      lastNonWhitespaceChar = char;
      output += char;
      continue;
    }

    if (char === '}' || char === ']') {
      // Khắc phục lỗi Trailing Comma (thừa dấu phẩy trước ngoặc đóng)
      if (lastNonWhitespaceChar === ',') {
        output = output.replace(/,\s*$/, '');
        stats.comma++;
        reports.push({
          symbol: ',',
          category: 'comma',
          line: thisLine,
          column: thisCol,
          action: 'Loại bỏ dấu phẩy (,) thừa trước ngoặc đóng'
        });
      }
      openBrackets.pop();
      lastTokenTerminated = true;
      lastNonWhitespaceChar = char;
      output += char;
      continue;
    }

    if (char === ',' || char === ':') {
      if (lastNonWhitespaceChar === char || (char === ',' && (lastNonWhitespaceChar === '{' || lastNonWhitespaceChar === '['))) {
        stats.comma++;
        reports.push({
          symbol: char,
          category: 'comma',
          line: thisLine,
          column: thisCol,
          action: `Loại bỏ dấu ${char} thừa hoặc không hợp lệ`
        });
        continue;
      }
      lastTokenTerminated = false;
      lastNonWhitespaceChar = char;
      output += char;
      continue;
    }

    if (char === '\'') {
      if (lastTokenTerminated && lastNonWhitespaceChar !== ',' && lastNonWhitespaceChar !== ':' && lastNonWhitespaceChar !== '{' && lastNonWhitespaceChar !== '[') {
        output += ',';
        stats.comma++;
        reports.push({
          symbol: ',',
          category: 'comma',
          line: thisLine,
          column: thisCol,
          action: 'Bổ sung dấu phẩy (,) ngăn cách thuộc tính'
        });
      }
      output += '"';
      stats.singleQuote++;
      stats.quote++;
      reports.push({
        symbol: "'",
        category: 'singleQuote',
        line: thisLine,
        column: thisCol,
        action: 'Chuyển dấu nháy đơn (\') thành nháy kép (") chuẩn JSON'
      });
      inString = true;
      lastTokenTerminated = false;
      lastNonWhitespaceChar = '"';
      continue;
    }

    if (char === '/') {
      if (i + 1 < jsonStr.length && jsonStr[i + 1] === '/') {
        stats.slash += 2;
        reports.push({
          symbol: '//',
          category: 'slash',
          line: thisLine,
          column: thisCol,
          action: 'Loại bỏ comment lập trình một dòng (//)'
        });
        while (i < jsonStr.length && jsonStr[i] !== '\n') {
          i++;
        }
        curLine++;
        curCol = 1;
        output += '\n';
        continue;
      } else if (i + 1 < jsonStr.length && jsonStr[i + 1] === '*') {
        stats.slash += 2;
        reports.push({
          symbol: '/*',
          category: 'slash',
          line: thisLine,
          column: thisCol,
          action: 'Loại bỏ comment lập trình nhiều dòng (/* */)'
        });
        i += 2;
        while (i < jsonStr.length && !(jsonStr[i - 1] === '*' && jsonStr[i] === '/')) {
          if (jsonStr[i] === '\n') {
            curLine++;
            curCol = 1;
          } else {
            curCol++;
          }
          i++;
        }
        continue;
      }
    }

    // Các ký tự khác (chữ số, boolean true/false, null)
    output += char;
    lastNonWhitespaceChar = char;
    if (/[0-9a-zA-Z._-]/.test(char)) {
      while (i + 1 < jsonStr.length && /[0-9a-zA-Z._-]/.test(jsonStr[i + 1])) {
        i++;
        curCol++;
        output += jsonStr[i];
      }
      lastTokenTerminated = true;
      lastNonWhitespaceChar = 'val';
    }
  }

  // 3. Xử lý các dấu ngoặc hay chuỗi string dở dang chưa đóng ở cuối văn bản (Truncated Response)
  if (inString) {
    output += '"';
    stats.quote++;
    reports.push({
      symbol: '"',
      category: 'quote',
      line: curLine,
      column: curCol,
      action: 'Tự động đóng dấu nháy kép (") bị thiếu ở cuối phản hồi'
    });
  }

  while (openBrackets.length > 0) {
    const top = openBrackets.pop();
    const closeSym = top === '{' ? '}' : ']';
    output += closeSym;
    if (closeSym === '}') stats.brace++;
    if (closeSym === ']') stats.bracket++;
    reports.push({
      symbol: closeSym,
      category: closeSym === '}' ? 'brace' : 'bracket',
      line: curLine,
      column: curCol,
      action: `Tự động đóng ngoặc '${closeSym}' bị thiếu ở cuối cấu trúc JSON`
    });
  }

  // 4. Kết hợp thêm thư viện jsonrepair chuẩn nếu có sai sót tầng sâu
  let finalRepaired = output;
  try {
    JSON.parse(finalRepaired);
  } catch (e) {
    try {
      finalRepaired = jsonrepair(finalRepaired);
    } catch (e2) {}
  }

  // 5. Tạo thông báo tổng kết chi tiết gửi đến người dùng
  let summaryText: string | null = null;
  if (reports.length > 0) {
    const totalRepaired = reports.length;
    const detailLines = reports.slice(0, 8).map(r => `  + Dòng ${r.line} (Cột ${r.column}): [${r.symbol}] -> ${r.action}`).join('\n');
    const moreNotice = reports.length > 8 ? `\n  ... và ${reports.length - 8} vị trí khác.` : '';
    
    summaryText = `[Hệ Thống Tự Kiểm Toán Cú Pháp AI] Đã tự động phát hiện và khôi phục ${totalRepaired} lỗi dấu cấu trúc trong toàn bộ phản hồi:\n` +
      detailLines + moreNotice +
      `\n> Tổng hợp can thiệp: Thêm/Sửa ${stats.comma} dấu ',' | ${stats.brace} dấu ngoặc nhọn '{ }' | ${stats.bracket} dấu ngoặc vuông '[ ]' | ${stats.quote + stats.singleQuote} dấu nháy | ${stats.slash + stats.backslash} dấu gạch.`;
    
    console.log(summaryText);
  }

  return {
    repairedJson: finalRepaired,
    reports,
    summaryText,
    stats
  };
}

interface GameplayParsedData {
  worldTime?: string;
  weather?: string;
  mcLocation?: string;
  npcLocations?: Array<{ id: string; location: string }>;
  mcUpdates?: any;
  mcUpdate?: any;
  playerUpdate?: any;
  mc_updates?: any;
  npcUpdates?: any;
  npcUpdate?: any;
  npcsUpdate?: any;
  npc_updates?: any;
  newNPCs?: any[];
  newNpcs?: any[];
  new_npcs?: any[];
  codexUpdates?: {
    worldData?: any;
    worldDetails?: any;
  };
  codexUpdate?: {
    worldData?: any;
    worldDetails?: any;
  };
  worldDataUpdates?: any;
  worldDetailsUpdates?: any;
  outline?: string;
  memory?: string;
  mainText?: string;
  storyParts?: string | string[];
  suggestedActions?: Array<{ action: string; details?: string; timeCost?: string; successRate?: string; gainsLosses?: string }>;
  options?: Array<{ action: string; details?: string; timeCost?: string; successRate?: string; gainsLosses?: string }>;
  choices?: Array<{ action: string; details?: string; timeCost?: string; successRate?: string; gainsLosses?: string }>;
  worldStateUpdate?: string;
  worldState?: string;
  phoneUpdates?: {
    chats?: Array<{
      chatId: string;
      chatName: string;
      isGroup: boolean;
      participants: string[];
      newMessages: Array<{
        sender: string;
        content: string;
        timestamp: string;
      }>;
    }>;
  };
  discordUpdates?: {
    chats?: Array<{
      channel: string;
      messages: Array<{
        sender: string;
        senderId: string;
        isRealNpc?: boolean;
        role?: string;
        text: string;
      }>;
    }>;
  };
}

/**
 * Tự động phát hiện và loại bỏ các phần rác dở dang, rác báo lỗi Proxy,
 * và các khối dở dang bị đứt gãy trước khi AI tự động thử lại từ đầu.
 */
export function cleanProxyRetryGarbage(rawText: string): string {
  if (!rawText) return "";

  // 1. Kiểm tra xem có dấu hiệu Proxy bị lỗi và tự động thử lại hay không
  const hasProxyError = rawText.includes("Proxy gặp lỗi") || 
                        rawText.includes("Hệ thống: Proxy") || 
                        rawText.includes("Đang xử lý bằng Proxy") ||
                        (rawText.match(/<thinking_process>/gi) || []).length > 1 ||
                        (rawText.match(/<THINKING_PROCESS>/gi) || []).length > 1;

  if (!hasProxyError) {
    return rawText;
  }

  console.log("[Proxy Garbage Cleaner] Phát hiện văn bản chứa lỗi Proxy thử lại. Đang dọn dẹp...");

  // 2. Tìm kiếm điểm bắt đầu của lượt thử lại mới nhất.
  // Lượt thử lại mới nhất thường sẽ bắt đầu bằng <THINKING_PROCESS>, <thinking_process>, hoặc khối ```json, <json_output>, <json_update>
  const markers = [
    /<THINKING_PROCESS>/gi,
    /<thinking_process>/gi,
    /```json/gi,
    /<json_output>/gi,
    /<json_update>/gi,
    /<json_actions>/gi,
    /<json_MC>/gi,
    /<json_memory>/gi
  ];

  let latestIndex = -1;

  markers.forEach(marker => {
    const matches = [...rawText.matchAll(marker)];
    if (matches.length > 1) {
      // Có nhiều hơn 1, lấy cái cuối cùng
      const lastMatch = matches[matches.length - 1];
      if (lastMatch.index !== undefined && lastMatch.index > latestIndex) {
        latestIndex = lastMatch.index;
      }
    }
  });

  // Nếu không có marker nào xuất hiện nhiều lần, nhưng có thông báo lỗi proxy,
  // hãy tìm vị trí xuất hiện cuối cùng của bất kỳ marker nào nằm SAU thông báo lỗi proxy cuối cùng.
  if (latestIndex === -1) {
    const proxyErrorIdx = Math.max(
      rawText.lastIndexOf("Proxy gặp lỗi"),
      rawText.lastIndexOf("Đang xử lý bằng Proxy"),
      rawText.lastIndexOf("[SYSTEM] Đang xử lý")
    );

    if (proxyErrorIdx !== -1) {
      let firstMarkerAfterError = -1;
      markers.forEach(marker => {
        const matches = [...rawText.matchAll(marker)];
        matches.forEach(m => {
          if (m.index !== undefined && m.index > proxyErrorIdx) {
            if (firstMarkerAfterError === -1 || m.index < firstMarkerAfterError) {
              firstMarkerAfterError = m.index;
            }
          }
        });
      });

      if (firstMarkerAfterError !== -1) {
        latestIndex = firstMarkerAfterError;
      }
    }
  }

  if (latestIndex !== -1) {
    const cleaned = rawText.substring(latestIndex).trim();
    console.log(`[Proxy Garbage Cleaner] Đã dọn dẹp thành công! Cắt bỏ phần rác dở dang phía trước, giữ lại phản hồi mới bắt đầu từ index ${latestIndex}.`);
    return cleaned;
  }

  // Fallback: Tìm dấu '{' trước '"worldData"' gần nhất nằm sau lỗi proxy
  const worldDataIdx = rawText.lastIndexOf('"worldData"');
  if (worldDataIdx !== -1) {
    const piece = rawText.substring(0, worldDataIdx);
    const lastBrace = piece.lastIndexOf('{');
    if (lastBrace !== -1 && lastBrace > 0) {
      const proxyErrorIdx = Math.max(
        rawText.lastIndexOf("Proxy gặp lỗi"),
        rawText.lastIndexOf("Đang xử lý bằng Proxy")
      );
      if (lastBrace > proxyErrorIdx) {
        console.log("[Proxy Garbage Cleaner] Khôi phục bằng cách tìm dấu mở ngoặc JSON cuối cùng chứa \"worldData\"...");
        return rawText.substring(lastBrace).trim();
      }
    }
  }

  return rawText;
}

/**
 * Phân tích và sửa chữa JSON toàn diện, ứng dụng cho mọi luồng (Tạo mới, Cập nhật...)
 */
export function safeParseJSON(rawText: string): any {
  const sanitizedRaw = cleanProxyRetryGarbage(rawText);
  let cleaned = sanitizedRaw.trim();
  
  const jsonMatch = cleaned.match(/<json_output>\s*({[\s\S]*?})\s*(?:<\/json_output>|$)/) || 
                    cleaned.match(/```json\s*({[\s\S]*?})(?:```|$)/) || 
                    cleaned.match(/({[\s\S]*)/);
                    
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }

  cleaned = escapeLiteralNewlinesInJson(cleaned);

  let parsedData: any = null;

  // 1. ƯU TIÊN HÀNG ĐẦU: Thử parse trực tiếp JSON gốc từ AI (Nếu đã hợp lệ thì dùng ngay, không can thiệp làm hỏng nội dung)
  try {
    parsedData = JSON.parse(cleaned);
  } catch (err) {
    // 2. ƯU TIÊN THỨ HAI: Dùng thư viện jsonrepair tiêu chuẩn để tự động sửa lỗi cú pháp nhẹ (như dấu phẩy thừa/thiếu, ngoặc)
    try {
      const repaired = jsonrepair(cleaned);
      parsedData = JSON.parse(repaired);
    } catch (e2) {
      // 3. ƯU TIÊN THỨ BA: Sửa các trường hợp JSON bị cắt đứt dở dang (repairTruncatedJson) kết hợp jsonrepair
      try {
        const repairedTruncated = jsonrepair(repairTruncatedJson(cleaned));
        parsedData = JSON.parse(repairedTruncated);
      } catch (e3) {
        // 4. LƯỚI AN TOÀN CUỐI CÙNG: Dùng performDeepJsonAutoFixAndTrack khi JSON bị hỏng nặng
        try {
          const autoFixed = performDeepJsonAutoFixAndTrack(cleaned, sanitizedRaw);
          parsedData = JSON.parse(autoFixed.repairedJson);
          
          const severeErrors = autoFixed.reports.filter(r => ['comma', 'brace', 'bracket'].includes(r.category));
          if (severeErrors.length > 0) {
            toast.success("Hệ thống tự động đồng bộ cú pháp AI", {
              description: `Đã tự động khôi phục ${severeErrors.length} lỗi cấu trúc JSON...`
            });
          }
        } catch (e4) {
          console.warn("[safeParseJSON] Tất cả phương thức parse JSON đều thất bại:", e4);
        }
      }
    }
  }

  // Loại bỏ các rác sinh ra do AI điền \n lơ lửng trong mảng
  if (parsedData && Array.isArray(parsedData.suggestedActions)) {
    parsedData.suggestedActions = parsedData.suggestedActions.filter((item: any) => {
      if (typeof item === 'string' && (item.trim() === 'n' || item.trim() === '\\n' || item.trim() === '')) return false;
      return true;
    });
  }

  return parsedData;
}

/**
 * 1. Sửa lỗi xuống dòng thực tế (literal newline) bên trong các chuỗi bọc bởi dấu ngoặc kép của JSON.
 * Đây là lỗi phổ biến nhất làm JSON.parse bị sập do các trình proxy hoặc model sinh ra xuống dòng thực mà không escape thành \n.
 */
export function escapeLiteralNewlinesInJson(jsonStr: string): string {
  // Thay thế các thẻ <br>, <br/>, <br > thành xuống dòng thực tế (\n) trước khi escape
  // để các output tàn dư của thẻ HTML có thể được hiển thị đúng định dạng.
  jsonStr = jsonStr.replace(/<br\s*\/?>/gi, '\n');

  let result = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (char === '\n' && inString) {
      // Thay thế xuống dòng thực tế bằng chuỗi \\n hợp lệ cho JSON
      result += "\\n";
      continue;
    }

    if (char === '\r' && inString) {
      // Bỏ qua carriage return bên trong chuỗi
      continue;
    }

    result += char;
  }

  return result;
}

/**
 * 2. Sửa lỗi JSON bị đứt đoạn / truncated đột ngột (do hết token hoặc gián đoạn mạng)
 * Tự động đóng các chuỗi ngoặc còn thiếu ở cuối chuỗi.
 */
export function repairTruncatedJson(jsonStr: string): string {
  let trimmed = jsonStr.trim();
  if (!trimmed) return "{}";

  // Thử parse trước, nếu được thì trả về luôn
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch (e) {}

  // Thực hiện sửa chữa
  let inString = false;
  let escapeNext = false;
  const stack: string[] = [];

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        stack.push('{');
      } else if (char === '[') {
        stack.push('[');
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  let repaired = trimmed;

  // Nếu kết thúc mà vẫn đang ở trong chuỗi string, hãy đóng dấu ngoặc kép
  if (inString) {
    repaired += '"';
  }

  // Loại bỏ các dấu phẩy cô đơn ở cuối (trailing commas) phát sinh do bị đứt đoạn
  repaired = repaired.replace(/,\s*$/, "");

  // Đóng các ngoặc nhọn / ngoặc vuông từ trong ra ngoài theo stack
  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') {
      repaired += '}';
    } else if (last === '[') {
      repaired += ']';
    }
  }

  // Thử kiểm định lần cuối sau khi sửa chữa
  try {
    JSON.parse(repaired);
    return repaired;
  } catch (err) {
    // Nếu vẫn lỗi, thử chắp vá mạnh hơn: tìm xem lỗi nằm ở cấu trúc suggestedActions dở dang hay phần tử dở dang
    // Tìm cách cắt bỏ phần bị lỗi ở cuối cho đến dấu dính líu hợp lệ trước đó
    try {
      // Tìm vị trí của dấu phẩy cuối cùng phân tách key-value hợp lệ, thử cắt từ đó
      const lastCommaIdx = repaired.lastIndexOf(",");
      if (lastCommaIdx !== -1) {
        let fallbackRepaired = repaired.substring(0, lastCommaIdx).trim();
        // Tìm lại stack cho chuỗi fallbackRepaired
        let fInString = false;
        let fEscapeNext = false;
        const fStack: string[] = [];
        for (let j = 0; j < fallbackRepaired.length; j++) {
          const c = fallbackRepaired[j];
          if (fEscapeNext) { fEscapeNext = false; continue; }
          if (c === '\\') { fEscapeNext = true; continue; }
          if (c === '"') { fInString = !fInString; continue; }
          if (!fInString) {
            if (c === '{') fStack.push('{');
            else if (c === '[') fStack.push('[');
            else if (c === '}') { if (fStack[fStack.length-1] === '{') fStack.pop(); }
            else if (c === ']') { if (fStack[fStack.length-1] === '[') fStack.pop(); }
          }
        }
        if (fInString) fallbackRepaired += '"';
        while (fStack.length > 0) {
          const l = fStack.pop();
          if (l === '{') fallbackRepaired += '}';
          else if (l === '[') fallbackRepaired += ']';
        }
        JSON.parse(fallbackRepaired);
        return fallbackRepaired;
      }
    } catch(e2) {}

    return repaired; // Trả về phương án tốt nhất
  }
}

/**
 * Hàm hỗ trợ trích xuất một block JSON (object hoặc array) từ văn bản thô
 */
function extractJsonBlock(
  rawText: string, 
  keyName: string | string[], 
  type: 'object' | 'array',
  options?: { isFinal?: boolean; silent?: boolean }
): any {
  const keys = Array.isArray(keyName) ? keyName.join('|') : keyName;
  const regex = new RegExp(`["']?(?:${keys})["']?\\s*:\\s*[${type === 'object' ? '{' : '\\['}]`, 'i');
  const match = rawText.match(regex);
  if (!match) return undefined;
  
  const startIdx = match.index! + match[0].length - 1;
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let endIdx = -1;
  let correctedBlock = "";

  for (let i = startIdx; i < rawText.length; i++) {
    const char = rawText[i];
    
    if (escapeNext) {
      escapeNext = false;
      correctedBlock += char;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      correctedBlock += char;
      continue;
    }
    
    if (char === '"') {
      if (!inString) {
        inString = true;
        correctedBlock += char;
      } else {
        let nextNonSpace = '';
        for (let j = i + 1; j < rawText.length; j++) {
           if (!/\s/.test(rawText[j])) {
              nextNonSpace = rawText[j];
              break;
           }
        }
        if ([':', ',', '}', ']'].includes(nextNonSpace)) {
           inString = false;
           correctedBlock += char;
        } else {
           correctedBlock += '\\"';
        }
      }
      continue;
    }
    
    correctedBlock += char;
    
    if (!inString) {
      if (char === (type === 'object' ? '{' : '[')) {
        braceCount++;
      } else if (char === (type === 'object' ? '}' : ']')) {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }

  if (endIdx !== -1) {
    let blockStr = correctedBlock;
    blockStr = escapeLiteralNewlinesInJson(blockStr);
    
    try {
      return JSON.parse(blockStr);
    } catch (e) {
      try {
        const repaired = jsonrepair(blockStr);
        return JSON.parse(repaired);
      } catch (e2) {
        try {
          const autoFixed = performDeepJsonAutoFixAndTrack(blockStr);
          return JSON.parse(autoFixed.repairedJson);
        } catch (e3) {
          if (type === 'array') {
            const items: any[] = [];
            let currentBraceCount = 0;
            let currentInString = false;
            let currentEscapeNext = false;
            let startOfObj = -1;
            
            for (let k = 0; k < blockStr.length; k++) {
              const char = blockStr[k];
              if (currentEscapeNext) { currentEscapeNext = false; continue; }
              if (char === '\\') { currentEscapeNext = true; continue; }
              if (char === '"') { currentInString = !currentInString; continue; }
              if (!currentInString) {
                if (char === '{') {
                  if (currentBraceCount === 0) startOfObj = k;
                  currentBraceCount++;
                } else if (char === '}') {
                  currentBraceCount--;
                  if (currentBraceCount === 0 && startOfObj !== -1) {
                    const objStr = blockStr.substring(startOfObj, k + 1);
                    try {
                      items.push(JSON.parse(objStr));
                    } catch (eObj1) {
                      try {
                        const repairedObj = jsonrepair(objStr);
                        items.push(JSON.parse(repairedObj));
                      } catch (eObj2) {
                        try {
                          const autoFixedObj = performDeepJsonAutoFixAndTrack(objStr);
                          items.push(JSON.parse(autoFixedObj.repairedJson));
                        } catch (eObj3) {
                          if (!options?.silent && options?.isFinal !== false) {
                            console.error("[Robust JSON Parser] Không thể parse phần tử mảng đơn lẻ kể cả khi sửa lỗi:", eObj3);
                          }
                        }
                      }
                    }
                    startOfObj = -1;
                  }
                }
              }
            }
            if (items.length > 0) {
              if (!options?.silent && options?.isFinal !== false) {
                console.log(`[Robust JSON Parser] Phục hồi thành công ${items.length} phần tử mảng riêng lẻ từ khối lỗi ${Array.isArray(keyName) ? keyName.join('|') : keyName}!`);
              }
              return items;
            }
          }
          if (!options?.silent && options?.isFinal !== false) {
            console.error(`[Regex] Không thể parse block ${Array.isArray(keyName) ? keyName.join('|') : keyName}:`, e3);
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * 3. Bóc tách dữ liệu trực tiếp bằng Regex (Phòng tuyến dự phòng cực mạnh khi JSON bị hỏng nát)
 * Bóc tách các thông tin: worldTime, mcLocation, outline, suggestedActions, và tất cả các trường "part" ghép lại thành cốt truyện chính.
 */
export function regexExtractGameplayData(
  rawText: string,
  options?: { isFinal?: boolean; silent?: boolean }
): GameplayParsedData | null {
  try {
    const data: GameplayParsedData = {};
    let hasData = false;

    // A. Trích xuất worldTime
    const worldTimeMatch = rawText.match(/"worldTime"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (worldTimeMatch) {
      data.worldTime = decodeJsonEscapeSymbols(worldTimeMatch[1]);
      hasData = true;
    }

    // A2. Trích xuất weather
    const weatherMatch = rawText.match(/"weather"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (weatherMatch) {
      data.weather = decodeJsonEscapeSymbols(weatherMatch[1]);
      hasData = true;
    }

    // B. Trích xuất mcLocation
    const mcLocMatch = rawText.match(/"mcLocation"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (mcLocMatch) {
      data.mcLocation = decodeJsonEscapeSymbols(mcLocMatch[1]);
      hasData = true;
    }

    // B2. Trích xuất npcLocations
    const npcLocsBlockMatch = rawText.match(/"npcLocations"\s*:\s*\[([\s\S]*?)\]/);
    if (npcLocsBlockMatch) {
      const npcLocsBlock = npcLocsBlockMatch[1];
      const npcItemPattern = /\{\s*"(?:id|name|fullName)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"location"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*\}/gi;
      const npcsList: any[] = [];
      let itemMatch;
      while ((itemMatch = npcItemPattern.exec(npcLocsBlock)) !== null) {
        npcsList.push({
          id: decodeJsonEscapeSymbols(itemMatch[1]),
          location: decodeJsonEscapeSymbols(itemMatch[2])
        });
      }
      if (npcsList.length > 0) {
        data.npcLocations = npcsList;
        hasData = true;
      }
    }

    // B3. Trích xuất worldStateUpdate
    const worldStateUpdateMatch = rawText.match(/"worldStateUpdate"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (worldStateUpdateMatch) {
      data.worldStateUpdate = decodeJsonEscapeSymbols(worldStateUpdateMatch[1]);
      hasData = true;
    }

    // C. Trích xuất outline
    const outlineMatch = rawText.match(/"outline"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (outlineMatch) {
      data.outline = decodeJsonEscapeSymbols(outlineMatch[1]);
      hasData = true;
    }
    const memoryMatch = rawText.match(/"memory"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
    if (memoryMatch) {
      data.memory = decodeJsonEscapeSymbols(memoryMatch[1]);
      hasData = true;
    } else {
       // Thử tìm trong khối json_memory
       const memBlockMatch = rawText.match(/<json_memory>[\s\S]*?"memory"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"[\s\S]*?(?:<\/json_memory>|$)/i);
       if (memBlockMatch) {
          data.memory = decodeJsonEscapeSymbols(memBlockMatch[1]);
          hasData = true;
       }
    }

    // D. Trích xuất tất cả các trường "part..." dưới dạng danh sách và sắp xếp để ghép thành mainText
    data.mainText = extractAllStoryTextsRobust(rawText);
    if (data.mainText) {
      hasData = true;
    }

    // D2. Trích xuất mcUpdates, npcUpdates, newNPCs bằng hàm phân tích block JSON
    const mcUpdatesBlock = extractJsonBlock(rawText, ["mcUpdates", "mcUpdate", "playerUpdate", "mc_updates"], "object", options);
    if (mcUpdatesBlock) {
      data.mcUpdates = mcUpdatesBlock;
      hasData = true;
    } else {
      // Thử xem nó có nằm trong <json_MC> block mà không có key mcUpdates không
      const mcBlockMatch = rawText.match(/<json_MC>\s*(\{[\s\S]*?\})\s*(?:<\/json_MC>|$)/i);
      if (mcBlockMatch) {
        try {
          const parsed = JSON.parse(mcBlockMatch[1]);
          if (parsed.mcUpdates) {
             data.mcUpdates = parsed.mcUpdates;
             hasData = true;
          } else {
             // Maybe the whole block is mcUpdates
             data.mcUpdates = parsed;
             hasData = true;
          }
        } catch(e) {}
      }
    }

    const npcUpdatesBlock = extractJsonBlock(rawText, ["npcUpdates", "npcUpdate", "npcsUpdate", "npc_updates"], "array", options);
    if (npcUpdatesBlock) {
      data.npcUpdates = npcUpdatesBlock;
      hasData = true;
    }

    const newNPCsBlock = extractJsonBlock(rawText, ["newNPCs", "newNpcs", "new_npcs"], "array", options);
    if (newNPCsBlock) {
      data.newNPCs = newNPCsBlock;
      hasData = true;
    }

    const codexUpdatesBlock = extractJsonBlock(rawText, ["codexUpdates", "codexUpdate", "codex_updates"], "object", options);
    if (codexUpdatesBlock) {
      data.codexUpdates = codexUpdatesBlock;
      hasData = true;
    }

    // E. Trích xuất suggestedActions
    const suggestedActionsBlock = extractJsonBlock(rawText, ["suggestedActions", "options", "choices"], "array", options);
    if (suggestedActionsBlock) {
      // Loại bỏ các rác sinh ra do AI điền \n lơ lửng trong mảng
      data.suggestedActions = Array.isArray(suggestedActionsBlock) ? suggestedActionsBlock.filter((item: any) => {
        if (typeof item === 'string' && (item.trim() === 'n' || item.trim() === '\\n' || item.trim() === '')) return false;
        return true;
      }) : suggestedActionsBlock;
      hasData = true;
    } else {
      // Tìm mảng suggestedActions thô
      const actionsBlockMatch = rawText.match(/["']?(?:suggestedActions|options|choices)["']?\s*:\s*\[([\s\S]*?)\]/i);
      if (actionsBlockMatch) {
        const actionsBlock = actionsBlockMatch[1];
        const actions: any[] = [];
        
        // Tìm từng đối tượng { ... } bên trong mảng
        const objectPattern = /\{[\s\S]*?\}/g;
        let objMatch;
        while ((objMatch = objectPattern.exec(actionsBlock)) !== null) {
          const objStr = objMatch[0];
          const actionMatch = objStr.match(/["']?(?:action|text|title|name|option)["']?\s*:\s*["']([^"\\]*(?:\\.[^"\\]*)*)["']/i);
          const detailsMatch = objStr.match(/["']?(?:details|description)["']?\s*:\s*["']([^"\\]*(?:\\.[^"\\]*)*)["']/i);
          const timeCostMatch = objStr.match(/["']?timeCost["']?\s*:\s*["']([^"\\]*(?:\\.[^"\\]*)*)["']/i);
          const successRateMatch = objStr.match(/["']?successRate["']?\s*:\s*["']([^"\\]*(?:\\.[^"\\]*)*)["']/i);
          const gainsLossesMatch = objStr.match(/["']?gainsLosses["']?\s*:\s*["']([^"\\]*(?:\\.[^"\\]*)*)["']/i);
          
          if (actionMatch) {
            actions.push({
              action: decodeJsonEscapeSymbols(actionMatch[1]),
              details: detailsMatch ? decodeJsonEscapeSymbols(detailsMatch[1]) : undefined,
              timeCost: timeCostMatch ? decodeJsonEscapeSymbols(timeCostMatch[1]) : undefined,
              successRate: successRateMatch ? decodeJsonEscapeSymbols(successRateMatch[1]) : undefined,
              gainsLosses: gainsLossesMatch ? decodeJsonEscapeSymbols(gainsLossesMatch[1]) : undefined
            });
          }
        }
        
        // Fallback: if it's an array of strings (only if there are no objects)
        if (actions.length === 0 && !actionsBlock.includes('{')) {
          const stringPattern = /["']([^"\\]*(?:\\.[^"\\]*)*)["']/g;
          let strMatch;
          while ((strMatch = stringPattern.exec(actionsBlock)) !== null) {
            const val = decodeJsonEscapeSymbols(strMatch[1]);
            if (val && val.trim().length > 0) {
              actions.push({ action: val });
            }
          }
        }
        
        if (actions.length > 0) {
          data.suggestedActions = actions;
          hasData = true;
        }
      }
    }

    return hasData ? data : null;
  } catch (e) {
    console.error("Lỗi khi trích xuất Regex dự phòng:", e);
    return null;
  }
}

/**
 * Giải mã các ký tự escape trong JSON thô (như \" -> ", \n -> xuống dòng...)
 */
function decodeJsonEscapeSymbols(str: string): string {
  return str
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\\*/g, '*');
}

/**
 * Loại bỏ triệt để 100% các từ liên quan đến cờ bàn (bàn cờ, ván cờ, quân cờ, nước cờ) và thay thế bằng từ ngữ ngữ cảnh phù hợp
 */
export function sanitizeBannedWords(text: string): string {
  if (!text) return "";
  let sanitized = text;
  
  // Thay thế "bàn cờ" bằng "thế cuộc"
  sanitized = sanitized.replace(/bàn cờ/g, "thế cuộc");
  sanitized = sanitized.replace(/Bàn cờ/g, "Thế cuộc");
  sanitized = sanitized.replace(/BÀN CỜ/g, "THẾ CUỘC");
  
  // Thay thế "ván cờ" bằng "thế trận" hoặc "cuộc chơi"
  sanitized = sanitized.replace(/ván cờ/g, "thế trận");
  sanitized = sanitized.replace(/Ván cờ/g, "Thế trận");
  sanitized = sanitized.replace(/VÁN CỜ/g, "THẾ TRẬN");
  
  // Thay thế "quân cờ" bằng "nhân tố" hoặc "con rối"
  sanitized = sanitized.replace(/quân cờ/g, "nhân tố");
  sanitized = sanitized.replace(/Quân cờ/g, "Nhân tố");
  sanitized = sanitized.replace(/QUÂN CỜ/g, "NHÂN TỐ");
  
  // Thay thế "nước cờ" bằng "bước đi" hoặc "mưu tính"
  sanitized = sanitized.replace(/nước cờ/g, "bước đi");
  sanitized = sanitized.replace(/Nước cờ/g, "Bước đi");
  sanitized = sanitized.replace(/NƯỚC CỜ/g, "BƯỚC ĐI");
  
  return sanitized;
}

/**
 * Đệ quy làm sạch toàn bộ dữ liệu JSON khỏi các từ ngữ bị cấm
 */

/**
 * Lọc bỏ/tách Custom Tag dạng [key:Nội dung] thành "Nội dung" thuần túy đối với chuỗi văn bản.
 * Ví dụ: "[location:Trường Học]" -> "Trường Học"
 *        "Hỏi [npcNu:Misha] về [item:Cá nướng]" -> "Hỏi Misha về Cá nướng"
 */
export function stripCustomTagsFromText(text: string): string {
  if (!text || typeof text !== "string") return text;
  // Dùng stripShortTags phân tích đệ quy độ sâu ngoặc để xóa tag lồng nhau chuẩn xác
  let clean = stripShortTags(text);
  // Thay thế các tag phẳng còn lại nếu có
  clean = clean.replace(/\[[a-zA-Z0-9_]+:\s*([^\]]+)\]/g, "$1");
  return clean.trim();
}

/**
 * Đệ quy làm sạch toàn bộ dữ liệu JSON khỏi các Custom Tag nằm NGOÀI mainText (như location, weather, suggestedActions, mcData, npcUpdates, v.v.)
 */
export function cleanCustomTagsOutsideMainText(obj: any, parentKey?: string): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Nếu là phần chính văn (mainText) hoặc các part ghép nối mainText (part1, part2...), giữ nguyên custom tag để UI tô màu
    if (parentKey === "mainText" || (parentKey && /^part\d+/i.test(parentKey))) {
      return obj;
    }
    // Đối với các trường tư duy / suy nghĩ hệ thống, giữ nguyên
    if (parentKey === "reasoning" || parentKey === "thinking" || parentKey === "thinking_process") {
      return obj;
    }

    // Làm sạch custom tag [key:Nội dung] -> "Nội dung"
    let cleaned = stripCustomTagsFromText(obj);

    // Xử lý bổ sung cho các trường tên địa điểm / thời tiết / vị trí nếu AI lỡ bọc trong ngoặc vuông như "[Trường Học]"
    if (parentKey && /location|weather|worldtime/i.test(parentKey)) {
      cleaned = cleaned.replace(/^\[([^\]]+)\]$/, "$1").trim();
    }

    return cleaned;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanCustomTagsOutsideMainText(item, parentKey));
  }

  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key === "mainText") {
          newObj[key] = obj[key]; // Bảo toàn 100% mainText
        } else {
          newObj[key] = cleanCustomTagsOutsideMainText(obj[key], key);
        }
      }
    }
    return newObj;
  }

  return obj;
}

export function deepSanitizeBannedWords(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === "string") {
    return sanitizeBannedWords(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitizeBannedWords(item));
  }
  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = deepSanitizeBannedWords(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

/**
 * Trích xuất tất cả các trường cốt truyện từ JSON thô một cách an toàn nhất, tránh lún sâu vào các regex dọn dẹp làm mất dấu câu
 */
export function extractAllStoryTextsRobust(rawText: string): string {
  if (!rawText) return "";
  
  // Danh sách lưu trữ các phần truyện tìm thấy kèm vị trí để giữ đúng thứ tự xuất hiện
  const storyParts: Array<{ key: string; index: number; text: string }> = [];
  
  // Regex tìm các nhãn key chứa văn bản chính của truyện
  const keyPattern = /"(mainText|content|part\d+[a-zA-Z0-9_]*)"\s*:\s*"/g;
  let match;
  
  while ((match = keyPattern.exec(rawText)) !== null) {
    const key = match[1];
    if (key.toLowerCase().includes('audit')) continue; // Bỏ qua các key là audit giả dạng part

    const matchStart = match.index;
    const startIdx = keyPattern.lastIndex;
    
    let val = "";
    let escapeNext = false;
    let i = startIdx;
    
    for (; i < rawText.length; i++) {
      const char = rawText[i];
      if (escapeNext) {
        val += char;
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        val += char;
        continue;
      }
      if (char === '"') {
        // Gặp dấu nháy kép đóng thực tế
        // Kiểm tra xem đằng sau nó có phải là dấu phân cách hợp lệ của JSON không
        let isRealEnd = false;
        for (let j = i + 1; j < rawText.length; j++) {
          const nextChar = rawText[j];
          if (/\s/.test(nextChar)) continue;
          if (nextChar === '}' || nextChar === ']') {
            isRealEnd = true;
          } else if (nextChar === ',') {
            // Kiểm tra xem sau dấu phẩy có phải là một key JSON tiếp theo hoặc kết thúc object không
            const afterComma = rawText.substring(j + 1);
            if (/^\s*("[a-zA-Z0-9_]+"\s*:|\}|\])/.test(afterComma)) {
              isRealEnd = true;
            }
          } else if (nextChar === '"') {
            const upcoming = rawText.substring(j, j + 30);
            if (/^"[a-zA-Z0-9_]+"\s*:/.test(upcoming)) {
              isRealEnd = true;
            }
          }
          break;
        }
        
        if (isRealEnd || i === rawText.length - 1) {
          break;
        } else {
          // AI viết lậu dấu nháy kép không escape (VD: <span style="color...">)
          val += char;
          continue;
        }
      }
      val += char;
    }
    
    const decodedVal = decodeJsonEscapeSymbols(val).trim();
    if (decodedVal) {
      storyParts.push({
        key,
        index: matchStart,
        text: decodedVal
      });
    }
  }

  if (storyParts.length === 0) {
    return "";
  }

  // Phân loại và sắp xếp các phần cốt truyện
  // Thường cốt truyện thế hệ mới sẽ được chia nhỏ thành "part1", "part2", "part3"...
  const parts = storyParts.filter(p => p.key.startsWith("part"));
  if (parts.length > 0) {
    const uniquePartsMap = new Map<string, { key: string; index: number; text: string }>();
    parts.forEach(p => uniquePartsMap.set(p.key, p));
    const uniqueParts = Array.from(uniquePartsMap.values());

    uniqueParts.sort((a, b) => {
      const matchA = a.key.match(/^part(\d+)/i);
      const matchB = b.key.match(/^part(\d+)/i);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      if (numA !== numB) return numA - numB;
      return a.index - b.index;
    });
    return uniqueParts.map(p => p.text).join("\n\n");
  }

  // Nếu không chia nhỏ thành "part", ưu tiên lấy "mainText" hoặc "content"
  const mainTexts = storyParts.filter(p => p.key === "mainText" || p.key === "content");
  if (mainTexts.length > 0) {
    const uniqueMainTextsMap = new Map<string, { key: string; index: number; text: string }>();
    mainTexts.forEach(p => uniqueMainTextsMap.set(p.key, p));
    const uniqueMainTexts = Array.from(uniqueMainTextsMap.values());

    uniqueMainTexts.sort((a, b) => a.index - b.index);
    return uniqueMainTexts.map(p => p.text).join("\n\n");
  }

  // Cuối cùng là trường "outline"
  const outlines = storyParts.filter(p => p.key === "outline");
  if (outlines.length > 0) {
    const uniqueOutlinesMap = new Map<string, { key: string; index: number; text: string }>();
    outlines.forEach(p => uniqueOutlinesMap.set(p.key, p));
    const uniqueOutlines = Array.from(uniqueOutlinesMap.values());

    uniqueOutlines.sort((a, b) => a.index - b.index);
    return uniqueOutlines.map(p => p.text).join("\n\n");
  }

  return "";
}

/**
 * 4. Hàm làm sạch thô (Lọc sạch 100% rác rưởi lập trình)
 * Khi không thể phân tích cấu trúc được nữa, lọc bỏ các thẻ bọc, dấu ngoặc, biến JSON
 * để biến kết quả thô thành bài văn truyện sạch bong hoàn mỹ.
 */
export function cleanRawOutputText(text: string): string {
  if (!text) return "";

  // SỬ DỤNG CHƯƠNG TRÌNH KHAI THÁC ROBUST TRƯỚC: Nếu văn bản rỗng nát dính cấu trúc JSON,
  // hàm bóc tách robust sẽ lấy phần truyện gốc giữ chính xác 100% các ký tự dấu câu của AI.
  const robustExtractedStory = extractAllStoryTextsRobust(text);
  if (robustExtractedStory) {
    return sanitizeBannedWords(robustExtractedStory);
  }

  let cleaned = text;

  // A. Loại bỏ khối THINKING_PROCESS đầu tiên và triệt để
  cleaned = cleaned.replace(/<npc_list>[\s\S]*?<\/npc_list>/gi, "");
  cleaned = cleaned.replace(/<THINKING_PROCESS>[\s\S]*?<\/THINKING_PROCESS>/gi, "");
  
  // Nếu thẻ chưa đóng, tìm xem phía sau có <json_output>, ```json, hoặc dấu { không để chia cắt hợp lý
  const thinkingStartIdx = cleaned.toLowerCase().indexOf("<thinking_process>");
  if (thinkingStartIdx !== -1) {
    const afterThinking = cleaned.substring(thinkingStartIdx);
    let cutTo = -1;
    const jsonUpdateStart = afterThinking.toLowerCase().indexOf("<json_update>");
    const jsonMcStart = afterThinking.toLowerCase().indexOf("<json_mc>");
    const jsonOutputStart = afterThinking.toLowerCase().indexOf("<json_output>");
    const jsonMemoryStart = afterThinking.toLowerCase().indexOf("<json_memory>");
    const jsonActionsStart = afterThinking.toLowerCase().indexOf("<json_actions>");
    const markdownJsonStart = afterThinking.toLowerCase().indexOf("```json");
    const curlyBraceStart = afterThinking.indexOf("{");
    
    if (jsonUpdateStart !== -1) {
      cutTo = jsonUpdateStart;
    } else if (jsonMcStart !== -1) {
      cutTo = jsonMcStart;
    } else if (jsonOutputStart !== -1) {
      cutTo = jsonOutputStart;
    } else if (jsonMemoryStart !== -1) {
      cutTo = jsonMemoryStart;
    } else if (jsonActionsStart !== -1) {
      cutTo = jsonActionsStart;
    } else if (markdownJsonStart !== -1) {
      cutTo = markdownJsonStart;
    } else if (curlyBraceStart !== -1) {
      cutTo = curlyBraceStart;
    }
    
    if (cutTo !== -1) {
      cleaned = cleaned.substring(0, thinkingStartIdx) + "\n" + afterThinking.substring(cutTo);
    } else {
      // Nếu hoàn toàn không có dấu vết cấu trúc nào, ta chỉ cắt bỏ dòng chứa thẻ và vài dòng suy nghĩ đầu tiên
      // hoặc giữ nguyên nếu không chắc chắn, tránh làm trống hoàn toàn phản hồi
      cleaned = cleaned.replace(/<THINKING_PROCESS>[\s\S]*/gi, "");
    }
  }

  // B. Loại bỏ các thẻ XML/HTML của game
  cleaned = cleaned.replace(/<\/?json_update>/gi, "");
  cleaned = cleaned.replace(/<\/?json_MC>/gi, "");
  cleaned = cleaned.replace(/<\/?json_output>/gi, "");
  cleaned = cleaned.replace(/<\/?json_memory>/gi, "");
  cleaned = cleaned.replace(/<\/?json_actions>/gi, "");
  cleaned = cleaned.replace(/<\/?npc_list>/gi, "");
  cleaned = cleaned.replace(/<\/?thinking_process>/gi, "");

  // C. Loại bỏ các khối code markdown
  cleaned = cleaned.replace(/```json/gi, "");
  cleaned = cleaned.replace(/```/g, "");

  // D. Loại bỏ cấu trúc ngoặc nhọn JSON bao bọc tổng thể
  // Nếu chuỗi bắt đầu với { và kết thúc bằng }, dọn dẹp nó
  cleaned = cleaned.trim();
  if (cleaned.startsWith("{")) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.endsWith("}")) {
    cleaned = cleaned.slice(0, -1);
  }

  // E. Giải mã các ký hiệu newline trong text (\n thành xuống dòng thực) và unescape ngoặc kép TỪ SỚM TRƯỚC KHI LỌC
  cleaned = cleaned.replace(/\\n/g, "\n");
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/\\r/g, "");

  // F. Loại bỏ các khóa JSON phổ biến và các chuỗi ngoặc kéo dính líu
  const keysToRemove = [
    /"worldTime"\s*:\s*"[^"]*",?/gi,
    /"worldStateUpdate"\s*:\s*"[^"]*",?/gi,
    /"mcLocation"\s*:\s*"[^"]*",?/gi,
    /"npcLocations"\s*:\s*\[[\s\S]*?\]/gi,
    /"outline"\s*:\s*"[^"]*",?/gi,
    /"suggestedActions"\s*:\s*\[[\s\S]*?\]/gi,
    /"options"\s*:\s*\[[\s\S]*?\]/gi,
    /"choices"\s*:\s*\[[\s\S]*?\]/gi,
    /"mcUpdates"\s*:\s*\{[\s\S]*?\}/gi,
    /"npcUpdates"\s*:\s*\[[\s\S]*?\]/gi,
    /"newNPCs"\s*:\s*\[[\s\S]*?\]/gi,
    /"ghi_chu"\s*:\s*"[^"]*",?/gi,
    /"audit[a-zA-Z0-9_]*"\s*:\s*"[^"]*",?/gi
  ];

  keysToRemove.forEach(p => {
    cleaned = cleaned.replace(p, "");
  });

  // G. Loại bỏ các tên key JSON thô sơ (như "part1": " hoặc ""part5_pacing_editor": ")
  cleaned = cleaned.replace(/"*[a-zA-Z0-9_]+"\s*:\s*"/gi, "");
  
  // H. Loại bỏ các chuỗi dính dấu ngoặc kép và dấu phẩy ở cuối dòng
  // Lưu ý sửa đổi regex để tránh lột nhầm nháy thoại hợp lệ của cốt truyện ở cuối dòng
  cleaned = cleaned.replace(/",\s*$/gm, "");
  
  // I. Loại bỏ các ký tự lập trình thừa thãi khác còn sót lại
  cleaned = cleaned.replace(/^\s*[{}[\]],?\s*$/gm, ""); // Loại bỏ các dòng chỉ có dấu đóng mở ngoặc
  
  // J. Formatting dòng
  return sanitizeBannedWords(cleaned
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim());
}

/**
 * 5. BỘ CHUYỂN HOÀN CHỈNH: Trải qua các phòng tuyến bền bỉ để xử lý phản hồi từ AI
 */
export function robustParseGameplayJSON(
  rawT: string,
  options?: { isFinal?: boolean; silent?: boolean }
): { parsedData: GameplayParsedData | null; isFallback: boolean } {
  if (!rawT) return { parsedData: null, isFallback: true };

  const sanitizedRaw = cleanProxyRetryGarbage(rawT);

  // Thu thập tất cả các ứng viên khối JSON từ phản hồi của AI
  const jsonBlockCandidates: string[] = [];

  // Cách 1: Tách các khối bọc bởi thẻ <json_update>, <json_output>, <json_actions> và <json_MC>
  const mcMatches = [...sanitizedRaw.matchAll(/<json_MC>([\s\S]*?)(?:<\/json_MC>|$)/gi)];
  mcMatches.forEach(m => {
    if (m[1] && m[1].trim()) jsonBlockCandidates.push(m[1].trim());
  });
  // Khử thẻ tư duy bộc lộ ở đầu nếu còn dính (không phân biệt chữ hoa chữ thường)
  let cleanRaw = sanitizedRaw;
  const thinkingStartRegex = /<thinking_process>/i;
  const matchThinking = cleanRaw.match(thinkingStartRegex);
  if (matchThinking && matchThinking.index !== undefined) {
    const startIdx = matchThinking.index;
    const endIdx = cleanRaw.toLowerCase().indexOf("</thinking_process>");
    if (endIdx !== -1 && endIdx > startIdx) {
      // Có thẻ đóng hợp lệ
      cleanRaw = cleanRaw.substring(0, startIdx).trim() + "\n" + cleanRaw.substring(endIdx + 19).trim();
    } else {
      // Không có thẻ đóng hợp lệ (bị đứt đoạn hoặc AI quên đóng)
      // Tìm xem có thẻ định dạng JSON hoặc dấu cấu trúc nào ở phía sau không để cắt chính xác phần suy nghĩ dở dang
      let cutTo = -1;
      const jsonUpdateStart = cleanRaw.toLowerCase().indexOf("<json_update>");
      const jsonMcStart = cleanRaw.toLowerCase().indexOf("<json_mc>");
      const jsonOutputStart = cleanRaw.toLowerCase().indexOf("<json_output>");
      const jsonMemoryStart = cleanRaw.toLowerCase().indexOf("<json_memory>");
      const jsonActionsStart = cleanRaw.toLowerCase().indexOf("<json_actions>");
      const markdownJsonStart = cleanRaw.toLowerCase().indexOf("```json");
      const firstCurlyBrace = cleanRaw.substring(startIdx).indexOf("{");
      if (jsonUpdateStart !== -1 && jsonUpdateStart > startIdx) {
        cutTo = jsonUpdateStart;
      } else if (jsonMcStart !== -1 && jsonMcStart > startIdx) {
        cutTo = jsonMcStart;
      } else if (jsonOutputStart !== -1 && jsonOutputStart > startIdx) {
        cutTo = jsonOutputStart;
      } else if (jsonMemoryStart !== -1 && jsonMemoryStart > startIdx) {
        cutTo = jsonMemoryStart;
      } else if (jsonActionsStart !== -1 && jsonActionsStart > startIdx) {
        cutTo = jsonActionsStart;
      } else if (markdownJsonStart !== -1 && markdownJsonStart > startIdx) {
        cutTo = markdownJsonStart;
      } else if (firstCurlyBrace !== -1) {
        cutTo = startIdx + firstCurlyBrace;
      }
      if (cutTo !== -1) {
        cleanRaw = cleanRaw.substring(cutTo).trim();
      }
    }
  }

  // Cách 1: Tách các khối bọc bởi thẻ <json_update>, <json_output> và <json_actions>
  const updateMatches = [...cleanRaw.matchAll(/<json_update>([\s\S]*?)(?:<\/json_update>|$)/gi)];
  updateMatches.forEach(m => {
    if (m[1] && m[1].trim()) jsonBlockCandidates.push(m[1].trim());
  });

  const outputMatches = [...cleanRaw.matchAll(/<json_output>([\s\S]*?)(?:<\/json_output>|$)/gi)];
  outputMatches.forEach(m => {
    if (m[1] && m[1].trim()) jsonBlockCandidates.push(m[1].trim());
  });

  const actionsMatches = [...cleanRaw.matchAll(/<json_actions>([\s\S]*?)(?:<\/json_actions>|$)/gi)];
  actionsMatches.forEach(m => {
    if (m[1] && m[1].trim()) jsonBlockCandidates.push(m[1].trim());
  });

  const memoryMatches = [...cleanRaw.matchAll(/<json_memory>([\s\S]*?)(?:<\/json_memory>|$)/gi)];
  memoryMatches.forEach(m => {
    if (m[1] && m[1].trim()) jsonBlockCandidates.push(m[1].trim());
  });

  // Cách 2: Tách các khối markdown ```json ... ```
  const mdJsonMatches = [...cleanRaw.matchAll(/```json([\s\S]*?)(?:```|$)/gi)];
  mdJsonMatches.forEach(m => {
    if (m[1] && m[1].trim()) jsonBlockCandidates.push(m[1].trim());
  });

  // Cách 3: Nếu vẫn không bóc được khối nào bằng thẻ, hoặc để tăng cường khả năng gộp,
  // ta quét tìm tất cả các khối { ... } cân bằng ngoặc cấp cao nhất (top-level balanced curly braces)
  const balancedBlocks: string[] = [];
  let braceCount = 0;
  let startIdx = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < cleanRaw.length; i++) {
    const char = cleanRaw[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        if (braceCount === 0) {
          startIdx = i;
        }
        braceCount++;
      } else if (char === '}') {
        if (braceCount > 0) {
          braceCount--;
          if (braceCount === 0 && startIdx !== -1) {
            balancedBlocks.push(cleanRaw.substring(startIdx, i + 1));
            startIdx = -1;
          }
        }
      }
    }
  }
  // Xử lý khối dở dang nếu kết thúc chuỗi mà braceCount > 0
  if (braceCount > 0 && startIdx !== -1) {
    balancedBlocks.push(cleanRaw.substring(startIdx));
  }

  // Gom toàn bộ ứng viên, lọc trùng lặp chuỗi
  balancedBlocks.forEach(b => {
    const bTrim = b.trim();
    if (bTrim && !jsonBlockCandidates.some(c => c.includes(bTrim) || bTrim.includes(c))) {
      jsonBlockCandidates.push(bTrim);
    }
  });

  let mergedData: any = {};
  let totalFixedCount = 0;
  let hasValidJson = false;

  // Quét qua tất cả ứng viên khối JSON để sửa và parse
  jsonBlockCandidates.forEach(block => {
    let cleanBlock = block.replace(/```json/gi, "").replace(/```/g, "").trim();
    if (!cleanBlock || !cleanBlock.startsWith("{")) return;

    // Sửa các cặp thuộc tính HTML bên trong dòng thoại
    let processedJson = escapeLiteralNewlinesInJson(cleanBlock.replace(/(style|class|id|color|href)\s*=\s*(?:\\*["'])?\s*([^"'>\\]+)\s*(?:\\*["'])?(?=\s|>|\/)/gi, '$1=\\"$2\\"'));

    let parsedBlock: any = null;

    // 1. Thử parse trực tiếp JSON gốc
    try {
      parsedBlock = JSON.parse(processedJson);
      hasValidJson = true;
    } catch (e1) {
      // 2. Thử dùng jsonrepair tiêu chuẩn
      try {
        const repaired = jsonrepair(processedJson);
        parsedBlock = JSON.parse(repaired);
        hasValidJson = true;
      } catch (e2) {
        // 3. Thử sửa JSON dở dang + jsonrepair
        try {
          const repairedTruncated = jsonrepair(repairTruncatedJson(processedJson));
          parsedBlock = JSON.parse(repairedTruncated);
          hasValidJson = true;
        } catch (e3) {
          // 4. Lưới an toàn fallback performDeepJsonAutoFixAndTrack
          try {
            const autoFixed = performDeepJsonAutoFixAndTrack(processedJson, sanitizedRaw);
            parsedBlock = JSON.parse(autoFixed.repairedJson);
            hasValidJson = true;
            
            const severeErrors = autoFixed.reports.filter(r => ['comma', 'brace', 'bracket'].includes(r.category));
            totalFixedCount += severeErrors.length;
          } catch (e4) {
            // 5. Nếu parse vẫn sập, dùng Regex bóc tách thủ công trên khối này
            const regexData = regexExtractGameplayData(processedJson, options);
            if (regexData) {
              parsedBlock = regexData;
              hasValidJson = true;
            }
          }
        }
      }
    }

    if (parsedBlock && typeof parsedBlock === 'object') {
      mergedData = { ...mergedData, ...parsedBlock };
    }
  });

  // LƯỚI AN TOÀN TỐI THƯỢNG: Chạy Regex bóc tách trực tiếp trên TOÀN BỘ văn bản phản hồi thô gốc cleanRaw
  // Bất kỳ trường quan trọng nào (worldTime, weather, mcLocation, npcLocations, worldStateUpdate, outline, mainText, suggestedActions...)
  // bị thiếu hoặc trống trong mergedData sẽ được bổ sung đầy đủ từ globalRegexData!
  const globalRegexData = regexExtractGameplayData(cleanRaw);
  if (globalRegexData) {
    hasValidJson = true;
    for (const key of Object.keys(globalRegexData)) {
      const val = (globalRegexData as any)[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val.trim() !== '') {
          if (!mergedData[key] || (typeof mergedData[key] === 'string' && mergedData[key].trim() === '')) {
            mergedData[key] = val;
          }
        } else if (Array.isArray(val) && val.length > 0) {
          if (!mergedData[key] || !Array.isArray(mergedData[key]) || mergedData[key].length === 0) {
            mergedData[key] = val;
          }
        } else if (typeof val === 'object' && Object.keys(val).length > 0) {
          if (!mergedData[key] || typeof mergedData[key] !== 'object' || Object.keys(mergedData[key]).length === 0) {
            mergedData[key] = val;
          }
        }
      }
    }
  }

  if (!hasValidJson && Object.keys(mergedData).length === 0) {
    return { parsedData: null, isFallback: true };
  }

  // TỰ ĐỘNG GHÉP NỐI TOÀN BỘ CÁC TRƯỜNG "part..." THÀNH "mainText" NẾU CHƯA CÓ TRƯỜNG NÀY
  // Điều này đảm bảo trò chơi luôn có cốt truyện chính văn đầy đủ chữ và liền mạch 100%
  if (mergedData && (!mergedData.mainText || mergedData.mainText.trim() === "")) {
    const parts = Object.keys(mergedData)
      .filter(k => /^part\d+/i.test(k) && !k.toLowerCase().includes("audit"))
      .sort((a, b) => {
        const matchA = a.match(/^part(\d+)/i);
        const matchB = b.match(/^part(\d+)/i);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      })
      .map(k => mergedData[k]);

    if (parts.length > 0) {
      mergedData.mainText = parts
        .filter(Boolean)
        .map((t: any) => typeof t === "string" ? t.replace(/\\n/g, "\n") : t)
        .join("\n\n");
    }
  }

  // Nếu thực sự có can thiệp sửa lỗi cấu trúc nghiêm trọng thì hiển thị thông báo toast tinh tế
  if (totalFixedCount > 0) {
    toast.success("Hệ thống tự động đồng bộ cú pháp AI", {
      description: `Đã tự động sửa ${totalFixedCount} lỗi dấu cấu trúc nghiêm trọng từ mô hình để trò chơi vận hành mượt mà...`
    });
  }

  // Loại bỏ các rác sinh ra do AI điền \n lơ lửng trong mảng
  if (mergedData && Array.isArray(mergedData.suggestedActions)) {
    mergedData.suggestedActions = mergedData.suggestedActions.filter((item: any) => {
      if (typeof item === 'string' && (item.trim() === 'n' || item.trim() === '\\n' || item.trim() === '')) return false;
      return true;
    });
  }

  const tagsCleanedData = cleanCustomTagsOutsideMainText(mergedData);
  const sanitizedData = deepSanitizeBannedWords(tagsCleanedData);
  return { parsedData: sanitizedData, isFallback: false };
}
