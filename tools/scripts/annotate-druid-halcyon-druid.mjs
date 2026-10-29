import { readFile, writeFile } from "node:fs/promises";
import spells from "../../generated/pf1e-spells.mjs";

const root = new URL("../../", import.meta.url);
const archetypeUrl = new URL("packages/data/src/archetypes/druid-halcyon-druid.json", root);
const optionUrl = new URL("packages/data/src/options/druid-halcyon-natural-arcana.json", root);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const mask = find("Bonded Mask");
const peacekeeper = find("Peacekeeper");
const casting = find("Spontaneous Casting");
const arcana = find("Natural Arcana");
const resist = find("Resist Fiendish Influence");
const embody = find("Embody Mask");
if (![mask, peacekeeper, casting, arcana, resist, embody].every(Boolean)) throw new Error("Halcyon Druid source features were not found");

const arcaneSpells = spells
  .map((spell) => ({ spell, level: Math.min(...[spell.levelByClass?.wizard, spell.levelByClass?.sorcerer].filter(Number.isInteger)) }))
  .filter(({ level }) => Number.isInteger(level) && level >= 0 && level <= 9)
  .sort((left, right) => left.level - right.level || left.spell.name.localeCompare(right.spell.name));
const arcanaOptions = arcaneSpells.map(({ spell, level }) => ({
  id: `halcyon-natural-arcana-${spell.id}`,
  name: `${spell.name} (${level === 0 ? "cantrip" : `level ${level}`})`,
  minimumLevel: level >= 9 ? 20 : Math.max(4, (level + 1) * 2),
  benefit: `Add ${spell.name} to the Halcyon Druid spell list as a level-${level} spell without preparing it automatically.`,
  spellId: spell.id,
  spellLevel: level,
  spellAccessOnly: true,
}));
await writeFile(optionUrl, `${JSON.stringify({
  id: "druid-halcyon-natural-arcana", name: "Halcyon Natural Arcana", classIds: ["druid"], uniqueAcrossSelections: true,
  optionDefaults: { groupId: "druid-halcyon-natural-arcana", classIds: ["druid"], minimumLevel: 4, prerequisites: [], source: archetype.source },
  options: arcanaOptions,
})}\n`);

const choiceLevels = [4, 6, 8, 10, 12, 14, 16, 18, 20];
const occurrences = choiceLevels.flatMap((level, levelIndex) => {
  const maximumSpellLevel = level === 20 ? 9 : Math.min(8, Math.floor(level / 2) - 1);
  return [0, 1].map((slot) => ({
    ...(levelIndex === 0 && slot === 0 ? arcana : {}),
    id: `druid-halcyon-natural-arcana-${level}-${slot + 1}`,
    name: `Natural Arcana ${levelIndex * 2 + slot + 1}`,
    level,
    type: "selectable",
    choiceRequired: true,
    optionGroupId: "druid-halcyon-natural-arcana",
    maximumSpellLevel,
    progressionKey: "halcyon-natural-arcana",
    summary: `Choose a unique Wizard/Sorcerer spell of level ${maximumSpellLevel} or lower and add it to the Druid spell list.`,
  }));
});
for (const replacement of archetype.replacements) {
  const rebuilt = [];
  for (const feature of replacement.features ?? []) {
    if (feature.id === arcana.id || feature.id.startsWith("druid-halcyon-natural-arcana-")) {
      if (!rebuilt.some((candidate) => candidate.id === occurrences[0].id)) rebuilt.push(...occurrences);
    } else rebuilt.push(feature);
  }
  replacement.features = rebuilt;
}

mask.resourceActions = [{
  id: "halcyon-bonded-mask-spell", label: "Cast through Bonded Mask", classId: "druid", minimumLevel: 1,
  resourceId: "halcyonBondedMask", cost: 1, actionTypeByLevel: [{ level: 1, actionType: "standard" }],
  confirmations: [
    { id: "mask-worn", label: "The bonded mask is worn in the head slot", requiredForActivation: true },
    { id: "legal-spell", label: "The selected Druid spell is a level you can cast", requiredForActivation: true },
  ],
  activeEffect: { name: "Bonded Mask Spell", targets: ["self"], bonus: 0, description: "The bonded mask supplied the selected unprepared Druid spell; the daily use is spent.", defaultRounds: 1, fixedRounds: true, replaceExisting: true },
  summary: "Track the bonded object's once-per-day unprepared Druid spell while enforcing that the mask is worn.",
}];

Object.assign(casting, {
  type: "selectable", choiceRequired: true, optionGroupId: "cleric-domains", optionChoiceIds: ["domain-good"], progressionKey: "halcyon-good-domain-casting",
  spellAutomation: { preparedOptionSpellConversion: { label: "Spontaneous Good Domain Casting", spellIdsByOption: {
    "domain-good": ["protection-from-evil", "later-spell-align-weapon", "magic-circle-against-evil", "holy-smite", "dispel-evil", "blade-barrier", "holy-word", "holy-aura", "summon-monster-ix"],
  } } },
});
casting.progressionProfiles = [{
  id: "halcyon-good-domain-casting", label: "Good Domain Spontaneous Casting", classId: "druid",
  columns: [{ id: "rule", label: "Conversion rule" }],
  steps: [{ level: 1, values: { rule: "Lose a prepared spell to cast a Good domain spell of the same or a lower level" } }],
  summary: "The spellbook exposes the exact Good domain conversion list and spends the lowest available legal prepared slot.",
}];

