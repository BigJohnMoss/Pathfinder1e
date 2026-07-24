const abilityModifier = (score) => {
  if (!Number.isInteger(score) || score < 1) throw new RangeError("Ability score must be a positive integer.");
  return Math.floor((score - 10) / 2);
};

const bonusSpellsByLevel = (abilityScore, maximumLevel) => {
  const modifier = abilityModifier(abilityScore);
  return Object.fromEntries(Array.from({ length: maximumLevel }, (_, index) => {
    const level = index + 1;
    const count = modifier < level ? 0 : Math.floor((modifier - level) / 4) + 1;
    return [level, count];
  }));
};

export function spontaneousSpellcastingProgression(characterClass, level, { abilityScore = 10 } = {}) {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError("Level must be an integer from 1 to 20.");
  const spellcasting = characterClass?.spellcasting;
  if (!spellcasting || spellcasting.castingType !== "spontaneous") return null;
  const slots = spellcasting.slotsByLevel?.[level - 1];
  const known = spellcasting.knownByLevel?.[level - 1];
  if (!Array.isArray(slots) || !Array.isArray(known)) throw new Error("Spontaneous spellcasting progression is incomplete.");

  const highestBaseLevel = Math.max(0, ...slots.map((count, index) => count > 0 ? index + 1 : 0));
  const maximumSpellLevel = Math.min(Math.max(0, abilityScore - 10), highestBaseLevel);
  const bonusByLevel = bonusSpellsByLevel(abilityScore, slots.length);
  return {
    ability: spellcasting.ability,
    castingType: "spontaneous",
    maximumSpellLevel,
    slots: slots.map((base, index) => ({
      level: index + 1,
      base,
      bonus: bonusByLevel[index + 1] ?? 0,
      count: base + (bonusByLevel[index + 1] ?? 0)
    })).filter((entry) => entry.count > 0 && entry.level <= maximumSpellLevel),
    known: known.map((count, spellLevel) => ({ level: spellLevel, count }))
      .filter((entry) => entry.count > 0 && entry.level <= maximumSpellLevel)
  };
}

export function normalizeKnownSpells(knownSpellIds, spells, classId, knownLimits) {
  if (!Array.isArray(knownSpellIds) || !Array.isArray(spells) || typeof classId !== "string" || !Array.isArray(knownLimits)) return [];
  const limits = new Map(knownLimits.map((entry) => [entry.level, entry.count]));
  const available = new Map(spells.filter((spell) => spell.levelByClass?.[classId] !== undefined).map((spell) => [spell.id, spell]));
  const knownByLevel = new Map();
  return knownSpellIds.filter((id, index, ids) => {
    if (typeof id !== "string" || ids.indexOf(id) !== index) return false;
    const spell = available.get(id);
    if (!spell) return false;
    const spellLevel = spell.levelByClass[classId];
    const count = knownByLevel.get(spellLevel) ?? 0;
    if (count >= (limits.get(spellLevel) ?? 0)) return false;
    knownByLevel.set(spellLevel, count + 1);
    return true;
  });
}
