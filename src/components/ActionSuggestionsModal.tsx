import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles } from "lucide-react";
import { useStore } from "../store/useStore";

export default function ActionSuggestionsModal({
  isOpen,
  onClose,
  theme,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: any;
}) {
  const isDark = theme.group === "Dark";
  const actionSuggestionsConfig = useStore((state) => state.actionSuggestionsConfig);
  const setActionSuggestionsConfig = useStore((state) => state.setActionSuggestionsConfig);
  
  const [localConfig, setLocalConfig] = useState(actionSuggestionsConfig || "");

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(actionSuggestionsConfig || "");
    }
  }, [isOpen, actionSuggestionsConfig]);

  if (!isOpen) return null;

  const handleClose = () => {
    setActionSuggestionsConfig(localConfig);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm`}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl ${
            isDark
              ? "theme-panel border border-white/10"
              : "bg-white border border-slate-200 rounded-2xl"
          }`}
          style={{ borderRadius: "1.25rem" }}
        >
          <div
            className={`flex items-center justify-between p-4 border-b ${
              isDark ? "border-white/10" : "border-slate-100"
            }`}
          >
            <h2
              className={`text-lg font-bold flex items-center gap-2 ${
                isDark ? "text-white" : "text-slate-800"
              }`}
            >
              <Sparkles size={20} className="text-blue-500" />
              Cài đặt Gợi ý Hành động
            </h2>
            <button
              onClick={handleClose}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isDark
                  ? "hover:bg-white/10 text-slate-400 hover:text-white"
                  : "hover:bg-slate-100 text-slate-500"
              }`}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            <textarea
              value={localConfig}
              onChange={(e) => setLocalConfig(e.target.value)}
              placeholder=""
              className={`w-full h-40 p-4 rounded-xl outline-none transition-colors resize-none ${
                isDark
                  ? "bg-black/40 border border-white/10 text-white focus:border-blue-500/50"
                  : `${theme.bgClass} border border-black/10 ${theme.textPrimary} focus:border-blue-500 focus:ring-1 focus:ring-blue-500`
              }`}
            />
            <div
              className={`text-sm space-y-2 leading-relaxed ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <p>
                Nhập ý tưởng hoặc yêu cầu của bạn về phần Gợi ý hành động do AI tạo ra ở cuối mỗi lượt.
                Bạn có thể yêu cầu số lượng hành động, phong cách gợi ý, hoặc những lựa chọn cụ thể mà bạn muốn AI đưa ra.
              </p>
              <p className={`text-xs italic ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Ví dụ: Tạo chính xác 4 gợi ý hành động, trong đó có 2 hành động liên quan đến việc khám phá, 1 hành động trò chuyện, 1 hành động tấn công...
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

