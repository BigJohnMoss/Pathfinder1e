import { readFile, writeFile } from "node:fs/promises";
import spells from "../../generated/pf1e-spells.mjs";

const root = new URL("../../", import.meta.url);
const archetypeUrl = new URL("packages/data/src/archetypes/druid-naga-aspirant.json", root);
const optionUrl = new URL("packages/data/src/options/druid-naga-aspirant-options.json", root);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const bond = find("Aspirant’s Bond");
const enlightenment = find("Aspirant’s Enlightenment");
const shape = find("Naga Shape");
const augmented = find("Augmented Form");
const trueNaga = find("True Naga");
if (![bond, enlightenment, shape, augmented, trueNaga].every(Boolean)) throw new Error("Naga Aspirant source features were not found");

const spellNames = [
  "Acid Splash", "Bleed", "Daze", "Mage Hand", "Open/Close", "Ray of Frost",
  "Charm Person", "Divine Favor", "Expeditious Retreat", "Mage Armor", "Magic Missile", "Ray of Enfeeblement", "Shield", "Shield of Faith", "Silent Image", "True Strike",
  "Acid Arrow", "Detect Thoughts", "Invisibility", "Mirror Image", "Scorching Ray", "See Invisibility",
  "Dispel Magic", "Displacement", "Fireball", "Lightning Bolt", "Suggestion",
  "Divine Power", "Invisibility, Greater",
];
const normalized = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
const listedSpellLevels = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4];
const selectedSpells = spellNames.map((name, index) => {
  const spell = spells.find((candidate) => normalized(candidate.name) === normalized(name));
  if (!spell) throw new Error(`Missing spell ${name}`);
  const spellLevel = listedSpellLevels[index];
  return { spell, spellLevel };
});
const spellOptions = selectedSpells.map(({ spell, spellLevel }) => ({
  id: `naga-aspirant-spell-${spell.id}`,
  name: spell.name,
  groupId: "druid-naga-aspirant-options",
  classIds: ["druid"],
  minimumLevel: 1,
  prerequisites: [],
  benefit: `Add ${spell.name} to the Naga Aspirant's Druid spell list as a ${spellLevel === 0 ? "cantrip" : `${spellLevel}${spellLevel === 1 ? "st" : spellLevel === 2 ? "nd" : spellLevel === 3 ? "rd" : "th"}-level spell`}. This grants spell-list access but does not prepare the spell automatically. ${spell.summary}`,
  spellId: spell.id,
  spellLevel,
  spellAccessOnly: true,
  source: spell.source,
}));

const augmentations = [
  ["charming-gaze", "Charming Gaze", "Gain a 30-foot gaze attack that functions as charm person."],
  ["darkvision", "Darkvision", "Gain darkvision 60 feet in naga form."],
  ["detect-thoughts", "Detect Thoughts", "Use detect thoughts at will in naga form."],
  ["guarded-thoughts", "Guarded Thoughts", "Gain +2 racial saves against charm and immunity to mind reading in naga form."],
  ["poison-immunity", "Poison Immunity", "Gain immunity to poison; requires a poison-based natural attack."],
  ["poisonous-sting", "Poisonous Sting", "Make an existing sting venomous; requires the Sting augmentation."],
  ["spit-venom", "Spit Venom", "Spit bite venom as a ranged touch attack to 30 feet; requires Venomous Bite."],
  ["sting", "Sting", "Grow a tail stinger that deals 1d6 piercing damage."],
  ["swim", "Swim", "Gain a swim speed equal to base land speed in naga form."],
  ["tough-scales", "Tough Scales", "Increase naga-form natural armor by +2; this choice can be selected repeatedly and stacks."],
  ["venomous-bite", "Venomous Bite", "The naga-form bite delivers Constitution-damaging venom."],
].map(([id, name, benefit]) => ({
  id: `naga-aspirant-${id}`,
  name,
  groupId: "druid-naga-aspirant-options",
  classIds: ["druid"],
  minimumLevel: 9,
  prerequisites: [],
  requiredOptionIds: id === "poisonous-sting" ? ["naga-aspirant-sting"] : id === "spit-venom" ? ["naga-aspirant-venomous-bite"] : undefined,
  repeatable: id === "tough-scales" || undefined,
  selectionLimit: id === "tough-scales" ? 3 : undefined,
  benefit,
  source: archetype.source,
}));
await writeFile(optionUrl, `${JSON.stringify({ id: "druid-naga-aspirant-options", name: "Naga Aspirant Choices", classIds: ["druid"], uniqueAcrossSelections: false, options: [...spellOptions, ...augmentations], source: archetype.source }, null, 2)}\n`);

