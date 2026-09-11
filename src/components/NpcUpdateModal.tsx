import React from 'react';
import { motion } from 'motion/react';
import { X, Check, ArrowUpToLine, ArrowDownToLine, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getActiveCustomFields } from '../utils/conditionalFields';
import { stripHtmlTags } from '../utils/htmlSanitizer';
import { toast } from '../utils/toast';

function diffWords(oldStr: string, newStr: string): { value: string; added?: boolean; removed?: boolean }[] {
  const s1 = oldStr || '';
  const s2 = newStr || '';
  
  if (s1 === s2) {
    return [{ value: s1 }];
  }

  // Nếu là câu văn dài (chứa dấu chấm câu kết thúc và độ dài tương đối), so sánh cấp độ câu
  const hasSentenceStructure = /[.!?]/.test(s2) && s2.length > 35;
  if (hasSentenceStructure) {
    // Tách s2 thành các phần bao gồm câu và dấu câu / khoảng trắng kèm theo
    const sentences2 = s2.split(/([.!?]+(?:\s+|\n+|$))/g).filter(Boolean);
    
    // Chuẩn hóa danh sách câu từ s1 để tra cứu nhanh
    const cleanOldSentences = s1
      .split(/[.!?]+|\n/g)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const result: { value: string; added?: boolean; removed?: boolean }[] = [];
    
    for (const part of sentences2) {
      const trimmed = part.trim();
      // Nếu không chứa bất kỳ chữ cái hay chữ số nào (chỉ là khoảng trắng, dấu chấm...)
      if (!/[a-zA-Z0-9\p{L}]/u.test(trimmed)) {
        result.push({ value: part });
        continue;
      }

      const cleanPart = trimmed.toLowerCase();
      // Kiểm tra xem câu này có nằm trong bản cũ hay không (hoặc là một phần của câu cũ, hoặc câu cũ chứa câu này)
      const existsInOld = cleanOldSentences.some(old => old === cleanPart || old.includes(cleanPart) || cleanPart.includes(old));

      if (!existsInOld) {
        result.push({ value: part, added: true });
      } else {
        result.push({ value: part });
      }
    }
    
    return result;
  }

  // Ngược lại, nếu là chuỗi ngắn (như tuổi tác, danh hiệu, từ đơn), so sánh cấp độ từ và chữ số chi tiết
  // Tokenize thông minh:
  // - [\p{L}]+ : Chuỗi chữ cái liên tục (whole-word tiếng Việt có dấu)
  // - [0-9]    : Từng chữ số đơn lẻ (để gạch chính xác từng chữ số)
  // - \s+      : Khoảng trắng liên tục
  // - .        : Bất kỳ ký tự đơn lẻ nào khác (dấu câu, kí hiệu)
  const tokenize = (str: string) => {
    return str.match(/[\p{L}]+|[0-9]|\s+|./gu) || [];
  };

  const tokens1 = tokenize(s1);
  const tokens2 = tokenize(s2);

  const n = tokens1.length;
  const m = tokens2.length;

  if (n > 2000 || m > 2000) {
    return [{ value: s2, added: true }];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (tokens1[i - 1] === tokens2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: { value: string; added?: boolean; removed?: boolean }[] = [];
  let i = n, j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokens1[i - 1] === tokens2[j - 1]) {
      result.push({ value: tokens1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ value: tokens2[j - 1], added: true });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.push({ value: tokens1[i - 1], removed: true });
      i--;
    }
  }

  result.reverse();

  const grouped: { value: string; added?: boolean; removed?: boolean }[] = [];
  for (const chunk of result) {
    const last = grouped[grouped.length - 1];
    if (last && last.added === chunk.added && last.removed === chunk.removed) {
      last.value += chunk.value;
    } else {
      grouped.push({ ...chunk });
    }
  }

  return grouped;
}

