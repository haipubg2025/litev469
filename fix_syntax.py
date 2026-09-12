import re

with open('src/components/Gameplay.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('src/components/Gameplay.tsx', 'w', encoding='utf-8') as f:
    for i, line in enumerate(lines):
        if i == 259: # Line 260 is index 259
            if line.strip() == '}};':
                f.write('  });\n  return lines.length > 0 ? lines.join("\\n\\n") : "Không có thông tin.";\n};\n')
                continue
        if i == 579: # Line 580 is index 579
            if line.strip() == '}':
                f.write('    return lines.join("\\n");\n')
                continue
        f.write(line)

