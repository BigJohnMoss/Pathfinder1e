import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const load = async (id) => {
  const url = new URL(`packages/data/src/archetypes/${id}.json`, root);
  return { url, value: JSON.parse(await readFile(url, "utf8")) };
};
const write = ({ url, value }) => writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
const writeJson = (path, value) => writeFile(new URL(path, root), `${JSON.stringify(value, null, 2)}\n`);
const features = (record) => record.replacements.flatMap((replacement) => replacement.features ?? []);
const named = (record, pattern) => features(record).find((candidate) => pattern.test(candidate.name));
const tracker = (name, description, extra = {}) => ({ name, targets: ["self"], bonus: 0, description, defaultRounds: 1, replaceExisting: true, ...extra });
const performance = (id, name, minimumLevel, summary, cost = 1) => ({ id, name, minimumLevel, kind: "active", resourceId: "bardicPerformance", cost, actionIds: [id], summary });
const replaceFeature = (record, target, replacements) => {
  for (const replacement of record.replacements) {
    const index = (replacement.features ?? []).findIndex((candidate) => candidate.id === target.id);
    if (index >= 0) {
      replacement.features.splice(index, 1, ...replacements);
      return;
    }
  }
  throw new Error(`${record.id}: ${target.id} not found`);
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

// Chronicler of Worlds: Intelligence key ability, planar lore, both performances, morality defense, and five substitutions.
const chronicler = await load("bard-chronicler-of-worlds");
const insight = named(chronicler.value, /^Wanderer/);
const planarLore = named(chronicler.value, /^Planar Lore/);
const chroniclerPerformance = named(chronicler.value, /^Bardic Performance$/);
const amoral = named(chronicler.value, /^Amoral Scholar/);
const scrivener = named(chronicler.value, /^Scrivener/);
if (![insight, planarLore, chroniclerPerformance, amoral, scrivener].every(Boolean)) throw new Error("Chronicler source features were not found");
chronicler.value.spellcastingAbility = "intelligence";
insight.progressionProfiles = [{ id: "chronicler-intelligence-key", label: "Wanderer's Insight key ability", classId: "bard", columns: [{ id: "ability", label: "Key ability" }], steps: [{ level: 1, values: { ability: "Intelligence for Bard spells and class-feature effects" } }], summary: "The builder uses Intelligence for this archetype's spellcasting; performance actions below also use Intelligence." }];
chronicler.value.resourceAdjustments = [{ resourceId: "planarLoreTake20", label: "Planar Lore take 20", unit: "use", operation: "replace", minimumLevel: 5, base: 0, abilityModifier: "intelligence", minimum: 0, refreshCadence: "day", sourceFeatureId: planarLore.id }];
planarLore.resourceActions = [
  { id: "chronicler-planar-lore-take-10", label: "Take 10 on Knowledge (planes)", minimumLevel: 5, classId: "bard", fixedD20Result: { label: "Planar Lore Knowledge (planes) result", result: 10 }, summary: "Resolve the check with a fixed d20 result of 10, even when ordinary take-10 rules would not allow it." },
  { id: "chronicler-planar-lore-take-20", label: "Take 20 on Knowledge (planes)", minimumLevel: 5, classId: "bard", resourceId: "planarLoreTake20", cost: 1, fixedD20Result: { label: "Planar Lore Knowledge (planes) result", result: 20 }, summary: "Spend one of the Intelligence-modifier daily uses and resolve the check with a fixed d20 result of 20." },
  { id: "chronicler-untrained-knowledge", label: "Attempt any Knowledge skill untrained", minimumLevel: 5, classId: "bard", modeLabel: "Knowledge skill", modes: ["Arcana", "Dungeoneering", "Engineering", "Geography", "History", "Local", "Nature", "Nobility", "Planes", "Religion"].map((label) => ({ id: label.toLowerCase(), label: `Knowledge (${label.toLowerCase()})`, summary: "Planar Lore permits this check even with no ranks." })), diceRoll: { label: "Untrained Knowledge check", diceCountByLevel: [{ level: 5, count: 1 }], dieSidesByLevel: [{ level: 5, sides: 20 }], modifierInputLabel: "Knowledge modifier", targetDcInputLabel: "Knowledge DC", outcomesByMargin: [{ minimumMargin: 0, label: "Success" }], failureLabel: "Failure" }, summary: "Choose and roll any Knowledge skill without the normal trained-only restriction." },
];
chroniclerPerformance.performanceRules = [
  performance("chronicler-quintessence-infusion", "Quintessence Infusion", 9, "Grant the current non-Material plane's basic, improved, and greater Planar Infusion benefits at their exact levels."),
  performance("chronicler-mantra-of-tabris", "Mantra of Tabris", 15, "Use a reactive Knowledge (planes) check as Armor Class or a saving throw against an outsider."),
];
chroniclerPerformance.resourceActions = [
  { id: "chronicler-quintessence-infusion", label: "Begin Quintessence Infusion", minimumLevel: 9, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 9, actionType: "standard" }, { level: 13, actionType: "swift" }], variableCost: { label: "Targets (1 at 9th, +1 per 3 levels)", minimum: 1, maximumByLevel: [{ level: 9, maximum: 1 }, { level: 12, maximum: 2 }, { level: 15, maximum: 3 }, { level: 18, maximum: 4 }] }, confirmations: [{ id: "plane", label: "Currently on a plane other than the Material Plane", requiredForActivation: true }, { id: "locked", label: "Each target uses the same plane as its first infusion today", requiredForActivation: true }], modes: [{ id: "basic", label: "Basic infusion", minimumLevel: 9, maximumLevel: 12, summary: "Grant the plane's basic Planar Infusion." }, { id: "improved", label: "Basic + improved infusions", minimumLevel: 13, maximumLevel: 15, summary: "Grant the plane's basic and improved Planar Infusions." }, { id: "greater", label: "Basic + improved + greater infusions", minimumLevel: 16, summary: "Grant all three tiers of the plane's Planar Infusions." }], activeEffect: tracker("Quintessence Infusion", "Affected allies gain the selected plane's level-appropriate Planar Infusion benefits; each infusion's own daily limits still apply."), summary: "Track the exact target count, plane lock, and infusion tier." },
  { id: "chronicler-mantra-of-tabris", label: "Invoke Mantra of Tabris", minimumLevel: 15, classId: "bard", resourceId: "bardicPerformance", cost: 1, actionTypeByLevel: [{ level: 15, actionType: "immediate" }], modeLabel: "Replacement", modes: [{ id: "armor-class", label: "Replace Armor Class", summary: "Use the Knowledge (planes) result as AC against the triggering outsider attack." }, { id: "saving-throw", label: "Replace saving throw", summary: "Use the Knowledge (planes) result as the failed save result against the outsider ability." }], confirmations: [{ id: "outsider", label: "Trigger is an outsider's attack or extraordinary, supernatural, or spell-like ability", requiredForActivation: true }, { id: "before-effects", label: "Invoked before the attack or failed save's effects were announced", requiredForActivation: true }], diceRoll: { label: "Knowledge (planes) replacement result", diceCountByLevel: [{ level: 15, count: 1 }], dieSidesByLevel: [{ level: 15, sides: 20 }], modifierInputLabel: "Knowledge (planes) modifier", targetDcInputLabel: "Attack roll or effect DC", outcomesByMargin: [{ minimumMargin: 0, label: "Trigger negated" }], failureLabel: "Trigger still succeeds" }, summary: "Roll normally; Planar Lore's take 20 cannot be used for this reaction." },
];
chronicler.value.conditionalModifiers = [{ sourceFeatureId: amoral.id, label: "Amoral Scholar", condition: "saving throws against spells and effects whose outcome varies with the target's alignment", minimumLevel: 2, base: 4 }];
amoral.resourceActions = [{ id: "chronicler-ignore-planar-alignment", label: "Ignore planar alignment penalties", minimumLevel: 2, classId: "bard", activeEffect: tracker("Amoral Scholar", "Ignore penalties imposed by planar alignment traits while this reminder is active.", { defaultRounds: 999, fixedRounds: true }), summary: "Track immunity to planar alignment-trait penalties." }];
const scrivenerSkills = ["Bluff", "Diplomacy", "Disable Device", "Heal", "Intimidate", "Profession (scribe)", "Sense Motive", "Survival"];
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
await writeJson("packages/data/src/options/bard-chronicler-scrivener-skills.json", { id: "bard-chronicler-scrivener-skills", name: "Scrivener's Versatility Skills", classIds: ["bard"], uniqueAcrossSelections: true, options: scrivenerSkills.map((skill) => ({ id: `bard-chronicler-scrivener-${slug(skill)}`, name: skill, groupId: "bard-chronicler-scrivener-skills", classIds: ["bard"], minimumLevel: 2, prerequisites: [], benefit: `Use the Linguistics bonus in place of ${skill}.`, source: chronicler.value.source })), source: chronicler.value.source });
const scrivenerLevels = [2, 6, 10, 14, 18];
replaceFeatureFamily(chronicler.value, (candidate) => candidate.id === "bard-chronicler-of-worlds-scrivener-s-versatility-ex-2" || candidate.id.startsWith("bard-chronicler-scrivener-versatility-"), scrivenerLevels.map((level, index) => ({ ...scrivener, id: `bard-chronicler-scrivener-versatility-${level}`, name: `Scrivener's Versatility ${index + 1}`, level, type: "selectable", choiceRequired: true, optionGroupId: "bard-chronicler-scrivener-skills", optionChoiceIds: scrivenerSkills.map((skill) => `bard-chronicler-scrivener-${slug(skill)}`), resourceActions: index === 0 ? [{ id: "chronicler-scrivener-check", label: "Roll a Scrivener skill using Linguistics", minimumLevel: 2, classId: "bard", modeLabel: "Selected skill", modes: scrivenerSkills.map((label) => ({ id: slug(label), label, summary: `Use the Linguistics bonus for ${label}.` })), diceRoll: { label: "Skill check using Linguistics", diceCountByLevel: [{ level: 2, count: 1 }], dieSidesByLevel: [{ level: 2, sides: 20 }], modifierInputLabel: "Linguistics modifier", targetDcInputLabel: "Skill DC", outcomesByMargin: [{ minimumMargin: 0, label: "Success" }], failureLabel: "Failure" }, summary: "Choose one of the character's selected Scrivener skills and substitute the full Linguistics bonus." }] : undefined, summary: `Choose a unique skill and use Linguistics in its place. This is Scrivener selection ${index + 1} of 5.` })));
chronicler.value.mechanicalCoverage = "full";
chronicler.value.mechanicalNotes = ["Intelligence spellcasting, neutral alignment, Planar Lore uses and untrained checks, both planar performances, Amoral Scholar, and five unique Scrivener substitutions are automated."];

