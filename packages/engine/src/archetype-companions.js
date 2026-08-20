import { archetypeReplacementBoilerplate, archetypeRuleSentences } from "./archetype-initiative.js";

const directGrantRule = /\bgains? (?:an?|the) (familiar|drake companion)\b/i;

const slug = (value) => String(value ?? "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

function grantFromFeature(archetype, feature) {
  const summary = String(feature.summary ?? "").replace(/\s+/g, " ");
  const match = summary.match(directGrantRule);
  if (!match) return undefined;
  const prefix = summary.slice(Math.max(0, match.index - 35), match.index);
  if (/\b(?:cannot|can(?:'|\u2019)t|does not|doesn(?:'|\u2019)t|would)\s*$/i.test(prefix)) return undefined;
  const kind = /drake/i.test(match[1]) ? "drake" : "familiar";
  const halfLevel = kind === "familiar" && /\bas a wizard of half (?:the )?[^.]*class level\b/i.test(summary);
  const raven = kind === "familiar" && /\b(?:raven familiar|stats for a raven)\b/i.test(summary);
  return {
    id: `${slug(feature.id || archetype.id)}-${kind}`,
    kind,
    label: String(feature.name ?? (kind === "drake" ? "Drake companion" : "Familiar")),
    optionId: raven ? "wizard-familiar-raven" : `${archetype.id}-${kind}`,
    minimumLevel: feature.level,
    ...(halfLevel ? { effectiveLevelMultiplier: 0.5 } : {}),
    ...(kind === "familiar" && /\b(?:levels?|class levels?) stack\b/i.test(summary) ? { stacksWithExisting: true } : {}),
  };
}

export function inferredArchetypeCompanionGrantDetails(archetype) {
  const inferredGrants = archetype?.companionGrants?.length ? [] : (archetype?.replacements ?? [])
    .flatMap((replacement) => replacement.features ?? [])
    .flatMap((feature) => grantFromFeature(archetype, feature) ?? []);
  const grants = archetype?.companionGrants?.length ? archetype.companionGrants : inferredGrants;
  const sentenceCoverage = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    const sentences = archetypeRuleSentences(feature.summary);
    const covered = new Set();
    for (const [sentenceIndex, sentence] of sentences.entries()) {
      const match = sentence.match(directGrantRule);
      if (!match) continue;
      const kind = /drake/i.test(match[1]) ? "drake" : "familiar";
      if (!grants.some((grant) => grant.kind === kind && grant.minimumLevel === feature.level)) continue;
      covered.add(sentenceIndex);
      sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
    }
    if (covered.size && sentences.every((sentence, sentenceIndex) => covered.has(sentenceIndex) || archetypeReplacementBoilerplate(sentence)))
      fullyAutomatedFeatureIds.add(feature.id);
  }
  return { grants: inferredGrants, fullyAutomatedFeatureIds, sentenceCoverage };
}

export function inferArchetypeCompanionGrants(archetype) {
  return inferredArchetypeCompanionGrantDetails(archetype).grants;
}

export function resolvedArchetypeCompanionGrants(archetype) {
  return archetype?.companionGrants?.length
    ? archetype.companionGrants
    : inferArchetypeCompanionGrants(archetype);
}

export function archetypeCompanionEffectiveLevel(grant, classLevel, characterLevel = classLevel) {
  const sourceLevel = grant?.usesCharacterLevel ? characterLevel : classLevel;
  return Math.max(1, Math.floor(sourceLevel * (grant?.effectiveLevelMultiplier ?? 1)) + (grant?.effectiveLevelAdjustment ?? 0));
}
