import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (name) => {
  const url = new URL(`packages/data/src/archetypes/${name}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const feature = (record, id) => record.replacements.flatMap((replacement) => replacement.features ?? []).find((candidate) => candidate.id === id);
const bardSpeed = (minimumLevel = 1) => [{ level: minimumLevel, actionType: minimumLevel >= 13 ? "swift" : minimumLevel >= 7 ? "move" : "standard" }, ...(minimumLevel < 7 ? [{ level: 7, actionType: "move" }] : []), ...(minimumLevel < 13 ? [{ level: 13, actionType: "swift" }] : [])];
const effect = (target, bonus, label, description, extra = {}) => ({ target, bonus, label, description, ...extra });

const healer = await load("bard-arcane-healer");
const healing = feature(healer.value, "bard-arcane-healer-inspiring-healing-sp-5");
if (!healing) throw new Error("Arcane Healer Inspiring Healing was not found.");
healing.resourceActions = [
  [5, "light", "cure-light-wounds", "Cure Light Wounds"],
  [11, "moderate", "cure-moderate-wounds", "Cure Moderate Wounds"],
  [17, "serious", "cure-serious-wounds", "Cure Serious Wounds"],
].map(([minimumLevel, tier, spellId, spellName]) => ({
  id: `arcane-healer-inspiring-healing-${tier}`, label: `Inspiring Healing — ${spellName}`, minimumLevel, classId: "bard", resourceId: "bardicPerformance", cost: 2, actionTypeByLevel: [{ level: minimumLevel, actionType: "standard" }],
  confirmations: [{ id: "target-eligible", label: "This target has not received Inspiring Healing in the last 24 hours", requiredForActivation: true }],
  spellLikeAbility: { spellId, spellName, cadence: "day", kind: "spell-like" },
  activeEffect: { name: "Inspiring Healing — 24-hour target limit", targets: ["allies"], bonus: 0, defaultRounds: 999, fixedRounds: true, description: "The healed target cannot receive Inspiring Healing again for 24 hours. Remove after the next daily refresh." },
  summary: "Spend two bardic performance rounds and mark the healed target’s once-per-24-hours limit.",
}));
healer.value.mechanicalCoverage = "full";
healer.value.mechanicalNotes = ["Channel Energy and every Inspiring Healing cure tier, cost, unlock, and per-target 24-hour limit are automated."];

const geisha = await load("bard-lotus-geisha");
const enrapturing = feature(geisha.value, "bard-lotus-geisha-enrapturing-performance-su-2");
if (!enrapturing) throw new Error("Lotus Geisha Enrapturing Performance was not found.");
enrapturing.resourceActions = [{
  id: "lotus-geisha-enrapturing-performance", label: "Begin Enrapturing Performance", minimumLevel: 2, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(2), modeLabel: "Emulated performance",
  modes: [
    { id: "will-save-performance", label: "Fascinate, Frightening Tune, or Suggestion", summary: "One target takes a +2 increase to the Will save DC.", activeEffects: [effect("performanceSaveDc", 2, "Enrapturing Performance — Will DC", "+2 to the Will save DC of this single-target Fascinate, Frightening Tune, or Suggestion.")] },
    { id: "inspire-competence", label: "Inspire Competence", summary: "Increase its single target’s skill-check bonus by 1.", activeEffects: [effect("skillChecks", 1, "Enrapturing Inspire Competence", "Increase the selected performance’s skill-check bonus by +1.")] },
    { id: "inspire-courage", label: "Inspire Courage", summary: "Increase its single target’s eligible save, attack, and damage bonuses by 1.", activeEffects: [effect("savingThrowsAgainstCharmAndFear", 1, "Enrapturing Inspire Courage — saves", "+1 beyond the normal Inspire Courage bonus."), effect("attackRolls", 1, "Enrapturing Inspire Courage — attacks", "+1 beyond the normal Inspire Courage bonus."), effect("weaponDamageRolls", 1, "Enrapturing Inspire Courage — damage", "+1 beyond the normal Inspire Courage bonus.")] },
    { id: "inspire-greatness", label: "Inspire Greatness", minimumLevel: 9, summary: "Increase its single target’s attack and Fortitude bonuses by 1.", activeEffects: [effect("attackRolls", 1, "Enrapturing Inspire Greatness — attacks", "+1 beyond the normal Inspire Greatness bonus."), effect("fortitude", 1, "Enrapturing Inspire Greatness — Fortitude", "+1 beyond the normal Inspire Greatness bonus.")] },
    { id: "inspire-heroics", label: "Inspire Heroics", minimumLevel: 15, summary: "Increase its single target’s AC and saving throw bonuses by 1.", activeEffects: [effect("armorClass", 1, "Enrapturing Inspire Heroics — AC", "+1 beyond the normal Inspire Heroics bonus."), effect("savingThrows", 1, "Enrapturing Inspire Heroics — saves", "+1 beyond the normal Inspire Heroics bonus.")] },
  ],
  activeEffect: { name: "Enrapturing Performance", targets: ["self"], bonus: 0, defaultRounds: 1, replaceExisting: true, description: "Only one target is affected; this cannot coexist with a normal bardic performance." },
  summary: "Spend one performance round per round; only the chosen single target receives the emulated performance.",
}];
geisha.value.mechanicalCoverage = "full";
geisha.value.mechanicalNotes = ["Weapon replacement, fixed bonus feats, single-target performance exclusivity, activation speed, Will DC increases, and every increased inspiration bonus are automated."];

const academy = await load("bard-pitax-academy-of-grand-arts");
const focused = feature(academy.value, "bard-pitax-academy-of-grand-arts-focused-performance-ex-2");
if (!focused) throw new Error("Academy Focused Performance was not found.");
Object.assign(focused, { type: "selectable", choiceRequired: true, optionGroupId: "bard-focused-performance-categories", progressionKey: "bard-focused-performance" });
academy.value.resourceAdjustments = [{ resourceId: "focusedPerformanceRounds", label: "Focused Performance bonus rounds", unit: "round", minimumLevel: 2, base: 6, maximumByLevel: [{ level: 2, maximum: 6 }, { level: 8, maximum: 12 }, { level: 14, maximum: 18 }, { level: 20, maximum: 24 }] }];
academy.value.mechanicalCoverage = "full";
academy.value.mechanicalNotes = ["The required Perform category and all four restricted Extra Performance grants (6 bonus rounds each at levels 2, 8, 14, and 20) are automated in a dedicated pool."];

const sorrow = await load("bard-sorrowsoul");
const lyric = feature(sorrow.value, "bard-sorrowsoul-lyric-sorrow-su-1");
if (!lyric) throw new Error("Sorrowsoul Lyric Sorrow was not found.");
const courageEffects = (bonus) => [effect("savingThrowsAgainstCharmAndFear", bonus, `Lyric Sorrow Courage +${bonus} — saves`, `Self-only +${bonus} morale bonus against charm and fear.`), effect("attackRolls", bonus, `Lyric Sorrow Courage +${bonus} — attacks`, `Self-only +${bonus} morale bonus on weapon attacks.`), effect("weaponDamageRolls", bonus, `Lyric Sorrow Courage +${bonus} — damage`, `Self-only +${bonus} morale bonus on weapon damage.`)];
lyric.resourceActions = [{
  id: "sorrowsoul-lyric-sorrow", label: "Begin Lyric Sorrow", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 2, actionTypeByLevel: bardSpeed(1), modeLabel: "Altered performance",
  modes: [
    { id: "courage-2", label: "Inspire Courage +2", maximumLevel: 4, summary: "Self-only +2 bonuses.", activeEffects: courageEffects(2) },
    { id: "courage-4", label: "Inspire Courage +4", minimumLevel: 5, maximumLevel: 10, summary: "Self-only +4 bonuses.", activeEffects: courageEffects(4) },
    { id: "courage-6", label: "Inspire Courage +6", minimumLevel: 11, maximumLevel: 16, summary: "Self-only +6 bonuses.", activeEffects: courageEffects(6) },
    { id: "courage-8", label: "Inspire Courage +8", minimumLevel: 17, summary: "Self-only +8 bonuses.", activeEffects: courageEffects(8) },
    { id: "greatness", label: "Inspire Greatness", minimumLevel: 12, summary: "Self-only 3 bonus Hit Dice, +3 attacks, and +2 Fortitude.", activeEffects: [effect("self", 0, "Lyric Sorrow Greatness — bonus Hit Dice", "Gain 3 bonus Hit Dice while active."), effect("attackRolls", 3, "Lyric Sorrow Greatness — attacks", "+3 competence bonus on attacks."), effect("fortitude", 2, "Lyric Sorrow Greatness — Fortitude", "+2 competence bonus on Fortitude saves.")] },
    { id: "heroics", label: "Inspire Heroics", minimumLevel: 15, summary: "Self-only standard +4 AC/saves, fast healing 5, and 50% displacement miss chance.", activeEffects: [effect("armorClass", 4, "Lyric Sorrow Heroics — AC", "+4 dodge bonus to AC plus a 50% displacement miss chance."), effect("savingThrows", 4, "Lyric Sorrow Heroics — saves", "+4 morale bonus on saving throws."), effect("self", 0, "Lyric Sorrow Heroics — fast healing and displacement", "Fast healing 5 and a 50% miss chance as displacement.", { fastHealing: 5 })] },
  ],
  activeEffect: { name: "Lyric Sorrow", targets: ["self"], bonus: 0, defaultRounds: 1, replaceExisting: true, description: "Self-only altered performance; spends twice the usual rounds and cannot linger." },
  summary: "Spend two bardic performance rounds per round. Lingering Performance does not extend this effect.",
}];
sorrow.value.mechanicalCoverage = "full";
sorrow.value.mechanicalNotes = ["All Lyric Sorrow tiers, self-only restrictions, doubled cost, non-lingering rule, bonus Hit Dice tracker, exact bonuses, fast healing, and displacement are automated alongside Darkness Denied and Spurn Harm."];

for (const record of [healer, geisha, academy, sorrow]) await writeFile(record.url, `${JSON.stringify(record.value, null, 2)}\n`);
console.log("Annotated four single-gap Bard archetypes.");