const renderAsText = (val: any): string => {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    if (val.length > 0 && val[0] && typeof val[0] === 'object' && 'name' in val[0]) {
      return val.map((item: any, idx: number) => {
        const parts = [];
        if (item.name) parts.push(`• Đối phương: ${item.name}`);
        if (item.relation) parts.push(`  Quan hệ: ${item.relation}`);
        if (item.level !== undefined) parts.push(`  Cấp độ: ${item.level}`);
        if (item.impression) parts.push(`  Ấn tượng: ${item.impression}`);
        if (item.description) parts.push(`  Mô tả: ${item.description}`);
        return parts.join("\n");
      }).join("\n\n");
    }
    try {
      return val.map((item: any) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(", ");
    } catch (e) {
      return JSON.stringify(val, null, 2);
    }
  }
  if (typeof val === "object") {
    try {
      return Object.entries(val).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join("\n");
    } catch (e) {
      return JSON.stringify(val, null, 2);
    }
  }
  return String(val);
};

function DiffPreview({ oldVal, newVal, isDark }: { oldVal: any; newVal: any; isDark: boolean }) {
  const s1 = oldVal !== undefined && oldVal !== null ? stripHtmlTags(renderAsText(oldVal)) : '';
  const s2 = newVal !== undefined && newVal !== null ? stripHtmlTags(renderAsText(newVal)) : '';

  if (s1 === s2 || !s2) return null;

  const diffs = diffWords(s1, s2);

  return (
    <div className={`mt-1.5 p-2.5 rounded-lg text-xs leading-relaxed border ${
      isDark 
        ? 'bg-emerald-950/20 border-emerald-500/10 text-slate-300 shadow-inner' 
        : 'bg-emerald-50/40 border-emerald-200 text-slate-700 shadow-inner'
    }`}>
      <div className="flex items-center gap-1.5 mb-1.5 opacity-70 font-bold select-none text-[9px] uppercase tracking-wider text-emerald-500">
        <span>✨ Bản xem trước (phần gạch chân là nội dung mới/thay đổi):</span>
      </div>
      <div className="whitespace-pre-wrap font-sans break-all">
        {diffs.map((part, index) => {
          if (part.removed) {
            return null; // Bỏ qua hoàn toàn phần bị xóa từ bản cũ
          }
          if (part.added) {
            return (
              <span 
                key={index} 
                className="underline decoration-2 underline-offset-2"
              >
                {part.value}
              </span>
            );
          }
          return <span key={index}>{part.value}</span>;
        })}
      </div>
    </div>
  );
}

interface NpcUpdateModalProps {
  npc: any;
  npcIndex: number;
  onClose: () => void;
  onApply: (updatedData: any) => void;
}

const FIELD_LABELS: Record<string, string> = {
  id: "ID Nhân vật (Mã định danh)",
  name: "Tên / Nghệ danh / Nickname",
  fullName: "Họ và Tên",
  titles: "Danh hiệu / Tước hiệu",
  occupation: "Nghề nghiệp / Thân phận",
  gender: "Giới tính",
  age: "Tuổi tác",
  dob: "Ngày sinh",
  height: "Chiều cao",
  weight: "Cân nặng",
  measurements: "Số đo / Vóc dáng",
  appearance: "Ngoại hình tổng quan",
  appearanceLite: "Ngoại hình (Rút gọn)",
  background: "Tiểu sử / Lai lịch",
  rank: "Cấp bậc / Cảnh giới",
  powers: "Năng lực / Phép thuật",
  skills: "Kỹ năng / Tuyệt chiêu",
  role: "Vai trò trong truyện",
  personality: "Tính cách (Bề ngoài)",
  personalityCore: "Tính cách cốt lõi",
  philosophy: "Triết lý sống / Tín ngưỡng",
  distinguishingFeatures: "Đặc điểm nhận dạng",
  innerSecret: "Bí mật thầm kín",
  relationships: "Quan hệ xã hội",
  relation: "Mối quan hệ",
  status: "Tình trạng",
  impression: "Ấn tượng và suy nghĩ",
  termsOfAddress: "Cách xưng hô (với đối phương)",
  selfAppellation: "Cách tự xưng (với đối phương)",
  description: "Mô tả chi tiết",
  loveViews: "Quan điểm tình yêu",
  experience: "Kinh nghiệm",
  nsfwPersonality: "Tính cách khi NSFW",
  nsfwReactions: "Phản ứng khi NSFW",
  literaryDescription: "Đặc tả văn học",
  goal: "Mục tiêu / Động cơ",
  preferences: "Sở thích",
  sfw: "Phần SFW",
  nsfw: "Phần NSFW",
  statusData: "Trạng thái nhân vật",
  type: "Phân loại",
  level: "Cấp độ",
  isPinned: "Ghim nhân vật",
  mood: "Tâm trạng",
  psychological: "Tâm lý",
  physiological: "Sinh lý",
  health: "Sức khỏe",
  condition: "Trạng thái cơ thể",
  solvable: "Khả năng giải quyết",
  duration: "Thời lượng",
  pendingUpdates: "Thay đổi chờ duyệt",
  inventory: "Túi đồ / Hành trang",
  quantity: "Số lượng",
  needs: "Nhu cầu"
};

