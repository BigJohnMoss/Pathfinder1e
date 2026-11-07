import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (id) => {
  const url = new URL(`packages/data/src/archetypes/${id}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const feature = (record, ...ids) => features(record).find((candidate) => ids.includes(candidate.id));
const write = (url, value) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const bardSpeed = (minimumLevel = 1) => [
  { level: minimumLevel, actionType: minimumLevel >= 13 ? "swift" : minimumLevel >= 7 ? "move" : "standard" },
  ...(minimumLevel < 7 ? [{ level: 7, actionType: "move" }] : []),
  ...(minimumLevel < 13 ? [{ level: 13, actionType: "swift" }] : []),
];
const tracker = (name, targets, description, extra = {}) => ({ name, targets, bonus: 0, description, ...extra });
const save = (label = "Will") => ({ label, ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" });
const skillScaling = (sourceFeatureId, skills, minimumLevel = 1, extra = {}) => skills.map((skill) => ({ sourceFeatureId, skill, minimumLevel, base: 0, levelDivisor: 2, minimum: 1, ...extra }));
const dailyResource = (resourceId, label, minimumLevel, interval, maximum) => ({ resourceId, label, unit: "use", operation: "replace", minimumLevel, base: 1, perInterval: 1, interval, maximum, refreshCadence: "day" });
const fixedCheck = (id, label, minimumLevel, resourceId, modes, result = 20, extra = {}) => ({
  id, label, minimumLevel, classId: "bard", resourceId, cost: 1,
  actionTypeByLevel: [{ level: minimumLevel, actionType: "standard" }],
  modeLabel: "Skill", modes,
  fixedD20Result: { label: "Natural d20 result", result, ...extra },
  summary: `Spend one daily use and treat the selected check's natural d20 result as ${result}.`,
});
const targetEffect = (modifier, level, name, description, duration, extra = {}) => ({ modifier, rangeByLevel: [{ level, range: "30 feet" }], effectsByLevel: [{ level, name, description, duration }], ...extra });

