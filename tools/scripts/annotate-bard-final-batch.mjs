import { readFile, writeFile } from "node:fs/promises";
import spells from "../../generated/pf1e-spells.mjs";

const root = new URL("../../", import.meta.url);
const load = async (id) => {
  const url = new URL(`packages/data/src/archetypes/${id}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const write = ({ url, value }) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const writeJson = (path, value) => writeFile(new URL(path, root), `${JSON.stringify(value, null, 2)}\n`);
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const named = (record, pattern) => features(record).find((candidate) => pattern.test(candidate.name));
const save = (label = "Will") => ({ label, ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" });
const tracker = (name, description, extra = {}) => ({ name, targets: ["self"], bonus: 0, description, defaultRounds: 1, replaceExisting: true, ...extra });
const performance = (id, name, minimumLevel, summary, cost = 1) => ({ id, name, minimumLevel, kind: "active", resourceId: "bardicPerformance", cost, actionIds: [id], summary });
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

// Arrowsong Minstrel: dynamic initial spell-access choices, five later choices,
// special feat-prerequisite BAB, weapon rules, bonus feat, and ranged spellstrike.
const arrowsong = await load("bard-arrowsong-minstrel");
const arrowWeapon = named(arrowsong.value, /^Weapon Proficiency$/);
const arcaneArchery = named(arrowsong.value, /^Arcane Archery(?: |$)/);
const precise = named(arrowsong.value, /^Precise Minstrel/);
const strike = named(arrowsong.value, /^Arrowsong Strike/);
if (![arrowWeapon, arcaneArchery, precise, strike].every(Boolean)) throw new Error("Arrowsong source features were not found");
const namedArrowSpells = new Set(["acid-arrow", "arrow-eruption", "flame-arrow", "gravity-bow", "greater-magic-weapon", "longshot", "magic-weapon", "protection-from-arrows", "spectral-hand", "true-strike"]);
const arrowSpellOptions = spells.flatMap((spell) => {
  const arcaneLevel = Math.min(spell.levelByClass.wizard ?? 99, spell.levelByClass.sorcerer ?? 99);
  if (arcaneLevel > 6 || spell.levelByClass.bard !== undefined || (spell.school !== "evocation" && !namedArrowSpells.has(spell.id))) return [];
  return [{ id: `arrowsong-spell-${spell.id}`, name: spell.name, groupId: "bard-arrowsong-spells", classIds: ["bard"], minimumLevel: 1, prerequisites: [], benefit: `Add ${spell.name} to the Arrowsong Minstrel's Bard spell list at spell level ${arcaneLevel}; it must still be selected as a spell known. ${spell.summary}`, spellId: spell.id, spellLevel: arcaneLevel, spellAccessOnly: true, source: spell.source }];
}).sort((left, right) => left.spellLevel - right.spellLevel || left.name.localeCompare(right.name));
await writeJson("packages/data/src/options/bard-arrowsong-spells.json", { id: "bard-arrowsong-spells", name: "Arrowsong Minstrel Spells", classIds: ["bard"], uniqueAcrossSelections: true, options: arrowSpellOptions, source: arrowsong.value.source });
const arcaneArcheryChoiceSummary = "The builder creates a number of initial spell-list choices equal to the current Charisma modifier (minimum 1).";
Object.assign(arcaneArchery, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "bard-arrowsong-spells",
  choiceCount: { base: 0, abilityModifier: "charisma", minimum: 1, maximum: 20 },
  summary: `${arcaneArchery.summary.split(` ${arcaneArcheryChoiceSummary}`)[0]} ${arcaneArcheryChoiceSummary}`,
});
replaceFeatureFamily(arrowsong.value, (candidate) => candidate.id === arcaneArchery.id || candidate.id.startsWith("bard-arrowsong-minstrel-arcane-archery-spell-"), [
  arcaneArchery,
  ...[4, 8, 12, 16, 20].map((level) => ({ id: `bard-arrowsong-minstrel-arcane-archery-spell-${level}`, name: `Arcane Archery Spell (${level}th)`, level, type: "selectable", choiceRequired: true, optionGroupId: "bard-arrowsong-spells", summary: "Choose one additional legal Sorcerer/Wizard spell and add it to the Bard spell list; it must still be selected as a spell known." })),
]);
arrowsong.value.featPrerequisiteBabUsesClassLevel = true;
delete arrowsong.value.proficiencyAdjustments;
precise.grantedFeatId = "precise-shot";
precise.resourceActions = [{ id: "arrowsong-precise-minstrel", label: "Track Precise Minstrel", minimumLevel: 2, classId: "bard", confirmations: [{ id: "bow", label: "The ranged attack uses a bow", requiredForActivation: true }, { id: "performance", label: "The intervening creature is affected by your Bardic Performance", requiredForActivation: true }], activeEffect: tracker("Precise Minstrel", "The affected creature does not provide soft cover against this bow attack."), summary: "Track the soft-cover exception for an eligible bow attack." }];
strike.resourceActions = [{ id: "arrowsong-strike", label: "Use Arrowsong Strike", minimumLevel: 6, classId: "bard", actionTypeByLevel: [{ level: 6, actionType: "standard" }, { level: 18, actionType: "full-round" }], modes: [{ id: "single", label: "Single ranged spellstrike", summary: "Deliver one single-target ranged-touch spell effect through one ranged weapon attack." }, { id: "multi", label: "Full-attack rays/effects", minimumLevel: 18, summary: "Deliver one ray or line of effect with each full-attack attack, up to the spell's maximum; unused effects are lost." }], confirmations: [{ id: "eligible-spell", label: "The spell uses a ranged touch attack and the delivery weapon is ranged", requiredForActivation: true }], activeEffect: tracker("Arrowsong Strike", "Resolve the selected ranged spellstrike mode as part of the ranged weapon attack."), summary: "Track the level-aware ranged spellstrike delivery mode." }];
arrowsong.value.mechanicalCoverage = "full";
arrowsong.value.mechanicalNotes = ["Weapon changes, diminished slots, Charisma-counted unique spell-list choices, Bard-level feat BAB, Precise Shot/soft-cover handling, and both ranged spellstrike tiers are automated."];

