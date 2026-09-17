import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (id) => {
  const url = new URL(`packages/data/src/archetypes/${id}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const write = ({ url, value }) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const writeJson = (path, value) => writeFile(new URL(path, root), `${JSON.stringify(value, null, 2)}\n`);
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const feature = (record, id) => features(record).find((candidate) => candidate.id === id);
const replaceFeatureFamily = (record, predicate, replacements) => {
  let inserted = false;
  for (const replacement of record.replacements) {
    const rebuilt = [];
    for (const candidate of replacement.features ?? []) {
      if (!predicate(candidate)) rebuilt.push(candidate);
      else if (!inserted) {
        rebuilt.push(...replacements);
        inserted = true;
      }
    }
    replacement.features = rebuilt;
  }
  if (!inserted) throw new Error(`${record.id}: feature family was not found`);
};
const bardStart = (minimumLevel = 1) => [
  { level: minimumLevel, actionType: minimumLevel >= 10 ? "swift" : "move" },
  ...(minimumLevel < 10 ? [{ level: 10, actionType: "swift" }] : []),
];
const save = () => ({ label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" });
const tracker = (name, description, extra = {}) => ({ name, targets: ["self"], bonus: 0, description, defaultRounds: 1, replaceExisting: true, ...extra });
const performance = (id, name, minimumLevel, summary, cost = 1) => ({ id, name, minimumLevel, kind: "active", resourceId: "bardicPerformance", cost, actionIds: [id], summary });
const buskerPerformance = (id, name, minimumLevel, summary, cost = 1) => ({ id, name, minimumLevel, kind: "active", resourceId: "buskerStunts", cost, actionIds: [id], summary });

// Dawnflower Dervish: faith lock, doubled personal dances, defensive casting, and cure quickening.
const dawnflower = await load("bard-dawnflower-dervish");
const dawnDeity = feature(dawnflower.value, "bard-dawnflower-dervish-deity-1");
const dawnBattle = feature(dawnflower.value, "bard-dawnflower-dervish-battle-dance-10");
const dervishDance = feature(dawnflower.value, "bard-dawnflower-dervish-dervish-dance-ex-1");
const spinning = feature(dawnflower.value, "bard-dawnflower-dervish-spinning-spellcaster-ex-5");
const whirl = feature(dawnflower.value, "bard-dawnflower-dervish-meditative-whirl-ex-8");
if (![dawnDeity, dawnBattle, dervishDance, spinning, whirl].every(Boolean)) throw new Error("Dawnflower Dervish source features were not found");
await writeJson("packages/data/src/options/bard-dawnflower-deity.json", {
  id: "bard-dawnflower-deity", name: "Dawnflower Dervish Deity", classIds: ["bard"], uniqueAcrossSelections: true,
  options: [{ id: "bard-dawnflower-deity-sarenrae", groupId: "bard-dawnflower-deity", name: "Sarenrae", classIds: ["bard"], minimumLevel: 1, prerequisites: [], benefit: "Worship Sarenrae. Abandoning or betraying this faith reverts the character to a standard Bard.", source: dawnflower.value.source }],
});
Object.assign(dawnDeity, { type: "selectable", choiceRequired: true, optionGroupId: "bard-dawnflower-deity", optionChoiceIds: ["bard-dawnflower-deity-sarenrae"] });
dawnDeity.resourceActions = [{ id: "dawnflower-faith-broken", label: "Suspend archetype after betraying the faith", minimumLevel: 1, classId: "bard", activeEffect: tracker("Dawnflower Dervish abilities suspended", "The character abandoned or betrayed Sarenrae and reverts to a standard Bard until the faith requirement is restored.", { defaultRounds: 999, fixedRounds: true }), summary: "Track the source-mandated loss of the archetype after abandoning or betraying Sarenrae." }];
dawnBattle.level = 1;
dawnBattle.performanceRules = [
  performance("dawnflower-inspire-courage", "Battle Dance — Inspire Courage", 1, "Double the normal bonuses for the Dervish only; light or no armor, no lingering."),
  performance("dawnflower-inspire-greatness", "Battle Dance — Inspire Greatness", 9, "Double the normal bonuses for the Dervish only; light or no armor, no lingering."),
  performance("dawnflower-inspire-heroics", "Battle Dance — Inspire Heroics", 15, "Double the normal bonuses for the Dervish only; light or no armor, no lingering."),
];
dawnBattle.resourceActions = [
  { id: "dawnflower-inspire-courage", label: "Begin doubled Inspire Courage dance", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardStart(1), confirmations: [{ id: "armor", label: "Wearing light or no armor", requiredForActivation: true }], activeEffect: { name: "Dawnflower Inspire Courage", targets: ["attackRolls", "weaponDamageRolls", "savingThrowsAgainstCharmAndFear"], applyToAllTargets: true, bonus: 2, bonusByLevel: [{ level: 1, bonus: 2 }, { level: 5, bonus: 4 }, { level: 11, bonus: 6 }, { level: 17, bonus: 8 }], defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "Doubled inspire courage bonuses affect only the Dawnflower Dervish and end immediately with the dance; Lingering Performance never applies." } },
  { id: "dawnflower-inspire-greatness", label: "Begin doubled Inspire Greatness dance", minimumLevel: 9, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardStart(9), confirmations: [{ id: "armor", label: "Wearing light or no armor", requiredForActivation: true }], diceRoll: { label: "Temporary hit points from two bonus Hit Dice", diceCountByLevel: [{ level: 9, count: 2 }], dieSidesByLevel: [{ level: 9, sides: 10 }], modifierInputLabel: "Twice Constitution modifier" }, activeEffect: { name: "Dawnflower Inspire Greatness", targets: ["attackRolls"], bonus: 4, defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "+4 competence on attacks; the roll result is the temporary hit points from 2 bonus Hit Dice for the Dervish only.", additionalEffectsByLevel: [{ minimumLevel: 9, name: "Dawnflower Inspire Greatness — Fortitude", target: "fortitude", bonus: 2, description: "+2 competence on Fortitude saves." }] } },
  { id: "dawnflower-inspire-heroics", label: "Begin doubled Inspire Heroics dance", minimumLevel: 15, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardStart(15), confirmations: [{ id: "armor", label: "Wearing light or no armor", requiredForActivation: true }], activeEffect: { name: "Dawnflower Inspire Heroics", targets: ["savingThrows"], bonus: 8, defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "+8 morale on all saves for the Dervish only.", additionalEffectsByLevel: [{ minimumLevel: 15, name: "Dawnflower Inspire Heroics — Armor Class", target: "armorClass", bonus: 8, description: "+8 dodge bonus to Armor Class." }] } },
];
dervishDance.grantedFeatId = "dervish-dance";
dawnflower.value.conditionalModifiers = [{ sourceFeatureId: spinning.id, label: "Spinning Spellcaster", condition: "concentration checks to cast defensively", minimumLevel: 5, base: 4 }];
dawnflower.value.resourceAdjustments = [{ resourceId: "meditativeWhirl", label: "Meditative Whirl", unit: "use", operation: "replace", minimumLevel: 8, base: 1, perInterval: 1, interval: 2, maximum: 7, refreshCadence: "day", sourceFeatureId: whirl.id }];
whirl.resourceActions = [{ id: "dawnflower-meditative-whirl", label: "Quicken a cure spell with Meditative Whirl", minimumLevel: 8, classId: "bard", resourceId: "meditativeWhirl", cost: 1, actionTypeByLevel: [{ level: 8, actionType: "move" }], confirmations: [{ id: "dance", label: "A battle dance is active", requiredForActivation: true }, { id: "cure", label: "The next spell is a cure spell", requiredForActivation: true }], activeEffect: tracker("Meditative Whirl", "The next cure spell is Quickened without changing its spell level or casting time; completing it also uses the required swift action.", { consumeOnUse: true }), summary: "Spend the daily use and move action, then track the Quickened cure spell." }];
dawnflower.value.mechanicalCoverage = "full";
dawnflower.value.mechanicalNotes = ["Sarenrae faith, doubled self-only Battle Dance modes and action timing, Dervish Dance, defensive concentration, and every daily Meditative Whirl use are automated."];

// Dervish Dancer: every dance mode, movement bonus, skill substitution, and mobile capstones.
const dancer = await load("bard-dervish-dancer");
const dancerBattle = feature(dancer.value, "bard-dervish-dancer-battle-dance-10");
const fleet = feature(dancer.value, "bard-dervish-dancer-fleet-su-19");
const versatile = feature(dancer.value, "bard-dervish-dancer-versatile-dance-ex-2");
const fury = feature(dancer.value, "bard-dervish-dancer-dance-of-fury-su-12");
const battleFury = feature(dancer.value, "bard-dervish-dancer-battle-fury-su-20");
if (![dancerBattle, fleet, versatile, fury, battleFury].every(Boolean)) throw new Error("Dervish Dancer source features were not found");
dancerBattle.level = 1;
dancerBattle.performanceRules = [
  performance("dancer-rain-of-blows", "Rain of Blows", 6, "Gain one extra full-attack weapon attack and scaling haste-like attack, AC, and Reflex bonuses."),
  performance("dancer-razors-kiss", "Razor's Kiss", 8, "Treat manufactured-weapon attacks as though they had Improved Critical."),
  performance("dancer-leaf-on-wind", "Leaf on the Wind", 14, "Spend a standard action each round for +6 AC and Reflex and healing equal to Bard level."),
];
dancerBattle.resourceActions = [
  { id: "dancer-rain-of-blows", label: "Begin Rain of Blows", minimumLevel: 6, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardStart(6), confirmations: [{ id: "armor", label: "Wearing light or no armor", requiredForActivation: true }, { id: "no-haste", label: "Not applying overlapping haste bonuses", requiredForActivation: true }], activeEffect: { name: "Rain of Blows", targets: ["attackRolls", "armorClass", "reflex"], applyToAllTargets: true, bonus: 1, bonusByLevel: [{ level: 6, bonus: 1 }, { level: 9, bonus: 2 }, { level: 12, bonus: 3 }, { level: 15, bonus: 4 }, { level: 18, bonus: 5 }], defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "Gain one extra attack at the highest bonus during a full attack plus the displayed attack, dodge AC, and Reflex bonuses; these do not stack with haste." } },
  { id: "dancer-razors-kiss", label: "Begin Razor's Kiss", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardStart(8), confirmations: [{ id: "armor", label: "Wearing light or no armor", requiredForActivation: true }], activeEffect: tracker("Razor's Kiss", "Manufactured-weapon attacks are treated as though they had Improved Critical; natural weapons and spells are unaffected."), summary: "Track the manufactured-weapon critical-range benefit while the dance is maintained." },
  { id: "dancer-leaf-on-wind", label: "Maintain Leaf on the Wind", minimumLevel: 14, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 14, actionType: "standard" }], confirmations: [{ id: "armor", label: "Wearing light or no armor", requiredForActivation: true }], activeEffect: { name: "Leaf on the Wind", targets: ["armorClass", "reflex"], applyToAllTargets: true, bonus: 6, defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "+6 dodge AC and Reflex for this round; if wounded, heal {classLevel} hit points." }, summary: "Spend one round and a standard action, apply both defenses, and record healing equal to Bard level." },
];
fleet.level = 1;
const fleetSteps = [{ level: 1, bonus: 10 }, { level: 5, bonus: 15 }, { level: 9, bonus: 20 }, { level: 13, bonus: 25 }, { level: 17, bonus: 30 }];
dancer.value.landSpeedAdjustments = [{ sourceFeatureId: fleet.id, minimumLevel: 1, bonus: 10, bonusByLevel: fleetSteps, bonusType: "enhancement", condition: "while performing a battle dance", timing: "beforeReduction", armorCategories: ["none", "light"], label: "Fleet while battle dancing" }];
fleet.resourceActions = [{ id: "dancer-fleet", label: "Apply Fleet during Battle Dance", minimumLevel: 1, classId: "bard", confirmations: [{ id: "dance", label: "A battle dance is active", requiredForActivation: true }, { id: "armor", label: "Wearing light or no armor", requiredForActivation: true }], activeEffect: { name: "Dervish Dancer Fleet", targets: ["landSpeed"], bonus: 10, bonusByLevel: fleetSteps, defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "Enhancement bonus to land speed while battle dancing." }, summary: "Apply the exact +10-to-+30 enhancement bonus while the dance continues." }];
dancer.value.skillBonusAdjustments = [{ sourceFeatureId: versatile.id, skill: "Perform (dance)", minimumLevel: 2, base: 0, levelDivisor: 2, minimum: 1 }];
versatile.resourceActions = [{ id: "dancer-versatile-dance", label: "Roll Acrobatics using Perform (dance)", minimumLevel: 2, classId: "bard", diceRoll: { label: "Perform (dance) check used as Acrobatics", diceCountByLevel: [{ level: 2, count: 1 }], dieSidesByLevel: [{ level: 2, sides: 20 }], modifierInputLabel: "Total Perform (dance) modifier", targetDcInputLabel: "Acrobatics DC", outcomesByMargin: [{ minimumMargin: 0, label: "Success" }], failureLabel: "Failure" }, summary: "Enter the full Perform (dance) modifier, including the automatic half-level bonus, and roll against the Acrobatics DC." }];
fury.resourceActions = [{ id: "dancer-dance-of-fury", label: "Use Dance of Fury", minimumLevel: 12, classId: "bard", actionTypeByLevel: [{ level: 12, actionType: "full-round" }], confirmations: [{ id: "dance", label: "A battle dance is active", requiredForActivation: true }], activeEffect: tracker("Dance of Fury", "Combine one full attack with one move, moving at least 5 feet between attacks; movement provokes attacks of opportunity."), summary: "Track the combined full attack and movement sequence." }];
battleFury.resourceActions = [{ id: "dancer-battle-fury", label: "Use Battle Fury", minimumLevel: 20, classId: "bard", actionTypeByLevel: [{ level: 20, actionType: "full-round" }], variableCost: { label: "Targets (maximum 20)", minimum: 1, maximum: 20 }, confirmations: [{ id: "dance", label: "A battle dance is active", requiredForActivation: true }], activeEffect: tracker("Battle Fury", "Move once and make one highest-bonus attack against each selected target that comes within reach, up to character level; movement provokes attacks of opportunity."), summary: "Choose up to 20 targets and track the capstone's move-and-strike sequence." }];
dancer.value.mechanicalCoverage = "full";
dancer.value.mechanicalNotes = ["All three special Battle Dances, Fleet scaling, Perform-to-Acrobatics substitution, Dance of Fury, and Battle Fury are automated."];

// Masked Performer: identity state, performances, five social-grace skills, and legal talent lists.
const masked = await load("bard-masked-performer");
const identity = feature(masked.value, "bard-masked-performer-dual-identity-ex-1");
const maskedPerformance = feature(masked.value, "bard-masked-performer-bardic-performance-1");
const social = feature(masked.value, "bard-masked-performer-social-grace-ex-2") ?? features(masked.value).find((candidate) => candidate.id.startsWith("bard-masked-performer-social-grace-"));
const talents = feature(masked.value, "bard-masked-performer-masked-talents-5") ?? features(masked.value).find((candidate) => candidate.id.startsWith("bard-masked-performer-masked-talent-"));
if (![identity, maskedPerformance, social, talents].every(Boolean)) throw new Error("Masked Performer source features were not found");
identity.resourceActions = [{ id: "masked-performer-identity", label: "Assume Masked Performer identity", minimumLevel: 1, classId: "bard", modeLabel: "Identity", modes: [{ id: "social", label: "Social identity", summary: "Use the social identity, its alignment, and selected Social Grace bonuses." }, { id: "masked", label: "Masked identity", summary: "Use the masked identity and its separately chosen alignment." }], actionTypeByLevel: [{ level: 1, actionType: "1-minute" }], activeEffect: tracker("Masked Performer identity", "The selected social or masked identity and its alignment are active.", { defaultRounds: 999, fixedRounds: true }), summary: "Track which identity and alignment currently apply." }];
const physicalSocialSkills = ["Acrobatics", "Bluff", "Climb", "Disguise", "Escape Artist", "Fly", "Handle Animal", "Intimidate", "Perform", "Ride", "Sleight of Hand", "Stealth", "Swim"];
maskedPerformance.performanceRules = [
  performance("masked-seamless-guise", "Seamless Guise", 1, "Spend 3 rounds for 1 hour of +10 on checks to remain in an established character.", 3),
  performance("masked-exaggerated-pose", "Exaggerated Pose", 3, "Choose a Strength-, Dexterity-, or Charisma-based skill for a scaling competence bonus."),
  performance("masked-stage-combat", "Stage Combat", 6, "Temporarily gain one eligible combat feat while maintaining the visual performance."),
  performance("masked-multiplicity-same", "Multiplicity of Masks — matching form", 18, "Disguise allies of the same size and type without a saving throw."),
  performance("masked-multiplicity-different", "Multiplicity of Masks — different form", 18, "Disguise allies of a different size or type; enemies may disbelieve."),
];
maskedPerformance.resourceActions = [
  { id: "masked-seamless-guise", label: "Begin Seamless Guise", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 3, actionTypeByLevel: [{ level: 1, actionType: "standard" }], confirmations: [{ id: "established", label: "The character has already been established; this is not the initial Perception check", requiredForActivation: true }], activeEffect: { name: "Seamless Guise", targets: ["skillChecks"], bonus: 10, skillOptions: ["Disguise", "Perform (act)"], defaultRounds: 600, fixedRounds: true, replaceExisting: true, description: "+10 to the chosen check to remain in the established character for 1 hour." }, summary: "Spend exactly 3 performance rounds and track the hour-long role-maintenance bonus." },
  { id: "masked-exaggerated-pose", label: "Begin or change Exaggerated Pose", minimumLevel: 3, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 3, actionType: "standard" }, { level: 7, actionType: "move" }, { level: 13, actionType: "swift" }], activeEffect: { name: "Exaggerated Pose", targets: ["skillChecks"], bonus: 2, bonusByLevel: [{ level: 3, bonus: 2 }, { level: 7, bonus: 3 }, { level: 11, bonus: 4 }, { level: 15, bonus: 5 }, { level: 19, bonus: 6 }], skillOptions: physicalSocialSkills, defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "Competence bonus on the chosen Strength-, Dexterity-, or Charisma-based skill; changing the skill is a swift action while maintained." }, summary: "Select the affected skill and apply the exact level-scaled competence bonus." },
  { id: "masked-stage-combat", label: "Begin Stage Combat", minimumLevel: 6, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 6, actionType: "standard" }, { level: 7, actionType: "move" }, { level: 13, actionType: "swift" }], featSelection: { label: "Combat feat", featType: "combat", source: "catalogue", countByLevel: [{ level: 6, count: 1 }], minimumCount: 1 }, activeEffect: tracker("Stage Combat", "Gain the selected eligible combat feat while the visual performance is maintained; limited-use expenditure persists if the feat is selected again."), summary: "The selector filters out possessed feats and uses the character's normal prerequisite evaluator." },
  { id: "masked-multiplicity-same", label: "Begin Multiplicity with matching forms", minimumLevel: 18, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 18, actionType: "swift" }], confirmations: [{ id: "range", label: "Affected allies are within 60 feet and can see the performer", requiredForActivation: true }, { id: "matching", label: "Each affected ally matches the chosen character's size and creature type", requiredForActivation: true }], activeEffect: { name: "Multiplicity of Masks", targets: ["allies"], bonus: 0, rangeByLevel: [{ level: 18, feet: 60 }], defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "No save. Enemies perceive affected allies as the chosen character; a successful attack reveals an ally, leaving range reverts that ally, and the source ally leaving ends the effect." }, summary: "Track the no-save glamer for matching size and creature type." },
  { id: "masked-multiplicity-different", label: "Begin Multiplicity with different forms", minimumLevel: 18, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 18, actionType: "swift" }], confirmations: [{ id: "range", label: "Affected allies are within 60 feet and can see the performer", requiredForActivation: true }], savingThrow: save(), targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 18, range: "60 feet" }], effectsByLevel: [{ level: 18, name: "Multiplicity of Masks", description: "Enemy fails to disbelieve the different-size or different-type glamer; successful attacks reveal individual allies and range rules still apply.", duration: { kind: "fixed-rounds", rounds: 1 } }] }, summary: "Resolve the exact Will save for enemies viewing a different-size or different-type form." },
];
const socialSkills = ["Appraise", "Bluff", "Craft", "Diplomacy", "Disguise", "Handle Animal", "Heal", "Intimidate", "Knowledge (arcana)", "Knowledge (dungeoneering)", "Knowledge (engineering)", "Knowledge (geography)", "Knowledge (history)", "Knowledge (local)", "Knowledge (nature)", "Knowledge (nobility)", "Knowledge (planes)", "Knowledge (religion)", "Linguistics", "Perform", "Profession", "Sense Motive", "Spellcraft", "Survival"];
await writeJson("packages/data/src/options/bard-masked-social-grace.json", { id: "bard-masked-social-grace", name: "Masked Performer Social Grace Skills", classIds: ["bard"], uniqueAcrossSelections: true, options: socialSkills.map((name) => ({ id: `bard-masked-social-grace-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, groupId: "bard-masked-social-grace", name, classIds: ["bard"], minimumLevel: 2, prerequisites: [], benefit: `While in the social identity, gain a +4 circumstance bonus on ${name} checks.`, source: masked.value.source })) });
const socialLevels = [2, 6, 10, 14, 18];
const socialFeatures = socialLevels.map((level, index) => ({ ...(index === 0 ? social : {}), id: `bard-masked-performer-social-grace-${level}`, name: `Social Grace Skill ${index + 1}`, level, type: "selectable", choiceRequired: true, optionGroupId: "bard-masked-social-grace", summary: `Choose a unique Intelligence-, Wisdom-, or Charisma-based skill other than Perception or Use Magic Device (${index + 1} of 5).` }));
replaceFeatureFamily(masked.value, (candidate) => candidate.id === "bard-masked-performer-social-grace-ex-2" || candidate.id.startsWith("bard-masked-performer-social-grace-"), socialFeatures);
socialFeatures[0].resourceActions = [{ id: "masked-social-grace", label: "Apply selected Social Grace bonus", minimumLevel: 2, classId: "bard", confirmations: [{ id: "social", label: "Currently in the social identity", requiredForActivation: true }], maximumActiveEffects: { name: "Social Grace", base: 1, levelDivisor: 4, maximum: 5 }, activeEffect: { name: "Social Grace", targets: ["skillChecks"], bonus: 4, skillOptions: socialSkills, defaultRounds: 999, fixedRounds: true, description: "+4 circumstance bonus on a skill selected in the Social Grace option cards while in the social identity." }, summary: "Apply one persistent effect for each selected Social Grace skill; the level-aware limit is 1–5." }];
const basicTalents = [
  ["expert-leaper", "Expert Leaper", "Always count as having a running start for Acrobatics jumps and reduce effective falling distance."],
  ["fast-stealth", "Fast Stealth", "Move at full speed while using Stealth without penalty."],
  ["ledge-walker", "Ledge Walker", "Move at full speed across narrow surfaces without becoming flat-footed."],
  ["rogue-crawl", "Rogue Crawl", "Crawl at half speed and take 5-foot steps while prone."],
  ["rope-master", "Rope Master", "Move normally while climbing with rope, take 10 balancing under pressure, and add +4 to escape DCs for bonds you tie."],
  ["stand-up", "Stand Up", "Stand from prone as a free action while still provoking normally."],
  ["wall-scramble", "Wall Scramble", "Roll Climb twice and take the better result, with the talent's special interactions for multiple-roll effects."],
];
const advancedTalents = [
  ["defensive-roll", "Defensive Roll", "Once per day, attempt the talent's Reflex save to halve damage from a potentially lethal blow."],
  ["fast-tumble", "Fast Tumble", "Move at full speed through threatened areas without the usual +10 Acrobatics DC increase."],
  ["hide-in-plain-sight", "Hide in Plain Sight", "Choose one favored terrain and use Stealth there while observed."],
  ["skill-mastery", "Skill Mastery", "Choose 3 + Intelligence modifier skills and take 10 with them under stress."],
];
const maskedTalentOptions = [...basicTalents, ...advancedTalents].map(([id, name, benefit], index) => ({ id: `bard-masked-talent-${id}`, groupId: "bard-masked-talents", name, classIds: ["bard"], minimumLevel: index < basicTalents.length ? 5 : 17, prerequisites: [], benefit, source: masked.value.source }));
await writeJson("packages/data/src/options/bard-masked-talents.json", { id: "bard-masked-talents", name: "Masked Performer Talents", classIds: ["bard"], uniqueAcrossSelections: true, options: maskedTalentOptions });
const talentFeatures = [
  { ...talents, id: "bard-masked-performer-masked-talent-5", name: "Masked Talent 1", level: 5, type: "selectable", choiceRequired: true, optionGroupId: "bard-masked-talents", optionChoiceIds: basicTalents.map(([id]) => `bard-masked-talent-${id}`), summary: "Choose one of the seven permitted basic rogue talents; this does not qualify for Extra Rogue Talent." },
  { ...talents, id: "bard-masked-performer-masked-talent-17", name: "Masked Talent 2", level: 17, type: "selectable", choiceRequired: true, optionGroupId: "bard-masked-talents", optionChoiceIds: maskedTalentOptions.map(({ id }) => id), summary: "Choose another permitted basic talent or one of the four permitted advanced talents." },
];
replaceFeatureFamily(masked.value, (candidate) => candidate.id === "bard-masked-performer-masked-talents-5" || candidate.id.startsWith("bard-masked-performer-masked-talent-"), talentFeatures);
masked.value.mechanicalCoverage = "full";
masked.value.mechanicalNotes = ["Dual identity, all four performances, exact Social Grace progression and legal skills, and both level-gated Masked Talent selections are automated."];

