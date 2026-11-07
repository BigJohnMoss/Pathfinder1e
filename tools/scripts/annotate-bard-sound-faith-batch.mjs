import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (name) => {
  const url = new URL(`packages/data/src/archetypes/${name}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const feature = (record, id) => record.replacements.flatMap((replacement) => replacement.features ?? []).find((candidate) => candidate.id === id);
const effect = (name, targets, description, bonus = 0, extra = {}) => ({ name, targets, bonus, description, ...extra });
const bardSpeed = (minimumLevel) => [{ level: minimumLevel, actionType: minimumLevel >= 13 ? "swift" : minimumLevel >= 7 ? "move" : "standard" }, ...(minimumLevel < 7 ? [{ level: 7, actionType: "move" }] : []), ...(minimumLevel < 13 ? [{ level: 13, actionType: "swift" }] : [])];

const flamesinger = await load("bard-flamesinger");
const fireMusic = feature(flamesinger.value, "bard-flamesinger-fire-music-1");
const blazing = feature(flamesinger.value, "bard-flamesinger-bardic-performance-5");
if (!fireMusic || !blazing) throw new Error("Flamesinger features were not found.");
fireMusic.grantedFeatId = "fire-music";
blazing.level = 1;
blazing.resourceActions = [{
  id: "flamesinger-blazing-blades", label: "Begin Blazing Blades", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1),
  diceRoll: { label: "Bonus fire damage on a successful weapon attack", diceCountByLevel: [{ level: 1, count: 1 }, { level: 5, count: 2 }, { level: 11, count: 3 }, { level: 17, count: 4 }], dieSidesByLevel: [{ level: 1, sides: 4 }], modeEffects: [{ modeId: "damage", kind: "damage" }] },
  modes: [{ id: "damage", label: "Roll bonus fire damage", summary: "Roll the extra fire damage for one successful affected weapon attack." }],
  activeEffect: effect("Blazing Blades", ["allies"], "Audible fire effect within 30 feet. Manufactured and natural weapon hits deal the rolled bonus fire damage; it stacks with other fire damage.", 0, { defaultRounds: 1, replaceExisting: true }),
  summary: "Spend one bardic performance round per round; the damage increases to 2d4 at 5th, 3d4 at 11th, and 4d4 at 17th level.",
}];
flamesinger.value.landSpeedAdjustments = [{ sourceFeatureId: "bard-flamesinger-wildfire-ex-2", label: "Wildfire", minimumLevel: 2, bonus: 5, bonusType: "enhancement", bonusByLevel: [{ level: 2, bonus: 5 }, { level: 6, bonus: 10 }, { level: 10, bonus: 15 }, { level: 14, bonus: 20 }, { level: 18, bonus: 25 }], timing: "beforeReduction" }];
flamesinger.value.mechanicalCoverage = "full";
flamesinger.value.mechanicalNotes = ["Fire Music, exact summon-monster grants, Blazing Blades activation and 1d4–4d4 scaling, and every Wildfire speed increase are automated."];

const songhealer = await load("bard-songhealer");
const enhance = feature(songhealer.value, "bard-songhealer-enhance-healing-su-1");
const healingPerformance = feature(songhealer.value, "bard-songhealer-bardic-performance-1");
if (!enhance || !healingPerformance) throw new Error("Songhealer features were not found.");
songhealer.value.resourceAdjustments = [{ resourceId: "songhealerEnhanceHealing", label: "Enhance Healing uses", unit: "use", minimumLevel: 1, base: 0, abilityModifier: "charisma", minimum: 0 }];
enhance.resourceActions = [{
  id: "songhealer-enhance-healing", label: "Enhance healing item", minimumLevel: 1, classId: "bard", resourceId: "songhealerEnhanceHealing", cost: 1,
  activeEffect: effect("Enhanced healing item", ["self"], "The selected spell-completion or spell-trigger healing effect uses the Songhealer's Bard level as its caster level.", 0, { defaultRounds: 1, consumeOnUse: true }),
  summary: "Spend one daily use when activating a healing effect from a spell-completion or spell-trigger item.",
}];
healingPerformance.resourceActions = [
  { id: "songhealer-healing-performance-living", label: "Complete Healing Performance — living target", minimumLevel: 14, classId: "bard", resourceId: "bardicPerformance", cost: 5, actionTypeByLevel: [{ level: 14, actionType: "full-round" }], confirmations: [{ id: "continuous-performance", label: "The target saw and heard all 5 continuous rounds", requiredForActivation: true }], spellLikeAbility: { spellId: "heal", spellName: "Heal", cadence: "at-will", kind: "spell-equivalent" }, summary: "Spend five continuous rounds of performance to produce Heal at Bard caster level." },
  { id: "songhealer-healing-performance-undead", label: "Complete Healing Performance — undead target", minimumLevel: 14, classId: "bard", resourceId: "bardicPerformance", cost: 5, actionTypeByLevel: [{ level: 14, actionType: "full-round" }], confirmations: [{ id: "continuous-performance", label: "The undead target saw and heard all 5 continuous rounds", requiredForActivation: true }], activeEffect: effect("Healing Performance — Harm", ["enemy"], "Resolve Harm against the undead target at caster level equal to Bard level.", 0, { defaultRounds: 1, consumeOnUse: true }), summary: "Spend five continuous rounds of performance to produce Harm at Bard caster level." },
  { id: "songhealer-funereal-ballad", label: "Complete Funereal Ballad", minimumLevel: 20, classId: "bard", resourceId: "bardicPerformance", cost: 20, actionTypeByLevel: [{ level: 20, actionType: "full-round" }], confirmations: [{ id: "continuous-ballad", label: "The dead target remained within 10 feet for all 20 continuous rounds", requiredForActivation: true }], activeEffect: effect("Funereal Ballad — Resurrection", ["allies"], "Resolve Resurrection at caster level equal to Bard level after the completed audible and visual performance.", 0, { defaultRounds: 1, consumeOnUse: true }), summary: "Spend twenty continuous rounds of performance to produce Resurrection at Bard caster level." },
];
songhealer.value.mechanicalCoverage = "full";
songhealer.value.mechanicalNotes = ["Charisma-limited item healing and all Healing Performance and Funereal Ballad costs, unlocks, continuous-performance requirements, targets, and spell-equivalent results are automated."];

const striker = await load("bard-sound-striker");
const errata = feature(striker.value, "bard-sound-striker-errata-1");
const soundPerformance = feature(striker.value, "bard-sound-striker-bardic-performance-3");
if (!errata || !soundPerformance) throw new Error("Sound Striker features were not found.");
errata.type = "archetype";
errata.summary = "The current errata is incorporated into Wordstrike and Weird Words below; this introductory text has no separate mechanical effect.";
soundPerformance.resourceActions = [
  { id: "sound-striker-wordstrike-object", label: "Wordstrike — object", minimumLevel: 3, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 3, actionType: "standard" }], combatRoll: { damage: { type: "untyped", diceCountByLevel: [{ level: 3, count: 1 }], dieSidesByLevel: [{ level: 3, sides: 4 }], flatModifierByLevel: Array.from({ length: 18 }, (_, index) => ({ level: index + 3, modifier: index + 3 })) }, rangeByLevel: [{ level: 3, range: "targeted creature or object" }] }, summary: "Spend one performance round to deal 1d4 + Bard level damage to an object." },
  { id: "sound-striker-wordstrike-living", label: "Wordstrike — living creature", minimumLevel: 3, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 3, actionType: "standard" }], diceRoll: { label: "Half Wordstrike damage", diceCountByLevel: [{ level: 3, count: 1 }], dieSidesByLevel: [{ level: 3, sides: 4 }], flatModifierByLevel: Array.from({ length: 18 }, (_, index) => ({ level: index + 3, modifier: index + 3 })), resultDivisorByMode: [{ modeId: "living", divisor: 2 }], modeEffects: [{ modeId: "living", kind: "damage" }] }, modes: [{ id: "living", label: "Living creature (half damage)", summary: "Divide the rolled Wordstrike damage by two for a living creature." }], summary: "Spend one performance round; a living creature takes half of 1d4 + Bard level damage." },
  { id: "sound-striker-weird-words", label: "Unleash Weird Words", minimumLevel: 6, classId: "bard", resourceId: "bardicPerformance", variableCost: { label: "Words", minimum: 1, maximumLevelDivisor: 4 }, actionTypeByLevel: [{ level: 6, actionType: "standard" }], modeLabel: "Targeting", modes: [{ id: "different-targets", label: "Different targets", summary: "Each word resolves separately and adds Charisma to its damage." }, { id: "same-target", label: "Same target", summary: "Successful words stack; energy resistance and Charisma apply only once." }], combatRoll: { attack: { kind: "ranged-touch", label: "Ranged touch attack" }, attackCountFromVariableCost: true, abilityModifierOnceModeIds: ["same-target"], damage: { type: "sonic", diceCountByLevel: [{ level: 3, count: 4 }], dieSidesByLevel: [{ level: 3, sides: 6 }], abilityModifier: "charisma" }, rangeByLevel: [{ level: 3, range: "30 feet" }] }, summary: "Choose up to one word per four Bard levels. Each word costs one performance round and makes its own ranged touch attack for 4d6 sonic damage; target grouping controls whether Charisma applies once or per target." },
];
striker.value.mechanicalCoverage = "full";
striker.value.mechanicalNotes = ["Current errata is incorporated. Wordstrike object and living-target damage and simultaneous Weird Words costs, attack rolls, range, and damage are automated."];

const brigh = await load("bard-voice-of-brigh");
const knowledge = feature(brigh.value, "bard-voice-of-brigh-brigh-s-knowledge-ex-1");
const brighPerformance = feature(brigh.value, "bard-voice-of-brigh-bardic-performance-8");
if (!knowledge || !brighPerformance) throw new Error("Voice of Brigh features were not found.");
delete brigh.value.skillBonusAdjustments;
knowledge.resourceActions = [{ id: "brigh-knowledge-construct-performance", label: "Mark construct as a valid performance target", minimumLevel: 1, classId: "bard", activeEffect: effect("Brigh's Knowledge — construct target", ["allies"], "This construct can be affected by the Voice of Brigh's bardic performances despite its normal immunities.", 0, { defaultRounds: 1, consumeOnUse: true }), summary: "Use this tracker when a construct would normally be immune to the selected bardic performance." }];
brighPerformance.resourceActions = [
  { id: "brigh-soothing", label: "Begin Brigh's Soothing", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1), confirmations: [{ id: "construct-target", label: "Every target is a construct", requiredForActivation: true }], activeEffect: effect("Brigh's Soothing", ["enemy"], "Fascinate, restricted to constructs.", 0, { defaultRounds: 1, replaceExisting: true }), summary: "Functions as Fascinate but targets constructs only." },
  { id: "brigh-anger", label: "Begin Brigh's Anger", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(8), confirmations: [{ id: "construct-target", label: "Every target is a construct", requiredForActivation: true }], activeEffect: effect("Brigh's Anger", ["enemy"], "Dirge of Doom, restricted to constructs.", 0, { defaultRounds: 1, replaceExisting: true }), summary: "Functions as Dirge of Doom but targets constructs only." },
  { id: "brigh-spark", label: "Maintain Brigh's Spark", minimumLevel: 12, classId: "bard", resourceId: "bardicPerformance", variableCost: { label: "Constructs maintained", minimum: 1, maximum: 20 }, actionTypeByLevel: bardSpeed(12), confirmations: [{ id: "destroyed-constructs", label: "Each target is a destroyed construct within 60 feet", requiredForActivation: true }], activeEffect: effect("Brigh's Spark", ["allies"], "Each selected construct restores hit points equal to your Bard level, is staggered, and follows your orders. Spend one performance round per construct each round; reaching full hit points completes reanimation for 24 hours, while ending early completely destroys it.", 0, { defaultRounds: 1, replaceExisting: true }), summary: "Spend one round per maintained construct; each restores hit points equal to Bard level." },
  { id: "brigh-wrath", label: "Begin Brigh's Wrath", minimumLevel: 14, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(14), confirmations: [{ id: "construct-target", label: "Every target is a construct", requiredForActivation: true }], activeEffect: effect("Brigh's Wrath", ["enemy"], "Frightening Tune, restricted to constructs.", 0, { defaultRounds: 1, replaceExisting: true }), summary: "Functions as Frightening Tune but targets constructs only." },
];
brigh.value.mechanicalCoverage = "full";
brigh.value.mechanicalNotes = ["All four Knowledge bonuses and untrained access guidance, construct targeting, and every construct-only performance—including multi-construct Spark maintenance and healing—are automated."];

const silver = await load("bard-silver-balladeer");
const silverPerformance = feature(silver.value, "bard-silver-balladeer-bardic-performance-6");
const silverMastery = feature(silver.value, "bard-silver-balladeer-silver-mastery-su-2");
if (!silverPerformance || !silverMastery) throw new Error("Silver Balladeer features were not found.");
silverPerformance.resourceActions = [
  { id: "silver-balladeer-break-curse", label: "Maintain Break Curse", minimumLevel: 6, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(6), confirmations: [{ id: "silver-instrument", label: "A silver or silver-stringed masterwork instrument is in use", requiredForActivation: true }], diceRoll: { label: "Perform check against original curse DC", diceCountByLevel: [{ level: 6, count: 1 }], dieSidesByLevel: [{ level: 6, sides: 20 }], modifierInputLabel: "Perform modifier", modeEffects: [{ modeId: "single", kind: "damage" }] }, modes: [{ id: "single", label: "Single curse", summary: "Attempt the Perform check against one curse's original DC." }], activeEffect: effect("Break Curse suppression", ["allies"], "A successful Perform check suppresses the curse for one round. After four consecutive successes, attempt a Bard-level caster check to remove it as Remove Curse.", 0, { defaultRounds: 1, replaceExisting: true }), summary: "Spend one performance round, roll Perform against the curse's original DC, and track consecutive suppression rounds." },
  { id: "silver-balladeer-holy-vibration", label: "Create Holy Vibration", minimumLevel: 9, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(9), confirmations: [{ id: "silver-instrument", label: "A silver or silver-stringed masterwork instrument is in use", requiredForActivation: true }], activeEffect: effect("Holy Vibration", ["enemy"], "One door or window within 30 feet is locked against undead and evil-subtype creatures; affected incorporeal creatures cannot cross it or nearby surfaces without the object's break-DC Charisma check.", 0, { defaultRounds: 90, defaultRoundsByLevel: [{ level: 9, rounds: 90 }, { level: 10, rounds: 100 }, { level: 11, rounds: 110 }, { level: 12, rounds: 120 }, { level: 13, rounds: 130 }, { level: 14, rounds: 140 }, { level: 15, rounds: 150 }, { level: 16, rounds: 160 }, { level: 17, rounds: 170 }, { level: 18, rounds: 180 }, { level: 19, rounds: 190 }, { level: 20, rounds: 200 }], fixedRounds: true }), summary: "Spend one performance round; the ward lasts 10 minutes per Bard level (shown in rounds)." },
  { id: "silver-balladeer-mass-break-curse", label: "Maintain Mass Break Curse", minimumLevel: 18, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(18), confirmations: [{ id: "silver-instrument", label: "A silver or silver-stringed masterwork instrument is in use", requiredForActivation: true }], diceRoll: { label: "Perform check against selected curse DC", diceCountByLevel: [{ level: 18, count: 1 }], dieSidesByLevel: [{ level: 18, sides: 20 }], modifierInputLabel: "Perform modifier", modeEffects: [{ modeId: "mass", kind: "damage" }] }, modes: [{ id: "mass", label: "All allies within 30 feet", summary: "Attempt the check for the selected curse while suppressing all affected allies' curses." }], activeEffect: effect("Mass Break Curse suppression", ["allies"], "Successful checks suppress the affected curses for one round. Every four consecutive rounds, attempt one Bard-level caster check to remove one selected curse.", 0, { defaultRounds: 1, replaceExisting: true }), summary: "Spend one performance round to suppress curses across the group and track four-round removal attempts." },
];
silverMastery.resourceActions = [{ id: "silver-balladeer-silver-mastery", label: "Apply Silver Mastery", minimumLevel: 2, classId: "bard", activeEffect: effect("Silver Mastery", ["attackRolls"], "Silver weapons also count as cold iron for overcoming DR; alchemical silver weapons lose their damage penalty; mithral weapon attacks gain +1.", 1, { defaultRounds: 999, fixedRounds: true, replaceExisting: true }), summary: "Persistent equipment rule; activate this tracker only while using a mithral weapon." }];
silver.value.mechanicalCoverage = "full";
silver.value.mechanicalNotes = ["Good-alignment eligibility, Pure Heart defenses, all silver-instrument performances, curse checks and consecutive-round tracking, Holy Vibration duration, and every Silver Mastery weapon rule are automated."];

for (const record of [flamesinger, songhealer, striker, brigh, silver]) await writeFile(record.url, `${JSON.stringify(record.value, null, 2)}\n`);
console.log("Annotated five sound, healing, and faith-themed Bard archetypes.");
