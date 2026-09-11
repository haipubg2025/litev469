import React, { useEffect, useState } from "react";
import { isRelationshipField, ensureUniqueNpcIds, sanitizeNpcId } from "../utils/relationshipUtils";
import { motion } from "motion/react";
import {
  User,
  X,
  Shield,
  Activity,
  Fingerprint,
  BookOpen,
  Star,
  Info,
  Crown,
  Key,
  Edit3,
  Save,
  Flame,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  ArrowDownToLine,
  ArrowUpToLine,
  Target,
  MessageSquareQuote,
  SlidersHorizontal,
  Plus,
  Trash2,
  HelpCircle,
  LayoutTemplate,
  Sparkles, Coins,
  Wand2,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { DEV_IMAGES } from "../constants/devImages";
import LazyImage from "./LazyImage";
import { toast } from "../utils/toast";
import GalleryModal from "./GalleryModal";
import { compressImage } from "../utils/imageCompression";
import { storageService } from "../services/storageService";
import { aiService } from "../services/aiService";
import NpcUpdateModal from "./NpcUpdateModal";
import { stripHtmlTags } from "../utils/htmlSanitizer";
import { getActiveCustomFields } from "../utils/conditionalFields";

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

interface CharacterModalProps {
  type: "mc" | "npc";
  npcIndex?: number;
  onClose: () => void;
}

interface EditableFieldProps {
  label: string;
  field: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
  labelSuffix?: React.ReactNode;
  description?: string;
}

function EditableField({
  label,
  field,
  value,
  isEditing,
  onChange,
  multiline = false,
  className = "",
  labelSuffix,
  description,
}: EditableFieldProps) {
  const theme = useStore((state) => state.theme);
  const isDark = theme.group === "Dark";
  
  const getSafeValue = (val: any) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (Array.isArray(val)) {
      if (val.length === 0) return "";
      // Nếu là mảng các chuỗi, ghép lại bằng dấu xuống dòng cho đẹp
      if (val.every((v) => typeof v === "string")) {
        return val.join("\n");
      }
    }
    if (typeof val === "object" && val !== null) {
      return JSON.stringify(val, null, 2);
    }
    return String(val);
  };

  const safeValue = getSafeValue(value);
  const [localValue, setLocalValue] = React.useState(safeValue);

  React.useEffect(() => {
    setLocalValue(getSafeValue(value));
  }, [value]);

  return (
    <div 
      id={`char-field-container-${field}`}
      data-field-key={field}
      data-ai-field-name={field}
      className={`flex flex-col gap-1 ${className}`}
    >
      {label && (
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] uppercase tracking-widest ${isDark ? "text-white/40" : `${theme.textSecondary} font-bold`}`}
          >
            {label}
            <span className="sr-only" aria-hidden="true" data-ai-field-id={field}> [Key: {field}]</span>
          </span>
          {labelSuffix}
        </div>
      )}
      {description && isEditing && (
        <p className={`text-[11px] italic mb-0.5 ${isDark ? "text-white/40" : "text-black/50"}`}>
          💡 Yêu cầu: {description}
        </p>
      )}
      {isEditing ? (
        multiline ? (
          <textarea
            id={`char-input-${field}`}
            data-field-key={field}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
              if (localValue !== safeValue) onChange(localValue);
            }}
            className={`w-full border rounded-lg p-2 text-sm outline-none resize-y min-h-[80px] ${
              isDark
                ? "bg-black/40 border-white/20 text-white/90 focus:border-blue-500/50"
                : "bg-white border-slate-300 text-slate-900 focus:border-blue-600"
            }`}
          />
        ) : (
          <input
            id={`char-input-${field}`}
            data-field-key={field}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
              if (localValue !== safeValue) onChange(localValue);
            }}
            className={`w-full border rounded-lg p-2 text-sm outline-none ${
              isDark
                ? "bg-black/40 border-white/20 text-white/90 focus:border-blue-500/50"
                : "bg-white border-slate-300 text-slate-900 focus:border-blue-600"
            }`}
          />
        )
      ) : (
        <div
          id={`char-display-${field}`}
          data-field-key={field}
          className={`p-3 rounded-xl border text-sm transition-all ${
            isDark
              ? "bg-white/5 border-white/5 text-white/90"
              : "bg-slate-50/50 border-slate-200/80 text-slate-800"
          }`}
        >
          <span
            className={`${multiline ? "leading-relaxed whitespace-pre-wrap" : "font-medium"} ${
              !safeValue && "italic opacity-40 text-xs"
            }`}
          >
            {safeValue
              ? stripHtmlTags(safeValue)
              : "Không có dữ liệu."}
          </span>
        </div>
      )}
    </div>
  );
}

function EditableArrayField({
  label,
  description,
  items,
  isEditing,
  onChange,
  itemLabel = "Item",
}: {
  label: string;
  description?: string;
  items: Array<any>;
  isEditing: boolean;
  onChange: (val: Array<any>) => void;
  itemLabel?: string;
}) {
  const theme = useStore((state) => state.theme);
  const isDark = theme.group === "Dark";
  const arr = Array.isArray(items) ? items : [];

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span
          className={`text-[10px] uppercase tracking-widest ${isDark ? "text-white/40" : `${theme.textSecondary} font-bold`}`}
        >
          {label}
        </span>
      )}
      {description && (
        <p className={`text-[11px] leading-relaxed ${isDark ? "text-white/50" : "text-slate-500"} -mt-1 mb-1`}>
          {description}
        </p>
      )}
      {isEditing ? (
        <div className="space-y-3">
          {arr.map((item, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border flex flex-col gap-2 ${isDark ? "bg-black/40 border-white/20" : "bg-white border-slate-300"}`}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Tên ${itemLabel}`}
                  value={item.name || ""}
                  onChange={(e) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], name: e.target.value };
                    onChange(newArr);
                  }}
                  className={`w-full flex-1 border rounded-md px-2 py-1.5 text-xs outline-none ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
                />
                <input
                  type="text"
                  placeholder="Loại"
                  value={item.type || ""}
                  onChange={(e) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], type: e.target.value };
                    onChange(newArr);
                  }}
                  className={`w-full flex-1 border rounded-md px-2 py-1.5 text-xs outline-none ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
                />
                <input
                  type="text"
                  placeholder="Cấp độ"
                  value={item.level || ""}
                  onChange={(e) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], level: e.target.value };
                    onChange(newArr);
                  }}
                  className={`w-full flex-[0.8] border rounded-md px-2 py-1.5 text-xs outline-none ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
                />
              </div>
              <textarea
                placeholder="Mô tả chi tiết"
                value={item.description || ""}
                onChange={(e) => {
                  const newArr = [...arr];
                  newArr[i] = { ...newArr[i], description: e.target.value };
                  onChange(newArr);
                }}
                className={`w-full border rounded-md px-2 py-1.5 text-xs outline-none resize-y min-h-[50px] ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
              />
              <button
                onClick={() => {
                  const newArr = arr.filter((_, idx) => idx !== i);
                  onChange(newArr);
                }}
                className="self-end px-2 py-1 text-[10px] uppercase font-bold rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
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
            className={`text-[11px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "border-white/20 hover:bg-white/10 text-white/80" : "border-slate-300 hover:bg-slate-100 text-slate-600"} cursor-pointer`}
          >
            + Thêm {itemLabel}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {arr.length === 0 && (
            <span
              className={`text-sm italic opacity-50 ${isDark ? "text-white" : "text-slate-600"}`}
            >
              Chưa có thông tin.
            </span>
          )}
          {arr.map((item, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${isDark ? "bg-white/5 border-white/5" : `border-black/10 ${theme.sidebarClass}`}`}
            >
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <h4
                  className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  {item.name || "Không tên"}
                </h4>
                {item.type && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isDark ? "bg-white/10 text-teal-300" : "bg-teal-100 text-teal-800 font-bold"}`}
                  >
                    {item.type}
                  </span>
                )}
                {item.level && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-800 font-bold"}`}
                  >
                    {item.level}
                  </span>
                )}
              </div>
              {item.description && (
                <p
                  className={`text-sm leading-relaxed whitespace-pre-wrap opacity-80 ${isDark ? "text-white" : "text-slate-700"}`}
                >
                  {typeof item.description === "string"
                    ? stripHtmlTags(item.description)
                    : stripHtmlTags(item.description)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableGenericArrayField({
  label,
  description,
  subFields,
  items,
  isEditing,
  onChange,
}: {
  label: string;
  description?: string;
  subFields?: Array<any>;
  items: any;
  isEditing: boolean;
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

  // Bộ đệm trạng thái cục bộ (Buffer) nhằm chống giật lag tuyệt đối khi gõ chữ trên PC/Mobile
  const [localArr, setLocalArr] = React.useState(parsedArr);

  // Đồng bộ lại dữ liệu khi danh sách mục hoặc store thay đổi thực sự
  React.useEffect(() => {
    setLocalArr(parsedArr);
  }, [parsedArr]);

  // Hàm thay đổi trạng thái cục bộ tức thời (tốc độ dưới 1ms)
  const handleLocalChange = (index: number, key: string, value: string) => {
    const updated = [...localArr];
    updated[index] = {
      ...updated[index],
      [key]: value,
    };
    setLocalArr(updated);
  };

  // Chỉ đồng bộ lên Store lớn khi rời ô nhập liệu (onBlur) giúp giảm 99% tải re-render dư thừa
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
    <div className="flex flex-col gap-3 w-full md:col-span-2">
      {label && (
        <span
          className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-white/40" : `${theme.textSecondary} font-black opacity-80`}`}
        >
          {label} (MẢNG)
        </span>
      )}
      {description && (
        <p className={`text-[11px] leading-relaxed ${isDark ? "text-white/50" : "text-slate-600 font-medium"} -mt-1.5 mb-1`}>
          💡 {description}
        </p>
      )}

      {isEditing ? (
        <div className="space-y-4">
          {/* List items */}
          <div className="space-y-3">
            {localArr.map((item, i) => {
              return (
                <div
                  key={i}
                  className={`p-4 rounded-xl border flex flex-col gap-4 transition-all shadow-sm ${
                    isDark ? "bg-black/30 border-white/10 hover:border-white/20" : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-dashed border-black/10 dark:border-white/10">
                    <span className={`text-[10px] uppercase font-black tracking-wider ${isDark ? "text-white/60" : "text-slate-500"}`}>
                      🎯 Mục #{i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(i)}
                      className="px-2.5 py-1 text-[10px] uppercase font-black rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                    >
                      Xóa mục
                    </button>
                  </div>

                  {/* Grid hiển thị động tất cả các trường con subFields */}
                  <div className={`grid grid-cols-1 ${keysToUse.length <= 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
                    {keysToUse.map((key, kIdx) => {
                      const isFirst = kIdx === 0;
                      return (
                        <div key={kIdx} className={`flex flex-col gap-1.5 ${keysToUse.length === 1 ? "md:col-span-3" : ""}`}>
                          <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            kIdx % 3 === 0 
                              ? (isDark ? "text-purple-400" : "text-purple-700 font-black")
                              : kIdx % 3 === 1 
                              ? (isDark ? "text-blue-400" : "text-blue-700 font-black")
                              : (isDark ? "text-emerald-400" : "text-emerald-700 font-black")
                          }`}>
                            <span>{kIdx + 1}. {key}</span>
                          </label>
                          {isFirst && keysToUse.length > 1 ? (
                            <input
                              type="text"
                              placeholder={`Nhập ${key.toLowerCase()}...`}
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
                              placeholder={`Nhập ${key.toLowerCase()}...`}
                              value={item[key] || ""}
                              onChange={(e) => handleLocalChange(i, key, e.target.value)}
                              onBlur={handleSyncToStore}
                              className={`w-full border rounded-lg px-3 py-2 text-xs outline-none resize-none min-h-[46px] transition-all ${
                                isDark
                                  ? "bg-black/60 border-white/20 text-white focus:border-blue-500"
                                  : "border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
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
              ➕ Thêm mục mới
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {localArr.length === 0 ? (
            <span className={`text-sm italic opacity-50 ${isDark ? "text-white" : "text-slate-600"}`}>
              Chưa có dữ liệu mảng.
            </span>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {localArr.map((item, i) => {
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border transition-all shadow-sm ${
                      isDark ? "bg-white/5 border-white/5 hover:bg-white/[0.08]" : "border-slate-200/80 bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    <div className={`grid grid-cols-1 ${keysToUse.length <= 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
                      {keysToUse.map((key, kIdx) => (
                        <div key={kIdx} className="flex flex-col text-xs">
                          <span className={`font-black opacity-80 uppercase text-[9px] tracking-wider ${
                            kIdx % 3 === 0
                              ? (isDark ? "text-purple-400" : "text-purple-700")
                              : kIdx % 3 === 1
                              ? (isDark ? "text-blue-400" : "text-blue-700")
                              : (isDark ? "text-emerald-400" : "text-emerald-700")
                          }`}>
                            {key}
                          </span>
                          <p className={`mt-1.5 leading-relaxed ${kIdx === 0 ? "font-bold" : "font-medium"} ${isDark ? "text-white/90" : "text-slate-800"}`}>
                            {item[key] || <span className="opacity-40 italic font-normal">Chưa thiết lập</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditableRelationshipArrayField({
  label,
  items,
  isEditing,
  onChange,
}: {
  label: string;
  items: Array<any>;
  isEditing: boolean;
  onChange: (val: Array<any>) => void;
}) {
  const theme = useStore((state) => state.theme);
  const isDark = theme.group === "Dark";
  const arr = Array.isArray(items) ? items : [];

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span
          className={`text-[10px] uppercase tracking-widest ${isDark ? "text-white/40" : `${theme.textSecondary} font-bold`}`}
        >
          {label}
        </span>
      )}
      {isEditing ? (
        <div className="space-y-3">
          {arr.map((item, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border flex flex-col gap-2 ${isDark ? "bg-black/40 border-white/20" : "bg-white border-slate-300"}`}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Họ và tên nhân vật"
                  value={item.name || ""}
                  onChange={(e) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], name: e.target.value };
                    onChange(newArr);
                  }}
                  className={`w-full flex-[1.5] border rounded-md px-2 py-1.5 text-xs outline-none ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
                />
                <input
                  type="text"
                  placeholder="Quan hệ"
                  value={item.relation || ""}
                  onChange={(e) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], relation: e.target.value };
                    onChange(newArr);
                  }}
                  className={`w-full flex-1 border rounded-md px-2 py-1.5 text-xs outline-none ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
                />
                <input
                  type="text"
                  placeholder="Tình trạng"
                  value={item.status || ""}
                  onChange={(e) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], status: e.target.value };
                    onChange(newArr);
                  }}
                  className={`w-full flex-[0.8] border rounded-md px-2 py-1.5 text-xs outline-none ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
                />
              </div>
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder="Ấn tượng và suy nghĩ đối với người này..."
                  value={item.impression || ""}
                  onChange={(e) => {
                    const newArr = [...arr];
                    newArr[i] = { ...newArr[i], impression: e.target.value };
                    onChange(newArr);
                  }}
                  className={`w-full border rounded-md px-2 py-1.5 text-xs outline-none resize-y min-h-[50px] ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cách xưng hô với họ (cách nhau bởi phẩy)"
                    value={
                      Array.isArray(item.termsOfAddress)
                        ? item.termsOfAddress.join(",")
                        : item.termsOfAddress || ""
                    }
                    onChange={(e) => {
                      const newArr = [...arr];
                      newArr[i] = {
                        ...newArr[i],
                        termsOfAddress: e.target.value.split(","),
                      };
                      onChange(newArr);
                    }}
                    onBlur={(e) => {
                      const newArr = [...arr];
                      newArr[i] = {
                        ...newArr[i],
                        termsOfAddress: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter((s) => s),
                      };
                      onChange(newArr);
                    }}
                    className={`w-full flex-1 border rounded-md px-2 py-1.5 text-xs outline-none ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
                  />
                  <input
                    type="text"
                    placeholder="Cách tự xưng bản thân (cách nhau bởi phẩy)"
                    value={
                      Array.isArray(item.selfAppellation)
                        ? item.selfAppellation.join(",")
                        : item.selfAppellation || ""
                    }
                    onChange={(e) => {
                      const newArr = [...arr];
                      newArr[i] = {
                        ...newArr[i],
                        selfAppellation: e.target.value.split(","),
                      };
                      onChange(newArr);
                    }}
                    onBlur={(e) => {
                      const newArr = [...arr];
                      newArr[i] = {
                        ...newArr[i],
                        selfAppellation: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter((s) => s),
                      };
                      onChange(newArr);
                    }}
                    className={`w-full flex-1 border rounded-md px-2 py-1.5 text-xs outline-none ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
                  />
                </div>
              </div>
              <textarea
                placeholder="Mô tả chi tiết"
                value={item.description || ""}
                onChange={(e) => {
                  const newArr = [...arr];
                  newArr[i] = { ...newArr[i], description: e.target.value };
                  onChange(newArr);
                }}
                className={`w-full border rounded-md px-2 py-1.5 text-xs outline-none resize-y min-h-[50px] ${isDark ? "bg-black/60 border-white/20 text-white/90 focus:border-blue-500/50" : `border-black/10 ${theme.bgClass} ${theme.textPrimary}`}`}
              />
              <button
                onClick={() => {
                  const newArr = arr.filter((_, idx) => idx !== i);
                  onChange(newArr);
                }}
                className="self-end px-2 py-1 text-[10px] uppercase font-bold rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
              >
                Xóa
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newArr = [
                ...arr,
                { name: "", description: "", relation: "", status: "", impression: "" },
              ];
              onChange(newArr);
            }}
            className={`text-[11px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "border-white/20 hover:bg-white/10 text-white/80" : "border-slate-300 hover:bg-slate-100 text-slate-600"} cursor-pointer`}
          >
            + Thêm Quan Hệ
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {arr.length === 0 && (
            <span
              className={`text-sm italic opacity-50 ${isDark ? "text-white" : "text-slate-600"}`}
            >
              Chưa có thông tin.
            </span>
          )}
          {arr.map((item, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${isDark ? "bg-white/5 border-white/5" : `border-black/10 ${theme.sidebarClass}`}`}
            >
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <h4
                  className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  {item.name || "Không tên"}
                </h4>
                {item.relation && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isDark ? "bg-white/10 text-teal-300" : "bg-teal-100 text-teal-800 font-bold"}`}
                  >
                    {item.relation}
                  </span>
                )}
                {item.status && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${isDark ? "bg-pink-500/20 text-pink-300" : "bg-pink-100 text-pink-800 font-bold"}`}
                  >
                    {item.status}
                  </span>
                )}
              </div>
              {item.impression && (
                <div className={`my-1.5 p-2.5 rounded-lg border text-xs leading-relaxed ${isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-200/90" : "bg-amber-50 border-amber-200 text-amber-950"}`}>
                  <span className={`font-bold flex items-center gap-1 mb-1 text-[10px] uppercase tracking-wider ${isDark ? "text-amber-400" : "text-amber-800"}`}>
                    <MessageSquareQuote size={12} /> Ấn tượng & Suy nghĩ:
                  </span>
                  <p className="whitespace-pre-wrap font-sans">
                    {typeof item.impression === "string" ? stripHtmlTags(item.impression) : stripHtmlTags(item.impression)}
                  </p>
                </div>
              )}
              {((item.termsOfAddress && item.termsOfAddress.length > 0) ||
                (item.selfAppellation && item.selfAppellation.length > 0)) && (
                <div className="mb-2 flex flex-col gap-1">
                  {item.termsOfAddress && item.termsOfAddress.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span
                        className={`text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Gọi họ là:
                      </span>
                      {item.termsOfAddress.map((term: string, idx: number) => (
                        <span
                          key={idx}
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border ${isDark ? "border-white/20 text-white/60 bg-white/5" : "border-slate-200 text-slate-600 bg-slate-100"}`}
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.selfAppellation && item.selfAppellation.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span
                        className={`text-[10px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Tự xưng là:
                      </span>
                      {item.selfAppellation.map((term: string, idx: number) => (
                        <span
                          key={idx}
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border ${isDark ? "border-white/20 text-white/60 bg-white/5" : "border-slate-200 text-slate-600 bg-slate-100"}`}
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {item.description && (
                <p
                  className={`text-sm leading-relaxed whitespace-pre-wrap opacity-80 mt-1 ${isDark ? "text-white" : "text-slate-700"}`}
                >
                  {typeof item.description === "string"
                    ? stripHtmlTags(item.description)
                    : stripHtmlTags(item.description)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const InventoryItemRender = ({ item, idx, isDark }: { item: any, idx: number, isDark: boolean }) => {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div
      key={`char-item-${item.id || ""}-${idx}`}
      className={`p-3 rounded-xl flex items-start gap-3 transition-transform cursor-pointer ${isDark ? "bg-white/5 border border-white/5 hover:bg-white/10" : "bg-white border border-slate-200 shadow-sm hover:shadow-md"}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div
        className={`min-h-8 min-w-8 py-1 px-2 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600"}`}
      >
        <span className="font-mono font-black text-center whitespace-nowrap">
          {typeof item.quantity === 'number' ? item.quantity.toLocaleString('vi-VN') : item.quantity}
        </span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center min-h-8">
        <h4
          className={`text-sm font-bold break-words whitespace-normal ${isDark ? "text-white" : "text-slate-900"}`}
        >
          {item.name}
        </h4>
        {expanded && item.description && (
          <p
            className={`text-xs mt-1.5 leading-relaxed ${isDark ? "text-white/60" : "text-slate-500"}`}
          >
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default function CharacterModal({
  type,
  npcIndex,
  onClose,
}: CharacterModalProps) {
  const showTitles = useStore((state) => state.showTitles);
  const setShowTitles = useStore((state) => state.setShowTitles);
  const autoUpdateMc = useStore((state) => state.autoUpdateMc);
  const setAutoUpdateMc = useStore((state) => state.setAutoUpdateMc);
  const autoUpdateNpc = useStore((state) => state.autoUpdateNpc);
  const setAutoUpdateNpc = useStore((state) => state.setAutoUpdateNpc);
  const gameData = useStore((state) => state.gameData);
  const setGameData = useStore((state) => state.setGameData);
  const theme = useStore((state) => state.theme);
  const isDark = theme.group === "Dark";
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"chung" | "tui">("chung");
  const [showAvatarSelect, setShowAvatarSelect] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");
  const [activeVersion, setActiveVersion] = useState<"1" | "2">("2");
  const [showConfirmUpdateModal, setShowConfirmUpdateModal] = useState(false);
  const [isAppearanceCollapsed, setIsAppearanceCollapsed] = useState(() => {
    return localStorage.getItem("hideNpcAppearance") === "true";
  });
  const [showTemplateConfigModal, setShowTemplateConfigModal] = useState(false);
  const [tempTemplateMode, setTempTemplateMode] = useState<"default" | "custom">("default");
  const [tempCustomFields, setTempCustomFields] = useState<any[]>([]);
  const [tempDisableDefaultNpcRelationships, setTempDisableDefaultNpcRelationships] = useState<boolean>(false);
  const [templateIdea, setTemplateIdea] = useState("");
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isFieldsOpen, setIsFieldsOpen] = useState(true);
  const [isGeneratingArrays, setIsGeneratingArrays] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const toggleAppearanceCollapse = () => {
    const newState = !isAppearanceCollapsed;
    setIsAppearanceCollapsed(newState);
    localStorage.setItem("hideNpcAppearance", String(newState));
  };

  const handleDeleteNPC = () => {
    if (!gameData || type !== "npc" || npcIndex === undefined) return;
    const origNpcs = gameData.originalNpcs
      ? gameData.originalNpcs.filter((_: any, idx: number) => idx !== npcIndex)
      : gameData.npcs.filter((_: any, idx: number) => idx !== npcIndex);
    const newNpcs = gameData.npcs.filter(
      (_: any, idx: number) => idx !== npcIndex,
    );
    setGameData({ ...gameData, originalNpcs: origNpcs, npcs: newNpcs });
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setActiveTab("chung");
  }, [type, npcIndex]);

  useEffect(() => {
    if (!gameData) return;

    setEditedData((prev: any) => {
      // Step 1: Resolve the new current source data
      let sourceData: any;
      if (type === "mc") {
        sourceData =
          activeVersion === "1"
            ? gameData.originalMcData || gameData.mcData
            : gameData.mcData;
      } else {
        sourceData =
          activeVersion === "1"
            ? gameData.originalNpcs?.[npcIndex as number] ||
              gameData.npcs[npcIndex as number]
            : gameData.npcs[npcIndex as number];
      }

      if (type === "npc" && sourceData) {
        sourceData = { ...sourceData, id: sanitizeNpcId(sourceData, npcIndex ?? 0) };
      }

      // Làm sạch dữ liệu pendingUpdates trước khi đưa vào state để tránh bị kẹt statusData, status, location, currentLocation
      if (sourceData && sourceData.pendingUpdates) {
        sourceData = JSON.parse(JSON.stringify(sourceData));
        const oldPending = { ...sourceData.pendingUpdates };
        let pendingChanged = false;
        const statusDataKey = Object.keys(oldPending).find(k => k.trim().toLowerCase() === 'statusdata');
        if (statusDataKey) {
          sourceData.statusData = oldPending[statusDataKey];
          delete oldPending[statusDataKey];
          pendingChanged = true;
        }

        const directFieldsLower = ["location", "currentlocation", "status"];
        Object.keys(oldPending).forEach((key) => {
          if (directFieldsLower.includes(key.trim().toLowerCase())) {
            sourceData[key.toLowerCase()] = oldPending[key];
            if (key.trim().toLowerCase() === "currentlocation") {
              sourceData.location = oldPending[key];
            }
            delete oldPending[key];
            pendingChanged = true;
          }
        });

        if (pendingChanged) {
          if (Object.keys(oldPending).length === 0) {
            delete sourceData.pendingUpdates;
          } else {
            sourceData.pendingUpdates = oldPending;
          }
        }
      }

      // Step 2: Initialize if not present or actively changing versions
      if (
        !prev ||
        prev.activeVersionResolved !== activeVersion ||
        prev.typeResolved !== type
      ) {
        return {
          ...sourceData,
          activeVersionResolved: activeVersion,
          typeResolved: type,
        };
      }

      // Step 3: If already initialized, safely sync only the pendingUpdates to prevent overwriting user input
      if (
        JSON.stringify(prev?.pendingUpdates) !==
          JSON.stringify(sourceData?.pendingUpdates)
      ) {
        return { ...prev, pendingUpdates: sourceData?.pendingUpdates };
      }

      return prev;
    });
  }, [gameData, type, npcIndex, activeVersion]);

  // Tự động duyệt cập nhật nếu chế độ AUTO được kích hoạt
  useEffect(() => {
    const isAutoEnabled = type === "mc" ? autoUpdateMc : autoUpdateNpc;
    if (isAutoEnabled && editedData?.pendingUpdates) {
      const pending = editedData.pendingUpdates;
      const filteredKeys = Object.keys(pending).filter(
        k => !['location', 'currentlocation', 'status', 'statusdata'].includes(k.trim().toLowerCase())
      );
      if (filteredKeys.length > 0) {
        const newCharData = JSON.parse(JSON.stringify(editedData));
        filteredKeys.forEach(key => {
          newCharData[key] = pending[key];
          if (!isBuiltInField(key)) {
            if (!newCharData.customData) newCharData.customData = {};
            newCharData.customData[key] = pending[key];
          }
        });
        delete newCharData.pendingUpdates;

        setEditedData(newCharData);
        if (!isEditing && gameData) {
          if (type === "mc") {
            setGameData({ ...gameData, mcData: newCharData });
            toast.success("Tự động duyệt và cập nhật MC thành công!");
          } else {
            const origNpcs = [...(gameData.npcs || [])];
            origNpcs[npcIndex as number] = newCharData;
            setGameData({ ...gameData, npcs: origNpcs });
            toast.success(`Tự động duyệt và cập nhật NPC ${newCharData.name || ""} thành công!`);
          }
        }
      }
    }
  }, [autoUpdateMc, autoUpdateNpc, type, editedData, isEditing, gameData, npcIndex, setGameData]);

  const DEFAULT_MC_FIELDS = [
    { id: "fullName", label: "Họ và tên", type: "input", description: "Họ và tên đầy đủ của nhân vật theo đúng quy chuẩn ngôn ngữ bối cảnh (Ví dụ: 'Nguyễn Thanh Tùng', 'Arthur Pendragon'). Tránh đặt tên nửa mùa hoặc lai tạp phong cách trái bối cảnh. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Bảo toàn dữ liệu cũ nếu phù hợp, bám sát phong cách ngôn ngữ của bối cảnh." },
    { id: "titles", label: "Danh xưng (Tước hiệu)", type: "input", description: "Danh hiệu, tôn hiệu, biệt hiệu xưng tụng hoặc tước vị chính thức (Ví dụ: 'Thánh Nữ Ánh Sáng', 'Đại Trưởng Lão', 'Kiếm Thánh Vô Danh'). Cho phép nhiều danh xưng ngăn cách bằng dấu phẩy, gạch chéo (/), chấm phẩy (;). Để trống nếu chưa có. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Viết danh xưng phù hợp đẳng cấp, uy danh trong giới, để trống nếu chưa có." },
    { id: "occupation", label: "Chức vụ (Nghề nghiệp)", type: "input", description: "Nghề nghiệp, chức vụ xã hội, giai tầng hoặc chức trách thực tế hiện tại (Ví dụ: 'Hiệp Sĩ Hoàng Gia', 'Chủ Quán Rượu', 'Học Viên Ma Pháp Viện'). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Miêu tả chính xác nghề nghiệp/chức vụ tương ứng vị thế xã hội." },
    { id: "gender", label: "Giới tính", type: "input", description: "Giới tính sinh học và bản dạng giới của nhân vật (Nam, Nữ, Phi nhị giới, v.v.). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Xác định rõ giới tính nhân vật." },
    { id: "age", label: "Tuổi tác", type: "input", description: "Tuổi tác thực tế và tuổi diện mạo (Bắt buộc đa dạng hóa độ tuổi từ trẻ em, thiếu niên dưới 18 tuổi đến người trưởng thành, người già. Cho phép ghi kèm mô tả diện mạo như '500 tuổi (trông như thiếu nữ 18 trẻ đẹp)' hoặc 'Thuở sơ khai trường tồn cùng thiên địa' cho thần thánh. Tuân thủ logic huyết thống gia đình hợp lý). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Tính toán logic tuổi tác thực và diện mạo, đảm bảo phù hợp quan hệ huyết thống." },
    { id: "dob", label: "Ngày tháng năm sinh", type: "input", description: "Ngày tháng năm sinh theo lịch bối cảnh hoặc thực tế, kèm cung hoàng đạo nếu bối cảnh hiện đại/fantasy phù hợp. Cho phép mô tả sinh động đối với thần thánh không xác định năm sinh. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Ghi ngày sinh kèm cung hoàng đạo hoặc mô tả phù hợp bối cảnh thế giới." },
    { id: "rank", label: "Cảnh giới / Cấp độ", type: "input", description: "Cảnh giới tu vi, cấp độ thực lực, đẳng cấp mạo hiểm giả hoặc phân hạng sức mạnh theo hệ thống phân bậc của thế giới (Ví dụ: 'Kim Đan Kỳ Sơ Kỳ', 'Ma Pháp Sư Hạng A', 'Level 45'). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Bám sát thang phân cấp sức mạnh của thế giới đã định nghĩa." },
    { id: "height", label: "Chiều cao", type: "input", description: "Chiều cao cơ thể (Ví dụ: '165 cm', '1m78'). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Ghi số đo chiều cao thực tế hợp lý." },
    { id: "weight", label: "Cân nặng", type: "input", description: "Cân nặng cơ thể và thể trạng (Ví dụ: '49 kg', '68 kg - săn chắc'). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Ghi số cân nặng kèm thể trạng tương xứng chiều cao." },
    { id: "measurements", label: "Số đo 3 vòng", type: "input", description: "Quy tắc định dạng bắt buộc: Nữ giới: Bắt buộc đặt số đo 3 vòng và cup ngực trong ngoặc vuông và kết thúc bằng dấu chấm (Ví dụ: '[90-60-90, Cup D]. '), sau đó viết đoạn văn ngắn gọn, trực diện trần trụi về vóc dáng, vú, nhũ hoa, mu, lồn (không lặp lại con số). Nam giới: Viết trực diện miêu tả vóc dáng và dương vật/cu/cặc thực tế. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Tuân thủ chặt chẽ định dạng ngoặc vuông cho nữ hoặc miêu tả trực diện cho nam." },
    { id: "appearance", label: "Miêu tả ngoại hình tổng quan", type: "textarea", description: "Miêu tả ngoại hình khỏa thân toàn diện: Tối thiểu 800 từ, chia 5-6 đoạn lớn (dùng ký tự \\n\\n, cấm thẻ <br>): Đoạn 1 (Khuôn mặt, tóc, cổ, vai), Đoạn 2 (Bầu ngực, nhũ hoa tả trần trụi bạo dạn), Đoạn 3 (Eo, bụng, hông, mông, đùi), Đoạn 4 (Vùng kín mu, âm hộ, cấu trúc lông mu ngẫu nhiên), Đoạn 5 (Làn da, mùi hương, vết bớt/hình xăm). Tuyệt đối không tả trang phục ở trường này. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Viết chi tiết, chia 5-6 đoạn bằng \\n\\n, không tả trang phục ở trường này." },
    { id: "appearanceLite", label: "Miêu tả Rút gọn (Tóm tắt ngoại hình)", type: "textarea", description: "Bản tóm tắt ngoại hình SFW an toàn, thanh lịch (Tối thiểu 300 từ, chia 2-3 đoạn bằng \\n\\n): Miêu tả ít nhất 2 bộ trang phục thường ngày/đặc trưng, kết hợp biểu cảm, ánh nhìn, thần thái và khí chất tổng quan của nhân vật. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Tả trang phục thường ngày, thần thái, phong thái tổng quan SFW." },
    { id: "distinguishingFeatures", label: "Đặc điểm nhận dạng phụ", type: "textarea", description: "Đặc điểm nhận dạng phụ và điểm nhấn ngoại hình (Nốt ruồi duyên, má lúm đồng tiền, vết sẹo danh dự, hình xăm phong ấn, răng khểnh, màu mắt đặc biệt, dị tật hoặc ấn ký kỳ lạ...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Liệt kê các dấu hiệu nhận diện đặc trưng tạo điểm nhấn riêng biệt." },
    { id: "powers", label: "Năng lực / Sức mạnh", type: "textarea", description: "Những thứ thuộc về phi thực tế (như hệ thống hay ma pháp... - các ví dụ để AI hiểu bản chất). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Miêu tả rõ cơ chế, phân loại và uy lực của năng lực siêu nhiên/ma pháp." },
    { id: "skills", label: "Kỹ năng chuyên môn", type: "textarea", description: "Những thứ thuộc về thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để AI hiểu bản chất). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Nêu các kỹ năng thuần thục thực tế trong đời sống hoặc chiến đấu." },
    { id: "personality", label: "Tính cách tổng quan", type: "textarea", description: "Tính cách biểu hiện bề ngoài, thói quen giao tiếp ứng xử thường nhật. Bắt buộc kết hợp miêu tả thói quen ăn mặc trong các hoàn cảnh (đi làm/đi học, dạo phố, ở nhà, khi ngủ). Lồng ghép các nét tính cách đời thường, dung dị (vui vẻ, nóng nảy, ngốc nghếch, lười biếng, chăm chỉ...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Bám sát ý tưởng người chơi, kết hợp thói quen trang phục theo từng hoàn cảnh." },
    { id: "personalityCore", label: "Tính cách cốt lõi (Bản ngã)", type: "textarea", description: "Tính cách cốt lõi và bản ngã sâu kín nhất (Nguyên tắc sống bất biến, tâm lý thật sự bên trong mâu thuẫn hoặc đồng nhất với tính cách bề ngoài). Chống OOC nghiêm ngặt. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Khắc họa chiều sâu nội tâm, nguyên tắc bất di bất dịch của nhân vật." },
    { id: "philosophy", label: "Kim chỉ nam / Lý tưởng", type: "textarea", description: "Kim chỉ nam sống, lý tưởng nhân sinh, tín ngưỡng, đạo đức hoặc phương châm hành động cốt lõi của nhân vật. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Xây dựng lý tưởng sống và chuẩn mực đạo đức riêng biệt." },
    { id: "goal", label: "Mục tiêu tối thượng", type: "textarea", description: "Mục tiêu tối thượng, khát vọng đời người hoặc động lực lớn nhất thúc đẩy mọi quyết định và hành vi của nhân vật. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Nêu rõ khát vọng lớn nhất và mục tiêu ngắn/dài hạn." },
    { id: "likesDislikesFears", label: "Sở thích, ghét, nỗi sợ (SFW)", type: "textarea", description: "Sở thích, những điều ghét bỏ, nỗi sợ hãi trong cuộc sống thường nhật (Ví dụ: Thích hoa, ghét cá, sợ bóng tối). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Liệt kê chi tiết những điều yêu thích, ác cảm và nỗi ám ảnh thường nhật." },
    { id: "likesDislikesFearsNsfw", label: "Sở thích, ghét, nỗi sợ (NSFW)", type: "textarea", description: "Sở thích, ghét, sợ hãi trong chuyện tình dục/NSFW (Ví dụ: Thích bị cắn, ghét bạo lực quá mức...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Miêu tả gu tình dục, điều thích, ghét và ranh giới cấm kỵ trong chuyện phòng the." },
    { id: "background", label: "Nguồn gốc / Xuất thân / Hoàn cảnh", type: "textarea", description: "Nguồn gốc, gia thế xuất thân, biến cố quá khứ và bối cảnh trưởng thành. Tuyệt đối chỉ kể quá khứ đã diễn ra, nghiêm cấm spoil cốt truyện tương lai. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Chỉ kể quá khứ đã xảy ra, không spoil các sự kiện tương lai." },
    { id: "innerSecret", label: "Nội tâm / Suy nghĩ thầm kín / Động cơ ẩn", type: "textarea", description: "Nội tâm thầm kín, bí mật giấu kín chưa từng thổ lộ với ai, điểm yếu chí mạng hoặc toan tính sâu xa trong lòng. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Tiết lộ bí mật sâu kín hoặc điểm yếu tâm lý trọng đại." },
    { id: "loveViews", label: "Quan niệm về tình yêu & tình dục", type: "textarea", description: "Quan niệm về tình yêu đôi lứa, sự chung thủy, mức độ chiếm hữu và ranh giới tình dục/khoái lạc của nhân vật. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Thể hiện góc nhìn về lòng chung thủy, tính chiếm hữu và ranh giới quan hệ." },
    { id: "experience", label: "Trinh tiết và kinh nghiệm NSFW", type: "textarea", description: "Trinh tiết và lịch sử kinh nghiệm tình trường/phòng the thực tế (Trinh nữ thuần khiết, Người từng trải dày dạn kinh nghiệm, Đã từng kết hôn...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Ghi rõ lịch sử tình trường và kinh nghiệm thực tế." },
    { id: "nsfwPersonality", label: "Tính cách khi NSFW", type: "textarea", description: "Bản chất tâm lý và phong cách khi bước vào không gian ân ái/NSFW (Dâm đãng cuồng nhiệt, Thẹn thùng e ấp, Phục tùng tuyệt đối, Thống trị quyến rũ...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Khắc họa phong cách tâm lý đặc trưng trong không gian thân mật." },
    { id: "nsfwReactions", label: "Phản ứng đặc trưng (NSFW)", type: "textarea", description: "Phản ứng cơ thể đặc trưng khi tiếp xúc thân mật/NSFW (Độ nhạy cảm của các điểm G, tiếng rên rỉ, dịch nhờn, biểu cảm gương mặt khi bị kích thích hoặc đạt cực khoái). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Miêu tả các phản ứng sinh học, độ nhạy cảm và biểu cảm kích thích." },
    { id: "inventory", label: "Hành trang / Vật phẩm", type: "textarea", description: "Các vật phẩm, vũ khí, tài sản hoặc bảo vật quan trọng mang theo người. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Liệt kê vũ khí, trang bị, tài sản quan trọng mang theo bên mình." },
    { id: "literaryDescription", label: "Miêu tả bằng ngôn từ văn học", type: "textarea", description: "Chân dung văn học giàu chất nghệ thuật trau chuốt khắc họa toàn diện thần thái nhân vật ở hiện tại (Cấm viết spoil diễn biến sắp tới). Bắt buộc có thêm một đoạn kể về vật phẩm, tài sản hoặc bảo vật gắn liền với nhân vật. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Viết văn phong trau chuốt nghệ thuật, khắc họa thần thái hiện tại, lồng ghép bảo vật/vật phẩm tiêu biểu." }
  ];

  const DEFAULT_NPC_FIELDS = [
    { id: "id", label: "ID Nhân vật (Mã định danh)", type: "input", description: "Mã định danh duy nhất của NPC do hệ thống hoặc AI đặt. [LƯU Ý: Chỉnh sửa ID không làm ảnh hưởng tới các trường khác].", aiRequirement: "Mã định danh duy nhất của NPC." },
    { id: "role", label: "Vai trò", type: "input", description: "Vai trò của NPC trong câu chuyện hoặc mạng lưới xã hội của thế giới (Đồng minh, Kẻ thù, Sư phụ, Người yêu, Hộ vệ, Kẻ trung lập...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Xác định rõ vị trí, vai trò tương tác trong mạch truyện." },
    { id: "fullName", label: "Họ và tên", type: "input", description: "Họ và tên đầy đủ của NPC theo đúng quy chuẩn ngôn ngữ bối cảnh (Ví dụ: 'Nguyễn Thanh Tùng', 'Arthur Pendragon'). Tránh đặt tên nửa mùa hoặc lai tạp phong cách trái bối cảnh. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Đặt tên chuẩn bối cảnh, bảo toàn tên cũ nếu phù hợp." },
    { id: "titles", label: "Danh xưng (Tước hiệu)", type: "input", description: "Danh hiệu, tôn hiệu, biệt hiệu xưng tụng hoặc tước vị chính thức của NPC (Ví dụ: 'Thánh Nữ Ánh Sáng', 'Đại Trưởng Lão', 'Kiếm Thánh Vô Danh'). Cho phép nhiều danh xưng ngăn cách bằng dấu phẩy, gạch chéo (/), chấm phẩy (;). Để trống nếu chưa có. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Viết danh hiệu xứng tầm vị thế, để trống nếu chưa có." },
    { id: "occupation", label: "Chức vụ (Nghề nghiệp)", type: "input", description: "Nghề nghiệp, chức vụ xã hội, giai tầng hoặc chức trách thực tế hiện tại của NPC (Ví dụ: 'Hiệp Sĩ Hoàng Gia', 'Chủ Quán Rượu', 'Học Viên Ma Pháp Viện'). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Ghi nghề nghiệp, chức trách cụ thể trong xã hội." },
    { id: "gender", label: "Giới tính", type: "input", description: "Giới tính sinh học và bản dạng giới của NPC (Nam, Nữ, Phi nhị giới, v.v.). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Xác định giới tính của NPC." },
    { id: "age", label: "Tuổi tác", type: "input", description: "Tuổi tác thực tế và tuổi diện mạo của NPC (Bắt buộc đa dạng hóa độ tuổi từ trẻ em, thiếu niên dưới 18 tuổi đến người trưởng thành, người già. Cho phép ghi kèm mô tả diện mạo như '500 tuổi (trông như thiếu nữ 18 trẻ đẹp)' hoặc 'Thuở sơ khai trường tồn cùng thiên địa' cho thần thánh. Tuân thủ logic huyết thống gia đình hợp lý). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Tuân thủ logic tuổi tác và huyết thống gia đình." },
    { id: "dob", label: "Ngày tháng năm sinh", type: "input", description: "Ngày tháng năm sinh theo lịch bối cảnh hoặc thực tế của NPC, kèm cung hoàng đạo nếu bối cảnh hiện đại/fantasy phù hợp. Cho phép mô tả sinh động đối với thần thánh không xác định năm sinh. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Ghi ngày sinh và cung hoàng đạo phù hợp bối cảnh." },
    { id: "rank", label: "Cảnh giới / Cấp độ", type: "input", description: "Cảnh giới tu vi, cấp độ thực lực, đẳng cấp mạo hiểm giả hoặc phân hạng sức mạnh của NPC theo hệ thống phân bậc của thế giới (Ví dụ: 'Kim Đan Kỳ Sơ Kỳ', 'Ma Pháp Sư Hạng A', 'Level 45'). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Bám sát thang phân cấp sức mạnh của thế giới." },
    { id: "height", label: "Chiều cao", type: "input", description: "Chiều cao cơ thể (Ví dụ: '165 cm', '1m78'). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Ghi số đo chiều cao hợp lý." },
    { id: "weight", label: "Cân nặng", type: "input", description: "Cân nặng cơ thể và thể trạng (Ví dụ: '49 kg', '68 kg - săn chắc'). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Ghi cân nặng và thể trạng tương xứng." },
    { id: "measurements", label: "Số đo 3 vòng", type: "input", description: "Quy tắc định dạng bắt buộc: Nữ giới: Bắt buộc đặt số đo 3 vòng và cup ngực trong ngoặc vuông và kết thúc bằng dấu chấm (Ví dụ: '[90-60-90, Cup D]. '), sau đó viết đoạn văn ngắn gọn, trực diện trần trụi về vóc dáng, vú, nhũ hoa, mu, lồn (không lặp lại con số). Nam giới: Viết trực diện miêu tả vóc dáng và dương vật/cu/cặc thực tế. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Tuân thủ định dạng ngoặc vuông cho nữ hoặc tả trực diện cho nam." },
    { id: "appearance", label: "Miêu tả ngoại hình tổng quan", type: "textarea", description: "Miêu tả ngoại hình khỏa thân toàn diện của NPC: Tối thiểu 800 từ, chia 5-6 đoạn lớn (dùng ký tự \\n\\n, cấm thẻ <br>): Đoạn 1 (Khuôn mặt, tóc, cổ, vai), Đoạn 2 (Bầu ngực, nhũ hoa tả trần trụi bạo dạn), Đoạn 3 (Eo, bụng, hông, mông, đùi), Đoạn 4 (Vùng kín mu, âm hộ, cấu trúc lông mu ngẫu nhiên), Đoạn 5 (Làn da, mùi hương, vết bớt/hình xăm). Tuyệt đối không tả trang phục ở trường này. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Viết chi tiết khỏa thân chia 5-6 đoạn bằng \\n\\n, cấm tả trang phục." },
    { id: "appearanceLite", label: "Miêu tả Rút gọn (Tóm tắt ngoại hình)", type: "textarea", description: "Bản tóm tắt ngoại hình SFW an toàn, thanh lịch của NPC (Tối thiểu 300 từ, chia 2-3 đoạn bằng \\n\\n): Miêu tả ít nhất 2 bộ trang phục thường ngày/đặc trưng, kết hợp biểu cảm, ánh nhìn, thần thái và khí chất tổng quan của nhân vật. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Tả ít nhất 2 bộ trang phục, thần thái, phong thái tổng quan SFW." },
    { id: "distinguishingFeatures", label: "Đặc điểm nhận dạng phụ", type: "textarea", description: "Đặc điểm nhận dạng phụ và điểm nhấn ngoại hình của NPC (Nốt ruồi duyên, má lúm đồng tiền, vết sẹo danh dự, hình xăm phong ấn, răng khểnh, màu mắt đặc biệt, dị tật hoặc ấn ký kỳ lạ...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Nêu các dấu hiệu nhận diện đặc trưng tạo điểm nhấn riêng biệt." },
    { id: "powers", label: "Năng lực / Sức mạnh", type: "textarea", description: "Những thứ thuộc về phi thực tế (như hệ thống hay ma pháp... - các ví dụ để AI hiểu bản chất). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Miêu tả rõ cơ chế, phân loại và uy lực ma pháp/dị năng." },
    { id: "skills", label: "Kỹ năng chuyên môn", type: "textarea", description: "Những thứ thuộc về thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để AI hiểu bản chất). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Nêu các kỹ năng chuyên môn đời sống hoặc chiến đấu." },
    { id: "personality", label: "Tính cách tổng quan", type: "textarea", description: "Tính cách biểu hiện bề ngoài, thói quen giao tiếp ứng xử thường nhật của NPC. Bắt buộc kết hợp miêu tả thói quen ăn mặc trong các hoàn cảnh (đi làm/đi học, dạo phố, ở nhà, khi ngủ). Lồng ghép các nét tính cách đời thường, dung dị (vui vẻ, nóng nảy, ngốc nghếch, lười biếng, chăm chỉ...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Bám sát ý tưởng, lồng ghép thói quen trang phục theo hoàn cảnh." },
    { id: "personalityCore", label: "Tính cách cốt lõi (Bản ngã)", type: "textarea", description: "Tính cách cốt lõi và bản ngã sâu kín nhất của NPC (Nguyên tắc sống bất biến, tâm lý thật sự bên trong mâu thuẫn hoặc đồng nhất với tính cách bề ngoài). Chống OOC nghiêm ngặt. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Khắc họa tâm lý sâu thẳm và nguyên tắc sống bất biến." },
    { id: "philosophy", label: "Kim chỉ nam / Lý tưởng", type: "textarea", description: "Kim chỉ nam sống, lý tưởng nhân sinh, tín ngưỡng, đạo đức hoặc phương châm hành động cốt lõi của NPC. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Xây dựng lý tưởng và tôn chỉ hành động của NPC." },
    { id: "goal", label: "Mục tiêu tối thượng", type: "textarea", description: "Mục tiêu tối thượng, khát vọng đời người hoặc động lực lớn nhất thúc đẩy mọi quyết định và hành vi của NPC. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Nêu rõ khát vọng lớn nhất và mục tiêu theo đuổi." },
    { id: "needsSfw", label: "Nhu cầu (SFW)", type: "textarea", description: "Những nhu cầu cơ bản trong cuộc sống bình thường của NPC. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Nêu nhu cầu sinh hoạt, vật chất hoặc tinh thần thường nhật." },
    { id: "needsNsfw", label: "Nhu cầu (NSFW)", type: "textarea", description: "Những nhu cầu tình dục hoặc thân mật của NPC. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Nêu nhu cầu ham muốn sinh lý và sự thỏa mãn thân mật." },
    { id: "likesDislikesFears", label: "Sở thích, ghét, nỗi sợ (SFW)", type: "textarea", description: "Sở thích, những điều ghét bỏ, nỗi sợ hãi trong cuộc sống thường nhật của NPC (Ví dụ: Thích hoa, ghét cá, sợ bóng tối). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Liệt kê chi tiết sở thích, điều căm ghét và nỗi sợ thường nhật." },
    { id: "likesDislikesFearsNsfw", label: "Sở thích, ghét, nỗi sợ (NSFW)", type: "textarea", description: "Sở thích, ghét, sợ hãi trong chuyện tình dục/NSFW của NPC (Ví dụ: Thích bị cắn, ghét bạo lực quá mức...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Miêu tả sở thích, điều kỵ và nỗi ám ảnh trong tình dục." },
    { id: "background", label: "Nguồn gốc / Xuất thân / Hoàn cảnh", type: "textarea", description: "Nguồn gốc, gia thế xuất thân, biến cố quá khứ và bối cảnh trưởng thành của NPC. Tuyệt đối chỉ kể quá khứ đã diễn ra, nghiêm cấm spoil cốt truyện tương lai. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Chỉ kể quá khứ, nghiêm cấm spoil diễn biến tương lai." },
    { id: "innerSecret", label: "Nội tâm / Suy nghĩ thầm kín / Động cơ ẩn", type: "textarea", description: "Nội tâm thầm kín, bí mật giấu kín chưa từng thổ lộ với ai, điểm yếu chí mạng hoặc toan tính sâu xa trong lòng NPC. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Tiết lộ bí mật giấu kín và toan tính cá nhân." },
    { id: "impression", label: "Ấn tượng & Suy nghĩ (về MC / Thế giới)", type: "textarea", description: "Ấn tượng ban đầu, đánh giá và suy nghĩ tổng quan của NPC về nhân vật chính (MC) hoặc thế giới xung quanh (Độc lập và khác biệt hoàn toàn với mục impression trong từng mối quan hệ relationships). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Đánh giá chân thực góc nhìn của NPC về MC và thế giới." },
    { id: "loveViews", label: "Quan niệm về tình yêu & tình dục", type: "textarea", description: "Quan niệm về tình yêu đôi lứa, sự chung thủy, mức độ chiếm hữu và ranh giới tình dục/khoái lạc của NPC. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Thể hiện góc nhìn về tình yêu, sự thủy chung và ranh giới khoái lạc." },
    { id: "experience", label: "Trinh tiết và kinh nghiệm NSFW", type: "textarea", description: "Trinh tiết và lịch sử kinh nghiệm tình trường/phòng the thực tế của NPC (Trinh nữ thuần khiết, Người từng trải dày dạn kinh nghiệm, Đã từng kết hôn...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Ghi rõ lịch sử tình ái và kinh nghiệm phòng the." },
    { id: "nsfwPersonality", label: "Tính cách khi NSFW", type: "textarea", description: "Bản chất tâm lý và phong cách khi bước vào không gian ân ái/NSFW của NPC (Dâm đãng cuồng nhiệt, Thẹn thùng e ấp, Phục tùng tuyệt đối, Thống trị quyến rũ...). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Khắc họa phong cách tâm lý trong chuyện thân mật." },
    { id: "nsfwReactions", label: "Phản ứng đặc trưng (NSFW)", type: "textarea", description: "Phản ứng cơ thể đặc trưng khi tiếp xúc thân mật/NSFW của NPC (Độ nhạy cảm của các điểm G, tiếng rên rỉ, dịch nhờn, biểu cảm gương mặt khi bị kích thích hoặc đạt cực khoái). [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Miêu tả phản ứng cơ thể và mức độ nhạy cảm khi kích thích." },
    { id: "literaryDescription", label: "Miêu tả bằng ngôn từ văn học", type: "textarea", description: "Chân dung văn học giàu chất nghệ thuật trau chuốt khắc họa toàn diện thần thái NPC ở hiện tại (Cấm viết spoil diễn biến sắp tới). Bắt buộc có thêm một đoạn kể về vật phẩm, tài sản hoặc bảo vật gắn liền với NPC. [LƯU Ý BẢO TOÀN DỮ LIỆU CŨ: Khi sáng tạo ra hoặc cập nhật nội dung, bắt buộc xem xét nội dung cũ trước; tuyệt đối không cập nhật theo kiểu cắt ngắn hay rút gọn nội dung cũ; cái gì còn phù hợp thì giữ nguyên, cái gì thay đổi thì mới sửa lại hoặc thay thế].", aiRequirement: "Viết văn phong nghệ thuật khắc họa thần thái, lồng ghép bảo vật/vật phẩm tiêu biểu." }
  ];

  const isCustomMode = type === "mc" ? gameData?.mcTemplateMode === "custom" : gameData?.npcTemplateMode === "custom";
  
  const customFieldsRaw = type === "mc" ? (gameData?.customMcFields || []) : (gameData?.customNpcFields || []);

  // UI always shows all fields, conditions are only for AI prompts
  const customFields = customFieldsRaw
    .filter((f: any) => f.enabled !== false)
    .sort((a: any, b: any) => {
      const orderA = typeof a.order === "number" ? a.order : 999;
      const orderB = typeof b.order === "number" ? b.order : 999;
      return orderA - orderB;
    })
    .map((f: any) => {
    if (f.id === "powers" || f.id === "skills") {
      return { ...f, isArray: true };
    }
    return f;
  });

  if (!gameData || !editedData) return null;

  const getHeaderColorClass = (colorType: string) => {
    const isDark = theme.group === "Dark";
    switch (colorType) {
      case "blue":
        return isDark ? "text-blue-400" : "text-blue-600 font-extrabold";
      case "emerald":
        return isDark ? "text-emerald-400" : "text-emerald-600 font-extrabold";
      case "pink":
        return isDark ? "text-pink-400" : "text-pink-600 font-extrabold";
      case "red":
        return isDark ? "text-red-400" : "text-red-600 font-extrabold";
      case "amber":
        return isDark ? "text-amber-400" : "text-amber-600 font-extrabold";
      case "purple":
        return isDark ? "text-purple-400" : "text-purple-600 font-extrabold";
      case "teal":
        return isDark ? "text-teal-400" : "text-teal-600 font-extrabold";
      case "sky":
        return isDark ? "text-sky-400" : "text-sky-600 font-extrabold";
      case "rose":
        return isDark ? "text-rose-400" : "text-rose-650 font-extrabold";
      case "slate":
        return isDark ? "text-slate-400" : "text-slate-600 font-extrabold";
      case "yellow":
        return isDark ? "text-yellow-400" : "text-amber-600 font-extrabold";
      default:
        return isDark ? "text-white" : "text-slate-900 font-extrabold";
    }
  };

  const handleSave = () => {
    if (type === "mc") {
      if (activeVersion === "1") {
        setGameData({
          ...gameData,
          originalMcData: editedData,
        });
      } else {
        setGameData({
          ...gameData,
          mcData: editedData,
        });
      }
    } else if (type === "npc" && npcIndex !== undefined) {
      if (activeVersion === "1") {
        const origNpcs = gameData.originalNpcs
          ? [...gameData.originalNpcs]
          : [...gameData.npcs];
        origNpcs[npcIndex] = editedData;
        setGameData({
          ...gameData,
          originalNpcs: ensureUniqueNpcIds(origNpcs),
        });
      } else {
        const newNpcs = [...gameData.npcs];
        newNpcs[npcIndex] = editedData;
        setGameData({
          ...gameData,
          npcs: ensureUniqueNpcIds(newNpcs),
        });
      }
    }
    setIsEditing(false);
  };

  const handleAvatarChange = (url: string) => {
    handleChange("avatar", url);
    if (!isEditing) {
      if (type === "mc") {
        if (activeVersion === "1") {
          const newMcData = { ...editedData, avatar: url };
          setGameData({ ...gameData, originalMcData: newMcData });
        } else {
          const newMcData = { ...editedData, avatar: url };
          setGameData({ ...gameData, mcData: newMcData });
        }
      } else if (type === "npc" && npcIndex !== undefined) {
        if (activeVersion === "1") {
          const origNpcs = gameData.originalNpcs
            ? [...gameData.originalNpcs]
            : [...gameData.npcs];
          origNpcs[npcIndex] = { ...editedData, avatar: url };
          setGameData({ ...gameData, originalNpcs: origNpcs });
        } else {
          const newNpcs = [...gameData.npcs];
          newNpcs[npcIndex] = { ...editedData, avatar: url };
          setGameData({ ...gameData, npcs: newNpcs });
        }
      }
    }
  };

  const handleChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleCustomChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [field]: value,
      customData: {
        ...(prev.customData || {}),
        [field]: value
      }
    }));
  };

  const handleGenerateArrays = async () => {
    const arrayFields = customFields.filter((f: any) => f.isArray);
    if (arrayFields.length === 0) {
      toast.error("Không có trường nào tích chọn 'Tạo mảng' ở cấu trúc bảng!");
      return;
    }

    setIsGeneratingArrays(true);
    const prompt = `Bạn là trợ lý ảo AI chuyên thiết kế thuộc tính nhân vật cho game nhập vai.
Hãy tạo dữ liệu dạng mảng hoàn chỉnh cho nhân vật dựa trên thông tin:
- Tên nhân vật: ${editedData.name || "Vô danh"}
- Loại nhân vật: ${type === "mc" ? "Nhân vật chính" : `NPC (Vai trò: ${editedData.role || "Chưa rõ"})`}
- Bối cảnh thế giới: ${gameData?.worldDetails || "Thế giới mở rộng tự do"}

Các trường mảng cần tạo:
${arrayFields.map((f: any) => {
  if (f.subFields && f.subFields.length > 0) {
    return `- ID: ${f.id}, Tên trường: ${f.label}\n  Các trường con:\n${f.subFields.map((sub: any) => `    + ${sub.label}: ${sub.description || "Không có định nghĩa"} (Yêu cầu AI: ${sub.aiRequirement || "Không"})`).join("\n")}`;
  } else {
    return `- ID: ${f.id}, Tên trường: ${f.label}\n  Định nghĩa: ${f.description || "Không có"}, Yêu cầu AI: ${f.aiRequirement || "Không có"}`;
  }
}).join("\n\n")}

YÊU CẦU ĐẦU RA:
Trả về 1 đối tượng JSON duy nhất có cấu trúc, trong đó mỗi trường mảng chứa từ 3 đến 5 phần tử (tùy vào nội dung), mỗi phần tử trong mảng phải chứa các trường (keys) tương ứng với Tên trường con đã định nghĩa.
LƯU Ý TỐI QUAN TRỌNG: BẮT BUỘC giữ nguyên chính xác 100% tên các trường con (keys) trong JSON giống hệt với cấu trúc mẫu dưới đây, TUYỆT ĐỐI KHÔNG tự ý dịch sang tiếng Anh hay thay đổi bất kỳ ký tự nào của Tên trường (keys):
{
  ${arrayFields.map((f: any) => {
    if (f.subFields && f.subFields.length > 0) {
      const keysStr = f.subFields.map((sub: any) => `"${sub.label}": "giá trị tương ứng"`).join(",\n      ");
      return `"${f.id}": [\n    {\n      ${keysStr}\n    }\n  ]`;
    } else {
      return `"${f.id}": [\n    {\n      "Tên": "tên cụ thể",\n      "Nội dung hoặc Định nghĩa": "mô tả chi tiết",\n      "Yêu cầu của người chơi": "yêu cầu cụ thể"\n    }\n  ]`;
    }
  }).join(",\n  ")}
}

CHỈ TRẢ VỀ JSON THUẦN TÚY, TUYỆT ĐỐI KHÔNG BỌC TRONG MARKDOWN HOẶC GIẢI THÍCH GÌ THÊM.`;

    try {
      const stream = aiService.generateStreamingContent(prompt, undefined, "Bạn chỉ trả về JSON thuần túy, không giải thích gì thêm.");
      let text = "";
      for await (const chunk of stream) {
        if (chunk.text && chunk.text !== "[CLEAR_STREAM_BUFFER]") {
          text += chunk.text;
        }
      }
      text = text.replace(/\`\`\`(?:json)?\n?/gi, "").replace(/\`\`\`/g, "").trim();
      const parsed = JSON.parse(text);
      setEditedData((prev: any) => {
        const newCustomData = { ...(prev.customData || {}) };
        Object.keys(parsed).forEach((key) => {
          newCustomData[key] = parsed[key];
        });
        return {
          ...prev,
          ...parsed,
          customData: newCustomData
        };
      });
      toast.success("Đã sinh toàn bộ mảng hoàn chỉnh bằng AI thành công!");
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi gọi AI tạo mảng.");
    } finally {
      setIsGeneratingArrays(false);
    }
  };

  const getCustomFieldValue = (fieldId: string) => {
    if (!editedData) return "";
    
    if (editedData.customData && editedData.customData[fieldId] !== undefined && editedData.customData[fieldId] !== null) {
      if (Array.isArray(editedData.customData[fieldId])) return editedData.customData[fieldId];
      if (String(editedData.customData[fieldId]).trim() !== "") return editedData.customData[fieldId];
    }
    
    if (editedData[fieldId] !== undefined && editedData[fieldId] !== null) {
      if (Array.isArray(editedData[fieldId])) return editedData[fieldId];
      if (String(editedData[fieldId]).trim() !== "") return editedData[fieldId];
    }
    
    const lowerFieldId = fieldId.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [key, val] of Object.entries(editedData)) {
      if (key === "customData" || key === "pendingUpdates") continue;
      if (
        key.toLowerCase().replace(/[^a-z0-9]/g, "") === lowerFieldId &&
        val !== undefined &&
        val !== null
      ) {
        if (Array.isArray(val)) return val;
        if (String(val).trim() !== "") return String(val);
      }
    }
    return "";
  };

  const getValidPendingUpdatesCount = () => {
    if (!editedData?.pendingUpdates) return 0;
    
    const defaultFields = [
      "fullname", "gender", "age", "dob", "height", "weight", "measurements", "rank", "occupation",
      "appearance", "appearancelite", "distinguishingfeatures", 
      "personality", "personalitycore", "philosophy", "goal", 
      "innersecret", "impression", "background", "relationships", 
      "powers", "skills", "inventory", "preferences", "needs", "needssfw", "needsnsfw",
      "likesdislikesfears", "likesdislikesfearsnsfw", "loveviews", "experience", 
      "nsfwpersonality", "nsfwreactions", "literarydescription", "titles",
      "id", "name", "role", "avatar", "objectives", "partylist", "customdata", "fashion"
    ];

    const getOriginalValLocal = (key: string) => {
      if (isBuiltInField(key)) {
        return editedData ? editedData[key] : undefined;
      }
      if (editedData && editedData.customData && editedData.customData[key] !== undefined) {
        return editedData.customData[key];
      }
      return editedData ? editedData[key] : undefined;
    };

    return Object.keys(editedData.pendingUpdates).filter(key => {
      const keyLower = key.trim().toLowerCase();
      if (['location', 'currentlocation', 'status', 'statusdata'].includes(keyLower)) return false;
      
      const isCustomModeLocal = type === "mc" ? gameData?.mcTemplateMode === "custom" : gameData?.npcTemplateMode === "custom";
      let isAllowed = false;
      if (isCustomModeLocal) {
         isAllowed = customFields.some((f: any) => f.id.toLowerCase() === keyLower) || ["id", "name", "role", "avatar", "objectives", "partylist", "inventory", "customdata"].includes(keyLower);
      } else {
         isAllowed = defaultFields.includes(keyLower);
      }
      
      if (!isAllowed) return false;

      const origVal = getOriginalValLocal(key);
      const pendingVal = editedData.pendingUpdates[key];
      return JSON.stringify(pendingVal) !== JSON.stringify(origVal);
    }).length;
  };

  const validPendingCount = getValidPendingUpdatesCount();

  const openTemplateConfig = () => {
    const currentMode = type === "mc" ? (gameData?.mcTemplateMode || "default") : (gameData?.npcTemplateMode || "default");
    setTempTemplateMode(currentMode);
    setTempCustomFields(JSON.parse(JSON.stringify(customFields)));
    setTempDisableDefaultNpcRelationships(gameData?.disableDefaultNpcRelationships || false);
    setTemplateIdea("");
    setShowTemplateConfigModal(true);
  };

  const handleGenerateTemplate = async () => {
    if (!templateIdea.trim()) {
      toast.error("Vui lòng nhập ý tưởng về bảng thông tin trước!");
      return;
    }
    
    setIsGeneratingTemplate(true);

    const prompt = `Bạn là một AI chuyên gia hàng đầu về thiết kế bảng hồ sơ nhân vật (Character Profile Sheet / Character Template) cho game nhập vai (RPG), Visual Novel, tiểu thuyết tương tác.

YÊU CẦU / Ý TƯỞNG CỦA NGƯỜI CHƠI: "${templateIdea}"

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
- BẮT BUỘC tạo nội dung đầy đủ cho TẤT CẢ các thuộc tính: id, label, type, description, aiRequirement cho từng trường. Tuyệt đối không để trống bất kỳ ô nào!
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
          setTempCustomFields(fields);
          toast.success("Đã tạo bảng thông tin tùy chỉnh thành công!");
        }
      } catch (e) {
        toast.error("Lỗi parse JSON từ AI.");
      }
    } catch (e) {
      toast.error("Lỗi khi tạo template.");
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const handleSaveTemplateConfig = () => {
    if (type === "mc") {
      setGameData({
        ...gameData,
        mcTemplateMode: tempTemplateMode,
        customMcFields: tempCustomFields,
      });
    } else {
      setGameData({
        ...gameData,
        npcTemplateMode: tempTemplateMode,
        customNpcFields: tempCustomFields,
        disableDefaultNpcRelationships: tempDisableDefaultNpcRelationships,
      });
    }
    toast.success("Đã cập nhật cấu hình bảng thông tin!");
    setShowTemplateConfigModal(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file) {
        try {
          // Compress keeping at least 80% quality, max width 1024px
          const base64Data = await compressImage(file, 0.8, 1024);
          const imgId = Date.now().toString();
          const localKey = await storageService.saveImage(imgId, base64Data);

          handleAvatarChange(localKey);

          // Add to gallery
          const newImg = {
            id: "img-" + imgId,
            tabId: "default-player-tab",
            url: localKey,
            name: file.name,
          };

          setGameData((prev: any) => {
            if (!prev) return prev;
            const currentGallery = prev.gallery || {};
            const gallery = {
              devImages: currentGallery.devImages || DEV_IMAGES,
              playerTabs: currentGallery.playerTabs || [
                { id: "default-player-tab", name: "Chung" },
              ],
              playerImages: currentGallery.playerImages || [],
            };
            return {
              ...prev,
              gallery: {
                ...gallery,
                playerImages: [...(gallery.playerImages || []), newImg],
              },
            };
          });
          toast.success("Thay ảnh thành công và đã lưu vào thư viện!");
        } catch (err) {
          console.error(err);
          toast.error("Lỗi khi tải hoặc nén ảnh");
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowAvatarSelect(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAvatarClick = () => {
    setShowAvatarSelect(true);
  };

  // Group fields logically
  const basicFields = [
    { label: "Tên đầy đủ", field: "fullName" },
    { label: "Tuổi", field: "age" },
    { label: "Giới tính", field: "gender" },
    { label: "Ngày sinh", field: "dob" },
    { label: "Chiều cao", field: "height" },
    { label: "Cân nặng", field: "weight" },
    { label: "Số đo 3 vòng", field: "measurements" },
  ];

  const identityFields = [
    { label: "Tên thông dụng / Nickname", field: "name" },
    ...(isCustomMode ? [] : [
      { label: "Danh xưng / Tước hiệu", field: "titles" },
      { label: "Nghề nghiệp", field: "occupation" },
      { label: "Cấp bậc", field: "rank" },
    ]),
    ...(type === "npc" ? [{ label: "Vai trò", field: "role" }] : []),
  ];

  const submitUrl = () => {
    if (!urlInputValue.trim()) return;
    const url = urlInputValue.trim();
    handleAvatarChange(url);

    // Add to gallery
    const newImg = {
      id: "img-" + Date.now(),
      tabId: "default-player-tab",
      url,
      name: "Ảnh từ URL",
    };
    const gallery = {
      devImages: gameData.gallery?.devImages || DEV_IMAGES,
      playerTabs: gameData.gallery?.playerTabs || [
        { id: "default-player-tab", name: "Chung" },
      ],
      playerImages: gameData.gallery?.playerImages || [],
    };
    setGameData((prev: any) => ({
      ...prev,
      gallery: {
        ...gallery,
        playerImages: [...(gallery.playerImages || []), newImg],
      },
    }));
    toast.success("Thay ảnh thành công và đã lưu vào thư viện!");

    setShowUrlInput(false);
    setShowAvatarSelect(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`fixed inset-0 z-50 backdrop-blur-md flex flex-col overflow-hidden ${isDark ? "bg-black/80" : "bg-amber-900/15"}`}
      onClick={onClose}
    >
      <div
        className={`w-full h-full flex flex-col relative rounded-none border-0 overflow-hidden ${
          isDark ? theme.bgClass : "bg-[#FAF7F0]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`absolute top-0 left-0 w-full h-96 bg-gradient-to-b ${
            isDark ? "from-blue-900/20" : "from-blue-600/5"
          } to-transparent pointer-events-none`}
        />

        {/* Header */}
        <div
          className={`p-2 md:p-3 flex flex-wrap gap-y-2 items-center justify-between shrink-0 relative z-20 border-b backdrop-blur-md ${
            isDark
              ? "border-white/5 bg-black/60"
              : "border-amber-200/60 bg-[#FFFDF9]/95 shadow-sm"
          }`}
          style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
        >
          <div className="flex items-center gap-2">
            <div>
              {isEditing ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {type === "npc" && (
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>
                        ID:
                      </span>
                      <input
                        type="text"
                        value={editedData.id || ""}
                        onChange={(e) => handleChange("id", e.target.value)}
                        className={`text-xs font-mono font-bold border rounded p-1 px-2 w-28 md:w-36 outline-none ${
                          isDark
                            ? "text-cyan-300 bg-black/40 border-cyan-500/30 focus:border-cyan-500"
                            : "text-cyan-800 bg-white border-cyan-300 focus:border-cyan-600"
                        }`}
                        placeholder="MÃ ID"
                        title="ID Nhân vật do AI hoặc Hệ thống đặt (chỉnh sửa không ảnh hưởng các trường khác)"
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    value={editedData.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={`text-sm font-bold uppercase tracking-widest drop-shadow-sm border rounded p-1 px-2 w-full max-w-xs outline-none ${
                      isDark
                        ? "text-white bg-black/40 border-white/20 focus:border-blue-500/50"
                        : "text-[#3E2723] bg-white border-amber-250 focus:border-blue-600"
                    }`}
                    placeholder="TÊN / NICKNAME"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {type === "npc" && (
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border select-all ${
                        isDark
                          ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/30"
                          : "bg-cyan-50 text-cyan-800 border-cyan-200"
                      }`}
                      title="ID do AI hoặc Hệ thống đặt cho NPC"
                    >
                      ID: {sanitizeNpcId(editedData, npcIndex ?? 0)}
                    </span>
                  )}
                  <h2
                    className={`text-sm font-bold uppercase tracking-wider drop-shadow-sm ${
                      isDark ? "text-white" : "text-[#3E2723] font-black"
                    }`}
                  >
                    {editedData.name ||
                      (type === "mc" ? "TRUYỀN KỲ MC" : "NHÂN VẬT KHẨN CẤP")}
                  </h2>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 mr-2 p-1 rounded-lg border ${
                isDark
                  ? "bg-black/50 border-white/10"
                  : "bg-amber-100/60 border-amber-250 shadow-inner"
              }`}
            >
              <button
                onClick={() => {
                  setIsEditing(false);
                  setActiveVersion("1");
                }}
                className={`px-3 py-1.5 rounded-md font-bold text-sm transition-all ${
                  activeVersion === "1"
                    ? "bg-blue-600 text-white shadow-md"
                    : isDark
                      ? "bg-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
                      : "bg-transparent text-[#5C4033]/70 hover:text-[#3E2723] hover:bg-amber-500/10"
                }`}
                title="Bản gốc"
              >
                1
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setActiveVersion("2");
                }}
                className={`px-3 py-1.5 rounded-md font-bold text-sm transition-all ${
                  activeVersion === "2"
                    ? "bg-blue-600 text-white shadow-md"
                    : isDark
                      ? "bg-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
                      : "bg-transparent text-[#5C4033]/70 hover:text-[#3E2723] hover:bg-amber-500/10"
                }`}
                title="Bản hiện tại"
              >
                2
              </button>
            </div>
            {/* Template Mode Switcher / Config Button */}
            <button
              onClick={openTemplateConfig}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-bold text-xs ${
                isCustomMode
                  ? "bg-purple-600/20 border-purple-500/40 text-purple-400 hover:bg-purple-600/30"
                  : isDark
                    ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    : "bg-amber-100/60 border-amber-250 text-[#5C4033] hover:bg-amber-100"
              }`}
              title="Cài đặt Bảng thông tin (Mặc định / Tùy chỉnh)"
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">{isCustomMode ? "Bảng: Tùy chỉnh" : "Bảng: Mặc định"}</span>
              <span className="sm:hidden">{isCustomMode ? "Tùy chỉnh" : "Mặc định"}</span>
            </button>
            {isEditing ? (
              <button
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  theme.group === "Dark"
                    ? "bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                }`}
                title="Lưu"
              >
                <Save size={16} />
                <span className="hidden md:inline font-bold tracking-wider text-xs">
                  LƯU
                </span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border cursor-pointer font-bold select-none ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    : "bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-sm"
                }`}
                title="Chỉnh sửa"
              >
                <Edit3 size={16} />
                <span className="hidden md:inline font-bold tracking-wider text-xs">
                  SỬA
                </span>
              </button>
            )}
            <button
              onClick={scrollToBottom}
              className={`p-1.5 rounded-lg transition-colors border cursor-pointer flex items-center justify-center ${
                isDark
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm"
              }`}
              title="Cuộn xuống cuối"
            >
              <ArrowDownToLine size={18} />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors border cursor-pointer ${
                isDark
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  : "bg-amber-100 hover:bg-amber-200 text-[#5C4033] border-amber-200 shadow-sm"
              }`}
              title="Đóng (Phím Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full flex flex-col"
        >
          <div className="flex flex-col xl:flex-row p-4 md:p-8 gap-8 w-full mx-auto flex-1">
            {/* Left Column: Avatar */}
            <div className="flex flex-col items-center xl:items-start xl:w-[420px] shrink-0">
              <div
                className="w-64 md:w-80 xl:w-full aspect-[3/4] rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30 shadow-2xl shadow-blue-500/10 overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-blue-500/30 group relative transition-all duration-300"
                onClick={handleAvatarClick}
                title="Nhấn để đổi ảnh đại diện"
              >
                {editedData.avatar ? (
                  <LazyImage
                    src={editedData.avatar}
                    alt="Avatar"
                    className="w-full h-full"
                  />
                ) : (
                  <User size={80} className="text-blue-400/50" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                  <Edit3 size={32} className="text-white drop-shadow-md" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />

              {/* Đồng bộ & Xác nhận cập nhật (Cho cả MC và NPC) */}
              <div className="w-full mt-4 flex items-center justify-center xl:justify-start gap-2 max-w-[320px]">
                {activeVersion === "1" ? (
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Bạn có chắc muốn đồng bộ dữ liệu từ bản Số 2 (Hiện hành) sang bản gốc Số 1 không?",
                        )
                      ) {
                        setGameData((prev: any) => {
                          if (type === "mc") {
                            const currentMc = prev.mcData || {};
                            const syncedMc = JSON.parse(
                              JSON.stringify(currentMc),
                            );
                            setEditedData({
                              ...syncedMc,
                              activeVersionResolved: activeVersion,
                              typeResolved: type,
                            });
                            return { ...prev, originalMcData: syncedMc };
                          } else {
                            const currentNpcs = prev.npcs || [];
                            const origNpcs = [
                              ...(prev.originalNpcs || currentNpcs),
                            ];
                            const syncedNpc = JSON.parse(
                              JSON.stringify(currentNpcs[npcIndex as number]),
                            );
                            origNpcs[npcIndex as number] = syncedNpc;
                            setEditedData({
                              ...syncedNpc,
                              activeVersionResolved: activeVersion,
                              typeResolved: type,
                            });
                            return { ...prev, originalNpcs: origNpcs };
                          }
                        });
                        toast.success(
                          "Đã đồng bộ bản gốc với bản hiện hành!",
                        );
                      }
                    }}
                    className="w-full font-bold py-3 px-4 rounded-xl shadow-lg transform transition flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20 hover:-translate-y-1 active:translate-y-0"
                  >
                    <Check size={18} /> Đồng bộ từ bản số 2 (Hiện hành)
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowConfirmUpdateModal(true)}
                      disabled={validPendingCount === 0}
                      className={`flex-1 font-bold py-3 px-4 rounded-xl shadow-lg transform transition flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                        validPendingCount > 0
                          ? "bg-green-500 hover:bg-green-600 text-white shadow-green-500/20 hover:-translate-y-1 active:translate-y-0"
                          : "bg-slate-500/50 text-white/50 shadow-slate-500/20"
                      }`}
                    >
                      <Check size={18} />{" "}
                      {validPendingCount > 0
                        ? type === "mc"
                          ? "Xác Nhận Update MC"
                          : "Xác Nhận Update NPC"
                        : "Không có Update mới"}
                      {validPendingCount > 0 && (
                          <span className="bg-white text-green-600 text-xs px-2 py-0.5 rounded-full">
                            {validPendingCount}
                          </span>
                        )}
                    </button>

                    <button
                      onClick={() => {
                        if (type === "mc") {
                          const nextVal = !autoUpdateMc;
                          setAutoUpdateMc(nextVal);
                          toast.success(nextVal ? "Đã BẬT tự động duyệt cập nhật MC!" : "Đã TẮT tự động duyệt cập nhật MC!");
                        } else {
                          const nextVal = !autoUpdateNpc;
                          setAutoUpdateNpc(nextVal);
                          toast.success(nextVal ? "Đã BẬT tự động duyệt cập nhật NPC!" : "Đã TẮT tự động duyệt cập nhật NPC!");
                        }
                      }}
                      className={`font-black px-3.5 py-3 rounded-xl shadow-lg transform transition flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-1 active:translate-y-0 select-none ${
                        (type === "mc" ? autoUpdateMc : autoUpdateNpc)
                          ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 border border-amber-400"
                          : isDark
                            ? "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                      }`}
                      title={(type === "mc" ? autoUpdateMc : autoUpdateNpc) ? "Tắt tự động duyệt cập nhật" : "Bật tự động duyệt cập nhật"}
                    >
                      <span className="text-xs uppercase tracking-wider font-bold">AUTO</span>
                      <span className={`w-2 h-2 rounded-full ${(type === "mc" ? autoUpdateMc : autoUpdateNpc) ? 'bg-green-300 animate-pulse' : 'bg-slate-400'}`} />
                    </button>
                  </>
                )}
              </div>

              {/* Tab Navigation (MC only) moved below avatar implicitly visually, or we can keep it on the right side */}
              {type === "mc" && (
                <div className="flex items-center justify-center xl:justify-start gap-4 mt-6 w-full relative z-10 shrink-0">
                  <button
                    onClick={() => setActiveTab("chung")}
                    className={`flex-1 py-3 font-bold tracking-wider text-sm uppercase transition-all border-2 rounded-xl ${
                      activeTab === "chung"
                        ? "text-blue-600 border-blue-500/50 bg-blue-500/10"
                        : isDark
                          ? "text-white/40 border-white/5 bg-white/5 hover:text-white/80 hover:bg-white/10"
                          : "text-[#5C4033]/70 border-amber-200/60 bg-amber-100/50 hover:text-[#3E2723] hover:bg-amber-100"
                    }`}
                  >
                    Chung
                  </button>
                  <button
                    onClick={() => setActiveTab("tui")}
                    className={`flex-1 py-3 font-bold tracking-wider text-sm uppercase transition-all border-2 rounded-xl ${
                      activeTab === "tui"
                        ? "text-blue-600 border-blue-500/50 bg-blue-500/10"
                        : isDark
                          ? "text-white/40 border-white/5 bg-white/5 hover:text-white/80 hover:bg-white/10"
                          : "text-[#5C4033]/70 border-amber-200/60 bg-amber-100/50 hover:text-[#3E2723] hover:bg-amber-100"
                    }`}
                  >
                    Túi / Tài sản
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Content Areas */}
            <div className="w-full flex-1">
              {activeTab === "chung" && (
                <>
                  {isCustomMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 md:gap-8 w-full">
                      <div className="space-y-6 md:col-span-1">
                        <div className="p-5 rounded-2xl theme-panel relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
                          <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${getHeaderColorClass("blue")}`}>
                            <Crown size={16} /> Danh Tính Tùy Chỉnh
                          </h3>
                          <div className="flex flex-col gap-3 relative z-10">
                             <EditableField
                                label="Tên thông dụng / Nickname"
                                field="name"
                                value={editedData.name || ""}
                                isEditing={isEditing}
                                onChange={(val) => handleChange("name", val)}
                             />
                             {type === "npc" && (
                               <EditableField
                                  label="Vai trò"
                                  field="role"
                                  value={editedData.role || ""}
                                  isEditing={isEditing}
                                  onChange={(val) => handleChange("role", val)}
                               />
                             )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6 md:col-span-2 2xl:col-span-2">
                        <div className="p-5 rounded-2xl theme-panel">
                           <h3 className={`text-xs font-black uppercase tracking-widest flex items-center justify-between gap-2 mb-4 ${getHeaderColorClass("emerald")}`}>
                             <span className="flex items-center gap-2">
                               <Info size={16} /> Thông Tin Chi Tiết
                             </span>
                             {isEditing && customFields.some((f: any) => f.isArray) && (
                               <button
                                 type="button"
                                 disabled={isGeneratingArrays}
                                 onClick={handleGenerateArrays}
                                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[10px] sm:text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                 <Wand2 className={`w-3.5 h-3.5 ${isGeneratingArrays ? "animate-spin" : ""}`} />
                                 {isGeneratingArrays ? "ĐANG TẠO MẢNG..." : "TẠO MẢNG BẰNG AI"}
                               </button>
                             )}
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {customFields.map((field: any, idx: number) => {
                                 const disableDefaultRel = !!gameData?.disableDefaultNpcRelationships;
                                 if (type === "mc" && isRelationshipField(field)) return null;
                                 if (type === "npc" && isRelationshipField(field, disableDefaultRel)) {
                                   const relVal = (() => {
                                     let val = getCustomFieldValue(field.id);
                                     if (!val) val = editedData.relationships;
                                     if (Array.isArray(val)) return val;
                                     if (typeof val === "string") {
                                       try {
                                         const parsed = JSON.parse(val);
                                         if (Array.isArray(parsed)) return parsed;
                                       } catch (e) {}
                                     }
                                     return Array.isArray(editedData.relationships) ? editedData.relationships : [];
                                   })();

                                   return (
                                     <div key={idx} className="md:col-span-2">
                                       <EditableRelationshipArrayField
                                         label={field.label || "Tổng quan các quan hệ"}
                                         items={relVal}
                                         isEditing={isEditing}
                                         onChange={(val) => {
                                           handleCustomChange(field.id, val);
                                           handleChange("relationships", val);
                                         }}
                                       />
                                     </div>
                                   );
                                 }

                                 if (field.isArray) {
                                   return (
                                     <EditableGenericArrayField
                                       key={idx}
                                       label={field.label}
                                       description={field.description}
                                       subFields={field.subFields}
                                       items={getCustomFieldValue(field.id)}
                                       isEditing={isEditing}
                                       onChange={(val) => handleCustomChange(field.id, val)}
                                     />
                                   );
                                 }

                                 return (
                                    <EditableField
                                       key={idx}
                                       label={field.label}
                                       field={field.id}
                                       value={getCustomFieldValue(field.id)}
                                       isEditing={isEditing}
                                       onChange={(val) => handleCustomChange(field.id, val)}
                                       multiline={field.type === "textarea"}
                                       className={field.type === "textarea" ? "md:col-span-2" : ""}
                                       description={field.description}
                                    />
                                 );
                              })}
                           </div>
                        </div>
                        {type === "npc" && !gameData?.disableDefaultNpcRelationships && !customFields.some((f: any) => isRelationshipField(f, gameData?.disableDefaultNpcRelationships)) && (
                          <div className="p-5 rounded-2xl theme-panel mt-6">
                            <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${getHeaderColorClass("sky")}`}>
                              <Users size={16} /> Tổng quan các quan hệ
                            </h3>
                            <EditableRelationshipArrayField
                              label=""
                              items={editedData.relationships || []}
                              isEditing={isEditing}
                              onChange={(val) => handleChange("relationships", val)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 md:gap-8 w-full">
                  {/* Cột trái: Thông tin cơ bản & Đặc điểm */}
                  <div className="space-y-6 md:col-span-1">
                    {/* Identity Box */}
                    <div className="p-5 rounded-2xl theme-panel relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
                      <h3
                        className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${getHeaderColorClass("blue")}`}
                      >
                        <Crown size={16} /> Danh Tính
                      </h3>
                      <div className="flex flex-col gap-3 relative z-10">
                        {identityFields.map((item, idx) => (
                          <EditableField
                            key={idx}
                            label={item.label}
                            field={item.field}
                            value={editedData[item.field] || ""}
                            isEditing={isEditing}
                            onChange={(val) => handleChange(item.field, val)}
                            labelSuffix={
                              item.field === 'titles' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowTitles(!showTitles);
                                  }}
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-colors ${
                                    !showTitles 
                                      ? 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30' 
                                      : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                                  }`}
                                  title={!showTitles ? "Đang ẩn tước hiệu" : "Đang hiện tước hiệu"}
                                >
                                  {!showTitles ? "Đang Ẩn" : "Đang Hiện"}
                                </button>
                              ) : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {/* Basic Info Box */}
                    <div className="p-5 rounded-2xl theme-panel">
                      <h3
                        className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${getHeaderColorClass("emerald")}`}
                      >
                        <Info size={16} /> Nhận Dạng Cơ Bản
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {basicFields.map((item, idx) => (
                          <EditableField
                            key={idx}
                            label={item.label}
                            field={item.field}
                            value={editedData[item.field] || ""}
                            isEditing={isEditing}
                            onChange={(val) => handleChange(item.field, val)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Appearance & Distinguishing Features */}
                    <div className="p-5 rounded-2xl theme-panel">
                      <h3
                        className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${getHeaderColorClass("pink")}`}
                      >
                        <Fingerprint size={16} /> Ngoại Hình & Dấu Hiệu
                      </h3>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1 -mt-1">
                          <div
                            className={`flex items-center justify-between cursor-pointer py-1 transition-colors ${isDark ? "text-white/40 hover:text-white/80" : "text-slate-500 hover:text-slate-800"}`}
                            onClick={toggleAppearanceCollapse}
                          >
                            <span className="text-[10px] uppercase tracking-widest font-bold">
                              Miêu tả ngoại hình
                            </span>
                            {isAppearanceCollapsed ? (
                              <ChevronRight size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </div>
                          {!isAppearanceCollapsed && (
                            <div className="!mt-0">
                              <EditableField
                                label=""
                                field="appearance"
                                value={editedData.appearance || ""}
                                isEditing={isEditing}
                                onChange={(val) =>
                                  handleChange("appearance", val)
                                }
                                multiline
                              />
                            </div>
                          )}
                        </div>
                        <EditableField
                          label="Miêu tả Rút gọn"
                          field="appearanceLite"
                          value={editedData.appearanceLite || ""}
                          isEditing={isEditing}
                          onChange={(val) =>
                            handleChange("appearanceLite", val)
                          }
                          multiline
                        />
                        <EditableField
                          label="Đặc điểm nhận dạng phụ"
                          field="distinguishingFeatures"
                          value={editedData.distinguishingFeatures || ""}
                          isEditing={isEditing}
                          onChange={(val) =>
                            handleChange("distinguishingFeatures", val)
                          }
                          multiline
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cột Giữa & Phải: Sức mạnh, Kỹ năng, Tính cách & Tiểu sử */}
                  <div className="space-y-6 md:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Powers Box */}
                      <div className="p-5 md:p-6 rounded-2xl theme-panel">
                        <h3
                          className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${getHeaderColorClass("red")}`}
                        >
                          <Activity size={16} /> Sức Mạnh / Năng Lực
                        </h3>
                        <EditableArrayField
                          itemLabel="Năng Lực"
                          label=""
                          description="Những thứ thuộc về phi thực tế (như hệ thống hay ma pháp... - các ví dụ để AI hiểu bản chất)."
                          items={editedData.powers || []}
                          isEditing={isEditing}
                          onChange={(val) => handleChange("powers", val)}
                        />
                      </div>

                      {/* Skills Box */}
                      <div className="p-5 md:p-6 rounded-2xl theme-panel">
                        <h3
                          className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${getHeaderColorClass("amber")}`}
                        >
                          <Star size={16} /> Kỹ Năng Chuyên Môn
                        </h3>
                        <EditableArrayField
                          itemLabel="Kỹ Năng"
                          label=""
                          description="Những thứ thuộc về thực tế (như võ thuật, kiếm thuật, kỹ năng nấu ăn, tài ăn nói... - các ví dụ để AI hiểu bản chất)."
                          items={editedData.skills || []}
                          isEditing={isEditing}
                          onChange={(val) => handleChange("skills", val)}
                        />
                      </div>
                    </div>

                    {/* Personal & Psychological Profile */}
                    <div className="p-5 md:p-6 rounded-2xl theme-panel">
                      <h3
                        className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${getHeaderColorClass("purple")}`}
                      >
                        <BookOpen size={16} /> Hồ Sơ Tâm Lý
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EditableField
                          label="Tính cách tổng quan"
                          field="personality"
                          value={editedData.personality || ""}
                          isEditing={isEditing}
                          onChange={(val) => handleChange("personality", val)}
                          multiline
                        />
                        <EditableField
                          label="Cốt lõi tính cách (Bản ngã)"
                          field="personalityCore"
                          value={editedData.personalityCore || ""}
                          isEditing={isEditing}
                          onChange={(val) =>
                            handleChange("personalityCore", val)
                          }
                          multiline
                        />

                        <EditableField
                          label="Kim chỉ nam / Lý tưởng"
                          field="philosophy"
                          value={editedData.philosophy || ""}
                          isEditing={isEditing}
                          onChange={(val) => handleChange("philosophy", val)}
                          multiline
                          className="col-span-1 md:col-span-2 pt-3 border-t border-white/5"
                        />
                        <EditableField
                          label="Mục tiêu tối thượng"
                          field="goal"
                          value={editedData.goal || ""}
                          isEditing={isEditing}
                          onChange={(val) => handleChange("goal", val)}
                          multiline
                          className="col-span-1 md:col-span-2 pt-3 border-t border-white/5"
                        />

                        {type !== "mc" && (
                          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-white/5">
                            <EditableField
                              label="Sở thích, Ghét, Nỗi sợ (SFW)"
                              field="preferences_sfw"
                              value={editedData.preferences?.sfw || ""}
                              isEditing={isEditing}
                              onChange={(val) =>
                                setEditedData((prev: any) => ({
                                  ...prev,
                                  preferences: {
                                    ...prev.preferences,
                                    sfw: val,
                                  },
                                }))
                              }
                              multiline
                            />
                            <EditableField
                              label="Sở thích, Ghét, Nỗi sợ (NSFW)"
                              field="preferences_nsfw"
                              value={editedData.preferences?.nsfw || ""}
                              isEditing={isEditing}
                              onChange={(val) =>
                                setEditedData((prev: any) => ({
                                  ...prev,
                                  preferences: {
                                    ...prev.preferences,
                                    nsfw: val,
                                  },
                                }))
                              }
                              multiline
                            />
                          </div>
                        )}

                        <div className="flex flex-col gap-2 col-span-1 md:col-span-2 pt-3 border-t border-white/5">
                          <span className="text-[10px] uppercase tracking-widest text-purple-400/80 flex items-center gap-1">
                            <Key size={12} /> Nội tâm / Suy nghĩ thầm kín
                          </span>
                          {isEditing ? (
                            <textarea
                              value={editedData.innerSecret || ""}
                              onChange={(e) =>
                                handleChange("innerSecret", e.target.value)
                              }
                              className={`w-full border rounded-lg p-2 text-sm outline-none focus:border-purple-500/50 resize-y min-h-[80px] ${
                                isDark
                                  ? "bg-black/40 border-white/20 text-purple-200/90"
                                  : "bg-white border-purple-200 text-[#3E2723] focus:ring-1 focus:ring-purple-300"
                              }`}
                            />
                          ) : (
                            <span
                              className={`text-sm leading-relaxed whitespace-pre-wrap italic ${isDark ? "text-purple-200/70" : "text-purple-900/80 font-medium"}`}
                            >
                              {editedData.innerSecret || (
                                <span className="italic opacity-30">
                                  Không có dữ liệu.
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {type === "npc" && (
                          <div className="flex flex-col gap-2 col-span-1 md:col-span-2 pt-3 border-t border-white/5">
                            <span className="text-[10px] uppercase tracking-widest text-amber-400/90 flex items-center gap-1 font-bold">
                              <MessageSquareQuote size={12} /> Ấn tượng & Suy nghĩ (về MC / Thế giới)
                            </span>
                            {isEditing ? (
                              <textarea
                                value={editedData.impression || ""}
                                onChange={(e) =>
                                  handleChange("impression", e.target.value)
                                }
                                placeholder="Nhập ấn tượng và suy nghĩ tổng quan của NPC..."
                                className={`w-full border rounded-lg p-2.5 text-sm outline-none focus:border-amber-500/50 resize-y min-h-[80px] ${
                                  isDark
                                    ? "bg-black/40 border-white/20 text-amber-200/90"
                                    : "bg-white border-amber-200 text-[#3E2723] focus:ring-1 focus:ring-amber-300"
                                }`}
                              />
                            ) : (
                              <div
                                className={`text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-xl border ${
                                  isDark
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-200/90"
                                    : "bg-amber-50/80 border-amber-200 text-amber-950 font-medium"
                                }`}
                              >
                                {editedData.impression ? (
                                  typeof editedData.impression === "string"
                                    ? stripHtmlTags(editedData.impression)
                                    : stripHtmlTags(editedData.impression)
                                ) : (
                                  <span className="italic opacity-40 font-normal">
                                    Chưa có ghi nhận ấn tượng & suy nghĩ tổng quan.
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Background & Relationships */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="p-5 md:p-6 rounded-2xl theme-panel">
                        <h3
                          className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${getHeaderColorClass("teal")}`}
                        >
                          <BookOpen size={16} /> Nguồn gốc / Xuất thân
                        </h3>
                        <EditableField
                          label=""
                          field="background"
                          value={editedData.background || ""}
                          isEditing={isEditing}
                          onChange={(val) => handleChange("background", val)}
                          multiline
                        />
                      </div>

                      {type === "npc" && (
                        <div className="p-5 md:p-6 rounded-2xl theme-panel">
                          <h3
                            className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${getHeaderColorClass("sky")}`}
                          >
                            <Users size={16} /> Tổng quan các quan hệ
                          </h3>
                          <EditableRelationshipArrayField
                            label=""
                            items={editedData.relationships || []}
                            isEditing={isEditing}
                            onChange={(val) =>
                              handleChange("relationships", val)
                            }
                          />
                        </div>
                      )}
                    </div>

                    {/* NSFW & Romance */}
                    <div className="p-5 md:p-6 rounded-2xl theme-panel">
                      <h3
                        className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${getHeaderColorClass("rose")}`}
                      >
                        <Flame size={16} /> Lãng mạn & Tình dục (NSFW)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EditableField
                          label="Quan niệm tình yêu & Tình dục"
                          field="loveViews"
                          value={editedData.loveViews || ""}
                          isEditing={isEditing}
                          onChange={(val) => handleChange("loveViews", val)}
                          multiline
                        />
                        <EditableField
                          label="Kinh nghiệm tình trường (trinh tiết, thủ thân hay từng trải)"
                          field="experience"
                          value={editedData.experience || ""}
                          isEditing={isEditing}
                          onChange={(val) => handleChange("experience", val)}
                          multiline
                        />

                        <EditableField
                          label="Tính cách khi NSFW"
                          field="nsfwPersonality"
                          value={editedData.nsfwPersonality || ""}
                          isEditing={isEditing}
                          onChange={(val) =>
                            handleChange("nsfwPersonality", val)
                          }
                          multiline
                          className="pt-3 border-t border-white/5"
                        />
                        <EditableField
                          label="Phản ứng đặc trưng (NSFW)"
                          field="nsfwReactions"
                          value={editedData.nsfwReactions || ""}
                          isEditing={isEditing}
                          onChange={(val) => handleChange("nsfwReactions", val)}
                          multiline
                          className="pt-3 border-t border-white/5"
                        />
                      </div>
                    </div>

                    {/* NHU CẦU */}
                    {type !== "mc" && (
                      <div className="p-5 md:p-6 rounded-2xl theme-panel">
                        <h3
                          className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${getHeaderColorClass("amber")}`}
                        >
                          <Target size={16} /> Nhu cầu (SFW & NSFW)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <EditableField
                            label="Nhu cầu SFW (Đời thường, tình cảm, sinh tồn...)"
                            field="needs_sfw"
                            value={editedData.needs?.sfw || ""}
                            isEditing={isEditing}
                            onChange={(val) =>
                              setEditedData((prev: any) => ({
                                ...prev,
                                needs: {
                                  ...prev.needs,
                                  sfw: val,
                                },
                              }))
                            }
                            multiline
                          />
                          <EditableField
                            label="Nhu cầu NSFW (Tình dục, khao khát thể xác...)"
                            field="needs_nsfw"
                            value={editedData.needs?.nsfw || ""}
                            isEditing={isEditing}
                            onChange={(val) =>
                              setEditedData((prev: any) => ({
                                ...prev,
                                needs: {
                                  ...prev.needs,
                                  nsfw: val,
                                },
                              }))
                            }
                            multiline
                          />
                        </div>
                      </div>
                    )}

                    {/* Literary Description */}
                    <div className="p-5 md:p-6 rounded-2xl theme-panel">
                      <h3
                        className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${getHeaderColorClass("slate")}`}
                      >
                        <FileText size={16} /> Miêu tả văn học (Dành cho ngữ
                        cảnh)
                      </h3>
                      <EditableField
                        label=""
                        field="literaryDescription"
                        value={editedData.literaryDescription || ""}
                        isEditing={isEditing}
                        onChange={(val) =>
                          handleChange("literaryDescription", val)
                        }
                        multiline
                      />
                    </div>
                  </div>
                </div>
                  )}
                </>
              )}

              {activeTab === "tui" && type === "mc" && (
                <div className="w-full">
                  <div className="p-5 md:p-6 rounded-2xl theme-panel mt-6">
                    <h3
                      className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4 ${getHeaderColorClass("yellow")}`}
                    >
                      Tài sản & Vật phẩm (Túi)
                    </h3>
                    <div className="inventory-editor">
                      {isEditing ? (
                        <div className="space-y-4">
                          {(Array.isArray(editedData.inventory)
                            ? editedData.inventory
                            : []
                          ).map((item: any, idx: number) => (
                            <div
                              key={`char-item-${item.id || ""}-${idx}`}
                              className={`p-4 rounded-xl flex flex-col gap-2 border ${isDark ? "border-white/10 bg-white/5" : `border-black/10 ${theme.bgClass}`}`}
                            >
                              <div className="flex gap-4 items-center">
                                <input
                                  className={`flex-1 text-sm font-bold bg-transparent border-b outline-none pb-1 ${isDark ? "text-white border-white/20 focus:border-white/50" : "text-slate-900 border-slate-300 focus:border-slate-500"}`}
                                  value={item.name}
                                  onChange={(e) => {
                                    const newInv = [...editedData.inventory];
                                    newInv[idx] = {
                                      ...newInv[idx],
                                      name: e.target.value,
                                    };
                                    handleChange("inventory", newInv as any);
                                  }}
                                  placeholder="Tên vật phẩm"
                                />
                                <input
                                  type="number"
                                  className={`w-16 text-sm text-center bg-transparent border-b outline-none pb-1 ${isDark ? "text-white border-white/20 focus:border-white/50" : "text-slate-900 border-slate-300 focus:border-slate-500"}`}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newInv = [...editedData.inventory];
                                    newInv[idx] = {
                                      ...newInv[idx],
                                      quantity: Number(e.target.value),
                                    };
                                    handleChange("inventory", newInv as any);
                                  }}
                                  placeholder="SL"
                                />
                                <button
                                  onClick={() => {
                                    const newInv = [...editedData.inventory];
                                    newInv.splice(idx, 1);
                                    handleChange("inventory", newInv as any);
                                  }}
                                  className="text-red-500 hover:text-red-400 p-1 font-bold text-xs shrink-0"
                                >
                                  XÓA
                                </button>
                              </div>
                              <textarea
                                className={`w-full text-xs bg-transparent outline-none resize-none pt-1 min-h-[40px] ${isDark ? "text-white/70" : "text-slate-600"}`}
                                value={item.description || ""}
                                onChange={(e) => {
                                  const newInv = [...editedData.inventory];
                                  newInv[idx] = {
                                    ...newInv[idx],
                                    description: e.target.value,
                                  };
                                  handleChange("inventory", newInv as any);
                                }}
                                placeholder="Mô tả công dụng..."
                              />
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              let newInv = Array.isArray(editedData.inventory)
                                ? [...editedData.inventory]
                                : [];
                              if (
                                typeof editedData.inventory === "string" &&
                                editedData.inventory.trim() !== ""
                              ) {
                                newInv = [
                                  {
                                    id: "item_1",
                                    name: "Vật phẩm cũ",
                                    quantity: 1,
                                    description: editedData.inventory,
                                  },
                                ];
                              }
                              newInv.push({
                                id: `item_${Date.now()}`,
                                name: "",
                                quantity: 1,
                                description: "",
                              });
                              handleChange("inventory", newInv as any);
                            }}
                            className={`w-full p-3 rounded-xl border border-dashed text-xs uppercase tracking-widest font-bold transition-colors mt-2 ${
                              isDark
                                ? "border-white/20 text-white/50 hover:bg-white/5 hover:text-white"
                                : "border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            }`}
                          >
                            + THÊM VẬT PHẨM
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {!editedData.inventory ||
                          (Array.isArray(editedData.inventory) &&
                            editedData.inventory.length === 0) ? (
                            <div
                              className={`col-span-full py-8 text-center text-sm ${isDark ? "text-white/40" : "text-slate-400"}`}
                            >
                              Túi đồ trống không.
                            </div>
                          ) : Array.isArray(editedData.inventory) ? (
                            editedData.inventory.map(
                              (item: any, idx: number) => (
                                <InventoryItemRender key={`char-item-${item.id || ""}-${idx}`} item={item} idx={idx} isDark={isDark} />
                              ),
                            )
                          ) : (
                            <div
                              className={`col-span-full text-sm whitespace-pre-wrap ${isDark ? "text-white/70" : "text-slate-600"}`}
                            >
                              {editedData.inventory}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className={`w-full max-w-4xl mx-auto px-4 pb-8 z-10 relative mt-4 flex gap-4 ${type !== "npc" ? "justify-end" : ""}`}
          >
            {type === "npc" && (
              <button
                onClick={handleDeleteNPC}
                className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm transition-colors border border-red-500 shadow-lg"
              >
                Xóa NPC
              </button>
            )}
            <button
              onClick={scrollToTop}
              className={`p-4 rounded-xl transition-colors border cursor-pointer flex items-center justify-center flex-shrink-0 ${
                isDark
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm"
              }`}
              title="Cuộn lên đầu"
            >
              <ArrowUpToLine size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Avatar Selection Modal */}
      {showAvatarSelect && (
        <div
          className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAvatarSelect(false)}
        >
          <div
            className={`rounded-2xl p-6 max-w-lg w-full relative shadow-2xl max-h-[80vh] flex flex-col ${
              isDark
                ? "theme-panel !border-none"
                : "bg-[#FFFDFB] border border-amber-250"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAvatarSelect(false)}
              className={`absolute top-4 right-4 z-10 transition-colors ${
                isDark
                  ? "text-white/50 hover:text-white"
                  : "text-amber-850 hover:text-[#3E2723]"
              }`}
            >
              <X size={20} />
            </button>
            <h3
              className={`text-lg font-bold mb-6 uppercase tracking-wider text-center shrink-0 ${
                isDark ? "text-white" : "text-[#3E2723]"
              }`}
            >
              Nguồn Ảnh Đại Diện
            </h3>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAvatarSelect(false);
                }}
                className="p-4 rounded-xl theme-button text-sm font-medium flex items-center justify-center gap-2"
              >
                Tải lên từ Máy
              </button>
              <button
                onClick={() => {
                  setShowAvatarSelect(false);
                  setShowUrlInput(true);
                }}
                className="p-4 rounded-xl theme-button text-sm font-medium flex items-center justify-center gap-2"
              >
                Nhập Link URL
              </button>
              <button
                onClick={() => {
                  setShowAvatarSelect(false);
                  setShowGalleryPicker(true);
                }}
                className={`p-4 rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2 border ${
                  isDark
                    ? "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-300"
                    : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 font-bold"
                }`}
              >
                Chọn từ nút "Ảnh"
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Picker (Full-Screen Expanded Overlay) */}
      {showGalleryPicker && (
        <div className="absolute inset-0 z-[70]">
          <GalleryModal
            isSelectMode={true}
            onSelect={(url) => {
              handleAvatarChange(url);
              setShowGalleryPicker(false);
            }}
            onClose={() => {
              setShowGalleryPicker(false);
              setShowAvatarSelect(true);
            }}
          />
        </div>
      )}

      {showUrlInput && (
        <div
          className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowUrlInput(false)}
        >
          <div
            className={`rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 ${
              isDark
                ? "theme-panel !border-none"
                : "bg-[#FFFDFB] border border-amber-250"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className={`text-lg font-bold uppercase tracking-wider ${
                isDark ? "text-white" : "text-[#3E2723]"
              }`}
            >
              Nhập Link URL Ảnh
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="https://example.com/image.jpg"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitUrl()}
                className="flex-1 theme-input border rounded-lg px-4 py-2 text-sm outline-none"
              />
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setUrlInputValue(text);
                  } catch (err) {
                    toast.error(
                      "Không thể dán tự động, vui lòng dán thủ công.",
                    );
                  }
                }}
                className="px-3 py-2 theme-button rounded-lg transition-all text-sm font-bold"
                title="Dán từ Clipboard"
              >
                Dán
              </button>
            </div>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setShowUrlInput(false)}
                className={`px-4 py-2 rounded-xl transition-all text-sm font-bold ${
                  isDark
                    ? "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                    : "bg-amber-100 hover:bg-amber-200 text-[#5C4033] hover:text-[#3E2723]"
                }`}
              >
                HỦY
              </button>
              <button
                onClick={submitUrl}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all text-sm font-bold"
              >
                XÁC NHẬN
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmUpdateModal && (
        <NpcUpdateModal
          npc={editedData}
          npcIndex={type === "mc" ? -1 : (npcIndex as number)}
          onClose={() => setShowConfirmUpdateModal(false)}
          onApply={(updatedData) => {
            const newCharData = JSON.parse(JSON.stringify(editedData));
            Object.entries(updatedData).forEach(([k, v]) => {
              newCharData[k] = v;
              if (!isBuiltInField(k)) {
                if (!newCharData.customData) newCharData.customData = {};
                newCharData.customData[k] = v;
              }
            });
            delete newCharData.pendingUpdates;
            setEditedData(newCharData);
            if (!isEditing && gameData) {
              if (type === "mc") {
                setGameData({ ...gameData, mcData: newCharData });
                toast.success("Đã áp dụng cập nhật MC thành công!");
              } else {
                const origNpcs = [...(gameData.npcs || [])];
                origNpcs[npcIndex as number] = newCharData;
                setGameData({ ...gameData, npcs: origNpcs });
                toast.success("Đã áp dụng cập nhật NPC thành công!");
              }
            } else if (isEditing) {
              toast.success(
                "Thay đổi đã cập nhật, vui lòng ấn Lưu để lưu lại.",
              );
            }
            setShowConfirmUpdateModal(false);
          }}
        />
      )}

      {showTemplateConfigModal && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-md bg-black/70 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setShowTemplateConfigModal(false)}
        >
          <div
            className={`rounded-2xl p-4 sm:p-6 max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border ${
              isDark
                ? "bg-[#18181b] border-white/10 text-white"
                : "bg-[#FFFDFB] border-amber-250 text-[#3E2723]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider">
                  Cài Đặt Bảng Thông Tin ({type === "mc" ? "Nhân Vật Chính - MC" : "Nhân Vật Phụ - NPC"})
                </h3>
              </div>
              <button
                onClick={() => setShowTemplateConfigModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 custom-scrollbar pr-1">
              {/* Chọn chế độ bảng */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider opacity-80">
                    Chế độ bảng thông tin
                  </h4>
                  <p className="text-[11px] sm:text-xs opacity-60">
                    Chọn sử dụng bảng mặc định hoặc tự tạo bảng tùy chỉnh theo ý thích
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setTempTemplateMode("default")}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      tempTemplateMode === "default"
                        ? "bg-purple-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Mặc định
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempTemplateMode("custom");
                      if (!tempCustomFields || tempCustomFields.length === 0) {
                        setTempCustomFields(type === "mc" ? DEFAULT_MC_FIELDS : DEFAULT_NPC_FIELDS);
                      }
                    }}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      tempTemplateMode === "custom"
                        ? "bg-purple-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tùy chỉnh
                  </button>
                </div>
              </div>

              {/* Phần Tùy Chỉnh Chi Tiết */}
              {tempTemplateMode === "custom" && (
                <div className="space-y-4 pt-2">
                  {/* Ý tưởng tạo bảng với AI */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                      Ý TƯỞNG BẢNG THÔNG TIN (AI TỰ TẠO)
                    </label>
                    <textarea
                      value={templateIdea}
                      onChange={(e) => setTemplateIdea(e.target.value)}
                      placeholder="Ví dụ: Tạo bảng thông tin chỉ số RPG gồm Sức mạnh, Nhanh nhẹn, Trí tuệ, Môn phái, Linh căn, Công pháp tu luyện..."
                      rows={2}
                      className={`w-full p-3 rounded-xl border text-xs sm:text-sm outline-none resize-none transition-all ${
                        isDark
                          ? "bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-purple-500"
                          : "bg-white border-black/10 text-black placeholder-black/30 focus:border-purple-500"
                      }`}
                    />
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setTempCustomFields([])}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                          isDark
                            ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                            : "border-black/10 hover:bg-black/5 text-black/70 hover:text-black"
                        }`}
                      >
                        Xóa Trắng
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempCustomFields(type === "mc" ? DEFAULT_MC_FIELDS : DEFAULT_NPC_FIELDS)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                          isDark
                            ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                            : "border-black/10 hover:bg-black/5 text-black/70 hover:text-black"
                        }`}
                      >
                        Tải Mẫu Mặc Định
                      </button>
                      {type === "npc" && gameData?.customMcFields && gameData.customMcFields.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTempCustomFields([...gameData.customMcFields])}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                            isDark
                              ? "border-blue-500/30 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300"
                              : "border-blue-500/30 hover:bg-blue-50/50 text-blue-600 hover:text-blue-700"
                          }`}
                        >
                          Sao Chép Cấu Trúc Từ MC
                        </button>
                      )}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isGeneratingTemplate}
                        onClick={handleGenerateTemplate}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingTemplate ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Đang tạo...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" /> AI Tạo Bảng
                          </>
                        )}
                      </motion.button>
                    </div>

                    {type === "npc" && (
                      <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${isDark ? "bg-purple-950/20 border-purple-500/30" : "bg-purple-50 border-purple-200"}`}>
                        <div className="flex flex-col gap-0.5 pr-2">
                          <span className={`text-xs sm:text-sm font-bold ${isDark ? "text-purple-300" : "text-purple-900"}`}>
                            Tắt mảng Nhân Quả / Quan Hệ mặc định để dùng Custom
                          </span>
                          <span className={`text-[11px] opacity-70 ${isDark ? "text-purple-200" : "text-purple-800"}`}>
                            Cho phép tự do thiết kế các trường/mảng quan hệ tùy ý (subFields) mà không bị ép khuôn mẫu quan hệ cố định của hệ thống.
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={!!tempDisableDefaultNpcRelationships}
                            onChange={(e) => setTempDisableDefaultNpcRelationships(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Hướng dẫn sử dụng */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm transition-all duration-300 ${
                      isDark
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                        : "bg-blue-50 border-blue-200 text-blue-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setIsGuideOpen(!isGuideOpen)}
                      className="w-full text-left font-bold flex items-center justify-between gap-2 cursor-pointer focus:outline-none"
                    >
                      <span className="flex items-center gap-2">
                        <Info className="w-4 h-4 shrink-0" /> Hướng dẫn sử dụng Bảng Tùy Chỉnh
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider opacity-60 font-medium">
                          {isGuideOpen ? "Click để thu gọn" : "Click để mở rộng"}
                        </span>
                        {isGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    {isGuideOpen && (
                      <div className="mt-3 pt-3 border-t border-dashed border-blue-500/20 dark:border-blue-500/30">
                        <ul className="list-disc list-inside space-y-1 opacity-90 text-[11px] sm:text-xs">
                          {type === "mc" && (
                            <li>
                              <b>Tên gọi & Túi đồ (Inventory):</b> Luôn là 2 mục mặc định cố định ở đầu và cuối bảng MC.
                            </li>
                          )}
                          <li>
                            <b>Tên hiển thị:</b> Tiêu đề sẽ hiện trên bảng nhập liệu (VD: "Chỉ số Sức mạnh").
                          </li>
                          <li>
                            <b>Hướng dẫn về định nghĩa/nội dung:</b> Định nghĩa rõ ý nghĩa của trường này để AI hiểu bản chất nội dung (VD: "Thang điểm 1-100, quyết định sát thương vật lý").
                          </li>
                          <li>
                            <b>Yêu cầu với AI:</b> Yêu cầu chi tiết về cách viết, độ dài, phong cách cho AI (VD: "Viết 2-3 câu ngắn gọn, bám sát bối cảnh").
                          </li>
                          <li>
                            <b>Loại:</b> "Dòng ngắn" cho dữ liệu ít chữ (Tên, Tuổi, Cấp bậc), "Nhiều dòng" cho đoạn văn dài (Tiểu sử, Công pháp, Mô tả).
                          </li>
                          <li>
                            <b>Kích hoạt tạo mảng (Array Mode):</b> Khi tích chọn "Tạo mảng", AI sẽ tạo ra dữ liệu dưới dạng một mảng (danh sách) các đối tượng thay vì một ô văn bản duy nhất. Trong mảng này, bạn có thể hướng dẫn AI tạo ra nhiều trường nhỏ (sub-fields) bằng cách định nghĩa rõ cấu trúc mong muốn trong phần "Hướng dẫn định nghĩa" hoặc "Yêu cầu với AI" (Ví dụ: <i>Mảng "Kỹ năng" chứa các trường nhỏ: Tên chiêu thức, Sức sát thương, Mô tả hiệu ứng...</i>).
                          </li>
                          <li>
                            <b>Cơ chế kích hoạt điều kiện:</b> Cho phép bạn cấu hình để hiển thị động (bật/tắt) các trường phụ thuộc dựa trên giá trị của các <b>Trường Tham Chiếu (Gốc)</b> là số. Hệ thống hỗ trợ thêm <b>nhiều tham chiếu gốc riêng biệt cùng một lúc</b> (Ví dụ: Tham chiếu 1 là "Cấp độ" &gt;= 10 bật "Kỹ năng", Tham chiếu 2 là "Độ thân mật" &gt;= 50 bật "Nhật ký bí mật") cùng các toán tử so sánh linh hoạt (≥, &gt;, ≤, &lt;, ==, !=).
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Danh sách trường custom */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider opacity-80">
                          Chỉnh sửa cấu trúc bảng ({tempCustomFields.length} trường):
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsFieldsOpen(!isFieldsOpen)}
                          className={`p-1 rounded border transition-all cursor-pointer flex items-center justify-center ${
                            isDark
                              ? "border-white/10 hover:bg-white/10 text-white/80"
                              : "border-slate-300 hover:bg-slate-100 text-slate-700"
                          }`}
                          title={isFieldsOpen ? "Thu gọn cấu trúc" : "Mở rộng cấu trúc"}
                        >
                          {isFieldsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newFields = [
                            ...tempCustomFields,
                            {
                              id: "field" + Date.now(),
                              label: "Trường mới",
                              type: "input",
                              description: "",
                              aiRequirement: "",
                            },
                          ];
                          setTempCustomFields(newFields);
                          setIsFieldsOpen(true); // Tự động mở rộng khi thêm mới
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm trường mới
                      </button>
                    </div>

                    {isFieldsOpen && (
                      tempCustomFields.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-white/10 rounded-xl text-xs sm:text-sm opacity-60">
                          Chưa có trường tùy chỉnh nào. Bấm "AI Tạo Bảng", "Tải Mẫu Mặc Định" hoặc "Thêm trường mới" để bắt đầu!
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {tempCustomFields.map((field: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all shadow-sm ${
                                isDark ? "bg-black/30 border-white/10" : "bg-black/5 border-black/10"
                              }`}
                            >
                              <div className={`flex items-center justify-between mb-2 pb-2 border-b ${isDark ? "border-white/10" : "border-black/10"}`}>
                                <label className={`flex items-center gap-2 cursor-pointer ${isDark ? "text-white" : "text-slate-800"}`}>
                                  <input 
                                    type="checkbox" 
                                    checked={field.enabled !== false} 
                                    onChange={(e) => {
                                      const newFields = [...tempCustomFields];
                                      newFields[idx] = { ...newFields[idx], enabled: e.target.checked };
                                      setTempCustomFields(newFields);
                                    }}
                                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                                  />
                                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Sử dụng</span>
                                </label>
                                <div className={`flex items-center gap-2 ${isDark ? "text-white/80" : "text-slate-700"}`}>
                                  <span className="text-[10px] uppercase font-bold">Thứ tự:</span>
                                  <input 
                                    type="number" 
                                    className={`w-14 border rounded px-1.5 py-0.5 text-xs text-center outline-none transition-colors ${
                                      isDark 
                                        ? "bg-black/30 border-white/20 text-white focus:border-purple-500" 
                                        : "bg-white border-slate-300 text-slate-900 focus:border-purple-500"
                                    }`}
                                    value={field.order ?? idx + 1}
                                    onChange={(e) => {
                                      const newFields = [...tempCustomFields];
                                      newFields[idx] = { ...newFields[idx], order: parseInt(e.target.value) || 0 };
                                      setTempCustomFields(newFields);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                                  Tên hiển thị:
                                </label>
                                <input
                                  type="text"
                                  placeholder="Tên trường (VD: Chỉ số Sức mạnh, Tuyệt kỹ...)"
                                  className={`w-full bg-transparent border-b ${
                                    isDark ? "border-white/20 text-white" : "border-black/20 text-black"
                                  } outline-none px-1 py-0.5 text-xs sm:text-sm font-bold`}
                                  value={field.label || ""}
                                  onChange={(e) => {
                                    const newFields = [...tempCustomFields];
                                    newFields[idx] = { ...newFields[idx], label: e.target.value };
                                    setTempCustomFields(newFields);
                                  }}
                                />
                              </div>

{field.isArray ? (
                                <div className="flex flex-col gap-2 mt-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                                      Các trường con (Sub-fields):
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newFields = [...tempCustomFields];
                                        const subFields = newFields[idx].subFields || [];
                                        newFields[idx] = { ...newFields[idx], subFields: [...subFields, { label: "", description: "", aiRequirement: "" }] };
                                        setTempCustomFields(newFields);
                                      }}
                                      className={`px-2 py-1 text-[9px] font-bold rounded border ${isDark ? "border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20" : "border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"}`}
                                    >
                                      + Thêm trường con
                                    </button>
                                  </div>
                                  {(field.subFields || []).map((subField: any, subIdx: number) => (
                                    <div key={subIdx} className={`p-2 rounded-lg border border-dashed flex flex-col gap-1.5 relative ${isDark ? "border-white/20 bg-black/40" : "border-black/20 bg-white/40"}`}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newFields = [...tempCustomFields];
                                          newFields[idx].subFields.splice(subIdx, 1);
                                          setTempCustomFields(newFields);
                                        }}
                                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                      <input
                                        type="text"
                                        placeholder="Tên trường con (VD: Tên, Mô tả...)"
                                        className={`w-[calc(100%-24px)] bg-transparent border-b ${isDark ? "border-white/20 text-white" : "border-black/20 text-black"} outline-none px-1 text-xs font-bold`}
                                        value={subField.label || ""}
                                        onChange={(e) => {
                                          const newFields = [...tempCustomFields];
                                          newFields[idx].subFields[subIdx].label = e.target.value;
                                          setTempCustomFields(newFields);
                                        }}
                                      />
                                      <textarea
                                        rows={1}
                                        placeholder="Định nghĩa/Nội dung"
                                        className={`w-full bg-transparent border rounded p-1.5 ${isDark ? "border-white/10 text-white/80" : "border-black/10 text-black/80"} outline-none text-[10px] resize-y`}
                                        value={subField.description || ""}
                                        onChange={(e) => {
                                          const newFields = [...tempCustomFields];
                                          newFields[idx].subFields[subIdx].description = e.target.value;
                                          setTempCustomFields(newFields);
                                        }}
                                      />
                                      <textarea
                                        rows={1}
                                        placeholder="Yêu cầu với AI"
                                        className={`w-full bg-transparent border rounded p-1.5 ${isDark ? "border-white/10 text-white/80" : "border-black/10 text-black/80"} outline-none text-[10px] resize-y`}
                                        value={subField.aiRequirement || ""}
                                        onChange={(e) => {
                                          const newFields = [...tempCustomFields];
                                          newFields[idx].subFields[subIdx].aiRequirement = e.target.value;
                                          setTempCustomFields(newFields);
                                        }}
                                      />
                                    </div>
                                  ))}
                                  {(!field.subFields || field.subFields.length === 0) && (
                                    <div className={`text-[10px] text-center p-2 rounded border border-dashed ${isDark ? "border-white/10 text-white/40" : "border-black/10 text-black/40"}`}>
                                      Chưa có trường con. Nhấn "+ Thêm trường con" để tạo khuôn mẫu.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                                      Hướng dẫn về định nghĩa/nội dung:
                                    </label>
                                    <textarea
                                      rows={2}
                                      placeholder="Định nghĩa ý nghĩa và nội dung trường này..."
                                      className={`w-full bg-transparent border rounded-lg p-2 ${
                                        isDark ? "border-white/10 text-white/80 bg-black/20" : "border-black/10 text-black/80 bg-white/40"
                                      } outline-none text-xs resize-y`}
                                      value={field.description || ""}
                                      onChange={(e) => {
                                        const newFields = [...tempCustomFields];
                                        newFields[idx] = { ...newFields[idx], description: e.target.value };
                                        setTempCustomFields(newFields);
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                                      Yêu cầu với AI:
                                    </label>
                                    <textarea
                                      rows={2}
                                      placeholder="Yêu cầu AI viết đúng ý (VD: Viết 2-3 câu ngắn gọn, hoặc bám sát bối cảnh...)"
                                      className={`w-full bg-transparent border rounded-lg p-2 ${
                                        isDark ? "border-white/10 text-white/80 bg-black/20" : "border-black/10 text-black/80 bg-white/40"
                                      } outline-none text-xs resize-y`}
                                      value={field.aiRequirement || ""}
                                      onChange={(e) => {
                                        const newFields = [...tempCustomFields];
                                        newFields[idx] = { ...newFields[idx], aiRequirement: e.target.value };
                                        setTempCustomFields(newFields);
                                      }}
                                    />
                                  </div>
                                </>
                              )}

                              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/5 gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <label className="text-[10px] uppercase font-bold opacity-70">
                                      Loại:
                                    </label>
                                    <select
                                      className={`bg-transparent text-xs font-bold outline-none cursor-pointer ${
                                        isDark ? "text-white" : "text-black"
                                      }`}
                                      value={field.type === "textarea" ? "textarea" : "input"}
                                      onChange={(e) => {
                                        const newFields = [...tempCustomFields];
                                        newFields[idx] = {
                                          ...newFields[idx],
                                          type: e.target.value as "input" | "textarea",
                                        };
                                        setTempCustomFields(newFields);
                                      }}
                                    >
                                      <option value="input" className="bg-slate-800 text-white">
                                        Dòng ngắn
                                      </option>
                                      <option value="textarea" className="bg-slate-800 text-white">
                                        Nhiều dòng
                                      </option>
                                    </select>
                                  </div>

                                  <label className="flex items-center gap-1 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={field.isArray || false}
                                      onChange={(e) => {
                                        const newFields = [...tempCustomFields];
                                        newFields[idx] = {
                                          ...newFields[idx],
                                          isArray: e.target.checked,
                                        };
                                        setTempCustomFields(newFields);
                                      }}
                                      className="w-3.5 h-3.5 accent-purple-600 rounded cursor-pointer"
                                    />
                                    <span className="text-[10px] uppercase font-black tracking-wider opacity-70">
                                      Tạo mảng
                                    </span>
                                  </label>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newFields = tempCustomFields.filter((_, i) => i !== idx);
                                    setTempCustomFields(newFields);
                                  }}
                                  className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa trường này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              const newFields = [
                                ...tempCustomFields,
                                {
                                  id: "field" + Date.now(),
                                  label: "Trường mới",
                                  type: "input",
                                  description: "",
                                  aiRequirement: "",
                                },
                              ];
                              setTempCustomFields(newFields);
                            }}
                            className={`p-3 min-h-[100px] rounded-xl border border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                              isDark
                                ? "border-white/20 hover:bg-white/5 text-white/50 hover:text-white"
                                : "border-black/20 hover:bg-black/5 text-black/50 hover:text-black"
                            }`}
                          >
                            <Plus className="w-5 h-5" />
                            <span className="text-xs font-bold">Thêm trường</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setShowTemplateConfigModal(false)}
                className={`px-4 py-2 rounded-xl transition-all text-xs sm:text-sm font-bold cursor-pointer ${
                  isDark
                    ? "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                    : "bg-amber-100 hover:bg-amber-200 text-[#5C4033]"
                }`}
              >
                HỦY
              </button>
              <button
                type="button"
                onClick={handleSaveTemplateConfig}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
              >
                LƯU CẤU HÌNH BẢNG
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
