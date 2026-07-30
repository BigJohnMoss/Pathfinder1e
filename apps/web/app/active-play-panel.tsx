import { useState } from "react";
import type { ActiveEffect, ActiveEffectTarget } from "../../../packages/types/src/index.js";
import type { EquipmentAttack } from "./equipment-panel";

const targets: Array<{ id: ActiveEffectTarget; name: string }> = [
  { id: "initiative", name: "Initiative" },
  { id: "armorClass", name: "Armor Class" },
  { id: "fortitude", name: "Fortitude" },
  { id: "reflex", name: "Reflex" },
  { id: "will", name: "Will" }
];

export function ActivePlayPanel({ maximumHitPoints, currentHitPoints, temporaryHitPoints, attacks, effects, onCurrentHitPointsChange, onTemporaryHitPointsChange, onEffectsChange }: {
  maximumHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  attacks: EquipmentAttack[];
  effects: ActiveEffect[];
  onCurrentHitPointsChange: (value: number) => void;
  onTemporaryHitPointsChange: (value: number) => void;
  onEffectsChange: (effects: ActiveEffect[]) => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState<ActiveEffectTarget>("armorClass");
  const [bonus, setBonus] = useState(1);
  const [rounds, setRounds] = useState(1);
  const [adjustment, setAdjustment] = useState(1);
  const [combatRound, setCombatRound] = useState(1);
  const [rollResult, setRollResult] = useState("");
  const advanceRound = () => {
    setCombatRound((current) => current + 1);
    onEffectsChange(effects.flatMap(effect => effect.roundsRemaining > 1 ? [{ ...effect, roundsRemaining: effect.roundsRemaining - 1 }] : []));
  };
  const takeDamage = () => {
    const absorbed = Math.min(temporaryHitPoints, adjustment);
    onTemporaryHitPointsChange(temporaryHitPoints - absorbed);
    onCurrentHitPointsChange(Math.max(0, currentHitPoints - (adjustment - absorbed)));
  };
  const heal = () => onCurrentHitPointsChange(Math.min(maximumHitPoints, currentHitPoints + adjustment));
  const rollAttack = (attack: EquipmentAttack) => {
    const die = Math.floor(Math.random() * 20) + 1;
    setRollResult(`${attack.name}: ${die} ${die === 20 ? "(natural 20)" : die === 1 ? "(natural 1)" : `+ ${attack.attack} = ${die + attack.attack}`}`);
  };
  const addEffect = () => {
    if (!name.trim()) return;
    onEffectsChange([...effects, { id: globalThis.crypto?.randomUUID?.() ?? `effect-${Date.now()}`, name: name.trim(), target, bonus, roundsRemaining: rounds }]);
    setName("");
  };

  return <section className="active-play" aria-labelledby="active-play-heading">
    <div className="active-play-heading">
      <div><p className="eyebrow">ACTIVE PLAY</p><h3 id="active-play-heading">Hit points and temporary effects</h3></div>
      <div className="round-controls"><strong aria-label={`Combat round ${combatRound}`}>Round {combatRound}</strong><button type="button" onClick={advanceRound}>Next round</button><button type="button" className="secondary-button" onClick={() => setCombatRound(1)}>Reset rounds</button></div>
    </div>
    <div className="hit-point-controls">
      <label>Current HP<input aria-label="Current HP" type="number" min="0" max="9999" value={currentHitPoints} onChange={event => onCurrentHitPointsChange(Math.max(0, Math.min(9999, Number(event.target.value) || 0)))} /></label>
      <p>of <strong>{maximumHitPoints}</strong> maximum</p>
      <label>Temporary HP<input aria-label="Temporary HP" type="number" min="0" max="9999" value={temporaryHitPoints} onChange={event => onTemporaryHitPointsChange(Math.max(0, Math.min(9999, Number(event.target.value) || 0)))} /></label>
      <button type="button" onClick={() => { onCurrentHitPointsChange(maximumHitPoints); onTemporaryHitPointsChange(0); }}>Heal to full</button>
    </div>
    <div className="quick-hp-controls">
      <label>Amount<input aria-label="Hit point adjustment" type="number" min="1" max="9999" value={adjustment} onChange={(event) => setAdjustment(Math.max(1, Math.min(9999, Number(event.target.value) || 1)))} /></label>
      <button type="button" className="damage-button" onClick={takeDamage}>Take {adjustment} damage</button>
      <button type="button" onClick={heal}>Heal {adjustment} HP</button>
      <small>Damage uses temporary HP before current HP.</small>
    </div>
    <section className="combat-attacks" aria-labelledby="combat-attacks-heading">
      <div><h4 id="combat-attacks-heading">Equipped attacks</h4><p>Attack values include abilities, enhancement bonuses, and supported feat modifiers.</p></div>
      {attacks.length === 0 ? <p className="hint">Equip a weapon in Inventory to add it here.</p> : <div>{attacks.map((attack) => <article key={attack.id}>
        <div><strong>{attack.name}</strong><span>Attack {attack.attack >= 0 ? "+" : ""}{attack.attack} · Damage {attack.damage}{attack.damageBonus ? ` ${attack.damageBonus >= 0 ? "+" : ""}${attack.damageBonus}` : ""}</span><small>Critical {attack.critical}{attack.range ? ` · Range ${attack.range} ft.` : ""}</small></div>
        <button type="button" onClick={() => rollAttack(attack)}>Roll attack</button>
      </article>)}</div>}
      {rollResult && <output aria-live="polite">{rollResult}</output>}
    </section>
    <div className="effect-form">
      <label>Effect name<input value={name} maxLength={80} placeholder="Bless" onChange={event => setName(event.target.value)} /></label>
      <label>Affects<select value={target} onChange={event => setTarget(event.target.value as ActiveEffectTarget)}>{targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Modifier<input type="number" min="-20" max="20" value={bonus} onChange={event => setBonus(Math.max(-20, Math.min(20, Number(event.target.value) || 0)))} /></label>
      <label>Rounds<input type="number" min="1" max="999" value={rounds} onChange={event => setRounds(Math.max(1, Math.min(999, Number(event.target.value) || 1)))} /></label>
      <button type="button" onClick={addEffect} disabled={!name.trim()}>Add effect</button>
    </div>
    {effects.length > 0 ? <ul className="active-effect-list">{effects.map(effect => <li key={effect.id}>
      <div><strong>{effect.name}</strong><span>{effect.bonus >= 0 ? "+" : ""}{effect.bonus} {targets.find(item => item.id === effect.target)?.name} · {effect.roundsRemaining} round{effect.roundsRemaining === 1 ? "" : "s"}</span></div>
      <button type="button" aria-label={`Remove ${effect.name}`} onClick={() => onEffectsChange(effects.filter(item => item.id !== effect.id))}>Remove</button>
    </li>)}</ul> : <p className="hint">No temporary effects are active.</p>}
  </section>;
}