// Dragon Herald: ancestry, patron choice, passive scaling, performances, fast social checks, and universal Draconic speech.
const dragon = await load("bard-dragon-herald");
const patron = named(dragon.value, /^Dragon Patron/);
const coat = named(dragon.value, /^Coat of Arms/);
const voice = named(dragon.value, /^Dragon Voice/);
const dragonPerformance = named(dragon.value, /^Bardic Performance$/);
const persuasion = named(dragon.value, /^Master of Persuasion/);
const extol = named(dragon.value, /^Extol Glory/);
if (![patron, coat, voice, dragonPerformance, persuasion, extol].every(Boolean)) throw new Error("Dragon Herald source features were not found");
dragon.value.requirements = [{ type: "ancestry", id: "kobold" }];
delete dragon.value.manualRequirements;
const dragons = [
  ["black", "Black dragon", "acid"], ["blue", "Blue dragon", "electricity"], ["green", "Green dragon", "acid"], ["red", "Red dragon", "fire"], ["white", "White dragon", "cold"],
  ["brass", "Brass dragon", "fire"], ["bronze", "Bronze dragon", "electricity"], ["copper", "Copper dragon", "acid"], ["gold", "Gold dragon", "fire"], ["silver", "Silver dragon", "cold"],
];
await writeJson("packages/data/src/options/bard-dragon-herald-patrons.json", { id: "bard-dragon-herald-patrons", name: "Dragon Herald Patrons", classIds: ["bard"], options: dragons.map(([id, name, energyType]) => ({ id: `dragon-herald-${id}`, name, groupId: "bard-dragon-herald-patrons", classIds: ["bard"], minimumLevel: 1, prerequisites: [], benefit: `Use ${energyType} for Coat of Arms, Diplomatic Protection, and Rebuke Foes. Record a sacred place associated with this patron.`, energyType, choice: { key: "sacred-place", label: "Sacred place", allowCustom: true }, source: dragon.value.source })), source: dragon.value.source });
Object.assign(patron, { type: "selectable", choiceRequired: true, optionGroupId: "bard-dragon-herald-patrons" });
dragon.value.defenseAdjustments = [{ sourceFeatureId: coat.id, kind: "energyResistance", label: "Coat of Arms", minimumLevel: 1, base: 0, levelMultiplier: 1, qualifier: "energy type selected by Dragon Patron", condition: "Stacks with inherent racial resistance, not magical or temporary resistance" }];
dragon.value.skillBonusAdjustments = ["Diplomacy", "Intimidate"].map((skill) => ({ sourceFeatureId: voice.id, skill, minimumLevel: 1, base: 0, levelDivisor: 2, minimum: 0 }));
voice.progressionProfiles = [{ id: "dragon-herald-language", label: "Dragon Voice", classId: "bard", columns: [{ id: "language", label: "Bonus language" }], steps: [{ level: 1, values: { language: "Draconic" } }], summary: "Draconic is granted without consuming a normal language choice." }];
dragonPerformance.performanceRules = [
  performance("dragon-diplomatic-immunity", "Diplomatic Immunity", 1, "Place sanctuary on yourself while performing and for 1 round afterward."),
  performance("dragon-diplomatic-protection", "Diplomatic Protection", 3, "Grant one ally patron-energy resistance equal to twice Bard level and natural armor enhancement equal to half Bard level."),
  performance("dragon-rebuke-foes", "Rebuke Foes", 12, "Each round damage one target per 4 Bard levels within 50 feet for twice Bard level patron-energy damage; Reflex half."),
  performance("dragon-retreat-to-lair", "Retreat to Lair", 15, "Spend 5 rounds to teleport yourself or one willing touched creature to the recorded sacred place.", 5),
];
dragonPerformance.progressionProfiles = [{ id: "dragon-rebuke-scaling", label: "Rebuke Foes", classId: "bard", columns: [{ id: "damage", label: "Patron-energy damage" }, { id: "targets", label: "Targets within 50 feet" }], steps: [{ level: 3, values: { damage: "Unavailable until level 12", targets: "—" } }, { level: 12, values: { damage: 24, targets: 3 } }, { level: 13, values: { damage: 26, targets: 3 } }, { level: 14, values: { damage: 28, targets: 3 } }, { level: 15, values: { damage: 30, targets: 3 } }, { level: 16, values: { damage: 32, targets: 4 } }, { level: 17, values: { damage: 34, targets: 4 } }, { level: 18, values: { damage: 36, targets: 4 } }, { level: 19, values: { damage: 38, targets: 4 } }, { level: 20, values: { damage: 40, targets: 5 } }], summary: "A successful Reflex save halves the displayed damage." }];
dragonPerformance.resourceActions = [
  { id: "dragon-diplomatic-immunity", label: "Begin Diplomatic Immunity", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 1, actionType: "standard" }, { level: 7, actionType: "move" }, { level: 13, actionType: "swift" }], activeEffect: tracker("Diplomatic Immunity", "Sanctuary protects the Dragon Herald while performing and for 1 round after it ends."), summary: "Spend one performance round and track sanctuary." },
  { id: "dragon-diplomatic-protection", label: "Begin Diplomatic Protection", minimumLevel: 3, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 3, actionType: "standard" }, { level: 7, actionType: "move" }, { level: 13, actionType: "swift" }], confirmations: [{ id: "ally", label: "One visible ally can perceive the performance", requiredForActivation: true }], activeEffect: tracker("Diplomatic Protection", "The ally gains patron-energy resistance equal to twice Bard level and natural armor enhancement equal to half Bard level."), summary: "Track both level-scaled defenses on one ally." },
  { id: "dragon-rebuke-foes", label: "Rebuke Foes", minimumLevel: 12, classId: "bard", resourceId: "bardicPerformance", cost: 1, targetCountByLevel: [{ level: 12, count: 3 }, { level: 16, count: 4 }, { level: 20, count: 5 }], savingThrow: save("Reflex"), modes: [...new Set(dragons.map((entry) => entry[2]))].map((energy) => ({ id: energy, label: `${energy[0].toUpperCase()}${energy.slice(1)} damage`, summary: "Choose the mode matching the selected patron." })), targetEffectRoll: { modifier: "reflex", rangeByLevel: [{ level: 12, range: "50 feet" }], effectsByLevel: [{ level: 12, name: "Rebuke Foes — full damage", description: "The target takes patron-energy damage equal to twice Bard level; a successful save instead takes half.", duration: { kind: "fixed-rounds", rounds: 1 } }] }, summary: "Once per round, resolve twice-level patron-energy damage against the level-aware number of targets within 50 feet." },
  { id: "dragon-retreat-to-lair", label: "Retreat to Lair", minimumLevel: 15, classId: "bard", resourceId: "bardicPerformance", cost: 5, actionTypeByLevel: [{ level: 15, actionType: "full-round" }], recipients: [{ id: "self", label: "Self" }, { id: "willing-target", label: "Willing touched target" }], confirmations: [{ id: "place", label: "Dragon Patron's sacred place is recorded", requiredForActivation: true }], activeEffect: tracker("Retreat to Lair", "Teleport the chosen recipient to the patron's sacred place."), summary: "Spend exactly 5 performance rounds and resolve the teleport." },
];
dragon.value.skillCheckRules = [{ sourceFeatureId: persuasion.id, label: "Master of Persuasion", minimumLevel: 5, skills: ["Diplomacy", "Intimidate"], result: 10, allowsStress: true }];
dragon.value.resourceAdjustments = [{ resourceId: "masterOfPersuasion", label: "Master of Persuasion fast check", unit: "use", operation: "replace", minimumLevel: 5, base: 1, perInterval: 1, interval: 6, maximum: 3, refreshCadence: "day", sourceFeatureId: persuasion.id }];
persuasion.resourceActions = [{ id: "dragon-fast-persuasion", label: "Make a fast social check", minimumLevel: 5, classId: "bard", resourceId: "masterOfPersuasion", cost: 1, actionTypeByLevel: [{ level: 5, actionType: "full-round" }], modeLabel: "Skill", modes: ["Diplomacy", "Intimidate"].map((label) => ({ id: label.toLowerCase(), label, summary: `Attempt ${label} as a full-round action instead of taking 1 minute.` })), diceRoll: { label: "Fast social check", diceCountByLevel: [{ level: 5, count: 1 }], dieSidesByLevel: [{ level: 5, sides: 20 }], modifierInputLabel: "Skill modifier", targetDcInputLabel: "Check DC", outcomesByMargin: [{ minimumMargin: 0, label: "Success" }], failureLabel: "Failure" }, summary: "Spend one of the level-scaled daily uses." }];
extol.resourceActions = [{ id: "dragon-extol-glory", label: "Speak universally understood Draconic", minimumLevel: 10, classId: "bard", confirmations: [{ id: "intelligent", label: "Listeners are intelligent and know at least one language", requiredForActivation: true }], activeEffect: tracker("Extol Glory", "Listeners understand the Dragon Herald's Draconic words; this does not grant the Herald understanding of their languages."), summary: "Track the one-way supernatural language effect." }];
dragon.value.mechanicalCoverage = "full";
dragon.value.mechanicalNotes = ["Kobold eligibility, patron energy and sacred-place choice, resistance and social scaling, all four performances, Master of Persuasion, Draconic, and Extol Glory are automated."];

