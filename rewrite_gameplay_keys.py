import re

with open('src/components/Gameplay.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

mc_target_regex = re.compile(r'const DEFAULT_MC_KEYS = \[.*?\}\s*\}\s*\}', re.DOTALL)
npc_target_regex = re.compile(r'const DEFAULT_NPC_KEYS = \[.*?\}\s*\}\s*\}', re.DOTALL)

mc_replacement = """const DEFAULT_MC_KEYS = [
    "name", "fullName", "titles", "gender", "age", "dob", "rank", 
    "height", "weight", "measurements", "appearanceLite", "distinguishingFeatures", 
    "personality", "personalityCore", "philosophy", "innerSecret", 
    "background", "loveViews", "experience", "nsfwPersonality", "nsfwReactions", 
    "literaryDescription", "inventory", "powers", "skills", "skillsNSFW", "money",
    "fashion", "statusData", "partyList", "objectives"
  ];

  DEFAULT_MC_KEYS.forEach(key => {
    if (excludeKeys.includes(key)) return;
    const value = obj[key];
    const formattedKey = key.replace(/([A-Z])/g, " $1").trim().toUpperCase();
    
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      let finalValue = typeof value === "string" ? value.trim() : JSON.stringify(value);
      if (key === "measurements" && typeof finalValue === "string") {
        finalValue = finalValue.replace(/^\[.*?\]\.?\\s*/, "");
      }
      if (key === "locations" && Array.isArray(value)) {
        const locationText = value
          .filter(Boolean)
          .map((loc: any) => `- **${loc?.name || "Vị trí"}**: ${loc?.description || ""}`)
          .join("\\n");
        if (locationText) {
          lines.push(`[ ${formattedKey} ]\\n${locationText}`);
        }
      } else {
        lines.push(`[ ${formattedKey} ]\\n${finalValue}`);
      }
    } else {
      lines.push(`[ ${formattedKey} ]\\nKhông có dữ liệu.`);
    }
  });

  Object.entries(obj).forEach(([key, value]) => {
    if (excludeKeys.includes(key)) return;
    if (DEFAULT_MC_KEYS.includes(key)) return;
    if (templateMode === "custom" && key === "customData") return;
    
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      const formattedKey = key.replace(/([A-Z])/g, " $1").trim().toUpperCase();
      if (key === "locations" && Array.isArray(value)) {
        const locationText = value
          .filter(Boolean)
          .map((loc: any) => `- **${loc?.name || "Vị trí"}**: ${loc?.description || ""}`)
          .join("\\n");
        if (locationText) {
          lines.push(`[ ${formattedKey} ]\\n${locationText}`);
        }
      } else if (key === "customData" && typeof value === "object" && value !== null) {
        const customEntries = Object.entries(value);
        if (customEntries.length > 0) {
          const customLines = customEntries.map(([fId, fVal]) => {
            const fieldDef = customFields.find((f) => f.id === fId);
            const labelStr = fieldDef ? `${fieldDef.label} (${fId})` : fId;
            return `  + ${labelStr}: ${typeof fVal === "object" ? JSON.stringify(fVal) : fVal}`;
          });
          lines.push(`[ DỮ LIỆU BẢNG TÙY CHỈNH (CUSTOM DATA) ]\\n${customLines.join("\\n")}`);
        }
      } else {
        const finalValue = typeof value === "string" ? value.trim() : JSON.stringify(value);
        lines.push(`[ ${formattedKey} ]\\n${finalValue}`);
      }
    }
  });"""


npc_replacement = """const DEFAULT_NPC_KEYS = [
      "name", "location", "fashion", "statusData", "role", "impression", "fullName", "titles", 
      "occupation", "gender", "age", "dob", "rank", "height", "weight", 
      "measurements", "appearanceLite", "distinguishingFeatures", "personality", 
      "personalityCore", "philosophy", "goal", "background", "innerSecret", 
      "relationships", "loveViews", "experience", "nsfwPersonality", "nsfwReactions", 
      "literaryDescription", "needs", "preferences"
    ];

    DEFAULT_NPC_KEYS.forEach(key => {
      if (["id", "avatar", "isPinned", "appearance", "_hasAppeared", "_isUnused"].includes(key)) return;
      const value = npc[key];
      const formattedKey = key.replace(/([A-Z])/g, " $1").trim().toUpperCase();
      
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        let finalValue = typeof value === "string" ? value.trim() : JSON.stringify(value);
        if (key === "measurements" && typeof finalValue === "string") {
          finalValue = finalValue.replace(/^\[.*?\]\.?\\s*/, "");
        }
        lines.push(`  + ${formattedKey}: ${finalValue}`);
      } else {
        lines.push(`  + ${formattedKey}: Không có dữ liệu.`);
      }
    });
    
    Object.entries(npc).forEach(([key, value]) => {
       if (["id", "avatar", "isPinned", "appearance", "_hasAppeared", "_isUnused"].includes(key)) return;
       if (DEFAULT_NPC_KEYS.includes(key)) return;
       if (npcTemplateMode === "custom" && key === "customData") return;
       
       if (value !== undefined && value !== null && String(value).trim() !== "") {
          const formattedKey = key.replace(/([A-Z])/g, " $1").trim().toUpperCase();
          if (key === "customData" && typeof value === "object" && value !== null) {
            const customEntries = Object.entries(value);
            if (customEntries.length > 0) {
              const customLines = customEntries.map(([fId, fVal]) => {
                const fieldDef = customNpcFields.find(f => f.id === fId);
                const labelStr = fieldDef ? `${fieldDef.label} (${fId})` : fId;
                return `    * ${labelStr}: ${typeof fVal === "object" ? JSON.stringify(fVal) : fVal}`;
              });
              lines.push(`  + DỮ LIỆU TÙY CHỈNH (CUSTOM DATA):\\n${customLines.join("\\n")}`);
            }
          } else {
            const finalValue = typeof value === "string" ? value.trim() : JSON.stringify(value);
            lines.push(`  + ${formattedKey}: ${finalValue}`);
          }
       }
    });"""

mc_match = mc_target_regex.search(content)
if mc_match:
    content = content.replace(mc_match.group(0), mc_replacement)
    print("Patched mc keys")
else:
    print("Not found mc")

npc_match = npc_target_regex.search(content)
if npc_match:
    content = content.replace(npc_match.group(0), npc_replacement)
    print("Patched npc keys")
else:
    print("Not found npc")

with open('src/components/Gameplay.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

