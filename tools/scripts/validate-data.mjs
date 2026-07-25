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
  if (!Array.isArray(choice.options)) return;
  const ids = new Set();
  for (const option of choice.options) { if (!option || typeof option.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(option.id) || typeof option.name !== "string" || !option.name.trim()) errors.push(`${file}: choice has an invalid option`); else if (ids.has(option.id)) errors.push(`${file}: choice has duplicate option ${option.id}`); else ids.add(option.id); }
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

  if (!Array.isArray(bloodline.bonusFeats) || bloodline.bonusFeats.length !== 8 || new Set(bloodline.bonusFeats).size !== 8 || bloodline.bonusFeats.some(feat => typeof feat !== "string" || !feat.trim())) errors.push(`${label}: bonusFeats must contain eight unique names`);

  const expectedPowerLevels = [1, 3, 9, 15, 20];
  if (!Array.isArray(bloodline.powers) || bloodline.powers.length !== expectedPowerLevels.length) errors.push(`${label}: powers must contain five entries`);
  else bloodline.powers.forEach((power, index) => {
    if (!power || power.level !== expectedPowerLevels[index] || typeof power.name !== "string" || !power.name.trim() || typeof power.summary !== "string" || !power.summary.trim()) errors.push(`${label}: invalid bloodline power at index ${index}`);
  });
}

for (const url of await jsonFiles("classes/")) {
  const c=await load(url); const file=url.pathname.split('/').pop(); checkId(c,file); checkSource(c,file); classIds.add(c.id);
  for (const key of ["name","hitDie","babProgression","saves","skillRanksPerLevel","source","features"]) if (c[key] === undefined) errors.push(`${file}: missing ${key}`);
  if (c.spellcasting) checkSpellcasting(c.spellcasting, file);
  const featureIds=new Set();
  for (const f of c.features ?? []) {
    if (featureIds.has(f.id)) errors.push(`${file}: duplicate feature id ${f.id}`); featureIds.add(f.id);
    if (!Number.isInteger(f.level) || f.level<1 || f.level>20) errors.push(`${file}: ${f.id} has invalid level`);
    if (f.choiceRequired && !f.optionGroupId) errors.push(`${file}: ${f.id} requires a choice but has no optionGroupId`);
  }
}
for (const url of await jsonFiles("options/")) { const g=await load(url); const file=url.pathname.split('/').pop(); checkId(g,file); groupIds.add(g.id); for (const o of g.options??[]) {checkId(o,`${file}:${o.id}`); optionIds.add(o.id); checkSource(o,`${file}:${o.id}`); if(!Number.isInteger(o.minimumLevel)) errors.push(`${file}:${o.id} missing minimumLevel`); checkPrerequisites(o.prerequisites, `${file}:${o.id}`);} }
for (const url of await jsonFiles("bloodline-details/")) { const details=await load(url); const file=url.pathname.split('/').pop(); if(!Array.isArray(details.bloodlines)) errors.push(`${file}: bloodlines must be an array`); else for(const bloodline of details.bloodlines) checkBloodlineDetail(bloodline,file); }
for (const directory of ["races/","feats/","spells/"]) for (const url of await jsonFiles(directory)) { const r=await load(url); const file=url.pathname.split('/').pop(); checkId(r,file); checkSource(r,file); if(directory === "feats/") { checkPrerequisites(r.prerequisites, file); checkChoice(r.choice, file); } }
for (const url of await jsonFiles("spell-catalogues/")) { const catalogue=await load(url); const file=url.pathname.split("/").pop(); checkSource(catalogue,file); if(!Array.isArray(catalogue.spells)) { errors.push(file + ": spells must be an array"); continue; } for(const spell of catalogue.spells) { checkId(spell,file + ":" + (spell.id ?? "unknown")); if(typeof spell.name !== "string" || !spell.name.trim()) errors.push(file + ": spell is missing a name"); if(typeof spell.summary !== "string" || !spell.summary.trim()) errors.push(file + ": " + (spell.id ?? "unknown") + " is missing a summary"); const level=spell.levelByClass?.arcanist; if(!Number.isInteger(level) || level<0 || level>9) errors.push(file + ": " + (spell.id ?? "unknown") + " has an invalid arcanist spell level"); } }
for (const url of await jsonFiles("classes/")) { const c=await load(url); for (const f of c.features??[]) if(f.optionGroupId && !groupIds.has(f.optionGroupId)) errors.push(`${c.id}:${f.id} references missing option group ${f.optionGroupId}`); }
if(errors.length){ console.error(`Data validation failed with ${errors.length} error(s):`); errors.forEach(e=>console.error(`- ${e}`)); process.exit(1); }
console.log(`Validated ${ids.size} unique records across ${classIds.size} classes, ${groupIds.size} option groups, and ${bloodlineDetailIds.size} bloodline details.`);