// Duettist: familiar participation and all three performance-sharing tiers.
const duettist = await load("bard-duettist");
const versatileFamiliar = named(duettist.value, /^Versatile Familiar/);
const performingFamiliar = named(duettist.value, /^Performing Familiar/);
const harmonizingFamiliar = named(duettist.value, /^Harmonizing Familiar/);
const symphonicFamiliar = named(duettist.value, /^Symphonic Familiar/);
if (![versatileFamiliar, performingFamiliar, harmonizingFamiliar, symphonicFamiliar].every(Boolean)) throw new Error("Duettist source features were not found");
versatileFamiliar.resourceActions = [{ id: "duettist-versatile-familiar", label: "Apply Versatile Performance to familiar", minimumLevel: 2, classId: "bard", activeEffect: tracker("Versatile Familiar", "The familiar uses its master's selected Versatile Performance substitutions."), summary: "Track the familiar's access to every selected Versatile Performance." }];
performingFamiliar.performanceRules = [performance("duettist-performing-familiar", "Performing Familiar", 4, "The familiar performs one of the master's performances alone for 2 rounds of resource per round.", 2)];
performingFamiliar.resourceActions = [{ id: "duettist-performing-familiar", label: "Have familiar perform", minimumLevel: 4, classId: "bard", resourceId: "bardicPerformance", cost: 2, confirmations: [{ id: "exclusive", label: "The Duettist is not simultaneously performing", requiredForActivation: true }], activeEffect: tracker("Performing Familiar", "The familiar performs the selected Bardic Performance; starting another performance ends this one."), summary: "Spend 2 performance rounds per round." }];
harmonizingFamiliar.performanceRules = [performance("duettist-harmonizing-familiar", "Harmonizing Familiar", 8, "Master and familiar perform the same performance: +2 DC or +1 competence bonus, for 3 rounds per round.", 3)];
harmonizingFamiliar.resourceActions = [{ id: "duettist-harmonizing-familiar", label: "Harmonize one performance", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 3, modeLabel: "Enhancement", modes: [{ id: "dc", label: "+2 save DC", summary: "Increase the performance's save DC by 2.", activeEffects: [{ target: "performanceSaveDc", bonus: 2, label: "Harmonizing Familiar DC", description: "+2 to the harmonized performance's save DC." }] }, { id: "competence", label: "+1 competence bonus", summary: "Increase the performance's competence bonus by 1.", activeEffects: [{ target: "skillChecks", bonus: 1, label: "Harmonizing Familiar competence", description: "+1 to the competence bonus supplied by the harmonized performance." }] }], confirmations: [{ id: "same", label: "Master and familiar perform the same performance", requiredForActivation: true }], summary: "Spend 3 performance rounds per round and apply the appropriate enhancement." }];
symphonicFamiliar.performanceRules = [performance("duettist-symphonic-familiar", "Symphonic Familiar", 14, "Master and familiar maintain two different performances simultaneously for 3 rounds per round.", 3)];
symphonicFamiliar.resourceActions = [{ id: "duettist-symphonic-familiar", label: "Begin two-performance symphony", minimumLevel: 14, classId: "bard", resourceId: "bardicPerformance", cost: 3, confirmations: [{ id: "different", label: "Master and familiar selected different Bardic Performances", requiredForActivation: true }], activeEffect: tracker("Symphonic Familiar", "Both different Bardic Performances remain active at full effect."), summary: "Spend 3 performance rounds per round to sustain both effects." }];
duettist.value.mechanicalCoverage = "full";
duettist.value.mechanicalNotes = ["Familiar grant/progression, Versatile Performance sharing, familiar-only performance, harmonized enhancement, and simultaneous different performances are automated."];

