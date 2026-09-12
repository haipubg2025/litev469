import re

with open('src/utils/gameplaySystemInstruction.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update mcUpdates instruction
mc_target = '"IN_THIS_JSON_OUTPUT": "KIỂM TRA CHÉO VỚI BẢNG DỮ LIỆU ĐẦU VÀO CỦA MC: BẠN PHẢI QUÉT QUA TẤT CẢ CÁC TRƯỜNG HIỆN CÓ CỦA MC NÀY (Tùy thuộc vào bảng Mặc Định hay Custom). ĐẶC BIỆT LƯU Ý: NẾU BẠN NHÌN THẤY BẤT KỲ TRƯỜNG DỮ LIỆU NÀO CỦA MC (Đặc biệt là các trường như height, weight, measurements...) ĐANG CÓ GIÁ TRỊ LÀ \'Không có dữ liệu.\', BẠN BẮT BUỘC PHẢI TỰ ĐỘNG SUY LUẬN SÁNG TẠO RA DỮ LIỆU LOGIC ĐỂ BỔ SUNG NGAY LẬP TỨC VÀO ĐÂY BẰNG CÁCH TẠO KEY ĐÓ VÀ ĐIỀN NỘI DUNG VÀO! TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ QUA HOẶC ĐỂ TRỐNG NỮA! VỚI statusData: nộp LẠI toàn bộ trạng thái chưa bị xoá + trạng thái MỚI! Tuyệt đối không xuất dòng ghi chú này!"'
mc_replacement = '"IN_THIS_JSON_OUTPUT": "KIỂM TRA CHÉO VỚI BẢNG DỮ LIỆU ĐẦU VÀO CỦA MC: BẠN PHẢI QUÉT QUA TẤT CẢ CÁC TRƯỜNG HIỆN CÓ CỦA MC NÀY (Tùy thuộc vào bảng Mặc Định hay Custom). ĐẶC BIỆT LƯU Ý: NẾU BẠN NHÌN THẤY BẤT KỲ TRƯỜNG DỮ LIỆU NÀO CỦA MC (Ví dụ: height, weight, measurements...) ĐANG BỊ TRỐNG HOẶC CHỨA CỤM TỪ \'Không có dữ liệu.\', THÌ TRƯỜNG ĐÓ VẪN LÀ MỘT TRƯỜNG THÔNG TIN QUAN TRỌNG, TUYỆT ĐỐI KHÔNG THỂ BỊ RÚT GỌN HOẶC LOẠI BỎ. BẠN BẮT BUỘC PHẢI GIỮ LẠI KEY ĐÓ TRONG JSON UPDATE, VÀ TỰ ĐỘNG SUY LUẬN SÁNG TẠO RA DỮ LIỆU LOGIC (Dựa trên thông tin hiện có) ĐỂ BỔ SUNG/LẤP ĐẦY NGAY LẬP TỨC VÀO GIÁ TRỊ CỦA NÓ! TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ QUA HOẶC ĐỂ TRỐNG NỮA! VỚI statusData: nộp LẠI toàn bộ trạng thái chưa bị xoá + trạng thái MỚI! Tuyệt đối không xuất dòng ghi chú này!"'

# Update npcUpdates instruction
npc_target = '"LƯU_Ý_KHI_XUẤT_JSON": "KIỂM TRA CHÉO VỚI BẢNG DỮ LIỆU ĐẦU VÀO CỦA NPC (BẢN HIỆN HÀNH / SỐ 2): BẠN PHẢI QUÉT QUA TẤT CẢ CÁC TRƯỜNG HIỆN CÓ CỦA NPC NÀY (Tùy thuộc vào bảng Mặc Định hay Custom). ĐẶC BIỆT LƯU Ý: NẾU BẠN NHÌN THẤY BẤT KỲ TRƯỜNG DỮ LIỆU NÀO CỦA NPC (Đặc biệt là các trường như height, weight, measurements...) ĐANG CÓ GIÁ TRỊ LÀ \'Không có dữ liệu.\', BẠN BẮT BUỘC PHẢI TỰ ĐỘNG SUY LUẬN SÁNG TẠO RA DỮ LIỆU LOGIC (Dựa trên độ tuổi, tính cách, mô tả hiện tại của NPC) ĐỂ BỔ SUNG NGAY LẬP TỨC VÀO ĐÂY BẰNG CÁCH TẠO KEY ĐÓ VÀ ĐIỀN NỘI DUNG VÀO! TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ QUA HOẶC ĐỂ TRỐNG NỮA! NGOÀI RA, BẤT CỨ TRƯỜNG NÀO CÓ SỰ THAY ĐỔI LỚN TRONG CỐT TRUYỆN ĐỀU PHẢI ĐƯA VÀO ĐỂ CẬP NHẬT. Đừng làm mất statusData vĩnh viễn cũ. KHI CẬP NHẬT, HÃY PHÂN LOẠI: Với các trường \'tính cách\', \'tiểu sử\' -> Copy nội dung cũ và chèn thêm mới. VỚI CÁC TRƯỜNG \'mục tiêu\', \'bí mật\', \'trạng thái\' (các sự kiện có tính thời điểm) -> NẾU SỰ VIỆC ĐÃ KẾT THÚC, BẮT BUỘC PHẢI GHI ĐÈ/XÓA BỎ thông tin cũ, không được copy lại nguyên văn. (KHI CẬP NHẬT QUAN HỆ relationships BẮT BUỘC ĐIỀN ĐẦY ĐỦ CẢ \'impression\', \'termsOfAddress\', VÀ \'selfAppellation\' DƯỚI DẠNG MẢNG. XÓA BỎ CÁCH XƯNG HÔ CŨ ĐÃ LỖI THỜI)."'
npc_replacement = '"LƯU_Ý_KHI_XUẤT_JSON": "KIỂM TRA CHÉO VỚI BẢNG DỮ LIỆU ĐẦU VÀO CỦA NPC (BẢN HIỆN HÀNH / SỐ 2): BẠN PHẢI QUÉT QUA TẤT CẢ CÁC TRƯỜNG HIỆN CÓ CỦA NPC NÀY (Tùy thuộc vào bảng Mặc Định hay Custom). ĐẶC BIỆT LƯU Ý: NẾU BẠN NHÌN THẤY BẤT KỲ TRƯỜNG DỮ LIỆU NÀO CỦA NPC (Ví dụ: height, weight, measurements...) ĐANG BỊ TRỐNG HOẶC CHỨA CỤM TỪ \'Không có dữ liệu.\', THÌ TRƯỜNG ĐÓ VẪN LÀ MỘT TRƯỜNG THÔNG TIN QUAN TRỌNG, TUYỆT ĐỐI KHÔNG THỂ BỊ RÚT GỌN HOẶC LOẠI BỎ. BẠN BẮT BUỘC PHẢI GIỮ LẠI KEY ĐÓ TRONG JSON UPDATE, VÀ TỰ ĐỘNG SUY LUẬN SÁNG TẠO RA DỮ LIỆU LOGIC (Dựa trên độ tuổi, tính cách, mô tả hiện tại của NPC) ĐỂ BỔ SUNG/LẤP ĐẦY NGAY LẬP TỨC VÀO GIÁ TRỊ CỦA NÓ! TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ QUA HOẶC ĐỂ TRỐNG NỮA! NGOÀI RA, BẤT CỨ TRƯỜNG NÀO CÓ SỰ THAY ĐỔI LỚN TRONG CỐT TRUYỆN ĐỀU PHẢI ĐƯA VÀO ĐỂ CẬP NHẬT. Đừng làm mất statusData vĩnh viễn cũ. KHI CẬP NHẬT, HÃY PHÂN LOẠI: Với các trường \'tính cách\', \'tiểu sử\' -> Copy nội dung cũ và chèn thêm mới. VỚI CÁC TRƯỜNG \'mục tiêu\', \'bí mật\', \'trạng thái\' (các sự kiện có tính thời điểm) -> NẾU SỰ VIỆC ĐÃ KẾT THÚC, BẮT BUỘC PHẢI GHI ĐÈ/XÓA BỎ thông tin cũ, không được copy lại nguyên văn. (KHI CẬP NHẬT QUAN HỆ relationships BẮT BUỘC ĐIỀN ĐẦY ĐỦ CẢ \'impression\', \'termsOfAddress\', VÀ \'selfAppellation\' DƯỚI DẠNG MẢNG. XÓA BỎ CÁCH XƯNG HÔ CŨ ĐÃ LỖI THỜI)."'

if mc_target in content:
    content = content.replace(mc_target, mc_replacement)
    print("Patched mcUpdates")
else:
    print("mc_target not found")

if npc_target in content:
    content = content.replace(npc_target, npc_replacement)
    print("Patched npcUpdates")
else:
    print("npc_target not found")

with open('src/utils/gameplaySystemInstruction.ts', 'w', encoding='utf-8') as f:
    f.write(content)
