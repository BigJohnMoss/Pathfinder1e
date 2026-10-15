import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-green-scourge.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const armaments = find("Nature’s Armaments");
const sense = find("Aberration Sense");
const scentless = find("Scentless");
const resist = find("Resist Unnatural");

const commonProperties = [
  { id: "aberration-bane", label: "Bane (aberrations)", priceModifier: 1, description: "+2 enhancement and +2d6 damage against aberrations." },
  { id: "frost", label: "Frost", priceModifier: 1, description: "Change flame blade's base damage to cold or add 1d6 cold damage to shillelagh.", incompatibleWith: ["shock"] },
  { id: "mighty-cleaving", label: "Mighty cleaving", priceModifier: 1, description: "Gain one additional Cleave attack per round when the wielder has Cleave." },
  { id: "returning", label: "Returning", priceModifier: 1, description: "A thrown weapon returns before the wielder's next turn." },
  { id: "shock", label: "Shock", priceModifier: 1, description: "Change flame blade's base damage to electricity or add 1d6 electricity damage to shillelagh.", incompatibleWith: ["frost"] },
  { id: "throwing", label: "Throwing", priceModifier: 1, description: "The melee weapon can be thrown with a 10-foot range increment." },
  { id: "vicious", label: "Vicious", priceModifier: 1, description: "+2d6 damage to the target and 1d6 damage to the wielder on a hit." },
];
armaments.spellAutomation = {
  preparedArmamentConversion: {
    label: "Nature’s Armaments",
    spells: [
      { spellId: "shillelagh", baseSpellLevel: 1, baseEnhancementBonus: 1, maximumEnhancementBonus: 5, properties: commonProperties },
      { spellId: "flame-blade", baseSpellLevel: 2, properties: commonProperties.map((property) => property.id === "throwing" ? { ...property, requires: ["returning"] } : property) },
    ],
  },
};
armaments.progressionProfiles = [{
  id: "green-scourge-natures-armaments",
  label: "Nature’s Armaments pricing",
  classId: "druid",
  columns: [{ id: "spell", label: "Base conversion" }, { id: "upgrades", label: "Upgrade cost" }],
  steps: [{ level: 1, values: { spell: "Shillelagh: 1st-level slot; flame blade: 2nd-level slot", upgrades: "Base spell level + 1 + added enhancement/property modifiers" } }],
  summary: "The spellbook enforces frost/shock exclusivity, returning before throwing on flame blade, and the maximum 9th-level prepared slot.",
}];

sense.progressionProfiles = [{
  id: "green-scourge-aberration-sense",
  label: "Aberration Sense",
  classId: "druid",
  columns: [{ id: "skill", label: "Class skill" }, { id: "bonus", label: "Bonus" }],
  steps: [{ level: 1, values: { skill: "Knowledge (dungeoneering)", bonus: "+2 untyped" } }],
}];

scentless.resourceActions = [{
  id: "green-scourge-scentless",
  label: "Set Scent State",
  classId: "druid",
  minimumLevel: 3,
  modeLabel: "Scent state",
  modes: [
    { id: "suppressed", label: "Scent suppressed", summary: "Cannot be detected or tracked by scent or other smell-based special senses.", activeEffects: [{ target: "self", bonus: 0, label: "Scentless", description: "Cannot be detected or tracked by scent or other acute-smell special senses." }] },
    { id: "exuded", label: "Scent deliberately exuded", summary: "Temporarily allow the Green Scourge's scent to be detected." },
  ],
  summary: "Track whether the normally scentless Green Scourge is deliberately exuding a scent.",
}];

resist.progressionProfiles = [{
  id: "green-scourge-resist-unnatural-influence",
  label: "Resist Unnatural Influence",
  classId: "druid",
  columns: [{ id: "bonus", label: "Save bonus" }, { id: "against", label: "Against" }],
  steps: [{ level: 4, values: { bonus: "+4", against: "Aberration spell-like abilities, supernatural abilities, and poisons" } }],
}];

archetype.classSkillAdditions = [...new Set([...(archetype.classSkillAdditions ?? []), "Knowledge (dungeoneering)"])];
archetype.skillBonusAdjustments = [
  ...(archetype.skillBonusAdjustments ?? []).filter((entry) => entry.sourceFeatureId !== sense.id),
  { sourceFeatureId: sense.id, skill: "Knowledge (dungeoneering)", minimumLevel: 1, base: 2 },
];
delete archetype.skillAdjustments;
archetype.conditionalModifiers = [
  ...(archetype.conditionalModifiers ?? []).filter((entry) => entry.sourceFeatureId !== resist.id),
  { sourceFeatureId: resist.id, label: "Resist Unnatural Influence", condition: "Saving throws against aberrations' spell-like abilities, supernatural abilities, and poisons", minimumLevel: 4, base: 4 },
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Nature’s Armaments now spends the lowest legal prepared slot for either spell, calculates enhancement and property prices, and enforces incompatible and dependent properties. Aberration Sense, selectable scent suppression, and the conditional aberration-defense bonus are also automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Green Scourge automation.");
