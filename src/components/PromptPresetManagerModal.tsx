import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileText, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

import rehypeRaw from 'rehype-raw';

interface PromptPresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromptPresetManagerModal({ isOpen, onClose }: PromptPresetManagerModalProps) {
  const theme = useStore(state => state.theme);
  const promptPresets = useStore(state => state.promptPresets) || [];
  const addPromptPreset = useStore(state => state.addPromptPreset);
  const removePromptPreset = useStore(state => state.removePromptPreset);
  const togglePromptPreset = useStore(state => state.togglePromptPreset);
  const reorderPromptPresets = useStore(state => state.reorderPromptPresets);
  const isDark = theme.group === 'Dark';
  const updatePromptPreset = useStore(state => state.updatePromptPreset);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handlePromptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let parsedContent = content;
        try {
          if (file.name.endsWith('.json')) {
            const json = JSON.parse(content);
            parsedContent = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
          }
        } catch (e) {}
        
        addPromptPreset({
          id: crypto.randomUUID(),
          name: file.name,
          content: parsedContent,
          isActive: true,
          createdAt: Date.now()
        });
        toast.success(`Đã thêm preset: ${file.name}`);
      } catch (err) {
        toast.error('Lỗi khi tải tệp');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      reorderPromptPresets(index, index - 1);
    }
  };

  const moveDown = (index: number) => {
    if (index < promptPresets.length - 1) {
      reorderPromptPresets(index, index + 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`w-full h-full flex flex-col ${theme.bgClass}`}
          >
            {/* Header */}
            <div className={`shrink-0 flex items-center justify-between p-4 sm:p-6 border-b ${isDark ? 'border-white/10' : 'border-black/5'} bg-black/20 backdrop-blur-md`}>
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>P&P Manager</h2>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-all ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/10 text-black'}`}
              >
                <X size={24} />
              </button>
            </div>

            {/* Toolbar */}
            <div className={`shrink-0 p-4 sm:p-6 flex items-center justify-between border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
              <div className="flex items-center gap-2">
                <label className={`cursor-pointer px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                  isDark ? 'bg-white text-black hover:bg-gray-200 shadow-white/10' : 'bg-black text-white hover:bg-gray-800 shadow-black/10'
                }`}>
                  <Upload size={18} /> Tải Tệp Lên
                  <input type="file" className="hidden" accept=".txt,.json" onChange={handlePromptUpload} />
                </label>
              </div>
              <div className="text-sm font-medium opacity-60">
                {promptPresets.length} tệp đã nạp
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {promptPresets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50">
                  <FileText size={64} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Chưa có preset nào được tải lên.</p>
                  <p className="text-sm">Hãy tải lên một tệp JSON hoặc TXT để bắt đầu.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Using regular mapping with up/down arrows to avoid Reorder syncing issues with Zustand */}
                  {promptPresets.map((preset, index) => {
                    const isExpanded = expandedId === preset.id;
                    return (
                    <motion.div 
                      key={preset.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col p-4 rounded-2xl border transition-all ${
                        isDark 
                          ? 'bg-white/5 border-white/10' 
                          : 'bg-black/5 border-black/5'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="flex items-center gap-4 overflow-hidden mb-4 sm:mb-0 flex-1">
                          <FileText className={`w-8 h-8 shrink-0 ${preset.isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-bold text-lg truncate ${theme.textPrimary}`}>{preset.name}</h3>
                            <p className={`text-xs truncate ${theme.textSecondary}`}>
                              Nguyên bản • ID: {preset.id}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center shrink-0 ml-12 sm:ml-4">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : preset.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                              isExpanded 
                                ? 'bg-blue-500/10 text-blue-500' 
                                : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-black hover:bg-black/10'
                            }`}
                          >
                            {isExpanded ? 'Đóng Chi Tiết' : 'Chi Tiết'}
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                              {/* Actions Bar inside details */}
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => moveUp(index)} disabled={index === 0} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-30' : 'bg-black/10 hover:bg-black/20 text-black disabled:opacity-30'}`}>
                                    ▲ Lên
                                  </button>
                                  <button onClick={() => moveDown(index)} disabled={index === promptPresets.length - 1} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white disabled:opacity-30' : 'bg-black/10 hover:bg-black/20 text-black disabled:opacity-30'}`}>
                                    ▼ Xuống
                                  </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => togglePromptPreset(preset.id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                      preset.isActive
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600'
                                        : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-black/10 text-gray-600 hover:bg-black/20'
                                    }`}
                                  >
                                    Trạng thái: {preset.isActive ? 'BẬT (ON)' : 'TẮT (OFF)'}
                                  </button>
                                  <button
                                    onClick={() => removePromptPreset(preset.id)}
                                    className={`p-2.5 rounded-xl transition-all ${
                                      isDark ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-red-600 bg-red-500/10 hover:bg-red-500/20'
                                    }`}
                                    title="Xóa tệp"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>

                              {/* Content Viewer */}
                              <div className={`p-4 rounded-xl text-sm font-mono overflow-y-auto max-h-[400px] ${isDark ? 'bg-black/40 text-gray-300' : 'bg-white/60 text-gray-700'} border ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                                <pre className="whitespace-pre-wrap font-mono text-xs opacity-70">
                                  {preset.content}
                                </pre>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );})}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
