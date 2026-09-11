const fs = require('fs');
const content = fs.readFileSync('src/utils/worldCreationSystemInstruction.ts', 'utf8');

const newRule = `3c. CHỐNG VĂN DỊCH MÁY VÀ LẠM DỤNG HÁN VIỆT SƯỢNG SÙNG (BẮT BUỘC):
- TUYỆT ĐỐI KHÔNG dùng các sản phẩm của quá trình dịch máy (Machine Translation) và việc lạm dụng từ Hán Việt một cách sượng sùng (dịch word-by-word từ tiếng Trung hoặc tiếng Anh). Dù người đọc vẫn có thể hiểu, nhưng trong văn phong chuẩn thuần Việt, nó nghe vô cùng lai căng và thiếu tự nhiên.
- Dưới đây là các ví dụ trực quan về cách chuyển đổi từ ngữ Hán Việt/Dịch máy sượng sùng sang Tiếng Việt tự nhiên:
  + Lỗi "Thanh thúy" (thường dùng tả âm thanh trong truyện Tàu): Thay vì "Giọng nói thanh thúy / Tiếng vỡ thanh thúy", HÃY DÙNG "Giọng nói trong trẻo / Tiếng vỡ giòn tan / lanh lảnh".
  + Lỗi "Chật vật": Thay vì "Anh ta thoạt nhìn phi thường chật vật", HÃY DÙNG "Anh ta trông vô cùng thảm hại / xơ xác / tơi tả / khốn đốn" (Chật vật trong tiếng Việt chuẩn thường dùng cho hoàn cảnh, ví dụ: "sống chật vật", chứ ít dùng miêu tả bề ngoài).
  + Lỗi "Quỷ dị": Thay vì "Nụ cười quỷ dị / Bầu không khí quỷ dị", HÃY DÙNG "Nụ cười quái dị / kì dị / rợn người / Bầu không khí ma quái".
  + Lỗi "Băng lãnh / Lãnh ý": Thay vì "Ánh mắt băng lãnh", HÃY DÙNG "Ánh mắt lạnh lẽo / lạnh lùng / buốt giá".
  + Lỗi "Thuận thế": Thay vì "Cô ta thuận thế ngã vào lòng anh", HÃY DÙNG "Cô ta thừa cơ ngã vào lòng anh / mượn đà ngã vào lòng anh / thuận đà".
  + Lỗi "Ám ách": Thay vì "Giọng nói ám ách", HÃY DÙNG "Giọng nói khàn khàn / trầm đục".
  + Lỗi "Tát kiều / Làm nũng sượng sùng": Thay vì "Cô ta đang tát kiều / làm nũng một cách vô lý", HÃY DÙNG "Cô ta đang nũng nịu / nhõng nhẽo".
  + Lỗi "Tức giận đến bật cười": Thay vì "Hắn tức giận đến bật cười", HÃY DÙNG "Hắn tức quá hóa cười / Cơn giận khiến hắn phì cười".
  + Lỗi "Trong mắt xẹt qua một tia...": Thay vì "Trong mắt hắn xẹt qua một tia tàn nhẫn", HÃY DÙNG "Ánh mắt hắn lóe lên vẻ tàn nhẫn / Đáy mắt hắn thoáng qua tia tàn nhẫn".
  + Lỗi "Cười lạnh": Thay vì "Hắn cười lạnh một tiếng", HÃY DÙNG "Hắn cười khẩy / cười nhạt / cười gằn / hừ lạnh".
  + Lỗi "Ngưng trọng": Thay vì "Sắc mặt hắn ngưng trọng", HÃY DÙNG "Sắc mặt hắn nghiêm nghị / trầm trọng / nặng nề".
  + Lỗi "Mất tự nhiên": Thay vì "Cô ho khan một tiếng, mất tự nhiên quay đầu", HÃY DÙNG "Cô ho khan, gượng gạo quay đầu đi / bối rối quay đầu đi".
  + Lỗi "Huyết nhục": Thay vì "Huyết nhục bay tứ tung", HÃY DÙNG "Máu thịt be bét / Máu thịt văng tung tóe".
  + Lỗi "Tráng kiện": Thay vì "Thân thể tráng kiện", HÃY DÙNG "Thân hình cường tráng / vạm vỡ / khỏe mạnh".
  + Lỗi "Mỹ lệ": Thay vì "Khuôn mặt mỹ lệ", HÃY DÙNG "Khuôn mặt xinh đẹp / tuyệt trần / kiều diễm".
  + Lỗi Cấu trúc tiếng Anh "Make someone do something": Thay vì "Nụ cười của cô làm tôi cảm thấy...", HÃY DÙNG "Nụ cười của cô khiến tôi...".
  + Lỗi "Sở hữu": Thay vì "Anh ta sở hữu một đôi mắt xanh", HÃY DÙNG "Anh ta có đôi mắt xanh".
- Yêu cầu AI luôn ý thức dùng từ vựng phong phú, thuần Việt và phù hợp văn cảnh (đặc biệt khi viết tiểu thuyết).`;

// The target is to insert this right before "4. ĐỌC KỸ THIẾT LẬP NHÂN VẬT & CHỐNG OOC TUYỆT ĐỐI:"
const searchStr = '4. ĐỌC KỸ THIẾT LẬP NHÂN VẬT & CHỐNG OOC TUYỆT ĐỐI:';

let count = 0;
const newContent = content.split('\n').map(line => {
    if (line.includes(searchStr)) {
        count++;
        return newRule + '\n' + line;
    }
    return line;
}).join('\n');

fs.writeFileSync('src/utils/worldCreationSystemInstruction.ts', newContent, 'utf8');
console.log('Replaced ' + count + ' occurrences');
