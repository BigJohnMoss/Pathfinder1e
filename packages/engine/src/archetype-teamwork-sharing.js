import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const featureLabel = (feature) => String(feature?.name ?? "Teamwork feat").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "").trim();

function durationByLevel(summary, minimumLevel) {
  const baseMinutes = Number(summary.match(/(?:retain|retains)[^.]{0,80}?for\s+(\d+)\s+minutes?/i)?.[1]);
  const minuteDivisorText = summary.match(/(?:plus|\+)\s+1\s+minute\s+for\s+every\s+(\d+|two|three|four)\s+[^.]{0,30}?levels?/i)?.[1];
  const minuteDivisor = Number(({ two: 2, three: 3, four: 4 }[minuteDivisorText?.toLowerCase()] ?? minuteDivisorText));
  if (Number.isFinite(baseMinutes) && Number.isFinite(minuteDivisor) && minuteDivisor >= 1) {
    const steps = [];
    for (let level = minimumLevel; level <= 20; level += 1) {
      const rounds = (baseMinutes + Math.floor(level / minuteDivisor)) * 10;
      if (!steps.length || steps.at(-1).rounds !== rounds) steps.push({ level, rounds });
    }
    return steps;
  }
  const base = Number(summary.match(/(?:retain|retains)[^.]{0,80}?for\s+(\d+)\s+rounds?/i)?.[1]);
  const divisor = Number(summary.match(/(?:plus|\+)\s+1\s+round\s+for\s+every\s+(\d+)\s+[^.]{0,30}?levels?/i)?.[1]);
  const levelDuration = summary.match(/number of rounds equal to\s+(\d+)\s*\+\s+(?:her|his|their|the)?\s*[a-z]+ level/i);
  if (levelDuration) return Array.from({ length: 21 - minimumLevel }, (_, index) => ({ level: minimumLevel + index, rounds: Number(levelDuration[1]) + minimumLevel + index }));
  if (!Number.isFinite(base) || !Number.isFinite(divisor) || divisor < 1) return undefined;
  const beyond = Number(summary.match(/for\s+every\s+\d+\s+levels?\s+beyond\s+(\d+)(?:st|nd|rd|th)/i)?.[1] ?? 0);
  const steps = [];
  for (let level = minimumLevel; level <= 20; level += 1) {
    const rounds = base + Math.floor(Math.max(0, level - beyond) / divisor);
    if (!steps.length || steps.at(-1).rounds !== rounds) steps.push({ level, rounds });
  }
  return steps;
}

function selectionCounts(summary, minimumLevel) {
  const twoAt = Number(summary.match(/At\s+(\d+)(?:st|nd|rd|th) level[^.]{0,100}?grants? any two teamwork feats/i)?.[1]);
  const increments = [...summary.matchAll(/At\s+(\d+)(?:st|nd|rd|th) level[^.]{0,100}?grant (?:up to )?(two|three|\d+) teamwork feats/gi)]
    .map((match) => ({ level: Number(match[1]), count: ({ two: 2, three: 3 }[match[2].toLowerCase()] ?? Number(match[2])) }));
  for (const match of summary.matchAll(/At\s+(\d+)(?:st|nd|rd|th) level[^.]{0,120}?chooses? (two|three|\d+) teamwork feats/gi)) {
    increments.push({ level: Number(match[1]), count: ({ two: 2, three: 3 }[match[2].toLowerCase()] ?? Number(match[2])) });
  }
  increments.sort((left, right) => left.level - right.level);
  if (increments.length) return [{ level: minimumLevel, count: 1 }, ...increments];
  return Number.isFinite(twoAt)
    ? [{ level: minimumLevel, count: 1 }, { level: twoAt, count: 2 }]
    : [{ level: minimumLevel, count: 1 }];
}

function actionTypes(summary, minimumLevel) {
  if (/chooses? (?:the|these|one|two|three|\d+) (?:teamwork )?feats? at the start of (?:the|a) rage/i.test(summary)) return [];
  const initialText = summary.split(/At\s+\d+(?:st|nd|rd|th) level/i)[0];
  const initial = /(?:spending|spends?) 10 minutes/i.test(summary)
    ? "10-minute"
    : /as a (free|immediate|move|standard|swift) action/i.exec(initialText)?.[1] ?? "standard";
  let currentLevel = minimumLevel;
  const steps = [{ level: minimumLevel, actionType: initial }];
  for (const sentence of summary.split(/(?<=[.!?])\s+/)) {
    const statedLevel = Number(sentence.match(/At\s+(\d+)(?:st|nd|rd|th) level/i)?.[1]);
    if (Number.isFinite(statedLevel)) currentLevel = statedLevel;
    const actionType = sentence.match(/(?:as|is now) a (free|immediate|move|standard|swift) action/i)?.[1];
    if (actionType && currentLevel > minimumLevel && steps.at(-1).actionType !== actionType) steps.push({ level: currentLevel, actionType });
  }
  return steps;
}

