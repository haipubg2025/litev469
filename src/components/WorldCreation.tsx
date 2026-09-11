import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Shield,
  Zap,
  Sparkles,
  Sword,
  Play,
  BrainCircuit,
  Info,
  Wand2,
  Loader2,
  User,
  MapPin,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Radio,
  X,
  Terminal,
  Download,
  Upload,
  ChevronDown as ChevronDownIcon,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { toast } from "../utils/toast";
import { aiService } from "../services/aiService";
import { ImageReferenceUploader } from "./ImageReferenceUploader";

type CreationTab = "world" | "mc" | "npc" | "items";

import {
  getWorldCreationSystemInstruction,
  getIdeaDeveloperSystemInstruction,
  getAIGenFieldSystemInstruction,
} from "../utils/worldCreationSystemInstruction";
import {
  safeParseJSON
} from "../utils/jsonRepair";
import { isRelationshipField, ensureUniqueNpcIds } from "../utils/relationshipUtils";
import ConditionalFieldsEditor from "./ConditionalFieldsEditor";

const DEFAULT_MC_FIELDS = [
  { id: "fullName", label: "Họ và tên", type: "input", description: "Họ và tên đầy đủ của nhân vật theo đúng quy chuẩn ngôn ngữ bối cảnh (Ví dụ: 'Nguyễn Thanh Tùng', 'Arthur Pendragon'). Tránh đặt tên nửa mùa hoặc lai tạp phong cách trái bối cảnh.", aiRequirement: "Bảo toàn dữ liệu cũ nếu phù hợp, bám sát phong cách ngôn ngữ của bối cảnh." },
  { id: "titles", label: "Danh xưng (Tước hiệu)", type: "input", description: "Danh hiệu, tôn hiệu, biệt hiệu xưng tụng hoặc tước vị chính thức (Ví dụ: 'Thánh Nữ Ánh Sáng', 'Đại Trưởng Lão', 'Kiếm Thánh Vô Danh'). Cho phép nhiều danh xưng ngăn cách bằng dấu phẩy, gạch chéo (/), chấm phẩy (;). Để trống nếu chưa có.", aiRequirement: "Viết danh xưng phù hợp đẳng cấp, uy danh trong giới, để trống nếu chưa có." },
  { id: "occupation", label: "Chức vụ (Nghề nghiệp)", type: "input", description: "Nghề nghiệp, chức vụ xã hội, giai tầng hoặc chức trách thực tế hiện tại (Ví dụ: 'Hiệp Sĩ Hoàng Gia', 'Chủ Quán Rượu', 'Học Viên Ma Pháp Viện').", aiRequirement: "Miêu tả chính xác nghề nghiệp/chức vụ tương ứng vị thế xã hội." },
  { id: "gender", label: "Giới tính", type: "input", description: "Giới tính sinh học và bản dạng giới của nhân vật (Nam, Nữ, Phi nhị giới, v.v.).", aiRequirement: "Xác định rõ giới tính nhân vật." },
  { id: "age", label: "Tuổi tác", type: "input", description: "Tuổi tác thực tế và tuổi diện mạo (Bắt buộc đa dạng hóa độ tuổi từ trẻ em, thiếu niên dưới 18 tuổi đến người trưởng thành, người già. Cho phép ghi kèm mô tả diện mạo như '500 tuổi (trông như thiếu nữ 18 trẻ đẹp)' hoặc 'Thuở sơ khai trường tồn cùng thiên địa' cho thần thánh. Tuân thủ logic huyết thống gia đình hợp lý).", aiRequirement: "Tính toán logic tuổi tác thực và diện mạo, đảm bảo phù hợp quan hệ huyết thống." },
  { id: "dob", label: "Ngày tháng năm sinh", type: "input", description: "Ngày tháng năm sinh theo lịch bối cảnh hoặc thực tế, kèm cung hoàng đạo nếu bối cảnh hiện đại/fantasy phù hợp. Cho phép mô tả sinh động đối với thần thánh không xác định năm sinh.", aiRequirement: "Ghi ngày sinh kèm cung hoàng đạo hoặc mô tả phù hợp bối cảnh thế giới." },
  { id: "rank", label: "Cảnh giới / Cấp độ", type: "input", description: "Cảnh giới tu vi, cấp độ thực lực, đẳng cấp mạo hiểm giả hoặc phân hạng sức mạnh theo hệ thống phân bậc của thế giới (Ví dụ: 'Kim Đan Kỳ Sơ Kỳ', 'Ma Pháp Sư Hạng A', 'Level 45').", aiRequirement: "Bám sát thang phân cấp sức mạnh của thế giới đã định nghĩa." },
  { id: "height", label: "Chiều cao", type: "input", description: "Chiều cao cơ thể (Ví dụ: '165 cm', '1m78').", aiRequirement: "Ghi số đo chiều cao thực tế hợp lý." },
  { id: "weight", label: "Cân nặng", type: "input", description: "Cân nặng cơ thể và thể trạng (Ví dụ: '49 kg', '68 kg - săn chắc').", aiRequirement: "Ghi số cân nặng kèm thể trạng tương xứng chiều cao." },
  { id: "measurements", label: "Số đo 3 vòng", type: "input", description: "Quy tắc định dạng bắt buộc: Nữ giới: Bắt buộc đặt số đo 3 vòng và cup ngực trong ngoặc vuông và kết thúc bằng dấu chấm (Ví dụ: '[90-60-90, Cup D]. '), sau đó viết đoạn văn ngắn gọn, trực diện trần trụi về vóc dáng, vú, nhũ hoa, mu, lồn (không lặp lại con số). Nam giới: Viết trực diện miêu tả vóc dáng và dương vật/cu/cặc thực tế.", aiRequirement: "Tuân thủ chặt chẽ định dạng ngoặc vuông cho nữ hoặc miêu tả trực diện cho nam." },
  { id: "appearance", label: "Miêu tả ngoại hình tổng quan", type: "textarea", description: "Miêu tả ngoại hình khỏa thân toàn diện: Tối thiểu 800 từ, chia 5-6 đoạn lớn (dùng ký tự \\n\\n, cấm thẻ <br>): Đoạn 1 (Khuôn mặt, tóc, cổ, vai), Đoạn 2 (Bầu ngực, nhũ hoa tả trần trụi bạo dạn), Đoạn 3 (Eo, bụng, hông, mông, đùi), Đoạn 4 (Vùng kín mu, âm hộ, cấu trúc lông mu ngẫu nhiên), Đoạn 5 (Làn da, mùi hương, vết bớt/hình xăm). Tuyệt đối không tả trang phục ở trường này.", aiRequirement: "Viết chi tiết, chia 5-6 đoạn bằng \\n\\n, không tả trang phục ở trường này." },
  { id: "appearanceLite", label: "Miêu tả Rút gọn (Tóm tắt ngoại hình)", type: "textarea", description: "Bản tóm tắt ngoại hình SFW an toàn, thanh lịch (Tối thiểu 300 từ, chia 2-3 đoạn bằng \\n\\n): Miêu tả ít nhất 2 bộ trang phục thường ngày/đặc trưng, kết hợp biểu cảm, ánh nhìn, thần thái và khí chất tổng quan của nhân vật.", aiRequirement: "Tả trang phục thường ngày, thần thái, phong thái tổng quan SFW." },
  { id: "distinguishingFeatures", label: "Đặc điểm nhận dạng phụ", type: "textarea", description: "Đặc điểm nhận dạng phụ và điểm nhấn ngoại hình (Nốt ruồi duyên, má lúm đồng tiền, vết sẹo danh dự, hình xăm phong ấn, răng khểnh, màu mắt đặc biệt, dị tật hoặc ấn ký kỳ lạ...).", aiRequirement: "Liệt kê các dấu hiệu nhận diện đặc trưng tạo điểm nhấn riêng biệt." },
  { id: "powers", label: "Năng lực / Sức mạnh", isArray: true, description: "Những thứ thuộc về phi thực tế (như hệ thống hay ma pháp... - các ví dụ để AI hiểu bản chất).", aiRequirement: "Miêu tả rõ cơ chế, phân loại và uy lực của năng lực siêu nhiên/ma pháp." },
  { id: "skills", label: "Kỹ năng chuyên môn", isArray: true, description: "Những thứ thuộc về thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để AI hiểu bản chất).", aiRequirement: "Nêu các kỹ năng thuần thục thực tế trong đời sống hoặc chiến đấu." },
  { id: "personality", label: "Tính cách tổng quan", type: "textarea", description: "Tính cách biểu hiện bề ngoài, thói quen giao tiếp ứng xử thường nhật. Bắt buộc kết hợp miêu tả thói quen ăn mặc trong các hoàn cảnh (đi làm/đi học, dạo phố, ở nhà, khi ngủ). Lồng ghép các nét tính cách đời thường, dung dị (vui vẻ, nóng nảy, ngốc nghếch, lười biếng, chăm chỉ...).", aiRequirement: "Bám sát ý tưởng người chơi, kết hợp thói quen trang phục theo từng hoàn cảnh." },
  { id: "personalityCore", label: "Tính cách cốt lõi (Bản ngã)", type: "textarea", description: "Tính cách cốt lõi và bản ngã sâu kín nhất (Nguyên tắc sống bất biến, tâm lý thật sự bên trong mâu thuẫn hoặc đồng nhất với tính cách bề ngoài). Chống OOC nghiêm ngặt.", aiRequirement: "Khắc họa chiều sâu nội tâm, nguyên tắc bất di bất dịch của nhân vật." },
  { id: "philosophy", label: "Kim chỉ nam / Lý tưởng", type: "textarea", description: "Kim chỉ nam sống, lý tưởng nhân sinh, tín ngưỡng, đạo đức hoặc phương châm hành động cốt lõi của nhân vật.", aiRequirement: "Xây dựng lý tưởng sống và chuẩn mực đạo đức riêng biệt." },
  { id: "goal", label: "Mục tiêu tối thượng", type: "textarea", description: "Mục tiêu tối thượng, khát vọng đời người hoặc động lực lớn nhất thúc đẩy mọi quyết định và hành vi của nhân vật.", aiRequirement: "Nêu rõ khát vọng lớn nhất và mục tiêu ngắn/dài hạn." },
  { id: "likesDislikesFears", label: "Sở thích, ghét, nỗi sợ (SFW)", type: "textarea", description: "Sở thích, những điều ghét bỏ, nỗi sợ hãi trong cuộc sống thường nhật (Ví dụ: Thích hoa, ghét cá, sợ bóng tối).", aiRequirement: "Liệt kê chi tiết những điều yêu thích, ác cảm và nỗi ám ảnh thường nhật." },
  { id: "likesDislikesFearsNsfw", label: "Sở thích, ghét, nỗi sợ (NSFW)", type: "textarea", description: "Sở thích, ghét, sợ hãi trong chuyện tình dục/NSFW (Ví dụ: Thích bị cắn, ghét bạo lực quá mức...).", aiRequirement: "Miêu tả gu tình dục, điều thích, ghét và ranh giới cấm kỵ trong chuyện phòng the." },
  { id: "background", label: "Nguồn gốc / Xuất thân / Hoàn cảnh", type: "textarea", description: "Nguồn gốc, gia thế xuất thân, biến cố quá khứ và bối cảnh trưởng thành. Tuyệt đối chỉ kể quá khứ đã diễn ra, nghiêm cấm spoil cốt truyện tương lai.", aiRequirement: "Chỉ kể quá khứ đã xảy ra, không spoil các sự kiện tương lai." },
  { id: "innerSecret", label: "Nội tâm / Suy nghĩ thầm kín / Động cơ ẩn", type: "textarea", description: "Nội tâm thầm kín, bí mật giấu kín chưa từng thổ lộ với ai, điểm yếu chí mạng hoặc toan tính sâu xa trong lòng.", aiRequirement: "Tiết lộ bí mật sâu kín hoặc điểm yếu tâm lý trọng đại." },
  { id: "loveViews", label: "Quan niệm về tình yêu & tình dục", type: "textarea", description: "Quan niệm về tình yêu đôi lứa, sự chung thủy, mức độ chiếm hữu và ranh giới tình dục/khoái lạc của nhân vật.", aiRequirement: "Thể hiện góc nhìn về lòng chung thủy, tính chiếm hữu và ranh giới quan hệ." },
  { id: "experience", label: "Trinh tiết và kinh nghiệm NSFW", type: "textarea", description: "Trinh tiết và lịch sử kinh nghiệm tình trường/phòng the thực tế (Trinh nữ thuần khiết, Người từng trải dày dạn kinh nghiệm, Đã từng kết hôn...).", aiRequirement: "Ghi rõ lịch sử tình trường và kinh nghiệm thực tế." },
  { id: "nsfwPersonality", label: "Tính cách khi NSFW", type: "textarea", description: "Bản chất tâm lý và phong cách khi bước vào không gian ân ái/NSFW (Dâm đãng cuồng nhiệt, Thẹn thùng e ấp, Phục tùng tuyệt đối, Thống trị quyến rũ...).", aiRequirement: "Khắc họa phong cách tâm lý đặc trưng trong không gian thân mật." },
  { id: "nsfwReactions", label: "Phản ứng đặc trưng (NSFW)", type: "textarea", description: "Phản ứng cơ thể đặc trưng khi tiếp xúc thân mật/NSFW (Độ nhạy cảm của các điểm G, tiếng rên rỉ, dịch nhờn, biểu cảm gương mặt khi bị kích thích hoặc đạt cực khoái).", aiRequirement: "Miêu tả các phản ứng sinh học, độ nhạy cảm và biểu cảm kích thích." },
  { id: "inventory", label: "Hành trang / Vật phẩm", type: "textarea", description: "Các vật phẩm, vũ khí, tài sản hoặc bảo vật quan trọng mang theo người.", aiRequirement: "QUAN TRỌNG: Vật phẩm ĐẦU TIÊN (index 0) trong danh sách BẮT BUỘC phải là Tiền tệ chính của nhân vật (Tên: Vàng, Linh Thạch, Tệ, USD... | Số lượng: Số tiền khởi điểm, có thể bằng 0 | Mô tả: Đặc điểm của loại tiền này). Các vật phẩm tiếp theo là trang bị, tài sản khác." },
  { id: "literaryDescription", label: "Miêu tả bằng ngôn từ văn học", type: "textarea", description: "Chân dung văn học giàu chất nghệ thuật trau chuốt khắc họa toàn diện thần thái nhân vật ở hiện tại (Cấm viết spoil diễn biến sắp tới). Bắt buộc có thêm một đoạn kể về vật phẩm, tài sản hoặc bảo vật gắn liền với nhân vật.", aiRequirement: "Viết văn phong trau chuốt nghệ thuật, khắc họa thần thái hiện tại, lồng ghép bảo vật/vật phẩm tiêu biểu." }
];

const DEFAULT_NPC_FIELDS = [
  { id: "role", label: "Vai trò", type: "input", description: "Vai trò của NPC trong câu chuyện hoặc mạng lưới xã hội của thế giới (Đồng minh, Kẻ thù, Sư phụ, Người yêu, Hộ vệ, Kẻ trung lập...).", aiRequirement: "Xác định rõ vị trí, vai trò tương tác trong mạch truyện." },
  { id: "fullName", label: "Họ và tên", type: "input", description: "Họ và tên đầy đủ của NPC theo đúng quy chuẩn ngôn ngữ bối cảnh (Ví dụ: 'Nguyễn Thanh Tùng', 'Arthur Pendragon'). Tránh đặt tên nửa mùa hoặc lai tạp phong cách trái bối cảnh.", aiRequirement: "Đặt tên chuẩn bối cảnh, bảo toàn tên cũ nếu phù hợp." },
  { id: "titles", label: "Danh xưng (Tước hiệu)", type: "input", description: "Danh hiệu, tôn hiệu, biệt hiệu xưng tụng hoặc tước vị chính thức của NPC (Ví dụ: 'Thánh Nữ Ánh Sáng', 'Đại Trưởng Lão', 'Kiếm Thánh Vô Danh'). Cho phép nhiều danh xưng ngăn cách bằng dấu phẩy, gạch chéo (/), chấm phẩy (;). Để trống nếu chưa có.", aiRequirement: "Viết danh hiệu xứng tầm vị thế, để trống nếu chưa có." },
  { id: "occupation", label: "Chức vụ (Nghề nghiệp)", type: "input", description: "Nghề nghiệp, chức vụ xã hội, giai tầng hoặc chức trách thực tế hiện tại của NPC (Ví dụ: 'Hiệp Sĩ Hoàng Gia', 'Chủ Quán Rượu', 'Học Viên Ma Pháp Viện').", aiRequirement: "Ghi nghề nghiệp, chức trách cụ thể trong xã hội." },
  { id: "gender", label: "Giới tính", type: "input", description: "Giới tính sinh học và bản dạng giới của NPC (Nam, Nữ, Phi nhị giới, v.v.).", aiRequirement: "Xác định giới tính của NPC." },
  { id: "age", label: "Tuổi tác", type: "input", description: "Tuổi tác thực tế và tuổi diện mạo của NPC (Bắt buộc đa dạng hóa độ tuổi từ trẻ em, thiếu niên dưới 18 tuổi đến người trưởng thành, người già. Cho phép ghi kèm mô tả diện mạo như '500 tuổi (trông như thiếu nữ 18 trẻ đẹp)' hoặc 'Thuở sơ khai trường tồn cùng thiên địa' cho thần thánh. Tuân thủ logic huyết thống gia đình hợp lý).", aiRequirement: "Tuân thủ logic tuổi tác và huyết thống gia đình." },
  { id: "dob", label: "Ngày tháng năm sinh", type: "input", description: "Ngày tháng năm sinh theo lịch bối cảnh hoặc thực tế của NPC, kèm cung hoàng đạo nếu bối cảnh hiện đại/fantasy phù hợp. Cho phép mô tả sinh động đối với thần thánh không xác định năm sinh.", aiRequirement: "Ghi ngày sinh và cung hoàng đạo phù hợp bối cảnh." },
  { id: "rank", label: "Cảnh giới / Cấp độ", type: "input", description: "Cảnh giới tu vi, cấp độ thực lực, đẳng cấp mạo hiểm giả hoặc phân hạng sức mạnh của NPC theo hệ thống phân bậc của thế giới (Ví dụ: 'Kim Đan Kỳ Sơ Kỳ', 'Ma Pháp Sư Hạng A', 'Level 45').", aiRequirement: "Bám sát thang phân cấp sức mạnh của thế giới." },
  { id: "height", label: "Chiều cao", type: "input", description: "Chiều cao cơ thể (Ví dụ: '165 cm', '1m78').", aiRequirement: "Ghi số đo chiều cao hợp lý." },
  { id: "weight", label: "Cân nặng", type: "input", description: "Cân nặng cơ thể và thể trạng (Ví dụ: '49 kg', '68 kg - săn chắc').", aiRequirement: "Ghi cân nặng và thể trạng tương xứng." },
  { id: "measurements", label: "Số đo 3 vòng", type: "input", description: "Quy tắc định dạng bắt buộc: Nữ giới: Bắt buộc đặt số đo 3 vòng và cup ngực trong ngoặc vuông và kết thúc bằng dấu chấm (Ví dụ: '[90-60-90, Cup D]. '), sau đó viết đoạn văn ngắn gọn, trực diện trần trụi về vóc dáng, vú, nhũ hoa, mu, lồn (không lặp lại con số). Nam giới: Viết trực diện miêu tả vóc dáng và dương vật/cu/cặc thực tế.", aiRequirement: "Tuân thủ định dạng ngoặc vuông cho nữ hoặc tả trực diện cho nam." },
  { id: "appearance", label: "Miêu tả ngoại hình tổng quan", type: "textarea", description: "Miêu tả ngoại hình khỏa thân toàn diện của NPC: Tối thiểu 800 từ, chia 5-6 đoạn lớn (dùng ký tự \\n\\n, cấm thẻ <br>): Đoạn 1 (Khuôn mặt, tóc, cổ, vai), Đoạn 2 (Bầu ngực, nhũ hoa tả trần trụi bạo dạn), Đoạn 3 (Eo, bụng, hông, mông, đùi), Đoạn 4 (Vùng kín mu, âm hộ, cấu trúc lông mu ngẫu nhiên), Đoạn 5 (Làn da, mùi hương, vết bớt/hình xăm). Tuyệt đối không tả trang phục ở trường này.", aiRequirement: "Viết chi tiết khỏa thân chia 5-6 đoạn bằng \\n\\n, cấm tả trang phục." },
  { id: "appearanceLite", label: "Miêu tả Rút gọn (Tóm tắt ngoại hình)", type: "textarea", description: "Bản tóm tắt ngoại hình SFW an toàn, thanh lịch của NPC (Tối thiểu 300 từ, chia 2-3 đoạn bằng \\n\\n): Miêu tả ít nhất 2 bộ trang phục thường ngày/đặc trưng, kết hợp biểu cảm, ánh nhìn, thần thái và khí chất tổng quan của nhân vật.", aiRequirement: "Tả ít nhất 2 bộ trang phục, thần thái, phong thái tổng quan SFW." },
  { id: "distinguishingFeatures", label: "Đặc điểm nhận dạng phụ", type: "textarea", description: "Đặc điểm nhận dạng phụ và điểm nhấn ngoại hình của NPC (Nốt ruồi duyên, má lúm đồng tiền, vết sẹo danh dự, hình xăm phong ấn, răng khểnh, màu mắt đặc biệt, dị tật hoặc ấn ký kỳ lạ...).", aiRequirement: "Nêu các dấu hiệu nhận diện đặc trưng tạo điểm nhấn riêng biệt." },
  { id: "powers", label: "Năng lực / Sức mạnh", isArray: true, description: "Những thứ thuộc về phi thực tế (như hệ thống hay ma pháp... - các ví dụ để AI hiểu bản chất).", aiRequirement: "Miêu tả rõ cơ chế, phân loại và uy lực ma pháp/dị năng." },
  { id: "skills", label: "Kỹ năng chuyên môn", isArray: true, description: "Những thứ thuộc về thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để AI hiểu bản chất).", aiRequirement: "Nêu các kỹ năng chuyên môn đời sống hoặc chiến đấu." },
  { id: "personality", label: "Tính cách tổng quan", type: "textarea", description: "Tính cách biểu hiện bề ngoài, thói quen giao tiếp ứng xử thường nhật của NPC. Bắt buộc kết hợp miêu tả thói quen ăn mặc trong các hoàn cảnh (đi làm/đi học, dạo phố, ở nhà, khi ngủ). Lồng ghép các nét tính cách đời thường, dung dị (vui vẻ, nóng nảy, ngốc nghếch, lười biếng, chăm chỉ...).", aiRequirement: "Bám sát ý tưởng, lồng ghép thói quen trang phục theo hoàn cảnh." },
  { id: "personalityCore", label: "Tính cách cốt lõi (Bản ngã)", type: "textarea", description: "Tính cách cốt lõi và bản ngã sâu kín nhất của NPC (Nguyên tắc sống bất biến, tâm lý thật sự bên trong mâu thuẫn hoặc đồng nhất với tính cách bề ngoài). Chống OOC nghiêm ngặt.", aiRequirement: "Khắc họa tâm lý sâu thẳm và nguyên tắc sống bất biến." },
  { id: "philosophy", label: "Kim chỉ nam / Lý tưởng", type: "textarea", description: "Kim chỉ nam sống, lý tưởng nhân sinh, tín ngưỡng, đạo đức hoặc phương châm hành động cốt lõi của NPC.", aiRequirement: "Xây dựng lý tưởng và tôn chỉ hành động của NPC." },
  { id: "goal", label: "Mục tiêu tối thượng", type: "textarea", description: "Mục tiêu tối thượng, khát vọng đời người hoặc động lực lớn nhất thúc đẩy mọi quyết định và hành vi của NPC.", aiRequirement: "Nêu rõ khát vọng lớn nhất và mục tiêu theo đuổi." },
  { id: "needsSfw", label: "Nhu cầu (SFW)", type: "textarea", description: "Những nhu cầu cơ bản trong cuộc sống bình thường của NPC.", aiRequirement: "Nêu nhu cầu sinh hoạt, vật chất hoặc tinh thần thường nhật." },
  { id: "needsNsfw", label: "Nhu cầu (NSFW)", type: "textarea", description: "Những nhu cầu tình dục hoặc thân mật của NPC.", aiRequirement: "Nêu nhu cầu ham muốn sinh lý và sự thỏa mãn thân mật." },
  { id: "likesDislikesFears", label: "Sở thích, ghét, nỗi sợ (SFW)", type: "textarea", description: "Sở thích, những điều ghét bỏ, nỗi sợ hãi trong cuộc sống thường nhật của NPC (Ví dụ: Thích hoa, ghét cá, sợ bóng tối).", aiRequirement: "Liệt kê chi tiết sở thích, điều căm ghét và nỗi sợ thường nhật." },
  { id: "likesDislikesFearsNsfw", label: "Sở thích, ghét, nỗi sợ (NSFW)", type: "textarea", description: "Sở thích, ghét, sợ hãi trong chuyện tình dục/NSFW của NPC (Ví dụ: Thích bị cắn, ghét bạo lực quá mức...).", aiRequirement: "Miêu tả sở thích, điều kỵ và nỗi ám ảnh trong tình dục." },
  { id: "background", label: "Nguồn gốc / Xuất thân / Hoàn cảnh", type: "textarea", description: "Nguồn gốc, gia thế xuất thân, biến cố quá khứ và bối cảnh trưởng thành của NPC. Tuyệt đối chỉ kể quá khứ đã diễn ra, nghiêm cấm spoil cốt truyện tương lai.", aiRequirement: "Chỉ kể quá khứ, nghiêm cấm spoil diễn biến tương lai." },
  { id: "innerSecret", label: "Nội tâm / Suy nghĩ thầm kín / Động cơ ẩn", type: "textarea", description: "Nội tâm thầm kín, bí mật giấu kín chưa từng thổ lộ với ai, điểm yếu chí mạng hoặc toan tính sâu xa trong lòng NPC.", aiRequirement: "Tiết lộ bí mật giấu kín và toan tính cá nhân." },
  { id: "impression", label: "Ấn tượng & Suy nghĩ (về MC / Thế giới)", type: "textarea", description: "Ấn tượng ban đầu, đánh giá và suy nghĩ tổng quan của NPC về nhân vật chính (MC) hoặc thế giới xung quanh (Độc lập và khác biệt hoàn toàn với mục impression trong từng mối quan hệ relationships).", aiRequirement: "Đánh giá chân thực góc nhìn của NPC về MC và thế giới." },
  { id: "loveViews", label: "Quan niệm về tình yêu & tình dục", type: "textarea", description: "Quan niệm về tình yêu đôi lứa, sự chung thủy, mức độ chiếm hữu và ranh giới tình dục/khoái lạc của NPC.", aiRequirement: "Thể hiện góc nhìn về tình yêu, sự thủy chung và ranh giới khoái lạc." },
  { id: "experience", label: "Trinh tiết và kinh nghiệm NSFW", type: "textarea", description: "Trinh tiết và lịch sử kinh nghiệm tình trường/phòng the thực tế của NPC (Trinh nữ thuần khiết, Người từng trải dày dạn kinh nghiệm, Đã từng kết hôn...).", aiRequirement: "Ghi rõ lịch sử tình ái và kinh nghiệm phòng the." },
  { id: "nsfwPersonality", label: "Tính cách khi NSFW", type: "textarea", description: "Bản chất tâm lý và phong cách khi bước vào không gian ân ái/NSFW của NPC (Dâm đãng cuồng nhiệt, Thẹn thùng e ấp, Phục tùng tuyệt đối, Thống trị quyến rũ...).", aiRequirement: "Khắc họa phong cách tâm lý trong chuyện thân mật." },
  { id: "nsfwReactions", label: "Phản ứng đặc trưng (NSFW)", type: "textarea", description: "Phản ứng cơ thể đặc trưng khi tiếp xúc thân mật/NSFW của NPC (Độ nhạy cảm của các điểm G, tiếng rên rỉ, dịch nhờn, biểu cảm gương mặt khi bị kích thích hoặc đạt cực khoái).", aiRequirement: "Miêu tả phản ứng cơ thể và mức độ nhạy cảm khi kích thích." },
  { id: "literaryDescription", label: "Miêu tả bằng ngôn từ văn học", type: "textarea", description: "Chân dung văn học giàu chất nghệ thuật trau chuốt khắc họa toàn diện thần thái NPC ở hiện tại (Cấm viết spoil diễn biến sắp tới). Bắt buộc có thêm một đoạn kể về vật phẩm, tài sản hoặc bảo vật gắn liền với NPC.", aiRequirement: "Viết văn phong nghệ thuật khắc họa thần thái, lồng ghép bảo vật/vật phẩm tiêu biểu." }
];

function createStreamThrottler<T>(updateFn: (val: T) => void, delayMs = 80) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastTime = 0;
  let latestVal: T;

  const push = (val: T) => {
    latestVal = val;
    const now = Date.now();
    if (now - lastTime >= delayMs) {
      lastTime = now;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      updateFn(latestVal);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        updateFn(latestVal);
      }, delayMs - (now - lastTime));
    }
  };

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (latestVal !== undefined) {
      updateFn(latestVal);
    }
  };

  return { push, flush };
}

