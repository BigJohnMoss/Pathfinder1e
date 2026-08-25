import { readFile, writeFile } from "node:fs/promises";
import spells from "../../generated/pf1e-spells.mjs";

const root = new URL("../../", import.meta.url);
const load = async (name) => {
  const url = new URL(`packages/data/src/archetypes/${name}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const feature = (record, id) => record.replacements.flatMap((replacement) => replacement.features ?? []).find((candidate) => candidate.id === id);
const bardSpeed = (minimumLevel = 1) => [{ level: minimumLevel, actionType: minimumLevel >= 13 ? "swift" : minimumLevel >= 7 ? "move" : "standard" }, ...(minimumLevel < 7 ? [{ level: 7, actionType: "move" }] : []), ...(minimumLevel < 13 ? [{ level: 13, actionType: "swift" }] : [])];
const effect = (target, bonus, label, description, extra = {}) => ({ target, bonus, label, description, ...extra });
const tracker = (name, targets, description, extra = {}) => ({ name, targets, bonus: 0, description, ...extra });
const aon = (fixedName) => ({ title: "Archives of Nethys", page: null, url: `https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Bard%20${fixedName}` });

const disciple = await load("bard-disciple-of-the-forked-tongue");
const disciplePerformance = feature(disciple.value, "bard-disciple-of-the-forked-tongue-bardic-performance-5");
const serpent = feature(disciple.value, "bard-disciple-of-the-forked-tongue-serpent-of-the-mind-su-2") ?? disciple.value.replacements.flatMap((replacement) => replacement.features ?? []).find((candidate) => candidate.progressionKey === "bard-serpent-mind");
if (!disciplePerformance || !serpent) throw new Error("Disciple of the Forked Tongue features were not found.");
disciplePerformance.level = 1;
disciplePerformance.resourceActions = [{
  id: "forked-tongue-discordant-spiral", label: "Begin Discordant Spiral", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1), modeLabel: "Penalty tier",
  modes: [
    { id: "tier-1", label: "Levels 1–4", maximumLevel: 4, summary: "−1 on saves against mind-affecting and curse effects; −2 concentration.", activeEffects: [effect("savingThrows", -1, "Discordant Spiral — saves", "−1 on saves against mind-affecting and curse effects only.")] },
    { id: "tier-2", label: "Levels 5–10", minimumLevel: 5, maximumLevel: 10, summary: "−2 on saves against mind-affecting and curse effects; −3 concentration.", activeEffects: [effect("savingThrows", -2, "Discordant Spiral — saves", "−2 on saves against mind-affecting and curse effects only.")] },
    { id: "tier-3", label: "Levels 11–16", minimumLevel: 11, maximumLevel: 16, summary: "−3 on saves against mind-affecting and curse effects; −4 concentration.", activeEffects: [effect("savingThrows", -3, "Discordant Spiral — saves", "−3 on saves against mind-affecting and curse effects only.")] },
    { id: "tier-4", label: "Levels 17–20", minimumLevel: 17, summary: "−4 on saves against mind-affecting and curse effects; −5 concentration.", activeEffects: [effect("savingThrows", -4, "Discordant Spiral — saves", "−4 on saves against mind-affecting and curse effects only.")] },
  ],
  activeEffect: tracker("Discordant Spiral", ["enemy"], "Audible performance. Enemies that can hear take the selected save penalty and the concentration penalty shown by the tier.", { defaultRounds: 1, replaceExisting: true }),
  summary: "Spend one performance round per round; the app selects the exact level-based save and concentration penalty tier.",
}, {
  id: "forked-tongue-venomous-whispers", label: "Begin Venomous Whispers", minimumLevel: 9, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(9),
  targetCountByLevel: [{ level: 9, count: 1 }, { level: 12, count: 2 }, { level: 15, count: 3 }, { level: 18, count: 4 }],
  activeEffect: tracker("Venomous Whispers", ["enemy"], "Within 30 feet. The affected enemy treats its allies as hostile for spells and abilities, is never willing, attempts saves when possible, and gains no allied-performance or ally-specific benefits.", { defaultRounds: 1, replaceExisting: true }),
  summary: "Spend one performance round per round and select up to the displayed number of enemies within 30 feet.",
}];
const serpentLevels = [2, 6, 10, 14, 18];
const serpentFeatures = serpentLevels.map((level, index) => ({
  ...serpent,
  id: `bard-disciple-of-the-forked-tongue-serpent-of-the-mind-${level}`,
  name: `Serpent of the Mind${index ? ` ${index + 1}` : ""}`,
  level,
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "bard-serpent-mind-curse-spells",
  progressionKey: "bard-serpent-mind",
  summary: `Choose one curse-descriptor spell of a level the Bard can cast and add it to spells known (${index + 1} of 5).`,
}));
for (const replacement of disciple.value.replacements) {
  const current = replacement.features ?? [];
  const index = current.findIndex((candidate) => candidate.id === "bard-disciple-of-the-forked-tongue-serpent-of-the-mind-su-2" || candidate.progressionKey === "bard-serpent-mind");
  if (index >= 0) replacement.features = [...current.slice(0, index), ...serpentFeatures, ...current.slice(index + 1).filter((candidate) => candidate.progressionKey !== "bard-serpent-mind")];
}
disciple.value.requirements = [{ type: "ancestry", id: "vishkanya" }];
disciple.value.mechanicalCoverage = "full";
disciple.value.mechanicalNotes = ["Discordant Spiral penalties, Venomous Whispers target scaling, Vishkanya eligibility, and all five level-gated curse-spell-known selections are automated."];

const bardSpellAccess = { 0: 1, 1: 1, 2: 4, 3: 7, 4: 10, 5: 13, 6: 16 };
const curseSpellOptions = spells
  .filter((spell) => spell.descriptors?.some((descriptor) => descriptor.toLowerCase() === "curse"))
  .map((spell) => ({ spell, spellLevel: Math.min(...Object.values(spell.levelByClass)) }))
  .filter(({ spellLevel }) => spellLevel <= 6)
  .sort((left, right) => left.spellLevel - right.spellLevel || left.spell.name.localeCompare(right.spell.name))
  .map(({ spell, spellLevel }) => ({
    id: `bard-serpent-mind-${spell.id}`,
    name: spell.name,
    groupId: "bard-serpent-mind-curse-spells",
    classIds: ["bard"],
    minimumLevel: bardSpellAccess[spellLevel],
    prerequisites: [],
    benefit: `${spellLevel === 0 ? "Cantrip" : `${spellLevel}${spellLevel === 1 ? "st" : spellLevel === 2 ? "nd" : spellLevel === 3 ? "rd" : "th"}-level`} curse spell added to Bard spells known. ${spell.summary}`,
    spellId: spell.id,
    spellLevel,
    source: spell.source,
  }));
await writeFile(new URL("packages/data/src/options/bard-serpent-mind-curse-spells.json", root), `${JSON.stringify({ id: "bard-serpent-mind-curse-spells", name: "Serpent of the Mind Curse Spells", classIds: ["bard"], options: curseSpellOptions, source: aon("Disciple%20of%20the%20Forked%20Tongue") }, null, 2)}\n`);

const geisha = await load("bard-geisha");
const geishaProficiency = feature(geisha.value, "bard-geisha-weapon-and-armor-proficiency-1");
const tea = feature(geisha.value, "bard-geisha-tea-ceremony-su-1");
const knowledge = feature(geisha.value, "bard-geisha-geisha-knowledge-1");
const scribe = feature(geisha.value, "bard-geisha-scribe-scroll-1");
if (!geishaProficiency || !tea || !knowledge || !scribe) throw new Error("Geisha features were not found.");
delete scribe.grantedFeatId;
Object.assign(geishaProficiency, { type: "selectable", choiceRequired: true, optionGroupId: "bard-geisha-monk-weapons" });
delete geisha.value.proficiencyAdjustments;
geisha.value.proficiencyChoices = [{ sourceFeatureId: geishaProficiency.id, category: "weapon", operation: "add", featureId: geishaProficiency.id, choiceKey: "weapon", condition: "must have the monk special weapon quality" }];
geisha.value.arcaneSpellFailure = { applies: true, sourceFeatureIds: [geishaProficiency.id], fullyAutomatedFeatureIds: [geishaProficiency.id] };
tea.resourceActions = [{
  id: "geisha-tea-ceremony", label: "Complete Tea Ceremony", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", variableCost: { label: "Allies affected", minimum: 1, maximum: 20, multiplier: 4 }, actionTypeByLevel: [{ level: 1, actionType: "10-minute" }], modeLabel: "Performance benefit",
  modes: [
    { id: "courage", label: "Inspire Courage", summary: "Apply the Geisha's current Inspire Courage bonuses for 10 minutes." },
    { id: "competence", label: "Inspire Competence", minimumLevel: 3, summary: "Apply the Geisha's current Inspire Competence bonus for 10 minutes." },
    { id: "greatness", label: "Inspire Greatness", minimumLevel: 9, summary: "Apply Inspire Greatness for 10 minutes." },
    { id: "heroics", label: "Inspire Heroics", minimumLevel: 15, summary: "Apply Inspire Heroics for 10 minutes." },
  ],
  activeEffect: tracker("Tea Ceremony", ["allies"], "{amount} selected allies gain the chosen inspiration benefit for 10 minutes after the completed ceremony.", { defaultRounds: 100, fixedRounds: true, replaceExisting: true }),
  summary: "Spend four performance rounds per selected ally; the app enforces the remaining-round limit and unlock levels.",
}];
Object.assign(knowledge, { type: "selectable", choiceRequired: true, optionGroupId: "bard-geisha-performance-categories", progressionKey: "bard-geisha-knowledge" });
geisha.value.skillBonusAdjustments = ["Craft (calligraphy)", "Diplomacy", "Knowledge (nobility)"].map((skill) => ({ sourceFeatureId: knowledge.id, skill, minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 1 }));
knowledge.resourceActions = [
  ["act", "Perform (act)"], ["dance", "Perform (dance)"], ["oratory", "Perform (oratory)"], ["percussion", "Perform (percussion)"], ["string", "Perform (string instruments)"], ["sing", "Perform (sing)"],
].map(([id, skill]) => ({ id: `geisha-knowledge-${id}`, label: `Apply Geisha Knowledge — ${skill}`, minimumLevel: 1, classId: "bard", requiredOptionId: `bard-geisha-performance-${id}`, activeEffect: { name: `Geisha Knowledge — ${skill}`, targets: ["skillChecks"], bonus: 0, bonusByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, bonus: Math.max(1, Math.floor((index + 1) / 2)) })), skillOptions: [skill], defaultRounds: 999, fixedRounds: true, replaceExisting: true, description: `Add half Bard level (minimum +1) to ${skill}; the check can be attempted untrained.` }, summary: "Activate the persistent tracker for the Perform category chosen above." }));
geisha.value.mechanicalCoverage = "full";
geisha.value.mechanicalNotes = ["Simple and chosen monk weapon proficiency, armor/shield spell failure, exact Tea Ceremony cost and duration, all Geisha Knowledge bonuses and the required Perform choice, untrained guidance, and Scribe Scroll are automated."];
await writeFile(new URL("packages/data/src/options/bard-geisha-monk-weapons.json", root), `${JSON.stringify({ id: "bard-geisha-monk-weapons", name: "Geisha Monk Weapon", classIds: ["bard"], options: [{ id: "bard-geisha-monk-weapon", name: "Chosen monk weapon", groupId: "bard-geisha-monk-weapons", classIds: ["bard"], minimumLevel: 1, prerequisites: [], benefit: "Gain proficiency with one weapon that has the monk special weapon quality.", choice: { key: "weapon", label: "Monk weapon", allowCustom: true }, source: aon("Geisha") }], source: aon("Geisha") }, null, 2)}\n`);
await writeFile(new URL("packages/data/src/options/bard-geisha-performance-categories.json", root), `${JSON.stringify({ id: "bard-geisha-performance-categories", name: "Geisha Knowledge Perform Skill", classIds: ["bard"], options: [["act", "Act"], ["dance", "Dance"], ["oratory", "Oratory"], ["percussion", "Percussion"], ["string", "String Instruments"], ["sing", "Sing"]].map(([id, name]) => ({ id: `bard-geisha-performance-${id}`, name, groupId: "bard-geisha-performance-categories", classIds: ["bard"], minimumLevel: 1, prerequisites: [], benefit: `Apply Geisha Knowledge to Perform (${name.toLowerCase()}).`, source: aon("Geisha") })), source: aon("Geisha") }, null, 2)}\n`);

const juggler = await load("bard-juggler");
const jugglerProficiency = feature(juggler.value, "bard-juggler-weapon-and-armor-proficiencies-1");
const reactions = feature(juggler.value, "bard-juggler-fast-reactions-ex-1");
const juggling = feature(juggler.value, "bard-juggler-combat-juggling-ex-2");
const evasion = feature(juggler.value, "bard-juggler-evasion-ex-2");
if (!jugglerProficiency || !reactions || !juggling || !evasion) throw new Error("Juggler features were not found.");
delete juggler.value.proficiencyAdjustments;
delete reactions.grantedFeatIds;
reactions.resourceActions = [{ id: "juggler-second-reaction", label: "Roll second Fast Reaction", minimumLevel: 11, classId: "bard", diceRoll: { label: "Second deflection or snatch", diceCountByLevel: [{ level: 11, count: 1 }], dieSidesByLevel: [{ level: 11, sides: 20 }], modifierInputLabel: "Base attack modifier", flatModifierByLevel: [{ level: 11, modifier: -5 }], targetDcInputLabel: "Incoming attack result", outcomesByMargin: [{ minimumMargin: 0, label: "deflected or snatched" }], failureLabel: "not deflected" }, summary: "Resolve the additional level-11 reaction with its −5 attack-roll penalty." }, { id: "juggler-third-reaction", label: "Roll third Fast Reaction", minimumLevel: 17, classId: "bard", diceRoll: { label: "Third deflection or snatch", diceCountByLevel: [{ level: 17, count: 1 }], dieSidesByLevel: [{ level: 17, sides: 20 }], modifierInputLabel: "Base attack modifier", flatModifierByLevel: [{ level: 17, modifier: -10 }], targetDcInputLabel: "Incoming attack result", outcomesByMargin: [{ minimumMargin: 0, label: "deflected or snatched" }], failureLabel: "not deflected" }, summary: "Resolve the additional level-17 reaction with its −10 attack-roll penalty." }];
juggling.resourceActions = [{
  id: "juggler-combat-juggling", label: "Begin Combat Juggling", minimumLevel: 2, classId: "bard", variableCost: { label: "Objects juggled", minimum: 1, maximumByLevel: [{ level: 2, maximum: 3 }, { level: 6, maximum: 4 }, { level: 10, maximum: 5 }, { level: 14, maximum: 6 }, { level: 18, maximum: 7 }] },
  activeEffect: tracker("Combat Juggling", ["self"], "Juggling {amount} one-handed objects. Fewer than three counts as a free hand; this grants weapon access, not additional attacks. A failed required Sleight of Hand check drops all but one object.", { defaultRounds: 999, fixedRounds: true, replaceExisting: true }),
  summary: "The object selector automatically follows the 3-to-7 level progression.",
}, {
  id: "juggler-maintain-concentration", label: "Maintain Combat Juggling", minimumLevel: 2, classId: "bard", diceRoll: { label: "Sleight of Hand", diceCountByLevel: [{ level: 2, count: 1 }], dieSidesByLevel: [{ level: 2, sides: 20 }], modifierInputLabel: "Sleight of Hand modifier", targetDcInputLabel: "Adjusted concentration DC", outcomesByMargin: [{ minimumMargin: 0, label: "continue juggling" }], failureLabel: "drop all juggled objects but one" }, summary: "Enter the concentration DC after treating spell level as twice the number of objects, then roll Sleight of Hand." }];
juggler.value.defenseAdjustments = [
  { sourceFeatureId: evasion.id, kind: "evasion", label: "Evasion", minimumLevel: 2, maximumLevel: 11, base: 0, qualifier: "evasion" },
  { sourceFeatureId: evasion.id, kind: "improvedEvasion", label: "Improved Evasion", minimumLevel: 12, base: 0, qualifier: "improved evasion" },
];
juggler.value.mechanicalCoverage = "full";
juggler.value.mechanicalNotes = ["Replacement proficiencies, both bonus feats, additional Fast Reaction rolls and penalties, Combat Juggling capacity/free-hand/concentration workflow, Evasion, and Improved Evasion are automated."];

const phrenologist = await load("bard-phrenologist");
const skullKnowledge = feature(phrenologist.value, "bard-phrenologist-phrenological-knowledge-ex-1");
const skullVersed = feature(phrenologist.value, "bard-phrenologist-skull-versed-ex-2");
const skullPerformance = feature(phrenologist.value, "bard-phrenologist-bardic-performance-1");
if (!skullKnowledge || !skullVersed || !skullPerformance) throw new Error("Phrenologist features were not found.");
phrenologist.value.skillBonusAdjustments = [{ sourceFeatureId: skullKnowledge.id, skill: "Knowledge (arcana)", minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 1, condition: "when using the phrenology occult skill unlock" }];
skullVersed.resourceActions = [{ id: "phrenologist-skull-versed", label: "Mark successful phrenology study", minimumLevel: 2, classId: "bard", activeEffect: { name: "Skull-Versed", targets: ["performanceSaveDc"], bonus: 2, defaultRounds: 999, fixedRounds: true, replaceExisting: true, description: "This studied creature takes −2 on saves against this Phrenologist's bardic performances; equivalently, the app adds +2 to their performance save DC." }, summary: "Activate after a successful phrenology skill-unlock use against the target." }];
skullPerformance.resourceActions = [{
  id: "phrenologist-skull-sonata", label: "Begin Skull Sonata", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1), modes: [{ id: "sonic", label: "Sonic damage", summary: "Only sonic damage triggers this extra damage." }],
  activeEffect: { name: "Skull Sonata", targets: ["damageRolls"], bonus: 1, bonusByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, bonus: Math.max(1, Math.floor((index + 1) / 2)) })), usesSelectedModeAsDamageType: true, defaultRounds: 1, replaceExisting: true, description: "Enemies within 30 feet that have skulls take this extra sonic damage each time they take sonic damage." },
  summary: "Spend one performance round; the extra sonic damage automatically equals half Bard level (minimum 1).",
}, {
  id: "phrenologist-in-your-head", label: "Begin In Your Head", minimumLevel: 3, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(3), savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" },
  targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 3, range: "400 feet + 40 feet per Bard level" }], effectsByLevel: [
    { level: 3, name: "In Your Head", description: "Functions as witness: shift sight and hearing between yourself and the target as a move action; you are blind and deaf while using the target's senses.", duration: { kind: "level-minutes" } },
    { level: 11, name: "In Your Head", description: "Functions as witness with the improved duration of 10 minutes per Bard level.", duration: { kind: "level-minutes", multiplier: 10 } },
    { level: 19, name: "In Your Head", description: "Functions as witness with the improved duration of 1 hour per Bard level.", duration: { kind: "level-hours" } },
  ] },
  summary: "Spend one performance round, resolve the exact Bard performance Will DC, and track the level-based witness duration.",
}, {
  id: "phrenologist-fingers-fascination", label: "Use Fingers of Fascination", minimumLevel: 1, classId: "bard", confirmations: [{ id: "fascinated", label: "The selected creature is fascinated by your performance", requiredForActivation: true }], activeEffect: tracker("Fingers of Fascination study", ["enemy"], "Use the phrenology skill unlock at range without touch or the helpless, willing, or paralyzed requirements; this does not spend its daily use.", { defaultRounds: 1, consumeOnUse: true }), summary: "Mark the no-touch, no-daily-use phrenology study on a fascinated creature." }];
phrenologist.value.mechanicalCoverage = "full";
phrenologist.value.mechanicalNotes = ["Psychic Sensitivity, conditional Phrenological Knowledge, Savant choice, Skull-Versed save adjustment, Skull Sonata damage scaling, In Your Head DC/range/duration, and Fingers of Fascination are automated."];

const prankster = await load("bard-prankster");
const prankPerformance = feature(prankster.value, "bard-prankster-bardic-performance-1");
const swap = feature(prankster.value, "bard-prankster-swap-ex-1");
if (!prankPerformance || !swap) throw new Error("Prankster features were not found.");
const mockTargetCounts = Array.from({ length: 7 }, (_, index) => ({ level: 1 + index * 3, count: index + 1 }));
prankPerformance.resourceActions = [{
  id: "prankster-begin-mock", label: "Begin Mock", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1), targetCountByLevel: mockTargetCounts,
  confirmations: [{ id: "valid-targets", label: "Every target is within 90 feet and can see, hear, understand, and pay attention to you", requiredForActivation: true }],
  activeEffect: tracker("Mock performance", ["enemy"], "Audible, visual, language-dependent, mind-affecting compulsion. Resolve each target's Will save with the separate button while maintaining this performance.", { defaultRounds: 1, replaceExisting: true }), summary: "Spend one performance round per round; the displayed target cap increases every three levels.",
}, {
  id: "prankster-resolve-mock", label: "Resolve Mock target", minimumLevel: 1, classId: "bard", savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" }, targetCountByLevel: mockTargetCounts,
  targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 1, range: "90 feet" }], effectsByLevel: [{ level: 1, name: "Mocked", description: "Angered and seeks to harm the Prankster. Remove after the target successfully attacks the Prankster or harms the Prankster with a damaging spell.", activeEffects: [effect("attackRolls", -2, "Mock — attacks", "−2 on attack rolls until the Mock ending condition is met."), effect("skillChecks", -2, "Mock — skills", "−2 on skill checks until the Mock ending condition is met.")], duration: { kind: "fixed-rounds", rounds: 999 } }], successEffect: { name: "Mock immunity", description: "This creature cannot be successfully mocked by this Prankster for 24 hours.", rounds: 999 } },
  summary: "Resolve one selected target at a time; failed saves apply both −2 penalties, while success tracks 24-hour immunity.",
}, {
  id: "prankster-punchline", label: "Tell Punchline", minimumLevel: 6, classId: "bard", actionTypeByLevel: [{ level: 6, actionType: "standard" }], confirmations: [{ id: "mocked-target", label: "The target is currently mocked by you", requiredForActivation: true }], savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" }, targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 6, range: "audible range" }], effectsByLevel: [{ level: 6, name: "Hideous Laughter", description: "Falls prone, can take no actions, and attempts a new save after its turn; language-dependent, mind-affecting compulsion.", duration: { kind: "level-rounds" } }] }, summary: "Costs no performance rounds and does not disrupt Mock; resolve hideous laughter against one mocked creature.",
}, {
  id: "prankster-mass-punchline", label: "Tell Mass Punchline", minimumLevel: 18, classId: "bard", actionTypeByLevel: [{ level: 18, actionType: "standard" }], confirmations: [{ id: "mocked-targets", label: "Every selected target is currently mocked by you", requiredForActivation: true }], savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" }, targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 18, range: "audible range" }], effectsByLevel: [{ level: 18, name: "Mass Hideous Laughter", description: "Falls prone, can take no actions, and attempts a new save after its turn; language-dependent, mind-affecting compulsion.", duration: { kind: "level-rounds" } }] }, summary: "Costs no performance rounds; resolve this once for each mocked creature selected without a target limit.",
}];
swap.resourceActions = [{ id: "prankster-swap", label: "Attempt Swap", minimumLevel: 1, classId: "bard", diceRoll: { label: "Sleight of Hand", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 20 }], modifierInputLabel: "Sleight of Hand modifier", targetDcInputLabel: "Target CMD", outcomesByMargin: [{ minimumMargin: 10, label: "swap succeeds and target remains unaware" }, { minimumMargin: 0, label: "swap succeeds" }], failureLabel: "swap fails" }, summary: "Makes the steal maneuver without provoking; exceeding CMD by 10 tracks the target's delayed awareness." }];
prankster.value.mechanicalCoverage = "full";
prankster.value.mechanicalNotes = ["Gnome eligibility, Mock target scaling/conditions/save/DC/penalties/immunity, free Punchline and Mass Punchline saves and durations, and the full Sleight-of-Hand-versus-CMD Swap resolution are automated."];

for (const record of [disciple, geisha, juggler, phrenologist, prankster]) await writeFile(record.url, `${JSON.stringify(record.value, null, 2)}\n`);
console.log(`Annotated five trickster Bard archetypes and generated ${curseSpellOptions.length} legal curse-spell options.`);
