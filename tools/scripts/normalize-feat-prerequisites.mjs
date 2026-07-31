import { readdir, readFile, writeFile } from "node:fs/promises";

const writeChanges = process.argv.includes("--write");
const featDirectory = new URL("../../packages/data/src/feats/", import.meta.url);
const classDirectory = new URL("../../packages/data/src/classes/", import.meta.url);
const files = (await readdir(featDirectory)).filter((file) => file.endsWith(".json")).sort();
const feats = await Promise.all(files.map(async (file) => ({
  file,
  value: JSON.parse(await readFile(new URL(file, featDirectory), "utf8")),
})));
const classes = await Promise.all((await readdir(classDirectory))
  .filter((file) => file.endsWith(".json"))
  .map(async (file) => JSON.parse(await readFile(new URL(file, classDirectory), "utf8"))));
const classIds = new Set([...classes.map((characterClass) => characterClass.id), "brawler", "inquisitor", "ninja"]);
const abilityKeys = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };
const fullAbilityKeys = Object.fromEntries(Object.values(abilityKeys).map((key) => [key, key]));
const ancestryIds = new Map([
  ["dwarf", "dwarf"],
  ["elf", "elf"],
  ["gnome", "gnome"],
  ["half-elf", "half-elf"],
  ["half-orc", "half-orc"],
  ["halfling", "halfling"],
  ["human", "human"],
  ["orc", "orc"],
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
const sourceCitationTokens = new Set(["ACG", "APG", "ARG", "ISG", "ISM", "ISWG", "OA", "TG", "UC", "UI", "UM"]);
const saveKeys = { fortitude: "fortitude", reflex: "reflex", will: "will" };
const featIdByName = new Map(feats.map(({ value }) => [value.name.toLocaleLowerCase(), value.id]));
const featChoiceKeyById = new Map(feats.flatMap(({ value }) => value.choice?.key ? [[value.id, value.choice.key]] : []));
const featureKey = (value) => value.toLocaleLowerCase().replace(/[’']/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const classFeatureKeys = new Set(classes.flatMap((characterClass) => characterClass.features.flatMap((feature) => {
  const key = featureKey(feature.name);
  return [key, key.replace(/-\d+$/, "")];
})));
const supportedFeatureAliases = new Map([
  ["animal-companion", "animal-companion"],
  ["familiar", "familiar"],
  ["raging-song", "raging-song"],
  ["brawlers-cunning", "brawlers-cunning"],
  ["brawlers-flurry", "brawlers-flurry"],
  ["grit", "grit"],
  ["panache", "panache"],
  ["rock-throwing", "rock-throwing"],
  ["spirit", "spirit"],
  ["coven-hex", "coven-hex"],
  ["inspiration", "inspiration"],
  ["awesome-blow", "awesome-blow"],
  ["weapon-expertise", "weapon-expertise"],
  ["trap", "trap"],
  ["sorcerer-bloodline", "sorcerer-bloodline"],
  ["minor-magic", "minor-magic"],
  ["major-magic", "major-magic"],
]);

