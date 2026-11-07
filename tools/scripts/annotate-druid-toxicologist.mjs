import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-toxicologist.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const replacement = archetype.replacements[0];
const features = replacement.features;
const repertoire = features.find((feature) => /^Expanded Repertoire/.test(feature.name));
const lore = features.find((feature) => /^Natural Poison Lore/.test(feature.name));
const expert = features.find((feature) => /^Expert Poisoner/.test(feature.name));
const toxic = features.find((feature) => /^Toxic Shaper/.test(feature.name));

repertoire.spellAutomation = {
  preparedKeywordConversion: {
    label: "Prepared Summoning",
    keyword: "summon",
    requiresTargetPrepared: true,
  },
};
repertoire.progressionProfiles = [{
  id: "toxicologist-expanded-repertoire",
  label: "Expanded Repertoire",
  classId: "druid",
  columns: [{ id: "spells", label: "Added Druid spells" }],
  steps: [
    { level: 1, values: { spells: "Poisoned Egg (1st); Transmute Potion to Poison (2nd); Stinking Cloud (3rd); Toxic Gift (4th); Cloudkill (5th)" } },
  ],
  summary: "All five spells are in the Druid catalogue at their published levels. Spontaneous conversion is restricted to summoning spells that were prepared ahead of time.",
}];

lore.progressionProfiles = [{
  id: "toxicologist-safe-poison-application",
  label: "Natural Poison Lore",
  classId: "druid",
  columns: [{ id: "safeTargets", label: "Safe poison application" }],
  steps: [{ level: 2, values: { safeTargets: "Self when poisoning a weapon; animal companion or summoned creature when poisoning claws (never bites)" } }],
  summary: "The listed accidental-poisoning risks are removed automatically; the bite restriction remains explicit.",
}];

archetype.spellModifierAdjustments = [{
  sourceFeatureId: expert.id,
  label: "Expert Poisoner",
  target: "saveDc",
  minimumLevel: 4,
  base: 1,
  descriptors: ["poison"],
  condition: "Spells with the poison descriptor",
}];

const alteredWildShape = {
  id: "druid-toxicologist-altered-wild-shape-4",
  name: "Wild Shape (Altered)",
  level: 4,
  type: "archetype",
  summary: "A toxicologist retains animal wild shape, never unlocks elemental or plant forms, and adds vermin shape forms through Toxic Shaper at levels 8 and 10.",
  resourceActions: [{
    id: "toxicologist-wild-shape",
    label: "Assume Toxicologist Wild Shape",
    classId: "druid",
    minimumLevel: 4,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 4, actionType: "standard" }],
    modeLabel: "Legal form tier",
    modes: [
      { id: "animal-small-medium", label: "Small or Medium animal", minimumLevel: 4, summary: "Use beast shape I." },
      { id: "animal-large", label: "Large animal", minimumLevel: 6, summary: "Use beast shape II." },
      { id: "animal-tiny-huge", label: "Tiny or Huge animal", minimumLevel: 8, summary: "Use beast shape III." },
      { id: "vermin-small-medium", label: "Small or Medium vermin", minimumLevel: 8, summary: "Use vermin shape I." },
      { id: "vermin-tiny-large", label: "Tiny or Large vermin", minimumLevel: 10, summary: "Use vermin shape II." },
    ],
    activeEffect: {
      name: "Toxicologist Wild Shape",
      targets: ["self"],
      bonus: 0,
      description: "Assume the selected legal animal or vermin form. Elemental and plant forms are prohibited.",
      defaultRounds: 2400,
      defaultRoundsByLevel: Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * 600 })),
      fixedRounds: true,
      replaceExisting: true,
    },
    summary: "Spend one Wild Shape use; the legal tier and exact 1-hour-per-level duration are calculated automatically.",
  }],
};
if (!features.some((feature) => feature.id === alteredWildShape.id)) features.push(alteredWildShape);
toxic.progressionProfiles = [{
  id: "toxicologist-vermin-forms",
  label: "Toxic Shaper progression",
  classId: "druid",
  columns: [{ id: "vermin", label: "Vermin forms" }, { id: "prohibited", label: "Prohibited forms" }],
  steps: [
    { level: 8, values: { vermin: "Small or Medium via vermin shape I", prohibited: "Elemental and plant" } },
    { level: 10, values: { vermin: "Tiny, Small, Medium, or Large via vermin shape II", prohibited: "Elemental and plant" } },
  ],
  summary: "The Wild Shape control exposes only forms legal at the current Druid level.",
}];

archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["All five added spells, prepared-only summoning conversion, safe poison application rules, poison-descriptor save DC increase, retained animal Wild Shape, added vermin tiers, prohibited elemental/plant forms, and exact duration are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Toxicologist automation.");
