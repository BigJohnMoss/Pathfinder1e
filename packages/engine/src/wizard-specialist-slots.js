const schoolFromOption = (selectedSchool) => {
  const prefix = "wizard-school-";
  return typeof selectedSchool?.id === "string" && selectedSchool.id.startsWith(prefix) ? selectedSchool.id.slice(prefix.length) : null;
};

const spellSchools = (spell) => Array.isArray(spell.schools) && spell.schools.length > 0 ? spell.schools : [spell.school].filter(Boolean);

export function specialistSchoolSpells(spells, selectedSchool, spellLevel) {
  if (!Number.isInteger(spellLevel) || spellLevel < 1 || spellLevel > 9) return [];
  const school = schoolFromOption(selectedSchool);
  if (!school || school === "universalist") return [];
  return spells
    .filter((spell) => spellSchools(spell).includes(school) && spell.levelByClass?.wizard === spellLevel)
    .sort((left, right) => left.name.localeCompare(right.name));
}
