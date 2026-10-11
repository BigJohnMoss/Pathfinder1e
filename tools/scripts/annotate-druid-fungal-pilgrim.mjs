import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-fungal-pilgrim.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const devotion = features.find((feature) => /^Devotion to Ascension/.test(feature.name));
const spores = features.find((feature) => /^Spore Spawning/.test(feature.name));
const companion = features.find((feature) => /^Fungal Companion/.test(feature.name));
const transformation = features.find((feature) => /^Mycological Transformation/.test(feature.name));

Object.assign(devotion, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  optionChoiceIds: ["druid-nature-bond-animal", "druid-nature-bond-domain"],
  progressionKey: "druid-nature-bond",
});
devotion.progressionProfiles = [{
  id: "fungal-pilgrim-bond-restriction",
  label: "Devotion to Ascension",
  classId: "druid",
  columns: [{ id: "bond", label: "Legal bond" }],
  steps: [{ level: 1, values: { bond: "Animal Companion, or Plant domain only" } }],
}];

spores.requiredOptionId = "druid-nature-bond-domain";
spores.requiredOptionMessage = "Select the Plant domain Nature Bond to use Spore Spawning.";
spores.resourceActions = [{
  id: "fungal-pilgrim-spore-spawning",
  label: "Infuse Fungal Summon",
  classId: "druid",
  minimumLevel: 4,
  requiredOptionId: "druid-nature-bond-domain",
  resourceId: "fungalSporeSpawning",
  cost: 1,
  confirmations: [{ id: "single-creature", label: "The summon nature's ally spell summons exactly one creature", requiredForActivation: true }],
  modeLabel: "Spell and creature-list tier",
  modes: [
    { id: "sna-2", label: "SNA II → SNA I creature", minimumLevel: 4, summary: "Cast summon nature's ally II and select one creature from the SNA I list." },
    { id: "sna-3", label: "SNA III → SNA II creature", minimumLevel: 5, summary: "Cast summon nature's ally III and select one creature from the SNA II list." },
    { id: "sna-4", label: "SNA IV → SNA III creature", minimumLevel: 7, summary: "Cast summon nature's ally IV and select one creature from the SNA III list." },
    { id: "sna-5", label: "SNA V → SNA IV creature", minimumLevel: 9, summary: "Cast summon nature's ally V and select one creature from the SNA IV list." },
    { id: "sna-6", label: "SNA VI → SNA V creature", minimumLevel: 11, summary: "Cast summon nature's ally VI and select one creature from the SNA V list." },
    { id: "sna-7", label: "SNA VII → SNA VI creature", minimumLevel: 13, summary: "Cast summon nature's ally VII and select one creature from the SNA VI list." },
    { id: "sna-8", label: "SNA VIII → SNA VII creature", minimumLevel: 15, summary: "Cast summon nature's ally VIII and select one creature from the SNA VII list." },
    { id: "sna-9", label: "SNA IX → SNA VIII creature", minimumLevel: 17, summary: "Cast summon nature's ally IX and select one creature from the SNA VIII list." },
  ],
  activeEffect: {
    name: "Fungal Creature Summon",
    targets: ["allies"],
    bonus: 0,
    description: "The single summoned creature has the fungal creature template, except it gains neither create spawn nor poison spore cloud and cannot be harvested for poison.",
    defaultRounds: 4,
    defaultRoundsByLevel: Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: index + 4 })),
    fixedRounds: true,
  },
  summary: "Spend a use, enforce the one-lower creature list, and track the exact round-per-level fungal summon duration.",
}];

companion.requiredOptionId = "druid-nature-bond-animal";
companion.requiredOptionMessage = "Select Animal Companion as Nature Bond to use Fungal Companion.";
companion.progressionProfiles = [{
  id: "fungal-pilgrim-companion-template",
  label: "Fungal Companion progression",
  classId: "druid",
  requiredOptionId: "druid-nature-bond-animal",
  columns: [{ id: "abilities", label: "Fungal-template abilities" }, { id: "excluded", label: "Excluded abilities" }],
  steps: [
    { level: 4, values: { abilities: "Fungal creature template", excluded: "Create spawn, poison spore cloud, poisonous blood" } },
    { level: 10, values: { abilities: "Add poisonous blood", excluded: "Create spawn, poison spore cloud" } },
    { level: 14, values: { abilities: "Add poison spore cloud", excluded: "Create spawn" } },
    { level: 20, values: { abilities: "Add create spawn; spawn obey the pilgrim and rot after 48 hours", excluded: "None" } },
  ],
  summary: "The companion retains normal animal-companion advancement while the fungal template unlocks exactly on schedule.",
}];

transformation.progressionProfiles = [{
  id: "fungal-pilgrim-transformation",
  label: "Mycological Transformation",
  classId: "druid",
  columns: [{ id: "traits", label: "Permanent traits" }],
  steps: [{ level: 15, values: { traits: "Plant immunities; light sensitivity; counts as plant for harmful effects; no normal food or sleep; fungal rejuvenation; meditation allowed during rejuvenation" } }],
}];

archetype.resourceAdjustments = [{ sourceFeatureId: spores.id, resourceId: "fungalSporeSpawning", label: "Spore Spawning", unit: "use", operation: "replace", minimumLevel: 4, base: 1, perInterval: 1, interval: 2, maximum: 8, atWillAtLevel: 20, requiredOptionId: "druid-nature-bond-domain", refreshCadence: "day", dedicatedAction: true }];
archetype.defenseAdjustments = ["mind-affecting effects", "paralysis", "poison", "polymorph", "sleep", "stunning"].map((qualifier) => ({ sourceFeatureId: transformation.id, kind: "immunity", label: `Plant immunity — ${qualifier}`, minimumLevel: 15, base: 0, qualifier }));
archetype.conditionalModifiers = [
  { sourceFeatureId: transformation.id, label: "Light sensitivity — attacks", condition: "Attack rolls in bright sunlight or within daylight", minimumLevel: 15, base: -1 },
  { sourceFeatureId: transformation.id, label: "Light sensitivity — sight-based Perception", condition: "Sight-based Perception checks in bright sunlight or within daylight", minimumLevel: 15, base: -1 },
];
archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal", "druid-nature-bond-domain"];
archetype.druidDomainIds = ["domain-plant"];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Nature Bond restrictions, option-dependent replacement of Wild Shape, all Spore Spawning uses and summon tiers, every Fungal Companion template milestone, plant immunities, light sensitivity, plant typing, and rejuvenation are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Fungal Pilgrim automation.");
