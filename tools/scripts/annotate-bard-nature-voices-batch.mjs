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
const spellEquivalent = (spellId, spellName, kind = "spell-equivalent") => ({ spellId, spellName, cadence: "at-will", kind });
const source = (url, title = "Archives of Nethys") => ({ title, page: null, url });
const choiceFeature = (base, id, name, level, optionGroupId, summary) => ({
  ...base, id, name, level, type: "selectable", choiceRequired: true, optionGroupId, summary,
});

const animalKindGroup = {
  id: "bard-animal-friend-kinds",
  name: "Animal Friend Kinds",
  classIds: ["bard"],
  source: source("https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Bard%20Animal%20Speaker"),
  optionDefaults: { groupId: "bard-animal-friend-kinds", classIds: ["bard"], minimumLevel: 1, prerequisites: [], source: source("https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Bard%20Animal%20Speaker") },
  options: [{
    id: "bard-animal-friend-kind",
    name: "Chosen animal kind",
    benefit: "Name a specific animal kind. Animal Friend, Nature's Speaker, and the +4 Handle Animal bonus apply to that kind.",
    repeatable: true,
    selectionLimit: 4,
    choice: { key: "animalKind", label: "Animal kind", allowCustom: true, uniqueAcrossSelections: true },
  }],
};
const firstNatureSpellGroup = {
  id: "bard-voice-nature-magic-first",
  name: "Voice of the Wild First Nature Spell",
  classIds: ["bard"],
  source: source("https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Bard%20Voice%20of%20the%20Wild"),
  optionDefaults: { groupId: "bard-voice-nature-magic-first", classIds: ["bard"], prerequisites: [] },
  options: [],
  generatedSpellOptions: { spellSources: [{ classId: "druid" }, { classId: "ranger" }], targetClassId: "bard", minimumSpellLevel: 1, maximumSpellLevel: 1 },
};
const natureSpellGroup = {
  id: "bard-voice-nature-magic",
  name: "Voice of the Wild Nature Magic",
  classIds: ["bard"],
  source: firstNatureSpellGroup.source,
  optionDefaults: { groupId: "bard-voice-nature-magic", classIds: ["bard"], prerequisites: [] },
  options: [],
  generatedSpellOptions: { spellSources: [{ classId: "druid" }, { classId: "ranger" }], targetClassId: "bard", maximumSpellLevel: 6 },
};

