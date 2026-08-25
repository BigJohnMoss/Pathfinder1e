import { resolvedArchetypeResourceAdjustments } from "./archetype-resources.js";

const featureLabel = (feature) => String(feature?.name ?? "Channel Energy").replace(/\s*\((?:Ex|Su|Sp)(?:,\s*(?:Ex|Su|Sp))*\)\s*$/i, "").trim();

function channelModes(summary, feature) {
  if (/only to harm undead or haunts/i.test(summary)) return [
    { id: "harm-undead", label: "Harm undead", summary: "Channel positive energy to harm eligible undead." },
    { id: "harm-haunts", label: "Harm haunts", summary: "Channel positive energy to disrupt eligible haunts." },
  ];
  if (/channel(?:s|ing)? (?:the pure )?evil|heals evil creatures|debilitates good creatures/i.test(summary)) return [
    { id: "heal-evil", label: "Heal evil creatures", summary: "Heal eligible evil creatures in the channel area." },
    { id: "harm-good", label: "Harm good creatures", summary: "Harm eligible good creatures in the channel area; affected creatures use the listed Will save." },
  ];
  if (/positive or negative energy based on (?:his|her|their) alignment|decides to channel positive or negative/i.test(summary)) return [
    { id: "positive-heal", label: "Positive: heal living", summary: "Channel positive energy to heal eligible living creatures." },
    { id: "positive-harm", label: "Positive: harm undead", summary: "Channel positive energy to harm eligible undead; affected creatures use the listed Will save." },
    { id: "negative-heal", label: "Negative: heal undead", summary: "Channel negative energy to heal eligible undead." },
    { id: "negative-harm", label: "Negative: harm living", summary: "Channel negative energy to harm eligible living creatures; affected creatures use the listed Will save." },
  ];
  if (feature?.channelEnergyPolarityOptionIds && /good .*channels positive energy|good witch channels positive energy/i.test(summary) && /evil .*channels negative energy|evil witch channels negative energy/i.test(summary)) return [
    { id: "positive-heal", label: "Positive: heal living", summary: "Channel positive energy to heal eligible living creatures.", requiredOptionId: feature.channelEnergyPolarityOptionIds.positive },
    { id: "positive-harm", label: "Positive: harm undead", summary: "Channel positive energy to harm eligible undead; affected creatures use the listed Will save.", requiredOptionId: feature.channelEnergyPolarityOptionIds.positive },
    { id: "negative-heal", label: "Negative: heal undead", summary: "Channel negative energy to heal eligible undead.", requiredOptionId: feature.channelEnergyPolarityOptionIds.negative },
    { id: "negative-harm", label: "Negative: harm living", summary: "Channel negative energy to harm eligible living creatures; affected creatures use the listed Will save.", requiredOptionId: feature.channelEnergyPolarityOptionIds.negative },
  ];
  if (/channel negative energy/i.test(summary)) return [
    { id: "heal-undead", label: "Heal undead", summary: "Channel negative energy to heal eligible undead." },
    { id: "harm-living", label: "Harm living creatures", summary: "Channel negative energy to harm eligible living creatures; affected creatures use the listed Will save." },
  ];
  return [
    { id: "heal-living", label: "Heal living creatures", summary: "Channel positive energy to heal eligible living creatures." },
    { id: "harm-undead", label: "Harm undead", summary: "Channel positive energy to harm eligible undead; affected creatures use the listed Will save." },
  ];
}

