import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-feyspeaker.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const replacement = archetype.replacements[0];
replacement.features = replacement.features.filter((feature) => !feature.id.startsWith("feyspeaker-generated-"));
const feyMagic = replacement.features.find((feature) => /^Fey Magic/.test(feature.name));
const wildMischief = replacement.features.find((feature) => /^Wild Mischief/.test(feature.name));

feyMagic.resourceActions = [{
  id: "feyspeaker-wild-shape",
  label: "Assume Feyspeaker Wild Shape",
  classId: "druid",
  minimumLevel: 6,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 6, actionType: "standard" }],
  modeLabel: "Non-elemental form",
  modes: [
    { id: "beast-shape-i", label: "Small or Medium animal", minimumLevel: 6, summary: "Use beast shape I." },
    { id: "beast-shape-ii", label: "Tiny or Large animal", minimumLevel: 8, summary: "Use beast shape II." },
    { id: "beast-shape-iii", label: "Diminutive or Huge animal", minimumLevel: 10, summary: "Use beast shape III." },
    { id: "plant-shape-i", label: "Small or Medium plant", minimumLevel: 10, summary: "Use plant shape I." },
    { id: "plant-shape-ii", label: "Tiny or Large plant", minimumLevel: 12, summary: "Use plant shape II." },
    { id: "plant-shape-iii", label: "Huge plant", minimumLevel: 14, summary: "Use plant shape III. Elemental forms are never available." }
  ],
  activeEffect: { name: "Feyspeaker Wild Shape", targets: ["self"], bonus: 0, description: "Use the selected legal non-elemental Wild Shape form for 1 hour per Druid level.", defaultRounds: 999, fixedRounds: true, replaceExisting: true },
  summary: "Spend one delayed Wild Shape use; elemental forms are excluded at every level.",
}];

for (const level of [4, 6, 8, 10, 12, 14, 16, 18]) {
  replacement.features.push({
    id: `feyspeaker-generated-fey-magic-${level}`,
    name: `Fey Magic Spell ${level / 2 - 1}`,
    level,
    type: "selectable",
    summary: `Permanently add one eligible Wizard enchantment or illusion spell to the Druid list at one spell level higher, up to Druid spell level ${level / 2}.`,
    choiceRequired: true,
    optionGroupId: "feyspeaker-fey-magic-spells",
    maximumSpellLevel: level / 2,
    progressionKey: "feyspeaker-fey-magic",
  });
}

wildMischief.resourceActions = [{
  id: "feyspeaker-wild-mischief",
  label: "Resolve Wild Mischief",
  classId: "druid",
  minimumLevel: 1,
  actionTypeByLevel: [{ level: 1, actionType: "1-minute" }],
  modeLabel: "Target",
  modes: [
    { id: "domestic-animal", label: "Domestic animal", summary: "No default circumstance penalty." },
    { id: "wild-animal", label: "Wild animal", summary: "Usually apply a −5 circumstance penalty." },
    { id: "magical-beast", label: "Intelligence 1–2 magical beast", summary: "Apply the required −4 penalty." }
  ],
  confirmations: [{ id: "mutual-study", label: "Feyspeaker and target can study each other within 30 feet", requiredForActivation: true }],
  diceRoll: { label: "Wild Mischief", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 20 }], modifierInputLabel: "Druid level + Charisma modifier + circumstance modifier", targetDcInputLabel: "Target Sense Motive DC", outcomesByMargin: [{ minimumMargin: 0, label: "deception succeeds" }], failureLabel: "deception fails" },
  summary: "Roll the Bluff-like check with the selected target category's circumstance modifier.",
}];

archetype.spellcastingAbility = "charisma";
archetype.wildShapeLevelAdjustment = -2;
archetype.proficiencyAdjustments = [{ sourceFeatureId: wildMischief.id, category: "armor", operation: "remove", proficiencies: ["Medium armor"] }];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Charisma spellcasting, half BAB, six skill ranks, class skills, medium-armor loss, eight unique catalogue-driven Fey Magic spell selections at +1 spell level, delayed non-elemental Wild Shape, and Wild Mischief checks are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Feyspeaker automation.");