function AutoResizeTextarea({ value, onChange, onBlur, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [localValue, setLocalValue] = React.useState(value);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(() => {
    adjustHeight();
    const timer1 = setTimeout(adjustHeight, 50);
    const timer2 = setTimeout(adjustHeight, 300);
    const timer3 = setTimeout(adjustHeight, 600);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [localValue, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={localValue || ''}
      onChange={(e) => {
        setLocalValue(e.target.value);
        adjustHeight();
      }}
      onBlur={(e) => {
        if (localValue !== value && onChange) {
          onChange(e as any);
        }
        if (onBlur) onBlur(e);
      }}
      className={`${className || ''} overflow-hidden resize-none`}
      rows={1}
      {...props}
    />
  );
}

function DataEditor({ data, originalData, compareData, isDark, onChange, readonly = false, showOnlyChanges = false }: { data: any, originalData?: any, compareData?: any, isDark: boolean, onChange?: (val: any) => void, readonly?: boolean, showOnlyChanges?: boolean }) {
  if (Array.isArray(data)) {
    return <ArrayEditor items={data} originalItems={originalData} compareItems={compareData} isDark={isDark} onChange={onChange} readonly={readonly} showOnlyChanges={showOnlyChanges} />;
  } else if (typeof data === 'object' && data !== null) {
    return <ObjectEditor obj={data} originalObj={originalData} compareObj={compareData} isDark={isDark} onChange={onChange} readonly={readonly} showOnlyChanges={showOnlyChanges} />;
  } else {
    if (readonly) {
      return (
        <div 
          className={`text-sm whitespace-pre-wrap p-2 rounded ${isDark ? 'bg-black/20 text-white/80 border border-white/5' : 'bg-black/5 border border-black/10 text-slate-800'}`}
        >
          {data !== null && data !== undefined ? stripHtmlTags(data) : ''}
        </div>
      );
    } else {
      return (
        <div className="flex flex-col w-full gap-1">
          <AutoResizeTextarea
            value={data === null || data === undefined ? '' : String(data)}
            onChange={(e) => {
              if (onChange) {
                let val: any = e.target.value;
                if (typeof data === 'number') {
                  const num = Number(val);
                  if (!isNaN(num)) val = num;
                }
                onChange(val);
              }
            }}
            className={`w-full px-2 py-1 text-sm rounded outline-none min-h-[40px] ${isDark ? 'bg-black/40 text-white border-white/10 focus:border-green-500/50' : 'bg-black/5 border border-black/10 text-slate-800'} border`}
          />
          <DiffPreview oldVal={originalData} newVal={data} isDark={isDark} />
        </div>
      );
    }
  }
}

function ArrayEditor({ items, originalItems, compareItems, isDark, onChange, readonly = false, showOnlyChanges = false }: { items: any[], originalItems?: any[], compareItems?: any[], isDark: boolean, onChange?: (val: any[]) => void, readonly?: boolean, showOnlyChanges?: boolean }) {
  const arr = Array.isArray(items) ? items : [];
  const compareArr = Array.isArray(compareItems) ? compareItems : Array.isArray(originalItems) ? originalItems : [];
  
  if (arr.length === 0) {
    if (compareArr.length > 0 && showOnlyChanges) {
      return <div className="italic text-red-500 text-sm font-semibold">Dữ liệu đã bị xóa hoặc trống.</div>;
    }
    return <div className="italic opacity-50 text-sm">Không có dữ liệu</div>;
  }

  let hiddenCount = 0;

  const elements = arr.map((item, i) => {
    if (showOnlyChanges) {
      const counterpart = compareArr[i];
      if (JSON.stringify(item) === JSON.stringify(counterpart)) {
        hiddenCount++;
        return null;
      }
    }
    
    return (
      <div key={i} className={`p-3 rounded-lg border flex flex-col gap-2 ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-slate-200'}`}>
        <div className={`text-[10px] font-bold opacity-50`}>MỤC {i + 1}</div>
        <DataEditor 
          data={item} 
          originalData={originalItems ? originalItems[i] : undefined}
          compareData={compareArr[i]}
          isDark={isDark} 
          readonly={readonly} 
          showOnlyChanges={showOnlyChanges}
          onChange={(val) => {
            if (onChange) {
              const newArr = [...arr];
              newArr[i] = val;
              onChange(newArr);
            }
          }}
        />
      </div>
    );
  });

  const hasVisibleItems = elements.some(el => el !== null);

  return (
    <div className="flex flex-col gap-3">
      {hiddenCount > 0 && (
        <div className="text-[10px] italic opacity-50 px-2 text-blue-500 font-bold">
          * Đã ẩn {hiddenCount} mục không có thay đổi
        </div>
      )}
      {!hasVisibleItems && hiddenCount > 0 && (
        <div className="italic opacity-50 text-sm px-2">Không có thay đổi nào trong danh sách này.</div>
      )}
      {elements}
    </div>
  );
}

function ObjectEditor({ obj, originalObj, compareObj, isDark, onChange, readonly = false, showOnlyChanges = false }: { obj: Record<string, any>, originalObj?: Record<string, any>, compareObj?: Record<string, any>, isDark: boolean, onChange?: (val: Record<string, any>) => void, readonly?: boolean, showOnlyChanges?: boolean }) {
  if (!obj || typeof obj !== 'object') return <div className="italic opacity-50 text-sm">Không có dữ liệu</div>;
  
  const compareTo = compareObj || originalObj || {};
  let hiddenCount = 0;

  const elements = Object.entries(obj).map(([k, v]) => {
    if (k === 'id') return null;

    if (showOnlyChanges) {
      const origV = compareTo[k];
      if (JSON.stringify(v) === JSON.stringify(origV)) {
        hiddenCount++;
        return null;
      }
    }

    return (
      <div key={k} className="flex flex-col gap-1">
        <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{FIELD_LABELS[k] || k}</span>
        <DataEditor 
          data={v} 
          originalData={originalObj ? originalObj[k] : undefined}
          compareData={compareTo[k]}
          isDark={isDark} 
          readonly={readonly}
          showOnlyChanges={showOnlyChanges}
          onChange={(val) => {
            if (onChange) {
              onChange({ ...obj, [k]: val });
            }
          }}
        />
      </div>
    );
  });

  const hasVisibleItems = elements.some(el => el !== null);

  return (
    <div className="flex flex-col gap-3">
      {hiddenCount > 0 && (
        <div className="text-[10px] italic opacity-50 px-2 text-blue-500 font-bold">
          * Đã ẩn {hiddenCount} thuộc tính không thay đổi
        </div>
      )}
      {!hasVisibleItems && hiddenCount > 0 && (
        <div className="italic opacity-50 text-sm px-2">Không có thay đổi nào trong đối tượng này.</div>
      )}
      {elements}
    </div>
  );
}

export default function NpcUpdateModal({ npc, npcIndex, onClose, onApply }: NpcUpdateModalProps) {
  const theme = useStore(state => state.theme);
  const isDark = theme.group === 'Dark';
  const gameData = useStore(state => state.gameData);
  const setGameData = useStore(state => state.setGameData);

  const customFieldsRaw = npcIndex === -1
    ? (gameData?.customMcFields || [])
    : (gameData?.customNpcFields || []);

  // UI always shows all fields, conditions are only for AI prompts
  const customFields = customFieldsRaw
    .filter((f: any) => f.enabled !== false)
    .sort((a: any, b: any) => {
      const orderA = typeof a.order === "number" ? a.order : 999;
      const orderB = typeof b.order === "number" ? b.order : 999;
      return orderA - orderB;
    });

  const isCustomMode = npcIndex === -1
    ? (gameData?.mcTemplateMode === "custom")
    : (gameData?.npcTemplateMode === "custom");



  const getFieldLabel = (key: string) => {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    const found = customFields.find((f: any) => f.id === key || f.id.toLowerCase() === key.toLowerCase());
    if (found && found.label) return `${found.label} (${key})`;
    return key;
  };

  const isBuiltInField = (key: string): boolean => {
    const BUILT_IN_FIELDS = [
      "id", "name", "role", "avatar", "appearance", "appearanceLite", 
      "distinguishingFeatures", "personality", "personalityCore", "philosophy", 
      "goal", "innerSecret", "impression", "background", "relationships", 
      "powers", "skills", "inventory", "location", "status", "statusdata", 
      "preferences", "needs", "loveviews", "experience", "nsfwpersonality", 
      "nsfwreactions", "literarydescription", "titles"
    ];
    return BUILT_IN_FIELDS.includes(key.toLowerCase());
  };

  const getOriginalVal = (key: string) => {
    if (isBuiltInField(key)) {
      return npc ? npc[key] : undefined;
    }
    if (npc && npc.customData && npc.customData[key] !== undefined) {
      return npc.customData[key];
    }
    return npc ? npc[key] : undefined;
  };

  const [pending, setPending] = React.useState<any>(() => {
    const rawPending = npc.pendingUpdates || {};
    return { ...rawPending };
  });
  const [viewMode, setViewMode] = React.useState<'original' | 'updated' | 'both'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'updated' : 'both'
  );

  const handleChange = (key: string, val: any) => {
    setPending({ ...pending, [key]: val });
  };

  const handleRemoveField = (key: string) => {
    if (gameData) {
      let newData = JSON.parse(JSON.stringify(gameData));
      if (npcIndex === -1) {
        // MC
        if (newData.mcData?.pendingUpdates) {
          delete newData.mcData.pendingUpdates[key];
          if (Object.keys(newData.mcData.pendingUpdates).length === 0) {
            delete newData.mcData.pendingUpdates;
          }
        }
      } else {
        // NPC
        if (newData.npcs && newData.npcs[npcIndex] && newData.npcs[npcIndex].pendingUpdates) {
          delete newData.npcs[npcIndex].pendingUpdates[key];
          if (Object.keys(newData.npcs[npcIndex].pendingUpdates).length === 0) {
            delete newData.npcs[npcIndex].pendingUpdates;
          }
        }
      }
      setGameData(newData);
    }

    const updated = { ...pending };
    delete updated[key];
    setPending(updated);
    toast.info(`Đã từ chối cập nhật trường "${getFieldLabel(key)}".`);
  };

  const handleApplyField = (key: string) => {
    if (!gameData) return;

    let newData = JSON.parse(JSON.stringify(gameData));
    const val = pending[key];

    if (npcIndex === -1) {
      // Cập nhật cho MC
      if (!newData.mcData) newData.mcData = {};
      newData.mcData[key] = val;
      if (!isBuiltInField(key)) {
        if (!newData.mcData.customData) newData.mcData.customData = {};
        newData.mcData.customData[key] = val;
      }

      if (newData.mcData.pendingUpdates) {
        delete newData.mcData.pendingUpdates[key];
        if (Object.keys(newData.mcData.pendingUpdates).length === 0) {
          delete newData.mcData.pendingUpdates;
        }
      }
      setGameData(newData);
    } else {
      // Cập nhật cho NPC
      if (newData.npcs && newData.npcs[npcIndex]) {
        newData.npcs[npcIndex][key] = val;
        if (!isBuiltInField(key)) {
          if (!newData.npcs[npcIndex].customData) newData.npcs[npcIndex].customData = {};
          newData.npcs[npcIndex].customData[key] = val;
        }

        if (newData.npcs[npcIndex].pendingUpdates) {
          delete newData.npcs[npcIndex].pendingUpdates[key];
          if (Object.keys(newData.npcs[npcIndex].pendingUpdates).length === 0) {
            delete newData.npcs[npcIndex].pendingUpdates;
          }
        }
        setGameData(newData);
      }
    }

    const updated = { ...pending };
    delete updated[key];
    setPending(updated);

    toast.success(`Đã phê duyệt cập nhật trường "${getFieldLabel(key)}" thành công!`);
  };

  const handleApply = () => {
    onApply(pending);
  };

  if (!npc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/80" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full h-full flex flex-col overflow-hidden ${
          isDark 
            ? 'bg-[#0f172a] text-white' 
            : 'bg-white text-slate-800'
        }`}
      >
        <div 
          className={`px-4 pb-4 border-b flex flex-col shrink-0 gap-4 relative z-20 shadow-sm ${isDark ? 'border-white/10 bg-[#0f172a]' : 'border-slate-200 bg-white'}`}
          style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
        >
          <div className="flex items-center justify-between gap-2 md:gap-4 min-h-[40px] flex-wrap md:flex-nowrap">
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
               <button
                 onClick={() => {
                   document.getElementById('npc-update-scroll-container')?.scrollTo({ top: 0, behavior: 'instant' });
                 }}
                 title="Lên đầu"
                 className={`flex items-center justify-center p-2 rounded-lg transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
               >
                 <ArrowUpToLine size={20} />
               </button>
               <button
                 onClick={() => {
                   const el = document.getElementById('npc-update-scroll-container');
                   if (el) {
                     el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
                   }
                 }}
                 title="Xuống cuối"
                 className={`flex items-center justify-center p-2 rounded-lg transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
               >
                 <ArrowDownToLine size={20} />
               </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {npcIndex !== -1 && (
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border select-all ${
                  isDark ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                }`}>
                  ID: {npc.id || 'N/A'}
                </span>
              )}
              <h2 className="text-sm md:text-base font-bold uppercase tracking-wide truncate max-w-[160px] sm:max-w-xs">
                {npc.fullName || npc.name}
              </h2>
            </div>
            
            <div className="hidden md:flex justify-center items-center gap-2 shrink-0">
              <div className={`flex p-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    viewMode === 'original'
                      ? isDark ? 'bg-blue-600/30 text-blue-400 shadow-sm' : 'bg-blue-100 text-blue-700 shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Nội dung gốc
                </button>
                <button
                  onClick={() => setViewMode('updated')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    viewMode === 'updated'
                      ? isDark ? 'bg-purple-600/30 text-purple-400 shadow-sm' : 'bg-purple-100 text-purple-700 shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Nội dung cập nhật
                </button>
                <button
                  onClick={() => setViewMode('both')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    viewMode === 'both'
                      ? isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Song song
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2 shrink-0">
               <button
                 onClick={handleApply}
                 title="Lưu"
                 className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors shadow-lg shadow-green-600/20"
               >
                 <Check size={24} />
               </button>
               <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-200'}`}>
                 <X size={24} />
               </button>
            </div>
          </div>

          <div className="md:hidden flex justify-center items-center gap-2 w-full mt-2">
            <div className={`flex p-1 rounded-lg w-full ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
              <button
                onClick={() => setViewMode('original')}
                className={`flex-1 py-2 rounded-md text-xs sm:text-sm font-bold transition-all ${
                  viewMode === 'original'
                    ? isDark ? 'bg-blue-600/30 text-blue-400 shadow-sm' : 'bg-blue-100 text-blue-700 shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Gốc
              </button>
              <button
                onClick={() => setViewMode('updated')}
                className={`flex-1 py-2 rounded-md text-xs sm:text-sm font-bold transition-all ${
                  viewMode === 'updated'
                    ? isDark ? 'bg-green-600/30 text-green-400 shadow-sm' : 'bg-green-100 text-green-700 shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>

        <div id="npc-update-scroll-container" className="flex-1 overflow-y-auto flex flex-col p-6 gap-8">
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 pb-20">
            {Object.keys(pending).map((key) => {
              if (['location', 'currentlocation', 'status', 'statusdata'].includes(key.trim().toLowerCase())) return null;
              const origVal = getOriginalVal(key);
              if (JSON.stringify(pending[key]) === JSON.stringify(origVal)) return null;
              
              const isPendingArray = Array.isArray(pending[key]);
              const isOrigArray = Array.isArray(origVal);
              
              const isPendingObject = !isPendingArray && typeof pending[key] === 'object' && pending[key] !== null;
              const isOrigObject = !isOrigArray && typeof origVal === 'object' && origVal !== null;
              
              return (
                <div 
                  key={key} 
                  id={`update-field-group-${key}`}
                  data-field-key={key}
                  data-ai-field-name={key}
                  className={`flex flex-col md:flex-row gap-6 ${viewMode !== 'both' ? 'md:flex-col' : ''}`}
                >
                  {/* Cột Gốc */}
                  {(viewMode === 'original' || viewMode === 'both') && (
                  <div 
                    id={`update-original-col-${key}`}
                    data-field-column="original"
                    data-field-key={key}
                    className={`flex-1 p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-black/20 border-white/10' : `border-black/10 ${theme.sidebarClass}`} flex flex-col`}
                  >
                    <span className={`block text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>
                      BẢN GỐC: {getFieldLabel(key)}
                      <span className="sr-only" aria-hidden="true" data-ai-key={key}> [Key: {key}]</span>
                    </span>
                    <div className={`flex-1`}>
                      {isOrigArray ? (
                        <ArrayEditor items={origVal || []} compareItems={pending[key] || []} isDark={isDark} readonly showOnlyChanges={true} />
                      ) : isOrigObject ? (
                        <ObjectEditor obj={origVal || {}} compareObj={pending[key] || {}} isDark={isDark} readonly showOnlyChanges={true} />
                      ) : (
                        <div 
                          className={`text-sm whitespace-pre-wrap leading-relaxed ${isDark ? 'text-white/90' : 'text-slate-700'}`}
                        >
                          {origVal !== undefined && origVal !== null ? stripHtmlTags(renderAsText(origVal)) : <span className="italic opacity-50">Không có dữ liệu</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Cột Cập Nhật */}
                  {(viewMode === 'updated' || viewMode === 'both') && (
                  <div 
                    id={`update-pending-col-${key}`}
                    data-field-column="updated"
                    data-field-key={key}
                    className={`flex-1 p-5 rounded-2xl border relative focus-within:ring-2 ring-green-500/50 shadow-sm ${isDark ? 'bg-green-900/10 border-green-500/30' : 'bg-green-50 border-green-200'} flex flex-col`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                      <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        CẬP NHẬT: {getFieldLabel(key)}
                        <span className="sr-only" aria-hidden="true" data-ai-key={key}> [Key: {key}]</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {typeof origVal === 'string' && typeof pending[key] === 'string' && (
                          <button 
                            onClick={() => handleChange(key, origVal + '\n\n' + pending[key])} 
                            className="text-[10px] bg-blue-500/10 text-blue-500 dark:text-blue-400 font-bold px-3 py-1.5 rounded hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-1"
                            title="Nối thêm đoạn văn mới vào cuối đoạn văn cũ (để tránh bị ghi đè mất thông tin)"
                          >
                            <Plus size={12} /> NỐI THÊM
                          </button>
                        )}
                        <button 
                          onClick={() => handleRemoveField(key)} 
                          className="text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 font-bold px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} /> XÓA
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      {isPendingArray ? (
                        <ArrayEditor items={pending[key] || []} originalItems={origVal || []} isDark={isDark} onChange={(val) => handleChange(key, val)} showOnlyChanges={true} />
                      ) : isPendingObject ? (
                        <ObjectEditor obj={pending[key] || {}} originalObj={origVal || {}} isDark={isDark} onChange={(val) => handleChange(key, val)} showOnlyChanges={true} />
                      ) : (
                        <div className="flex flex-col gap-2 w-full">
                          <AutoResizeTextarea 
                            value={pending[key] !== undefined && pending[key] !== null ? (typeof pending[key] === 'object' ? JSON.stringify(pending[key], null, 2) : String(pending[key])) : ''}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className={`w-full min-h-[120px] text-sm outline-none bg-transparent whitespace-pre-wrap leading-relaxed ${isDark ? 'text-white' : 'text-slate-700 bg-white border border-green-200 p-3 rounded-lg shadow-inner'}`}
                          />
                          <DiffPreview oldVal={origVal} newVal={pending[key]} isDark={isDark} />
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              );
            })}
            
            {pending.statusData && JSON.stringify(pending.statusData) !== JSON.stringify(npc.statusData) && (
              <div className={`flex flex-col md:flex-row gap-6 ${viewMode !== 'both' ? 'md:flex-col' : ''}`}>
                {(viewMode === 'original' || viewMode === 'both') && (
                <div className={`flex-1 p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-black/20 border-white/10' : `border-black/10 ${theme.sidebarClass}`} flex flex-col`}>
                  <span className={`block text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>BẢN GỐC: statusData</span>
                  <div className={`flex-1`}>
                    <ObjectEditor obj={npc.statusData || {}} compareObj={pending.statusData || {}} isDark={isDark} readonly showOnlyChanges={true} />
                  </div>
                </div>
                )}
                
                {(viewMode === 'updated' || viewMode === 'both') && (
                <div className={`flex-1 p-5 rounded-2xl border relative focus-within:ring-2 ring-green-500/50 shadow-sm ${isDark ? 'bg-green-900/10 border-green-500/30' : 'bg-green-50 border-green-200'} flex flex-col`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-green-400' : 'text-green-600'}`}>CẬP NHẬT: statusData</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={() => handleRemoveField('statusData')} 
                        className="text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 font-bold px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} /> XÓA
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <ObjectEditor obj={pending.statusData || {}} originalObj={npc.statusData || {}} isDark={isDark} onChange={(val) => handleChange('statusData', val)} showOnlyChanges={true} />
                  </div>
                </div>
                )}
              </div>
            )}

            {Object.keys(pending).filter(key => JSON.stringify(pending[key]) !== JSON.stringify(getOriginalVal(key)) && !['location', 'currentlocation', 'status', 'statusdata'].includes(key.trim().toLowerCase())).length === 0 && (
              <div className="text-center italic opacity-50 p-8 text-lg">Không còn thay đổi nào cần cập nhật.</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