function channelModeEffects(summary, modes) {
  const channelEvil = /channel evil|channels the pure evil/i.test(summary);
  return modes.map((mode) => {
    const harmful = /(?:^harm-|\bharm\b)/i.test(mode.id);
    return {
      modeId: mode.id,
      kind: harmful ? "damage" : "healing",
      ...(harmful ? { targetSave: { modifier: "will", outcome: channelEvil ? "negates" : "half" } } : {}),
      ...(channelEvil && mode.id === "harm-good" ? { riders: [
        {
          name: "Sickened by Channel Evil",
          description: "The good creature is sickened after failing its Will save.",
          targetHitDice: { comparison: "greater-than", levelAdjustment: -5 },
          duration: { kind: "dice-rounds", count: 1, sides: 4 },
        },
        {
          name: "Nauseated, then sickened by Channel Evil",
          description: "The good creature is nauseated for 1 round, then sickened for 1d4 rounds.",
          targetHitDice: { comparison: "at-most", levelAdjustment: -5 },
          duration: { kind: "fixed-then-dice-rounds", fixedRounds: 1, count: 1, sides: 4 },
        },
      ] } : {}),
    };
  });
}

function effectiveLevelAdjustment(summary) {
  if (/one level lower than (?:his|her|their) level/i.test(summary)) return -1;
  const adjustment = summary.match(/(?:level|level equal to (?:his|her|their) [a-z]+ level)\s*(?:-|–|−|minus)\s*(\d+)/i);
  return adjustment ? -Number(adjustment[1]) : 0;
}

function channelDice(feature, summary) {
  const minimumLevel = Math.max(1, Number(feature.level ?? 1));
  const explicit = summary.match(/(?:equal to|heals or deals)\s+(\d+)d(\d+)[^.]{0,120}?(?:additional|increases by)\s+(\d+)d\2[^.]{0,60}?\bevery\s+(\d+|one|two|three|four|five|six)\s+(?:(?:[a-z]+ )?levels?)?\s*(?:beyond|after)\s+(\d+)(?:st|nd|rd|th)?/i);
  if (explicit) {
    const base = Number(explicit[1]);
    const sides = Number(explicit[2]);
    const increase = Number(explicit[3]);
    const interval = ({ one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 })[explicit[4].toLowerCase()] ?? Number(explicit[4]);
    const startingLevel = Number(explicit[5]);
    const maximum = Number(summary.match(/maximum of\s+(\d+)d\d+/i)?.[1] ?? Number.MAX_SAFE_INTEGER);
    return {
      diceCountByLevel: Array.from({ length: 21 - minimumLevel }, (_, index) => {
        const level = minimumLevel + index;
        return { level, count: Math.min(maximum, base + Math.max(0, Math.floor((level - startingLevel) / interval)) * increase) };
      }).filter((entry, index, entries) => index === 0 || entry.count !== entries[index - 1].count),
      dieSidesByLevel: [{ level: minimumLevel, sides }],
    };
  }
  const fixed = summary.match(/(?:equal to|heals or deals|burst heals or deals)\s+(\d+)d(\d+)/i);
  if (fixed && feature.channelEnergyDiceAdvancementOptionIds?.length) return {
    diceCountByLevel: [{ level: minimumLevel, count: Number(fixed[1]) }],
    dieSidesByLevel: [{ level: minimumLevel, sides: Number(fixed[2]) }],
    diceCountBonusOptionIds: feature.channelEnergyDiceAdvancementOptionIds,
  };
  if (fixed && !/as a cleric/i.test(summary)) return {
    diceCountByLevel: [{ level: minimumLevel, count: Number(fixed[1]) }],
    dieSidesByLevel: [{ level: minimumLevel, sides: Number(fixed[2]) }],
  };
  if (!/channel(?:s|ing)? (?:positive |negative )?energy|channel evil/i.test(summary)) return undefined;
  const levelAdjustment = effectiveLevelAdjustment(summary);
  const counts = Array.from({ length: 21 - minimumLevel }, (_, index) => {
    const level = minimumLevel + index;
    const effectiveLevel = Math.max(1, level + levelAdjustment);
    return { level, count: 1 + Math.floor((effectiveLevel - 1) / 2) };
  }).filter((entry, index, entries) => index === 0 || entry.count !== entries[index - 1].count);
  return { diceCountByLevel: counts, dieSidesByLevel: [{ level: minimumLevel, sides: /channel evil/i.test(summary) ? 4 : 6 }] };
}

