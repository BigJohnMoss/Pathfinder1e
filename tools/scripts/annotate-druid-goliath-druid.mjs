import { readFile, writeFile } from "node:fs/promises";

const archetypeUrl = new URL("../../packages/data/src/archetypes/druid-goliath-druid.json", import.meta.url);
const companionUrl = new URL("../../packages/data/src/options/ranger-animal-companions.json", import.meta.url);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const companionGroup = JSON.parse(await readFile(companionUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const languages = find("Bonus Languages");
const size = find("Primal Size");
const bond = find("Primal Bond");
const empathy = find("Primal Empathy");
const might = find("Face Nature");
const shape = find("Wild Shape");
const summons = find("Primal Summons");

if (!companionGroup.options.some((option) => option.id === "ranger-animal-companion-megafauna")) {
  companionGroup.options.push({
    id: "ranger-animal-companion-megafauna",
    groupId: "ranger-animal-companions",
    name: "Megafauna",
    classIds: ["druid"],
    minimumLevel: 1,
    prerequisites: [{ type: "class-level", classId: "druid", minimum: 1 }],
    benefit: "A selectable prehistoric mammal companion represented by the appropriate published megafauna profile.",
    powers: [{ name: "Starting Statistics", level: 1, summary: "Choose a legal megafauna companion profile; use its listed size, movement, attacks, senses, and advancement." }],
    source: archetype.source,
  });
}

languages.progressionProfiles = [{
  id: "goliath-druid-bonus-language",
  label: "Bonus Language",
  classId: "druid",
  columns: [{ id: "language", label: "Additional choice" }],
  steps: [{ level: 1, values: { language: "Giant" } }],
}];

size.spellAutomation = { preparedKeywordConversion: { label: "Primal Size", keyword: "enlarge person" } };
size.progressionProfiles = [{
  id: "goliath-druid-primal-size",
  label: "Primal Size",
  classId: "druid",
  columns: [{ id: "spell", label: "Added spell" }, { id: "conversion", label: "Prepared conversion" }],
  steps: [{ level: 1, values: { spell: "Enlarge person (self only; dinosaur or megafauna companion also legal)", conversion: "Lose a prepared spell of level 1 or higher" } }],
}];
size.resourceActions = [{
  id: "goliath-druid-primal-size-target",
  label: "Confirm Primal Size Target",
  classId: "druid",
  minimumLevel: 1,
  spellLikeAbility: { spellId: "enlarge-person", spellName: "Enlarge Person", cadence: "at-will", kind: "spell-equivalent" },
  modeLabel: "Target",
  modes: [
    { id: "self", label: "Self", summary: "The normal legal target for Primal Size." },
    { id: "companion", label: "Dinosaur or megafauna companion", summary: "The companion is treated as a legal target despite not being humanoid." },
  ],
  confirmations: [{ id: "prepared-slot", label: "A prepared Druid spell of 1st level or higher is being expended", requiredForActivation: true }],
  summary: "Use the spellbook's Primal Size conversion control to spend the prepared slot, then confirm the archetype's legal target.",
}];

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  optionChoiceIds: ["druid-nature-bond-animal", "druid-nature-bond-domain"],
  progressionKey: "druid-nature-bond",
});

empathy.resourceActions = [{
  id: "goliath-druid-primal-empathy",
  label: "Roll Primal Empathy",
  classId: "druid",
  minimumLevel: 1,
  confirmations: [{ id: "large-creature", label: "Target creature is Large or larger", requiredForActivation: true }],
  diceRoll: {
    label: "Primal Empathy check",
    diceCountByLevel: [{ level: 1, count: 1 }],
    dieSidesByLevel: [{ level: 1, sides: 20 }],
    abilityModifier: "charisma",
    flatModifierByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, modifier: index + 1 })),
    targetDcInputLabel: "Target DC",
    outcomesByMargin: [{ minimumMargin: 0, label: "attitude improves" }],
    failureLabel: "attitude unchanged",
  },
  summary: "Roll 1d20 + Druid level + Charisma modifier against a Large-or-larger creature.",
}];

might.progressionProfiles = [{
  id: "goliath-druid-face-natures-might",
  label: "Face Nature’s Might",
  classId: "druid",
  columns: [{ id: "bonus", label: "Save bonus" }, { id: "condition", label: "Condition" }],
  steps: [{ level: 4, values: { bonus: "+4", condition: "Against spell-like and supernatural abilities of giants" } }],
}];

