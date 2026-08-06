import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const sentences = (text) => String(text ?? "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
const featureLabel = (feature) => String(feature?.name ?? "Archetype feature").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "").trim();

function playerOwnedTemporaryHitPoints(sentence) {
  const pointIndex = sentence.search(/temporary hit points?/i);
  if (pointIndex < 0) return false;
  const prefix = sentence.slice(0, pointIndex);
  const subjects = [...prefix.matchAll(/\b((?:he|she|they)|(?:(?:an?|the)\s+[a-z][a-z'\u2019 -]{0,55}))\s+(?:can\s+)?(?:also\s+)?gains?\b/gi)];
  const subject = subjects.at(-1)?.[1]?.toLowerCase();
  if (subject) return !/\b(?:allies?|companions?|creatures?|eidolons?|familiars?|mounts?|phantoms?|servants?|targets?)\b/i.test(subject);
  return /\b(?:grants?|gives?)\s+(?:him|her|them)\b/i.test(prefix) || /\brasugen grants\b/i.test(prefix);
}

function amountByLevel(feature, sentence, summary) {
  const minimumLevel = Number(sentence.match(/\bAt (\d+)(?:st|nd|rd|th) level\b/i)?.[1] ?? feature.level ?? 1);
  const perLevel = sentence.match(/\b(\d+) temporary hit points? per (?:[a-z]+ )?level\b/i);
  if (perLevel) return Array.from({ length: 21 - minimumLevel }, (_, index) => {
    const level = minimumLevel + index;
    return { level, amount: Number(perLevel[1]) * level };
  });
  const formula = sentence.match(/temporary hit points? equal to (?:(twice|2\s*[xÃ—])\s+|(?:(?:one-)?half|1\/2)\s+)?(?:his|her|their|the)\s+(?:(?:[a-z]+ )?class |(?:[a-z]+) )?level\b/i);
  if (formula) {
    const multiplier = formula[1] ? 2 : /(?:one-)?half|1\/2/i.test(formula[0]) ? 0.5 : 1;
    return Array.from({ length: 21 - minimumLevel }, (_, index) => {
      const level = minimumLevel + index;
      return { level, amount: Math.max(1, Math.floor(level * multiplier)) };
    });
  }
  const fixed = sentence.match(/\b(?:gain(?:s)?|grants?)\s+(\d+) temporary hit points?\b/i);
  if (!fixed) return [];
  const base = Number(fixed[1]);
  const progression = String(summary).match(/\bAt (\d+)(?:st|nd|rd|th) level and every (\d+) levels? thereafter,?[^.]{0,100}?temporary hit points?[^.]{0,80}?increases? by (\d+)[^.]{0,80}?maximum of (\d+)/i);
  if (!progression) return [{ level: minimumLevel, amount: base }];
  const first = Number(progression[1]);
  const interval = Number(progression[2]);
  const increase = Number(progression[3]);
  const maximum = Number(progression[4]);
  const rows = [{ level: minimumLevel, amount: base }];
  let amount = base;
  for (let level = first; level <= 20 && amount < maximum; level += interval) {
    amount = Math.min(maximum, amount + increase);
    rows.push({ level, amount });
  }
  return rows;
}

function durationByLevel(minimumLevel, summary) {
  if (/10 minutes? per (?:[a-z]+ )?level/i.test(summary))
    return Array.from({ length: 21 - minimumLevel }, (_, index) => ({ level: minimumLevel + index, rounds: Math.min(999, (minimumLevel + index) * 100) }));
  if (/number of rounds equal to (?:(?:his|her|their) |the [a-z'\u2019 -]+(?:'|\u2019)s )?(?:[a-z]+ )?(?:class )?level/i.test(summary)) {
    const changesToMinutes = Number(summary.match(/\bAt (\d+)(?:st|nd|rd|th) level[^.]{0,180}?minutes? equal to/i)?.[1] ?? 0);
    return Array.from({ length: 21 - minimumLevel }, (_, index) => {
      const level = minimumLevel + index;
      return { level, rounds: Math.min(999, level * (changesToMinutes && level >= changesToMinutes ? 10 : 1)) };
    });
  }
  const fixed = summary.match(/temporary hit points?[^.]{0,100}?(?:last|fade|disappear)[^.]{0,40}?for (\d+) (round|minute|hour)s?/i)
    ?? summary.match(/(?:gain(?:s)?|grants?)[^.]{0,100}?temporary hit points?[^.]{0,50}?for (\d+) (round|minute|hour)s?/i);
  if (!fixed) return [];
  const multiplier = fixed[2].toLowerCase() === "hour" ? 600 : fixed[2].toLowerCase() === "minute" ? 10 : 1;
  return [{ level: minimumLevel, rounds: Math.min(999, Number(fixed[1]) * multiplier) }];
}

export function inferredArchetypeTemporaryHitPointActionDetails(archetype) {
  const actions = [];
  const resources = new Map(resolvedArchetypeResourceAdjustments(archetype).map((resource) => [resource.resourceId.replace(/^archetype-/, ""), resource]));
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (feature.resourceActions?.length) continue;
    const summary = String(feature.summary ?? "");
    if (/temporary hit points? stack/i.test(summary)) continue;
    const amountSentence = sentences(summary).find((sentence) => playerOwnedTemporaryHitPoints(sentence));
    if (!amountSentence) continue;
    const temporaryHitPointsByLevel = amountByLevel(feature, amountSentence, summary);
    if (!temporaryHitPointsByLevel.length) continue;
    const temporaryHitPointsDurationRoundsByLevel = durationByLevel(temporaryHitPointsByLevel[0].level, summary);
    const resource = resources.get(feature.id);
    actions.push({
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-temporary-hit-points`,
        label: `Gain ${featureLabel(feature)} temporary HP`,
        classId: archetype.classId,
        minimumLevel: temporaryHitPointsByLevel[0].level,
        ...(resource ? { resourceId: resource.resourceId, cost: 1 } : {}),
        temporaryHitPointsByLevel,
        ...(temporaryHitPointsDurationRoundsByLevel.length ? { temporaryHitPointsDurationRoundsByLevel } : {}),
        summary: amountSentence,
      },
    });
  }
  return { actions, fullyAutomatedFeatureIds: new Set() };
}

export function inferArchetypeTemporaryHitPointActions(archetype) {
  return inferredArchetypeTemporaryHitPointActionDetails(archetype).actions;
}