const spellIds = spellOptions.map((option) => option.id);
const bondOccurrences = Array.from({ length: 20 }, (_, index) => ({
  ...(index === 0 ? bond : {}),
  id: `druid-naga-aspirant-aspirants-bond-${index + 1}`,
  name: `Aspirant’s Bond ${index + 1}`,
  level: index + 1,
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-naga-aspirant-options",
  optionChoiceIds: spellIds,
  progressionKey: "naga-aspirant-bond",
  summary: `Choose the unique spell-list addition gained at Druid level ${index + 1}. The spell is added to the Druid list but is not automatically prepared.`,
}));
const augmentationIds = augmentations.map((option) => option.id);
const augmentationOccurrences = [9, 13, 17].map((level, index) => ({
  ...(index === 0 ? augmented : {}),
  id: `druid-naga-aspirant-augmented-form-${level}`,
  name: `Augmented Form ${index + 1}`,
  level,
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-naga-aspirant-options",
  optionChoiceIds: augmentationIds,
  progressionKey: "naga-aspirant-augmentations",
  summary: `Choose the permanent naga-form augmentation gained at level ${level}; duplicate choices are prevented except for Tough Scales, which may be selected up to three times.`,
}));
for (const replacement of archetype.replacements) {
  const rebuilt = [];
  for (const feature of replacement.features ?? []) {
    if (feature.id === bond.id || feature.id.startsWith("druid-naga-aspirant-aspirants-bond-")) {
      if (!rebuilt.some((candidate) => candidate.id === bondOccurrences[0].id)) rebuilt.push(...bondOccurrences);
    }
    else if (feature.id === augmented.id || feature.id.startsWith("druid-naga-aspirant-augmented-form-")) {
      if (!rebuilt.some((candidate) => candidate.id === augmentationOccurrences[0].id)) rebuilt.push(...augmentationOccurrences);
    }
    else rebuilt.push(feature);
  }
  replacement.features = rebuilt;
}

enlightenment.resourceActions = [{
  id: "naga-aspirant-enlightenment",
  label: "Apply Aspirant’s Enlightenment",
  classId: "druid",
  minimumLevel: 4,
  confirmations: [{ id: "naga-source", label: "The effect is a naga spell-like ability, supernatural ability, or poison", requiredForActivation: true }],
  activeEffect: { name: "Aspirant’s Enlightenment", targets: ["savingThrows"], bonus: 4, description: "+4 on the qualifying saving throw.", defaultRounds: 1, fixedRounds: true, replaceExisting: true },
  summary: "Apply the exact +4 bonus to a qualifying save against a naga ability or poison.",
}];

shape.resourceActions = [{
  id: "naga-aspirant-naga-shape",
  label: "Assume Naga Shape",
  classId: "druid",
  minimumLevel: 6,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 6, actionType: "standard" }],
  modes: [{ id: "naga-form", label: "True naga form", summary: "+1 size; +4 Strength and Constitution; -2 Dexterity; +2 natural armor; +10-foot land speed; bite 1d6; no limbs.", activeEffects: [
    { target: "strength", bonus: 4, label: "Naga Shape Strength", description: "+4 size bonus to Strength." },
    { target: "constitution", bonus: 4, label: "Naga Shape Constitution", description: "+4 size bonus to Constitution." },
    { target: "dexterity", bonus: -2, label: "Naga Shape Dexterity", description: "-2 size penalty to Dexterity." },
    { target: "armorClass", bonus: 2, label: "Naga Shape Natural Armor", description: "+2 enhancement to natural armor." },
    { target: "landSpeed", bonus: 10, label: "Naga Shape Speed", description: "+10-foot enhancement bonus to land speed." },
  ] }],
  activeEffect: { name: "Naga Shape", targets: ["self"], bonus: 0, description: "Large serpentine body; lose limbs and gain a 1d6 bite. Verbal-only spells remain castable; other components require an enabling feat or metamagic.", defaultRounds: 3600, defaultRoundsByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 6) * 600 })), fixedRounds: true, replaceExisting: true },
  summary: "Spend one Wild Shape use and apply the complete level-hours naga transformation.",
}, {
  id: "naga-aspirant-bite",
  label: "Roll Naga Bite",
  classId: "druid",
  minimumLevel: 6,
  requiredActiveEffectName: "Naga Shape",
  combatRoll: { attack: { kind: "melee", label: "Bite", abilityModifier: "strength" }, damage: { type: "piercing", diceCountByLevel: [{ level: 6, count: 1 }], dieSidesByLevel: [{ level: 6, sides: 6 }], abilityModifier: "strength" }, rangeByLevel: [{ level: 6, range: "melee" }] },
  summary: "Resolve the naga-form bite using the transformed Strength modifier.",
}];

