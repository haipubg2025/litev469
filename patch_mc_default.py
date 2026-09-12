import re

with open('src/components/Gameplay.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  for (const [key, value] of Object.entries(obj)) {
    if (excludeKeys.includes(key)) continue;
    if (templateMode === "custom" && key === "customData") continue;

    if (value) {
      const formattedKey = key
        .replace(/([A-Z])/g, " $1")
        .trim()
        .toUpperCase();

      if (key === "customData" && typeof value === "object" && value !== null) {
        const customEntries = Object.entries(value);
        if (customEntries.length > 0) {
          const customLines = customEntries.map(([fId, fVal]) => {
            const fieldDef = customFields.find((f) => f.id === fId);
            const labelStr = fieldDef ? `${fieldDef.label} (${fId})` : fId;
            return `  + ${labelStr}: ${typeof fVal === "object" ? JSON.stringify(fVal) : fVal}`;
          });
          lines.push(`[ DỮ LIỆU BẢNG TÙY CHỈNH (CUSTOM DATA) ]\\n${customLines.join("\\n")}`);
        }
      } else if (key === "locations" && Array.isArray(value)) {
        const locationText = value
          .filter(Boolean)
          .map((loc: any) => `- **${loc?.name || "Vị trí"}**: ${loc?.description || ""}`)
          .join("\\n");
        if (locationText) {
          lines.push(`[ ${formattedKey} ]\\n${locationText}`);
        }
      } else if (typeof value === "string" && value.trim() !== "") {
        let finalValue = value.trim();
        // Lược bỏ phần số đo trong ngoặc vuông đối với measurements
        if (key === "measurements") {
          finalValue = finalValue.replace(/^\[.*?\]\\.?\\s*/, "");
        }
        lines.push(`[ ${formattedKey} ]\\n${finalValue}`);
      } else if (typeof value === "object") {
        lines.push(`[ ${formattedKey} ]\\n${JSON.stringify(value)}`);
      }
    }
  }"""

replacement = """  const DEFAULT_MC_KEYS = [
    "name", "fullName", "titles", "gender", "age", "dob", "rank", 
    "height", "weight", "measurements", "appearanceLite", "distinguishingFeatures", 
    "personality", "personalityCore", "philosophy", "innerSecret", 
    "background", "loveViews", "experience", "nsfwPersonality", "nsfwReactions", 
    "literaryDescription", "inventory", "powers", "skills", "skillsNSFW", "money",
    "fashion", "statusData", "partyList", "objectives"
  ];

  if (templateMode === "default") {
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
        } else {
          const finalValue = typeof value === "string" ? value.trim() : JSON.stringify(value);
          lines.push(`[ ${formattedKey} ]\\n${finalValue}`);
        }
      }
    });
  } else {
    for (const [key, value] of Object.entries(obj)) {
      if (excludeKeys.includes(key)) continue;
      if (key === "customData") continue;

      if (value !== undefined && value !== null && String(value).trim() !== "") {
        const formattedKey = key
          .replace(/([A-Z])/g, " $1")
          .trim()
          .toUpperCase();

        if (key === "locations" && Array.isArray(value)) {
          const locationText = value
            .filter(Boolean)
            .map((loc: any) => `- **${loc?.name || "Vị trí"}**: ${loc?.description || ""}`)
            .join("\\n");
          if (locationText) {
            lines.push(`[ ${formattedKey} ]\\n${locationText}`);
          }
        } else if (typeof value === "string") {
          let finalValue = value.trim();
          if (key === "measurements") {
            finalValue = finalValue.replace(/^\[.*?\]\.?\\s*/, "");
          }
          lines.push(`[ ${formattedKey} ]\\n${finalValue}`);
        } else if (typeof value === "object") {
          lines.push(`[ ${formattedKey} ]\\n${JSON.stringify(value)}`);
        }
      }
    }
  }"""

if target in content:
    content = content.replace(target, replacement)
    print("Patched formatCodexData default fields")
else:
    print("Failed to find target for formatCodexData default fields")

with open('src/components/Gameplay.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

