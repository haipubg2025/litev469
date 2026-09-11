import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, Check, Power, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from '../utils/toast';

interface DramaModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: any;
}

export default function DramaModal({ isOpen, onClose, theme }: DramaModalProps) {
  const isDramaticEnabled = useStore(state => state.isDramaticEnabled);
  const setIsDramaticEnabled = useStore(state => state.setIsDramaticEnabled);
  const dramaPrompt = useStore(state => state.dramaPrompt || "");
  const setDramaPrompt = useStore(state => state.setDramaPrompt);
  const dramaChance = useStore(state => state.dramaChance ?? 50);
  const setDramaChance = useStore(state => state.setDramaChance);
  
  const isDark = theme.group === 'Dark';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-0 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`w-full h-full flex flex-col shadow-2xl relative ${isDark ? 'bg-[#111] text-white' : 'bg-white text-slate-900'}`}
          >
            {/* Header */}
            <div className={`shrink-0 px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDramaticEnabled ? 'bg-red-500/20 text-red-500' : isDark ? 'bg-white/10 text-white/50' : 'bg-black/5 text-slate-500'}`}>
                  <Flame size={24} className={isDramaticEnabled ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-wide">CÀI ĐẶT KỊCH TÍNH (DRAMA)</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Probability & Status Input */}
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-widest opacity-70 flex items-center justify-between">
                  <span>TỈ LỆ DRAMA XUẤT HIỆN (%)</span>
                </label>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={dramaChance}
                    onChange={(e) => {
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 0;
                      if (val < 0) val = 0;
                      if (val > 100) val = 100;
                      setDramaChance(val);
                      if (val === 0) {
                        setIsDramaticEnabled(false);
                      }
                    }}
                    className={`w-full sm:w-32 p-4 rounded-xl font-bold border outline-none text-center text-lg ${
                      isDark
                        ? 'bg-black/50 border-white/10 text-white focus:border-red-500/50'
                        : `${theme.bgClass} border-black/10 ${theme.textPrimary} focus:border-red-500/50`
                    }`}
                  />
                  
                  <button 
                    onClick={() => {
                        if (dramaChance === 0) {
                            toast.error("Vui lòng đặt tỉ lệ lớn hơn 0 để tung xúc xắc!");
                            return;
                        }
                        let dividingLine = 100 - dramaChance;
                        let roll = 0;
                        while(true) {
                            roll = Math.floor(Math.random() * 100) + 1;
                            if (roll === dividingLine) continue;
                            break;
                        }
                        const isDrama = roll > dividingLine;
                        setIsDramaticEnabled(isDrama);
                        if (isDrama) {
                            toast.success(`🎲 Xúc xắc ra: [${roll}]. (Số lớn > mốc ${dividingLine}) -> Kịch tính ĐÃ BẬT!`);
                        } else {
                            toast.error(`🎲 Xúc xắc ra: [${roll}]. (Số nhỏ < mốc ${dividingLine}) -> Kịch tính ĐÃ TẮT!`);
                        }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all text-sm ${
                      isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-slate-700'
                    }`}>
                    🎲 TUNG XÚC XẮC
                  </button>
                  
                  <div className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all text-sm ${
                      isDramaticEnabled 
                        ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' 
                        : isDark ? 'bg-white/10 text-white/50' : 'bg-black/5 text-slate-500'
                    }`}>
                    <Power size={18} />
                    {isDramaticEnabled ? "TRẠNG THÁI: BẬT" : "TRẠNG THÁI: TẮT"}
                  </div>
                </div>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'} leading-relaxed`}>
                  Hệ thống sẽ dựa vào tỉ lệ phần trăm này để tự động tung xúc xắc quyết định <b>Bật</b> hay <b>Tắt</b> Drama ở cuối mỗi lượt. 
                  Bạn cũng có thể tự bấm nút Tung xúc xắc ở trên để thử vận may ngay bây giờ. Đặt <b>0</b> để tắt hoàn toàn tính năng này.
                </p>
              </div>

              {/* Prompt Input */}
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-widest opacity-70 flex items-center justify-between">
                  <span>GỢI Ý KỊCH TÍNH CỦA BẠN</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>Tùy chọn</span>
                </label>
                <textarea
                  value={dramaPrompt}
                  onChange={(e) => setDramaPrompt(e.target.value)}
                  placeholder="Ví dụ: Đột nhiên có một sát thủ áo đen xông vào ám sát MC... hoặc Tông môn đột ngột bị tập kích..."
                  className={`w-full min-h-[250px] p-4 rounded-xl resize-none outline-none custom-scrollbar transition-colors border ${
                    isDark 
                      ? 'bg-black/50 border-white/10 text-white placeholder:text-white/30 focus:border-red-500/50 focus:bg-black/80' 
                      : `${theme.bgClass} border-black/10 ${theme.textPrimary} placeholder:text-slate-400 focus:border-red-500/50`
                  }`}
                />
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                  Nhập bất cứ kịch bản, ý tưởng hay gợi ý nào. Mọi thông tin ở đây sẽ được lưu trữ vào tệp lưu game. F5 không mất.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