const duration = Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 6) * 600 }));
shape.progressionProfiles = [{
  id: "goliath-druid-wild-shape",
  label: "Goliath Wild Shape",
  classId: "druid",
  columns: [{ id: "animal", label: "Animal forms" }, { id: "giant", label: "Giant forms" }],
  steps: [
    { level: 6, values: { animal: "Dinosaur or megafauna only", giant: "Large giant; modified alter self" } },
    { level: 12, values: { animal: "Dinosaur or megafauna only", giant: "Giant form I" } },
    { level: 14, values: { animal: "Dinosaur or megafauna only", giant: "Large or Huge giant; giant form II" } },
  ],
  summary: "Elemental and plant forms never unlock for this archetype.",
}];
shape.resourceActions = [
  {
    id: "goliath-druid-primeval-shape",
    label: "Wild Shape into primeval animal",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 6, actionType: "standard" }],
    modeLabel: "Legal creature type",
    modes: [
      { id: "dinosaur", label: "Dinosaur", summary: "Use the normal animal-form tier permitted by Druid level." },
      { id: "megafauna", label: "Megafauna", summary: "Use the normal animal-form tier permitted by Druid level." },
    ],
    activeEffect: { name: "Goliath Primeval Shape", targets: ["self"], bonus: 0, description: "Assume the selected dinosaur or megafauna form for 1 hour per Druid level.", defaultRoundsByLevel: duration, replaceExisting: true },
    summary: "Spend one Wild Shape use; animal forms are restricted to dinosaurs and megafauna.",
  },
  {
    id: "goliath-druid-giant-shape",
    label: "Wild Shape into giant",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 6, actionType: "standard" }],
    modeLabel: "Giant form tier",
    modes: [
      { id: "large-giant", label: "Large giant (modified alter self)", minimumLevel: 6, maximumLevel: 11, summary: "+4 size Strength, −2 Dexterity, +1 natural armor.", activeEffects: [
        { target: "strength", bonus: 4, label: "Goliath Giant Shape — Strength", description: "+4 size bonus to Strength." },
        { target: "dexterity", bonus: -2, label: "Goliath Giant Shape — Dexterity", description: "−2 size penalty to Dexterity." },
        { target: "armorClass", bonus: 1, label: "Goliath Giant Shape — natural armor", description: "+1 natural armor bonus." },
      ] },
      { id: "giant-form-i", label: "Giant form I", minimumLevel: 12, maximumLevel: 13, summary: "Resolve the selected Large giant with giant form I." },
      { id: "giant-form-ii", label: "Giant form II (Large or Huge)", minimumLevel: 14, summary: "Resolve the selected Large or Huge giant with giant form II." },
    ],
    confirmations: [{ id: "legal-giant", label: "Selected form has the giant subtype and is legal for the chosen spell tier", requiredForActivation: true }],
    activeEffect: { name: "Goliath Giant Shape", targets: ["self"], bonus: 0, description: "Assume the selected giant form for 1 hour per Druid level; gain rock throwing if the form has it and aquatic/amphibious if it has the aquatic subtype.", defaultRoundsByLevel: duration, replaceExisting: true },
    summary: "Spend one Wild Shape use and apply the level-appropriate giant-form rules and inherited traits.",
  },
];

const summonOptions = [
  [1, "Compsognathus"], [3, "Dimorphodon"], [5, "Velociraptor"],
  [7, "Ogre or parasaurolophus"], [9, "Glyptodon or iguanodon"],
  [11, "Baluchitherium or megalania"], [13, "Cliff giant"],
  [15, "Spinosaurus"], [17, "Diplodocus"],
];
summons.progressionProfiles = [{
  id: "goliath-druid-primal-summons",
  label: "Primal Summons",
  classId: "druid",
  columns: [{ id: "creatures", label: "Added summon options" }],
  steps: summonOptions.map(([level, creatures], index) => ({ level, values: { creatures: `SNA ${index + 1}: ${creatures}` } })),
}];
summons.resourceActions = [{
  id: "goliath-druid-primal-summon",
  label: "Track Primal Summon",
  classId: "druid",
  minimumLevel: 1,
  modeLabel: "Added creature",
  modes: summonOptions.map(([minimumLevel, label], index) => ({ id: `sna-${index + 1}`, label: `SNA ${index + 1}: ${label}`, minimumLevel, summary: `Added legal option for summon nature's ally ${index + 1}.` })),
  confirmations: [{ id: "spell-cast", label: "The matching summon nature’s ally spell was cast", requiredForActivation: true }],
  activeEffect: { name: "Primal Summon", targets: ["allies"], bonus: 0, description: "Track the added summoned creature for the spell's normal round-per-level duration.", defaultRoundsByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, rounds: index + 1 })), replaceExisting: false },
  summary: "Choose the added creature and track its normal summon duration.",
}];

archetype.spellListAdditions = { ...(archetype.spellListAdditions ?? {}), "enlarge-person": 1 };
archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal", "druid-nature-bond-domain"];
archetype.druidAnimalCompanionIds = ["ranger-animal-companion-dinosaur", "ranger-animal-companion-megafauna"];
archetype.druidDomainIds = ["domain-animal", "domain-destruction", "domain-strength", "subdomain-ferocity", "subdomain-growth", "subdomain-rage"];
archetype.conditionalModifiers = [
  ...(archetype.conditionalModifiers ?? []).filter((entry) => entry.sourceFeatureId !== might.id),
  { sourceFeatureId: might.id, label: "Face Nature’s Might", condition: "Saving throws against spell-like and supernatural abilities of giants", minimumLevel: 4, base: 4 },
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Class skills and Giant language access, enlarge person spell access and prepared conversion, restricted domain/companion choices, Large-only Primal Empathy, the conditional giant-defense bonus, every legal primeval and giant Wild Shape tier, inherited giant traits, and all nine Primal Summons lists are automated."];

await Promise.all([
  writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`),
  writeFile(companionUrl, `${JSON.stringify(companionGroup, null, 2)}\n`),
]);
console.log("Annotated Goliath Druid automation and megafauna companion option.");
