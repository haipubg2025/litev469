import re

with open('src/utils/gameplaySystemInstruction.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = """"LƯU_Ý_KHI_XUẤT_JSON": "TẤT CẢ CÁC TRƯỜNG DỮ LIỆU ĐỀU CẦN ĐƯỢC THEO DÕI VÀ ĐƯỢC PHÉP CẬP NHẬT NẾU THẬT SỰ CẦN THIẾT. BẤT CỨ TRƯỜNG NÀO CÓ SỰ THAY ĐỔI LỚN ĐỀU PHẢI ĐƯA VÀO XÁC NHẬN. NẾU BẠN PHÁT HIỆN BẤT KỲ TRƯỜNG DỮ LIỆU NÀO CỦA NPC (NHƯ height, weight, measurements...) ĐANG BỊ THIẾU, TRỐNG HOẶC CHỨA CỤM TỪ 'Không có dữ liệu.', BẠN BẮT BUỘC PHẢI TỰ ĐỘNG SÁNG TẠO DỮ LIỆU LOGIC ĐỂ BỔ SUNG NGAY LẬP TỨC VÀO ĐÂY. VỚI BẢNG MẶC ĐỊNH, TUYỆT ĐỐI KHÔNG CẬP NHẬT/CHỈNH SỬA 'appearance' NHƯNG VỚI BẢNG TÙY CHỈNH THÌ ĐƯỢC. Đừng làm mất statusData vĩnh viễn cũ. KHI CẬP NHẬT, HÃY PHÂN LOẠI: Với các trường 'tính cách', 'tiểu sử' -> Copy nội dung cũ và chèn thêm mới. VỚI CÁC TRƯỜNG 'mục tiêu', 'bí mật', 'trạng thái' (các sự kiện có tính thời điểm) -> NẾU SỰ VIỆC ĐÃ KẾT THÚC, BẮT BUỘC PHẢI GHI ĐÈ/XÓA BỎ thông tin cũ, không được copy lại nguyên văn gây rác bộ nhớ (VD: Nợ đã trả thì xóa dòng 'đang nợ', thay bằng 'đã trả xong nợ'). (KHI CẬP NHẬT QUAN HỆ relationships BẮT BUỘC ĐIỀN ĐẦY ĐỦ CẢ 'impression', 'termsOfAddress', VÀ 'selfAppellation' DƯỚI DẠNG MẢNG. BẮT BUỘC XÓA BỎ CÁCH XƯNG HÔ CŨ ĐÃ LỖI THỜI. ĐẶC BIỆT Ở 'selfAppellation': NGHIÊM CẤM TỰ XƯNG BẰNG TÊN RIÊNG).","""

replacement = """"LƯU_Ý_KHI_XUẤT_JSON": "KIỂM TRA CHÉO VỚI BẢNG DỮ LIỆU ĐẦU VÀO CỦA NPC (BẢN HIỆN HÀNH / SỐ 2): BẠN PHẢI QUÉT QUA TẤT CẢ CÁC TRƯỜNG HIỆN CÓ CỦA NPC NÀY (Tùy thuộc vào bảng Mặc Định hay Custom). ĐẶC BIỆT LƯU Ý: NẾU BẠN NHÌN THẤY BẤT KỲ TRƯỜNG DỮ LIỆU NÀO CỦA NPC (Đặc biệt là các trường như height, weight, measurements...) ĐANG CÓ GIÁ TRỊ LÀ 'Không có dữ liệu.', BẠN BẮT BUỘC PHẢI TỰ ĐỘNG SUY LUẬN SÁNG TẠO RA DỮ LIỆU LOGIC (Dựa trên độ tuổi, tính cách, mô tả hiện tại của NPC) ĐỂ BỔ SUNG NGAY LẬP TỨC VÀO ĐÂY BẰNG CÁCH TẠO KEY ĐÓ VÀ ĐIỀN NỘI DUNG VÀO! TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ QUA HOẶC ĐỂ TRỐNG NỮA! NGOÀI RA, BẤT CỨ TRƯỜNG NÀO CÓ SỰ THAY ĐỔI LỚN TRONG CỐT TRUYỆN ĐỀU PHẢI ĐƯA VÀO ĐỂ CẬP NHẬT. Đừng làm mất statusData vĩnh viễn cũ. KHI CẬP NHẬT, HÃY PHÂN LOẠI: Với các trường 'tính cách', 'tiểu sử' -> Copy nội dung cũ và chèn thêm mới. VỚI CÁC TRƯỜNG 'mục tiêu', 'bí mật', 'trạng thái' (các sự kiện có tính thời điểm) -> NẾU SỰ VIỆC ĐÃ KẾT THÚC, BẮT BUỘC PHẢI GHI ĐÈ/XÓA BỎ thông tin cũ, không được copy lại nguyên văn. (KHI CẬP NHẬT QUAN HỆ relationships BẮT BUỘC ĐIỀN ĐẦY ĐỦ CẢ 'impression', 'termsOfAddress', VÀ 'selfAppellation' DƯỚI DẠNG MẢNG. XÓA BỎ CÁCH XƯNG HÔ CŨ ĐÃ LỖI THỜI).","""

if target in content:
    content = content.replace(target, replacement)
    print("Patched npcUpdates JSON instructions in gameplaySystemInstruction")
else:
    print("Could not find target in gameplaySystemInstruction")

with open('src/utils/gameplaySystemInstruction.ts', 'w', encoding='utf-8') as f:
    f.write(content)
