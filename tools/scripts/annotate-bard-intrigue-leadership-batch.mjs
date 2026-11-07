import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (id) => {
  const url = new URL(`packages/data/src/archetypes/${id}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const write = ({ url, value }) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const named = (record, pattern) => features(record).find((candidate) => pattern.test(candidate.name));
const save = () => ({ label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" });
const tracker = (name, description, extra = {}) => ({
  name,
  targets: ["self"],
  bonus: 0,
  description,
  defaultRounds: 1,
  replaceExisting: true,
  ...extra,
});
const performance = (id, name, minimumLevel, summary, cost = 1) => ({
  id,
  name,
  minimumLevel,
  kind: "active",
  resourceId: "bardicPerformance",
  cost,
  actionIds: [id],
  summary,
});

// Buccaneer: nonlethal fighting, surrender performances, and Knock Out uses.
const buccaneer = await load("bard-buccaneer");
const hiltBash = named(buccaneer.value, /^Hilt Bash/);
const surrender = named(buccaneer.value, /^Song of Surrender/);
const knockOut = named(buccaneer.value, /^Knock Out/);
const massSurrender = named(buccaneer.value, /^Mass Song of Surrender/);
if (![hiltBash, surrender, knockOut, massSurrender].every(Boolean)) throw new Error("Buccaneer source features were not found");
hiltBash.resourceActions = [{
  id: "buccaneer-hilt-bash",
  label: "Use Hilt Bash for nonlethal damage",
  minimumLevel: 1,
  classId: "bard",
  activeEffect: tracker("Hilt Bash", "Manufactured weapons that normally deal lethal damage can deal nonlethal damage without the normal attack penalty."),
  summary: "Track penalty-free nonlethal attacks with weapon hilts and flats.",
}];
surrender.level = 4;
surrender.performanceRules = [performance("buccaneer-song-of-surrender", "Song of Surrender", 4, "One enemy within 30 feet drops held weapons and falls prone for 1 round unless it succeeds at the Bard performance Will save.")];
surrender.resourceActions = [{
  id: "buccaneer-song-of-surrender",
  label: "Perform Song of Surrender",
  minimumLevel: 4,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 1,
  actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  confirmations: [{ id: "eligible", label: "Target is within 30 feet and can see and hear the performance", requiredForActivation: true }],
  savingThrow: save(),
  targetEffectRoll: {
    modifier: "will",
    rangeByLevel: [{ level: 4, range: "30 feet" }],
    effectsByLevel: [{ level: 4, name: "Surrendering", description: "Drop held weapons and take no action next turn other than falling prone; the target is not flat-footed or helpless.", duration: { kind: "fixed-rounds", rounds: 1 } }],
  },
  summary: "Resolve the language-dependent, mind-affecting compulsion against one enemy.",
}];
buccaneer.value.resourceAdjustments = [{
  resourceId: "buccaneerKnockOut",
  label: "Knock Out",
  unit: "use",
  operation: "replace",
  minimumLevel: 5,
  base: 1,
  perInterval: 1,
  interval: 6,
  maximum: 3,
  refreshCadence: "day",
  sourceFeatureId: knockOut.id,
}];
knockOut.resourceActions = [{
  id: "buccaneer-knock-out",
  label: "Mark a Knock Out target",
  minimumLevel: 5,
  classId: "bard",
  resourceId: "buccaneerKnockOut",
  cost: 1,
  actionTypeByLevel: [{ level: 5, actionType: "swift" }],
  activeEffect: tracker("Knock Out target", "Add Charisma bonus to attack rolls and Bard level to nonlethal damage against the chosen target until nonlethal damage is dealt or a new target is chosen.", { defaultRounds: 999, fixedRounds: true }),
  summary: "Spend one daily use and track the chosen target and exact bonuses.",
}];
massSurrender.level = 16;
massSurrender.performanceRules = [performance("buccaneer-mass-song-of-surrender", "Mass Song of Surrender", 16, "All enemies within 30 feet individually save against Song of Surrender.")];
massSurrender.resourceActions = [{
  ...surrender.resourceActions[0],
  id: "buccaneer-mass-song-of-surrender",
  label: "Perform Mass Song of Surrender",
  minimumLevel: 16,
  targetEffectRoll: {
    ...surrender.resourceActions[0].targetEffectRoll,
    effectsByLevel: [{ level: 16, name: "Mass surrendering", description: "Each affected enemy drops held weapons and takes no action next turn other than falling prone; targets are not flat-footed or helpless.", duration: { kind: "fixed-rounds", rounds: 1 } }],
  },
  summary: "Resolve the Will save separately for every enemy within 30 feet.",
}];
buccaneer.value.mechanicalCoverage = "full";
buccaneer.value.mechanicalNotes = ["Penalty-free nonlethal attacks, both exact surrender performances and DCs, and the level-scaled Knock Out daily pool are automated."];

// Ringleader (AG): prepared performances, social substitutions, contingencies, and save defense.
const ringleaderAg = await load("bard-ringleader-ag");
const cunning = named(ringleaderAg.value, /^Cunning Plan/);
const neverLoseFace = named(ringleaderAg.value, /^Never Lose Face/);
const sinister = named(ringleaderAg.value, /^Sinister Mien/);
const contingencies = named(ringleaderAg.value, /^Countless Contingencies/);
if (![cunning, neverLoseFace, sinister, contingencies].every(Boolean)) throw new Error("Ringleader (AG) source features were not found");
ringleaderAg.value.conditionalModifiers = [{
  sourceFeatureId: neverLoseFace.id,
  label: "Never Lose Face",
  condition: "saving throws against effects that also target one or more allies",
  minimumLevel: 2,
  base: 2,
}];
cunning.performanceRules = [performance("ringleader-ag-cunning-plan", "Cunning Plan", 1, "Prepare a performance for the Ringleader and instructed allies to trigger later; improvising without a plan costs 1 extra round.")];
cunning.resourceActions = [
  {
    id: "ringleader-ag-cunning-plan",
    label: "Prepare a Cunning Plan",
    minimumLevel: 1,
    classId: "bard",
    resourceId: "bardicPerformance",
    variableCost: { label: "Performance rounds invested (maximum twice Bard level)", minimum: 1, maximum: 40 },
    actionTypeByLevel: [{ level: 1, actionType: "1-minute" }],
    modeLabel: "Prepared performance",
    modes: ["Countersong", "Distraction", "Fascinate", "Inspire Courage", "Inspire Competence", "Suggestion", "Dirge of Doom", "Inspire Greatness", "Soothing Performance", "Frightening Tune", "Inspire Heroics", "Mass Suggestion", "Deadly Performance"].map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, summary: `Prepare ${label} for later activation.` })),
    activeEffect: tracker("Cunning Plan prepared", "Up to Bard level + Charisma bonus instructed allies may separately trigger the prepared performance. Its duration equals the invested rounds and it expires on daily spell recovery or after 24 hours.", { defaultRounds: 999, fixedRounds: true }),
    summary: "Spend the chosen rounds and record the prepared performance and instructed allies.",
  },
  {
    id: "ringleader-ag-trigger-plan",
    label: "Trigger a Cunning Plan",
    minimumLevel: 1,
    classId: "bard",
    actionTypeByLevel: [{ level: 1, actionType: "move" }, { level: 7, actionType: "swift" }, { level: 13, actionType: "immediate" }],
    confirmations: [{ id: "prepared", label: "This creature was instructed when the plan was prepared", requiredForActivation: true }],
    activeEffect: tracker("Cunning Plan active", "Apply the prepared performance for the number of Bardic Performance rounds invested in the plan."),
    summary: "Use the level-correct trigger action and begin the implanted performance.",
  },
];
sinister.resourceActions = [
  {
    id: "ringleader-ag-intimidating-performance",
    label: "Roll a performance using Intimidate",
    minimumLevel: 2,
    classId: "bard",
    diceRoll: { label: "Performance check using Intimidate", diceCountByLevel: [{ level: 2, count: 1 }], dieSidesByLevel: [{ level: 2, sides: 20 }], modifierInputLabel: "Intimidate modifier", targetDcInputLabel: "Performance DC", outcomesByMargin: [{ minimumMargin: 0, label: "Success" }], failureLabel: "Failure" },
    summary: "Substitute the complete Intimidate bonus for Perform.",
  },
  {
    id: "ringleader-ag-improve-attitude",
    label: "Extend an intimidated creature's friendly attitude",
    minimumLevel: 2,
    classId: "bard",
    variableCost: { label: "Points by which Intimidate exceeded the DC", minimum: 1, maximum: 100 },
    activeEffect: tracker("Extended friendly attitude", "The friendly attitude lasts 10 additional minutes for each point by which the Intimidate check exceeded its DC.", { defaultRounds: 100, fixedRounds: false }),
    summary: "Record the check margin and resulting ten-minutes-per-point extension.",
  },
  {
    id: "ringleader-ag-dazzling-display",
    label: "Use unrestricted Dazzling Display",
    minimumLevel: 6,
    classId: "bard",
    actionTypeByLevel: [{ level: 6, actionType: "full-round" }, { level: 10, actionType: "standard" }],
    modes: [{ id: "normal", label: "Normal range", maximumLevel: 13, summary: "Use Dazzling Display without holding a weapon." }, { id: "60-feet", label: "60-foot radius", minimumLevel: 14, maximumLevel: 17, summary: "Affect all enemies within 60 feet." }, { id: "120-feet", label: "120-foot radius", minimumLevel: 18, summary: "Affect all enemies within 120 feet." }],
    activeEffect: tracker("Dazzling Display", "Gain Dazzling Display as a bonus feat, without its held-weapon requirement, using the level-appropriate action and range."),
    summary: "Resolve the special Dazzling Display progression.",
  },
];
contingencies.resourceActions = [{
  id: "ringleader-ag-countless-contingencies",
  label: "Add contingencies to a Cunning Plan",
  minimumLevel: 6,
  classId: "bard",
  modes: [{ id: "two", label: "Prepare two performances", minimumLevel: 6, maximumLevel: 17, summary: "Choose between two performances when triggered." }, { id: "three", label: "Prepare three performances", minimumLevel: 18, summary: "Choose among three performances when triggered." }],
  activeEffect: tracker("Countless Contingencies", "The triggering creature chooses which prepared performance takes effect."),
  summary: "Track the level-correct number of alternative performances in the plan.",
}, {
  id: "ringleader-ag-extend-plan",
  label: "Extend a triggered plan",
  minimumLevel: 12,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 2,
  actionTypeByLevel: [{ level: 12, actionType: "standard" }],
  diceRoll: { label: "Additional plan rounds", diceCountByLevel: [{ level: 12, count: 1 }], dieSidesByLevel: [{ level: 12, sides: 4 }] },
  summary: "Spend 2 rounds and add the rolled 1d4 rounds to the triggered plan.",
}];
ringleaderAg.value.mechanicalCoverage = "full";
ringleaderAg.value.mechanicalNotes = ["Cunning Plan preparation and trigger timing, contingencies, Sinister Mien's substitutions and Dazzling Display progression, and Never Lose Face are automated."];

// Ringleader (UI): future ally plans, enhanced Inspire Competence, mental defense, and Prepared uses.
const ringleaderUi = await load("bard-ringleader-ui");
const competence = named(ringleaderUi.value, /^Bardic Performance$/);
const inspired = named(ringleaderUi.value, /^Inspired Plan/);
const hidden = named(ringleaderUi.value, /^Hidden Plans/);
const prepared = named(ringleaderUi.value, /^Prepared/);
if (![competence, inspired, hidden, prepared].every(Boolean)) throw new Error("Ringleader (UI) source features were not found");
competence.performanceRules = [performance("ringleader-ui-inspire-competence", "Enhanced Inspire Competence", 3, "Affect one skill, two skills at level 8, or three skills at level 14; at 8 each ally may end it for one daily reroll, and at 14 may take 10 under pressure.")];
competence.resourceActions = [{
  id: "ringleader-ui-inspire-competence",
  label: "Begin enhanced Inspire Competence",
  minimumLevel: 3,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 1,
  actionTypeByLevel: [{ level: 3, actionType: "standard" }, { level: 7, actionType: "move" }, { level: 13, actionType: "swift" }],
  variableCost: { label: "Affected skills (maximum 1 at 3rd, 2 at 8th, 3 at 14th)", minimum: 1, maximum: 3 },
  activeEffect: tracker("Enhanced Inspire Competence", "Apply the Bard's normal Inspire Competence bonus to the level-appropriate number of chosen skills. At 14th level the ally may take 10 while stressed or distracted."),
  summary: "Choose the legal number of skills and track the enhanced performance.",
}, {
  id: "ringleader-ui-competence-reroll",
  label: "End Inspire Competence to reroll",
  minimumLevel: 8,
  classId: "bard",
  confirmations: [{ id: "daily", label: "This ally has not used this reroll today", requiredForActivation: true }],
  diceRoll: { label: "Affected skill reroll", diceCountByLevel: [{ level: 8, count: 1 }], dieSidesByLevel: [{ level: 8, sides: 20 }], modifierInputLabel: "Affected skill modifier including Inspire Competence", targetDcInputLabel: "Skill DC", outcomesByMargin: [{ minimumMargin: 0, label: "Success" }], failureLabel: "Failure" },
  summary: "End the effect and resolve the ally's once-per-day reroll with the performance bonus.",
}];
inspired.performanceRules = [performance("ringleader-ui-inspired-plan", "Inspired Plan", 2, "Invest performance rounds in one ally, who can activate the chosen performance later before daily recovery.")];
inspired.resourceActions = [{
  id: "ringleader-ui-inspired-plan",
  label: "Prepare an Inspired Plan",
  minimumLevel: 2,
  classId: "bard",
  resourceId: "bardicPerformance",
  variableCost: { label: "Performance rounds invested", minimum: 1, maximum: 100 },
  actionTypeByLevel: [{ level: 2, actionType: "1-minute" }],
  modeLabel: "Performance",
  modes: ["Countersong", "Distraction", "Inspire Courage", "Inspire Competence", "Inspire Greatness", "Inspire Heroics"].map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, summary: `Prepare ${label} for one ally.` })),
  confirmations: [{ id: "ally", label: "The plan targets one ally other than the Ringleader", requiredForActivation: true }],
  activeEffect: tracker("Inspired Plan prepared", "The chosen ally can activate this silent, invisible performance before the Ringleader recovers Bardic Performance rounds."),
  summary: "Spend one minute of explanation per invested round and record the ally and performance.",
}, {
  id: "ringleader-ui-activate-inspired-plan",
  label: "Activate an Inspired Plan",
  minimumLevel: 2,
  classId: "bard",
  actionTypeByLevel: [{ level: 2, actionType: "standard" }],
  confirmations: [{ id: "prepared", label: "This ally has this plan prepared and no conflicting Ringleader performance", requiredForActivation: true }],
  activeEffect: tracker("Inspired Plan active", "An unlimited-target performance lasts 2 rounds per invested round; any other permitted performance lasts 1 round per invested round."),
  summary: "Activate the dormant plan wherever the ally is, without audible or visual components.",
}];
ringleaderUi.value.conditionalModifiers = [{
  sourceFeatureId: hidden.id,
  label: "Hidden Plans",
  condition: "saving throws against effects that read thoughts or compel truth",
  minimumLevel: 2,
  base: 4,
}];
ringleaderUi.value.resourceAdjustments = [{
  resourceId: "ringleaderPrepared",
  label: "Prepared",
  unit: "use",
  operation: "replace",
  minimumLevel: 5,
  base: 1,
  perInterval: 1,
  interval: 5,
  maximum: 4,
  refreshCadence: "day",
  sourceFeatureId: prepared.id,
}];
prepared.resourceActions = [{
  id: "ringleader-ui-prepared",
  label: "Reveal a Prepared item",
  minimumLevel: 5,
  classId: "bard",
  resourceId: "ringleaderPrepared",
  cost: 1,
  diceRoll: { label: "Appropriate Knowledge check", diceCountByLevel: [{ level: 5, count: 1 }], dieSidesByLevel: [{ level: 5, sides: 20 }], modifierInputLabel: "Knowledge modifier", targetDcInputLabel: "Item cost in gp", outcomesByMargin: [{ minimumMargin: 0, label: "Item was purchased in advance" }], failureLabel: "Item unavailable" },
  confirmations: [{ id: "nonmagical", label: "Item is nonmagical and does not change the current load category", requiredForActivation: true }, { id: "funds", label: "Deduct the item's cost from current gp on success", requiredForActivation: true }],
  summary: "Spend a daily use and resolve the cost-based Knowledge check for an eligible item.",
}];
ringleaderUi.value.mechanicalCoverage = "full";
ringleaderUi.value.mechanicalNotes = ["Enhanced Inspire Competence and its reroll, Inspired Plan preparation and activation, Hidden Plans, and every level-scaled Prepared use are automated."];

// Hatharat Agent: favors, informed social checks, and truth-compelling performance.
const hatharat = await load("bard-hatharat-agent");
const favor = named(hatharat.value, /^Called Favor/);
const persuasion = named(hatharat.value, /^Informed Persuasion/);
const manipulation = named(hatharat.value, /^Bardic Performance$/);
if (![favor, persuasion, manipulation].every(Boolean)) throw new Error("Hatharat Agent source features were not found");
favor.resourceActions = [{
  id: "hatharat-called-favor",
  label: "Call in a Hatharat favor",
  minimumLevel: 1,
  classId: "bard",
  actionTypeByLevel: [{ level: 1, actionType: "1-hour" }],
  modes: [{ id: "introduction", label: "Important introduction", summary: "Secure an introduction to an important NPC." }, { id: "information", label: "DC 20 information", summary: "Learn information that otherwise requires a DC 20 Knowledge check." }, { id: "pardon", label: "Minor-crime pardon", summary: "Secure a pardon for an ally convicted of a minor crime." }, { id: "specialist", label: "24-hour specialist", minimumLevel: 7, summary: "Secure a GM-controlled 5th-level specialist, +1 level per 2 Bard levels beyond 7th, maximum 11th at level 19." }],
  confirmations: [{ id: "urban", label: "In an urban area with at least 200 people after spending 1d4 hours", requiredForActivation: true }, { id: "cooldown", label: "The prior cooldown has expired (2d6 days; 1d6 days from level 7)", requiredForActivation: true }],
  diceRoll: { label: "Diplomacy check to secure favor", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 20 }], modifierInputLabel: "Diplomacy modifier", targetDcInputLabel: "Favor DC (normally 20)", outcomesByMargin: [{ minimumMargin: 0, label: "Favor secured" }], failureLabel: "Favor refused; cooldown still begins" },
  activeEffect: tracker("Called Favor cooldown", "Wait 2d6 days before another attempt, or 1d6 days from level 7. Record the rolled cooldown externally."),
  summary: "Resolve the exact Diplomacy check, favor tier, prerequisites, and cooldown.",
}];
hatharat.value.conditionalModifiers = ["arcana: spellcasters", "geography: tribal citizens", "local: urban citizens", "nobility: politicians and nobles", "religion: worshipers of a recognized faith"].flatMap((entry) => {
  const [knowledge, targets] = entry.split(": ");
  return ["Bluff", "Diplomacy", "Intimidate"].map((skill) => ({
    sourceFeatureId: persuasion.id,
    label: `Informed Persuasion — ${skill}`,
    condition: `${skill} checks against ${targets} when at least 1 rank is invested in Knowledge (${knowledge})`,
    minimumLevel: 2,
    base: 0,
    abilityModifier: "intelligence",
  }));
});
manipulation.performanceRules = [performance("hatharat-master-of-manipulation", "Master of Manipulation", 8, "Selected creatures in a 20-foot emanation cannot deliberately or intentionally lie while the performance continues.")];
manipulation.resourceActions = [{
  id: "hatharat-master-of-manipulation",
  label: "Begin Master of Manipulation",
  minimumLevel: 8,
  classId: "bard",
  resourceId: "bardicPerformance",
  cost: 1,
  actionTypeByLevel: [{ level: 8, actionType: "standard" }, { level: 13, actionType: "swift" }],
  activeEffect: tracker("Master of Manipulation", "Selected creatures within the 20-foot emanation cannot speak deliberate or intentional lies, but know the effect and may remain silent or evasive within the truth."),
  summary: "Track the mind-affecting compulsion emanation and selected creatures.",
}];
hatharat.value.mechanicalCoverage = "full";
hatharat.value.mechanicalNotes = ["Called Favor prerequisites, checks, tiers, specialist scaling and cooldown, all 15 Informed Persuasion conditions, and Master of Manipulation are automated."];

await Promise.all([buccaneer, ringleaderAg, ringleaderUi, hatharat].map(write));
console.log("Annotated four intrigue and leadership Bard archetypes.");
