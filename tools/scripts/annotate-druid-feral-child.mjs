import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-feral-child.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const illiteracy = features.find((feature) => /^Illiteracy/.test(feature.name));
const unarmed = features.find((feature) => /^Improved Unarmed Strike/.test(feature.name));
const family = features.find((feature) => /^Beast Family/.test(feature.name));
const bond = features.find((feature) => /^Nature Bond/.test(feature.name));
const terrain = features.find((feature) => /^Favored Terrain/.test(feature.name));
const cunning = features.find((feature) => /^Native Cunning/.test(feature.name));
const fortitude = features.find((feature) => /^Native Fortitude/.test(feature.name));
const call = features.find((feature) => /^Native Call/.test(feature.name));

illiteracy.progressionProfiles = [{
  id: "feral-child-literacy",
  label: "Illiteracy",
  classId: "druid",
  columns: [{ id: "rule", label: "Language rule" }],
  steps: [{ level: 1, values: { rule: "Cannot read or write until 1 Linguistics rank is purchased; does not gain Druidic and cannot choose Sylvan as a bonus language" } }],
}];
unarmed.grantedFeatId = "improved-unarmed-strike";

Object.assign(family, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "feral-child-beast-families",
  optionChoiceIds: ["feral-child-beast-family"],
  progressionKey: "feral-child-beast-family",
});
family.resourceActions = [{
  id: "feral-child-speak-with-family",
  label: "Speak with Beast Family",
  classId: "druid",
  minimumLevel: 1,
  requiredOptionId: "feral-child-beast-family",
  actionTypeByLevel: [{ level: 1, actionType: "free" }],
  confirmations: [{ id: "family-type", label: "The target is the selected Beast Family animal type", requiredForActivation: true }],
  activeEffect: { name: "Beast Family Communication", targets: ["self"], bonus: 0, description: "Communicate nonmagically with the selected animal family as though using speak with animals.", defaultRounds: 1, replaceExisting: true },
  summary: "Record communication with the selected animal family; this ability is nonmagical and continual.",
}];

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  optionChoiceIds: ["druid-nature-bond-animal"],
  progressionKey: "druid-nature-bond",
});

terrain.optionChoiceIds = [
  "ranger-terrain-cold", "ranger-terrain-desert", "ranger-terrain-forest", "ranger-terrain-jungle",
  "ranger-terrain-mountain", "ranger-terrain-plains", "ranger-terrain-planes", "ranger-terrain-swamp",
  "ranger-terrain-underground", "ranger-terrain-water",
];

const maneuverLevels = [3, 6, 9, 12, 15, 18];
const maneuverFeatures = maneuverLevels.map((level, index) => ({
  id: index === 0 ? cunning.id : `${cunning.id}-choice-${level}`,
  name: `Native Cunning Maneuver ${index + 1}`,
  level,
  type: "selectable",
  summary: index === 0 ? cunning.summary : "Choose another combat maneuver. Add the current trap-sense bonus to CMD against that maneuver.",
  choiceRequired: true,
  optionGroupId: "feral-child-combat-maneuvers",
  progressionKey: "feral-child-native-cunning",
}));
for (const replacement of archetype.replacements) {
  replacement.features = (replacement.features ?? []).flatMap((feature) => feature.id === cunning.id ? maneuverFeatures : [feature]);
}
maneuverFeatures[0].progressionProfiles = [{
  id: "feral-child-native-cunning",
  label: "Native Cunning",
  classId: "druid",
  columns: [{ id: "trapSense", label: "Trap sense / selected-maneuver CMD" }, { id: "maneuvers", label: "Maneuvers selected" }],
  steps: maneuverLevels.map((level, index) => ({ level, values: { trapSense: `+${index + 1}`, maneuvers: index + 1 } })),
  summary: "Trap Spotter grants an immediate Perception check for traps within 10 feet while in favored terrain.",
}];

fortitude.progressionProfiles = [{
  id: "feral-child-native-fortitude",
  label: "Native Fortitude",
  classId: "druid",
  columns: [{ id: "saves", label: "Disease, exhaustion, fatigue, fear, poison" }, { id: "recovery", label: "Recovery" }],
  steps: [{ level: 4, values: { saves: "+1, or the current favored-terrain bonus while in favored terrain", recovery: "Twice normal rate from ability damage, exhaustion, and fatigue" } }],
}];

call.resourceActions = [{
  id: "feral-child-native-call",
  label: "Track Native Animal Summon",
  classId: "druid",
  minimumLevel: 9,
  modeLabel: "Current Native Call tier",
  modes: [
    { id: "extended", label: "+2 effective levels for duration", minimumLevel: 9, maximumLevel: 16, summary: "A native animal summoned in favored terrain uses caster level +2 for duration only." },
    { id: "empowered", label: "Extended; +2 Strength and Constitution", minimumLevel: 17, summary: "A native animal summoned in favored terrain uses caster level +2 for duration and gains +2 Strength and Constitution." },
  ],
  confirmations: [
    { id: "favored-terrain", label: "The Feral Child is in a selected favored terrain", requiredForActivation: true },
    { id: "native-animal", label: "Every summoned creature is an animal native to that terrain", requiredForActivation: true },
  ],
  activeEffect: { name: "Native Call Summon", targets: ["allies"], bonus: 0, description: "The summoned native animals receive the selected level-aware Native Call benefits. Augment Summoning continues to stack.", defaultRounds: 1 },
  summary: "Record the favored-terrain summon and its extended duration; apply the level-17 ability bonuses when unlocked.",
}];

archetype.wildEmpathyAdjustments = [{ sourceFeatureId: family.id, label: "Beast Family", classId: "druid", minimumLevel: 1, bonus: 2, targets: "the selected Beast Family animal type", condition: "when interacting with the selected animal family" }];
archetype.skillBonusAdjustments = [{ sourceFeatureId: family.id, skill: "Handle Animal", minimumLevel: 1, base: 2, condition: "with the selected Beast Family animal type" }];
archetype.conditionalModifiers = [
  { sourceFeatureId: maneuverFeatures[0].id, label: "Native Cunning — selected maneuvers", condition: "CMD against each selected Native Cunning combat maneuver", minimumLevel: 3, base: 0, levelDivisor: 3, levelMultiplier: 1, minimum: 1, maximum: 6 },
  { sourceFeatureId: fortitude.id, label: "Native Fortitude", condition: "Saving throws against disease, exhaustion, fatigue, fear, and poison outside favored terrain", minimumLevel: 4, base: 1 },
  { sourceFeatureId: call.id, label: "Native Call — duration", condition: "Caster level for duration only when summon nature's ally summons animals native to the current favored terrain", minimumLevel: 9, base: 2 },
  { sourceFeatureId: call.id, label: "Native Call — Strength", condition: "Strength of animals summoned through Native Call", minimumLevel: 17, base: 2 },
  { sourceFeatureId: call.id, label: "Native Call — Constitution", condition: "Constitution of animals summoned through Native Call", minimumLevel: 17, base: 2 },
];
archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal"];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Human ancestry, proficiencies, skills, literacy restrictions, Improved Unarmed Strike, custom Beast Family selection, communication and bonuses, animal-only Nature Bond, non-urban Favored Terrain progression, all six Native Cunning maneuver choices and CMD scaling, Trap Spotter, Native Fortitude, and both Native Call tiers are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Feral Child automation.");
