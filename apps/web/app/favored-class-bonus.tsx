export function FavoredClassBonus({ className, level, hitPoints, skillRanks, onChange }: {
  className: string;
  level: number;
  hitPoints: number;
  skillRanks: number;
  onChange: (hitPoints: number, skillRanks: number) => void;
}) {
  const allocated = hitPoints + skillRanks;
  const remaining = level - allocated;
  const updateHitPoints = (value: number) => {
    const next = Math.max(0, Math.min(level - skillRanks, value || 0));
    onChange(next, skillRanks);
  };
  const updateSkillRanks = (value: number) => {
    const next = Math.max(0, Math.min(level - hitPoints, value || 0));
    onChange(hitPoints, next);
  };
  return <section className="favored-class-bonus" aria-labelledby="favored-class-heading">
    <div>
      <p className="eyebrow">FAVORED CLASS</p>
      <h2 id="favored-class-heading">{className} bonuses</h2>
      <p>For each {className} level, assign either +1 hit point or +1 skill rank.</p>
    </div>
    <div className="favored-class-controls">
      <label>Bonus hit points<input aria-label="Favored class bonus hit points" type="number" min="0" max={level - skillRanks} value={hitPoints} onChange={event => updateHitPoints(Number(event.target.value))} /></label>
      <label>Bonus skill ranks<input aria-label="Favored class bonus skill ranks" type="number" min="0" max={level - hitPoints} value={skillRanks} onChange={event => updateSkillRanks(Number(event.target.value))} /></label>
    </div>
    <div className="favored-class-actions">
      <button type="button" disabled={remaining === 0} onClick={() => onChange(hitPoints + remaining, skillRanks)}>Assign remaining to hit points</button>
      <button type="button" disabled={remaining === 0} onClick={() => onChange(hitPoints, skillRanks + remaining)}>Assign remaining to skill ranks</button>
      <button type="button" disabled={allocated === 0} onClick={() => onChange(0, 0)}>Clear bonuses</button>
    </div>
    <p className={`hint${remaining > 0 ? " invalid" : ""}`} aria-live="polite"><strong>{allocated}</strong> of {level} favored-class bonuses assigned Â· {remaining} remaining.</p>
  </section>;
}

