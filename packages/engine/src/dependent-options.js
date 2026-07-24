export function optionsGrantedBySelection(options, selectedGrant, property = "domains") {
  if (!Array.isArray(options)) return [];
  const allowedIds = selectedGrant?.[property];
  if (!Array.isArray(allowedIds)) return [];
  const allowed = new Set(allowedIds.filter((id) => typeof id === "string"));
  return options.filter((option) => allowed.has(option.id));
}