const wit = await load("bard-wit");
const wayWords = feature(wit.value, "bard-wit-way-with-words-ex-4", "bard-wit-way-with-words-ex-1");
const counterargument = feature(wit.value, "bard-wit-counterargument-1");
const witPerformance = feature(wit.value, "bard-wit-bardic-performance-3");
const quickWitted = feature(wit.value, "bard-wit-quick-witted-ex-2");
const onBall = feature(wit.value, "bard-wit-on-the-ball-ex-5");
const duelMaster = feature(wit.value, "bard-wit-duel-master-ex-10");
if (![wayWords, counterargument, witPerformance, quickWitted, onBall, duelMaster].every(Boolean)) throw new Error("Wit source features were not found");
wayWords.id = "bard-wit-way-with-words-ex-1";
wayWords.level = 1;
const wayWordsSteps = [{ level: 1, bonus: 1 }, { level: 4, bonus: 2 }, { level: 8, bonus: 3 }, { level: 12, bonus: 4 }, { level: 16, bonus: 5 }, { level: 20, bonus: 6 }];
wit.value.skillBonusAdjustments = ["Bluff", "Diplomacy", "Intimidate", "Linguistics", "Sense Motive"].map((skill) => ({ sourceFeatureId: wayWords.id, skill, minimumLevel: 1, base: 1, bonusByLevel: wayWordsSteps }));
wayWords.progressionProfiles = [{ id: "wit-verbal-duel-edges", label: "Way with Words edges", classId: "bard", columns: [{ id: "edges", label: "Starting verbal-duel edges" }], steps: wayWordsSteps.map(({ level, bonus }) => ({ level, values: { edges: bonus } })), summary: "The starting edge count equals the current Way with Words bonus." }];
counterargument.performanceRules = [{ id: "wit-counterargument", name: "Counterargument", minimumLevel: 1, kind: "passive", summary: "Countersong must use Perform (act), Perform (comedy), or Perform (oratory).", condition: "Use one of the three permitted Perform skills" }];
witPerformance.resourceActions = [
  {
    id: "wit-cutting-remark", label: "Deliver Cutting Remark", minimumLevel: 3, classId: "bard", resourceId: "bardicPerformance", cost: 1,
    actionTypeByLevel: bardSpeed(3),
    diceRoll: { label: "Nonlethal damage", diceCountByLevel: [{ level: 3, count: 1 }], dieSidesByLevel: [{ level: 3, sides: 4 }], flatModifierByLevel: Array.from({ length: 18 }, (_, index) => ({ level: index + 3, modifier: index + 3 })) },
    activeEffect: tracker("Cutting Remark", ["enemy"], "Mind-affecting, language-dependent magical nonlethal damage within 30 feet; damage reduction applies.", { defaultRounds: 1, additionalEffectsByLevel: [{ minimumLevel: 8, name: "Cutting Remark — Sickened", target: "enemy", bonus: 0, description: "Sickened while within 30 feet and for 1 round thereafter." }] }),
    summary: "Spend 1 performance round, roll 1d4 + Bard level nonlethal damage, and track the level-8 sickened rider.",
  },
  {
    id: "wit-cutting-remark-daze", label: "Resolve Cutting Remark Daze", minimumLevel: 14, classId: "bard", resourceId: "bardicPerformance", cost: 0, minimumResourceRemaining: 1,
    actionTypeByLevel: [{ level: 14, actionType: "free" }], confirmations: [{ id: "damaged", label: "The target took damage from this Cutting Remark", requiredForActivation: true }], savingThrow: save("Will"),
    targetEffectRoll: targetEffect("will", 14, "Cutting Remark — Dazed", "Dazed for 1 round.", { kind: "fixed-rounds", rounds: 1 }, { successEffect: { name: "Cutting Remark daze immunity", description: "Immune to this Wit's Cutting Remark daze for 24 hours.", rounds: 999 } }),
    summary: "Resolve the level-14 Will save without spending another performance round; track daze or 24-hour immunity.",
  },
];
wit.value.initiativeAdjustments = [{ sourceFeatureId: quickWitted.id, label: "Quick Witted", minimumLevel: 2, base: 0, levelDivisor: 2, minimum: 1 }];
quickWitted.progressionProfiles = [{ id: "wit-surprise-round", label: "Quick Witted surprise round", classId: "bard", columns: [{ id: "benefit", label: "Benefit" }], steps: [{ level: 2, values: { benefit: "Always act in a surprise round; remain flat-footed until acting" } }], summary: "The surprise-round permission is always visible alongside the calculated initiative bonus." }];
wit.value.resourceAdjustments = [dailyResource("onTheBall", "On the Ball", 5, 6, 3)];
onBall.resourceActions = [fixedCheck("wit-on-the-ball", "Use On the Ball", 5, "onTheBall", [{ id: "initiative", label: "Initiative", summary: "Replace the initiative d20 roll with the current fixed result." }], 10, { resultByLevel: [{ level: 5, result: 10 }, { level: 20, result: 20 }] })];
duelMaster.progressionProfiles = [{ id: "wit-duel-master-rules", label: "Duel Master", classId: "bard", columns: [{ id: "benefit", label: "Verbal-duel benefit" }], steps: [{ level: 10, values: { benefit: "Ignore extreme-disadvantage edge loss; discover/seed one extra bias; reassign one tactic skill once per duel" } }], summary: "All passive Duel Master permissions are recorded." }];
duelMaster.resourceActions = [{ id: "wit-duel-master-reassignment", label: "Record Duel Master Reassignment", minimumLevel: 10, classId: "bard", actionTypeByLevel: [{ level: 10, actionType: "free" }], confirmations: [{ id: "verbal-duel", label: "A verbal duel is in progress and this is the once-per-duel reassignment", requiredForActivation: true }], activeEffect: tracker("Duel Master Reassignment Used", ["self"], "One appropriate skill was reassigned to an unassigned tactic; the original tactic is unprepared for the rest of this verbal duel.", { defaultRounds: 999, fixedRounds: true, replaceExisting: true }), summary: "Track the single skill reassignment allowed in each verbal duel." }];
wit.value.mechanicalCoverage = "full";
wit.value.mechanicalNotes = ["Way with Words, verbal-duel edges, Counterargument restrictions, Cutting Remark damage/riders, initiative, On the Ball uses/results, and Duel Master tracking are automated."];

