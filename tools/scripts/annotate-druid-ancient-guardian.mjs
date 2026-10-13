import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-ancient-guardian.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const arms = features.find((feature) => /^Ancient Arms/.test(feature.name));
const bond = features.find((feature) => /^Community Bond/.test(feature.name));
const patience = features.find((feature) => /^Patience of Nature/.test(feature.name));
const ways = features.find((feature) => /^Ancient Ways/.test(feature.name));
const hostility = features.find((feature) => /^Dispel Hostility/.test(feature.name));
const unimpeachable = features.find((feature) => /^Unimpeachable/.test(feature.name));
const undo = features.find((feature) => /^Undo Artifice/.test(feature.name));

patience.level = 2;

arms.resourceActions = [{
  id: "ancient-guardian-prohibited-weapon",
  label: "Record Prohibited Metal Weapon",
  classId: "druid",
  minimumLevel: 1,
  actionTypeByLevel: [{ level: 1, actionType: "free" }],
  confirmations: [{ id: "metal-weapon", label: "The wielded weapon is made primarily of metal", requiredForActivation: true }],
  activeEffect: {
    name: "Ancient Arms Suppression",
    targets: ["self"],
    bonus: 0,
    description: "Druid spells and supernatural and spell-like Druid class abilities are unavailable while the prohibited weapon is wielded and for 24 hours afterward.",
    defaultRounds: 14400,
    fixedRounds: true,
    replaceExisting: true,
  },
  summary: "Start or restart the 24-hour Ancient Arms suppression tracker.",
}];

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  optionChoiceIds: ["druid-nature-bond-domain"],
  progressionKey: "druid-nature-bond",
});
bond.progressionProfiles = [{
  id: "ancient-guardian-community-bond",
  label: "Community Bond",
  classId: "druid",
  columns: [{ id: "domains", label: "Legal domains" }],
  steps: [{ level: 1, values: { domains: "Community, Healing, Knowledge, Protection, or Repose" } }],
}];

patience.progressionProfiles = [{
  id: "ancient-guardian-patience",
  label: "Patience of Nature",
  classId: "druid",
  columns: [{ id: "bonus", label: "Diplomacy, Perform (oratory), Sense Motive" }],
  steps: Array.from({ length: 10 }, (_, index) => ({ level: (index + 1) * 2, values: { bonus: `+${index + 1} insight` } })),
}];

ways.progressionProfiles = [{
  id: "ancient-guardian-ancient-ways",
  label: "Ancient Ways",
  classId: "druid",
  columns: [{ id: "speed", label: "Wild Shape movement" }],
  steps: [{ level: 3, values: { speed: "+10 feet to climb, fly, and swim speeds" } }],
}];

hostility.level = 3;
hostility.spellAutomation = {
  preparedKeywordConversion: {
    label: "Dispel Hostility",
    keyword: "calm emotions",
  },
};
hostility.progressionProfiles = [{
  id: "ancient-guardian-dispel-hostility",
  label: "Dispel Hostility",
  classId: "druid",
  columns: [{ id: "rule", label: "Prepared-spell conversion" }, { id: "dc", label: "Save DC" }],
  steps: [{ level: 3, values: { rule: "Lose a prepared spell of 2nd level or higher to cast calm emotions", dc: "10 + half Druid level + Wisdom modifier" } }],
  summary: "The spellbook spends the lowest legal prepared slot and applies the archetype's level-based save DC adjustment.",
}];

undo.numericCalculations = [{
  id: "ancient-guardian-undo-artifice-dc",
  label: "Undo Artifice",
  inputLabel: "Wisdom modifier",
  inputMinimum: -5,
  inputMaximum: 20,
  inputDefault: 3,
  outputLabel: "Fortitude save DC",
  baseByLevel: Array.from({ length: 8 }, (_, index) => ({ level: index + 13, value: 10 + Math.floor((index + 13) / 2) })),
  inputMultiplierByLevel: [{ level: 13, multiplier: 1 }],
  classId: "druid",
  summary: "Magic items add +1 to this save for every 5,000 gp of value.",
}];
undo.resourceActions = [{
  id: "ancient-guardian-undo-artifice",
  label: "Undo Artifice",
  classId: "druid",
  minimumLevel: 13,
  resourceId: "undoArtifice",
  cost: 1,
  actionTypeByLevel: [{ level: 13, actionType: "standard" }],
  savingThrow: { label: "Fortitude", ability: "wisdom", base: 10, levelDivisor: 2, classId: "druid" },
  modeLabel: "Object type",
  modes: [
    { id: "nonmagical", label: "Nonmagical object", summary: "Permanently reduce a nonliving object to its component raw materials on a failed Fortitude save." },
    { id: "magical", label: "Magic item", summary: "Permanently reduce a magic item to raw materials; add +1 to its Fortitude save per 5,000 gp of value." },
  ],
  confirmations: [{ id: "nonliving", label: "The target is a nonliving object", requiredForActivation: true }],
  spellLikeAbility: { spellId: "polymorph-any-object", spellName: "Polymorph Any Object — raw materials only, permanent", cadence: "day", kind: "spell-like" },
  summary: "Spend one Wisdom-based daily use and resolve the object's Fortitude save; this cannot mimic another spell.",
}];

archetype.spellListAdditions = { "calm-emotions": 2 };
archetype.spellModifierAdjustments = [{
  sourceFeatureId: hostility.id,
  label: "Dispel Hostility save DC",
  target: "saveDc",
  minimumLevel: 3,
  base: -1,
  spellIds: ["calm-emotions"],
  bonusByLevel: [
    { level: 3, bonus: -1 }, { level: 4, bonus: 0 }, { level: 6, bonus: 1 },
    { level: 8, bonus: 2 }, { level: 10, bonus: 3 }, { level: 12, bonus: 4 },
    { level: 14, bonus: 5 }, { level: 16, bonus: 6 }, { level: 18, bonus: 7 },
    { level: 20, bonus: 8 },
  ],
}];
archetype.conditionalModifiers = [
  ...["Diplomacy", "Perform (oratory)", "Sense Motive"].map((skill) => ({ sourceFeatureId: patience.id, label: `Patience of Nature — ${skill}`, condition: `${skill} checks`, minimumLevel: 2, base: 0, levelDivisor: 2, levelMultiplier: 1, minimum: 1, maximum: 10 })),
  { sourceFeatureId: ways.id, label: "Ancient Ways", condition: "Climb, fly, and swim speeds possessed or gained through Wild Shape", minimumLevel: 3, base: 10 },
  { sourceFeatureId: unimpeachable.id, label: "Unimpeachable", condition: "Saving throws against enchantments", minimumLevel: 4, base: 4 },
];
archetype.resourceAdjustments = [{ sourceFeatureId: undo.id, resourceId: "undoArtifice", label: "Undo Artifice", unit: "use", operation: "replace", minimumLevel: 13, base: 0, abilityModifier: "wisdom", minimum: 0, refreshCadence: "day", dedicatedAction: true }];
archetype.druidNatureBondOptionIds = ["druid-nature-bond-domain"];
archetype.druidDomainIds = ["domain-community", "domain-healing", "domain-knowledge", "domain-protection", "domain-repose"];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Ancient Arms restrictions and suppression, Community Bond domains, all Patience of Nature skill scaling, Wild Shape movement, calm emotions conversion and save DC, enchantment saves, and Wisdom-based Undo Artifice uses, modes, saves, and restrictions are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Ancient Guardian automation.");
