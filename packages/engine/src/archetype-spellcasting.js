const abilityPattern = "(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)";

const spellcastingRule = new RegExp(
  `\\buses?\\s+(?:(?:his|her|their|its)\\s+)?${abilityPattern}(?:\\s+(?:score|modifier))?\\s+instead of\\s+(?:(?:his|her|their|its)\\s+)?${abilityPattern}(?:\\s+(?:score|modifier))?([^.]*)`,
  "i",
);

const normalizedAbility = (value) => String(value ?? "").toLowerCase();

function explicitlyChangesSpellcasting(trailingText) {
  return /\bkey spellcasting ability(?: score)?\b/i.test(trailingText)
    || /\bincluding (?:her |his |their )?spellcasting\b/i.test(trailingText)
    || (/\bbonus spells per day\b/i.test(trailingText) && /\bsave DCs? (?:of|for) (?:her |his |their )?spells\b/i.test(trailingText))
    || /\bspells per day, DCs, and other factors related to spellcasting\b/i.test(trailingText);
}

export function inferredArchetypeSpellcastingAbilityDetails(archetype) {
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const match = String(feature.summary ?? "").replace(/\s+/g, " ").match(spellcastingRule);
    if (!match || !explicitlyChangesSpellcasting(match[3])) continue;
    return {
      ability: normalizedAbility(match[1]),
      replacesAbility: normalizedAbility(match[2]),
      sourceFeatureId: feature.id,
    };
  }
  return undefined;
}

export function inferArchetypeSpellcastingAbility(archetype) {
  return inferredArchetypeSpellcastingAbilityDetails(archetype)?.ability;
}