function rangesByLevel(summary, minimumLevel) {
  const initial = Number(summary.match(/(?:all(?:ies)?|ally|companions?)[^.]{0,80}?within\s+(\d+)\s+feet/i)?.[1]
    ?? summary.match(/within\s+(\d+)\s+feet[^.]{0,80}?(?:allies|companions)/i)?.[1]);
  if (!Number.isFinite(initial)) return undefined;
  const steps = [{ level: minimumLevel, feet: initial }];
  for (const match of summary.matchAll(/At\s+(\d+)(?:st|nd|rd|th) level[^.]{0,140}?within\s+(\d+)\s+feet/gi)) {
    const next = { level: Number(match[1]), feet: Number(match[2]) };
    if (steps.at(-1)?.feet !== next.feet) steps.push(next);
  }
  return steps.sort((left, right) => left.level - right.level);
}

function resourceDetails(archetype, feature, summary) {
  if (/expend one use of smite evil/i.test(summary)) return { resourceId: "smiteEvil", cost: 1 };
  if (/expend(?:ing)? 1 use of (?:his|her|their) challenge ability/i.test(summary)) return { resourceId: "challenges", cost: 1 };
  const resource = resolvedArchetypeResourceAdjustments(archetype).find((candidate) =>
    candidate.sourceFeatureId === feature.id || candidate.resourceId === `archetype-${feature.id}` || candidate.label?.toLowerCase() === featureLabel(feature).toLowerCase(),
  );
  return resource ? { resourceId: resource.resourceId, cost: 1 } : undefined;
}

function passiveSharingDetails(feature, summary) {
  const match = summary.match(/automatically grants? (?:all of )?(?:her|his|their) teamwork feats to (?:her|his|their) (animal companion|eidolon)/i);
  if (!match) return undefined;
  const target = match[1].toLowerCase() === "eidolon" ? "eidolon" : "animal-companion";
  return {
    sourceFeatureId: feature.id,
    sharing: {
      featType: "teamwork",
      target,
      targetLabel: target === "eidolon" ? "Eidolon" : "Animal companion",
      ignorePrerequisites: /(?:companion|eidolon) (?:doesn.t|does not) need to meet the prerequisites/i.test(summary),
      summary: `All selected teamwork feats are automatically shared with the ${target === "eidolon" ? "eidolon" : "animal companion"}.`,
    },
  };
}

const replacementBoilerplate = (sentence) => /^(?:This ability )?(?:alters?|replaces?)\b/i.test(sentence.trim());

