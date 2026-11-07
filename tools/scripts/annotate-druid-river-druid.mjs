import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-river-druid.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const ferrier = features.find((feature) => /^Ferrier/.test(feature.name));
const currents = features.find((feature) => /^Read the Currents/.test(feature.name));
const countercurrent = features.find((feature) => /^Countercurrent/.test(feature.name));
const breath = features.find((feature) => /^Deep Breath/.test(feature.name));
const wildShape = features.find((feature) => /^Wild Shape/.test(feature.name));
const tongue = features.find((feature) => /^Tongue of the Sun and Moon/.test(feature.name));

archetype.conditionalModifiers = [
  ...["Diplomacy", "Knowledge (nature)"].map((skill) => ({ sourceFeatureId: ferrier.id, label: `Ferrier — ${skill}`, condition: `${skill} checks`, minimumLevel: 1, base: 2 })),
  { sourceFeatureId: currents.id, label: "Read the Currents — initiative", condition: "Initiative checks while in, on, or adjacent to flowing water", minimumLevel: 2, base: 0, levelDivisor: 2, levelMultiplier: 1 },
  ...["Acrobatics", "Knowledge (geography)", "Perception", "Stealth", "Survival", "Swim"].map((skill) => ({ sourceFeatureId: currents.id, label: `Read the Currents — ${skill}`, condition: `${skill} checks while in, on, or adjacent to flowing water`, minimumLevel: 2, base: 0, levelDivisor: 2, levelMultiplier: 1 })),
];

countercurrent.progressionProfiles = [{
  id: "river-druid-countercurrent",
  label: "Countercurrent permissions",
  classId: "druid",
  columns: [{ id: "movement", label: "Water movement" }, { id: "current", label: "Flowing current" }],
  steps: [{ level: 3, values: { movement: "No speed, Acrobatics, or Stealth penalties in nonmagical shallow water", current: "Character and piloted vehicle move only when allowed" } }],
  summary: "Magically manipulated water still applies its normal movement effects.",
}];

breath.numericCalculations = [{
  id: "river-druid-deep-breath",
  label: "Deep Breath",
  inputLabel: "Constitution score",
  inputMinimum: 1,
  inputMaximum: 99,
  inputDefault: 10,
  outputLabel: "Minutes before suffocation checks",
  baseByLevel: [{ level: 4, value: 0 }],
  inputMultiplierByLevel: [{ level: 4, multiplier: 1 }],
  classId: "druid",
  summary: "Hold breath for a number of minutes equal to the full Constitution score, then begin normal suffocation checks.",
}];

wildShape.progressionKey = "druid-wild-shape";
wildShape.resourceActions = [{
  id: "river-druid-wild-shape",
  label: "Assume River Druid Wild Shape",
  classId: "druid",
  minimumLevel: 6,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 6, actionType: "standard" }],
  modeLabel: "Form tier",
  modes: [
    { id: "animal-small-medium", label: "Small or Medium animal", minimumLevel: 6, summary: "Use beast shape I (effective Druid level 4)." },
    { id: "animal-large", label: "Large animal", minimumLevel: 8, summary: "Use beast shape II." },
    { id: "elemental-small", label: "Small elemental", minimumLevel: 8, summary: "Use elemental body I." },
    { id: "animal-tiny-huge", label: "Tiny or Huge animal", minimumLevel: 10, summary: "Use beast shape III." },
    { id: "elemental-medium", label: "Medium elemental", minimumLevel: 10, summary: "Use elemental body II." },
    { id: "plant", label: "Plant creature", minimumLevel: 10, summary: "Use the plant shape tier allowed by effective level." },
    { id: "elemental-large", label: "Large elemental", minimumLevel: 12, summary: "Use elemental body III." },
    { id: "elemental-huge", label: "Huge elemental", minimumLevel: 14, summary: "Use elemental body IV." },
  ],
  activeEffect: {
    name: "River Druid Wild Shape",
    targets: ["self"],
    bonus: 0,
    description: "Assume the selected form using an effective Druid level 2 lower than actual level.",
    defaultRounds: 2400,
    defaultRoundsByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 4) * 600 })),
    fixedRounds: true,
    replaceExisting: true,
  },
  summary: "Spend one use; form access, daily uses, and duration all use Druid level − 2.",
}];

tongue.progressionProfiles = [{
  id: "river-druid-universal-speech",
  label: "Tongue of the Sun and Moon",
  classId: "druid",
  columns: [{ id: "benefit", label: "Communication" }],
  steps: [{ level: 15, values: { benefit: "Speak with every living creature" } }],
  summary: "The universal living-creature communication permission is always active.",
}];

archetype.wildShapeLevelAdjustment = -2;
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Class skill and Ferrier bonuses, every water-adjacent half-level modifier, Countercurrent movement rules, Constitution-score breath duration, level − 2 Wild Shape uses/forms/duration, and universal living-creature speech are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated River Druid automation.");
