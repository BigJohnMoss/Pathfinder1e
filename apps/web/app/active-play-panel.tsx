import { useState } from "react";
import type { ActiveEffect, ActiveEffectTarget } from "../../../packages/types/src/index.js";

const targets: Array<{ id: ActiveEffectTarget; name: string }> = [
  { id: "initiative", name: "Initiative" },
  { id: "armorClass", name: "Armor Class" },
  { id: "fortitude", name: "Fortitude" },
  { id: "reflex", name: "Reflex" },
  { id: "will", name: "Will" }
];

export function ActivePlayPanel({ maximumHitPoints, currentHitPoints, temporaryHitPoints, effects, onCurrentHitPointsChange, onTemporaryHitPointsChange, onEffectsChange }: {
  maximumHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  effects: ActiveEffect[];
  onCurrentHitPointsChange: (value: number) => void;
  onTemporaryHitPointsChange: (value: number) => void;
  onEffectsChange: (effects: ActiveEffect[]) => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState<ActiveEffectTarget>("armorClass");
  const [bonus, setBonus] = useState(1);
  const [rounds, setRounds] = useState(1);
  const advanceRound = () => onEffectsChange(effects.flatMap(effect => effect.roundsRemaining > 1 ? [{ ...effect, roundsRemaining: effect.roundsRemaining - 1 }] : []));
  const addEffect = () => {
    if (!name.trim()) return;
    onEffectsChange([...effects, { id: globalThis.crypto?.randomUUID?.() ?? `effect-${Date.now()}`, name: name.trim(), target, bonus, roundsRemaining: rounds }]);
    setName("");
  };

  return <section className="active-play" aria-labelledby="active-play-heading">
    <div className="active-play-heading">
      <div><p className="eyebrow">ACTIVE PLAY</p><h3 id="active-play-heading">Hit points and temporary effects</h3></div>
      <button type="button" onClick={advanceRound} disabled={effects.length === 0} aria-label="Advance one round">Advance round</button>
    </div>
    <div className="hit-point-controls" role="group" aria-label="Hit point controls">
      <label>Current HP<input aria-label="Current HP" type="number" min="0" max="9999" value={currentHitPoints} onChange={event => onCurrentHitPointsChange(Math.max(0, Math.min(9999, Number(event.target.value) || 0)))} /></label>
      <p>of <strong>{maximumHitPoints}</strong> maximum</p>
      <label>Temporary HP<input aria-label="Temporary HP" type="number" min="0" max="9999" value={temporaryHitPoints} onChange={event => onTemporaryHitPointsChange(Math.max(0, Math.min(9999, Number(event.target.value) || 0)))} /></label>
      <button type="button" onClick={() => { onCurrentHitPointsChange(maximumHitPoints); onTemporaryHitPointsChange(0); }}>Heal to full</button>
    </div>
    <div className="effect-form" role="group" aria-label="Add temporary effect">
      <label>Effect name<input value={name} maxLength={80} placeholder="Bless" onChange={event => setName(event.target.value)} /></label>
      <label>Affects<select value={target} onChange={event => setTarget(event.target.value as ActiveEffectTarget)}>{targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Modifier<input type="number" min="-20" max="20" value={bonus} onChange={event => setBonus(Math.max(-20, Math.min(20, Number(event.target.value) || 0)))} /></label>
      <label>Rounds<input type="number" min="1" max="999" value={rounds} onChange={event => setRounds(Math.max(1, Math.min(999, Number(event.target.value) || 1)))} /></label>
      <button type="button" onClick={addEffect} disabled={!name.trim()}>Add effect</button>
    </div>
    {effects.length > 0 ? <ul className="active-effect-list" role="list" aria-label="Active effects">{effects.map(effect => <li key={effect.id}>
      <div><strong>{effect.name}</strong><span>{effect.bonus >= 0 ? "+" : ""}{effect.bonus} {targets.find(item => item.id === effect.target)?.name} · {effect.roundsRemaining} round{effect.roundsRemaining === 1 ? "" : "s"}</span></div>
      <button type="button" aria-label={`Remove ${effect.name}`} onClick={() => onEffectsChange(effects.filter(item => item.id !== effect.id))}>Remove</button>
    </li>)}</ul> : <p className="hint">No temporary effects are active.</p>}
  </section>;
}
