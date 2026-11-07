import { readFile, writeFile } from "node:fs/promises";

const archetypeUrl = new URL("../../packages/data/src/archetypes/druid-pack-lord.json", import.meta.url);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const packBond = features.find((feature) => /^Pack Bond/.test(feature.name));
const empathicLink = features.find((feature) => /^Improved Empathic Link/.test(feature.name));
if (!packBond || !empathicLink) throw new Error("Pack Lord features were not found");

Object.assign(packBond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "ranger-animal-companions",
  companionRoster: {
    label: "Pack Lord",
    budgetBase: 0,
    levelMultiplier: 1,
    minimumBudget: 1,
    lockAllocatedLevels: true,
  },
  resourceActions: [{
    id: "pack-lord-share-spells-companion",
    label: "Set Share Spells Companion",
    classId: "druid",
    minimumLevel: 1,
    companionRosterFeatureId: packBond.id,
    recipientLabel: "Companion receiving Share Spells",
    actionTypeByLevel: [{ level: 1, actionType: "free" }],
    activeEffect: {
      name: "Pack Lord Share Spells Companion",
      targets: ["self"],
      bonus: 0,
      description: "Only the selected pack companion receives Share Spells; choosing another replaces this selection.",
      defaultRounds: 999,
      fixedRounds: true,
      replaceExisting: true,
    },
    summary: "Choose the one pack companion that can currently receive a one-target Share Spells effect.",
  }],
});

empathicLink.resourceActions = [{
  id: "pack-lord-shift-perception",
  label: "Shift Perception",
  classId: "druid",
  minimumLevel: 1,
  companionRosterFeatureId: packBond.id,
  recipientLabel: "Viewed companion",
  actionTypeByLevel: [{ level: 1, actionType: "swift" }],
  activeEffect: {
    name: "Pack Lord Perception Link",
    targets: ["self"],
    bonus: 0,
    description: "Experience the selected companion's senses within 1 mile; your own sight, hearing, and scent are unavailable until this link ends.",
    defaultRounds: 999,
    fixedRounds: true,
    replaceExisting: true,
  },
  summary: "Shift your senses to one selected pack companion within 1 mile; activating this for another companion replaces the current link.",
}];

archetype.wildEmpathyAdjustments = [{
  sourceFeatureId: packBond.id,
  label: "Pack Bond",
  classId: "druid",
  minimumLevel: 1,
  bonus: 2,
  targets: "the Pack Lord's animal companions",
  condition: "regarding one of your pack companions",
}];
archetype.skillBonusAdjustments = [{
  sourceFeatureId: packBond.id,
  skill: "Handle Animal",
  minimumLevel: 1,
  base: 2,
  condition: "regarding one of your pack companions",
}];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = [
  "The full-level companion allocation budget, permanent per-companion allocations, companion sheets, +2 Pack Bond checks, exclusive Share Spells recipient, and switchable one-mile perception link are automated.",
];

await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Pack Lord companion-roster automation.");
