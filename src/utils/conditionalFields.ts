export type ValueType = 'number' | 'text';

export type NumberOperator = '>=' | '>' | '<=' | '<' | '==' | '!=' | 'between';
export type TextOperator = 'equals' | 'contains' | 'not_equals' | 'not_empty';

export interface SingleCondition {
  id?: string;
  fieldId: string;
  valueType: ValueType;
  // Dành cho kiểu Số:
  numOperator?: NumberOperator;
  threshold?: number;
  thresholdMax?: number; // khi numOperator === 'between' (từ X đến Y)
  // Dành cho kiểu Chữ:
  textOperator?: TextOperator;
  textValue?: string;
}

export interface ConditionalGroup {
  id: string;
  name?: string;
  logicOperator?: 'AND' | 'OR'; // Mặc định 'AND' (thỏa mãn tất cả điều kiện)
  // Danh sách các điều kiện tham chiếu gốc
  conditions: SingleCondition[];
  // Danh sách các trường phụ thuộc cần BẬT khi thỏa mãn điều kiện
  targetFieldIds: string[];
  // Hỗ trợ tương thích ngược:
  referenceFieldId?: string;
  rules?: Array<{ targetFieldId: string; threshold: number; operator?: string }>;
}

export interface CustomConditionsConfig {
  enabled: boolean;
  groups?: ConditionalGroup[];
  // Hỗ trợ cấu hình dạng đơn cũ:
  referenceFieldId?: string;
  rules?: Array<{ targetFieldId: string; threshold: number; operator?: string }>;
}

export function evaluateSingleCondition(cond: SingleCondition, characterData: any): boolean {
  if (!cond || !cond.fieldId) return false;

  const raw = characterData?.customData?.[cond.fieldId] ?? characterData?.[cond.fieldId];

  if (cond.valueType === 'text') {
    const actualStr = (raw === undefined || raw === null) ? '' : String(raw).trim();
    const targetStr = (cond.textValue || '').trim();
    const textOp = cond.textOperator || 'equals';

    switch (textOp) {
      case 'equals':
        return actualStr.toLowerCase() === targetStr.toLowerCase();
      case 'contains':
        return targetStr === '' ? true : actualStr.toLowerCase().includes(targetStr.toLowerCase());
      case 'not_equals':
        return actualStr.toLowerCase() !== targetStr.toLowerCase();
      case 'not_empty':
        return actualStr.length > 0;
      default:
        return actualStr.toLowerCase() === targetStr.toLowerCase();
    }
  }

  // Xử lý so sánh dạng Số:
  let numVal = 0;
  if (typeof raw === 'number') {
    numVal = raw;
  } else if (typeof raw === 'string') {
    const match = raw.match(/-?\d+(\.\d+)?/);
    if (match) {
      numVal = parseFloat(match[0]);
    }
  }

  const numOp = cond.numOperator || '>=';
  const threshold = typeof cond.threshold === 'number' ? cond.threshold : 0;
  const thresholdMax = typeof cond.thresholdMax === 'number' ? cond.thresholdMax : threshold;

  switch (numOp) {
    case '>':
      return numVal > threshold;
    case '<=':
      return numVal <= threshold;
    case '<':
      return numVal < threshold;
    case '==':
      return numVal === threshold;
    case '!=':
      return numVal !== threshold;
    case 'between': {
      const min = Math.min(threshold, thresholdMax);
      const max = Math.max(threshold, thresholdMax);
      return numVal >= min && numVal <= max;
    }
    case '>=':
    default:
      return numVal >= threshold;
  }
}