const fey = await load("bard-fey-prankster");
const talent = feature(fey.value, "bard-fey-prankster-mischievous-talent-ex-1");
const feyPerformance = feature(fey.value, "bard-fey-prankster-bardic-performance-1");
const satire = feature(fey.value, "bard-fey-prankster-embarrassing-satire-su-8");
const dirtyTrickster = feature(fey.value, "bard-fey-prankster-dirty-trickster-ex-2");
const mischief = feature(fey.value, "bard-fey-prankster-master-of-mischief-ex-5");
if (![talent, feyPerformance, satire, dirtyTrickster, mischief].every(Boolean)) throw new Error("Fey Prankster source features were not found");
fey.value.skillBonusAdjustments = skillScaling(talent.id, ["Bluff", "Disguise", "Sleight of Hand", "Stealth"]);
talent.progressionProfiles = [{ id: "fey-prankster-untrained-sleight", label: "Mischievous Talent permissions", classId: "bard", columns: [{ id: "skill", label: "Untrained skill" }], steps: [{ level: 1, values: { skill: "Sleight of Hand" } }], summary: "Sleight of Hand can be attempted untrained." }];
feyPerformance.resourceActions = [
  { id: "fey-prankster-song-clumsiness", label: "Begin Song of Clumsiness", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1), activeEffect: tracker("Song of Clumsiness", ["area"], "Enemies within 30 feet that can hear the performance save separately against each dropped-item or difficult-terrain mishap.", { defaultRounds: 1, replaceExisting: true }), summary: "Spend 1 performance round per round and track the audible 30-foot mishap aura." },
  { id: "fey-prankster-clumsiness-drop", label: "Resolve Song of Clumsiness — Drop", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 0, minimumResourceRemaining: 1, actionTypeByLevel: [{ level: 1, actionType: "free" }], confirmations: [{ id: "trigger", label: "The enemy drew a weapon or retrieved a stored item inside the active song", requiredForActivation: true }], savingThrow: save("Reflex"), targetEffectRoll: targetEffect("reflex", 1, "Song of Clumsiness — Dropped Item", "The triggering item is immediately dropped.", { kind: "fixed-rounds", rounds: 999 }), summary: "Resolve the separate Reflex save for a draw-or-retrieve trigger without an extra performance cost." },
  { id: "fey-prankster-clumsiness-prone", label: "Resolve Song of Clumsiness — Prone", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 0, minimumResourceRemaining: 1, actionTypeByLevel: [{ level: 1, actionType: "free" }], confirmations: [{ id: "trigger", label: "This is the enemy's first difficult-terrain square this turn inside the active song", requiredForActivation: true }], savingThrow: save("Reflex"), targetEffectRoll: targetEffect("reflex", 1, "Song of Clumsiness — Prone", "The target falls prone; remove the tracker when it stands.", { kind: "fixed-rounds", rounds: 999 }), summary: "Resolve the separate Reflex save for the first difficult-terrain entry without an extra performance cost." },
  { id: "fey-prankster-incite-unreliability", label: "Begin Incite Unreliability", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1), savingThrow: save("Will"), targetEffectRoll: targetEffect("will", 1, "Incite Unreliability", "Affected as lesser confusion while the target can hear the performance.", { kind: "fixed-rounds", rounds: 999 }, { successEffect: { name: "Incite Unreliability immunity", description: "Immune to this Fey Prankster's Incite Unreliability for 24 hours.", rounds: 999 } }), summary: "Spend 1 performance round, resolve the Will save, and track lesser confusion or 24-hour immunity." },
];
satire.resourceActions = [{ id: "fey-prankster-embarrassing-satire", label: "Begin Embarrassing Satire", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(8), activeEffect: tracker("Embarrassing Satire", ["enemy"], "The target is sickened while within 30 feet during the audible performance; facial boils remain for 1 day afterward.", { defaultRounds: 999, replaceExisting: true }), summary: "Spend 1 performance round per round and track the selected target's sickened condition and lingering boils." }];
dirtyTrickster.grantedFeatIds = ["improved-dirty-trick"];
dirtyTrickster.progressionProfiles = [{ id: "fey-prankster-dirty-trick-prerequisites", label: "Dirty Trickster prerequisites", classId: "bard", columns: [{ id: "benefit", label: "Benefit" }], steps: [{ level: 2, values: { benefit: "Counts as Combat Expertise for feats requiring Improved Dirty Trick" } }], summary: "Improved Dirty Trick is granted automatically and the prerequisite substitution remains visible." }];
fey.value.skillCheckRules = ["Bluff", "Disguise", "Sleight of Hand", "Stealth"].map((skill) => ({ sourceFeatureId: mischief.id, label: "Master of Mischief", minimumLevel: 5, skills: [skill], result: 10, allowsStress: true, trainedOnly: true }));
fey.value.resourceAdjustments = [dailyResource("masterOfMischiefTake20", "Master of Mischief take 20", 5, 6, 3)];
mischief.resourceActions = [fixedCheck("fey-prankster-master-mischief", "Use Master of Mischief Take 20", 5, "masterOfMischiefTake20", ["Bluff", "Disguise", "Sleight of Hand", "Stealth"].map((skill) => ({ id: skill.toLowerCase().replaceAll(" ", "-"), label: skill, summary: `Use the result for a trained ${skill} check.` })))];
fey.value.mechanicalCoverage = "full";
fey.value.mechanicalNotes = ["All skill scaling, untrained permission, four performance controls, Improved Dirty Trick, take 10 rules, and bounded take 20 uses are automated."];

