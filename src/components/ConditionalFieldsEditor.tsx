import React from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Power, Layers, Sparkles, Sliders, CheckSquare, Square, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ConditionalGroup, 
  SingleCondition, 
  NumberOperator, 
  TextOperator, 
  ValueType, 
  normalizeConditions 
} from '../utils/conditionalFields';

interface ConditionalFieldsEditorProps {
  type: 'mc' | 'npc';
  theme: any;
}

export default function ConditionalFieldsEditor({ type, theme }: ConditionalFieldsEditorProps) {
  const worldCreation = useStore(state => state.worldCreation);
  const updateWorldCreation = useStore(state => state.updateWorldCreation);
  
  const fields = type === 'mc' ? worldCreation.customMcFields : worldCreation.customNpcFields;
  const rawConditions = type === 'mc' ? worldCreation.customMcConditions : worldCreation.customNpcConditions;
  
  const isDark = theme.group === 'Dark';

  if (!fields || fields.length === 0) return null;

  const normalized = normalizeConditions(rawConditions);
  const groups: ConditionalGroup[] = normalized?.groups || [];
  const isEnabled = !!rawConditions?.enabled;

  const saveConditions = (enabled: boolean, newGroups: ConditionalGroup[]) => {
    const payload = {
      enabled,
      groups: newGroups
    };
    if (type === 'mc') {
      updateWorldCreation({ customMcConditions: payload });
    } else {
      updateWorldCreation({ customNpcConditions: payload });
    }
  };

  const handleToggle = () => {
    if (!isEnabled) {
      let initialGroups = groups;
      if (initialGroups.length === 0) {
        const firstField = fields[0];
        const targetField = fields.length > 1 ? fields[1] : fields[0];
        initialGroups = [{
          id: `group-${Date.now()}`,
          name: 'Nhóm quy tắc #1',
          logicOperator: 'AND',
          conditions: [{
            id: `c-${Date.now()}`,
            fieldId: firstField?.id || '',
            valueType: 'number',
            numOperator: '>=',
            threshold: 10,
            thresholdMax: 100,
            textOperator: 'equals',
            textValue: ''
          }],
          targetFieldIds: targetField && targetField.id !== firstField?.id ? [targetField.id] : []
        }];
      }
      saveConditions(true, initialGroups);
    } else {
      saveConditions(false, groups);
    }
  };

  const addGroup = () => {
    const existingGroupRefIds = new Set(groups.flatMap(g => g.conditions.map(c => c.fieldId)));
    const nextAvailableField = fields.find((f: any) => !existingGroupRefIds.has(f.id)) || fields[0];
    const targetCandidate = fields.find((f: any) => f.id !== nextAvailableField?.id);

    const newGroup: ConditionalGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Nhóm quy tắc #${groups.length + 1}`,
      logicOperator: 'AND',
      conditions: [{
        id: `c-${Date.now()}`,
        fieldId: nextAvailableField?.id || fields[0]?.id || '',
        valueType: 'number',
        numOperator: '>=',
        threshold: 10,
        thresholdMax: 100,
        textOperator: 'equals',
        textValue: ''
      }],
      targetFieldIds: targetCandidate ? [targetCandidate.id] : []
    };
    saveConditions(true, [...groups, newGroup]);
  };

  const removeGroup = (groupId: string) => {
    const newGroups = groups.filter(g => g.id !== groupId);
    if (newGroups.length === 0) {
      saveConditions(false, []);
    } else {
      saveConditions(true, newGroups);
    }
  };

  const updateGroupLogic = (groupId: string, logicOperator: 'AND' | 'OR') => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, logicOperator };
      }
      return g;
    });
    saveConditions(true, newGroups);
  };

  // Add condition to a group
  const addCondition = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const usedFieldIds = new Set(group.conditions.map(c => c.fieldId));
    const nextAvailableField = fields.find((f: any) => !usedFieldIds.has(f.id)) || fields[0];

    const newCondition: SingleCondition = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fieldId: nextAvailableField?.id || fields[0]?.id || '',
      valueType: 'number',
      numOperator: '>=',
      threshold: 10,
      thresholdMax: 100,
      textOperator: 'equals',
      textValue: ''
    };

    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, conditions: [...g.conditions, newCondition] };
      }
      return g;
    });
    saveConditions(true, newGroups);
  };

  const updateCondition = (groupId: string, condId: string, updates: Partial<SingleCondition>) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        const updatedConditions = g.conditions.map(c => {
          if (c.id === condId) {
            return { ...c, ...updates };
          }
          return c;
        });
        return { ...g, conditions: updatedConditions };
      }
      return g;
    });
    saveConditions(true, newGroups);
  };

  const removeCondition = (groupId: string, condId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || group.conditions.length <= 1) return;

    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, conditions: g.conditions.filter(c => c.id !== condId) };
      }
      return g;
    });
    saveConditions(true, newGroups);
  };

  // Toggle target field for a group
  const toggleTargetField = (groupId: string, fieldId: string) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        const exists = g.targetFieldIds.includes(fieldId);
        const targetFieldIds = exists
          ? g.targetFieldIds.filter(id => id !== fieldId)
          : [...g.targetFieldIds, fieldId];
        return { ...g, targetFieldIds };
      }
      return g;
    });
    saveConditions(true, newGroups);
  };

  return (
    <div className={`mt-4 border-t border-dashed pt-4 ${isDark ? 'border-white/10 text-white' : 'border-black/10 text-slate-800'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
            <Power size={14} className={isEnabled ? 'text-purple-400' : 'text-slate-400'} /> CƠ CHẾ KÍCH HOẠT ĐIỀU KIỆN
          </label>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {groups.length} Nhóm quy tắc
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
            isEnabled 
              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20' 
              : isDark ? 'bg-white/10 text-white/50 border-white/10 hover:bg-white/15' : 'bg-black/5 text-slate-500 border-black/10 hover:bg-black/10'
          }`}
        >
          {isEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
        </button>
      </div>

      <AnimatePresence>
        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <p className="text-[11px] opacity-70 leading-relaxed">
              Thiết lập quy tắc hiển thị động cho các trường phụ thuộc. Mỗi nhóm có thể chứa <b>nhiều trường tham chiếu gốc</b> (kết hợp cả <b>Số</b> và <b>Chữ</b>, ví dụ: <i>"Tuổi &gt;= 18"</i> VÀ <i>"Giới tính == Nữ"</i> ➔ BẬT trường <i>"Nhan sắc"</i>).
            </p>

            {/* List of Groups */}
            <div className="space-y-5">
              {groups.map((group, groupIdx) => {
                const groupRefFieldIds = new Set(group.conditions.map(c => c.fieldId));
                // Target fields are all fields except those used as references in this group
                const availableTargetFields = fields.filter((f: any) => !groupRefFieldIds.has(f.id));

                return (
                  <div
                    key={group.id || groupIdx}
                    className={`p-4 rounded-xl border relative transition-all ${
                      isDark 
                        ? 'bg-white/[0.03] border-white/15 hover:border-purple-500/30' 
                        : 'bg-slate-50/90 border-slate-200 hover:border-purple-300 shadow-xs'
                    }`}
                  >
                    {/* Group Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-dashed border-black/10 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 font-extrabold text-xs flex items-center justify-center">
                          #{groupIdx + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wide opacity-90">
                          Nhóm Quy Tắc #{groupIdx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Logic Mode Toggle (AND vs OR) */}
                        {group.conditions.length > 1 && (
                          <div className="flex items-center rounded-lg border border-purple-500/30 overflow-hidden text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => updateGroupLogic(group.id, 'AND')}
                              className={`px-2 py-1 transition-all cursor-pointer ${
                                group.logicOperator !== 'OR' 
                                  ? 'bg-purple-600 text-white' 
                                  : isDark ? 'bg-black/30 text-white/60 hover:text-white' : 'bg-white text-slate-600 hover:text-black'
                              }`}
                              title="Tất cả các điều kiện tham chiếu bên dưới đều phải thỏa mãn"
                            >
                              TẤT CẢ (VÀ / AND)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateGroupLogic(group.id, 'OR')}
                              className={`px-2 py-1 transition-all cursor-pointer ${
                                group.logicOperator === 'OR' 
                                  ? 'bg-purple-600 text-white' 
                                  : isDark ? 'bg-black/30 text-white/60 hover:text-white' : 'bg-white text-slate-600 hover:text-black'
                              }`}
                              title="Chỉ cần ít nhất 1 điều kiện tham chiếu bên dưới thỏa mãn"
                            >
                              BẤT KỲ (HOẶC / OR)
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => removeGroup(group.id)}
                          className="px-2 py-1 text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                          title="Xóa nhóm quy tắc này"
                        >
                          <Trash2 size={12} /> Xóa nhóm
                        </button>
                      </div>
                    </div>

                    {/* SECTION 1: REFERENCE CONDITIONS (INPUT) */}
                    <div className="space-y-3 mb-4">
                      <label className="block text-xs font-bold uppercase opacity-80 flex items-center gap-1.5">
                        <Layers size={13} className="text-purple-400" /> 1. CÁC ĐIỀU KIỆN THAM CHIẾU GỐC ({group.conditions.length}):
                      </label>

                      <div className="space-y-2.5">
                        {group.conditions.map((cond, condIdx) => {
                          const currentField = fields.find((f: any) => f.id === cond.fieldId);
                          const valueType = cond.valueType || 'number';

                          return (
                            <div
                              key={cond.id || condIdx}
                              className={`p-3 rounded-lg border transition-all ${
                                isDark ? 'bg-black/50 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Condition Index / Label */}
                                <span className="text-[11px] font-black opacity-60 uppercase shrink-0">
                                  {condIdx === 0 ? 'NẾU' : group.logicOperator === 'OR' ? 'HOẶC' : 'VÀ'}
                                </span>

                                {/* Field Selector */}
                                <select
                                  value={cond.fieldId}
                                  onChange={(e) => updateCondition(group.id, cond.id || '', { fieldId: e.target.value })}
                                  className={`p-1.5 rounded-md text-xs font-bold outline-none border cursor-pointer min-w-[130px] flex-1 sm:flex-none ${
                                    isDark ? 'bg-black border-white/20 text-purple-300' : 'bg-slate-50 border-slate-300 text-purple-700'
                                  }`}
                                >
                                  {fields.map((f: any) => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                  ))}
                                </select>

                                {/* Value Type Selector: Số vs Chữ */}
                                <div className="flex items-center rounded-md border border-black/15 dark:border-white/15 overflow-hidden shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => updateCondition(group.id, cond.id || '', { valueType: 'number' })}
                                    className={`px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                      valueType === 'number'
                                        ? 'bg-amber-500 text-white'
                                        : isDark ? 'bg-black/30 text-white/50' : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    Số
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateCondition(group.id, cond.id || '', { valueType: 'text' })}
                                    className={`px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                      valueType === 'text'
                                        ? 'bg-blue-500 text-white'
                                        : isDark ? 'bg-black/30 text-white/50' : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    Chữ
                                  </button>
                                </div>

                                {/* Comparison Operators & Inputs */}
                                {valueType === 'number' ? (
                                  <>
                                    <select
                                      value={cond.numOperator || '>='}
                                      onChange={(e) => updateCondition(group.id, cond.id || '', { numOperator: e.target.value as NumberOperator })}
                                      className={`px-2 py-1.5 rounded-md text-xs font-bold border outline-none cursor-pointer shrink-0 ${
                                        isDark ? 'bg-black border-white/15 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                                      }`}
                                    >
                                      <option value=">=">&gt;= (Lớn hơn hoặc bằng)</option>
                                      <option value=">">&gt; (Lớn hơn)</option>
                                      <option value="<=">&lt;= (Nhỏ hơn hoặc bằng)</option>
                                      <option value="<">&lt; (Nhỏ hơn)</option>
                                      <option value="==">== (Bằng chính xác)</option>
                                      <option value="!=">!= (Khác)</option>
                                      <option value="between">Từ X đến Y (Khoảng)</option>
                                    </select>

                                    {cond.numOperator === 'between' ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px] opacity-60">Từ</span>
                                        <input
                                          type="number"
                                          value={cond.threshold ?? 0}
                                          onChange={(e) => updateCondition(group.id, cond.id || '', { threshold: parseFloat(e.target.value) || 0 })}
                                          className={`w-16 p-1.5 text-center rounded-md font-extrabold border outline-none text-xs ${
                                            isDark ? 'bg-black border-white/15 text-amber-300' : 'bg-slate-50 border-slate-300 text-amber-600'
                                          }`}
                                          placeholder="Từ"
                                        />
                                        <span className="text-[11px] opacity-60">đến</span>
                                        <input
                                          type="number"
                                          value={cond.thresholdMax ?? 100}
                                          onChange={(e) => updateCondition(group.id, cond.id || '', { thresholdMax: parseFloat(e.target.value) || 0 })}
                                          className={`w-16 p-1.5 text-center rounded-md font-extrabold border outline-none text-xs ${
                                            isDark ? 'bg-black border-white/15 text-amber-300' : 'bg-slate-50 border-slate-300 text-amber-600'
                                          }`}
                                          placeholder="Đến"
                                        />
                                      </div>
                                    ) : (
                                      <input
                                        type="number"
                                        value={cond.threshold ?? 0}
                                        onChange={(e) => updateCondition(group.id, cond.id || '', { threshold: parseFloat(e.target.value) || 0 })}
                                        className={`w-20 p-1.5 text-center rounded-md font-extrabold border outline-none text-xs ${
                                          isDark ? 'bg-black border-white/15 text-amber-300' : 'bg-slate-50 border-slate-300 text-amber-600'
                                        }`}
                                        placeholder="Giá trị số"
                                      />
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <select
                                      value={cond.textOperator || 'equals'}
                                      onChange={(e) => updateCondition(group.id, cond.id || '', { textOperator: e.target.value as TextOperator })}
                                      className={`px-2 py-1.5 rounded-md text-xs font-bold border outline-none cursor-pointer shrink-0 ${
                                        isDark ? 'bg-black border-white/15 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                                      }`}
                                    >
                                      <option value="equals">Bằng chính xác (=)</option>
                                      <option value="contains">Chứa từ / chuỗi</option>
                                      <option value="not_equals">Không bằng (≠)</option>
                                      <option value="not_empty">Đã có chữ (Không rỗng)</option>
                                    </select>

                                    {cond.textOperator !== 'not_empty' && (
                                      <input
                                        type="text"
                                        value={cond.textValue || ''}
                                        onChange={(e) => updateCondition(group.id, cond.id || '', { textValue: e.target.value })}
                                        placeholder="Nhập chữ (VD: Nam, Nữ, Kiếm tu...)"
                                        className={`flex-1 min-w-[130px] p-1.5 rounded-md font-bold border outline-none text-xs ${
                                          isDark ? 'bg-black border-white/15 text-blue-300 placeholder:text-white/30' : 'bg-slate-50 border-slate-300 text-blue-700 placeholder:text-slate-400'
                                        }`}
                                      />
                                    )}
                                  </>
                                )}

                                {/* Delete Condition Button (if > 1 condition) */}
                                {group.conditions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeCondition(group.id, cond.id || '')}
                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors shrink-0 cursor-pointer ml-auto"
                                    title="Xóa điều kiện tham chiếu này"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => addCondition(group.id)}
                        className={`w-full py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg border border-dashed transition-all cursor-pointer ${
                          isDark 
                            ? 'border-purple-500/30 text-purple-300 hover:bg-purple-500/10' 
                            : 'border-purple-400 text-purple-700 hover:bg-purple-50'
                        }`}
                      >
                        <Plus size={13} /> + Thêm điều kiện tham chiếu vào nhóm này (kết hợp nhiều trường)
                      </button>
                    </div>

                    {/* SECTION 2: TARGET FIELDS (OUTPUT) */}
                    <div className="space-y-2 pt-3 border-t border-dashed border-black/10 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase opacity-80 flex items-center gap-1.5">
                          <Sliders size={13} className="text-emerald-400" /> 2. CÁC TRƯỜNG PHỤ THUỘC SẼ ĐƯỢC BẬT ({group.targetFieldIds.length}):
                        </label>
                        <span className="text-[10px] opacity-60">
                          (Nhấn chọn các trường cần hiển thị khi thỏa mãn)
                        </span>
                      </div>

                      {availableTargetFields.length === 0 ? (
                        <p className="text-xs opacity-50 italic">Không có trường phụ thuộc nào khả dụng để bật.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {availableTargetFields.map((field: any) => {
                            const isSelected = group.targetFieldIds.includes(field.id);
                            return (
                              <button
                                key={field.id}
                                type="button"
                                onClick={() => toggleTargetField(group.id, field.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                                    : isDark
                                      ? 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-black shadow-xs'
                                }`}
                              >
                                {isSelected ? <Check size={12} className="stroke-[3]" /> : <Plus size={12} className="opacity-50" />}
                                <span>{field.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Group Summary Preview Banner */}
                    <div className={`mt-3 p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-start gap-2 ${
                      isDark ? 'bg-purple-950/20 border-purple-800/30 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
                    }`}>
                      <Sparkles size={14} className="text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <b>Tóm tắt quy tắc:</b> Khi{' '}
                        {group.conditions.map((c, i) => {
                          const f = fields.find((item: any) => item.id === c.fieldId);
                          const fLabel = f?.label || c.fieldId;
                          let conditionText = '';
                          if (c.valueType === 'text') {
                            if (c.textOperator === 'not_empty') conditionText = `đã có nội dung`;
                            else if (c.textOperator === 'contains') conditionText = `chứa "${c.textValue || ''}"`;
                            else if (c.textOperator === 'not_equals') conditionText = `khác "${c.textValue || ''}"`;
                            else conditionText = `là "${c.textValue || ''}"`;
                          } else {
                            if (c.numOperator === 'between') conditionText = `trong khoảng từ ${c.threshold ?? 0} đến ${c.thresholdMax ?? 100}`;
                            else conditionText = `${c.numOperator || '>='} ${c.threshold ?? 0}`;
                          }
                          return (
                            <span key={i}>
                              {i > 0 && <span className="font-bold text-amber-500 mx-1">{group.logicOperator === 'OR' ? 'HOẶC' : 'VÀ'}</span>}
                              <u>{fLabel}</u> ({conditionText})
                            </span>
                          );
                        })}{' '}
                        ➔ <b className="text-emerald-500">BẬT:</b>{' '}
                        {group.targetFieldIds.length > 0 ? (
                          group.targetFieldIds.map(tId => fields.find((f: any) => f.id === tId)?.label || tId).join(', ')
                        ) : (
                          <span className="italic opacity-60">Chưa chọn trường phụ thuộc nào</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Group Button */}
            <button
              type="button"
              onClick={addGroup}
              className={`w-full py-2.5 flex items-center justify-center gap-2 text-xs font-extrabold rounded-xl border-2 border-dashed transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? 'border-purple-500/40 text-purple-300 hover:bg-purple-500/15 hover:border-purple-400' 
                  : 'border-purple-400 bg-purple-50/50 text-purple-700 hover:bg-purple-100 hover:border-purple-600'
              }`}
            >
              <Sparkles size={14} className="text-purple-400" /> + THÊM NHÓM QUY TẮC THAM CHIẾU MỚI (RIÊNG BIỆT)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