const animal = await load("bard-animal-speaker");
const animalFriend = feature(animal.value, "bard-animal-speaker-animal-friend-1") ?? feature(animal.value, "animal-speaker-kind-1");
const natureSpeaker = feature(animal.value, "bard-animal-speaker-nature-s-speaker-1") ?? feature(animal.value, "animal-speaker-nature-speaker-1");
const animalPerformance = feature(animal.value, "bard-animal-speaker-bardic-performance-3");
if (!animalFriend || !natureSpeaker || !animalPerformance) throw new Error("Animal Speaker source features were not found");
if (!feature(animal.value, "animal-speaker-kind-1")) replaceFeature(animal.value, animalFriend.id, [1, 5, 11, 17].map((level, index) => choiceFeature(
  animalFriend,
  `animal-speaker-kind-${level}`,
  `Animal Friend Kind ${index + 1}`,
  level,
  "bard-animal-friend-kinds",
  `Choose the ${index ? "additional " : "initial "}animal kind affected by Animal Friend and Nature's Speaker.`,
)));
const animalKindOne = feature(animal.value, "animal-speaker-kind-1");
if (!animalKindOne) throw new Error("Animal Speaker choice migration failed");
if (natureSpeaker.id === "bard-animal-speaker-nature-s-speaker-1") replaceFeature(animal.value, natureSpeaker.id, [{
  ...natureSpeaker,
  id: "animal-speaker-nature-speaker-1",
  resourceActions: [{
    id: "animal-speaker-speak-with-animals",
    label: "Speak with a Selected Animal Kind",
    minimumLevel: 1,
    classId: "bard",
    actionTypeByLevel: [{ level: 1, actionType: "standard" }],
    spellLikeAbility: spellEquivalent("speak-with-animals", "Speak with Animals"),
    confirmations: [{ id: "selected-kind", label: "The target belongs to one of the configured Animal Friend kinds", requiredForActivation: true }],
    summary: "At-will speak with animals, restricted to the configured animal kinds.",
  }],
}]);
animalPerformance.resourceActions = [
  {
    id: "animal-speaker-soothing-performance",
    label: "Resolve Soothing Performance",
    minimumLevel: 3,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(3),
    diceRoll: {
      label: "Perform-based Wild Empathy",
      diceCountByLevel: [{ level: 3, count: 1 }],
      dieSidesByLevel: [{ level: 3, sides: 20 }],
      modifierInputLabel: "Perform modifier + other Wild Empathy class levels",
      targetDcInputLabel: "Animal attitude DC",
      outcomesByMargin: [{ minimumMargin: 0, label: "attitude improves" }],
      failureLabel: "attitude unchanged",
    },
    summary: "Spend 1 performance round and roll the configured Perform-based Wild Empathy check.",
  },
  {
    id: "animal-speaker-attract-rats",
    label: "Begin Attract Rats",
    minimumLevel: 6,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(6),
    modeLabel: "Current summon tier",
    modes: [
      { id: "base", label: "1d3 rat swarms", minimumLevel: 6, maximumLevel: 10, summary: "Summon 1d3 rat swarms." },
      { id: "advanced-two", label: "2d3 advanced rat swarms", minimumLevel: 11, maximumLevel: 16, summary: "Summon 2d3 rat swarms with the advanced simple template." },
      { id: "advanced-three", label: "3d3 advanced rat swarms", minimumLevel: 17, summary: "Summon 3d3 rat swarms with the advanced simple template." },
    ],
    diceRoll: { label: "Rat swarms summoned", diceCountByLevel: [{ level: 6, count: 1 }, { level: 11, count: 2 }, { level: 17, count: 3 }], dieSidesByLevel: [{ level: 6, sides: 3 }] },
    activeEffect: tracker("Attract Rats", ["area"], "The rolled rat swarms remain while bardic performance continues.", { defaultRounds: 1, replaceExisting: true }),
    summary: "Spend 1 performance round per round; the app rolls the exact level-scaled number of swarms and records the advanced template tier.",
  },
];
animal.value.skillBonusAdjustments = [{ sourceFeatureId: "animal-speaker-kind-1", skill: "Handle Animal", minimumLevel: 1, base: 4, condition: "Checks to influence any configured Animal Friend kind" }];
animal.value.mechanicalCoverage = "full";
animal.value.mechanicalNotes = ["Four unique free-text animal kinds, the conditional Handle Animal bonus, restricted at-will animal speech, Perform-based Wild Empathy, and every Attract Rats tier are configured and tracked."];