export default function WorldCreation() {
  const theme = useStore((state) => state.theme);
  const setFullScreenStream = useStore((state) => state.setFullScreenStream);
  const setIsGeneratingStream = useStore(
    (state) => state.setIsGeneratingStream,
  );
  const updateStreamData = useStore((state) => state.updateStreamData);
  const worldCreation = useStore((state) => state.worldCreation);
  const updateWorldCreation = useStore((state) => state.updateWorldCreation);
  const resetWorldCreation = useStore((state) => state.resetWorldCreation);
  const setGameData = useStore((state) => state.setGameData);
  const isFanfictionModeEnabled = useStore((state) => state.isFanfictionModeEnabled);
  const playerRules = useStore((state) => state.worldCreation.playerRules || "");
  const setPlayerRules = (val: string) => updateWorldCreation({ playerRules: val });

  const navigate = useNavigate();

  const { 
    initialIdea, 
    developedIdea, 
    mcIdea = "", 
    npcIdea = "", 
    locationIdea = "", 
    referenceImages = [],
    mcReferenceImages = [],
    npcReferenceImages = [],
    locationReferenceImages = [],
    worldData, 
    mcData, 
    npcs, 
    worldDetails, 
    mcsData = [], 
    selectedMcIndex = 0,
    mcTemplateMode = "default",
    npcTemplateMode = "default",
    disableDefaultNpcRelationships = false,
    customMcFields = [],
    customNpcFields = [],
    blankSlateMode = true,
  } = worldCreation;

  const getImagesForTab = (tab: CreationTab): string[] => {
    if (tab === "mc") return mcReferenceImages.length > 0 ? mcReferenceImages : referenceImages;
    if (tab === "npc") return npcReferenceImages.length > 0 ? npcReferenceImages : referenceImages;
    if (tab === "items") return locationReferenceImages.length > 0 ? locationReferenceImages : referenceImages;
    return referenceImages;
  };

  const getImagesNotice = (imgs: string[]) => {
    if (!imgs || imgs.length === 0) return "";
    return `\n\n[LƯU Ý CỰC KỲ QUAN TRỌNG VỀ HÌNH ẢNH TƯ LIỆU THAM KHẢO]: Người chơi đã đính kèm ${imgs.length} ảnh tư liệu tham khảo từ máy tính. AI BẮT BUỘC phải đọc và phân tích kỹ lưỡng các hình ảnh này (phong cảnh, concept art, diện mạo nhân vật, trang phục, màu sắc, vóc dáng, biểu cảm...) kết hợp với văn bản để sáng tạo nội dung vừa chính xác vừa khớp 100% với hình ảnh tư liệu.`;
  };

  const setMcIdea = (idea: string) => updateWorldCreation({ mcIdea: idea });
  const setNpcIdea = (idea: string) => updateWorldCreation({ npcIdea: idea });
  const setLocationIdea = (idea: string) => updateWorldCreation({ locationIdea: idea });

  const [activeTab, setActiveTab] = useState<CreationTab>("world");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDevelopingIdea, setIsDevelopingIdea] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [genTimer, setGenTimer] = useState(0);
  const [devTimer, setDevTimer] = useState(0);

  const [generatingFields, setGeneratingFields] = useState<
    Record<string, boolean>
  >({});

  const [isGeneratingMc, setIsGeneratingMc] = useState(false);
  const [isGeneratingNpc, setIsGeneratingNpc] = useState(false);
  const [isGeneratingLocation, setIsGeneratingLocation] = useState(false);
  const [mcTemplateIdea, setMcTemplateIdea] = useState("");
  const [npcTemplateIdea, setNpcTemplateIdea] = useState("");

  const [isMcGuideOpen, setIsMcGuideOpen] = useState(false);
  const [isMcFieldsOpen, setIsMcFieldsOpen] = useState(true);
  const [isNpcGuideOpen, setIsNpcGuideOpen] = useState(false);
  const [isNpcFieldsOpen, setIsNpcFieldsOpen] = useState(true);

  const [isGeneratingMcArrays, setIsGeneratingMcArrays] = useState(false);
  
  const handleAIGenField = async (
    fieldName: string,
    fieldKey: keyof typeof worldData,
  ) => {
    if (!initialIdea.trim()) {
      toast.error("Vui lòng nhập ý tưởng sơ khai trước!");
      return;
    }

    setGeneratingFields((prev) => ({ ...prev, [fieldKey]: true }));

    const currentFieldValue = worldData[fieldKey as keyof typeof worldData];
    const otherData = { ...worldData };
    // @ts-ignore
    delete otherData[fieldKey];

    const contextData = {
      worldData: otherData,
      mcData,
      npcs,
      worldDetails,
    };

    const fieldInstructions: Record<string, string> = {
      name: "Chỉ trả về một cái tên duy nhất cho thế giới, ngắn gọn, độc đáo. Không giải thích thêm.",
      difficulty: "Chỉ viết về mức độ khó của thế giới (thử thách sinh tồn, tài nguyên, quái vật, v.v.). Không viết lan man.",
      background: "Chỉ tóm tắt bối cảnh tổng quan của thế giới (thế giới này là gì, hình thành ra sao). KHÔNG viết lịch sử chi tiết hay kịch bản mở đầu.",
      starterTimeline: "ĐẶC BIỆT LƯU Ý CHO MỤC MỐC THỜI GIAN MỞ ĐẦU: Chỉ trả về một câu hoặc một cụm từ ngắn gọn xác định mốc thời gian (và địa điểm nếu cần) lúc trò chơi bắt đầu, BẮT BUỘC bao gồm giờ, phút, thứ, ngày, tháng, năm (Ví dụ: '08:30 sáng, Thứ Hai ngày 15 tháng 3 năm 2050, tại thủ đô Tokyo', '23:45, Năm 450 Kỷ Nguyên Ma Thuật'). TUYỆT ĐỐI KHÔNG viết thành một đoạn văn miêu tả cảnh vật hay hành động của nhân vật. KHÔNG lấn sân sang kịch bản mở đầu.",
      starterScenario: "ĐẶC BIỆT LƯU Ý CHO MỤC KỊCH BẢN MỞ ĐẦU: Hãy viết một tóm tắt bối cảnh tình huống khởi đầu của người chơi. Tình thế hiện tại là gì? Đang gặp chuyện gì? CHÚ Ý: CHỈ LÀ TÓM TẮT ĐỊNH HƯỚNG KỊCH BẢN, không phải viết hẳn lời kể chuyện, không bao gồm mốc thời gian.",
      worldRules: "Chỉ viết về các quy luật tự nhiên, vật lý, hay phép thuật đặc thù của thế giới này. Không lấn sân sang các mục khác.",
      namingConventions: "Chỉ viết về phong cách và quy tắc đặt tên cho nhân vật, địa danh, vật phẩm trong thế giới này.",
      genre: "Chỉ liệt kê cực kỳ ngắn gọn các thể loại chính của thế giới (VD: Đô thị, Dị năng, Tình cảm). KHÔNG miêu tả dài dòng.",
      mainMood: "Chỉ mô tả rất ngắn gọn âm hưởng chủ đạo và cảm xúc mà thế giới này mang lại (1-2 câu). KHÔNG viết lan man.",
      pacing: "Chỉ mô tả ngắn gọn nhịp độ diễn tiến của câu chuyện và các sự kiện. BẮT BUỘC phải thật ngắn gọn, súc tích (1-2 đoạn ngắn), không viết dài dòng miên man.",
      geography: "Chỉ viết về đặc điểm địa lý, khí hậu, các vùng đất, và cảnh quan môi trường. Không bao gồm văn hóa hay lịch sử.",
      worldHistory: "Chỉ tóm tắt lịch sử hình thành, các cột mốc thời gian lớn trong quá khứ của thế giới. Không bao gồm tình hình hiện tại hay kịch bản mở đầu.",
      culture: "Chỉ mô tả về văn hóa, phong tục tập quán, ngôn ngữ, và lối sống của người dân bản địa.",
      economy: "Chỉ viết về hệ thống kinh tế, thương mại, tiền tệ, và cấu trúc giai cấp xã hội.",
      religion: "Chỉ mô tả hệ thống tôn giáo, tín ngưỡng, thần linh, và các nghi thức thờ cúng.",
      factions: "Chỉ liệt kê và tóm tắt về các quốc gia, thế lực, bang phái, hay tổ chức lớn trong thế giới.",
      factionRelations: "Chỉ mô tả các mối quan hệ (liên minh, thù địch, trung lập) giữa các thế lực đã nêu.",
      uniqueElements: "Chỉ liệt kê các yếu tố độc đáo, công nghệ đặc thù, hay sinh vật lạ chỉ có ở thế giới này.",
      powerSystem: "Chỉ mô tả chi tiết hệ thống sức mạnh, cấp bậc, cảnh giới, hoặc năng lực đặc biệt trong thế giới.",
      logicControl: "Chỉ nêu ra những giới hạn logic, những thứ tuyệt đối không tồn tại hoặc bị cấm trong thế giới này.",
      writingStyle: "ĐẶC BIỆT LƯU Ý CHO MỤC VĂN PHONG: Trình bày ngắn gọn, súc tích (1-2 đoạn ngắn). Cần phân biệt rõ lối kể chuyện, văn phong giữa Phương Tây và Phương Đông, giữa Nhật Bản (Light novel/Isekai), Trung Quốc (Tiên Hiệp/Cổ trang) và Việt Nam. Hãy quy định rõ cách sử dụng từ ngữ sao cho phù hợp với bối cảnh thế giới. CẤM viết dông dài lan man.",
      narrativePerspective: "Chỉ định ngắn gọn (1-2 câu) ngôi kể và góc nhìn tập trung. LƯU Ý: Phải ghi rõ danh xưng của MC tùy theo ngôi kể. Nếu Ngôi thứ 3: gọi MC là gì (VD: anh, cậu, chàng... CẤM dùng 'hắn/gã'). Nếu Ngôi thứ 1: MC tự xưng là gì (VD: tôi, ta...). Nếu Ngôi thứ 2: người kể gọi MC là gì (VD: bạn, ngươi...). Thật ngắn gọn, súc tích, không lan man.",
    };

    const extraInstruction = fieldInstructions[fieldKey as string] 
      ? fieldInstructions[fieldKey as string] + "\n\n" 
      : "";

    const imgs = referenceImages;
    const prompt = `Bạn là một AI chuyên gia sáng tạo kịch bản thế giới (World Building).\n\nDựa trên:\n- Ý tưởng sơ khai: "${initialIdea}"\n- Ý tưởng phát triển: "${developedIdea}"\n- CHẾ ĐỘ TRANG GIẤY TRẮNG: ${blankSlateMode ? 'BẬT (ON) - Bắt buộc khởi đầu câu chuyện từ lúc MC chưa có gì, từ con số không tròn trĩnh (Level thấp nhất, không có quyền lực/tài sản, là người mới bắt đầu).' : 'TẮT (OFF) - Cho phép MC khởi đầu câu chuyện ở giữa hoặc cuối hành trình (đã có sức mạnh, quyền lực, chức vụ, kinh nghiệm, tài sản... tùy theo logic ý tưởng).'}\n\nVà các thông tin thế giới hiện tại (nếu có):\n\`\`\`json\n${JSON.stringify(contextData, null, 2)}\n\`\`\`\n\nNhiệm vụ của bạn: Hãy phân tích các dữ liệu trên để sáng tạo nội dung mới thật hay, độc đáo, chi tiết, logic và liên kết chặt chẽ với các thông tin khác. ĐẶC BIỆT CHÚ Ý: BẠN CHỈ ĐƯỢC PHÉP VIẾT NỘI DUNG CHO DUY NHẤT MỤC: "${fieldName}". Tuyệt đối không được viết lan man, lấn sân sang các mục khác, không được viết thừa thãi những thứ không thuộc về tính chất của mục này. Đồng thời ĐẢM BẢO TUYỆT ĐỐI tuân thủ Chế Độ Trang Giấy Trắng đang ${blankSlateMode ? 'BẬT' : 'TẮT'}.\n\n${currentFieldValue ? `LƯU Ý QUAN TRỌNG: Người chơi đã nhập sẵn nội dung cho mục này như sau: "${currentFieldValue}". Bạn BẮT BUỘC phải xem xét kỹ nội dung cũ trước; TUYỆT ĐỐI không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi hoặc cần phát triển thêm thì mới sửa lại, nối tiếp hoặc thay thế (nếu nội dung cũ là dạng ý tưởng thì hãy phát triển, triển khai ý tưởng đó thành nội dung hoàn chỉnh), TUYỆT ĐỐI không được làm mất ý chính hay cắt xén dữ liệu ban đầu.\n\n` : ""}${extraInstruction}LƯU Ý TỐI THƯỢNG: TRẢ VỀ TRỰC TIẾP NỘI DUNG (dạng text thuần túy), KHÔNG giải thích luyên thuyên, KHÔNG bọc trong markdown (như \`\`\`json), KHÔNG dùng thẻ <THINKING_PROCESS>.${getImagesNotice(imgs)}`;

    try {
      const result = aiService.generateStreamingContent(
        prompt,
        undefined,
        getAIGenFieldSystemInstruction(),
        imgs,
      );

      let fullText = "";
      updateWorldCreation((draft) => {
        // @ts-ignore
        draft.worldData[fieldKey] = "";
      });

      const throttler = createStreamThrottler((cleanText: string) => {
        updateWorldCreation((draft) => {
          // @ts-ignore
          draft.worldData[fieldKey] = cleanText;
        });
      }, 80);

      for await (const chunk of result) {
        if (chunk.text === "[CLEAR_STREAM_BUFFER]") {
          fullText = "";
          throttler.push("");
          continue;
        }
        if (chunk.text) {
          fullText += chunk.text;
          const cleanText = fullText
            .replace(/<THINKING_PROCESS>[\s\S]*?(?:<\/THINKING_PROCESS>|$)/gi, "")
            .replace(/```(?:json|markdown|text|html)?\n?/gi, "")
            .replace(/```/g, "")
            .trimStart();
          throttler.push(cleanText);
        }
      }
      throttler.flush();
      toast.success(`Đã tạo xong mục ${fieldName}`);
    } catch (error) {
      console.error(error);
      toast.error(`Lỗi khi tạo mục ${fieldName}`);
    } finally {
      setGeneratingFields((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleAIGenDifficulty = async (type: "sfw" | "nsfw") => {
    if (!initialIdea.trim()) {
      toast.error("Vui lòng nhập ý tưởng sơ khai trước!");
      return;
    }

    const key = `difficulty_${type}`;
    setGeneratingFields((prev) => ({ ...prev, [key]: true }));

    const otherData = { ...worldData };
    const contextData = {
      worldData: otherData,
      mcData,
      npcs,
      worldDetails,
    };

    const description = type === "sfw" 
      ? "Hãy viết chi tiết về mức độ khó SFW của thế giới (thử thách sinh tồn, tài nguyên khan hiếm, quái vật bá đạo, chiến đấu nguy hiểm, đối thoại xã giao, v.v.). Không viết lan man."
      : "Hãy viết chi tiết về mức độ khó NSFW của thế giới (thử thách tình ái, độ bạo dạn của các NPC nữ, mức độ cám dỗ nhục dục, mức độ giữ kẽ hay dễ dãi trong chuyện giường chiếu, v.v.). Không viết lan man.";

    const currentFieldValue = (worldData.difficulty && typeof worldData.difficulty === "object") ? (worldData.difficulty as any)[type] : "";

    const imgs = referenceImages;
    const prompt = `Bạn là một AI chuyên gia sáng tạo kịch bản thế giới (World Building).\n\nDựa trên:\n- Ý tưởng sơ khai: "${initialIdea}"\n- Ý tưởng phát triển: "${developedIdea}"\n- CHẾ ĐỘ TRANG GIẤY TRẮNG: ${blankSlateMode ? 'BẬT (ON) - Bắt buộc khởi đầu câu chuyện từ lúc MC chưa có gì, từ con số không tròn trĩnh (Level thấp nhất, không có quyền lực/tài sản, là người mới bắt đầu).' : 'TẮT (OFF) - Cho phép MC khởi đầu câu chuyện ở giữa hoặc cuối hành trình (đã có sức mạnh, quyền lực, chức vụ, kinh nghiệm, tài sản... tùy theo logic ý tưởng).'}\n\nVà các thông tin thế giới hiện tại (nếu có):\n\`\`\`json\n${JSON.stringify(contextData, null, 2)}\n\`\`\`\n\nNhiệm vụ của bạn: Hãy phân tích các dữ liệu trên để sáng tạo nội dung mới thật hay, độc đáo, chi tiết, lý tính cho phần ĐỘ KHÓ dạng: "${type.toUpperCase()}".\n\n${description} ĐẢM BẢO TUYỆT ĐỐI tuân thủ Chế Độ Trang Giấy Trắng đang ${blankSlateMode ? 'BẬT' : 'TẮT'}.\n\n${currentFieldValue ? `LƯU Ý QUAN TRỌNG: Người chơi đã nhập sẵn nội dung cho mục này như sau: "${currentFieldValue}". Bạn BẮT BUỘC phải xem xét kỹ nội dung cũ trước; TUYỆT ĐỐI không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi hoặc cần phát triển thêm thì mới sửa lại, nối tiếp hoặc thay thế (nếu nội dung cũ là dạng ý tưởng thì hãy phát triển, triển khai ý tưởng đó thành nội dung hoàn chỉnh), TUYỆT ĐỐI không được làm mất ý chính hay cắt xén dữ liệu ban đầu.\n\n` : ""}LƯU Ý TỐI THƯỢNG: TRẢ VỀ TRỰC TIẾP NỘI DUNG (dạng text thuần túy), KHÔNG giải thích luyên thuyên, KHÔNG bọc trong markdown (như \`\`\`json), KHÔNG dùng thẻ <THINKING_PROCESS>.${getImagesNotice(imgs)}`;

    try {
      const result = aiService.generateStreamingContent(
        prompt,
        undefined,
        getAIGenFieldSystemInstruction(),
        imgs,
      );

      let fullText = "";
      updateWorldCreation((draft) => {
        if (!draft.worldData.difficulty || typeof draft.worldData.difficulty !== "object") {
          draft.worldData.difficulty = { sfw: "", nsfw: "" };
        }
        (draft.worldData.difficulty as any)[type] = "";
      });

      const throttler = createStreamThrottler((cleanText: string) => {
        updateWorldCreation((draft) => {
          if (!draft.worldData.difficulty || typeof draft.worldData.difficulty !== "object") {
            // @ts-ignore
            draft.worldData.difficulty = { sfw: "", nsfw: "" };
          }
          // @ts-ignore
          draft.worldData.difficulty[type] = cleanText;
        });
      }, 80);

      for await (const chunk of result) {
        if (chunk.text === "[CLEAR_STREAM_BUFFER]") {
          fullText = "";
          throttler.push("");
          continue;
        }
        if (chunk.text) {
          fullText += chunk.text;
          const cleanText = fullText
            .replace(/<THINKING_PROCESS>[\s\S]*?(?:<\/THINKING_PROCESS>|$)/gi, "")
            .replace(/```(?:json|markdown|text|html)?\n?/gi, "")
            .replace(/```/g, "")
            .trimStart();
          throttler.push(cleanText);
        }
      }
      throttler.flush();
      toast.success(`Đã tạo xong độ khó ${type.toUpperCase()}`);
    } catch (error) {
      console.error(error);
      toast.error(`Lỗi khi tạo độ khó ${type.toUpperCase()}`);
    } finally {
      setGeneratingFields((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleAIGenAllDifficulty = async () => {
    if (!initialIdea.trim()) {
      toast.error("Vui lòng nhập ý tưởng sơ khai trước!");
      return;
    }
    handleAIGenDifficulty("sfw");
    handleAIGenDifficulty("nsfw");
  };

  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);

  const [showMcCustomMenu, setShowMcCustomMenu] = useState(false);
  const [showNpcCustomMenu, setShowNpcCustomMenu] = useState(false);
  const mcCustomInputRef = useRef<HTMLInputElement>(null);
  const npcCustomInputRef = useRef<HTMLInputElement>(null);
  const mcCustomMenuRef = useRef<HTMLDivElement>(null);
  const npcCustomMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        saveMenuRef.current &&
        !saveMenuRef.current.contains(event.target as Node)
      ) {
        setIsSaveMenuOpen(false);
      }
      if (
        mcCustomMenuRef.current &&
        !mcCustomMenuRef.current.contains(event.target as Node)
      ) {
        setShowMcCustomMenu(false);
      }
      if (
        npcCustomMenuRef.current &&
        !npcCustomMenuRef.current.contains(event.target as Node)
      ) {
        setShowNpcCustomMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [isInitialIdeaCollapsed, setIsInitialIdeaCollapsed] = useState(() => {
    return localStorage.getItem("isInitialIdeaCollapsed") === "true";
  });
  const [isDevelopedIdeaCollapsed, setIsDevelopedIdeaCollapsed] = useState(
    () => {
      return localStorage.getItem("isDevelopedIdeaCollapsed") === "true";
    },
  );
  const [isSuggestionsCollapsed, setIsSuggestionsCollapsed] = useState(() => {
    return localStorage.getItem("isSuggestionsCollapsed") === "true";
  });
  const [collapsedNpcs, setCollapsedNpcs] = useState<Record<number, boolean>>(
    {},
  );

  const toggleNpc = (idx: number) => {
    setCollapsedNpcs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const isAllNpcsCollapsed = npcs.length > 0 && npcs.every((_, idx) => collapsedNpcs[idx]);

  const toggleCollapseAllNpcs = () => {
    if (isAllNpcsCollapsed) {
      setCollapsedNpcs({});
    } else {
      const newCollapsedState: Record<number, boolean> = {};
      npcs.forEach((_, idx) => {
        newCollapsedState[idx] = true;
      });
      setCollapsedNpcs(newCollapsedState);
    }
  };

  useEffect(() => {
    localStorage.setItem(
      "isInitialIdeaCollapsed",
      String(isInitialIdeaCollapsed),
    );
  }, [isInitialIdeaCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      "isDevelopedIdeaCollapsed",
      String(isDevelopedIdeaCollapsed),
    );
  }, [isDevelopedIdeaCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      "isSuggestionsCollapsed",
      String(isSuggestionsCollapsed),
    );
  }, [isSuggestionsCollapsed]);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setGenTimer(0);
      interval = setInterval(() => setGenTimer((prev) => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    let interval: any;
    if (isDevelopingIdea) {
      setDevTimer(0);
      interval = setInterval(() => setDevTimer((prev) => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isDevelopingIdea]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const contentRef = React.useRef<HTMLDivElement>(null);

  const scrollToTop = () =>
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  const scrollToBottom = () =>
    contentRef.current?.scrollTo({
      top: contentRef.current.scrollHeight,
      behavior: "instant",
    });

  // Helper setters that update store
  const setInitialIdea = (val: string) =>
    updateWorldCreation({ initialIdea: val });
  const activeProxyId = useStore((state) => state.activeProxyId);
  const proxies = useStore((state) => state.proxies);

  const setDevelopedIdea = (val: string | ((p: string) => string)) => {
    updateWorldCreation((draft) => {
      draft.developedIdea =
        typeof val === "function" ? val(draft.developedIdea) : val;
    });
  };
  const setWorldData = (val: typeof worldData) =>
    updateWorldCreation({ worldData: val });
  const setMcData = (val: typeof mcData) =>
    updateWorldCreation({ mcData: val });
  const setMcsData = (val: typeof mcsData) =>
    updateWorldCreation({ mcsData: val });
  const setSelectedMcIndex = (val: number) =>
    updateWorldCreation({ selectedMcIndex: val });
  const setNpcs = (val: any) => {
    const nextVal = typeof val === "function" ? val(npcs) : val;
    updateWorldCreation({ npcs: ensureUniqueNpcIds(nextVal) });
  };
  const setWorldDetails = (val: typeof worldDetails) =>
    updateWorldCreation({ worldDetails: val });

  const handleGenerateArraysForMc = async () => {
    const arrayFields = customMcFields.filter((f: any) => f.isArray);
    if (arrayFields.length === 0) {
      toast.error("Không có trường nào tích chọn 'Tạo mảng' ở cấu trúc bảng MC!");
      return;
    }

    setIsGeneratingMcArrays(true);
    const prompt = `Bạn là trợ lý ảo AI chuyên thiết kế thuộc tính nhân vật cho game nhập vai.
Nhiệm vụ của bạn là TẠO KHUÔN MẪU (subFields) cho các trường cấu trúc bảng tùy chỉnh dạng mảng của nhân vật chính (MC).
Thông tin bối cảnh: ${worldCreation.developedIdea || worldCreation.initialIdea}

Các trường mảng cần tạo khuôn mẫu:
${arrayFields.map((f: any) => `- ID: ${f.id}, Tên trường: ${f.label}\n  Định nghĩa: ${f.description || "Không có"}`).join("\n")}

YÊU CẦU ĐẦU RA:
Trả về 1 đối tượng JSON duy nhất có cấu trúc:
{
  "${arrayFields[0]?.id}": [
    { "label": "Tên trường con 1", "description": "Định nghĩa cho người chơi hiểu", "aiRequirement": "Yêu cầu cho AI khi tạo dữ liệu" },
    { "label": "Tên trường con 2", "description": "Định nghĩa", "aiRequirement": "Yêu cầu cho AI" }
  ]
}
Lưu ý: Ví dụ trường 'Tổng quan các quan hệ' có thể gồm các trường con: 'Họ và tên', 'Mối quan hệ', 'Tình trạng', 'Ấn tượng suy nghĩ', 'Cách xưng hô', v.v.
Mỗi trường nên có từ 2 đến 7 trường con tùy mức độ phức tạp.
CHỈ TRẢ VỀ JSON THUẦN TÚY, TUYỆT ĐỐI KHÔNG BỌC TRONG MARKDOWN.`;

    try {
      const imgs = mcReferenceImages.length > 0 ? mcReferenceImages : referenceImages;
      const stream = aiService.generateStreamingContent(prompt + getImagesNotice(imgs), undefined, "Bạn chỉ trả về JSON thuần túy, không giải thích gì thêm.", imgs);
      let text = "";
      for await (const chunk of stream) {
        if (chunk.text && chunk.text !== "[CLEAR_STREAM_BUFFER]") {
          text += chunk.text;
        } else if (chunk.text === "[CLEAR_STREAM_BUFFER]") {
          text = "";
        }
      }
      const jsonStr = text.replace(/^\`\`\`(json)?/m, "").replace(/\`\`\`$/m, "").trim();
      const parsed = JSON.parse(jsonStr);
      
      const newFields = [...customMcFields];
      for (const [id, subFieldsArray] of Object.entries(parsed)) {
        const fieldIndex = newFields.findIndex((f: any) => f.id === id);
        if (fieldIndex !== -1 && Array.isArray(subFieldsArray)) {
          newFields[fieldIndex] = { ...newFields[fieldIndex], subFields: subFieldsArray as any };
        }
      }
      updateWorldCreation({ customMcFields: newFields as any });
      toast.success("Tạo khuôn mảng MC thành công!");
    } catch (error) {
      console.error("Error generating MC array schemas:", error);
      toast.error("Lỗi khi tạo khuôn mảng MC!");
    } finally {
      setIsGeneratingMcArrays(false);
    }
  };

  const [isGeneratingNpcSchemaArrays, setIsGeneratingNpcSchemaArrays] = useState(false);
  const handleGenerateArraysForNpcSchema = async () => {
    const arrayFields = customNpcFields.filter((f: any) => f.isArray);
    if (arrayFields.length === 0) {
      toast.error("Không có trường nào tích chọn 'Tạo mảng' ở cấu trúc bảng NPC!");
      return;
    }

    setIsGeneratingNpcSchemaArrays(true);
    const prompt = `Bạn là trợ lý ảo AI chuyên thiết kế thuộc tính nhân vật cho game nhập vai.
Nhiệm vụ của bạn là TẠO KHUÔN MẪU (subFields) cho các trường cấu trúc bảng tùy chỉnh dạng mảng của NPC (Nhân vật phụ).
Thông tin bối cảnh: ${worldCreation.developedIdea || worldCreation.initialIdea}

Các trường mảng cần tạo khuôn mẫu:
${arrayFields.map((f: any) => `- ID: ${f.id}, Tên trường: ${f.label}\n  Định nghĩa: ${f.description || "Không có"}`).join("\n")}

YÊU CẦU ĐẦU RA:
Trả về 1 đối tượng JSON duy nhất có cấu trúc:
{
  "${arrayFields[0]?.id}": [
    { "label": "Tên trường con 1", "description": "Định nghĩa cho người chơi hiểu", "aiRequirement": "Yêu cầu cho AI khi tạo dữ liệu" },
    { "label": "Tên trường con 2", "description": "Định nghĩa", "aiRequirement": "Yêu cầu cho AI" }
  ]
}
Mỗi trường nên có từ 2 đến 7 trường con tùy mức độ phức tạp.
CHỈ TRẢ VỀ JSON THUẦN TÚY, TUYỆT ĐỐI KHÔNG BỌC TRONG MARKDOWN.`;

    try {
      const imgs = npcReferenceImages.length > 0 ? npcReferenceImages : referenceImages;
      const stream = aiService.generateStreamingContent(prompt + getImagesNotice(imgs), undefined, "Bạn chỉ trả về JSON thuần túy, không giải thích gì thêm.", imgs);
      let text = "";
      for await (const chunk of stream) {
        if (chunk.text && chunk.text !== "[CLEAR_STREAM_BUFFER]") {
          text += chunk.text;
        } else if (chunk.text === "[CLEAR_STREAM_BUFFER]") {
          text = "";
        }
      }
      const jsonStr = text.replace(/^\`\`\`(json)?/m, "").replace(/\`\`\`$/m, "").trim();
      const parsed = JSON.parse(jsonStr);
      
      const newFields = [...customNpcFields];
      for (const [id, subFieldsArray] of Object.entries(parsed)) {
        const fieldIndex = newFields.findIndex((f: any) => f.id === id);
        if (fieldIndex !== -1 && Array.isArray(subFieldsArray)) {
          newFields[fieldIndex] = { ...newFields[fieldIndex], subFields: subFieldsArray as any };
        }
      }
      updateWorldCreation({ customNpcFields: newFields as any });
      toast.success("Tạo khuôn mảng NPC thành công!");
    } catch (error) {
      console.error("Error generating NPC array schemas:", error);
      toast.error("Lỗi khi tạo khuôn mảng NPC!");
    } finally {
      setIsGeneratingNpcSchemaArrays(false);
    }
  };

  const handleResetMC = () => {
    const emptyMc = {
      name: "",
      fullName: "",
      titles: "",
      hideTitle: false,
      occupation: "",
      gender: "",
      age: "",
      dob: "",
      height: "",
      weight: "",
      measurements: "",
      appearance: "",
      background: "",
      rank: "",
      powers: [],
      skills: [],
      personality: "",
      personalityCore: "",
      philosophy: "",
      distinguishingFeatures: "",
      innerSecret: "",
      impression: "",
      relationships: [],
      loveViews: "",
      experience: "",
      nsfwPersonality: "",
      nsfwReactions: "",
      literaryDescription: "",
      goal: "",
      inventory: [],
      statusData: {
        mood: [],
        psychological: [],
        physiological: [],
        health: [],
        condition: [],
      },
      customData: {}
    };
    updateWorldCreation({
      mcsData: [emptyMc],
      mcData: emptyMc,
      selectedMcIndex: 0
    });
    toast.success("Đã xóa sạch thông tin nhân vật chính (MC)!");
  };

  const handleResetNPCs = () => {
    updateWorldCreation({ npcs: [] });
    toast.success("Đã xóa sạch toàn bộ danh sách nhân vật phụ (NPCs)!");
  };

  const handleAIGenerate = async () => {
    if (!initialIdea.trim()) {
      toast.error("Vui lòng nhập ý tưởng sơ khai để AI có thể bắt đầu!");
      return;
    }

    setIsGenerating(true);
    setIsGeneratingStream(true);
    updateStreamData("");

    const currentControl = useStore.getState().phoneAppControl;
    if (currentControl?.messenger === false) {
      updateWorldCreation({ phoneChats: undefined });
    }
    if (currentControl?.discord === false) {
      updateWorldCreation({ mmoChatMessages: undefined });
    }

    try {
      const systemInstruction = getWorldCreationSystemInstruction(isFanfictionModeEnabled, useStore.getState().isVNDialogueModeEnabled);

      const dynamicMcSchemaStr = mcTemplateMode === "custom"
        ? `{\n    "LƯU_Ý_TỐI_THƯỢNG_VỀ_BẢNG_TÙY_CHỈNH": "ĐÂY LÀ BẢNG TÙY CHỈNH (CUSTOM TEMPLATE) CỦA NGƯỜI CHƠI. AI BẮT BUỘC BỎ QUA 100% TẤT CẢ CÁC QUY TẮC CỦA BẢNG MẶC ĐỊNH (như không ép tả ngoại hình khỏa thân 800 chữ chia 5-6 đoạn, không ép số đo ngoặc vuông, không ép phân loại nam nữ, không ép quy định cứng của bảng mặc định). KỂ CẢ KHI TÊN TRƯỜNG TƯƠNG ĐỒNG VỚI BẢNG MẶC ĐỊNH, AI VẪN ĐƯỢC TỰ DO SÁNG TẠO NỘI DUNG TỰ NHIÊN MÀ KHÔNG BỊ MÃ NGUỒN GÒ BÓ. BẮT BUỘC ĐỌC VÀ TUÂN THỦ CHÍNH XÁC YÊU CẦU CỦA NGƯỜI CHƠI CHO TỪNG TRƯỜNG DƯỚI ĐÂY (về nội dung, độ dài, cấu trúc, phong cách... nếu có). Điền đủ 100% các trường, không bỏ trống.",\n    "name": "Tên gọi thông dụng / Nghệ danh / Nickname (Bắt buộc)"${customMcFields && customMcFields.length > 0 ? ',\n' + customMcFields.filter((f: any) => !isRelationshipField(f)).map((f: any) => {
          const reqParts: string[] = [];
          if (f.description) reqParts.push(`Định nghĩa: ${f.description}`);
          if (f.aiRequirement) reqParts.push(`Yêu cầu AI: ${f.aiRequirement}`);
          const reqStr = reqParts.length > 0 ? reqParts.join(" | ") : (f.label || 'Tự do sáng tạo nội dung phù hợp');
          
          if (f.isArray && f.subFields && f.subFields.length > 0) {
             const subFieldsStr = f.subFields.map((sub: any) => `"${sub.label}": "[Mô tả ${sub.label}: ${sub.description || ''} | Yêu cầu AI: ${sub.aiRequirement || ''}]"`).join(", ");
             return `    "${f.id}": [\n      {\n        ${subFieldsStr}\n      }\n    ]`;
          }

          return `    "${f.id}": "[HƯỚNG DẪN & YÊU CẦU CHO TRƯỜNG '${f.label}']: ${reqStr.replace(/"/g, "'")}"`;
        }).join(",\n") : ''},\n    "inventory": [{\n      "name": "Tên vật phẩm",\n      "quantity": 1,\n      "description": "Mô tả công năng / Đặc điểm"\n    }]\n  }`
        : `{
    "name": "Tên gọi thông dụng / Nghệ danh / Nickname (Ví dụ: 'Sơn Tùng M-TP', 'Faker')", 
    "fullName": "Họ và Tên đầy đủ (Ví dụ: 'Nguyễn Thanh Tùng')", 
    "titles": "Danh xưng, Tước hiệu (Ví dụ: 'Sư Tôn', 'Ma Vương'). Để trống nếu không có", 
    "occupation": "Chức vụ, Nghề nghiệp", 
    "gender": "Giới tính", 
    "age": "Tuổi tác (BẮT BUỘC ĐA DẠNG HÓA ĐỘ TUỔI TỪ TRẺ EM, THIẾU NIÊN DƯỚI 18 TUỔI CHO ĐẾN NGƯỜI TRƯỞNG THÀNH, NGƯỜI GIÀ. Khuyến khích tạo nhiều NPC có độ tuổi dưới 18 tuổi hoặc các độ tuổi khác nhau để thế giới phong phú hơn; cho phép ghi kèm mô tả ngoại hình/trạng thái như '500 tuổi (trông như thiếu nữ 18 trẻ đẹp)'; hoặc dùng lời văn miêu tả sinh động đối với nữ thần/thần thánh không xác định tuổi như 'Thuở sơ khai trường tồn cùng thiên địa'. BẮT BUỘC SUY LUẬN LOGIC TUỔI TÁC TRONG QUAN HỆ GIA ĐÌNH / HUYẾT THỐNG: Nếu tạo các NPC thuộc nhóm gia đình như Mẹ - Con, Cha - Con, Ông/Bà - Cháu, Anh/Chị - Em, BẮT BUỘC phải tính chênh lệch tuổi sinh học hợp lý giữa các thế hệ. Ví dụ: Mẹ 32 tuổi thì con lớn nhất chỉ có thể tối đa ~16 tuổi, hoặc nhỏ hơn như 12, 10, 8... TUYỆT ĐỐI CẤM trường hợp phi lý như Mẹ 32 tuổi mà con 20 hay 25 tuổi!)",  
    "dob": "Ngày tháng năm sinh (BẮT BUỘC có Cung Hoàng Đạo nếu bối cảnh phù hợp; cho phép ghi kèm mô tả sinh động đối với nữ thần/thần thánh có năm sinh không xác định)",  
    "rank": "Cấu trúc Cảnh giới hoặc Chỉ số", 
    "height": "Chiều cao", 
    "weight": "Cân nặng", 
    "measurements": "BẮT BUỘC TUÂN THỦ QUY TẮC SAU: Đối với Nữ giới: Số đo 3 vòng và cỡ ngực BẮT BUỘC phải được bỏ trong cặp dấu ngoặc vuông và kết thúc bằng dấu chấm (Ví dụ: '[90-60-90, Cup D]. '). Ngay sau đó BẮT BUỘC viết 1 đoạn văn ngắn miêu tả vóc dáng, ngực, eo, mông, chân tay, vú, lồn... bằng từ ngữ trần trụi thực tế nhất (không lặp lại con số). AI gameplay CHỈ ĐƯỢC ĐỌC VÀ LẤY THÔNG TIN TỪ ĐOẠN VĂN PHÍA SAU DẤU NGOẶC VUÔNG. Đối với Nam giới: Không dùng ngoặc vuông, chỉ viết đoạn văn miêu tả vóc dáng và dương vật/cu/cặc bằng từ ngữ trần trụi thực tế.", 
    "appearance": "MIÊU TẢ CƠ THỂ HOÀN TOÀN KHỎA THÂN: BẮT BUỘC viết tối thiểu 800 chữ, chia 5-6 đoạn lớn (dùng ký tự \\n\\n, cấm dùng thẻ <br>). MỖI ĐOẠN 5-6 CÂU miêu tả bọc lót dạt dào cảm xúc từ đầu đến chân: Đoạn 1 (Khuôn mặt, tóc, cổ, vai), Đoạn 2 (Bầu ngực, nhũ hoa - phải tả rõ hình khối và dùng từ trần trụi bạo dạn), Đoạn 3 (Eo, bụng, hông, mông, đùi), Đoạn 4 (Vùng kín - tả trần trụi và rõ ràng mu, cô bé, rãnh âm hộ... Về Lông mu: Sáng tạo ngẫu nhiên cấu trúc lông mu để tăng tính cá nhân như 'không lông/nhẵn nhụi', 'cực kỳ thưa thớt', 'cắt tỉa gọn gàng', hoặc 'rậm rạp tự nhiên hoang dã'), Đoạn 5 (Làn da, mùi hương, nốt ruồi/hình xăm). CẤM TUYỆT ĐỐI TẢ TRANG PHỤC Ở ĐÂY. Tuyệt đối không chèn nguyên các số đo 3 vòng khô khan vào mà phải chuyển hóa thành lời văn miêu tả sinh động, dễ hiểu.", 
    "distinguishingFeatures": "Đặc trưng nhận diện phụ (Ví dụ: các yếu tố tự nhiên như răng khểnh, má lúm, nốt ruồi hay các yếu tố không tự nhiên như vết sẹo, hình xăm, vết bớt, nhuộm tóc... và rất nhiều đặc điểm bên ngoài khác nữa)", 
    "powers": [{"name": "Tên năng lực/sức mạnh", "description": "Mô tả chi tiết năng lực phi thực tế (như hệ thống, ma pháp, dị năng siêu nhiên... - các ví dụ để hiểu bản chất)", "type": "Loại năng lực (Chủ động/Bị động/Ma pháp...)", "level": "Cấp độ (nếu có)"}], 
    "skills": [{"name": "Tên kỹ năng", "description": "Mô tả chi tiết kỹ năng chuyên môn thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để hiểu bản chất)", "type": "Loại kỹ năng (Chiến đấu/Nghề nghiệp/Xã hội...)", "level": "Độ thuần thục"}], 
    "personality": "Tính cách biểu hiện bề ngoài. BẮT BUỘC BÁM SÁT 100% VÀ PHÙ HỢP TỐI ĐA VỚI Ý TƯỞNG/YÊU CẦU CỦA NGƯỜI CHƠI VỀ TÍNH CÁCH MC (nếu có đề cập). TUYỆT ĐỐI KHÔNG tự ý suy diễn hoặc ghi thêm các từ/nét tính cách mà người chơi không hề nhắc tới (Ví dụ: Nếu người chơi ghi tính cách MC là 'hiền lành', AI CHỈ ĐƯỢC ghi đúng 'hiền lành', TUYỆT ĐỐI CẤM tự ý thêm 'và tốt bụng'). Chỉ tự do sáng tạo/thêm thắt khi người chơi để trống ô ý tưởng hoặc ghi rõ cho phép AI tự do sáng tạo. BẮT BUỘC kết hợp miêu tả thói quen ăn mặc trong các hoàn cảnh: đi học/đi làm, dạo phố, ở nhà và khi ngủ (có thể mặc đồ ngủ, cởi đồ lót hoặc khỏa thân). Trang phục phải phản ánh tính chất công việc/hoàn cảnh ép buộc, hoặc nếu không sẽ phản ánh đúng tính cách và cơ thể.", 
    "personalityCore": "Cốt lõi tính cách thật sự bên trong. BẮT BUỘC BÁM SÁT Ý TƯỞNG NGƯỜI CHƠI. Chú ý xây dựng sự đồng nhất (trong ngoài như một) hoặc mâu thuẫn (diễn kịch, giả tạo, che giấu) với 'personality'.", 
    "philosophy": "Triết lý sống, tín ngưỡng cá nhân. BẮT BUỘC PHÙ HỢP VỚI TÍNH CÁCH VÀ Ý TƯỞNG CỦA NGƯỜI CHƠI.", 
    "goal": "Mục tiêu tối thượng. BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "background": "Nguồn gốc, Xuất thân, Hoàn cảnh khởi đầu", 
    "innerSecret": "Những bí mật sâu kín", 
    "loveViews": "Quan niệm về ái tình, sự chung thủy, tình dục. BẮT BUỘC PHÙ HỢP YÊU CẦU/Ý TƯỞNG NGƯỜI CHƠI.", 
    "experience": "Kinh nghiệm tình trường (trinh tiết, thủ thân hay từng trải)", 
    "nsfwPersonality": "Bản chất khi NSFW (dâm đãng, thẹn thùng, thống trị, phục tùng). BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "nsfwReactions": "Phản ứng cơ thể, tiếng rên, nét mặt khi bị kích thích", 
    "literaryDescription": "Ngoại hình và chân dung văn học khởi đầu hoàn chỉnh cúa MC (Cấm viết spoil diễn biến sắp xảy ra)",
    "inventory": [{
      "name": "Tên loại tiền tệ (Ví dụ: Linh Thạch, Tệ, Vàng...)",
      "quantity": 1000,
      "description": "Tiền tệ chính của nhân vật"
    }, {
      "name": "Tên vật phẩm 2",
      "quantity": 1,
      "description": "Mô tả"
    }]
  }`;

      const dynamicNpcItemSchemaStr = npcTemplateMode === "custom" && customNpcFields && customNpcFields.length > 0
        ? `{\n    "LƯU_Ý_TỐI_THƯỢNG_VỀ_BẢNG_TÙY_CHỈNH": "ĐÂY LÀ BẢNG TÙY CHỈNH (CUSTOM TEMPLATE) CỦA NGƯỜI CHƠI. AI BẮT BUỘC BỎ QUA 100% TẤT CẢ CÁC QUY TẮC CỦA BẢNG MẶC ĐỊNH (như không ép tả ngoại hình khỏa thân 800 chữ chia 5-6 đoạn, không ép số đo ngoặc vuông, không ép phân loại nam nữ, không ép quy định cứng của bảng mặc định). KỂ CẢ KHI TÊN TRƯỜNG TƯƠNG ĐỒNG VỚI BẢNG MẶC ĐỊNH, AI VẪN ĐƯỢC TỰ DO SÁNG TẠO NỘI DUNG TỰ NHIÊN MÀ KHÔNG BỊ MÃ NGUỒN GÒ BÓ. BẮT BUỘC ĐỌC VÀ TUÂN THỦ CHÍNH XÁC YÊU CẦU CỦA NGƯỜI CHƠI CHO TỪNG TRƯỜNG DƯỚI ĐÂY (về nội dung, độ dài, cấu trúc, phong cách... nếu có). Điền đủ 100% các trường, không bỏ trống. ĐẶC BIỆT: CẤM SPOIL TƯƠNG LAI!",\n    "name": "Tên NPC thông dụng / Nghệ danh / Nickname (Bắt buộc)",\n    "role": "Vai trò của NPC trong câu chuyện (Đồng minh, Kẻ thù, Sư phụ, Người yêu, Hộ vệ, Kẻ trung lập...)",\n${customNpcFields.map((f: any) => {
          if (isRelationshipField(f, disableDefaultNpcRelationships)) {
            return `    "${f.id}": [{"name": "Tên nhân vật", "relation": "Mối quan hệ", "status": "Tình trạng", "impression": "Ấn tượng và suy nghĩ chi tiết dành riêng cho người này", "termsOfAddress": ["Cách gọi"], "selfAppellation": ["Cách tự xưng"], "description": "Mô tả chi tiết mối quan hệ / nhân quả"}]`;
          }
          const reqParts: string[] = [];
          if (f.description) reqParts.push(`Định nghĩa: ${f.description}`);
          if (f.aiRequirement) reqParts.push(`Yêu cầu AI: ${f.aiRequirement}`);
          const reqStr = reqParts.length > 0 ? reqParts.join(" | ") : (f.label || 'Tự do sáng tạo nội dung phù hợp');
          
          if (f.isArray && f.subFields && f.subFields.length > 0) {
             const subFieldsStr = f.subFields.map((sub: any) => `"${sub.label}": "[Mô tả ${sub.label}: ${sub.description || ''} | Yêu cầu AI: ${sub.aiRequirement || ''}]"`).join(", ");
             return `    "${f.id}": [\n      {\n        ${subFieldsStr}\n      }\n    ]`;
          }

          return `    "${f.id}": "[HƯỚNG DẪN & YÊU CẦU CHO TRƯỜNG '${f.label}']: ${reqStr.replace(/"/g, "'")}"`;
        }).join(",\n")}${(!disableDefaultNpcRelationships && !customNpcFields.some((f: any) => isRelationshipField(f, disableDefaultNpcRelationships))) ? `,\n    "relationships": [{"name": "Tên nhân vật", "relation": "Mối quan hệ", "status": "Tình trạng", "impression": "Ấn tượng và suy nghĩ chi tiết, cụ thể dành riêng cho người này (Khác biệt hoàn toàn với impression tổng quan)", "termsOfAddress": ["Cách gọi"], "selfAppellation": ["Cách tự xưng (CẤM XƯNG TÊN MÌNH, CHỈ DÙNG ĐẠI TỪ)"], "description": "Mô tả chi tiết. ĐỐI VỚI NPC MỚI TẠO TỪ LƯỢT 0000 TRỞ ĐI, NẾU HỌ ĐÃ GẶP HOẶC BIẾT MC, BẮT BUỘC PHẢI TẠO TỔNG QUAN QUAN HỆ VỚI MC Ở ĐÂY. NGUYÊN TẮC TỐI CẤM SPOIL LÀ NẾU 2 NGƯỜI CHƯA TỪNG GẶP HAY KHÔNG BIẾT NHAU, THÌ TUYỆT ĐỐI KHÔNG TẠO QUAN HỆ TRONG MẢNG NÀY (VD cấm tạo quan hệ kiểu 'Người lạ', 'Chưa gặp mặt' với MC. Hãy để trống [] nếu ko quen ai cả)"}]` : ""}\n  }`
        : `{
    "LƯU_Ý_TỐI_THƯỢNG": "ĐIỀN ĐỦ 100% CÁC TRƯỜNG DƯỚI ĐÂY, NGHIÊM CẤM BỎ TRỐNG, KHÔNG DÙNG 'N/A' HAY '...'. PHẢI SÁNG TẠO ĐẦY ĐỦ. ĐẶC BIỆT: CẤM SPOIL TƯƠNG LAI!",
    "name": "Tên NPC thông dụng / Nghệ danh / Nickname (Ví dụ: 'Sơn Tùng M-TP', 'Faker')", 
    "fullName": "Họ và tên NPC đầy đủ (Ví dụ: 'Nguyễn Thanh Tùng')", 
    "titles": "Danh xưng, Tước hiệu (Ví dụ: 'Sư Tôn', 'Ma Vương'). Để trống nếu không có", 
    "occupation": "Chức vụ, Vai trò", 
    "role": "Vai trò (Vd: Kẻ Địch, Hỗ trợ)",
    "background": "Lai lịch (lồng ghép binh khí, đan dược nếu có). CẤM SPOIL CỐT TRUYỆN MỚI!",
    "gender": "Giới tính", 
    "age": "Tuổi tác (BẮT BUỘC ĐA DẠNG HÓA ĐỘ TUỔI TỪ TRẺ EM, THIẾU NIÊN DƯỚI 18 TUỔI CHO ĐẾN NGƯỜI TRƯỞNG THÀNH, NGƯỜI GIÀ. Khuyến khích tạo nhiều NPC có độ tuổi dưới 18 tuổi hoặc các độ tuổi khác nhau để thế giới phong phú hơn; cho phép ghi kèm mô tả ngoại hình/trạng thái như '500 tuổi (trông như thiếu nữ 18 trẻ đẹp)'; hoặc dùng lời văn miêu tả sinh động đối với nữ thần/thần thánh không xác định tuổi như 'Thuở sơ khai trường tồn cùng thiên địa'. BẮT BUỘC SUY LUẬN LOGIC TUỔI TÁC TRONG QUAN HỆ GIA ĐÌNH / HUYẾT THỐNG: Nếu tạo các NPC thuộc nhóm gia đình như Mẹ - Con, Cha - Con, Ông/Bà - Cháu, Anh/Chị - Em, BẮT BUỘC phải tính chênh lệch tuổi sinh học hợp lý giữa các thế hệ. Ví dụ: Mẹ 32 tuổi thì con lớn nhất chỉ có thể tối đa ~16 tuổi, hoặc nhỏ hơn như 12, 10, 8... TUYỆT ĐỐI CẤM trường hợp phi lý như Mẹ 32 tuổi mà con 20 hay 25 tuổi!)",  
    "dob": "Ngày tháng năm sinh (BẮT BUỘC có Cung Hoàng Đạo nếu bối cảnh phù hợp; cho phép ghi kèm mô tả sinh động đối với nữ thần/thần thánh có năm sinh không xác định)",  
    "rank": "Cảnh giới, Cấp độ", 
    "height": "Chiều cao", 
    "weight": "Cân nặng", 
    "measurements": "BẮT BUỘC TUÂN THỦ QUY TẮC SAU: Đối với Nữ giới: Số đo 3 vòng và cỡ ngực BẮT BUỘC phải được bỏ trong cặp dấu ngoặc vuông và kết thúc bằng dấu chấm (Ví dụ: '[90-60-90, Cup D]. '). Ngay sau đó BẮT BUỘC viết 1 đoạn văn ngắn miêu tả vóc dáng, ngực, eo, mông, chân tay, vú, lồn... bằng từ ngữ trần trụi thực tế nhất (không lặp lại con số). AI gameplay CHỈ ĐƯỢC ĐỌC VÀ LẤY THÔNG TIN TỪ ĐOẠN VĂN PHÍA SAU DẤU NGOẶC VUÔNG. Đối với Nam giới: Không dùng ngoặc vuông, chỉ viết đoạn văn miêu tả vóc dáng và dương vật/cu/cặc bằng từ ngữ trần trụi thực tế.", 
    "appearance": "MIÊU TẢ CƠ THỂ HOÀN TOÀN KHỎA THÂN: BẮT BUỘC viết tối thiểu 800 chữ, chia 5-6 đoạn lớn (dùng ký tự \\n\\n, cấm dùng thẻ <br>). MỖI ĐOẠN 5-6 CÂU miêu tả bọc lót dạt dào cảm xúc từ đầu đến chân: Đoạn 1 (Khuôn mặt, tóc, cổ, vai), Đoạn 2 (Bầu ngực, nhũ hoa - phải tả rõ hình khối và dùng từ trần trụi bạo dạn), Đoạn 3 (Eo, bụng, hông, mông, đùi), Đoạn 4 (Vùng kín - tả trần trụi và rõ ràng mu, cô bé, rãnh âm hộ... Về Lông mu: Sáng tạo ngẫu nhiên cấu trúc lông mu để tăng tính cá nhân như 'không lông/nhẵn nhụi', 'cực kỳ thưa thớt', 'cắt tỉa gọn gàng', hoặc 'rậm rạp tự nhiên hoang dã'), Đoạn 5 (Làn da, mùi hương, nốt ruồi/hình xăm). CẤM TUYỆT ĐỐI TẢ TRANG PHỤC Ở ĐÂY. Tuyệt đối không chèn nguyên các số đo 3 vòng khô khan vào mà phải chuyển hóa thành lời văn miêu tả sinh động, dễ hiểu.", 
    "appearanceLite": "Miêu tả tóm tắt ngắn gọn ngoại hình bề ngoài một cách an toàn và trong sáng (SFW). BẮT BUỘC DÀI TỐI THIỂU 300 CHỮ, CHIA LÀM TỪ 2 ĐẾN 3 ĐOẠN (dùng \\n\\n). BẮT BUỘC CÓ ÍT NHẤT 2 BỘ TRANG PHỤC KHÁC NHAU VÀ CÓ PHẦN MIÊU TẢ KHÍ CHẤT, NÉT MẶT, ÁNH NHÌN, BIỂU CẢM.",
    "powers": [{"name": "Tên năng lực/sức mạnh", "description": "Mô tả chi tiết năng lực phi thực tế (như hệ thống, ma pháp, dị năng siêu nhiên... - các ví dụ để hiểu bản chất)", "type": "Loại năng lực (Chủ động/Bị động/Ma pháp...)", "level": "Cấp độ (nếu có)"}], 
    "skills": [{"name": "Tên kỹ năng", "description": "Mô tả chi tiết kỹ năng chuyên môn thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để hiểu bản chất)", "type": "Loại kỹ năng (Chiến đấu/Nghề nghiệp/Xã hội...)", "level": "Độ thuần thục"}], 
    "personality": "Tính cách biểu hiện bề ngoài. BẮT BUỘC BÁM SÁT 100% VÀ PHÙ HỢP TỐI ĐA VỚI Ý TƯỞNG/YÊU CẦU CỦA NGƯỜI CHƠI VỀ TÍNH CÁCH NPC (nếu có đề cập). TUYỆT ĐỐI KHÔNG tự ý suy diễn hoặc ghi thêm các từ/nét tính cách mà người chơi không hề nhắc tới (Ví dụ: Nếu người chơi ghi tính cách NPC là 'hiền lành', AI CHỈ ĐƯỢC ghi đúng 'hiền lành', TUYỆT ĐỐI CẤM tự ý thêm 'và tốt bụng'). Chỉ tự do sáng tạo/thêm thắt khi người chơi để trống ô ý tưởng hoặc ghi rõ cho phép AI tự do sáng tạo. BẮT BUỘC kết hợp miêu tả thói quen ăn mặc trong các hoàn cảnh: đi học/đi làm, dạo phố, ở nhà và khi ngủ (có thể mặc đồ ngủ, cởi đồ lót hoặc khỏa thân). Trang phục phải phản ánh tính chất công việc/hoàn cảnh ép buộc, hoặc nếu không sẽ phản ánh đúng tính cách và cơ thể.", 
    "personalityCore": "Cốt lõi tính cách thật sự bên trong. BẮT BUỘC BÁM SÁT Ý TƯỞNG NGƯỜI CHƠI. Chú ý xây dựng sự đồng nhất (trong ngoài như một) hoặc mâu thuẫn (diễn kịch, giả tạo, che giấu) với 'personality'.", 
    "philosophy": "Triết lý sống, tín ngưỡng cá nhân. BẮT BUỘC PHÙ HỢP VỚI TÍNH CÁCH VÀ Ý TƯỞNG NGƯỜI CHƠI.", 
    "goal": "Mục tiêu đời người NPC đang theo đuổi. BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "needs": {
      "sfw": "Nhu cầu cơ bản/đời thường (ăn uống, giải trí, mua sắm) và Nhu cầu tình cảm (gia đình, bạn bè, nam nữ) hoặc sinh tồn/quyền lực. Miêu tả sinh động, chi tiết.",
      "nsfw": "Nhu cầu tình dục: Từ việc thỏa mãn sinh lý đến những khao khát/sở thích rất cụ thể trong tình dục. Miêu tả chi tiết."
    },
    "distinguishingFeatures": "Đặc trưng nhận diện phụ (Ví dụ: các yếu tố tự nhiên như răng khểnh, má lúm, nốt ruồi hay các yếu tố không tự nhiên như vết sẹo, hình xăm, vết bớt, nhuộm tóc... và rất nhiều đặc điểm bên ngoài khác nữa)", 
    "innerSecret": "Những bí mật sâu kín NPC che giấu", 
    "impression": "Ấn tượng, suy nghĩ tổng quan của nhân vật về MC và thế giới (ĐỘC LẬP VÀ KHÁC BIỆT HOÀN TOÀN VỚI MỤC IMPRESSION TRONG RELATIONSHIPS, BẮT BUỘC ĐIỀN ĐỦ CẢ HAI)",
    "relationships": [{"name": "Tên nhân vật", "relation": "Mối quan hệ", "status": "Tình trạng", "impression": "Ấn tượng và suy nghĩ chi tiết, cụ thể dành riêng cho người này (Khác biệt hoàn toàn với impression tổng quan ở trên)", "termsOfAddress": ["Cách gọi"], "selfAppellation": ["Cách tự xưng (CẤM XƯNG TÊN MÌNH, CHỈ DÙNG ĐẠI TỪ)"], "description": "Mô tả chi tiết. ĐỐI VỚI NPC MỚI TẠO TỪ LƯỢT 0000 TRỞ ĐI, NẾU HỌ ĐÃ GẶP HOẶC BIẾT MC, BẮT BUỘC PHẢI TẠO TỔNG QUAN QUAN HỆ VỚI MC Ở ĐÂY. NGUYÊN TẮC TỐI CẤM SPOIL LÀ NẾU 2 NGƯỜI CHƯA TỪNG GẶP HAY KHÔNG BIẾT NHAU, THÌ TUYỆT ĐỐI KHÔNG TẠO QUAN HỆ TRONG MẢNG NÀY (VD cấm tạo quan hệ kiểu 'Người lạ', 'Chưa gặp mặt' với MC. Hãy để trống [] nếu ko quen ai cả)"}], 
    "loveViews": "Quan điểm về ái tình, sự chung thủy, tình dục. BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "experience": "Kinh nghiệm tình trường (trinh tiết, thủ thân hay từng trải)", 
    "nsfwPersonality": "Bản chất khi NSFW (dâm đãng, thẹn thùng, thống trị, phục tùng). BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "nsfwReactions": "Phản ứng cơ thể, tiếng rên, nét mặt khi bị kích thích", 
    "preferences": {
      "sfw": "Sở thích, ghét, nỗi sợ ở chế độ SFW",
      "nsfw": "Sở thích, ghét, nỗi sợ ở chế độ NSFW"
    },
    "literaryDescription": "Chân dung văn học khắc họa NPC ban đầu (Tuyệt đối không chèn tiên tri / spoil diễn biến truyện vào phần chân dung này). BẮT BUỘC CÓ THÊM 1 ĐOẠN ĐỂ KỂ VỀ CÁC VẬT PHẨM, TÀI SẢN CỦA NPC."
  }`;

      const prompt = `Ý tưởng người chơi cung cấp:
- Ý tưởng sơ khai: "${initialIdea}"
- Ý tưởng đã phát triển: "${developedIdea}"
- CHẾ ĐỘ TRANG GIẤY TRẮNG: ${blankSlateMode ? 'BẬT (ON) - Bắt buộc khởi đầu câu chuyện từ lúc MC chưa có gì, từ con số không tròn trĩnh (Level thấp nhất, không có quyền lực/tài sản, là người mới bắt đầu).' : 'TẮT (OFF) - Cho phép MC khởi đầu câu chuyện ở giữa hoặc cuối hành trình (đã có sức mạnh, quyền lực, chức vụ, kinh nghiệm, tài sản... tùy theo logic ý tưởng).'}

Dưới đây là các thông tin hiện tại trong các ô nhập liệu (nếu có nội dung, BẮT BUỘC phải đọc và phát triển, làm giàu, chi tiết hóa thêm nội dung cũ, tuyệt đối không được làm mất ý chính ban đầu. Nếu nội dung có dạng ý tưởng, hãy triển khai thành nội dung hoàn chỉnh. Nếu trống, hãy tự do sáng tạo):
\`\`\`json
{
  "worldData": ${JSON.stringify(worldData)},
  "mcData": ${JSON.stringify(mcData)},
  "npcs": ${JSON.stringify(npcs)},
  "worldDetails": ${JSON.stringify(worldDetails)}
}
\`\`\`

[BẮT BUỘC SUY NGHĨ SÂU SẮC]
Trong thẻ <THINKING_PROCESS>, BẮT BUỘC PHẢI SUY NGHĨ SÂU VỀ:
- Quy tắc viết văn, các từ ngữ bị cấm (CẤM dùng 'lạnh lùng', 'ngai ngái', 'sóng vai', 'võng mạc', 'đồng tử', 'đại não', 'sinh lý', 'bánh mật', 'lúa mì', 'phồn thực', tên cỡ Cup trong miêu tả chính văn...), thay bằng từ tả thực tự nhiên.
- Dùng từ chuẩn theo bối cảnh thế giới: NẾU BỐI CẢNH PHƯƠNG TÂY/ISEKAI/FANTASY -> CẤM dùng từ Hán-Việt Tiên hiệp/Cổ đại (đan điền, tu vi, công pháp, giáng lâm...). NẾU BỐI CẢNH TIÊN HIỆP/CỔ ĐẠI PHƯƠNG ĐÔNG -> Dùng đúng sắc thái từ ngữ Phương Đông.
- Rà soát 100% quy tắc dấu câu JSON: CẤM TUYỆT ĐỐI dùng dấu nháy kép " hoặc escape \\" bên trong giá trị chuỗi JSON. Dùng đúng ngoặc đơn '...' cho từ lóng/biệt danh; ngoặc đóng mở lời thoại (「...」) cho hội thoại; ngoặc kép Pháp «...» cho suy nghĩ; ngoặc vuông [...] cho kỹ năng/vật phẩm.

[QUY TẮC BẮT BUỘC VỀ DẤU CÂU KHI TẠO HỒ SƠ MC VÀ NPC TRONG JSON]:
1. CẤM TUYỆT ĐỐI DÙNG DẤU NHÁY KÉP (") HOẶC ESCAPE (\\") BÊN TRONG GIÁ TRỊ CHUỖI JSON:
- Dấu nháy kép " là ký tự dành riêng cho cú pháp định dạng JSON.
- NGHIÊM CẤM TẤT CẢ các dạng nháy kép thô kiểu "biểu tượng" hoặc nháy kép escape kiểu \\"biểu tượng\\" bên trong nội dung văn bản giá trị JSON.
2. BỘ DẤU QUY CHUẨN BẮT BUỘC THAY THẾ 100%:
- DÙNG NGOẶC ĐƠN '...' (SINGLE QUOTES): Dùng cho tất cả các từ lóng, từ trích dẫn, thuật ngữ, biệt danh, biểu tượng hoặc từ cần nhấn mạnh (Ví dụ: 'biểu tượng', 'bạch hổ', 'tiền lẻ', 'mọt sách', 'Tsundere', 'Kuudere', 'khách sộp').
- DÙNG NGOẶC ĐÓNG MỞ LỜI THOẠI QUY CHUẨN (「...」): Dùng cho tất cả các câu hội thoại trực tiếp (Ví dụ: 「Cậu định làm gì đấy?」, 「Để đó cho anh!」, 「Em cảm ơn...」).
- DÙNG NGOẶC KÉP PHÁP «...»: Dùng cho các dòng suy nghĩ nội tâm hoặc tên tác phẩm, tác phong đặc biệt (Ví dụ: «Mình phải làm sao đây?», «Cuốn theo chiều gió»).
- DÙNG NGOẶC VUÔNG [...]: Dùng cho tên các kỹ năng, vật phẩm, chiêu thức, kỹ nghệ (Ví dụ: [Thức tỉnh], [Thần dược], [Kiếm thuật cơ bản]).

Dữ liệu trả về PHẢI là một object JSON duy nhất với cấu trúc chính xác sau:
{
  "worldData": { 
    "name": "Tên của câu chuyện / Tên tựa game (Tuyệt đối không phải tên lục địa/hành tinh/vũ trụ trong game)", 
    "difficulty": {
      "sfw": "Mô tả độ khó SFW cho các tình huống an toàn, sinh tồn, đối thoại bình thường, chiến đấu thực tế",
      "nsfw": "Mô tả độ khó NSFW cho các tình huống người lớn, nhạy cảm, cám dỗ, quan hệ tình dục, quyến rũ"
    },
    "background": "Bối cảnh thế giới chi tiết", 
    "starterTimeline": "Mốc thời gian mở đầu cụ thể (BẮT BUỘC ĐẢM BẢO LOGIC VỚI NĂM SINH NHÂN VẬT, BẮT BUỘC BAO GỒM GIỜ, PHÚT, THỨ, NGÀY, THÁNG, NĂM. Nếu bối cảnh hiện đại không rõ năm, BẮT BUỘC dùng năm 2026)", 
    "starterScenario": "Kịch bản mở đầu lôi cuốn", 
    "worldRules": "Quy tắc, luật lệ, cấm kỵ của thế giới",
    "namingConventions": "Quy tắc đặt tên cho nhân vật, địa danh, vật phẩm (Ví dụ: phong cách Nhật Bản trung cổ, Cyberpunk, v.v.)",
    "genre": "Thể loại (Liệt kê cực kỳ ngắn gọn, không miêu tả dài dòng)",
    "mainMood": "Âm hưởng chủ đạo (Main Mood & Aesthetic - Mô tả rất ngắn gọn)",
    "pacing": "Nhịp độ (Pacing - Trình bày ngắn gọn, súc tích, không miên man)",
    "geography": "Địa lý & Vùng lãnh thổ",
    "worldHistory": "Lịch sử thế giới",
    "culture": "Văn hóa & Phong tục",
    "economy": "Kinh tế & Xã hội",
    "religion": "Tôn giáo & Tín ngưỡng",
    "factions": "Các quốc gia & Thế lực",
    "factionRelations": "Mối quan hệ thế lực",
    "uniqueElements": "Các yếu tố độc đáo",
    "powerSystem": "Hệ thống sức mạnh / Logic phân bậc",
    "logicControl": "Kiểm soát Logic & Yếu tố loại trừ",
    "writingStyle": "Văn Phong (Mô tả NGẮN GỌN SÚC TÍCH văn phong chủ đạo của thế giới này. BẮT BUỘC ĐIỀU CHỈNH CÁCH DÙNG TỪ CHO ĐÚNG BỐI CẢNH. Tuyệt đối không viết lan man dài dòng.)",
    "narrativePerspective": "Ngôi Kể (Chỉ định ngắn gọn (1-2 câu). BẮT BUỘC ghi rõ danh xưng MC tùy ngôi kể: Ngôi 3 gọi là gì (CẤM dùng 'hắn/gã'), Ngôi 1 tự xưng là gì, Ngôi 2 bị gọi là gì. Rất ngắn gọn)"
  },
  "mcData": ${dynamicMcSchemaStr},
  "npcs": [${dynamicNpcItemSchemaStr}],
  "worldDetails": {
    "places": "Mô tả chi tiết các địa điểm quan trọng hoặc những nơi các nhân vật sẽ xuất hiện hoặc đi đến bước đầu",
    "locations": [{
      "name": "Tên địa điểm (từ lớn đến nhỏ, có thể kết hợp cấp bậc Vd: Trường học - Phòng y tế)",
      "description": "Mô tả chi tiết nơi đó có gì và trông như thế nào. TUYỆT ĐỐI KHÔNG đề cập đến nhân vật nào ở đây."
    }]
  }${useStore.getState().phoneAppControl?.messenger !== false ? `,
  "phoneChats": [{
    "chatId": "ID của cuộc trò chuyện (Phải là 'group_1' hoặc trùng khớp với id hoặc name của NPC trong danh sách npcs ở trên)",
    "chatName": "Tên NPC hoặc Tên Nhóm (Vd: 'Nguyễn Tuyết Mai' hoặc 'Nhóm Sống Sót')",
    "isGroup": false,
    "avatar": "Đường dẫn ảnh đại diện hoặc để trống",
    "participants": ["Tên MC đầy đủ", "Tên NPC"],
    "messages": [
      {
        "sender": "Tên người gửi (Tên MC hoặc Tên NPC)",
        "content": "Nội dung chat tự nhiên, ngắn gọn, phù hợp với tính cách, mối quan hệ và hoàn cảnh mạt thế. Thỉnh thoảng chèn thêm [audio](ten_file.mp3) cho chân thực.",
        "timestamp": "Giờ gửi (Vd: '09:15')"
      }
    ]
  }]` : ''}${useStore.getState().phoneAppControl?.discord !== false ? `,
  "mmoChatMessages": {
    "world": [{
      "id": "m_w_1",
      "sender": "Tên người gửi (Có thể là NPC thực trong mảng npcs, hoặc tên tài khoản giả lập khác)",
      "senderId": "ID người gửi (Vd: 'real_Tên_NPC' hoặc 'virt_Tên_Người_Dùng')",
      "isRealNpc": true,
      "avatar": "",
      "text": "Nội dung chat tự nhiên phù hợp với bối cảnh mạt thế nguy hiểm của thế giới ở kênh Thế giới",
      "timestamp": 1718000000000,
      "role": "npc"
    }],
    "trade": [{
      "id": "m_t_1",
      "sender": "Tên người gửi",
      "senderId": "ID người gửi",
      "isRealNpc": true,
      "avatar": "",
      "text": "Nội dung trao đổi vật phẩm, buôn bán sinh tồn ở kênh Giao dịch",
      "timestamp": 1718000000000,
      "role": "npc"
    }],
    "help": [{
      "id": "m_h_1",
      "sender": "Tên người gửi",
      "senderId": "ID người gửi",
      "isRealNpc": true,
      "avatar": "",
      "text": "Nội dung hỏi đáp kinh nghiệm sinh tồn, tân thủ ở kênh Hỏi đáp",
      "timestamp": 1718000000000,
      "role": "npc"
    }],
    "combat": [{
      "id": "m_c_1",
      "sender": "Tên người gửi",
      "senderId": "ID người gửi",
      "isRealNpc": true,
      "avatar": "",
      "text": "Nội dung bàn luận chiến sự, săn boss, PK quái vật ở kênh Chiến sự",
      "timestamp": 1718000000000,
      "role": "npc"
    }]
  }` : ''}
}

LƯU Ý QUAN TRỌNG: NẾU NGƯỜI CHƠI CHỈ NHẬP Ý TƯỞNG SƠ KHAI MÀ KHÔNG NHẬP CÁC THÔNG TIN KHÁC, BẠN PHẢI TỰ ĐỘNG SÁNG TẠO 100% (GHI ĐÈ LÊN CÁC TRƯỜNG DỮ LIỆU CŨ NẾU NÓ KHÔNG PHÙ HỢP VỚI Ý TƯỞNG MỚI NÀY, ĐẶC BIỆT LÀ CÁC NPC CỦA THẾ GIỚI CŨ). 

${(useStore.getState().phoneAppControl?.messenger !== false || useStore.getState().phoneAppControl?.discord !== false) ? `YÊU CẦU ĐẶC BIỆT VỀ ĐỘ DÀI TIN NHẮN CHAT (BẮT BUỘC): Bạn BẮT BUỘC phải sáng tạo ra tổng cộng ĐỦ và ĐÚNG 100 TIN NHẮN CHAT MẪU nằm rải rác trong ${useStore.getState().phoneAppControl?.messenger !== false ? `'phoneChats' (gồm khoảng 5-6 phòng chat cá nhân với từng NPC và ít nhất 1-2 phòng chat nhóm)` : ''}${useStore.getState().phoneAppControl?.messenger !== false && useStore.getState().phoneAppControl?.discord !== false ? ` và ` : ''}${useStore.getState().phoneAppControl?.discord !== false ? `'mmoChatMessages' (chia đều cho 4 kênh World, Trade, Help, Combat)` : ''}. Mọi tin nhắn phải cực kỳ sống động, thể hiện rõ tính cách, mối quan hệ thực tế của các NPC với MC và bối cảnh hiểm nguy của thế giới.
` : ''}

ĐẶC BIỆT LƯU Ý VỀ SỐ LƯỢNG NPC VÀ LOCATIONS: Bạn BẮT BUỘC phải tạo ra ĐỦ số lượng NPC và Location như được yêu cầu trong phần ý tưởng sơ khai (hoặc ít nhất 3 NPC và 3 Location nếu không chỉ định rõ số lượng). Nếu trong cục JSON người chơi cung cấp có số lượng NPC ít hơn yêu cầu, bạn PHẢI TỰ ĐỘNG TẠO THÊM các NPC mới để bù đắp vào mảng npcs cho đủ số lượng. Khi tạo thêm, phải điền đầy đủ 100% tất cả các trường dữ liệu. ĐỐI VỚI MẢNG "relationships" CỦA NPC: BẮT BUỘC điền đầy đủ chi tiết cho cả 3 mục nhỏ là "impression" (Ấn tượng và suy nghĩ), "termsOfAddress" (Mảng các cách xưng hô thường dùng) và "selfAppellation" (Mảng cách tự xưng bản thân), nghiêm cấm lười biếng bỏ qua! Đối với "locations": "Location sẽ chỉ liệt kê các địa điểm từ lớn đến nhỏ và mô tả về nơi đó có gì và trông như thế nào, KHÔNG MANG CÁC NHÂN VẬT VÀO NÓI Ở ĐÂY."`;

      const imgs = referenceImages;
      const result = aiService.generateStreamingContent(
        prompt + getImagesNotice(imgs),
        undefined,
        systemInstruction,
        imgs,
      );

      let fullText = "";
      let streamLog = "";

      const throttler = createStreamThrottler((logText: string) => {
        updateStreamData(logText);
      }, 80);

      for await (const chunk of result) {
        if (chunk.text === "[CLEAR_STREAM_BUFFER]" || chunk.thought === "[CLEAR_STREAM_BUFFER]") {
          fullText = "";
          streamLog = "";
          throttler.push("");
          continue;
        }
        if (chunk.thought) {
          streamLog += chunk.thought;
          throttler.push(streamLog);
        }
        if (chunk.text) {
          fullText += chunk.text;
          streamLog += chunk.text;
          throttler.push(streamLog);
        }
      }
      throttler.flush();

      // Sau khi stream xong, cố gắng parse JSON để cập nhật UI
      try {
        const data = safeParseJSON(fullText);
        if (data) {
          if (data.worldData) setWorldData(data.worldData);
          if (data.mcData) setMcData(data.mcData);
          if (data.npcs) setNpcs(data.npcs);
          if (data.worldDetails) setWorldDetails(data.worldDetails);
          if (data.mmoChatMessages) updateWorldCreation({ mmoChatMessages: data.mmoChatMessages });
          if (data.phoneChats) updateWorldCreation({ phoneChats: data.phoneChats });
          toast.success("Matrix Lite v6 đã sẵn sàng!");
        }
      } catch (parseError) {
        console.warn(
          "Could not parse AI response as JSON perfectly, but stream completed.",
          parseError,
        );
        toast.info(
          "Có lỗi định dạng do độ dài nội dung, AI chưa cấu trúc đủ dữ liệu.",
        );
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      useStore
        .getState()
        .setSystemLogs(
          `[LỖI TẠO THẾ GIỚI - ${new Date().toLocaleTimeString()}] ${error?.message || error}\n\n`,
        );
      toast.error("AI đang bận hoặc gặp lỗi. Vui lòng thử lại sau!");
    } finally {
      setIsGenerating(false);
      setIsGeneratingStream(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    const existingIdea = aiSuggestions.trim();
    setAiSuggestions("");
    try {
      let prompt = `Hãy đóng vai một AI thông thái và sáng tạo. Hãy tổng hợp và gợi ý cho tôi chính xác 10 ý tưởng bối cảnh/vũ trụ game nhập vai (RPG) chi tiết, cuốn hút và KHÔNG TRÙNG LẶP NHAU. Chủ đề có thể về các thể loại hay các thế giới do AI tự sáng tạo, ĐẶC BIỆT cần tham khảo, tổng hợp và lấy cảm hứng từ các truyện chữ, tiểu thuyết, webnovel, phim ngắn của Trung Quốc (như Tu tiên, Cổ đại, Ngôn tình, Đô thị, Võng du...), anime/manga/light novel của Nhật Bản (như Isekai, Mecha, Fantasy, Học đường...), và truyện tranh/manhwa của Hàn Quốc (như Thợ săn, Hệ thống, Hầm ngục, Trùng sinh...).
Yêu cầu phân bổ 10 ý tưởng theo mặc định như sau:
- Ý tưởng 1, 2, 3: Các mô típ quen thuộc.
- Ý tưởng 4, 5, 6, 7: Các mô típ phổ biến hiện nay.
- Ý tưởng 8, 9, 10: Các mô típ đột phá, mới lạ, độc đáo, sáng tạo chưa từng có hoặc hiếm thấy.
LƯU Ý CỰC KỲ QUAN TRỌNG: Mỗi ý tưởng KHÔNG CHỈ xoay quanh bối cảnh, hoàn cảnh thế giới, mà CẦN PHẢI miêu tả cả NHÂN VẬT CHÍNH (MC) (về thân phận, năng lực, hoàn cảnh xuất thân hoặc mục tiêu cốt lõi). Mỗi ý tưởng phải dài ÍT NHẤT 5 CÂU, miêu tả thật chi tiết bối cảnh, nhân vật chính, xung đột cốt lõi và điểm nhấn đặc sắc.`;

      if (existingIdea) {
        prompt += `\n\nLƯU Ý QUAN TRỌNG TỐI THƯỢNG: Người chơi đã nhập sẵn các yêu cầu/nội dung sau đây: \n"""\n${existingIdea}\n"""\nNẾU TRONG NỘI DUNG NÀY NGƯỜI CHƠI CÓ YÊU CẦU CỤ THỂ VỀ SỐ LƯỢNG Ý TƯỞNG HOẶC CHỦ ĐỀ, BẠN BẮT BUỘC PHẢI TUÂN THEO SỐ LƯỢNG VÀ BÁM SÁT YÊU CẦU CỦA NGƯỜI CHƠI THAY VÌ MẶC ĐỊNH LÀ 10 Ý TƯỞNG BÊN TRÊN. Đặc biệt, nếu nội dung có nhắc tới một tác phẩm cụ thể hoặc có từ khóa "Đồng Nhân", bạn PHẢI hiểu là cần tìm và tạo các gợi ý liên quan đến tác phẩm cụ thể đó, hoặc tự chọn các tác phẩm có thật nổi tiếng (phim, truyện, anime, manga...) để tạo các gợi ý Đồng Nhân. Nếu họ chỉ cung cấp ý tưởng chung chung, hãy dùng nó làm định hướng cốt lõi để phát triển thành 10 ý tưởng hoàn chỉnh.`;
      }

      const systemInstruction = `Bạn là một AI chuyên thiết kế bối cảnh thế giới game. Hãy cung cấp số lượng ý tưởng theo đúng yêu cầu (mặc định là 10 ý tưởng nếu không có yêu cầu khác từ người dùng), đảm bảo các ý tưởng không trùng lặp. Mỗi ý tưởng bắt buộc phải có ít nhất 5 câu. Ngôn ngữ: Tiếng Việt 100%.`;
      
      const imgs = getImagesForTab(activeTab);
      const result = aiService.generateStreamingContent(
        prompt + getImagesNotice(imgs),
        undefined,
        systemInstruction,
        imgs,
      );

      let fullText = "";

      for await (const chunk of result) {
        if (chunk.text === "[CLEAR_STREAM_BUFFER]" || chunk.thought === "[CLEAR_STREAM_BUFFER]") {
          fullText = "";
        } else {
          if (chunk.text) {
            fullText += chunk.text;
            setAiSuggestions(fullText);
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi tạo gợi ý!");
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleDevelopIdea = async () => {
    if (!initialIdea.trim()) {
      toast.error("Vui lòng nhập ý tưởng sơ khai!");
      return;
    }

    setIsDevelopingIdea(true);
    setIsGeneratingStream(true);
    updateStreamData(
      ">>> Đang kích hoạt Deep Reasoning Matrix...\n>>> Phân tích ý tưởng sơ khai...\n>>> Kết nối Gemini 3.1 Pro (High Thinking) để phát triển ý tưởng...\n\n",
    );

    try {
      const systemInstruction = getIdeaDeveloperSystemInstruction();
      const prompt = `Từ ý tưởng sơ khai dưới đây:
"${initialIdea}"

${developedIdea ? `LƯU Ý QUAN TRỌNG: Hiện tại ô Ý tưởng phát triển đang có sẵn nội dung sau: "${developedIdea}". Bạn BẮT BUỘC phải đọc và SÁNG TẠO/CẬP NHẬT THÊM để làm giàu nội dung cũ (nếu nó là dạng ý tưởng thì hãy phát triển, triển khai ý tưởng đó thành nội dung hoàn chỉnh), TUYỆT ĐỐI không được làm mất ý chính ban đầu.\n\n` : ""}Hãy tiến hành suy nghĩ trong thẻ <THINKING_PROCESS> và phát triển nó thành một ý tưởng chi tiết, sâu sắc, bao gồm bối cảnh, mâu thuẫn chính và nét độc đáo của thế giới này. 
Hãy trình bày một cách cuốn hút và logic. BẮT BUỘC TRẢ LỜI VÀ SUY NGHĨ TOÀN BỘ BẰNG TIẾNG VIỆT 100%.`;

      const imgs = referenceImages;
      const result = aiService.generateStreamingContent(
        prompt + getImagesNotice(imgs),
        undefined,
        systemInstruction,
        imgs,
      );

      let fullText = "";
      let hasText = false;
      let thoughtBuffer = "";
      let streamLog = "";

      const streamThrottler = createStreamThrottler((logText: string) => {
        updateStreamData(logText);
      }, 80);

      const ideaThrottler = createStreamThrottler((cleanText: string) => {
        setDevelopedIdea(cleanText);
      }, 80);

      setDevelopedIdea("");
      for await (const chunk of result) {
        if (chunk.text === "[CLEAR_STREAM_BUFFER]" || chunk.thought === "[CLEAR_STREAM_BUFFER]") {
          fullText = "";
          hasText = false;
          thoughtBuffer = "";
          streamLog = "";
          ideaThrottler.push("");
          streamThrottler.push("");
          continue;
        }
        if (chunk.thought) {
          thoughtBuffer += chunk.thought;
          streamLog += chunk.thought;
          streamThrottler.push(streamLog);
        }
        if (chunk.text) {
          hasText = true;
          fullText += chunk.text;
          streamLog += chunk.text;
          const cleanText = fullText
            .replace(/<THINKING_PROCESS>[\s\S]*?(?:<\/THINKING_PROCESS>|$)/gi, "")
            .replace(/```(?:json|markdown|text|html)?\n?/gi, "")
            .replace(/```/g, "")
            .trim();
          ideaThrottler.push(cleanText || fullText);
          streamThrottler.push(streamLog);
        }
      }
      streamThrottler.flush();
      ideaThrottler.flush();
      if (!hasText && thoughtBuffer) {
        // Fallback in case the model generated the entire output inside the "thought" section
        setDevelopedIdea(thoughtBuffer);
      }
      toast.success("Ý tưởng đã được phát triển thành công!");
    } catch (error: any) {
      console.error("Develop Idea Error:", error);
      useStore
        .getState()
        .setSystemLogs(
          `[LỖI PHÁT TRIỂN Ý TƯỞNG - ${new Date().toLocaleTimeString()}] ${error?.message || error}\n\n`,
        );
      toast.error("Lỗi khi phát triển ý tưởng.");
    } finally {
      setIsDevelopingIdea(false);
      setIsGeneratingStream(false);
    }
  };

  const handleGenerateMC = async () => {
    if (!mcIdea.trim() && !initialIdea.trim()) {
      toast.error("Vui lòng nhập ý tưởng MC hoặc ý tưởng sơ khai chung!");
      return;
    }

    setIsGeneratingMc(true);
    setIsGeneratingStream(true);
    updateStreamData(">>> Đang phân tích ý tưởng MC...\n\n");

    try {
      const systemInstruction = getWorldCreationSystemInstruction(isFanfictionModeEnabled, useStore.getState().isVNDialogueModeEnabled);

      const dynamicMcSingleSchemaStr = mcTemplateMode === "custom"
        ? `{\n    "LƯU_Ý_TỐI_THƯỢNG_VỀ_BẢNG_TÙY_CHỈNH": "ĐÂY LÀ BẢNG TÙY CHỈNH (CUSTOM TEMPLATE) CỦA NGƯỜI CHƠI. AI BẮT BUỘC BỎ QUA 100% TẤT CẢ CÁC QUY TẮC CỦA BẢNG MẶC ĐỊNH (như không ép tả ngoại hình khỏa thân 800 chữ chia 5-6 đoạn, không ép số đo ngoặc vuông, không ép phân loại nam nữ, không ép quy định cứng của bảng mặc định). KỂ CẢ KHI TÊN TRƯỜNG TƯƠNG ĐỒNG VỚI BẢNG MẶC ĐỊNH, AI VẪN ĐƯỢC TỰ DO SÁNG TẠO NỘI DUNG TỰ NHIÊN MÀ KHÔNG BỊ MÃ NGUỒN GÒ BÓ. BẮT BUỘC ĐỌC VÀ TUÂN THỦ CHÍNH XÁC YÊU CẦU CỦA NGƯỜI CHƠI CHO TỪNG TRƯỜNG DƯỚI ĐÂY (về nội dung, độ dài, cấu trúc, phong cách... nếu có). Điền đủ 100% các trường, không bỏ trống.",\n    "name": "Tên gọi thông dụng / Nghệ danh / Nickname (Bắt buộc)"${customMcFields && customMcFields.length > 0 ? ',\n' + customMcFields.filter((f: any) => !isRelationshipField(f)).map((f: any) => {
          const reqParts: string[] = [];
          if (f.description) reqParts.push(`Định nghĩa: ${f.description}`);
          if (f.aiRequirement) reqParts.push(`Yêu cầu AI: ${f.aiRequirement}`);
          const reqStr = reqParts.length > 0 ? reqParts.join(" | ") : (f.label || 'Tự do sáng tạo nội dung phù hợp');
          return `    "${f.id}": "[HƯỚNG DẪN & YÊU CẦU CHO TRƯỜNG '${f.label}']: ${reqStr.replace(/"/g, "'")}"`;
        }).join(",\n") : ''},\n    "inventory": [{\n      "name": "Tên vật phẩm",\n      "quantity": 1,\n      "description": "Mô tả công năng / Đặc điểm"\n    }]\n  }`
        : `{
    "name": "Tên gọi thông dụng / Nghệ danh / Nickname (Ví dụ: 'Sơn Tùng M-TP', 'Faker')", 
    "fullName": "Họ và Tên đầy đủ (Ví dụ: 'Nguyễn Thanh Tùng')", 
    "titles": "Danh xưng, Tước hiệu (Ví dụ: 'Sư Tôn', 'Ma Vương'). Để trống nếu không có", 
    "occupation": "Chức vụ, Nghề nghiệp", 
    "gender": "Giới tính", 
    "age": "Tuổi tác (BẮT BUỘC ĐA DẠNG HÓA ĐỘ TUỔI TỪ TRẺ EM, THIẾU NIÊN DƯỚI 18 TUỔI CHO ĐẾN NGƯỜI TRƯỞNG THÀNH, NGƯỜI GIÀ. Khuyến khích tạo nhiều NPC có độ tuổi dưới 18 tuổi hoặc các độ tuổi khác nhau để thế giới phong phú hơn; cho phép ghi kèm mô tả ngoại hình/trạng thái như '500 tuổi (trông như thiếu nữ 18 trẻ đẹp)'; hoặc dùng lời văn miêu tả sinh động đối với nữ thần/thần thánh không xác định tuổi như 'Thuở sơ khai trường tồn cùng thiên địa'. BẮT BUỘC SUY LUẬN LOGIC TUỔI TÁC TRONG QUAN HỆ GIA ĐÌNH / HUYẾT THỐNG: Nếu tạo các NPC thuộc nhóm gia đình như Mẹ - Con, Cha - Con, Ông/Bà - Cháu, Anh/Chị - Em, BẮT BUỘC phải tính chênh lệch tuổi sinh học hợp lý giữa các thế hệ. Ví dụ: Mẹ 32 tuổi thì con lớn nhất chỉ có thể tối đa ~16 tuổi, hoặc nhỏ hơn như 12, 10, 8... TUYỆT ĐỐI CẤM trường hợp phi lý như Mẹ 32 tuổi mà con 20 hay 25 tuổi!)",  
    "dob": "Ngày tháng năm sinh (BẮT BUỘC có Cung Hoàng Đạo nếu bối cảnh phù hợp; cho phép ghi kèm mô tả sinh động đối với nữ thần/thần thánh có năm sinh không xác định)",  
    "rank": "Cấu trúc Cảnh giới hoặc Chỉ số", 
    "height": "Chiều cao", 
    "weight": "Cân nặng", 
    "measurements": "BẮT BUỘC TUÂN THỦ QUY TẮC SAU: Đối với Nữ giới: Số đo 3 vòng và cỡ ngực BẮT BUỘC phải được bỏ trong cặp dấu ngoặc vuông và kết thúc bằng dấu chấm (Ví dụ: '[90-60-90, Cup D]. '). Ngay sau đó BẮT BUỘC viết 1 đoạn văn ngắn miêu tả vóc dáng, ngực, eo, mông, chân tay, vú, lồn... bằng từ ngữ trần trụi thực tế nhất (không lặp lại con số). AI gameplay CHỈ ĐƯỢC ĐỌC VÀ LẤY THÔNG TIN TỪ ĐOẠN VĂN PHÍA SAU DẤU NGOẶC VUÔNG. Đối với Nam giới: Không dùng ngoặc vuông, chỉ viết đoạn văn miêu tả vóc dáng và dương vật/cu/cặc bằng từ ngữ trần trụi thực tế.", 
    "appearance": "MIÊU TẢ CƠ THỂ HOÀN TOÀN KHỎA THÂN: BẮT BUỘC viết tối thiểu 800 chữ, chia 5-6 đoạn lớn (dùng ký tự \\n\\n, cấm dùng thẻ <br>). MỖI ĐOẠN 5-6 CÂU miêu tả bọc lót dạt dào cảm xúc từ đầu đến chân: Đoạn 1 (Khuôn mặt, tóc, cổ, vai), Đoạn 2 (Bầu ngực, nhũ hoa - phải tả rõ hình khối và dùng từ trần trụi bạo dạn), Đoạn 3 (Eo, bụng, hông, mông, đùi), Đoạn 4 (Vùng kín - tả trần trụi và rõ ràng mu, cô bé, rãnh âm hộ... Về Lông mu: Sáng tạo ngẫu nhiên cấu trúc lông mu để tăng tính cá nhân như 'không lông/nhẵn nhụi', 'cực kỳ thưa thớt', 'cắt tỉa gọn gàng', hoặc 'rậm rạp tự nhiên hoang dã'), Đoạn 5 (Làn da, mùi hương, nốt ruồi/hình xăm). CẤM TUYỆT ĐỐI TẢ TRANG PHỤC Ở ĐÂY. Tuyệt đối không chèn nguyên các số đo 3 vòng khô khan vào mà phải chuyển hóa thành lời văn miêu tả sinh động, dễ hiểu.", 
    "distinguishingFeatures": "Đặc trưng nhận diện phụ", 
    "powers": [{"name": "Tên năng lực/sức mạnh", "description": "Mô tả chi tiết năng lực phi thực tế (như hệ thống, ma pháp, dị năng siêu nhiên... - các ví dụ để hiểu bản chất)", "type": "Loại năng lực (Chủ động/Bị động/Ma pháp...)", "level": "Cấp độ (nếu có)"}], 
    "skills": [{"name": "Tên kỹ năng", "description": "Mô tả chi tiết kỹ năng chuyên môn thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để hiểu bản chất)", "type": "Loại kỹ năng (Chiến đấu/Nghề nghiệp/Xã hội...)", "level": "Độ thuần thục"}], 
    "personality": "Tính cách biểu hiện bề ngoài. BẮT BUỘC BÁM SÁT 100% VÀ PHÙ HỢP TỐI ĐA VỚI Ý TƯỞNG/YÊU CẦU CỦA NGƯỜI CHƠI VỀ TÍNH CÁCH MC (nếu có đề cập). TUYỆT ĐỐI KHÔNG tự ý suy diễn hoặc ghi thêm các từ/nét tính cách mà người chơi không hề nhắc tới (Ví dụ: Nếu người chơi ghi tính cách MC là 'hiền lành', AI CHỈ ĐƯỢC ghi đúng 'hiền lành', TUYỆT ĐỐI CẤM tự ý thêm 'và tốt bụng'). Chỉ tự do sáng tạo/thêm thắt khi người chơi để trống ô ý tưởng hoặc ghi rõ cho phép AI tự do sáng tạo. BẮT BUỘC kết hợp miêu tả thói quen ăn mặc trong các hoàn cảnh: đi học/đi làm, dạo phố, ở nhà và khi ngủ (có thể mặc đồ ngủ, cởi đồ lót hoặc khỏa thân). Trang phục phải phản ánh tính chất công việc/hoàn cảnh ép buộc, hoặc nếu không sẽ phản ánh đúng tính cách và cơ thể.", 
    "personalityCore": "Cốt lõi tính cách thật sự bên trong. BẮT BUỘC BÁM SÁT Ý TƯỞNG NGƯỜI CHƠI. Chú ý xây dựng sự đồng nhất (trong ngoài như một) hoặc mâu thuẫn (diễn kịch, giả tạo, che giấu) với 'personality'.", 
    "philosophy": "Triết lý sống, tín ngưỡng cá nhân. BẮT BUỘC PHÙ HỢP VỚI TÍNH CÁCH VÀ Ý TƯỞNG NGƯỜI CHƠI.", 
    "goal": "Mục tiêu tối thượng. BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "background": "Nguồn gốc, Xuất thân, Hoàn cảnh khởi đầu", 
    "innerSecret": "Những bí mật sâu kín", 
    "loveViews": "Quan niệm về ái tình, sự chung thủy, tình dục. BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "experience": "Kinh nghiệm tình trường (trinh tiết, thủ thân hay từng trải)", 
    "nsfwPersonality": "Bản chất khi NSFW - BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI", 
    "nsfwReactions": "Phản ứng cơ thể, tiếng rên, nét mặt khi bị kích thích", 
    "literaryDescription": "Ngoại hình và chân dung văn học khởi đầu hoàn chỉnh cúa MC",
    "inventory": [{
      "name": "Tên loại tiền tệ (Ví dụ: Linh Thạch, Tệ, Vàng...)",
      "quantity": 1000,
      "description": "Tiền tệ chính của nhân vật"
    }, {
      "name": "Tên vật phẩm 2",
      "quantity": 1,
      "description": "Mô tả"
    }]
  }`;

      const prompt = `Ý tưởng người chơi cung cấp:
- Ý tưởng sơ khai chung của thế giới: "${initialIdea}"
- Ý tưởng đã phát triển: "${developedIdea}"
- CHẾ ĐỘ TRANG GIẤY TRẮNG: ${blankSlateMode ? 'BẬT (ON) - Bắt buộc khởi đầu câu chuyện từ lúc MC chưa có gì, từ con số không tròn trĩnh (Level thấp nhất, không có quyền lực/tài sản, là người mới bắt đầu).' : 'TẮT (OFF) - Cho phép MC khởi đầu câu chuyện ở giữa hoặc cuối hành trình (đã có sức mạnh, quyền lực, chức vụ, kinh nghiệm, tài sản... tùy theo logic ý tưởng).'}
- Ý tưởng dành riêng cho việc tạo MC: "${mcIdea}"

Dưới đây là các thông tin hiện tại trong các ô nhập liệu (nếu có nội dung, BẮT BUỘC phải đọc và phát triển, làm giàu, chi tiết hóa thêm nội dung cũ, tuyệt đối không được làm mất ý chính ban đầu. Nếu nội dung có dạng ý tưởng, hãy triển khai thành nội dung hoàn chỉnh. Nếu trống, hãy tự do sáng tạo). Hãy phân tích kỹ BỐI CẢNH THẾ GIỚI (worldData, worldDetails) và CÁC NHÂN VẬT ĐÃ CÓ (mcData, mcsData, npcs) để tạo ra nhân vật sao cho thật ăn khớp:
\`\`\`json
{
  "worldData": ${JSON.stringify(worldData)},
  "worldDetails": ${JSON.stringify(worldDetails)},
  "mcsData": ${JSON.stringify(mcsData)},
  "mcData": ${JSON.stringify(mcData)},
  "npcs": ${JSON.stringify(npcs)}
}
\`\`\`

Dựa vào ý tưởng dành riêng cho MC và BỐI CẢNH TỔNG THỂ ở trên, hãy thiết kế và TẠO MỚI các phiên bản nhân vật chính (MC) theo yêu cầu. BẮT BUỘC KHÔNG TÍNH CÁC MC ĐÃ CÓ VÀO SỐ LƯỢNG YÊU CẦU TẠO (ví dụ: nếu yêu cầu tạo 3 MC, hãy tạo ra đúng 3 MC mới hoàn toàn). Nếu người chơi yêu cầu tạo nhiều phiên bản MC khác nhau, hãy tạo đủ số lượng đó. Nếu không nói rõ số lượng, hãy tạo ra 1 MC hoàn chỉnh nhất.
Dữ liệu trả về PHẢI là một object JSON duy nhất với cấu trúc chính xác sau:
{
  "mcsData": [${dynamicMcSingleSchemaStr}]
}
LƯU Ý QUAN TRỌNG: Hãy sáng tạo thật chi tiết dựa trên ý tưởng MC. PHẢI TẠO ĐẦY ĐỦ THÔNG TIN, KHÔNG BỎ TRỐNG BẤT KỲ TRƯỜNG NÀO.`;

      const imgs = mcReferenceImages.length > 0 ? mcReferenceImages : referenceImages;
      const result = aiService.generateStreamingContent(prompt + getImagesNotice(imgs), undefined, systemInstruction, imgs);
      let fullText = "";
      let streamLog = ">>> Đang phân tích ý tưởng MC...\n\n";

      const mcStreamThrottler = createStreamThrottler((logText: string) => {
        updateStreamData(logText);
      }, 80);

      for await (const chunk of result) {
        if (chunk.text === "[CLEAR_STREAM_BUFFER]" || chunk.thought === "[CLEAR_STREAM_BUFFER]") {
          fullText = "";
          streamLog = "";
          mcStreamThrottler.push("");
          continue;
        }
        if (chunk.thought) {
          streamLog += chunk.thought;
          mcStreamThrottler.push(streamLog);
        }
        if (chunk.text) {
          fullText += chunk.text;
          streamLog += chunk.text;
          mcStreamThrottler.push(streamLog);
        }
      }
      mcStreamThrottler.flush();

      try {
        const data = safeParseJSON(fullText);
        if (data) {
          if (data.mcsData && Array.isArray(data.mcsData) && data.mcsData.length > 0) {
            const newMcsData = [...mcsData, ...data.mcsData];
            setMcsData(newMcsData);
            if (newMcsData.length > 1) {
              setSelectedMcIndex(-1);
              toast.success(`Đã tạo và thêm ${data.mcsData.length} phiên bản MC thành công! Vui lòng chọn 1 phiên bản.`);
            } else {
              setMcData(newMcsData[0]);
              setSelectedMcIndex(0);
              toast.success(`Đã tạo 1 phiên bản MC thành công!`);
            }
          } else if (data.mcData) {
            // fallback
            const newMcsData = [...mcsData, data.mcData];
            setMcsData(newMcsData);
            if (newMcsData.length > 1) {
              setSelectedMcIndex(-1);
              toast.success(`Đã tạo và thêm 1 phiên bản MC thành công! Vui lòng chọn 1 phiên bản.`);
            } else {
              setMcData(newMcsData[0]);
              setSelectedMcIndex(0);
              toast.success("Đã tạo MC thành công!");
            }
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Lỗi phân tích cú pháp JSON cho MC.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Gặp lỗi trong quá trình tạo MC.");
    } finally {
      setIsGeneratingMc(false);
      setIsGeneratingStream(false);
    }
  };

  const handleGenerateNPCs = async () => {
    if (!npcIdea.trim() && !initialIdea.trim()) {
      toast.error("Vui lòng nhập ý tưởng NPCs hoặc ý tưởng sơ khai chung!");
      return;
    }

    setIsGeneratingNpc(true);
    setIsGeneratingStream(true);
    updateStreamData(">>> Đang phân tích ý tưởng NPCs...\n\n");

    try {
      const systemInstruction = getWorldCreationSystemInstruction(isFanfictionModeEnabled, useStore.getState().isVNDialogueModeEnabled);

      const dynamicNpcSingleSchemaStr = npcTemplateMode === "custom" && customNpcFields && customNpcFields.length > 0
        ? `{\n    "LƯU_Ý_TỐI_THƯỢNG_VỀ_BẢNG_TÙY_CHỈNH": "ĐÂY LÀ BẢNG TÙY CHỈNH (CUSTOM TEMPLATE) CỦA NGƯỜI CHƠI. AI BẮT BUỘC BỎ QUA 100% TẤT CẢ CÁC QUY TẮC CỦA BẢNG MẶC ĐỊNH (như không ép tả ngoại hình khỏa thân 800 chữ chia 5-6 đoạn, không ép số đo ngoặc vuông, không ép phân loại nam nữ, không ép quy định cứng của bảng mặc định). KỂ CẢ KHI TÊN TRƯỜNG TƯƠNG ĐỒNG VỚI BẢNG MẶC ĐỊNH, AI VẪN ĐƯỢC TỰ DO SÁNG TẠO NỘI DUNG TỰ NHIÊN MÀ KHÔNG BỊ MÃ NGUỒN GÒ BÓ. BẮT BUỘC ĐỌC VÀ TUÂN THỦ CHÍNH XÁC YÊU CẦU CỦA NGƯỜI CHƠI CHO TỪNG TRƯỜNG DƯỚI ĐÂY (về nội dung, độ dài, cấu trúc, phong cách... nếu có). Điền đủ 100% các trường, không bỏ trống. TRÁNH VIẾT CỤT LỦN!",\n    "name": "Tên NPC thông dụng / Nghệ danh / Nickname (Bắt buộc)",\n    "role": "Vai trò của NPC trong câu chuyện (Đồng minh, Kẻ thù, Sư phụ, Người yêu, Hộ vệ, Kẻ trung lập...)",\n${customNpcFields.map((f: any) => {
          if (isRelationshipField(f, disableDefaultNpcRelationships)) {
            return `    "${f.id}": [{"name": "Tên nhân vật", "relation": "Mối quan hệ", "status": "Tình trạng", "impression": "Ấn tượng và suy nghĩ chi tiết dành riêng cho người này", "termsOfAddress": ["Cách gọi"], "selfAppellation": ["Cách tự xưng"], "description": "Mô tả chi tiết mối quan hệ / nhân quả"}]`;
          }
          const reqParts: string[] = [];
          if (f.description) reqParts.push(`Định nghĩa: ${f.description}`);
          if (f.aiRequirement) reqParts.push(`Yêu cầu AI: ${f.aiRequirement}`);
          const reqStr = reqParts.length > 0 ? reqParts.join(" | ") : (f.label || 'Tự do sáng tạo nội dung phù hợp');

          if (f.isArray && f.subFields && f.subFields.length > 0) {
            const subFieldsStr = f.subFields.map((sub: any) => `"${sub.label}": "[Mô tả ${sub.label}: ${sub.description || ''} | Yêu cầu AI: ${sub.aiRequirement || ''}]"`).join(", ");
            return `    "${f.id}": [\n      {\n        ${subFieldsStr}\n      }\n    ]`;
          }

          return `    "${f.id}": "[HƯỚNG DẪN & YÊU CẦU CHO TRƯỜNG '${f.label}']: ${reqStr.replace(/"/g, "'")}"`;
        }).join(",\n")}${(!disableDefaultNpcRelationships && !customNpcFields.some((f: any) => isRelationshipField(f, disableDefaultNpcRelationships))) ? `,\n    "relationships": [{"name": "Tên nhân vật", "relation": "Mối quan hệ", "status": "Tình trạng", "impression": "Ấn tượng và suy nghĩ chi tiết, cụ thể dành riêng cho người này", "termsOfAddress": ["Cách gọi"], "selfAppellation": ["Cách tự xưng"], "description": "Mô tả chi tiết mối quan hệ / nhân quả"}]` : ""}\n  }`
        : `{
    "LƯU_Ý_TỐI_THƯỢNG": "ĐIỀN ĐỦ 100% CÁC TRƯỜNG DƯỚI ĐÂY, NGHIÊM CẤM BỎ TRỐNG, NGHIÊM CẤM DÙNG TỪ 'N/A' HAY '...' TỰ PHẢI SÁNG TẠO RA DỮ LIỆU LOGIC CHO ĐẦY ĐỦ! [QUAN TRỌNG: ƯU TIÊN SFW TRONG KHỞI TẠO NPC (KIỂM SOÁT NSFW NGHIÊM NGẶT): Khi tạo mới bất kỳ NPC nào, BẮT BUỘC ưu tiên nội dung SFW, trong sáng và bình thường cho NPC đó. Tuyệt đối KHÔNG tự ý xen lẫn, nhồi nhét tính chất NSFW, quá nhiều dục vọng hay miêu tả nhạy cảm vào NPC nếu trong ý tưởng không có. CHỈ các mục nào được chỉ định rõ ràng liên quan tới NSFW (như nsfwPersonality, nsfwExperience, nsfwReactions) thì mới được phép có nội dung NSFW. AI PHẢI ĐA DẠNG HÓA CÁC TẦNG LỚP VÀ NGOẠI HÌNH NPC KHI TẠO MỚI. TRÁNH VIỆC CHỈ TẠO RA CÁC NPC CÓ NHAN SẮC, TÀI NĂNG, XUẤT THÂN QUÁ XUẤT CHÚNG/VƯỢT TRỘI MỘT CÁCH VÔ LÝ. HÃY TẠO CẢ NHỮNG NPC CÓ NGOẠI HÌNH BÌNH THƯỜNG, ĐỜI THƯỜNG, VỚI NHỮNG KHUYẾT ĐIỂM, NÉT TƯƠNG ĐỒNG VỚI NGƯỜI BÌNH THƯỜNG ĐỂ THẾ GIỚI CHÂN THỰC VÀ CÂN BẰNG HƠN (VÍ DỤ: 1 CÔ NỮ SINH BÌNH THƯỜNG, 1 NGƯỜI DÂN DÃ, 1 NHÂN VIÊN VĂN PHÒNG, V.V.). TUYỆT ĐỐI KHÔNG TẠO MỘT DÀN NPC QUÁ KHÁC BIỆT HOẶC AI CŨNG NHƯ THẦN TIÊN LỘNG LẪY, BỞI VÌ ĐỜI THƯỜNG LÀ MỘT SỰ GIỐNG NHAU CÓ CHÚT ÍT KHÁC BIỆT MÀ THÔI.]",
    "name": "Tên NPC thông dụng / Nghệ danh / Nickname (Phải khác với các NPC hiện tại. Ví dụ: 'Sơn Tùng M-TP', 'Faker')", 
    "fullName": "Họ và tên NPC đầy đủ (Ví dụ: 'Nguyễn Thanh Tùng')", 
    "titles": "Danh xưng, Tước hiệu (Ví dụ: 'Sư Tôn', 'Ma Vương'). Để trống nếu không có", 
    "occupation": "Chức vụ, Vai trò", 
    "role": "Vai trò",
    "background": "Lai lịch",
    "gender": "Giới tính", 
    "age": "Tuổi tác (BẮT BUỘC ĐA DẠNG HÓA ĐỘ TUỔI TỪ TRẺ EM, THIẾU NIÊN DƯỚI 18 TUỔI CHO ĐẾN NGƯỜI TRƯỞNG THÀNH, NGƯỜI GIÀ. Khuyến khích tạo nhiều NPC có độ tuổi dưới 18 tuổi hoặc các độ tuổi khác nhau để thế giới phong phú hơn; cho phép ghi kèm mô tả ngoại hình/trạng thái như '500 tuổi (trông như thiếu nữ 18 trẻ đẹp)'; hoặc dùng lời văn miêu tả sinh động đối với nữ thần/thần thánh không xác định tuổi như 'Thuở sơ khai trường tồn cùng thiên địa'. BẮT BUỘC SUY LUẬN LOGIC TUỔI TÁC TRONG QUAN HỆ GIA ĐÌNH / HUYẾT THỐNG: Nếu tạo các NPC thuộc nhóm gia đình như Mẹ - Con, Cha - Con, Ông/Bà - Cháu, Anh/Chị - Em, BẮT BUỘC phải tính chênh lệch tuổi sinh học hợp lý giữa các thế hệ. Ví dụ: Mẹ 32 tuổi thì con lớn nhất chỉ có thể tối đa ~16 tuổi, hoặc nhỏ hơn như 12, 10, 8... TUYỆT ĐỐI CẤM trường hợp phi lý như Mẹ 32 tuổi mà con 20 hay 25 tuổi!)",  
    "dob": "Ngày tháng năm sinh (BẮT BUỘC có Cung Hoàng Đạo nếu bối cảnh phù hợp; cho phép ghi kèm mô tả sinh động đối với nữ thần/thần thánh có năm sinh không xác định)",  
    "rank": "Cảnh giới, Cấp độ", 
    "height": "Chiều cao", 
    "weight": "Cân nặng", 
    "measurements": "BẮT BUỘC TUÂN THỦ QUY TẮC SAU: Đối với Nữ giới: Số đo 3 vòng và cỡ ngực BẮT BUỘC phải được bỏ trong cặp dấu ngoặc vuông và kết thúc bằng dấu chấm (Ví dụ: '[90-60-90, Cup D]. '). Ngay sau đó BẮT BUỘC viết 1 đoạn văn ngắn miêu tả vóc dáng, ngực, eo, mông, chân tay, vú, lồn... bằng từ ngữ trần trụi thực tế nhất (không lặp lại con số). AI gameplay CHỈ ĐƯỢC ĐỌC VÀ LẤY THÔNG TIN TỪ ĐOẠN VĂN PHÍA SAU DẤU NGOẶC VUÔNG. Đối với Nam giới: Không dùng ngoặc vuông, chỉ viết đoạn văn miêu tả vóc dáng và dương vật/cu/cặc bằng từ ngữ trần trụi thực tế.", 
    "appearance": "MIÊU TẢ CƠ THỂ HOÀN TOÀN KHỎA THÂN: BẮT BUỘC viết tối thiểu 800 chữ, chia 5-6 đoạn lớn (dùng ký tự \\n\\n, cấm dùng thẻ <br>). MỖI ĐOẠN 5-6 CÂU miêu tả bọc lót dạt dào cảm xúc từ đầu đến chân: Đoạn 1 (Khuôn mặt, tóc, cổ, vai), Đoạn 2 (Bầu ngực, nhũ hoa - phải tả rõ hình khối và dùng từ trần trụi bạo dạn), Đoạn 3 (Eo, bụng, hông, mông, đùi), Đoạn 4 (Vùng kín - tả trần trụi và rõ ràng mu, cô bé, rãnh âm hộ... Về Lông mu: Sáng tạo ngẫu nhiên cấu trúc lông mu để tăng tính cá nhân như 'không lông/nhẵn nhụi', 'cực kỳ thưa thớt', 'cắt tỉa gọn gàng', hoặc 'rậm rạp tự nhiên hoang dã'), Đoạn 5 (Làn da, mùi hương, nốt ruồi/hình xăm). CẤM TUYỆT ĐỐI TẢ TRANG PHỤC Ở ĐÂY. Tuyệt đối không chèn nguyên các số đo 3 vòng khô khan vào mà phải chuyển hóa thành lời văn miêu tả sinh động, dễ hiểu.", 
    "appearanceLite": "Miêu tả tóm tắt ngắn gọn ngoại hình bề ngoài một cách an toàn và trong sáng (SFW). BẮT BUỘC DÀI TỐI THIỂU 300 CHỮ, CHIA LÀM TỪ 2 ĐẾN 3 ĐOẠN (dùng \\n\\n). BẮT BUỘC CÓ ÍT NHẤT 2 BỘ TRANG PHỤC KHÁC NHAU VÀ CÓ PHẦN MIÊU TẢ KHÍ CHẤT, NÉT MẶT, ÁNH NHÌN, BIỂU CẢM.",
    "powers": [{"name": "Tên năng lực/sức mạnh", "description": "Mô tả chi tiết năng lực phi thực tế (như hệ thống, ma pháp, dị năng siêu nhiên... - các ví dụ để hiểu bản chất)", "type": "Loại năng lực (Chủ động/Bị động/Ma pháp...)", "level": "Cấp độ (nếu có)"}], 
    "skills": [{"name": "Tên kỹ năng", "description": "Mô tả chi tiết kỹ năng chuyên môn thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để hiểu bản chất)", "type": "Loại kỹ năng (Chiến đấu/Nghề nghiệp/Xã hội...)", "level": "Độ thuần thục"}], 
    "personality": "Tính cách biểu hiện bề ngoài. BẮT BUỘC BÁM SÁT 100% VÀ PHÙ HỢP TỐI ĐA VỚI Ý TƯỞNG/YÊU CẦU CỦA NGƯỜI CHƠI VỀ TÍNH CÁCH NPC (nếu có đề cập). TUYỆT ĐỐI KHÔNG tự ý suy diễn hoặc ghi thêm các từ/nét tính cách mà người chơi không hề nhắc tới (Ví dụ: Nếu người chơi ghi tính cách NPC là 'hiền lành', AI CHỈ ĐƯỢC ghi đúng 'hiền lành', TUYỆT ĐỐI CẤM tự ý thêm 'và tốt bụng'). Chỉ tự do sáng tạo/thêm thắt khi người chơi để trống ô ý tưởng hoặc ghi rõ cho phép AI tự do sáng tạo. BẮT BUỘC kết hợp miêu tả thói quen ăn mặc trong các hoàn cảnh: đi học/đi làm, dạo phố, ở nhà và khi ngủ (có thể mặc đồ ngủ, cởi đồ lót hoặc khỏa thân). Trang phục phải phản ánh tính chất công việc/hoàn cảnh ép buộc, hoặc nếu không sẽ phản ánh đúng tính cách và cơ thể.", 
    "personalityCore": "Cốt lõi tính cách thật sự bên trong. BẮT BUỘC BÁM SÁT Ý TƯỞNG NGƯỜI CHƠI. Chú ý xây dựng sự đồng nhất (trong ngoài như một) hoặc mâu thuẫn (diễn kịch, giả tạo, che giấu) với 'personality'.", 
    "philosophy": "Triết lý sống, tín ngưỡng cá nhân. BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "goal": "Mục tiêu đời người NPC đang theo đuổi. BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "needs": {
      "sfw": "Nhu cầu cơ bản/đời thường (ăn uống, giải trí, mua sắm) và Nhu cầu tình cảm (gia đình, bạn bè, nam nữ) hoặc sinh tồn/quyền lực. Miêu tả sinh động, chi tiết.",
      "nsfw": "Nhu cầu tình dục: Từ việc thỏa mãn sinh lý đến những khao khát/sở thích rất cụ thể trong tình dục. Miêu tả chi tiết."
    },
    "distinguishingFeatures": "Đặc trưng nhận diện phụ", 
    "innerSecret": "Những bí mật sâu kín NPC che giấu", 
    "impression": "Ấn tượng, suy nghĩ tổng quan của nhân vật về MC và thế giới (ĐỘC LẬP VÀ KHÁC BIỆT HOÀN TOÀN VỚI MỤC IMPRESSION TRONG RELATIONSHIPS, BẮT BUỘC ĐIỀN ĐỦ CẢ HAI)",
    "relationships": [{"name": "Họ và tên đầy đủ của nhân vật", "relation": "Mối quan hệ", "status": "Tình trạng", "impression": "Ấn tượng và suy nghĩ chi tiết, cụ thể dành riêng cho người này (Khác biệt hoàn toàn với impression tổng quan ở trên)", "termsOfAddress": ["Cách xưng hô 1"], "selfAppellation": ["Cách tự xưng 1"], "description": "Mô tả chi tiết"}], 
    "loveViews": "Quan điểm về ái tình, sự chung thủy, tình dục. BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI.", 
    "experience": "Kinh nghiệm tình trường", 
    "nsfwPersonality": "Bản chất khi NSFW - BẮT BUỘC PHÙ HỢP Ý TƯỞNG NGƯỜI CHƠI", 
    "nsfwReactions": "Phản ứng cơ thể", 
    "preferences": {
      "sfw": "Sở thích, ghét, nỗi sợ ở chế độ SFW",
      "nsfw": "Sở thích, ghét, nỗi sợ ở chế độ NSFW"
    },
    "literaryDescription": "Chân dung văn học khắc họa NPC ban đầu."
  }`;

      const prompt = `Ý tưởng người chơi cung cấp:
- Ý tưởng sơ khai chung của thế giới: "${initialIdea}"
- Ý tưởng đã phát triển: "${developedIdea}"
- CHẾ ĐỘ TRANG GIẤY TRẮNG: ${blankSlateMode ? 'BẬT (ON) - Bắt buộc khởi đầu câu chuyện từ lúc MC chưa có gì, từ con số không tròn trĩnh (Level thấp nhất, không có quyền lực/tài sản, là người mới bắt đầu).' : 'TẮT (OFF) - Cho phép MC khởi đầu câu chuyện ở giữa hoặc cuối hành trình (đã có sức mạnh, quyền lực, chức vụ, kinh nghiệm, tài sản... tùy theo logic ý tưởng).'}
- Ý tưởng dành riêng cho việc tạo NPCs: "${npcIdea}"

Dưới đây là các thông tin hiện tại trong các ô nhập liệu (nếu có nội dung, BẮT BUỘC phải đọc và phát triển, làm giàu, chi tiết hóa thêm nội dung cũ, tuyệt đối không được làm mất ý chính ban đầu. Nếu nội dung có dạng ý tưởng, hãy triển khai thành nội dung hoàn chỉnh. Nếu trống, hãy tự do sáng tạo). Hãy phân tích kỹ BỐI CẢNH THẾ GIỚI (worldData, worldDetails) và CÁC NHÂN VẬT ĐÃ CÓ (mcData, mcsData, npcs) để tạo ra nhân vật sao cho thật ăn khớp:
\`\`\`json
{
  "worldData": ${JSON.stringify(worldData)},
  "worldDetails": ${JSON.stringify(worldDetails)},
  "mcsData": ${JSON.stringify(mcsData)},
  "mcData": ${JSON.stringify(mcData)},
  "npcs": ${JSON.stringify(npcs)}
}
\`\`\`

Dựa vào ý tưởng dành riêng cho NPCs và BỐI CẢNH TỔNG THỂ ở trên, hãy thiết kế và tạo mới các nhân vật phụ (NPCs). 
BẮT BUỘC KHÔNG ĐƯỢC TRÙNG TÊN VỚI CÁC NPC ĐÃ CÓ TRONG DANH SÁCH (nếu có).
LƯU Ý CỰC KỲ QUAN TRỌNG VỀ SỰ ĐỘC BẢN CỦA TỪNG NPC MỚI: BẠN BẮT BUỘC PHẢI SÁNG TẠO MỚI HOÀN TOÀN TỪNG NHÂN VẬT, NGHIÊM CẤM VIỆC "SAO CHÉP, COPY, XÀO NẤU" LẠI CÁC NPC ĐÃ CÓ (như copy paste profile cũ rồi chỉ đổi tên/đổi chút ngoại hình). Cấm sự lười biếng lặp lại các khuôn mẫu. Mọi NPC mới sinh ra đều phải là MỘT CÁ THỂ MỚI CÓ BẢN SẮC, SỨC MẠNH, VÀ TÂM LÝ ĐỘC LẬP - TRỪ KHI trong Ý tưởng người chơi có dặn rõ ràng là bắt buộc phải copy hoặc nhân bản từ ai đó.
Dữ liệu trả về PHẢI là một object JSON duy nhất với cấu trúc chính xác sau:
{
  "newNpcs": [${dynamicNpcSingleSchemaStr}]
}
LƯU Ý QUAN TRỌNG: Hãy tạo ra ĐỦ số lượng NPC như được yêu cầu trong phần ý tưởng NPCs. PHẢI TẠO ĐẦY ĐỦ THÔNG TIN, KHÔNG BỎ TRỐNG BẤT KỲ TRƯỜNG NÀO. ĐỐI VỚI MẢNG "relationships" CỦA NPC: BẮT BUỘC điền đầy đủ chi tiết cho cả 3 mục nhỏ là "impression", "termsOfAddress" và "selfAppellation".`;

      const imgs = npcReferenceImages.length > 0 ? npcReferenceImages : referenceImages;
      const result = aiService.generateStreamingContent(prompt + getImagesNotice(imgs), undefined, systemInstruction, imgs);
      let fullText = "";
      let streamLog = ">>> Đang phân tích ý tưởng NPCs...\n\n";

      const npcStreamThrottler = createStreamThrottler((logText: string) => {
        updateStreamData(logText);
      }, 80);

      for await (const chunk of result) {
        if (chunk.text === "[CLEAR_STREAM_BUFFER]" || chunk.thought === "[CLEAR_STREAM_BUFFER]") {
          fullText = "";
          streamLog = "";
          npcStreamThrottler.push("");
          continue;
        }
        if (chunk.thought) {
          streamLog += chunk.thought;
          npcStreamThrottler.push(streamLog);
        }
        if (chunk.text) {
          fullText += chunk.text;
          streamLog += chunk.text;
          npcStreamThrottler.push(streamLog);
        }
      }
      npcStreamThrottler.flush();

      try {
        const data = safeParseJSON(fullText);
        if (data) {
          if (data.newNpcs && Array.isArray(data.newNpcs)) {
            setNpcs([...npcs, ...data.newNpcs]);
            toast.success(`Đã tạo và thêm ${data.newNpcs.length} NPCs thành công!`);
          } else if (data.npcs && Array.isArray(data.npcs)) {
            // fallback if it uses "npcs"
            setNpcs([...npcs, ...data.npcs]);
            toast.success(`Đã tạo và thêm ${data.npcs.length} NPCs thành công!`);
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Lỗi phân tích cú pháp JSON cho NPCs.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Gặp lỗi trong quá trình tạo NPCs.");
    } finally {
      setIsGeneratingNpc(false);
      setIsGeneratingStream(false);
    }
  };

  const handleGenerateTemplate = async (target: "mc" | "npc", idea: string) => {
    if (!idea.trim()) {
      toast.error("Vui lòng nhập ý tưởng về bảng thông tin trước!");
      return;
    }
    
    setIsGeneratingStream(true);
    updateStreamData("Đang phân tích ý tưởng và thiết kế bảng thông tin...");

    const prompt = `Bạn là một AI chuyên gia hàng đầu về thiết kế bảng hồ sơ nhân vật (Character Profile Sheet / Character Template) cho game nhập vai (RPG), Visual Novel, tiểu thuyết tương tác.

YÊU CẦU / Ý TƯỞNG CỦA NGƯỜI CHƠI: "${idea}"

NGUYÊN TẮC CỐT LÕI BẮT BUỘC KHI THIẾT KẾ BẢNG THÔNG TIN TÙY CHỈNH:
1. LUÔN ĐẦY ĐỦ THÔNG TIN ĐỊNH DANH VÀ CHI TIẾT CON NGƯỜI CƠ BẢN:
   Bảng thông tin nhân vật LUÔN PHẢI CÓ đầy đủ các trường định danh cá nhân và các thông tin chi tiết nền tảng mà một con người/nhân vật hoàn chỉnh cần có, bao gồm:
   - Thông tin định danh: Họ và tên / Danh xưng / Biệt hiệu, Tuổi tác / Ngày sinh, Giới tính.
   - Ngoại hình & Diện mạo: Mô tả ngoại hình chi tiết, Chiều cao, Cân nặng, Vóc dáng / Đặc điểm nhận dạng nổi bật.
   - Tâm lý & Tính cách: Tính cách cốt lõi, Sở thích, Điều ghét, Thói quen.
   - Thân phận & Xã hội: Thân phận / Địa vị / Nghề nghiệp, Xuất thân / Gia thế, Mối quan hệ xã hội / Gia đình.
   - Động lực & Tiểu sử: Bối cảnh quá khứ / Tiểu sử tóm tắt, Mục tiêu / Lý tưởng sống.

2. KẾT HỢP VỚI CÁC YẾU TỐ ĐẶC THÙ THEO Ý TƯỞNG / THỂ LOẠI ĐƯỢC YÊU CẦU:
   Sau khi đã đảm bảo đầy đủ các trường nền tảng định danh con người ở trên, hãy kết hợp và tích hợp thêm các trường đặc trưng chuyên sâu phù hợp với thể loại/ý tưởng của người chơi (ví dụ: Tu tiên -> Linh căn, Cảnh giới, Pháp bảo, Công pháp tu luyện; Cyberpunk -> Cấy ghép công nghệ, Dữ liệu sinh trắc, Cyberware; Fantasy -> Hệ nguyên tố, Kỹ năng ma pháp; Mạt thế -> Dị năng, Kháng thể, Chỉ số sinh tồn; Học đường -> Lớp học, Thành tích, Câu lạc bộ, v.v.).

3. BẮT BUỘC CÓ 1 TRƯỜNG DÀNH RIÊNG CHO MỐI QUAN HỆ / NHÂN QUẢ / DUYÊN NỢ:
   - Trong mảng danh sách các trường (dành cho cả MC và NPC), BẮT BUỘC phải tạo đúng 1 trường đại diện cho các mối quan hệ, nhân quả, duyên nợ hoặc tương tác xã hội.
   - Sáng tạo tên hiển thị (label) cho trường này thật linh hoạt phù hợp với bối cảnh/ý tưởng (Ví dụ: 'Mối Quan Hệ & Tương Tác', 'Nhân Quả & Duyên NỢ', 'Bằng Hữu & Thù Địch', 'Duyên Phận & Ràng Buộc'...).
   - Đặt id có chứa 'relationship', 'quan_he' hoặc 'nhan_qua' (Ví dụ: 'relationships' hoặc 'relationshipOverview' hoặc 'nhanQuaDuyenNo').
   - type: 'textarea'.
   - description: 'Quản lý danh sách các mối quan hệ, tương tác, nhân quả duyên nợ của nhân vật với các đối tượng khác.'
   - aiRequirement: 'Cập nhật danh sách các mối quan hệ, trạng thái thái độ, xưng hô và ấn tượng.'
   - LƯU Ý VỀ HIỂN THỊ: Mục này chỉ hiển thị trên giao diện của NPC. Đối với MC, mục mối quan hệ này do AI tạo ra vẫn tồn tại trong cấu trúc làm mẫu cho NPC, nhưng hệ thống sẽ tự động ẩn khỏi giao diện hiển thị của MC và không gửi cho AI khi xử lý MC.

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Trả về duy nhất 1 mảng JSON hợp lệ chứa danh sách các trường (fields), BẮT BUỘC ĐIỀN ĐẦY ĐỦ TẤT CẢ CÁC TRƯỜNG VÀ CÁC THUỘC TÍNH (không được bỏ trống bất kỳ thuộc tính nào):
[
  {
    "id": "chuỗi_viết_liền_không_dấu_kiểu_camelCase (ví dụ: fullName, age, gender, appearance, personality, background, linhCan, congPhap...)",
    "label": "Tên Hiển Thị Tiếng Việt (ngắn gọn, trực quan, chuyên nghiệp)",
    "type": "input" | "textarea",
    "description": "Hướng dẫn hoặc định nghĩa chi tiết, rõ ràng về nội dung của trường này cho AI và người chơi hiểu bản chất",
    "aiRequirement": "Yêu cầu chi tiết cho AI (về cách viết, độ dài, phong cách, lưu ý đặc thù khi tạo nội dung cho trường này)"
  }
]

LƯU Ý: 
- BẮT BUỘC tạo nội dung đầy đủ cho TẤT CẢ các thuộc tính: id, label, type, description, aiRequirement cho từng trường.
- Các trường ngắn (như tên, tuổi, giới tính, nghề nghiệp, cảnh giới...) dùng type: "input".
- Các trường mô tả dài (như ngoại hình, tính cách, tiểu sử, kỹ năng, quan hệ...) dùng type: "textarea".
- Đảm bảo tính khoa học, mạch lạc, sắp xếp logic từ thông tin cơ bản định danh con người đến các đặc tính mở rộng theo bối cảnh.
- CHỈ TRẢ VỀ JSON ARRAY HỢP LỆ, KHÔNG GIẢI THÍCH GÌ THÊM.`;

    try {
      const stream = aiService.generateStreamingContent(
        prompt,
        undefined,
        "Bạn chỉ trả về mảng JSON thuần túy, tuyệt đối không bọc trong markdown hay text nào khác.",
      );

      let text = "";
      for await (const chunk of stream) {
        if (chunk.text && chunk.text !== "[CLEAR_STREAM_BUFFER]") {
          text += chunk.text;
        }
      }

      text = text.replace(/\`\`\`(?:json)?\n?/gi, "").replace(/\`\`\`/g, "").trim();
      try {
        const fields = JSON.parse(text);
        if (Array.isArray(fields)) {
          if (target === "mc") {
            updateWorldCreation({ customMcFields: fields });
          } else {
            updateWorldCreation({ customNpcFields: fields });
          }
          toast.success("Đã tạo bảng thông tin tùy chỉnh!");
        }
      } catch (e) {
        toast.error("Lỗi parse JSON từ AI.");
      }
    } catch (e) {
      toast.error("Lỗi khi tạo template.");
    } finally {
      setIsGeneratingStream(false);
    }
  };

  const handleGenerateLocation = async () => {
    if (!locationIdea.trim() && !initialIdea.trim()) {
      toast.error("Vui lòng nhập ý tưởng Location hoặc ý tưởng sơ khai chung!");
      return;
    }

    setIsGeneratingLocation(true);
    setIsGeneratingStream(true);
    updateStreamData(">>> Đang phân tích ý tưởng Location...\n\n");

    try {
      const systemInstruction = getWorldCreationSystemInstruction(isFanfictionModeEnabled, useStore.getState().isVNDialogueModeEnabled);

      const prompt = `Ý tưởng người chơi cung cấp:
- Ý tưởng sơ khai chung của thế giới: "${initialIdea}"
- Ý tưởng đã phát triển: "${developedIdea}"
- CHẾ ĐỘ TRANG GIẤY TRẮNG: ${blankSlateMode ? 'BẬT (ON) - Bắt buộc khởi đầu câu chuyện từ lúc MC chưa có gì, từ con số không tròn trĩnh (Level thấp nhất, không có quyền lực/tài sản, là người mới bắt đầu).' : 'TẮT (OFF) - Cho phép MC khởi đầu câu chuyện ở giữa hoặc cuối hành trình (đã có sức mạnh, quyền lực, chức vụ, kinh nghiệm, tài sản... tùy theo logic ý tưởng).'}
- Ý tưởng dành riêng cho việc tạo Location: "${locationIdea}"

Dưới đây là các thông tin hiện tại trong các ô nhập liệu (nếu có nội dung, BẮT BUỘC phải đọc và phát triển, làm giàu, chi tiết hóa thêm nội dung cũ, tuyệt đối không được làm mất ý chính ban đầu. Nếu nội dung có dạng ý tưởng, hãy triển khai thành nội dung hoàn chỉnh. Nếu trống, hãy tự do sáng tạo). Hãy phân tích kỹ BỐI CẢNH THẾ GIỚI (worldData, worldDetails) để tạo ra các địa điểm sao cho thật ăn khớp. KHÔNG ĐƯỢC MANG NHÂN VẬT VÀO MÔ TẢ ĐỊA ĐIỂM:
\`\`\`json
{
  "worldData": ${JSON.stringify(worldData)},
  "worldDetails": ${JSON.stringify(worldDetails)}
}
\`\`\`

Dựa vào ý tưởng dành riêng cho Location và BỐI CẢNH TỔNG THỂ ở trên, hãy thiết kế và tạo mới các địa điểm (Location).
LƯU Ý QUAN TRỌNG TỪ NGƯỜI CHƠI: "Location sẽ chỉ liệt kê các địa điểm từ lớn đến nhỏ (ví dụ ở nhà thì trong nhà có nơi nào và phòng gì, ở trường thì trong trường có nơi nào và phòng gì) và mô tả về nơi đó có gì và trông như thế nào, KHÔNG MANG CÁC NHÂN VẬT VÀO NÓI Ở ĐÂY."
BẮT BUỘC KHÔNG ĐƯỢC TRÙNG TÊN VỚI CÁC LOCATION ĐÃ CÓ TRONG DANH SÁCH (nếu có).
Dữ liệu trả về PHẢI là một object JSON duy nhất với cấu trúc chính xác sau:
{
  "newLocations": [{
    "name": "Tên địa điểm (từ lớn đến nhỏ, có thể kết hợp cấp bậc Vd: Trường học - Phòng y tế)", 
    "description": "Mô tả chi tiết nơi đó có gì và trông như thế nào. TUYỆT ĐỐI KHÔNG đề cập đến nhân vật nào ở đây."
  }]
}
LƯU Ý QUAN TRỌNG: Hãy tạo ra ĐỦ số lượng Location như được yêu cầu trong phần ý tưởng Location. PHẢI TẠO ĐẦY ĐỦ THÔNG TIN, KHÔNG BỎ TRỐNG BẤT KỲ TRƯỜNG NÀO.`;

      const imgs = locationReferenceImages.length > 0 ? locationReferenceImages : referenceImages;
      const result = aiService.generateStreamingContent(prompt + getImagesNotice(imgs), undefined, systemInstruction, imgs);
      let fullText = "";
      let streamLog = ">>> Đang phân tích ý tưởng Location...\n\n";

      const locStreamThrottler = createStreamThrottler((logText: string) => {
        updateStreamData(logText);
      }, 80);

      for await (const chunk of result) {
        if (chunk.text === "[CLEAR_STREAM_BUFFER]" || chunk.thought === "[CLEAR_STREAM_BUFFER]") {
          fullText = "";
          streamLog = "";
          locStreamThrottler.push("");
          continue;
        }
        if (chunk.thought) {
          streamLog += chunk.thought;
          locStreamThrottler.push(streamLog);
        }
        if (chunk.text) {
          fullText += chunk.text;
          streamLog += chunk.text;
          locStreamThrottler.push(streamLog);
        }
      }
      locStreamThrottler.flush();

      try {
        const data = safeParseJSON(fullText);
        if (data) {
          if (data.newLocations && Array.isArray(data.newLocations)) {
            const currentLocs = worldDetails.locations || [];
            setWorldDetails({ ...worldDetails, locations: [...currentLocs, ...data.newLocations] });
            toast.success(`Đã tạo và thêm ${data.newLocations.length} Locations thành công!`);
          } else if (data.locations && Array.isArray(data.locations)) {
            const currentLocs = worldDetails.locations || [];
            setWorldDetails({ ...worldDetails, locations: [...currentLocs, ...data.locations] });
            toast.success(`Đã tạo và thêm ${data.locations.length} Locations thành công!`);
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Lỗi phân tích cú pháp JSON cho Locations.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Gặp lỗi trong quá trình tạo Locations.");
    } finally {
      setIsGeneratingLocation(false);
      setIsGeneratingStream(false);
    }
  };

  const handleCreate = () => {
    if (!worldData.name.trim()) {
      toast.error("Vui lòng nhập tên thế giới!");
      return;
    }
    if (mcsData.length > 1 && selectedMcIndex === -1) {
      toast.error("Bạn đã tạo nhiều phiên bản MC. Vui lòng chọn 1 phiên bản MC trước khi bắt đầu!");
      setActiveTab("mc");
      return;
    }
    toast.success(`Đang khởi tạo thế giới "${worldData.name}"...`);
    // Clear old messages and set game data
    useStore.getState().setMessages([]);
    useStore.getState().setMessengerReadChatIds(() => ({}));
    useStore.getState().setUnreadMessages(0);
    
    useStore.getState().setPhoneWallpaper("https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?q=80&w=2560&auto=format&fit=crop");
    useStore.getState().setPhoneTheme("dark");
    useStore.getState().setPlayerRules(playerRules);
    useStore.getState().setNpcBuilder({
      prompt: "",
      images: [],
      generatedNPCs: [],
      streamedText: "",
      streamedThought: "",
      isInputOpen: true,
      expandedNpcIndexes: [],
    });
    setGameData({
      initialIdea,
      developedIdea,
      worldData,
      mcData,
      originalMcData: JSON.parse(JSON.stringify(mcData)),
      npcs,
      originalNpcs: JSON.parse(JSON.stringify(npcs)),
      worldDetails,
      mmoChatMessages: worldCreation.mmoChatMessages || {},
      phone: { chats: worldCreation.phoneChats || [] },
      messengerReadChatIds: {},
      mcTemplateMode: worldCreation.mcTemplateMode,
      npcTemplateMode: worldCreation.npcTemplateMode,
      blankSlateMode: worldCreation.blankSlateMode ?? true,
      disableDefaultNpcRelationships: worldCreation.disableDefaultNpcRelationships || false,
      customMcFields: worldCreation.customMcFields,
      customNpcFields: worldCreation.customNpcFields,
      customMcConditions: worldCreation.customMcConditions,
      customNpcConditions: worldCreation.customNpcConditions,
      playerRules: playerRules || "",
      actionSuggestionsConfig: useStore.getState().actionSuggestionsConfig || "",
    });
    setTimeout(() => {
      navigate("/gameplay");
    }, 1000);
  };

  const handleSaveData = () => {
    const dataToSave = {
      playerRules,
      initialIdea,
      developedIdea,
      worldData,
      mcData,
      npcs,
      worldDetails,
      mcTemplateMode: worldCreation.mcTemplateMode,
      npcTemplateMode: worldCreation.npcTemplateMode,
      blankSlateMode: worldCreation.blankSlateMode ?? true,
      disableDefaultNpcRelationships: worldCreation.disableDefaultNpcRelationships || false,
      customMcFields: worldCreation.customMcFields,
      customNpcFields: worldCreation.customNpcFields,
      customMcConditions: worldCreation.customMcConditions,
      customNpcConditions: worldCreation.customNpcConditions,
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Tên game + tên thế giới + tên MC + ngày tháng năm
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getFullYear()}`;
    // Replace matching characters but keep Vietnamese characters if possible, or just replace spaces
    const safeWorldName = worldData.name
      ? worldData.name.replace(/\s+/g, "_")
      : "TheGioi";
    const safeMcName = mcData.name ? mcData.name.replace(/\s+/g, "_") : "MC";
    a.download = `Matrix_Lite_v6_${safeWorldName}_${safeMcName}_${dateStr}.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsSaveMenuOpen(false);
  };

  const handleLoadDataClick = () => {
    fileInputRef.current?.click();
    setIsSaveMenuOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        updateWorldCreation(data);
        toast.success("Tải dữ liệu thế giới thành công!");
      } catch (err) {
        toast.error("Tệp không hợp lệ hoặc dữ liệu bị lỗi!");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input to allow loading the same file again if needed
  };

  const exportMcCustomFields = () => {
    const payload = {
      type: "mc_custom_fields",
      fields: worldCreation.customMcFields || [],
      conditions: worldCreation.customMcConditions || { enabled: false, groups: [] }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "mc_custom_fields.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowMcCustomMenu(false);
  };

  const importMcCustomFields = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          // Định dạng mảng danh sách trường cũ
          updateWorldCreation({ customMcFields: data });
          toast.success("Tải bảng Custom MC thành công!");
        } else if (data && typeof data === 'object') {
          // Định dạng mới hỗ trợ cả danh sách trường và điều kiện kích hoạt
          const fields = Array.isArray(data.fields) 
            ? data.fields 
            : (Array.isArray(data.customMcFields) ? data.customMcFields : []);
          const conditions = data.conditions || data.customMcConditions;
          updateWorldCreation({
            customMcFields: fields,
            ...(conditions !== undefined ? { customMcConditions: conditions } : {})
          });
          toast.success("Tải bảng Custom MC và Điều kiện thành công!");
        } else {
          toast.error("Định dạng không hợp lệ!");
        }
      } catch (err) {
        toast.error("Tệp không hợp lệ hoặc bị lỗi!");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
    setShowMcCustomMenu(false);
  };

  const exportNpcCustomFields = () => {
    const payload = {
      type: "npc_custom_fields",
      fields: worldCreation.customNpcFields || [],
      conditions: worldCreation.customNpcConditions || { enabled: false, groups: [] }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "npc_custom_fields.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowNpcCustomMenu(false);
  };

  const importNpcCustomFields = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          // Định dạng mảng danh sách trường cũ
          updateWorldCreation({ customNpcFields: data });
          toast.success("Tải bảng Custom NPCs thành công!");
        } else if (data && typeof data === 'object') {
          // Định dạng mới hỗ trợ cả danh sách trường và điều kiện kích hoạt
          const fields = Array.isArray(data.fields) 
            ? data.fields 
            : (Array.isArray(data.customNpcFields) ? data.customNpcFields : []);
          const conditions = data.conditions || data.customNpcConditions;
          updateWorldCreation({
            customNpcFields: fields,
            ...(conditions !== undefined ? { customNpcConditions: conditions } : {})
          });
          toast.success("Tải bảng Custom NPCs và Điều kiện thành công!");
        } else {
          toast.error("Định dạng không hợp lệ!");
        }
      } catch (err) {
        toast.error("Tệp không hợp lệ hoặc bị lỗi!");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
    setShowNpcCustomMenu(false);
  };

  const tabs = [
    { id: "world", label: "World", icon: Globe },
    { id: "mc", label: "MC", icon: User },
    { id: "npc", label: "NPCs", icon: Sword },
    { id: "items", label: "Location", icon: MapPin },
  ] as const;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Sticky Header */}
      <div
        className={`sticky top-0 z-30 w-full backdrop-blur-3xl border-b border-white/5 py-4 px-4 md:px-6 lg:px-8 ${theme.bgClass}/80 shadow-lg shadow-black/5`}
      >
        <div className="w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Action Row */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div className="relative" ref={saveMenuRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)}
                className={`p-2.5 rounded-xl border transition-all shadow-md cursor-pointer flex items-center gap-1 ${
                  theme.group === "Dark"
                    ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                    : "border-black/10 bg-white/80 text-[#334155] hover:bg-black/5"
                }`}
                title="Dữ liệu"
              >
                <Save size={20} />
                <ChevronDownIcon
                  size={14}
                  className={`transition-transform ${isSaveMenuOpen ? "rotate-180" : ""}`}
                />
              </motion.button>

              <AnimatePresence>
                {isSaveMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute top-full left-0 mt-2 w-48 rounded-xl border shadow-2xl overflow-hidden z-50 ${
                      theme.group === "Dark"
                        ? "border-white/10 bg-black/90 backdrop-blur-xl text-white"
                        : "border-black/10 bg-white/80 text-[#334155]"
                    }`}
                  >
                    <button
                      onClick={handleSaveData}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left ${
                        theme.group === "Dark"
                          ? "text-white/80 hover:text-white hover:bg-white/10"
                          : "text-[#334155] hover:text-[#0f172a] hover:bg-black/5"
                      }`}
                    >
                      <Download size={16} />
                      Lưu vào máy tính
                    </button>
                    <div
                      className={`h-[1px] w-full ${theme.group === "Dark" ? "bg-white/10" : "bg-black/10"}`}
                    />
                    <button
                      onClick={handleLoadDataClick}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left ${
                        theme.group === "Dark"
                          ? "text-white/80 hover:text-white hover:bg-white/10"
                          : "text-[#334155] hover:text-[#0f172a] hover:bg-black/5"
                      }`}
                    >
                      <Upload size={16} />
                      Tải lên từ máy
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFullScreenStream(true)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 px-3 ${
                theme.group === "Dark"
                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  : "border-black/10 bg-white/80 text-[#334155] hover:bg-black/5"
              }`}
              title="Stream"
            >
              <Radio
                size={20}
                className={isGenerating ? "animate-pulse text-red-500" : ""}
              />
              <span className="text-sm font-bold hidden md:inline">Stream</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                resetWorldCreation();
              }}
              className={`p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-all text-red-400 cursor-pointer flex items-center gap-2 px-3`}
              title="Reset"
            >
              <X size={20} />
              <span className="text-sm font-bold hidden md:inline">RESET</span>
            </motion.button>

            <div
              className={`flex rounded-xl border p-1 ${theme.group === "Dark" ? "bg-white/5 border-white/10" : "bg-white/80 border-black/10 shadow-sm"}`}
            >
              <button
                onClick={scrollToTop}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${theme.group === "Dark" ? "text-white/70 hover:text-white hover:bg-white/10" : "text-[#334155] hover:text-[#0f172a] hover:bg-black/5"}`}
                title="Lên trên"
              >
                <ChevronUp size={18} />
              </button>
              <button
                onClick={scrollToBottom}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${theme.group === "Dark" ? "text-white/70 hover:text-white hover:bg-white/10" : "text-[#334155] hover:text-[#0f172a] hover:bg-black/5"}`}
                title="Xuống dưới"
              >
                <ChevronDown size={18} />
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              className={`p-2.5 rounded-xl border border-blue-500/30 bg-blue-600 hover:bg-blue-500 transition-all text-white shadow-lg shadow-blue-600/20 cursor-pointer flex items-center gap-2 px-4 md:px-6 shrink-0`}
              title="Start"
            >
              <Play size={20} className="fill-current" />
              <span className="text-sm font-black italic hidden md:inline tracking-widest">
                START
              </span>
            </motion.button>
          </div>

          {/* Navigation Tabs Row */}
          <div
            className={`flex p-1 rounded-xl border backdrop-blur-md overflow-x-auto no-scrollbar scrollbar-hide w-fit ${theme.group === "Dark" ? "bg-white/5 border-white/10" : "bg-white/80 border-black/10 shadow-xs"}`}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const label =
                tab.id === "npc" ? `NPCs (${npcs.length})` : tab.label;
              const isDark = theme.group === "Dark";
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as CreationTab)}
                  className={`px-3 md:px-5 py-2 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold flex items-center gap-2 transition-all relative cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? isDark
                        ? theme.textPrimary
                        : "text-white font-bold"
                      : isDark
                        ? "text-white/40 hover:text-white/70"
                        : "text-[#334155]/70 hover:text-[#0f172a]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-creation-tab"
                      className={`absolute inset-0 rounded-lg md:rounded-xl ${isDark ? "bg-white/20 border border-white/10 shadow-lg shadow-white/5" : "bg-slate-800 border border-amber-700 shadow-md shadow-amber-500/10"}`}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <tab.icon className="w-3 md:w-4 h-3 md:h-4 z-10" />
                  <span className="z-10">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scrollable Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-6 md:px-8 lg:px-6 xl:px-8 pt-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <div className="space-y-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-12"
                >
                  {activeTab === "world" && (
                    <div className="flex flex-col gap-10 items-stretch">
                      {/* Ideas Section */}
                      <div className="space-y-10">
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() =>
                                setIsInitialIdeaCollapsed(
                                  !isInitialIdeaCollapsed,
                                )
                              }
                              className={`text-sm font-bold uppercase tracking-widest ${theme.textSecondary} flex items-center gap-2 hover:text-white transition-colors cursor-pointer group`}
                            >
                              <BrainCircuit className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />{" "}
                              Ý tưởng sơ khai
                              {isInitialIdeaCollapsed ? (
                                <ChevronDown className="w-4 h-4 opacity-70" />
                              ) : (
                                <ChevronUp className="w-4 h-4 opacity-70" />
                              )}
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateWorldCreation({ blankSlateMode: !blankSlateMode })}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${blankSlateMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30 hover:bg-slate-500/30'}`}
                                title={blankSlateMode ? "Bật: MC xuất phát từ con số 0." : "Tắt: MC có thể đã đạt thành tựu gì đó."}
                              >
                                <span>Trang giấy trắng:</span>
                                <span>{blankSlateMode ? 'ON' : 'OFF'}</span>
                              </button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleAIGenerate}
                                disabled={isGenerating}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-bold hover:bg-purple-600/30 transition-all cursor-pointer disabled:opacity-50 relative overflow-hidden group"
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>{formatTime(genTimer)}</span>
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-4 h-4" />
                                  <span>AI Sáng tạo tất cả</span>
                                </>
                              )}
                              {isGenerating && (
                                <motion.div
                                  layoutId="gen-progress"
                                  className="absolute bottom-0 left-0 h-0.5 bg-purple-500 w-full"
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              )}
                            </motion.button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {!isInitialIdeaCollapsed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden p-1 -m-1"
                              >
                                <CharacterTextArea
                                  label=""
                                  value={initialIdea}
                                  onChange={setInitialIdea}
                                  placeholder="Mô tả ngắn gọn về vũ trụ (ví dụ: Một hòn đảo bay nơi rồng và robot cùng tồn tại...)"
                                  disabled={isDevelopingIdea}
                                />
                                <div className="mt-2">
                                  <ImageReferenceUploader
                                    images={referenceImages}
                                    onChange={(imgs) => updateWorldCreation({ referenceImages: imgs })}
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() =>
                                setIsSuggestionsCollapsed(
                                  !isSuggestionsCollapsed,
                                )
                              }
                              className={`text-sm font-bold uppercase tracking-widest ${theme.textSecondary} flex items-center gap-2 hover:text-white transition-colors cursor-pointer group`}
                            >
                              <Globe className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />{" "}
                              AI tìm ý tưởng và gợi ý cho người chơi
                              {isSuggestionsCollapsed ? (
                                <ChevronDown className="w-4 h-4 opacity-70" />
                              ) : (
                                <ChevronUp className="w-4 h-4 opacity-70" />
                              )}
                            </button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleGenerateSuggestions}
                              disabled={isGeneratingSuggestions}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-bold hover:bg-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isGeneratingSuggestions ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>ĐANG TÌM KIẾM...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  <span>TÌM Ý TƯỞNG</span>
                                </>
                              )}
                            </motion.button>
                          </div>
                          <AnimatePresence>
                            {!isSuggestionsCollapsed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden p-1 -m-1"
                              >
                                <CharacterTextArea
                                  label=""
                                  value={aiSuggestions}
                                  onChange={setAiSuggestions}
                                  placeholder="10 ý tưởng sẽ xuất hiện ở đây..."
                                  disabled={isGeneratingSuggestions}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() =>
                                setIsDevelopedIdeaCollapsed(
                                  !isDevelopedIdeaCollapsed,
                                )
                              }
                              className={`text-sm font-bold uppercase tracking-widest ${theme.textSecondary} flex items-center gap-2 hover:text-white transition-colors cursor-pointer group`}
                            >
                              <Sparkles className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />{" "}
                              Ý tưởng do AI phát triển
                              {isDevelopedIdeaCollapsed ? (
                                <ChevronDown className="w-4 h-4 opacity-70" />
                              ) : (
                                <ChevronUp className="w-4 h-4 opacity-70" />
                              )}
                            </button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleDevelopIdea}
                              disabled={isDevelopingIdea || !initialIdea.trim()}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-bold hover:bg-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isDevelopingIdea ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>{formatTime(devTimer)}</span>
                                </>
                              ) : (
                                <>
                                  <BrainCircuit className="w-4 h-4" />
                                  <span>AI phát triển ý tưởng</span>
                                </>
                              )}
                            </motion.button>
                          </div>
                          <AnimatePresence>
                            {!isDevelopedIdeaCollapsed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden p-1 -m-1"
                              >
                                <CharacterTextArea
                                  label=""
                                  value={developedIdea}
                                  onChange={setDevelopedIdea}
                                  placeholder="Ý tưởng chi tiết sẽ xuất hiện ở đây sau khi AI xử lý..."
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </section>
                      </div>

                      {/* World Details Section */}
                      <div className="space-y-8">
                        <section className="space-y-4">
                          <CharacterTextArea
                            label="TÊN TRÒ CHƠI / TÊN CÂU CHUYỆN"
                            value={worldData.name}
                            onChange={(val) =>
                              setWorldData({ ...worldData, name: val })
                            }
                            placeholder="Nhập tên trò chơi..."
                            variant="title"
                            onAIGen={() =>
                              handleAIGenField(
                                "TÊN TRÒ CHƠI / TÊN CÂU CHUYỆN",
                                "name",
                              )
                            }
                            isGenerating={generatingFields["name"]}
                            description="Tên gọi chính thức của tác phẩm hoặc trò chơi. Định vị bản sắc và bao quát tinh thần cốt lõi của toàn bộ thế giới."
                          />
                        </section>

                        <section className="space-y-4 border border-slate-200 dark:border-white/10 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/20">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 mb-4">
                            <span className="text-sm font-semibold tracking-wider text-slate-800 dark:text-slate-200">
                              THIẾT LẬP ĐỘ KHÓ TRÒ CHƠI
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono hidden md:inline-block">
                                DIFFICULTY SYSTEM
                              </span>
                              <button
                                onClick={handleAIGenAllDifficulty}
                                disabled={generatingFields["difficulty_sfw"] || generatingFields["difficulty_nsfw"]}
                                className={`text-[10px] flex items-center gap-1 font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                  (generatingFields["difficulty_sfw"] || generatingFields["difficulty_nsfw"])
                                    ? "opacity-50 cursor-not-allowed border-purple-500/30 text-purple-400 bg-purple-500/10"
                                    : theme.group === "Dark"
                                      ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                                      : "border-black/10 hover:bg-black/5 text-[#334155]"
                                }`}
                                title="AI tự động sáng tạo nội dung cho mục này dựa trên các mục khác"
                              >
                                {(generatingFields["difficulty_sfw"] || generatingFields["difficulty_nsfw"]) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Wand2 className="w-3 h-3 text-purple-500" />
                                )}{" "}
                                AI Gen
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <CharacterTextArea
                                label="SFW (AN TOÀN / THÔNG THƯỜNG)"
                                value={(typeof worldData.difficulty === "object" ? worldData.difficulty?.sfw : typeof worldData.difficulty === "string" ? worldData.difficulty : "") || ""}
                                onChange={(val) =>
                                  setWorldData({
                                    ...worldData,
                                    difficulty: {
                                      ...(typeof worldData.difficulty === "object" ? worldData.difficulty : { sfw: "", nsfw: "" }),
                                      sfw: val
                                    }
                                  })
                                }
                                placeholder="Độ khó chi phối các tình huống sinh tồn, chiến đấu, thám hiểm, quái vật, đối thoại thông thường..."
                                isGenerating={generatingFields["difficulty_sfw"]}
                                description="Quyết định mức độ khắc nghiệt trong các hoạt động thông thường (ví dụ: Sinh tồn tàn khốc, tài nguyên cực kỳ khan hiếm, quái vật bá đạo, chiến đấu nguy hiểm)."
                              />
                            </div>

                            <div className="space-y-2">
                              <CharacterTextArea
                                label="NSFW (NHẠY CẢM / NGƯỜI LỚN)"
                                value={(typeof worldData.difficulty === "object" ? worldData.difficulty?.nsfw : "") || ""}
                                onChange={(val) =>
                                  setWorldData({
                                    ...worldData,
                                    difficulty: {
                                      ...(typeof worldData.difficulty === "object" ? worldData.difficulty : { sfw: "", nsfw: "" }),
                                      nsfw: val
                                    }
                                  })
                                }
                                placeholder="Độ khó chi phối các tình huống tình ái, quyến rũ, độ bạo dạn hoặc giữ gìn của các NPC nữ..."
                                isGenerating={generatingFields["difficulty_nsfw"]}
                                description="Quyết định mức độ cám dỗ và thử thách trong tình ái (ví dụ: Quyến rũ cực khó, NPC vô cùng giữ kẽ, nsfw bạo dạn dâm mỹ dễ dàng hay đầy thử thách)."
                              />
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="BỐI CẢNH"
                            value={worldData.background}
                            onChange={(val) =>
                              setWorldData({ ...worldData, background: val })
                            }
                            placeholder="Mô tả bối cảnh thế giới..."
                            onAIGen={() =>
                              handleAIGenField("BỐI CẢNH", "background")
                            }
                            isGenerating={generatingFields["background"]}
                            description="Mô tả tổng quan về không gian, thời gian và tình trạng hiện tại của thế giới (ví dụ: Hậu tận thế zombie, thế giới tu tiên, tương lai Cyberpunk đô thị)."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="MỐC THỜI GIAN MỞ ĐẦU"
                            value={worldData.starterTimeline}
                            onChange={(val) =>
                              setWorldData({
                                ...worldData,
                                starterTimeline: val,
                              })
                            }
                            placeholder="Ví dụ: Năm 2045, Kỷ nguyên thứ 3..."
                            onAIGen={() =>
                              handleAIGenField(
                                "MỐC THỜI GIAN MỞ ĐẦU",
                                "starterTimeline",
                              )
                            }
                            isGenerating={generatingFields["starterTimeline"]}
                            description="Thời điểm cụ thể mà câu chuyện bắt đầu diễn ra (ví dụ: Năm 2026, Kỷ nguyên Ánh sáng thứ 3). BẮT BUỘC ĐẢM BẢO LOGIC TUYỆT ĐỐI VỚI NĂM SINH NHÂN VẬT."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="KỊCH BẢN MỞ ĐẦU"
                            value={worldData.starterScenario}
                            onChange={(val) =>
                              setWorldData({
                                ...worldData,
                                starterScenario: val,
                              })
                            }
                            placeholder="Diễn biến khởi đầu của câu chuyện..."
                            onAIGen={() =>
                              handleAIGenField(
                                "KỊCH BẢN MỞ ĐẦU",
                                "starterScenario",
                              )
                            }
                            isGenerating={generatingFields["starterScenario"]}
                            description="Tình huống, bối cảnh khởi đầu ngay khi nhân vật chính vừa xuất hiện hoặc bước vào thế giới. Giải thích họ đang ở đâu, đang làm gì và chuyện gì vừa xảy ra."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="QUY TẮC THẾ GIỚI (LUẬT LỆ, CẤM KỴ, QUY LUẬT VẬN HÀNH)"
                            value={worldData.worldRules}
                            onChange={(val) =>
                              setWorldData({ ...worldData, worldRules: val })
                            }
                            placeholder="Những luật lệ và quy luật của thế giới này..."
                            onAIGen={() =>
                              handleAIGenField("QUY TẮC THẾ GIỚI", "worldRules")
                            }
                            isGenerating={generatingFields["worldRules"]}
                            description="Các định luật vật lý, quy tắc ma thuật, thiên đạo hoặc quy tắc sinh tồn đặc thù của riêng thế giới này mà mọi thực thể bên trong đều phải tuân theo tuyệt đối."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="QUY TẮC ĐẶT TÊN (NAMING CONVENTIONS)"
                            value={worldData.namingConventions || ""}
                            onChange={(val) =>
                              setWorldData({
                                ...worldData,
                                namingConventions: val,
                              })
                            }
                            placeholder="Quy tắc đặt và chọn tên cho mọi thực thể trong thế giới (Ví dụ: tên nhân vật theo kiểu Nhật, địa danh theo thần thoại Bắc Âu, vũ khí có gốc tiếng Latin)..."
                            onAIGen={() =>
                              handleAIGenField(
                                "QUY TẮC ĐẶT TÊN",
                                "namingConventions",
                              )
                            }
                            isGenerating={generatingFields["namingConventions"]}
                            description="Cách thức hoặc phong cách đặt tên đặc trưng áp dụng cho các nhân vật, địa danh, vật phẩm (ví dụ: Tên mang âm hưởng thần thoại Bắc Âu, cách gọi tên theo biệt danh kiểu Cyberpunk)."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterInput
                            label="THỂ LOẠI (GENRE)"
                            value={worldData.genre}
                            onChange={(val) =>
                              setWorldData({ ...worldData, genre: val })
                            }
                            placeholder="Thể loại thế giới..."
                            onAIGen={() =>
                              handleAIGenField("THỂ LOẠI", "genre")
                            }
                            isGenerating={generatingFields["genre"]}
                            description="Thể loại chính định hình tác phẩm (ví dụ: Hành động sinh tồn, Tình cảm lãng mạn, Kinh dị tâm lý, Huyền huyễn tu chân)."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterInput
                            label="ÂM HƯỞNG CHỦ ĐẠO (MAIN MOOD & AESTHETIC)"
                            value={worldData.mainMood}
                            onChange={(val) =>
                              setWorldData({ ...worldData, mainMood: val })
                            }
                            placeholder="Âm hưởng, màu sắc chủ đạo..."
                            onAIGen={() =>
                              handleAIGenField("ÂM HƯỞNG CHỦ ĐẠO", "mainMood")
                            }
                            isGenerating={generatingFields["mainMood"]}
                            description="Không khí, màu sắc và cảm xúc xuyên suốt tác phẩm mà AI cần giữ vững (ví dụ: U ám và tuyệt vọng, Hài hước tươi sáng, Bi tráng và hào hùng)."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterInput
                            label="NHỊP ĐỘ (PACING)"
                            value={worldData.pacing}
                            onChange={(val) =>
                              setWorldData({ ...worldData, pacing: val })
                            }
                            placeholder="Nhịp độ diễn biến..."
                            onAIGen={() =>
                              handleAIGenField("NHỊP ĐỘ", "pacing")
                            }
                            isGenerating={generatingFields["pacing"]}
                            description="Tốc độ diễn biến cốt truyện và nhịp điệu của các sự kiện (ví dụ: Chậm rãi thiên về miêu tả nội tâm/đời thường, Dồn dập với các pha hành động liên tục)."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="ĐỊA LÝ & VÙNG LÃNH THỔ"
                            value={worldData.geography}
                            onChange={(val) =>
                              setWorldData({ ...worldData, geography: val })
                            }
                            placeholder="Địa lý, vùng lãnh thổ..."
                            onAIGen={() =>
                              handleAIGenField(
                                "ĐỊA LÝ & VÙNG LÃNH THỔ",
                                "geography",
                              )
                            }
                            isGenerating={generatingFields["geography"]}
                            description="Mô tả tổng quan về các khu vực, dạng địa hình, môi trường tự nhiên, lục địa và sự phân bố lãnh thổ trong thế giới."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="LỊCH SỬ THẾ GIỚI"
                            value={worldData.worldHistory}
                            onChange={(val) =>
                              setWorldData({ ...worldData, worldHistory: val })
                            }
                            placeholder="Lịch sử thế giới..."
                            onAIGen={() =>
                              handleAIGenField(
                                "LỊCH SỬ THẾ GIỚI",
                                "worldHistory",
                              )
                            }
                            isGenerating={generatingFields["worldHistory"]}
                            description="Các sự kiện vĩ mô, những cuộc chiến, kỷ nguyên đã trôi qua trong quá khứ để tạo ra thế cục của thế giới như hiện tại."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="VĂN HÓA & PHONG TỤC"
                            value={worldData.culture}
                            onChange={(val) =>
                              setWorldData({ ...worldData, culture: val })
                            }
                            placeholder="Văn hóa, ngôn ngữ, tập tục..."
                            onAIGen={() =>
                              handleAIGenField("VĂN HÓA & PHONG TỤC", "culture")
                            }
                            isGenerating={generatingFields["culture"]}
                            description="Tập quán sinh hoạt, tín ngưỡng dân gian, ngôn ngữ giao tiếp, nghệ thuật, lễ hội và lối sống đặc trưng của cư dân bản địa."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="KINH TẾ & XÃ HỘI"
                            value={worldData.economy}
                            onChange={(val) =>
                              setWorldData({ ...worldData, economy: val })
                            }
                            placeholder="Cấu trúc kinh tế, phân hóa xã hội..."
                            onAIGen={() =>
                              handleAIGenField("KINH TẾ & XÃ HỘI", "economy")
                            }
                            isGenerating={generatingFields["economy"]}
                            description="Hệ thống tiền tệ/trao đổi, phương thức sản xuất, cấu trúc giai tầng xã hội, sự phân hóa giàu nghèo và quyền lực."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="TÔN GIÁO & TÍN NGƯỠNG"
                            value={worldData.religion}
                            onChange={(val) =>
                              setWorldData({ ...worldData, religion: val })
                            }
                            placeholder="Tôn giáo chính, nghi lễ..."
                            onAIGen={() =>
                              handleAIGenField(
                                "TÔN GIÁO & TÍN NGƯỠNG",
                                "religion",
                              )
                            }
                            isGenerating={generatingFields["religion"]}
                            description="Các thế lực tâm linh, vị thần được tôn thờ, các giáo phái lớn, hệ thống tín điều, nghi lễ và đức tin của người dân."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="CÁC QUỐC GIA & THẾ LỰC"
                            value={worldData.factions}
                            onChange={(val) =>
                              setWorldData({ ...worldData, factions: val })
                            }
                            placeholder="Quốc gia, tổ chức, giáo phái..."
                            onAIGen={() =>
                              handleAIGenField(
                                "CÁC QUỐC GIA & THẾ LỰC",
                                "factions",
                              )
                            }
                            isGenerating={generatingFields["factions"]}
                            description="Tên và đặc điểm của các quốc gia, vương quốc, tập đoàn, tổ chức ngầm, bang phái hoặc giáo phái lớn có tầm ảnh hưởng."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="MỐI QUAN HỆ GIỮA CÁC THẾ LỰC"
                            value={worldData.factionRelations}
                            onChange={(val) =>
                              setWorldData({
                                ...worldData,
                                factionRelations: val,
                              })
                            }
                            placeholder="Xung đột, liên minh, trung lập..."
                            onAIGen={() =>
                              handleAIGenField(
                                "MỐI QUAN HỆ GIỮA CÁC THẾ LỰC",
                                "factionRelations",
                              )
                            }
                            isGenerating={generatingFields["factionRelations"]}
                            description="Tình trạng ngoại giao, cán cân quyền lực, những liên minh bền chặt, xung đột lợi ích, chiến tranh hay thù địch giữa các phe phái."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="CÁC YẾU TỐ ĐỘC ĐÁO"
                            value={worldData.uniqueElements}
                            onChange={(val) =>
                              setWorldData({
                                ...worldData,
                                uniqueElements: val,
                              })
                            }
                            placeholder="Sinh vật đặc hữu, công nghệ cốt lõi..."
                            onAIGen={() =>
                              handleAIGenField(
                                "CÁC YẾU TỐ ĐỘC ĐÁO",
                                "uniqueElements",
                              )
                            }
                            isGenerating={generatingFields["uniqueElements"]}
                            description="Những sinh vật đặc thù, dị năng, hệ thống công nghệ cốt lõi hoặc hiện tượng kỳ lạ chỉ tồn tại duy nhất ở thế giới này."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="HỆ THỐNG SỨC MẠNH / LOGIC / ĐIỂM PHÂN BẬC"
                            value={worldData.powerSystem}
                            onChange={(val) =>
                              setWorldData({ ...worldData, powerSystem: val })
                            }
                            placeholder="Bắt buộc chi tiết hóa bậc năng lực, rank, cảnh giới, hoặc các thước đo quyền lực..."
                            onAIGen={() =>
                              handleAIGenField(
                                "HỆ THỐNG SỨC MẠNH",
                                "powerSystem",
                              )
                            }
                            isGenerating={generatingFields["powerSystem"]}
                            description="Cơ chế phân cấp sức mạnh rõ ràng, các bậc tu luyện, cấp độ ma thuật, cảnh giới, hoặc hệ thống rank đánh giá thực lực từ thấp đến cao."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="KIỂM SOÁT LOGIC & CÁC YẾU TỐ LOẠI TRỪ"
                            value={worldData.logicControl}
                            onChange={(val) =>
                              setWorldData({ ...worldData, logicControl: val })
                            }
                            placeholder="Những thứ không được phép tồn tại trong thế giới này..."
                            onAIGen={() =>
                              handleAIGenField(
                                "KIỂM SOÁT LOGIC",
                                "logicControl",
                              )
                            }
                            isGenerating={generatingFields["logicControl"]}
                            description="Những giới hạn và quy định chặt chẽ về những công nghệ, khái niệm hoặc sức mạnh TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP XẢY RA hoặc KHÔNG TỒN TẠI để đảm bảo tính logic."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterTextArea
                            label="VĂN PHONG"
                            value={worldData.writingStyle}
                            onChange={(val) =>
                              setWorldData({ ...worldData, writingStyle: val })
                            }
                            placeholder="Văn phong miêu tả trần thuật, cách dùng từ ngữ (thuần Việt, Hán Việt phổ thông, hay Hán Việt cổ trang)..."
                            onAIGen={() =>
                              handleAIGenField("VĂN PHONG", "writingStyle")
                            }
                            isGenerating={generatingFields["writingStyle"]}
                            description="Quy định giọng điệu miêu tả của AI. Cần xác định rõ bối cảnh để kiểm soát từ Hán Việt đặc thù (ví dụ: bối cảnh Phương Đông dùng nhiều từ Hán Việt cổ trang; bối cảnh Phương Tây/Hiện đại dùng từ thuần Việt và Hán Việt phổ quát, CẤM từ cổ trang/kiếm hiệp)."
                          />
                        </section>

                        <section className="space-y-4">
                          <CharacterInput
                            label="NGÔI KỂ"
                            value={worldData.narrativePerspective}
                            onChange={(val) =>
                              setWorldData({
                                ...worldData,
                                narrativePerspective: val,
                              })
                            }
                            placeholder="Ngôi thứ ba, ngôi thứ nhất..."
                            onAIGen={() =>
                              handleAIGenField(
                                "NGÔI KỂ",
                                "narrativePerspective",
                              )
                            }
                            isGenerating={
                              generatingFields["narrativePerspective"]
                            }
                            description="Góc nhìn kể chuyện xuyên suốt (ví dụ: Ngôi thứ nhất - xưng 'Tôi', Ngôi thứ ba - gọi thẳng tên nhân vật) và sự tập trung của điểm nhìn."
                          />
                        </section>

                        <section className="space-y-4 mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                          <CharacterTextArea
                            label="RULES (LUẬT CHƠI DÀNH CHO AI)"
                            value={playerRules}
                            onChange={setPlayerRules}
                            placeholder={`Mô tả các quy tắc theo dạng gạch đầu dòng:\n- Không được sử dụng phép thuật trong 5 lượt tới.\n- AI phải viết dài hơn bình thường.\n- ...`}
                            description="Thêm các quy tắc bối cảnh, hành vi hoặc phong cách kể chuyện mà AI phải tuân thủ trong suốt quá trình chơi. Các quy tắc này sẽ được áp dụng trực tiếp vào Gameplay."
                          />
                        </section>
                      </div>
                    </div>
                  )}

                  {activeTab === "mc" && (
                    <div className="space-y-8 max-w-5xl mx-auto">
                      {/* Form Ý tưởng tạo MC */}
                      <div className="space-y-4 mb-8">
                        <h3 className={`text-lg font-bold ${theme.textPrimary} flex items-center gap-2`}>
                          <Sparkles className="w-5 h-5" /> Ý TƯỞNG DÀNH RIÊNG CHO MC
                        </h3>
                        <CharacterTextArea
                          label=""
                          value={mcIdea}
                          onChange={setMcIdea}
                          placeholder="Mô tả ý tưởng về nhân vật chính (ví dụ: Một kiếm khách lạnh lùng, thiên tài bị phế tu vi...)"
                        />
                        <ImageReferenceUploader
                          images={mcReferenceImages}
                          onChange={(imgs) => updateWorldCreation({ mcReferenceImages: imgs })}
                        />
                        <div className="flex justify-between items-center gap-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleResetMC}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600/20 transition-all font-bold text-xs sm:text-sm cursor-pointer shadow-sm"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>RESET MC</span>
                            </button>
                            <div className="relative" ref={mcCustomMenuRef}>
                              <button
                                type="button"
                                onClick={() => setShowMcCustomMenu(!showMcCustomMenu)}
                                className={`p-2 rounded-xl border transition-all cursor-pointer ${theme.group === "Dark" ? "border-white/10 hover:bg-white/5 text-white/70" : "border-black/10 hover:bg-black/5 text-black/70"}`}
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              
                              {showMcCustomMenu && (
                                <div className={`absolute left-0 mt-2 w-48 rounded-xl shadow-lg border z-50 overflow-hidden ${theme.group === "Dark" ? "bg-[#1E293B] border-white/10" : "bg-white border-black/10"}`}>
                                  <input type="file" ref={mcCustomInputRef} className="hidden" accept=".json" onChange={importMcCustomFields} />
                                  <button 
                                    type="button" 
                                    onClick={exportMcCustomFields}
                                    className={`w-full text-left px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors ${theme.group === "Dark" ? "hover:bg-white/5 text-white/90" : "hover:bg-black/5 text-[#334155]"}`}
                                  >
                                    <Download className="w-4 h-4" /> Lưu vào máy
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => mcCustomInputRef.current?.click()}
                                    className={`w-full text-left px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors ${theme.group === "Dark" ? "hover:bg-white/5 text-white/90" : "hover:bg-black/5 text-[#334155]"}`}
                                  >
                                    <Upload className="w-4 h-4" /> Tải lên từ máy
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleGenerateMC}
                            disabled={isGeneratingMc}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-bold hover:bg-purple-600/30 transition-all cursor-pointer disabled:opacity-50 relative overflow-hidden group"
                          >
                            {isGeneratingMc ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Đang tạo MC...</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4" />
                                <span>Tạo MC</span>
                              </>
                            )}
                            {isGeneratingMc && (
                              <motion.div
                                layoutId="gen-progress-mc"
                                className="absolute bottom-0 left-0 h-0.5 bg-purple-500 w-full"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                          </motion.button>
                        </div>
                      </div>

                      {mcsData.length > 1 && (
                        <div className={`flex flex-wrap gap-2 mb-8 p-4 rounded-2xl border items-center ${theme.group === "Dark" ? "bg-black/20 border-white/5" : "bg-black/5 border-black/10"}`}>
                          <span className={`text-sm font-bold ${theme.textPrimary} mr-2 flex items-center`}>Chọn phiên bản MC:</span>
                          {mcsData.map((mc, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  // Save current mcData back to mcsData before switching
                                  const newMcsData = [...mcsData];
                                  if (selectedMcIndex !== -1) {
                                    newMcsData[selectedMcIndex] = mcData;
                                  }
                                  setMcsData(newMcsData);
                                  
                                  // Switch to new MC
                                  setSelectedMcIndex(idx);
                                  setMcData(newMcsData[idx]);
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                                  selectedMcIndex === idx
                                    ? "bg-blue-600/30 text-blue-400 border border-blue-500/50"
                                    : "bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent"
                                }`}
                              >
                                {mc.name || `Phiên bản ${idx + 1}`}
                              </button>
                          ))}
                        </div>
                      )}

                      {selectedMcIndex === -1 ? (
                        <div className="flex items-center justify-center py-20 text-slate-400 text-lg font-medium border border-dashed border-white/10 rounded-2xl">
                          Vui lòng chọn 1 phiên bản MC ở trên để xem và chỉnh sửa chi tiết.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className={`p-4 rounded-xl border ${theme.group === "Dark" ? "bg-black/20 border-white/10" : "bg-black/5 border-black/10"}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                              <span className={`text-sm font-bold ${theme.textPrimary}`}>Chế độ Bảng thông tin MC:</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateWorldCreation({ mcTemplateMode: "default" })}
                                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                                    mcTemplateMode === "default"
                                      ? "bg-blue-600 text-white"
                                      : "bg-white/10 text-slate-400 hover:bg-white/20"
                                  }`}
                                >
                                  Mặc định
                                </button>
                                <button
                                  onClick={() => updateWorldCreation({ 
                                    mcTemplateMode: "custom",
                                    customMcFields: (customMcFields && customMcFields.length > 0) ? customMcFields : (DEFAULT_MC_FIELDS as any)
                                  })}
                                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                                    mcTemplateMode === "custom"
                                      ? "bg-purple-600 text-white"
                                      : "bg-white/10 text-slate-400 hover:bg-white/20"
                                  }`}
                                >
                                  Tùy chỉnh
                                </button>
                              </div>
                            </div>
                            
                            {mcTemplateMode === "custom" && (
                              <div className="space-y-4">
                                <CharacterTextArea
                                  label="Ý TƯỞNG BẢNG THÔNG TIN (AI TỰ TẠO)"
                                  value={mcTemplateIdea}
                                  onChange={setMcTemplateIdea}
                                  placeholder="Ví dụ: Tạo bảng thông tin chỉ số RPG gồm Sức mạnh, Nhanh nhẹn, Trí tuệ..."
                                />
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <button
                                    onClick={() => updateWorldCreation({ customMcFields: [] })}
                                    className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${theme.group === "Dark" ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white" : "border-black/10 hover:bg-black/5 text-black/70 hover:text-black"}`}
                                  >
                                    Xóa Trắng
                                  </button>
                                  <button
                                    onClick={() => updateWorldCreation({ customMcFields: DEFAULT_MC_FIELDS as any })}
                                    className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${theme.group === "Dark" ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white" : "border-black/10 hover:bg-black/5 text-black/70 hover:text-black"}`}
                                  >
                                    Tải Mẫu Mặc Định
                                  </button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleGenerateTemplate("mc", mcTemplateIdea)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-bold hover:bg-purple-600/30 transition-all cursor-pointer"
                                  >
                                    <Wand2 className="w-4 h-4" /> AI Tạo Bảng
                                  </motion.button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {mcTemplateMode === "custom" && (
                            <div className="mb-6 space-y-4">
                              {/* Hướng dẫn sử dụng Bảng Tùy Chỉnh có thể thu gọn */}
                              <div className={`p-4 rounded-xl border text-sm transition-all duration-300 ${theme.group === "Dark" ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                                <button
                                  type="button"
                                  onClick={() => setIsMcGuideOpen(!isMcGuideOpen)}
                                  className="w-full text-left font-bold flex items-center justify-between gap-2 cursor-pointer focus:outline-none"
                                >
                                  <span className="flex items-center gap-2"><Info className="w-4 h-4"/> Hướng dẫn sử dụng Bảng Tùy Chỉnh</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase tracking-wider opacity-60 font-medium">
                                      {isMcGuideOpen ? "Click để thu gọn" : "Click để mở rộng"}
                                    </span>
                                    {isMcGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </button>
                                {isMcGuideOpen && (
                                  <div className="mt-3 pt-3 border-t border-dashed border-blue-500/20 dark:border-blue-500/30">
                                    <ul className="list-disc list-inside space-y-1 opacity-90 text-xs">
                                      <li><b>Tên gọi & Túi đồ (Inventory):</b> Luôn là 2 mục mặc định cố định ở đầu và cuối bảng MC.</li>
                                      <li><b>Tên hiển thị:</b> Tiêu đề sẽ hiện trên bảng nhập liệu (VD: "Chỉ số Sức mạnh").</li>
                                      <li><b>Hướng dẫn về định nghĩa/nội dung:</b> Định nghĩa rõ ý nghĩa của trường này để AI hiểu bản chất nội dung (VD: "Thang điểm 1-100, quyết định sát thương vật lý").</li>
                                      <li><b>Yêu cầu với AI:</b> Yêu cầu chi tiết về cách viết, độ dài, phong cách cho AI (VD: "Viết 2-3 câu ngắn gọn, bám sát bối cảnh").</li>
                                      <li><b>Loại:</b> "Dòng ngắn" cho dữ liệu ít chữ (Tên, Tuổi), "Nhiều dòng" cho đoạn văn dài (Tiểu sử).</li>
                                      <li><b>Tạo mảng (Array Mode):</b> Khi tích chọn "Tạo mảng", AI sẽ tạo ra dữ liệu dưới dạng một mảng (danh sách) các đối tượng thay vì một ô văn bản duy nhất. Trong mảng này, bạn có thể hướng dẫn AI tạo ra nhiều trường nhỏ (sub-fields) bằng cách định nghĩa rõ cấu trúc mong muốn trong phần "Hướng dẫn định nghĩa" hoặc "Yêu cầu với AI" (Ví dụ: <i>Mảng "Kỹ năng" chứa các trường nhỏ: Tên chiêu thức, Sức sát thương, Mô tả hiệu ứng...</i>).</li>
                                      <li><b>Cơ chế kích hoạt điều kiện:</b> Cho phép cấu hình hiển thị động (bật/tắt) các trường phụ thuộc. Mỗi nhóm có thể chứa <b>nhiều điều kiện tham chiếu gốc</b> (kết hợp cả <b>Số</b> và <b>Chữ</b>, ví dụ: <i>"Tuổi &gt;= 18"</i> VÀ <i>"Giới tính == 'Nữ'"</i> ➔ BẬT <i>"Nhan sắc"</i>). Hỗ trợ đầy đủ toán tử so sánh Số (≥, &gt;, ≤, &lt;, ==, !=, và trong khoảng Từ X đến Y), toán tử so sánh Chữ (bằng chính xác, chứa từ, không bằng, không rỗng), cùng chế độ kết hợp logic (VÀ / HOẶC).</li>
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Chỉnh sửa cấu trúc bảng tùy chỉnh MC có thể thu gọn */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-black/10 dark:border-white/10">
                                <h4 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>Chỉnh sửa cấu trúc bảng tùy chỉnh MC:</h4>
                                <button
                                  type="button"
                                  onClick={() => setIsMcFieldsOpen(!isMcFieldsOpen)}
                                  className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    theme.group === "Dark"
                                      ? "border-white/10 hover:bg-white/10 text-white/80"
                                      : "border-slate-300 hover:bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {isMcFieldsOpen ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5" /> Thu gọn ({customMcFields.length})
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5" /> Mở rộng ({customMcFields.length})
                                    </>
                                  )}
                                </button>
                              </div>

                              {isMcFieldsOpen && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {customMcFields.map((field: any, idx: number) => (
                                    <div key={idx} className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all shadow-sm ${theme.group === "Dark" ? "bg-black/30 border-white/10" : "bg-black/5 border-black/10"}`}>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                          <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                            Tên hiển thị:
                                          </label>
                                          {isRelationshipField(field) && (
                                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                                              Mẫu cho NPC (Ẩn trên MC)
                                            </span>
                                          )}
                                        </div>
                                        <input
                                          type="text"
                                          placeholder="Tên trường (VD: Chỉ số Sức mạnh, Tuyệt kỹ...)"
                                          className={`w-full bg-transparent border-b ${theme.group === "Dark" ? "border-white/20 text-white" : "border-black/20 text-black"} outline-none px-1 py-0.5 text-sm font-bold`}
                                          value={field.label || ""}
                                          onChange={(e) => {
                                            const newFields = [...customMcFields];
                                            newFields[idx] = { ...newFields[idx], label: e.target.value };
                                            updateWorldCreation({ customMcFields: newFields });
                                          }}
                                        />
                                      </div>
                                      {field.isArray ? (
                                        <div className="flex flex-col gap-2 mt-1">
                                          <div className="flex items-center justify-between">
                                            <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                              Các trường con (Sub-fields):
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newFields = [...customMcFields];
                                                const subFields = newFields[idx].subFields || [];
                                                newFields[idx] = { ...newFields[idx], subFields: [...subFields, { label: "", description: "", aiRequirement: "" }] };
                                                updateWorldCreation({ customMcFields: newFields });
                                              }}
                                              className={`px-2 py-1 text-[9px] font-bold rounded border ${theme.group === "Dark" ? "border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20" : "border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"}`}
                                            >
                                              + Thêm trường con
                                            </button>
                                          </div>
                                          {(field.subFields || []).map((subField: any, subIdx: number) => (
                                            <div key={subIdx} className={`p-2 rounded-lg border border-dashed flex flex-col gap-1.5 relative ${theme.group === "Dark" ? "border-white/20 bg-black/40" : "border-black/20 bg-white/40"}`}>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newFields = [...customMcFields];
                                                  newFields[idx].subFields.splice(subIdx, 1);
                                                  updateWorldCreation({ customMcFields: newFields });
                                                }}
                                                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                              <input
                                                type="text"
                                                placeholder="Tên trường con (VD: Tên, Mô tả...)"
                                                className={`w-[calc(100%-24px)] bg-transparent border-b ${theme.group === "Dark" ? "border-white/20 text-white" : "border-black/20 text-black"} outline-none px-1 text-xs font-bold`}
                                                value={subField.label || ""}
                                                onChange={(e) => {
                                                  const newFields = [...customMcFields];
                                                  newFields[idx].subFields[subIdx].label = e.target.value;
                                                  updateWorldCreation({ customMcFields: newFields });
                                                }}
                                              />
                                              <textarea
                                                rows={1}
                                                placeholder="Định nghĩa/Nội dung"
                                                className={`w-full bg-transparent border rounded p-1.5 ${theme.group === "Dark" ? "border-white/10 text-white/80" : "border-black/10 text-black/80"} outline-none text-[10px] resize-y`}
                                                value={subField.description || ""}
                                                onChange={(e) => {
                                                  const newFields = [...customMcFields];
                                                  newFields[idx].subFields[subIdx].description = e.target.value;
                                                  updateWorldCreation({ customMcFields: newFields });
                                                }}
                                              />
                                              <textarea
                                                rows={1}
                                                placeholder="Yêu cầu với AI"
                                                className={`w-full bg-transparent border rounded p-1.5 ${theme.group === "Dark" ? "border-white/10 text-white/80" : "border-black/10 text-black/80"} outline-none text-[10px] resize-y`}
                                                value={subField.aiRequirement || ""}
                                                onChange={(e) => {
                                                  const newFields = [...customMcFields];
                                                  newFields[idx].subFields[subIdx].aiRequirement = e.target.value;
                                                  updateWorldCreation({ customMcFields: newFields });
                                                }}
                                              />
                                            </div>
                                          ))}
                                          {(!field.subFields || field.subFields.length === 0) && (
                                            <div className={`text-[10px] text-center p-2 rounded border border-dashed ${theme.group === "Dark" ? "border-white/10 text-white/40" : "border-black/10 text-black/40"}`}>
                                              Chưa có trường con. Nhấn "+ Thêm trường con" để tạo khuôn.
                                            </div>
                                          )}
                                          <div className="mt-4 pt-4 border-t border-dashed border-black/10 dark:border-white/10">
                                            <GenericArrayEditor
                                              label={`Dữ liệu: ${field.label}`}
                                              description={field.description}
                                              subFields={field.subFields}
                                              items={mcData.customData?.[field.id] || []}
                                              onChange={(val) => setMcData({ ...mcData, customData: { ...mcData.customData, [field.id]: val } })}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex flex-col gap-1">
                                            <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                              Hướng dẫn về định nghĩa/nội dung:
                                            </label>
                                            <textarea
                                              rows={2}
                                              placeholder="Định nghĩa ý nghĩa và nội dung trường này..."
                                              className={`w-full bg-transparent border rounded-lg p-2 ${theme.group === "Dark" ? "border-white/10 text-white/80 bg-black/20" : "border-black/10 text-black/80 bg-white/40"} outline-none text-xs resize-y`}
                                              value={field.description || ""}
                                              onChange={(e) => {
                                                const newFields = [...customMcFields];
                                                newFields[idx] = { ...newFields[idx], description: e.target.value };
                                                updateWorldCreation({ customMcFields: newFields });
                                              }}
                                            />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                              Yêu cầu với AI:
                                            </label>
                                            <textarea
                                              rows={2}
                                              placeholder="Yêu cầu AI viết đúng ý (VD: Viết 2-3 câu ngắn gọn, hoặc bám sát bối cảnh...)"
                                              className={`w-full bg-transparent border rounded-lg p-2 ${theme.group === "Dark" ? "border-white/10 text-white/80 bg-black/20" : "border-black/10 text-black/80 bg-white/40"} outline-none text-xs resize-y`}
                                              value={field.aiRequirement || ""}
                                              onChange={(e) => {
                                                const newFields = [...customMcFields];
                                                newFields[idx] = { ...newFields[idx], aiRequirement: e.target.value };
                                                updateWorldCreation({ customMcFields: newFields });
                                              }}
                                            />
                                          </div>
                                        </>
                                      )}
                                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/5">
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-1.5">
                                            <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                              Loại:
                                            </label>
                                            <select
                                              disabled={!!field.isArray}
                                              className={`bg-transparent text-xs font-bold outline-none cursor-pointer ${field.isArray ? "opacity-40" : ""} ${theme.group === "Dark" ? "text-white/80" : "text-black/80"}`}
                                              value={field.type || "input"}
                                              onChange={(e) => {
                                                const newFields = [...customMcFields];
                                                newFields[idx] = { ...newFields[idx], type: e.target.value as "input" | "textarea" };
                                                updateWorldCreation({ customMcFields: newFields });
                                              }}
                                            >
                                              <option value="input" className="bg-slate-800 text-white">Dòng ngắn</option>
                                              <option value="textarea" className="bg-slate-800 text-white">Nhiều dòng</option>
                                            </select>
                                          </div>
                                          <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                                            <input
                                              type="checkbox"
                                              checked={!!field.isArray}
                                              onChange={(e) => {
                                                const newFields = [...customMcFields];
                                                newFields[idx] = { ...newFields[idx], isArray: e.target.checked };
                                                updateWorldCreation({ customMcFields: newFields });
                                              }}
                                              className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Tạo mảng</span>
                                          </label>
                                        </div>
                                        <button
                                          onClick={() => {
                                            const newFields = customMcFields.filter((_, i) => i !== idx);
                                            updateWorldCreation({ customMcFields: newFields });
                                          }}
                                          className="text-red-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                                          title="Xóa trường này"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const newFields = [...customMcFields, { id: "field" + Date.now(), label: "Trường mới", type: "input", description: "", aiRequirement: "" }];
                                      updateWorldCreation({ customMcFields: newFields as any });
                                    }}
                                    className={`p-4 rounded-xl border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-all ${theme.group === "Dark" ? "border-white/20 hover:bg-white/5 text-white/60 hover:text-white" : "border-black/20 hover:bg-black/5 text-black/60 hover:text-black"}`}
                                  >
                                    <Plus className="w-5 h-5" /> Thêm trường mới
                                  </button>
                                </div>
                                
                                {/* MC Generate Arrays Button */}
                                {customMcFields.some((f: any) => f.isArray) && (
                                  <div className="flex justify-end mt-4 border-t border-dashed border-black/10 dark:border-white/10 pt-4">
                                    <button
                                      type="button"
                                      disabled={isGeneratingMcArrays}
                                      onClick={handleGenerateArraysForMc}
                                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Wand2 className={`w-4 h-4 ${isGeneratingMcArrays ? "animate-spin" : ""}`} />
                                      {isGeneratingMcArrays ? "ĐANG TẠO MẢNG MC..." : "TẠO MẢNG MC BẰNG AI"}
                                    </button>
                                  </div>
                                )}
                                <ConditionalFieldsEditor type="mc" theme={theme} />
                                </div>
                              )}
                            </div>
                          )}
                          
                          {mcTemplateMode === "custom" ? (
                            <div className="space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                <div className="col-span-full">
                                  <CharacterInput
                                    label="TÊN GỌI (Bắt buộc)"
                                    value={mcData.name}
                                    onChange={(val) => setMcData({ ...mcData, name: val })}
                                  />
                                </div>
                                {customMcFields.map((field: any, idx: number) => {
                                  if (isRelationshipField(field)) return null;

                                  const fieldValue = (() => {
                                    if (mcData.customData && mcData.customData[field.id] !== undefined && mcData.customData[field.id] !== null && String(mcData.customData[field.id]).trim() !== "") {
                                      return mcData.customData[field.id];
                                    }
                                    if ((mcData as any)[field.id] !== undefined && (mcData as any)[field.id] !== null && String((mcData as any)[field.id]).trim() !== "") {
                                      return (mcData as any)[field.id];
                                    }
                                    const lowerFieldId = field.id.toLowerCase().replace(/[^a-z0-9]/g, "");
                                    for (const [key, val] of Object.entries(mcData)) {
                                      if (key === "customData" || typeof val === "object") continue;
                                      if (key.toLowerCase().replace(/[^a-z0-9]/g, "") === lowerFieldId && val !== undefined && val !== null && String(val).trim() !== "") {
                                        return String(val);
                                      }
                                    }
                                    return "";
                                  })();

                                  if (field.isArray) {
                                    return null; // Rendered in the schema editor section above
                                  }

                                  return (
                                    <div key={idx} className={field.type === "textarea" ? "col-span-full" : ""}>
                                      {field.type === "textarea" ? (
                                        <CharacterTextArea
                                          label={field.label.toUpperCase()}
                                          value={fieldValue}
                                          onChange={(val) => setMcData({ ...mcData, [field.id]: val, customData: { ...mcData.customData, [field.id]: val } })}
                                          description={field.description}
                                        />
                                      ) : (
                                        <CharacterInput
                                          label={field.label.toUpperCase()}
                                          value={fieldValue}
                                          onChange={(val) => setMcData({ ...mcData, [field.id]: val, customData: { ...mcData.customData, [field.id]: val } })}
                                          description={field.description}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Mục Inventory mặc định luôn nằm cuối cùng cho MC */}
                              <div className="space-y-6 col-span-full pt-6 border-t border-white/10">
                                
                                <h3
                                  className={`text-lg font-bold ${theme.textPrimary} border-l-4 border-current pl-4 flex items-center justify-between`}
                                >
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5" /> TÚI ĐỒ (INVENTORY)
                                  </div>
                                  <button
                                    onClick={() => {
                                      const newInv = [
                                        ...(Array.isArray(mcData.inventory)
                                          ? mcData.inventory
                                          : []),
                                      ];
                                      newInv.push({
                                        name: "",
                                        quantity: 1,
                                        description: "",
                                      });
                                      setMcData({ ...mcData, inventory: newInv });
                                    }}
                                    className={`text-sm flex items-center gap-1 font-normal p-1 px-3 rounded-lg border cursor-pointer transition-colors ${theme.group === "Dark" ? "border-white/10 hover:bg-white/10 text-white/80 hover:text-white" : "border-black/10 hover:bg-black/5 text-[#334155]"}`}
                                  >
                                    <Plus className="w-4 h-4" /> Thêm vật phẩm
                                  </button>
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                  {Array.isArray(mcData.inventory) &&
                                    mcData.inventory.map((item, i) => (
                                      <div
                                        key={i}
                                        className={`p-4 rounded-xl border flex gap-4 ${theme.group === "Dark" ? "bg-white/5 border-white/10" : "bg-white/80 border-black/10 shadow-sm"}`}
                                      >
                                        <div className="flex-1 space-y-3">
                                          <div className="flex gap-4">
                                            <div className="flex-[2]">
                                              <CharacterInput
                                                label="Tên vật phẩm"
                                                value={item.name}
                                                onChange={(val) => {
                                                  const newInv = [
                                                    ...mcData.inventory,
                                                  ];
                                                  newInv[i] = {
                                                    ...newInv[i],
                                                    name: val,
                                                  };
                                                  setMcData({
                                                    ...mcData,
                                                    inventory: newInv,
                                                  });
                                                }}
                                              />
                                            </div>
                                            <div className="flex-1">
                                              <CharacterInput
                                                label="Số lượng"
                                                value={String(item.quantity)}
                                                onChange={(val) => {
                                                  const newInv = [
                                                    ...mcData.inventory,
                                                  ];
                                                  newInv[i] = {
                                                    ...newInv[i],
                                                    quantity: Number(val) || 1,
                                                  };
                                                  setMcData({
                                                    ...mcData,
                                                    inventory: newInv,
                                                  });
                                                }}
                                              />
                                            </div>
                                          </div>
                                          <CharacterTextArea
                                            label="Mô tả công năng / Đặc điểm"
                                            value={item.description}
                                            onChange={(val) => {
                                              const newInv = [...mcData.inventory];
                                              newInv[i] = {
                                                ...newInv[i],
                                                description: val,
                                              };
                                              setMcData({
                                                ...mcData,
                                                inventory: newInv,
                                              });
                                            }}
                                          />
                                        </div>
                                        <button
                                          onClick={() => {
                                            const newInv = mcData.inventory.filter(
                                              (_, idx) => idx !== i,
                                            );
                                            setMcData({
                                              ...mcData,
                                              inventory: newInv,
                                            });
                                          }}
                                          className="p-2 self-start rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer mt-4"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  {(!Array.isArray(mcData.inventory) ||
                                    mcData.inventory.length === 0) && (
                                    <div
                                      className={`p-6 text-center rounded-xl border border-dashed ${theme.group === "Dark" ? "border-white/20 text-white/40" : "border-black/10 text-[#334155]/60"}`}
                                    >
                                      Hiện tại túi đồ đang trống.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Nhóm 1: Thông tin định danh */}
                        <div className="space-y-6 col-span-full">
                          <h3
                            className={`text-lg font-bold ${theme.textPrimary} border-l-4 border-current pl-4 flex items-center gap-2`}
                          >
                            <User className="w-5 h-5" /> THÔNG TIN ĐỊNH DANH
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <CharacterInput
                              label="TÊN GỌI"
                              value={mcData.name}
                              onChange={(val) =>
                                setMcData({ ...mcData, name: val })
                              }
                            />
                            <CharacterInput
                              label="HỌ VÀ TÊN"
                              value={mcData.fullName}
                              onChange={(val) =>
                                setMcData({ ...mcData, fullName: val })
                              }
                            />
                            <CharacterInput
                              label="DANH XƯNG (TƯỚC HIỆU)"
                              value={mcData.titles}
                              onChange={(val) =>
                                setMcData({ ...mcData, titles: val })
                              }
                            />
                            <CharacterInput
                              label="CHỨC VỤ (NGHỀ NGHIỆP)"
                              value={mcData.occupation}
                              onChange={(val) =>
                                setMcData({ ...mcData, occupation: val })
                              }
                            />
                            <CharacterInput
                              label="GIỚI TÍNH"
                              value={mcData.gender}
                              onChange={(val) =>
                                setMcData({ ...mcData, gender: val })
                              }
                            />
                            <CharacterInput
                              label="TUỔI TÁC"
                              value={mcData.age}
                              onChange={(val) =>
                                setMcData({ ...mcData, age: val })
                              }
                            />
                            <CharacterInput
                              label="NGÀY THÁNG NĂM SINH"
                              value={mcData.dob}
                              onChange={(val) =>
                                setMcData({ ...mcData, dob: val })
                              }
                            />
                            <CharacterInput
                              label="CẢNH GIỚI / CẤP ĐỘ"
                              value={mcData.rank}
                              onChange={(val) =>
                                setMcData({ ...mcData, rank: val })
                              }
                            />
                          </div>
                        </div>

                        {/* Nhóm 2: Đặc trưng hình thể */}
                        <div className="space-y-6 col-span-full">
                          <h3
                            className={`text-lg font-bold ${theme.textPrimary} border-l-4 border-current pl-4 flex items-center gap-2`}
                          >
                            <Sparkles className="w-5 h-5" /> ĐẶC TRƯNG HÌNH THỂ
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <CharacterInput
                              label="CHIỀU CAO"
                              value={mcData.height}
                              onChange={(val) =>
                                setMcData({ ...mcData, height: val })
                              }
                            />
                            <CharacterInput
                              label="CÂN NẶNG"
                              value={mcData.weight}
                              onChange={(val) =>
                                setMcData({ ...mcData, weight: val })
                              }
                            />
                            <CharacterInput
                              label="SỐ ĐO 3 VÒNG"
                              value={mcData.measurements}
                              onChange={(val) =>
                                setMcData({ ...mcData, measurements: val })
                              }
                            />
                          </div>
                          <CharacterTextArea
                            label="MIÊU TẢ NGOẠI HÌNH TỔNG QUAN"
                            value={mcData.appearance}
                            onChange={(val) =>
                              setMcData({ ...mcData, appearance: val })
                            }
                          />
                          <CharacterTextArea
                            label="ĐẶC ĐIỂM NHẬN DẠNG PHỤ"
                            value={mcData.distinguishingFeatures}
                            onChange={(val) =>
                              setMcData({
                                ...mcData,
                                distinguishingFeatures: val,
                              })
                            }
                          />
                        </div>

                        {/* Nhóm 3: Năng lực & Bản ngã */}
                        <div className="space-y-6 col-span-full">
                          <h3
                            className={`text-lg font-bold ${theme.textPrimary} border-l-4 border-current pl-4 flex items-center gap-2`}
                          >
                            <BrainCircuit className="w-5 h-5" /> NĂNG LỰC & BẢN
                            NGÃ
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            <ArrayItemEditor
                              itemLabel="Năng Lực"
                              label="NĂNG LỰC / SỨC MẠNH"
                              description="Những thứ thuộc về phi thực tế (như hệ thống hay ma pháp... - các ví dụ để AI hiểu bản chất)."
                              items={mcData.powers}
                              onChange={(val) =>
                                setMcData({ ...mcData, powers: val })
                              }
                            />
                            <ArrayItemEditor
                              itemLabel="Kỹ Năng"
                              label="KỸ NĂNG CHUYÊN MÔN"
                              description="Những thứ thuộc về thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để AI hiểu bản chất)."
                              items={mcData.skills}
                              onChange={(val) =>
                                setMcData({ ...mcData, skills: val })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CharacterTextArea
                              label="TÍNH CÁCH TỔNG QUAN"
                              value={mcData.personality}
                              onChange={(val) =>
                                setMcData({ ...mcData, personality: val })
                              }
                            />
                            <CharacterTextArea
                              label="TÍNH CÁCH CỐT LÕI (BẢN NGÃ)"
                              value={mcData.personalityCore}
                              onChange={(val) =>
                                setMcData({ ...mcData, personalityCore: val })
                              }
                            />
                            <CharacterTextArea
                              label="KIM CHỈ NAM / LÝ TƯỞNG"
                              value={mcData.philosophy}
                              onChange={(val) =>
                                setMcData({ ...mcData, philosophy: val })
                              }
                            />
                            <CharacterTextArea
                              label="MỤC TIÊU TỐI THƯỢNG"
                              value={mcData.goal}
                              onChange={(val) =>
                                setMcData({ ...mcData, goal: val })
                              }
                            />
                          </div>
                        </div>

                        {/* Nhóm 4: Hoàn cảnh & Nội tâm */}
                        <div className="space-y-6 col-span-full">
                          <h3
                            className={`text-lg font-bold ${theme.textPrimary} border-l-4 border-current pl-4 flex items-center gap-2`}
                          >
                            <Shield className="w-5 h-5" /> HOÀN CẢNH & NỘI TÂM
                          </h3>
                          <CharacterTextArea
                            label="NGUỒN GỐC / XUẤT THÂN / HOÀN CẢNH"
                            value={mcData.background}
                            onChange={(val) =>
                              setMcData({ ...mcData, background: val })
                            }
                          />
                          <CharacterTextArea
                            label="NỘI TÂM / SUY NGHĨ THẦM KÍN / ĐỘNG CƠ ẨN"
                            value={mcData.innerSecret}
                            onChange={(val) =>
                              setMcData({ ...mcData, innerSecret: val })
                            }
                          />
                        </div>

                        {/* Nhóm 5: Nội dung người lớn (NSFW) */}
                        <div className="space-y-6 col-span-full">
                          <h3 className="text-lg font-bold text-rose-400 border-l-4 border-current pl-4 flex items-center gap-2">
                            <Zap className="w-5 h-5" /> CHI TIẾT ĐẶC TRƯNG &
                            NSFW
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CharacterTextArea
                              label="QUAN NIỆM VỀ TÌNH YÊU & TÌNH DỤC"
                              value={mcData.loveViews}
                              onChange={(val) =>
                                setMcData({ ...mcData, loveViews: val })
                              }
                            />
                            <CharacterTextArea
                              label="TRINH TIẾT VÀ KINH NGHIỆM NSFW"
                              value={mcData.experience}
                              onChange={(val) =>
                                setMcData({ ...mcData, experience: val })
                              }
                            />
                            <CharacterTextArea
                              label="TÍNH CÁCH KHI NSFW"
                              value={mcData.nsfwPersonality}
                              onChange={(val) =>
                                setMcData({ ...mcData, nsfwPersonality: val })
                              }
                            />
                            <CharacterTextArea
                              label="PHẢN ỨNG ĐẶC TRƯNG (NSFW)"
                              value={mcData.nsfwReactions}
                              onChange={(val) =>
                                setMcData({ ...mcData, nsfwReactions: val })
                              }
                            />
                          </div>
                        </div>

                        {/* Nhóm 6: Miêu tả văn học */}
                        <div className="space-y-6 col-span-full">
                          <h3
                            className={`text-lg font-bold ${theme.textPrimary} border-l-4 border-current pl-4 flex items-center gap-2`}
                          >
                            <Terminal className="w-5 h-5" /> VĂN BẢN MIÊU TẢ
                            HOÀN CHỈNH
                          </h3>
                          <CharacterTextArea
                            label="MIÊU TẢ BẰNG NGÔN TỪ VĂN HỌC"
                            value={mcData.literaryDescription}
                            onChange={(val) =>
                              setMcData({ ...mcData, literaryDescription: val })
                            }
                            rows={10}
                          />
                        </div>

                        {/* Nhóm 7: Túi Đồ (Inventory) */}
                        <div className="space-y-6 col-span-full">
                          
                          <h3
                            className={`text-lg font-bold ${theme.textPrimary} border-l-4 border-current pl-4 flex items-center justify-between`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-5 h-5" /> TÚI ĐỒ (INVENTORY)
                            </div>
                            <button
                              onClick={() => {
                                const newInv = [
                                  ...(Array.isArray(mcData.inventory)
                                    ? mcData.inventory
                                    : []),
                                ];
                                newInv.push({
                                  name: "",
                                  quantity: 1,
                                  description: "",
                                });
                                setMcData({ ...mcData, inventory: newInv });
                              }}
                              className={`text-sm flex items-center gap-1 font-normal p-1 px-3 rounded-lg border cursor-pointer transition-colors ${theme.group === "Dark" ? "border-white/10 hover:bg-white/10 text-white/80 hover:text-white" : "border-black/10 hover:bg-black/5 text-[#334155]"}`}
                            >
                              <Plus className="w-4 h-4" /> Thêm vật phẩm
                            </button>
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {Array.isArray(mcData.inventory) &&
                              mcData.inventory.map((item, i) => (
                                <div
                                  key={i}
                                  className={`p-4 rounded-xl border flex gap-4 ${theme.group === "Dark" ? "bg-white/5 border-white/10" : "bg-white/80 border-black/10 shadow-sm"}`}
                                >
                                  <div className="flex-1 space-y-3">
                                    <div className="flex gap-4">
                                      <div className="flex-[2]">
                                        <CharacterInput
                                          label="Tên vật phẩm"
                                          value={item.name}
                                          onChange={(val) => {
                                            const newInv = [
                                              ...mcData.inventory,
                                            ];
                                            newInv[i] = {
                                              ...newInv[i],
                                              name: val,
                                            };
                                            setMcData({
                                              ...mcData,
                                              inventory: newInv,
                                            });
                                          }}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <CharacterInput
                                          label="Số lượng"
                                          value={String(item.quantity)}
                                          onChange={(val) => {
                                            const newInv = [
                                              ...mcData.inventory,
                                            ];
                                            newInv[i] = {
                                              ...newInv[i],
                                              quantity: Number(val) || 1,
                                            };
                                            setMcData({
                                              ...mcData,
                                              inventory: newInv,
                                            });
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <CharacterTextArea
                                      label="Mô tả công năng / Đặc điểm"
                                      value={item.description}
                                      onChange={(val) => {
                                        const newInv = [...mcData.inventory];
                                        newInv[i] = {
                                          ...newInv[i],
                                          description: val,
                                        };
                                        setMcData({
                                          ...mcData,
                                          inventory: newInv,
                                        });
                                      }}
                                    />
                                  </div>
                                  <button
                                    onClick={() => {
                                      const newInv = mcData.inventory.filter(
                                        (_, idx) => idx !== i,
                                      );
                                      setMcData({
                                        ...mcData,
                                        inventory: newInv,
                                      });
                                    }}
                                    className="p-2 self-start rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer mt-4"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            {(!Array.isArray(mcData.inventory) ||
                              mcData.inventory.length === 0) && (
                              <div
                                className={`p-6 text-center rounded-xl border border-dashed ${theme.group === "Dark" ? "border-white/20 text-white/40" : "border-black/10 text-[#334155]/60"}`}
                              >
                                Hiện tại túi đồ đang trống.
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {mcsData.length > 0 && (
                          <div className="col-span-full mt-8 flex justify-end">
                            <button
                              onClick={() => {
                                const newMcsData = [...mcsData];
                                newMcsData.splice(selectedMcIndex, 1);
                                setMcsData(newMcsData);
                                setSelectedMcIndex(-1);
                                toast.info("Đã xóa MC đang chọn.");
                              }}
                              className="px-6 py-3 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 hover:text-red-300 font-bold transition-all cursor-pointer flex items-center gap-2"
                            >
                              <Trash2 className="w-5 h-5" />
                              Xóa MC đang chọn
                            </button>
                          </div>
                        )}
                        </div>
                        )}
                      </div>
                      )}
                    </div>
                  )}

                  {activeTab === "npc" && (
                    <div className="space-y-12">
                      {/* Form Ý tưởng tạo NPCs */}
                      <div className="space-y-4 mb-8">
                        <h3 className={`text-lg font-bold ${theme.textPrimary} flex items-center gap-2`}>
                          <Sparkles className="w-5 h-5" /> Ý TƯỞNG DÀNH RIÊNG CHO NPCs
                        </h3>
                        <CharacterTextArea
                          label=""
                          value={npcIdea}
                          onChange={setNpcIdea}
                          placeholder="Mô tả ý tưởng về các NPC (ví dụ: Cần 1 cô công chúa kiêu ngạo, 1 ông lão bí ẩn, 1 tên sát thủ máu lạnh...)"
                        />
                        <ImageReferenceUploader
                          images={npcReferenceImages}
                          onChange={(imgs) => updateWorldCreation({ npcReferenceImages: imgs })}
                        />
                        <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-4">
                          <div className="flex flex-wrap gap-2 items-center">
                            <button
                              onClick={toggleCollapseAllNpcs}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${theme.group === "Dark" ? "border-white/10 hover:bg-white/5 text-white/70 hover:text-white" : "border-black/10 hover:bg-black/5 text-black/70 hover:text-black"} text-xs sm:text-sm font-bold transition-all cursor-pointer`}
                            >
                              {isAllNpcsCollapsed ? (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  <span>Mở rộng tất cả</span>
                                </>
                              ) : (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  <span>Thu gọn tất cả</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleResetNPCs}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600/20 transition-all font-bold text-xs sm:text-sm cursor-pointer shadow-sm"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>RESET NPCs</span>
                            </button>
                            <div className="relative" ref={npcCustomMenuRef}>
                              <button
                                type="button"
                                onClick={() => setShowNpcCustomMenu(!showNpcCustomMenu)}
                                className={`p-2 rounded-xl border transition-all cursor-pointer ${theme.group === "Dark" ? "border-white/10 hover:bg-white/5 text-white/70" : "border-black/10 hover:bg-black/5 text-black/70"}`}
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              
                              {showNpcCustomMenu && (
                                <div className={`absolute left-0 mt-2 w-48 rounded-xl shadow-lg border z-50 overflow-hidden ${theme.group === "Dark" ? "bg-[#1E293B] border-white/10" : "bg-white border-black/10"}`}>
                                  <input type="file" ref={npcCustomInputRef} className="hidden" accept=".json" onChange={importNpcCustomFields} />
                                  <button 
                                    type="button" 
                                    onClick={exportNpcCustomFields}
                                    className={`w-full text-left px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors ${theme.group === "Dark" ? "hover:bg-white/5 text-white/90" : "hover:bg-black/5 text-[#334155]"}`}
                                  >
                                    <Download className="w-4 h-4" /> Lưu vào máy
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => npcCustomInputRef.current?.click()}
                                    className={`w-full text-left px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors ${theme.group === "Dark" ? "hover:bg-white/5 text-white/90" : "hover:bg-black/5 text-[#334155]"}`}
                                  >
                                    <Upload className="w-4 h-4" /> Tải lên từ máy
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleGenerateNPCs}
                            disabled={isGeneratingNpc}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-bold hover:bg-purple-600/30 transition-all cursor-pointer disabled:opacity-50 relative overflow-hidden group"
                          >
                            {isGeneratingNpc ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Đang tạo NPCs...</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4" />
                                <span>Tạo NPCs</span>
                              </>
                            )}
                            {isGeneratingNpc && (
                              <motion.div
                                layoutId="gen-progress-npc"
                                className="absolute bottom-0 left-0 h-0.5 bg-purple-500 w-full"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                          </motion.button>
                        </div>
                      </div>
                      
                      {/* Bảng tuỳ chỉnh NPC */}
                      <div className={`p-4 rounded-xl border mb-8 ${theme.group === "Dark" ? "bg-black/20 border-white/10" : "bg-black/5 border-black/10"}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <span className={`text-sm font-bold ${theme.textPrimary}`}>Chế độ Bảng thông tin NPC:</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateWorldCreation({ npcTemplateMode: "default" })}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                                npcTemplateMode === "default"
                                  ? "bg-blue-600 text-white"
                                  : "bg-white/10 text-slate-400 hover:bg-white/20"
                              }`}
                            >
                              Mặc định
                            </button>
                            <button
                              onClick={() => updateWorldCreation({ 
                                npcTemplateMode: "custom",
                                customNpcFields: (customNpcFields && customNpcFields.length > 0) ? customNpcFields : (DEFAULT_NPC_FIELDS as any)
                              })}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                                npcTemplateMode === "custom"
                                  ? "bg-purple-600 text-white"
                                  : "bg-white/10 text-slate-400 hover:bg-white/20"
                              }`}
                            >
                              Tùy chỉnh
                            </button>
                          </div>
                        </div>
                        
                        {npcTemplateMode === "custom" && (
                          <div className="space-y-4">
                            <CharacterTextArea
                              label="Ý TƯỞNG BẢNG THÔNG TIN (AI TỰ TẠO)"
                              value={npcTemplateIdea}
                              onChange={setNpcTemplateIdea}
                              placeholder="Ví dụ: Bảng thông tin học sinh (Lớp, Tính cách, Ngoại hình, Điểm số, Gia cảnh...)"
                            />
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                onClick={() => updateWorldCreation({ customNpcFields: [] })}
                                className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${theme.group === "Dark" ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white" : "border-black/10 hover:bg-black/5 text-black/70 hover:text-black"}`}
                              >
                                Xóa Trắng
                              </button>
                              <button
                                onClick={() => updateWorldCreation({ customNpcFields: DEFAULT_NPC_FIELDS as any })}
                                className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${theme.group === "Dark" ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white" : "border-black/10 hover:bg-black/5 text-black/70 hover:text-black"}`}
                              >
                                Tải Mẫu Mặc Định
                              </button>
                              {customMcFields && customMcFields.length > 0 && (
                                <button
                                  onClick={() => updateWorldCreation({ customNpcFields: [...customMcFields] })}
                                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${theme.group === "Dark" ? "border-blue-500/30 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300" : "border-blue-500/30 hover:bg-blue-50/50 text-blue-600 hover:text-blue-700"}`}
                                >
                                  Sao Chép Cấu Trúc Từ MC
                                </button>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleGenerateTemplate("npc", npcTemplateIdea)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-bold hover:bg-purple-600/30 transition-all cursor-pointer"
                              >
                                <Wand2 className="w-4 h-4" /> AI Tạo Bảng
                              </motion.button>
                            </div>

                            {/* Tùy chọn tắt mảng quan hệ mặc định để dùng custom */}
                            <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${theme.group === "Dark" ? "bg-purple-950/20 border-purple-500/30" : "bg-purple-50 border-purple-200"}`}>
                              <div className="flex flex-col gap-0.5 pr-2">
                                <span className={`text-xs sm:text-sm font-bold ${theme.group === "Dark" ? "text-purple-300" : "text-purple-900"}`}>
                                  Tắt mảng Nhân Quả / Quan Hệ mặc định để dùng Custom
                                </span>
                                <span className={`text-[11px] opacity-70 ${theme.group === "Dark" ? "text-purple-200" : "text-purple-800"}`}>
                                  Cho phép tự do thiết kế các trường/mảng quan hệ tùy ý (subFields) mà không bị ép khuôn mẫu quan hệ cố định của hệ thống.
                                </span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                  type="checkbox"
                                  checked={!!disableDefaultNpcRelationships}
                                  onChange={(e) => updateWorldCreation({ disableDefaultNpcRelationships: e.target.checked })}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {npcTemplateMode === "custom" && (
                        <div className="mb-6 space-y-4 p-4 rounded-xl border bg-black/5 border-black/10 dark:bg-black/20 dark:border-white/10">
                          {/* Hướng dẫn sử dụng Bảng Tùy Chỉnh cho NPC có thể thu gọn */}
                          <div className={`p-4 rounded-xl border text-sm transition-all duration-300 ${theme.group === "Dark" ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                            <button
                              type="button"
                              onClick={() => setIsNpcGuideOpen(!isNpcGuideOpen)}
                              className="w-full text-left font-bold flex items-center justify-between gap-2 cursor-pointer focus:outline-none"
                            >
                              <span className="flex items-center gap-2"><Info className="w-4 h-4"/> Hướng dẫn sử dụng Bảng Tùy Chỉnh NPC</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] uppercase tracking-wider opacity-60 font-medium">
                                  {isNpcGuideOpen ? "Click để thu gọn" : "Click để mở rộng"}
                                </span>
                                {isNpcGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </button>
                            {isNpcGuideOpen && (
                              <div className="mt-3 pt-3 border-t border-dashed border-blue-500/20 dark:border-blue-500/30">
                                <ul className="list-disc list-inside space-y-1 opacity-90 text-xs">
                                  <li><b>Tên hiển thị:</b> Tiêu đề sẽ hiện trên bảng nhập liệu (VD: "Chỉ số Sức mạnh").</li>
                                  <li><b>Hướng dẫn về định nghĩa/nội dung:</b> Định nghĩa rõ ý nghĩa của trường này để AI hiểu bản chất nội dung (VD: "Thang điểm 1-100, quyết định sát thương vật lý").</li>
                                  <li><b>Yêu cầu với AI:</b> Yêu cầu chi tiết về cách viết, độ dài, phong cách cho AI (VD: "Viết 2-3 câu ngắn gọn, bám sát bối cảnh").</li>
                                  <li><b>Loại:</b> "Dòng ngắn" cho dữ liệu ít chữ (Tên, Tuổi), "Nhiều dòng" cho đoạn văn dài (Tiểu sử).</li>
                                  <li><b>Tạo mảng (Array Mode):</b> Khi tích chọn "Tạo mảng", AI sẽ tạo ra dữ liệu dưới dạng một mảng (danh sách) các đối tượng thay vì một ô văn bản duy nhất. Trong mảng này, bạn có thể hướng dẫn AI tạo ra nhiều trường nhỏ (sub-fields) bằng cách định nghĩa rõ cấu trúc mong muốn trong phần "Hướng dẫn định nghĩa" hoặc "Yêu cầu với AI" (Ví dụ: <i>Mảng "Kỹ năng" chứa các trường nhỏ: Tên chiêu thức, Sức sát thương, Mô tả hiệu ứng...</i>).</li>
                                  <li><b>Cơ chế kích hoạt điều kiện:</b> Cho phép cấu hình hiển thị động (bật/tắt) các trường phụ thuộc. Mỗi nhóm có thể chứa <b>nhiều điều kiện tham chiếu gốc</b> (kết hợp cả <b>Số</b> và <b>Chữ</b>, ví dụ: <i>"Tuổi &gt;= 18"</i> VÀ <i>"Giới tính == 'Nữ'"</i> ➔ BẬT <i>"Nhan sắc"</i>). Hỗ trợ đầy đủ toán tử so sánh Số (≥, &gt;, ≤, &lt;, ==, !=, và trong khoảng Từ X đến Y), toán tử so sánh Chữ (bằng chính xác, chứa từ, không bằng, không rỗng), cùng chế độ kết hợp logic (VÀ / HOẶC).</li>
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Chỉnh sửa cấu trúc bảng tùy chỉnh NPC có thể thu gọn */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-black/10 dark:border-white/10">
                            <h4 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>Chỉnh sửa cấu trúc bảng tùy chỉnh NPC:</h4>
                            <button
                              type="button"
                              onClick={() => setIsNpcFieldsOpen(!isNpcFieldsOpen)}
                              className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                theme.group === "Dark"
                                  ? "border-white/10 hover:bg-white/10 text-white/80"
                                  : "border-slate-300 hover:bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isNpcFieldsOpen ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" /> Thu gọn ({customNpcFields.length})
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" /> Mở rộng ({customNpcFields.length})
                                </>
                              )}
                            </button>
                          </div>

                          {isNpcFieldsOpen && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {customNpcFields.map((field: any, fidx: number) => (
                                <div key={fidx} className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all shadow-sm ${theme.group === "Dark" ? "bg-black/30 border-white/10" : "bg-black/5 border-black/10"}`}>
                                  <div className="flex flex-col gap-1">
                                    <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                      Tên hiển thị:
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Tên trường (VD: Chỉ số Sức mạnh, Tuyệt kỹ...)"
                                      className={`w-full bg-transparent border-b ${theme.group === "Dark" ? "border-white/20 text-white" : "border-black/20 text-black"} outline-none px-1 py-0.5 text-sm font-bold`}
                                      value={field.label || ""}
                                      onChange={(e) => {
                                        const newFields = [...customNpcFields];
                                        newFields[fidx] = { ...newFields[fidx], label: e.target.value };
                                        updateWorldCreation({ customNpcFields: newFields });
                                      }}
                                    />
                                  </div>
                                  {field.isArray ? (
                                    <div className="flex flex-col gap-2 mt-1">
                                      <div className="flex items-center justify-between">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                          Các trường con (Sub-fields):
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newFields = [...customNpcFields];
                                            const subFields = newFields[fidx].subFields || [];
                                            newFields[fidx] = { ...newFields[fidx], subFields: [...subFields, { label: "", description: "", aiRequirement: "" }] };
                                            updateWorldCreation({ customNpcFields: newFields });
                                          }}
                                          className={`px-2 py-1 text-[9px] font-bold rounded border ${theme.group === "Dark" ? "border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20" : "border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"}`}
                                        >
                                          + Thêm trường con
                                        </button>
                                      </div>
                                      {(field.subFields || []).map((subField: any, subIdx: number) => (
                                        <div key={subIdx} className={`p-2 rounded-lg border border-dashed flex flex-col gap-1.5 relative ${theme.group === "Dark" ? "border-white/20 bg-black/40" : "border-black/20 bg-white/40"}`}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newFields = [...customNpcFields];
                                              newFields[fidx].subFields.splice(subIdx, 1);
                                              updateWorldCreation({ customNpcFields: newFields });
                                            }}
                                            className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                          <input
                                            type="text"
                                            placeholder="Tên trường con (VD: Tên, Mô tả...)"
                                            className={`w-[calc(100%-24px)] bg-transparent border-b ${theme.group === "Dark" ? "border-white/20 text-white" : "border-black/20 text-black"} outline-none px-1 text-xs font-bold`}
                                            value={subField.label || ""}
                                            onChange={(e) => {
                                              const newFields = [...customNpcFields];
                                              newFields[fidx].subFields[subIdx].label = e.target.value;
                                              updateWorldCreation({ customNpcFields: newFields });
                                            }}
                                          />
                                          <textarea
                                            rows={1}
                                            placeholder="Định nghĩa/Nội dung"
                                            className={`w-full bg-transparent border rounded p-1.5 ${theme.group === "Dark" ? "border-white/10 text-white/80" : "border-black/10 text-black/80"} outline-none text-[10px] resize-y`}
                                            value={subField.description || ""}
                                            onChange={(e) => {
                                              const newFields = [...customNpcFields];
                                              newFields[fidx].subFields[subIdx].description = e.target.value;
                                              updateWorldCreation({ customNpcFields: newFields });
                                            }}
                                          />
                                          <textarea
                                            rows={1}
                                            placeholder="Yêu cầu với AI"
                                            className={`w-full bg-transparent border rounded p-1.5 ${theme.group === "Dark" ? "border-white/10 text-white/80" : "border-black/10 text-black/80"} outline-none text-[10px] resize-y`}
                                            value={subField.aiRequirement || ""}
                                            onChange={(e) => {
                                              const newFields = [...customNpcFields];
                                              newFields[fidx].subFields[subIdx].aiRequirement = e.target.value;
                                              updateWorldCreation({ customNpcFields: newFields });
                                            }}
                                          />
                                        </div>
                                      ))}
                                      {(!field.subFields || field.subFields.length === 0) && (
                                        <div className={`text-[10px] text-center p-2 rounded border border-dashed ${theme.group === "Dark" ? "border-white/10 text-white/40" : "border-black/10 text-black/40"}`}>
                                          Chưa có trường con. Nhấn "+ Thêm trường con" để tạo khuôn.
                                        </div>
                                      )}

                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-col gap-1">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                          Hướng dẫn về định nghĩa/nội dung:
                                        </label>
                                        <textarea
                                          rows={2}
                                          placeholder="Định nghĩa ý nghĩa và nội dung trường này..."
                                          className={`w-full bg-transparent border rounded-lg p-2 ${theme.group === "Dark" ? "border-white/10 text-white/80 bg-black/20" : "border-black/10 text-black/80 bg-white/40"} outline-none text-xs resize-y`}
                                          value={field.description || ""}
                                          onChange={(e) => {
                                            const newFields = [...customNpcFields];
                                            newFields[fidx] = { ...newFields[fidx], description: e.target.value };
                                            updateWorldCreation({ customNpcFields: newFields });
                                          }}
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                          Yêu cầu với AI:
                                        </label>
                                        <textarea
                                          rows={2}
                                          placeholder="Yêu cầu AI viết đúng ý (VD: Viết 2-3 câu ngắn gọn, hoặc bám sát bối cảnh...)"
                                          className={`w-full bg-transparent border rounded-lg p-2 ${theme.group === "Dark" ? "border-white/10 text-white/80 bg-black/20" : "border-black/10 text-black/80 bg-white/40"} outline-none text-xs resize-y`}
                                          value={field.aiRequirement || ""}
                                          onChange={(e) => {
                                            const newFields = [...customNpcFields];
                                            newFields[fidx] = { ...newFields[fidx], aiRequirement: e.target.value };
                                            updateWorldCreation({ customNpcFields: newFields });
                                          }}
                                        />
                                      </div>
                                    </>
                                  )}
                                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/5">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                                          Loại:
                                        </label>
                                        <select
                                          disabled={!!field.isArray}
                                          className={`bg-transparent text-xs font-bold outline-none cursor-pointer ${field.isArray ? "opacity-40" : ""} ${theme.group === "Dark" ? "text-white/80" : "text-black/80"}`}
                                          value={field.type || "input"}
                                          onChange={(e) => {
                                            const newFields = [...customNpcFields];
                                            newFields[fidx] = { ...newFields[fidx], type: e.target.value as "input" | "textarea" };
                                            updateWorldCreation({ customNpcFields: newFields });
                                          }}
                                        >
                                          <option value="input" className="bg-slate-800 text-white">Dòng ngắn</option>
                                          <option value="textarea" className="bg-slate-800 text-white">Nhiều dòng</option>
                                        </select>
                                      </div>
                                      <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                                        <input
                                          type="checkbox"
                                          checked={!!field.isArray}
                                          onChange={(e) => {
                                            const newFields = [...customNpcFields];
                                            newFields[fidx] = { ...newFields[fidx], isArray: e.target.checked };
                                            updateWorldCreation({ customNpcFields: newFields });
                                          }}
                                          className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Tạo mảng</span>
                                      </label>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const newFields = customNpcFields.filter((_, i) => i !== fidx);
                                        updateWorldCreation({ customNpcFields: newFields });
                                      }}
                                      className="text-red-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                                      title="Xóa trường này"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const newFields = [...customNpcFields, { id: "field" + Date.now(), label: "Trường mới", type: "input", description: "", aiRequirement: "" }];
                                  updateWorldCreation({ customNpcFields: newFields as any });
                                }}
                                className={`p-4 rounded-xl border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-all ${theme.group === "Dark" ? "border-white/20 hover:bg-white/5 text-white/60 hover:text-white" : "border-black/20 hover:bg-black/5 text-black/60 hover:text-black"}`}
                              >
                                <Plus className="w-5 h-5" /> Thêm trường mới
                              </button>
                            </div>

                            {/* NPC Generate Arrays Button */}
                            {customNpcFields.some((f: any) => f.isArray) && (
                              <div className="flex justify-end mt-4 border-t border-dashed border-black/10 dark:border-white/10 pt-4">
                                <button
                                  type="button"
                                  disabled={isGeneratingNpcSchemaArrays}
                                  onClick={handleGenerateArraysForNpcSchema}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Wand2 className={`w-4 h-4 ${isGeneratingNpcSchemaArrays ? "animate-spin" : ""}`} />
                                  {isGeneratingNpcSchemaArrays ? "ĐANG TẠO MẢNG NPC..." : "TẠO MẢNG NPC BẰNG AI"}
                                </button>
                              </div>
                            )}
                            <ConditionalFieldsEditor type="npc" theme={theme} />
                            </div>
                          )}
                        </div>
                      )}

                      {npcs.map((npc, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-8 rounded-[3rem] bg-white/5 border border-white/10 relative group shadow-2xl"
                        >
                          <button
                            onClick={() =>
                              setNpcs(npcs.filter((_, i) => i !== idx))
                            }
                            className="absolute top-6 right-6 p-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer z-10"
                            title="Xóa NPC"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>

                          <div className="space-y-10">
                            {/* Định danh nhanh */}
                            <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between">
                                  <label
                                    className={`text-xs font-black uppercase tracking-[0.2em] ${theme.textSecondary}`}
                                  >
                                    Tên hiển thị & Vai trò
                                  </label>
                                  <button
                                    onClick={() => toggleNpc(idx)}
                                    className={`${theme.textSecondary} hover:text-white transition-colors cursor-pointer mr-12`}
                                  >
                                    {collapsedNpcs[idx] ? (
                                      <ChevronDown className="w-5 h-5" />
                                    ) : (
                                      <ChevronUp className="w-5 h-5" />
                                    )}
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <CharacterTextArea
                                    label=""
                                    placeholder="Tên gọi nhanh (Ví dụ: Elena)"
                                    value={npc.name}
                                    onChange={(val) => {
                                      const newNpcs = [...npcs];
                                      newNpcs[idx] = {
                                        ...newNpcs[idx],
                                        name: val,
                                      };
                                      setNpcs(newNpcs);
                                    }}
                                    variant="npc-header"
                                  />
                                  <CharacterTextArea
                                    label=""
                                    placeholder="Vai trò (Người hướng dẫn, Đối thủ...)"
                                    value={npc.role}
                                    onChange={(val) => {
                                      const newNpcs = [...npcs];
                                      newNpcs[idx] = {
                                        ...newNpcs[idx],
                                        role: val,
                                      };
                                      setNpcs(newNpcs);
                                    }}
                                    variant="npc-header"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Chi tiết mở rộng */}
                            <AnimatePresence initial={false}>
                              {!collapsedNpcs[idx] && (
                                <motion.div
                                  className="grid grid-cols-1 gap-8 overflow-hidden"
                                  initial={{
                                    height: 0,
                                    opacity: 0,
                                    marginTop: 0,
                                  }}
                                  animate={{
                                    height: "auto",
                                    opacity: 1,
                                    marginTop: "2rem",
                                  }}
                                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                >
                                  {npcTemplateMode === "custom" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                      {customNpcFields.map((field: any, fidx: number) => {
                                        if (isRelationshipField(field, disableDefaultNpcRelationships)) {
                                          const relItems = (() => {
                                            let val = npc.customData?.[field.id] !== undefined ? npc.customData[field.id] : npc[field.id];
                                            if (!val) val = npc.relationships;
                                            if (Array.isArray(val)) return val;
                                            if (typeof val === "string") {
                                              try {
                                                const parsed = JSON.parse(val);
                                                if (Array.isArray(parsed)) return parsed;
                                              } catch (e) {}
                                            }
                                            return Array.isArray(npc.relationships) ? npc.relationships : [];
                                          })();

                                          return (
                                            <div key={fidx} className="col-span-full mt-2">
                                              <RelationshipArrayEditor
                                                label={field.label ? field.label.toUpperCase() : "TỔNG QUAN CÁC QUAN HỆ"}
                                                items={relItems}
                                                onChange={(val) => {
                                                  const newNpcs = [...npcs];
                                                  newNpcs[idx] = {
                                                    ...newNpcs[idx],
                                                    [field.id]: val,
                                                    relationships: val,
                                                    customData: { ...newNpcs[idx].customData, [field.id]: val }
                                                  };
                                                  setNpcs(newNpcs);
                                                }}
                                              />
                                            </div>
                                          );
                                        }

                                        const fieldValue = (() => {
                                          if (npc.customData && npc.customData[field.id] !== undefined && npc.customData[field.id] !== null && String(npc.customData[field.id]).trim() !== "") {
                                            return npc.customData[field.id];
                                          }
                                          if (npc[field.id] !== undefined && npc[field.id] !== null && String(npc[field.id]).trim() !== "") {
                                            return npc[field.id];
                                          }
                                          const lowerFieldId = field.id.toLowerCase().replace(/[^a-z0-9]/g, "");
                                          for (const [key, val] of Object.entries(npc)) {
                                            if (key === "customData" || typeof val === "object") continue;
                                            if (key.toLowerCase().replace(/[^a-z0-9]/g, "") === lowerFieldId && val !== undefined && val !== null && String(val).trim() !== "") {
                                              return String(val);
                                            }
                                          }
                                          return "";
                                        })();

                                        if (field.isArray) {
                                          return (
                                            <div key={fidx} className="col-span-full">
                                              <GenericArrayEditor
                                                label={field.label.toUpperCase()}
                                                description={field.description}
                                                subFields={field.subFields}
                                                items={fieldValue}
                                                onChange={(val) => {
                                                  const newNpcs = [...npcs];
                                                  newNpcs[idx] = { ...newNpcs[idx], [field.id]: val, customData: { ...newNpcs[idx].customData, [field.id]: val } };
                                                  setNpcs(newNpcs);
                                                }}
                                              />
                                            </div>
                                          );
                                        }

                                        return (
                                          <div key={fidx} className={field.type === "textarea" ? "col-span-full" : ""}>
                                            {field.type === "textarea" ? (
                                              <CharacterTextArea
                                                label={field.label.toUpperCase()}
                                                value={fieldValue}
                                                onChange={(val) => {
                                                  const newNpcs = [...npcs];
                                                  newNpcs[idx] = { ...newNpcs[idx], [field.id]: val, customData: { ...newNpcs[idx].customData, [field.id]: val } };
                                                  setNpcs(newNpcs);
                                                }}
                                                description={field.description}
                                              />
                                            ) : (
                                              <CharacterInput
                                                label={field.label.toUpperCase()}
                                                value={fieldValue}
                                                onChange={(val) => {
                                                  const newNpcs = [...npcs];
                                                  newNpcs[idx] = { ...newNpcs[idx], [field.id]: val, customData: { ...newNpcs[idx].customData, [field.id]: val } };
                                                  setNpcs(newNpcs);
                                                }}
                                                description={field.description}
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                      {(!disableDefaultNpcRelationships && !customNpcFields.some((f: any) => isRelationshipField(f, disableDefaultNpcRelationships))) && (
                                        <div className="col-span-full mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                                          <RelationshipArrayEditor
                                            label="TỔNG QUAN CÁC QUAN HỆ"
                                            items={npc.relationships || []}
                                            onChange={(val) => {
                                              const n = [...npcs];
                                              n[idx] = {
                                                ...n[idx],
                                                relationships: val,
                                              };
                                              setNpcs(n);
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                  <>
                                  {/* Nhóm 1: Định danh chi tiết */}
                                  <div className="space-y-4">
                                    <h4
                                      className={`text-sm font-bold ${theme.textSecondary} flex items-center gap-2 opacity-70`}
                                    >
                                      <User className="w-4 h-4" /> CHI TIẾT ĐỊNH
                                      DANH
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                      <CharacterInput
                                        label="HỌ VÀ TÊN"
                                        value={npc.fullName}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], fullName: val };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterInput
                                        label="DANH XƯNG (TƯỚC HIỆU)"
                                        value={npc.titles}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], titles: val };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterInput
                                        label="CHỨC VỤ (NGHỀ NGHIỆP)"
                                        value={npc.occupation}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = {
                                            ...n[idx],
                                            occupation: val,
                                          };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterInput
                                        label="GIỚI TÍNH"
                                        value={npc.gender}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], gender: val };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterInput
                                        label="TUỔI TÁC"
                                        value={npc.age}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], age: val };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterInput
                                        label="NGÀY THÁNG NĂM SINH"
                                        value={npc.dob}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], dob: val };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterInput
                                        label="CẢNH GIỚI / CẤP ĐỘ"
                                        value={npc.rank}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], rank: val };
                                          setNpcs(n);
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Nhóm 2: Hình thể */}
                                  <div className="space-y-4">
                                    <h4
                                      className={`text-sm font-bold ${theme.textSecondary} flex items-center gap-2 opacity-70`}
                                    >
                                      <Sparkles className="w-4 h-4" /> ĐẶC TRƯNG
                                      HÌNH THỂ
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <CharacterInput
                                        label="CHIỀU CAO"
                                        value={npc.height}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], height: val };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterInput
                                        label="CÂN NẶNG"
                                        value={npc.weight}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], weight: val };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterInput
                                        label="SỐ ĐO 3 VÒNG"
                                        value={npc.measurements}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = {
                                            ...n[idx],
                                            measurements: val,
                                          };
                                          setNpcs(n);
                                        }}
                                      />
                                    </div>
                                    <CharacterTextArea
                                      label="MIÊU TẢ NGOẠI HÌNH TỔNG QUAN"
                                      value={npc.appearance}
                                      onChange={(val) => {
                                        const n = [...npcs];
                                        n[idx] = { ...n[idx], appearance: val };
                                        setNpcs(n);
                                      }}
                                    />
                                    <CharacterTextArea
                                      label="MIÊU TẢ LITE (TÓM TẮT NGOẠI HÌNH)"
                                      value={npc.appearanceLite || ""}
                                      onChange={(val) => {
                                        const n = [...npcs];
                                        n[idx] = {
                                          ...n[idx],
                                          appearanceLite: val,
                                        };
                                        setNpcs(n);
                                      }}
                                      placeholder="Tóm tắt ngắn gọn ngoại hình của NPC để AI dễ ghi nhớ..."
                                      rows={3}
                                    />
                                    <CharacterTextArea
                                      label="ĐẶC ĐIỂM NHẬN DẠNG PHỤ"
                                      value={npc.distinguishingFeatures}
                                      onChange={(val) => {
                                        const n = [...npcs];
                                        n[idx] = {
                                          ...n[idx],
                                          distinguishingFeatures: val,
                                        };
                                        setNpcs(n);
                                      }}
                                    />
                                  </div>

                                  {/* Nhóm 3: Năng lực & Tính cách */}
                                  <div className="space-y-4">
                                    <h4
                                      className={`text-sm font-bold ${theme.textSecondary} flex items-center gap-2 opacity-70`}
                                    >
                                      <BrainCircuit className="w-4 h-4" /> NĂNG
                                      LỰC & TÍNH CÁCH
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4 mb-4">
                                      <ArrayItemEditor
                                        itemLabel="Năng Lực"
                                        label="NĂNG LỰC / SỨC MẠNH"
                                        description="Những thứ thuộc về phi thực tế (như hệ thống hay ma pháp... - các ví dụ để AI hiểu bản chất)."
                                        items={npc.powers}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], powers: val };
                                          setNpcs(n);
                                        }}
                                      />
                                      <ArrayItemEditor
                                        itemLabel="Kỹ Năng"
                                        label="KỸ NĂNG CHUYÊN MÔN"
                                        description="Những thứ thuộc về thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để AI hiểu bản chất)."
                                        items={npc.skills}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], skills: val };
                                          setNpcs(n);
                                        }}
                                      />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <CharacterTextArea
                                        label="TÍNH CÁCH TỔNG QUAN"
                                        value={npc.personality}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = {
                                            ...n[idx],
                                            personality: val,
                                          };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterTextArea
                                        label="TÍNH CÁCH CỐT LÕI (BẢN NGÃ)"
                                        value={npc.personalityCore}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = {
                                            ...n[idx],
                                            personalityCore: val,
                                          };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterTextArea
                                        label="KIM CHỈ NAM / LÝ TƯỞNG"
                                        value={npc.philosophy}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = {
                                            ...n[idx],
                                            philosophy: val,
                                          };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterTextArea
                                        label="MỤC TIÊU TỐI THƯỢNG"
                                        value={npc.goal}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], goal: val };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterTextArea
                                        label="NHU CẦU (SFW)"
                                        value={npc.needs?.sfw || ""}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], needs: { ...n[idx].needs, sfw: val } };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterTextArea
                                        label="NHU CẦU (NSFW)"
                                        value={npc.needs?.nsfw || ""}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = { ...n[idx], needs: { ...n[idx].needs, nsfw: val } };
                                          setNpcs(n);
                                        }}
                                      />
                                      <div className="space-y-4 col-span-1 md:col-span-2">
                                        <div className="flex flex-col gap-4">
                                          <CharacterTextArea
                                            label="SỞ THÍCH, GHÉT, NỖI SỢ (SFW)"
                                            value={npc.preferences?.sfw || ""}
                                            onChange={(val) => {
                                              const n = [...npcs];
                                              n[idx] = {
                                                ...n[idx],
                                                preferences: {
                                                  ...n[idx].preferences,
                                                  sfw: val,
                                                  nsfw:
                                                    n[idx].preferences?.nsfw ||
                                                    "",
                                                },
                                              };
                                              setNpcs(n);
                                            }}
                                            placeholder="Ví dụ: Thích hoa, ghét cá, sợ bóng tối..."
                                          />
                                          <CharacterTextArea
                                            label="SỞ THÍCH, GHÉT, NỖI SỢ (NSFW) [TÙY CHỌN]"
                                            value={npc.preferences?.nsfw || ""}
                                            onChange={(val) => {
                                              const n = [...npcs];
                                              n[idx] = {
                                                ...n[idx],
                                                preferences: {
                                                  ...n[idx].preferences,
                                                  sfw:
                                                    n[idx].preferences?.sfw ||
                                                    "",
                                                  nsfw: val,
                                                },
                                              };
                                              setNpcs(n);
                                            }}
                                            placeholder="Ví dụ: Thích bị cắn, ghét bạo lực quá mức, sợ..."
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Nhóm 4: Hoàn cảnh & Nội tâm */}
                                  <div className="space-y-4">
                                    <h4
                                      className={`text-sm font-bold ${theme.textSecondary} flex items-center gap-2 opacity-70`}
                                    >
                                      <Shield className="w-4 h-4" /> HOÀN CẢNH &
                                      NỘI TÂM
                                    </h4>
                                    <CharacterTextArea
                                      label="NGUỒN GỐC / XUẤT THÂN / HOÀN CẢNH"
                                      value={npc.background}
                                      onChange={(val) => {
                                        const n = [...npcs];
                                        n[idx] = { ...n[idx], background: val };
                                        setNpcs(n);
                                      }}
                                    />
                                    <CharacterTextArea
                                      label="NỘI TÂM / SUY NGHĨ THẦM KÍN / ĐỘNG CƠ ẨN"
                                      value={npc.innerSecret}
                                      onChange={(val) => {
                                        const n = [...npcs];
                                        n[idx] = {
                                          ...n[idx],
                                          innerSecret: val,
                                        };
                                        setNpcs(n);
                                      }}
                                    />
                                    <CharacterTextArea
                                      label="ẤN TƯỢNG & SUY NGHĨ (VỀ MC / THẾ GIỚI)"
                                      value={npc.impression || ""}
                                      onChange={(val) => {
                                        const n = [...npcs];
                                        n[idx] = {
                                          ...n[idx],
                                          impression: val,
                                        };
                                        setNpcs(n);
                                      }}
                                      placeholder="Nhập ấn tượng, đánh giá và suy nghĩ của NPC về nhân vật chính hoặc thế giới xung quanh..."
                                    />
                                    <RelationshipArrayEditor
                                      label="TỔNG QUAN CÁC QUAN HỆ"
                                      items={npc.relationships}
                                      onChange={(val) => {
                                        const n = [...npcs];
                                        n[idx] = {
                                          ...n[idx],
                                          relationships: val,
                                        };
                                        setNpcs(n);
                                      }}
                                    />
                                  </div>

                                  {/* Nhóm 5: Quan hệ & NSFW */}
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2 opacity-70">
                                      <Zap className="w-4 h-4" /> NSFW
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <CharacterTextArea
                                        label="QUAN NIỆM VỀ TÌNH YÊU & TÌNH DỤC"
                                        value={npc.loveViews}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = {
                                            ...n[idx],
                                            loveViews: val,
                                          };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterTextArea
                                        label="TRINH TIẾT VÀ KINH NGHIỆM NSFW"
                                        value={npc.experience}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = {
                                            ...n[idx],
                                            experience: val,
                                          };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterTextArea
                                        label="TÍNH CÁCH KHI NSFW"
                                        value={npc.nsfwPersonality}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = {
                                            ...n[idx],
                                            nsfwPersonality: val,
                                          };
                                          setNpcs(n);
                                        }}
                                      />
                                      <CharacterTextArea
                                        label="PHẢN ỨNG ĐẶC TRƯNG (NSFW)"
                                        value={npc.nsfwReactions}
                                        onChange={(val) => {
                                          const n = [...npcs];
                                          n[idx] = {
                                            ...n[idx],
                                            nsfwReactions: val,
                                          };
                                          setNpcs(n);
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Nhóm 5: Tác phẩm */}
                                  <div className="space-y-4">
                                    <h4
                                      className={`text-sm font-bold ${theme.textSecondary} flex items-center gap-2 opacity-70`}
                                    >
                                      <Terminal className="w-4 h-4" /> MIÊU TẢ
                                      VĂN HỌC
                                    </h4>
                                    <CharacterTextArea
                                      label="MIÊU TẢ BẰNG NGÔN TỪ VĂN HỌC"
                                      value={npc.literaryDescription}
                                      onChange={(val) => {
                                        const n = [...npcs];
                                        n[idx] = {
                                          ...n[idx],
                                          literaryDescription: val,
                                        };
                                        setNpcs(n);
                                      }}
                                      rows={6}
                                    />
                                  </div>
                                  </>
                                  )}

                                  <div className={`pt-6 mt-6 border-t ${theme.group === "Dark" ? "border-white/10" : "border-black/10"} flex justify-end`}>
                                    <button
                                      onClick={() =>
                                        setNpcs(npcs.filter((_, i) => i !== idx))
                                      }
                                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                      title="Xóa NPC"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                      <span className="font-bold text-sm">Xóa NPC</span>
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      ))}
                      <button
                        onClick={() =>
                          setNpcs([
                            ...npcs,
                            {
                              name: "",
                              fullName: "",
                              titles: "",
                              occupation: "",
                              gender: "",
                              age: "",
                              dob: "",
                              height: "",
                              weight: "",
                              measurements: "",
                              appearance: "",
                              appearanceLite: "",
                              background: "",
                              rank: "",
                              powers: [],
                              skills: [],
                              role: "",
                              personality: "",
                              personalityCore: "",
                              philosophy: "",
                              distinguishingFeatures: "",
                              innerSecret: "",
                              impression: "",
                              relationships: [],
                              loveViews: "",
                              experience: "",
                              nsfwPersonality: "",
                              nsfwReactions: "",
                              literaryDescription: "",
                              goal: "",
                              needs: { sfw: "", nsfw: "" },
                              preferences: { sfw: "", nsfw: "" },
                            },
                          ])
                        }
                        className={`w-full py-8 rounded-[2rem] border-2 border-dashed transition-all flex items-center justify-center gap-3 cursor-pointer group ${theme.group === "Dark" ? "border-white/10 hover:border-white/30 hover:bg-white/5 text-white/50 hover:text-white" : "border-slate-300 hover:border-slate-500 hover:bg-slate-100 text-slate-500 hover:text-slate-800"}`}
                      >
                        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                        <span className="font-bold uppercase tracking-widest text-sm">
                          Triệu hồi NPC mới
                        </span>
                      </button>
                    </div>
                  )}

                  {activeTab === "items" && (
                    <div className="space-y-8">
                      <div className="space-y-4 mb-8">
                        <h3 className={`text-lg font-bold ${theme.textPrimary} flex items-center gap-2`}>
                          <Sparkles className="w-5 h-5" /> Ý TƯỞNG DÀNH RIÊNG CHO LOCATION
                        </h3>
                        <p className={`text-sm ${theme.textSecondary}`}>
                          Bạn có thể thêm yêu cầu cụ thể về địa điểm (vd: "Thêm một thư viện bí ẩn trong trường học"). 
                          AI sẽ giữ nguyên các địa điểm hiện có và sáng tạo thêm.
                        </p>
                        <CharacterTextArea
                          label=""
                          value={locationIdea}
                          onChange={setLocationIdea}
                          placeholder="Mô tả ý tưởng về địa điểm..."
                          disabled={isGeneratingLocation}
                        />
                        <ImageReferenceUploader
                          images={locationReferenceImages}
                          onChange={(imgs) => updateWorldCreation({ locationReferenceImages: imgs })}
                        />
                        <button
                          onClick={handleGenerateLocation}
                          disabled={isGeneratingLocation}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm font-bold hover:bg-purple-600/30 transition-all cursor-pointer disabled:opacity-50 relative overflow-hidden group"
                        >
                          {isGeneratingLocation ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Đang Khởi Tạo...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4" />
                              Tạo Location
                            </>
                          )}
                          {!isGeneratingLocation && (
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-purple-500/10 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                          )}
                        </button>
                      </div>

                      <section className="space-y-4">
                        <LocationArrayEditor
                          label="CÁC ĐỊA ĐIỂM (LOCATIONS)"
                          items={worldDetails.locations || []}
                          onChange={(val) => setWorldDetails({ ...worldDetails, locations: val })}
                        />
                      </section>

                      {/* Giữ lại trường places cũ cho tương thích (hoặc bạn có thể giấu đi nếu không dùng nữa) */}
                      <section className="space-y-4 mt-8 opacity-50">
                        <CharacterTextArea
                          label="GHI CHÚ ĐỊA ĐIỂM KHÁC (Legacy)"
                          value={worldDetails.places || ""}
                          onChange={(val) =>
                            setWorldDetails({ ...worldDetails, places: val })
                          }
                          placeholder="Mô tả chi tiết các phòng ban..."
                        />
                      </section>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Helper Components for Character Forms
function CharacterInput({
  label,
  value,
  onChange,
  placeholder,
  onAIGen,
  isGenerating,
  description,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onAIGen?: () => void;
  isGenerating?: boolean;
  description?: string;
}) {
  const theme = useStore((state) => state.theme);
  const [localValue, setLocalValue] = React.useState(value);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const prevLenRef = React.useRef(value?.length || 0);

  React.useEffect(() => {
    if (document.activeElement !== textareaRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const currentLen = localValue?.length || 0;
    const isShrinking = currentLen < prevLenRef.current;
    prevLenRef.current = currentLen;

    if (isShrinking) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    } else {
      if (el.scrollHeight > el.clientHeight) {
        el.style.height = `${el.scrollHeight}px`;
      }
    }
  }, [localValue]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1.5 mb-1">
        <div className="flex items-center justify-between">
          <label
            className={`text-[10px] font-black uppercase tracking-widest pl-1 ${theme.group === "Dark" ? "text-white/40" : "text-slate-500"}`}
          >
            {label}
          </label>
          {onAIGen && (
            <button
              onClick={onAIGen}
              disabled={isGenerating}
              className={`text-[10px] flex items-center gap-1 font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                isGenerating
                  ? "opacity-50 cursor-not-allowed border-purple-500/30 text-purple-400 bg-purple-500/10"
                  : theme.group === "Dark"
                    ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                    : "border-black/10 hover:bg-black/5 text-[#334155]"
              }`}
              title="AI tự động sáng tạo nội dung cho mục này dựa trên các mục khác"
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3 text-purple-500" />
              )}{" "}
              AI Gen
            </button>
          )}
        </div>
        {description && (
          <p
            className={`text-[11px] pl-1 pr-1 leading-relaxed ${theme.group === "Dark" ? "text-white/35" : "text-slate-500"} italic`}
          >
            {description}
          </p>
        )}
      </div>
      <textarea
        ref={textareaRef}
        rows={1}
        value={
          typeof localValue === "string"
            ? localValue.replace(/<br\s*\/?>/gi, "\n")
            : localValue
        }
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== value) onChange(localValue);
        }}
        placeholder={placeholder}
        disabled={isGenerating}
        className="w-full theme-input px-4 py-3 rounded-xl transition-all font-medium resize-none overflow-hidden"
      />
    </div>
  );
}