function fullyRepresented(feature, summary) {
  if (/^Hospitaler Channel Energy$/i.test(featureLabel(feature))) return true;
  if (/gains the ability to channel positive energy as a cleric of one level lower/i.test(summary)) return true;
  if (/uses (?:his|her|their) [a-z]+ level\s*(?:-|–|−|minus)\s*3 as (?:his|her|their) effective cleric level/i.test(summary) && /3 \+ (?:his|her|their) Charisma modifier/i.test(summary)) return true;
  if (/gains the ability to channel negative energy[^.]+effective cleric level equal to (?:his|her|their) [a-z]+ level\s*(?:-|–|−|minus)\s*3/i.test(summary) && /1 \+ (?:his|her|their) Charisma modifier/i.test(summary)) return true;
  if (/channel positive energy[^.]+3 \+ (?:his|her|their) Charisma modifier/i.test(summary) && /only to harm undead or haunts/i.test(summary)) return true;
  if (/channels the pure evil|channel evil/i.test(summary) && /nauseated for 1 round and then sickened for 1d4 rounds/i.test(summary)) return true;
  if (/Every time .*new hex/i.test(summary) && feature.channelEnergyDiceAdvancementOptionIds?.length && feature.channelEnergyPolarityOptionIds) return true;
  return false;
}

export function inferredArchetypeChannelEnergyActionDetails(archetype) {
  const actions = [];
  const fullyAutomatedFeatureIds = new Set();
  const resources = resolvedArchetypeResourceAdjustments(archetype);
  for (const feature of (archetype?.replacements ?? []).flatMap((replacement) => replacement.features ?? [])) {
    if (feature.resourceActions?.length) continue;
    const summary = String(feature.summary ?? "").replace(/\s+/g, " ").trim();
    const label = featureLabel(feature);
    if (!/^(?:(?:Hospitaler )?Channel Energy|Channel Evil|Channel Solar Energy|Etheric Channel)$/i.test(label)) continue;
    if (/does not gain the channel energy ability/i.test(summary)) continue;
    if (/^Channel Energy$/i.test(label) && /\b(?:alters channel energy|only when carrying|must channel positive energy)\b/i.test(summary)) continue;
    const diceRoll = channelDice(feature, summary);
    if (!diceRoll) continue;
    const resource = resources.find((candidate) => candidate.sourceFeatureId === feature.id || candidate.resourceId === `archetype-${feature.id}`);
    if (!resource) continue;
    const minimumLevel = Math.max(1, Number(resource.minimumLevel ?? feature.level ?? 1));
    const levelAdjustment = /DC (?:of this save )?is equal to 10 \+ 1\/2 (?:the )?[^.]{0,80}\blevel/i.test(summary) ? 0 : effectiveLevelAdjustment(summary);
    const modes = channelModes(summary, feature);
    actions.push({
      sourceFeatureId: feature.id,
      action: {
        id: `${feature.id}-channel`,
        label: `Use ${label}`,
        classId: archetype.classId,
        minimumLevel,
        resourceId: resource.resourceId,
        cost: 1,
        modeLabel: "Channel mode",
        modes,
        ...(/standard action/i.test(summary) ? { actionTypeByLevel: [{ level: minimumLevel, actionType: "standard" }] } : {}),
        diceRoll: { label, ...diceRoll, modeEffects: channelModeEffects(summary, modes) },
        savingThrow: { label: "Will", ability: "charisma", base: 10, levelDivisor: 2, classId: archetype.classId, ...(levelAdjustment ? { levelAdjustment } : {}) },
        summary,
      },
    });
    if (fullyRepresented(feature, summary)) fullyAutomatedFeatureIds.add(feature.id);
  }
  return { actions, fullyAutomatedFeatureIds };
}

export const inferArchetypeChannelEnergyActions = (archetype) => inferredArchetypeChannelEnergyActionDetails(archetype).actions;
