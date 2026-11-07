import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-troll-fury.json", import.meta.url);
const enemyUrl = new URL("../../packages/data/src/options/ranger-favored-enemies.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const enemyGroup = JSON.parse(await readFile(enemyUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const fervor = find("Inspire Fervor");
const prey = find("Chosen Prey");
const mark = find("Troll Fury’s Mark");
const enemyIds = enemyGroup.options.map((option) => option.id);
const favoredBonus = [{ level: 4, bonus: 2 }, { level: 5, bonus: 4 }, { level: 10, bonus: 6 }, { level: 15, bonus: 8 }, { level: 20, bonus: 10 }];

fervor.resourceActions = [{
  id: "troll-fury-inspire-fervor",
  label: "Inspire Fervor",
  classId: "druid",
  minimumLevel: 1,
  resourceId: "trollFuryFervor",
  cost: 1,
  actionTypeByLevel: [{ level: 1, actionType: "standard" }],
  confirmations: [{ id: "troll-target", label: "Target is one other troll within 30 feet", requiredForActivation: true }],
  activeEffect: {
    name: "Inspire Fervor",
    targets: ["attackRolls", "weaponDamageRolls", "savingThrowsAgainstCharmAndFear"],
    bonus: 1,
    bonusByLevel: [{ level: 1, bonus: 1 }, { level: 5, bonus: 2 }, { level: 11, bonus: 3 }, { level: 17, bonus: 4 }],
    description: "One other troll within 30 feet gains the current Inspire Courage morale bonuses against charm and fear and on weapon attacks and damage.",
    defaultRounds: 10,
    fixedRounds: true,
    replaceExisting: true
  },
  summary: "Spend the once-daily use and track the exact 1-minute, Druid-level-scaled Inspire Courage effect on one troll."
}];
fervor.progressionProfiles = [{
  id: "troll-fury-inspire-fervor-bonus",
  label: "Inspire Fervor Bonus",
  classId: "druid",
  columns: [{ id: "bonus", label: "Morale bonus" }, { id: "duration", label: "Duration" }],
  steps: [
    { level: 1, values: { bonus: "+1", duration: "1 minute" } },
    { level: 5, values: { bonus: "+2", duration: "1 minute" } },
    { level: 11, values: { bonus: "+3", duration: "1 minute" } },
    { level: 17, values: { bonus: "+4", duration: "1 minute" } }
  ]
}];

Object.assign(prey, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "ranger-favored-enemies",
  optionChoiceIds: enemyIds,
  progressionKey: "troll-fury-chosen-prey"
});
prey.progressionProfiles = [{
  id: "troll-fury-chosen-prey-bonus",
  label: "Chosen Prey Bonus",
  classId: "druid",
  columns: [{ id: "bonus", label: "Favored-enemy bonus" }, { id: "selection", label: "Creature types" }],
  steps: favoredBonus.map(({ level, bonus }) => ({ level, values: { bonus: `+${bonus}`, selection: "One selected type" } })),
  summary: "If another class grants favored enemy, those class levels stack and may permit additional enemy types under the published multiclass rule."
}];
prey.resourceActions = [
  {
    id: "troll-fury-apply-chosen-prey",
    label: "Apply Chosen Prey",
    classId: "druid",
    minimumLevel: 4,
    confirmations: [{ id: "selected-enemy", label: "Target matches the currently selected favored-enemy type", requiredForActivation: true }],
    activeEffect: {
      name: "Chosen Prey",
      targets: ["attackRolls", "weaponDamageRolls", "skillChecks"],
      bonus: 2,
      bonusByLevel: favoredBonus,
      description: "Apply the current favored-enemy bonus against the selected creature type. For skill checks, choose Bluff, Knowledge, Perception, Sense Motive, or Survival as appropriate.",
      defaultRounds: 1,
      fixedRounds: true,
      replaceExisting: true,
      skillOptions: ["Bluff", "Knowledge", "Perception", "Sense Motive", "Survival"]
    },
    summary: "Apply the level-scaled favored-enemy bonus to combat and the selected qualifying skill check."
  },
  {
    id: "troll-fury-change-chosen-prey",
    label: "Change Chosen Prey",
    classId: "druid",
    minimumLevel: 4,
    resourceId: "trollFuryPreyChange",
    cost: 1,
    actionTypeByLevel: [{ level: 4, actionType: "1-hour" }],
    summary: "After completing the ritual, update the persistent Chosen Prey selection. This refreshes once per week."
  }
];

mark.resourceActions = [{
  id: "troll-fury-mark-target",
  label: "Apply Troll Fury’s Mark",
  classId: "druid",
  minimumLevel: 9,
  confirmations: [{ id: "natural-hit", label: "The Troll Fury or animal companion damaged the target with a natural attack", requiredForActivation: true }],
  activeEffect: {
    name: "Troll Fury’s Mark",
    targets: ["skillChecks"],
    bonus: 10,
    description: "+10 insight bonus on Survival checks to track the damaged creature. A new qualifying hit refreshes, rather than stacks, the 24-hour duration.",
    defaultRounds: 14400,
    fixedRounds: true,
    replaceExisting: true,
    skillOptions: ["Survival"]
  },
  summary: "Track the marked creature and exact 24-hour duration; reapply after another natural-attack hit to refresh it."
}];

archetype.resourceAdjustments = [
  ...(archetype.resourceAdjustments ?? []).filter((entry) => !["trollFuryFervor", "trollFuryPreyChange"].includes(entry?.resourceId)),
  { sourceFeatureId: fervor.id, resourceId: "trollFuryFervor", label: "Inspire Fervor", unit: "use", operation: "replace", minimumLevel: 1, base: 1, minimum: 0, maximum: 1, refreshCadence: "day", dedicatedAction: true },
  { sourceFeatureId: prey.id, resourceId: "trollFuryPreyChange", label: "Chosen Prey change", unit: "ritual", operation: "replace", minimumLevel: 4, base: 1, minimum: 0, maximum: 1, refreshCadence: "week", dedicatedAction: true }
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Inspire Fervor's daily use, target, duration, and level scaling; persistent Chosen Prey selection, effective-ranger-level bonus, weekly change ritual, combat/skill application; and Troll Fury's Mark trigger, +10 Survival bonus, and refreshable 24-hour duration are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Troll Fury automation.");