// Dwarven Scholar: chosen weapon, Wisdom key ability, five special-BAB combat feats, and War Chant sharing.
const dwarf = await load("bard-dwarven-scholar");
const dwarfProficiency = named(dwarf.value, /^Weapon and Armor/);
const studied = named(dwarf.value, /^Studied Insight/);
const training = named(dwarf.value, /^Dwarven Training/);
const warChant = named(dwarf.value, /^Bardic Performance$/);
if (![dwarfProficiency, studied, training, warChant].every(Boolean)) throw new Error("Dwarven Scholar source features were not found");
await writeJson("packages/data/src/options/bard-dwarven-scholar-weapons.json", { id: "bard-dwarven-scholar-weapons", name: "Dwarven Scholar Weapon", classIds: ["bard"], options: [{ id: "bard-dwarven-scholar-weapon", name: "Chosen dwarven weapon", groupId: "bard-dwarven-scholar-weapons", classIds: ["bard"], minimumLevel: 1, prerequisites: [], benefit: "Gain proficiency with one weapon whose name contains 'dwarven'.", choice: { key: "weapon", label: "Dwarven weapon", allowCustom: true }, source: dwarf.value.source }], source: dwarf.value.source });
Object.assign(dwarfProficiency, { type: "selectable", choiceRequired: true, optionGroupId: "bard-dwarven-scholar-weapons" });
dwarf.value.proficiencyChoices = [{ sourceFeatureId: dwarfProficiency.id, category: "weapon", operation: "add", featureId: dwarfProficiency.id, choiceKey: "weapon", condition: "weapon name must contain 'dwarven'" }];
dwarf.value.proficiencyAdjustments = [{ sourceFeatureId: dwarfProficiency.id, category: "shield", operation: "remove", proficiencies: ["All shields"] }];
dwarf.value.spellcastingAbility = "wisdom";
studied.progressionProfiles = [{ id: "dwarven-scholar-wisdom-key", label: "Studied Insight key ability", classId: "bard", columns: [{ id: "ability", label: "Key ability" }], steps: [{ level: 1, values: { ability: "Wisdom for Bard spells and class-feature effects" } }], summary: "The builder uses Wisdom for the Dwarven Scholar's spellcasting and the War Chant workflow." }];
const trainingLevels = [2, 6, 10, 14, 18];
replaceFeatureFamily(dwarf.value, (candidate) => candidate.id === "bard-dwarven-scholar-dwarven-training-ex-2" || candidate.id.startsWith("bard-dwarven-scholar-training-"), trainingLevels.map((level, index) => ({ ...training, id: `bard-dwarven-scholar-training-${level}`, name: `Dwarven Training ${index + 1}`, level, type: "selectable", choiceRequired: true, optionGroupId: "archetype-feats", featChoiceTypes: ["combat"], featChoiceBabUsesClassLevel: true, summary: `Choose combat feat ${index + 1} of 5. Meet its prerequisites, treating Bard level as base attack bonus in addition to BAB from other classes and racial Hit Dice.` })));
warChant.performanceRules = [performance("dwarven-scholar-war-chant", "War Chant", 1, "Share one known combat feat with allies, or two at level 6 by spending two performance rounds each round.")];
warChant.resourceActions = [{ id: "dwarven-scholar-war-chant", label: "Begin War Chant", minimumLevel: 1, classId: "bard", resourceId: "bardicPerformance", costPerSelectedFeat: true, featSelection: { label: "Known combat feat", featType: "combat", source: "known", countByLevel: [{ level: 1, count: 1 }, { level: 6, count: 2 }], minimumCount: 1 }, confirmations: [{ id: "perceive", label: "Affected allies can perceive the performance", requiredForActivation: true }], activeEffect: tracker("War Chant", "Affected allies gain the selected known combat feat or feats. At level 6 one selected feat may satisfy a prerequisite of the other; limited daily uses count against the Dwarven Scholar's feat."), summary: "Select one known combat feat, or two from level 6, and spend one performance round per shared feat each round." }];
dwarf.value.mechanicalCoverage = "full";
dwarf.value.mechanicalNotes = ["The custom dwarven weapon proficiency and shield loss, Wisdom key ability, five prerequisite-aware combat feats using Bard level as BAB, and one- or two-feat War Chant are automated."];

