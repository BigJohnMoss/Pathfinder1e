const cureInflictChoices = new Map([
  ["oracle-cure-spells", { name: /\bcure\b/i, label: "Cure Spells" }],
  ["oracle-inflict-spells", { name: /\binflict\b/i, label: "Inflict Spells" }],
]);

export function oracleCureInflictSpells(eligibleSpells, characterClass, selectedOptions) {
  if (characterClass?.id !== "oracle") return [];
  const feature = characterClass.features.find(({ optionGroupId }) => optionGroupId === "oracle-cure-inflict");
  const choice = feature && cureInflictChoices.get(selectedOptions[feature.id]);
  if (!choice) return [];
  return eligibleSpells.filter(({ name }) => choice.name.test(name))
    .map((spell) => ({ ...spell, bonusSpellSource: choice.label }));
}
