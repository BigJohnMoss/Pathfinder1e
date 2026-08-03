import type { CharacterClass } from "../../../packages/types/src/index.js";

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
};

export function classSpellAutomation(
  characterClass: CharacterClass,
  classLevel: number,
): PreparedSpellAutomation | undefined {
  const availableFeatures = characterClass.features.filter(
    (feature) => feature.level <= classLevel && feature.spellAutomation,
  );
  const shareFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.sharePersonalRange,
  );
  const share = shareFeature?.spellAutomation?.sharePersonalRange;
  const extendFeature = availableFeatures.find(
    (feature) => feature.spellAutomation?.extendDuration,
  );
  const extend = extendFeature?.spellAutomation?.extendDuration;
  if (!share && !extend) return undefined;

  return {
    sharePersonalRange: share
      ? {
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
        }
      : undefined,
    automaticExtendDuration: extend
      ? {
          label: extendFeature!.name.replace(/\s*\([^)]*\)\s*$/, ""),
          school: extend.school,
        }
      : undefined,
  };
}
