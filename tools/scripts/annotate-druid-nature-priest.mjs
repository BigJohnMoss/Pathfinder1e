import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-nature-priest.json", import.meta.url);
const domainsUrl = new URL("../../packages/data/src/options/cleric-domains.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const domains = JSON.parse(await readFile(domainsUrl, "utf8"));
const replacement = archetype.replacements[0];
const features = replacement.features;
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const faithful = find("Faithful");
const weapon = find("Weapon Proficiencies");
const bond = find("Chosen Druid");
const studious = find("Studious Piety");
const shepherd = find("Shepherd of the Faithful");
const servants = find("Divine Servants");

const faithfulIndex = features.indexOf(faithful);
features.splice(faithfulIndex, 1,
  { ...faithful, id: "nature-priest-deity-1", name: "Faithful Deity", type: "selectable", choiceRequired: true, optionGroupId: "cleric-deities", summary: "Choose the deity worshiped by the Nature Priest." },
  { ...faithful, id: "nature-priest-alignment-1", name: "Faithful Alignment", type: "selectable", choiceRequired: true, optionGroupId: "cleric-alignments", summary: "Choose an alignment within one step of the selected deity." }
);

Object.assign(weapon, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "nature-priest-favored-weapons",
  optionChoiceIds: ["nature-priest-favored-weapon"],
  progressionKey: "nature-priest-favored-weapon"
});

const bondIndex = features.indexOf(bond);
features.splice(bondIndex, 1,
  { ...bond, id: "druid-nature-bond-1", name: "Nature Bond", type: "selectable", choiceRequired: true, optionGroupId: "druid-nature-bonds", progressionKey: "druid-nature-bond", summary: "Choose an animal companion or a domain. A selected domain must be granted by the Nature Priest's deity." },
  { ...bond, id: "druid-domain-1", name: "Deity Domain", type: "selectable", choiceRequired: true, optionGroupId: "cleric-domains", requiredOptionId: "druid-nature-bond-domain", requiredOptionMessage: "Choose the Domain nature bond first", progressionKey: "druid-domain", summary: "Choose one domain granted by the selected deity." }
);

studious.progressionProfiles = [{
  id: "nature-priest-studious-piety",
  label: "Studious Piety",
  classId: "druid",
  columns: [{ id: "religion", label: "Knowledge (religion)" }, { id: "faith", label: "Checks about deity or faith" }],
  steps: [{ level: 1, values: { religion: "+1", faith: "+2 total" } }]
}];
shepherd.resourceActions = [{
  id: "nature-priest-shepherd-hazards",
  label: "Track Shepherd of the Faithful",
  classId: "druid",
  minimumLevel: 4,
  confirmations: [{ id: "natural-hazard", label: "The check or save concerns a natural hazard, difficult terrain, or rough wind or water—not a creature, spell, or item", requiredForActivation: true }],
  activeEffect: { name: "Shepherd of the Faithful", targets: ["allies"], bonus: 0, description: "Self and allies within 60 feet who can see or hear the Nature Priest gain +2 insight on qualifying checks and saves.", defaultRounds: 1, replaceExisting: true },
  summary: "Track the conditional 60-foot aura for a qualifying natural hazard."
}];
servants.numericCalculations = [{
  id: "nature-priest-planar-ally-payment",
  label: "Divine Servants payment",
  inputLabel: "Normal negotiated payment (gp)",
  inputMinimum: 0,
  inputMaximum: 999999,
  inputDefault: 0,
  outputLabel: "Nature Priest payment (gp)",
  baseByLevel: [{ level: 9, value: 0 }],
  outputDivisor: 2,
  classId: "druid",
  summary: "The result is half the normal payment, rounded down if necessary."
}];
servants.progressionProfiles = [{
  id: "nature-priest-divine-servants",
  label: "Divine Servants",
  classId: "druid",
  columns: [{ id: "spell", label: "Added spell" }, { id: "payment", label: "Payment" }],
  steps: [
    { level: 9, values: { spell: "Lesser planar ally (4th)", payment: "Half normal" } },
    { level: 11, values: { spell: "Planar ally (6th)", payment: "Half normal" } },
    { level: 15, values: { spell: "Greater planar ally (8th)", payment: "Half normal" } }
  ]
}];

archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal", "druid-nature-bond-domain"];
archetype.druidDomainIds = domains.options.map((domain) => domain.id);
archetype.skillBonusAdjustments = [{ sourceFeatureId: studious.id, skill: "Knowledge (religion)", minimumLevel: 1, base: 1, condition: "+2 total when the check concerns the Nature Priest's deity or faith" }];
archetype.conditionalModifiers = [
  { sourceFeatureId: shepherd.id, label: "Shepherd of the Faithful — checks", condition: "Self and allies within 60 feet that can see or hear the Nature Priest: skill checks to notice or avoid natural hazards, difficult terrain, or rough wind or water", minimumLevel: 4, base: 2 },
  { sourceFeatureId: shepherd.id, label: "Shepherd of the Faithful — saves", condition: "Self and allies within 60 feet that can see or hear the Nature Priest: saving throws against natural hazards", minimumLevel: 4, base: 2 }
];
archetype.spellListAdditions = { "planar-ally-lesser": 4, "planar-ally": 6, "later-spell-planar-ally-greater": 8 };
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Deity and one-step alignment legality, custom favored-weapon proficiency, animal-or-deity-domain Nature Bond, deity-filtered domain choices and slots, class skills, Studious Piety, both Shepherd hazard bonuses, all three planar ally additions, and exact half-payment calculation are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Nature Priest automation.");
