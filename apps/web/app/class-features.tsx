import { useState } from "react";
import { rollD20Check, rollDice } from "../../../packages/engine/src/index.js";
import type { AbilityName, ActiveEffect, ActiveEffectTarget, CharacterFeat, ClassFeatureOccurrence as Feature } from "../../../packages/types/src/index.js";

export type DailyResource = {
  id?: string;
  label: string;
  unit: string;
  maximum: number | null;
  used: number;
  refreshUsed?: number;
  refreshCadence?: "day" | "week";
  hidden?: boolean;
  onUsedChange: (used: number) => void;
};

const effectTargetLabel = (target: ActiveEffectTarget) => target.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
const abilityEffectTargets = new Set<ActiveEffectTarget>(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]);

export function ClassFeatures({ level, className, features, dailyResources = [], abilityModifiers = {}, saveModifiers = {}, baseAttackBonus = 0, classLevels = {}, casterLevels = {}, selectedOptions = {}, selectedOptionIds = [], selectedFeats = [], featCatalogue = [], featEligibility, activeEffects = [], equippedWeapons = [], onAddEffect, onRemoveEffectByName, onTemporaryHitPointsChange }: {
  level: number;
  className: string;
  features: Feature[];
  dailyResources?: DailyResource[];
  abilityModifiers?: Partial<Record<AbilityName, number>>;
  saveModifiers?: Partial<Record<"fortitude" | "reflex" | "will", number>>;
  baseAttackBonus?: number;
  classLevels?: Record<string, number>;
  casterLevels?: Record<string, number>;
  selectedOptionIds?: string[];
  selectedOptions?: Record<string, string>;
  selectedFeats?: Array<{ id: string; name: string; type: string; types?: string[] }>;
  featCatalogue?: CharacterFeat[];
  featEligibility?: (featId: string, additionallySelectedIds: string[]) => boolean;
  activeEffects?: ActiveEffect[];
  equippedWeapons?: Array<{ id: string; name: string }>;
  onAddEffect?: (effect: ActiveEffect) => void;
  onRemoveEffectByName?: (name: string) => void;
  onTemporaryHitPointsChange?: (amount: number) => void;
}) {
  const [variableAmounts, setVariableAmounts] = useState<Record<string, number | "">>({});
  const [actionResults, setActionResults] = useState<Record<string, string>>({});
  const [effectTargets, setEffectTargets] = useState<Record<string, ActiveEffectTarget>>({});
  const [effectSkills, setEffectSkills] = useState<Record<string, string>>({});
  const [effectWeaponIds, setEffectWeaponIds] = useState<Record<string, string>>({});
  const [effectRounds, setEffectRounds] = useState<Record<string, number>>({});
  const [actionModes, setActionModes] = useState<Record<string, string>>({});
  const [actionRecipients, setActionRecipients] = useState<Record<string, string>>({});
  const [actionFeatSelections, setActionFeatSelections] = useState<Record<string, string[]>>({});
  const [actionFeatCounts, setActionFeatCounts] = useState<Record<string, number>>({});
  const [actionConfirmations, setActionConfirmations] = useState<Record<string, boolean>>({});
  const [calculationInputs, setCalculationInputs] = useState<Record<string, number>>({});
  const [targetHitDice, setTargetHitDice] = useState<Record<string, number>>({});
  const [rerollInputs, setRerollInputs] = useState<Record<string, { original: number; modifier: number; count: number; sides: number }>>({});
  const [combatInputs, setCombatInputs] = useState<Record<string, { touchArmorClass: number; saveModifier: number; secondarySaveModifier: number }>>({});
  const [actionTargetNames, setActionTargetNames] = useState<Record<string, string>>({});
  const selectedOptionSet = new Set(selectedOptionIds);

  const effectNamesForResource = (resourceId?: string) => [...new Set(features.flatMap((feature) => feature.resourceActions ?? []).filter((action) => action.resourceId === resourceId).flatMap((action) => [...(action.conditionEffectsByUseCount?.map((step) => step.name) ?? []), ...(action.activeEffect ? [action.activeEffect.name] : [])]))];

  return <section className="features">
    <div><p className="eyebrow">LEVEL {level}</p><h2>{className} features</h2><p>Review everything earned at this level, then configure required class choices below.</p></div>
    {dailyResources.filter((resource) => !resource.hidden).map((resource) => {
      const atWill = resource.maximum === null;
      const used = atWill ? 0 : Math.min(resource.used, resource.maximum ?? 0);
      const remaining = atWill ? 0 : (resource.maximum ?? 0) - used;
      const refreshUsed = atWill ? 0 : Math.max(0, Math.min(resource.refreshUsed ?? 0, resource.maximum ?? 0));
      return <div className="daily-resource" key={resource.label}>
        <div><strong>{resource.label}</strong><output aria-label={`${resource.label} remaining`}>{atWill ? "At will" : `${remaining}/${resource.maximum} ${resource.unit} remaining`}</output></div>
        {!atWill && <div><button type="button" onClick={() => resource.onUsedChange(used + 1)} disabled={remaining <= 0}>Spend 1 {resource.unit}</button><button type="button" onClick={() => { resource.onUsedChange(refreshUsed); effectNamesForResource(resource.id).forEach((name) => onRemoveEffectByName?.(name)); }} disabled={used === refreshUsed}>Refresh {resource.label.toLowerCase()}</button>{resource.refreshCadence === "week" && <small>Refreshes after one week, not on Refresh day.</small>}</div>}
      </div>;
    })}
    <ol>{features.map((feature) => <li key={feature.id}>
      {Boolean(feature.deedRules?.length) && <div className="feature-deed-rules" role="region" aria-label={`${feature.name} deed rules`}>{feature.deedRules!.filter((rule) => level >= rule.minimumLevel).map((rule) => <article key={rule.id}><div><strong>{rule.name}</strong><span>{rule.kind === "active" ? "Active deed" : "Passive deed"} · level {rule.minimumLevel}</span></div><p>{rule.summary}</p>{rule.condition && <small>Requires: {rule.condition}</small>}{rule.resourceId && <small>{rule.minimumResource ? `Maintain at least ${rule.minimumResource} ${rule.resourceId} point${rule.minimumResource === 1 ? "" : "s"}.` : rule.cost ? `Costs ${rule.cost} ${rule.resourceId} point${rule.cost === 1 ? "" : "s"}.` : ""}</small>}</article>)}</div>}
      {Boolean(feature.performanceRules?.length) && <div className="feature-deed-rules" role="region" aria-label={`${feature.name} performance rules`}>{feature.performanceRules!.filter((rule) => level >= rule.minimumLevel).map((rule) => <article key={rule.id}><div><strong>{rule.name}</strong><span>{rule.kind === "active" ? "Active performance" : "Passive performance"} · level {rule.minimumLevel}</span></div><p>{rule.summary}</p>{rule.condition && <small>Requires: {rule.condition}</small>}{rule.resourceId && rule.cost !== undefined && <small>Costs {rule.cost} {rule.resourceId === "ragingSongRounds" ? "raging song" : "bardic performance"} round{rule.cost === 1 ? "" : "s"} to begin.</small>}</article>)}</div>}
      <div><strong>{feature.name}</strong><p>{feature.summary}</p>{feature.teamworkFeatSharing && <div className="passive-feat-sharing" role="region" aria-label={`${feature.name} shared teamwork feats`}><strong>Shared with {feature.teamworkFeatSharing.targetLabel}</strong>{selectedFeats.filter((feat) => feat.type === feature.teamworkFeatSharing?.featType).length ? <div className="passive-feat-chips">{selectedFeats.filter((feat) => feat.type === feature.teamworkFeatSharing?.featType).map((feat) => <span key={feat.id}>{feat.name}</span>)}</div> : <p>No teamwork feats selected yet.</p>}<small>{feature.teamworkFeatSharing.summary}{feature.teamworkFeatSharing.ignorePrerequisites ? ` The ${feature.teamworkFeatSharing.targetLabel.toLowerCase()} does not need to meet their prerequisites.` : ""}</small></div>}{feature.progressionProfiles?.filter((profile) => !profile.requiredOptionId || selectedOptionSet.has(profile.requiredOptionId)).map((profile) => {
        const usesCasterLevel = Boolean(profile.advancementOptionId && selectedOptionSet.has(profile.advancementOptionId));
        const advancementLevel = usesCasterLevel ? casterLevels[profile.classId] ?? classLevels[profile.classId] ?? 0 : classLevels[profile.classId] ?? 0;
        const current = profile.steps.filter((step) => step.level <= advancementLevel).sort((left, right) => left.level - right.level).at(-1);
        if (!current) return null;
        return <div className="feature-progression-profile" role="region" aria-label={profile.label} key={profile.id}>
          <div><strong>{profile.label}</strong><span>Advancement level {advancementLevel}{usesCasterLevel ? " · caster level" : " · class level"}</span></div>
          <dl>{profile.columns.map((column) => <div key={column.id}><dt>{column.label}</dt><dd>{current.values[column.id]}</dd></div>)}</dl>
          {profile.usesOwnerSavingThrows && <p>Saving throws use yours: Fortitude {saveModifiers.fortitude !== undefined && saveModifiers.fortitude >= 0 ? "+" : ""}{saveModifiers.fortitude ?? 0}, Reflex {saveModifiers.reflex !== undefined && saveModifiers.reflex >= 0 ? "+" : ""}{saveModifiers.reflex ?? 0}, Will {saveModifiers.will !== undefined && saveModifiers.will >= 0 ? "+" : ""}{saveModifiers.will ?? 0}.</p>}
          {profile.summary && <small>{profile.summary}</small>}
        </div>;
      })}{feature.numericCalculations?.map((calculation) => {
        const input = Math.max(calculation.inputMinimum, Math.min(calculation.inputMaximum, calculationInputs[calculation.id] ?? calculation.inputDefault ?? calculation.inputMinimum));
        const calculationLevel = calculation.classId ? classLevels[calculation.classId] ?? 0 : level;
        const base = calculation.baseByLevel.filter((step) => step.level <= calculationLevel).sort((left, right) => left.level - right.level).at(-1)?.value ?? 0;
        return <div className="feature-rule-calculation" role="group" aria-label={calculation.label} key={calculation.id}>
          <label>{calculation.inputLabel}<input aria-label={calculation.inputLabel} type="number" min={calculation.inputMinimum} max={calculation.inputMaximum} value={input} onChange={(event) => setCalculationInputs((current) => ({ ...current, [calculation.id]: Math.max(calculation.inputMinimum, Math.min(calculation.inputMaximum, Number(event.target.value) || calculation.inputMinimum)) }))} /></label>
          <output aria-label={calculation.outputLabel}>{calculation.outputLabel}: {base + input}</output>
          {calculation.summary && <small>{calculation.summary}</small>}
        </div>;
      })}{feature.resourceActions?.filter((action) => (action.classId ? classLevels[action.classId] ?? level : level) >= (action.minimumLevel ?? 1) && (!action.requiredOptionId || selectedOptionSet.has(action.requiredOptionId))).map((action) => {
        const actionClassLevel = action.classId ? classLevels[action.classId] ?? 0 : level;
        const actionLevel = action.advancementOptionId && selectedOptionSet.has(action.advancementOptionId)
          ? casterLevels[action.classId ?? ""] ?? actionClassLevel
          : actionClassLevel;
        const availableModes = action.modes?.filter((mode) => actionLevel >= (mode.minimumLevel ?? 1) && actionLevel <= (mode.maximumLevel ?? 20) && (!mode.requiredOptionId || selectedOptionSet.has(mode.requiredOptionId)));
        const selectedMode = availableModes?.find((mode) => mode.id === actionModes[action.id]) ?? availableModes?.[0];
        const fixedFeatSelectionCount = selectedMode?.featCount ?? action.featSelection?.countByLevel.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.count ?? 0;
        const featSelectionResource = action.resourceId ? dailyResources.find((candidate) => candidate.id === action.resourceId) : undefined;
        const variableFeatMaximum = Math.max(1, Math.min(20, featSelectionResource?.maximum === null ? 20 : Math.max(0, (featSelectionResource?.maximum ?? 20) - (featSelectionResource?.used ?? 0))));
        const featSelectionCount = selectedMode?.variableFeatCount ? Math.max(1, Math.min(variableFeatMaximum, actionFeatCounts[action.id] ?? fixedFeatSelectionCount)) : fixedFeatSelectionCount;
        const selectedFeatCost = actionFeatSelections[action.id]?.slice(0, featSelectionCount).filter(Boolean).length ?? 0;
        const variableCostResource = action.variableCost && action.resourceId ? dailyResources.find((candidate) => candidate.id === action.resourceId) : undefined;
        const variableCostRemaining = variableCostResource?.maximum === null ? Number.POSITIVE_INFINITY : Math.max(0, (variableCostResource?.maximum ?? 0) - (variableCostResource?.used ?? 0));
        const variableCostMaximum = action.variableCost
          ? Math.max(action.variableCost.minimum, Math.min(action.variableCost.maximum ?? Number.POSITIVE_INFINITY, action.variableCost.maximumLevelDivisor ? Math.floor(actionLevel / action.variableCost.maximumLevelDivisor) : Number.POSITIVE_INFINITY, variableCostRemaining))
          : 0;
        const enteredVariableCost = variableAmounts[action.id];
        const variableCost = action.costPerSelectedFeat ? selectedFeatCost : action.variableCost ? Math.max(action.variableCost.minimum, Math.min(typeof enteredVariableCost === "number" ? enteredVariableCost : action.variableCost.minimum, variableCostMaximum)) : action.cost;
        const variableCostInput = enteredVariableCost ?? action.variableCost?.minimum;
        const costs = action.costs ?? (action.resourceId && variableCost !== undefined ? [{ resourceId: action.resourceId, cost: variableCost }] : []);
        const changes = action.changes ?? costs.map(({ resourceId, cost }) => ({ resourceId, usedDelta: cost }));
        const variableMaximum = action.variableRecovery
          ? Math.max(action.variableRecovery.minimum ?? 0, Math.min(action.variableRecovery.maximum ?? Number.POSITIVE_INFINITY, action.variableRecovery.levelDivisor ? Math.floor(level / action.variableRecovery.levelDivisor) : Number.POSITIVE_INFINITY))
          : 0;
        const enteredVariableRecovery = variableAmounts[action.id];
        const variableAmount = action.variableRecovery ? Math.max(action.variableRecovery.minimum ?? 0, Math.min(typeof enteredVariableRecovery === "number" ? enteredVariableRecovery : variableMaximum, variableMaximum)) : 0;
        const appliedChanges = action.variableRecovery
          ? [...changes, { resourceId: action.variableRecovery.resourceId, usedDelta: -variableAmount }]
          : changes;
        const resources = appliedChanges.map((change) => ({ ...change, resource: dailyResources.find((candidate) => candidate.id === change.resourceId) }));
        const unavailableResource = resources.some(({ resource }) => !resource);
        const unavailableCost = resources.some(({ usedDelta, resource }) => usedDelta > 0 && resource?.maximum !== null && Math.max(0, (resource?.maximum ?? 0) - (resource?.used ?? 0)) < usedDelta);
        const minimumResource = action.minimumResourceRemaining && action.resourceId ? dailyResources.find((candidate) => candidate.id === action.resourceId) : undefined;
        const unavailableMinimumResource = Boolean(action.minimumResourceRemaining && (!minimumResource || minimumResource.maximum !== null && Math.max(0, (minimumResource.maximum ?? 0) - minimumResource.used) < action.minimumResourceRemaining));
        const recoveries = resources.filter(({ usedDelta }) => usedDelta < 0);
        const unavailableRecovery = !action.variableRecovery && recoveries.length > 0 && recoveries.every(({ resource }) => (resource?.used ?? 0) <= 0);
        const blockedByActorCondition = Boolean(
          action.actorSavingThrow?.blockedByActiveEffectName &&
          activeEffects.some(
            (effect) =>
              effect.name === action.actorSavingThrow?.blockedByActiveEffectName,
          ),
        );
        const weaponChoices = action.activeEffect?.selectEquippedWeapon
          ? [...equippedWeapons, ...(action.activeEffect.includeUnarmedStrike && !equippedWeapons.some((weapon) => weapon.id === "unarmed-strike") ? [{ id: "unarmed-strike", name: "Unarmed strike" }] : [])]
          : [];
        const selectedEffectWeaponId = effectWeaponIds[action.id] ?? weaponChoices[0]?.id;
        const unavailable = unavailableResource || unavailableCost || unavailableMinimumResource || unavailableRecovery || blockedByActorCondition || Boolean(action.modes?.length && !availableModes?.length) || (Boolean(action.activeEffect?.selectEquippedWeapon) && !selectedEffectWeaponId);
        const useCount = Math.max(0, resources[0]?.resource?.used ?? 0);
        const label = action.labelsByUseCount?.[Math.min(useCount, action.labelsByUseCount.length - 1)] ?? action.label;
        const result = actionResults[action.id];
        const rerollInput = rerollInputs[action.id] ?? { original: 10, modifier: 0, count: 1, sides: 6 };
        const combatInput = combatInputs[action.id] ?? { touchArmorClass: 10, saveModifier: 0, secondarySaveModifier: 0 };
        const conditionStep = action.conditionEffectsByUseCount?.[Math.min(useCount, action.conditionEffectsByUseCount.length - 1)];
        const selectedRecipient = action.recipients?.find((recipient) => recipient.id === actionRecipients[action.id]) ?? action.recipients?.[0];
        const possessedFeatIds = new Set(selectedFeats.map((feat) => feat.id));
        const featSource = action.featSelection?.source === "catalogue" ? featCatalogue : selectedFeats;
        const baseAvailableFeats = action.featSelection ? featSource.filter((feat) => {
          const permittedType = feat.type === action.featSelection!.featType || feat.types?.includes(action.featSelection!.featType) || action.featSelection!.additionalFeatIds?.includes(feat.id);
          return permittedType && (action.featSelection!.source !== "catalogue" || !possessedFeatIds.has(feat.id));
        }) : [];
        const selectedActionFeatIds = Array.from({ length: featSelectionCount }, (_, index) => actionFeatSelections[action.id]?.[index] ?? (action.featSelection?.source === "catalogue" ? "" : baseAvailableFeats[index]?.id ?? ""));
        const availableFeatsForIndex = (index: number) => baseAvailableFeats.filter((feat) => !featEligibility || featEligibility(feat.id, selectedActionFeatIds.slice(0, index).filter(Boolean)));
        const selectedActionFeatNames = selectedActionFeatIds.map((id) => featSource.find((feat) => feat.id === id)?.name).filter((name): name is string => Boolean(name));
        const requiredFeatSelectionCount = action.featSelection?.minimumCount ?? featSelectionCount;
        const missingFeatSelection = featSelectionCount > 0 && (selectedActionFeatNames.length < requiredFeatSelectionCount || new Set(selectedActionFeatIds.filter(Boolean)).size < selectedActionFeatNames.length);
        const actionType = selectedMode?.actionType ?? action.actionTypeByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.actionType;
        const confirmationChecked = (id: string) => Boolean(actionConfirmations[`${action.id}:${id}`]);
        const allConfirmations = [...(action.confirmations ?? []), ...(action.combatRoll?.confirmations ?? [])];
        const missingRequiredConfirmation = Boolean(allConfirmations.some((confirmation) => confirmation.requiredForActivation && !confirmationChecked(confirmation.id)));
        const combatTargetSaveModifier = combatInput.saveModifier + (action.combatRoll?.targetSave?.conditionalModifiers ?? []).filter((modifier) => confirmationChecked(modifier.confirmationId)).reduce((total, modifier) => total + modifier.modifier, 0);
        const defaultActionTargetName = action.randomOutcomeTarget
          ? selectedMode?.id === action.randomOutcomeTarget.allyModeId
            ? "Ally"
            : selectedMode?.id === action.randomOutcomeTarget.enemyModeId
              ? "Enemy"
              : action.randomOutcomeTarget.defaultValue
          : "";
        const actionTargetName = actionTargetNames[action.id] ?? defaultActionTargetName;
        const saveEffectTargetName = action.targetEffectRoll ? actionTargetNames[action.id]?.trim() || "Target" : "";
        const saveEffectImmunity = action.targetEffectRoll?.successEffect ?? action.targetEffectRoll?.failureEffect;
        const saveEffectImmunityName = saveEffectImmunity ? `${saveEffectImmunity.name} — ${saveEffectTargetName}` : undefined;
        const targetHasSaveEffectImmunity = Boolean(saveEffectImmunityName && activeEffects.some((effect) => effect.name === saveEffectImmunityName));
        const effectTarget = action.activeEffect ? effectTargets[action.id] ?? action.activeEffect.targets[0] : undefined;
        const effectSkill = action.activeEffect?.skillOptions?.length ? effectSkills[action.id] ?? action.activeEffect.skillOptions[0] : undefined;
        const effectTargetChoiceLabel = action.activeEffect?.targets.every((target) => abilityEffectTargets.has(target)) ? "Affected ability" : "Affected target";
        const defaultRounds = selectedMode?.defaultRounds ?? action.activeEffect?.defaultRoundsByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.rounds ?? action.activeEffect?.defaultRounds ?? 10;
        const rounds = action.activeEffect ? Math.max(1, Math.min(999, effectRounds[action.id] ?? defaultRounds)) : 0;
        const effectRange = action.activeEffect?.rangeByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.feet;
        const effectUpgrade = action.activeEffect?.upgrades?.filter((upgrade) => selectedOptionSet.has(upgrade.requiredOptionId)).at(-1);
        const effectName = action.featSelection?.source === "catalogue"
          ? effectUpgrade?.name ?? action.activeEffect?.name
          : selectedActionFeatNames.length ? `${effectUpgrade?.name ?? action.activeEffect?.name} — ${selectedActionFeatNames.join(" + ")}` : effectUpgrade?.name ?? action.activeEffect?.name;
        const tableEffectBonus = action.activeEffect?.bonusByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.bonus;
        const effectBonus = (effectUpgrade?.bonus ?? tableEffectBonus ?? (action.activeEffect ? (action.activeEffect.improvedAtLevel && level >= action.activeEffect.improvedAtLevel ? action.activeEffect.improvedBonus ?? action.activeEffect.bonus : action.activeEffect.bonus) : 0)) + (action.activeEffect?.bonusAbilityModifier ? abilityModifiers[action.activeEffect.bonusAbilityModifier] ?? 0 : 0);
        const additionalActiveEffects = action.activeEffect?.additionalEffectsByLevel?.filter((effect) => effect.minimumLevel <= actionLevel) ?? [];
        const saveLevel = (action.savingThrow?.classId ? classLevels[action.savingThrow.classId] ?? 0 : level) + (action.savingThrow?.levelAdjustment ?? 0);
        const fixedSaveDc = action.savingThrow?.fixedDcByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.dc;
        const saveDc = action.savingThrow ? fixedSaveDc ?? (action.savingThrow.base ?? 0) + Math.floor(saveLevel / (action.savingThrow.levelDivisor ?? 1)) + (action.savingThrow.ability ? abilityModifiers[action.savingThrow.ability] ?? 0 : 0) : undefined;
        const saveText = action.savingThrow ? `${action.savingThrow.label} DC ${saveDc} negates.` : undefined;
        const effectDescription = [selectedActionFeatNames.length ? action.featSelection?.source === "catalogue" ? `Temporary feat${selectedActionFeatNames.length === 1 ? "" : "s"}: ${selectedActionFeatNames.join(", ")}.` : `Granted teamwork feat${selectedActionFeatNames.length === 1 ? "" : "s"}: ${selectedActionFeatNames.join(", ")}.` : undefined, selectedRecipient ? `Recipients: ${selectedRecipient.label}.` : undefined, effectRange ? `Range: ${effectRange} feet.` : undefined, selectedMode?.summary, effectUpgrade?.description ?? action.activeEffect?.description, saveText].filter(Boolean).join(" ");
        const minimumTargetHitDice = action.targetHitDiceRequirement ? Math.max(1, Math.ceil(level / action.targetHitDiceRequirement.levelDivisor)) : 0;
        const enteredTargetHitDice = Math.max(0, targetHitDice[action.id] ?? minimumTargetHitDice);
        const targetEligible = !action.targetHitDiceRequirement || enteredTargetHitDice >= minimumTargetHitDice;
        const temporaryHitPoints = action.temporaryHitPointsByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.amount;
        const temporaryHitPointsDurationRounds = action.temporaryHitPointsDurationRoundsByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.rounds ?? action.temporaryHitPointsDurationRounds;
        const combatDiceCount = action.combatRoll?.damage.diceCountByLevel.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.count;
        const combatDieSides = action.combatRoll?.damage.dieSidesByLevel.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.sides;
        const combatRange = action.combatRoll?.rangeByLevel.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.range;
        const combatFlatModifier = action.combatRoll?.damage.flatModifierByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.modifier ?? 0;
        const combatDamageModifier = combatFlatModifier + (action.combatRoll?.damage.abilityModifier ? abilityModifiers[action.combatRoll.damage.abilityModifier] ?? 0 : 0);
        const diceCountBase = action.diceRoll?.diceCountByLevel.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.count;
        const diceCount = diceCountBase === undefined ? undefined : diceCountBase + (action.diceRoll?.diceCountBonusOptionIds?.filter((id) => selectedOptionSet.has(id)).length ?? 0);
        const dieSides = action.diceRoll?.dieSidesByLevel.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.sides;
        const diceModifier = action.diceRoll?.abilityModifier ? abilityModifiers[action.diceRoll.abilityModifier] ?? 0 : 0;
        const diceModeEffect = action.diceRoll?.modeEffects?.find((effect) => effect.modeId === selectedMode?.id);
        const combatAttackAbility = action.combatRoll?.attack?.kind === "melee-touch" ? "strength" : "dexterity";
        const combatAttackModifier = baseAttackBonus + (abilityModifiers[combatAttackAbility] ?? 0) + activeEffects.filter((effect) => effect.target === "attackRolls").reduce((total, effect) => total + effect.bonus, 0);
        const combatDamageType = action.combatRoll?.damage.usesSelectedModeAsDamageType && selectedMode ? selectedMode.id : action.combatRoll?.damage.type;
        const targetEffect = action.targetEffectRoll?.effectsByLevel.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1);
        const targetEffectRange = action.targetEffectRoll?.rangeByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.range;
        const targetEffectHitDice = Math.max(0, targetHitDice[action.id] ?? actionLevel);
        const combatTargetHitDice = Math.max(0, targetHitDice[action.id] ?? actionLevel);
        const selectedWeaponOption = action.activeEffect?.weaponSelectionFeatureId ? selectedOptions[action.activeEffect.weaponSelectionFeatureId] : undefined;
        const selectedWeapon = action.activeEffect?.selectEquippedWeapon ? selectedEffectWeaponId : selectedWeaponOption === "blade-adept-bond-other"
          ? selectedOptions[`${action.activeEffect!.weaponSelectionFeatureId}-weapon`]?.trim().toLowerCase()
          : selectedWeaponOption?.replace(/^blade-adept-bond-/, "");
        const activate = () => {
          if (action.actorSavingThrow && saveDc !== undefined) {
            const roll = Math.floor(Math.random() * 20) + 1;
            const modifier = saveModifiers[action.actorSavingThrow.modifier] ?? 0;
            const total = roll + modifier;
            if (total < saveDc) {
              const repeatedFailure = activeEffects.some((effect) => effect.name === action.actorSavingThrow!.failureName);
              const failureName = repeatedFailure ? action.actorSavingThrow.repeatedFailureName ?? action.actorSavingThrow.failureName : action.actorSavingThrow.failureName;
              const failureDescription = repeatedFailure ? action.actorSavingThrow.repeatedFailureDescription ?? action.actorSavingThrow.failureDescription : action.actorSavingThrow.failureDescription;
              if (repeatedFailure && failureName !== action.actorSavingThrow.failureName) onRemoveEffectByName?.(action.actorSavingThrow.failureName);
              onAddEffect?.({ id: `${action.id}-failure-${Date.now()}-${Math.random()}`, name: failureName, target: "self", bonus: 0, description: failureDescription, roundsRemaining: 999 });
              setActionResults((current) => ({ ...current, [action.id]: `Will save ${roll} ${modifier >= 0 ? "+" : "−"} ${Math.abs(modifier)} = ${total}; failed DC ${saveDc}. No points transferred; ${failureName.toLowerCase()} applied.` }));
              return;
            }
            setActionResults((current) => ({ ...current, [action.id]: `Will save ${roll} ${modifier >= 0 ? "+" : "−"} ${Math.abs(modifier)} = ${total}; succeeded against DC ${saveDc}.` }));
          }
          resources.forEach(({ usedDelta, resource }) => resource?.onUsedChange(resource.used + usedDelta));
          if (temporaryHitPoints !== undefined) {
            onTemporaryHitPointsChange?.(temporaryHitPoints);
            if (temporaryHitPointsDurationRounds) onAddEffect?.({ id: `${action.id}-temporary-hit-points-${Date.now()}-${Math.random()}`, name: action.label, target: "self", bonus: 0, description: `${temporaryHitPoints} temporary hit points expire when this duration ends if they have not already been spent.`, roundsRemaining: temporaryHitPointsDurationRounds, temporaryHitPointsGranted: temporaryHitPoints });
          }
          if (conditionStep && onAddEffect) {
            action.conditionEffectsByUseCount?.forEach((step) => onRemoveEffectByName?.(step.name));
            conditionStep.effects.forEach((effect, index) => onAddEffect({ id: `${action.id}-condition-${index}-${Date.now()}-${Math.random()}`, name: conditionStep.name, target: effect.target, bonus: effect.bonus, description: effect.description, roundsRemaining: 999 }));
          }
          if (action.activeEffect && onAddEffect) {
            if (action.activeEffect.replaceExisting) onRemoveEffectByName?.(effectName ?? action.activeEffect.name);
            const targets = action.activeEffect.applyToAllTargets ? action.activeEffect.targets : effectTarget ? [effectTarget] : [];
            targets.forEach((target) => onAddEffect({
              id: `${action.id}-${target}-${Date.now()}-${Math.random()}`,
              name: effectName ?? action.activeEffect!.name,
              target,
              bonus: effectBonus,
              ...(effectDescription ? { description: effectDescription } : {}),
              roundsRemaining: rounds,
              ...(selectedWeapon ? { weaponIds: [selectedWeapon] } : {}),
              ...(action.activeEffect!.usesWeaponEnhancementRules ? { weaponEnhancementBonus: true } : {}),
              ...(action.activeEffect!.usesSelectedModeAsDamageType && selectedMode ? { damageType: selectedMode.id } : {}),
              ...(effectSkill ? { skillIds: [effectSkill] } : {}),
              ...(action.featSelection?.source === "catalogue" ? { grantedFeatIds: selectedActionFeatIds.filter(Boolean) } : {}),
              ...(action.activeEffect!.consumeOnUse ? { consumeOnUse: true } : {}),
            }));
            additionalActiveEffects.forEach((effect) => {
              if (action.activeEffect?.replaceExisting) onRemoveEffectByName?.(effect.name);
              const bonus = effect.bonusByLevel?.filter((step) => step.level <= actionLevel).sort((left, right) => left.level - right.level).at(-1)?.bonus ?? effect.bonus;
              onAddEffect({ id: `${action.id}-${effect.target}-${Date.now()}-${Math.random()}`, name: effect.name, target: effect.target, bonus, description: effect.description, roundsRemaining: rounds });
            });
            if (action.activeEffect.replaceExisting) {
              new Set(action.modes?.flatMap((mode) => mode.activeEffects?.map((effect) => effect.label) ?? [])).forEach((label) => onRemoveEffectByName?.(label));
            }
            selectedMode?.activeEffects?.forEach((effect) => {
              onAddEffect({ id: `${action.id}-${effect.target}-${Date.now()}-${Math.random()}`, name: effect.label, target: effect.target, bonus: effect.bonus, description: effect.description, roundsRemaining: rounds });
            });
          }
          if (action.rerollAction?.kind === "d20") {
            const roll = rollD20Check(rerollInput.modifier);
            setActionResults((current) => ({ ...current, [action.id]: `${action.rerollAction!.label}: ${roll.natural}${rerollInput.modifier === 0 ? "" : ` ${rerollInput.modifier >= 0 ? "+" : "−"} ${Math.abs(rerollInput.modifier)}`} = ${roll.total}. You must keep this result.` }));
          } else if (action.rerollAction?.kind === "damage") {
            const roll = rollDice(rerollInput.count, rerollInput.sides, rerollInput.modifier);
            setActionResults((current) => ({ ...current, [action.id]: `${action.rerollAction!.label}: ${roll.rolls.join(" + ")}${rerollInput.modifier === 0 ? "" : ` ${rerollInput.modifier >= 0 ? "+" : "−"} ${Math.abs(rerollInput.modifier)}`} = ${roll.total}. You must keep this result.` }));
          } else if (action.rerollAction?.kind === "lower-d20") {
            const roll = rollD20Check(rerollInput.modifier);
            setActionResults((current) => ({ ...current, [action.id]: `${action.rerollAction!.label}: original ${rerollInput.original}; reroll ${roll.natural}${rerollInput.modifier === 0 ? "" : ` ${rerollInput.modifier >= 0 ? "+" : "−"} ${Math.abs(rerollInput.modifier)}`} = ${roll.total}. Use ${Math.min(rerollInput.original, roll.total)}.` }));
          } else if (action.rerollAction?.kind === "higher-d20") {
            const roll = rollD20Check(rerollInput.modifier);
            setActionResults((current) => ({ ...current, [action.id]: `${action.rerollAction!.label}: original ${rerollInput.original}; reroll ${roll.natural}${rerollInput.modifier === 0 ? "" : ` ${rerollInput.modifier >= 0 ? "+" : "−"} ${Math.abs(rerollInput.modifier)}`} = ${roll.total}. Use ${Math.max(rerollInput.original, roll.total)}.` }));
          }
          if (action.combatRoll && combatDiceCount && combatDieSides) {
            const attack = action.combatRoll.attack ? rollD20Check(combatAttackModifier) : undefined;
            const hit = !attack || (attack.natural !== 1 && (attack.natural === 20 || attack.total >= combatInput.touchArmorClass));
            const parts = [selectedRecipient ? `Recipient ${selectedRecipient.label}.` : "", combatRange ? `Range ${combatRange}.` : ""];
            if (attack) parts.push(`${action.combatRoll.attack!.label}: ${attack.natural}${combatAttackModifier === 0 ? "" : ` ${combatAttackModifier >= 0 ? "+" : "−"} ${Math.abs(combatAttackModifier)}`} = ${attack.total} vs touch AC ${combatInput.touchArmorClass} — ${hit ? "hit" : "miss"}.`);
            if (hit) {
              const damage = rollDice(combatDiceCount, combatDieSides, combatDamageModifier);
              const targetSaveEnabled = Boolean(action.combatRoll.targetSave && (!action.combatRoll.targetSave.requiredConfirmationId || confirmationChecked(action.combatRoll.targetSave.requiredConfirmationId)));
              const targetSave = targetSaveEnabled && saveDc !== undefined ? rollD20Check(combatTargetSaveModifier) : undefined;
              const saveSucceeded = Boolean(targetSave && saveDc !== undefined && targetSave.total >= saveDc);
              const halvesDamage = saveSucceeded && ["half-damage", "half-and-negates-riders"].includes(action.combatRoll.targetSave?.outcome ?? "");
              const appliedDamage = halvesDamage ? Math.floor(damage.total / 2) : damage.total;
              parts.push(`${combatDiceCount}d${combatDieSides}${combatDamageModifier === 0 ? "" : combatDamageModifier > 0 ? ` + ${combatDamageModifier}` : ` − ${Math.abs(combatDamageModifier)}`} ${combatDamageType} damage: ${damage.rolls.join(" + ")}${combatDamageModifier === 0 ? "" : combatDamageModifier > 0 ? ` + ${combatDamageModifier}` : ` − ${Math.abs(combatDamageModifier)}`} = ${damage.total}${halvesDamage ? `; save halves to ${appliedDamage}` : ""}.`);
              if (targetSave && saveDc !== undefined) parts.push(`${action.combatRoll.targetSave!.modifier[0].toUpperCase()}${action.combatRoll.targetSave!.modifier.slice(1)} save: ${targetSave.natural}${combatTargetSaveModifier === 0 ? "" : ` ${combatTargetSaveModifier >= 0 ? "+" : "−"} ${Math.abs(combatTargetSaveModifier)}`} = ${targetSave.total} vs DC ${saveDc} — ${saveSucceeded ? "success" : "failure"}.`);
              const ridersNegated = saveSucceeded && ["negates-riders", "half-and-negates-riders"].includes(action.combatRoll.targetSave?.outcome ?? "");
              if (!ridersNegated) action.combatRoll.riders?.filter((rider) =>
                actionLevel >= (rider.minimumLevel ?? 1)
                &&
                (!rider.requiredConfirmationId || confirmationChecked(rider.requiredConfirmationId))
                && (!rider.maximumTargetHitDiceDivisor || combatTargetHitDice < actionLevel / rider.maximumTargetHitDiceDivisor),
              ).forEach((rider, index) => {
                const decayDivisor = rider.duration.kind === "decaying-dice" ? rider.duration.divisor : 2;
                const lingeringDice = Array.from({ length: 10 }, (_, step) => Math.max(1, Math.floor(combatDiceCount / (decayDivisor ** (step + 1))))).filter((count, index, values) => index === 0 || count !== values[index - 1]);
                const rounds = rider.duration.kind === "fixed-rounds" ? rider.duration.rounds : rider.duration.kind === "dice-rounds" ? rollDice(rider.duration.count, rider.duration.sides).total : rider.duration.kind === "decaying-dice" ? lingeringDice.length : rider.duration.kind === "level-minutes" ? Math.min(999, actionLevel * 10) : 999;
                const lingeringDieSides = rider.duration.kind === "decaying-dice" ? rider.duration.sides : combatDieSides;
                const description = rider.description.replaceAll("{level}", String(actionLevel)).replaceAll("{breakDc}", String(10 + (abilityModifiers.charisma ?? 0))).replaceAll("{lingeringDice}", lingeringDice.map((count) => `${count}d${lingeringDieSides}`).join(" → "));
                onAddEffect?.({ id: `${action.id}-rider-${index}-${Date.now()}-${Math.random()}`, name: rider.name, target: "enemy", bonus: 0, description, roundsRemaining: rounds });
                parts.push(`${rider.name} applied${rider.duration.kind === "until-ended" ? " until ended" : ` for ${rounds} round${rounds === 1 ? "" : "s"}`}.`);
              });
              if (action.combatRoll.secondaryDamage && saveDc !== undefined) {
                const secondaryBase = Math.floor(damage.rolls.reduce((total, roll) => total + roll, 0) / action.combatRoll.secondaryDamage.divisor);
                const secondarySave = rollD20Check(combatInput.secondarySaveModifier);
                const secondaryDamage = secondarySave.total >= saveDc ? Math.floor(secondaryBase / 2) : secondaryBase;
                parts.push(`${action.combatRoll.secondaryDamage.label}: ${secondaryBase} damage; ${action.combatRoll.secondaryDamage.saveModifier} save ${secondarySave.total} vs DC ${saveDc}, ${secondaryDamage} damage after save.`);
              }
            }
            setActionResults((current) => ({ ...current, [action.id]: parts.filter(Boolean).join(" ") }));
          }
          if (action.targetEffectRoll && targetEffect && saveDc !== undefined) {
            const save = rollD20Check(combatInput.saveModifier);
            const succeeded = save.total >= saveDc;
            const upgraded = Boolean(action.targetEffectRoll.targetHitDiceUpgrade && targetEffectHitDice <= Math.floor(actionLevel / action.targetEffectRoll.targetHitDiceUpgrade.levelDivisor));
            const effectName = upgraded ? action.targetEffectRoll.targetHitDiceUpgrade!.name : targetEffect.name;
            const effectDescription = upgraded ? action.targetEffectRoll.targetHitDiceUpgrade!.description : targetEffect.description;
            if (succeeded && action.targetEffectRoll.successEffect) onAddEffect?.({ id: `${action.id}-success-${Date.now()}-${Math.random()}`, name: saveEffectImmunityName ?? action.targetEffectRoll.successEffect.name, target: "enemy", bonus: 0, description: action.targetEffectRoll.successEffect.description, roundsRemaining: action.targetEffectRoll.successEffect.rounds });
            if (!succeeded) {
              const duration = targetEffect.duration;
              const effectDuration = duration.kind === "fixed-rounds" ? duration.rounds : duration.kind === "dice-rounds" ? rollDice(duration.count, duration.sides).total : duration.kind === "level-minutes" ? Math.min(999, actionLevel * 10) : Math.min(999, actionLevel);
              onAddEffect?.({ id: `${action.id}-target-${Date.now()}-${Math.random()}`, name: `${effectName} — ${saveEffectTargetName}`, target: "enemy", bonus: 0, description: effectDescription, roundsRemaining: effectDuration });
              if (action.targetEffectRoll.failureEffect) onAddEffect?.({ id: `${action.id}-failure-immunity-${Date.now()}-${Math.random()}`, name: saveEffectImmunityName ?? action.targetEffectRoll.failureEffect.name, target: "enemy", bonus: 0, description: action.targetEffectRoll.failureEffect.description, roundsRemaining: action.targetEffectRoll.failureEffect.rounds });
              setActionResults((current) => ({ ...current, [action.id]: `${saveEffectTargetName}: ${targetEffectRange ? `range ${targetEffectRange}; ` : ""}${action.targetEffectRoll!.modifier[0].toUpperCase()}${action.targetEffectRoll!.modifier.slice(1)} save ${save.natural}${combatInput.saveModifier === 0 ? "" : ` ${combatInput.saveModifier >= 0 ? "+" : "−"} ${Math.abs(combatInput.saveModifier)}`} = ${save.total} vs DC ${saveDc} — failure; ${effectName.toLowerCase()} for ${effectDuration} round${effectDuration === 1 ? "" : "s"}${action.targetEffectRoll!.failureEffect ? " and immunity tracked" : ""}.` }));
            } else setActionResults((current) => ({ ...current, [action.id]: `${saveEffectTargetName}: ${targetEffectRange ? `range ${targetEffectRange}; ` : ""}${action.targetEffectRoll!.modifier[0].toUpperCase()}${action.targetEffectRoll!.modifier.slice(1)} save ${save.natural}${combatInput.saveModifier === 0 ? "" : ` ${combatInput.saveModifier >= 0 ? "+" : "−"} ${Math.abs(combatInput.saveModifier)}`} = ${save.total} vs DC ${saveDc} — success; effect negated${action.targetEffectRoll!.successEffect ? " and immunity tracked" : ""}.` }));
          }
          if (action.diceRoll && diceCount && dieSides) {
            const roll = rollDice(diceCount, dieSides, diceModifier);
            const mode = selectedMode?.label ?? action.diceRoll.label;
            const parts = [`${mode}: ${roll.rolls.join(" + ")}${diceModifier === 0 ? "" : diceModifier > 0 ? ` + ${diceModifier}` : ` − ${Math.abs(diceModifier)}`} = ${roll.total}${diceModeEffect ? ` ${diceModeEffect.kind}` : ""}.`];
            const targetSave = diceModeEffect?.targetSave && saveDc !== undefined ? rollD20Check(combatInput.saveModifier) : undefined;
            const saveSucceeded = Boolean(targetSave && saveDc !== undefined && targetSave.total >= saveDc);
            if (targetSave && saveDc !== undefined && diceModeEffect?.targetSave) {
              const appliedAmount = saveSucceeded ? diceModeEffect.targetSave.outcome === "half" ? Math.floor(roll.total / 2) : 0 : roll.total;
              parts.push(`${diceModeEffect.targetSave.modifier[0].toUpperCase()}${diceModeEffect.targetSave.modifier.slice(1)} save: ${targetSave.natural}${combatInput.saveModifier === 0 ? "" : ` ${combatInput.saveModifier >= 0 ? "+" : "−"} ${Math.abs(combatInput.saveModifier)}`} = ${targetSave.total} vs DC ${saveDc} — ${saveSucceeded ? `success; ${appliedAmount} damage` : `failure; ${appliedAmount} damage`}.`);
            }
            if (!saveSucceeded) diceModeEffect?.riders?.filter((rider) => {
              if (!rider.targetHitDice) return true;
              const threshold = actionLevel + rider.targetHitDice.levelAdjustment;
              const enteredHitDice = Math.max(0, targetHitDice[action.id] ?? actionLevel);
              return rider.targetHitDice.comparison === "at-most" ? enteredHitDice <= threshold : enteredHitDice > threshold;
            }).forEach((rider, index) => {
              const duration = rider.duration;
              const riderRounds = duration.kind === "fixed-rounds"
                ? duration.rounds
                : duration.kind === "dice-rounds"
                  ? rollDice(duration.count, duration.sides).total
                  : duration.fixedRounds + rollDice(duration.count, duration.sides).total;
              onAddEffect?.({ id: `${action.id}-dice-rider-${index}-${Date.now()}-${Math.random()}`, name: rider.name, target: "enemy", bonus: 0, description: rider.description, roundsRemaining: riderRounds });
              parts.push(`${rider.name} tracked for ${riderRounds} round${riderRounds === 1 ? "" : "s"}.`);
            });
            setActionResults((current) => ({ ...current, [action.id]: parts.join(" ") }));
          }
          if (action.randomOutcomes?.length) {
            const outcome = action.randomOutcomes[Math.floor(Math.random() * action.randomOutcomes.length)];
            const targetRules = action.randomOutcomeTarget;
            const effectName = targetRules ? `Trump Card — ${actionTargetName.trim() || defaultActionTargetName}` : outcome.label;
            const outcomeBonus = outcome.effect?.classLevelBonus ? actionClassLevel : outcome.effect?.bonus ?? 0;
            const resolvedOutcomeSummary = outcome.effect?.target === "healingReceived" && outcome.effect.classLevelBonus
              ? `The next magical healing restores ${actionClassLevel} additional hit points.`
              : outcome.summary;
            const inverseOutcomeSummary = outcome.effect?.target === "healingReceived"
              ? `The next magical healing received is reduced by ${outcomeBonus} hit points.`
              : resolvedOutcomeSummary.replaceAll("+", "−");
            if (!targetRules || !outcome.effect) {
              setActionResults((current) => ({ ...current, [action.id]: `${outcome.label}: ${outcome.summary}` }));
            } else if (selectedMode?.id === targetRules.enemyModeId && saveDc !== undefined) {
              const save = rollD20Check(combatInput.saveModifier);
              const succeeded = save.total >= saveDc;
              if (!succeeded) {
                onRemoveEffectByName?.(effectName);
                onAddEffect?.({ id: `${action.id}-enemy-${Date.now()}-${Math.random()}`, name: effectName, target: "enemy", bonus: 0, description: `${outcome.label} curse: ${inverseOutcomeSummary} The named enemy uses this penalty on its next qualifying roll.`, roundsRemaining: 999 });
              }
              setActionResults((current) => ({ ...current, [action.id]: `${outcome.label} drawn for ${actionTargetName.trim() || defaultActionTargetName}. ${targetRules.enemySaveModifier[0].toUpperCase()}${targetRules.enemySaveModifier.slice(1)} save ${save.natural}${combatInput.saveModifier === 0 ? "" : ` ${combatInput.saveModifier >= 0 ? "+" : "−"} ${Math.abs(combatInput.saveModifier)}`} = ${save.total} vs DC ${saveDc} — ${succeeded ? "curse negated" : "curse applied"}.` }));
            } else if (selectedMode?.id === targetRules.allyModeId) {
              onRemoveEffectByName?.(effectName);
              onAddEffect?.({ id: `${action.id}-ally-${Date.now()}-${Math.random()}`, name: effectName, target: "allies", bonus: 0, description: `${outcome.label}: ${resolvedOutcomeSummary} Remove this tracker after the named ally uses it.`, roundsRemaining: 999 });
              setActionResults((current) => ({ ...current, [action.id]: `${outcome.label} drawn for ${actionTargetName.trim() || defaultActionTargetName}: ${resolvedOutcomeSummary}` }));
            } else {
              onRemoveEffectByName?.(effectName);
              onAddEffect?.({ id: `${action.id}-self-${Date.now()}-${Math.random()}`, name: effectName, target: outcome.effect.target, bonus: outcomeBonus, description: `${outcome.label}: ${resolvedOutcomeSummary}`, roundsRemaining: 999, consumeOnUse: true });
              setActionResults((current) => ({ ...current, [action.id]: `${outcome.label} drawn for ${actionTargetName.trim() || defaultActionTargetName}: ${resolvedOutcomeSummary} The app will consume it on the next qualifying roll.` }));
            }
          } else if (action.activeEffect && !action.rerollAction) setActionResults((current) => ({
            ...current,
            [action.id]: action.featSelection
              ? action.featSelection.source === "catalogue"
                ? `${selectedActionFeatNames.join(" and ")} gained for ${rounds} round${rounds === 1 ? "" : "s"}${actionType ? ` as a ${actionType} action` : ""}.`
                : `${selectedActionFeatNames.join(" and ")} granted to ${selectedRecipient?.label.toLowerCase() ?? "eligible allies"}${effectRange ? ` within ${effectRange} feet` : ""} for ${rounds} round${rounds === 1 ? "" : "s"}${actionType ? ` as a ${actionType} action` : ""}.`
              : `${effectDescription || action.activeEffect!.name} Active for ${rounds} round${rounds === 1 ? "" : "s"}.`,
          }));
          else if (temporaryHitPoints !== undefined) setActionResults((current) => ({ ...current, [action.id]: `Gained ${temporaryHitPoints} temporary hit points.` }));
          else if (!action.actorSavingThrow && !action.rerollAction && !action.combatRoll && !action.diceRoll && !action.targetEffectRoll) setActionResults((current) => ({ ...current, [action.id]: action.spellLikeAbility ? action.spellLikeAbility.kind === "spell-equivalent" ? `${action.spellLikeAbility.spellName} activated as a spell-equivalent effect.` : `${action.spellLikeAbility.spellName} cast as a spell-like ability.` : "Ability used." }));
        };
        return <div className="feature-resource-action" key={action.id}>
          {action.variableCost && <label>{action.variableCost.label}<input aria-label={`${action.label} ${action.variableCost.label.toLowerCase()}`} type="number" min={action.variableCost.minimum} max={variableCostMaximum} value={variableCostInput} onChange={(event) => setVariableAmounts((current) => ({ ...current, [action.id]: event.target.value === "" ? "" : Math.max(action.variableCost!.minimum, Math.min(Number(event.target.value), variableCostMaximum)) }))} /></label>}
          {action.variableRecovery && <label>{action.variableRecovery.label}<input type="number" min={action.variableRecovery.minimum ?? 0} max={variableMaximum} value={variableAmount} onChange={(event) => setVariableAmounts((current) => ({ ...current, [action.id]: Math.max(action.variableRecovery!.minimum ?? 0, Math.min(Number(event.target.value) || 0, variableMaximum)) }))} /></label>}
          {Boolean(availableModes?.length) && <label>{action.modeLabel ?? "Mode"}<select aria-label={`${action.label} mode`} value={selectedMode?.id} onChange={(event) => { setActionModes((current) => ({ ...current, [action.id]: event.target.value })); setActionTargetNames((current) => { const next = { ...current }; delete next[action.id]; return next; }); setActionResults((current) => ({ ...current, [action.id]: "" })); }}>{availableModes!.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}</select></label>}
          {selectedMode?.variableFeatCount && <label>Number of feats<input aria-label={`${action.label} number of feats`} type="number" min="1" max={variableFeatMaximum} value={featSelectionCount} onChange={(event) => setActionFeatCounts((current) => ({ ...current, [action.id]: Math.max(1, Math.min(variableFeatMaximum, Number(event.target.value) || 1)) }))} /></label>}
          {Boolean(action.recipients?.length) && <label>{action.recipientLabel ?? "Recipient"}<select aria-label={`${action.label} recipient`} value={selectedRecipient?.id} onChange={(event) => setActionRecipients((current) => ({ ...current, [action.id]: event.target.value }))}>{action.recipients!.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.label}</option>)}</select></label>}
          {action.featSelection && Array.from({ length: featSelectionCount }, (_, index) => <label key={`${action.id}-feat-${index}`}>{action.featSelection!.label}{featSelectionCount > 1 ? ` ${index + 1}` : ""}<select aria-label={`${action.label} ${action.featSelection!.label.toLowerCase()}${featSelectionCount > 1 ? ` ${index + 1}` : ""}`} value={selectedActionFeatIds[index]} onChange={(event) => setActionFeatSelections((current) => { const next = [...(current[action.id] ?? selectedActionFeatIds)]; next[index] = event.target.value; next.splice(index + 1); return { ...current, [action.id]: next }; })}><option value="">Choose {action.featSelection!.source === "catalogue" ? "an eligible" : "a selected"} {action.featSelection!.featType} feat</option>{availableFeatsForIndex(index).map((feat) => <option key={feat.id} value={feat.id} disabled={selectedActionFeatIds.some((id, selectedIndex) => selectedIndex !== index && id === feat.id)}>{feat.name}</option>)}</select></label>)}
          {actionType && <small>Activation: {actionType} action.</small>}
          {allConfirmations.map((confirmation) => <label key={confirmation.id}><input aria-label={`${action.label} ${confirmation.label}`} type="checkbox" checked={confirmationChecked(confirmation.id)} onChange={(event) => setActionConfirmations((current) => ({ ...current, [`${action.id}:${confirmation.id}`]: event.target.checked }))} />{confirmation.label}</label>)}
          {action.randomOutcomeTarget && <label>{action.randomOutcomeTarget.label}<input aria-label={`${action.label} ${action.randomOutcomeTarget.label.toLowerCase()}`} value={actionTargetName} maxLength={80} onChange={(event) => setActionTargetNames((current) => ({ ...current, [action.id]: event.target.value }))} /></label>}
          {action.randomOutcomeTarget && selectedMode?.id === action.randomOutcomeTarget.enemyModeId && <label>Target {action.randomOutcomeTarget.enemySaveModifier} modifier<input aria-label={`${action.label} target ${action.randomOutcomeTarget.enemySaveModifier} modifier`} type="number" min="-999" max="999" value={combatInput.saveModifier} onChange={(event) => setCombatInputs((current) => ({ ...current, [action.id]: { ...combatInput, saveModifier: Math.max(-999, Math.min(999, Number(event.target.value) || 0)) } }))} /></label>}
          {action.savingThrow && <output aria-label={`${action.label} save DC`}>{action.savingThrow.label} save DC {saveDc}</output>}
          {action.targetHitDiceRequirement && <label>{action.targetHitDiceRequirement.label}<input aria-label={`${action.label} target Hit Dice`} type="number" min="0" max="999" value={enteredTargetHitDice} onChange={(event) => setTargetHitDice((current) => ({ ...current, [action.id]: Math.max(0, Math.min(999, Number(event.target.value) || 0)) }))} /><small>Requires at least {minimumTargetHitDice} Hit Dice.</small></label>}
          {action.combatRoll && combatDiceCount && combatDieSides && <><output aria-label={`${action.label} attack profile`}>{combatDiceCount}d{combatDieSides}{combatDamageModifier >= 0 ? "+" : ""}{combatDamageModifier} {combatDamageType} · {combatRange}</output>{action.combatRoll.attack && <label>Target touch AC<input aria-label={`${action.label} target touch AC`} type="number" min="1" max="999" value={combatInput.touchArmorClass} onChange={(event) => setCombatInputs((current) => ({ ...current, [action.id]: { ...combatInput, touchArmorClass: Math.max(1, Math.min(999, Number(event.target.value) || 1)) } }))} /></label>}{action.combatRoll.targetSave && <label>Target {action.combatRoll.targetSave.modifier} modifier<input aria-label={`${action.label} target ${action.combatRoll.targetSave.modifier} modifier`} type="number" min="-999" max="999" value={combatInput.saveModifier} onChange={(event) => setCombatInputs((current) => ({ ...current, [action.id]: { ...combatInput, saveModifier: Math.max(-999, Math.min(999, Number(event.target.value) || 0)) } }))} /></label>}{action.combatRoll.riders?.some((rider) => rider.maximumTargetHitDiceDivisor) && <label>Target Hit Dice<input aria-label={`${action.label} target Hit Dice`} type="number" min="0" max="999" value={combatTargetHitDice} onChange={(event) => setTargetHitDice((current) => ({ ...current, [action.id]: Math.max(0, Math.min(999, Number(event.target.value) || 0)) }))} /></label>}{action.combatRoll.secondaryDamage && <label>Adjacent {action.combatRoll.secondaryDamage.saveModifier} modifier<input aria-label={`${action.label} adjacent ${action.combatRoll.secondaryDamage.saveModifier} modifier`} type="number" min="-999" max="999" value={combatInput.secondarySaveModifier} onChange={(event) => setCombatInputs((current) => ({ ...current, [action.id]: { ...combatInput, secondarySaveModifier: Math.max(-999, Math.min(999, Number(event.target.value) || 0)) } }))} /></label>}</>}
          {action.targetEffectRoll && <><label>Target name<input aria-label={`${action.label} target name`} value={actionTargetNames[action.id] ?? ""} placeholder="Target" maxLength={80} onChange={(event) => setActionTargetNames((current) => ({ ...current, [action.id]: event.target.value }))} /></label><label>Target {action.targetEffectRoll.modifier} modifier<input aria-label={`${action.label} target ${action.targetEffectRoll.modifier} modifier`} type="number" min="-999" max="999" value={combatInput.saveModifier} onChange={(event) => setCombatInputs((current) => ({ ...current, [action.id]: { ...combatInput, saveModifier: Math.max(-999, Math.min(999, Number(event.target.value) || 0)) } }))} /></label>{action.targetEffectRoll.targetHitDiceUpgrade && <label>Target Hit Dice<input aria-label={`${action.label} target Hit Dice`} type="number" min="0" max="999" value={targetEffectHitDice} onChange={(event) => setTargetHitDice((current) => ({ ...current, [action.id]: Math.max(0, Math.min(999, Number(event.target.value) || 0)) }))} /></label>}{action.targetEffectRoll.bypassesImmunitiesAtLevel && actionLevel >= action.targetEffectRoll.bypassesImmunitiesAtLevel && <small>Can affect mindless creatures and targets normally immune to mind-affecting effects.</small>}{targetHasSaveEffectImmunity && <small>{saveEffectTargetName} is immune to this ability until the tracked immunity is removed.</small>}</>}
          {action.diceRoll && diceCount && dieSides && <><output aria-label={`${action.label} roll profile`}>{diceCount}d{dieSides}{diceModifier === 0 ? "" : diceModifier > 0 ? `+${diceModifier}` : diceModifier}</output>{diceModeEffect?.targetSave && <label>Target {diceModeEffect.targetSave.modifier} modifier<input aria-label={`${action.label} target ${diceModeEffect.targetSave.modifier} modifier`} type="number" min="-999" max="999" value={combatInput.saveModifier} onChange={(event) => setCombatInputs((current) => ({ ...current, [action.id]: { ...combatInput, saveModifier: Math.max(-999, Math.min(999, Number(event.target.value) || 0)) } }))} /></label>}{diceModeEffect?.riders?.some((rider) => rider.targetHitDice) && <label>Target Hit Dice<input aria-label={`${action.label} target Hit Dice`} type="number" min="0" max="999" value={Math.max(0, targetHitDice[action.id] ?? actionLevel)} onChange={(event) => setTargetHitDice((current) => ({ ...current, [action.id]: Math.max(0, Math.min(999, Number(event.target.value) || 0)) }))} /></label>}</>}
          {action.activeEffect?.selectEquippedWeapon && <label>Affected weapon<select aria-label={`${action.label} affected weapon`} value={selectedEffectWeaponId} onChange={(event) => setEffectWeaponIds((current) => ({ ...current, [action.id]: event.target.value }))}>{weaponChoices.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name}</option>)}</select></label>}
          {action.rerollAction?.kind === "lower-d20" && <label>Original save total<input aria-label={`${action.label} original save total`} type="number" min="-999" max="999" value={rerollInput.original} onChange={(event) => setRerollInputs((current) => ({ ...current, [action.id]: { ...rerollInput, original: Math.max(-999, Math.min(999, Number(event.target.value) || 0)) } }))} /></label>}
          {action.rerollAction?.kind === "higher-d20" && <label>Original roll total<input aria-label={`${action.label} original roll total`} type="number" min="-999" max="999" value={rerollInput.original} onChange={(event) => setRerollInputs((current) => ({ ...current, [action.id]: { ...rerollInput, original: Math.max(-999, Math.min(999, Number(event.target.value) || 0)) } }))} /></label>}
          {(action.rerollAction?.kind === "d20" || action.rerollAction?.kind === "lower-d20" || action.rerollAction?.kind === "higher-d20") && <label>Modifier<input aria-label={`${action.label} modifier`} type="number" min="-999" max="999" value={rerollInput.modifier} onChange={(event) => setRerollInputs((current) => ({ ...current, [action.id]: { ...rerollInput, modifier: Math.max(-999, Math.min(999, Number(event.target.value) || 0)) } }))} /></label>}
          {action.rerollAction?.kind === "damage" && <><label>Dice<input aria-label={`${action.label} dice count`} type="number" min="1" max="100" value={rerollInput.count} onChange={(event) => setRerollInputs((current) => ({ ...current, [action.id]: { ...rerollInput, count: Math.max(1, Math.min(100, Number(event.target.value) || 1)) } }))} /></label><label>Die<select aria-label={`${action.label} die sides`} value={rerollInput.sides} onChange={(event) => setRerollInputs((current) => ({ ...current, [action.id]: { ...rerollInput, sides: Number(event.target.value) } }))}>{[4, 6, 8, 10, 12, 20, 100].map((sides) => <option value={sides} key={sides}>d{sides}</option>)}</select></label><label>Modifier<input aria-label={`${action.label} modifier`} type="number" min="-999" max="999" value={rerollInput.modifier} onChange={(event) => setRerollInputs((current) => ({ ...current, [action.id]: { ...rerollInput, modifier: Math.max(-999, Math.min(999, Number(event.target.value) || 0)) } }))} /></label></>}
          {action.activeEffect && <>{action.activeEffect.targets.length > 1 && !action.activeEffect.applyToAllTargets && <label>{effectTargetChoiceLabel}<select aria-label={`${action.label} ${effectTargetChoiceLabel.toLowerCase()}`} value={effectTarget} onChange={(event) => setEffectTargets((current) => ({ ...current, [action.id]: event.target.value as ActiveEffectTarget }))}>{action.activeEffect.targets.map((target) => <option key={target} value={target}>{effectTargetLabel(target)}</option>)}</select></label>}{action.activeEffect.skillOptions && action.activeEffect.skillOptions.length > 1 && <label>Affected skill<select aria-label={`${action.label} affected skill`} value={effectSkill} onChange={(event) => setEffectSkills((current) => ({ ...current, [action.id]: event.target.value }))}>{action.activeEffect.skillOptions.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></label>}{effectRange && <small>Range: {effectRange} feet.</small>}{action.activeEffect.fixedRounds ? <small>Duration: {rounds} round{rounds === 1 ? "" : "s"}</small> : <label>Rounds<input aria-label={`${action.label} rounds`} type="number" min="1" max="999" value={rounds} onChange={(event) => setEffectRounds((current) => ({ ...current, [action.id]: Math.max(1, Math.min(999, Number(event.target.value) || 1)) }))} /></label>}</>}
          <button type="button" disabled={(!action.activeEffect && temporaryHitPoints === undefined && appliedChanges.length === 0 && !action.rerollAction && !action.spellLikeAbility && !action.diceRoll && !action.combatRoll && !action.targetEffectRoll) || unavailable || !targetEligible || targetHasSaveEffectImmunity || missingRequiredConfirmation || missingFeatSelection} title={blockedByActorCondition ? `Unavailable while ${action.actorSavingThrow?.blockedByActiveEffectName}.` : targetHasSaveEffectImmunity ? `${saveEffectTargetName} is immune to this ability.` : missingRequiredConfirmation ? "Confirm the required targeting conditions first." : missingFeatSelection ? `Select at least ${requiredFeatSelectionCount} eligible ${action.featSelection?.featType ?? "qualifying"} feat${requiredFeatSelectionCount === 1 ? "" : "s"} first.` : undefined} onClick={activate}>{label}</button>
          <small>{action.summary ?? costs.map(({ cost }) => `Spend ${cost}`).join(" and ")}</small>
          {result && <output aria-label={`${action.label} result`}>{result}</output>}
        </div>;
      })}</div>
      {feature.choiceRequired ? <span className="choice">Configure below</span> : feature.grantsAllOptions ? <span className="choice">Granted automatically</span> : null}
    </li>)}</ol>
  </section>;
}
