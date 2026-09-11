import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Shield, Zap, Sparkles, Sword, User, MapPin, Plus, Trash2, BrainCircuit, Book, Activity, Trophy, ScrollText } from 'lucide-react';
import { useStore } from '../store/useStore';
import CodexUpdateModal from './CodexUpdateModal';
import { toast } from '../utils/toast';

type CreationTab = 'world' | 'creative' | 'worldState' | 'leaderboards' | 'scenario' | 'items';

const tabs = [
  { id: 'world', label: 'World', icon: Globe },
  { id: 'creative', label: 'Sáng Tạo', icon: BrainCircuit },
  { id: 'worldState', label: 'Trạng Thái', icon: Activity },
  { id: 'leaderboards', label: 'Xếp Hạng', icon: Trophy },
  { id: 'scenario', label: 'Kịch Bản', icon: ScrollText },
  { id: 'items', label: 'Vị Trí', icon: MapPin },
] as const;

function CharacterInput({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  const theme = useStore(state => state.theme);
  const [localValue, setLocalValue] = React.useState(value);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localValue]);

  const isDark = theme.group === 'Dark';

  return (
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${
        isDark ? 'text-white/40' : 'text-[#5C4033]/75 font-semibold'
      }`}>{label}</label>
      <textarea
        ref={textareaRef}
        rows={1}
        value={localValue || ''}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => { if(localValue !== value) onChange(localValue); }}
        className={`w-full px-4 py-3 rounded-xl outline-none text-sm transition-all font-medium resize-none overflow-hidden ${
          isDark
            ? 'bg-white/5 border border-white/10 text-white focus:border-white/30'
            : 'bg-white border border-amber-200 text-[#3E2723] focus:border-blue-600 focus:ring-1 focus:ring-blue-500 shadow-xs'
        }`}
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
  variant = "default" 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  rows?: number;
  placeholder?: string;
  variant?: "default" | "large" | "title" | "npc-header"
}) {
  const theme = useStore(state => state.theme);
  const [localValue, setLocalValue] = React.useState(value);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localValue]);

  const isDark = theme.group === 'Dark';

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
        <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${
          isDark ? 'text-white/40' : 'text-[#5C4033]/75 font-semibold'
        }`}>{label}</label>
      )}
      <textarea
        ref={textareaRef}
        value={localValue || ''}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => { if(localValue !== value) onChange(localValue); }}
        rows={rows}
        placeholder={placeholder}
        className={`w-full outline-none transition-all resize-none font-medium leading-relaxed overflow-hidden scrollbar-hide ${
          isDark
            ? 'bg-white/5 border border-white/10 text-white focus:border-white/30'
            : 'bg-white border border-amber-200 text-[#3E2723] focus:border-blue-600 focus:ring-1 focus:ring-blue-500 shadow-xs'
        } ${getVariantStyles()}`}
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
          className={`text-[10px] font-black uppercase tracking-widest pl-1 ${theme.group === "Dark" ? "text-white/40" : "text-[#5C4033]/75 font-semibold"}`}
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
            />
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

