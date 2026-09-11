const fs = require('fs');

let content = fs.readFileSync('src/utils/gameplaySystemInstruction.ts', 'utf-8');

// I will insert a new rule about Outfits and SFW descriptions into the "QUY ĐỊNH NGHIÊM NGẶT VỀ SFW / NSFW" block.
// Wait, the "QUY ĐỊNH NGHIÊM NGẶT VỀ SFW / NSFW" block was moved to rule 10.5 in the earlier steps. Let's find exactly where 10.5 is.
const rule105_header = `10.5. CHỈ THỊ TUYỆT ĐỐI CHỐNG NHẦM LẪN SFW & NSFW VÀ THOÁT CẢNH NSFW (ANTI-SLOP & ANTI-HALLUCINATION):`;
const insertIndex = content.indexOf(rule105_header);

if (insertIndex !== -1) {
    const nextLineIndex = content.indexOf('\n', insertIndex);
    const textToInsert = `\n- HẠN CHẾ MIÊU TẢ CƠ THỂ VÀ TRANG PHỤC GỢI CẢM TRONG SFW: Trong các bối cảnh SFW bình thường, TUYỆT ĐỐI KHÔNG miêu tả trang phục hoặc các chi tiết trên trang phục quá gợi cảm, hở hang (ví dụ: khoe ngực sâu, lộ viền nội y, quần áo ướt sũng dính sát...) nếu nó KHÔNG PHÙ HỢP với thể loại truyện hoặc hoàn cảnh hiện tại. Đồng thời, hạn chế tối đa việc tập trung miêu tả quá sâu vào các đường cong cơ thể khi không cần thiết, giữ cho cảnh SFW đúng bản chất trong sáng và tập trung vào cốt truyện/hành động.`;
    
    content = content.slice(0, nextLineIndex) + textToInsert + content.slice(nextLineIndex);
    fs.writeFileSync('src/utils/gameplaySystemInstruction.ts', content);
    console.log("Patched 10.5 successfully.");
} else {
    console.log("Could not find rule 10.5 header.");
}