const brazen = await load("bard-brazen-deceiver");
const tale = feature(brazen.value, "bard-brazen-deceiver-deceptive-tale-su-5", "bard-brazen-deceiver-deceptive-tale-su-1");
const scoundrel = feature(brazen.value, "bard-brazen-deceiver-shameless-scoundrel-ex-1");
const subtlety = feature(brazen.value, "bard-brazen-deceiver-blatant-subtlety-ex-2");
const invoke = feature(brazen.value, "bard-brazen-deceiver-invoke-vyriavaxus-ex-2");
const tongue = feature(brazen.value, "bard-brazen-deceiver-devil-s-tongue-ex-5");
if (![tale, scoundrel, subtlety, invoke, tongue].every(Boolean)) throw new Error("Brazen Deceiver source features were not found");
tale.id = "bard-brazen-deceiver-deceptive-tale-su-1";
tale.level = 1;
tale.resourceActions = [{ id: "brazen-deceptive-tale", label: "Begin Deceptive Tale", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1), modeLabel: "Lie category", modes: [
  { id: "unlikely", label: "Unlikely lie", minimumLevel: 1, summary: "Halve the normal penalty, rounding down to −2." },
  { id: "far-fetched", label: "Far-fetched lie", minimumLevel: 5, summary: "Halve the normal penalty for a far-fetched lie." },
  { id: "impossible", label: "Impossible lie", minimumLevel: 11, summary: "Halve the normal penalty for an impossible lie." },
], activeEffect: tracker("Deceptive Tale", ["self"], "The selected Bluff lie-category penalty is halved while the audible performance continues.", { defaultRounds: 1, replaceExisting: true }), summary: "Spend 1 performance round and select the exact lie category unlocked at the current level." }];
brazen.value.skillBonusAdjustments = skillScaling(scoundrel.id, ["Bluff", "Disguise", "Stealth"]);
subtlety.grantedFeatIds = ["spellsong"];
subtlety.progressionProfiles = [{ id: "brazen-performance-detection", label: "Blatant Subtlety detection DC", classId: "bard", columns: [{ id: "base", label: "Base DC before Charisma" }], steps: Array.from({ length: 19 }, (_, index) => ({ level: index + 2, values: { base: 10 + Math.floor((index + 2) / 2) } })), summary: "Observers specifically looking for abnormal effects roll Sense Motive against this base DC + the Brazen Deceiver's Charisma modifier." }];
invoke.progressionProfiles = [{ id: "brazen-shadow-spells", label: "Invoke Vyriavaxus spells known", classId: "bard", columns: [{ id: "spells", label: "Spells added" }], steps: [{ level: 2, values: { spells: "bleed; touch of fatigue" } }, { level: 6, values: { spells: "darkness; darkvision" } }, { level: 10, values: { spells: "shadow conjuration; shadow step" } }, { level: 14, values: { spells: "shadow evocation; shadow walk" } }, { level: 18, values: { spells: "greater shadow conjuration; greater shadow evocation" } }], summary: "Every fixed shadow spell is added automatically at its published Bard level." }];
brazen.value.skillCheckRules = [{ sourceFeatureId: tongue.id, label: "Devil's Tongue", minimumLevel: 5, skills: ["Bluff"], result: 10, allowsStress: true }];
brazen.value.resourceAdjustments = [dailyResource("devilsTongueTake20", "Devil's Tongue take 20", 5, 6, 3)];
tongue.resourceActions = [fixedCheck("brazen-devils-tongue", "Use Devil's Tongue Take 20", 5, "devilsTongueTake20", [{ id: "bluff", label: "Bluff", summary: "Use the result for a Bluff check." }])];
brazen.value.mechanicalCoverage = "full";
brazen.value.mechanicalNotes = ["Deceptive Tale tiers, Shameless Scoundrel bonuses, Spellsong and detection DCs, every shadow spell, and Devil's Tongue take 10/take 20 uses are automated."];

