import re

with open('src/components/Gameplay.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

mc_keys_replacement = """  const DEFAULT_MC_KEYS = [
    "name", "fullName", "titles", "gender", "age", "dob", "rank", "occupation",
    "height", "weight", "measurements", "appearanceLite", "distinguishingFeatures", 
    "personality", "personalityCore", "philosophy", "innerSecret", 
    "background", "loveViews", "experience", "nsfwPersonality", "nsfwReactions", 
    "literaryDescription", "inventory", "powers", "skills",
    "fashion", "statusData", "partyList", "objectives",
    "goal", "preferences", "needs", "needsSfw", "needsNsfw",
    "likesDislikesFears", "likesDislikesFearsNsfw"
  ];"""

npc_keys_replacement = """    const DEFAULT_NPC_KEYS = [
      "name", "location", "fashion", "statusData", "role", "impression", "fullName", "titles", 
      "occupation", "gender", "age", "dob", "rank", "height", "weight", 
      "measurements", "appearanceLite", "distinguishingFeatures", "personality", 
      "personalityCore", "philosophy", "goal", "background", "innerSecret", 
      "relationships", "loveViews", "experience", "nsfwPersonality", "nsfwReactions", 
      "literaryDescription", "powers", "skills",
      "preferences", "needs", "needsSfw", "needsNsfw",
      "likesDislikesFears", "likesDislikesFearsNsfw"
    ];"""

# Replace DEFAULT_MC_KEYS
content = re.sub(
    r'const DEFAULT_MC_KEYS = \[\s*[^\]]*?\];',
    mc_keys_replacement,
    content,
    count=1
)

# Replace DEFAULT_NPC_KEYS
content = re.sub(
    r'const DEFAULT_NPC_KEYS = \[\s*[^\]]*?\];',
    npc_keys_replacement,
    content,
    count=1
)

with open('src/components/Gameplay.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced keys!")
