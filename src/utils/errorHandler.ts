export function cleanErrorMessage(msg: string): string {
  if (!msg) return "";
  
  if (msg.includes("Lỗi API:")) {
    return msg.trim();
  }
  
  if (msg.includes("[Chi tiết lỗi gốc từ server AI]:")) {
    return msg.trim();
  }

  // Bắt các lỗi HTML/Cloudflare (524 Timeout, 502/503 Gateway Error, v.v.)
  if (msg.includes("<!DOCTYPE") || msg.includes("<html") || msg.includes("cf-error") || msg.includes("Cloudflare")) {
    if (msg.includes("524") || msg.toLowerCase().includes("timeout")) {
      return "Lỗi thời gian chờ Proxy (Cloudflare 524 Timeout): Máy chủ Proxy phản hồi quá chậm (vượt quá 100 giây). Vui lòng đổi sang mô hình nhanh hơn (như Gemini Flash) hoặc kiểm tra lại kết nối Proxy.";
    }
    if (msg.includes("502") || msg.includes("503") || msg.includes("504")) {
      return "Lỗi kết nối máy chủ Proxy (Gateway Error): Máy chủ Proxy hiện đang bị quá tải hoặc tạm thời ngưng hoạt động. Vui lòng kiểm tra lại Cài đặt Proxy.";
    }
    return "Lỗi kết nối máy chủ Proxy/API: Máy chủ trả về trang lỗi HTML thay vì dữ liệu AI. Vui lòng kiểm tra lại địa chỉ Proxy hoặc API Key.";
  }

  // Rút gọn các lỗi chứa stack trace hoặc JSON rườm rà
  if (msg.includes("throwErrorIfNotOK") || msg.includes("ApiError:") || msg.includes("node_modules")) {
    return "Lỗi kết nối hoặc xử lý nội bộ phía máy chủ AI. Dữ liệu hồi đáp bị bất định, bạn hãy chờ ít giây rồi thử lại tải (F5).";
  }
  
  return msg;
}

export function formatErrorMessage(error: any): { type: string; message: string; solution: string; code?: string } {
  const rawMsg = error?.message || error?.statusText || String(error);
  const cleanedMsg = cleanErrorMessage(rawMsg);
  
  // Extract error code (3-digit HTTP status code) or inner code
  const errorCodeMatch = rawMsg.match(/\b(40[0-9]|4[1-9][0-9]|50[0-9]|5[1-9][0-9])\b/);
  const foundCode = errorCodeMatch ? errorCodeMatch[1] : error?.status ? String(error.status) : "";
  const errorCodeStr = foundCode ? ` [Code: ${foundCode}]` : "";

  if (cleanedMsg.includes("Lỗi API:")) {
     return {
        type: `Lỗi Máy Chủ AI (Google API)${errorCodeStr}`,
        message: cleanedMsg,
        solution: "- Làm theo hướng dẫn ở phần tin nhắn lỗi phía trên."
     };
  }
  
  if (cleanedMsg.includes("[Chi tiết lỗi gốc từ server AI]:")) {
     return {
        type: `Chi tiết lỗi gốc từ server AI${errorCodeStr}`,
        message: cleanedMsg,
        solution: "- Đọc chi tiết lỗi từ máy chủ trả về ở trên."
     };
  }

  const errStr = rawMsg.toLowerCase();
  if (errStr.includes("safety") || errStr.includes("block_reason") || errStr.includes("finishreason: safety")) {
    return {
      type: `Lỗi Cảnh Cáo An Toàn (Safety Filter)${errorCodeStr}`,
      message: cleanedMsg,
      solution: "- Văn cảnh hiện tại chứa nhiều yếu tố nhạy cảm (NSFW, bạo lực kịch liệt, ...).\n- Hãy thử diễn đạt lời nói giảm nhẹ hơn, tránh từ ngữ trực tiếp bị Google cấm.\n- Kiểm tra thiết lập màng lọc an toàn API nếu có mã code riêng."
    };
  }

  if (errStr.includes("fetch") || errStr.includes("network") || errStr.includes("internet") || errStr.includes("failed to fetch")) {
    return {
      type: `Lỗi Mạng (Network/Internet)${errorCodeStr}`,
      message: cleanedMsg,
      solution: "- Kiểm tra mạng máy tính (Wifi/LAN) hoặc tường lửa trình duyệt đang chặn.\n- Extension dạng Ad-blocker đôi lúc chặn kết nối ra ngoài, hãy tạm tắt chặn quảng cáo.\n- Nhấn F5 tải lại tab."
    };
  }

  if (errStr.includes("json") || errStr.includes("parse") || errStr.includes("end of json") || errStr.includes("expected ','")) {
    return {
      type: `Lỗi Giải Mã JSON (Parsing)${errorCodeStr}`,
      message: cleanedMsg,
      solution: "- AI tạo ra định dạng câu chữ bị nát, thiếu móc ngoặc nên hệ thống không đọc được.\n- Thử nhấn tạo tiếp (Retry) để AI suy nghĩ logic tạo lại cấu trúc mới nguyên vẹn."
    };
  }
  
  return {
    type: `Lỗi Hệ Thống Lạ (Unknown Exception)${errorCodeStr}`,
    message: cleanedMsg,
    solution: "- Có lỗi ngầm định lạ nào đó chưa rõ, chụp màn hình gửi Dev fix giùm nha.\n- Nhanh nhất là F5 trình duyệt để reset luồng."
  };
}

export function generateSysLog(error: any): { message: string, type: 'error' } {
  const formatted = formatErrorMessage(error);
  const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  return {
    message: `[${timeStr}] 🔴 LOẠI LỖI: ${formatted.type}\n📌 MÔ TẢ: ${formatted.message}\n💡 CÁCH KHẮC PHỤC: \n${formatted.solution}\n----------------------------------------\n`,
    type: 'error'
  };
}

export function normalizeUsage(u: any) {
  if (!u) return { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
  
  const promptTokenCount = u.promptTokenCount ?? u.prompt_tokens ?? u.inputTokenCount ?? 0;
  const candidatesTokenCount = u.candidatesTokenCount ?? u.completion_tokens ?? u.outputTokenCount ?? 0;
  const totalTokenCount = u.totalTokenCount ?? u.total_tokens ?? u.totalTokenCount ?? (promptTokenCount + candidatesTokenCount);
  
  return {
    promptTokenCount,
    candidatesTokenCount,
    totalTokenCount
  };
}
