const normalizeSchoolId = (schoolId) => {
  if (typeof schoolId !== "string") return null;
  for (const prefix of ["wizard-school-", "wizard-opposition-"]) {
    if (schoolId.startsWith(prefix)) return schoolId.slice(prefix.length);
  }
  return schoolId;
};

const spellSchools = (spell) => Array.isArray(spell?.schools) && spell.schools.length > 0
  ? spell.schools
  : [spell?.school].filter(Boolean);

export function spellPreparationCost(spell, oppositionSchoolIds = [], oppositionSpellIds = []) {
  const oppositionSchools = new Set(oppositionSchoolIds.map(normalizeSchoolId).filter(Boolean));
  return oppositionSpellIds.includes(spell?.id) || spellSchools(spell).some((school) => oppositionSchools.has(school)) ? 2 : 1;
}

export function preparedSpellSlotUsage(preparedSpellIds, spells, classId, oppositionSchoolIds = [], oppositionSpellIds = []) {
  if (!Array.isArray(preparedSpellIds) || !Array.isArray(spells) || typeof classId !== "string") return {};
  const available = new Map(spells.map((spell) => [spell.id, spell]));
  return preparedSpellIds.reduce((usage, id) => {
    const spell = available.get(id);
    const level = spell?.levelByClass?.[classId];
    if (!Number.isInteger(level)) return usage;
    usage[level] = (usage[level] ?? 0) + spellPreparationCost(spell, oppositionSchoolIds, oppositionSpellIds);
    return usage;
  }, {});
}

export function normalizePreparedSpellsWithOpposition(preparedSpellIds, spells, classId, preparedLimits, oppositionSchoolIds = [], oppositionSpellIds = []) {
  if (!Array.isArray(preparedSpellIds) || !Array.isArray(spells) || typeof classId !== "string" || !Array.isArray(preparedLimits)) return [];
  const limits = new Map(preparedLimits.map((entry) => [entry.level, entry.count]));
  const available = new Map(spells.filter((spell) => spell.levelByClass?.[classId] !== undefined).map((spell) => [spell.id, spell]));
  const usageByLevel = new Map();
  return preparedSpellIds.filter((id) => {
    const spell = available.get(id);
    if (!spell) return false;
    const level = spell.levelByClass[classId];
    const cost = spellPreparationCost(spell, oppositionSchoolIds, oppositionSpellIds);
    const used = usageByLevel.get(level) ?? 0;
    if (used + cost > (limits.get(level) ?? 0)) return false;
    usageByLevel.set(level, used + cost);
    return true;
  });
}
