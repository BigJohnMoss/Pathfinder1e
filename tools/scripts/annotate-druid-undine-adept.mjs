import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-undine-adept.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const domains = find("Domains");
const amphibious = find("Amphibious");
const augment = find("Augment Summoning");
const resistance = find("Resist Water");
const wildShape = find("Wild Shape");
const commune = find("Commune with Water");
const legalDomains = ["domain-community", "subdomain-family", "subdomain-home", "domain-water", "subdomain-ice", "subdomain-oceans"];

Object.assign(domains, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "cleric-domains",
  optionChoiceIds: legalDomains,
  requiredOptionId: "druid-nature-bond-domain",
  requiredOptionMessage: "Choose the Domain nature bond first",
  progressionKey: "undine-adept-domain"
});

amphibious.progressionProfiles = [{
  id: "undine-adept-amphibious",
  label: "Amphibious",
  classId: "druid",
  columns: [{ id: "type", label: "Subtype" }, { id: "breathing", label: "Breathing" }],
  steps: [{ level: 2, values: { type: "Aquatic", breathing: "Air and water" } }],
  summary: "The aquatic subtype and amphibious universal monster ability are continuously active."
}];
amphibious.resourceActions = [{
  id: "undine-adept-track-amphibious",
  label: "Track Amphibious",
  classId: "druid",
  minimumLevel: 2,
  activeEffect: { name: "Undine Adept — Amphibious", targets: ["self"], bonus: 0, description: "Gain the aquatic subtype and breathe both water and air.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true },
  summary: "Record the permanent aquatic subtype and amphibious breathing benefit."
}];

augment.resourceActions = [{
  id: "undine-adept-augment-water-summon",
  label: "Track Augmented Water Summon",
  classId: "druid",
  minimumLevel: 3,
  confirmations: [
    { id: "summoning-spell", label: "Creature was summoned with summon monster or summon nature's ally", requiredForActivation: true },
    { id: "water-subtype", label: "Summoned creature has the water subtype", requiredForActivation: true }
  ],
  activeEffect: {
    name: "Undine Adept — Augment Summoning",
    targets: ["strength", "constitution"],
    bonus: 4,
    description: "The summoned water-subtype creature gains +4 Strength and +4 Constitution for the summon spell's duration.",
    defaultRoundsByLevel: Array.from({ length: 18 }, (_, index) => ({ level: index + 3, rounds: index + 3 })),
    replaceExisting: true
  },
  summary: "Apply both Augment Summoning ability bonuses for the normal 1-round-per-level summon duration."
}];

resistance.progressionProfiles = [{
  id: "undine-adept-resist-water-call",
  label: "Resist Water’s Call",
  classId: "druid",
  columns: [{ id: "bonus", label: "Save bonus" }, { id: "against", label: "Against" }],
  steps: [{ level: 4, values: { bonus: "+4", against: "Aquatic/water outsiders and fey; water-descriptor spells and effects" } }]
}];

wildShape.progressionProfiles = [{
  id: "undine-adept-wild-shape-level",
  label: "Undine Adept Wild Shape",
  classId: "druid",
  columns: [{ id: "aquatic", label: "Aquatic/water form" }, { id: "other", label: "Other legal form" }],
  steps: [{ level: 6, values: { aquatic: "Druid level + 1", other: "Druid level" } }]
}];
wildShape.resourceActions = [
  {
    id: "undine-adept-aquatic-wild-shape",
    label: "Use Aquatic Wild Shape",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 6, actionType: "standard" }],
    confirmations: [{ id: "aquatic-form", label: "Selected form has the aquatic or water subtype", requiredForActivation: true }],
    activeEffect: { name: "Undine Adept Aquatic Wild Shape", targets: ["self"], bonus: 0, description: "Assume the selected aquatic or water-subtype form using Druid level + 1 for Wild Shape effects.", defaultRoundsByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 6) * 600 })), replaceExisting: true },
    summary: "Spend one Wild Shape use and apply the +1 effective-level benefit."
  },
  {
    id: "undine-adept-other-wild-shape",
    label: "Use Other Wild Shape",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 6, actionType: "standard" }],
    confirmations: [{ id: "legal-form", label: "Selected form is legal for normal Wild Shape at the Undine Adept's Druid level", requiredForActivation: true }],
    activeEffect: { name: "Undine Adept Wild Shape", targets: ["self"], bonus: 0, description: "Assume the selected non-aquatic form using the Undine Adept's actual Druid level.", defaultRoundsByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 6) * 600 })), replaceExisting: true },
    summary: "Spend one Wild Shape use at normal effective level."
  }
];

commune.progressionProfiles = [{
  id: "undine-adept-commune",
  label: "Commune with Water Spirits",
  classId: "druid",
  columns: [{ id: "spell", label: "Added spell" }, { id: "level", label: "Druid spell level" }],
  steps: [{ level: 9, values: { spell: "Commune", level: "5th" } }],
  summary: "Commune is available whether the Undine Adept worships a deity or elemental forces."
}];

archetype.druidDomainIds = legalDomains;
archetype.spellListAdditions = { ...(archetype.spellListAdditions ?? {}), commune: 5 };
archetype.conditionalModifiers = [
  ...(archetype.conditionalModifiers ?? []).filter((entry) => entry.sourceFeatureId !== resistance.id),
  { sourceFeatureId: resistance.id, label: "Resist Water’s Call", condition: "Saving throws against spell-like or supernatural abilities of aquatic/water outsiders or fey, or against water-descriptor spells and effects", minimumLevel: 4, base: 4 }
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Legal domain and subdomain choices, permanent amphibious benefits, Augment Summoning for water creatures, the exact resistance condition, both normal and +1-effective-level aquatic Wild Shape paths, and the Commune spell-list addition are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Undine Adept automation.");
