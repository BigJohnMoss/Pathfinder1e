import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-menhir-savant.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const spiritSense = features.find((feature) => /^Spirit Sense/.test(feature.name));
const placeMagic = features.find((feature) => /^Place Magic/.test(feature.name));
const walkLines = features.find((feature) => /^Walk the Lines/.test(feature.name));
const emptyBody = features.find((feature) => /^Empty Body/.test(feature.name));

spiritSense.resourceActions = [{
  id: "menhir-spirit-sense",
  label: "Begin Spirit Sense",
  classId: "druid",
  minimumLevel: 1,
  spellLikeAbility: { spellId: "detect-undead", spellName: "Spirit Sense", cadence: "at-will", kind: "spell-equivalent" },
  actionTypeByLevel: [{ level: 1, actionType: "standard" }],
  activeEffect: { name: "Spirit Sense", targets: ["self"], bonus: 0, description: "Detect undead, fey, outsiders, and astral, ethereal, or incorporeal creatures using the detect undead procedure.", defaultRounds: 10, replaceExisting: true },
  summary: "Track the concentration duration and the feature's complete expanded creature list.",
}];
spiritSense.progressionProfiles = [{
  id: "menhir-spirit-sense-targets",
  label: "Spirit Sense targets",
  classId: "druid",
  columns: [{ id: "creatures", label: "Detected creatures" }],
  steps: [{ level: 1, values: { creatures: "Undead; fey; outsiders; astral, ethereal, and incorporeal creatures" } }],
  summary: "All listed creature categories are detected simultaneously rather than selecting one category.",
}];

placeMagic.resourceActions = [{
  id: "menhir-place-magic",
  label: "Tap nearby ley line",
  classId: "druid",
  minimumLevel: 2,
  resourceId: "menhirPlaceMagic",
  cost: 1,
  actionTypeByLevel: [{ level: 2, actionType: "free" }],
  confirmations: [{ id: "ley-line", label: "A ley line is nearby", requiredForActivation: true }],
  activeEffect: { name: "Place Magic", targets: ["casterLevel"], bonus: 1, defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "+1 caster level for 1 round after tapping the nearby ley line." },
  summary: "Spend one of 3 + Wisdom modifier daily uses and apply the exact 1-round caster-level increase.",
}];

walkLines.resourceActions = [{
  id: "menhir-walk-the-lines",
  label: "Walk the Lines",
  classId: "druid",
  minimumLevel: 9,
  resourceId: "menhirWalkLines",
  cost: 1,
  actionTypeByLevel: [{ level: 9, actionType: "standard" }],
  spellLikeAbility: { spellId: "transport-via-plants", spellName: "Transport via Plants", cadence: "day", kind: "spell-like" },
  summary: "Spend one Wisdom-based daily use and cast transport via plants.",
}];

emptyBody.resourceActions = [{
  id: "menhir-empty-body",
  label: "Become ethereal",
  classId: "druid",
  minimumLevel: 13,
  resourceId: "menhirEmptyBodyRounds",
  variableCost: { label: "Rounds", minimum: 1, maximumLevelDivisor: 1 },
  actionTypeByLevel: [{ level: 13, actionType: "standard" }],
  spellLikeAbility: { spellId: "ethereal-jaunt", spellName: "Ethereal Jaunt", cadence: "day", kind: "spell-equivalent" },
  activeEffect: { name: "Empty Body", targets: ["self"], bonus: 0, description: "Become ethereal as ethereal jaunt for the selected number of rounds. The selected amount is deducted from the daily Druid-level pool.", defaultRounds: 1, durationFromVariableCost: true, replaceExisting: true },
  summary: "Choose and spend any legal number of rounds from the level-sized daily pool in one activation.",
}];

archetype.resourceAdjustments = [
  { sourceFeatureId: placeMagic.id, resourceId: "menhirPlaceMagic", label: "Place Magic", unit: "use", operation: "replace", minimumLevel: 2, base: 3, abilityModifier: "wisdom", minimum: 0, refreshCadence: "day", dedicatedAction: true },
  { sourceFeatureId: walkLines.id, resourceId: "menhirWalkLines", label: "Walk the Lines", unit: "use", operation: "replace", minimumLevel: 9, base: 0, abilityModifier: "wisdom", minimum: 0, refreshCadence: "day", dedicatedAction: true },
  { sourceFeatureId: emptyBody.id, resourceId: "menhirEmptyBodyRounds", label: "Empty Body", unit: "round", operation: "replace", minimumLevel: 13, base: 0, levelMultiplier: 1, maximum: 20, refreshCadence: "day", dedicatedAction: true },
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Spirit Sense's full detection list, Place Magic uses and caster-level effect, Wisdom-based Walk the Lines uses, and variable-cost Empty Body duration are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Menhir Savant automation.");
