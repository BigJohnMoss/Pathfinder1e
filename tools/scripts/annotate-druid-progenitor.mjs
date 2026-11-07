import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-progenitor.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const infused = features.find((feature) => /^Infused Summoning/.test(feature.name));
const bond = features.find((feature) => /^Primal Bond/.test(feature.name));
const feyShape = features.find((feature) => /^Fey Shape/.test(feature.name));

infused.numericCalculations = [{
  id: "progenitor-infused-summoning-fast-healing",
  label: "Infused Summoning",
  inputLabel: "Wisdom modifier",
  inputMinimum: 0,
  inputMaximum: 20,
  inputDefault: 3,
  outputLabel: "Summoned creature fast healing",
  baseByLevel: [{ level: 1, value: 0 }],
  inputMultiplierByLevel: [{ level: 1, multiplier: 1 }],
  classId: "druid",
  maximumClassLevel: true,
  summary: "Fast healing equals Druid level, capped by the entered Wisdom modifier, whenever summon nature's ally creates a creature.",
}];

Object.assign(bond, { type: "selectable", choiceRequired: true, optionGroupId: "progenitor-primal-bonds", progressionKey: "druid-nature-bond" });
bond.numericCalculations = [{
  id: "progenitor-wild-magic-dc",
  label: "Wild Magic concentration DC",
  inputLabel: "Prepared spell level",
  inputMinimum: 0,
  inputMaximum: 9,
  inputDefault: 1,
  outputLabel: "Concentration DC",
  baseByLevel: [{ level: 5, value: 20 }],
  inputMultiplierByLevel: [{ level: 5, multiplier: 2 }],
  classId: "druid",
  summary: "Attempt this DC after the spell's effects begin. Success preserves the slot; failure expends it, replaces the spell with a same-CR wild magic effect, and staggers you until the end of your next turn.",
}];
bond.resourceActions = [
  {
    id: "progenitor-wild-magic",
    label: "Attempt Wild Magic casting",
    classId: "druid",
    minimumLevel: 5,
    requiredOptionId: "progenitor-primal-bond-magic",
    resourceId: "progenitorWildMagic",
    cost: 1,
    actionTypeByLevel: [{ level: 5, actionType: "swift" }],
    diceRoll: { label: "Concentration check", diceCountByLevel: [{ level: 5, count: 1 }], dieSidesByLevel: [{ level: 5, sides: 20 }], modifierInputLabel: "Concentration modifier", targetDcInputLabel: "20 + twice spell level", outcomesByMargin: [{ minimumMargin: 0, label: "spell resolves and slot is preserved" }], failureLabel: "slot expended; replace spell effect with same-CR wild magic and become staggered until next turn ends" },
    summary: "Spend one daily use and resolve whether the prepared spell slot is preserved.",
  },
  {
    id: "progenitor-mobile-undergrowth",
    label: "Create Mobile Undergrowth",
    classId: "druid",
    minimumLevel: 5,
    requiredOptionId: "progenitor-primal-bond-nature",
    resourceId: "progenitorUndergrowth",
    cost: 1,
    actionTypeByLevel: [{ level: 5, actionType: "full-round" }],
    modeLabel: "Undergrowth benefit",
    modes: [
      { id: "cover", label: "Cover for allies", summary: "Allies in the mobile radius gain cover; treat the area as forest terrain." },
      { id: "difficult-terrain", label: "Difficult terrain for enemies", summary: "Enemies entering the mobile radius treat it as difficult terrain; treat the area as plains terrain." }
    ],
    confirmations: [{ id: "solid-surface", label: "Standing on a solid surface when the growth appears next turn", requiredForActivation: true }],
    activeEffect: { name: "Progenitor Mobile Undergrowth", targets: ["area"], bonus: 0, description: "A mobile undergrowth radius centered on the Progenitor applies the selected cover or difficult-terrain mode for 3 + Wisdom modifier rounds. Radius is 10 feet at level 5, +5 feet every 5 levels.", defaultRounds: 3, durationAbilityModifier: "wisdom", fixedRounds: true, replaceExisting: true },
    summary: "Create the selected mobile undergrowth mode at the start of your next turn.",
  }
];

feyShape.resourceActions = [{
  id: "progenitor-fey-shape",
  label: "Assume Fey Shape",
  classId: "druid",
  minimumLevel: 6,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 6, actionType: "standard" }],
  modeLabel: "Fey form tier",
  modes: [
    { id: "fey-form-i", label: "Small or Medium fey", minimumLevel: 6, summary: "Use fey form I." },
    { id: "fey-form-ii", label: "Tiny or Large fey", minimumLevel: 8, summary: "Use fey form II." },
    { id: "fey-form-iii", label: "Diminutive or Huge fey", minimumLevel: 10, maximumLevel: 13, summary: "Use fey form III." },
    { id: "fey-form-iv", label: "Fey form IV", minimumLevel: 14, summary: "Use fey form IV; elemental forms remain unavailable." }
  ],
  activeEffect: { name: "Progenitor Fey Shape", targets: ["self"], bonus: 0, description: "Assume the selected legal fey form for 1 hour per Druid level. Elemental Wild Shape is never available.", defaultRounds: 999, fixedRounds: true, replaceExisting: true },
  summary: "Spend one Wild Shape use to assume an unlocked fey form.",
}];

archetype.resourceAdjustments = [
  { resourceId: "progenitorWildMagic", label: "Wild Magic", unit: "use", operation: "add", minimumLevel: 5, base: 2, perInterval: 1, interval: 5, maximum: 5, requiredOptionId: "progenitor-primal-bond-magic", refreshCadence: "day", dedicatedAction: true },
  { resourceId: "progenitorUndergrowth", label: "Mobile Undergrowth", unit: "use", operation: "add", minimumLevel: 5, base: 2, perInterval: 1, interval: 5, maximum: 5, requiredOptionId: "progenitor-primal-bond-nature", refreshCadence: "day", dedicatedAction: true }
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Infused Summoning fast healing, Primal Bond selection, choice-specific daily resources, Wild Magic DC/check outcomes, mobile undergrowth modes and scaling, and every Fey Shape tier are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Progenitor automation.");