// Speaker of the Palatine Eye: skill/language changes, psychic casting, corpse ruse, and ritual scaling.
const speaker = await load("bard-speaker-of-the-palatine-eye");
const grace = named(speaker.value, /^Angelic Grace/);
const corpse = named(speaker.value, /^Corpse Speaker/);
const ritual = named(speaker.value, /^Keen Ritualist/);
if (![grace, corpse, ritual].every(Boolean)) throw new Error("Speaker source features were not found");
speaker.value.classSkillRemovals = ["Acrobatics", "Escape Artist"];
grace.progressionProfiles = [{ id: "speaker-celestial-language", label: "Angelic Grace", classId: "bard", columns: [{ id: "language", label: "Bonus language" }, { id: "removed", label: "Removed class skills" }], steps: [{ level: 1, values: { language: "Celestial (does not consume a language choice)", removed: "Acrobatics, Escape Artist" } }], summary: "The class-skill removals apply automatically." }];
corpse.resourceActions = [{ id: "speaker-corpse-speaker", label: "Make a corpse appear to speak", minimumLevel: 1, classId: "bard", actionTypeByLevel: [{ level: 1, actionType: "standard" }], savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: "bard" }, targetEffectRoll: { modifier: "will", effectsByLevel: [{ level: 1, name: "Fooled by Corpse Speaker", description: "The creature believes the corpse speaks of its own volition, as a supernatural ventriloquism-like ruse.", duration: { kind: "fixed-rounds", rounds: 1 } }] }, summary: "Resolve the exact Charisma-based Will DC for each observer." }];
ritual.numericCalculations = [{ id: "speaker-secondary-casters", label: "Keen Ritualist secondary casters", inputLabel: "Normally required secondary casters", inputMinimum: 2, inputMaximum: 20, inputDefault: 2, outputLabel: "Required secondary casters", baseByLevel: [{ level: 10, value: -2 }, { level: 19, value: 0 }], inputMultiplierByLevel: [{ level: 10, multiplier: 1 }, { level: 19, multiplier: 0 }], classId: "bard", summary: "Reduce the requirement by 2 from level 10; at level 19 every ritual can be performed alone." }];
speaker.value.conditionalModifiers = [{ sourceFeatureId: ritual.id, label: "Keen Ritualist", condition: "skill checks attempted during a ritual (equivalent to the published DC reduction)", minimumLevel: 16, base: 2, bonusByLevel: [{ level: 16, bonus: 2 }, { level: 19, bonus: 4 }] }];
speaker.value.mechanicalCoverage = "full";
speaker.value.mechanicalNotes = ["Class-skill removals and Celestial, inferred Mesmerist psychic casting, Corpse Speaker's save, and every Keen Ritualist caster/DC milestone are automated."];