function CharacterTextArea({
  label,
  value,
  onChange,
  rows = 1,
  placeholder = "",
  variant = "default",
  onAIGen,
  isGenerating,
  description,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
  variant?: "default" | "large" | "title" | "npc-header";
  onAIGen?: () => void;
  isGenerating?: boolean;
  description?: string;
  disabled?: boolean;
}) {
  const theme = useStore((state) => state.theme);
  const [localValue, setLocalValue] = React.useState(value);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const prevLenRef = React.useRef(value?.length || 0);

  React.useEffect(() => {
    if (document.activeElement !== textareaRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const currentLen = localValue?.length || 0;
    const isShrinking = currentLen < prevLenRef.current;
    prevLenRef.current = currentLen;

    if (isShrinking) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    } else {
      if (el.scrollHeight > el.clientHeight) {
        el.style.height = `${el.scrollHeight}px`;
      }
    }
  }, [localValue]);

  const getVariantStyles = () => {
    switch (variant) {
      case "large":
        return "px-8 py-6 rounded-[2rem] text-lg min-h-[120px]";
      case "title":
        return "px-8 py-6 rounded-[2rem] text-2xl font-bold shadow-inner";
      case "npc-header":
        return "px-6 py-4 rounded-2xl text-lg font-bold min-h-[60px]";
      default:
        return "px-6 py-4 rounded-2xl text-sm min-h-[80px]";
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex flex-col gap-1.5 mb-1">
          <div className="flex items-center justify-between">
            <label
              className={`text-[10px] font-black uppercase tracking-widest pl-1 ${theme.group === "Dark" ? "text-white/40" : "text-slate-500"}`}
            >
              {label}
            </label>
            {onAIGen && (
              <button
                onClick={onAIGen}
                disabled={isGenerating || disabled}
                className={`text-[10px] flex items-center gap-1 font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  (isGenerating || disabled)
                    ? "opacity-50 cursor-not-allowed border-purple-500/30 text-purple-400 bg-purple-500/10"
                    : theme.group === "Dark"
                      ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                      : "border-black/10 hover:bg-black/5 text-[#334155]"
                }`}
                title="AI tự động sáng tạo nội dung cho mục này dựa trên các mục khác"
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3 text-purple-500" />
                )}{" "}
                AI Gen
              </button>
            )}
          </div>
          {description && (
            <p
              className={`text-[11px] pl-1 pr-1 leading-relaxed ${theme.group === "Dark" ? "text-white/35" : "text-slate-500"} italic`}
            >
              {description}
            </p>
          )}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={
          typeof localValue === "string"
            ? localValue.replace(/<br\s*\/?>/gi, "\n")
            : localValue
        }
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== value) onChange(localValue);
        }}
        rows={rows}
        placeholder={placeholder}
        disabled={isGenerating || disabled}
        className={`w-full theme-input transition-all resize-none font-medium leading-relaxed overflow-hidden scrollbar-hide ${getVariantStyles()}`}
      />
    </div>
  );
}

function LocationArrayEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: Array<{ name: string; description: string }>;
  onChange: (val: Array<{ name: string; description: string }>) => void;
}) {
  const theme = useStore((state) => state.theme);
  const arr = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-2">
      {label && (
        <label
          className={`text-[10px] font-black uppercase tracking-widest pl-1 ${theme.group === "Dark" ? "text-white/40" : "text-slate-500"}`}
        >
          {label}
        </label>
      )}
      <div className="space-y-4">
        {arr.map((item, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border flex flex-col gap-3 ${theme.group === "Dark" ? "bg-white/5 border-white/10" : "bg-white/80 border-black/10 shadow-sm"}`}
          >
            <CharacterInput
              label="Tên địa điểm (từ lớn đến nhỏ)"
              value={item.name || ""}
              onChange={(val) => {
                const newArr = [...arr];
                newArr[i] = { ...newArr[i], name: val };
                onChange(newArr);
              }}
              placeholder="Ví dụ: Trường học - Lớp 12A"
            />
            <CharacterTextArea
              label="Mô tả chi tiết"
              value={item.description || ""}
              onChange={(val) => {
                const newArr = [...arr];
                newArr[i] = { ...newArr[i], description: val };
                onChange(newArr);
              }}
              placeholder="Nơi đó có gì và trông như thế nào..."
            />
            <button
              onClick={() => {
                const newArr = arr.filter((_, idx) => idx !== i);
                onChange(newArr);
              }}
              className="px-3 py-1.5 self-start rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer text-xs font-bold"
            >
              Xóa địa điểm
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newArr = [...arr, { name: "", description: "" }];
            onChange(newArr);
          }}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${theme.group === "Dark" ? "border-white/20 hover:bg-white/10 text-white/70" : "border-black/10 hover:bg-black/5 text-[#334155]"} cursor-pointer`}
        >
          + Thêm địa điểm
        </button>
      </div>
    </div>
  );
}

function ArrayItemEditor({
  label,
  description,
  items,
  onChange,
  itemLabel = "Item",
}: {
  label: string;
  description?: string;
  items: Array<any>;
  onChange: (val: Array<any>) => void;
  itemLabel?: string;
}) {
  const theme = useStore((state) => state.theme);
  const arr = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex flex-col gap-0.5 pl-1">
          <label
            className={`text-[10px] font-black uppercase tracking-widest ${theme.group === "Dark" ? "text-white/40" : "text-slate-500"}`}
          >
            {label}
          </label>
          {description && (
            <p className={`text-[11px] leading-relaxed ${theme.group === "Dark" ? "text-white/50" : "text-slate-500"}`}>
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {arr.map((item, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border flex flex-col gap-3 ${theme.group === "Dark" ? "bg-white/5 border-white/10" : "bg-white/80 border-black/10 shadow-sm"}`}
          >
            <div className="flex gap-3">
              <div className="flex-[2]">
                <CharacterInput
                  label={`Tên ${itemLabel}`}
                  value={item.name || ""}
                  onChange={(val) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], name: val };
                    onChange(newArr);
                  }}
                />
              </div>
              <div className="flex-1">
                <CharacterInput
                  label="Loại"
                  value={item.type || ""}
                  onChange={(val) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], type: val };
                    onChange(newArr);
                  }}
                />
              </div>
              <div className="flex-1">
                <CharacterInput
                  label="Cấp độ"
                  value={item.level || ""}
                  onChange={(val) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], level: val };
                    onChange(newArr);
                  }}
                />
              </div>
            </div>
            <CharacterTextArea
              label="Mô tả chi tiết"
              value={item.description || ""}
              onChange={(val) => {
                const newArr = [...arr];
                newArr[i] = { ...newArr[i], description: val };
                onChange(newArr);
              }}
            />
            <button
              onClick={() => {
                const newArr = arr.filter((_, idx) => idx !== i);
                onChange(newArr);
              }}
              className="px-3 py-1.5 self-start rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer text-xs font-bold"
            >
              Xóa
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newArr = [
              ...arr,
              { name: "", description: "", type: "", level: "" },
            ];
            onChange(newArr);
          }}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${theme.group === "Dark" ? "border-white/20 hover:bg-white/10 text-white/70" : "border-black/10 hover:bg-black/5 text-[#334155]"} cursor-pointer`}
        >
          + Thêm {itemLabel}
        </button>
      </div>
    </div>
  );
}

function GenericArrayEditor({
  label,
  description,
  subFields,
  items,
  onChange,
}: {
  label: string;
  description?: string;
  subFields?: Array<any>;
  items: any;
  onChange: (val: Array<any>) => void;
}) {
  const theme = useStore((state) => state.theme);
  const isDark = theme.group === "Dark";

  const keysToUse = React.useMemo(() => {
    if (subFields && subFields.length > 0) return subFields.map(s => s.label);
    return ["Tên", "Nội dung hoặc Định nghĩa", "Yêu cầu của người chơi"];
  }, [subFields]);

  // Helper chuẩn hóa so khớp key bất kể dấu cách, gạch dưới, hoa thường hay dấu tiếng Việt
  const normalizeKey = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  // Parse items safely
  const parsedArr = React.useMemo(() => {
    let rawArray: any[] = [];
    if (Array.isArray(items)) {
      rawArray = items;
    } else if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        if (Array.isArray(parsed)) rawArray = parsed;
      } catch (e) {}
    }

    return rawArray.map((item) => {
      if (item && typeof item === "object") {
         const obj: any = {};
         keysToUse.forEach(key => {
           let val = "";
           const normKey = normalizeKey(key);

           // 1. So khớp chính xác hoặc qua hàm chuẩn hóa ký tự
           for (const [k, v] of Object.entries(item)) {
             if (normalizeKey(k) === normKey) {
               val = String(v ?? "");
               break;
             }
           }

           // 2. Fallback tìm theo các biến thể thông dụng nếu chưa tìm thấy
           if (!val) {
             if (normKey.includes("ten") || normKey.includes("doituong")) {
               val = item["Tên"] || item["Đối Tượng"] || item.name || item.title || item.target || item[key] || "";
             } else if (normKey.includes("noidung") || normKey.includes("dinhnghia")) {
               val = item["Nội dung hoặc Định nghĩa"] || item["Nội dung"] || item["Định nghĩa"] || item.content || item.definition || item.description || item[key] || "";
             } else if (normKey.includes("yeucau")) {
               val = item["Yêu cầu của người chơi"] || item["Yêu cầu người chơi"] || item["Yêu cầu"] || item.requirement || item.aiRequirement || item[key] || "";
             } else {
               val = item[key] !== undefined ? String(item[key]) : "";
             }
           }
           obj[key] = val;
         });
         return obj;
      }
      const obj: any = {};
      keysToUse.forEach((key, index) => {
        if (index === 0) obj[key] = String(item || "");
        else obj[key] = "";
      });
      return obj;
    });
  }, [items, keysToUse]);

  // Bộ đệm trạng thái cục bộ (Buffer) nhằm chống giật lag tuyệt đối khi gõ chữ trên PC/Mobile lúc Khởi tạo thế giới
  const [localArr, setLocalArr] = React.useState(parsedArr);

  // Đồng bộ lại dữ liệu khi danh sách mục hoặc store thay đổi thực sự
  React.useEffect(() => {
    setLocalArr(parsedArr);
  }, [parsedArr]);

  // Hàm thay đổi trạng thái cục bộ tức thời
  const handleLocalChange = (index: number, key: string, value: string) => {
    const updated = [...localArr];
    updated[index] = {
      ...updated[index],
      [key]: value,
    };
    setLocalArr(updated);
  };

  // Đồng bộ lên Store WorldCreation khi rời ô nhập liệu
  const handleSyncToStore = () => {
    onChange(localArr);
  };

  const handleAddItem = () => {
    const newItem: any = {};
    keysToUse.forEach(k => newItem[k] = "");
    const updated = [...localArr, newItem];
    setLocalArr(updated);
    onChange(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = localArr.filter((_, idx) => idx !== index);
    setLocalArr(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3.5 w-full col-span-full">
      {label && (
        <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${isDark ? "text-white/40" : "text-slate-500 font-black opacity-80"}`}>
          {label} (MẢNG)
        </label>
      )}
      {description && (
        <p className={`text-[11px] pl-1 -mt-1.5 opacity-75 font-medium ${isDark ? "text-white/60" : "text-slate-600"}`}>
          💡 Yêu cầu: {description}
        </p>
      )}

      {/* Items list */}
      <div className="space-y-4">
        {localArr.map((item, i) => {
          return (
            <div
              key={i}
              className={`p-4 rounded-xl border flex flex-col gap-4 transition-all shadow-sm ${
                isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-slate-50/50 border-slate-200 hover:border-slate-300 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-center pb-2 border-b border-dashed border-black/10 dark:border-white/10">
                <span className={`text-[10px] uppercase font-black tracking-wider ${isDark ? "text-white/60" : "text-slate-500"}`}>🎯 Trường nhỏ #{i + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(i)}
                  className="px-2.5 py-1 text-[10px] uppercase font-black rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                >
                  Xóa trường
                </button>
              </div>

              <div className={`grid grid-cols-1 ${keysToUse.length <= 3 ? "md:grid-cols-" + keysToUse.length : "md:grid-cols-3"} gap-4`}>
                {keysToUse.map((key, kIndex) => (
                  <div key={kIndex} className="flex flex-col gap-1.5">
                    <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-purple-400" : "text-purple-700 font-black"}`}>
                      <span>{kIndex + 1}. {key}</span>
                    </label>
                    {kIndex === 0 ? (
                      <input
                        type="text"
                        placeholder={`${key}...`}
                        value={item[key] || ""}
                        onChange={(e) => handleLocalChange(i, key, e.target.value)}
                        onBlur={handleSyncToStore}
                        className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-all ${
                          isDark
                            ? "bg-black/60 border-white/20 text-white focus:border-purple-500"
                            : "border-slate-300 bg-white text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-500"
                        }`}
                      />
                    ) : (
                      <textarea
                        rows={2}
                        placeholder={`${key}...`}
                        value={item[key] || ""}
                        onChange={(e) => handleLocalChange(i, key, e.target.value)}
                        onBlur={handleSyncToStore}
                        className={`w-full border rounded-lg px-3 py-2 text-xs outline-none resize-none min-h-[46px] transition-all ${
                          isDark
                            ? "bg-black/60 border-white/20 text-white focus:border-purple-500"
                            : "border-slate-300 bg-white text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-500"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddItem}
          className={`text-[11px] font-black uppercase px-4 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
            isDark ? "border-purple-500/30 hover:bg-purple-500/10 text-purple-400" : "border-purple-300 hover:bg-purple-50 text-purple-700"
          }`}
        >
          ➕ Thêm trường nhỏ mới
        </button>
      </div>
    </div>
  );
}

function RelationshipArrayEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: Array<any>;
  onChange: (val: Array<any>) => void;
}) {
  const theme = useStore((state) => state.theme);
  const arr = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-2">
      {label && (
        <label
          className={`text-[10px] font-black uppercase tracking-widest pl-1 ${theme.group === "Dark" ? "text-white/40" : "text-slate-500"}`}
        >
          {label}
        </label>
      )}
      <div className="space-y-4">
        {arr.map((item, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border flex flex-col gap-3 ${theme.group === "Dark" ? "bg-white/5 border-white/10" : "bg-white/80 border-black/10 shadow-sm"}`}
          >
            <div className="flex gap-3">
              <div className="flex-[2]">
                <CharacterInput
                  label="Họ và tên nhân vật"
                  value={item.name || ""}
                  onChange={(val) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], name: val };
                    onChange(newArr);
                  }}
                />
              </div>
              <div className="flex-[1.5]">
                <CharacterInput
                  label="Mối quan hệ"
                  value={item.relation || ""}
                  onChange={(val) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], relation: val };
                    onChange(newArr);
                  }}
                />
              </div>
              <div className="flex-[1.5]">
                <CharacterInput
                  label="Tình trạng"
                  value={item.status || ""}
                  onChange={(val) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], status: val };
                    onChange(newArr);
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-[2]">
                <CharacterInput
                  label="Ấn tượng và suy nghĩ"
                  value={item.impression || ""}
                  onChange={(val) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], impression: val };
                    onChange(newArr);
                  }}
                />
              </div>
              <div className="flex-[1.5]">
                <CharacterInput
                  label="Cách xưng hô với họ (cách nhau bởi phẩy)"
                  value={
                    Array.isArray(item.termsOfAddress)
                      ? item.termsOfAddress.join(", ")
                      : item.termsOfAddress || ""
                  }
                  onChange={(val) => {
                    const newArr = [...arr];
                    newArr[i] = {
                      ...newArr[i],
                      termsOfAddress: val
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s),
                    };
                    onChange(newArr);
                  }}
                />
              </div>
              <div className="flex-[1.5]">
                <CharacterInput
                  label="Cách tự xưng bản thân (cách nhau bởi phẩy)"
                  value={
                    Array.isArray(item.selfAppellation)
                      ? item.selfAppellation.join(", ")
                      : item.selfAppellation || ""
                  }
                  onChange={(val) => {
                    const newArr = [...arr];
                    newArr[i] = {
                      ...newArr[i],
                      selfAppellation: val
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s),
                    };
                    onChange(newArr);
                  }}
                />
              </div>
            </div>
            <CharacterTextArea
              label="Mô tả chi tiết"
              value={item.description || ""}
              onChange={(val) => {
                const newArr = [...arr];
                newArr[i] = { ...newArr[i], description: val };
                onChange(newArr);
              }}
            />
            <button
              onClick={() => {
                const newArr = arr.filter((_, idx) => idx !== i);
                onChange(newArr);
              }}
              className="px-3 py-1.5 self-start rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer text-xs font-bold"
            >
              Xóa
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newArr = [
              ...arr,
              { name: "", relation: "", status: "", description: "" },
            ];
            onChange(newArr);
          }}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${theme.group === "Dark" ? "border-white/20 hover:bg-white/10 text-white/70" : "border-black/10 hover:bg-black/5 text-[#334155]"} cursor-pointer`}
        >
          + Thêm Mối Quan Hệ
        </button>
      </div>
    </div>
  );
}
