import type { ClassFeatureOccurrence as Feature } from "../../../packages/types/src/index.js";
type DailyResource = { label: string; unit: string; maximum: number | null; used: number; onUsedChange: (used: number) => void };

export function ClassFeatures({ level, className, features, dailyResources = [] }: { level: number; className: string; features: Feature[]; dailyResources?: DailyResource[] }) {
  return <section className="features"><div><p className="eyebrow">LEVEL {level}</p><h2>{className} features</h2><p>Review everything earned at this level, then configure required class choices below.</p></div>{dailyResources.map((resource) => {
    const atWill = resource.maximum === null;
    const used = atWill ? 0 : Math.min(resource.used, resource.maximum ?? 0);
    const remaining = atWill ? 0 : (resource.maximum ?? 0) - used;
    return <div className="daily-resource" key={resource.label}><div><strong>{resource.label}</strong><output aria-label={`${resource.label} remaining`}>{atWill ? "At will" : `${remaining}/${resource.maximum} ${resource.unit} remaining`}</output></div>{!atWill && <div><button type="button" onClick={() => resource.onUsedChange(used + 1)} disabled={remaining <= 0}>Spend 1 {resource.unit}</button><button type="button" onClick={() => resource.onUsedChange(0)} disabled={used === 0}>Refresh {resource.label.toLowerCase()}</button></div>}</div>;
  })}<ol>{features.map((feature) => <li key={feature.id}><div><strong>{feature.name}</strong><p>{feature.summary}</p></div>{feature.choiceRequired && <span className="choice">Configure below</span>}</li>)}</ol></section>;
}
