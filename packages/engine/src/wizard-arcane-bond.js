export function arcaneBondDetailOptions(options, selectedBond, requiredBondId) {
  return selectedBond?.id === requiredBondId ? options : [];
}
