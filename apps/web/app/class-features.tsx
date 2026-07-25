type Feature = { id: string; name: string; summary: string; choiceRequired?: boolean };
type DailyResource = { label: string; unit: string; maximum: number; used: number; onUsedChange: (used: number) => void };

export function ClassFeatures({ level, className, features, dailyResource }: { level: number; className: string; features: Feature[]; dailyResource?: DailyResource }) {
  const used = dailyResource ? Math.min(dailyResource.used, dailyResource.maximum) : 0;
  const remaining = dailyResource ? dailyResource.maximum - used : 0;
  return <section className="features"><div><p className="eyebrow">LEVEL {level}</p><h2>{className} features</h2><p>Review everything earned at this level, then configure required class choices below.</p></div>{dailyResource && <div className="daily-resource"><div><strong>{dailyResource.label}</strong><output aria-label={`${dailyResource.label} remaining`}>{remaining}/{dailyResource.maximum} {dailyResource.unit} remaining</output></div><div><button type="button" onClick={() => dailyResource.onUsedChange(used + 1)} disabled={remaining <= 0}>Spend 1 {dailyResource.unit}</button><button type="button" onClick={() => dailyResource.onUsedChange(0)} disabled={used === 0}>Refresh {dailyResource.label.toLowerCase()}</button></div></div>}<ol>{features.map((feature) => <li key={feature.id}><div><strong>{feature.name}</strong><p>{feature.summary}</p></div>{feature.choiceRequired && <span className="choice">Configure below</span>}</li>)}</ol></section>;
}
