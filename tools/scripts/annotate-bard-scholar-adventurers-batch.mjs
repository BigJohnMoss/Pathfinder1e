import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (id) => {
  const url = new URL(`packages/data/src/archetypes/${id}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const loadJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const feature = (record, id) => features(record).find((candidate) => candidate.id === id);
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
const replaceFeatureFamily = (record, predicate, next) => {
  let inserted = false;
  for (const replacement of record.replacements) {
    const rebuilt = [];
    for (const candidate of replacement.features ?? []) {
      if (!predicate(candidate)) rebuilt.push(candidate);
      else if (!inserted) {
        rebuilt.push(...next);
        inserted = true;
      }
    }
    replacement.features = rebuilt;
  }
  if (!inserted) throw new Error(`${record.id}: feature family was not found`);
};
const write = ({ url, value }) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const bardSpeed = (minimumLevel = 1) => [
  { level: minimumLevel, actionType: minimumLevel >= 13 ? "swift" : minimumLevel >= 7 ? "move" : "standard" },
  ...(minimumLevel < 7 ? [{ level: 7, actionType: "move" }] : []),
  ...(minimumLevel < 13 ? [{ level: 13, actionType: "swift" }] : []),
];
const tracker = (name, targets, description, extra = {}) => ({ name, targets, bonus: 0, description, ...extra });
const save = (label = "Will") => ({ label, ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" });
const dailyResource = (resourceId, label, minimumLevel, base, extra = {}) => ({ resourceId, label, unit: "use", operation: "replace", minimumLevel, base, refreshCadence: "day", ...extra });
const profile = (id, label, steps, summary, columns = [{ id: "benefit", label: "Benefit" }]) => ({ id, label, classId: "bard", columns, steps, summary });
const take20Action = (id, label, resourceId, minimumLevel, skills) => ({
  id, label, minimumLevel, classId: "bard", resourceId, cost: 1,
  actionTypeByLevel: [{ level: minimumLevel, actionType: "free" }],
  modeLabel: "Skill",
  modes: skills.map((skill) => ({ id: skill.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), label: skill, summary: `Use the fixed result for a ${skill} check.` })),
  fixedD20Result: { label: "Natural d20 result", result: 20 },
  summary: "Spend one daily use and treat the selected check's natural d20 result as 20 without extra time.",
});

const rogueTalents = await loadJson("packages/data/src/options/rogue-talents.json");
const basicTalentIds = rogueTalents.options.filter((option) => option.minimumLevel < 10).map((option) => option.id);
const allTalentIds = rogueTalents.options.map((option) => option.id);
const negotiatorTalentIds = rogueTalents.options.filter((option) => !/sneak attack/i.test(`${option.name} ${option.benefit}`)).map((option) => option.id);
const negotiatorBasicTalentIds = rogueTalents.options.filter((option) => option.minimumLevel < 10 && negotiatorTalentIds.includes(option.id)).map((option) => option.id);
const talentChoices = (source, levels, advancedLevel, allowedBasic = basicTalentIds, allowedAdvanced = allTalentIds) => levels.map((level, index) => ({
  ...source,
  id: `${source.id.replace(/-\d+$/, "")}-${level}`,
  name: `Rogue Talent ${index + 1}`,
  level,
  type: "selectable",
  summary: `Choose a ${level >= advancedLevel ? "rogue or advanced rogue" : "rogue"} talent. The app enforces level eligibility and prevents duplicate selections.`,
  choiceRequired: true,
  optionGroupId: "bard-rogue-talents",
  optionChoiceIds: level >= advancedLevel ? allowedAdvanced : allowedBasic,
}));

const archaeologist = await load("bard-archaeologist");
const noPerformance = feature(archaeologist.value, "bard-archaeologist-bardic-performance-1");
const luck = feature(archaeologist.value, "bard-archaeologist-archaeologist-s-luck-ex-5") ?? feature(archaeologist.value, "bard-archaeologist-archaeologist-s-luck-ex-1");
const clever = feature(archaeologist.value, "bard-archaeologist-clever-explorer-ex-2");
const uncanny = feature(archaeologist.value, "bard-archaeologist-uncanny-dodge-ex-2");
const trapSense = feature(archaeologist.value, "bard-archaeologist-trap-sense-ex-3");
const talents = feature(archaeologist.value, "bard-archaeologist-rogue-talents-4");
const evasion = feature(archaeologist.value, "bard-archaeologist-evasion-ex-6");
const advanced = feature(archaeologist.value, "bard-archaeologist-advanced-talent-12");
if (![noPerformance, luck, clever, uncanny, trapSense, talents, evasion, advanced].every(Boolean)) throw new Error("Archaeologist source features were not found");
archaeologist.value.removesBardicPerformance = true;
noPerformance.progressionProfiles = [profile("archaeologist-no-performance", "Bardic Performance replacement", [{ level: 1, values: { benefit: "No Bardic Performance pool or performance types" } }], "The standard resource is removed from the character sheet.")];
luck.id = "bard-archaeologist-archaeologist-s-luck-ex-1";
luck.level = 1;
luck.resourceActions = [{
  id: "archaeologists-luck", label: "Use Archaeologist's Luck", minimumLevel: 1, classId: "bard", resourceId: "archaeologistsLuck", cost: 1,
  actionTypeByLevel: [{ level: 1, actionType: "swift" }],
  modeLabel: "Round",
  modes: [
    { id: "start", label: "Start luck", actionType: "swift", summary: "Begin Archaeologist's Luck." },
    { id: "maintain", label: "Maintain luck", actionType: "free", summary: "Maintain Archaeologist's Luck for another round." },
  ],
  activeEffect: {
    name: "Archaeologist's Luck",
    targets: ["attackRolls", "savingThrows", "skillChecks", "weaponDamageRolls"],
    bonus: 1,
    bonusByLevel: [{ level: 1, bonus: 1 }, { level: 5, bonus: 2 }, { level: 11, bonus: 3 }, { level: 17, bonus: 4 }],
    defaultRounds: 1,
    fixedRounds: true,
    applyToAllTargets: true,
    replaceExisting: true,
    description: "Luck bonus; treated as Bardic Performance and cannot coexist with another performance. It ends if a free action cannot be taken to maintain it.",
  },
  summary: "Spend one daily round and apply the level-scaled luck bonus for that round.",
}];
archaeologist.value.resourceAdjustments = [dailyResource("archaeologistsLuck", "Archaeologist's Luck", 1, 4, { unit: "round", abilityModifier: "charisma", minimum: 0 })];
archaeologist.value.skillBonusAdjustments = ["Disable Device", "Perception"].map((skill) => ({ sourceFeatureId: clever.id, skill, minimumLevel: 2, base: 0, levelDivisor: 2 }));
archaeologist.value.skillCheckRules = [{ sourceFeatureId: clever.id, label: "Clever Explorer", minimumLevel: 6, skills: ["Disable Device"], result: 10, allowsStress: true }];
clever.progressionProfiles = [profile("archaeologist-clever-explorer", "Clever Explorer permissions", [
  { level: 2, values: { benefit: "Disable devices in half time (minimum 1 round); open locks as a standard action" } },
  { level: 6, values: { benefit: "Also take 10 while distracted or endangered and disarm magical traps" } },
], "The calculated skill bonuses appear on the sheet; this records the timing and magical-trap permissions.")];
archaeologist.value.defenseAdjustments = [
  { sourceFeatureId: uncanny.id, kind: "uncannyDodge", label: "Uncanny Dodge", minimumLevel: 2, base: 1, qualifier: "retain Dexterity bonus to AC when flat-footed or attacked by an unseen foe" },
  { sourceFeatureId: evasion.id, kind: "evasion", label: "Evasion", minimumLevel: 6, base: 1, qualifier: "take no damage on a successful Reflex save that normally halves damage" },
];
archaeologist.value.conditionalModifiers = [
  { sourceFeatureId: trapSense.id, label: "Trap Sense — Reflex", condition: "Reflex saves made to avoid traps", minimumLevel: 3, base: 1, perInterval: 1, interval: 3, maximum: 6 },
  { sourceFeatureId: trapSense.id, label: "Trap Sense — AC", condition: "Armor Class against attacks made by traps", minimumLevel: 3, base: 1, perInterval: 1, interval: 3, maximum: 6 },
];
replaceFeatureFamily(archaeologist.value, (candidate) => candidate.id.startsWith("bard-archaeologist-rogue-talents-"), talentChoices(talents, [4, 8, 12, 16, 20], 12));
advanced.progressionProfiles = [profile("archaeologist-advanced-talents", "Advanced Talent access", [
  { level: 12, values: { benefit: "The level 12, 16, and 20 talent slots also allow advanced rogue talents" } },
], "Advanced options are included only in the appropriate later slots.")];
archaeologist.value.mechanicalCoverage = "full";
archaeologist.value.mechanicalNotes = ["Bardic Performance removal, Archaeologist's Luck, skill bonuses and permissions, defenses, trap sense, and all five level-aware rogue-talent choices are automated."];

const negotiator = await load("bard-negotiator");
const hardBargainer = feature(negotiator.value, "bard-negotiator-hard-bargainer-1");
const negotiationPerformance = feature(negotiator.value, "bard-negotiator-bardic-performance-1");
const negotiationTalents = feature(negotiator.value, "bard-negotiator-rogue-talents-2");
const rhetoric = feature(negotiator.value, "bard-negotiator-master-of-rhetoric-ex-5");
const negotiationAdvanced = feature(negotiator.value, "bard-negotiator-advanced-talents-10");
if (![hardBargainer, negotiationPerformance, negotiationTalents, rhetoric, negotiationAdvanced].every(Boolean)) throw new Error("Negotiator source features were not found");
const socialSkills = ["Bluff", "Diplomacy", "Intimidate", "Knowledge (local)", "Sense Motive"];
negotiator.value.skillBonusAdjustments = socialSkills.map((skill) => ({ sourceFeatureId: hardBargainer.id, skill, minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 1 }));
negotiationPerformance.performanceRules = [{ id: "negotiator-counterargument", name: "Counterargument", minimumLevel: 1, kind: "passive", summary: "Countersong must use Perform (act), Perform (comedy), Perform (oratory), or Perform (sing).", condition: "Use one of the four permitted Perform skills" }];
negotiationPerformance.resourceActions = [
  {
    id: "negotiator-fast-talk", label: "Begin Fast Talk", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1,
    actionTypeByLevel: bardSpeed(1),
    activeEffect: tracker("Fast Talk", ["area"], "Audible, language-dependent, mind-affecting performance. Enemies take the displayed save penalty against charm and figment, glamer, or shadow effects; Appraise penalty equals half Bard level (minimum 1).", { defaultRounds: 1, replaceExisting: true }),
    modes: [
      { id: "tier-1", label: "−1 saves · ±10% value", minimumLevel: 1, maximumLevel: 4, summary: "Apply −1 to the listed saves, half Bard level to Appraise, and shift perceived value by 10%." },
      { id: "tier-2", label: "−2 saves · ±20% value", minimumLevel: 5, maximumLevel: 10, summary: "Apply −2 to the listed saves, half Bard level to Appraise, and shift perceived value by 20%." },
      { id: "tier-3", label: "−3 saves · ±30% value", minimumLevel: 11, maximumLevel: 16, summary: "Apply −3 to the listed saves, half Bard level to Appraise, and shift perceived value by 30%." },
      { id: "tier-4", label: "−4 saves · ±40% value", minimumLevel: 17, summary: "Apply −4 to the listed saves, half Bard level to Appraise, and shift perceived value by 40%." },
    ],
    summary: "Spend 1 performance round per round and track the exact level tier and Appraise penalty.",
  },
  {
    id: "negotiator-binding-contract", label: "Complete Binding Contract", minimumLevel: 9, maximumLevel: 17, classId: "bard", resourceId: "bardicPerformance", cost: 3,
    actionTypeByLevel: [{ level: 9, actionType: "standard" }],
    confirmations: [{ id: "continuous", label: "The target saw and heard all 3 continuous rounds and has Hit Dice no greater than Bard level", requiredForActivation: true }],
    savingThrow: save("Will"),
    targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 9, range: "visible and audible" }], effectsByLevel: [{ level: 9, name: "Binding Contract — Lesser Geas", description: "Bound by lesser geas until completed, discharged, or removed; discharge it if the Negotiator breaks their bargain.", duration: { kind: "fixed-rounds", rounds: 999 } }] },
    summary: "Spend 3 continuous performance rounds, enforce the Hit Dice limit, and resolve the Will save.",
  },
  {
    id: "negotiator-binding-contract-greater", label: "Complete Greater Binding Contract", minimumLevel: 18, classId: "bard", resourceId: "bardicPerformance", cost: 3,
    actionTypeByLevel: [{ level: 18, actionType: "standard" }],
    confirmations: [{ id: "continuous", label: "The target saw and heard all 3 continuous rounds", requiredForActivation: true }],
    activeEffect: tracker("Binding Contract — Geas/Quest", ["enemy"], "No Hit Dice limit and no saving throw. Discharge the geas if the Negotiator breaks their end of the bargain.", { defaultRounds: 999, fixedRounds: true }),
    summary: "Spend 3 continuous performance rounds and apply geas/quest without a save.",
  },
];
replaceFeatureFamily(negotiator.value, (candidate) => candidate.id.startsWith("bard-negotiator-rogue-talents-"), talentChoices(negotiationTalents, [2, 6, 10, 14, 18], 10, negotiatorBasicTalentIds, negotiatorTalentIds));
negotiator.value.skillCheckRules = socialSkills.map((skill) => ({ sourceFeatureId: rhetoric.id, label: "Master of Rhetoric", minimumLevel: 5, skills: [skill], result: 10, allowsStress: true, trainedOnly: true }));
negotiator.value.resourceAdjustments = [dailyResource("masterOfRhetoricTake20", "Master of Rhetoric take 20", 5, 1, { maximumByLevel: [{ level: 5, maximum: 1 }, { level: 11, maximum: 2 }, { level: 17, maximum: 3 }] })];
rhetoric.resourceActions = [take20Action("negotiator-master-rhetoric", "Use Master of Rhetoric Take 20", "masterOfRhetoricTake20", 5, socialSkills)];
negotiationAdvanced.progressionProfiles = [profile("negotiator-advanced-talents", "Advanced Talent access", [{ level: 10, values: { benefit: "The level 10, 14, and 18 slots also allow advanced talents that do not modify sneak attack" } }], "The selector filters out every talent whose rules modify sneak attack.")];
negotiator.value.mechanicalCoverage = "full";
negotiator.value.mechanicalNotes = ["Hard Bargainer, all three performances, five filtered rogue-talent choices, trained take 10, and bounded take 20 uses are automated."];

const daredevil = await load("bard-daredevil");
const agile = feature(daredevil.value, "bard-daredevil-agile-ex-1");
const derring = feature(daredevil.value, "bard-daredevil-bardic-performance-5");
const canny = feature(daredevil.value, "bard-daredevil-canny-foe-ex-2") ?? feature(daredevil.value, "bard-daredevil-canny-foe-2");
const dauntless = feature(daredevil.value, "bard-daredevil-dauntless-ex-2");
const fortune = feature(daredevil.value, "bard-daredevil-scoundrel-s-fortune-ex-5");
if (![agile, derring, canny, dauntless, fortune].every(Boolean)) throw new Error("Daredevil source features were not found");
daredevil.value.skillBonusAdjustments = ["Acrobatics", "Bluff", "Climb", "Escape Artist"].map((skill) => ({ sourceFeatureId: agile.id, skill, minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 1 }));
const derringBonus = [{ level: 5, bonus: 1 }, { level: 11, bonus: 2 }, { level: 17, bonus: 3 }];
const dexteritySkills = ["Acrobatics", "Disable Device", "Escape Artist", "Fly", "Ride", "Sleight of Hand", "Stealth"];
derring.resourceActions = [
  {
    id: "daredevil-derring-do", label: "Begin Derring-do", minimumLevel: 5, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(5),
    activeEffect: tracker("Derring-do", ["allies"], "Mind-affecting visual performance. The Daredevil and allies who can see it gain the level-scaled Reflex bonus and twice that bonus on Dexterity-based skill checks.", { defaultRounds: 1, replaceExisting: true }),
    modes: [{ id: "benefits", label: "Apply performance benefits", summary: "Apply the level-scaled Reflex and Dexterity-skill bonuses to creatures that can see the performance.", activeEffects: [
      { target: "reflex", bonus: 1, bonusByLevel: derringBonus, label: "Derring-do — Reflex", description: "Morale bonus on Reflex saves." },
      { target: "skillChecks", bonus: 2, bonusByLevel: derringBonus.map(({ level, bonus }) => ({ level, bonus: bonus * 2 })), label: "Derring-do — Dexterity skills", description: "Competence bonus on Dexterity-based skill checks.", skillIds: dexteritySkills },
    ] }],
    summary: "Spend 1 performance round and apply the two exact level-scaled bonuses.",
  },
  {
    id: "daredevil-derring-do-movement", label: "Apply Derring-do Movement AC", minimumLevel: 5, classId: "bard", resourceId: "bardicPerformance", cost: 0, minimumResourceRemaining: 1, actionTypeByLevel: [{ level: 5, actionType: "free" }],
    confirmations: [{ id: "moved", label: "The ally moved at least 10 feet this turn and can see the active performance", requiredForActivation: true }],
    activeEffect: { name: "Derring-do — Movement AC", targets: ["armorClass"], bonus: 1, bonusByLevel: derringBonus, defaultRounds: 1, fixedRounds: true, description: "Dodge bonus to AC until the start of the ally's next turn." },
    summary: "Apply the level-scaled dodge bonus without spending another performance round.",
  },
];
replaceFeatureFamily(daredevil.value, (candidate) => candidate.id.startsWith("bard-daredevil-canny-foe-"), [2, 6, 10, 14, 18].map((level, index) => ({
  ...canny,
  id: `bard-daredevil-canny-foe-${level}`,
  name: `Canny Foe ${index + 1}`,
  level,
  type: "selectable",
  summary: "Choose a new combat maneuver. Gain +2 on checks to attempt it and +2 CMD against it; duplicate choices are disabled.",
  choiceRequired: true,
  optionGroupId: "bard-canny-foe-maneuvers",
})));
daredevil.value.conditionalModifiers = [{ sourceFeatureId: dauntless.id, label: "Dauntless", condition: "Saving throws against mind-affecting effects, including fear", minimumLevel: 2, base: 1, perInterval: 1, interval: 4, maximum: 5 }];
daredevil.value.resourceAdjustments = [dailyResource("scoundrelsFortune", "Scoundrel's Fortune", 5, 1, { perInterval: 1, interval: 3, maximum: 6 })];
fortune.resourceActions = [{ id: "daredevil-scoundrels-fortune", label: "Use Scoundrel's Fortune", minimumLevel: 5, classId: "bard", resourceId: "scoundrelsFortune", cost: 1, actionTypeByLevel: [{ level: 5, actionType: "free" }], rerollAction: { kind: "higher-d20", label: "Roll a second d20 and keep the higher skill-check result" }, summary: "Enter the original skill-check total, roll the second result, and keep the higher total." }];
daredevil.value.mechanicalCoverage = "full";
daredevil.value.mechanicalNotes = ["Agile, both Derring-do paths, every unique Canny Foe choice, Dauntless, and bounded Scoundrel's Fortune rerolls are automated."];

await Promise.all([archaeologist, negotiator, daredevil].map(write));
console.log("Annotated three scholar-adventurer Bard archetypes.");