export default function CodexModal({ onClose }: { onClose: () => void }) {
  const theme = useStore(state => state.theme);
  const gameData = useStore(state => state.gameData);
  const setGameData = useStore(state => state.setGameData);
  const autoUpdateCodex = useStore(state => state.autoUpdateCodex);
  const setAutoUpdateCodex = useStore(state => state.setAutoUpdateCodex);
  const [activeTab, setActiveTab] = useState<CreationTab>('world');
  const [showConfirmUpdateModal, setShowConfirmUpdateModal] = useState(false);
  const [showDifficultyGuide, setShowDifficultyGuide] = useState(false);

  if (!gameData) return null;

  const worldData = gameData.worldData || {};
  const worldDetails = gameData.worldDetails || { places: '' };

  const setWorldData = (val: any) => setGameData({ ...gameData, worldData: val });
  const setWorldDetails = (val: any) => setGameData({ ...gameData, worldDetails: val });

  const isDark = theme.group === 'Dark';

  const pendingUpdates = gameData.codexPendingUpdates;
  const hasPending = pendingUpdates && (
    (pendingUpdates.worldData && Object.keys(pendingUpdates.worldData).length > 0) ||
    (pendingUpdates.worldDetails && (
      (pendingUpdates.worldDetails.locations && pendingUpdates.worldDetails.locations.length > 0) ||
      (pendingUpdates.worldDetails.places && pendingUpdates.worldDetails.places !== worldDetails.places)
    )) ||
    (pendingUpdates.creativeRules && pendingUpdates.creativeRules !== gameData.creativeRules)
  );

  return (
    <motion.div initial={{ opacity: 0}} animate={{ opacity: 1}} exit={{ opacity: 0}} className={`fixed inset-0 z-[100] backdrop-blur-sm flex flex-col w-full h-full max-w-full max-h-full p-0 m-0 overflow-hidden ${isDark ? 'bg-black/80' : 'bg-amber-900/15'}`} onClick={onClose}>
      <div 
        className={`w-full h-full flex flex-col rounded-none border-0 shadow-none overflow-hidden ${
          isDark ? 'theme-panel !border-none text-white' : 'bg-[#FAF7F0]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-4 flex items-center justify-between shrink-0 border-b ${
          isDark ? 'border-white/10 bg-black/10' : 'border-amber-200/60 bg-[#FFFDF9]/60 backdrop-blur-sm'
        }`}>
          <h2 className={`text-base md:text-xl font-black uppercase tracking-widest flex items-center gap-1.5 md:gap-2 ${
            isDark ? 'text-amber-400' : 'text-amber-800'
          }`}>
            <Book size={18} className="md:w-5 md:h-5"/> 
            <span className="hidden sm:inline">CODEX THẾ GIỚI</span>
            <span className="sm:hidden">CODEX</span>
          </h2>
          
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => {
                if (hasPending) {
                  setShowConfirmUpdateModal(true);
                }
              }}
              disabled={!hasPending}
              className={`px-3 md:px-4 py-2 rounded-lg font-black text-[11px] md:text-xs tracking-wider flex items-center gap-1.5 transition-all ${
                hasPending
                  ? "bg-green-500 hover:bg-green-600 text-slate-950 cursor-pointer animate-pulse shadow-lg shadow-green-500/20"
                  : isDark
                    ? "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed opacity-40"
                    : "bg-amber-200/30 text-amber-900/30 border border-amber-200/10 cursor-not-allowed opacity-50"
              }`}
            >
              <Sparkles 
                size={14} 
                className={hasPending ? "animate-spin" : "opacity-30"} 
                style={hasPending ? { animationDuration: '3s' } : undefined} 
              />
              <span className="hidden sm:inline">DUYỆT CẬP NHẬT</span>
              <span className="sm:hidden">CẬP NHẬT</span>
            </button>

            <button
              onClick={() => {
                const nextVal = !autoUpdateCodex;
                setAutoUpdateCodex(nextVal);
                toast.success(nextVal ? "Đã BẬT tự động duyệt cập nhật CODEX!" : "Đã TẮT tự động duyệt cập nhật CODEX!");
              }}
              className={`px-3 md:px-4 py-2 rounded-lg font-black text-[11px] md:text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border select-none ${
                autoUpdateCodex
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 border-amber-400"
                  : isDark
                    ? "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                    : "bg-amber-200/30 border border-amber-200 text-amber-900/50 hover:bg-amber-200/50 hover:text-amber-900"
              }`}
              title={autoUpdateCodex ? "Tắt tự động duyệt cập nhật CODEX" : "Bật tự động duyệt cập nhật CODEX"}
            >
              <span className="font-bold">AUTO</span>
              <span className={`w-1.5 h-1.5 rounded-full ${autoUpdateCodex ? 'bg-green-300 animate-pulse' : 'bg-slate-400'}`} />
            </button>

            <button 
              onClick={onClose} 
              className={`px-3 md:px-4 py-2 rounded-lg cursor-pointer transition-colors font-bold text-xs md:text-sm ${
                isDark 
                  ? 'bg-white/5 hover:bg-white/10 text-white/80' 
                  : 'bg-amber-700 hover:bg-amber-800 text-white shadow-md'
              }`}
            >
              ĐÓNG
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs Row */}
        <div className={`px-4 py-3 shrink-0 overflow-x-auto no-scrollbar border-b ${
          isDark ? 'border-white/5' : 'border-amber-200 bg-[#FAF7F0]'
        }`}>
          <div className={`flex p-1 rounded-xl w-fit ${
            isDark ? 'bg-white/5 border border-white/10' : 'bg-amber-100 border border-amber-200 shadow-inner'
          }`}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as CreationTab)}
                   className={`px-3 md:px-5 py-2 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold flex items-center gap-2 transition-all relative cursor-pointer whitespace-nowrap shrink-0 ${
                     isActive 
                       ? (isDark ? 'text-amber-400' : 'text-blue-605') 
                       : (isDark ? 'text-white/40 hover:text-white/70' : 'text-[#5C4033]/70 hover:text-[#3E2723]')
                   }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-codex-tab"
                      className={`absolute inset-0 rounded-lg md:rounded-xl shadow-xs ${
                        isDark ? 'bg-white/20 border border-white/10 shadow-white/5' : 'bg-[#FFFDFB] border border-amber-150'
                      }`}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon className="w-3 md:w-4 h-3 md:h-4 z-10" />
                  <span className="z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar relative">
           <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-12"
            >
              {activeTab === 'world' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    <section className="space-y-4 lg:col-span-3">
                      <CharacterTextArea label="TÊN THẾ GIỚI" value={worldData.name} onChange={(val) => setWorldData({...worldData, name: val})} placeholder="Nhập tên vùng đất..." variant="title" />
                    </section>
                    <section className="space-y-4 lg:col-span-3 border border-amber-200/50 dark:border-white/10 rounded-2xl p-6 bg-[#FFFDF9]/40 dark:bg-white/5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-amber-100 dark:border-white/5 pb-2 mb-4">
                        <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                          Ý TƯỞNG THẾ GIỚI
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          WORLD CONCEPT
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CharacterTextArea 
                          label="Ý TƯỞNG SƠ KHAI" 
                          value={gameData.initialIdea || ''} 
                          onChange={(val) => setGameData({...gameData, initialIdea: val})} 
                          placeholder="Ý tưởng ban đầu..." 
                        />
                        <CharacterTextArea 
                          label="Ý TƯỞNG PHÁT TRIỂN (AI)" 
                          value={gameData.developedIdea || ''} 
                          onChange={(val) => setGameData({...gameData, developedIdea: val})} 
                          placeholder="Ý tưởng sau khi được AI phát triển..." 
                        />
                      </div>
                    </section>
                    <section className="space-y-4 lg:col-span-3 border border-amber-200/50 dark:border-white/10 rounded-2xl p-6 bg-[#FFFDF9]/40 dark:bg-white/5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-amber-100 dark:border-white/5 pb-2 mb-4">
                        <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                          ĐỘ KHÓ TRÒ CHƠI (DIFFICULTY)
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          DIFFICULTY SYSTEM
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CharacterTextArea 
                          label="SFW (AN TOÀN / THÔNG THƯỜNG / CHIẾN ĐẤU)" 
                          value={
                            typeof worldData.difficulty === 'object' && worldData.difficulty !== null
                              ? (worldData.difficulty.sfw || '')
                              : (typeof worldData.difficulty === 'string' ? worldData.difficulty : '')
                          } 
                          onChange={(val) => {
                            const currentDiff = typeof worldData.difficulty === 'object' && worldData.difficulty !== null
                              ? worldData.difficulty
                              : { sfw: typeof worldData.difficulty === 'string' ? worldData.difficulty : '', nsfw: '' };
                            setWorldData({
                              ...worldData,
                              difficulty: {
                                ...currentDiff,
                                sfw: val
                              }
                            });
                          }} 
                          placeholder="Quyết định mức độ khắc nghiệt trong các hoạt động thông thường, sinh tồn, tài nguyên, quái vật và chiến đấu..." 
                        />
                        <CharacterTextArea 
                          label="NSFW (NHẠY CẢM / TÌNH ÁI / CÁM DỖ)" 
                          value={
                            typeof worldData.difficulty === 'object' && worldData.difficulty !== null
                              ? (worldData.difficulty.nsfw || '')
                              : ''
                          } 
                          onChange={(val) => {
                            const currentDiff = typeof worldData.difficulty === 'object' && worldData.difficulty !== null
                              ? worldData.difficulty
                              : { sfw: typeof worldData.difficulty === 'string' ? worldData.difficulty : '', nsfw: '' };
                            setWorldData({
                              ...worldData,
                              difficulty: {
                                ...currentDiff,
                                nsfw: val
                              }
                            });
                          }} 
                          placeholder="Quyết định mức độ cám dỗ, sự bạo dạn hoặc kiềm chế/giữ mình của các NPC..." 
                        />
                      </div>

                      {/* Hướng dẫn định nghĩa độ khó cụ thể */}
                      <div className="mt-4 pt-4 border-t border-dashed border-amber-200/40 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowDifficultyGuide(!showDifficultyGuide)}
                          className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            isDark
                              ? "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                        >
                          <Zap size={13} className={showDifficultyGuide ? "animate-pulse" : ""} />
                          {showDifficultyGuide ? "Ẩn Bảng Hướng Dẫn Độ Khó" : "Xem Hướng Dẫn & Định Nghĩa Độ Khó Chuẩn"}
                        </button>

                        <AnimatePresence>
                          {showDifficultyGuide && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-3"
                            >
                              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 rounded-xl text-xs leading-relaxed ${
                                isDark ? "bg-white/5 border border-white/5 text-slate-300" : "bg-amber-50/50 border border-amber-100 text-[#5C4033]"
                              }`}>
                                {/* SFW Guide */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b pb-1">
                                    <Sword size={12} />
                                    <span>HỆ THỐNG ĐỘ KHÓ SFW (HÀNH ĐỘNG/SINH TỒN)</span>
                                  </div>
                                  <div className="space-y-2.5">
                                    <div>
                                      <span className="font-extrabold text-green-600 dark:text-green-400">● Dễ (Easy):</span> Tài nguyên dồi dào, quái vật yếu, thế giới hiền hòa. Tỉ lệ thành công mặc định cao (<span className="font-mono">80% - 90%</span>). Phù hợp trải nghiệm cốt truyện thuần túy, thư giãn.
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-amber-600 dark:text-amber-400">● Thường (Normal):</span> Thử thách cân bằng, tài nguyên vừa đủ, kẻ địch có chiến thuật. Tỉ lệ thành công trung bình (<span className="font-mono">50% - 70%</span>). Có rủi ro nhưng hoàn toàn kiểm soát được.
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-orange-600 dark:text-orange-400">● Khó (Hard):</span> Môi trường khắc nghiệt, quái vật nguy hiểm, tài nguyên khan hiếm. Tỉ lệ thành công thấp (<span className="font-mono">30% - 50%</span>). Các lựa chọn sai lầm dễ dẫn đến chấn thương hoặc tổn thất nặng.
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-red-600 dark:text-red-400">● Tàn Khốc (Nightmare):</span> Sinh tồn cực hạn, tài nguyên cạn kiệt, quái vật tàn bạo xảo quyệt. Tỉ lệ thành công cực thấp (<span className="font-mono">10% - 20%</span>). Sơ sẩy nhỏ có thể dẫn tới cái chết hoặc thảm họa không thể cứu vãn.
                                    </div>
                                  </div>
                                </div>

                                {/* NSFW Guide */}
                                <div className="space-y-3">
                                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 border-b pb-1">
                                    <Sparkles size={12} />
                                    <span>HỆ THỐNG ĐỘ KHÓ NSFW (TÌNH ÁI/CÁM DỖ)</span>
                                  </div>
                                  <div className="space-y-2.5">
                                    <div>
                                      <span className="font-extrabold text-blue-500 dark:text-blue-300">● Trong Sáng (Pure):</span> NPC vô cùng nghiêm túc, giữ kẽ, kiêu hãnh. Nghiêm cấm mọi hành vi "dâm hóa" vô cớ. Tỉ lệ phát sinh hoặc đồng thuận cảnh thân mật cực thấp, đòi hỏi mực độ tình cảm tối thượng.
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-indigo-500 dark:text-indigo-300">● Lãng Mạn (Romantic):</span> Thân mật và tình dục diễn ra tự nhiên, sâu sắc, chậm rãi. Đòi hỏi bồi đắp lòng tin và trải qua các biến cố tình cảm chân thành. NPC đồng thuận dựa trên mức độ gắn kết thực tế.
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-pink-500 dark:text-pink-300">● Cám Dỗ (Seductive):</span> NPC bạo dạn, quyến rũ, chủ động bộc lộ ham muốn hoặc thả thính. Ranh giới đạo đức lỏng lẻo hơn. Tỉ lệ đồng thuận các tương tác nhạy cảm cao, nhiều cơ hội trải nghiệm các khoảnh khắc kích thích.
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-red-500 dark:text-red-300">● Hỗn Loạn (Chaos):</span> Ham muốn hoang dã đánh bại mọi lý trí và ranh giới đạo đức. NPC cực kỳ cởi mở, khát khao tình ái cuồng nhiệt, sẵn sàng chủ động dẫn dụ, lôi kéo hoặc chấp nhận nhanh chóng mọi đề nghị thân mật tột đỉnh.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="BỐI CẢNH" value={worldData.background} onChange={(val) => setWorldData({...worldData, background: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="MỐC THỜI GIAN MỞ ĐẦU" value={worldData.starterTimeline} onChange={(val) => setWorldData({...worldData, starterTimeline: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="KỊCH BẢN MỞ ĐẦU" value={worldData.starterScenario} onChange={(val) => setWorldData({...worldData, starterScenario: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="QUY TẮC THẾ GIỚI (LUẬT LỆ, CẤM KỴ, QUY LUẬT VẬN HÀNH)" value={worldData.worldRules} onChange={(val) => setWorldData({...worldData, worldRules: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="QUY TẮC ĐẶT TÊN (NAMING CONVENTIONS)" value={worldData.namingConventions} onChange={(val) => setWorldData({...worldData, namingConventions: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterInput label="THỂ LOẠI (GENRE)" value={worldData.genre} onChange={(val) => setWorldData({...worldData, genre: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterInput label="ÂM HƯỞNG CHỦ ĐẠO (MAIN MOOD & AESTHETIC)" value={worldData.mainMood} onChange={(val) => setWorldData({...worldData, mainMood: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterInput label="NHỊP ĐỘ (PACING)" value={worldData.pacing} onChange={(val) => setWorldData({...worldData, pacing: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="ĐỊA LÝ & VÙNG LÃNH THỔ" value={worldData.geography} onChange={(val) => setWorldData({...worldData, geography: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="LỊCH SỬ THẾ GIỚI" value={worldData.worldHistory} onChange={(val) => setWorldData({...worldData, worldHistory: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="VĂN HÓA & PHONG TỤC" value={worldData.culture} onChange={(val) => setWorldData({...worldData, culture: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="KINH TẾ & XÃ HỘI" value={worldData.economy} onChange={(val) => setWorldData({...worldData, economy: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="TÔN GIÁO & TÍN NGƯỠNG" value={worldData.religion} onChange={(val) => setWorldData({...worldData, religion: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="CÁC QUỐC GIA & THẾ LỰC" value={worldData.factions} onChange={(val) => setWorldData({...worldData, factions: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="MỐI QUAN HỆ GIỮA CÁC THẾ LỰC" value={worldData.factionRelations} onChange={(val) => setWorldData({...worldData, factionRelations: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="CÁC YẾU TỐ ĐỘC ĐÁO" value={worldData.uniqueElements} onChange={(val) => setWorldData({...worldData, uniqueElements: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="HỆ THỐNG SỨC MẠNH / LOGIC / ĐIỂM PHÂN BẬC" value={worldData.powerSystem} onChange={(val) => setWorldData({...worldData, powerSystem: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="KIỂM SOÁT LOGIC & CÁC YẾU TỐ LOẠI TRỪ" value={worldData.logicControl} onChange={(val) => setWorldData({...worldData, logicControl: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterTextArea label="VĂN PHONG" value={worldData.writingStyle} onChange={(val) => setWorldData({...worldData, writingStyle: val})} />
                    </section>
                    <section className="space-y-4">
                      <CharacterInput label="NGÔI KỂ" value={worldData.narrativePerspective} onChange={(val) => setWorldData({...worldData, narrativePerspective: val})} />
                    </section>
                  </div>
              )}

              {activeTab === 'items' && (
                <div className="flex flex-col w-full h-full gap-8">
                     <section className="space-y-4">
                        <LocationArrayEditor
                          label="CÁC ĐỊA ĐIỂM (LOCATIONS)"
                          items={worldDetails.locations || []}
                          onChange={(val) => setWorldDetails({ ...worldDetails, locations: val })}
                        />
                     </section>
                     <section className="space-y-4 flex-1 flex flex-col opacity-50">
                        <CharacterTextArea 
                          label="GHI CHÚ ĐỊA ĐIỂM KHÁC (Legacy)" 
                          value={worldDetails.places} 
                          onChange={(val) => setWorldDetails({...worldDetails, places: val})} 
                          placeholder="Mô tả chi tiết các phòng ban, khu vực nhỏ lẻ, môi trường, và địa hình cụ thể..."
                          rows={10}
                        />
                     </section>
                </div>
              )}

              {activeTab === 'creative' && (
                <div className="w-full h-full min-h-[500px] flex flex-col">
                  <section className="flex-1 space-y-4 flex flex-col">
                    <CharacterTextArea 
                      label="QUY TẮC & SÁNG TẠO DO NGƯỜI CHƠI TỰ ĐIỀN (AI SẼ THEO DÕI & ÁP DỤNG)" 
                      value={gameData.creativeRules || ''} 
                      onChange={(val) => setGameData({...gameData, creativeRules: val})} 
                      placeholder="Nhập bất kỳ quy tắc, kịch bản, hay lưu ý nào mà bạn muốn AI luôn phải tuân theo trong thế giới này..."
                      rows={20}
                    />
                  </section>
                </div>
              )}

              {activeTab === 'worldState' && (
                <div className="w-full h-full min-h-[500px] flex flex-col">
                  <section className="flex-1 space-y-4 flex flex-col">
                    <CharacterTextArea 
                      label="BẢNG TRẠNG THÁI THẾ GIỚI" 
                      value={gameData.worldData?.worldState || ''} 
                      onChange={(val) => setWorldData({...worldData, worldState: val})} 
                      placeholder="Nơi AI ghi nhận toàn bộ các trạng thái mới của thế giới kèm theo ngày tháng năm trong game..."
                      rows={20}
                    />
                  </section>
                </div>
              )}

              {activeTab === 'leaderboards' && (
                <div className="w-full h-full min-h-[500px] flex flex-col">
                  <section className="flex-1 space-y-4 flex flex-col">
                    <CharacterTextArea 
                      label="BẢNG XẾP HẠNG" 
                      value={gameData.worldData?.leaderboards || ''} 
                      onChange={(val) => setWorldData({...worldData, leaderboards: val})} 
                      placeholder="Nơi AI cập nhật các bảng xếp hạng có trong thế giới game (dạng phẳng dễ xem trên mobile, 10-20 thứ hạng hoặc hơn)..."
                      rows={20}
                    />
                  </section>
                </div>
              )}

              {activeTab === 'scenario' && (
                <div className="w-full h-full min-h-[500px] flex flex-col">
                  <section className="flex-1 space-y-4 flex flex-col">
                    <CharacterTextArea 
                      label="KỊCH BẢN CHÍNH & TUYẾN DIỄN BIẾN TIẾP THEO (AI CHỦ ĐỘNG PHÁT TRIỂN & CẤU TRÚC)" 
                      value={worldData.mainScenario || ''} 
                      onChange={(val) => setWorldData({...worldData, mainScenario: val})} 
                      placeholder="Bản thiết kế cốt truyện tổng thể và các nhánh diễn biến tiếp theo của câu chuyện (nối tiếp kịch bản khởi đầu). AI sẽ sáng tạo sẵn các chương/hồi, biến cố chính, các đầu mối bí ẩn và những nhánh lựa chọn tiềm năng để tuyến truyện luôn sâu sắc và sẵn sàng cho các lượt chơi..."
                      rows={20}
                    />
                  </section>
                </div>
              )}
            </motion.div>
           </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {showConfirmUpdateModal && (
          <CodexUpdateModal onClose={() => setShowConfirmUpdateModal(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
