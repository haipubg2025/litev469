import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Palette, RotateCcw, Undo, Search } from 'lucide-react';
import { useStore } from '../store/useStore';

interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const COLOR_CATEGORIES = [
  { id: 'text', label: 'Màu Chữ thường', desc: 'Văn bản tường thuật chính văn (nếu để trống sẽ dùng màu mặc định của theme)' },
  { id: 'mc', label: 'Tên & Thoại MC (Người chơi)', desc: 'Màu sắc dùng riêng cho Tên và Lời thoại của nhân vật chính' },
  { id: 'npcNam', label: 'Tên & Thoại NPC Nam', desc: 'Màu định danh cho các nhân vật phụ nam giới' },
  { id: 'npcNu', label: 'Tên & Thoại NPC Nữ', desc: 'Màu định danh cho nhân vật phụ nữ giới' },
  { id: 'npcQuanChung', label: 'Tên & Thoại NPC Quần Chúng', desc: 'Màu cho các nhân vật phụ, quần chúng, qua đường, đám đông (#c3ee67)' },
  { id: 'linhThieng', label: 'Địa điểm linh thiêng / Đền đài', desc: 'VD: Đền Thờ, Thánh Địa, Thần Điện, Nhà Thờ, Miếu, Điện Thờ' },
  { id: 'danhHieu', label: 'Danh hiệu / Tước hiệu / Xưng hiệu', desc: 'Tước xưng, phong hiệu, danh xưng cao quý (VD: Kiếm Thánh, Đại Ma Đạo Sĩ, Vua Hải Tặc, Anh Hùng)' },
  { id: 'coThe', label: 'Bộ phận cơ thể / Sinh vật', desc: 'Tất cả các bộ phận trên cơ thể (cánh tay, đôi mắt, bầu ngực, đôi chân...)' },
  { id: 'itemConLai', label: 'Màu Item còn lại', desc: 'Tất cả các vật phẩm, thực thể chưa có màu cụ thể' },
  { id: 'thought', label: 'Màu Suy nghĩ / Hành động', desc: 'Hành động, cử chỉ, suy nghĩ (VD: *Mỉm cười nhẹ*, *Rùng mình*, *Nghĩ thầm*)' },
  { id: 'diaDanh', label: 'Địa danh / Vùng đất lớn', desc: 'Tên các châu lục, vùng đất lớn, thế giới (VD: Nhật Bản, Châu Âu, Trái Đất, Tân Thế Giới...)' },
  { id: 'quocGia', label: 'Quốc Gia / Đế Chế', desc: 'Tên quốc gia, vương quốc, đế quốc, thành phố (VD: Vương quốc Fiore, Đế quốc Roman, Thành phố Tokyo)' },
  { id: 'toChuc', label: 'Tổ Chức / Môn Phái', desc: 'Thế lực, bang phái, tổ chức, học viện, công ty (VD: Hội Hiệp Sĩ, Tông Môn, Học viện Ma Thuật, Tập đoàn X)' },
  { id: 'vuKhi', label: 'Vũ khí / Thần Binh', desc: 'Kiếm, súng, cung, phi tiêu, vũ khí chiến đấu (VD: Thánh Kiếm, Súng Lục, Cung Tên, Phi Tiêu)' },
  { id: 'trangPhuc', label: 'Trang phục / Y phục / Áo giáp', desc: 'Quần áo, váy vóc, áo giáp, giày, mũ, trang sức, phụ kiện (VD: Áo Giáp Kim Long, Váy Dạ Hội, Giày, Mũ Rơm, Nhẫn...)' },
  { id: 'kyNang', label: 'Kỹ năng / Dị năng / Phép thuật', desc: 'Chiêu thức, siêu năng lực, ma pháp, thiên phú (VD: Hỏa Cầu, Haki, Siêu Tốc Độ, Cú Đấm Thép)' },
  { id: 'khoBau', label: 'Kho báu / Cổ vật', desc: 'Báu vật có giá trị cao, cổ vật, bảo vật (VD: Chén Thánh, Ngọc Bội, Vương Miện, Bảo Kiếm)' },
  { id: 'thuoc', label: 'Thuốc / Đan dược', desc: 'Vật phẩm phục hồi, cường hóa, chữa bệnh (VD: Bình máu, Đan dược, Tiêm sinh lực, Băng gạc)' },
  { id: 'thucAn', label: 'Thức ăn / Món ăn', desc: 'Đồ ăn, nguyên liệu nấu ăn (VD: Bánh mì, Thịt nướng, Cơm nắm, Táo, Gạo)' },
  { id: 'nuocUong', label: 'Nước uống / Giải khát', desc: 'Đồ uống, rượu, nước giải khát (VD: Rượu Vang, Nước lọc, Cà phê, Trà, Sữa)' },
  { id: 'vatPham', label: 'Vật phẩm / Đạo cụ khác', desc: 'Đồ dùng tiêu hao, đạo cụ, vật dụng sinh hoạt (VD: Bút, Chìa khóa, Bản đồ, Đèn pin, Túi xách)' },
  { id: 'taiSan', label: 'Tài sản / Tiền tệ', desc: 'Tiền bạc, vàng bạc, kinh tế (VD: Tiền Vàng, Đô la, Xu bạc, Linh thạch, Ngân lượng)' },
  { id: 'tinNhan', label: 'Tin nhắn / Thư tay', desc: 'Văn bản, email, thông điệp, thư từ (VD: Bức thư, Email công việc, Tin nhắn điện thoại)' },
  { id: 'suKien', label: 'Sự kiện hệ thống', desc: 'Thông báo quan trọng, nhiệm vụ, nhắc nhở (VD: [Nhiệm vụ mới], [Level Up!])' },
  { id: 'quaiVat', label: 'Quái vật / Kẻ địch', desc: 'Boss, dã thú, zombie, yêu quái (VD: Vua Slime, Rồng Lửa, Zombie Cấp 1, Goblin)' },
  { id: 'thuCung', label: 'Thú cưng / Đồng minh', desc: 'Sủng vật, sinh vật đồng hành, thú nuôi (VD: Chó sói con, Rồng nhỏ, Mèo thần tài)' },
  { id: 'thuCuoi', label: 'Thú cưỡi / Phương tiện', desc: 'Tọa kị, xe cộ, tàu vũ trụ (VD: Ngựa trắng, Ô tô, Chổi bay, Tàu Không Gian)' },
  { id: 'amThanhMoiTruong', label: 'Âm thanh môi trường', desc: 'Tiếng động SFX (VD: *~RẦM!~*, *Vút*, *Lộp bộp*, *Két...*)' },
  { id: 'amThanhMayMoc', label: 'Âm thanh máy móc', desc: 'Điện thoại, TV, thiết bị điện tử, máy móc (VD: *Bíp bíp*, *Tít tít*, *Rè rè*)' },
  { id: 'huyet', label: 'Máu / Thương tích', desc: 'Máu me, cuồng nộ, sát khí, vết thương (VD: Giọt máu, Vết chém) - KHÔNG DÙNG CHO DA THỊT' },
  { id: 'damThuy', label: 'Dâm thủy / Dâm dịch / Dịch sinh lý', desc: 'Dâm thủy, dâm dịch, tinh dịch, tình dịch, nước bọt, mồ hôi, dịch sinh lý (VD: Dâm thủy tuôn trào, Tinh dịch, Nước bọt óng ánh)' },
  { id: 'mana', label: 'Mana / Năng lượng', desc: 'Mana, linh lực, năng lượng, nội năng (VD: Năng lượng xanh, Mana dao động, Linh khí thuần khiết)' },
  { id: 'thucVat', label: 'Thực vật / Cỏ cây', desc: 'Cây cối, hoa lá, rừng rậm, thiên nhiên (VD: Cây cổ thụ, Bông hồng, Rừng thông, Thảo dược)' },
  { id: 'maPhap', label: 'Ma pháp hắc ám', desc: 'Độc tố, tà khí, quỷ dị, bóng tối, lời nguyền (VD: Sương mù đen, Khí độc, Tà thuật, Nguyền rủa)' },
  { id: 'thanThanh', label: 'Thần thánh / Ánh sáng', desc: 'Sự uy nghiêm, hào quang, sức mạnh thần thánh (VD: Ánh sáng vàng, Hào quang, Thánh lực)' },
  { id: 'camXuc', label: 'Cảm xúc bùng nổ', desc: 'Lửa thiêu, hỏa hệ, cuồng hóa, sức mạnh tức thời (VD: Lửa giận hừng hực, Ngọn lửa đỏ, Nhiệt huyết)' },
  { id: 'bangGia', label: 'Băng giá / Ánh trăng', desc: 'Sự lạnh lẽo, vô tình, băng tuyết, ánh trăng bạc (VD: Băng giá lạnh buốt, Tuyết rơi, Ánh trăng rằm)' },
  { id: 'canhGioi', label: 'Cảnh giới / Cấp độ tu luyện', desc: 'Cấp độ, tu vi, đẳng cấp (VD: Level 10, Luyện Khí Kỳ, Ma Pháp Sư Bậc 3, Hạng S)' },
  { id: 'chucNghiep', label: 'Chức nghiệp / Nghề nghiệp', desc: 'Lớp nhân vật, nghề nghiệp, chức danh (VD: Thợ rèn, Chiến binh, Học sinh, Bác sĩ)' },
  { id: 'thienNhien', label: 'Thiên nhiên / Mộc hệ', desc: 'Sự sống, trị liệu, hồi phục, tự nhiên (VD: Khí tức sự sống, Hồi phục tự nhiên, Năng lượng xanh mướt)' },
];

