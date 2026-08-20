import { archetypeReplacementBoilerplate, archetypeRuleSentences } from "./archetype-initiative.js";

const enemyIds = {
  aberration: "ranger-enemy-aberration",
  construct: "ranger-enemy-construct",
  dragon: "ranger-enemy-dragon",
  fey: "ranger-enemy-fey",
  "humanoid orc": "ranger-enemy-humanoid-orc",
  "humanoid shapechanger": "ranger-enemy-humanoid-other",
  "magical beast": "ranger-enemy-magical-beast",
  "outsider evil": "ranger-enemy-outsider-evil",
  "evil outsider": "ranger-enemy-outsider-evil",
  "outsider native": "ranger-enemy-outsider-native",
  undead: "ranger-enemy-undead",
};
const allEnemyIds = [
  "ranger-enemy-aberration", "ranger-enemy-animal", "ranger-enemy-construct", "ranger-enemy-dragon", "ranger-enemy-fey",
  "ranger-enemy-humanoid-aquatic", "ranger-enemy-humanoid-dwarf", "ranger-enemy-humanoid-elf", "ranger-enemy-humanoid-giant",
  "ranger-enemy-humanoid-goblinoid", "ranger-enemy-humanoid-gnoll", "ranger-enemy-humanoid-gnome", "ranger-enemy-humanoid-halfling",
  "ranger-enemy-humanoid-human", "ranger-enemy-humanoid-orc", "ranger-enemy-humanoid-reptilian", "ranger-enemy-humanoid-other",
  "ranger-enemy-magical-beast", "ranger-enemy-monstrous-humanoid", "ranger-enemy-ooze", "ranger-enemy-outsider-air",
  "ranger-enemy-outsider-chaotic", "ranger-enemy-outsider-earth", "ranger-enemy-outsider-evil", "ranger-enemy-outsider-fire",
  "ranger-enemy-outsider-good", "ranger-enemy-outsider-lawful", "ranger-enemy-outsider-native", "ranger-enemy-outsider-water",
  "ranger-enemy-plant", "ranger-enemy-undead", "ranger-enemy-vermin",
];

const normalized = (value) => String(value ?? "").toLowerCase().replace(/[()[\],]/g, " ").replace(/\s+/g, " ").trim();

function favoredEnemyFeature(feature) {
  const name = String(feature?.name ?? "").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "").trim();
  return /^(?:Favored Enemy|Focused Enemy)$/i.test(name) && /\bfavored enem(?:y|ies)\b/i.test(String(feature?.summary ?? ""));
}

function choiceLevels(feature) {
  const text = String(feature.summary ?? "").replace(/\s+/g, " ");
  const first = Number(text.match(/\bAt (\d+)(?:st|nd|rd|th) level\b/i)?.[1] ?? feature.level ?? 1);
  if (/\bdoes not gain additional favored enemies\b/i.test(text) || /\bmust advance (?:his|her|their) bonus against\b/i.test(text)) return [first];
  const explicitClause = text.match(/\bAt ([\d\sa-z,]+?) levels?,[^.]{0,160}\b(?:selects?|gains?) another favored enemy\b/i)
    ?? text.match(/\banother favored enemy at ([\d\sa-z,]+?) levels?\b/i);
  if (explicitClause) {
    const later = [...explicitClause[1].matchAll(/\d+/g)].map((match) => Number(match[0]));
    return [first, ...later].filter((level, index, values) => level <= 20 && values.indexOf(level) === index);
  }
  return [first];
}

function idsMentioned(fragment) {
  const text = normalized(fragment);
  return Object.entries(enemyIds).flatMap(([label, id]) => text.includes(label) ? [id] : []);
}

function allowedEnemyIds(feature) {
  const text = String(feature.summary ?? "").replace(/\s+/g, " ");
  const list = text.match(/\bfrom the following list:\s*([^.]+)/i);
  if (list) {
    const ids = idsMentioned(list[1]);
    if (ids.length) return ids;
  }
  const fixed = text.match(/\bmust (?:select|choose)\s+(?:favored enemy\s*)?\(([^)]+)\)|\bmust select\s+([a-z -]+?) creatures? as (?:his|her|their) first favored enemy/i);
  if (fixed) {
    const ids = idsMentioned(fixed[1] ?? fixed[2]);
    if (ids.length) return ids;
  }
  return allEnemyIds;
}

function fullyRepresented(feature, levels, optionChoiceIds) {
  if (!levels.length || !optionChoiceIds.length) return false;
  const text = String(feature.summary ?? "");
  if (/\b(?:attack another creature|damage rolls?|must make a DC|saving throws?|spells?|while raging)\b/i.test(text)) return false;
  return archetypeRuleSentences(text).every((sentence) =>
    archetypeReplacementBoilerplate(sentence) || /\bfavored enem(?:y|ies)\b/i.test(sentence),
  );
}

export function inferredArchetypeFavoredEnemyChoiceDetails(archetype) {
  const choices = [];
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (!favoredEnemyFeature(feature)) continue;
    const levels = choiceLevels(feature).filter((level) => Number.isInteger(level) && level >= 1 && level <= 20);
    const optionChoiceIds = allowedEnemyIds(feature);
    if (!levels.length || !optionChoiceIds.length) continue;
    levels.forEach((level, index) => choices.push({
      sourceFeatureId: feature.id,
      feature: index === 0
        ? { ...feature, level, type: "selectable", choiceRequired: true, optionGroupId: "ranger-favored-enemies", optionChoiceIds }
        : {
            id: `${feature.id}-choice-${level}`,
            name: `Favored Enemy ${index + 1}`,
            level,
            type: "selectable",
            summary: "Choose another favored enemy and increase one existing favored-enemy bonus according to this archetype's progression.",
            choiceRequired: true,
            optionGroupId: "ranger-favored-enemies",
            optionChoiceIds,
            source: feature.source,
          },
    }));
    archetypeRuleSentences(feature.summary).forEach((sentence, sentenceIndex) => {
      if (/\bfavored enem(?:y|ies)\b/i.test(sentence)) sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
    });
    if (fullyRepresented(feature, levels, optionChoiceIds)) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { choices, fullyAutomatedFeatureIds, sentenceCoverage };
}

export function inferArchetypeFavoredEnemyChoices(archetype) {
  return inferredArchetypeFavoredEnemyChoiceDetails(archetype).choices;
}
