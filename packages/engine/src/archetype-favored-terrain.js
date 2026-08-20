import { archetypeReplacementBoilerplate, archetypeRuleSentences } from "./archetype-initiative.js";

const terrainIds = {
  cold: "ranger-terrain-cold",
  desert: "ranger-terrain-desert",
  forest: "ranger-terrain-forest",
  jungle: "ranger-terrain-jungle",
  mountain: "ranger-terrain-mountain",
  mountains: "ranger-terrain-mountain",
  plains: "ranger-terrain-plains",
  planes: "ranger-terrain-planes",
  swamp: "ranger-terrain-swamp",
  underground: "ranger-terrain-underground",
  urban: "ranger-terrain-urban",
  water: "ranger-terrain-water",
};
const allTerrainIds = [...new Set(Object.values(terrainIds))];
const numberWords = { three: 3, four: 4, five: 5 };
const numericValue = (value) => numberWords[String(value).toLowerCase()] ?? Number(value);

const levelsFrom = (first, interval) => Array.from(
  { length: Math.floor((20 - first) / interval) + 1 },
  (_, index) => first + index * interval,
);

function favoredTerrainFeature(feature) {
  const name = String(feature?.name ?? "").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "").trim();
  const text = String(feature?.summary ?? "").replace(/\s+/g, " ").trim();
  return /favored-terrain/i.test(String(feature?.id ?? "")) || (/^(?:Favored Terrains?|Planar Terrains|Effortless Sneak|Wasteland Specialist|Desert Mastery|Shadow Guide)$/i.test(name) && /\bfavored terrain\b/i.test(text));
}

