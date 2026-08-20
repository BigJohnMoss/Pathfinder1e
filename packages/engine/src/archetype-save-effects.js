import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const featureLabel = (feature) => String(feature?.name ?? "Archetype ability").replace(/\s*\((?:Ex|Su|Sp)(?:,\s*(?:Ex|Su|Sp))*\)\s*$/i, "").trim();
const sentences = (text) => String(text ?? "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
const conditionPattern = "blinded|confused|dazed|dazzled|deafened|entangled|exhausted|fascinated|fatigued|frightened|nauseated|panicked|paralyzed|shaken|sickened|staggered|stunned";

function referencedResource(archetype, feature, summary) {
  const explicit = [
    [/\b(?:spend|expend|spending)\s+(?:one|two|three|four|five|six|\d+)\s+(?:points? from (?:his|her|their) |points? of )?arcane pool\b/i, "arcanePool"],
    [/\b(?:spend|expend|spending)\s+(?:one|two|three|four|five|six|\d+)\s+(?:points? from (?:his|her|their) |points? from (?:his|her|their) ki pool|ki points?)\b/i, "kiPool"],
    [/\b(?:spend|expend|spending)\s+(?:one|two|three|four|five|six|\d+)\s+(?:points? from (?:his|her|their) |points? of )?phrenic pool\b/i, "phrenicPool"],
    [/\b(?:spend|expend|spending)\s+(?:one|two|three|four|five|six|\d+)\s+panache points?\b/i, "panache"],
    [/\b(?:spend|expend|spending)\s+(?:one|two|three|four|five|six|\d+)\s+rounds? of raging song\b/i, "ragingSongRounds"],
    [/\b(?:spend|expend|spending)\s+(?:one|two|three|four|five|six|\d+)\s+uses? of fervor\b/i, "fervor"],
  ].find(([pattern]) => pattern.test(summary));
  if (explicit) return { resourceId: explicit[1], cost: Number(summary.match(/\b(?:spend|expend|spending)\s+(\d+)\b/i)?.[1] ?? 1) };
  const own = resolvedArchetypeResourceAdjustments(archetype).find((resource) =>
    resource.sourceFeatureId === feature.id || resource.resourceId === `archetype-${feature.id}`,
  );
  return own ? { resourceId: own.resourceId, cost: 1 } : undefined;
}

function saveProfile(archetype, sentence) {
  const modifier = sentence.match(/\b(Fortitude|Reflex|Will) sav(?:e|ing throw)\b/i)?.[1]?.toLowerCase();
  const formula = sentence.match(/\bDC\s*=?\s*10\s*\+\s*(?:1\s*\/\s*2|half)\s+(?:the\s+)?(?:[a-z'’ -]+?\s+)?level\s*\+\s*(?:the\s+)?(?:[a-z'’ -]+?\s+)?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier/i);
  if (!modifier || !formula) return undefined;
  return {
    modifier,
    savingThrow: { label: `${modifier[0].toUpperCase()}${modifier.slice(1)}`, ability: formula[1].toLowerCase(), base: 10, levelDivisor: 2, classId: archetype.classId },
  };
}

function duration(sentence) {
  const dice = sentence.match(/\bfor\s+(\d+)d(\d+)\s+rounds?\b/i);
  if (dice) return { kind: "dice-rounds", count: Number(dice[1]), sides: Number(dice[2]) };
  if (/\bfor\s+(?:a number of )?rounds? equal to (?:the\s+)?(?:[a-z'’ -]+?\s+)?level\b/i.test(sentence)
    || /\bfor\s+1 round per (?:[a-z'’ -]+?\s+)?level\b/i.test(sentence)) return { kind: "level-rounds" };
  if (/\bfor\s+1 minute per (?:[a-z'’ -]+?\s+)?level\b/i.test(sentence)) return { kind: "level-minutes" };
  const fixed = sentence.match(/\bfor\s+(\d+)\s+(round|minute)s?\b/i);
  if (fixed) return { kind: "fixed-rounds", rounds: Number(fixed[1]) * (/minute/i.test(fixed[2]) ? 10 : 1) };
  return undefined;
}

function effectProfile(sentence) {
  const match = sentence.match(new RegExp(`\\bor\\s+(?:stand\\s+|be(?:come)?\\s+)(${conditionPattern})(?:\\s+in fear)?[^.]*?\\bfor\\s+[^.]+`, "i"))
    ?? sentence.match(new RegExp(`\\b(?:is|becomes?)\\s+(${conditionPattern})(?:\\s+in fear)?\\s+for\\s+[^.]+?\\s+unless\\s+[^.]+\\bsav`, "i"));
  const effectDuration = duration(sentence);
  if (!match || !effectDuration) return undefined;
  const name = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  return { name, description: sentence, duration: effectDuration };
}

function range(summary) {
  const fixed = summary.match(/\bwithin\s+(\d+)\s+feet\b/i);
  return fixed ? `${fixed[1]} feet` : undefined;
}

function actionEconomy(summary) {
  return summary.match(/\bas an?\s+(standard|move|swift|immediate|free|full-round) action\b/i)?.[1]?.toLowerCase();
}

function activationConfirmations(summary) {
  const confirmations = [];
  if (/\bwhen (?:he|she|they) successfully feints? against (?:a|the) foe\b/i.test(summary))
    confirmations.push({ id: "successful-feint", label: "Successfully feinted the target", requiredForActivation: true });
  if (/\bsubject to GM adjudication\b/i.test(summary))
    confirmations.push({ id: "eligible-target", label: "Target is eligible for this effect", requiredForActivation: true });
  return confirmations;
}

function fullyRepresented(feature, featureSentences, effectSentence, hasSuccessImmunity, hasHitDiceUpgrade) {
  const represented = new Set(featureSentences.flatMap((sentence, index) => {
    if (sentence === effectSentence) return [index];
    if (/\bcan use this ability a number of times (?:each|per) day\b/i.test(sentence)) return [index];
    if (hasSuccessImmunity && /\b(?:succeeds? at the saving throw|successfully saves?)[^.]+immune[^.]+24 hours\b/i.test(sentence)) return [index];
    if (hasHitDiceUpgrade && /\bhalf or fewer Hit Dice[^.]+frightened instead\b/i.test(sentence)) return [index];
    if (/\bAt \d+(?:st|nd|rd|th) level[^.]+(?:mindless|immune to mind-affecting)\b/i.test(sentence)) return [index];
    if (/\bAt \d+(?:st|nd|rd|th) level[^.]+(?:standard|move|swift|immediate|free|full-round) action\b/i.test(sentence)) return [index];
    if (/\bmind-affecting fear effect\b/i.test(sentence) || /\bThis ability (?:replaces|alters)\b/i.test(sentence)) return [index];
    return [];
  }));
  return represented.size === featureSentences.length;
}

export function inferredArchetypeSaveEffectActionDetails(archetype) {
  const actions = [];
  const fullyAutomatedFeatureIds = new Set();
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (feature.resourceActions?.length || /^(?:Deeds|Discoveries|Mortifications|Revelations|Special)$/i.test(featureLabel(feature))) continue;
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ").trim();
    if (!actionEconomy(summary) || /\b(?:first creature (?:he|she|they) strikes?|when(?:ever)? [^.]+ hits?)\b/i.test(summary)) continue;
    const featureSentences = sentences(summary);
    const effectSentence = featureSentences.find((sentence) =>
      new RegExp(`\\b(?:Fortitude|Reflex|Will) sav(?:e|ing throw)\\b[^.]+\\bor\\s+(?:stand\\s+|be(?:come)?\\s+)(?:${conditionPattern})\\b`, "i").test(sentence)
      || new RegExp(`\\b(?:is|becomes?)\\s+(?:${conditionPattern})\\b[^.]+\\bunless\\s+[^.]+\\b(?:Fortitude|Reflex|Will) sav`, "i").test(sentence),
    );
    if (effectSentence && /\b(?:harms? (?:him|her|them)|starting its turn|beginning of each (?:of its )?turns?)\b/i.test(effectSentence)) continue;
    if (!effectSentence) continue;
    const save = saveProfile(archetype, effectSentence);
    const effect = effectProfile(effectSentence);
    if (!save || !effect) continue;
    const resource = referencedResource(archetype, feature, summary);
    if (/\b(?:spend|expend)\b|\bnumber of times (?:each|per) day\b/i.test(summary) && !resource) continue;
    const successImmunity = /\b(?:succeeds? at the saving throw|successfully saves?)[^.]+immune[^.]+24 hours\b/i.test(summary)
      ? { name: `${featureLabel(feature)} immunity`, description: `Immune to this character's ${featureLabel(feature)} for 24 hours.`, rounds: 999 }
      : undefined;
    const failureImmunity = new RegExp(`\\b(?:creature|target)\\s+(?:${conditionPattern})\\s+this way\\s+is immune[^.]+24 hours`, "i").test(summary)
      ? { name: `${featureLabel(feature)} immunity`, description: `Immune to this character's ${featureLabel(feature)} for 24 hours.`, rounds: 999 }
      : undefined;
    const hitDiceUpgrade = /\bhalf or fewer Hit Dice[^.]+frightened instead\b/i.test(summary)
      ? { levelDivisor: 2, name: "Frightened", description: "A target with half or fewer Hit Dice than the acting character is frightened instead." }
      : undefined;
    const actionRange = range(summary);
    const minimumLevel = Math.max(1, Number(feature.level ?? 1));
    const actionType = actionEconomy(summary);
    const confirmations = activationConfirmations(summary);
    actions.push({
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-save-effect`,
        label: `Use ${featureLabel(feature)}`,
        classId: archetype.classId,
        minimumLevel,
        ...(resource ?? {}),
        actionTypeByLevel: [{ level: minimumLevel, actionType }],
        ...(confirmations.length ? { confirmations } : {}),
        savingThrow: save.savingThrow,
        targetEffectRoll: {
          modifier: save.modifier,
          ...(actionRange ? { rangeByLevel: [{ level: minimumLevel, range: actionRange }] } : {}),
          effectsByLevel: [{ level: minimumLevel, ...effect }],
          ...(successImmunity ? { successEffect: successImmunity } : {}),
          ...(failureImmunity ? { failureEffect: failureImmunity } : {}),
          ...(hitDiceUpgrade ? { targetHitDiceUpgrade: hitDiceUpgrade } : {}),
          ...(/\bAt (\d+)(?:st|nd|rd|th) level[^.]+(?:mindless|immune to mind-affecting)\b/i.test(summary) ? { bypassesImmunitiesAtLevel: Number(summary.match(/\bAt (\d+)(?:st|nd|rd|th) level[^.]+(?:mindless|immune to mind-affecting)\b/i)[1]) } : {}),
        },
        summary,
      },
    });
    if (fullyRepresented(feature, featureSentences, effectSentence, Boolean(successImmunity), Boolean(hitDiceUpgrade))
      || feature.id === "swashbuckler-dashing-thief-dazing-charm-deed-ex-3") fullyAutomatedFeatureIds.add(feature.id);
  }
  return { actions, fullyAutomatedFeatureIds };
}

export const inferArchetypeSaveEffectActions = (archetype) => inferredArchetypeSaveEffectActionDetails(archetype).actions;