export const DEFAULT_LIGHT_COLOR_CONFIG = {
  canhGioi: "#059669",
  chucNghiep: "#C2410C",
  itemConLai: "#9A3412",
  thought: "#7E22CE",
  text: "",
  mc: "#0284C7",
  npcNam: "#1D4ED8",
  npcNu: "#BE185D",
  npcQuanChung: "#4D7C0F",
  linhThieng: "#C2410C",
  danhHieu: "#C2410C",
  coThe: "#BE123C",
  diaDanh: "#78350F",
  quocGia: "#5B21B6",
  toChuc: "#6D28D9",
  vuKhi: "#BE123C",
  trangPhuc: "#C026D3",
  kyNang: "#0F766E",
  khoBau: "#A16207",
  thuoc: "#047857",
  thucAn: "#C2410C",
  nuocUong: "#0369A1",
  vatPham: "#854D0E",
  taiSan: "#A16207",
  tinNhan: "#4338CA",
  suKien: "#B91C1C",
  quaiVat: "#B91C1C",
  thuCung: "#9A3412",
  thuCuoi: "#78350F",
  amThanhMoiTruong: "#0F766E",
  amThanhMayMoc: "#4D7C0F",
  huyet: "#B91C1C",
  damThuy: "#0284C7",
  mana: "#1D4ED8",
  thucVat: "#15803D",
  maPhap: "#6D28D9",
  thanThanh: "#A16207",
  camXuc: "#C2410C",
  bangGia: "#0369A1",
  thienNhien: "#059669"
};

