import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Check, ArrowUpToLine, ArrowDownToLine, Trash2, Globe, MapPin, BrainCircuit, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { stripHtmlTags } from '../utils/htmlSanitizer';
import { toast } from '../utils/toast';

function diffWords(oldStr: string, newStr: string): { value: string; added?: boolean; removed?: boolean }[] {
  const s1 = oldStr || '';
  const s2 = newStr || '';
  
  if (s1 === s2) {
    return [{ value: s1 }];
  }

  const hasSentenceStructure = /[.!?]/.test(s2) && s2.length > 35;
  if (hasSentenceStructure) {
    const sentences2 = s2.split(/([.!?]+(?:\s+|\n+|$))/g).filter(Boolean);
    const cleanOldSentences = s1
      .split(/[.!?]+|\n/g)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const result: { value: string; added?: boolean; removed?: boolean }[] = [];
    
    for (const part of sentences2) {
      const trimmed = part.trim();
      if (!/[a-zA-Z0-9\p{L}]/u.test(trimmed)) {
        result.push({ value: part });
        continue;
      }

      const cleanPart = trimmed.toLowerCase();
      const existsInOld = cleanOldSentences.some(old => old === cleanPart || old.includes(cleanPart) || cleanPart.includes(old));

      if (!existsInOld) {
        result.push({ value: part, added: true });
      } else {
        result.push({ value: part });
      }
    }
    
    return result;
  }

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

function DiffPreview({ oldVal, newVal, isDark }: { oldVal: any; newVal: any; isDark: boolean }) {
  const s1 = oldVal !== undefined && oldVal !== null ? stripHtmlTags(oldVal) : '';
  const s2 = newVal !== undefined && newVal !== null ? stripHtmlTags(newVal) : '';

  if (s1 === s2 || !s2) return null;

  const diffs = diffWords(s1, s2);

  return (
    <div className={`mt-1.5 p-2.5 rounded-lg text-xs leading-relaxed border ${
      isDark 
        ? 'bg-[#0f1d1a]/80 border-emerald-500/10 text-slate-300 shadow-inner' 
        : 'bg-emerald-50/40 border-emerald-200 text-slate-700 shadow-inner'
    }`}>
      <div className="flex items-center gap-1.5 mb-1.5 opacity-70 font-bold select-none text-[9px] uppercase tracking-wider text-emerald-500">
        <span>✨ Bản xem trước (phần gạch chân là nội dung mới/thay đổi):</span>
      </div>
      <div className="whitespace-pre-wrap font-sans break-all">
        {diffs.map((part, index) => {
          if (part.removed) {
            return null;
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

const CODEX_FIELD_LABELS: Record<string, string> = {
  name: "Tên Thế Giới",
  difficulty: "Độ Khó",
  worldState: "Bảng Trạng Thái Thế Giới",
  leaderboards: "Bảng Xếp Hạng",
  background: "Bối Cảnh",
  starterTimeline: "Mốc Thời Gian Mở Đầu",
  starterScenario: "Kịch Bản Mở Đầu",
  mainScenario: "Kịch Bản Chính & Các Nhánh Tiếp Theo",
  worldRules: "Quy Tắc Thế Giới",
  namingConventions: "Quy Tắc Đặt Tên",
  genre: "Thể Loại",
  mainMood: "Âm Hưởng Chủ Đạo",
  pacing: "Nhịp Độ",
  geography: "Địa Lý & Lãnh Thổ",
  worldHistory: "Lịch Sử Thế Giới",
  culture: "Văn Hóa & Phong Tục",
  economy: "Kinh Tế & Xã Hội",
  religion: "Tôn Giáo & Tín Ngưỡng",
  factions: "Các Quốc Gia & Thế Lực",
  factionRelations: "Quan Hệ Thế Lực",
  uniqueElements: "Yếu Tố Độc Đáo",
  powerSystem: "Hệ Thống Sức Mạnh / Logic",
  logicControl: "Kiểm Soát Logic",
  writingStyle: "Văn Phong",
  narrativePerspective: "Ngôi Kể"
};

function AutoResizeTextarea({ value, onChange, onBlur, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
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

const getDiffObj = (d: any) => {
  if (typeof d === 'object' && d !== null) {
    return {
      sfw: d.sfw !== undefined ? String(d.sfw) : '',
      nsfw: d.nsfw !== undefined ? String(d.nsfw) : ''
    };
  }
  if (typeof d === 'string') {
    return { sfw: d, nsfw: '' };
  }
  return { sfw: '', nsfw: '' };
};

const isFieldEqual = (key: string, v1: any, v2: any) => {
  if (key === 'difficulty') {
    const d1 = getDiffObj(v1);
    const d2 = getDiffObj(v2);
    return d1.sfw.trim() === d2.sfw.trim() && d1.nsfw.trim() === d2.nsfw.trim();
  }
  return JSON.stringify(v1) === JSON.stringify(v2);
};

interface CodexUpdateModalProps {
  onClose: () => void;
}

export default function CodexUpdateModal({ onClose }: CodexUpdateModalProps) {
  const theme = useStore(state => state.theme);
  const gameData = useStore(state => state.gameData);
  const setGameData = useStore(state => state.setGameData);
  
  const isDark = theme.group === 'Dark';

  const [pending, setPending] = useState<any>(() => {
    return JSON.parse(JSON.stringify(gameData?.codexPendingUpdates || {}));
  });

  const [viewMode, setViewMode] = useState<'original' | 'updated' | 'both'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'updated' : 'both'
  );

  useEffect(() => {
    // Auto-heal misplaced locations/places in existing pending updates
    if (gameData && gameData.codexPendingUpdates) {
      let needsHeal = false;
      const next = { ...gameData };
      const nextUpdates = JSON.parse(JSON.stringify(next.codexPendingUpdates));
      const worldDataKeys = ["name","difficulty","worldState","leaderboards","background","starterTimeline","starterScenario","mainScenario","worldRules","namingConventions","genre","mainMood","pacing","geography","worldHistory","culture","economy","religion","factions","factionRelations","uniqueElements","powerSystem","logicControl","writingStyle","narrativePerspective"];
      
      if (nextUpdates.worldData) {
        if (nextUpdates.worldData.locations) {
          if (!nextUpdates.worldDetails) nextUpdates.worldDetails = {};
          nextUpdates.worldDetails.locations = nextUpdates.worldData.locations;
          delete nextUpdates.worldData.locations;
          needsHeal = true;
        }
        if (nextUpdates.worldData.places) {
          if (!nextUpdates.worldDetails) nextUpdates.worldDetails = {};
          nextUpdates.worldDetails.places = nextUpdates.worldData.places;
          delete nextUpdates.worldData.places;
          needsHeal = true;
        }
        if (nextUpdates.worldData.creativeRules) {
          nextUpdates.creativeRules = nextUpdates.worldData.creativeRules;
          delete nextUpdates.worldData.creativeRules;
          needsHeal = true;
        }
      }
      
      if (nextUpdates.locations) {
        if (!nextUpdates.worldDetails) nextUpdates.worldDetails = {};
        nextUpdates.worldDetails.locations = nextUpdates.locations;
        delete nextUpdates.locations;
        needsHeal = true;
      }
      if (nextUpdates.places) {
        if (!nextUpdates.worldDetails) nextUpdates.worldDetails = {};
        nextUpdates.worldDetails.places = nextUpdates.places;
        delete nextUpdates.places;
        needsHeal = true;
      }

      for (const key of worldDataKeys) {
        if (nextUpdates[key] !== undefined) {
          if (!nextUpdates.worldData) nextUpdates.worldData = {};
          nextUpdates.worldData[key] = nextUpdates[key];
          delete nextUpdates[key];
          needsHeal = true;
        }
      }

      if (nextUpdates.worldDetails && nextUpdates.worldDetails.locations) {
        if (!Array.isArray(nextUpdates.worldDetails.locations)) {
           // If it's a string, try parsing it, or wrap it in an object
           if (typeof nextUpdates.worldDetails.locations === 'string') {
              try {
                  const parsed = JSON.parse(nextUpdates.worldDetails.locations);
                  nextUpdates.worldDetails.locations = Array.isArray(parsed) ? parsed : [parsed];
              } catch (e) {
                  nextUpdates.worldDetails.locations = [{ name: "New Location", description: nextUpdates.worldDetails.locations }];
              }
           } else {
              nextUpdates.worldDetails.locations = [nextUpdates.worldDetails.locations];
           }
           needsHeal = true;
        }
      }

      if (needsHeal) {
        next.codexPendingUpdates = nextUpdates;
        setGameData(next);
        setPending(nextUpdates);
      }
    }
  }, [gameData]);

  if (!gameData || !gameData.codexPendingUpdates) return null;

  const currentWorldData = gameData.worldData || {};
  const currentWorldDetails = gameData.worldDetails || {};
  const currentLocations = currentWorldDetails.locations || [];
  const currentCreativeRules = gameData.creativeRules || '';

  // Quản lý thay đổi cho các trường WorldData
  const handleWorldDataFieldChange = (key: string, value: any) => {
    setPending((prev: any) => ({
      ...prev,
      worldData: {
        ...(prev.worldData || {}),
        [key]: value
      }
    }));
  };

  const handleRemoveWorldDataField = (key: string) => {
    let newData = JSON.parse(JSON.stringify(gameData));
    if (newData.codexPendingUpdates?.worldData) {
      delete newData.codexPendingUpdates.worldData[key];
      if (Object.keys(newData.codexPendingUpdates.worldData).length === 0) {
        delete newData.codexPendingUpdates.worldData;
      }
    }
    setGameData(newData);

    setPending((prev: any) => {
      const next = { ...prev };
      if (next.worldData) {
        const updated = { ...next.worldData };
        delete updated[key];
        next.worldData = updated;
        if (Object.keys(updated).length === 0) {
          delete next.worldData;
        }
      }
      return next;
    });
    toast.info(`Đã từ chối cập nhật trường "${CODEX_FIELD_LABELS[key] || key}".`);
  };

  const handleApplyWorldDataField = (key: string) => {
    let newData = JSON.parse(JSON.stringify(gameData));
    if (pending.worldData && pending.worldData[key] !== undefined) {
      if (!newData.worldData) newData.worldData = {};
      if (key === 'difficulty') {
        const diffVal = getDiffObj(pending.worldData.difficulty);
        const currentDiff = getDiffObj(newData.worldData.difficulty);
        newData.worldData.difficulty = {
          sfw: pending.worldData.difficulty?.sfw !== undefined ? diffVal.sfw : (diffVal.sfw || currentDiff.sfw),
          nsfw: pending.worldData.difficulty?.nsfw !== undefined ? diffVal.nsfw : (diffVal.nsfw || currentDiff.nsfw)
        };
      } else {
        newData.worldData[key] = pending.worldData[key];
      }
      
      if (newData.codexPendingUpdates?.worldData) {
        delete newData.codexPendingUpdates.worldData[key];
        if (Object.keys(newData.codexPendingUpdates.worldData).length === 0) {
          delete newData.codexPendingUpdates.worldData;
        }
      }
      
      setPending((prev: any) => {
        const next = { ...prev };
        if (next.worldData) {
          const updated = { ...next.worldData };
          delete updated[key];
          next.worldData = updated;
          if (Object.keys(updated).length === 0) {
            delete next.worldData;
          }
        }
        return next;
      });

      setGameData(newData);
      toast.success(`Đã phê duyệt cập nhật trường "${CODEX_FIELD_LABELS[key] || key}" thành công!`);
    }
  };

  // Quản lý thay đổi cho các địa điểm Locations
  const handleLocationFieldChange = (index: number, field: 'name' | 'description', value: string) => {
    setPending((prev: any) => {
      const next = { ...prev };
      if (next.worldDetails && next.worldDetails.locations) {
        const updatedLocs = [...next.worldDetails.locations];
        updatedLocs[index] = {
          ...updatedLocs[index],
          [field]: value
        };
        next.worldDetails = {
          ...next.worldDetails,
          locations: updatedLocs
        };
      }
      return next;
    });
  };

  const handleRemoveLocation = (index: number, name: string) => {
    let newData = JSON.parse(JSON.stringify(gameData));
    if (newData.codexPendingUpdates?.worldDetails?.locations) {
      const origLocs = newData.codexPendingUpdates.worldDetails.locations;
      const targetIdx = origLocs.findIndex((loc: any) => loc.name === name);
      if (targetIdx >= 0) {
        origLocs.splice(targetIdx, 1);
      }
      if (origLocs.length === 0) {
        delete newData.codexPendingUpdates.worldDetails.locations;
        if (Object.keys(newData.codexPendingUpdates.worldDetails).length === 0) {
          delete newData.codexPendingUpdates.worldDetails;
        }
      }
    }
    setGameData(newData);

    setPending((prev: any) => {
      const next = { ...prev };
      if (next.worldDetails && next.worldDetails.locations) {
        const updatedLocs = [...next.worldDetails.locations];
        updatedLocs.splice(index, 1);
        next.worldDetails = {
          ...next.worldDetails,
          locations: updatedLocs
        };
        if (updatedLocs.length === 0) {
          delete next.worldDetails.locations;
        }
        if (Object.keys(next.worldDetails).length === 0) {
          delete next.worldDetails;
        }
      }
      return next;
    });
    toast.info(`Đã từ chối địa điểm "${name}".`);
  };

  const handleApplyLocation = (index: number, name: string) => {
    let newData = JSON.parse(JSON.stringify(gameData));
    const item = pending.worldDetails?.locations?.[index];
    if (item) {
      if (!newData.worldDetails) newData.worldDetails = {};
      if (!newData.worldDetails.locations) newData.worldDetails.locations = [];
      
      const existingIdx = newData.worldDetails.locations.findIndex((loc: any) => loc.name === name);
      if (existingIdx >= 0) {
        newData.worldDetails.locations[existingIdx] = item;
      } else {
        newData.worldDetails.locations.push(item);
      }

      if (newData.codexPendingUpdates?.worldDetails?.locations) {
        const origLocs = newData.codexPendingUpdates.worldDetails.locations;
        const targetIdx = origLocs.findIndex((loc: any) => loc.name === name);
        if (targetIdx >= 0) {
          origLocs.splice(targetIdx, 1);
        }
        if (origLocs.length === 0) {
          delete newData.codexPendingUpdates.worldDetails.locations;
          if (Object.keys(newData.codexPendingUpdates.worldDetails).length === 0) {
            delete newData.codexPendingUpdates.worldDetails;
          }
        }
      }

      setPending((prev: any) => {
        const next = { ...prev };
        if (next.worldDetails?.locations) {
          const updatedLocs = [...next.worldDetails.locations];
          updatedLocs.splice(index, 1);
          next.worldDetails = {
            ...next.worldDetails,
            locations: updatedLocs
          };
          if (updatedLocs.length === 0) {
            delete next.worldDetails.locations;
          }
          if (Object.keys(next.worldDetails).length === 0) {
            delete next.worldDetails;
          }
        }
        return next;
      });

      setGameData(newData);
      toast.success(`Đã phê duyệt địa điểm "${name}" thành công!`);
    }
  };

  // Quản lý thay đổi cho Places
  const handlePlacesChange = (value: string) => {
    setPending((prev: any) => ({
      ...prev,
      worldDetails: {
        ...(prev.worldDetails || {}),
        places: value
      }
    }));
  };

  const handleRemovePlaces = () => {
    let newData = JSON.parse(JSON.stringify(gameData));
    if (newData.codexPendingUpdates?.worldDetails) {
      delete newData.codexPendingUpdates.worldDetails.places;
      if (Object.keys(newData.codexPendingUpdates.worldDetails).length === 0) {
        delete newData.codexPendingUpdates.worldDetails;
      }
    }
    setGameData(newData);

    setPending((prev: any) => {
      const next = { ...prev };
      if (next.worldDetails) {
        const updated = { ...next.worldDetails };
        delete updated.places;
        next.worldDetails = updated;
        if (Object.keys(updated).length === 0) {
          delete next.worldDetails;
        }
      }
      return next;
    });
    toast.info("Đã từ chối cập nhật Ghi chú Địa điểm khác.");
  };

  const handleApplyPlaces = () => {
    let newData = JSON.parse(JSON.stringify(gameData));
    if (pending.worldDetails?.places !== undefined) {
      if (!newData.worldDetails) newData.worldDetails = {};
      newData.worldDetails.places = pending.worldDetails.places;

      if (newData.codexPendingUpdates?.worldDetails) {
        delete newData.codexPendingUpdates.worldDetails.places;
        if (Object.keys(newData.codexPendingUpdates.worldDetails).length === 0) {
          delete newData.codexPendingUpdates.worldDetails;
        }
      }

      setPending((prev: any) => {
        const next = { ...prev };
        if (next.worldDetails) {
          const updated = { ...next.worldDetails };
          delete updated.places;
          next.worldDetails = updated;
          if (Object.keys(updated).length === 0) {
            delete next.worldDetails;
          }
        }
        return next;
      });

      setGameData(newData);
      toast.success("Đã phê duyệt Ghi chú Địa điểm khác thành công!");
    }
  };

  // Quản lý thay đổi cho CreativeRules
  const handleCreativeRulesChange = (value: string) => {
    setPending((prev: any) => ({
      ...prev,
      creativeRules: value
    }));
  };

  const handleRemoveCreativeRules = () => {
    let newData = JSON.parse(JSON.stringify(gameData));
    if (newData.codexPendingUpdates) {
      delete newData.codexPendingUpdates.creativeRules;
    }
    setGameData(newData);

    setPending((prev: any) => {
      const next = { ...prev };
      delete next.creativeRules;
      return next;
    });
    toast.info("Đã từ chối cập nhật Quy Tắc Sáng Tạo.");
  };

  const handleApplyCreativeRules = () => {
    let newData = JSON.parse(JSON.stringify(gameData));
    if (pending.creativeRules !== undefined) {
      newData.creativeRules = pending.creativeRules;

      if (newData.codexPendingUpdates) {
        delete newData.codexPendingUpdates.creativeRules;
      }

      setPending((prev: any) => {
        const next = { ...prev };
        delete next.creativeRules;
        return next;
      });

      setGameData(newData);
      toast.success("Đã phê duyệt Quy Tắc Sáng Tạo thành công!");
    }
  };

  // Áp dụng tất cả thay đổi hiện hành trong pending
  const handleApply = () => {
    let newData = JSON.parse(JSON.stringify(gameData));
    
    // 1. Áp dụng worldData
    if (pending.worldData) {
      const prevWD = newData.worldData || {};
      newData.worldData = {
        ...prevWD,
        ...pending.worldData
      };
      if (pending.worldData.difficulty !== undefined) {
        const diffVal = getDiffObj(pending.worldData.difficulty);
        const currentDiff = getDiffObj(prevWD.difficulty);
        newData.worldData.difficulty = {
          sfw: pending.worldData.difficulty?.sfw !== undefined ? diffVal.sfw : (diffVal.sfw || currentDiff.sfw),
          nsfw: pending.worldData.difficulty?.nsfw !== undefined ? diffVal.nsfw : (diffVal.nsfw || currentDiff.nsfw)
        };
      }
    }

    // 2. Áp dụng worldDetails.locations
    if (pending.worldDetails?.locations) {
      if (!newData.worldDetails) newData.worldDetails = {};
      if (!newData.worldDetails.locations) newData.worldDetails.locations = [];
      
      pending.worldDetails.locations.forEach((item: any) => {
        const existingIdx = newData.worldDetails.locations.findIndex((loc: any) => loc.name === item.name);
        if (existingIdx >= 0) {
          newData.worldDetails.locations[existingIdx] = item;
        } else {
          newData.worldDetails.locations.push(item);
        }
      });
    }

    // 3. Áp dụng worldDetails.places
    if (pending.worldDetails?.places) {
      if (!newData.worldDetails) newData.worldDetails = {};
      newData.worldDetails.places = pending.worldDetails.places;
    }

    // 4. Áp dụng creativeRules
    if (pending.creativeRules) {
      newData.creativeRules = pending.creativeRules;
    }

    // Dọn dẹp codexPendingUpdates
    delete newData.codexPendingUpdates;
    
    setGameData(newData);
    toast.success("Đã phê duyệt các thay đổi Codex thành công!");
    onClose();
  };

  // Phê duyệt toàn bộ bản cập nhật gốc
  const handleApplyAll = () => {
    let newData = JSON.parse(JSON.stringify(gameData));
    const origPending = gameData.codexPendingUpdates || {};
    
    if (origPending.worldData) {
      const prevWD = newData.worldData || {};
      newData.worldData = {
        ...prevWD,
        ...origPending.worldData
      };
      if (origPending.worldData.difficulty !== undefined) {
        const diffVal = getDiffObj(origPending.worldData.difficulty);
        const currentDiff = getDiffObj(prevWD.difficulty);
        newData.worldData.difficulty = {
          sfw: origPending.worldData.difficulty?.sfw !== undefined ? diffVal.sfw : (diffVal.sfw || currentDiff.sfw),
          nsfw: origPending.worldData.difficulty?.nsfw !== undefined ? diffVal.nsfw : (diffVal.nsfw || currentDiff.nsfw)
        };
      }
    }
    if (origPending.worldDetails) {
      if (!newData.worldDetails) newData.worldDetails = {};
      if (origPending.worldDetails.locations) {
        if (!newData.worldDetails.locations) newData.worldDetails.locations = [];
        origPending.worldDetails.locations.forEach((item: any) => {
          const existingIdx = newData.worldDetails.locations.findIndex((loc: any) => loc.name === item.name);
          if (existingIdx >= 0) {
            newData.worldDetails.locations[existingIdx] = item;
          } else {
            newData.worldDetails.locations.push(item);
          }
        });
      }
      if (origPending.worldDetails.places) {
        newData.worldDetails.places = origPending.worldDetails.places;
      }
    }
    if (origPending.creativeRules) {
      newData.creativeRules = origPending.creativeRules;
    }
    
    delete newData.codexPendingUpdates;
    setGameData(newData);
    toast.success("Đã phê duyệt toàn bộ cập nhật Codex gốc thành công!");
    onClose();
  };

  // Từ chối toàn bộ thay đổi
  const handleDiscardAll = () => {
    let newData = JSON.parse(JSON.stringify(gameData));
    delete newData.codexPendingUpdates;
    setGameData(newData);
    toast.info("Đã từ chối tất cả cập nhật Codex.");
    onClose();
  };

  // Tính số lượng trường thay đổi thực tế đang hiển thị trong pending
  const hasWorldDataUpdates = pending.worldData && Object.keys(pending.worldData).some(key => !isFieldEqual(key, pending.worldData[key], currentWorldData[key]));
  const hasLocationsUpdates = pending.worldDetails?.locations && pending.worldDetails.locations.some((item: any) => JSON.stringify(item) !== JSON.stringify(currentLocations.find((loc: any) => loc.name === item.name) || {}));
  const hasPlacesUpdates = pending.worldDetails?.places !== undefined && pending.worldDetails.places !== currentWorldDetails.places;
  const hasCreativeRulesUpdates = pending.creativeRules !== undefined && pending.creativeRules !== currentCreativeRules;

  const totalFieldsInPending = 
    (pending.worldData ? Object.keys(pending.worldData).filter(key => !isFieldEqual(key, pending.worldData[key], currentWorldData[key])).length : 0) +
    (pending.worldDetails?.locations ? pending.worldDetails.locations.filter((item: any) => JSON.stringify(item) !== JSON.stringify(currentLocations.find((loc: any) => loc.name === item.name) || {})).length : 0) +
    (hasPlacesUpdates ? 1 : 0) +
    (hasCreativeRulesUpdates ? 1 : 0);

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
        {/* Top bar tương tự NPC */}
        <div 
          className={`px-4 pb-4 border-b flex flex-col shrink-0 gap-4 relative z-20 shadow-sm ${isDark ? 'border-white/10 bg-[#0f172a]' : 'border-slate-200 bg-white'}`}
          style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
        >
          <div className="flex items-center justify-between gap-2 md:gap-4 min-h-[40px] flex-wrap md:flex-nowrap">
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
               <button
                 onClick={() => {
                   document.getElementById('codex-update-scroll-container')?.scrollTo({ top: 0, behavior: 'instant' });
                 }}
                 title="Lên đầu"
                 className={`flex items-center justify-center p-2 rounded-lg transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
               >
                 <ArrowUpToLine size={20} />
               </button>
               <button
                 onClick={() => {
                   const el = document.getElementById('codex-update-scroll-container');
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
                 disabled={totalFieldsInPending === 0}
                 title="Áp dụng thay đổi"
                 className={`flex items-center justify-center p-2 rounded-lg transition-colors shadow-lg ${
                   totalFieldsInPending > 0
                     ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
                     : (isDark ? "bg-slate-500/50 text-white/40 cursor-not-allowed" : `cursor-not-allowed border-black/10 opacity-50 ${theme.bgClass} ${theme.textSecondary}`)
                 }`}
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

        {/* Scrollable Container */}
        <div id="codex-update-scroll-container" className="flex-1 overflow-y-auto flex flex-col p-6 gap-8">
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 pb-20">
            
            {/* 1. Phần WORLD DATA */}
            {hasWorldDataUpdates && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b pb-2 border-slate-500/10">
                  <Globe className="text-blue-500" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider opacity-80">Thông Tin Thế Giới (World Data)</h3>
                </div>
                {Object.entries(pending.worldData).map(([key, val]) => {
                  const oldVal = currentWorldData[key];
                  if (isFieldEqual(key, val, oldVal)) return null;

                  if (key === 'difficulty') {
                    const oldDiff = getDiffObj(oldVal);
                    const newDiff = getDiffObj(val);
                    return (
                      <div key={key} className={`flex flex-col md:flex-row gap-6 ${viewMode !== 'both' ? 'md:flex-col' : ''}`}>
                        {/* Cột Gốc */}
                        {(viewMode === 'original' || viewMode === 'both') && (
                          <div className={`flex-1 p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-black/20 border-white/10' : `border-black/10 ${theme.sidebarClass}`} flex flex-col`}>
                            <span className={`block text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>BẢN GỐC: {CODEX_FIELD_LABELS[key] || key}</span>
                            <div className="flex-1 text-sm flex flex-col gap-4 leading-relaxed">
                              <div>
                                <span className="font-bold text-xs uppercase tracking-wider block mb-1.5 text-amber-500 dark:text-amber-400">
                                  SFW (An toàn / Sinh tồn / Chiến đấu):
                                </span>
                                <div className="whitespace-pre-wrap font-sans bg-black/5 dark:bg-black/20 p-3 rounded-lg border border-black/10 dark:border-white/5">
                                  {oldDiff.sfw ? stripHtmlTags(oldDiff.sfw) : <span className="italic opacity-50">Không có dữ liệu SFW</span>}
                                </div>
                              </div>
                              <div className="border-t border-slate-500/10 pt-3">
                                <span className="font-bold text-xs uppercase tracking-wider block mb-1.5 text-rose-500 dark:text-rose-400">
                                  NSFW (Nhạy cảm / Tình ái / Cám dỗ):
                                </span>
                                <div className="whitespace-pre-wrap font-sans bg-black/5 dark:bg-black/20 p-3 rounded-lg border border-black/10 dark:border-white/5">
                                  {oldDiff.nsfw ? stripHtmlTags(oldDiff.nsfw) : <span className="italic opacity-50">Không có dữ liệu NSFW</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Cột Cập Nhật */}
                        {(viewMode === 'updated' || viewMode === 'both') && (
                          <div className={`flex-1 p-5 rounded-2xl border relative focus-within:ring-2 ring-green-500/50 shadow-sm ${isDark ? 'bg-green-900/10 border-green-500/30' : 'bg-green-50 border-green-200'} flex flex-col`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                              <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-green-400' : 'text-green-600'}`}>CẬP NHẬT: {CODEX_FIELD_LABELS[key] || key}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                <button 
                                  onClick={() => {
                                    handleWorldDataFieldChange('difficulty', {
                                      sfw: oldDiff.sfw ? oldDiff.sfw + '\n\n' + newDiff.sfw : newDiff.sfw,
                                      nsfw: oldDiff.nsfw ? oldDiff.nsfw + '\n\n' + newDiff.nsfw : newDiff.nsfw
                                    });
                                  }} 
                                  className="text-[10px] bg-blue-500/10 text-blue-500 dark:text-blue-400 font-bold px-3 py-1.5 rounded hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-1"
                                  title="Nối thêm đoạn văn mới vào cuối đoạn văn cũ"
                                >
                                  <Plus size={12} /> NỐI THÊM
                                </button>
                                <button 
                                  onClick={() => handleRemoveWorldDataField(key)} 
                                  className="text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 font-bold px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
                                >
                                  <Trash2 size={12} /> XÓA
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col gap-4 w-full">
                              <div>
                                <span className="font-bold text-xs uppercase tracking-wider block mb-1.5 text-amber-500 dark:text-amber-400">
                                  SFW (An toàn / Sinh tồn / Chiến đấu):
                                </span>
                                <AutoResizeTextarea 
                                  value={newDiff.sfw}
                                  onChange={(e) => handleWorldDataFieldChange('difficulty', { ...newDiff, sfw: e.target.value })}
                                  className={`w-full min-h-[80px] text-sm outline-none bg-transparent whitespace-pre-wrap leading-relaxed ${isDark ? 'text-white' : 'text-slate-700 bg-white border border-green-200 p-3 rounded-lg shadow-inner'}`}
                                  placeholder="Mô tả độ khó SFW..."
                                />
                                <DiffPreview oldVal={oldDiff.sfw} newVal={newDiff.sfw} isDark={isDark} />
                              </div>

                              <div className="border-t border-slate-500/10 pt-3">
                                <span className="font-bold text-xs uppercase tracking-wider block mb-1.5 text-rose-500 dark:text-rose-400">
                                  NSFW (Nhạy cảm / Tình ái / Cám dỗ):
                                </span>
                                <AutoResizeTextarea 
                                  value={newDiff.nsfw}
                                  onChange={(e) => handleWorldDataFieldChange('difficulty', { ...newDiff, nsfw: e.target.value })}
                                  className={`w-full min-h-[80px] text-sm outline-none bg-transparent whitespace-pre-wrap leading-relaxed ${isDark ? 'text-white' : 'text-slate-700 bg-white border border-green-200 p-3 rounded-lg shadow-inner'}`}
                                  placeholder="Mô tả độ khó NSFW..."
                                />
                                <DiffPreview oldVal={oldDiff.nsfw} newVal={newDiff.nsfw} isDark={isDark} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={key} className={`flex flex-col md:flex-row gap-6 ${viewMode !== 'both' ? 'md:flex-col' : ''}`}>
                      {/* Cột Gốc */}
                      {(viewMode === 'original' || viewMode === 'both') && (
                        <div className={`flex-1 p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-black/20 border-white/10' : `border-black/10 ${theme.sidebarClass}`} flex flex-col`}>
                          <span className={`block text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>BẢN GỐC: {CODEX_FIELD_LABELS[key] || key}</span>
                          <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed">
                            {oldVal ? stripHtmlTags(oldVal) : <span className="italic opacity-50">Không có dữ liệu</span>}
                          </div>
                        </div>
                      )}

                      {/* Cột Cập Nhật */}
                      {(viewMode === 'updated' || viewMode === 'both') && (
                        <div className={`flex-1 p-5 rounded-2xl border relative focus-within:ring-2 ring-green-500/50 shadow-sm ${isDark ? 'bg-green-900/10 border-green-500/30' : 'bg-green-50 border-green-200'} flex flex-col`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                            <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-green-400' : 'text-green-600'}`}>CẬP NHẬT: {CODEX_FIELD_LABELS[key] || key}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              {typeof oldVal === 'string' && typeof val === 'string' && (
                                <button 
                                  onClick={() => handleWorldDataFieldChange(key, oldVal ? oldVal + '\n\n' + val : val)} 
                                  className="text-[10px] bg-blue-500/10 text-blue-500 dark:text-blue-400 font-bold px-3 py-1.5 rounded hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-1"
                                  title="Nối thêm đoạn văn mới vào cuối đoạn văn cũ"
                                >
                                  <Plus size={12} /> NỐI THÊM
                                </button>
                              )}
                              <button 
                                onClick={() => handleRemoveWorldDataField(key)} 
                                className="text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 font-bold px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={12} /> XÓA
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col gap-2 w-full">
                            <AutoResizeTextarea 
                              value={typeof val === 'object' && val !== null ? JSON.stringify(val, null, 2) : (val as string || '')}
                              onChange={(e) => handleWorldDataFieldChange(key, e.target.value)}
                              className={`w-full min-h-[120px] text-sm outline-none bg-transparent whitespace-pre-wrap leading-relaxed ${isDark ? 'text-white' : 'text-slate-700 bg-white border border-green-200 p-3 rounded-lg shadow-inner'}`}
                            />
                            <DiffPreview oldVal={oldVal} newVal={val} isDark={isDark} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Phần LOCATIONS */}
            {hasLocationsUpdates && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b pb-2 border-slate-500/10 mt-4">
                  <MapPin className="text-sky-500" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider opacity-80">Địa Điểm Mới / Cập Nhật (Locations)</h3>
                </div>
                {pending.worldDetails.locations.map((item: any, idx: number) => {
                  const oldItem = currentLocations.find((loc: any) => loc.name === item.name) || {};
                  if (JSON.stringify(item) === JSON.stringify(oldItem)) return null;
                  return (
                    <div key={`loc-${idx}`} className={`flex flex-col md:flex-row gap-6 ${viewMode !== 'both' ? 'md:flex-col' : ''}`}>
                      {/* Cột Gốc */}
                      {(viewMode === 'original' || viewMode === 'both') && (
                        <div className={`flex-1 p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-black/20 border-white/10' : `border-black/10 ${theme.sidebarClass}`} flex flex-col`}>
                          <span className={`block text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>BẢN GỐC: {item.name}</span>
                          <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed">
                            {oldItem.description ? (
                              <div>
                                <div className="font-bold mb-1">Tên: {oldItem.name}</div>
                                <div>Mô tả: {stripHtmlTags(oldItem.description)}</div>
                              </div>
                            ) : (
                              <span className="italic opacity-50">Địa điểm mới, chưa có trong Codex</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cột Cập Nhật */}
                      {(viewMode === 'updated' || viewMode === 'both') && (
                        <div className={`flex-1 p-5 rounded-2xl border relative focus-within:ring-2 ring-green-500/50 shadow-sm ${isDark ? 'bg-green-900/10 border-green-500/30' : 'bg-green-50 border-green-200'} flex flex-col`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                            <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-green-400' : 'text-green-600'}`}>CẬP NHẬT: Địa điểm #{idx + 1}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button 
                                onClick={() => handleRemoveLocation(idx, item.name)} 
                                className="text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 font-bold px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={12} /> XÓA
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col gap-3 w-full">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase tracking-wider opacity-60">Tên địa điểm</span>
                              <input 
                                type="text"
                                value={typeof item.name === 'object' && item.name !== null ? JSON.stringify(item.name) : (item.name || '')}
                                onChange={(e) => handleLocationFieldChange(idx, 'name', e.target.value)}
                                className={`w-full text-sm font-bold outline-none bg-transparent ${isDark ? 'text-white border-b border-white/10 focus:border-green-500/50' : 'text-slate-800 bg-white border border-green-200 px-3 py-1.5 rounded'}`}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase tracking-wider opacity-60">Mô tả chi tiết</span>
                              <AutoResizeTextarea 
                                value={typeof item.description === 'object' && item.description !== null ? JSON.stringify(item.description, null, 2) : (item.description || '')}
                                onChange={(e) => handleLocationFieldChange(idx, 'description', e.target.value)}
                                className={`w-full min-h-[80px] text-sm outline-none bg-transparent whitespace-pre-wrap leading-relaxed ${isDark ? 'text-white' : 'text-slate-700 bg-white border border-green-200 p-3 rounded-lg shadow-inner'}`}
                              />
                            </div>
                            <DiffPreview oldVal={oldItem.description} newVal={item.description} isDark={isDark} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Phần PLACES */}
            {hasPlacesUpdates && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b pb-2 border-slate-500/10 mt-4">
                  <Globe className="text-amber-500" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider opacity-80">Ghi Chú Địa Điểm Khác (Places)</h3>
                </div>
                <div className={`flex flex-col md:flex-row gap-6 ${viewMode !== 'both' ? 'md:flex-col' : ''}`}>
                  {/* Cột Gốc */}
                  {(viewMode === 'original' || viewMode === 'both') && (
                    <div className={`flex-1 p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-black/20 border-white/10' : `border-black/10 ${theme.sidebarClass}`} flex flex-col`}>
                      <span className={`block text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>BẢN GỐC: Places</span>
                      <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed">
                        {currentWorldDetails.places ? stripHtmlTags(currentWorldDetails.places) : <span className="italic opacity-50">Không có dữ liệu</span>}
                      </div>
                    </div>
                  )}

                  {/* Cột Cập Nhật */}
                  {(viewMode === 'updated' || viewMode === 'both') && (
                    <div className={`flex-1 p-5 rounded-2xl border relative focus-within:ring-2 ring-green-500/50 shadow-sm ${isDark ? 'bg-green-900/10 border-green-500/30' : 'bg-green-50 border-green-200'} flex flex-col`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-green-400' : 'text-green-600'}`}>CẬP NHẬT: Places</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button 
                            onClick={handleRemovePlaces} 
                            className="text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 font-bold px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={12} /> XÓA
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-2 w-full">
                        <AutoResizeTextarea 
                          value={typeof pending.worldDetails.places === 'object' && pending.worldDetails.places !== null ? JSON.stringify(pending.worldDetails.places, null, 2) : (pending.worldDetails.places || '')}
                          onChange={(e) => handlePlacesChange(e.target.value)}
                          className={`w-full min-h-[120px] text-sm outline-none bg-transparent whitespace-pre-wrap leading-relaxed ${isDark ? 'text-white' : 'text-slate-700 bg-white border border-green-200 p-3 rounded-lg shadow-inner'}`}
                        />
                        <DiffPreview oldVal={currentWorldDetails.places} newVal={pending.worldDetails.places} isDark={isDark} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Phần CREATIVE RULES */}
            {hasCreativeRulesUpdates && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b pb-2 border-slate-500/10 mt-4">
                  <BrainCircuit className="text-purple-500" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider opacity-80">Quy Tắc Sáng Tạo (Creative Rules)</h3>
                </div>
                <div className={`flex flex-col md:flex-row gap-6 ${viewMode !== 'both' ? 'md:flex-col' : ''}`}>
                  {/* Cột Gốc */}
                  {(viewMode === 'original' || viewMode === 'both') && (
                    <div className={`flex-1 p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-black/20 border-white/10' : `border-black/10 ${theme.sidebarClass}`} flex flex-col`}>
                      <span className={`block text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>BẢN GỐC: Creative Rules</span>
                      <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed">
                        {currentCreativeRules ? stripHtmlTags(currentCreativeRules) : <span className="italic opacity-50">Không có dữ liệu</span>}
                      </div>
                    </div>
                  )}

                  {/* Cột Cập Nhật */}
                  {(viewMode === 'updated' || viewMode === 'both') && (
                    <div className={`flex-1 p-5 rounded-2xl border relative focus-within:ring-2 ring-green-500/50 shadow-sm ${isDark ? 'bg-green-900/10 border-green-500/30' : 'bg-green-50 border-green-200'} flex flex-col`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-green-400' : 'text-green-600'}`}>CẬP NHẬT: Creative Rules</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button 
                            onClick={handleRemoveCreativeRules} 
                            className="text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 font-bold px-3 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={12} /> XÓA
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-2 w-full">
                        <AutoResizeTextarea 
                          value={typeof pending.creativeRules === 'object' && pending.creativeRules !== null ? JSON.stringify(pending.creativeRules, null, 2) : (pending.creativeRules || '')}
                          onChange={(e) => handleCreativeRulesChange(e.target.value)}
                          className={`w-full min-h-[120px] text-sm outline-none bg-transparent whitespace-pre-wrap leading-relaxed ${isDark ? 'text-white' : 'text-slate-700 bg-white border border-green-200 p-3 rounded-lg shadow-inner'}`}
                        />
                        <DiffPreview oldVal={currentCreativeRules} newVal={pending.creativeRules} isDark={isDark} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trạng thái không có thay đổi nào */}
            {totalFieldsInPending === 0 && (
              <div className="text-center italic opacity-50 p-8 text-lg">Không còn thay đổi nào trong Codex để cập nhật.</div>
            )}

          </div>
        </div>

        {/* Footer tương tự NPC */}
        <div className={`p-4 md:p-6 shrink-0 flex items-center justify-between border-t ${
          isDark ? 'border-slate-800 bg-slate-950/30' : 'border-amber-100 bg-[#FFFDF9]'
        }`}>
          <button
            onClick={handleDiscardAll}
            className={`px-5 py-3 rounded-xl cursor-pointer text-xs font-bold tracking-wide flex items-center gap-1.5 transition-all ${
              isDark 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white'
            }`}
          >
            <Trash2 size={15} /> XÓA TẤT CẢ
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`px-5 py-3 rounded-xl cursor-pointer text-xs font-bold transition-colors ${
                isDark ? 'bg-white/5 hover:bg-white/10 text-white/80' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ĐÓNG
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
