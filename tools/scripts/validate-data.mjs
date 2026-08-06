import { readdir, readFile } from "node:fs/promises";
import { validatePrerequisites } from "../../packages/data/src/validation.js";
import { archetypeAutomationArrayFields, mergeArchetypeAutomation } from "../../packages/data/src/archetype-automation.js";

const root = new URL("../../packages/data/src/", import.meta.url);
const errors = [];
const ids = new Map();
const classIds = new Set();
const groupIds = new Set();
const optionIds = new Set();
const activeEffectUpgradeOptionRefs = [];
const resourceAdvancementOptionRefs = [];
const progressionAdvancementOptionRefs = [];
const featureRequiredOptionRefs = [];
const archetypeProhibitedOptionRefs = [];
const bloodlineDetailIds = new Set();
const spellDescriptors = new Set(["acid", "air", "chaotic", "cold", "curse", "darkness", "death", "disease", "earth", "electricity", "emotion", "evil", "fear", "fire", "force", "good", "language-dependent", "lawful", "light", "meditative", "mind-affecting", "pain", "poison", "ruse", "shadow", "sonic", "water"]);
const abilities = new Set(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]);
const activeEffectTargets = new Set(["initiative", "armorClass", "fortitude", "reflex", "will", "attackRolls", "damageRolls", "spellResistance", "casterLevel", "spellSaveDc", "exploitEffectiveLevel", "casterLevelChecks", "savingThrows", "meleeDamageRolls", "healingReceived", "skillChecks", ...abilities, "allies", "self", "area", "enemy"]);
const archetypeOverlayFiles = await Promise.all((await jsonFiles("archetype-automation/").catch(() => [])).map(load));
const archetypeOverlays = archetypeOverlayFiles.flatMap(file => file.overlays ?? []);
const archetypeOverlayIds = new Set();
for (const [index, overlay] of archetypeOverlays.entries()) {
  const prefix = `archetype automation overlay ${index + 1}`;
  if (typeof overlay?.archetypeId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(overlay.archetypeId)) errors.push(`${prefix}: invalid archetypeId`);
  archetypeOverlayIds.add(overlay.archetypeId);
  if (!archetypeAutomationArrayFields.some(field => overlay[field]?.length) && !overlay.featurePatches?.length && !overlay.mechanicalCoverage) errors.push(`${prefix}: contains no automation`);
}

async function jsonFiles(directory) {
  const dir = new URL(directory, root);
  return (await readdir(dir)).filter(name => name.endsWith(".json")).map(name => new URL(name, dir));
}
async function load(url) {
  try { return JSON.parse(await readFile(url, "utf8")); }
  catch (error) { errors.push(`${url.pathname.split("/").pop()}: invalid JSON (${error.message})`); return {}; }
}
function checkId(record, file) {
  if (!record.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) errors.push(`${file}: invalid or missing id`);
  if (ids.has(record.id)) errors.push(`${file}: duplicate id ${record.id} (also in ${ids.get(record.id)})`);
  else ids.set(record.id, file);
}
function checkSource(record, file) {
  if (!record.source || typeof record.source.title !== "string" || !record.source.title.trim()) errors.push(`${file}: missing source title`);
  try { new URL(record.source?.url); } catch { errors.push(`${file}: invalid source URL`); }
}
function checkPrerequisites(prerequisites, file) {
  for (const error of validatePrerequisites(prerequisites)) errors.push(`${file}: ${error}`);
}
function checkChoice(choice, file) {
  if (choice === undefined) return;
  if (!choice || typeof choice !== "object" || Array.isArray(choice)) { errors.push(`${file}: choice must be an object`); return; }
  if (typeof choice.key !== "string" || !choice.key.trim()) errors.push(`${file}: choice needs a key`);
  if (typeof choice.label !== "string" || !choice.label.trim()) errors.push(`${file}: choice needs a label`);
  if (!choice.allowCustom && (!Array.isArray(choice.options) || choice.options.length === 0)) { errors.push(`${file}: choice needs options`); return; }
  if (choice.allowCustom !== undefined && typeof choice.allowCustom !== "boolean") errors.push(`${file}: choice allowCustom must be a boolean`);
  if (choice.uniqueAcrossSelections !== undefined && typeof choice.uniqueAcrossSelections !== "boolean") errors.push(`${file}: choice uniqueAcrossSelections must be a boolean`);
  if (!Array.isArray(choice.options)) return;
  const ids = new Set();
  for (const option of choice.options) { if (!option || typeof option.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(option.id) || typeof option.name !== "string" || !option.name.trim()) errors.push(`${file}: choice has an invalid option`); else if (ids.has(option.id)) errors.push(`${file}: choice has duplicate option ${option.id}`); else ids.add(option.id); }
}
function checkSelectableOption(option, file) {
  if (option.repeatable !== undefined && typeof option.repeatable !== "boolean") errors.push(`${file}: repeatable must be a boolean`);
  if (option.selectionLimit !== undefined && (!Number.isInteger(option.selectionLimit) || option.selectionLimit < 1)) errors.push(`${file}: selectionLimit must be a positive integer`);
  if (option.selectionLimit !== undefined && option.repeatable !== true) errors.push(`${file}: selectionLimit requires repeatable`);
  for (const key of ["familyId", "exclusiveGroupId"]) {
    if (option[key] !== undefined && (typeof option[key] !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(option[key]))) errors.push(`${file}: ${key} must be a slug`);
  }
  if ((option.familyId === undefined) !== (option.exclusiveGroupId === undefined)) errors.push(`${file}: familyId and exclusiveGroupId must be used together`);
  checkChoice(option.choice, file);
}
function checkFeatEffects(effects, file) {
  if (effects === undefined) return;
  if (!effects || typeof effects !== "object" || Array.isArray(effects)) { errors.push(`${file}: invalid feat effects`); return; }
  const numericRecord = (value, keys) => value === undefined || (
    value && typeof value === "object" && !Array.isArray(value) &&
    Object.entries(value).every(([key, bonus]) => keys.includes(key) && typeof bonus === "number")
  );
  if (effects.initiative !== undefined && typeof effects.initiative !== "number") errors.push(`${file}: initiative effect must be numeric`);
  if (!numericRecord(effects.saves, ["fortitude", "reflex", "will"])) errors.push(`${file}: invalid save effects`);
  if (!numericRecord(effects.armorClass, ["normal", "touch", "flatFooted"])) errors.push(`${file}: invalid armor class effects`);
  if (!numericRecord(effects.skillBonuses, Object.keys(effects.skillBonuses ?? {}))) errors.push(`${file}: invalid skill bonus effects`);
  if (effects.hitPoints !== undefined && (!effects.hitPoints || !Number.isInteger(effects.hitPoints.minimum) || effects.hitPoints.minimum < 0 || !Number.isInteger(effects.hitPoints.perLevel) || effects.hitPoints.perLevel < 0)) errors.push(`${file}: invalid hit point effect`);
  if (effects.chosenSkill !== undefined && (!effects.chosenSkill || typeof effects.chosenSkill.bonus !== "number" || (effects.chosenSkill.rankThreshold !== undefined && (!Number.isInteger(effects.chosenSkill.rankThreshold?.minimum) || effects.chosenSkill.rankThreshold.minimum < 0 || typeof effects.chosenSkill.rankThreshold?.bonus !== "number")))) errors.push(`${file}: invalid chosen skill effect`);
  if (effects.chosenWeapon !== undefined && (!effects.chosenWeapon || typeof effects.chosenWeapon !== "object" || Array.isArray(effects.chosenWeapon) || (effects.chosenWeapon.attack !== undefined && typeof effects.chosenWeapon.attack !== "number") || (effects.chosenWeapon.damage !== undefined && typeof effects.chosenWeapon.damage !== "number"))) errors.push(`${file}: invalid chosen weapon effect`);
}
function checkProgressionTable(table, file, key, width) {
  if (!Array.isArray(table) || table.length !== 20 || table.some(row => !Array.isArray(row) || row.length !== width || row.some(value => !Number.isInteger(value) || value < 0))) errors.push(`${file}: ${key} must contain 20 non-negative integer rows of width ${width}`);
}
function checkSpellcasting(spellcasting, file) {
  if (!spellcasting || typeof spellcasting !== "object") { errors.push(`${file}: spellcasting must be an object`); return; }
  if (!["intelligence", "wisdom", "charisma"].includes(spellcasting.ability)) errors.push(`${file}: spellcasting has an invalid ability`);
  if (!["prepared", "spontaneous"].includes(spellcasting.castingType)) errors.push(`${file}: spellcasting has an invalid casting type`);
  checkProgressionTable(spellcasting.slotsByLevel, file, "slotsByLevel", 9);
  if (spellcasting.castingType === "prepared") checkProgressionTable(spellcasting.preparedByLevel, file, "preparedByLevel", 10);
  if (spellcasting.castingType === "spontaneous") checkProgressionTable(spellcasting.knownByLevel, file, "knownByLevel", 10);
  if (spellcasting.spellLevelUnlocks !== undefined && (!Array.isArray(spellcasting.spellLevelUnlocks) || spellcasting.spellLevelUnlocks.some(level => !Number.isInteger(level) || level < 1 || level > 20))) errors.push(`${file}: spellLevelUnlocks must contain class levels from 1 to 20`);
  if (spellcasting.preparesFromSlots !== undefined && typeof spellcasting.preparesFromSlots !== "boolean") errors.push(`${file}: preparesFromSlots must be a boolean`);
}
function checkBloodlineDetail(bloodline, file) {
  const label = `${file}:${bloodline?.id ?? "unknown"}`;
  if (!bloodline || typeof bloodline !== "object" || Array.isArray(bloodline)) { errors.push(`${file}: bloodline must be an object`); return; }
  if (typeof bloodline.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bloodline.id)) errors.push(`${label}: invalid or missing id`);
  else {
    if (bloodlineDetailIds.has(bloodline.id)) errors.push(`${label}: duplicate bloodline detail id`);
    bloodlineDetailIds.add(bloodline.id);
    if (!optionIds.has(bloodline.id)) errors.push(`${label}: does not reference a selectable bloodline option`);
  }
  if (typeof bloodline.classSkill !== "string" || !bloodline.classSkill.trim()) errors.push(`${label}: missing class skill`);
  if (bloodline.classSkillChoices !== undefined && (!Array.isArray(bloodline.classSkillChoices) || bloodline.classSkillChoices.length === 0 || new Set(bloodline.classSkillChoices).size !== bloodline.classSkillChoices.length || bloodline.classSkillChoices.some(skill => typeof skill !== "string" || !skill.trim()))) errors.push(`${label}: classSkillChoices must contain unique non-empty skill names`);
  if (bloodline.variants !== undefined) {
    const validEnergyTypes = new Set(["acid", "cold", "electricity", "fire"]);
    const validBreathShapes = new Set(["30-foot cone", "60-foot line"]);
    if (!Array.isArray(bloodline.variants) || bloodline.variants.length === 0) errors.push(`${label}: variants must contain at least one entry`);
    else {
      const variantIds = new Set();
      for (const variant of bloodline.variants) {
        const hasBreathShape = validBreathShapes.has(variant?.breathShape);
        const hasMovement = typeof variant?.movement === "string" && variant.movement.trim().length > 0;
        if (!variant || typeof variant.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variant.id) || typeof variant.name !== "string" || !variant.name.trim() || !validEnergyTypes.has(variant.energyType) || (!hasBreathShape && !hasMovement)) errors.push(`${label}: invalid bloodline variant`);
        else if (variantIds.has(variant.id)) errors.push(`${label}: duplicate bloodline variant ${variant.id}`);
        else variantIds.add(variant.id);
      }
    }
  }
  if (typeof bloodline.arcana !== "string" || !bloodline.arcana.trim()) errors.push(`${label}: missing bloodline arcana`);

  const expectedSpellLevels = [3, 5, 7, 9, 11, 13, 15, 17, 19];
  if (!Array.isArray(bloodline.bonusSpells) || bloodline.bonusSpells.length !== expectedSpellLevels.length) errors.push(`${label}: bonusSpells must contain nine entries`);
  else bloodline.bonusSpells.forEach((spell, index) => {
    if (!spell || spell.sorcererLevel !== expectedSpellLevels[index] || spell.spellLevel !== index + 1 || typeof spell.name !== "string" || !spell.name.trim()) errors.push(`${label}: invalid bonus spell at index ${index}`);
  });

  if (!Array.isArray(bloodline.bonusFeats) || bloodline.bonusFeats.length < 8 || new Set(bloodline.bonusFeats).size !== bloodline.bonusFeats.length || bloodline.bonusFeats.some(feat => typeof feat !== "string" || !feat.trim())) errors.push(`${label}: bonusFeats must contain at least eight unique names`);

  const expectedPowerLevels = [1, 3, 9, 15, 20];
  if (!Array.isArray(bloodline.powers) || bloodline.powers.length !== expectedPowerLevels.length) errors.push(`${label}: powers must contain five entries`);
  else bloodline.powers.forEach((power, index) => {
    if (!power || power.level !== expectedPowerLevels[index] || typeof power.name !== "string" || !power.name.trim() || typeof power.summary !== "string" || !power.summary.trim()) errors.push(`${label}: invalid bloodline power at index ${index}`);
  });
}