// Studious Librarian: clean feat grant plus daily borrowed casting, Research, take 20, and spell replacement.
const librarian = await load("bard-studious-librarian");
const scribe = named(librarian.value, /^Scribe Scroll$/);
const comparative = named(librarian.value, /^Comparative Arcane Studies/);
const research = named(librarian.value, /^Critical Research Focus/);
const recollection = named(librarian.value, /^Perfect Recollection/);
const library = named(librarian.value, /^One with the Library/);
if (![scribe, comparative, research, recollection, library].every(Boolean)) throw new Error("Studious Librarian source features were not found");
scribe.summary = "At 6th level, a studious librarian gains Scribe Scroll as a bonus feat. This ability replaces distraction.";
scribe.grantedFeatId = "scribe-scroll";
librarian.value.resourceAdjustments = [
  { resourceId: "comparativeArcaneStudies", label: "Comparative Arcane Studies", unit: "use", operation: "replace", minimumLevel: 6, base: 1, perInterval: 1, interval: 4, maximum: 4, refreshCadence: "day", sourceFeatureId: comparative.id },
  { resourceId: "oneWithLibrary", label: "One with the Library", unit: "use", operation: "replace", minimumLevel: 20, base: 1, maximum: 1, refreshCadence: "day", sourceFeatureId: library.id },
];
comparative.resourceActions = [{ id: "librarian-comparative-studies", label: "Cast from a scroll or spellbook", minimumLevel: 6, classId: "bard", resourceId: "comparativeArcaneStudies", cost: 1, actionTypeByLevel: [{ level: 6, actionType: "standard" }], modeLabel: "Source list", modes: [{ id: "bard", label: "Bard", summary: "Cast a Bard-list spell from the held writing." }, { id: "wizard", label: "Sorcerer/Wizard", summary: "Cast a Sorcerer/Wizard-list spell from the held writing." }, { id: "witch", label: "Witch", summary: "Cast a Witch-list spell from the held writing." }], confirmations: [{ id: "writing", label: "A scroll or spellbook containing the spell is in hand", requiredForActivation: true }, { id: "slot", label: "Expend a Bard spell slot of the same spell level", requiredForActivation: true }, { id: "no-metamagic", label: "The borrowed spell is not modified by metamagic", requiredForActivation: true }], activeEffect: tracker("Comparative Arcane Studies casting", "Cast the selected written spell as a Bard spell known. A scroll used this way is not erased."), summary: "Spend a daily use and the matching Bard slot while preserving the source scroll." }];
research.resourceActions = [{ id: "librarian-critical-research", label: "Roll a Research check", minimumLevel: 8, classId: "bard", diceRoll: { label: "Research check (critical threat on natural 18–20)", diceCountByLevel: [{ level: 8, count: 1 }], dieSidesByLevel: [{ level: 8, sides: 20 }], modifierInputLabel: "Research modifier", targetDcInputLabel: "Research DC", outcomesByMargin: [{ minimumMargin: 0, label: "Success; if natural 18–20, confirm with +4" }], failureLabel: "Failure" }, summary: "The roll exposes the expanded natural 18–20 threat range and +4 confirmation bonus." }];
recollection.resourceActions = [{ id: "librarian-perfect-recollection", label: "Take 20 on a Knowledge check", minimumLevel: 19, classId: "bard", modeLabel: "Knowledge skill", modes: ["Arcana", "Dungeoneering", "Engineering", "Geography", "History", "Local", "Nature", "Nobility", "Planes", "Religion"].map((label) => ({ id: label.toLowerCase(), label: `Knowledge (${label.toLowerCase()})`, summary: `Take 20 on Knowledge (${label.toLowerCase()}).` })), fixedD20Result: { label: "Perfect Recollection result", result: 20 }, summary: "Resolve any Knowledge check with a fixed d20 result of 20." }];
library.resourceActions = [{ id: "librarian-one-with-library", label: "Replace a known spell from a scroll", minimumLevel: 20, classId: "bard", resourceId: "oneWithLibrary", cost: 1, actionTypeByLevel: [{ level: 20, actionType: "1-hour" }], confirmations: [{ id: "bard-spell", label: "The replacement is a Bard spell contained on the scroll", requiredForActivation: true }, { id: "erase", label: "Erase the learned spell from the scroll", requiredForActivation: true }], activeEffect: tracker("One with the Library", "Replace one Bard spell known with the chosen Bard spell from the studied scroll."), summary: "Spend the daily use after 1 hour of study and update the known spell selection." }];
librarian.value.mechanicalCoverage = "full";
librarian.value.mechanicalNotes = ["Scribe Scroll, all four Comparative Arcane Studies uses, Research critical rules, unlimited Knowledge take 20, and the daily scroll-based known-spell replacement are automated."];

await Promise.all([chronicler, dwarf, speaker, librarian].map(write));
console.log("Annotated four scholarly Bard archetypes.");