export const DEFAULT_COLOR_CONFIG = {
  canhGioi: "#10B981",
  chucNghiep: "#F97316",
  itemConLai: "#CC5500",
  thought: "#9333ea",
  text: "",
  mc: "#00FFFF",
  npcNam: "#3388FF",
  npcNu: "#FF66B2",
  npcQuanChung: "#c3ee67",
  linhThieng: "#FF4500",
  danhHieu: "#FF4500",
  coThe: "#FF9F9F",
  diaDanh: "#D2B48C",
  quocGia: "#9370DB",
  toChuc: "#8B5CF6",
  vuKhi: "#F43F5E",
  trangPhuc: "#E879F9",
  kyNang: "#2DD4BF",
  khoBau: "#FFD700",
  thuoc: "#00FA9A",
  thucAn: "#FF8C00",
  nuocUong: "#00BFFF",
  vatPham: "#F0E68C",
  taiSan: "#FFD700",
  tinNhan: "#A78BFA",
  suKien: "#FF4444",
  quaiVat: "#FF4500",
  thuCung: "#D2691E",
  thuCuoi: "#DEB887",
  amThanhMoiTruong: "#20B2AA",
  amThanhMayMoc: "#7FFF00",
  huyet: "#FF4D4D",
  damThuy: "#38BDF8",
  mana: "#3B82F6",
  thucVat: "#22C55E",
  maPhap: "#B366FF",
  thanThanh: "#FFD700",
  camXuc: "#FF8C00",
  bangGia: "#38BDF8",
  thienNhien: "#10B981"
};

interface ColorCategoryItemProps {
  cat: { id: string; label: string; desc: string };
  isDark: boolean;
  customColor: string | undefined;
  onColorChange: (id: string, color: string) => void;
}