const provocateur = await load("bard-provocateur");
const provFeature = feature(provocateur.value, "bard-provocateur-provocateur-ex-1");
const calumny = feature(provocateur.value, "bard-provocateur-calumny-ex-2");
const damning = feature(provocateur.value, "bard-provocateur-damning-performance-su-4");
if (![provFeature, calumny, damning].every(Boolean)) throw new Error("Provocateur source features were not found");
provocateur.value.skillBonusAdjustments = skillScaling(provFeature.id, ["Bluff", "Diplomacy", "Intimidate"], 1, { condition: "Checks to reduce a target's influence or attitude toward another creature or organization" });
calumny.resourceActions = [{ id: "provocateur-calumny", label: "Roll Calumny", minimumLevel: 2, classId: "bard", actionTypeByLevel: [{ level: 2, actionType: "standard" }], modeLabel: "Check replaced", modes: [
  { id: "rumor-bluff", label: "Spread rumor — Bluff", summary: "Use Perform (comedy, oratory, or sing) instead of Bluff." },
  { id: "rumor-diplomacy", label: "Spread rumor — Diplomacy", summary: "Use Perform (comedy, oratory, or sing) instead of Diplomacy." },
  { id: "demoralize", label: "Demoralize — Intimidate", summary: "Use Perform (comedy, oratory, or sing) instead of Intimidate." },
], diceRoll: { label: "Calumny check", diceCountByLevel: [{ level: 2, count: 1 }], dieSidesByLevel: [{ level: 2, sides: 20 }], modifierInputLabel: "Selected Perform modifier", targetDcInputLabel: "Check DC", outcomesByMargin: [{ minimumMargin: 0, label: "success" }], failureLabel: "failure" }, summary: "Select the replaced social check and roll with the configured qualifying Perform modifier." }];
damning.resourceActions = [{ id: "provocateur-damning-performance", label: "Begin Damning Performance", minimumLevel: 4, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(4), confirmations: [{ id: "fascinated", label: "The observers are currently fascinated by this character's Fascinate performance", requiredForActivation: true }], modeLabel: "Duration tier", modes: [
  { id: "minutes", label: "10 minutes per Bard level", minimumLevel: 4, maximumLevel: 17, summary: "Reduce attitude, influence, and contact trust one step for 10 minutes per Bard level; relevant information worsens attitude one extra step." },
  { id: "days", label: "1 day per Bard level", minimumLevel: 18, summary: "Reduce attitude, influence, and contact trust one step for 1 day per Bard level; relevant information worsens attitude one extra step." },
], activeEffect: tracker("Damning Performance", ["area"], "Affected observers' attitude, influence, and contact trust toward the named target are reduced one step; gain two automatic verbal-duel edges against that target.", { defaultRounds: 999, fixedRounds: true, replaceExisting: true }), summary: "Spend 1 performance round, enforce the Fascinate prerequisite, and track every social penalty, extra reduction, duration tier, and two-edge benefit." }];
provocateur.value.mechanicalCoverage = "full";
provocateur.value.mechanicalNotes = ["Influence and attitude bonuses, all three Calumny substitutions with rolls, and Damning Performance prerequisites, tiers, penalties, and verbal-duel edges are automated."];

