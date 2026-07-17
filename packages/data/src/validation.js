const abilityNames = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const prerequisiteTypes = ["level", "class-level", "caster-level", "ability", "bab", "skill", "feat", "feature", "matching-choice", "choice-value", "any"];
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validatePrerequisites(prerequisites, { nested = false } = {}) {
  if (!Array.isArray(prerequisites)) return ["prerequisites must be an array"];
  const errors = [];
  for (const prerequisite of prerequisites) {
    if (!prerequisite || typeof prerequisite !== "object" || Array.isArray(prerequisite)) { errors.push("prerequisite must be an object"); continue; }
    if (!prerequisiteTypes.includes(prerequisite.type)) { errors.push("prerequisite has an unknown type"); continue; }
    if (["level", "class-level", "caster-level", "bab", "ability", "skill"].includes(prerequisite.type) && (!Number.isInteger(prerequisite.minimum) || prerequisite.minimum < 1)) errors.push(`${prerequisite.type} prerequisite needs a positive integer minimum`);
    if (prerequisite.type === "ability" && !abilityNames.includes(prerequisite.key)) errors.push("ability prerequisite has an invalid ability key");
    if (prerequisite.type === "class-level" && (!prerequisite.classId || !idPattern.test(prerequisite.classId))) errors.push("class-level prerequisite needs a valid class id");
    if (prerequisite.type === "skill" && (typeof prerequisite.key !== "string" || !prerequisite.key.trim())) errors.push("skill prerequisite needs a skill name");
    if (["feat", "feature"].includes(prerequisite.type) && (!prerequisite.id || !idPattern.test(prerequisite.id))) errors.push(`${prerequisite.type} prerequisite needs a valid id`);
    if (prerequisite.type === "matching-choice" && (!prerequisite.featId || !idPattern.test(prerequisite.featId) || typeof prerequisite.key !== "string" || !prerequisite.key.trim())) errors.push("matching-choice prerequisite needs a feat id and choice key");
    if (prerequisite.type === "choice-value" && (!prerequisite.featId || !idPattern.test(prerequisite.featId) || typeof prerequisite.key !== "string" || !prerequisite.key.trim() || typeof prerequisite.value !== "string" || !prerequisite.value.trim())) errors.push("choice-value prerequisite needs a feat id, choice key, and value");
    if (prerequisite.type === "any") {
      if (!Array.isArray(prerequisite.prerequisites) || prerequisite.prerequisites.length === 0) errors.push("any prerequisite needs at least one alternative");
      else errors.push(...validatePrerequisites(prerequisite.prerequisites, { nested: true }).map(error => `any prerequisite: ${error}`));
    }
  }
  if (nested && prerequisites.some(prerequisite => prerequisite?.type === "any")) errors.push("any prerequisites cannot be nested");
  return errors;
}
