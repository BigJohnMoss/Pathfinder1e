const normalizeName = (name) => typeof name === "string"
  ? name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  : "";

export function bloodlineBonusSpells(spells, selectedBloodline, sorcererLevel) {
  if (!Array.isArray(spells) || !Number.isInteger(sorcererLevel) || sorcererLevel < 1 || !Array.isArray(selectedBloodline?.bonusSpells)) return [];
  const spellsByName = new Map(spells.map((spell) => [normalizeName(spell.name), spell]));
  return selectedBloodline.bonusSpells
    .filter((entry) => Number.isInteger(entry.sorcererLevel) && entry.sorcererLevel <= sorcererLevel)
    .flatMap((entry) => {
      const spell = spellsByName.get(normalizeName(entry.name));
      return spell ? [spell] : [];
    });
}

export function bloodlineClassSkills(baseClassSkills, selectedBloodline) {
  const skills = Array.isArray(baseClassSkills) ? baseClassSkills.filter((skill) => typeof skill === "string") : [];
  const bloodlineSkill = selectedBloodline?.classSkill;
  return typeof bloodlineSkill === "string" && bloodlineSkill.length > 0
    ? [...new Set([...skills, bloodlineSkill])]
    : [...new Set(skills)];
}

export function bloodlinePowersThroughLevel(selectedBloodline, sorcererLevel) {
  if (!Array.isArray(selectedBloodline?.powers) || !Number.isInteger(sorcererLevel) || sorcererLevel < 1) return [];
  return selectedBloodline.powers.filter((power) => Number.isInteger(power.level) && power.level <= sorcererLevel);
}
