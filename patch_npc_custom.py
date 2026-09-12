import re

with open('src/components/Gameplay.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

npc_target = """        const val = getCharacterFieldValue(npc, f.id);
        if (val) {
          customFieldLines.push(`    * ${f.label} (${f.id}): ${val}`);
        }"""
npc_replacement = """        const val = getCharacterFieldValue(npc, f.id);
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          customFieldLines.push(`    * ${f.label} (${f.id}): ${val}`);
        } else {
          customFieldLines.push(`    * ${f.label} (${f.id}): Không có dữ liệu.`);
        }"""

if npc_target in content:
    content = content.replace(npc_target, npc_replacement)
    print("Patched formatNPCsCodex custom fields")

with open('src/components/Gameplay.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

