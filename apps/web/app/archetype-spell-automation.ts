import type { AbilityName, CharacterClass, SpellDescriptor } from "../../../packages/types/src/index.js";

export type PreparedSpellAutomation = {
  spellstrike?: {
    label: string;
    closeRange: boolean;
  };
  criticalStrike?: { label: string };
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
  preparedKeywordConversion?: {
    label: string;
    keyword?: string;
    spellIds?: string[];
    requiresTargetPrepared: boolean;
    blockedByActiveEffectName?: string;
    restriction?: string;
  };
  preparedArmamentConversion?: {
    label: string;
    spells: Array<{
      spellId: string;
      baseSpellLevel: number;
      baseEnhancementBonus?: number;
      maximumEnhancementBonus?: number;
      properties: Array<{
        id: string;
        label: string;
        priceModifier: number;
        description: string;
        incompatibleWith?: string[];
        requires?: string[];
      }>;
    }>;
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
  descriptorReservoirBoost?: {
    label: string;
    resourceId: string;
    reservoirCost: number;
    descriptors: SpellDescriptor[];
    casterLevelBonus: number;
    saveDcBonus: number;
  };
};

const scalingBonusAtLevel = (
  entries: Array<{ level: number; bonus: number }>,
  classLevel: number,
) => entries
  .filter((entry) => entry.level <= classLevel)
  .sort((left, right) => left.level - right.level)
  .at(-1)?.bonus ?? 0;

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
  const conversionFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.preparedKeywordConversion,
  );
  const conversion = conversionFeature?.spellAutomation?.preparedKeywordConversion;
  const optionConversionFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.preparedOptionSpellConversion,
  );
  const optionConversion = optionConversionFeature?.spellAutomation?.preparedOptionSpellConversion;
  const optionConversionSpellIds = optionConversion
    ? [...new Set(selectedOptionIds.flatMap((optionId) => optionConversion.spellIdsByOption[optionId] ?? []))]
    : [];
  const armamentFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.preparedArmamentConversion,
  );
  const armament = armamentFeature?.spellAutomation?.preparedArmamentConversion;
  const fastHealingFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.fastHealingAura,
  );
  const fastHealing = fastHealingFeature?.spellAutomation?.fastHealingAura;
  const descriptorBoostFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.descriptorReservoirBoost,
  );
  const descriptorBoost = descriptorBoostFeature?.spellAutomation?.descriptorReservoirBoost;
  const spellstrike = selectedOptionIds.includes("blade-adept-spell-strike");
  const criticalStrike = selectedOptionIds.includes("blade-adept-magus-arcana-critical-strike");
  if (!share && !extend && !conversion && optionConversionSpellIds.length === 0 && !armament && !fastHealing && !descriptorBoost && !spellstrike && !criticalStrike) return undefined;

  return {
    ...(spellstrike ? { spellstrike: { label: "Spellstrike", closeRange: selectedOptionIds.includes("blade-adept-magus-arcana-close-range") } } : {}),
    ...(criticalStrike ? { criticalStrike: { label: "Critical Strike" } } : {}),
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
    ...(conversion
      ? { preparedKeywordConversion: {
          label: conversion.label,
          keyword: conversion.keyword,
          spellIds: conversion.spellIds,
          requiresTargetPrepared: Boolean(conversion.requiresTargetPrepared),
          blockedByActiveEffectName: conversion.blockedByActiveEffectName,
          restriction: conversion.restriction,
        } }
      : {}),
    ...(!conversion && optionConversion && optionConversionSpellIds.length > 0
      ? { preparedKeywordConversion: { label: optionConversion.label, spellIds: optionConversionSpellIds, requiresTargetPrepared: false } }
      : {}),
    ...(armament ? { preparedArmamentConversion: armament } : {}),
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
    ...(descriptorBoost
      ? { descriptorReservoirBoost: {
          label: descriptorBoost.label,
          resourceId: descriptorBoost.resourceId,
          reservoirCost: descriptorBoost.cost,
          descriptors: descriptorBoost.descriptors,
          casterLevelBonus: scalingBonusAtLevel(descriptorBoost.casterLevelBonusByLevel, classLevel),
          saveDcBonus: scalingBonusAtLevel(descriptorBoost.saveDcBonusByLevel, classLevel),
        } }
      : {}),
  };
}
