import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const numericValue = (value) => numberWords[String(value).toLowerCase()] ?? Number(value);
const featureLabel = (feature) => String(feature?.name ?? "Archetype feature").replace(/\s*\((?:Ex|Su|Sp)(?:,\s*(?:Ex|Su|Sp))*\)\s*$/i, "").trim();
const actionIdPart = (value) => String(value ?? "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

function resourceDetails(archetype, feature, summary) {
  const spend = summary.match(/\b(?:spend|expend)\s+(one|two|three|\d+)\s+(points?|rounds?|uses?)\b/i);
  if (spend) {
    const cost = numericValue(spend[1]);
    if (!Number.isFinite(cost) || cost < 1) return undefined;
    const nearby = summary.slice(spend.index, spend.index + 180);
    if (/\bblack blade(?:'s|â€™s) arcane pool\b/i.test(nearby)) return { resourceId: "blackBladeArcanePool", cost };
    if (/\barcane pool\b/i.test(nearby)) return { resourceId: "arcanePool", cost };
    if (/\bbardic performance\b/i.test(nearby)) return { resourceId: "bardicPerformance", cost };
    if (/\bki pool\b/i.test(nearby) && (archetype.classId === "monk" || archetype.id === "warpriest-sacred-fist")) return { resourceId: "kiPool", cost };
    return undefined;
  }
  if (!/\b(?:once|twice|\d+|one|two|three|four|five|six)(?: times?)? per day\b|\bnumber of times per day\b/i.test(String(feature.summary ?? ""))) return undefined;
  const matching = resolvedArchetypeResourceAdjustments(archetype).find((resource) =>
    resource.sourceFeatureId === feature.id || resource.resourceId === `archetype-${feature.id}`,
  );
  if (matching) return { resourceId: matching.resourceId, cost: 1 };
  return undefined;
}

function optionResourceDetails(archetype, feature) {
  const summary = String(feature.summary ?? "");
  const spend = summary.match(/\b(?:spend|expend|spending)\s+(one|two|three|\d+)\s+(?:points?|points? of ki)\b[^.]{0,160}\b(?:following|benefits?)\b/i);
  if (!spend) return undefined;
  const matching = resolvedArchetypeResourceAdjustments(archetype).find((resource) =>
    resource.sourceFeatureId === feature.id || resource.resourceId === `archetype-${feature.id}`,
  );
  return matching ? { resourceId: matching.resourceId, cost: numericValue(spend[1]) } : undefined;
}

function skillOptions(summary) {
  const choices = summary.match(/\bone of (?:the )?following skills:\s*([A-Za-z (),]+?)(?:\.|$)/i)?.[1];
  if (choices) return choices.split(/\s*,\s*|\s+and\s+/i).map((skill) => skill.replace(/^and\s+/i, "").trim()).filter(Boolean);
  const fixed = summary.match(/\bbonus (?:on|to)\s+([A-Z][A-Za-z ]+?) checks\b/)?.[1]?.trim();
  return fixed ? [fixed] : [];
}

function effectTargets(summary) {
  if (/\bbonus on all saving throws\b/i.test(summary)) return ["fortitude", "reflex", "will"];
  if (/\bbonus on attack and damage rolls\b/i.test(summary)) return ["attackRolls", "damageRolls"];
  if (/\bbonus on damage rolls\b/i.test(summary)) return ["damageRolls"];
  if (skillOptions(summary).length) return ["skillChecks"];
  if (/\bbonus to Strength, Dexterity, or Constitution\b/i.test(summary)) return ["strength", "dexterity", "constitution"];
  if (/\bgrant armor (?:he|she|they|it) (?:is|are) wearing a \+\d+ enhancement bonus\b/i.test(summary)) return ["armorClass"];
  if (/\bbonus (?:to (?:his|her|their) )?(?:AC|Armor Class)\b/i.test(summary) && !/\bAC against attacks of opportunity\b/i.test(summary)) return ["armorClass"];
  return [];
}

function fixedDurationRounds(summary) {
  if (/\buntil the (?:end|start) of (?:his|her|their|the) next turn\b/i.test(summary)) return 1;
  const duration = summary.match(/\bfor\s+(one|two|three|\d+)\s+(rounds?|minutes?)\b/i);
  if (!duration) return undefined;
  const amount = numericValue(duration[1]);
  return amount * (/minute/i.test(duration[2]) ? 10 : 1);
}

function scalingRule(summary) {
  const intervalMatch = summary.match(/(?:increas(?:es|ing) by \+?1 (?:for every|per)|gains another \+1 [^.]{0,20}every)\s+(one|two|three|four|five|six|\d+)\s+(?:(?:\w+) )?levels?\s+(?:above|beyond|after)\s+(\d+)(?:st|nd|rd|th)?/i)
    ?? summary.match(/for every\s+(one|two|three|four|five|six|\d+)\s+(?:(?:\w+) )?levels?\s+(?:above|beyond|after)\s+(\d+)(?:st|nd|rd|th)?[^.]{0,80}\bgains another \+1\b/i);
  if (!intervalMatch) return undefined;
  const interval = numericValue(intervalMatch[1]);
  const startingLevel = Number(intervalMatch[2]);
  return Number.isFinite(interval) && interval >= 1 && Number.isFinite(startingLevel) ? { interval, startingLevel } : undefined;
}

function scalingBonuses(summary, minimumLevel, baseBonus, scaling) {
  if (!scaling) return undefined;
  const { interval, startingLevel } = scaling;
  const maximum = Number(summary.match(/(?:maximum (?:bonus )?of|maximum of) \+?(\d+)/i)?.[1] ?? Number.MAX_SAFE_INTEGER);
  const steps = [];
  for (let level = minimumLevel; level <= 20; level += 1) {
    const bonus = Math.min(maximum, baseBonus + Math.max(0, Math.floor((level - startingLevel) / interval)));
    if (!steps.length || steps.at(-1).bonus !== bonus) steps.push({ level, bonus });
  }
  return steps;
}

export function inferredArchetypeTimedEffectActionDetails(archetype) {
  const actions = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (feature.resourceActions?.length || /\b(?:ability descriptions|bardic performance|mortifications|revelations|special)\b/i.test(feature.name ?? "")) continue;
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ");
    const actionSentence = summary.split(/(?<=[.!?])\s+/).find((sentence) =>
      /\b(?:spend|expend|gain|grant)\b/i.test(sentence) && /\+\d+\s+(?:\w+\s+){0,2}bonus\b/i.test(sentence) && fixedDurationRounds(sentence),
    );
    if (!actionSentence || /\b(?:allies?|another creature|against|on their turn)\b/i.test(actionSentence)) continue;
    const resource = resourceDetails(archetype, feature, actionSentence) ?? optionResourceDetails(archetype, feature);
    const targets = effectTargets(actionSentence);
    const rounds = fixedDurationRounds(actionSentence);
    const bonusMatch = actionSentence.match(/\+(\d+)\s+(?:\w+\s+){0,2}bonus\b/i);
    if (!resource || !targets.length || !rounds || !bonusMatch) continue;
    const baseBonus = Number(bonusMatch[1]);
    const scaling = scalingRule(summary);
    const minimumLevel = Math.max(1, Math.min(Number(feature.level ?? 1), scaling?.startingLevel ?? Number(feature.level ?? 1)));
    const bonusByLevel = scalingBonuses(summary, minimumLevel, baseBonus, scaling);
    const label = featureLabel(feature);
    const skills = skillOptions(actionSentence);
    const additionalEffectsByLevel = feature.id === "bard-sorrowsoul-spurn-harm-su-5" ? [
      {
        minimumLevel: 11,
        name: `${label} spell resistance`,
        target: "spellResistance",
        bonus: 22,
        bonusByLevel: Array.from({ length: 10 }, (_, index) => ({ level: 11 + index, bonus: 22 + index })),
        description: "Spell resistance equal to 11 + bard level.",
      },
      {
        minimumLevel: 17,
        name: `${label} damage reduction`,
        target: "damageReduction",
        bonus: 10,
        description: "DR 10/—.",
      },
    ] : undefined;
    actions.push({
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-timed-effect-${actionIdPart(resource.resourceId)}`,
        label: `Activate ${label}`,
        classId: archetype.classId,
        minimumLevel,
        ...resource,
        activeEffect: {
          name: label,
          targets,
          bonus: baseBonus,
          ...(bonusByLevel ? { bonusByLevel } : {}),
          description: summary,
          defaultRounds: rounds,
          fixedRounds: true,
          ...(targets.length > 1 ? { applyToAllTargets: true } : {}),
          replaceExisting: true,
          ...(skills.length ? { skillOptions: skills } : {}),
          ...(feature.id === "monk-sohei-ki-weapon-su-4" ? { selectEquippedWeapon: true, includeUnarmedStrike: true, usesWeaponEnhancementRules: true } : {}),
          ...(additionalEffectsByLevel ? { additionalEffectsByLevel } : {}),
        },
        summary,
      },
    });
    if (["bard-sorrowsoul-spurn-harm-su-5", "magus-spire-defender-arcane-augmentation-su-4", "monk-sohei-ki-weapon-su-4", "occultist-battle-host-heroic-splendor-su-6"].includes(feature.id)) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { actions, fullyAutomatedFeatureIds };
}

export const inferArchetypeTimedEffectActions = (archetype) => inferredArchetypeTimedEffectActionDetails(archetype).actions;
