type Feature = { id: string; name: string; summary: string; choiceRequired?: boolean };

export function ClassFeatures({ level, className, features }: { level: number; className: string; features: Feature[] }) {
  return <section className="features"><div><p className="eyebrow">LEVEL {level}</p><h2>{className} features</h2><p>Review everything earned at this level, then configure required class choices below.</p></div><ol>{features.map((feature) => <li key={feature.id}><div><strong>{feature.name}</strong><p>{feature.summary}</p></div>{feature.choiceRequired && <span className="choice">Configure below</span>}</li>)}</ol></section>;
}
