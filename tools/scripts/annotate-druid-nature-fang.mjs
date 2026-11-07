import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = new URL("packages/data/src/archetypes/druid-nature-fang.json", root);
const sourceOptionsUrl = new URL("packages/data/src/options/slayer-talents.json", root);
const optionUrl = new URL("packages/data/src/options/druid-nature-fang-talents.json", root);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const sourceGroup = JSON.parse(await readFile(sourceOptionsUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const studied = find("Studied Target");
const talents = find("Slayer Talent");
const sneak = find("Sneak Attack");
const swift = find("Swift Studied Target");
if (![studied, talents, sneak, swift].every(Boolean)) throw new Error("Nature Fang source features were not found");

const advancedIds = new Set(sourceGroup.options.filter((option) => (option.minimumLevel ?? sourceGroup.optionDefaults.minimumLevel) >= 10).map((option) => option.id));
const customization = {
  "slayer-combat-trick": ["combat-feat", "Combat feat selected"],
  "slayer-firearm-training": ["firearm", "Firearm selected"],
  "slayer-ranger-combat-style": ["combat-style-feat", "Ranger combat-style feat selected"],
  "slayer-rogue-talent": ["rogue-talent", "Rogue talent selected"],
  "slayer-terrain-mastery": ["favored-terrain", "Favored terrain selected"],
  "slayer-weapon-training": ["weapon", "Weapon selected for Weapon Focus"],
  "slayer-master-tricks": ["advanced-rogue-talent", "Advanced rogue talent selected"],
};
const repeatable = new Set(["slayer-combat-trick", "slayer-ranger-combat-style", "slayer-rogue-talent", "slayer-terrain-mastery", "slayer-master-tricks"]);
const options = sourceGroup.options.map((raw) => {
  const originalId = raw.id;
  const id = `nature-fang-${originalId.replace(/^slayer-/, "")}`;
  const detail = customization[originalId];
  return {
    ...sourceGroup.optionDefaults,
    ...raw,
    id,
    groupId: "druid-nature-fang-talents",
    classIds: ["druid"],
    minimumLevel: advancedIds.has(originalId) ? 12 : 4,
    prerequisites: [],
    repeatable: repeatable.has(originalId) || raw.repeatable || undefined,
    selectionLimit: repeatable.has(originalId) ? 9 : undefined,
    choice: detail ? { key: detail[0], label: detail[1], allowCustom: true, uniqueAcrossSelections: true } : raw.choice,
    featId: originalId === "slayer-finesse-rogue" ? "weapon-finesse" : raw.featId,
    benefit: `${raw.benefit}${advancedIds.has(originalId) ? " Available to a Nature Fang from level 12." : ""}`,
  };
});
await writeFile(optionUrl, `${JSON.stringify({ id: "druid-nature-fang-talents", name: "Nature Fang Slayer Talents", classIds: ["druid"], uniqueAcrossSelections: false, options, source: archetype.source }, null, 2)}\n`);

const basicIds = options.filter((option) => option.minimumLevel < 12).map((option) => option.id);
const allIds = options.map((option) => option.id);
const talentLevels = [4, 6, 8, 10, 12, 14, 16, 18, 20];
const occurrences = talentLevels.map((level, index) => ({
  ...(index === 0 ? talents : {}),
  id: `druid-nature-fang-slayer-talent-${level}`,
  name: level >= 12 ? `Advanced Slayer Talent ${index + 1}` : `Slayer Talent ${index + 1}`,
  level,
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-fang-talents",
  optionChoiceIds: level >= 12 ? allIds : basicIds,
  progressionKey: "nature-fang-slayer-talents",
  summary: level >= 12
    ? "Choose one unique basic or advanced Slayer talent. Repeatable talent families remain available within their published limits."
    : "Choose one unique basic Slayer talent using Druid level as effective Slayer level.",
}));
for (const replacement of archetype.replacements) {
  const rebuilt = [];
  for (const feature of replacement.features ?? []) {
    if (feature.id === talents.id || feature.id.startsWith("druid-nature-fang-slayer-talent-")) {
      if (!rebuilt.some((candidate) => candidate.id === occurrences[0].id)) rebuilt.push(...occurrences);
    } else rebuilt.push(feature);
  }
  replacement.features = rebuilt;
}

const studiedBonuses = [1, 5, 10, 15, 20].map((level, index) => ({ level, bonus: index + 1 }));
studied.resourceActions = [{
  id: "nature-fang-study-target",
  label: "Study Target",
  classId: "druid",
  minimumLevel: 1,
  modeLabel: "Action",
  modes: [
    { id: "move", label: "Move action", actionType: "move", summary: "Study one visible opponent as a move action." },
    { id: "swift", label: "Swift action", minimumLevel: 9, actionType: "swift", summary: "From level 9, study one visible opponent as a swift action." },
  ],
  recipientLabel: "Studied target",
  activeEffect: {
    name: "Nature Fang Studied Target",
    targets: ["attackRolls", "weaponDamageRolls", "skillChecks"],
    bonus: 1,
    bonusByLevel: studiedBonuses,
    description: "Apply the displayed bonus against the one current studied target to weapon attacks, weapon damage, and the selected Bluff, Knowledge, Perception, Sense Motive, or Survival check. Studying a new target replaces the old target.",
    defaultRounds: 999999,
    fixedRounds: true,
    replaceExisting: true,
    applyToAllTargets: true,
    skillOptions: ["Bluff", "Knowledge", "Perception", "Sense Motive", "Survival"],
  },
  summary: "Track the single persistent studied target, exact bonus scaling, qualifying skill, and move/swift action timing.",
}];
studied.progressionProfiles = [{
  id: "nature-fang-studied-target-bonus",
  label: "Studied Target",
  classId: "druid",
  columns: [{ id: "bonus", label: "Attack, damage, and skill bonus" }, { id: "targets", label: "Simultaneous targets" }, { id: "action", label: "Study action" }],
  steps: studiedBonuses.map(({ level, bonus }) => ({ level, values: { bonus: `+${bonus}`, targets: 1, action: level >= 10 ? "Move or swift" : level >= 9 ? "Move or swift" : "Move" } })),
  summary: "Unlike a Slayer, a Nature Fang never maintains more than one studied target.",
}];

archetype.precisionDamageAdjustments = [{ sourceFeatureId: sneak.id, label: "Sneak Attack", dieSides: 6, diceByLevel: [{ level: 4, dice: 1 }], condition: "Target is flanked or denied Dexterity to Armor Class", attackMode: "any" }];
swift.progressionProfiles = [{ id: "nature-fang-swift-study", label: "Swift Studied Target", classId: "druid", columns: [{ id: "action", label: "Available action" }], steps: [{ level: 9, values: { action: "Move or swift action" } }], summary: "The Study Target control unlocks its swift-action mode at level 9." }];

archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Single-target Studied Target persistence, exact +1 to +5 scaling, qualifying checks, level-9 swift action, nine unique/repeatable Slayer Talent selections with advanced access delayed to level 12, and stack-aware +1d6 Sneak Attack are automated."];
await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Nature Fang automation.");
