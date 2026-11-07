import { readFile, writeFile } from "node:fs/promises";

const archetypeUrl = new URL("../../packages/data/src/archetypes/druid-supernaturalist.json", import.meta.url);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const botanist = features.find((feature) => /^Eldritch Botanist/.test(feature.name));
const scholar = features.find((feature) => /^Paranormal Scholar/.test(feature.name));
const spirit = features.find((feature) => /^Animal Spirit/.test(feature.name));
if (!botanist || !scholar || !spirit) throw new Error("Supernaturalist features were not found");

Object.assign(botanist, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  resourceActions: [{
    id: "supernaturalist-green-empathy",
    label: "Resolve Green Empathy",
    classId: "druid",
    minimumLevel: 1,
    actionTypeByLevel: [{ level: 1, actionType: "1-minute" }],
    modeLabel: "Target",
    modes: [
      { id: "green-empathy-plant", label: "Plant creature", summary: "Use the normal druid-level + Charisma modifier check." },
      { id: "green-empathy-animal", label: "Animal", summary: "Use the check with the required −4 penalty." },
    ],
    diceRoll: {
      label: "Green Empathy",
      diceCountByLevel: [{ level: 1, count: 1 }],
      dieSidesByLevel: [{ level: 1, sides: 20 }],
      modifierInputLabel: "Druid level + Charisma modifier (apply −4 for animals)",
      targetDcInputLabel: "Attitude DC",
      outcomesByMargin: [{ minimumMargin: 0, label: "attitude improves" }],
      failureLabel: "attitude unchanged",
    },
    summary: "Resolve Green Empathy within 30 feet when the plant-bond alternative is selected.",
  }],
});

Object.assign(scholar, {
  grantedFeatId: "psychic-sensitivity",
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "supernaturalist-psychic-spells",
  progressionKey: "supernaturalist-psychic-spell",
});
const replacement = archetype.replacements.find((item) => item.features?.includes(scholar));
replacement.features = replacement.features.filter((feature) => !/^druid-supernaturalist-paranormal-scholar-(?:6|9|12|15|18)$/.test(feature.id));
for (const level of [6, 9, 12, 15, 18]) replacement.features.push({
  id: `druid-supernaturalist-paranormal-scholar-${level}`,
  name: "Paranormal Scholar",
  level,
  type: "selectable",
  summary: "Select another spell from the psychic class spell list and add it to the druid spell list.",
  choiceRequired: true,
  optionGroupId: "supernaturalist-psychic-spells",
  progressionKey: "supernaturalist-psychic-spell",
});

spirit.progressionProfiles = [{
  id: "supernaturalist-animal-spirit-progression",
  label: "Animal Spirit",
  classId: "druid",
  columns: [{ id: "mediumLevel", label: "Effective medium level" }, { id: "spiritBonus", label: "Spirit bonus" }, { id: "surge", label: "Spirit surge" }, { id: "powers", label: "Spirit powers" }],
  steps: Array.from({ length: 17 }, (_, index) => {
    const level = index + 4;
    const mediumLevel = level - 3;
    const spiritBonus = Math.floor(mediumLevel / 4) + 1;
    const surge = mediumLevel >= 18 ? "1d10" : mediumLevel >= 10 ? "1d8" : "1d6";
    const powers = ["Totem Transformation", ...(mediumLevel >= 6 ? ["Pack Leader"] : []), ...(mediumLevel >= 11 ? ["Wildstrike"] : []), ...(mediumLevel >= 17 ? ["Wild Heart"] : [])].join(", ");
    return { level, values: { mediumLevel, spiritBonus, surge, powers } };
  }),
  summary: "Animal Spirit advances as a medium three levels lower than druid level.",
}];
spirit.resourceActions = [{
  id: "supernaturalist-spirit-surge",
  label: "Use Spirit Surge",
  classId: "druid",
  minimumLevel: 4,
  resourceId: "animalSpiritInfluence",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "immediate" }],
  diceRoll: {
    label: "Spirit Surge bonus",
    diceCountByLevel: [{ level: 4, count: 1 }],
    dieSidesByLevel: [{ level: 4, sides: 6 }, { level: 13, sides: 8 }],
    flatModifierByLevel: [{ level: 4, modifier: 0 }],
  },
  summary: "Gain 1 influence and roll the displayed surge die for a failed associated d20 roll (1d10 at druid 21 is outside this builder's level cap).",
}, {
  id: "supernaturalist-taboo-spirit-surge",
  label: "Use Taboo Spirit Surge",
  classId: "druid",
  minimumLevel: 5,
  resourceId: "animalSpiritFreeSurges",
  cost: 1,
  actionTypeByLevel: [{ level: 5, actionType: "immediate" }],
  confirmations: [{ id: "taboo-kept", label: "The selected animal-spirit taboo has not been broken", requiredForActivation: true }],
  diceRoll: {
    label: "Spirit Surge bonus",
    diceCountByLevel: [{ level: 5, count: 1 }],
    dieSidesByLevel: [{ level: 5, sides: 6 }, { level: 13, sides: 8 }],
    flatModifierByLevel: [{ level: 5, modifier: 0 }],
  },
  summary: "Spend one of the two taboo-granted surges without gaining influence.",
}, {
  id: "supernaturalist-animal-spirit-taboo",
  label: "Set Animal Spirit Taboo",
  classId: "druid",
  minimumLevel: 5,
  modeLabel: "Taboo",
  modes: [
    ["silence", "Do not speak except with animals and plants"],
    ["natural-weapons", "Do not wield manufactured weapons"],
    ["self-provision", "Eat only what you killed or harvested"],
  ].map(([id, label]) => ({ id: `animal-spirit-taboo-${id}`, label, summary: label, activeEffects: [{ target: "self", bonus: 0, label: `Animal Spirit Taboo — ${label}`, description: label }] })),
  actionTypeByLevel: [{ level: 5, actionType: "1-hour" }],
  activeEffect: { name: "Animal Spirit Taboo", targets: ["self"], bonus: 0, description: "Tracks the taboo accepted during the animal-spirit seance.", defaultRounds: 999, fixedRounds: true, replaceExisting: true },
  summary: "Choose the taboo accepted for the current animal-spirit seance.",
}, {
  id: "supernaturalist-totem-transformation",
  label: "Apply Totem Transformation",
  classId: "druid",
  minimumLevel: 4,
  modeLabel: "Ability possessed by animal spirit",
  modes: [
    ["bite", "Bite 1d6"], ["claws", "Two claws 1d4"], ["darkvision", "Darkvision"], ["speed", "Land speed +20 feet"],
    ["low-light", "Low-light vision"], ["scent", "Scent"], ["swim", "Swim 30 feet"],
  ].map(([id, label]) => ({ id: `animal-spirit-${id}`, label, summary: `Gain ${label} while this transformation is active.`, activeEffects: [{ target: id === "speed" ? "landSpeed" : "self", bonus: id === "speed" ? 20 : 0, label: `Totem Transformation — ${label}`, description: `Animal spirit grants ${label}.` }] })),
  actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  activeEffect: { name: "Totem Transformation", targets: ["self"], bonus: 0, description: "Tracks the selected lesser animal-spirit power.", defaultRounds: 999, fixedRounds: true, replaceExisting: true },
  summary: "Select an ability possessed by the animal called in the seance.",
}, {
  id: "supernaturalist-wildstrike",
  label: "Use Wildstrike",
  classId: "druid",
  minimumLevel: 14,
  resourceId: "animalSpiritInfluence",
  cost: 1,
  actionTypeByLevel: [{ level: 14, actionType: "swift" }],
  activeEffect: { name: "Wildstrike extra action", targets: ["allies"], bonus: 0, description: "An animal or plant within 30 feet that can see or hear the supernaturalist immediately takes one additional standard action.", defaultRounds: 1, fixedRounds: true },
  summary: "Gain 1 influence and grant one eligible animal or plant an immediate extra standard action.",
}, {
  id: "supernaturalist-wild-heart-summon",
  label: "Cast Summon Nature's Ally",
  classId: "druid",
  minimumLevel: 20,
  resourceId: "wildHeartSummon",
  cost: 1,
  actionTypeByLevel: [{ level: 20, actionType: "standard" }],
  confirmations: [{ id: "castable-tier", label: "Selected summon nature's ally spell is a tier this character can cast", requiredForActivation: true }],
  summary: "Cast one spontaneously available summon nature's ally spell without expending a spell slot.",
}];