const firstWorld = await load("bard-first-world-minstrel");
const feyMagic = feature(firstWorld.value, "bard-first-world-minstrel-fey-magic-1");
const firstWorldPerformance = feature(firstWorld.value, "bard-first-world-minstrel-bardic-performance-1");
const resistLure = feature(firstWorld.value, "bard-first-world-minstrel-resist-nature-s-lure-ex-2");
if (!feyMagic || !firstWorldPerformance || !resistLure) throw new Error("First World Minstrel source features were not found");
firstWorld.value.spellListAdditions = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`summon-natures-ally-${index + 1}`, index + 1]));
firstWorld.value.spellListExclusions = Array.from({ length: 6 }, (_, index) => `summon-monster-${index + 1}`);
feyMagic.progressionProfiles = [{
  id: "first-world-fey-magic-list",
  label: "Fey Magic substitutions",
  classId: "bard",
  columns: [{ id: "removed", label: "Removed" }, { id: "added", label: "Added" }],
  steps: Array.from({ length: 6 }, (_, index) => ({ level: [1, 4, 7, 10, 13, 16][index], values: { removed: `Summon Monster ${index + 1}`, added: `Summon Nature's Ally ${index + 1}` } })),
  summary: "Each Bard spell level substitutes the equivalent Summon Nature's Ally spell.",
}];
const scaling246 = [{ level: 1, bonus: 2 }, { level: 8, bonus: 4 }, { level: 15, bonus: 6 }];
const scaling468 = [{ level: 1, bonus: 4 }, { level: 8, bonus: 6 }, { level: 15, bonus: 8 }];
const firstWorldModes = [
  { id: "camouflage", label: "Camouflage", summary: "+4 racial Stealth and hide in any natural terrain.", activeEffects: [{ target: "skillChecks", bonus: 4, label: "Echoes — Camouflage", description: "Hide in any natural terrain and gain +4 racial Stealth.", skillIds: ["Stealth"] }] },
  ...["acid", "cold", "electricity", "fire", "sonic"].map((energy) => ({ id: `resist-${energy}`, label: `Energy Resistance — ${energy}`, summary: `Resistance 10 to ${energy}.`, activeEffects: [{ target: "self", bonus: 0, label: `Echoes — ${energy} resistance`, description: `Energy resistance 10 to ${energy}.` }] })),
  { id: "evasion", label: "Evasion", summary: "Gain evasion.", activeEffects: [{ target: "self", bonus: 0, label: "Echoes — Evasion", description: "Evasion applies for this round." }] },
  { id: "long-step", label: "Long Step", summary: "Teleport up to 10 feet per Hit Die as a move action, once every 1d4 rounds.", activeEffects: [{ target: "self", bonus: 0, label: "Echoes — Long Step", description: "Long Step is available: teleport up to 10 feet per Hit Die as a move action; 1d4-round recharge." }] },
  { id: "spell-resistance", label: "Spell Resistance", summary: "Spell resistance equals 11 + the target's CR.", activeEffects: [{ target: "self", bonus: 0, label: "Echoes — Spell Resistance", description: "Spell resistance equals 11 + this target's CR." }] },
  { id: "trackless-step", label: "Trackless Step", summary: "Leave no trail in natural surroundings unless desired.", activeEffects: [{ target: "self", bonus: 0, label: "Echoes — Trackless Step", description: "The target leaves no trail in natural surroundings unless it chooses to." }] },
  { id: "vanish", label: "Vanish", summary: "Become invisible for 1 round as a swift action.", activeEffects: [{ target: "self", bonus: 0, label: "Echoes — Vanish", description: "The target can vanish for 1 round as invisibility using a swift action." }] },
  { id: "woodland-stride", label: "Woodland Stride", summary: "Move normally through natural undergrowth.", activeEffects: [{ target: "self", bonus: 0, label: "Echoes — Woodland Stride", description: "Move through natural undergrowth at normal speed without harm or impairment; magically manipulated growth still applies." }] },
];
firstWorldPerformance.resourceActions = [
  {
    id: "first-world-echoes",
    label: "Begin Echoes of the First World",
    minimumLevel: 1,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(1),
    modeLabel: "Fey ability",
    modes: firstWorldModes,
    targetCountByLevel: [1, 4, 7, 10, 13, 16, 19].map((level, index) => ({ level, count: index + 1 })),
    activeEffect: tracker("Echoes of the First World", ["allies"], "The selected fey-template ability applies to the configured number of willing targets for 1 round. This is an audible polymorph effect.", { defaultRounds: 1, fixedRounds: true, replaceExisting: true }),
    summary: "Spend 1 performance round; select every legal fey-template ability except Change Shape and track the exact level-scaled target cap.",
  },
  {
    id: "first-world-gremlins-luck",
    label: "Resolve Gremlin's Luck",
    minimumLevel: 8,
    classId: "bard",
    resourceId: "bardicPerformance",
    cost: 1,
    actionTypeByLevel: bardSpeed(8),
    savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" },
    targetEffectRoll: {
      modifier: "will",
      rangeByLevel: [{ level: 8, range: "30 feet" }],
      effectsByLevel: [{ level: 8, name: "Gremlin's Luck", description: "For 1 round, roll every ability check, attack roll, saving throw, and skill check twice and take the worse result.", duration: { kind: "fixed-rounds", rounds: 1 } }],
      successEffect: { name: "Gremlin's Luck immunity", description: "Immune to this First World Minstrel's Gremlin's Luck for 24 hours.", rounds: 999 },
    },
    summary: "Spend 1 performance round, resolve the level-and-Charisma Will DC, track the one-round misfortune, and record 24-hour immunity on a success.",
  },
];
firstWorld.value.conditionalModifiers = [{ sourceFeatureId: resistLure.id, label: "Resist Nature's Lure +4", condition: "Saving throws against spell-like and supernatural abilities of fey and against spells and effects that target plants", minimumLevel: 2, base: 4 }];
firstWorld.value.mechanicalCoverage = "full";
firstWorld.value.mechanicalNotes = ["The six spell substitutions, Wild Empathy, all legal Fey Creature template abilities, level-scaled target count, Gremlin's Luck save/effect/immunity, and Resist Nature's Lure are automated."];

