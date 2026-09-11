export const isRelationshipField = (field: any, disableDefaultRelationships?: boolean): boolean => {
  if (disableDefaultRelationships) return false;
  if (!field) return false;
  if (field.isRelationship) return true;
  
  const idLower = (field.id || "").toLowerCase();
  
  // Explicitly list all built-in fields that are NOT relationship fields.
  // This prevents fields like 'impression' (which might contain 'mối quan hệ' in its description)
  // from being incorrectly classified as a relationship field.
  const builtInNonRelationshipFields = [
    "id", "name", "fullname", "role", "avatar", "appearance", "appearancelite", 
    "distinguishingfeatures", "personality", "personalitycore", "philosophy", 
    "goal", "innersecret", "impression", "background", "powers", "skills", 
    "inventory", "location", "status", "statusdata", "preferences", "needs", 
    "loveviews", "experience", "nsfwpersonality", "nsfwreactions", 
    "literarydescription", "titles", "needssfw", "needsnsfw", "likesdislikesfears",
    "likesdislikesfearsnsfw", "hidetitle", "occupation", "gender", "age", "dob",
    "rank", "height", "weight", "measurements"
  ];
  if (builtInNonRelationshipFields.includes(idLower)) {
    return false;
  }

  if (
    idLower === "relationships" ||
    idLower === "relationship" ||
    idLower.includes("relationship") ||
    idLower.includes("quan_he") ||
    idLower.includes("nhan_qua") ||
    idLower.includes("duyen_no")
  ) {
    return true;
  }

  const labelLower = (field.label || "").toLowerCase();
  const descLower = (field.description || "").toLowerCase();
  const keywords = [
    "mối quan hệ",
    "quan hệ",
    "nhân quả",
    "duyên nợ",
    "duyên phận",
    "ràng buộc",
    "bằng hữu",
    "thù địch",
    "tương tác"
  ];

  return keywords.some((k) => labelLower.includes(k) || descLower.includes(k));
};

export const isLegacyOrInvalidNpcId = (id: any): boolean => {
  if (id === undefined || id === null || typeof id !== "string") return true;
  const trimmed = id.trim().toLowerCase();
  if (
    trimmed === "" ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "npc" ||
    /^npc(_.*)?$/i.test(trimmed) ||
    /^npc\d+$/i.test(trimmed)
  ) {
    return true;
  }
  return false;
};

export const sanitizeNpcId = (npc: any, fallbackIdx?: number): string => {
  if (!npc || typeof npc !== "object") return "";
  const nameCandidate =
    (npc.name && String(npc.name).trim()) ||
    (npc.fullName && String(npc.fullName).trim()) ||
    (npc.titles && String(npc.titles).trim()) ||
    "";

  const currentId = npc.id !== undefined && npc.id !== null ? String(npc.id).trim() : "";
  if (isLegacyOrInvalidNpcId(currentId)) {
    return nameCandidate || (fallbackIdx !== undefined ? `npc_${fallbackIdx + 1}` : "NPC");
  }
  return currentId || nameCandidate || (fallbackIdx !== undefined ? `npc_${fallbackIdx + 1}` : "NPC");
};

export const ensureUniqueNpcIds = (npcs: any[]): any[] => {
  if (!Array.isArray(npcs)) return [];
  const usedIds = new Set<string>();

  return npcs.map((npc, idx) => {
    if (!npc || typeof npc !== "object") return npc;

    const rawId = sanitizeNpcId(npc, idx);

    let uniqueId = rawId;
    let counter = 2;

    while (usedIds.has(uniqueId.toLowerCase())) {
      uniqueId = `${rawId}_${counter}`;
      counter++;
    }

    usedIds.add(uniqueId.toLowerCase());

    if (npc.id !== uniqueId) {
      return {
        ...npc,
        id: uniqueId
      };
    }

    return npc;
  });
};

