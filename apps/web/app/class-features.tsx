type Feature = { id: string; name: string; summary: string; choiceRequired?: boolean };

export function ClassFeatures({ level, className, features }: { level: number; className: string; features: Feature[] }) {
  return <section className="features"><div><p className="eyebrow">LEVEL {level}</p><h2>{className} features</h2><p>Feat slots and skill ranks reflect the selected ancestry, including the fourfold 1st-level allocation.</p></div><ol>{features.map((feature) => <li key={feature.id}><div><strong>{feature.name}</strong><p>{feature.summary}</p></div>{feature.choiceRequired && <span className="choice">Choose</span>}</li>)}</ol></section>;
}