peacekeeper.progressionProfiles = [{
  id: "halcyon-peacekeeper", label: "Peacekeeper", classId: "druid", columns: [{ id: "bonus", label: "Diplomacy and Knowledge (local)" }],
  steps: Array.from({ length: 10 }, (_, index) => ({ level: index * 2 + 1, values: { bonus: `+${Math.max(1, Math.floor((index * 2 + 1) / 2))}` } })),
  summary: "The bonus is also included directly in both skill totals.",
}];

resist.resourceActions = [{
  id: "halcyon-resist-fiendish-influence", label: "Apply Resist Fiendish Influence", classId: "druid", minimumLevel: 4,
  confirmations: [{ id: "evil-source", label: "The save is against an evil outsider's spell-like/supernatural ability or an evil spell", requiredForActivation: true }],
  activeEffect: { name: "Resist Fiendish Influence", targets: ["savingThrows"], bonus: 4, description: "+4 on this qualifying saving throw.", defaultRounds: 1, fixedRounds: true, replaceExisting: true },
  summary: "Apply the exact +4 bonus to the qualifying save.",
}];

const sizeModes = [
  ["tiny", "Tiny celestial", [["strength", -2], ["dexterity", 8], ["armorClass", 3]]],
  ["small", "Small celestial", [["strength", -2], ["dexterity", 4], ["armorClass", 2]]],
  ["medium", "Medium celestial", [["strength", 4], ["armorClass", 4]]],
  ["large", "Large celestial", [["strength", 6], ["dexterity", -4], ["armorClass", 6]]],
].map(([id, label, adjustments]) => ({
  id, label, summary: `${label} under beast shape IV magical-beast adjustments.`,
  activeEffects: adjustments.map(([target, bonus]) => ({ target, bonus, label: `Embody Mask — ${label} ${target}`, description: `${bonus >= 0 ? "+" : ""}${bonus} size adjustment to ${target === "armorClass" ? "natural armor" : target}.` })),
}));
embody.resourceActions = [{
  id: "halcyon-embody-mask", label: "Embody Mask", classId: "druid", minimumLevel: 13,
  resourceId: "halcyonEmbodyMaskMinutes", variableCost: { label: "Minutes to use", minimum: 1, maximum: 20 },
  actionTypeByLevel: [{ level: 13, actionType: "standard" }], modeLabel: "Celestial form size", modes: sizeModes,
  confirmations: [
    { id: "mask-worn", label: "The bonded mask is worn", requiredForActivation: true },
    { id: "legal-celestial", label: "Selected form is a Tiny–Large agathion, angel, archon, or azata", requiredForActivation: true },
  ],
  activeEffect: {
    name: "Embody Mask", targets: ["self"], bonus: 0,
    description: "Assume the selected celestial form. Gain its legal beast shape IV movement, senses, and attacks plus aura of menace, protective aura, speak with animals, telepathy, and truespeech when present; gain +4 saves against conditions to which it is immune.",
    defaultRounds: 10, durationFromVariableCost: true, durationFromVariableCostMultiplier: 10, fixedRounds: true, replaceExisting: true,
  },
  summary: "Spend the selected number of one-minute increments and apply the exact size modifiers and duration.",
}];

const goodSpellLevels = {
  "protection-from-evil": 1, "later-spell-align-weapon": 2, "magic-circle-against-evil": 3, "holy-smite": 4,
  "dispel-evil": 5, "blade-barrier": 6, "holy-word": 7, "holy-aura": 8, "summon-monster-ix": 9,
};
delete archetype.spellListAdditions?.["align-weapon"];
archetype.spellListAdditions = { ...(archetype.spellListAdditions ?? {}), ...goodSpellLevels };
archetype.classSkillAdditions = ["Diplomacy", "Knowledge (arcana)", "Knowledge (dungeoneering)", "Knowledge (engineering)", "Knowledge (geography)", "Knowledge (history)", "Knowledge (local)", "Knowledge (nature)", "Knowledge (nobility)", "Knowledge (planes)", "Knowledge (religion)"];
archetype.skillBonusAdjustments = [
  { sourceFeatureId: peacekeeper.id, skill: "Diplomacy", minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 1 },
  { sourceFeatureId: peacekeeper.id, skill: "Knowledge (local)", minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 1 },
];
archetype.resourceAdjustments = [
  { resourceId: "halcyonBondedMask", label: "Bonded Mask", unit: "use", operation: "replace", minimumLevel: 1, base: 1, maximum: 1, minimum: 0, refreshCadence: "day", dedicatedAction: true },
  { resourceId: "halcyonEmbodyMaskMinutes", label: "Embody Mask", unit: "minute", operation: "replace", minimumLevel: 13, base: 0, levelMultiplier: 1, minimum: 13, maximum: 20, refreshCadence: "day", dedicatedAction: true },
];
archetype.conditionalModifiers = [{ sourceFeatureId: resist.id, label: "Resist Fiendish Influence", condition: "Saves against evil outsiders' spell-like or supernatural abilities and spells with the evil descriptor", minimumLevel: 4, base: 4 }];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = [
  "Bonded Mask daily casting, all class skills, exact Peacekeeper bonuses, Good domain spell-list access and prepared-slot conversion, eighteen unique level-legal Natural Arcana selections, Fiendish Influence saves, and level-sized Embody Mask minutes with celestial legality, size modifiers, and duration are automated.",
];
await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Halcyon Druid automation.");
