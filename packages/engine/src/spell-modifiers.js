const normalizedSchools = (spell) =>
  (spell.schools?.length ? spell.schools : [spell.school])
    .filter(Boolean)
    .map((school) => String(school).trim().toLowerCase());

export function spellHasSchool(spell, school) {
  return normalizedSchools(spell).includes(String(school).trim().toLowerCase());
}

export function isTransmutationSpell(spell) {
  return spellHasSchool(spell, "transmutation");
}

export function isPersonalRangeSpell(spell) {
  return /^personal\b/i.test(String(spell.range ?? "").trim());
}

export function extendedSpellDuration(duration) {
  const value = String(duration ?? "").trim();
  if (!value || /^(?:concentration|instantaneous|permanent)\b/i.test(value))
    return null;

  const standard = value.match(/^(\d+)\s+(round|minute|hour|day)s?(\/level)?(.*)$/i);
  if (!standard) return `twice ${value}`;

  const amount = Number(standard[1]) * 2;
  const unit = standard[2].toLowerCase();
  return `${amount} ${unit}${amount === 1 ? "" : "s"}${standard[3] ?? ""}${standard[4] ?? ""}`;
}
