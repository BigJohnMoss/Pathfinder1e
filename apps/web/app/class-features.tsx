import { useState } from "react";
import type { ActiveEffect, ActiveEffectTarget, ClassFeatureOccurrence as Feature } from "../../../packages/types/src/index.js";

export type DailyResource = {
  id?: string;
  label: string;
  unit: string;
  maximum: number | null;
  used: number;
  onUsedChange: (used: number) => void;
};

const effectTargetLabel = (target: ActiveEffectTarget) => target.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

export function ClassFeatures({ level, className, features, dailyResources = [], onAddEffect }: {
  level: number;
  className: string;
  features: Feature[];
  dailyResources?: DailyResource[];
  onAddEffect?: (effect: ActiveEffect) => void;
}) {
  const [variableAmounts, setVariableAmounts] = useState<Record<string, number>>({});
  const [actionResults, setActionResults] = useState<Record<string, string>>({});
  const [effectTargets, setEffectTargets] = useState<Record<string, ActiveEffectTarget>>({});
  const [effectRounds, setEffectRounds] = useState<Record<string, number>>({});

  return <section className="features">
    <div><p className="eyebrow">LEVEL {level}</p><h2>{className} features</h2><p>Review everything earned at this level, then configure required class choices below.</p></div>
    {dailyResources.map((resource) => {
      const atWill = resource.maximum === null;
      const used = atWill ? 0 : Math.min(resource.used, resource.maximum ?? 0);
      const remaining = atWill ? 0 : (resource.maximum ?? 0) - used;
      return <div className="daily-resource" key={resource.label}>
        <div><strong>{resource.label}</strong><output aria-label={`${resource.label} remaining`}>{atWill ? "At will" : `${remaining}/${resource.maximum} ${resource.unit} remaining`}</output></div>
        {!atWill && <div><button type="button" onClick={() => resource.onUsedChange(used + 1)} disabled={remaining <= 0}>Spend 1 {resource.unit}</button><button type="button" onClick={() => resource.onUsedChange(0)} disabled={used === 0}>Refresh {resource.label.toLowerCase()}</button></div>}
      </div>;
    })}
    <ol>{features.map((feature) => <li key={feature.id}>
      <div><strong>{feature.name}</strong><p>{feature.summary}</p>{feature.resourceActions?.map((action) => {
        const costs = action.costs ?? (action.resourceId && action.cost !== undefined ? [{ resourceId: action.resourceId, cost: action.cost }] : []);
        const changes = action.changes ?? costs.map(({ resourceId, cost }) => ({ resourceId, usedDelta: cost }));
        const variableMaximum = action.variableRecovery
          ? Math.max(action.variableRecovery.minimum ?? 0, Math.min(action.variableRecovery.maximum ?? Number.POSITIVE_INFINITY, action.variableRecovery.levelDivisor ? Math.floor(level / action.variableRecovery.levelDivisor) : Number.POSITIVE_INFINITY))
          : 0;
        const variableAmount = action.variableRecovery ? Math.max(action.variableRecovery.minimum ?? 0, Math.min(variableAmounts[action.id] ?? variableMaximum, variableMaximum)) : 0;
        const appliedChanges = action.variableRecovery
          ? [...changes, { resourceId: action.variableRecovery.resourceId, usedDelta: -variableAmount }]
          : changes;
        const resources = appliedChanges.map((change) => ({ ...change, resource: dailyResources.find((candidate) => candidate.id === change.resourceId) }));
        const unavailable = resources.some(({ usedDelta, resource }) => !resource || (usedDelta > 0 && resource.maximum !== null && Math.max(0, resource.maximum - resource.used) < usedDelta) || (usedDelta < 0 && resource.used <= 0 && !action.variableRecovery));
        const useCount = Math.max(0, resources[0]?.resource?.used ?? 0);
        const label = action.labelsByUseCount?.[Math.min(useCount, action.labelsByUseCount.length - 1)] ?? action.label;
        const result = actionResults[action.id];
        const effectTarget = action.activeEffect ? effectTargets[action.id] ?? action.activeEffect.targets[0] : undefined;
        const rounds = action.activeEffect ? Math.max(1, Math.min(999, effectRounds[action.id] ?? action.activeEffect.defaultRounds ?? 10)) : 0;
        const effectBonus = action.activeEffect ? (action.activeEffect.improvedAtLevel && level >= action.activeEffect.improvedAtLevel ? action.activeEffect.improvedBonus ?? action.activeEffect.bonus : action.activeEffect.bonus) : 0;
        const activate = () => {
          resources.forEach(({ usedDelta, resource }) => resource?.onUsedChange(resource.used + usedDelta));
          if (action.activeEffect && effectTarget && onAddEffect) onAddEffect({
            id: `${action.id}-${Date.now()}-${Math.random()}`,
            name: action.activeEffect.name,
            target: effectTarget,
            bonus: effectBonus,
            roundsRemaining: rounds,
          });
          if (action.randomOutcomes?.length) {
            const outcome = action.randomOutcomes[Math.floor(Math.random() * action.randomOutcomes.length)];
            setActionResults((current) => ({ ...current, [action.id]: `${outcome.label}: ${outcome.summary}` }));
          }
        };
        return <div className="feature-resource-action" key={action.id}>
          {action.variableRecovery && <label>{action.variableRecovery.label}<input type="number" min={action.variableRecovery.minimum ?? 0} max={variableMaximum} value={variableAmount} onChange={(event) => setVariableAmounts((current) => ({ ...current, [action.id]: Math.max(action.variableRecovery!.minimum ?? 0, Math.min(Number(event.target.value) || 0, variableMaximum)) }))} /></label>}
          {action.activeEffect && <><label>Affected ability<select aria-label={`${action.label} affected ability`} value={effectTarget} onChange={(event) => setEffectTargets((current) => ({ ...current, [action.id]: event.target.value as ActiveEffectTarget }))}>{action.activeEffect.targets.map((target) => <option key={target} value={target}>{effectTargetLabel(target)}</option>)}</select></label><label>Rounds<input aria-label={`${action.label} rounds`} type="number" min="1" max="999" value={rounds} onChange={(event) => setEffectRounds((current) => ({ ...current, [action.id]: Math.max(1, Math.min(999, Number(event.target.value) || 1)) }))} /></label></>}
          <button type="button" disabled={appliedChanges.length === 0 || unavailable} onClick={activate}>{label}</button>
          <small>{action.summary ?? costs.map(({ cost }) => `Spend ${cost}`).join(" and ")}</small>
          {result && <output aria-label={`${action.label} result`}>{result}</output>}
        </div>;
      })}</div>
      {feature.choiceRequired ? <span className="choice">Configure below</span> : feature.grantsAllOptions ? <span className="choice">Granted automatically</span> : null}
    </li>)}</ol>
  </section>;
}