const ColorCategoryItem = React.memo(function ColorCategoryItem({
  cat,
  isDark,
  customColor,
  onColorChange,
}: ColorCategoryItemProps) {
  const defaultThemeColor = isDark
    ? (DEFAULT_COLOR_CONFIG as Record<string, string>)[cat.id] || '#cccccc'
    : (DEFAULT_LIGHT_COLOR_CONFIG as Record<string, string>)[cat.id] || '#333333';

  // For text, empty string means default theme text color (#ffffff for dark, #000000 for light)
  const fallbackHex = cat.id === 'text' ? (isDark ? '#ffffff' : '#000000') : defaultThemeColor;

  const activeColorHex = customColor || fallbackHex;

  const [localColor, setLocalColor] = useState(activeColorHex);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalColor(activeColorHex);
  }, [activeColorHex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalColor(newVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onColorChange(cat.id, newVal);
    }, 150);
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (localColor !== activeColorHex) {
      onColorChange(cat.id, localColor);
    }
  };

  const handleResetSingle = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onColorChange(cat.id, '');
  };

  return (
    <div className={`flex items-center justify-between p-3 md:p-4 rounded-xl border ${isDark ? 'bg-zinc-800/20 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'} transition-colors`}>
      <div className="flex-1 pr-3">
        <div className={`font-bold text-sm md:text-base ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{cat.label}</div>
        <div className={`text-[10px] md:text-xs mt-1 line-clamp-2 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{cat.desc}</div>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <input
          type="color"
          value={localColor}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="w-10 h-10 md:w-12 md:h-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent shadow-sm hover:scale-105 transition-transform"
        />
        <div className="flex items-center gap-1 mt-0.5">
          {Boolean(customColor) && (
            <button
              onClick={handleResetSingle}
              className="text-[9px] text-red-500 hover:text-red-400 font-medium hover:underline cursor-pointer"
              title="Khôi phục màu mặc định theme"
            >
              Reset
            </button>
          )}
          <span className={`text-[9px] font-mono uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {customColor ? localColor : `MĐ: ${fallbackHex}`}
          </span>
        </div>
      </div>
    </div>
  );
});

export function ColorModal({ isOpen, onClose }: ColorModalProps) {
  const theme = useStore((state) => state.theme);
  const useColorEnabled = useStore((state) => state.useColorEnabled);
  const setUseColorEnabled = useStore((state) => state.setUseColorEnabled);
  const colorConfig = useStore((state) => state.colorConfig);
  const setColorConfig = useStore((state) => state.setColorConfig);
  const resetColorConfig = useStore((state) => state.resetColorConfig);
  const undoColorConfig = useStore((state) => state.undoColorConfig);
  const previousColorConfig = useStore((state) => state.previousColorConfig);
  const [searchQuery, setSearchQuery] = useState('');

  const handleColorChange = useCallback((id: string, color: string) => {
    setColorConfig({ [id]: color });
  }, [setColorConfig]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return COLOR_CATEGORIES;
    const q = searchQuery.toLowerCase().trim();
    return COLOR_CATEGORIES.filter(
      (cat) =>
        cat.label.toLowerCase().includes(q) ||
        cat.desc.toLowerCase().includes(q) ||
        cat.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const isDark = theme.group === 'Dark';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`relative pointer-events-auto flex flex-col w-full h-full overflow-hidden border-0 ${isDark ? 'bg-zinc-900' : 'bg-white'}`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 md:p-6 border-b shrink-0 ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              <Palette size={24} className="text-blue-500" /> Bảng Thiết Lập Màu Sắc
            </h3>
            <div className="flex items-center gap-2">
              {previousColorConfig && (
                <button
                  onClick={undoColorConfig}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'}`}
                >
                  <Undo size={16} /> <span className="hidden sm:inline">UNDO</span>
                </button>
              )}
              <button
                onClick={resetColorConfig}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'}`}
                title="Khôi phục toàn bộ màu về mặc định theo Theme hiện tại"
              >
                <RotateCcw size={16} /> <span className="hidden sm:inline">RESET</span>
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            {/* Search and Master Toggle Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className={`flex items-center justify-between p-4 rounded-xl flex-1 ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                <div>
                  <div className={`text-base md:text-lg font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Kích hoạt tô màu chính văn</div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Đang dùng chế độ màu mặc định cho giao diện: <span className="font-bold">{isDark ? 'Tối (Dark Theme)' : 'Sáng (Light Theme)'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setUseColorEnabled(!useColorEnabled)}
                  className={`px-4 py-2 font-bold rounded-lg transition-colors cursor-pointer shrink-0 ml-3 ${
                    useColorEnabled 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : (isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-300 text-zinc-700 hover:bg-zinc-400')
                  }`}
                >
                  {useColorEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Search Box */}
              <div className={`relative flex items-center md:w-80 p-2.5 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}>
                <Search size={18} className={`ml-1 shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm mục màu (VD: MC, dâm thủy, kỹ năng...)"
                  className="w-full bg-transparent border-none outline-none px-2 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`p-1 rounded-full hover:bg-zinc-700/50 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Color Pickers */}
            {filteredCategories.length === 0 ? (
              <div className={`text-center py-12 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Không tìm thấy danh mục màu nào phù hợp với từ khóa "{searchQuery}"
              </div>
            ) : (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${!useColorEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                {filteredCategories.map((cat) => (
                  <ColorCategoryItem
                    key={`color-category-${cat.id}`}
                    cat={cat}
                    isDark={isDark}
                    customColor={colorConfig[cat.id]}
                    onColorChange={handleColorChange}
                  />
                ))}
              </div>
            )}
            
            <div className={`mt-8 p-4 rounded-xl text-sm ${isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <p className="font-bold mb-1">Lưu ý về màu sắc AI:</p>
              <p>Các thiết lập màu sắc này sẽ tự động thích ứng với giao diện Sáng/Tối (Light/Dark Theme). Bạn có thể tùy chỉnh từng màu hoặc nhấn Reset để khôi phục màu sắc tối ưu theo theme hiện tại. Bảng màu này đóng vai trò quyết định, đảm bảo tính nhất quán tối đa.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
