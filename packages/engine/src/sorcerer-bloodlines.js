const normalizeName = (name) => typeof name === "string"
  ? name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  : "";

const spellNameKeys = (name) => {
  const normalized = normalizeName(name);
  if (!normalized) return [];
  if (normalized.startsWith("greater ")) return [normalized, `${normalized.slice("greater ".length)} greater`];
  if (normalized.endsWith(" greater")) return [normalized, `greater ${normalized.slice(0, -" greater".length)}`];
  return [normalized];
};

export function bloodlineBonusSpells(spells, selectedBloodline, sorcererLevel, classId = "sorcerer") {
  if (!Array.isArray(spells) || !Number.isInteger(sorcererLevel) || sorcererLevel < 1 || typeof classId !== "string" || !classId || !Array.isArray(selectedBloodline?.bonusSpells)) return [];
  const spellsByName = new Map();
  for (const spell of spells) for (const key of spellNameKeys(spell?.name)) if (!spellsByName.has(key)) spellsByName.set(key, spell);
  return selectedBloodline.bonusSpells
    .filter((entry) => Number.isInteger(entry.sorcererLevel) && entry.sorcererLevel <= sorcererLevel && Number.isInteger(entry.spellLevel) && entry.spellLevel >= 0)
    .flatMap((entry) => {
      const spell = spellNameKeys(entry.name).map((key) => spellsByName.get(key)).find(Boolean);
      return spell ? [{ ...spell, name: entry.name, levelByClass: { ...(spell.levelByClass ?? {}), [classId]: entry.spellLevel } }] : [];
    });
}

export function bloodlineClassSkills(baseClassSkills, selectedBloodline, selectedClassSkill) {
  const skills = Array.isArray(baseClassSkills) ? baseClassSkills.filter((skill) => typeof skill === "string") : [];
  const choices = Array.isArray(selectedBloodline?.classSkillChoices)
    ? selectedBloodline.classSkillChoices.filter((skill) => typeof skill === "string" && skill.length > 0)
    : [];
  const bloodlineSkill = choices.length > 0
    ? choices.includes(selectedClassSkill) ? selectedClassSkill : null
    : selectedBloodline?.classSkill;
  return typeof bloodlineSkill === "string" && bloodlineSkill.length > 0
    ? [...new Set([...skills, bloodlineSkill])]
    : [...new Set(skills)];
}

export function bloodlinePowersThroughLevel(selectedBloodline, sorcererLevel) {
  if (!Array.isArray(selectedBloodline?.powers) || !Number.isInteger(sorcererLevel) || sorcererLevel < 1) return [];
  return selectedBloodline.powers.filter((power) => Number.isInteger(power.level) && power.level <= sorcererLevel);
}
