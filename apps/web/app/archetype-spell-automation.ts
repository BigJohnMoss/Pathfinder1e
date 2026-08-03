import type { AbilityName, CharacterClass } from "../../../packages/types/src/index.js";

export type PreparedSpellAutomation = {
  sharePersonalRange?: {
    label: string;
    school: string;
    resourceId: string;
    reservoirCost: number;
    range: string;
    willingOnly: boolean;
  };
  automaticExtendDuration?: {
    label: string;
    school: string;
  };
  fastHealingAura?: {
    label: string;
    resourceId: string;
    reservoirCost: number;
    minimumSpellLevel: number;
    range: string;
    healingDivisor: number;
    durationAbility: AbilityName;
    minimumRounds: number;
  };
};

export function classSpellAutomation(
  characterClass: CharacterClass,
  classLevel: number,
  selectedOptionIds: string[] = [],
): PreparedSpellAutomation | undefined {
  const availableFeatures = characterClass.features.filter(
    (feature) =>
      feature.level <= classLevel &&
      feature.spellAutomation &&
      (!feature.requiredOptionId || selectedOptionIds.includes(feature.requiredOptionId)),
  );
  const shareFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.sharePersonalRange,
  );
  const share = shareFeature?.spellAutomation?.sharePersonalRange;
  const extendFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.extendDuration,
  );
  const extend = extendFeature?.spellAutomation?.extendDuration;
  const fastHealingFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.fastHealingAura,
  );
  const fastHealing = fastHealingFeature?.spellAutomation?.fastHealingAura;
  if (!share && !extend && !fastHealing) return undefined;

  return {
    ...(share
      ? { sharePersonalRange: {
          label: shareFeature!.name.replace(/\s*\([^)]*\)\s*$/, ""),
          school: share.school,
          resourceId: share.resourceId,
          reservoirCost: share.cost,
          range:
            share.improvedAtLevel &&
            classLevel >= share.improvedAtLevel &&
            share.improvedRange
              ? share.improvedRange
              : share.range,
          willingOnly: Boolean(share.willingOnly),
        } }
      : {}),
    ...(extend
      ? { automaticExtendDuration: {
          label: extendFeature!.name.replace(/\s*\([^)]*\)\s*$/, ""),
          school: extend.school,
        } }
      : {}),
    ...(fastHealing
      ? { fastHealingAura: {
          label: fastHealing.label,
          resourceId: fastHealing.resourceId,
          reservoirCost: fastHealing.cost,
          minimumSpellLevel: fastHealing.minimumSpellLevel,
          range: fastHealing.range,
          healingDivisor: fastHealing.healingDivisor,
          durationAbility: fastHealing.durationAbility,
          minimumRounds: fastHealing.minimumRounds ?? 1,
        } }
      : {}),
  };
}
