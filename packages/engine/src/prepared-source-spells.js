export function preparedSourceSpellCapacity(classId, classLevel, intelligenceModifier, bonusSpells = 0) {
  const level = Math.max(1, Math.min(20, Math.trunc(classLevel) || 1));
  const modifier = Math.max(0, Math.trunc(intelligenceModifier) || 0);
  const bonus = Math.max(0, Math.trunc(Number(bonusSpells) || 0));
  if (classId === "alchemist" || classId === "investigator") return 2 + modifier + Math.max(0, level - 1) * 2 + bonus;
  if (classId === "witch") return 3 + modifier + Math.max(0, level - 1) * 2 + bonus;
  return null;
}

export function normalizePreparedSourceSpells(spellIds, spells, classId, maximumSpellLevel, capacity, automaticSpellIds = []) {
  if (capacity === null) return [];
  const automatic = new Set(automaticSpellIds);
  const valid = new Set(spells.flatMap((spell) => {
    const level = spell.levelByClass?.[classId];
    return Number.isInteger(level) && level > 0 && level <= maximumSpellLevel && !automatic.has(spell.id) ? [spell.id] : [];
  }));
  return [...new Set(Array.isArray(spellIds) ? spellIds : [])].filter((id) => valid.has(id)).slice(0, Math.max(0, capacity));
}

export function preparedSourceAvailableSpells(spells, classId, knownSpellIds, automaticSpellIds = []) {
  const allowed = new Set([...knownSpellIds, ...automaticSpellIds]);
  return spells.filter((spell) => spell.levelByClass?.[classId] === 0 || allowed.has(spell.id));
}
