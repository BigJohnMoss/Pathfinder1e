import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const featureLabel = (feature) => String(feature?.name ?? "Teamwork feat").replace(/\s*\((?:Ex|Su|Sp)\)\s*$/i, "").trim();

function durationByLevel(summary, minimumLevel) {
  const base = Number(summary.match(/(?:retain|retains)[^.]{0,80}?for\s+(\d+)\s+rounds?/i)?.[1]);
  const divisor = Number(summary.match(/(?:plus|\+)\s+1\s+round\s+for\s+every\s+(\d+)\s+[^.]{0,30}?levels?/i)?.[1]);
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
  return Number.isFinite(twoAt)
    ? [{ level: minimumLevel, count: 1 }, { level: twoAt, count: 2 }]
    : [{ level: minimumLevel, count: 1 }];
}

function actionTypes(summary, minimumLevel) {
  const initial = /as a swift action/i.test(summary.split(/At\s+\d+(?:st|nd|rd|th) level/i)[0]) ? "swift" : "standard";
  let currentLevel = minimumLevel;
  let swiftAt;
  for (const sentence of summary.split(/(?<=[.!?])\s+/)) {
    const statedLevel = Number(sentence.match(/At\s+(\d+)(?:st|nd|rd|th) level/i)?.[1]);
    if (Number.isFinite(statedLevel)) currentLevel = statedLevel;
    if (/swift action/i.test(sentence)) { swiftAt = currentLevel; break; }
  }
  return Number.isFinite(swiftAt)
    ? [{ level: minimumLevel, actionType: initial }, { level: swiftAt, actionType: "swift" }]
    : [{ level: minimumLevel, actionType: initial }];
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
        },
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
    if (feature.id !== "brawler-exemplar-field-instruction-ex-5") fullyAutomatedFeatureIds.add(feature.id);
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
