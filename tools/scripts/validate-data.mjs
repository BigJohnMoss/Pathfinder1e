import { readdir, readFile } from "node:fs/promises";
import { validatePrerequisites } from "../../packages/data/src/validation.js";

const root = new URL("../../packages/data/src/", import.meta.url);
const errors = [];
const ids = new Map();
const classIds = new Set();
const groupIds = new Set();
const optionIds = new Set();
const bloodlineDetailIds = new Set();

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
for (const url of await jsonFiles("archetypes/")) {
  const archetype=await load(url); const file=url.pathname.split('/').pop(); checkId(archetype,file); checkSource(archetype,file);
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
    }
  }
  if (archetype.spellListAdditions !== undefined) {
    if (!archetype.spellListAdditions || typeof archetype.spellListAdditions !== "object" || Array.isArray(archetype.spellListAdditions) || Object.keys(archetype.spellListAdditions).length === 0) errors.push(`${file}: spellListAdditions must be a non-empty record`);
    else for (const [spellId, spellLevel] of Object.entries(archetype.spellListAdditions)) {
      if (!spellIds.has(spellId)) errors.push(`${file}: spellListAdditions references missing spell ${spellId}`);
      if (!Number.isInteger(spellLevel) || spellLevel < 0 || spellLevel > 9) errors.push(`${file}: spellListAdditions has invalid level for ${spellId}`);
    }
  }
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
  if (archetype.resourceAdjustments !== undefined && !Array.isArray(archetype.resourceAdjustments)) errors.push(`${file}: resourceAdjustments must be an array`);
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
  }
}
  for (const url of await jsonFiles("options/")) { const g=await load(url); const file=url.pathname.split('/').pop(); checkId(g,file); groupIds.add(g.id); for (const raw of g.options??[]) {const o={...g.optionDefaults,...raw}; checkId(o,`${file}:${o.id}`); optionIds.add(o.id); checkSource(o,`${file}:${o.id}`); if(!Number.isInteger(o.minimumLevel)) errors.push(`${file}:${o.id} missing minimumLevel`); if(o.featId !== undefined && (typeof o.featId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.featId))) errors.push(`${file}:${o.id} has invalid featId`); if(o.spellId !== undefined && (typeof o.spellId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.spellId))) errors.push(`${file}:${o.id} has invalid spellId`); if(o.spellLevel !== undefined && (!Number.isInteger(o.spellLevel)||o.spellLevel<0||o.spellLevel>9)) errors.push(`${file}:${o.id} has invalid spellLevel`); checkSelectableOption(o, `${file}:${o.id}`); checkPrerequisites(o.prerequisites, `${file}:${o.id}`);} }
for (const url of await jsonFiles("bloodline-details/")) { const details=await load(url); const file=url.pathname.split('/').pop(); if(!Array.isArray(details.bloodlines)) errors.push(`${file}: bloodlines must be an array`); else for(const bloodline of details.bloodlines) checkBloodlineDetail(bloodline,file); }
for (const directory of ["races/","feats/","traits/","spells/"]) for (const url of await jsonFiles(directory)) { const r=await load(url); const file=url.pathname.split('/').pop(); checkId(r,file); checkSource(r,file); if(directory === "feats/") { checkPrerequisites(r.prerequisites, file); checkChoice(r.choice, file); checkFeatEffects(r.effects, file); } if(directory === "traits/") { if(!["combat","faith","magic","social"].includes(r.category)) errors.push(`${file}: invalid trait category`); if(typeof r.summary !== "string" || !r.summary.trim()) errors.push(`${file}: missing trait summary`); if(!r.effects || typeof r.effects !== "object" || Array.isArray(r.effects)) errors.push(`${file}: missing trait effects`); for(const modifier of r.effects?.conditionalModifiers ?? []) if(!modifier || typeof modifier.label !== "string" || !modifier.label.trim() || typeof modifier.condition !== "string" || !modifier.condition.trim() || (modifier.bonus !== undefined && typeof modifier.bonus !== "number")) errors.push(`${file}: invalid conditional modifier`); } }
for (const url of await jsonFiles("spell-catalogues/")) { const catalogue=await load(url); const file=url.pathname.split("/").pop(); checkSource(catalogue,file); if(!Array.isArray(catalogue.spells)) { errors.push(file + ": spells must be an array"); continue; } for(const spell of catalogue.spells) { checkId(spell,file + ":" + (spell.id ?? "unknown")); if(typeof spell.name !== "string" || !spell.name.trim()) errors.push(file + ": spell is missing a name"); if(typeof spell.summary !== "string" || !spell.summary.trim()) errors.push(file + ": " + (spell.id ?? "unknown") + " is missing a summary"); const levels=Object.values(spell.levelByClass??{}); if(levels.length===0||levels.some(level=>!Number.isInteger(level)||level<0||level>9)) errors.push(file + ": " + (spell.id ?? "unknown") + " has invalid spell levels"); } }
for (const url of await jsonFiles("spell-details/")) { const catalogue=await load(url); const file=url.pathname.split("/").pop(); if(!Array.isArray(catalogue.spells)) { errors.push(`${file}: spell details must be an array`); continue; } const detailIds=new Set(); for(const spell of catalogue.spells) { if(typeof spell.id!=="string"||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spell.id)||detailIds.has(spell.id)) errors.push(`${file}: invalid or duplicate spell detail id ${spell.id??"unknown"}`); else detailIds.add(spell.id); checkSource(spell,`${file}:${spell.id??"unknown"}`); if(typeof spell.description!=="string"||!spell.description.trim()) errors.push(`${file}:${spell.id??"unknown"} is missing a full description`); for(const key of ["castingTime","range","duration"]) if(typeof spell[key]!=="string"||!spell[key].trim()) errors.push(`${file}:${spell.id??"unknown"} is missing ${key}`); if(!Array.isArray(spell.components)||spell.components.length===0) errors.push(`${file}:${spell.id??"unknown"} is missing components`); } }
for (const url of await jsonFiles("spell-class-levels/")) { const overlay=await load(url); const file=url.pathname.split("/").pop(); checkSource(overlay,file); if(!overlay.levelsBySpellId||typeof overlay.levelsBySpellId!=="object"||Array.isArray(overlay.levelsBySpellId)) errors.push(`${file}: levelsBySpellId must be an object`); else for(const [spellId,levels] of Object.entries(overlay.levelsBySpellId)) { if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spellId)||!levels||typeof levels!=="object"||Array.isArray(levels)||Object.values(levels).some(level=>!Number.isInteger(level)||level<0||level>9)) errors.push(`${file}: invalid level overlay for ${spellId}`); else if(!ids.has(spellId)) errors.push(`${file}: references missing spell ${spellId}`); } }
for (const url of await jsonFiles("classes/")) { const c=await load(url); for (const f of c.features??[]) if(f.optionGroupId && !groupIds.has(f.optionGroupId)) errors.push(`${c.id}:${f.id} references missing option group ${f.optionGroupId}`); }
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