// Busker: replace the standard performance pool with complete, clickable stunt workflows.
const busker = await load("bard-busker");
const buskerPerformanceFeature = feature(busker.value, "bard-busker-bardic-performance-1");
const stunts = feature(busker.value, "bard-busker-busker-stunts-su-1");
const flexible = feature(busker.value, "bard-busker-flexible-performer-ex-1");
if (![buskerPerformanceFeature, stunts, flexible].every(Boolean)) throw new Error("Busker source features were not found");
busker.value.removesBardicPerformance = true;
busker.value.resourceAdjustments = [{ resourceId: "buskerStunts", label: "Busker Stunts", unit: "round", operation: "replace", minimumLevel: 1, base: 4, abilityModifier: "charisma", minimum: 0, refreshCadence: "day", sourceFeatureId: stunts.id }];
buskerPerformanceFeature.progressionProfiles = [{ id: "busker-performance-replacement", label: "Performance replacement", classId: "bard", columns: [{ id: "benefit", label: "Rule" }], steps: [{ level: 1, values: { benefit: "No Bardic Performance pool or standard performances; use Busker Stunts below." } }], summary: "Busker Stunts count as bardic performance for interactions but use their own 4 + Charisma rounds per day." }];
stunts.performanceRules = [
  buskerPerformance("busker-quick-hands", "Quick Hands", 1, "Gain scaling haste-like bonuses and, from level 5, an extra full-attack attack."),
  buskerPerformance("busker-patter", "Patter", 1, "Ask one eligible creature within 30 feet a yes/no question each round; Will negates."),
  buskerPerformance("busker-living-statue", "Living Statue", 3, "Oppose observers' Sense Motive with Bluff to appear paralyzed, dead, or a statue."),
  buskerPerformance("busker-fascinate", "Fascinate", 6, "Fascinate creatures as the Bard performance."),
  buskerPerformance("busker-suggestion", "Suggestion", 8, "Implant a suggestion in a creature fascinated by the stunt."),
  buskerPerformance("busker-inventive-juggler", "Inventive Juggler", 9, "Threaten with thrown weapons at scaling reach."),
  buskerPerformance("busker-impossible-sleight", "Impossible Sleight of Hand", 15, "Store or retrieve one object from the 8,000-cubic-foot, 8,000-pound personal space."),
];
const quickSteps = [{ level: 1, bonus: 1 }, { level: 5, bonus: 2 }, { level: 11, bonus: 3 }, { level: 17, bonus: 4 }];
stunts.resourceActions = [
  { id: "busker-quick-hands", label: "Begin Quick Hands", minimumLevel: 1, classId: "bard", resourceId: "buskerStunts", cost: 1, actionTypeByLevel: [{ level: 1, actionType: "swift" }], activeEffect: { name: "Quick Hands", targets: ["skillChecks"], bonus: 1, bonusByLevel: quickSteps, skillOptions: ["Acrobatics"], defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "Competence bonus on Acrobatics; from level 5, gain one extra highest-bonus attack during a full attack as haste.", additionalEffectsByLevel: [{ minimumLevel: 1, name: "Quick Hands — Armor Class", target: "armorClass", bonus: 1, bonusByLevel: quickSteps, description: "Scaling dodge bonus to Armor Class." }, { minimumLevel: 1, name: "Quick Hands — Reflex", target: "reflex", bonus: 1, bonusByLevel: quickSteps, description: "Scaling dodge bonus on Reflex saves." }, { minimumLevel: 1, name: "Quick Hands — attacks", target: "attackRolls", bonus: 1, bonusByLevel: quickSteps, description: "Scaling haste-like bonus on attack rolls." }] }, summary: "Spend one stunt round and apply all four exact level-scaled bonuses." },
  { id: "busker-patter", label: "Use Patter", minimumLevel: 1, classId: "bard", resourceId: "buskerStunts", cost: 1, actionTypeByLevel: [{ level: 1, actionType: "standard" }], confirmations: [{ id: "eligible", label: "Target is within 30 feet, sees and hears you, is indifferent or better, and is not threatened or in combat", requiredForActivation: true }], savingThrow: save(), targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 1, range: "30 feet" }], effectsByLevel: [{ level: 1, name: "Patter answer", description: "The target must truthfully answer one yes/no question to the best of its ability; this is language-dependent and mind-affecting.", duration: { kind: "fixed-rounds", rounds: 1 } }] }, summary: "Resolve the exact Will save for the round's question." },
  { id: "busker-patter-observer", label: "Conceal Patter from an observer", minimumLevel: 1, classId: "bard", diceRoll: { label: "Bluff opposed by Sense Motive", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 20 }], modifierInputLabel: "Busker Bluff modifier", targetDcInputLabel: "Observer Sense Motive result", outcomesByMargin: [{ minimumMargin: 0, label: "Observer does not notice" }], failureLabel: "Observer notices the exchange" }, summary: "Roll separately for each observer, including the questioned creature even after a successful Will save." },
  { id: "busker-living-statue", label: "Begin Living Statue", minimumLevel: 3, classId: "bard", resourceId: "buskerStunts", cost: 1, actionTypeByLevel: [{ level: 3, actionType: "standard" }], diceRoll: { label: "Bluff opposed by Sense Motive", diceCountByLevel: [{ level: 3, count: 1 }], dieSidesByLevel: [{ level: 3, sides: 20 }], modifierInputLabel: "Busker Bluff modifier", targetDcInputLabel: "Observer Sense Motive result", outcomesByMargin: [{ minimumMargin: 0, label: "Observer is fooled" }], failureLabel: "Observer sees through the stunt" }, activeEffect: tracker("Living Statue", "Appear paralyzed, dead, or—as appropriate to the disguise—a statue. Magical detection also fails for fooled observers; any physical action ends the stunt."), summary: "Spend one round, roll the opposed check, and track the motionless state." },
  { id: "busker-fascinate", label: "Begin Busker Fascinate", minimumLevel: 6, classId: "bard", resourceId: "buskerStunts", cost: 1, actionTypeByLevel: [{ level: 6, actionType: "standard" }], targetCountByLevel: [{ level: 6, count: 2 }, { level: 7, count: 3 }, { level: 10, count: 4 }, { level: 13, count: 5 }, { level: 16, count: 6 }, { level: 19, count: 7 }], savingThrow: save(), targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 6, range: "90 feet" }], effectsByLevel: [{ level: 6, name: "Fascinated", description: "The attentive target is fascinated while the stunt continues, following normal Bard fascinate restrictions.", duration: { kind: "fixed-rounds", rounds: 1 } }] }, summary: "Resolve Fascinate with the Busker's stunt pool and level-aware target count." },
  { id: "busker-suggestion", label: "Use Busker Suggestion", minimumLevel: 8, classId: "bard", resourceId: "buskerStunts", cost: 1, actionTypeByLevel: [{ level: 8, actionType: "standard" }], confirmations: [{ id: "fascinated", label: "Target is currently fascinated by this Busker", requiredForActivation: true }], savingThrow: save(), targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 8, range: "90 feet" }], effectsByLevel: [{ level: 8, name: "Busker Suggestion", description: "Target follows the implanted reasonable suggestion under the normal spell and Bard performance rules.", duration: { kind: "level-hours" } }] }, summary: "Spend one stunt round and resolve the exact Will DC." },
  { id: "busker-inventive-juggler", label: "Begin Inventive Juggler", minimumLevel: 9, classId: "bard", resourceId: "buskerStunts", cost: 1, actionTypeByLevel: [{ level: 9, actionType: "standard" }, { level: 13, actionType: "move" }], modes: [{ id: "reach", label: "Reach weapon distance", summary: "Threaten with thrown weapons as a reach weapon." }, { id: "plus-10", label: "+10 feet", minimumLevel: 12, maximumLevel: 14, summary: "Threaten 10 feet farther than the base reach-weapon distance." }, { id: "plus-20", label: "+20 feet", minimumLevel: 15, maximumLevel: 17, summary: "Threaten 20 feet farther than the base reach-weapon distance." }, { id: "plus-30", label: "+30 feet", minimumLevel: 18, summary: "Threaten 30 feet farther than the base reach-weapon distance." }], activeEffect: tracker("Inventive Juggler", "Thrown weapons, including improvised thrown weapons, threaten at the selected reach tier while the stunt is maintained."), summary: "Select and track the exact level-gated thrown-weapon reach tier." },
  { id: "busker-impossible-sleight", label: "Store or retrieve an object", minimumLevel: 15, classId: "bard", resourceId: "buskerStunts", variableCost: { label: "Stunt rounds (Fine 1 through Colossal 9)", minimum: 1, maximum: 9 }, actionTypeByLevel: [{ level: 15, actionType: "standard" }], confirmations: [{ id: "capacity", label: "The space remains within 8,000 cubic feet and 8,000 pounds", requiredForActivation: true }], activeEffect: tracker("Impossible Sleight of Hand access", "Instantly store or retrieve one object. Cost is 1 round for Fine plus 1 per size category; all contents spill into your space on death."), summary: "Choose the exact size-based cost and record one access to the personal extradimensional space." },
];
flexible.resourceActions = [
  { id: "busker-earn-money", label: "Roll a Flexible Performer day job", minimumLevel: 1, classId: "bard", modeLabel: "Skill", modes: ["Acrobatics", "Disguise", "Sleight of Hand", "Stealth"].map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, summary: `Use ${label} instead of Perform to earn money.` })), diceRoll: { label: "Day job check", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 20 }], modifierInputLabel: "Selected skill modifier", targetDcInputLabel: "Earning DC", outcomesByMargin: [{ minimumMargin: 0, label: "Success" }], failureLabel: "Failure" }, summary: "Choose one of the four legal skills and resolve the earning check." },
  { id: "busker-bluff-diplomacy", label: "Roll Diplomacy using Bluff", minimumLevel: 1, classId: "bard", diceRoll: { label: "Diplomacy check using Bluff", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 20 }], modifierInputLabel: "Bluff modifier", targetDcInputLabel: "Diplomacy DC", outcomesByMargin: [{ minimumMargin: 0, label: "Success" }], failureLabel: "Failure" }, summary: "Enter the Bluff modifier in place of Diplomacy and resolve the check." },
];
busker.value.mechanicalCoverage = "full";
busker.value.mechanicalNotes = ["The standard performance pool is removed; 4 + Charisma Busker Stunts, all seven stunt workflows, exact DCs and scaling, and both Flexible Performer substitutions are automated."];

await Promise.all([dawnflower, dancer, masked, busker].map(write));
console.log(`Annotated four dance/stage Bard archetypes with ${socialSkills.length} Social Grace skills and ${maskedTalentOptions.length} Masked Talents.`);
