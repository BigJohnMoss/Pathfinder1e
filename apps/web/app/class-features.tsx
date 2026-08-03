import type { ClassFeatureOccurrence as Feature } from "../../../packages/types/src/index.js";
export type DailyResource = { id?: string; label: string; unit: string; maximum: number | null; used: number; onUsedChange: (used: number) => void };

export function ClassFeatures({ level, className, features, dailyResources = [] }: { level: number; className: string; features: Feature[]; dailyResources?: DailyResource[] }) {
  return <section className="features"><div><p className="eyebrow">LEVEL {level}</p><h2>{className} features</h2><p>Review everything earned at this level, then configure required class choices below.</p></div>{dailyResources.map((resource) => {
    const atWill = resource.maximum === null;
    const used = atWill ? 0 : Math.min(resource.used, resource.maximum ?? 0);
    const remaining = atWill ? 0 : (resource.maximum ?? 0) - used;
    return <div className="daily-resource" key={resource.label}><div><strong>{resource.label}</strong><output aria-label={`${resource.label} remaining`}>{atWill ? "At will" : `${remaining}/${resource.maximum} ${resource.unit} remaining`}</output></div>{!atWill && <div><button type="button" onClick={() => resource.onUsedChange(used + 1)} disabled={remaining <= 0}>Spend 1 {resource.unit}</button><button type="button" onClick={() => resource.onUsedChange(0)} disabled={used === 0}>Refresh {resource.label.toLowerCase()}</button></div>}</div>;
  })}<ol>{features.map((feature) => <li key={feature.id}><div><strong>{feature.name}</strong><p>{feature.summary}</p>{feature.resourceActions?.map((action) => {
    const costs = action.costs ?? (action.resourceId && action.cost !== undefined ? [{ resourceId: action.resourceId, cost: action.cost }] : []);
    const changes = action.changes ?? costs.map(({ resourceId, cost }) => ({ resourceId, usedDelta: cost }));
    const resources = changes.map((change) => ({ ...change, resource: dailyResources.find((candidate) => candidate.id === change.resourceId) }));
    const unavailable = resources.some(({ usedDelta, resource }) => !resource || (usedDelta > 0 && resource.maximum !== null && Math.max(0, resource.maximum - resource.used) < usedDelta) || (usedDelta < 0 && resource.used <= 0));
    const useCount = Math.max(0, resources[0]?.resource?.used ?? 0);
    const label = action.labelsByUseCount?.[Math.min(useCount, action.labelsByUseCount.length - 1)] ?? action.label;
    return <div className="feature-resource-action" key={action.id}><button type="button" disabled={changes.length === 0 || unavailable} onClick={() => resources.forEach(({ usedDelta, resource }) => resource?.onUsedChange(resource.used + usedDelta))}>{label}</button><small>{action.summary ?? costs.map(({ cost }) => `Spend ${cost}`).join(" and ")}</small></div>;
  })}</div>{feature.choiceRequired ? <span className="choice">Configure below</span> : feature.grantsAllOptions ? <span className="choice">Granted automatically</span> : null}</li>)}</ol></section>;
}
