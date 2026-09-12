import re

with open('src/utils/gameplaySystemInstruction.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = '"IN_THIS_JSON_OUTPUT": "CẢNH BÁO TỐI QUAN TRỌNG: CHỈ CẬP NHẬT KHI THẬT SỰ CẦN THIẾT. VỚI statusData: nộp LẠI toàn bộ trạng thái chưa bị xoá + trạng thái MỚI! NẾU BẠN PHÁT HIỆN BẤT KỲ TRƯỜNG DỮ LIỆU NÀO CỦA MC (NHƯ height, weight, measurements...) ĐANG BỊ THIẾU, TRỐNG HOẶC CHỨA CỤM TỪ \'Không có dữ liệu.\', BẠN BẮT BUỘC PHẢI TỰ ĐỘNG SÁNG TẠO DỮ LIỆU LOGIC ĐỂ BỔ SUNG NGAY LẬP TỨC VÀO ĐÂY. Tuyệt đối không xuất dòng ghi chú này!"'

replacement = '"IN_THIS_JSON_OUTPUT": "KIỂM TRA CHÉO VỚI BẢNG DỮ LIỆU ĐẦU VÀO CỦA MC: BẠN PHẢI QUÉT QUA TẤT CẢ CÁC TRƯỜNG HIỆN CÓ CỦA MC NÀY (Tùy thuộc vào bảng Mặc Định hay Custom). ĐẶC BIỆT LƯU Ý: NẾU BẠN NHÌN THẤY BẤT KỲ TRƯỜNG DỮ LIỆU NÀO CỦA MC (Đặc biệt là các trường như height, weight, measurements...) ĐANG CÓ GIÁ TRỊ LÀ \'Không có dữ liệu.\', BẠN BẮT BUỘC PHẢI TỰ ĐỘNG SUY LUẬN SÁNG TẠO RA DỮ LIỆU LOGIC ĐỂ BỔ SUNG NGAY LẬP TỨC VÀO ĐÂY BẰNG CÁCH TẠO KEY ĐÓ VÀ ĐIỀN NỘI DUNG VÀO! TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ QUA HOẶC ĐỂ TRỐNG NỮA! VỚI statusData: nộp LẠI toàn bộ trạng thái chưa bị xoá + trạng thái MỚI! Tuyệt đối không xuất dòng ghi chú này!"'

if target in content:
    content = content.replace(target, replacement)
    print("Patched mcUpdates JSON instructions in gameplaySystemInstruction")
else:
    print("Could not find mcUpdates target in gameplaySystemInstruction")

with open('src/utils/gameplaySystemInstruction.ts', 'w', encoding='utf-8') as f:
    f.write(content)