const solacer = await load("bard-solacer");
const physician = feature(solacer.value, "bard-solacer-learned-physician-ex-5", "bard-solacer-learned-physician-ex-1");
const tenacity = feature(solacer.value, "bard-solacer-inspire-tenacity-su-1");
const treatment = feature(solacer.value, "bard-solacer-creative-treatment-su-2");
const artistry = feature(solacer.value, "bard-solacer-invigorating-artistry-su-10");
if (![physician, tenacity, treatment, artistry].every(Boolean)) throw new Error("Solacer source features were not found");
physician.id = "bard-solacer-learned-physician-ex-1";
physician.level = 1;
solacer.value.skillBonusAdjustments = skillScaling(physician.id, ["Heal"]);
physician.progressionProfiles = [{ id: "solacer-knowledge-permissions", label: "Learned Physician knowledge", classId: "bard", columns: [{ id: "benefit", label: "Benefit" }], steps: [{ level: 1, values: { benefit: "Attempt Knowledge checks untrained" } }, { level: 5, values: { benefit: "Take 10 on trained Knowledge checks, even when normal Take 10 is unavailable" } }], summary: "Knowledge permissions unlock at their published levels." }];
solacer.value.skillCheckRules = [{ sourceFeatureId: physician.id, label: "Learned Physician", minimumLevel: 5, skills: ["Knowledge (all)"], result: 10, allowsStress: true, trainedOnly: true }];
solacer.value.resourceAdjustments = [dailyResource("learnedPhysicianTake20", "Learned Physician take 20", 5, 6, 3), dailyResource("creativeTreatment", "Creative Treatment", 2, 4, 5)];
physician.resourceActions = [fixedCheck("solacer-learned-physician", "Use Learned Physician Take 20", 5, "learnedPhysicianTake20", [{ id: "heal", label: "Heal", summary: "Use the result for a Heal check without changing the task's normal time." }])];
tenacity.resourceActions = [{ id: "solacer-inspire-tenacity", label: "Begin Inspire Tenacity", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(1), activeEffect: tracker("Inspire Tenacity", ["allies"], "All allies within 30 feet who can hear the performance automatically stabilize while dying and gain +2 morale on saves against mind-affecting effects, poison, and disease.", { defaultRounds: 1, replaceExisting: true }), summary: "Spend 1 performance round per round and track automatic stabilization plus the exact conditional save bonus." }];
delete treatment.resourceActions;
treatment.progressionProfiles = [{ id: "solacer-confidante", label: "Creative Treatment confidante substitutions", classId: "bard", columns: [{ id: "benefit", label: "Benefit" }], steps: [{ level: 2, values: { benefit: "Use Charisma instead of Intelligence or Wisdom; add Charisma to sanity damage removed or half Charisma to madness-DC reduction" } }], summary: "The Horror Adventures advisor substitutions remain visible with the reroll control." }];
artistry.resourceActions = [{ id: "solacer-invigorating-artistry", label: "Perform Invigorating Artistry", minimumLevel: 10, classId: "bard", actionTypeByLevel: [{ level: 10, actionType: "1-hour" }], modeLabel: "Current protection bonus", modes: [
  { id: "plus-three", label: "+3", minimumLevel: 10, maximumLevel: 15, summary: "+3 on the listed saves for 24 hours." },
  { id: "plus-four", label: "+4", minimumLevel: 16, maximumLevel: 18, summary: "+4 on the listed saves for 24 hours." },
  { id: "plus-five", label: "+5", minimumLevel: 19, summary: "+5 on the listed saves for 24 hours." },
], activeEffect: tracker("Invigorating Artistry", ["allies"], "For 24 hours, apply the selected bonus against curses, possession, domination, mind control, and the next corruption progression save; each current listed effect receives one new save, at most once per condition per 24 hours.", { defaultRounds: 999, fixedRounds: true, replaceExisting: true }), summary: "Perform for 1 hour and track the exact level-scaled 24-hour protection, new saves, and corruption benefit." }];
solacer.value.mechanicalCoverage = "full";
solacer.value.mechanicalNotes = ["Class skills, Heal scaling, Knowledge permissions, take 10/take 20, Inspire Tenacity, Creative Treatment and confidante rules, and Invigorating Artistry are automated."];

await Promise.all([wit, fey, brazen, provocateur, solacer].map((record) => write(record.url, record.value)));
console.log("Annotated five social-specialist Bard archetypes.");
