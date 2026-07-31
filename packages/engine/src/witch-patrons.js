const normalizeName = value => typeof value === "string" ? value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";
const keys = name => { const value = normalizeName(name); const parts = value.split(" "); return [value, ...(parts.length > 1 ? [`${parts.slice(1).join(" ")} ${parts[0]}`] : [])]; };

export function witchPatronSpells(spells, patron, witchLevel, classId = "witch") {
  if (!Array.isArray(spells) || !Array.isArray(patron?.patronSpells) || !Number.isInteger(witchLevel) || witchLevel < 2) return [];
  const byName = new Map();
  for (const spell of spells) for (const key of keys(spell.name)) if (!byName.has(key)) byName.set(key, spell);
  return patron.patronSpells.slice(0, Math.min(9, Math.floor(witchLevel / 2))).flatMap((name, index) => {
    const spell = keys(name).map(key => byName.get(key)).find(Boolean);
    return spell ? [{ ...spell, name, levelByClass: { ...(spell.levelByClass ?? {}), [classId]: index + 1 } }] : [];
  });
}
