import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const actionSpeed = (classId) => [
  { level: 1, actionType: "standard" },
  { level: 7, actionType: "move" },
  { level: 13, actionType: "swift" },
].map((step) => ({ ...step, classId }));
const skills = ["Acrobatics", "Appraise", "Bluff", "Climb", "Craft", "Diplomacy", "Disable Device", "Disguise", "Escape Artist", "Fly", "Handle Animal", "Heal", "Intimidate", "Knowledge (arcana)", "Knowledge (dungeoneering)", "Knowledge (engineering)", "Knowledge (geography)", "Knowledge (history)", "Knowledge (local)", "Knowledge (nature)", "Knowledge (nobility)", "Knowledge (planes)", "Knowledge (religion)", "Linguistics", "Perception", "Perform", "Profession", "Ride", "Sense Motive", "Sleight of Hand", "Spellcraft", "Stealth", "Survival", "Swim", "Use Magic Device"];

async function load(name) {
  const url = new URL(`packages/data/src/archetypes/${name}`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
}

const ocean = await load("oracle-ocean-s-echo.json");
const inspiring = ocean.value.replacements.flatMap((item) => item.features ?? []).find((feature) => feature.id === "oracle-ocean-s-echo-inspiring-song-ex-1");
if (!inspiring) throw new Error("Ocean's Echo Inspiring Song was not found.");
inspiring.summary = "Use Perform (sing) for three Bard performances, treating Oracle level as Bard level. Inspire Courage (Ex) : At 1st level, grant the normal scaling morale bonus on attack and weapon damage rolls and saves against charm and fear. Inspire Competence (Ex) : At 3rd level, grant the normal scaling competence bonus on one chosen skill. Inspire Heroics (Ex) : At 15th level, grant the normal scaling morale bonus on saving throws and dodge bonus to Armor Class. Inspiring Song lasts while maintained, uses level + Charisma modifier rounds per day (minimum 1), and starts as a standard action, a move action at 7th level, and a swift action at 13th level.";
inspiring.performanceRules = [
  { id: "oceans-echo-inspire-courage", name: "Inspire Courage", minimumLevel: 1, kind: "active", summary: "Grant scaling morale bonuses on attack and weapon damage rolls; the same bonus applies on saves against charm and fear.", resourceId: "inspiringSongRounds", cost: 1, actionIds: ["oceans-echo-inspire-courage"] },
  { id: "oceans-echo-inspire-competence", name: "Inspire Competence", minimumLevel: 3, kind: "active", summary: "Grant the level-scaled competence bonus on one chosen skill while the song is maintained.", resourceId: "inspiringSongRounds", cost: 1, actionIds: ["oceans-echo-inspire-competence"] },
  { id: "oceans-echo-inspire-heroics", name: "Inspire Heroics", minimumLevel: 15, kind: "active", summary: "Grant the level-scaled morale bonus on all saves and dodge bonus to Armor Class while maintained.", resourceId: "inspiringSongRounds", cost: 1, actionIds: ["oceans-echo-inspire-heroics"] },
];
inspiring.resourceActions = [
  {
    id: "oceans-echo-inspire-courage", label: "Begin Inspire Courage", minimumLevel: 1, classId: "oracle", resourceId: "inspiringSongRounds", cost: 1,
    actionTypeByLevel: actionSpeed("oracle").map(({ level, actionType }) => ({ level, actionType })),
    activeEffect: { name: "Ocean's Echo — Inspire Courage", targets: ["attackRolls", "weaponDamageRolls", "savingThrowsAgainstCharmAndFear"], bonus: 1, bonusByLevel: [{ level: 1, bonus: 1 }, { level: 5, bonus: 2 }, { level: 11, bonus: 3 }, { level: 17, bonus: 4 }], applyToAllTargets: true, replaceExisting: true, defaultRounds: 1, description: "Morale bonus on attack and weapon damage rolls and on saves against charm and fear." },
    summary: "Spend one Inspiring Song round to begin or maintain Inspire Courage.",
  },
  {
    id: "oceans-echo-inspire-competence", label: "Begin Inspire Competence", minimumLevel: 3, classId: "oracle", resourceId: "inspiringSongRounds", cost: 1,
    actionTypeByLevel: actionSpeed("oracle").map(({ level, actionType }) => ({ level, actionType })),
    activeEffect: { name: "Ocean's Echo — Inspire Competence", targets: ["skillChecks"], bonus: 2, bonusByLevel: [{ level: 3, bonus: 2 }, { level: 7, bonus: 3 }, { level: 11, bonus: 4 }, { level: 15, bonus: 5 }, { level: 19, bonus: 6 }], skillOptions: skills, replaceExisting: true, defaultRounds: 1, description: "Competence bonus on the selected skill." },
    summary: "Spend one Inspiring Song round and choose the affected skill.",
  },
  {
    id: "oceans-echo-inspire-heroics", label: "Begin Inspire Heroics", minimumLevel: 15, classId: "oracle", resourceId: "inspiringSongRounds", cost: 1,
    actionTypeByLevel: actionSpeed("oracle").map(({ level, actionType }) => ({ level, actionType })),
    activeEffect: { name: "Ocean's Echo — Inspire Heroics", targets: ["armorClass", "savingThrows"], bonus: 4, bonusByLevel: [{ level: 15, bonus: 4 }, { level: 19, bonus: 5 }], applyToAllTargets: true, replaceExisting: true, defaultRounds: 1, description: "Dodge bonus to Armor Class and morale bonus on saving throws." },
    summary: "Spend one Inspiring Song round to inspire one willing ally within 30 feet.",
  },
];
ocean.value.resourceAdjustments = [{ resourceId: "inspiringSongRounds", label: "Inspiring Song", unit: "round", operation: "replace", minimumLevel: 1, base: 0, levelMultiplier: 1, abilityModifier: "charisma", minimum: 1 }];
ocean.value.mechanicalCoverage = "full";
ocean.value.mechanicalNotes = ["Inspiring Song rounds, activation speed, all three performance unlocks, scaling bonuses, skill selection, and existing spell and skill replacements are automated."];

const wyrm = await load("skald-wyrm-singer.json");
const song = wyrm.value.replacements.flatMap((item) => item.features ?? []).find((feature) => feature.id === "skald-wyrm-singer-wyrm-song-su-1");
if (!song) throw new Error("Wyrm Singer Wyrm Song was not found.");
const rageTiers = [
  { id: "level-1", minimumLevel: 1, maximumLevel: 3, melee: 2, saves: 2 },
  { id: "level-4", minimumLevel: 4, maximumLevel: 7, melee: 2, saves: 3 },
  { id: "level-8", minimumLevel: 8, maximumLevel: 11, melee: 3, saves: 4 },
  { id: "level-12", minimumLevel: 12, maximumLevel: 15, melee: 3, saves: 5 },
  { id: "level-16", minimumLevel: 16, maximumLevel: 19, melee: 4, saves: 6 },
  { id: "level-20", minimumLevel: 20, maximumLevel: 20, melee: 4, saves: 7 },
];
song.performanceRules = [
  { id: "wyrm-singer-draconic-rage", name: "Draconic Rage", minimumLevel: 1, kind: "active", summary: "Grant scaling morale bonuses on melee attacks, melee damage, and saves against paralysis and sleep, while imposing –1 Armor Class.", resourceId: "ragingSongRounds", cost: 1, actionIds: ["wyrm-singer-draconic-rage"] },
  { id: "wyrm-singer-wyrm-saga", name: "Wyrm Saga", minimumLevel: 14, kind: "active", summary: "One ally within 60 feet assumes a form of the dragon I aspect without its breath weapon while the song is maintained.", resourceId: "ragingSongRounds", cost: 1, actionIds: ["wyrm-singer-wyrm-saga"] },
];
song.resourceActions = [
  {
    id: "wyrm-singer-draconic-rage", label: "Begin Draconic Rage", minimumLevel: 1, classId: "skald", resourceId: "ragingSongRounds", cost: 1, modeLabel: "Current progression",
    modes: rageTiers.map((tier) => ({ id: tier.id, label: `+${tier.melee} melee / +${tier.saves} special saves`, minimumLevel: tier.minimumLevel, maximumLevel: tier.maximumLevel, defaultRounds: 1, summary: `Grant +${tier.melee} morale on melee attack and damage rolls, +${tier.saves} morale on saves against paralysis and sleep, and –1 Armor Class.`, activeEffects: [
      { target: "meleeAttackRolls", bonus: tier.melee, label: "Draconic Rage — melee attacks", description: `+${tier.melee} morale bonus on melee attack rolls.` },
      { target: "meleeDamageRolls", bonus: tier.melee, label: "Draconic Rage — melee damage", description: `+${tier.melee} morale bonus on melee damage rolls.` },
      { target: "savingThrowsAgainstParalysisAndSleep", bonus: tier.saves, label: "Draconic Rage — special saves", description: `+${tier.saves} morale bonus on saves against paralysis and sleep effects.` },
      { target: "armorClass", bonus: -1, label: "Draconic Rage — Armor Class", description: "–1 penalty to Armor Class." },
    ] })),
    activeEffect: { name: "Draconic Rage", targets: ["self"], bonus: 0, replaceExisting: true, defaultRounds: 1, description: "The selected progression also grants its listed morale bonus on saves against paralysis and sleep effects." },
    summary: "Spend one raging song round to begin or maintain Draconic Rage.",
  },
  {
    id: "wyrm-singer-wyrm-saga", label: "Begin Wyrm Saga", minimumLevel: 14, classId: "skald", resourceId: "ragingSongRounds", cost: 1,
    spellLikeAbility: { spellId: "form-of-the-dragon-i", spellName: "Form of the Dragon I (no breath weapon)", cadence: "at-will", kind: "spell-equivalent" },
    actionTypeByLevel: [{ level: 14, actionType: "standard" }], recipientLabel: "Target", recipients: [{ id: "single-ally", label: "One ally within 60 feet" }],
    summary: "Maintain the draconic form on one ally; the ally cannot use the spell's breath weapon.",
  },
];
wyrm.value.mechanicalCoverage = "full";
wyrm.value.mechanicalNotes = ["Draconic Rage scaling, melee-only bonuses, special-save rules, Armor Class penalty, Wyrm Saga targeting and cost, and the existing breath weapon are automated."];

await writeFile(ocean.url, `${JSON.stringify(ocean.value, null, 2)}\n`);
await writeFile(wyrm.url, `${JSON.stringify(wyrm.value, null, 2)}\n`);
console.log("Annotated Ocean's Echo and Wyrm Singer performance variants.");
