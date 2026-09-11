import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Target, Tag, Plus, Settings, Check } from 'lucide-react';

interface PartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameData: any;
  setGameData: (data: any) => void;
  theme: any;
}

const PRESET_TAG_LISTS = {
  'Mặc định': ['Family', 'Vợ', 'Harem', 'Bạn Tình', 'Đồng Đội', 'Bạn Bè', 'Người Quen', 'Chủ Nhân', 'Cấp Dưới', 'Thuộc Hạ', 'Kẻ Thù', 'Lạ Mặt'],
  'Tình Cảm / Romance': ['Chính Thất', 'Vợ Lẽ', 'Bạn Tình', 'Mập Mờ', 'Thanh Mai Trúc Mã', 'Tình Đầu', 'Đơn Phương', 'Hồng Nhan Kỷ', 'Sugar Baby', 'Sugar Daddy'],
  'Fantasy / RPG': ['Tổ Đội', 'Bang Hội', 'Đồng Hành', 'Sư Phụ', 'Học Đồ', 'Triệu Hồi Thú', 'Thú Cưng', 'Pháp Sư', 'Hiệp Sĩ', 'NPC Nhiệm Vụ', 'Kẻ Thù', 'Boss'],
  'Tu Tiên / Cổ Trang': ['Đạo Lữ', 'Đỉnh Lô', 'Song Tu', 'Sư Tôn', 'Đồ Đệ', 'Đồng Môn', 'Tông Môn', 'Trưởng Lão', 'Linh Thú', 'Kẻ Thù', 'Thù Địch'],
  'Hiện Đại / Đô Thị': ['Người Yêu', 'Crush', 'Gia Đình', 'Bạn Thân', 'Hàng Xóm', 'Đồng Nghiệp', 'Sếp', 'Nhân Viên', 'Đối Tác', 'Kình Địch', 'Kẻ Thù'],
  'Học Đường / School': ['Hội Trưởng', 'Lớp Trưởng', 'Bạn Cùng Lớp', 'Bạn Cùng Bàn', 'Tiền Bối', 'Hậu Bối', 'Giáo Viên', 'Lưu Manh', 'Kẻ Bắt Nạt'],
  'Mafia / Ngầm': ['Ông Trùm', 'Boss', 'Sát Thủ', 'Bảo Kê', 'Nội Gián', 'Tay Sai', 'Cảnh Sát', 'Đặc Vụ', 'Con Tin'],
  'Viễn Tưởng / Sci-Fi': ['AI', 'Cyborg', 'Người Ngoài Hành Tinh', 'Chỉ Huy', 'Phi Hành Đoàn', 'Nhà Khoa Học', 'Mẫu Vật', 'Hải Tặc Vũ Trụ'],
  'Kinh Dị / Sinh Tồn': ['Kẻ Sinh Tồn', 'Zombie', 'Quái Vật', 'Kẻ Khát Máu', 'Kẻ Tâm Thần', 'Kẻ Phản Bội', 'Mồi Nhử', 'Đồng Đội'],
  'Cung Đấu / Hoàng Gia': ['Hoàng Đế', 'Hoàng Hậu', 'Phi Tần', 'Thái Tử', 'Vương Gia', 'Ám Vệ', 'Thái Giám', 'Cung Nữ', 'Gian Thần'],
};
const DEFAULT_TAGS = PRESET_TAG_LISTS['Mặc định'];