// Fey Courtier: ancestry, settlement progression, bonus feat/summons, and both performances.
const fey = await load("bard-fey-courtier");
const feyPerformance = named(fey.value, /^Bardic Performance$/);
const contacts = named(fey.value, /^Fey Contacts$/);
const summon = named(fey.value, /^Summon Fey Allies$/);
if (![feyPerformance, contacts, summon].every(Boolean)) throw new Error("Fey Courtier source features were not found");
fey.value.requirements = [{ type: "ancestry", id: "gathlain" }];
contacts.progressionProfiles = [{ id: "fey-courtier-settlement", label: "Fey Contacts settlement access", classId: "bard", columns: [{ id: "base", label: "Base value" }, { id: "limit", label: "Purchase limit" }], steps: [[2, "50 gp", "500 gp"], [6, "500 gp", "2,500 gp"], [10, "2,000 gp", "10,000 gp"], [14, "8,000 gp", "50,000 gp"], [18, "32,000 gp", "200,000 gp"]].map(([level, base, limit]) => ({ level, values: { base, limit } })), summary: "Treat a wilderness area with fey residents as a settlement at the displayed values; Diplomacy can gather local information." }];
contacts.resourceActions = [{ id: "fey-courtier-gather-information", label: "Gather information through Fey Contacts", minimumLevel: 2, classId: "bard", diceRoll: { label: "Fey Contacts Diplomacy", diceCountByLevel: [{ level: 2, count: 1 }], dieSidesByLevel: [{ level: 2, sides: 20 }], modifierInputLabel: "Diplomacy modifier", targetDcInputLabel: "Information DC", outcomesByMargin: [{ minimumMargin: 0, label: "Information gathered" }], failureLabel: "No useful information" }, summary: "Ask about local residents, geography, or nearby areas." }];
summon.grantedFeatId = "augment-summoning";
summon.progressionProfiles = [{ id: "fey-courtier-summons", label: "Additional fey summons", classId: "bard", columns: [{ id: "creatures", label: "Added creatures" }], steps: [
  [3, "SNA I: grimple, mite, sprite"], [4, "SNA II: atomie, fuath, nixie"], [7, "SNA III: leprechaun, nuglub, pooka"], [10, "SNA IV: kelpie, korred, twigjack"], [13, "SNA V: lampad, lurker in light, swan maiden"], [16, "SNA VI: cold rider, oceanid, sangoi"],
].map(([level, creatures]) => ({ level, values: { creatures } })), summary: "The listed fey are added to each Summon Nature's Ally option at the Bard level that unlocks that spell level." }];
feyPerformance.performanceRules = [performance("fey-courtier-scorn", "Scorn of the Wilds", 8, "Spend 2 rounds to inflict a permanent, atonement-conditioned curse within 30 feet; Will negates.", 2), performance("fey-courtier-stone-dance", "Stone Dance", 15, "Animate plants, unworked stone, or natural water as animate plants.")];
feyPerformance.resourceActions = [
  { id: "fey-courtier-scorn", label: "Use Scorn of the Wilds", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 2, actionTypeByLevel: [{ level: 8, actionType: "full-round" }], modeLabel: "Curse", modes: [{ id: "natures-exile", label: "Nature's Exile", summary: "Apply nature's exile with a non-suicidal atonement condition." }, { id: "bestow-curse", label: "Bestow Curse", summary: "Apply bestow curse with a non-suicidal atonement condition." }, { id: "baleful-polymorph", label: "Baleful Polymorph", minimumLevel: 14, summary: "Apply baleful polymorph with a non-suicidal atonement condition." }, { id: "green-caress", label: "Green Caress", minimumLevel: 14, summary: "Apply green caress with a non-suicidal atonement condition." }], confirmations: [{ id: "range", label: "Target remained within 30 feet for both performance rounds", requiredForActivation: true }, { id: "atonement", label: "A relevant, non-suicidal condition for lifting the curse has been defined", requiredForActivation: true }], savingThrow: save(), targetEffectRoll: { modifier: "will", rangeByLevel: [{ level: 8, range: "30 feet" }], effectsByLevel: [{ level: 8, name: "Scorn of the Wilds", description: "The selected permanent curse applies until its defined atonement condition is fulfilled or the curse is otherwise removed.", duration: { kind: "fixed-rounds", rounds: 999 } }], successEffect: { name: "Scorn immunity", description: "Immune to this Fey Courtier's Scorn of the Wilds for 24 hours.", rounds: 999 } }, summary: "Spend 2 rounds and resolve the exact Charisma-based Will DC." },
  { id: "fey-courtier-stone-dance", label: "Begin Stone Dance", minimumLevel: 15, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 15, actionType: "standard" }], modeLabel: "Natural material", modes: ["Plants", "Unworked stone", "Natural water"].map((label) => ({ id: label.toLowerCase().replace(/ /g, "-"), label, summary: `Animate ${label.toLowerCase()} using appropriate animate plants statistics.` })), savingThrow: save(), activeEffect: tracker("Stone Dance", "The selected natural material is animated as animate plants using the exact Bard performance save DC."), summary: "Spend one performance round per round to animate the selected natural material." },
];
fey.value.mechanicalCoverage = "full";
fey.value.mechanicalNotes = ["Gathlain eligibility, settlement thresholds, Diplomacy workflow, Augment Summoning, bonus spells and added fey, plus both save-aware performances are automated."];