augmentationOccurrences[0].resourceActions = [
  { id: "naga-aspirant-charming-gaze", label: "Use Charming Gaze", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-charming-gaze", actionTypeByLevel: [{ level: 9, actionType: "standard" }], savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "druid" }, targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 9, range: "30 feet" }], effectsByLevel: [{ level: 9, name: "Charmed", description: "The target is affected as charm person.", duration: { kind: "level-hours" } }] }, summary: "Resolve the 30-foot gaze with the calculated Charisma-based DC." },
  { id: "naga-aspirant-detect-thoughts", label: "Use Detect Thoughts", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-detect-thoughts", spellLikeAbility: { spellId: "detect-thoughts", spellName: "Detect Thoughts", cadence: "at-will" }, actionTypeByLevel: [{ level: 9, actionType: "standard" }], summary: "Use the selected at-will supernatural detect thoughts ability." },
  { id: "naga-aspirant-darkvision", label: "Apply Darkvision", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-darkvision", requiredActiveEffectName: "Naga Shape", activeEffect: { name: "Naga Augmentation — Darkvision", targets: ["self"], bonus: 0, description: "Darkvision 60 feet.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true }, summary: "Track darkvision while Naga Shape is active." },
  { id: "naga-aspirant-guarded-thoughts", label: "Apply Guarded Thoughts", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-guarded-thoughts", requiredActiveEffectName: "Naga Shape", activeEffect: { name: "Naga Augmentation — Guarded Thoughts", targets: ["savingThrows"], bonus: 2, description: "+2 racial bonus against charm and immunity to mind reading.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true }, summary: "Track the charm-save bonus and mind-reading immunity." },
  { id: "naga-aspirant-poison-immunity", label: "Apply Poison Immunity", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-poison-immunity", requiredActiveEffectName: "Naga Shape", confirmations: [{ id: "poison-attack", label: "Naga form has a poison-based natural attack", requiredForActivation: true }], activeEffect: { name: "Naga Augmentation — Poison Immunity", targets: ["self"], bonus: 0, description: "Immune to all poisons.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true }, summary: "Enforce the prerequisite and track poison immunity." },
  { id: "naga-aspirant-swim", label: "Apply Swim", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-swim", requiredActiveEffectName: "Naga Shape", activeEffect: { name: "Naga Augmentation — Swim", targets: ["self"], bonus: 0, description: "Swim speed equals base land speed.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true }, summary: "Track the naga form's swim speed." },
  { id: "naga-aspirant-tough-scales", label: "Apply Tough Scales", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-tough-scales", requiredActiveEffectName: "Naga Shape", modes: [1, 2, 3].map((count) => ({ id: `tough-scales-${count}`, label: `${count} selection${count === 1 ? "" : "s"}: +${count * 2} AC`, summary: `Apply ${count} selected Tough Scales augmentation${count === 1 ? "" : "s"}.`, activeEffects: [{ target: "armorClass", bonus: count * 2, label: "Tough Scales", description: `Natural armor increases by +${count * 2}.` }] })), activeEffect: { name: "Naga Augmentation — Tough Scales", targets: ["self"], bonus: 0, description: "Track the chosen number of repeatable Tough Scales selections.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true }, summary: "Choose the mode matching the number of Tough Scales selections." },
  { id: "naga-aspirant-sting", label: "Roll Naga Sting", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-sting", requiredActiveEffectName: "Naga Shape", combatRoll: { attack: { kind: "melee", label: "Sting", abilityModifier: "strength" }, damage: { type: "piercing", diceCountByLevel: [{ level: 9, count: 1 }], dieSidesByLevel: [{ level: 9, sides: 6 }], abilityModifier: "strength" }, rangeByLevel: [{ level: 9, range: "melee" }] }, summary: "Resolve the selected 1d6 sting natural attack." },
  { id: "naga-aspirant-poisonous-sting", label: "Roll Poisonous Sting", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-poisonous-sting", requiredActiveEffectName: "Naga Shape", savingThrow: { label: "Fortitude", ability: "constitution", base: 10, levelDivisor: 2, classId: "druid" }, combatRoll: { attack: { kind: "melee", label: "Poisonous Sting", abilityModifier: "strength" }, damage: { type: "piercing", diceCountByLevel: [{ level: 9, count: 1 }], dieSidesByLevel: [{ level: 9, sides: 6 }], abilityModifier: "strength" }, rangeByLevel: [{ level: 9, range: "melee" }], targetSave: { modifier: "fortitude", outcome: "negates-riders" }, riders: [{ name: "Naga Sting Poison — Sleep", description: "Sleep for 2d4 minutes; cure 1 save.", duration: { kind: "dice-rounds", count: 20, sides: 4 } }] }, summary: "Roll sting damage and resolve the Constitution-based poison DC." },
  { id: "naga-aspirant-venomous-bite", label: "Roll Venomous Bite", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-venomous-bite", requiredActiveEffectName: "Naga Shape", savingThrow: { label: "Fortitude", ability: "constitution", base: 10, levelDivisor: 2, classId: "druid" }, combatRoll: { attack: { kind: "melee", label: "Venomous Bite", abilityModifier: "strength" }, damage: { type: "piercing", diceCountByLevel: [{ level: 9, count: 1 }], dieSidesByLevel: [{ level: 9, sides: 6 }], abilityModifier: "strength" }, rangeByLevel: [{ level: 9, range: "melee" }], targetSave: { modifier: "fortitude", outcome: "negates-riders" }, riders: [{ name: "Naga Bite Poison", description: "1 Constitution damage each round for 6 rounds; cure 1 save.", duration: { kind: "fixed-rounds", rounds: 6 } }] }, summary: "Roll bite damage and resolve the Constitution-based poison DC." },
  { id: "naga-aspirant-spit-venom", label: "Spit Venom", classId: "druid", minimumLevel: 9, requiredOptionId: "naga-aspirant-spit-venom", requiredActiveEffectName: "Naga Shape", actionTypeByLevel: [{ level: 9, actionType: "standard" }], savingThrow: { label: "Fortitude", ability: "constitution", base: 10, levelDivisor: 2, classId: "druid" }, diceRoll: { label: "Ranged touch attack (30 feet, no increment)", diceCountByLevel: [{ level: 9, count: 1 }], dieSidesByLevel: [{ level: 9, sides: 20 }], abilityModifier: "dexterity", modifierInputLabel: "BAB and other attack modifiers", targetDcInputLabel: "Target touch AC", outcomesByMargin: [{ minimumMargin: 0, label: "Hit — target attempts the displayed Fortitude save; failure applies bite venom for 6 rounds" }], failureLabel: "Miss" }, summary: "Resolve the 30-foot ranged touch attack, then the calculated Constitution-based bite-venom save (1 Constitution damage/round for 6 rounds; cure 1 save)." },
];

trueNaga.resourceActions = [{ id: "naga-aspirant-original-form", label: "Change between true naga and original nagaji form", classId: "druid", minimumLevel: 20, actionTypeByLevel: [{ level: 20, actionType: "standard" }], modes: [{ id: "true-naga", label: "True naga", summary: "Natural naga form; creature type aberration." }, { id: "original-nagaji", label: "Original nagaji", summary: "Assume the original nagaji appearance at will; creature type remains aberration." }], activeEffect: { name: "True Naga Form", targets: ["self"], bonus: 0, description: "Permanent aberration type; selected body is the current at-will form.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true }, summary: "Track the capstone's permanent type and freely selected body." }];

archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Twenty unique spell-list additions, Naga Enlightenment, level-hours Naga Shape and its complete modifiers, three permanent augmentation choices with prerequisites/repeatability, augmentation actions and calculated poison/gaze DCs, and True Naga form switching are automated. Nagaji ancestry eligibility remains explicitly identified until that ancestry enters the catalogue."];
await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Naga Aspirant automation.");
