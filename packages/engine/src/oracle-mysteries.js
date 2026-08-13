const normalizeName = (name) => typeof name === "string"
  ? name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  : "";
const spellNameKeys = (name) => {
  const normalized = normalizeName(name);
  if (!normalized) return [];
  if (normalized.startsWith("mass ")) return [normalized, `${normalized.slice(5)} mass`];
  if (normalized.endsWith(" mass")) return [normalized, `mass ${normalized.slice(0, -5)}`];
  return [normalized];
};

export function mysteryBonusSpells(spells, selectedMystery, oracleLevel, classId = "oracle", replacedClassLevels = []) {
  if (!Array.isArray(spells) || !Array.isArray(selectedMystery?.mysterySpells) || !Number.isInteger(oracleLevel) || oracleLevel < 1) return [];
  const byName = new Map();
  for (const spell of spells) for (const key of spellNameKeys(spell.name)) if (!byName.has(key)) byName.set(key, spell);
  return selectedMystery.mysterySpells
    .filter((entry) => entry.oracleLevel <= oracleLevel && !replacedClassLevels.includes(entry.oracleLevel))
    .flatMap((entry) => {
      const spell = spellNameKeys(entry.name).map((key) => byName.get(key)).find(Boolean);
      return spell ? [{ ...spell, name: entry.name, levelByClass: { ...(spell.levelByClass ?? {}), [classId]: entry.spellLevel } }] : [];
    });
}

export function revelationsThroughLevel(selectedMystery, oracleLevel) {
  if (!Array.isArray(selectedMystery?.revelations) || !Number.isInteger(oracleLevel) || oracleLevel < 1) return [];
  return selectedMystery.revelations.filter((revelation) => revelation.minimumLevel <= oracleLevel);
}