function choiceLevels(feature) {
  const text = String(feature.summary ?? "").replace(/\s+/g, " ");
  const grantLevel = text.match(/\bAt (\d+)(?:st|nd|rd|th) level\b[^.]{0,160}\b(?:gains?|chooses?|selects?|picks?)\b[^.]{0,100}\bfavored terrain\b/i)?.[1];
  const implicitFirstLevel = /\breplaces fast movement\b/i.test(text) && !grantLevel ? 1 : feature.level ?? 1;
  const first = Number(
    text.match(/\bfirst favored terrain at (\d+)(?:st|nd|rd|th) level/i)?.[1] ??
    grantLevel ??
    implicitFirstLevel,
  );
  if (/\b(?:does not|doesn['’]t|never) (?:gain|add|select)[^.]{0,50}\badditional favored terrains?\b/i.test(text)) return [first];
  const everyAfterLevel = text.match(/\bEvery (\d+) levels? after (\d+)(?:st|nd|rd|th)\b[^.]{0,100}\b(?:additional|another) favored terrain\b/i);
  if (everyAfterLevel) return levelsFrom(Number(everyAfterLevel[2]), Number(everyAfterLevel[1]));
  if (/\bEvery time [^.]{0,100}\bselect another mercy\b[^.]{0,100}\bselect another favored terrain\b/i.test(text)) return levelsFrom(first, 3);
  const subsequent = text.match(/\bAt (\d+)(?:st|nd|rd|th) level and every (\d+) (?:class )?levels? thereafter\b[^.]{0,180}\b(?:additional|new) favored terrain\b/i)
    ?? text.match(/\bAt (\d+)(?:st|nd|rd|th) level and every (\d+) levels? thereafter\b[^.]{0,180}\bchooses? a new (?:favorite|favored )?terrain/i);
  if (subsequent) return [first, ...levelsFrom(Number(subsequent[1]), Number(subsequent[2]))].filter((level, index, values) => values.indexOf(level) === index);
  const everyAfterFirst = text.match(/\b(?:new|additional) favored terrain every (three|four|five|\d+) levels? thereafter\b/i)
    ?? text.match(/\bevery (three|four|five|\d+) levels? thereafter[^.]{0,100}\b(?:new|additional) (?:type of )?terrain\b/i);
  if (everyAfterFirst) return levelsFrom(first, numericValue(everyAfterFirst[1]));
  const reaches = text.match(/\b(?:reaches|at) (\d+)(?:st|nd|rd|th) level,? and every (three|four|five|\d+) levels? thereafter,?[^.]{0,120}\b(?:chooses?|picks?|gains?) (?:a )?new (?:type of )?terrain\b/i);
  if (reaches) return [first, ...levelsFrom(Number(reaches[1]), numericValue(reaches[2]))].filter((level, index, values) => values.indexOf(level) === index);
  const firstAndEvery = text.match(/\bAt (\d+)(?:st|nd|rd|th) level and every (\d+) levels? thereafter,?[^.]{0,160}\bgains? the benefits of the favored terrain/i);
  if (firstAndEvery) return levelsFrom(Number(firstAndEvery[1]), Number(firstAndEvery[2]));
  if (/\bas a ranger of (?:his|her|their) class level\b|\bgains? the ranger['’]s favored terrain ability\b/i.test(text)) return [3, 8, 13, 18].filter((level) => level >= first);
  if (/\beach time (?:he|she|they) gains? a favored terrain\b|\beach time[^.]{0,100}\bfavored terrain\b/i.test(text)) return [3, 8, 13, 18].filter((level) => level >= first);
  return /\b(?:new|additional|each time)\b[^.]{0,120}\b(?:favorite|favored) terrain\b/i.test(text)
    ? [first, ...[8, 13, 18].filter((level) => level > first)]
    : [first];
}

function namedTerrainIds(fragment) {
  const normalized = String(fragment ?? "").toLowerCase();
  return Object.entries(terrainIds).flatMap(([name, id]) => new RegExp(`\\b${name}\\b`, "i").test(normalized) ? [id] : []);
}

function allowedTerrainIds(feature) {
  const text = String(feature.summary ?? "").replace(/\s+/g, " ");
  if (/\bplanar terrains? function\b/i.test(text)) return [terrainIds.planes];
  const parenthetical = text.match(/\bfavored terrain\s*\(([^)]+)\)/i);
  if (parenthetical) {
    const ids = namedTerrainIds(parenthetical[1]);
    if (ids.length) return ids;
  }
  const fixed = text.match(/\b(?:gains?\s+|must select\s+)(water|urban|desert|forest|jungle|mountains?|plains|swamp|underground)\s+as [^.]{0,24}?favored terrain/i);
  if (fixed) return namedTerrainIds(fixed[1]);
  const either = text.match(/\bmust select either ([^.]+?) as (?:his|her|their) favored terrain/i);
  if (either) return namedTerrainIds(either[1]);
  const only = text.match(/\bcan choose only ([^.]+?) from the ranger['’]s favored terrain list/i);
  if (only) return namedTerrainIds(only[1]);
  const restricted = text.match(/\brestricted to ([^.]+?)(?:[.;]|$)/i);
  if (restricted) {
    const ids = namedTerrainIds(restricted[1]);
    if (ids.length) return ids;
  }
  if (/\b(?:cannot|can['’]?t|may not) choose urban\b/i.test(text)) return allTerrainIds.filter((id) => id !== terrainIds.urban);
  return allTerrainIds;
}

function fullyRepresented(feature, levels, allowedIds) {
  const text = String(feature.summary ?? "");
  if (!levels.length || !allowedIds.length) return false;
  if (/\b(?:damage rolls?|mount gains|levels? (?:from|in) both classes|stack for|courtly function|party|Shadow Plane)\b/i.test(text)) return false;
  const sentences = archetypeRuleSentences(text);
  return sentences.every((sentence) =>
    archetypeReplacementBoilerplate(sentence) ||
    /\bfavored terrains?\b|\bfavorite terrain\b|\bplanar terrain\b/i.test(sentence) ||
    /\bbonus(?:es)?\b[^.]{0,100}\b(?:this ability|aquatic terrain)\b[^.]{0,100}\bincreases? by\b/i.test(sentence),
  );
}

export function inferredArchetypeFavoredTerrainChoiceDetails(archetype) {
  const choices = [];
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (!favoredTerrainFeature(feature)) continue;
    const levels = choiceLevels(feature).filter((level) => Number.isInteger(level) && level >= 1 && level <= 20);
    const optionChoiceIds = allowedTerrainIds(feature);
    if (!levels.length || !optionChoiceIds.length) continue;
    levels.forEach((level, index) => choices.push({
      sourceFeatureId: feature.id,
      feature: index === 0
        ? { ...feature, level, type: "selectable", choiceRequired: true, optionGroupId: "ranger-favored-terrains", optionChoiceIds }
        : {
            id: `${feature.id}-choice-${level}`,
            name: `Favored Terrain ${index + 1}`,
            level,
            type: "selectable",
            summary: "Choose another terrain and increase one favored-terrain bonus according to this archetype's progression.",
            choiceRequired: true,
            optionGroupId: "ranger-favored-terrains",
            optionChoiceIds,
            source: feature.source,
          },
    }));
    archetypeRuleSentences(feature.summary).forEach((sentence, sentenceIndex) => {
      if (/\bfavored terrains?\b|\bfavorite terrain\b|\bplanar terrain\b/i.test(sentence) || /\bbonus(?:es)?\b[^.]{0,100}\b(?:this ability|aquatic terrain)\b[^.]{0,100}\bincreases? by\b/i.test(sentence))
        sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
    });
    if (fullyRepresented(feature, levels, optionChoiceIds)) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { choices, fullyAutomatedFeatureIds, sentenceCoverage };
}

export function inferArchetypeFavoredTerrainChoices(archetype) {
  return inferredArchetypeFavoredTerrainChoiceDetails(archetype).choices;
}