const parseAtomicRule = (description) => {
  const text = description.trim().replace(/\.$/, "");
  if (!text || /^or\b/i.test(text)) return null;
  let match = text.match(/^base (?:attack )?bonus\s*\+?(\d+)\s+or\s+monk level\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (match) return { type: "any", prerequisites: [{ type: "bab", minimum: Number(match[1]) }, { type: "class-level", classId: "monk", minimum: Number(match[2]) }] };
  match = text.match(/^base attack bonus\s*\+?(\d+)$/i);
  if (match) return { type: "bab", minimum: Number(match[1]) };
  match = text.match(/^caster level\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (match) return { type: "caster-level", minimum: Number(match[1]) };
  match = text.match(/^ability to prepare(?: and cast)? (\d+)(?:st|nd|rd|th)-level spells$/i);
  if (match) return { type: "spell-level", minimum: Number(match[1]), castingType: "prepared" };
  match = text.match(/^ability to spontaneously cast (\d+)(?:st|nd|rd|th)-level spells$/i);
  if (match) return { type: "spell-level", minimum: Number(match[1]), castingType: "spontaneous" };
  match = text.match(/^ability to cast (\d+)(?:st|nd|rd|th)-level spells$/i);
  if (match) return { type: "spell-level", minimum: Number(match[1]) };
  match = text.match(/^ability to cast (\d+)(?:st|nd|rd|th)-level spells or use a \1(?:st|nd|rd|th)-level spell-like ability$/i);
  if (match) return { type: "any", prerequisites: [
    { type: "spell-level", minimum: Number(match[1]) },
    { type: "rule", description: `Use a ${match[1]}${["st", "nd", "rd"][Number(match[1]) - 1] ?? "th"}-level spell-like ability` },
  ] };
  match = text.match(/^character level\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (match) return { type: "level", minimum: Number(match[1]) };
  match = text.match(/^(?:must be taken|may only be taken|you may only (?:gain|select) this feat) at (?:the )?(\d+)(?:st|nd|rd|th) level$/i);
  if (match) return { type: "level", maximum: Number(match[1]) };
  if (/^may only be taken at first level$/i.test(text)) return { type: "level", maximum: 1 };
  match = text.match(/^(\d+)(?:st|nd|rd|th)-level character$/i);
  if (match) return { type: "level", maximum: Number(match[1]) };
  match = text.match(/^(\d+)\s+(?:or more\s+)?Hit Dice$/i);
  if (match) return { type: "level", minimum: Number(match[1]) };
  match = text.match(/^base (Fortitude|Reflex|Will) (?:saving throw|save) bonus\s*\+?(\d+)$/i);
  if (match) return { type: "save", key: saveKeys[match[1].toLocaleLowerCase()], minimum: Number(match[2]) };
  match = text.match(/^(Str|Dex|Con|Int|Wis|Cha)\s*(\d+)$/i);
  if (match) return { type: "ability", key: abilityKeys[match[1].toLocaleLowerCase()], minimum: Number(match[2]) };
  match = text.match(/^(Str|Dex|Con|Int|Wis|Cha)\s+or\s+(Str|Dex|Con|Int|Wis|Cha)\s*(\d+)$/i);
  if (match) return { type: "any", prerequisites: [
    { type: "ability", key: abilityKeys[match[1].toLocaleLowerCase()], minimum: Number(match[3]) },
    { type: "ability", key: abilityKeys[match[2].toLocaleLowerCase()], minimum: Number(match[3]) },
  ] };
  match = text.match(/^(Str|Dex|Con|Int|Wis|Cha)\s*(\d+)\s+or\s+(Str|Dex|Con|Int|Wis|Cha)\s*(\d+)(?:\s+\(see special\))?$/i);
  if (match) return { type: "any", prerequisites: [
    { type: "ability", key: abilityKeys[match[1].toLocaleLowerCase()], minimum: Number(match[2]) },
    { type: "ability", key: abilityKeys[match[3].toLocaleLowerCase()], minimum: Number(match[4]) },
  ] };
  match = text.match(/^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s*(\d+)$/i);
  if (match) return { type: "ability", key: fullAbilityKeys[match[1].toLocaleLowerCase()], minimum: Number(match[2]) };
  match = text.match(/^([A-Za-z]+) level\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (match && classIds.has(match[1].toLocaleLowerCase())) return { type: "class-level", classId: match[1].toLocaleLowerCase(), minimum: Number(match[2]) };
  match = text.match(/^([A-Za-z]+) or ([A-Za-z]+) level\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (match && classIds.has(match[1].toLocaleLowerCase()) && classIds.has(match[2].toLocaleLowerCase())) {
    return { type: "any", prerequisites: [
      { type: "class-level", classId: match[1].toLocaleLowerCase(), minimum: Number(match[3]) },
      { type: "class-level", classId: match[2].toLocaleLowerCase(), minimum: Number(match[3]) },
    ] };
  }
  match = text.match(/^(\d+)(?:st|nd|rd|th)-level\s+([A-Za-z]+)$/i);
  if (match && classIds.has(match[2].toLocaleLowerCase())) return { type: "class-level", classId: match[2].toLocaleLowerCase(), minimum: Number(match[1]) };
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
  const preferredFeatId = featIdByName.get(text.toLocaleLowerCase());
  if (preferredFeatId && /^(?:Endurance|Awesome Blow)$/i.test(text)) return { type: "feat", id: preferredFeatId };
  const normalizedFeatureKey = featureKey(text);
  if (!text.startsWith("(") && classFeatureKeys.has(normalizedFeatureKey)) return { type: "feature", id: normalizedFeatureKey };
  const featureName = text
    .replace(/\s+(?:(?:ACG|APG|ARG|ISG|ISM|ISWG|OA|TG|UC|UI|UM)\s+)?class feature(?:\s+(?:ACG|APG|ARG|ISG|ISM|ISWG|OA|TG|UC|UI|UM))?$/i, "")
    .replace(/\s+rogue talent$/i, "")
    .replace(/^the\s+/i, "");
  const normalizedNamedFeatureKey = featureKey(featureName);
  const aliasedFeatureId = supportedFeatureAliases.get(normalizedNamedFeatureKey);
  if (!featureName.startsWith("(") && (classFeatureKeys.has(normalizedNamedFeatureKey) || aliasedFeatureId)) {
    return { type: "feature", id: aliasedFeatureId ?? normalizedNamedFeatureKey };
  }
  const withoutCitation = text
    .replace(/\s+(?:ACG|APG|ARG|ISG|ISM|ISWG|OA|TG|UC|UI|UM)(?:\s+feat)?$/i, "")
    .replace(/\s+feat$/i, "");
  const featId = featIdByName.get(withoutCitation.toLocaleLowerCase());
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

const repairSplitBrawlerMonkAlternative = (prerequisites) => {
  const monkRuleIndex = prerequisites.findIndex((prerequisite) => prerequisite.type === "rule" && /^or monk level \d+(?:st|nd|rd|th)$/i.test(prerequisite.description));
  if (monkRuleIndex === -1) return prerequisites;
  const monkLevel = Number(prerequisites[monkRuleIndex].description.match(/\d+/)?.[0]);
  const babIndex = prerequisites.findLastIndex((prerequisite, index) => index < monkRuleIndex && prerequisite.type === "bab");
  let brawlerIndex = prerequisites.findLastIndex((prerequisite, index) => index < monkRuleIndex && prerequisite.type === "class-level" && prerequisite.classId === "brawler" && prerequisite.minimum === monkLevel);
  const citationIndex = prerequisites.findLastIndex((prerequisite, index) => index < monkRuleIndex && prerequisite.type === "class-level" && prerequisite.classId === "acg" && prerequisite.minimum === monkLevel);
  const brawlerLabelIndex = prerequisites.findLastIndex((prerequisite, index) => index < monkRuleIndex && prerequisite.type === "rule" && /^brawler$/i.test(prerequisite.description));
  if (brawlerIndex === -1 && citationIndex !== -1 && brawlerLabelIndex !== -1) brawlerIndex = citationIndex;
  if (babIndex === -1 || brawlerIndex === -1 || !Number.isInteger(monkLevel)) return prerequisites;
  const removed = new Set([babIndex, brawlerIndex, monkRuleIndex]);
  if (brawlerLabelIndex !== -1) removed.add(brawlerLabelIndex);
  const insertionIndex = Math.min(...removed);
  const alternative = { type: "any", prerequisites: [
    { type: "bab", minimum: prerequisites[babIndex].minimum },
    { type: "class-level", classId: "brawler", minimum: monkLevel },
    { type: "class-level", classId: "monk", minimum: monkLevel },
  ] };
  return prerequisites.flatMap((prerequisite, index) => index === insertionIndex ? [alternative] : removed.has(index) ? [] : [prerequisite]);
};

const repairSplitAbilityAlternative = (prerequisites) => {
  const terminalIndex = prerequisites.findIndex((prerequisite) => prerequisite.type === "rule" && /^or (Str|Dex|Con|Int|Wis|Cha) \d+(?:\s+\(see special\))?$/i.test(prerequisite.description));
  if (terminalIndex === -1) return prerequisites;
  const match = prerequisites[terminalIndex].description.match(/^or (Str|Dex|Con|Int|Wis|Cha) (\d+)/i);
  const minimum = Number(match?.[2]);
  const alternatives = [{ type: "ability", key: abilityKeys[match?.[1].toLocaleLowerCase()], minimum }];
  const removed = new Set([terminalIndex]);
  for (let index = terminalIndex - 1; index >= 0; index -= 1) {
    const prerequisite = prerequisites[index];
    if (prerequisite.type === "ability" && prerequisite.minimum === minimum) {
      alternatives.unshift(prerequisite);
      removed.add(index);
      continue;
    }
    if (prerequisite.type === "rule" && abilityKeys[prerequisite.description.toLocaleLowerCase()]) {
      alternatives.unshift({ type: "ability", key: abilityKeys[prerequisite.description.toLocaleLowerCase()], minimum });
      removed.add(index);
      continue;
    }
    break;
  }
  if (alternatives.length < 2) return prerequisites;
  const insertionIndex = Math.min(...removed);
  return prerequisites.flatMap((prerequisite, index) => index === insertionIndex ? [{ type: "any", prerequisites: alternatives }] : removed.has(index) ? [] : [prerequisite]);
};

const repairParentheticalChoices = (prerequisites) => {
  let changed = false;
  const repaired = prerequisites.flatMap((prerequisite, index) => {
    if (prerequisite.type !== "rule") return [prerequisite];
    const match = prerequisite.description.match(/^\(([^)]+)\)?(?:\s+(?:ACG|APG|ARG|ISG|ISM|ISWG|OA|TG|UC|UI|UM))?$/i);
    const selectedFeat = prerequisites[index - 1];
    const key = selectedFeat?.type === "feat" ? featChoiceKeyById.get(selectedFeat.id) : undefined;
    if (!match || !key) return [prerequisite];
    const value = match[1].trim().toLocaleLowerCase();
    if (value === "any" || value === "any school") {
      changed = true;
      return [];
    }
    if (/\bany\b|at least|\[|^natural weapon$/i.test(value)) return [prerequisite];
    changed = true;
    return [{ type: "choice-value", featId: selectedFeat.id, key, value }];
  });
  return changed ? repaired : prerequisites;
};

const removeCitationRules = (prerequisites) => {
  const repaired = prerequisites.filter((prerequisite) => prerequisite.type !== "rule" || !(
    /^\(\s*(?:(?:Pathfinder Campaign Setting:\s*)|(?:Pathfinder RPG\s*))?(?:Ranged Tactics Toolbox|The Inner Sea World Guide|Occult Adventures|Ultimate Combat)\s+\d+\s*\)$/i.test(prerequisite.description)
    || /^\(see the Pathfinder RPG Advanced Player(?:â€™|’|'|&apos;)s Guide\s*\)$/i.test(prerequisite.description)
  ));
  return repaired.length === prerequisites.length ? prerequisites : repaired;
};

const repairChosenWeapon = (feat, prerequisites) => {
  const ruleIndex = prerequisites.findIndex((prerequisite) => prerequisite.type === "rule" && /^with the chosen weapon$/i.test(prerequisite.description));
  if (ruleIndex === -1 || !prerequisites.some((prerequisite) => prerequisite.type === "feat" && prerequisite.id === "weapon-focus")) {
    return prerequisites;
  }
  feat.choice ??= { key: "weapon", label: "Weapon", allowCustom: true };
  return prerequisites.map((prerequisite, index) => index === ruleIndex
    ? { type: "matching-choice", featId: "weapon-focus", key: "weapon" }
    : prerequisite);
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
  const brawlerRepairedPrerequisites = repairSplitBrawlerMonkAlternative(prerequisites);
  const abilityRepairedPrerequisites = repairSplitAbilityAlternative(brawlerRepairedPrerequisites);
  const citationRepairedPrerequisites = removeCitationRules(abilityRepairedPrerequisites);
  const parentheticalRepairedPrerequisites = repairParentheticalChoices(citationRepairedPrerequisites);
  const repairedPrerequisites = repairChosenWeapon(feat.value, parentheticalRepairedPrerequisites);
  if (repairedPrerequisites !== prerequisites) {
    changed = true;
    convertedRules += 1;
  }
  feat.value.prerequisites = repairedPrerequisites;
  for (const prerequisite of repairedPrerequisites) {
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
