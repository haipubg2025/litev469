with open('src/components/Gameplay.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("    }};\nconst formatNPCsCodex", "  });\n  return lines.length > 0 ? lines.join('\\n\\n') : 'Không có thông tin.';\n};\nconst formatNPCsCodex")

with open('src/components/Gameplay.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
