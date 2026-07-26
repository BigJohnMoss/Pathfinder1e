import type { CharacterCombatStats as CombatStats, MechanicalBonusSource } from "../../../packages/engine/src/index.js";

type Progression = { baseAttackBonus: number; skillRanks: number; featSlots: number };

const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export function CombatPanel({ combat, modifierSources = [], conditionalModifiers = [] }: {
  combat: CombatStats;
  modifierSources?: MechanicalBonusSource[];
  conditionalModifiers?: Array<{ label: string; bonus?: number; condition: string; source: string }>;
}) {
  return <article className="combat-panel">
    <p className="eyebrow">COMBAT</p>
    <h2>Core statistics</h2>
    <dl>
      <div><dt>Initiative</dt><dd>{signed(combat.initiative)}</dd></div>
      <div><dt>AC / touch / flat-footed</dt><dd>{combat.armorClass.normal} / {combat.armorClass.touch} / {combat.armorClass.flatFooted}</dd></div>
      <div><dt>CMB / CMD</dt><dd>{signed(combat.combatManeuverBonus)} / {combat.combatManeuverDefense}</dd></div>
      <div><dt>Average HP</dt><dd>{combat.averageHitPoints}</dd></div>
    </dl>
    {modifierSources.length > 0 && <section className="conditional-modifiers">
      <h3>Applied feat modifiers</h3>
      <ul>{modifierSources.map((modifier, index) => <li key={`${modifier.source}-${modifier.target}-${index}`}>
        <strong>{signed(modifier.bonus)} {modifier.target}</strong>
        <span>{modifier.source}{modifier.choice ? ` · ${modifier.choice}` : ""}</span>
      </li>)}</ul>
    </section>}
    {conditionalModifiers.length > 0 && <section className="conditional-modifiers">
      <h3>Conditional trait modifiers</h3>
      <ul>{conditionalModifiers.map((modifier, index) => <li key={`${modifier.source}-${modifier.label}-${index}`}>
        <strong>{modifier.bonus === undefined ? modifier.label : `${signed(modifier.bonus)} ${modifier.label}`}</strong>
        <span>{modifier.condition} · {modifier.source}</span>
      </li>)}</ul>
    </section>}
    <p className="hint">Average HP uses maximum 1st-level hit points and rounded-up average rolls thereafter. Conditional modifiers are listed separately so they are only applied when their trigger is present.</p>
  </article>;
}

export function ProgressionSummary({ combat, progression }: { combat: CombatStats; progression: Progression }) {
  return <section className="summary" aria-label="Character progression summary">
    <article><span>BAB</span><strong>{signed(progression.baseAttackBonus)}</strong></article>
    <article><span>Fortitude</span><strong>{signed(combat.saves.fortitude)}</strong></article>
    <article><span>Reflex</span><strong>{signed(combat.saves.reflex)}</strong></article>
    <article><span>Will</span><strong>{signed(combat.saves.will)}</strong></article>
    <article><span>Skill ranks</span><strong>{progression.skillRanks}</strong></article>
    <article><span>Feat slots</span><strong>{progression.featSlots}</strong></article>
  </section>;
}
