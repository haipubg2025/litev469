import re

with open('src/components/Gameplay.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update formatCodexData (MC)
def repl_mc(match):
    original = match.group(0)
    
    # Insert `let missingFields: string[] = [];` at the start
    s = original.replace('const lines = [];', 'const lines = [];\n  const missingFields: string[] = [];')
    
    # Custom fields missing
    s = s.replace(
        'customFieldLines.push(`  + ${f.label} (${f.id}): Không có dữ liệu.`);',
        'customFieldLines.push(`  + ${f.label} (${f.id}): Không có dữ liệu.`);\n          missingFields.push(f.id);'
    )
    
    # Default fields missing
    s = s.replace(
        'lines.push(`[ ${formattedKey} ]\\nKhông có dữ liệu.`);',
        'lines.push(`[ ${formattedKey} ]\\nKhông có dữ liệu.`);\n      missingFields.push(key);'
    )
    
    # Return statement modification
    s = s.replace(
        'return lines.length > 0 ? lines.join("\\n\\n") : "Không có thông tin.";',
        'if (missingFields.length > 0) {\n    lines.push(`\\n[CẢNH BÁO TỐI QUAN TRỌNG: CÁC TRƯỜNG DỮ LIỆU BÊN DƯỚI CỦA NHÂN VẬT ĐANG BỊ TRỐNG HOÀN TOÀN (100%). BẠN BẮT BUỘC PHẢI SUY LUẬN SÁNG TẠO DỮ LIỆU ĐỂ ĐIỀN BỔ SUNG NGAY LẬP TỨC VÀO JSON UPDATE CHÚNG: ${missingFields.join(", ")}]`);\n  }\n  return lines.length > 0 ? lines.join("\\n\\n") : "Không có thông tin.";'
    )
    
    return s

mc_target_regex = re.compile(r'const formatCodexData = \([\s\S]*?return lines\.length > 0 \? lines\.join\("\\n\\n"\) : "Không có thông tin\.";\n\};')
content = mc_target_regex.sub(repl_mc, content, count=1)

# 2. Update formatNPC
def repl_npc(match):
    original = match.group(0)
    
    s = original.replace('const lines = [', 'const missingFields: string[] = [];\n    const lines = [')
    
    # Custom fields missing
    s = s.replace(
        'customFieldLines.push(`    * ${f.label} (${f.id}): Không có dữ liệu.`);',
        'customFieldLines.push(`    * ${f.label} (${f.id}): Không có dữ liệu.`);\n          missingFields.push(f.id);'
    )
    
    # Default fields missing
    s = s.replace(
        'lines.push(`  + ${formattedKey}: Không có dữ liệu.`);',
        'lines.push(`  + ${formattedKey}: Không có dữ liệu.`);\n        missingFields.push(key);'
    )
    
    # Return statement
    s = s.replace(
        'return lines.join("\\n");',
        'if (missingFields.length > 0) {\n      lines.push(`\\n  [CẢNH BÁO TỐI QUAN TRỌNG: CÁC TRƯỜNG DỮ LIỆU BÊN DƯỚI CỦA NPC NÀY ĐANG BỊ TRỐNG HOÀN TOÀN (100%). BẠN BẮT BUỘC PHẢI SUY LUẬN SÁNG TẠO DỮ LIỆU ĐỂ ĐIỀN BỔ SUNG NGAY LẬP TỨC VÀO JSON UPDATE CHÚNG: ${missingFields.join(", ")}]`);\n    }\n    return lines.join("\\n");'
    )
    
    return s

npc_target_regex = re.compile(r'const formatNPC = \([\s\S]*?return lines\.join\("\\n"\);\n  \};')
content = npc_target_regex.sub(repl_npc, content, count=1)


with open('src/components/Gameplay.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched!")