for (const url of await jsonFiles("classes/")) {
  const c=await load(url); const file=url.pathname.split('/').pop(); checkId(c,file); checkSource(c,file); classIds.add(c.id);
  for (const key of ["name","hitDie","babProgression","saves","skillRanksPerLevel","source","features"]) if (c[key] === undefined) errors.push(`${file}: missing ${key}`);
  const maximumLevel = c.maximumLevel ?? 20;
  if (!Number.isInteger(maximumLevel) || maximumLevel < 1 || maximumLevel > 20) errors.push(`${file}: maximumLevel must be from 1 to 20`);
  if (c.classType === "prestige" && c.maximumLevel === undefined) errors.push(`${file}: prestige classes must declare maximumLevel`);
  if (c.baseAttackBonusByLevel !== undefined && (!Array.isArray(c.baseAttackBonusByLevel) || c.baseAttackBonusByLevel.length !== maximumLevel || c.baseAttackBonusByLevel.some(value => !Number.isInteger(value) || value < 0))) errors.push(`${file}: baseAttackBonusByLevel must contain ${maximumLevel} non-negative integers`);
  if (c.savesByLevel !== undefined && (!Array.isArray(c.savesByLevel) || c.savesByLevel.length !== maximumLevel || c.savesByLevel.some(row => !row || ["fortitude","reflex","will"].some(save => !Number.isInteger(row[save]) || row[save] < 0)))) errors.push(`${file}: savesByLevel must contain ${maximumLevel} valid save rows`);
  if (c.requirements !== undefined && (!Array.isArray(c.requirements) || c.requirements.length === 0 || c.requirements.some(value => typeof value !== "string" || !value.trim()))) errors.push(`${file}: requirements must contain non-empty text`);
  if (c.spellcastingAdvancement !== undefined) {
    const advancement = c.spellcastingAdvancement;
    if (!advancement || !["arcane","divine","any"].includes(advancement.tradition) || !Array.isArray(advancement.levels) || advancement.levels.length === 0 || new Set(advancement.levels).size !== advancement.levels.length || advancement.levels.some(level => !Number.isInteger(level) || level < 1 || level > maximumLevel)) errors.push(`${file}: invalid spellcastingAdvancement`);
    if (advancement?.targetCount !== undefined && (!Number.isInteger(advancement.targetCount) || advancement.targetCount < 1 || advancement.targetCount > 2)) errors.push(`${file}: spellcastingAdvancement targetCount must be 1 or 2`);
    if (advancement?.targetTraditions !== undefined && (!Array.isArray(advancement.targetTraditions) || advancement.targetTraditions.length !== (advancement.targetCount ?? 1) || new Set(advancement.targetTraditions).size !== advancement.targetTraditions.length || advancement.targetTraditions.some(tradition => !["arcane","divine"].includes(tradition)))) errors.push(`${file}: spellcastingAdvancement targetTraditions must uniquely describe each target`);
  }
  if (c.spellcasting) checkSpellcasting(c.spellcasting, file);
  const featureIds=new Set();
  for (const f of c.features ?? []) {
    if (featureIds.has(f.id)) errors.push(`${file}: duplicate feature id ${f.id}`); featureIds.add(f.id);
    if (!Number.isInteger(f.level) || f.level<1 || f.level>maximumLevel) errors.push(`${file}: ${f.id} has invalid level`);
    if (f.choiceRequired && !f.optionGroupId) errors.push(`${file}: ${f.id} requires a choice but has no optionGroupId`);
  }
}
const featIds = new Set(await Promise.all((await jsonFiles("feats/")).map(async url => (await load(url)).id)));
const spellIds = new Set([
  ...await Promise.all((await jsonFiles("spells/")).map(async url => (await load(url)).id)),
  ...(await Promise.all((await jsonFiles("spell-catalogues/")).map(async url => (await load(url)).spells ?? []))).flat().map(spell => spell.id),
]);
const archetypeUrls = await jsonFiles("archetypes/");
const sourceArchetypes = await Promise.all(archetypeUrls.map(load));
const mergedArchetypes = mergeArchetypeAutomation(sourceArchetypes, archetypeOverlayFiles);
for (const [index, url] of archetypeUrls.entries()) {
  const archetype=mergedArchetypes[index]; const file=url.pathname.split('/').pop(); checkId(archetype,file); checkSource(archetype,file);
  if(!classIds.has(archetype.classId)) errors.push(`${file}: references missing class ${archetype.classId}`);
  if(typeof archetype.summary!=="string"||!archetype.summary.trim()||!Array.isArray(archetype.replacements)||archetype.replacements.length===0) errors.push(`${file}: missing summary or replacements`);
  const replacementFeatureIds=new Set();
  for(const replacement of archetype.replacements??[]) {
    if((replacement.featureIds?.length??0)+(replacement.progressionKeys?.length??0)===0||!Array.isArray(replacement.features)||replacement.features.length===0) errors.push(`${file}: invalid replacement group`);
    for(const feature of replacement.features??[]) {
      if(replacementFeatureIds.has(feature.id)) errors.push(`${file}: duplicate replacement feature ${feature.id}`); replacementFeatureIds.add(feature.id);
      if(!Number.isInteger(feature.level)||feature.level<1||feature.level>20||typeof feature.summary!=="string"||!feature.summary.trim()) errors.push(`${file}: invalid replacement feature ${feature.id}`);
      if(feature.grantedFeatId !== undefined && (typeof feature.grantedFeatId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(feature.grantedFeatId))) errors.push(`${file}: ${feature.id} has invalid grantedFeatId`);
      if (feature.grantedFeatId && !featIds.has(feature.grantedFeatId)) errors.push(`${file}: ${feature.id} references unknown grantedFeatId ${feature.grantedFeatId}`);
      if (feature.grantedFeatIds !== undefined && (!Array.isArray(feature.grantedFeatIds) || feature.grantedFeatIds.length === 0 || feature.grantedFeatIds.some(id => typeof id !== "string" || !featIds.has(id)) || new Set(feature.grantedFeatIds).size !== feature.grantedFeatIds.length)) errors.push(`${file}: ${feature.id} has invalid grantedFeatIds`);
      if (feature.optionGroupId === "archetype-feats") {
        if ((!Array.isArray(feature.featChoiceIds) || feature.featChoiceIds.length === 0) && (!Array.isArray(feature.featChoiceTypes) || feature.featChoiceTypes.length === 0)) errors.push(`${file}: ${feature.id} must limit its archetype feat choice`);
        if (feature.featChoiceIds?.some(id => !featIds.has(id))) errors.push(`${file}: ${feature.id} references an unknown feat choice`);
        if (feature.featChoiceTypes?.some(type => !["combat", "general", "item-creation", "metamagic", "monster", "story", "style", "teamwork"].includes(type))) errors.push(`${file}: ${feature.id} has an invalid feat choice type`);
        if (feature.ignoreFeatPrerequisites !== undefined && typeof feature.ignoreFeatPrerequisites !== "boolean") errors.push(`${file}: ${feature.id} ignoreFeatPrerequisites must be boolean`);
      }
      const fastHealingAura = feature.spellAutomation?.fastHealingAura;
      if (fastHealingAura) {
        const validAbility = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].includes(fastHealingAura.durationAbility);
        if (typeof fastHealingAura.label !== "string" || !fastHealingAura.label.trim()) errors.push(`${file}: ${feature.id} fastHealingAura is missing its label`);
        if (typeof fastHealingAura.resourceId !== "string" || !/^[a-z][A-Za-z0-9]*$/.test(fastHealingAura.resourceId)) errors.push(`${file}: ${feature.id} fastHealingAura has an invalid resourceId`);
        if (!Number.isInteger(fastHealingAura.cost) || fastHealingAura.cost < 1) errors.push(`${file}: ${feature.id} fastHealingAura has an invalid cost`);
        if (!Number.isInteger(fastHealingAura.minimumSpellLevel) || fastHealingAura.minimumSpellLevel < 1 || fastHealingAura.minimumSpellLevel > 9) errors.push(`${file}: ${feature.id} fastHealingAura has an invalid minimumSpellLevel`);
        if (typeof fastHealingAura.range !== "string" || !fastHealingAura.range.trim()) errors.push(`${file}: ${feature.id} fastHealingAura is missing its range`);
        if (!Number.isInteger(fastHealingAura.healingDivisor) || fastHealingAura.healingDivisor < 1) errors.push(`${file}: ${feature.id} fastHealingAura has an invalid healingDivisor`);
        if (!validAbility) errors.push(`${file}: ${feature.id} fastHealingAura has an invalid durationAbility`);
        if (fastHealingAura.minimumRounds !== undefined && (!Number.isInteger(fastHealingAura.minimumRounds) || fastHealingAura.minimumRounds < 1)) errors.push(`${file}: ${feature.id} fastHealingAura has an invalid minimumRounds`);
      }
      const descriptorBoost = feature.spellAutomation?.descriptorReservoirBoost;
      if (descriptorBoost) {
        if (typeof descriptorBoost.label !== "string" || !descriptorBoost.label.trim()) errors.push(`${file}: ${feature.id} descriptorReservoirBoost is missing its label`);
        if (descriptorBoost.resourceId !== "arcaneReservoir") errors.push(`${file}: ${feature.id} descriptorReservoirBoost must use arcaneReservoir`);
        if (!Number.isInteger(descriptorBoost.cost) || descriptorBoost.cost < 1) errors.push(`${file}: ${feature.id} descriptorReservoirBoost has an invalid cost`);
        if (!Array.isArray(descriptorBoost.descriptors) || descriptorBoost.descriptors.length === 0 || new Set(descriptorBoost.descriptors).size !== descriptorBoost.descriptors.length || descriptorBoost.descriptors.some(descriptor => !spellDescriptors.has(descriptor))) errors.push(`${file}: ${feature.id} descriptorReservoirBoost has invalid descriptors`);
        for (const key of ["casterLevelBonusByLevel", "saveDcBonusByLevel"]) {
          const steps = descriptorBoost[key];
          if (!Array.isArray(steps) || steps.length === 0 || steps[0]?.level !== 1 || steps.some((step, index) => !Number.isInteger(step?.level) || step.level < 1 || step.level > 20 || !Number.isInteger(step.bonus) || step.bonus < 1 || (index > 0 && step.level <= steps[index - 1].level))) errors.push(`${file}: ${feature.id} descriptorReservoirBoost has invalid ${key}`);
        }
      }
      for (const action of feature.resourceActions ?? []) {
        if (action.classId !== undefined && !classIds.has(action.classId)) errors.push(`${file}: ${feature.id} ${action.id} has an invalid classId`);
        if (action.advancementOptionId !== undefined) progressionAdvancementOptionRefs.push({ file, featureId: feature.id, profileId: action.id, optionId: action.advancementOptionId });
        if (action.requiredOptionId !== undefined) {
          if (typeof action.requiredOptionId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(action.requiredOptionId)) errors.push(`${file}: ${feature.id} ${action.id} has an invalid requiredOptionId`);
          else featureRequiredOptionRefs.push({ file, featureId: feature.id, itemId: action.id, optionId: action.requiredOptionId });
        }
        if (action.targetHitDiceRequirement !== undefined && (typeof action.targetHitDiceRequirement.label !== "string" || !action.targetHitDiceRequirement.label.trim() || !Number.isInteger(action.targetHitDiceRequirement.levelDivisor) || action.targetHitDiceRequirement.levelDivisor < 1)) errors.push(`${file}: ${feature.id} ${action.id} has an invalid targetHitDiceRequirement`);
        if (action.temporaryHitPointsByLevel !== undefined && (!Array.isArray(action.temporaryHitPointsByLevel) || action.temporaryHitPointsByLevel.length === 0 || action.temporaryHitPointsByLevel[0]?.level !== feature.level || action.temporaryHitPointsByLevel.some((step, index) => !Number.isInteger(step?.level) || step.level < feature.level || step.level > 20 || !Number.isInteger(step.amount) || step.amount < 1 || (index > 0 && step.level <= action.temporaryHitPointsByLevel[index - 1].level)))) errors.push(`${file}: ${feature.id} ${action.id} has invalid temporaryHitPointsByLevel`);
        if (action.temporaryHitPointsDurationRounds !== undefined && (!action.temporaryHitPointsByLevel || !Number.isInteger(action.temporaryHitPointsDurationRounds) || action.temporaryHitPointsDurationRounds < 1 || action.temporaryHitPointsDurationRounds > 999)) errors.push(`${file}: ${feature.id} ${action.id} has an invalid temporaryHitPointsDurationRounds`);
        if (action.modes !== undefined && (!Array.isArray(action.modes) || action.modes.length === 0 || new Set(action.modes.map(mode => mode?.id)).size !== action.modes.length || action.modes.some(mode => !mode || typeof mode.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(mode.id) || typeof mode.label !== "string" || !mode.label.trim() || typeof mode.summary !== "string" || !mode.summary.trim()))) errors.push(`${file}: ${feature.id} ${action.id} has invalid modes`);
        if (action.modeLabel !== undefined && (typeof action.modeLabel !== "string" || !action.modeLabel.trim())) errors.push(`${file}: ${feature.id} ${action.id} has an invalid modeLabel`);
        if (action.randomOutcomes !== undefined && (!Array.isArray(action.randomOutcomes) || action.randomOutcomes.length === 0 || action.randomOutcomes.some(outcome => !outcome || typeof outcome.label !== "string" || !outcome.label.trim() || typeof outcome.summary !== "string" || !outcome.summary.trim() || (outcome.effect !== undefined && (!activeEffectTargets.has(outcome.effect?.target) || !Number.isInteger(outcome.effect?.bonus) || outcome.effect.bonus < -20 || outcome.effect.bonus > 20 || (outcome.effect.classLevelBonus !== undefined && typeof outcome.effect.classLevelBonus !== "boolean")))))) errors.push(`${file}: ${feature.id} ${action.id} has invalid randomOutcomes`);
        if (action.randomOutcomeTarget !== undefined) {
          const target = action.randomOutcomeTarget;
          const modeIds = new Set(action.modes?.map(mode => mode.id) ?? []);
          if (!action.randomOutcomes?.every(outcome => outcome.effect) || typeof target.label !== "string" || !target.label.trim() || typeof target.defaultValue !== "string" || !target.defaultValue.trim() || ![target.selfModeId, target.allyModeId, target.enemyModeId].every(id => typeof id === "string" && modeIds.has(id)) || new Set([target.selfModeId, target.allyModeId, target.enemyModeId]).size !== 3 || !["fortitude", "reflex", "will"].includes(target.enemySaveModifier) || !action.savingThrow) errors.push(`${file}: ${feature.id} ${action.id} has an invalid randomOutcomeTarget`);
        }
        if (action.savingThrow && (typeof action.savingThrow.label !== "string" || !action.savingThrow.label.trim() || (action.savingThrow.fixedDcByLevel === undefined && (!abilities.has(action.savingThrow.ability) || !Number.isInteger(action.savingThrow.base) || action.savingThrow.base < 0 || action.savingThrow.base > 30 || !Number.isInteger(action.savingThrow.levelDivisor) || action.savingThrow.levelDivisor < 1)) || (action.savingThrow.fixedDcByLevel !== undefined && (!Array.isArray(action.savingThrow.fixedDcByLevel) || action.savingThrow.fixedDcByLevel.length === 0 || action.savingThrow.fixedDcByLevel[0]?.level !== feature.level || action.savingThrow.fixedDcByLevel.some((step, index) => !Number.isInteger(step?.level) || step.level < feature.level || step.level > 20 || !Number.isInteger(step.dc) || step.dc < 1 || step.dc > 99 || (index > 0 && step.level <= action.savingThrow.fixedDcByLevel[index - 1].level)))) || (action.savingThrow.classId !== undefined && !classIds.has(action.savingThrow.classId)))) errors.push(`${file}: ${feature.id} ${action.id} has an invalid savingThrow`);
        if (action.actorSavingThrow !== undefined && (!action.savingThrow || !["fortitude", "reflex", "will"].includes(action.actorSavingThrow.modifier) || typeof action.actorSavingThrow.failureName !== "string" || !action.actorSavingThrow.failureName.trim() || typeof action.actorSavingThrow.failureDescription !== "string" || !action.actorSavingThrow.failureDescription.trim() || (action.actorSavingThrow.repeatedFailureName !== undefined && (typeof action.actorSavingThrow.repeatedFailureName !== "string" || !action.actorSavingThrow.repeatedFailureName.trim())) || (action.actorSavingThrow.repeatedFailureDescription !== undefined && (typeof action.actorSavingThrow.repeatedFailureDescription !== "string" || !action.actorSavingThrow.repeatedFailureDescription.trim())) || (action.actorSavingThrow.blockedByActiveEffectName !== undefined && (typeof action.actorSavingThrow.blockedByActiveEffectName !== "string" || !action.actorSavingThrow.blockedByActiveEffectName.trim())))) errors.push(`${file}: ${feature.id} ${action.id} has an invalid actorSavingThrow`);
        if (action.conditionEffectsByUseCount !== undefined && (!Array.isArray(action.conditionEffectsByUseCount) || action.conditionEffectsByUseCount.length === 0 || new Set(action.conditionEffectsByUseCount.map(step => step?.name)).size !== action.conditionEffectsByUseCount.length || action.conditionEffectsByUseCount.some(step => !step || typeof step.name !== "string" || !step.name.trim() || !Array.isArray(step.effects) || step.effects.length === 0 || step.effects.some(effect => !effect || !activeEffectTargets.has(effect.target) || !Number.isInteger(effect.bonus) || effect.bonus < -20 || effect.bonus > 20 || typeof effect.description !== "string" || !effect.description.trim())))) errors.push(`${file}: ${feature.id} ${action.id} has invalid conditionEffectsByUseCount`);
        if (action.rerollAction !== undefined && (!action.rerollAction || !["d20", "damage", "lower-d20"].includes(action.rerollAction.kind) || typeof action.rerollAction.label !== "string" || !action.rerollAction.label.trim())) errors.push(`${file}: ${feature.id} ${action.id} has an invalid rerollAction`);
        if (action.combatRoll !== undefined) {
          const roll = action.combatRoll;
          const validSteps = (steps, key, allowed) => Array.isArray(steps) && steps.length > 0 && steps[0]?.level === feature.level && steps.every((step, index) => Number.isInteger(step?.level) && step.level >= feature.level && step.level <= 20 && allowed(step?.[key]) && (index === 0 || step.level > steps[index - 1].level));
          const validDuration = (duration) => duration && (["level-minutes", "until-ended"].includes(duration.kind) || (duration.kind === "fixed-rounds" && Number.isInteger(duration.rounds) && duration.rounds >= 1 && duration.rounds <= 999) || (duration.kind === "dice-rounds" && Number.isInteger(duration.count) && duration.count >= 1 && duration.count <= 100 && Number.isInteger(duration.sides) && duration.sides >= 2 && duration.sides <= 1000) || (duration.kind === "decaying-dice" && Number.isInteger(duration.divisor) && duration.divisor >= 2 && duration.divisor <= 100 && Number.isInteger(duration.sides) && duration.sides >= 2 && duration.sides <= 1000));
          if (!roll || (roll.attack !== undefined && (roll.attack.kind !== "ranged-touch" || typeof roll.attack.label !== "string" || !roll.attack.label.trim())) || !roll.damage || typeof roll.damage.type !== "string" || !roll.damage.type.trim() || !validSteps(roll.damage.diceCountByLevel, "count", value => Number.isInteger(value) && value >= 1 && value <= 100) || !validSteps(roll.damage.dieSidesByLevel, "sides", value => Number.isInteger(value) && value >= 2 && value <= 1000) || (roll.damage.abilityModifier !== undefined && !abilities.has(roll.damage.abilityModifier)) || !validSteps(roll.rangeByLevel, "range", value => typeof value === "string" && value.trim()) || (roll.targetSave !== undefined && (!action.savingThrow || !["fortitude", "reflex", "will"].includes(roll.targetSave.modifier) || !["half-damage", "negates-riders", "half-and-negates-riders"].includes(roll.targetSave.outcome))) || (roll.riders !== undefined && (!Array.isArray(roll.riders) || roll.riders.length === 0 || roll.riders.some(rider => !rider || typeof rider.name !== "string" || !rider.name.trim() || typeof rider.description !== "string" || !rider.description.trim() || !validDuration(rider.duration)))) || (roll.secondaryDamage !== undefined && (!action.savingThrow || typeof roll.secondaryDamage.label !== "string" || !roll.secondaryDamage.label.trim() || !Number.isInteger(roll.secondaryDamage.divisor) || roll.secondaryDamage.divisor < 2 || roll.secondaryDamage.divisor > 100 || !["fortitude", "reflex", "will"].includes(roll.secondaryDamage.saveModifier)))) errors.push(`${file}: ${feature.id} ${action.id} has an invalid combatRoll`);
        }
        if (action.activeEffect) {
          const effect = action.activeEffect;
          if (typeof effect.name !== "string" || !effect.name.trim() || !Array.isArray(effect.targets) || effect.targets.length === 0 || effect.targets.some(target => !activeEffectTargets.has(target)) || !Number.isInteger(effect.bonus) || effect.bonus < -20 || effect.bonus > (effect.targets.includes("spellResistance") ? 99 : 20)) errors.push(`${file}: ${feature.id} ${action.id} has an invalid activeEffect`);
          if (effect.bonusByLevel !== undefined && (!Array.isArray(effect.bonusByLevel) || effect.bonusByLevel.length === 0 || effect.bonusByLevel[0]?.level !== feature.level || effect.bonusByLevel.some((step, index) => !Number.isInteger(step?.level) || step.level < feature.level || step.level > 20 || !Number.isInteger(step.bonus) || step.bonus < -20 || step.bonus > 99 || (index > 0 && step.level <= effect.bonusByLevel[index - 1].level)))) errors.push(`${file}: ${feature.id} ${action.id} has invalid activeEffect bonusByLevel`);
          if (effect.weaponSelectionFeatureId !== undefined && (typeof effect.weaponSelectionFeatureId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(effect.weaponSelectionFeatureId))) errors.push(`${file}: ${feature.id} ${action.id} has an invalid weaponSelectionFeatureId`);
          if (effect.usesSelectedModeAsDamageType !== undefined && (typeof effect.usesSelectedModeAsDamageType !== "boolean" || !action.modes?.length)) errors.push(`${file}: ${feature.id} ${action.id} has an invalid usesSelectedModeAsDamageType`);
          if (effect.targets.some(target => target === "self" || target === "area" || target === "enemy") && (typeof effect.description !== "string" || !effect.description.trim())) errors.push(`${file}: ${feature.id} ${action.id} descriptive activeEffect is missing its description`);
          if (effect.defaultRounds !== undefined && (!Number.isInteger(effect.defaultRounds) || effect.defaultRounds < 1 || effect.defaultRounds > 999)) errors.push(`${file}: ${feature.id} ${action.id} has invalid activeEffect rounds`);
          if (effect.fixedRounds !== undefined && typeof effect.fixedRounds !== "boolean") errors.push(`${file}: ${feature.id} ${action.id} activeEffect fixedRounds must be boolean`);
          if (effect.fixedRounds && effect.defaultRounds === undefined) errors.push(`${file}: ${feature.id} ${action.id} fixed activeEffect needs defaultRounds`);
          if (effect.applyToAllTargets !== undefined && (typeof effect.applyToAllTargets !== "boolean" || effect.targets.length < 2)) errors.push(`${file}: ${feature.id} ${action.id} has invalid activeEffect applyToAllTargets`);
          if (effect.replaceExisting !== undefined && typeof effect.replaceExisting !== "boolean") errors.push(`${file}: ${feature.id} ${action.id} has invalid activeEffect replaceExisting`);
          if (effect.upgrades !== undefined && (!Array.isArray(effect.upgrades) || effect.upgrades.length === 0 || new Set(effect.upgrades.map(upgrade => upgrade?.requiredOptionId)).size !== effect.upgrades.length || effect.upgrades.some(upgrade => !upgrade || typeof upgrade.requiredOptionId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(upgrade.requiredOptionId) || typeof upgrade.name !== "string" || !upgrade.name.trim() || !Number.isInteger(upgrade.bonus) || upgrade.bonus < -20 || upgrade.bonus > 20 || typeof upgrade.description !== "string" || !upgrade.description.trim()))) errors.push(`${file}: ${feature.id} ${action.id} has invalid activeEffect upgrades`);
          else for (const upgrade of effect.upgrades ?? []) activeEffectUpgradeOptionRefs.push({ file, featureId: feature.id, actionId: action.id, optionId: upgrade.requiredOptionId });
        }
      }
      for (const calculation of feature.numericCalculations ?? []) {
        if (!calculation || typeof calculation.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(calculation.id) || typeof calculation.label !== "string" || !calculation.label.trim() || typeof calculation.inputLabel !== "string" || !calculation.inputLabel.trim() || !Number.isInteger(calculation.inputMinimum) || !Number.isInteger(calculation.inputMaximum) || calculation.inputMinimum > calculation.inputMaximum || (calculation.inputDefault !== undefined && (!Number.isInteger(calculation.inputDefault) || calculation.inputDefault < calculation.inputMinimum || calculation.inputDefault > calculation.inputMaximum)) || typeof calculation.outputLabel !== "string" || !calculation.outputLabel.trim() || !Array.isArray(calculation.baseByLevel) || calculation.baseByLevel.length === 0 || calculation.baseByLevel[0]?.level !== feature.level || calculation.baseByLevel.some((step, index) => !Number.isInteger(step?.level) || step.level < feature.level || step.level > 20 || !Number.isInteger(step.value) || (index > 0 && step.level <= calculation.baseByLevel[index - 1].level)) || (calculation.classId !== undefined && !classIds.has(calculation.classId)) || (calculation.summary !== undefined && (typeof calculation.summary !== "string" || !calculation.summary.trim()))) errors.push(`${file}: ${feature.id} has an invalid numeric calculation`);
      }
      for (const profile of feature.progressionProfiles ?? []) {
        const columnIds = profile?.columns?.map(column => column?.id) ?? [];
        if (!profile || typeof profile.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.id) || typeof profile.label !== "string" || !profile.label.trim() || !classIds.has(profile.classId) || (profile.usesOwnerSavingThrows !== undefined && typeof profile.usesOwnerSavingThrows !== "boolean") || !Array.isArray(profile.columns) || profile.columns.length === 0 || new Set(columnIds).size !== columnIds.length || profile.columns.some(column => !column || typeof column.id !== "string" || !/^[a-z][A-Za-z0-9]*$/.test(column.id) || typeof column.label !== "string" || !column.label.trim()) || !Array.isArray(profile.steps) || profile.steps.length === 0 || profile.steps[0]?.level !== feature.level || profile.steps.some((step, index) => !Number.isInteger(step?.level) || step.level < feature.level || step.level > 20 || (index > 0 && step.level <= profile.steps[index - 1].level) || !step.values || typeof step.values !== "object" || Array.isArray(step.values) || columnIds.some(id => typeof step.values[id] !== "string" && typeof step.values[id] !== "number")) || (profile.summary !== undefined && (typeof profile.summary !== "string" || !profile.summary.trim()))) errors.push(`${file}: ${feature.id} has an invalid progression profile`);
        if (profile?.advancementOptionId !== undefined) {
          if (typeof profile.advancementOptionId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.advancementOptionId)) errors.push(`${file}: ${feature.id} progression profile has an invalid advancementOptionId`);
          else progressionAdvancementOptionRefs.push({ file, featureId: feature.id, optionId: profile.advancementOptionId });
        }
        if (profile?.requiredOptionId !== undefined) {
          if (typeof profile.requiredOptionId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.requiredOptionId)) errors.push(`${file}: ${feature.id} progression profile has an invalid requiredOptionId`);
          else featureRequiredOptionRefs.push({ file, featureId: feature.id, itemId: profile.id, optionId: profile.requiredOptionId });
        }
      }
    }
  }
  if (archetype.optionGroupAugmentations !== undefined && (!Array.isArray(archetype.optionGroupAugmentations) || archetype.optionGroupAugmentations.length === 0)) errors.push(`${file}: optionGroupAugmentations must be a non-empty array`);
  for (const augmentation of archetype.optionGroupAugmentations ?? []) {
    if (!augmentation || typeof augmentation.targetGroupId !== "string" || typeof augmentation.sourceGroupId !== "string") errors.push(`${file}: option group augmentation is missing a target or source group`);
    if (augmentation?.minimumFeatureLevel !== undefined && (!Number.isInteger(augmentation.minimumFeatureLevel) || augmentation.minimumFeatureLevel < 1 || augmentation.minimumFeatureLevel > 20)) errors.push(`${file}: option group augmentation has an invalid minimumFeatureLevel`);
  }
  if (archetype.spellListAdditions !== undefined) {
    if (!archetype.spellListAdditions || typeof archetype.spellListAdditions !== "object" || Array.isArray(archetype.spellListAdditions) || Object.keys(archetype.spellListAdditions).length === 0) errors.push(`${file}: spellListAdditions must be a non-empty record`);
    else for (const [spellId, spellLevel] of Object.entries(archetype.spellListAdditions)) {
      if (!spellIds.has(spellId)) errors.push(`${file}: spellListAdditions references missing spell ${spellId}`);
      if (!Number.isInteger(spellLevel) || spellLevel < 0 || spellLevel > 9) errors.push(`${file}: spellListAdditions has invalid level for ${spellId}`);
    }
  }
  if (archetype.spellListClassId !== undefined && !classIds.has(archetype.spellListClassId)) errors.push(`${file}: spellListClassId references missing class ${archetype.spellListClassId}`);
  if (archetype.bonusSpellAdditions !== undefined) {
    if (!archetype.bonusSpellAdditions || typeof archetype.bonusSpellAdditions !== "object" || Array.isArray(archetype.bonusSpellAdditions) || Object.keys(archetype.bonusSpellAdditions).length === 0) errors.push(`${file}: bonusSpellAdditions must be a non-empty record`);
    else for (const [spellId, spellLevel] of Object.entries(archetype.bonusSpellAdditions)) {
      if (!spellIds.has(spellId)) errors.push(`${file}: bonusSpellAdditions references missing spell ${spellId}`);
      if (!Number.isInteger(spellLevel) || spellLevel < 0 || spellLevel > 9) errors.push(`${file}: bonusSpellAdditions has invalid level for ${spellId}`);
    }
  }
  for (const key of ["spellSlotAdjustmentPerLevel", "preparedSpellAdjustmentPerLevel", "spellsKnownAdjustmentPerLevel"]) {
    if (archetype[key] !== undefined && (!Number.isInteger(archetype[key]) || archetype[key] === 0 || archetype[key] < -9 || archetype[key] > 9)) errors.push(`${file}: ${key} must be a non-zero integer from -9 to 9`);
  }
  if (archetype.companionGrants !== undefined) {
    const grantIds = new Set();
    if (!Array.isArray(archetype.companionGrants) || archetype.companionGrants.length === 0) errors.push(`${file}: companionGrants must be a non-empty array`);
    for (const grant of archetype.companionGrants ?? []) {
      if (!grant || typeof grant.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(grant.id) || grantIds.has(grant.id)) errors.push(`${file}: companion grant has an invalid or duplicate id`); else grantIds.add(grant.id);
      if (!['animal', 'mount', 'familiar', 'eidolon', 'drake'].includes(grant?.kind) || typeof grant?.label !== "string" || !grant.label.trim() || typeof grant?.optionId !== "string" || !grant.optionId.trim()) errors.push(`${file}: companion grant ${grant?.id ?? "unknown"} has invalid identity fields`);
      if (!Number.isInteger(grant?.minimumLevel) || grant.minimumLevel < 1 || grant.minimumLevel > 20) errors.push(`${file}: companion grant ${grant?.id ?? "unknown"} has an invalid minimumLevel`);
      if (grant?.effectiveLevelAdjustment !== undefined && (!Number.isInteger(grant.effectiveLevelAdjustment) || grant.effectiveLevelAdjustment < -19 || grant.effectiveLevelAdjustment > 19)) errors.push(`${file}: companion grant ${grant?.id ?? "unknown"} has an invalid effectiveLevelAdjustment`);
      if (grant?.stacksWithExisting !== undefined && typeof grant.stacksWithExisting !== "boolean") errors.push(`${file}: companion grant ${grant?.id ?? "unknown"} has an invalid stacksWithExisting flag`);
      if (grant?.usesCharacterLevel !== undefined && typeof grant.usesCharacterLevel !== "boolean") errors.push(`${file}: companion grant ${grant?.id ?? "unknown"} has an invalid usesCharacterLevel flag`);
    }
  }
  if (archetype.companionProgressionAdjustments !== undefined) {
    if (!Array.isArray(archetype.companionProgressionAdjustments) || archetype.companionProgressionAdjustments.length === 0) errors.push(`${file}: companionProgressionAdjustments must be a non-empty array`);
    const companionIds = new Set();
    for (const adjustment of archetype.companionProgressionAdjustments ?? []) {
      if (!adjustment || typeof adjustment.companionId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adjustment.companionId) || companionIds.has(adjustment.companionId)) errors.push(`${file}: companion progression adjustment has an invalid or duplicate companionId`); else companionIds.add(adjustment.companionId);
      if (typeof adjustment?.multiplier !== "number" || !Number.isFinite(adjustment.multiplier) || adjustment.multiplier <= 0 || adjustment.multiplier > 4) errors.push(`${file}: companion progression adjustment ${adjustment?.companionId ?? "unknown"} has an invalid multiplier`);
      if (adjustment?.levelAdjustment !== undefined && (!Number.isInteger(adjustment.levelAdjustment) || adjustment.levelAdjustment < -19 || adjustment.levelAdjustment > 19)) errors.push(`${file}: companion progression adjustment ${adjustment?.companionId ?? "unknown"} has an invalid levelAdjustment`);
      if (adjustment?.minimumEffectiveLevel !== undefined && (!Number.isInteger(adjustment.minimumEffectiveLevel) || adjustment.minimumEffectiveLevel < 1 || adjustment.minimumEffectiveLevel > 20)) errors.push(`${file}: companion progression adjustment ${adjustment?.companionId ?? "unknown"} has an invalid minimumEffectiveLevel`);
    }
  }
  for (const key of ["classSkillAdditions", "classSkillRemovals"]) {
    if (archetype[key] === undefined) continue;
    if (!Array.isArray(archetype[key]) || archetype[key].length === 0 || archetype[key].some((skill) => typeof skill !== "string" || !skill.trim()) || new Set(archetype[key]).size !== archetype[key].length) errors.push(`${file}: ${key} must contain unique non-empty skill names`);
  }
  const overlappingClassSkills = (archetype.classSkillAdditions ?? []).filter((skill) => (archetype.classSkillRemovals ?? []).includes(skill));
  if (overlappingClassSkills.length) errors.push(`${file}: class skills cannot be both added and removed (${overlappingClassSkills.join(", ")})`);
  if (archetype.babProgression !== undefined && !["full", "three-quarters", "half"].includes(archetype.babProgression)) errors.push(`${file}: babProgression is invalid`);
  if (archetype.skillRanksPerLevel !== undefined && (!Number.isInteger(archetype.skillRanksPerLevel) || archetype.skillRanksPerLevel < 1 || archetype.skillRanksPerLevel > 12)) errors.push(`${file}: skillRanksPerLevel is invalid`);
  if (archetype.hitDie !== undefined && ![6, 8, 10, 12].includes(archetype.hitDie)) errors.push(`${file}: hitDie is invalid`);
  for (const [save, progression] of Object.entries(archetype.saveProgressionOverrides ?? {})) {
    if (!["fortitude", "reflex", "will"].includes(save) || !["good", "poor"].includes(progression)) errors.push(`${file}: saveProgressionOverrides contains an invalid save progression`);
  }
  if (archetype.proficiencyAdjustments !== undefined && (!Array.isArray(archetype.proficiencyAdjustments) || archetype.proficiencyAdjustments.length === 0)) errors.push(`${file}: proficiencyAdjustments must be a non-empty array`);
  for (const adjustment of archetype.proficiencyAdjustments ?? []) {
    if (!["weapon", "armor", "shield"].includes(adjustment?.category) || !["add", "remove", "replace"].includes(adjustment?.operation)) errors.push(`${file}: proficiency adjustment has an invalid category or operation`);
    if (!Array.isArray(adjustment?.proficiencies) || adjustment.proficiencies.length === 0 || adjustment.proficiencies.some(value => typeof value !== "string" || !value.trim()) || new Set(adjustment.proficiencies).size !== adjustment.proficiencies.length) errors.push(`${file}: proficiency adjustment must contain unique non-empty proficiency names`);
  }
  if (archetype.resourceAdjustments !== undefined && !Array.isArray(archetype.resourceAdjustments)) errors.push(`${file}: resourceAdjustments must be an array`);
  if (archetype.conditionalModifiers !== undefined && (!Array.isArray(archetype.conditionalModifiers) || archetype.conditionalModifiers.length === 0)) errors.push(`${file}: conditionalModifiers must be a non-empty array`);
  for (const modifier of archetype.conditionalModifiers ?? []) {
    const prefix = `${file}: conditional modifier`;
    if (modifier?.sourceFeatureId !== undefined && !archetype.replacements?.some(replacement => replacement.features?.some(feature => feature.id === modifier.sourceFeatureId))) errors.push(`${prefix} references unknown sourceFeatureId ${modifier.sourceFeatureId}`);
    if (typeof modifier?.label !== "string" || !modifier.label.trim() || typeof modifier?.condition !== "string" || !modifier.condition.trim()) errors.push(`${prefix} must have a label and condition`);
    if (!Number.isInteger(modifier?.base)) errors.push(`${prefix} base must be an integer`);
    if (modifier?.minimumLevel !== undefined && (!Number.isInteger(modifier.minimumLevel) || modifier.minimumLevel < 1 || modifier.minimumLevel > 20)) errors.push(`${prefix} has an invalid minimumLevel`);
    if (modifier?.maximumLevel !== undefined && (!Number.isInteger(modifier.maximumLevel) || modifier.maximumLevel < (modifier.minimumLevel ?? 1) || modifier.maximumLevel > 20)) errors.push(`${prefix} has an invalid maximumLevel`);
    if (modifier?.perInterval !== undefined && !Number.isInteger(modifier.perInterval)) errors.push(`${prefix} perInterval must be an integer`);
    if (modifier?.interval !== undefined && (!Number.isInteger(modifier.interval) || modifier.interval < 1)) errors.push(`${prefix} interval must be a positive integer`);
    if (modifier?.perInterval !== undefined && modifier?.interval === undefined) errors.push(`${prefix} must specify interval when perInterval is present`);
    if (modifier?.levelDivisor !== undefined && (!Number.isInteger(modifier.levelDivisor) || modifier.levelDivisor < 1)) errors.push(`${prefix} levelDivisor must be a positive integer`);
    if (modifier?.levelMultiplier !== undefined && !Number.isInteger(modifier.levelMultiplier)) errors.push(`${prefix} levelMultiplier must be an integer`);
    if (modifier?.levelMultiplier !== undefined && modifier?.levelDivisor === undefined) errors.push(`${prefix} must specify levelDivisor when levelMultiplier is present`);
    if (modifier?.minimum !== undefined && !Number.isInteger(modifier.minimum)) errors.push(`${prefix} minimum must be an integer`);
    if (modifier?.maximum !== undefined && !Number.isInteger(modifier.maximum)) errors.push(`${prefix} maximum must be an integer`);
    if (modifier?.bonusByLevel !== undefined && (!Array.isArray(modifier.bonusByLevel) || modifier.bonusByLevel.length === 0 || modifier.bonusByLevel.some((step, index) => !Number.isInteger(step?.level) || step.level < 1 || step.level > 20 || !Number.isInteger(step?.bonus) || (index > 0 && step.level <= modifier.bonusByLevel[index - 1].level)))) errors.push(`${prefix} has invalid bonusByLevel`);
  }
  if (archetype.skillBonusAdjustments !== undefined && (!Array.isArray(archetype.skillBonusAdjustments) || archetype.skillBonusAdjustments.length === 0)) errors.push(`${file}: skillBonusAdjustments must be a non-empty array`);
  for (const adjustment of archetype.skillBonusAdjustments ?? []) {
    const prefix = `${file}: skill bonus adjustment`;
    if (adjustment?.sourceFeatureId !== undefined && !archetype.replacements?.some(replacement => replacement.features?.some(feature => feature.id === adjustment.sourceFeatureId))) errors.push(`${prefix} references unknown sourceFeatureId ${adjustment.sourceFeatureId}`);
    if (typeof adjustment?.skill !== "string" || !adjustment.skill.trim()) errors.push(`${prefix} must name a skill`);
    if (!Number.isInteger(adjustment?.base)) errors.push(`${prefix} base must be an integer`);
    if (adjustment?.minimumLevel !== undefined && (!Number.isInteger(adjustment.minimumLevel) || adjustment.minimumLevel < 1 || adjustment.minimumLevel > 20)) errors.push(`${prefix} has an invalid minimumLevel`);
    if (adjustment?.maximumLevel !== undefined && (!Number.isInteger(adjustment.maximumLevel) || adjustment.maximumLevel < (adjustment.minimumLevel ?? 1) || adjustment.maximumLevel > 20)) errors.push(`${prefix} has an invalid maximumLevel`);
    if (adjustment?.perInterval !== undefined && !Number.isInteger(adjustment.perInterval)) errors.push(`${prefix} perInterval must be an integer`);
    if (adjustment?.interval !== undefined && (!Number.isInteger(adjustment.interval) || adjustment.interval < 1)) errors.push(`${prefix} interval must be a positive integer`);
    if (adjustment?.perInterval !== undefined && adjustment?.interval === undefined) errors.push(`${prefix} must specify interval when perInterval is present`);
    if (adjustment?.levelDivisor !== undefined && (!Number.isInteger(adjustment.levelDivisor) || adjustment.levelDivisor < 1)) errors.push(`${prefix} levelDivisor must be a positive integer`);
    if (adjustment?.levelMultiplier !== undefined && !Number.isInteger(adjustment.levelMultiplier)) errors.push(`${prefix} levelMultiplier must be an integer`);
    if (adjustment?.levelMultiplier !== undefined && adjustment?.levelDivisor === undefined) errors.push(`${prefix} must specify levelDivisor when levelMultiplier is present`);
    if (adjustment?.minimum !== undefined && !Number.isInteger(adjustment.minimum)) errors.push(`${prefix} minimum must be an integer`);
    if (adjustment?.maximum !== undefined && !Number.isInteger(adjustment.maximum)) errors.push(`${prefix} maximum must be an integer`);
    if (adjustment?.bonusByLevel !== undefined && (!Array.isArray(adjustment.bonusByLevel) || adjustment.bonusByLevel.length === 0 || adjustment.bonusByLevel.some((step, index) => !Number.isInteger(step?.level) || step.level < 1 || step.level > 20 || !Number.isInteger(step?.bonus) || (index > 0 && step.level <= adjustment.bonusByLevel[index - 1].level)))) errors.push(`${prefix} has invalid bonusByLevel`);
    if (adjustment?.condition !== undefined && (typeof adjustment.condition !== "string" || !adjustment.condition.trim())) errors.push(`${prefix} has an invalid condition`);
  }
  if (archetype.landSpeedAdjustments !== undefined && (!Array.isArray(archetype.landSpeedAdjustments) || archetype.landSpeedAdjustments.length === 0)) errors.push(`${file}: landSpeedAdjustments must be a non-empty array`);
  for (const adjustment of archetype.landSpeedAdjustments ?? []) {
    const prefix = `${file}: land-speed adjustment`;
    if (adjustment?.sourceFeatureId !== undefined && !archetype.replacements?.some(replacement => replacement.features?.some(feature => feature.id === adjustment.sourceFeatureId))) errors.push(`${prefix} references unknown sourceFeatureId ${adjustment.sourceFeatureId}`);
    if (typeof adjustment?.label !== "string" || !adjustment.label.trim()) errors.push(`${prefix} must have a label`);
    if (!Number.isInteger(adjustment?.bonus)) errors.push(`${prefix} bonus must be an integer`);
    if (!["beforeReduction", "afterReduction"].includes(adjustment?.timing)) errors.push(`${prefix} has invalid timing`);
    if (adjustment?.minimumLevel !== undefined && (!Number.isInteger(adjustment.minimumLevel) || adjustment.minimumLevel < 1 || adjustment.minimumLevel > 20)) errors.push(`${prefix} has an invalid minimumLevel`);
    if (adjustment?.maximumLevel !== undefined && (!Number.isInteger(adjustment.maximumLevel) || adjustment.maximumLevel < (adjustment.minimumLevel ?? 1) || adjustment.maximumLevel > 20)) errors.push(`${prefix} has an invalid maximumLevel`);
    if (adjustment?.bonusType !== undefined && !["enhancement", "insight", "racial", "untyped"].includes(adjustment.bonusType)) errors.push(`${prefix} has an invalid bonusType`);
    if (adjustment?.bonusByLevel !== undefined && (!Array.isArray(adjustment.bonusByLevel) || adjustment.bonusByLevel.length === 0 || adjustment.bonusByLevel.some((step, index) => !Number.isInteger(step?.level) || step.level < (adjustment.minimumLevel ?? 1) || step.level > 20 || !Number.isInteger(step?.bonus) || (index > 0 && step.level <= adjustment.bonusByLevel[index - 1].level)))) errors.push(`${prefix} has invalid bonusByLevel`);
    if (adjustment?.condition !== undefined && (typeof adjustment.condition !== "string" || !adjustment.condition.trim() || adjustment.condition.length > 250)) errors.push(`${prefix} has an invalid condition`);
    if (adjustment?.armorCategories !== undefined && (!Array.isArray(adjustment.armorCategories) || adjustment.armorCategories.length === 0 || new Set(adjustment.armorCategories).size !== adjustment.armorCategories.length || adjustment.armorCategories.some((category) => !["none", "light", "medium", "heavy"].includes(category)))) errors.push(`${prefix} has invalid armorCategories`);
    if (adjustment?.prohibitedLoads !== undefined && (!Array.isArray(adjustment.prohibitedLoads) || adjustment.prohibitedLoads.length === 0 || new Set(adjustment.prohibitedLoads).size !== adjustment.prohibitedLoads.length || adjustment.prohibitedLoads.some((load) => !["light", "medium", "heavy", "overloaded"].includes(load)))) errors.push(`${prefix} has invalid prohibitedLoads`);
    if (adjustment?.capAtBaseSpeed !== undefined && typeof adjustment.capAtBaseSpeed !== "boolean") errors.push(`${prefix} has invalid capAtBaseSpeed`);
  }
  if (archetype.defenseAdjustments !== undefined && (!Array.isArray(archetype.defenseAdjustments) || archetype.defenseAdjustments.length === 0)) errors.push(`${file}: defenseAdjustments must be a non-empty array`);
  for (const adjustment of archetype.defenseAdjustments ?? []) {
    const prefix = `${file}: defense adjustment`;
    if (adjustment?.sourceFeatureId !== undefined && !archetype.replacements?.some(replacement => replacement.features?.some(feature => feature.id === adjustment.sourceFeatureId))) errors.push(`${prefix} references unknown sourceFeatureId ${adjustment.sourceFeatureId}`);
    if (!["damageReduction", "energyResistance", "spellResistance", "immunity", "evasion", "improvedEvasion", "uncannyDodge", "improvedUncannyDodge", "fortification", "concealment", "missChance"].includes(adjustment?.kind)) errors.push(`${prefix} has an invalid kind`);
    if (typeof adjustment?.label !== "string" || !adjustment.label.trim()) errors.push(`${prefix} must have a label`);
    if (!Number.isInteger(adjustment?.base) || adjustment.base < 0) errors.push(`${prefix} base must be a non-negative integer`);
    if (adjustment?.minimumLevel !== undefined && (!Number.isInteger(adjustment.minimumLevel) || adjustment.minimumLevel < 1 || adjustment.minimumLevel > 20)) errors.push(`${prefix} has an invalid minimumLevel`);
    if (adjustment?.maximumLevel !== undefined && (!Number.isInteger(adjustment.maximumLevel) || adjustment.maximumLevel < (adjustment.minimumLevel ?? 1) || adjustment.maximumLevel > 20)) errors.push(`${prefix} has an invalid maximumLevel`);
    if (adjustment?.levelMultiplier !== undefined && (!Number.isInteger(adjustment.levelMultiplier) || adjustment.levelMultiplier < 0)) errors.push(`${prefix} has an invalid levelMultiplier`);
    if (adjustment?.usesCharacterLevel !== undefined && typeof adjustment.usesCharacterLevel !== "boolean") errors.push(`${prefix} has invalid usesCharacterLevel`);
    if (adjustment?.bonusByLevel !== undefined && (!Array.isArray(adjustment.bonusByLevel) || adjustment.bonusByLevel.length === 0 || adjustment.bonusByLevel.some((step, index) => !Number.isInteger(step?.level) || step.level < (adjustment.minimumLevel ?? 1) || step.level > (adjustment.maximumLevel ?? 20) || !Number.isInteger(step?.bonus) || step.bonus < 0 || (index > 0 && step.level <= adjustment.bonusByLevel[index - 1].level)))) errors.push(`${prefix} has invalid bonusByLevel`);
    if (typeof adjustment?.qualifier !== "string" || !adjustment.qualifier.trim() || adjustment.qualifier.length > 80) errors.push(`${prefix} has an invalid qualifier`);
    if (adjustment?.condition !== undefined && (typeof adjustment.condition !== "string" || !adjustment.condition.trim() || adjustment.condition.length > 250)) errors.push(`${prefix} has an invalid condition`);
  }
  if (archetype.prohibitedOptionIds !== undefined && (!Array.isArray(archetype.prohibitedOptionIds) || new Set(archetype.prohibitedOptionIds).size !== archetype.prohibitedOptionIds.length || archetype.prohibitedOptionIds.some((id) => typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)))) errors.push(`${file}: prohibitedOptionIds must contain unique option ids`);
  else for (const optionId of archetype.prohibitedOptionIds ?? []) archetypeProhibitedOptionRefs.push({ file, optionId });
  if (archetype.prohibitedCompanionKinds !== undefined && (!Array.isArray(archetype.prohibitedCompanionKinds) || new Set(archetype.prohibitedCompanionKinds).size !== archetype.prohibitedCompanionKinds.length || archetype.prohibitedCompanionKinds.some((kind) => !["animal", "mount", "familiar", "eidolon", "drake"].includes(kind)))) errors.push(`${file}: prohibitedCompanionKinds is invalid`);
  const resourceIds = new Set();
  for (const adjustment of archetype.resourceAdjustments ?? []) {
    const prefix = `${file}:${adjustment?.resourceId ?? "unknown resource"}`;
    if (!adjustment || typeof adjustment.resourceId !== "string" || !/^[a-z][A-Za-z0-9]*$/.test(adjustment.resourceId) || resourceIds.has(adjustment.resourceId)) errors.push(`${prefix} has an invalid or duplicate resourceId`);
    else resourceIds.add(adjustment.resourceId);
    if (typeof adjustment?.label !== "string" || !adjustment.label.trim() || typeof adjustment?.unit !== "string" || !adjustment.unit.trim()) errors.push(`${prefix} must have a label and unit`);
    if (adjustment?.operation !== undefined && !["add", "replace"].includes(adjustment.operation)) errors.push(`${prefix} has an invalid operation`);
    if (!Number.isInteger(adjustment?.base) || adjustment.base < 0) errors.push(`${prefix} base must be a non-negative integer`);
    if (adjustment?.minimumLevel !== undefined && (!Number.isInteger(adjustment.minimumLevel) || adjustment.minimumLevel < 1 || adjustment.minimumLevel > 20)) errors.push(`${prefix} has an invalid minimumLevel`);
    if (adjustment?.perInterval !== undefined && (!Number.isInteger(adjustment.perInterval) || adjustment.perInterval < 0)) errors.push(`${prefix} perInterval must be a non-negative integer`);
    if (adjustment?.interval !== undefined && (!Number.isInteger(adjustment.interval) || adjustment.interval < 1)) errors.push(`${prefix} interval must be a positive integer`);
    if (adjustment?.perInterval !== undefined && adjustment?.interval === undefined) errors.push(`${prefix} must specify interval when perInterval is present`);
    if (adjustment?.abilityModifier !== undefined && !["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].includes(adjustment.abilityModifier)) errors.push(`${prefix} has an invalid abilityModifier`);
    for (const bound of ["minimum", "maximum"]) if (adjustment?.[bound] !== undefined && (!Number.isInteger(adjustment[bound]) || adjustment[bound] < 0)) errors.push(`${prefix} ${bound} must be a non-negative integer`);
    if (adjustment?.minimum !== undefined && adjustment?.maximum !== undefined && adjustment.minimum > adjustment.maximum) errors.push(`${prefix} minimum cannot exceed maximum`);
    if (adjustment?.maximumByLevel !== undefined && (!Array.isArray(adjustment.maximumByLevel) || adjustment.maximumByLevel.length === 0 || adjustment.maximumByLevel[0]?.level !== (adjustment.minimumLevel ?? 1) || adjustment.maximumByLevel.some((step, index) => !Number.isInteger(step?.level) || step.level < (adjustment.minimumLevel ?? 1) || step.level > 20 || !Number.isInteger(step.maximum) || step.maximum < 0 || (index > 0 && step.level <= adjustment.maximumByLevel[index - 1].level)))) errors.push(`${prefix} has an invalid maximumByLevel progression`);
    if (adjustment?.advancementOptionId !== undefined) {
      if (typeof adjustment.advancementOptionId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adjustment.advancementOptionId)) errors.push(`${prefix} has an invalid advancementOptionId`);
      else resourceAdvancementOptionRefs.push({ prefix, optionId: adjustment.advancementOptionId });
    }
    if (adjustment?.requiredOptionId !== undefined) {
      if (typeof adjustment.requiredOptionId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adjustment.requiredOptionId)) errors.push(`${prefix} has an invalid requiredOptionId`);
      else resourceAdvancementOptionRefs.push({ prefix, optionId: adjustment.requiredOptionId });
    }
  }
}
for (const archetypeId of archetypeOverlayIds) if (!sourceArchetypes.some(archetype => archetype.id === archetypeId)) errors.push(`archetype automation overlay references missing archetype ${archetypeId}`);
  for (const url of await jsonFiles("options/")) { const g=await load(url); const file=url.pathname.split('/').pop(); checkId(g,file); groupIds.add(g.id); for (const raw of g.options??[]) {const o={...g.optionDefaults,...raw}; checkId(o,`${file}:${o.id}`); optionIds.add(o.id); checkSource(o,`${file}:${o.id}`); if(!Number.isInteger(o.minimumLevel)) errors.push(`${file}:${o.id} missing minimumLevel`); if(o.featId !== undefined && (typeof o.featId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.featId))) errors.push(`${file}:${o.id} has invalid featId`); if(o.spellId !== undefined && (typeof o.spellId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.spellId))) errors.push(`${file}:${o.id} has invalid spellId`); if(o.spellLevel !== undefined && (!Number.isInteger(o.spellLevel)||o.spellLevel<0||o.spellLevel>9)) errors.push(`${file}:${o.id} has invalid spellLevel`); checkSelectableOption(o, `${file}:${o.id}`); checkPrerequisites(o.prerequisites, `${file}:${o.id}`);} }
