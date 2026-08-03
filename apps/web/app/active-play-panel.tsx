import { useState } from "react";
import type { ActiveEffect, ActiveEffectTarget } from "../../../packages/types/src/index.js";
import { confirmCriticalThreat, resolveAttackRoll, rollD20Check, rollDice } from "../../../packages/engine/src/index.js";
import type { EquipmentAttack } from "./equipment-panel";

type CheckRoll = { id: string; name: string; modifier: number };
type RollHistory = { id: string; label: string; formula: string; rolls: number[]; total: number; outcome?: string; verdict?: string };

const targets: Array<{ id: ActiveEffectTarget; name: string }> = [
  { id: "initiative", name: "Initiative" },
  { id: "armorClass", name: "Armor Class" },
  { id: "fortitude", name: "Fortitude" },
  { id: "reflex", name: "Reflex" },
  { id: "will", name: "Will" },
  { id: "strength", name: "Strength" },
  { id: "dexterity", name: "Dexterity" },
  { id: "constitution", name: "Constitution" },
  { id: "intelligence", name: "Intelligence" },
  { id: "wisdom", name: "Wisdom" },
  { id: "charisma", name: "Charisma" }
];

const effectTargetName = (target: ActiveEffectTarget) =>
  target === "allies" ? "Allies"
    : target === "self" ? "Self"
      : target === "area" ? "Area"
        : targets.find(item => item.id === target)?.name;

