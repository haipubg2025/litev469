import re

with open('src/components/Gameplay.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """    for (const [key, value] of Object.entries(npc)) {
      if (["id", "avatar", "isPinned", "appearance", "_hasAppeared", "_isUnused"].includes(key)) continue;
      if (npcTemplateMode === "custom" && key === "customData") continue;

      if (value) {
        const formattedKey = key
          .replace(/([A-Z])/g, " $1")
          .trim()
          .toUpperCase();

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
        } else if (typeof value === "string" && value.trim() !== "") {
          let finalValue = value.trim();
          if (key === "measurements") {
            finalValue = finalValue.replace(/^\[.*?\]\\.?\\s*/, "");
          }
          lines.push(`  + ${formattedKey}: ${finalValue}`);
        } else if (typeof value === "object") {
          lines.push(`  + ${formattedKey}: ${JSON.stringify(value)}`);
        }
      }
    }"""

replacement = """    const DEFAULT_NPC_KEYS = [
      "name", "location", "fashion", "statusData", "role", "impression", "fullName", "titles", 
      "occupation", "gender", "age", "dob", "rank", "height", "weight", 
      "measurements", "appearanceLite", "distinguishingFeatures", "personality", 
      "personalityCore", "philosophy", "goal", "background", "innerSecret", 
      "relationships", "loveViews", "experience", "nsfwPersonality", "nsfwReactions", 
      "literaryDescription", "needs", "preferences"
    ];

    if (npcTemplateMode === "default") {
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
         
         if (value !== undefined && value !== null && String(value).trim() !== "") {
            const formattedKey = key.replace(/([A-Z])/g, " $1").trim().toUpperCase();
            const finalValue = typeof value === "string" ? value.trim() : JSON.stringify(value);
            lines.push(`  + ${formattedKey}: ${finalValue}`);
         }
      });
    } else {
      for (const [key, value] of Object.entries(npc)) {
        if (["id", "avatar", "isPinned", "appearance", "_hasAppeared", "_isUnused"].includes(key)) continue;
        if (key === "customData") continue;

        if (value !== undefined && value !== null && String(value).trim() !== "") {
          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .trim()
            .toUpperCase();

          if (typeof value === "string" && value.trim() !== "") {
            let finalValue = value.trim();
            if (key === "measurements") {
              finalValue = finalValue.replace(/^\[.*?\]\.?\\s*/, "");
            }
            lines.push(`  + ${formattedKey}: ${finalValue}`);
          } else if (typeof value === "object") {
            lines.push(`  + ${formattedKey}: ${JSON.stringify(value)}`);
          }
        }
      }
    }"""

if target in content:
    content = content.replace(target, replacement)
    print("Patched default keys for NPC")
else:
    print("Failed to find target for NPC default keys")

with open('src/components/Gameplay.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

