const schoolName = (id, prefix) => typeof id === "string" && id.startsWith(prefix) ? id.slice(prefix.length) : null;

export function oppositionSchoolOptions(options, selectedSchool) {
  const school = schoolName(selectedSchool?.id, "wizard-school-");
  if (!school || school === "universalist") return [];
  return options.filter((option) => schoolName(option.id, "wizard-opposition-") !== school);
}
