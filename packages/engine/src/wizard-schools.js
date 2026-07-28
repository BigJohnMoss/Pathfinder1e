const schoolName = (id, prefix) => typeof id === "string" && id.startsWith(prefix) ? id.slice(prefix.length) : null;

export function oppositionSchoolOptions(options, selectedSchool) {
  const school = selectedSchool?.associatedSchool ?? schoolName(selectedSchool?.id, "wizard-school-");
  if (!school || school === "universalist") return [];
  if (selectedSchool?.elementalOppositionSchool) {
    return options.filter((option) => schoolName(option.id, "wizard-opposition-") === selectedSchool.elementalOppositionSchool);
  }
  const elementalSchools = new Set(["air", "earth", "fire", "water"]);
  return options.filter((option) => {
    const optionSchool = schoolName(option.id, "wizard-opposition-");
    return optionSchool !== school && !elementalSchools.has(optionSchool);
  });
}
