/**
 * Bộ lọc từ nhạy cảm và thô thiển cấp mã nguồn dành cho Matrix Lite v6.
 * không cần thay thế bằng từ gợi cảm, chỉ giữ lại danh từ gốc và bảo toàn định dạng/viết hoa.
 */

export function processShortCustomTags(
  input: string,
  transformFn: (rawKey: string, innerContent: string) => string
): string {
  if (!input || typeof input !== "string") return input;

  let result = "";
  let i = 0;
  const len = input.length;

  while (i < len) {
    const openIdx = input.indexOf('[', i);
    if (openIdx === -1) {
      result += input.slice(i);
      break;
    }

    result += input.slice(i, openIdx);
    i = openIdx;

    const match = input.slice(i).match(/^\[#?([a-zA-Z0-9_]+)\s*:/);
    if (!match) {
      result += '[';
      i++;
      continue;
    }

    const rawKey = match[1];
    const prefixLen = match[0].length;
    let depth = 1;
    let endIdx = -1;

    for (let j = i + prefixLen; j < len; j++) {
      const char = input[j];
      if (char === '[') {
        depth++;
      } else if (char === ']') {
        depth--;
        if (depth === 0) {
          endIdx = j;
          break;
        }
      }
    }

    if (endIdx !== -1) {
      const innerContent = input.slice(i + prefixLen, endIdx);
      const processedInner = processShortCustomTags(innerContent, transformFn);
      const replacement = transformFn(rawKey, processedInner);
      result += replacement;
      i = endIdx + 1;
    } else {
      const nextNewline = input.indexOf('\n', i + prefixLen);
      const cutIdx = nextNewline !== -1 ? nextNewline : len;
      const innerContent = input.slice(i + prefixLen, cutIdx);
      const processedInner = processShortCustomTags(innerContent, transformFn);
      const replacement = transformFn(rawKey, processedInner);
      result += replacement;
      i = cutIdx;
    }
  }

  return result;
}

export function stripShortTags(text: string): string {
  if (!text || typeof text !== "string") return text;
  return processShortCustomTags(text, (_key, content) => content);
}

export function filterSensitiveWords(text: string, worldTags: string[] = []): string {
  const easternTags = [
    "tiên hiệp", "tu chân", "huyền huyễn", "kiếm hiệp", "võ hiệp", "linh dị", "cổ đại", "cổ trang", "phương đông"
  ];
  const westernTags = [
    "fantasy", "isekai", "anime", "manga", "light novel", "game", "acg", "hiện đại", "sci-fi", "khoa học viễn tưởng", "phương tây", "hiện đại phương tây", "thành thị"
  ];

  const isEastern = worldTags.some(t => {
    const lower = t.toLowerCase();
    return easternTags.some(k => lower.includes(k));
  });

  const isWesternOrModern = worldTags.some(t => {
    const lower = t.toLowerCase();
    return westernTags.some(k => lower.includes(k));
  });
  
  const shouldReplaceEasternWords = isWesternOrModern || !isEastern;
  if (!text) return text;
  // Tách văn bản thành từng dòng để bảo toàn tuyệt đối các dấu xuống dòng và ngắt đoạn cốt truyện
  const lines = text.split("\n");
  const processedLines = lines.map(line => {
    let sanitized = line.normalize("NFC");

    // 2. Xóa hoàn toàn số đo 3 vòng khô khan (e.g. "90-60-90", "90 - 60 - 90")
    const threeRoundsPattern = /\b\d{2,3}\s*[-–—]\s*\d{2,3}\s*[-–—]\s*\d{2,3}\b/g;
    sanitized = sanitized.replace(threeRoundsPattern, "");

    // 3. Xóa hoàn toàn số đo chiều cao & cân nặng khô khan trong chính văn
    const heightPattern = /\bcao\s*(?:khoảng|chừng)?\s*(?:\d+m\d+|\d+(?:[.,]\d+)?\s*(?:cm|mét|m))\b/gi;
    sanitized = sanitized.replace(heightPattern, "");

    const weightPattern = /\bnặng\s*(?:khoảng|chừng)?\s*\d+(?:[.,]\d+)?\s*(?:kg|cân|kí|kilôgam)\b/gi;
    sanitized = sanitized.replace(weightPattern, "");

    const replaceCase = (regex: RegExp, replacement: string | string[]) => {
      sanitized = sanitized.replace(regex, (match) => {
        if (!match) return Array.isArray(replacement) ? replacement[0] : replacement;
        const actualReplacement = Array.isArray(replacement) 
            ? replacement[Math.floor(Math.random() * replacement.length)] 
            : replacement;
        const firstChar = match.charAt(0);
        if (firstChar === firstChar.toUpperCase() && firstChar.toLowerCase() !== firstChar.toUpperCase()) {
          return actualReplacement.charAt(0).toUpperCase() + actualReplacement.slice(1);
        }
        return actualReplacement.charAt(0).toLowerCase() + actualReplacement.slice(1);
      });
    };

    // 4. Thay thế/làm sạch các từ cờ bàn và từ cấm rập khuôn (Không dùng \b với từ tiếng Việt có dấu)
    replaceCase(/ngai ngái của/gi, "nồng ướt của");
    replaceCase(/ngai\s+ngái/gi, "nồng ướt");
    replaceCase(/xạ\s+hương/gi, "nồng nàn");
    replaceCase(/thanh\s+thúy/gi, "trong trẻo");
    replaceCase(/hai\s+háng/gi, "háng");
    if (shouldReplaceEasternWords) {
      replaceCase(/tửu\s+quán/gi, "quán rượu");
      replaceCase(/tửu\s+lâu/gi, "quán rượu");
      replaceCase(/khách\s+điếm/gi, "nhà trọ");
      replaceCase(/canh\s+giờ/gi, "giờ");
      replaceCase(/nam\s+tử\s+hán/gi, "chàng trai");
      replaceCase(/trong\s+đan\s+điền/gi, "trong cơ thể");
      replaceCase(/đan\s+điền/gi, "cơ thể");
      replaceCase(/giáng\s+lâm/gi, "xuất hiện");
      replaceCase(/dương\s+khí/gi, "sức sống");
      replaceCase(/âm\s+khí/gi, "năng lượng hắc ám");
    }
    replaceCase(/bàn\s+cờ/gi, "thế cuộc");
    replaceCase(/ván\s+cờ/gi, "thế trận");
    replaceCase(/quân\s+cờ/gi, "nhân tố");
    replaceCase(/nước\s+cờ/gi, "bước đi");
    replaceCase(/sóng\s+vai/gi, "sánh bước");
    replaceCase(/phồn\s+thực/gi, ["gợi cảm", "quyến rũ", "bốc lửa", "đầy đặn", "nảy nở", "căng mọng", "nóng bỏng"]);
    replaceCase(/hoa\s+huyệt/gi, "âm đạo");
    replaceCase(/tư\s+mật/gi, "âm đạo");
    replaceCase(/tộc\s+tinh\s+linh/gi, "tộc Elf");
    replaceCase(/người\s+tinh\s+linh/gi, "người Elf");
    replaceCase(/cổ\s+tử\s+cung/gi, "tử cung");
    replaceCase(/ống\s+âm\s+đạo/gi, "âm đạo");
    sanitized = sanitized.replace(/(nước\s+mắt)\s+sinh\s+lý/gi, "$1");
    replaceCase(/dịch\s+nhầy\s+sinh\s+lý/gi, "dịch tiết");
    sanitized = sanitized.replace(/(giọt\s+lệ)\s+sinh\s+lý/gi, "$1");
    replaceCase(/phản\s+ứng\s+sinh\s+lý/gi, "phản ứng cơ thể");
    sanitized = sanitized.replace(/(khoái\s+cảm)\s+sinh\s+lý/gi, "$1");
    sanitized = sanitized.replace(/(nhu\s+cầu)\s+sinh\s+lý/gi, "$1");
    sanitized = sanitized.replace(/(bản\s+năng)\s+sinh\s+lý/gi, "$1");
    sanitized = sanitized.replace(/(đòi\s+hỏi)\s+sinh\s+lý/gi, "$1");
    sanitized = sanitized.replace(/(thỏa\s+mãn)\s+sinh\s+lý/gi, "$1");
    replaceCase(/sinh\s+lý/gi, "cơ thể"); // Catch-all cho các từ "sinh lý" còn sót lại
    replaceCase(/võng\s+mạc/gi, "tầm mắt");
    replaceCase(/đồng\s+tử/gi, "tròng mắt");
    replaceCase(/đại\s+não/gi, "tâm trí");
    sanitized = sanitized.replace(/(cọ\s+xát|va\s+chạm|đâm|nhấp|thúc|tiến\s+vào)\s+chí\s+mạng/gi, "$1 mãnh liệt");
    replaceCase(/hoang\s+tàn/gi, "hoang dại");
    replaceCase(/sưng\s+cứng/gi, "căng cứng");
    replaceCase(/sưng\s+tấy/gi, "nhạy cảm");
    replaceCase(/sưng\s+mọng/gi, "căng mọng");
    replaceCase(/sưng\s+vù/gi, "căng tròn");
    replaceCase(/đoạt\s+mệnh/gi, "cuồng nhiệt");
    replaceCase(/đoạt\s+mạng/gi, "cuồng nhiệt");
    replaceCase(/thô\s+ráp/gi, "rắn rỏi");
    replaceCase(/mềm\s+nhão/gi, "mềm mịn");
    replaceCase(/bản\s+năng\s+nguyên\s+thủy/gi, "khao khát tự nhiên");
    replaceCase(/ngọn\s+lửa\s+chiếm\s+hữu\s+nguyên\s+thủy/gi, "sự khao khát nồng nàn");
    replaceCase(/ngọn\s+lửa\s+chiếm\s+hữu/gi, "sự khao khát");
    replaceCase(/bản\s+năng\s+thú\s+tính/gi, "sự cuồng nhiệt");
    replaceCase(/râm\s+rỉ/gi, "râm ran");
    replaceCase(/thành\s+thạo(?=\s+(?:của|đường|vẻ|vóc|thân|bầu|dáng|nét))/gi, "thành thục");
    replaceCase(/tiền\s+phong/gi, "tiên phong");
    replaceCase(/tiền\s+đạo/gi, "tiên phong");
    sanitized = sanitized.replace(/(^|[^a-zA-Z0-9_À-ỹ])(?:khóe\s+môi|khẽ\s+nhếch|môi)?(?:\s*\.\.\.|\s*,\s*|\s+)?à\s+không(?![a-zA-Z0-9_À-ỹ])/gi, "$1");
    sanitized = sanitized.replace(/(?:lượng\s+)?(?:hormone|hotmone|nội\s+tiết\s+tố)\s*(?:nữ\s+tính|nam\s+tính)?/gi, "dục vọng");
    sanitized = sanitized.replace(/\b(?:hormone|hotmone|nội\s+tiết\s+tố)\b/gi, "dục vọng");
    replaceCase(/xôn\s+xao\s+trong\s+lòng/gi, "xốn xang trong lòng");
    replaceCase(/cảm\s+giác\s+xôn\s+xao/gi, "cảm giác xốn xang");

    // 5. Lọc bỏ các cụm Cup ngực, cỡ ngực, size ngực & chữ cái định cỡ (cỡ D, cup F, size E, 36D...)
    // A. Xóa cả cụm chứa cỡ/size/cup/cúp + chữ cái/số đo (ví dụ: "cỡ Cup D", "cỡ D", "cup D", "cúp D", "size E", "D cup", "E-cup", "cỡ 75B")
    sanitized = sanitized.replace(/(^|[^a-zA-Z0-9_À-ỹ])(?:cỡ|size)\s+(?:cup|cúp)\s*[-–—]?\s*[a-gA-G0-9]+/gi, "$1");
    sanitized = sanitized.replace(/(cup|cúp)\s*[-–—]?\s*[a-gA-G0-9]+/gi, "");
    sanitized = sanitized.replace(/(^|[^a-zA-Z0-9_À-ỹ])[a-gA-G]\s*[-–—]?\s*(?:cup|cúp)(?![a-zA-Z0-9_À-ỹ])/gi, "$1");
    sanitized = sanitized.replace(/(^|[^a-zA-Z0-9_À-ỹ])(?:cỡ|size)\s+[-–—]?\s*[a-gA-G0-9]+(?![a-zA-Z0-9_À-ỹ])/gi, "$1");

    // B. Xóa các cụm "cỡ ngực", "cup ngực", "cúp ngực", "size ngực"
    sanitized = sanitized.replace(/(^|[^a-zA-Z0-9_À-ỹ])(?:cỡ|cup|cúp|size)\s+ngực(?![a-zA-Z0-9_À-ỹ])/gi, "$1");

    // C. Xóa các từ 'cỡ/size' thừa đứng trước tính từ tả ngực (ví dụ: "cỡ khổng lồ" -> "khổng lồ", "cỡ đầy đặn" -> "đầy đặn")
    sanitized = sanitized.replace(/(^|[^a-zA-Z0-9_À-ỹ])(?:cỡ|size)\s+(?=(?:đầy|căng|khổng|đồ|nhỏ|vừa|nảy|nhô|lớn|to|tròn|mọng)\b)/gi, "$1");

    // D. Xóa từ "cup" hoặc "cúp" đơn lẻ còn sót lại
    sanitized = sanitized.replace(/(^|[^a-zA-Z0-9_À-ỹ])(?:cup|cúp)(?![a-zA-Z0-9_À-ỹ])/gi, "$1");

    // ==========================================
    // DỌN DẸP KHOẢNG TRẮNG VÀ DẤU CÂU THỪA SAU KHI XÓA TRÊN TỪNG DÒNG
    // ==========================================
    // Dọn dẹp lặp từ do filter
    sanitized = sanitized.replace(/(đẫy đà)(?:[\s,]*đẫy đà)+/gi, "$1");
    sanitized = sanitized.replace(/(căng đầy)(?:[\s,]*căng đầy)+/gi, "$1");
    sanitized = sanitized.replace(/(gợi cảm|quyến rũ|bốc lửa|đầy đặn|nảy nở|căng mọng|nóng bỏng)(?:[\s,]*và[\s,]*|\s*,\s*)\1+/gi, "$1");
    sanitized = sanitized.replace(/(gợi cảm)(?:[\s,]*gợi cảm)+/gi, "$1");
    sanitized = sanitized.replace(/(quyến rũ)(?:[\s,]*quyến rũ)+/gi, "$1");
    
    // Cấm lách luật dùng dấu 3 chấm để nhếch mép
    sanitized = sanitized.replace(/nhếch\s*\.\.\.\s*khẽ\s*mỉm\s*cười/gi, "mỉm cười");
    sanitized = sanitized.replace(/nhếch\s*\.\.\./gi, "khẽ");

    // Xóa dấu phẩy mồ côi hoặc lặp lại (e.g., ", , " hoặc ",,") do các cụm từ bị xóa liên tiếp
    sanitized = sanitized.replace(/,\s*,/g, ",");
    sanitized = sanitized.replace(/,\s*\./g, ".");
    
    // Dọn dẹp khoảng trắng trước dấu câu (e.g., " . " -> " .")
    sanitized = sanitized.replace(/[ \t]+([.,?!;])/g, "$1");
    
    // Dọn dẹp khoảng trắng kép (CHỈ dùng khoảng trắng ngang [ \t] để tránh nuốt mất dấu xuống dòng \n)
    sanitized = sanitized.replace(/[ \t]+/g, " ");
    
    // Sửa lỗi dấu phẩy ở đầu hoặc cuối câu sau khi xóa cụm từ
    sanitized = sanitized.replace(/^\s*,\s*/g, "");
    sanitized = sanitized.replace(/,\s*$/g, "");

        // Hotfix cho lỗi "m thanh" thay vì "Âm thanh"
    sanitized = sanitized.replace(/(^|[\s\.:;?!,])m thanh\b/g, "$1Âm thanh");
    sanitized = sanitized.replace(/(^|[\s\.:;?!,])M thanh\b/g, "$1Âm thanh");
    
    return sanitized.trim();
  });

  // Ghép lại các dòng bằng dấu xuống dòng nguyên bản
  return processedLines.join("\n");
}
