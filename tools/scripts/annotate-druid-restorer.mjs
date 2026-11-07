import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-restorer.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const healing = features.find((feature) => /^Healing Touch/.test(feature.name));
const medic = features.find((feature) => /^Natural Medic/.test(feature.name));
const blight = features.find((feature) => /^Enemy of Blight/.test(feature.name));
const lifetimes = features.find((feature) => /^Guide across Lifetimes/.test(feature.name));

archetype.conditionalModifiers = [
  { sourceFeatureId: healing.id, label: "Healing Touch", condition: "Heal checks", minimumLevel: 1, base: 2 },
  { sourceFeatureId: healing.id, label: "Healing Touch — first aid", condition: "Additional bonus when using Heal to provide first aid", minimumLevel: 1, base: 1 },
];
medic.spellAutomation = {
  preparedKeywordConversion: {
    label: "Natural Medic",
    keyword: "cure",
  },
};
medic.progressionProfiles = [{
  id: "restorer-natural-medic-conversion",
  label: "Natural Medic conversion",
  classId: "druid",
  columns: [{ id: "rule", label: "Conversion rule" }],
  steps: [{ level: 1, values: { rule: "Lose any prepared spell to cast a cure spell of the same or a lower spell level" } }],
  summary: "Eligible cure spells receive a Natural Medic cast control that automatically spends the lowest available legal prepared slot.",
}];

blight.resourceActions = [{
  id: "restorer-enemy-of-blight",
  label: "Ignore magical overgrowth",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "restorerBlightRounds",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "free" }],
  confirmations: [{ id: "magical-overgrowth", label: "The overgrown area was magically manipulated to impede motion", requiredForActivation: true }],
  activeEffect: { name: "Enemy of Blight", targets: ["self"], bonus: 0, description: "Ignore the movement-impeding effects of magically manipulated overgrowth for this round.", defaultRounds: 1, fixedRounds: true, replaceExisting: true },
  summary: "Spend one of twice Wisdom modifier daily rounds and ignore qualifying magical overgrowth.",
}];

lifetimes.resourceActions = [{
  id: "restorer-guide-across-lifetimes",
  label: "Guide across Lifetimes",
  classId: "druid",
  minimumLevel: 13,
  resourceId: "restorerReincarnate",
  cost: 1,
  actionTypeByLevel: [{ level: 13, actionType: "full-round" }],
  spellLikeAbility: { spellId: "reincarnate", spellName: "Reincarnate without a material component", cadence: "day", kind: "spell-like" },
  summary: "Spend the once-daily use and cast reincarnate as a full-round action without its material component.",
}];

archetype.resourceAdjustments = [
  { sourceFeatureId: blight.id, resourceId: "restorerBlightRounds", label: "Enemy of Blight", unit: "round", operation: "replace", minimumLevel: 4, base: 0, abilityModifier: "wisdom", abilityMultiplier: 2, minimum: 0, refreshCadence: "day", dedicatedAction: true },
  { sourceFeatureId: lifetimes.id, resourceId: "restorerReincarnate", label: "Guide across Lifetimes", unit: "use", operation: "replace", minimumLevel: 13, base: 1, maximum: 1, refreshCadence: "day", dedicatedAction: true },
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Both Healing Touch bonuses, cure-spell prepared-slot conversion, the exact twice-Wisdom Enemy of Blight pool, and the once-daily material-free reincarnate action are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Restorer automation.");