archetype.classSkillAdditions = ["Diplomacy", "Knowledge (arcana)", "Sense Motive"];
archetype.proficiencyAdjustments = [{ sourceFeatureId: "druid-supernaturalist-weapon-and-armor-proficiency-1", category: "armor", operation: "remove", proficiencies: ["All armor"] }];
archetype.resourceAdjustments = [{ resourceId: "animalSpiritInfluence", label: "Animal Spirit Influence", unit: "point", operation: "add", minimumLevel: 4, base: 6, maximum: 6, refreshCadence: "day", dedicatedAction: true }, { resourceId: "animalSpiritFreeSurges", label: "Taboo Spirit Surges", unit: "surge", operation: "add", minimumLevel: 5, base: 2, maximum: 2, refreshCadence: "day", dedicatedAction: true }, { resourceId: "wildHeartSummon", label: "Wild Heart Summon", unit: "use", operation: "add", minimumLevel: 20, base: 1, maximum: 1, refreshCadence: "day", dedicatedAction: true }];
archetype.conditionalModifiers = [{ sourceFeatureId: spirit.id, label: "Animal Spirit Bonus", condition: "attack and damage rolls with natural weapons and skill checks relating to animals and plants", minimumLevel: 4, base: 1, bonusByLevel: [{ level: 4, bonus: 1 }, { level: 7, bonus: 2 }, { level: 11, bonus: 3 }, { level: 15, bonus: 4 }, { level: 19, bonus: 5 }] }, { sourceFeatureId: spirit.id, label: "Animal Spirit Influence Penalty", condition: "caster level checks and Charisma- and Intelligence-based ability and skill checks while the spirit has 3 or more influence", minimumLevel: 4, base: -1, bonusByLevel: [{ level: 4, bonus: -1 }, { level: 7, bonus: -2 }, { level: 11, bonus: -3 }, { level: 15, bonus: -4 }, { level: 19, bonus: -5 }] }, { sourceFeatureId: spirit.id, label: "Animal Spirit Seance Boon", condition: "natural armor bonus to Armor Class while channeling the animal spirit", minimumLevel: 4, base: 1 }, { sourceFeatureId: spirit.id, label: "Pack Leader", condition: "attack rolls, damage rolls, and saving throws for summoned animals matching the animal spirit", minimumLevel: 9, base: 2 }, { sourceFeatureId: spirit.id, label: "Wild Heart", condition: "saving throws against enchantment and mind-affecting effects", minimumLevel: 20, base: 4 }];
archetype.mechanicalCoverage = "partial";
archetype.mechanicalNotes = ["Armor loss, Psychic Sensitivity, class skills, six unique Psychic-list spell additions, Green Empathy, effective medium progression, influence, taboo surges, spirit surge, totem choices, Pack Leader, Wildstrike, Wild Heart defenses, and the daily slot-free summon are automated.", "Plant Bond still depends on the incomplete Treesinger plant-domain and plant-companion catalogue, so this archetype remains partial rather than being overstated as fully automated."];

await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Supernaturalist automation.");
