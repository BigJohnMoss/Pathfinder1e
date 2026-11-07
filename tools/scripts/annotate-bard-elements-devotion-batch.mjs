import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (id) => {
  const url = new URL(`packages/data/src/archetypes/${id}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const feature = (record, id) => record.replacements.flatMap((replacement) => replacement.features ?? []).find((candidate) => candidate.id === id);
const replaceFeature = (record, id, next) => {
  for (const replacement of record.replacements) {
    const index = (replacement.features ?? []).findIndex((candidate) => candidate.id === id);
    if (index >= 0) {
      replacement.features = [...replacement.features.slice(0, index), ...next, ...replacement.features.slice(index + 1)];
      return;
    }
  }
  throw new Error(`${record.id}: ${id} was not found`);
};
const write = (url, value) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const bardSpeed = (minimumLevel = 1) => [
  { level: minimumLevel, actionType: minimumLevel >= 13 ? "swift" : minimumLevel >= 7 ? "move" : "standard" },
  ...(minimumLevel < 7 ? [{ level: 7, actionType: "move" }] : []),
  ...(minimumLevel < 13 ? [{ level: 13, actionType: "swift" }] : []),
];
const tracker = (name, targets, description, extra = {}) => ({ name, targets, bonus: 0, description, ...extra });
const spellEquivalent = (spellId, spellName) => ({ spellId, spellName, cadence: "at-will", kind: "spell-equivalent" });

const shadow = await load("bard-shadow-puppeteer");
const shadowPerformance = feature(shadow.value, "bard-shadow-puppeteer-bardic-performance-1");
if (!shadowPerformance) throw new Error("Shadow Puppeteer performance was not found");
shadowPerformance.resourceActions = [
  {
    id: "shadow-puppeteer-shadow-servant",
    label: "Begin Shadow Servant",
    minimumLevel: 1,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(1),
    spellLikeAbility: spellEquivalent("unseen-servant", "Unseen Servant"),
    activeEffect: tracker("Shadow Servant", ["self"], "A formless shadow functions as unseen servant at caster level equal to Bard level. The performance relies on visual components and shadow puppetry using Perform (act) with a light source.", { defaultRounds: 1, replaceExisting: true }),
    summary: "Spend one performance round per round to direct the level-scaled shadow servant.",
  },
  {
    id: "shadow-puppeteer-shadow-puppets",
    label: "Begin Shadow Puppets",
    minimumLevel: 1,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(1),
    spellLikeAbility: spellEquivalent("summon-monster-1", "Summon Monster"),
    savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" },
    modeLabel: "Summon tier",
    modes: [
      ["i", "Summon Monster I", 1, 3], ["ii", "Summon Monster II", 4, 6], ["iii", "Summon Monster III", 7, 9],
      ["iv", "Summon Monster IV", 10, 12], ["v", "Summon Monster V", 13, 15], ["vi", "Summon Monster VI", 16, 18], ["vii", "Summon Monster VII", 19, 20],
    ].map(([id, label, minimumLevel, maximumLevel]) => ({ id: `tier-${id}`, label, minimumLevel, maximumLevel, summary: `${label} list; the quasi-real creature is 20% real to a creature that succeeds at the displayed Will save.` })),
    activeEffect: tracker("Shadow Puppets", ["area"], "One selected quasi-real shadow creature is active. It follows shadow conjuration's 20% reality rules; objects automatically disbelieve. Replace this tracker when a new shadow puppet is created.", { defaultRounds: 1, replaceExisting: true }),
    summary: "Spend one performance round per round; the summon tier and disbelief DC are calculated from Bard level and Charisma.",
  },
];
shadow.value.mechanicalCoverage = "full";
shadow.value.mechanicalNotes = ["Shadow Servant and every level-gated Shadow Puppets summon tier have tracked performance costs, action speeds, caster-level guidance, disbelief DC, visual requirements, and replacement state."];

const water = await load("bard-watersinger");
const waterPerformance = feature(water.value, "bard-watersinger-bardic-performance-1");
if (!waterPerformance) throw new Error("Watersinger performance was not found");
const watersongSteps = [
  [1, 1, 0], [3, 1, 1], [5, 2, 1], [6, 2, 2], [9, 2, 3], [10, 3, 3], [12, 3, 4], [15, 4, 5], [18, 4, 6], [20, 5, 6],
];
waterPerformance.resourceActions = [
  {
    id: "watersinger-watersong",
    label: "Begin Watersong",
    minimumLevel: 1,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(1),
    modeLabel: "Current capacity",
    modes: watersongSteps.map(([level, cubes, hardness], index) => ({
      id: `level-${level}`,
      label: `Level ${level}+ · ${cubes} cube${cubes === 1 ? "" : "s"} · hardness ${hardness}`,
      minimumLevel: level,
      maximumLevel: watersongSteps[index + 1]?.[0] - 1,
      summary: `Manipulate ${cubes} adjacent 5-foot cube${cubes === 1 ? "" : "s"} of water with hardness ${hardness} and 3 hit points per inch of thickness.`,
    })),
    activeEffect: tracker("Watersong", ["area"], "The selected water volume can bend, rise, fall, sustain simple ice-carvable shapes, support weight, provide structures or cover, and remains slippery. It keeps its shape for 1 round after performance spending stops.", { defaultRounds: 1, replaceExisting: true }),
    summary: "Spend one performance round per round; capacity and hardness follow the exact level progression.",
  },
  {
    id: "watersinger-waterstrike",
    label: "Command Waterstrike",
    minimumLevel: 3,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(3),
    confirmations: [{ id: "watersong-active", label: "Watersong is currently manipulating the attacking water", requiredForActivation: true }],
    combatRoll: {
      attack: { kind: "melee", label: "Water slam", abilityModifier: "charisma" },
      attackCountByLevel: [{ level: 3, count: 1 }, { level: 8, count: 2 }, { level: 15, count: 3 }],
      iterativeAttackPenalty: 5,
      damage: {
        type: "bludgeoning",
        diceCountByLevel: [{ level: 3, count: 1 }, { level: 15, count: 2 }],
        dieSidesByLevel: [{ level: 3, sides: 6 }, { level: 10, sides: 8 }, { level: 15, sides: 6 }, { level: 20, sides: 8 }],
        abilityModifier: "charisma",
      },
      rangeByLevel: [{ level: 3, range: "from any manipulated water square; normal reach" }, { level: 10, range: "from any manipulated water square; 10-foot reach" }],
    },
    summary: "Spend one performance round; roll all BAB-granted iterative slam attacks with Charisma replacing the normal attack ability and add Charisma to damage.",
  },
  {
    id: "watersinger-lifewater-sicken",
    label: "Use Lifewater — Sicken",
    minimumLevel: 5,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: [{ level: 5, actionType: "standard" }],
    confirmations: [{ id: "fluid-target", label: "The target is within 30 feet, contains fluid, and is not immune to critical hits", requiredForActivation: true }],
    activeEffect: tracker("Lifewater — Sickened", ["enemy"], "The target is sickened by manipulation of its bodily fluids.", { durationDice: { count: 1, sides: 4 } }),
    summary: "Spend one performance round; the app rolls and tracks the exact 1d4-round sickened duration.",
  },
  {
    id: "watersinger-lifewater-reposition",
    label: "Use Lifewater — Reposition",
    minimumLevel: 5,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: [{ level: 5, actionType: "standard" }],
    confirmations: [{ id: "fluid-target", label: "The target is within 30 feet, contains fluid, and is not immune to critical hits", requiredForActivation: true }],
    diceRoll: {
      label: "Reposition combat maneuver",
      diceCountByLevel: [{ level: 5, count: 1 }],
      dieSidesByLevel: [{ level: 5, sides: 20 }],
      abilityModifier: "charisma",
      modifierInputLabel: "Base attack bonus",
      targetDcInputLabel: "Target CMD",
      outcomesByMargin: [{ minimumMargin: 0, label: "reposition succeeds" }],
      failureLabel: "reposition fails",
    },
    summary: "Spend one performance round and resolve BAB + Charisma against the target's CMD.",
  },
];
water.value.mechanicalCoverage = "full";
water.value.mechanicalNotes = ["Watersong capacity, hardness, shape persistence, Waterstrike attacks/reach/damage, both Lifewater modes, eligibility, costs, timing, and all water spell-list additions are automated."];

const yapper = await load("bard-dragon-yapper");
const yapperPerformance = feature(yapper.value, "bard-dragon-yapper-bardic-performance-5");
const yapperVersatile = feature(yapper.value, "bard-dragon-yapper-versatile-performance-ex-2");
if (!yapperPerformance || !yapperVersatile) throw new Error("Dragon Yapper features were not found");
yapperPerformance.level = 1;
yapperPerformance.resourceActions = [
  {
    id: "dragon-yapper-yapping-song",
    label: "Begin Yapping Song",
    minimumLevel: 1,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(1),
    activeEffect: {
      name: "Yapping Song",
      targets: ["attackRolls", "damageRolls", "savingThrows"],
      bonus: -1,
      bonusByLevel: [{ level: 1, bonus: -1 }, { level: 5, bonus: -2 }, { level: 11, bonus: -3 }, { level: 17, bonus: -4 }],
      applyToAllTargets: true,
      defaultRounds: 1,
      replaceExisting: true,
      description: "Enemies that hear the audible, non-language-dependent mind-affecting performance take this penalty on attack and damage rolls (damage remains at least 1) and on saves against fear and charm effects.",
    },
    summary: "Spend one performance round per round; the penalty increases automatically at levels 5, 11, and 17.",
  },
  {
    id: "dragon-yapper-frightful-song",
    label: "Resolve Frightful Song",
    minimumLevel: 8,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(8),
    savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" },
    targetEffectRoll: {
      modifier: "will",
      rangeByLevel: [{ level: 8, range: "30 feet; enemies that can hear" }],
      effectsByLevel: [{ level: 8, name: "Frightful Song — Shaken", description: "The enemy is shaken by this audible, mind-affecting fear effect while the performance continues.", duration: { kind: "fixed-rounds", rounds: 999 } }],
      successEffect: { name: "Frightful Song immunity", description: "Immune to this Dragon Yapper's Frightful Song for 24 hours.", rounds: 999 },
    },
    summary: "Spend one performance round per round and resolve the exact Will DC; success records 24-hour immunity.",
  },
];
Object.assign(yapperVersatile, { type: "selectable", choiceRequired: true, optionGroupId: "bard-versatile-performances", optionChoiceIds: ["bard-versatile-performance-sing"], progressionKey: "bard-versatile-performance" });
yapper.value.mechanicalCoverage = "full";
yapper.value.mechanicalNotes = ["The mandatory Perform (sing) versatile performance, level-scaled Yapping Song penalties, Frightful Song DC/range/condition, performance costs, and 24-hour immunity are automated."];

const faith = await load("bard-faith-singer");
const faithful = feature(faith.value, "bard-faith-singer-faithful-1");
const devout = feature(faith.value, "bard-faith-singer-devout-spell-knowledge-su-2");
if (!faithful && !feature(faith.value, "faith-singer-deity-1")) throw new Error("Faith Singer Faithful feature was not found");
if (!devout && !feature(faith.value, "faith-singer-domain-2")) throw new Error("Faith Singer Devout Spell Knowledge feature was not found");
if (faithful) replaceFeature(faith.value, faithful.id, [
  { ...faithful, id: "faith-singer-deity-1", name: "Faithful Deity", type: "selectable", choiceRequired: true, optionGroupId: "cleric-deities", summary: "Choose the deity worshiped by the Faith Singer." },
  { ...faithful, id: "faith-singer-alignment-1", name: "Faithful Alignment", type: "selectable", choiceRequired: true, optionGroupId: "cleric-alignments", summary: "Choose an alignment within one step of the selected deity." },
]);
if (devout) replaceFeature(faith.value, devout.id, [
  { ...devout, id: "faith-singer-domain-2", name: "Devout Domain", type: "selectable", choiceRequired: true, optionGroupId: "cleric-domains", summary: "Choose one domain granted by the selected deity." },
  ...[1, 2, 3, 4, 5].map((spellLevel, index) => ({
    id: `faith-singer-domain-spell-${spellLevel}`,
    name: `${spellLevel}${spellLevel === 1 ? "st" : spellLevel === 2 ? "nd" : spellLevel === 3 ? "rd" : "th"}-level Devout Domain Spell`,
    level: 2 + index * 4,
    type: "selectable",
    choiceRequired: true,
    optionGroupId: "cleric-domains",
    progressionKey: "faith-singer-devout-domain-spells",
    summary: `Select the ${spellLevel}${spellLevel === 1 ? "st" : spellLevel === 2 ? "nd" : spellLevel === 3 ? "rd" : "th"}-level spell from the chosen domain. Cast it once per day as a spell-like ability at Bard caster level while giving a bardic performance.`,
    uses: "once per day",
  })),
]);
feature(faith.value, "faith-singer-deity-1").optionGroupId = "cleric-deities";
feature(faith.value, "faith-singer-alignment-1").optionGroupId = "cleric-alignments";
feature(faith.value, "faith-singer-domain-2").optionGroupId = "cleric-domains";
for (const spellLevel of [1, 2, 3, 4, 5]) feature(faith.value, `faith-singer-domain-spell-${spellLevel}`).optionGroupId = "cleric-domains";
faith.value.mechanicalCoverage = "full";
faith.value.mechanicalNotes = ["Deity and one-step alignment legality, deity-granted domain filtering, all five level-gated domain spells, daily cast status, and Bard-level spell-like caster guidance are automated."];

const plant = await load("bard-plant-speaker");
const leshy = feature(plant.value, "bard-plant-speaker-bardic-performance-9");
const plantSpeech = feature(plant.value, "bard-plant-speaker-plant-speech-2");
const allegory = feature(plant.value, "bard-plant-speaker-mystical-allegory-su-5");
if (!leshy || !plantSpeech || !allegory) throw new Error("Plant Speaker features were not found");
leshy.resourceActions = [{
  id: "plant-speaker-leshy-speaker",
  label: "Perform Leshy Speaker",
  minimumLevel: 9,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 7,
  actionTypeByLevel: [{ level: 9, actionType: "10-minute" }],
  spellLikeAbility: spellEquivalent("commune-with-nature", "Commune with Nature"),
  summary: "Perform for 10 minutes, spend 7 performance rounds, and gain commune with nature at Bard caster level.",
}];
plantSpeech.progressionProfiles = [{
  id: "plant-speaker-plant-speech",
  label: "Plant Speech rules",
  classId: "bard",
  columns: [{ id: "mindAffecting", label: "Mind-affecting effects" }, { id: "communication", label: "Communication" }],
  steps: [{ level: 2, values: { mindAffecting: "Bard spells and class abilities affect plants and ignore their mind-affecting immunity", communication: "Racial plantspeech communicates with all plants" } }],
  summary: "These passive targeting and communication rules are always active from level 2.",
}];
allegory.resourceActions = [
  { id: "plant-speaker-augury", label: "Perform Mystical Allegory — Augury", minimumLevel: 5, classId: "bard", resourceId: "bardicPerformance", cost: 4, actionTypeByLevel: [{ level: 5, actionType: "1-minute" }], spellLikeAbility: spellEquivalent("augury", "Augury"), summary: "Perform for 1 minute and spend 4 performance rounds to gain augury." },
  { id: "plant-speaker-divination", label: "Perform Mystical Allegory — Divination", minimumLevel: 11, classId: "bard", resourceId: "bardicPerformance", cost: 7, actionTypeByLevel: [{ level: 11, actionType: "10-minute" }], spellLikeAbility: spellEquivalent("divination", "Divination"), summary: "Perform for 10 minutes and spend 7 performance rounds to gain divination." },
  { id: "plant-speaker-legend-lore", label: "Perform Mystical Allegory — Legend Lore", minimumLevel: 17, classId: "bard", resourceId: "bardicPerformance", cost: 10, actionTypeByLevel: [{ level: 17, actionType: "1-hour" }], spellLikeAbility: spellEquivalent("legend-lore", "Legend Lore"), summary: "Perform for 1 hour and spend 10 performance rounds to gain legend lore; its information is always vague and incomplete." },
];
plant.value.mechanicalCoverage = "full";
plant.value.mechanicalNotes = ["Plant immunity bypass and universal plantspeech are displayed as always-on rules; every Leshy Speaker and Mystical Allegory spell-equivalent effect has exact unlock level, performance cost, casting time, and caster-level guidance."];

for (const record of [shadow, water, yapper, faith, plant]) await write(record.url, record.value);
console.log("Annotated five elemental and devotional Bard archetypes with shared Faith Singer deity dependencies.");
