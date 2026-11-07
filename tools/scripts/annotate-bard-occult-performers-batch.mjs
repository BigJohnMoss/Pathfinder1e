import { readFile, writeFile } from "node:fs/promises";
import spells from "../../generated/pf1e-spells.mjs";

const root = new URL("../../", import.meta.url);
const load = async (id) => {
  const url = new URL(`packages/data/src/archetypes/${id}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const loadJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const feature = (record, id) => features(record).find((candidate) => candidate.id === id);
const replaceFeature = (record, id, replacements) => {
  for (const replacement of record.replacements) {
    const index = (replacement.features ?? []).findIndex((candidate) => candidate.id === id);
    if (index >= 0) {
      replacement.features = [...replacement.features.slice(0, index), ...replacements, ...replacement.features.slice(index + 1)];
      return;
    }
  }
  throw new Error(`${record.id}: ${id} was not found`);
};
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
const write = ({ url, value }) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const writeJson = (path, value) => writeFile(new URL(path, root), `${JSON.stringify(value, null, 2)}\n`);
const aon = (fixedName) => ({ title: "Archives of Nethys", page: null, url: `https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Bard%20${fixedName}` });
const bardSpeed = (minimumLevel = 1) => [
  { level: minimumLevel, actionType: minimumLevel >= 13 ? "swift" : minimumLevel >= 7 ? "move" : "standard" },
  ...(minimumLevel < 7 ? [{ level: 7, actionType: "move" }] : []),
  ...(minimumLevel < 13 ? [{ level: 13, actionType: "swift" }] : []),
];
const save = (label = "Will") => ({ label, ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" });
const tracker = (name, targets, description, extra = {}) => ({ name, targets, bonus: 0, description, ...extra });
const dailyResource = (resourceId, label, minimumLevel, base, extra = {}) => ({ resourceId, label, unit: "use", operation: "replace", minimumLevel, base, refreshCadence: "day", ...extra });
const profile = (id, label, steps, summary) => ({ id, label, classId: "bard", columns: [{ id: "benefit", label: "Benefit" }], steps, summary });

// Fortune-Teller: exact hourly roll table, divination focus, and Transparent Fate.
const fortune = await load("bard-fortune-teller");
const oracular = feature(fortune.value, "bard-fortune-teller-oracular-performance-1");
const acumen = feature(fortune.value, "bard-fortune-teller-fortune-teller-s-acumen-2");
const transparent = feature(fortune.value, "bard-fortune-teller-bardic-performance-8");
if (!oracular || !acumen || !transparent) throw new Error("Fortune-Teller source features were not found");
fortune.value.resourceAdjustments = [dailyResource("oracularReading", "Oracular reading", 1, 1, { refreshCadence: "hour", sourceFeatureId: oracular.id })];
oracular.resourceActions = [{
  id: "fortune-teller-oracular-performance", label: "Read Oracular Performance", minimumLevel: 1, classId: "bard", resourceId: "oracularReading", cost: 1,
  actionTypeByLevel: bardSpeed(1), modeLabel: "Subject", modes: [
    { id: "ally", label: "Ally", summary: "Resolve the ally column; adjustments to numeric performance bonuses last 1 minute." },
    { id: "enemy", label: "Enemy", summary: "Resolve the enemy column; save adjustments apply to this performance instance." },
  ],
  diceRoll: {
    label: "d% + Bard level", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 100 }],
    flatModifierByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, modifier: index + 1 })),
    outcomesByTotal: [
      { minimumTotal: 1, maximumTotal: 35, label: "Woe for ally · Weal for enemy", summary: "Ally performance bonus −1 (minimum 0); enemy gains +2 on its save.", effectsByMode: [
        { modeId: "ally", name: "Oracular Performance — Woe", target: "allies", bonus: 0, description: "Reduce this ally's numeric bonus from the chosen bardic performance by 1, minimum 0.", rounds: 10 },
        { modeId: "enemy", name: "Oracular Performance — Enemy Weal", target: "performanceSaveDc", bonus: -2, description: "This enemy gains +2 on its save against the current bardic performance.", rounds: 1 },
      ] },
      { minimumTotal: 36, maximumTotal: 65, label: "Inconclusive", summary: "No adjustment; resolve the performance normally." },
      { minimumTotal: 66, label: "Weal for ally · Woe for enemy", summary: "Ally performance bonus +1; enemy takes −2 on its save.", effectsByMode: [
        { modeId: "ally", name: "Oracular Performance — Weal", target: "allies", bonus: 0, description: "Increase this ally's numeric bonus from the chosen bardic performance by 1.", rounds: 10 },
        { modeId: "enemy", name: "Oracular Performance — Enemy Woe", target: "performanceSaveDc", bonus: 2, description: "This enemy takes −2 on its save against the current bardic performance.", rounds: 1 },
      ] },
    ],
  },
  summary: "Spend the once-per-hour reading and automatically resolve the exact ally or enemy result.",
}];
acumen.numericCalculations = [{ id: "fortune-teller-focus-limit", label: "Special-focus component limit", inputLabel: "Material component cost", inputMinimum: 0, inputMaximum: 2000, inputDefault: 0, outputLabel: "Maximum replaceable gp", baseByLevel: Array.from({ length: 19 }, (_, index) => ({ level: index + 2, value: (index + 2) * 100 })), classId: "bard", summary: "The fortune-telling focus can replace a divination material component costing no more than 100 gp per Bard level." }];
acumen.resourceActions = [{ id: "fortune-teller-acumen", label: "Apply Acumen caster-level bonus", minimumLevel: 2, classId: "bard", confirmations: [
  { id: "divination", label: "The spell is from the divination school", requiredForActivation: true },
  { id: "both-components", label: "Use both the fortune-telling focus and the normal material component", requiredForActivation: true },
], activeEffect: { name: "Fortune-Teller's Acumen", targets: ["casterLevel"], bonus: 1, defaultRounds: 1, fixedRounds: true, consumeOnUse: true, description: "+1 caster level for the next qualifying divination spell; cannot combine with another similar special focus." }, summary: "Validate the component limit above or consume the one-cast +1 caster-level effect." }];
transparent.performanceRules = [{ id: "fortune-teller-transparent-fate", name: "Transparent Fate", minimumLevel: 8, kind: "active", resourceId: "bardicPerformance", cost: 1, actionIds: ["fortune-teller-transparent-fate"], summary: "Reveal the near future of enemies within 30 feet; Will negates." }];
transparent.resourceActions = [{ id: "fortune-teller-transparent-fate", label: "Begin Transparent Fate", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(8), savingThrow: save(), targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 8, range: "30 feet" }], effectsByLevel: [{ level: 8, name: "Transparent Fate", description: "Creatures attacked by this enemy gain +2 AC and +2 on saving throws against the attack. If the enemy falls below its Constitution score, resolve its once-per-performance secondary Will save or frighten it for 1 round.", activeEffects: [
  { target: "armorClass", bonus: 2, label: "Transparent Fate — AC", description: "+2 AC against attacks by the affected enemy." },
  { target: "savingThrows", bonus: 2, label: "Transparent Fate — saves", description: "+2 on saving throws against attacks by the affected enemy." },
], duration: { kind: "fixed-rounds", rounds: 1 } }] }, summary: "Spend one performance round, resolve the exact performance save DC, and track both defensive bonuses and the secondary fear trigger." }];
fortune.value.mechanicalCoverage = "full";
fortune.value.mechanicalNotes = ["All divination additions, the exact hourly d100-plus-level outcome table and effects, Acumen component limit and caster-level bonus, and Transparent Fate saves and defenses are automated."];

// Hoaxer: level-aware hex choices, performance workflows, conditional bonuses, and item-creation choices.
const hoaxer = await load("bard-hoaxer");
const counterfeiter = feature(hoaxer.value, "bard-hoaxer-counterfeiter-ex-1");
const hoaxPerformance = feature(hoaxer.value, "bard-hoaxer-bardic-performance-su-1") ?? features(hoaxer.value).find((candidate) => candidate.id.startsWith("bard-hoaxer-hex-"));
const misery = feature(hoaxer.value, "bard-hoaxer-misery-ex-2");
const versed = feature(hoaxer.value, "bard-hoaxer-versed-in-curses-ex-2");
const crafter = feature(hoaxer.value, "bard-hoaxer-curse-crafter-ex-5") ?? features(hoaxer.value).find((candidate) => candidate.id.startsWith("bard-hoaxer-curse-crafter-"));
if (![counterfeiter, hoaxPerformance, misery, versed, crafter].every(Boolean)) throw new Error("Hoaxer source features were not found");
hoaxer.value.skillBonusAdjustments = ["Appraise", "Bluff", "Sleight of Hand"].map((skill) => ({ sourceFeatureId: counterfeiter.id, skill, minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 1 })).concat(["Craft", "Knowledge", "Linguistics", "Perception", "Profession"].map((skill) => ({ sourceFeatureId: counterfeiter.id, skill, minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 1, condition: "checks to create or detect a counterfeit or forgery; may be attempted untrained" })));
const witchHexes = await loadJson("packages/data/src/options/witch-hexes.json");
const basicHexIds = ["hex-blight", "hex-charm", "hex-evil-eye", "hex-fortune", "hex-healing", "hex-misfortune", "hex-slumber", "hex-unnerve-beasts"];
const majorHexIds = ["major-hex-agony", "major-hex-hoarfrost", "major-hex-ice-tomb", "major-hex-infected-wounds", "major-hex-nightmares", "major-hex-retribution", "major-hex-speak-in-dreams"];
const knownHexes = new Map(witchHexes.options.map((option) => [option.id, option]));
const missingHexes = {
  "hex-unnerve-beasts": ["Unnerve Beasts", "Make animals hostile toward the target."],
  "major-hex-ice-tomb": ["Ice Tomb", "Entomb a creature in supernatural ice."],
  "major-hex-infected-wounds": ["Infected Wounds", "Cause wounds to fester and resist magical healing."],
  "major-hex-speak-in-dreams": ["Speak in Dreams", "Send a message to a sleeping creature through its dreams."],
};
const hoaxHexOptions = [...basicHexIds, ...majorHexIds].map((id) => {
  const source = knownHexes.get(id);
  const [name, benefit] = source ? [source.name, source.benefit] : missingHexes[id];
  return { id: `bard-hoaxer-${id}`, name, groupId: "bard-hoaxer-hexes", classIds: ["bard"], minimumLevel: majorHexIds.includes(id) ? 12 : 1, prerequisites: [], benefit, source: hoaxer.value.source };
});
await writeJson("packages/data/src/options/bard-hoaxer-hexes.json", { id: "bard-hoaxer-hexes", name: "Hoaxer Hexes", classIds: ["bard"], uniqueAcrossSelections: true, options: hoaxHexOptions, source: hoaxer.value.source });
const hexLevels = [1, 3, 6, 9, 12, 15, 18];
const hexFeatures = hexLevels.map((level, index) => ({
  ...(index === 0 ? hoaxPerformance : {}), id: `bard-hoaxer-hex-${level}`, name: `Bad Deal Hex ${index + 1}`, level, type: "selectable", choiceRequired: true, optionGroupId: "bard-hoaxer-hexes", optionChoiceIds: (level >= 12 ? [...basicHexIds, ...majorHexIds] : basicHexIds).map((id) => `bard-hoaxer-${id}`), summary: `Choose one ${level >= 12 ? "basic or major " : ""}hex for Bad Deal; duplicate choices are disabled.`,
}));
replaceFeatureFamily(hoaxer.value, (candidate) => candidate.id === "bard-hoaxer-bardic-performance-su-1" || candidate.id.startsWith("bard-hoaxer-hex-"), hexFeatures);
const firstHex = feature(hoaxer.value, "bard-hoaxer-hex-1");
firstHex.performanceRules = [
  { id: "hoaxer-bad-deal", name: "Bad Deal", minimumLevel: 1, kind: "active", resourceId: "bardicPerformance", cost: 1, actionIds: ["hoaxer-bad-deal"], summary: "Invest a selected hex into a nonmagical one-handed object and maintain it each round." },
  { id: "hoaxer-buyer-beware", name: "Buyer Beware", minimumLevel: 1, kind: "active", resourceId: "bardicPerformance", cost: 1, actionIds: ["hoaxer-buyer-beware"], summary: "Use beguiling gift with the Bard performance save DC." },
  { id: "hoaxer-personal-guarantee", name: "Personal Guarantee", minimumLevel: 1, kind: "active", resourceId: "bardicPerformance", actionIds: ["hoaxer-personal-guarantee"], summary: "Spend up to Bard level in extra rounds to delay the hex by that many minutes." },
  { id: "hoaxer-curse-breaker", name: "Curse Breaker", minimumLevel: 12, kind: "active", resourceId: "bardicPerformance", cost: 5, actionIds: ["hoaxer-curse-breaker"], summary: "Create break enchantment as soothing performance." },
];
firstHex.resourceActions = [{ id: "hoaxer-bad-deal", label: "Invest Bad Deal", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 1, actionType: "standard" }], confirmations: [{ id: "object", label: "The object is nonmagical, one-handed, and in your possession", requiredForActivation: true }], activeEffect: tracker("Bad Deal", ["enemy"], "Selected hex is invested in the object; spend one performance round as a swift action each round to maintain it until accepted, dropped, or triggered.", { defaultRounds: 1, replaceExisting: true }), summary: "Choose the hex above, spend one performance round, and track the invested object." },
  { id: "hoaxer-buyer-beware", label: "Use Buyer Beware", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 1, actionType: "standard" }], savingThrow: save(), targetEffectRoll: { modifier: "will", effectsByLevel: [{ level: 1, name: "Buyer Beware", description: "Target accepts the offered object as beguiling gift, including a Bad Deal object.", duration: { kind: "fixed-rounds", rounds: 1 } }] }, summary: "Spend one round and resolve beguiling gift with the exact Bard performance save DC." },
  { id: "hoaxer-personal-guarantee", label: "Delay Bad Deal", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", variableCost: { label: "Minutes of delay", minimum: 1, maximumByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, maximum: index + 1 })) }, activeEffect: tracker("Personal Guarantee", ["enemy"], "The invested hex triggers after {amount} minute(s), unless otherwise triggered later by the Bad Deal rules.", { defaultRounds: 999, fixedRounds: true, replaceExisting: true }), summary: "Spend one performance round per minute of delay, capped at Bard level." },
  { id: "hoaxer-curse-breaker", label: "Use Curse Breaker", minimumLevel: 12, classId: "bard", resourceId: "bardicPerformance", cost: 5, actionTypeByLevel: [{ level: 12, actionType: "full-round" }], spellLikeAbility: { spellId: "break-enchantment", spellName: "Break Enchantment", cadence: "at-will", kind: "spell-equivalent" }, summary: "Spend five performance rounds and resolve break enchantment as soothing performance." }];
const miseryBonus = [{ level: 2, bonus: 1 }, { level: 5, bonus: 2 }, { level: 11, bonus: 3 }, { level: 17, bonus: 4 }];
hoaxer.value.conditionalModifiers = [
  { sourceFeatureId: misery.id, label: "Misery — attacks", condition: "attack rolls against creatures suffering from a curse, hex, or harmful mind-affecting effect", minimumLevel: 2, base: 1, bonusByLevel: miseryBonus },
  { sourceFeatureId: misery.id, label: "Misery — damage", condition: "damage rolls against creatures suffering from a curse, hex, or harmful mind-affecting effect", minimumLevel: 2, base: 1, bonusByLevel: miseryBonus },
  { sourceFeatureId: misery.id, label: "Misery — Will", condition: "Will saves against spells from creatures suffering from a curse, hex, or harmful mind-affecting effect", minimumLevel: 2, base: 1, bonusByLevel: miseryBonus },
  { sourceFeatureId: versed.id, label: "Versed in Curses", condition: "saving throws against curses, hexes, and language-dependent effects", minimumLevel: 2, base: 4 },
];
replaceFeatureFamily(hoaxer.value, (candidate) => candidate.id === "bard-hoaxer-curse-crafter-ex-5" || candidate.id.startsWith("bard-hoaxer-curse-crafter-"), [{
  id: "bard-hoaxer-curse-crafter-ex-5", name: "Curse Crafter (Ex)", level: 5, type: "archetype",
  summary: "At 5th level, a hoaxer learns how to craft cursed items. He gains one item creation feat as a bonus feat at 5th level, plus an additional item creation feat every 6 levels thereafter. He can use these feats only to craft cursed items. In addition, he can craft items that appear magical but have no true magical properties—as if permanently affected by the magic aura spell—for 50 gp. This ability replaces lore master.",
  resourceActions: [{ id: "hoaxer-curse-crafter", label: "Track Curse Crafter project", minimumLevel: 5, classId: "bard", modeLabel: "Project", modes: [
    { id: "cursed-item", label: "Cursed magic item", summary: "Use one of the level-gated item creation feats granted below; it functions only for cursed items." },
    { id: "false-aura", label: "False magic aura item", summary: "Spend 50 gp to create an item that appears magical but has no true magical properties." },
  ], activeEffect: tracker("Curse Crafter project", ["self"], "Track the selected cursed-item or permanent false-aura crafting project and its restrictions.", { defaultRounds: 999, fixedRounds: true, replaceExisting: true }), summary: "The inferred feat selectors grant item creation feats at levels 5, 11, and 17; this action records their restricted use." }],
}]);
hoaxer.value.mechanicalCoverage = "full";
hoaxer.value.mechanicalNotes = ["Counterfeiter bonuses, seven unique level-aware hex choices, all four performances, Misery scaling, Versed in Curses, and three item-creation feat choices are automated."];

// Dirge Bard: undead performance, defenses, necromancy choices, and fear workflow.
const dirge = await load("bard-dirge-bard");
const dance = feature(dirge.value, "bard-dirge-bard-bardic-performance-10");
const haunted = feature(dirge.value, "bard-dirge-bard-haunted-eyes-ex-2");
const grave = feature(dirge.value, "bard-dirge-bard-secrets-of-the-grave-ex-2") ?? features(dirge.value).find((candidate) => candidate.id.startsWith("bard-dirge-bard-secrets-of-the-grave-"));
const refrain = feature(dirge.value, "bard-dirge-bard-haunting-refrain-su-5");
if (![dance, haunted, grave, refrain].every(Boolean)) throw new Error("Dirge Bard source features were not found");
dance.performanceRules = [{ id: "dirge-dance-dead", name: "Dance of the Dead", minimumLevel: 10, kind: "active", resourceId: "bardicPerformance", cost: 1, actionIds: ["dirge-dance-dead"], summary: "Animate skeletons or zombies only while the performance continues." }];
dance.resourceActions = [{ id: "dirge-dance-dead", label: "Begin Dance of the Dead", minimumLevel: 10, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(10), confirmations: [{ id: "corpses", label: "Each selected body or set of bones has not been animated by this performance before", requiredForActivation: true }], activeEffect: tracker("Dance of the Dead", ["area"], "Skeletons or zombies remain animate only while this performance is maintained; no components and no evil descriptor. The control limit is displayed in the feature profile.", { defaultRounds: 1, replaceExisting: true }), summary: "Spend one performance round per round and track the temporary animate dead effect." }];
dance.progressionProfiles = [profile("dirge-dance-dead-capacity", "Dance of the Dead control limit", Array.from({ length: 11 }, (_, index) => ({ level: index + 10, values: { benefit: `${(index + 10) * 4} HD controlled (animate dead limit)` } })), "Control at most 4 HD of undead per Bard level; corpses collapse when the performance ends.")];
dirge.value.conditionalModifiers = ["fear", "energy drain", "death effects", "necromantic effects"].map((condition) => ({ sourceFeatureId: haunted.id, label: `Haunted Eyes — ${condition}`, condition: `saving throws against ${condition}`, minimumLevel: 2, base: 4 }));
dirge.value.skillBonusAdjustments = [{ sourceFeatureId: "bard-dirge-bard-secrets-of-the-grave-2", skill: "Knowledge (religion)", minimumLevel: 2, base: 0, levelDivisor: 2, condition: "checks to identify undead and their abilities" }];
const necromancySpells = spells.filter((spell) => spell.school === "necromancy" && ["wizard", "sorcerer", "arcanist", "witch", "magus"].some((id) => Number.isInteger(spell.levelByClass[id]))).map((spell) => ({ spell, spellLevel: Math.min(...["wizard", "sorcerer", "arcanist", "witch", "magus"].map((id) => spell.levelByClass[id]).filter(Number.isInteger)) })).filter(({ spellLevel }) => spellLevel <= 6).sort((left, right) => left.spellLevel - right.spellLevel || left.spell.name.localeCompare(right.spell.name));
const bardSpellUnlock = { 0: 1, 1: 2, 2: 4, 3: 7, 4: 10, 5: 13, 6: 16 };
await writeJson("packages/data/src/options/bard-dirge-necromancy-spells.json", { id: "bard-dirge-necromancy-spells", name: "Dirge Bard Necromancy Spells", classIds: ["bard"], uniqueAcrossSelections: true, options: necromancySpells.map(({ spell, spellLevel }) => ({ id: `bard-dirge-${spell.id}`, name: spell.name, groupId: "bard-dirge-necromancy-spells", classIds: ["bard"], minimumLevel: bardSpellUnlock[spellLevel], prerequisites: [], benefit: `${spellLevel === 0 ? "Cantrip" : `Level ${spellLevel}`} necromancy spell added to Bard spells known. ${spell.summary}`, spellId: spell.id, spellLevel, source: spell.source })), source: dirge.value.source });
replaceFeatureFamily(dirge.value, (candidate) => candidate.id === "bard-dirge-bard-secrets-of-the-grave-ex-2" || candidate.id.startsWith("bard-dirge-bard-secrets-of-the-grave-"), [2, 6, 10, 14, 18].map((level, index) => ({ ...grave, id: `bard-dirge-bard-secrets-of-the-grave-${level}`, name: `Secrets of the Grave ${index + 1}`, level, type: "selectable", choiceRequired: true, optionGroupId: "bard-dirge-necromancy-spells", summary: `Choose an arcane necromancy spell of a level the Bard can cast and add it to spells known (${index + 1} of 5).${index === 0 ? " Mind-affecting spells can affect undead as living creatures, including mindless undead, but humanoid-only spells remain restricted." : ""}` })));
refrain.resourceActions = [{ id: "dirge-haunting-refrain-demoralize", label: "Demoralize with Haunting Refrain", minimumLevel: 5, classId: "bard", modeLabel: "Perform skill", modes: [{ id: "keyboard", label: "Perform (keyboard)", summary: "Use the character's Perform (keyboard) modifier." }, { id: "percussion", label: "Perform (percussion)", summary: "Use the character's Perform (percussion) modifier." }], diceRoll: { label: "Perform check", diceCountByLevel: [{ level: 5, count: 1 }], dieSidesByLevel: [{ level: 5, sides: 20 }], modifierInputLabel: "Selected Perform modifier", flatModifierByLevel: Array.from({ length: 16 }, (_, index) => ({ level: index + 5, modifier: Math.floor((index + 5) / 2) })), targetDcInputLabel: "Demoralize DC", outcomesByMargin: [{ minimumMargin: 0, label: "demoralized" }], failureLabel: "not demoralized" }, summary: "Roll the selected Perform skill in place of Intimidate and add half Bard level." }, { id: "dirge-haunting-refrain-fear", label: "Apply Haunting Refrain fear penalty", minimumLevel: 5, classId: "bard", activeEffect: { name: "Haunting Refrain", targets: ["savingThrows"], bonus: -2, bonusByLevel: [{ level: 5, bonus: -2 }, { level: 10, bonus: -3 }, { level: 15, bonus: -4 }, { level: 20, bonus: -5 }], defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "Penalty on saving throws against fear effects created by the Dirge Bard." }, summary: "Apply the exact level-scaled save penalty to the target for the fear effect being resolved." }];
dirge.value.mechanicalCoverage = "full";
dirge.value.mechanicalNotes = ["Dance of the Dead resource and control limit, Haunted Eyes saves, undead identification, five unique level-gated necromancy spells known, undead mind-affecting permission, and both Haunting Refrain paths are automated."];

// Luring Piper: creature-type modifiers, all performances, and conditional defenses.
const piper = await load("bard-luring-piper");
const presentation = feature(piper.value, "bard-luring-piper-luring-presentation-ex-1");
const piperPerformance = feature(piper.value, "bard-luring-piper-bardic-performance-8");
const attention = feature(piper.value, "bard-luring-piper-piper-s-attention-ex-2");
if (![presentation, piperPerformance, attention].every(Boolean)) throw new Error("Luring Piper source features were not found");
presentation.resourceActions = [{ id: "luring-piper-presentation", label: "Set Luring Presentation target", minimumLevel: 1, classId: "bard", modeLabel: "Creature type", modes: [
  { id: "animal-fey", label: "Animal or fey", summary: "Target takes −2 on saves against the Piper's performances.", activeEffects: [{ target: "performanceSaveDc", bonus: 2, label: "Luring Presentation — animal/fey", description: "Increase performance save DC by 2 for this animal or fey target." }] },
  { id: "other", label: "Any other type", summary: "Target gains +2 on saves against the Piper's performances.", activeEffects: [{ target: "performanceSaveDc", bonus: -2, label: "Luring Presentation — other", description: "Reduce performance save DC by 2 for this target." }] },
], activeEffect: tracker("Luring Presentation", ["enemy"], "The selected creature-type adjustment applies to saves against the Piper's bardic performances.", { defaultRounds: 1, fixedRounds: true, replaceExisting: true }), summary: "Apply the exact ±2 save adjustment for the target type." }];
piperPerformance.performanceRules = [
  { id: "piper-charming-melody", name: "Charming Melody", minimumLevel: 1, kind: "passive", summary: "Animals and fey fascinated by wind-instrument performance calmly approach and follow the Piper." },
  { id: "piper-deadly-lure", name: "Deadly Lure", minimumLevel: 8, kind: "active", resourceId: "bardicPerformance", cost: 1, actionIds: ["piper-deadly-lure"], summary: "Use suggestion on an animal or fey for self-harming actions, with a second save before harm." },
  { id: "piper-fey-wounding-song", name: "Fey-Wounding Song", minimumLevel: 12, kind: "active", resourceId: "bardicPerformance", cost: 3, actionIds: ["piper-fey-wounding-song"], summary: "Spend three rounds to duplicate mass inflict serious wounds against fey only." },
];
piperPerformance.resourceActions = [{ id: "piper-deadly-lure", label: "Use Deadly Lure", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(8), confirmations: [{ id: "animal-fey", label: "Target is an animal or fey and can hear the wind instrument", requiredForActivation: true }], savingThrow: save(), targetEffectRoll: { modifier: "will", effectsByLevel: [{ level: 8, name: "Deadly Lure", description: "Suggestion can direct self-harm; resolve a second save immediately before the target completes a self-harming action.", duration: { kind: "level-hours" } }] }, summary: "Spend one round, resolve suggestion, and track the required second save." },
  { id: "piper-fey-wounding-song", label: "Play Fey-Wounding Song", minimumLevel: 12, classId: "bard", resourceId: "bardicPerformance", cost: 3, actionTypeByLevel: [{ level: 12, actionType: "full-round" }], confirmations: [{ id: "fey", label: "All targets are fey", requiredForActivation: true }], savingThrow: save("Will"), diceRoll: { label: "Mass inflict serious wounds", diceCountByLevel: [{ level: 12, count: 3 }], dieSidesByLevel: [{ level: 12, sides: 8 }], flatModifierByLevel: Array.from({ length: 9 }, (_, index) => ({ level: index + 12, modifier: Math.min(15, index + 12) })), modeEffects: [{ modeId: "damage", kind: "damage", targetSave: { modifier: "will", outcome: "half" } }] }, modes: [{ id: "damage", label: "Negative energy damage", summary: "Deals 3d8 + Bard level (maximum +15) to fey; Will half." }], summary: "Spend three performance rounds and roll the exact fey-only mass inflict serious wounds damage." }];
attention.resourceActions = [{ id: "piper-attention-saves", label: "Apply Piper's Attention", minimumLevel: 2, classId: "bard", confirmations: [{ id: "performing", label: "Actively using Perform (wind instruments) for bardic performance", requiredForActivation: true }], activeEffect: { name: "Piper's Attention", targets: ["savingThrows"], bonus: 4, defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "+4 on saves against language-dependent, mind-affecting, and sonic effects." }, summary: "Apply the +4 save bonus for the active wind performance." }, { id: "piper-attention-fey-reroll", label: "Reroll Piper's Attention save vs fey", minimumLevel: 2, classId: "bard", confirmations: [{ id: "fey", label: "The effect was caused by a fey creature", requiredForActivation: true }], rerollAction: { kind: "higher-d20", label: "Roll twice and use the better saving throw" }, summary: "Enter the first total and modifier, roll the second save, and keep the higher result." }];
piper.value.mechanicalCoverage = "full";
piper.value.mechanicalNotes = ["Class skill, Fey Secrets, creature-type performance DC adjustment, Charming Melody, Deadly Lure, Fey-Wounding Song, and both Piper's Attention save paths are automated."];

// Mute Musician: speech state, spell and feat grants, all performances, defenses, and planar transmission.
const mute = await load("bard-mute-musician");
const muteFeature = feature(mute.value, "bard-mute-musician-mute-ex-1");
const eschew = feature(mute.value, "bard-mute-musician-eschew-materials-ex-1");
const mutePerformance = feature(mute.value, "bard-mute-musician-bardic-performance-3");
const insights = feature(mute.value, "bard-mute-musician-insights-from-beyond-ex-2") ?? features(mute.value).find((candidate) => candidate.id.startsWith("bard-mute-musician-insight-spell-"));
const dulled = feature(mute.value, "bard-mute-musician-dulled-horror-ex-2");
const caesura = feature(mute.value, "bard-mute-musician-eldritch-caesura-su-10");
const exMute = feature(mute.value, "bard-mute-musician-ex-mute-musicians-1");
if (![muteFeature, eschew, mutePerformance, insights, dulled, caesura, exMute].every(Boolean)) throw new Error("Mute Musician source features were not found");
muteFeature.resourceActions = [{ id: "mute-musician-vow", label: "Track Mute state", minimumLevel: 1, classId: "bard", activeEffect: tracker("Mute Musician vow", ["self"], "Cannot speak, sing, or use Perform (oratory); language-dependent communication needs telepathy, a nonverbal language, or writing. Ranked instruments provide verbal and somatic spell components.", { defaultRounds: 999, fixedRounds: true, replaceExisting: true }), summary: "Activate the persistent speech and component restrictions." }];
eschew.grantedFeatId = "eschew-materials";
mutePerformance.performanceRules = [
  { id: "mute-symphony-silence", name: "Symphony of Silence", minimumLevel: 3, kind: "active", resourceId: "bardicPerformance", cost: 1, actionIds: ["mute-symphony-silence"], summary: "Muffle sound and grant the level-scaled save bonus in 30 feet." },
  { id: "mute-maddening-harmonics", name: "Maddening Harmonics", minimumLevel: 14, kind: "active", resourceId: "bardicPerformance", cost: 1, actionIds: ["mute-maddening-harmonics"], summary: "Selected creatures in 30 feet save or remain confused while hearing the performance." },
  { id: "mute-ceaseless-performance", name: "Ceaseless Performance", minimumLevel: 15, kind: "passive", summary: "Continue the free maintenance action through listed conditions and death until bodily destruction or rounds expire." },
  { id: "mute-song-conjunction", name: "Song of the Conjunction", minimumLevel: 18, kind: "active", resourceId: "bardicPerformance", cost: 1, actionIds: ["mute-song-conjunction"], summary: "Duplicate gate for same-plane travel without a distance limit." },
];
mutePerformance.resourceActions = [{ id: "mute-symphony-silence", label: "Begin Symphony of Silence", minimumLevel: 3, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(3), activeEffect: { name: "Symphony of Silence", targets: ["savingThrows"], bonus: 2, bonusByLevel: [{ level: 3, bonus: 2 }, { level: 7, bonus: 3 }, { level: 11, bonus: 4 }, { level: 15, bonus: 5 }, { level: 19, bonus: 6 }], defaultRounds: 1, fixedRounds: true, replaceExisting: true, description: "Within 30 feet, +2 to +6 on saves against sonic attacks and language-dependent effects." }, summary: "Spend one performance round and apply the exact level-scaled save bonus." },
  { id: "mute-maddening-harmonics", label: "Begin Maddening Harmonics", minimumLevel: 14, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(14), savingThrow: save(), targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 14, range: "30 feet" }], effectsByLevel: [{ level: 14, name: "Confused", description: "Confused for as long as the creature can hear Maddening Harmonics.", duration: { kind: "fixed-rounds", rounds: 1 } }], successEffect: { name: "Maddening Harmonics immunity", description: "Immune to this Mute Musician's Maddening Harmonics for 24 hours.", rounds: 999 } }, summary: "Spend one round, resolve the exact Will DC, and track confusion or 24-hour immunity." },
  { id: "mute-song-conjunction", label: "Use Song of the Conjunction", minimumLevel: 18, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: bardSpeed(18), confirmations: [{ id: "same-plane", label: "Destination is on the same plane", requiredForActivation: true }], spellLikeAbility: { spellId: "gate", spellName: "Gate (travel only, same plane)", cadence: "at-will", kind: "spell-equivalent" }, summary: "Spend one performance round and travel to any destination on the same plane." }];
const spellUnlock = { 0: 1, 1: 2, 2: 4, 3: 7, 4: 10, 5: 13, 6: 16 };
const callingSummoningTeleportation = (spell) => /\b(?:call|calling|gate|planar|summon|teleport|transport|dimension door|jaunt|refuge)\b/i.test(`${spell.name} ${spell.summary} ${spell.description}`);
const insightSpells = spells.map((spell) => ({ spell, spellLevel: Math.min(...[spell.levelByClass.wizard, spell.levelByClass.sorcerer].filter(Number.isInteger)) })).filter(({ spell, spellLevel }) => Number.isInteger(spellLevel) && spellLevel <= 6 && (spell.school === "abjuration" || spell.school === "conjuration" && callingSummoningTeleportation(spell))).sort((left, right) => left.spellLevel - right.spellLevel || left.spell.name.localeCompare(right.spell.name));
await writeJson("packages/data/src/options/bard-mute-insight-spells.json", { id: "bard-mute-insight-spells", name: "Insights from Beyond Spells", classIds: ["bard"], uniqueAcrossSelections: true, options: insightSpells.map(({ spell, spellLevel }) => ({ id: `bard-mute-${spell.id}`, name: spell.name, groupId: "bard-mute-insight-spells", classIds: ["bard"], minimumLevel: spellUnlock[spellLevel], prerequisites: [], benefit: `${spellLevel === 0 ? "Cantrip" : `Level ${spellLevel}`} qualifying Sorcerer/Wizard spell added to Bard spells known. ${spell.summary}`, spellId: spell.id, spellLevel, source: spell.source })), source: mute.value.source });
const insightFeatures = [2, 2, 6, 6, 10, 10, 14, 14, 18, 18].map((level, index) => ({ ...insights, id: `bard-mute-musician-insight-spell-${index + 1}`, name: `Insight Spell ${index + 1}`, level, type: "selectable", choiceRequired: true, optionGroupId: "bard-mute-insight-spells", summary: `Choose a qualifying abjuration, calling, summoning, or teleportation Sorcerer/Wizard spell of a level the Bard can cast and add it to spells known (${index + 1} of 10).` }));
replaceFeatureFamily(mute.value, (candidate) => candidate.id === "bard-mute-musician-insights-from-beyond-ex-2" || candidate.id.startsWith("bard-mute-musician-insight-spell-"), insightFeatures);
mute.value.conditionalModifiers = ["confusion", "fear", "insanity effects", "supernatural abilities of aberrations"].map((condition) => ({ sourceFeatureId: dulled.id, label: `Dulled Horror — ${condition}`, condition: `saving throws against ${condition}`, minimumLevel: 2, base: 4 }));
caesura.resourceActions = [{ id: "mute-eldritch-caesura", label: "Use Eldritch Caesura", minimumLevel: 10, classId: "bard", resourceId: "bardicPerformance", cost: 1, minimumResourceRemaining: 1, confirmations: [{ id: "audible", label: "An audible performance or sonic Bard spell is active", requiredForActivation: true }], activeEffect: tracker("Eldritch Caesura", ["area"], "Spend this additional performance round to transmit the audible performance or sonic Bard spell through planar boundaries, vacuums, and magical silence; lead still blocks it.", { defaultRounds: 1, fixedRounds: true, replaceExisting: true }), summary: "Spend the additional round and track barrier-bypassing transmission for this round." }];
exMute.resourceActions = [{ id: "mute-musician-broken-vow", label: "Mark speech and suspend archetype", minimumLevel: 1, classId: "bard", activeEffect: tracker("Mute Musician abilities suspended", ["self"], "All abilities from this archetype are lost after speaking or regaining speech. Remove this tracker only after 24 hours without speaking.", { defaultRounds: 999, fixedRounds: true, replaceExisting: true }), summary: "Track loss of every archetype ability until the 24-hour silence requirement is completed." }];
mute.value.mechanicalCoverage = "full";
mute.value.mechanicalNotes = ["Mute and broken-vow states, Eschew Materials, all four performances, ten unique level-gated spells known, Dulled Horror saves, and Eldritch Caesura resource and barrier rules are automated."];

await Promise.all([fortune, hoaxer, dirge, piper, mute].map(write));
console.log(`Annotated five occult-performer Bard archetypes with ${hoaxHexOptions.length} hex options, ${necromancySpells.length} necromancy spells, and ${insightSpells.length} insight spells.`);
