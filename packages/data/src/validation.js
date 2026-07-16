const abilityNames = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const prerequisiteTypes = ["level", "ability", "bab", "feat", "feature"];
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validatePrerequisites(prerequisites) {
  if (!Array.isArray(prerequisites)) return ["prerequisites must be an array"];
  const errors = [];
  for (const prerequisite of prerequisites) {
    if (!prerequisite || typeof prerequisite !== "object" || Array.isArray(prerequisite)) { errors.push("prerequisite must be an object"); continue; }
    if (!prerequisiteTypes.includes(prerequisite.type)) { errors.push("prerequisite has an unknown type"); continue; }
    if (["level", "bab", "ability"].includes(prerequisite.type) && (!Number.isInteger(prerequisite.minimum) || prerequisite.minimum < 1)) errors.push(`${prerequisite.type} prerequisite needs a positive integer minimum`);
    if (prerequisite.type === "ability" && !abilityNames.includes(prerequisite.key)) errors.push("ability prerequisite has an invalid ability key");
    if (["feat", "feature"].includes(prerequisite.type) && (!prerequisite.id || !idPattern.test(prerequisite.id))) errors.push(`${prerequisite.type} prerequisite needs a valid id`);
  }
  return errors;
}