export function normalizeConditions(conditions: any): { enabled: boolean; groups: ConditionalGroup[] } | null {
  if (!conditions || !conditions.enabled) return null;

  let groups: ConditionalGroup[] = [];

  if (Array.isArray(conditions.groups) && conditions.groups.length > 0) {
    groups = conditions.groups.map((g: any, gIdx: number) => {
      // Đã có định dạng mới với conditions & targetFieldIds
      if (Array.isArray(g.conditions) && Array.isArray(g.targetFieldIds)) {
        return {
          id: g.id || `group-${gIdx}-${Date.now()}`,
          name: g.name || `Nhóm điều kiện #${gIdx + 1}`,
          logicOperator: g.logicOperator || 'AND',
          conditions: g.conditions.map((c: any, cIdx: number) => ({
            id: c.id || `c-${cIdx}-${Date.now()}`,
            fieldId: c.fieldId || '',
            valueType: c.valueType || 'number',
            numOperator: c.numOperator || '>=',
            threshold: typeof c.threshold === 'number' ? c.threshold : 0,
            thresholdMax: typeof c.thresholdMax === 'number' ? c.thresholdMax : 100,
            textOperator: c.textOperator || 'equals',
            textValue: c.textValue || ''
          })),
          targetFieldIds: g.targetFieldIds.filter(Boolean)
        };
      }

      // Tương thích với định dạng nhóm cũ (referenceFieldId + rules)
      if (g.referenceFieldId && Array.isArray(g.rules)) {
        return {
          id: g.id || `group-${gIdx}`,
          name: g.name || `Nhóm điều kiện #${gIdx + 1}`,
          logicOperator: 'AND' as const,
          conditions: [{
            id: `c-0`,
            fieldId: g.referenceFieldId,
            valueType: 'number' as const,
            numOperator: (g.rules[0]?.operator as NumberOperator) || '>=',
            threshold: typeof g.rules[0]?.threshold === 'number' ? g.rules[0].threshold : 10,
            thresholdMax: 100
          }],
          targetFieldIds: g.rules.map((r: any) => r.targetFieldId).filter(Boolean)
        };
      }

      return null;
    }).filter(Boolean) as ConditionalGroup[];
  } else if (conditions.referenceFieldId && Array.isArray(conditions.rules)) {
    // Tương thích với định dạng đơn sơ khai nhất
    groups = [{
      id: 'legacy-group',
      name: 'Nhóm điều kiện #1',
      logicOperator: 'AND',
      conditions: [{
        id: 'c-legacy',
        fieldId: conditions.referenceFieldId,
        valueType: 'number',
        numOperator: '>=',
        threshold: 10,
        thresholdMax: 100
      }],
      targetFieldIds: conditions.rules.map((r: any) => r.targetFieldId).filter(Boolean)
    }];
  }

  if (groups.length === 0) return null;
  return { enabled: true, groups };
}

export function getActiveCustomFields(
  fields: any[],
  conditions: CustomConditionsConfig | any | undefined,
  characterData: any
): any[] {
  if (!fields || fields.length === 0) return [];

  // Lọc các trường đang bật và sắp xếp theo thứ tự order
  const validFields = fields
    .filter((f) => f.enabled !== false)
    .sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : 999;
      const orderB = typeof b.order === "number" ? b.order : 999;
      return orderA - orderB;
    });

  const normalized = normalizeConditions(conditions);
  if (!normalized) {
    return validFields;
  }

  // Tập hợp các trường tham chiếu gốc (luôn hiển thị để người dùng nhập dữ liệu)
  const allReferenceFieldIds = new Set<string>();
  // Tập hợp các trường phụ thuộc chịu sự kiểm soát của các quy tắc
  const allTargetedFieldIds = new Set<string>();
  // Tập hợp các trường phụ thuộc đã được kích hoạt thành công
  const activeTargetFieldIds = new Set<string>();

  for (const group of normalized.groups) {
    if (Array.isArray(group.conditions)) {
      for (const cond of group.conditions) {
        if (cond.fieldId) {
          allReferenceFieldIds.add(cond.fieldId);
        }
      }
    }

    if (Array.isArray(group.targetFieldIds)) {
      for (const targetId of group.targetFieldIds) {
        if (targetId) {
          allTargetedFieldIds.add(targetId);
        }
      }
    }

    // Đánh giá logic của nhóm
    if (group.conditions && group.conditions.length > 0 && group.targetFieldIds && group.targetFieldIds.length > 0) {
      const logicOp = group.logicOperator || 'AND';
      let isGroupSatisfied = false;

      if (logicOp === 'OR') {
        isGroupSatisfied = group.conditions.some(cond => evaluateSingleCondition(cond, characterData));
      } else {
        // AND: Tất cả các điều kiện tham chiếu trong nhóm phải thỏa mãn
        isGroupSatisfied = group.conditions.every(cond => evaluateSingleCondition(cond, characterData));
      }

      if (isGroupSatisfied) {
        for (const targetId of group.targetFieldIds) {
          activeTargetFieldIds.add(targetId);
        }
      }
    }
  }

  return validFields.filter(f => {
    // Trường tham chiếu gốc luôn hiển thị
    if (allReferenceFieldIds.has(f.id)) return true;

    // Trường không tham gia bất kỳ quy tắc điều kiện nào luôn hiển thị
    if (!allTargetedFieldIds.has(f.id)) return true;

    // Trường phụ thuộc chỉ hiển thị khi đã được kích hoạt
    return activeTargetFieldIds.has(f.id);
  });
}

