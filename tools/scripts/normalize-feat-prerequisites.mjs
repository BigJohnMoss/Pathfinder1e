import { readdir, readFile, writeFile } from "node:fs/promises";

const writeChanges = process.argv.includes("--write");
const featDirectory = new URL("../../packages/data/src/feats/", import.meta.url);
const files = (await readdir(featDirectory)).filter((file) => file.endsWith(".json")).sort();
const feats = await Promise.all(files.map(async (file) => ({
  file,
  value: JSON.parse(await readFile(new URL(file, featDirectory), "utf8")),
})));
const classIds = new Set(["arcanist", "barbarian", "bard", "cleric", "druid", "fighter", "monk", "oracle", "paladin", "ranger", "rogue", "sorcerer", "wizard"]);
const abilityKeys = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };
const ancestryIds = new Map([
  ["dwarf", "dwarf"],
  ["elf", "elf"],
  ["gnome", "gnome"],
  ["half-elf", "half-elf"],
  ["half-orc", "half-orc"],
  ["halfling", "halfling"],
  ["human", "human"],
]);
const sizeIds = new Map([
  ["fine", "fine"],
  ["diminutive", "diminutive"],
  ["tiny", "tiny"],
  ["small", "small"],
  ["medium", "medium"],
  ["large", "large"],
  ["huge", "huge"],
  ["gargantuan", "gargantuan"],
  ["colossal", "colossal"],
]);
const sourceCitationTokens = new Set(["ACG", "APG", "ARG", "ISG", "ISWG", "OA", "TG", "UC", "UI", "UM"]);
const saveKeys = { fortitude: "fortitude", reflex: "reflex", will: "will" };
const featIdByName = new Map(feats.map(({ value }) => [value.name.toLocaleLowerCase(), value.id]));

const parseAtomicRule = (description) => {
  const text = description.trim().replace(/\.$/, "");
  if (!text || /^or\b/i.test(text)) return null;
  let match = text.match(/^base attack bonus\s*\+?(\d+)$/i);
  if (match) return { type: "bab", minimum: Number(match[1]) };
  match = text.match(/^caster level\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (match) return { type: "caster-level", minimum: Number(match[1]) };
  match = text.match(/^character level\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (match) return { type: "level", minimum: Number(match[1]) };
  match = text.match(/^(\d+)\s+(?:or more\s+)?Hit Dice$/i);
  if (match) return { type: "level", minimum: Number(match[1]) };
  match = text.match(/^base (Fortitude|Reflex|Will) (?:saving throw|save) bonus\s*\+?(\d+)$/i);
  if (match) return { type: "save", key: saveKeys[match[1].toLocaleLowerCase()], minimum: Number(match[2]) };
  match = text.match(/^(Str|Dex|Con|Int|Wis|Cha)\s*(\d+)$/i);
  if (match) return { type: "ability", key: abilityKeys[match[1].toLocaleLowerCase()], minimum: Number(match[2]) };
  match = text.match(/^([A-Za-z]+) level\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (match && classIds.has(match[1].toLocaleLowerCase())) return { type: "class-level", classId: match[1].toLocaleLowerCase(), minimum: Number(match[2]) };
  match = text.match(/^(\d+)\s+ranks?\s+in\s+(.+)$/i);
  if (match) return { type: "skill", key: match[2].trim(), minimum: Number(match[1]) };
  match = text.match(/^(.+?)\s+(\d+)\s+ranks?$/i);
  if (match) return { type: "skill", key: match[1].trim(), minimum: Number(match[2]) };
  match = text.match(/^size\s+([A-Za-z]+)\s+or\s+larger$/i);
  if (match && sizeIds.has(match[1].toLocaleLowerCase())) {
    return { type: "size", minimum: sizeIds.get(match[1].toLocaleLowerCase()) };
  }
  match = text.match(/^([A-Za-z]+)\s+size\s+or\s+smaller$/i);
  if (match && sizeIds.has(match[1].toLocaleLowerCase())) {
    return { type: "size", maximum: sizeIds.get(match[1].toLocaleLowerCase()) };
  }
  const ancestryId = ancestryIds.get(text.toLocaleLowerCase());
  if (ancestryId) return { type: "ancestry", id: ancestryId };
  const featId = featIdByName.get(text.toLocaleLowerCase());
  if (featId) return { type: "feat", id: featId };
  const alternatives = text.split(/\s+or\s+/i);
  if (alternatives.length > 1) {
    const parsed = alternatives.map(parseAtomicRule);
    if (parsed.every(Boolean) && parsed.every((prerequisite) => prerequisite.type !== "any")) {
      return { type: "any", prerequisites: parsed };
    }
  }
  return null;
};

let convertedRules = 0;
let changedFeats = 0;
const remainingRules = [];
for (const feat of feats) {
  const prerequisites = [];
  let changed = false;
  for (const prerequisite of feat.value.prerequisites ?? []) {
    if (prerequisite.type !== "rule") {
      prerequisites.push(prerequisite);
      continue;
    }
    const segments = prerequisite.description.split(/\s*;\s*/).filter(Boolean);
    const parsed = segments.map((segment) => sourceCitationTokens.has(segment.trim()) ? { type: "source-citation" } : parseAtomicRule(segment));
    if (parsed.some(Boolean)) {
      changed = true;
      for (let index = 0; index < segments.length; index += 1) {
        if (parsed[index]?.type !== "source-citation") prerequisites.push(parsed[index] ?? { type: "rule", description: segments[index] });
        if (parsed[index]) convertedRules += 1;
      }
    } else {
      prerequisites.push(prerequisite);
    }
  }
  feat.value.prerequisites = prerequisites;
  for (const prerequisite of prerequisites) {
    if (prerequisite.type === "rule") remainingRules.push({ feat: feat.value.name, description: prerequisite.description });
  }
  if (changed) {
    changedFeats += 1;
    if (writeChanges) await writeFile(new URL(feat.file, featDirectory), `${JSON.stringify(feat.value, null, 2)}\n`);
  }
}

const automatedPrerequisites = feats.flatMap(({ value }) => value.prerequisites ?? []).filter((prerequisite) => prerequisite.type !== "rule").length;
console.log(JSON.stringify({
  mode: writeChanges ? "write" : "audit",
  feats: feats.length,
  changedFeats,
  convertedRules,
  automatedPrerequisites,
  remainingManualRules: remainingRules.length,
}, null, 2));
