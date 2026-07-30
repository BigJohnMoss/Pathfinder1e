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
  match = text.match(/^(Str|Dex|Con|Int|Wis|Cha)\s*(\d+)$/i);
  if (match) return { type: "ability", key: abilityKeys[match[1].toLocaleLowerCase()], minimum: Number(match[2]) };
  match = text.match(/^([A-Za-z]+) level\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (match && classIds.has(match[1].toLocaleLowerCase())) return { type: "class-level", classId: match[1].toLocaleLowerCase(), minimum: Number(match[2]) };
  match = text.match(/^(\d+)\s+ranks?\s+in\s+(.+)$/i);
  if (match) return { type: "skill", key: match[2].trim(), minimum: Number(match[1]) };
  match = text.match(/^(.+?)\s+(\d+)\s+ranks?$/i);
  if (match) return { type: "skill", key: match[1].trim(), minimum: Number(match[2]) };
  const alternatives = text.split(/\s+or\s+/i);
  if (alternatives.length > 1) {
    const ids = alternatives.map((name) => featIdByName.get(name.trim().toLocaleLowerCase()));
    if (ids.every(Boolean)) return { type: "any", prerequisites: ids.map((id) => ({ type: "feat", id })) };
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
    const parsed = segments.map(parseAtomicRule);
    if (parsed.some(Boolean)) {
      changed = true;
      for (let index = 0; index < segments.length; index += 1) {
        prerequisites.push(parsed[index] ?? { type: "rule", description: segments[index] });
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