// Filidh: equipment/tradition restrictions, spell-slot conversion, and all five performances.
const filidh = await load("bard-filidh");
const filidhArmor = named(filidh.value, /^Armor and Weapon/);
const naturalMagic = named(filidh.value, /^Natural Magic$/);
const natureSong = named(filidh.value, /^Nature’s Song$/);
if (![filidhArmor, naturalMagic, natureSong].every(Boolean)) throw new Error("Filidh source features were not found");
filidh.value.proficiencyAdjustments = [
  { sourceFeatureId: filidhArmor.id, category: "armor", operation: "replace", proficiencies: ["Light nonmetal armor", "Ironwood wooden armor"] },
  { sourceFeatureId: filidhArmor.id, category: "shield", operation: "replace", proficiencies: ["Wooden shields except tower shields"] },
];
filidh.value.arcaneSpellFailure = { applies: false, fullyAutomatedFeatureIds: [naturalMagic.id] };
filidhArmor.resourceActions = [{ id: "filidh-prohibited-equipment", label: "Track prohibited armor or shield", minimumLevel: 1, classId: "bard", confirmations: [{ id: "prohibited", label: "Wearing metal armor or using a prohibited/nonwooden shield", requiredForActivation: true }], activeEffect: tracker("Filidh magic suppressed", "Bard spells and supernatural or spell-like class abilities are unavailable while equipped and for 24 hours afterward.", { defaultRounds: 999, fixedRounds: true }), summary: "Apply the equipment prohibition reminder until the item is removed and 24 hours have elapsed." }];
naturalMagic.progressionProfiles = [{ id: "filidh-divine-casting", label: "Natural Magic", classId: "bard", columns: [{ id: "tradition", label: "Tradition" }, { id: "focus", label: "Divine focus" }], steps: [{ level: 1, values: { tradition: "Divine Bard spellcasting; no arcane spell failure", focus: "Holy symbol or musical instrument" } }], summary: "The Bard list and Charisma casting remain unchanged." }];
filidh.value.resourceAdjustments = [{ resourceId: "natureSongConversions", label: "Nature's Song conversions", unit: "use", operation: "replace", minimumLevel: 1, base: 0, levelMultiplier: 1, maximum: 20, refreshCadence: "day", sourceFeatureId: natureSong.id }];
natureSong.performanceRules = [
  performance("filidh-echoes", "Echoes of Nature's Song", 1, "Grant allies insight bonuses to AC and Reflex saves: +1, increasing at levels 5, 11, and 17."),
  performance("filidh-divinatory-song", "Divinatory Song", 6, "Spend 6 rounds over 10 minutes to produce divination for the Filidh and hearing allies.", 6),
  performance("filidh-voices-of-life", "Voices of Life", 8, "Grant self and hearing allies speak with animals and speak with plants while maintained."),
  performance("filidh-unity-of-life", "Unity of Life", 15, "Link two hearing allies as shield other and swap ward/damage recipient once per round."),
  performance("filidh-song-of-cycle", "Song of the Cycle", 20, "Grant seeing and hearing allies the personal version of foresight while maintained."),
];
natureSong.resourceActions = [
  { id: "filidh-convert-spell-slot", label: "Convert a spell slot to performance", minimumLevel: 1, classId: "bard", resourceId: "natureSongConversions", cost: 1, actionTypeByLevel: [{ level: 1, actionType: "swift" }], variableRecovery: { resourceId: "bardicPerformance", label: "Spell slot level converted", minimum: 1, maximum: 6 }, confirmations: [{ id: "slot", label: "A Bard spell slot of the chosen level is expended", requiredForActivation: true }], summary: "Once per Bard level per day, recover performance rounds equal to the sacrificed slot's level." },
  { id: "filidh-echoes", label: "Begin Echoes of Nature's Song", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 1, actionType: "standard" }, { level: 7, actionType: "move" }, { level: 13, actionType: "swift" }], confirmations: [{ id: "audible", label: "Affected allies can hear the performance", requiredForActivation: true }], modes: [{ id: "echoes", label: "AC and Reflex insight", summary: "+1 at levels 1–4, +2 at 5–10, +3 at 11–16, +4 at 17–20.", activeEffects: [{ target: "armorClass", bonus: 1, bonusByLevel: [{ level: 1, bonus: 1 }, { level: 5, bonus: 2 }, { level: 11, bonus: 3 }, { level: 17, bonus: 4 }], label: "Echoes — Armor Class", description: "Level-scaled insight bonus to AC." }, { target: "reflex", bonus: 1, bonusByLevel: [{ level: 1, bonus: 1 }, { level: 5, bonus: 2 }, { level: 11, bonus: 3 }, { level: 17, bonus: 4 }], label: "Echoes — Reflex", description: "Level-scaled insight bonus on Reflex saves." }] }], summary: "Spend one performance round per round and apply both insight bonuses." },
  { id: "filidh-divinatory-song", label: "Perform Divinatory Song", minimumLevel: 6, classId: "bard", resourceId: "bardicPerformance", cost: 6, actionTypeByLevel: [{ level: 6, actionType: "10-minute" }], confirmations: [{ id: "audible", label: "Recipients can hear the full performance", requiredForActivation: true }], activeEffect: tracker("Divinatory Song", "Resolve divination at caster level equal to Bard level; the Filidh and hearing allies receive the information."), summary: "Spend exactly 6 rounds over 10 minutes." },
  { id: "filidh-voices-of-life", label: "Begin Voices of Life", minimumLevel: 8, classId: "bard", resourceId: "bardicPerformance", cost: 1, confirmations: [{ id: "audible", label: "Affected allies can hear the performance", requiredForActivation: true }], activeEffect: tracker("Voices of Life", "The Filidh and hearing allies can speak with animals and plants while the performance continues."), summary: "Spend one performance round per round." },
  { id: "filidh-unity-of-life", label: "Begin Unity of Life", minimumLevel: 15, classId: "bard", resourceId: "bardicPerformance", cost: 1, confirmations: [{ id: "two-allies", label: "Two designated allies can hear the performance", requiredForActivation: true }], modes: [{ id: "initial", label: "Choose ward and damage recipient", summary: "Apply shield other using Bard level as caster level." }, { id: "swap", label: "Swap roles", summary: "At the start of the Filidh's turn, swap the two allies' roles as a free action." }], activeEffect: tracker("Unity of Life", "Two designated allies are linked as shield other; their roles may be swapped once per round at the start of the Filidh's turn."), summary: "Spend one performance round per round and track the two roles." },
  { id: "filidh-song-of-cycle", label: "Begin Song of the Cycle", minimumLevel: 20, classId: "bard", resourceId: "bardicPerformance", cost: 1, confirmations: [{ id: "perceive", label: "Affected allies can see and hear the Filidh", requiredForActivation: true }], activeEffect: tracker("Song of the Cycle", "Affected allies gain the personal version of foresight while the performance continues."), summary: "Spend one performance round per round." },
];
filidh.value.mechanicalCoverage = "full";
filidh.value.mechanicalNotes = ["Nonmetal equipment restrictions and suppression, divine casting, level-capped spell-slot conversion, and all five level-aware performances are automated."];

await Promise.all([write(arrowsong), write(dragon), write(duettist), write(fey), write(filidh)]);
console.log(`Annotated final Bard batch: ${[arrowsong, dragon, duettist, fey, filidh].map((entry) => entry.value.id).join(", ")}`);