export function ActivePlayPanel({ maximumHitPoints, currentHitPoints, temporaryHitPoints, attacks, checks, skills, effects, onCurrentHitPointsChange, onTemporaryHitPointsChange, onEffectsChange }: {
  maximumHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  attacks: EquipmentAttack[];
  checks: CheckRoll[];
  skills: CheckRoll[];
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
  const [rollHistory, setRollHistory] = useState<RollHistory[]>([]);
  const [selectedSkill, setSelectedSkill] = useState(skills[0]?.id ?? "");
  const [customCount, setCustomCount] = useState(1);
  const [customSides, setCustomSides] = useState(20);
  const [customModifier, setCustomModifier] = useState(0);
  const [targetArmorClass, setTargetArmorClass] = useState(10);
  const recordRoll = (roll: Omit<RollHistory, "id">) =>
    setRollHistory(current => [{ ...roll, id: globalThis.crypto?.randomUUID?.() ?? `roll-${Date.now()}-${Math.random()}` }, ...current].slice(0, 20));
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
    const result = rollD20Check(attack.attack);
    recordRoll({ label: `${attack.name} attack`, formula: `1d20 ${attack.attack >= 0 ? "+" : "−"} ${Math.abs(attack.attack)}`, rolls: result.rolls, total: result.total, outcome: result.outcome });
    const resolution = resolveAttackRoll(result, targetArmorClass, attack.critical);
    const verdict = resolution.criticalThreat
      ? `Critical threat against AC ${targetArmorClass}`
      : `${resolution.hit ? "Hit" : "Miss"} against AC ${targetArmorClass}`;
    setRollHistory(current => current.map((roll, index) => index === 0 ? { ...roll, verdict, formula: `${roll.formula} · ${verdict}` } : roll));
    if (resolution.criticalThreat) {
      const confirmationRoll = rollD20Check(attack.attack);
      const confirmation = confirmCriticalThreat(resolution, confirmationRoll);
      const confirmationVerdict = confirmation.confirmed
        ? `Critical confirmed (×${resolution.criticalMultiplier} damage) against AC ${targetArmorClass}`
        : `Critical not confirmed; attack remains a hit against AC ${targetArmorClass}`;
      recordRoll({
        label: `${attack.name} critical confirmation`,
        formula: `1d20 ${attack.attack >= 0 ? "+" : "−"} ${Math.abs(attack.attack)} · ${confirmationVerdict}`,
        rolls: confirmationRoll.rolls,
        total: confirmationRoll.total,
        outcome: confirmationRoll.outcome,
        verdict: confirmationVerdict,
      });
    }
  };
  const rollDamage = (attack: EquipmentAttack) => {
    const match = attack.damage.match(/^(\d+)d(\d+)$/i);
    if (!match) return;
    const result = rollDice(Number(match[1]), Number(match[2]), attack.damageBonus);
    recordRoll({ label: `${attack.name} damage`, formula: `${attack.damage}${attack.damageBonus ? ` ${attack.damageBonus >= 0 ? "+" : "−"} ${Math.abs(attack.damageBonus)}` : ""}`, rolls: result.rolls, total: result.total });
  };
  const rollCheck = (check: CheckRoll) => {
    const result = rollD20Check(check.modifier);
    recordRoll({ label: check.name, formula: `1d20 ${check.modifier >= 0 ? "+" : "−"} ${Math.abs(check.modifier)}`, rolls: result.rolls, total: result.total, outcome: result.outcome });
  };
  const rollCustom = () => {
    const result = rollDice(customCount, customSides, customModifier);
    recordRoll({ label: "Custom roll", formula: `${customCount}d${customSides}${customModifier ? ` ${customModifier >= 0 ? "+" : "−"} ${Math.abs(customModifier)}` : ""}`, rolls: result.rolls, total: result.total });
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
      <div className="combat-attacks-heading"><div><h4 id="combat-attacks-heading">Equipped attacks</h4><p>Attack values include abilities, enhancement bonuses, and supported feat modifiers.</p></div><label>Target AC<input aria-label="Target Armor Class" type="number" min="1" max="999" value={targetArmorClass} onChange={event => setTargetArmorClass(Math.max(1, Math.min(999, Number(event.target.value) || 1)))} /></label></div>
      {attacks.length === 0 ? <p className="hint">Equip a weapon in Inventory to add it here.</p> : <div>{attacks.map((attack) => <article key={attack.id}>
        <div><strong>{attack.name}</strong><span>Attack {attack.attack >= 0 ? "+" : ""}{attack.attack} · Damage {attack.damage}{attack.damageBonus ? ` ${attack.damageBonus >= 0 ? "+" : ""}${attack.damageBonus}` : ""}</span><small>Critical {attack.critical}{attack.range ? ` · Range ${attack.range} ft.` : ""}</small></div>
        <div className="attack-roll-actions"><button type="button" onClick={() => rollAttack(attack)}>Roll {attack.name} attack</button><button type="button" className="secondary-button" onClick={() => rollDamage(attack)}>Roll {attack.name} damage</button></div>
      </article>)}</div>}
    </section>
    <section className="combat-roller" aria-labelledby="combat-roller-heading">
      <div><p className="eyebrow">DICE</p><h4 id="combat-roller-heading">Checks and custom rolls</h4><p>Modifiers include your current character statistics and active effects.</p></div>
      <div className="quick-rolls">{checks.map(check => <button type="button" key={check.id} aria-label={`${check.name.replace(/ save$/i, "")} roll, modifier ${check.modifier >= 0 ? "+" : ""}${check.modifier}`} onClick={() => rollCheck(check)}>Roll {check.name} <span>{check.modifier >= 0 ? "+" : ""}{check.modifier}</span></button>)}</div>
      <div className="skill-roll">
        <label>Skill<select aria-label="Skill to roll" value={selectedSkill} onChange={event => setSelectedSkill(event.target.value)}>{skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name} ({skill.modifier >= 0 ? "+" : ""}{skill.modifier})</option>)}</select></label>
        <button type="button" disabled={!selectedSkill} onClick={() => { const skill = skills.find(item => item.id === selectedSkill); if (skill) rollCheck(skill); }}>Roll selected skill</button>
      </div>
      <div className="custom-roll">
        <label>Dice<input aria-label="Custom dice count" type="number" min="1" max="100" value={customCount} onChange={event => setCustomCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} /></label>
        <label>Sides<select aria-label="Custom die sides" value={customSides} onChange={event => setCustomSides(Number(event.target.value))}>{[4,6,8,10,12,20,100].map(sides => <option key={sides} value={sides}>d{sides}</option>)}</select></label>
        <label>Modifier<input aria-label="Custom roll modifier" type="number" min="-999" max="999" value={customModifier} onChange={event => setCustomModifier(Math.max(-999, Math.min(999, Number(event.target.value) || 0)))} /></label>
        <button type="button" onClick={rollCustom}>Roll custom dice</button>
      </div>
    </section>
    <section className="roll-history" aria-labelledby="roll-history-heading">
      <div><h4 id="roll-history-heading">Roll history</h4>{rollHistory.length > 0 && <button type="button" className="secondary-button" onClick={() => setRollHistory([])}>Clear rolls</button>}</div>
      {rollHistory.length === 0 ? <p className="hint">Your latest 20 rolls will appear here.</p> : <ol aria-live="polite">{rollHistory.map(roll => <li key={roll.id}><div><strong>{roll.label}</strong><span>{roll.formula} · dice [{roll.rolls.join(", ")}]{roll.outcome === "natural-20" ? " · natural 20" : roll.outcome === "natural-1" ? " · natural 1" : ""}</span></div><output aria-label={`${roll.label} total`}>{roll.total}</output></li>)}</ol>}
    </section>
    <div className="effect-form">
      <label>Effect name<input value={name} maxLength={80} placeholder="Bless" onChange={event => setName(event.target.value)} /></label>
      <label>Affects<select value={target} onChange={event => setTarget(event.target.value as ActiveEffectTarget)}>{targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Modifier<input type="number" min="-20" max="20" value={bonus} onChange={event => setBonus(Math.max(-20, Math.min(20, Number(event.target.value) || 0)))} /></label>
      <label>Rounds<input type="number" min="1" max="999" value={rounds} onChange={event => setRounds(Math.max(1, Math.min(999, Number(event.target.value) || 1)))} /></label>
      <button type="button" onClick={addEffect} disabled={!name.trim()}>Add effect</button>
    </div>
    {effects.length > 0 ? <ul className="active-effect-list">{effects.map(effect => <li key={effect.id}>
      <div><strong>{effect.name}</strong><span>{effect.description ?? `${effect.bonus >= 0 ? "+" : ""}${effect.bonus} ${effectTargetName(effect.target)}`} · {effect.roundsRemaining} round{effect.roundsRemaining === 1 ? "" : "s"}</span></div>
      <button type="button" aria-label={`Remove ${effect.name}`} onClick={() => onEffectsChange(effects.filter(item => item.id !== effect.id))}>Remove</button>
    </li>)}</ul> : <p className="hint">No temporary effects are active.</p>}
  </section>;
}