export function inferredArchetypeTeamworkSharingDetails(archetype) {
  const actions = [];
  const passiveSharings = [];
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  const features = (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? []);
  for (const feature of features) {
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ");
    const sentences = summary.split(/(?<=[.!?])\s+/);
    const passive = passiveSharingDetails(feature, summary);
    if (passive) {
      passiveSharings.push(passive);
      const covered = new Set();
      sentences.forEach((sentence, sentenceIndex) => {
        if (/automatically grants? (?:all of )?(?:her|his|their) teamwork feats to/i.test(sentence)
          || /(?:companion|eidolon) (?:doesn.t|does not) need to meet the prerequisites of (?:these )?teamwork feats/i.test(sentence)) {
          covered.add(sentenceIndex);
          sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
        }
      });
      if (sentences.every((sentence, sentenceIndex) => covered.has(sentenceIndex) || replacementBoilerplate(sentence))) fullyAutomatedFeatureIds.add(feature.id);
    }
    if (feature.resourceActions?.length) continue;
    if (!/\bgrant(?:s|ed|ing)?\b[^.]{0,100}\b(?:teamwork feat|this feat|one of (?:these|his) feats)|\bgrant(?:s|ed|ing)? the benefits of one teamwork feat/i.test(summary)) continue;
    const minimumLevel = Math.max(1, Number(feature.level ?? 1));
    const upgradeSummary = features.find((candidate) => /Greater Battle Tactician/i.test(candidate.name ?? ""))?.summary ?? "";
    const persistentSharing = /while (?:a |the )?[^.]{0,40}?is raging[^.]{0,120}?grants?/i.test(summary)
      || /granting each ally within\s+\d+\s+feet one teamwork feat[^.]{0,80}?as a bonus feat/i.test(summary);
    const roundsByLevel = durationByLevel(summary, minimumLevel) ?? (persistentSharing ? [{ level: minimumLevel, rounds: 999 }] : undefined);
    const resource = resourceDetails(archetype, feature, summary);
    if (!roundsByLevel || (!resource && !persistentSharing)) continue;
    const label = featureLabel(feature);
    const evilRestriction = /Evil creatures do not gain the benefit/i.test(summary);
    const visibilityRestriction = /as long as (?:the cavalier|he|she|they) is visible and can be heard|allies must be able to see and hear|allies?[^.]{0,60}?who can see and hear/i.test(summary);
    const rageRestriction = /while (?:a |the )?[^.]{0,40}?is raging/i.test(summary);
    const readinessRestriction = /does not function if [^.]{0,80}?(?:flat-footed|unconscious)/i.test(summary);
    const changeAsSwift = /Changing the bonus feat granted is a swift action/i.test(summary);
    const rangeByLevel = rangesByLevel(summary, minimumLevel);
    const maximumRecipients = Number(summary.match(/up to (four|three|two|\d+) of (?:his|her|their) allies/i)?.[1]?.replace(/four/i, "4").replace(/three/i, "3").replace(/two/i, "2"));
    const delegateModes = feature.id === "investigator-majordomo-delegate-ex-1" ? [
      { id: "combat", label: "Combat delegation", summary: "Grant the selected feats for the normal round-based duration." },
      { id: "noncombat-task", label: "Noncombat task", minimumLevel: 4, defaultRounds: 999, actionType: "10-minute", summary: "Designate one uninterrupted noncombat task; benefits last until it is complete, up to 8 hours." },
      { id: "until-refresh", label: "Until daily refresh", minimumLevel: 16, defaultRounds: 999, featCount: 1, actionType: "1-minute", summary: "Grant one teamwork feat until Delegate uses refresh." },
    ] : undefined;
    actions.push({
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-share-teamwork-feat`,
        label: `Grant ${label}`,
        classId: archetype.classId,
        minimumLevel,
        ...resource,
        featSelection: {
          label: "Teamwork feat",
          featType: "teamwork",
          countByLevel: selectionCounts(summary, minimumLevel),
          ...(feature.id === "investigator-majordomo-delegate-ex-1" ? { minimumCount: 1 } : {}),
        },
        ...(Number.isFinite(maximumRecipients) ? {
          recipientLabel: "Allies receiving the feat",
          recipients: Array.from({ length: maximumRecipients }, (_, index) => ({ id: String(index + 1), label: `${index + 1} ${index === 0 ? "ally" : "allies"}` })),
        } : {}),
        ...(delegateModes ? { modeLabel: "Delegation", modes: delegateModes } : changeAsSwift ? { modeLabel: "Use", modes: [
          { id: "grant", label: "Grant feat", actionType: "standard", summary: "Begin sharing the selected teamwork feat." },
          { id: "change", label: "Change feat", actionType: "swift", summary: "Replace the currently shared teamwork feat." },
        ] } : {}),
        actionTypeByLevel: actionTypes(`${summary} ${upgradeSummary}`, minimumLevel),
        ...((evilRestriction || visibilityRestriction || rageRestriction || readinessRestriction) ? { confirmations: [
          ...(evilRestriction ? [{ id: "non-evil-allies", label: "All recipients are non-evil allies", requiredForActivation: true }] : []),
          ...(visibilityRestriction ? [{ id: "visible-audible-conscious", label: "Recipients can see and hear you, and you remain conscious", requiredForActivation: true }] : []),
          ...(rageRestriction ? [{ id: "raging", label: "Rage is active", requiredForActivation: true }] : []),
          ...(readinessRestriction ? [{ id: "ready", label: "You are not flat-footed or unconscious", requiredForActivation: true }] : []),
        ] } : {}),
        activeEffect: {
          name: label,
          targets: ["allies"],
          bonus: 0,
          description: summary,
          defaultRoundsByLevel: roundsByLevel,
          ...(rangeByLevel ? { rangeByLevel } : {}),
          fixedRounds: !rageRestriction,
          replaceExisting: true,
        },
        summary,
      },
    });
    summary.split(/(?<=[.!?])\s+/).forEach((sentence, sentenceIndex) => {
      if (!/\b(?:can['’]?t|cannot|may not) (?:take|select|choose)\b/i.test(sentence)) sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex });
    });
    if (!["brawler-exemplar-field-instruction-ex-5", "investigator-majordomo-delegate-ex-1"].includes(feature.id)) fullyAutomatedFeatureIds.add(feature.id);
  }

  const greater = features.find((feature) => /Greater Battle Tactician/i.test(feature.name ?? ""));
  if (greater && actions.some(({ sourceFeatureId }) => sourceFeatureId.includes("battle-tactician"))) {
    greater.summary.split(/(?<=[.!?])\s+/).forEach((_, sentenceIndex) => sentenceCoverage.push({ sourceFeatureId: greater.id, sentenceIndex }));
    fullyAutomatedFeatureIds.add(greater.id);
  }
  return { actions, passiveSharings, fullyAutomatedFeatureIds, sentenceCoverage };
}

export function inferArchetypeTeamworkSharingActions(archetype) {
  return inferredArchetypeTeamworkSharingDetails(archetype).actions;
}

export function inferArchetypePassiveTeamworkSharings(archetype) {
  return inferredArchetypeTeamworkSharingDetails(archetype).passiveSharings;
}