const voice = await load("bard-voice-of-the-wild");
const wildKnowledge = feature(voice.value, "bard-voice-of-the-wild-wild-knowledge-ex-1");
const natureMagic = feature(voice.value, "bard-voice-of-the-wild-nature-magic-1") ?? feature(voice.value, "voice-wild-nature-spell-1");
const songWild = feature(voice.value, "bard-voice-of-the-wild-bardic-performance-3");
if (!wildKnowledge || !natureMagic || !songWild) throw new Error("Voice of the Wild source features were not found");
if (!feature(voice.value, "voice-wild-nature-spell-1")) replaceFeature(voice.value, natureMagic.id, [1, 4, 7, 10, 13, 16].map((level, index) => choiceFeature(
  natureMagic,
  `voice-wild-nature-spell-${level}`,
  `Nature Magic Spell ${index + 1}`,
  level,
  index === 0 ? "bard-voice-nature-magic-first" : "bard-voice-nature-magic",
  index === 0 ? "Choose one 1st-level Druid or Ranger spell as a Bard spell known." : "Choose one Druid or Ranger spell of any Bard spell level currently available.",
)));
voice.value.skillBonusAdjustments = [{ sourceFeatureId: wildKnowledge.id, skill: "Knowledge (nature)", minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 1 }];
wildKnowledge.progressionProfiles = [{ id: "voice-wild-untrained-knowledge", label: "Wild Knowledge permissions", classId: "bard", columns: [{ id: "skills", label: "Untrained checks" }], steps: [{ level: 1, values: { skills: "Knowledge (geography) and Knowledge (nature)" } }], summary: "Both listed Knowledge skills can be attempted untrained." }];
const animalFocusModes = [
  { id: "bat", label: "Bat", summary: "Darkvision 60 feet; 90 feet at level 8; add blindsense 10 feet at level 15.", activeEffects: [{ target: "self", bonus: 0, label: "Song of the Wild — Bat", description: "Darkvision 60 feet (90 feet at level 8); blindsense 10 feet at level 15." }] },
  { id: "bear", label: "Bear", summary: "Enhancement bonus to Constitution.", activeEffects: [{ target: "constitution", bonus: 2, bonusByLevel: scaling246, label: "Song of the Wild — Bear", description: "Level-scaled enhancement bonus to Constitution." }] },
  { id: "bull", label: "Bull", summary: "Enhancement bonus to Strength.", activeEffects: [{ target: "strength", bonus: 2, bonusByLevel: scaling246, label: "Song of the Wild — Bull", description: "Level-scaled enhancement bonus to Strength." }] },
  { id: "falcon", label: "Falcon", summary: "Competence bonus on Perception.", activeEffects: [{ target: "skillChecks", bonus: 4, bonusByLevel: scaling468, label: "Song of the Wild — Falcon", description: "Level-scaled competence bonus on Perception checks.", skillIds: ["Perception"] }] },
  { id: "frog", label: "Frog", summary: "Competence bonus on Swim and Acrobatics checks to jump.", activeEffects: [{ target: "skillChecks", bonus: 4, bonusByLevel: scaling468, label: "Song of the Wild — Frog", description: "Level-scaled competence bonus on Swim and Acrobatics checks to jump.", skillIds: ["Swim", "Acrobatics"] }] },
  { id: "monkey", label: "Monkey", summary: "Competence bonus on Climb.", activeEffects: [{ target: "skillChecks", bonus: 4, bonusByLevel: scaling468, label: "Song of the Wild — Monkey", description: "Level-scaled competence bonus on Climb checks.", skillIds: ["Climb"] }] },
  { id: "mouse", label: "Mouse", summary: "Evasion, improving to improved evasion at level 12.", activeEffects: [{ target: "self", bonus: 0, label: "Song of the Wild — Mouse", description: "Evasion applies; it improves to improved evasion at Bard level 12." }] },
  { id: "owl", label: "Owl", summary: "Competence bonus on Stealth.", activeEffects: [{ target: "skillChecks", bonus: 4, bonusByLevel: scaling468, label: "Song of the Wild — Owl", description: "Level-scaled competence bonus on Stealth checks.", skillIds: ["Stealth"] }] },
  { id: "snake", label: "Snake", summary: "Level-scaled attack and dodge AC bonuses for attacks of opportunity.", activeEffects: [{ target: "self", bonus: 0, label: "Song of the Wild — Snake", description: "+2 on attacks of opportunity and +2 dodge AC against attacks of opportunity; +4 at level 8 and +6 at level 15." }] },
  { id: "stag", label: "Stag", summary: "Enhancement bonus to land speed.", activeEffects: [{ target: "landSpeed", bonus: 5, bonusByLevel: [{ level: 1, bonus: 5 }, { level: 8, bonus: 10 }, { level: 15, bonus: 20 }], label: "Song of the Wild — Stag", description: "Level-scaled enhancement bonus to base land speed." }] },
  { id: "tiger", label: "Tiger", summary: "Enhancement bonus to Dexterity.", activeEffects: [{ target: "dexterity", bonus: 2, bonusByLevel: scaling246, label: "Song of the Wild — Tiger", description: "Level-scaled enhancement bonus to Dexterity." }] },
  { id: "wolf", label: "Wolf", summary: "Scent 10 feet; 20 feet at level 8; 30 feet at level 15.", activeEffects: [{ target: "self", bonus: 0, label: "Song of the Wild — Wolf", description: "Scent 10 feet (20 feet at level 8, 30 feet at level 15); double upwind and half downwind." }] },
];
songWild.resourceActions = [{
  id: "voice-wild-song",
  label: "Begin Song of the Wild",
  minimumLevel: 3,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 1,
  actionTypeByLevel: bardSpeed(3),
  modeLabel: "Animal aspect",
  modes: animalFocusModes,
  targetCountByLevel: [{ level: 3, count: 1 }, { level: 10, count: 2 }, { level: 17, count: 3 }],
  activeEffect: tracker("Song of the Wild", ["allies"], "The selected Hunter animal focus applies to allies who can hear or see the performance.", { defaultRounds: 1, replaceExisting: true }),
  summary: "Spend 1 performance round per round; every core Hunter animal focus, its level scaling, and the 1/2/3-ally cap are available.",
}];
voice.value.mechanicalCoverage = "full";
voice.value.mechanicalNotes = ["Wild Knowledge, six level-gated Druid/Ranger spell choices, and all twelve core Hunter animal-focus modes with level scaling and ally caps are automated."];

