import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Maximize2, Minimize2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SysLogViewer } from './SysLogViewer';

export default function SystemLogPanel() {
  const theme = useStore((state) => state.theme);
  const setSystemLogs = useStore((state) => state.setSystemLogs);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  const handleScrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  return (
    <>
      <div className={`flex flex-col rounded-xl overflow-hidden shadow-sm transition-all duration-500 border ${theme.group === 'Dark' ? 'border-white/10' : 'border-black/10'}`}>
        <div
          className={`p-3 border-b flex justify-between items-center shrink-0 ${theme.group === "Dark" ? "theme-panel !border-l-0 !border-r-0 !border-t-0" : "border-black/10 bg-white/60"}`}
        >
          <div className="flex items-center gap-2">
            <h4
              className={`text-[10px] font-black uppercase tracking-widest ${theme.group === "Dark" ? "text-red-400" : "text-red-700"}`}
            >
              Nhật Ký Hệ Thống (SYS LOGS)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setSystemLogs([]); }}
              className={`p-1 rounded transition-colors ${theme.group === "Dark" ? "text-white/50 hover:text-white hover:bg-white/10" : "text-[#334155] hover:text-[#0f172a] hover:bg-black/5"}`}
              title="Xóa nhật ký"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={() => setIsExpanded(true)}
              className={`p-1 rounded transition-colors ${theme.group === "Dark" ? "text-white/50 hover:text-white hover:bg-white/10" : "text-[#334155] hover:text-[#0f172a] hover:bg-black/5"}`}
            >
              <Maximize2 size={12} />
            </button>
          </div>
        </div>
        <SysLogViewer theme={theme} isExpanded={false} />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full h-full flex flex-col overflow-hidden shadow-2xl ${theme.group === "Dark" ? "bg-slate-900/95" : "bg-white/95"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <h4
                    className={`text-sm font-black uppercase tracking-widest text-red-400`}
                  >
                    Nhật Ký Hệ Thống (SYS LOGS)
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSystemLogs([]); setIsExpanded(false); }}
                    className="p-2 theme-panel-hover rounded-lg transition-colors text-red-500 hover:text-red-400"
                    title="Xóa nhật ký"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={handleScrollToTop}
                    className="p-2 theme-panel-hover rounded-lg transition-colors text-slate-600 dark:text-white/70 hover:text-black dark:hover:text-white"
                    title="Cuộn lên trên"
                  >
                    <Minimize2 size={20} className="rotate-180" />
                  </button>
                  <button
                    onClick={handleScrollToBottom}
                    className="p-2 theme-panel-hover rounded-lg transition-colors text-slate-600 dark:text-white/70 hover:text-black dark:hover:text-white"
                    title="Cuộn xuống dưới"
                  >
                    <Minimize2 size={20} />
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 theme-panel-hover rounded-lg transition-colors text-slate-600 dark:text-white/70 hover:text-black dark:hover:text-white"
                    title="Đóng lại"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div
                ref={scrollRef}
                className={`flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar ${theme.group === "Dark" ? "theme-panel !border-none" : theme.bgClass}`}
              >
                <SysLogViewer theme={theme} isExpanded={true} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