for (const reference of activeEffectUpgradeOptionRefs) if (!optionIds.has(reference.optionId)) errors.push(`${reference.file}: ${reference.featureId} ${reference.actionId} references unknown activeEffect upgrade option ${reference.optionId}`);
for (const reference of resourceAdvancementOptionRefs) if (!optionIds.has(reference.optionId)) errors.push(`${reference.prefix} references unknown advancement option ${reference.optionId}`);
for (const reference of archetypeProhibitedOptionRefs) if (!optionIds.has(reference.optionId)) errors.push(`${reference.file} prohibits unknown option ${reference.optionId}`);
for (const reference of progressionAdvancementOptionRefs) if (!optionIds.has(reference.optionId)) errors.push(`${reference.file}: ${reference.featureId} progression profile references unknown advancement option ${reference.optionId}`);
for (const reference of featureRequiredOptionRefs) if (!optionIds.has(reference.optionId)) errors.push(`${reference.file}: ${reference.featureId} ${reference.itemId} references unknown required option ${reference.optionId}`);
for (const url of await jsonFiles("bloodline-details/")) { const details=await load(url); const file=url.pathname.split('/').pop(); if(!Array.isArray(details.bloodlines)) errors.push(`${file}: bloodlines must be an array`); else for(const bloodline of details.bloodlines) checkBloodlineDetail(bloodline,file); }
for (const directory of ["races/","feats/","traits/","spells/"]) for (const url of await jsonFiles(directory)) { const r=await load(url); const file=url.pathname.split('/').pop(); checkId(r,file); checkSource(r,file); if(directory === "feats/") { checkPrerequisites(r.prerequisites, file); checkChoice(r.choice, file); checkFeatEffects(r.effects, file); } if(directory === "traits/") { if(!["combat","faith","magic","social"].includes(r.category)) errors.push(`${file}: invalid trait category`); if(typeof r.summary !== "string" || !r.summary.trim()) errors.push(`${file}: missing trait summary`); if(!r.effects || typeof r.effects !== "object" || Array.isArray(r.effects)) errors.push(`${file}: missing trait effects`); for(const modifier of r.effects?.conditionalModifiers ?? []) if(!modifier || typeof modifier.label !== "string" || !modifier.label.trim() || typeof modifier.condition !== "string" || !modifier.condition.trim() || (modifier.bonus !== undefined && typeof modifier.bonus !== "number")) errors.push(`${file}: invalid conditional modifier`); } }
for (const url of await jsonFiles("spell-catalogues/")) { const catalogue=await load(url); const file=url.pathname.split("/").pop(); checkSource(catalogue,file); if(!Array.isArray(catalogue.spells)) { errors.push(file + ": spells must be an array"); continue; } for(const spell of catalogue.spells) { checkId(spell,file + ":" + (spell.id ?? "unknown")); if(typeof spell.name !== "string" || !spell.name.trim()) errors.push(file + ": spell is missing a name"); if(typeof spell.summary !== "string" || !spell.summary.trim()) errors.push(file + ": " + (spell.id ?? "unknown") + " is missing a summary"); const levels=Object.values(spell.levelByClass??{}); if(levels.length===0||levels.some(level=>!Number.isInteger(level)||level<0||level>9)) errors.push(file + ": " + (spell.id ?? "unknown") + " has invalid spell levels"); } }
for (const url of await jsonFiles("spell-schools/")) { const catalogue=await load(url); const file=url.pathname.split("/").pop(); if(catalogue.descriptorsByName !== undefined && (!catalogue.descriptorsByName || typeof catalogue.descriptorsByName !== "object" || Array.isArray(catalogue.descriptorsByName) || Object.entries(catalogue.descriptorsByName).some(([name, descriptors]) => !name.trim() || !Array.isArray(descriptors) || descriptors.length === 0 || new Set(descriptors).size !== descriptors.length || descriptors.some(descriptor => !spellDescriptors.has(descriptor))))) errors.push(`${file}: descriptorsByName contains an invalid spell descriptor mapping`); }
for (const url of await jsonFiles("spell-details/")) { const catalogue=await load(url); const file=url.pathname.split("/").pop(); if(!Array.isArray(catalogue.spells)) { errors.push(`${file}: spell details must be an array`); continue; } const detailIds=new Set(); for(const spell of catalogue.spells) { if(typeof spell.id!=="string"||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spell.id)||detailIds.has(spell.id)) errors.push(`${file}: invalid or duplicate spell detail id ${spell.id??"unknown"}`); else detailIds.add(spell.id); checkSource(spell,`${file}:${spell.id??"unknown"}`); if(typeof spell.description!=="string"||!spell.description.trim()) errors.push(`${file}:${spell.id??"unknown"} is missing a full description`); for(const key of ["castingTime","range","duration"]) if(typeof spell[key]!=="string"||!spell[key].trim()) errors.push(`${file}:${spell.id??"unknown"} is missing ${key}`); if(!Array.isArray(spell.components)||spell.components.length===0) errors.push(`${file}:${spell.id??"unknown"} is missing components`); } }
for (const url of await jsonFiles("spell-class-levels/")) { const overlay=await load(url); const file=url.pathname.split("/").pop(); checkSource(overlay,file); if(!overlay.levelsBySpellId||typeof overlay.levelsBySpellId!=="object"||Array.isArray(overlay.levelsBySpellId)) errors.push(`${file}: levelsBySpellId must be an object`); else for(const [spellId,levels] of Object.entries(overlay.levelsBySpellId)) { if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spellId)||!levels||typeof levels!=="object"||Array.isArray(levels)||Object.values(levels).some(level=>!Number.isInteger(level)||level<0||level>9)) errors.push(`${file}: invalid level overlay for ${spellId}`); else if(!ids.has(spellId)) errors.push(`${file}: references missing spell ${spellId}`); } }
for (const url of await jsonFiles("classes/")) { const c=await load(url); for (const f of c.features??[]) if(f.optionGroupId && !groupIds.has(f.optionGroupId)) errors.push(`${c.id}:${f.id} references missing option group ${f.optionGroupId}`); }
for (const [index, url] of archetypeUrls.entries()) {
  const archetype=mergedArchetypes[index]; const file=url.pathname.split('/').pop();
  for (const augmentation of archetype.optionGroupAugmentations ?? []) {
    if (!groupIds.has(augmentation.targetGroupId)) errors.push(`${file}: option group augmentation references missing target group ${augmentation.targetGroupId}`);
    if (!groupIds.has(augmentation.sourceGroupId)) errors.push(`${file}: option group augmentation references missing source group ${augmentation.sourceGroupId}`);
  }
  for (const feature of (archetype.replacements ?? []).flatMap(replacement => replacement.features ?? [])) {
    if (feature.requiredOptionId && !optionIds.has(feature.requiredOptionId)) errors.push(`${file}: ${feature.id} references missing required option ${feature.requiredOptionId}`);
  }
}
for (const url of await jsonFiles("equipment/")) {
  const catalogue=await load(url); const file=url.pathname.split("/").pop(); checkSource(catalogue,file);
  const equipmentIds=new Set();
  if(!Array.isArray(catalogue.items)||catalogue.items.length===0) errors.push(`${file}: equipment items must be a non-empty array`);
  for(const item of catalogue.items??[]) {
    if(!item.id||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)||equipmentIds.has(item.id)) errors.push(`${file}: invalid or duplicate equipment id ${item.id??"unknown"}`); else equipmentIds.add(item.id);
    if(typeof item.name!=="string"||!item.name.trim()||!["armor","shield","weapon","gear","magic"].includes(item.category)) errors.push(`${file}:${item.id??"unknown"} has invalid identity or category`);
    if(typeof item.costGp!=="number"||item.costGp<0||typeof item.weight!=="number"||item.weight<0) errors.push(`${file}:${item.id??"unknown"} has invalid cost or weight`);
  }
}
if(errors.length){ console.error(`Data validation failed with ${errors.length} error(s):`); errors.forEach(e=>console.error(`- ${e}`)); process.exit(1); }
console.log(`Validated ${ids.size} unique records across ${classIds.size} classes, ${groupIds.size} option groups, and ${bloodlineDetailIds.size} bloodline details.`);
