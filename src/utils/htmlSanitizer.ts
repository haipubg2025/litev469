import { useStore } from "../store/useStore";
import { DEFAULT_COLOR_CONFIG, DEFAULT_LIGHT_COLOR_CONFIG } from "../components/ColorModal";

/**
 * Cơ chế Tự động chuẩn hóa & Phục hồi HTML (HTML Sanitizer & Fixer)
 * Xây dựng màng lọc xử lý trước khi render hoặc khi sửa lỗi JSON.
 * Bất kể AI viết nháy đơn ', nháy kép ", hay hỗn hợp '...", hệ thống sẽ tự động bắt regex
 * và sửa lại chuẩn xác thành <span style="color: #HEX">...</span>, đảm bảo thẻ màu hiển thị rực rỡ.
 */

export function fixInlineSpanCapitalization(text: string): string {
  return text;
}

export function sanitizeAndFixInlineHtml(text: string): string {
  if (!text) return "";
  let result = text;
  
  // Unescape các thẻ span bị AI chuyển thành HTML entities hoặc bị escape bằng backslash
  result = result.replace(/&lt;(\/?span.*?)&gt;/gi, "<$1>");
  result = result.replace(/\\<(\/?span.*?)\\>/gi, "<$1>");
  result = result.replace(/\\<(\/?span.*?)>/gi, "<$1>");
  result = result.replace(/<(\/?span.*?)\\>/gi, "<$1>");

  // 0. Khử và chuyển đổi các thẻ span bị AI viết nhầm dạng thô (rò rỉ mã HTML thô như <span style='color: #npcQuanChung: hoặc <span style='color: #key'>)
  result = result.replace(/<span\s+style=['"]?color:\s*#?([a-zA-Z0-9_]+):?['"]?\s*>?/gi, (match, key) => {
    // Nếu key là mã HEX hợp lệ (3 đến 8 ký tự hex)
    if (/^[0-9a-fA-F]{3,8}$/.test(key)) {
      let hex = '#' + key;
      if (key.length === 3) {
        hex = '#' + key[0] + key[0] + key[1] + key[1] + key[2] + key[2];
      }
      return `<span style="color: ${hex}">`;
    }

    // Nếu key là tên Custom Tag (như npcQuanChung, mc, npcNam, npcNu, vuKhi, item...)
    try {
      const storeState = (useStore as any)?.getState ? (useStore as any).getState() : null;
      const isDark = storeState?.isDarkTheme ?? true;
      const customColors = storeState?.colorConfig || {};
      const colorMap = isDark ? DEFAULT_COLOR_CONFIG : DEFAULT_LIGHT_COLOR_CONFIG;
      const lowerKey = key.toLowerCase();

      const foundColor = customColors[key] || customColors[lowerKey] || (colorMap as any)[key] || (colorMap as any)[lowerKey];
      if (foundColor) {
        return `<span style="color: ${foundColor}">`;
      }
    } catch {
      // ignore
    }

    // Nếu không khớp màu hay key nào hợp lệ, dọn dẹp thẻ thô bị hỏng để không làm rò rỉ mã ra màn hình
    return "";
  });

  // 1. Chuẩn hóa thẻ <span ...> siêu mạnh: Quét tìm trực tiếp mã HEX/RGB bên trong thẻ để phục hồi
  // Bất chấp tag bị nát đến mức nào (ví dụ: <span style="color:" #FF99CC">)
  result = result.replace(
    /<span\b[^>]*?(?:color|style)\s*[:=][^>]*?>/gi,
    (match) => {
      // Tìm mã HEX
      const hexMatch = match.match(/#[0-9a-fA-F]{3,8}/);
      if (hexMatch) {
        let hex = hexMatch[0];
        if (hex.length === 4) {
          hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        return `<span style="color: ${hex}">`;
      }
      
      // Tìm mã RGB/HSL
      const funcMatch = match.match(/(?:rgb|hsl)a?\([^)]+\)/);
      if (funcMatch) return `<span style="color: ${funcMatch[0]}">`;
      
      // Tìm tên màu cơ bản
      const colorNameMatch = match.match(/(?:color\s*[:=]\s*(?:\\*['"])?\s*)(red|blue|green|yellow|purple|pink|orange|cyan|magenta|black|white|gray|grey)\b/i);
      if (colorNameMatch) return `<span style="color: ${colorNameMatch[1]}">`;

      return match;
    }
  );

  // 2. Chuẩn hóa các thẻ HTML inline khác có thuộc tính style/class/id bị lỗi nháy hỗn hợp
  result = result.replace(
    /<([a-z0-9]+)\b[^>]*?(style|class|id|href)\s*=\s*(?:\\*['"])?([^"'>]+?)(?:\\*['"])?\s*>/gi,
    (match, tag, attr, val) => {
      if (tag.toLowerCase() === "span" && (attr.toLowerCase() === "style" || attr.toLowerCase() === "color")) {
        return match; // Đã xử lý chuyên sâu ở trên
      }
      return `<${tag} ${attr}="${val.replace(/['"]/g, "").trim()}">`;
    }
  );

  // 3. Phục hồi thẻ đóng </span> nếu số lượng mở và đóng không cân bằng
  const openSpanCount = (result.match(/<span\b[^>]*>/gi) || []).length;
  const closeSpanCount = (result.match(/<\/span>/gi) || []).length;
  if (openSpanCount > closeSpanCount) {
    result += "</span>".repeat(openSpanCount - closeSpanCount);
  }

  return fixInlineSpanCapitalization(result);
}

export function stripHtmlTags(text: any): string {
  if (typeof text === "object" && text !== null) return JSON.stringify(text, null, 2);
  if (text === undefined || text === null) return "";
  const str = String(text);
  if (!str) return "";
  return str.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
}
