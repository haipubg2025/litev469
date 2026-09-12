with open('src/components/Gameplay.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('src/components/Gameplay.tsx', 'w', encoding='utf-8') as f:
    for i, line in enumerate(lines):
        if line.strip() == '});' and 'const formatNPCsCodex' in lines[i+1]:
            f.write('  });\n  return lines.length > 0 ? lines.join("\\n\\n") : "Không có thông tin.";\n};\n')
            continue
        if line.strip() == '}' and 'return lines.join("\\n");' in lines[i+1]:
            continue # delete the extra `}`
        f.write(line)
