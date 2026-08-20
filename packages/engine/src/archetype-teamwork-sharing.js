import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const featureLabel = (feature) => String(feature?.name ?? "Teamwork feat").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "").trim();

function durationByLevel(summary, minimumLevel) {
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
  if (increments.length) return [{ level: minimumLevel, count: 1 }, ...increments];
  return Number.isFinite(twoAt)
    ? [{ level: minimumLevel, count: 1 }, { level: twoAt, count: 2 }]
    : [{ level: minimumLevel, count: 1 }];
}

function actionTypes(summary, minimumLevel) {
  const initial = /as a (free|immediate|move|standard|swift) action/i.exec(summary.split(/At\s+\d+(?:st|nd|rd|th) level/i)[0])?.[1] ?? "standard";
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

function resourceDetails(archetype, feature, summary) {
  if (/expend one use of smite evil/i.test(summary)) return { resourceId: "smiteEvil", cost: 1 };
  const resource = resolvedArchetypeResourceAdjustments(archetype).find((candidate) =>
    candidate.sourceFeatureId === feature.id || candidate.resourceId === `archetype-${feature.id}` || candidate.label?.toLowerCase() === featureLabel(feature).toLowerCase(),
  );
  return resource ? { resourceId: resource.resourceId, cost: 1 } : undefined;
}

export function inferredArchetypeTeamworkSharingDetails(archetype) {
  const actions = [];
  const fullyAutomatedFeatureIds = new Set();
  const sentenceCoverage = [];
  const features = (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? []);
  for (const feature of features) {
    if (feature.resourceActions?.length) continue;
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ");
    if (!/\bgrant(?:s|ed)?\b[^.]{0,100}\b(?:teamwork feat|this feat|one of (?:these|his) feats)|\bgrant(?:s|ed)? the benefits of one teamwork feat/i.test(summary)) continue;
    const minimumLevel = Math.max(1, Number(feature.level ?? 1));
    const upgradeSummary = features.find((candidate) => /Greater Battle Tactician/i.test(candidate.name ?? ""))?.summary ?? "";
    const roundsByLevel = durationByLevel(summary, minimumLevel);
    const resource = resourceDetails(archetype, feature, summary);
    if (!roundsByLevel || !resource) continue;
    const label = featureLabel(feature);
    const evilRestriction = /Evil creatures do not gain the benefit/i.test(summary);
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
        ...(delegateModes ? { modeLabel: "Delegation", modes: delegateModes } : {}),
        actionTypeByLevel: actionTypes(`${summary} ${upgradeSummary}`, minimumLevel),
        ...(evilRestriction ? { confirmations: [{ id: "non-evil-allies", label: "All recipients are non-evil allies", requiredForActivation: true }] } : {}),
        activeEffect: {
          name: label,
          targets: ["allies"],
          bonus: 0,
          description: summary,
          defaultRoundsByLevel: roundsByLevel,
          fixedRounds: true,
          replaceExisting: true,
        },
        summary,
      },
    });
    summary.split(/(?<=[.!?])\s+/).forEach((_, sentenceIndex) => sentenceCoverage.push({ sourceFeatureId: feature.id, sentenceIndex }));
    if (!["brawler-exemplar-field-instruction-ex-5", "investigator-majordomo-delegate-ex-1"].includes(feature.id)) fullyAutomatedFeatureIds.add(feature.id);
  }

  const greater = features.find((feature) => /Greater Battle Tactician/i.test(feature.name ?? ""));
  if (greater && actions.some(({ sourceFeatureId }) => sourceFeatureId.includes("battle-tactician"))) {
    greater.summary.split(/(?<=[.!?])\s+/).forEach((_, sentenceIndex) => sentenceCoverage.push({ sourceFeatureId: greater.id, sentenceIndex }));
    fullyAutomatedFeatureIds.add(greater.id);
  }
  return { actions, fullyAutomatedFeatureIds, sentenceCoverage };
}

export function inferArchetypeTeamworkSharingActions(archetype) {
  return inferredArchetypeTeamworkSharingDetails(archetype).actions;
}
