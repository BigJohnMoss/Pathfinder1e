export function LevelUpPanel({ currentLevel, className, gains, onConfirm, onCancel }: { currentLevel: number; className: string; gains: string[]; onConfirm: () => void; onCancel: () => void }) {
  const nextLevel = currentLevel + 1;
  return <section className="level-up-panel" aria-label={`Level up to ${nextLevel}`}>
    <div><p className="eyebrow">LEVEL UP</p><h2>Review {className} level {nextLevel}</h2><p>Your current selections and inventory will be preserved. New capacity and choices unlock after confirmation.</p></div>
    <div><strong>What changes</strong><ul>{gains.length > 0 ? gains.map((gain) => <li key={gain}>{gain}</li>) : <li>No new selectable features at this level; core statistics still improve.</li>}</ul></div>
    <p className="hint">After leveling, review Basic info for ability increases, Skills for new ranks, Feats for empty slots, Features for class choices, and Spells for newly available spell levels.</p>
    <div className="level-up-actions"><button type="button" onClick={onCancel}>Not yet</button><button type="button" className="primary-action" onClick={onConfirm}>Advance to level {nextLevel}</button></div>
  </section>;
}