export default function PartyModal({ isOpen, onClose, gameData, setGameData, theme }: PartyModalProps) {
  const [activeTab, setActiveTab] = useState<'party' | 'objectives'>('party');
  const [objectives, setObjectives] = useState('');
  const [npcTags, setNpcTags] = useState<Record<string, string[]>>({});
  const [expandedTagListFor, setExpandedTagListFor] = useState<string | null>(null);
  
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isTagSettingsOpen, setIsTagSettingsOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    if (isOpen && gameData) {
      setObjectives(gameData.mcData?.objectives || '');
      setNpcTags(gameData.partyTags || {});
      setCustomTags(gameData.customPartyTags || DEFAULT_TAGS);
    }
  }, [isOpen, gameData]);

  const saveToGameData = (newTags: Record<string, string[]>, newObjectives: string, newCustomTags: string[]) => {
    const npcs = gameData?.npcs || [];
    let formattedPartyList = "DANH SÁCH TỔ ĐỘI / GIA ĐÌNH / QUAN HỆ ĐẶC BIỆT:\n";
    
    let hasTagged = false;
    const tagsToIterate = newCustomTags && newCustomTags.length > 0 ? newCustomTags : DEFAULT_TAGS;

    tagsToIterate.forEach(tag => {
      const npcsWithTag = npcs.filter((n: any) => {
        const npcId = n.id || n.name || n.fullName;
        return newTags[npcId]?.includes(tag);
      });
      if (npcsWithTag.length > 0) {
        hasTagged = true;
        formattedPartyList += `\n[ ${tag.toUpperCase()} ]\n`;
        npcsWithTag.forEach((npc: any) => {
          formattedPartyList += `- ${npc.name || npc.fullName} (Vai trò: ${npc.role || 'Không rõ'}) - Vị trí hiện tại: ${npc.location || 'Chưa rõ'}\n`;
        });
      }
    });

    if (!hasTagged) {
      formattedPartyList = "Chưa có ai trong tổ đội/gia đình.";
    }

    setGameData((prev: any) => ({
      ...prev,
      partyTags: newTags,
      customPartyTags: newCustomTags,
      mcData: {
        ...(prev?.mcData || {}),
        partyList: formattedPartyList,
        objectives: newObjectives
      }
    }));
  };

  const isDark = theme.group === 'Dark';
  const npcs = gameData?.npcs || [];

  const sortedNpcs = [...npcs].sort((a: any, b: any) => {
    const idA = a.id || a.name || a.fullName;
    const idB = b.id || b.name || b.fullName;
    const tagsA = npcTags[idA] || [];
    const tagsB = npcTags[idB] || [];
    
    if (tagsA.length > 0 && tagsB.length === 0) return -1;
    if (tagsA.length === 0 && tagsB.length > 0) return 1;
    return (a.name || a.fullName || '').localeCompare(b.name || b.fullName || '');
  });

  const handleTagToggle = (npcIdentifier: string, tag: string) => {
    const newTags = { ...npcTags };
    if (!newTags[npcIdentifier]) {
      newTags[npcIdentifier] = [];
    }
    
    if (newTags[npcIdentifier].includes(tag)) {
      newTags[npcIdentifier] = newTags[npcIdentifier].filter(t => t !== tag);
    } else {
      newTags[npcIdentifier] = [...newTags[npcIdentifier], tag];
    }
    
    setNpcTags(newTags);
  };

  const handleObjectivesChange = (val: string) => {
    setObjectives(val);
  };

  const handleClose = () => {
    saveToGameData(npcTags, objectives, customTags);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`w-full h-full flex flex-col overflow-hidden shadow-2xl ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-black/10'}`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10 bg-black/20' : `border-black/10 ${theme.bgClass}`}`}>
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Users className="w-6 h-6 text-indigo-500" />
              PARTY
            </h2>
            <button
              onClick={handleClose}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-black/5 text-slate-500 hover:text-slate-900'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className={`flex border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <button
              onClick={() => setActiveTab('party')}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-semibold transition-colors ${
                activeTab === 'party'
                  ? isDark ? 'bg-white/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  : isDark ? 'text-white/60 hover:bg-white/5' : `${theme.textSecondary} hover:${theme.bgClass}`
              }`}
            >
              <Users className="w-5 h-5" />
              Tổ Đội / Harem
            </button>
            <button
              onClick={() => setActiveTab('objectives')}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-semibold transition-colors border-l ${
                isDark ? 'border-white/10' : 'border-black/10'
              } ${
                activeTab === 'objectives'
                  ? isDark ? 'bg-white/10 text-rose-400' : 'bg-rose-50 text-rose-600'
                  : isDark ? 'text-white/60 hover:bg-white/5' : `${theme.textSecondary} hover:${theme.bgClass}`
              }`}
            >
              <Target className="w-5 h-5" />
              Mục Tiêu Lớn
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'party' ? (
              <div className="h-full flex flex-col gap-4 max-w-5xl mx-auto w-full">
                {!isTagSettingsOpen ? (
                  <>
                    <div className="flex justify-end pr-2">
                      <button 
                        onClick={() => setIsTagSettingsOpen(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                      >
                        <Settings className="w-4 h-4" />
                        Setting TAG
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {sortedNpcs.length === 0 ? (
                        <div className={`text-center py-8 opacity-50 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Chưa có NPC nào trong thế giới.
                        </div>
                      ) : (
                        sortedNpcs.map((npc: any, index: number) => {
                          const npcId = npc.id || npc.name || npc.fullName;
                          const activeTags = npcTags[npcId] || [];
                          const hasTag = activeTags.length > 0;
                          return (
                            <div 
                              key={npcId}
                              className={`p-3 rounded-lg border transition-all ${
                                hasTag 
                                  ? isDark ? 'border-indigo-500/50 bg-indigo-900/20' : 'border-indigo-400 bg-indigo-50/50'
                                  : isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                                <div>
                                  <div className={`font-bold text-lg flex items-center flex-wrap gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border select-all ${
                                      isDark ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                    }`}>
                                      ID: {npc.id || `npc_${index + 1}`}
                                    </span>
                                    {npc.name || npc.fullName}
                                    {activeTags.map(t => (
                                      <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                                        isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                                      }`}>
                                        {t}
                                      </span>
                                    ))}
                                    <button
                                      onClick={() => setExpandedTagListFor(expandedTagListFor === npcId ? null : npcId)}
                                      className={`p-1 rounded-full border border-dashed flex items-center justify-center transition-all ${
                                        expandedTagListFor === npcId
                                          ? isDark ? 'border-rose-500/50 text-rose-400 hover:bg-rose-500/20' : 'border-rose-400 text-rose-600 hover:bg-rose-50'
                                          : isDark ? 'border-white/30 text-white/50 hover:text-white hover:border-white/70' : 'border-slate-400 text-slate-500 hover:text-slate-900 hover:border-slate-600'
                                      }`}
                                      title={expandedTagListFor === npcId ? "Đóng danh sách" : "Thêm Tag"}
                                    >
                                      {expandedTagListFor === npcId ? <X size={14} /> : <Plus size={14} />}
                                    </button>
                                  </div>
                                  <div className={`text-xs mt-1 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                                    <span className="font-semibold">Vai trò:</span> {npc.role || 'Không rõ'} <br/>
                                    <span className="font-semibold">Vị trí:</span> {npc.location || 'Chưa rõ'}
                                  </div>
                                </div>
                              </div>
                              
                              {expandedTagListFor === npcId && (
                                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-dashed border-slate-500/30">
                                  {(customTags && customTags.length > 0 ? customTags : DEFAULT_TAGS).map(tag => {
                                    const isActive = activeTags.includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        onClick={() => handleTagToggle(npcId, tag)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                          isActive
                                            ? isDark 
                                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                                              : 'bg-indigo-500 text-white shadow-md'
                                            : isDark
                                              ? 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                                        }`}
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-500/20">
                      <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Settings className="w-5 h-5 text-indigo-500" />
                        Cài Đặt Tag
                      </h3>
                      <button 
                        onClick={() => setIsTagSettingsOpen(false)}
                        className={`px-4 py-2 flex items-center gap-2 rounded-lg font-bold text-sm transition-all shadow-md ${
                          isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                        }`}
                      >
                        <Check className="w-4 h-4" /> Hoàn Tất
                      </button>
                    </div>

                    <div className="space-y-3">
                      <p className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                        <Tag className="w-4 h-4" /> Các bộ mẫu phổ biến:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(PRESET_TAG_LISTS).map(presetKey => (
                          <button 
                            key={presetKey} 
                            onClick={() => setCustomTags(PRESET_TAG_LISTS[presetKey as keyof typeof PRESET_TAG_LISTS])}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              isDark 
                                ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10' 
                                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm'
                            }`}
                          >
                            {presetKey}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`space-y-4 p-4 rounded-xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                        Danh sách Tag hiện tại (Tùy chỉnh):
                      </p>
                      
                      <div className="flex flex-wrap gap-2 min-h-[60px] content-start">
                        {customTags.length === 0 && (
                          <span className={`text-sm italic ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Chưa có tag nào...</span>
                        )}
                        {customTags.map((tag, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                              isDark 
                                ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30' 
                                : 'bg-white text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {tag}
                            <button 
                              onClick={() => setCustomTags(customTags.filter((_, i) => i !== idx))} 
                              className={`p-0.5 rounded-full transition-colors ${
                                isDark ? 'hover:bg-white/10 hover:text-white text-indigo-300/70' : 'hover:bg-slate-100 hover:text-slate-900 text-indigo-700/70'
                              }`}
                              title="Xóa Tag"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-500/20">
                        <input 
                          value={newTagInput} 
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => { 
                            if (e.key === 'Enter' && newTagInput.trim()) { 
                              if (!customTags.includes(newTagInput.trim())) {
                                setCustomTags([...customTags, newTagInput.trim()]); 
                              }
                              setNewTagInput(''); 
                            } 
                          }}
                          placeholder="Nhập tên tag mới và nhấn Enter..." 
                          className={`flex-1 px-4 py-2.5 rounded-lg border outline-none text-sm transition-all ${
                            isDark 
                              ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500' 
                              : 'bg-white border-slate-300 focus:border-indigo-500'
                          }`}
                        />
                        <button 
                          onClick={() => { 
                            if (newTagInput.trim()) { 
                              if (!customTags.includes(newTagInput.trim())) {
                                setCustomTags([...customTags, newTagInput.trim()]); 
                              }
                              setNewTagInput(''); 
                            } 
                          }}
                          className={`px-4 py-2.5 rounded-lg font-bold flex items-center justify-center transition-all ${
                            isDark 
                              ? 'bg-white/10 hover:bg-white/20 text-white' 
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          }`}
                          title="Thêm"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col gap-2 max-w-5xl mx-auto w-full">
                <textarea
                  value={objectives}
                  onChange={(e) => handleObjectivesChange(e.target.value)}
                  placeholder="Ví dụ:
- Phải tìm ra hung thủ thật sự đằng sau vụ án.
- Thu thập 3 mảnh vỡ của viên đá không gian."
                  className={`flex-1 w-full p-4 rounded-lg resize-none outline-none transition-colors ${
                    isDark 
                      ? 'bg-black/40 border border-white/10 text-white focus:border-rose-500/50' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:border-rose-500'
                  }`}
                />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