const cultivator = await load("bard-cultivator");
const verdantVoice = feature(cultivator.value, "bard-cultivator-verdant-voice-1");
const songGrowth = feature(cultivator.value, "bard-cultivator-song-of-growth-su-1");
const cultivatorLure = feature(cultivator.value, "bard-cultivator-resist-nature-s-lure-ex-2");
const natureLore = feature(cultivator.value, "bard-cultivator-nature-lore-ex-5");
if (!verdantVoice || !songGrowth || !cultivatorLure || !natureLore) throw new Error("Cultivator source features were not found");
verdantVoice.resourceActions = [{
  id: "cultivator-verdant-voice",
  label: "Augment Performance with Verdant Voice",
  minimumLevel: 1,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 2,
  actionTypeByLevel: bardSpeed(1),
  confirmations: [{ id: "plant-target", label: "The performance is being augmented to affect a creature of the plant type", requiredForActivation: true }],
  activeEffect: tracker("Verdant Voice", ["area"], "This performance can affect plant creatures despite being mind-affecting. Its normal round plus the additional Verdant Voice round have been spent.", { defaultRounds: 1, replaceExisting: true }),
  summary: "Spend the normal round plus the exact 1 additional performance round required to affect plants.",
}];
songGrowth.level = 1;
songGrowth.resourceActions = [{
  id: "cultivator-song-growth",
  label: "Create Song of Growth Barrier",
  minimumLevel: 1,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 1,
  actionTypeByLevel: [{ level: 1, actionType: "standard" }],
  maximumActiveEffects: { name: "Song of Growth Barrier", levelDivisor: 2, abilityModifier: "charisma", minimum: 0 },
  activeEffect: tracker("Song of Growth Barrier", ["area"], "One opaque square face within 30 feet provides total cover. Hardness 0, AC 5, {doubleClassLevel} hit points. It must be ground-supported and holds at most 5 pounds; remove all barriers when the performance ends.", { defaultRounds: 1 }),
  summary: "Create one barrier and enforce the exact Charisma modifier + half Bard level active-barrier limit.",
}];
cultivator.value.conditionalModifiers = [{ sourceFeatureId: cultivatorLure.id, label: "Resist Nature's Lure", condition: "Saving throws against spell-like and supernatural abilities of fey and against spells and effects that target plants", minimumLevel: 2, base: 2, bonusByLevel: [{ level: 2, bonus: 2 }, { level: 4, bonus: 4 }] }];
cultivator.value.skillCheckRules = [
  { sourceFeatureId: natureLore.id, label: "Nature Lore", minimumLevel: 5, skills: ["Knowledge (nature)"], result: 10, allowsStress: true },
  { sourceFeatureId: natureLore.id, label: "Nature Lore tracking", minimumLevel: 5, skills: ["Survival"], result: 10, allowsStress: true, condition: "Tracking creatures in natural environments" },
];
cultivator.value.resourceAdjustments = [{ resourceId: "natureLoreTake20", label: "Nature Lore take 20", unit: "use", operation: "replace", minimumLevel: 5, base: 1, perInterval: 1, interval: 6, maximum: 3, refreshCadence: "day" }];
natureLore.resourceActions = [{
  id: "cultivator-nature-lore-take-20",
  label: "Use Nature Lore Take 20",
  minimumLevel: 5,
  classId: "bard",
  resourceId: "natureLoreTake20",
  cost: 1,
  actionTypeByLevel: [{ level: 5, actionType: "standard" }],
  modeLabel: "Skill",
  modes: [{ id: "nature", label: "Knowledge (nature)", summary: "Use the result for a Knowledge (nature) check." }, { id: "survival", label: "Survival — track in natural terrain", summary: "Use the result for a Survival check to track in a natural environment." }],
  fixedD20Result: { label: "Natural d20 result", result: 20 },
  summary: "Spend one of the exact 1/2/3 daily uses and use a natural d20 result of 20 without additional time.",
}];
cultivator.value.mechanicalCoverage = "full";
cultivator.value.mechanicalNotes = ["Plant spell additions, class skill, Verdant Voice's extra cost, the barrier count and statistics, Resist Nature's Lure, unlimited take 10, and bounded take 20 uses are automated."];

