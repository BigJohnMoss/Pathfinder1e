export function LevelUpPanel({ currentLevel, classId, classLevel, classChoices, gains, onClassChange, onConfirm, onCancel }: { currentLevel: number; classId: string; classLevel: number; classChoices: Array<{ id: string; name: string }>; gains: string[]; onClassChange: (classId: string) => void; onConfirm: () => void; onCancel: () => void }) {
  const nextLevel = currentLevel + 1;
  const className = classChoices.find((choice) => choice.id === classId)?.name ?? classId;
  return <section className="level-up-panel" aria-label={`Level up to ${nextLevel}`}>
    <div><p className="eyebrow">LEVEL UP</p><h2>Review {className} level {classLevel + 1}</h2><p>Your current selections and inventory will be preserved. New capacity and choices unlock after confirmation.</p>{classChoices.length > 1 && <label>Class receiving this level<select aria-label="Class receiving this level" value={classId} onChange={(event) => onClassChange(event.target.value)}>{classChoices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}</select></label>}</div>
    <div><strong>What changes</strong><ul>{gains.length > 0 ? gains.map((gain) => <li key={gain}>{gain}</li>) : <li>No new selectable features at this level; core statistics still improve.</li>}</ul></div>
    <p className="hint">After leveling, review Basic info for ability increases, Skills for new ranks, Feats for empty slots, Features for class choices, and Spells for newly available spell levels.</p>
    <div className="level-up-actions"><button type="button" onClick={onCancel}>Not yet</button><button type="button" className="primary-action" onClick={onConfirm}>Advance to level {nextLevel}</button></div>
  </section>;
}