const stonesinger = await load("bard-stonesinger");
const earthMagic = feature(stonesinger.value, "bard-stonesinger-earth-magic-1");
const stoneSong = feature(stonesinger.value, "bard-stonesinger-stone-song-su-1");
const tremor = feature(stonesinger.value, "bard-stonesinger-tremor-su-5") ?? feature(stonesinger.value, "bard-stonesinger-tremor-su-1");
const quake = feature(stonesinger.value, "bard-stonesinger-quake-su-8");
if (!earthMagic || !stoneSong || !tremor || !quake) throw new Error("Stonesinger source features were not found");
earthMagic.progressionProfiles = [{ id: "stonesinger-earth-magic", label: "Earth Magic", classId: "bard", columns: [{ id: "benefit", label: "Benefit" }], steps: [{ level: 1, values: { benefit: "Eschew Materials while touching natural or manufactured stone" } }], summary: "The conditional feat benefit is always visible alongside all six spell-list additions." }];
stoneSong.resourceActions = [{
  id: "stonesinger-stone-song",
  label: "Begin Stone Song",
  minimumLevel: 1,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 1,
  actionTypeByLevel: bardSpeed(1),
  modeLabel: "Listener",
  modes: [
    { id: "nearby", label: "Nearby allies", summary: "All allies within 30 feet perceive the subtle vibration." },
    ...Array.from({ length: 20 }, (_, index) => ({ id: `tremorsense-${index + 1}`, label: `Tremorsense allies — ${100 * (index + 1)} feet`, minimumLevel: index + 1, maximumLevel: index + 1, summary: `Allies with tremorsense perceive Stone Song through unobstructed solid earth out to ${100 * (index + 1)} feet.` })),
  ],
  activeEffect: tracker("Stone Song", ["allies"], "Subsonic Perform (song) or Perform (oratory) carries through natural and manufactured stone according to the selected listener mode.", { defaultRounds: 1, replaceExisting: true }),
  summary: "Spend 1 performance round per round; select the normal 30-foot or exact 100-feet-per-level tremorsense range.",
}];
tremor.id = "bard-stonesinger-tremor-su-1";
tremor.level = 1;
tremor.resourceActions = [{
  id: "stonesinger-tremor",
  label: "Add Tremor to Current Performance",
  minimumLevel: 1,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 0,
  minimumResourceRemaining: 1,
  actionTypeByLevel: [{ level: 1, actionType: "free" }],
  confirmations: [{ id: "performance-active", label: "Another Bardic Performance is active", requiredForActivation: true }, { id: "grounded-enemies", label: "Affected enemies are grounded rather than flying or levitating", requiredForActivation: true }],
  activeEffect: { name: "Tremor", targets: ["armorClass"], bonus: -1, bonusByLevel: [{ level: 1, bonus: -1 }, { level: 5, bonus: -2 }, { level: 11, bonus: -3 }, { level: 17, bonus: -4 }], description: "Grounded enemies within 30 feet take this circumstance penalty to AC while the performance continues.", defaultRounds: 1, replaceExisting: true },
  summary: "Require an active performance and apply the exact level-scaled AC penalty only to grounded enemies, without charging an extra performance round.",
}];
quake.resourceActions = [{
  id: "stonesinger-quake",
  label: "Resolve Quake",
  minimumLevel: 8,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 1,
  actionTypeByLevel: bardSpeed(8),
  confirmations: [{ id: "eligible-target", label: "Targets are standing and grounded and do not have earth glide", requiredForActivation: true }],
  savingThrow: { label: "Reflex", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" },
  targetEffectRoll: { modifier: "reflex", rangeByLevel: [{ level: 8, range: "all eligible enemies within 30 feet" }], effectsByLevel: [{ level: 8, name: "Quake — Prone", description: "The failed target is knocked prone; remove the tracker when it stands.", duration: { kind: "fixed-rounds", rounds: 999 } }] },
  summary: "Begin performance, spend 1 round, resolve the exact Reflex DC, and track prone only for eligible grounded targets.",
}];
stonesinger.value.conditionalModifiers = [{ sourceFeatureId: earthMagic.id, label: "Conditional Eschew Materials", condition: "While touching natural or manufactured stone", minimumLevel: 1, base: 0 }];
stonesinger.value.mechanicalCoverage = "full";
stonesinger.value.mechanicalNotes = ["All six Earth Magic spells, conditional Eschew Materials, Stone Song ranges, Tremor's correct level-1 unlock and scaling, and Quake's save and eligibility are automated."];

await Promise.all([
  write(new URL("packages/data/src/options/bard-animal-friend-kinds.json", root), animalKindGroup),
  write(new URL("packages/data/src/options/bard-voice-nature-magic-first.json", root), firstNatureSpellGroup),
  write(new URL("packages/data/src/options/bard-voice-nature-magic.json", root), natureSpellGroup),
  ...[animal, firstWorld, voice, cultivator, stonesinger].map((record) => write(record.url, record.value)),
]);
console.log("Annotated five nature-themed Bard archetypes and generated their reusable option catalogues.");
