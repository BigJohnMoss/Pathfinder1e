import type { CharacterCombatStats as CombatStats, MechanicalBonusSource } from "../../../packages/engine/src/index.js";

type Progression = { baseAttackBonus: number; skillRanks: number; featSlots: number };

const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export function CombatPanel({ combat, landSpeed, senses = [], defenses = [], modifierSources = [], conditionalModifiers = [] }: {
  combat: CombatStats;
  landSpeed: { speed: number; baseSpeed: number; armorCategory: string; load: string; adjustments: Array<{ label: string; bonus: number; source: string }> };
  senses?: Array<{ sense: string; label: string; operation: "grant" | "increase"; range?: number; condition?: string; source: string }>;
  defenses?: Array<{ kind: "damageReduction" | "energyResistance" | "spellResistance" | "immunity" | "evasion" | "improvedEvasion" | "uncannyDodge" | "improvedUncannyDodge" | "fortification" | "concealment" | "missChance" | "fastHealing" | "regeneration"; value: number; qualifier: string; condition?: string; source: string }>;
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
      <div><dt>Land speed</dt><dd>{landSpeed.speed} ft.</dd></div>
      <div><dt>Average HP</dt><dd>{combat.averageHitPoints}</dd></div>
    </dl>
    <p className="hint" aria-label="Land speed calculation">Base {landSpeed.baseSpeed} ft. · {landSpeed.armorCategory === "none" ? "no armor" : `${landSpeed.armorCategory} armor`} · {landSpeed.load} load{landSpeed.adjustments.length ? ` · ${landSpeed.adjustments.map((adjustment) => `${adjustment.source}: ${adjustment.label}`).join(", ")}` : ""}</p>
    {senses.length > 0 && <section className="conditional-modifiers" aria-labelledby="character-senses-title">
      <h3 id="character-senses-title">Special senses</h3>
      <ul>{senses.map((sense, index) => <li key={`${sense.source}-${sense.sense}-${index}`}>
        <strong>{sense.operation === "increase" ? "Increase " : ""}{sense.label}{sense.range ? ` ${sense.range} ft.` : ""}</strong>
        <span>{sense.condition ? `${sense.condition} · ` : ""}{sense.source}</span>
      </li>)}</ul>
    </section>}
    {defenses.length > 0 && <section className="conditional-modifiers" aria-labelledby="character-defenses-title">
      <h3 id="character-defenses-title">Special defenses</h3>
      <ul>{defenses.map((defense, index) => <li key={`${defense.source}-${defense.kind}-${defense.qualifier}-${index}`}>
        <strong>{defense.kind === "damageReduction" ? `DR ${defense.value}/${defense.qualifier}` : defense.kind === "energyResistance" ? `${defense.qualifier[0].toUpperCase()}${defense.qualifier.slice(1)} resistance ${defense.value}` : defense.kind === "immunity" ? `Immune to ${defense.qualifier}` : defense.kind === "evasion" ? "Evasion" : defense.kind === "improvedEvasion" ? "Improved evasion" : defense.kind === "uncannyDodge" ? "Uncanny dodge" : defense.kind === "improvedUncannyDodge" ? "Improved uncanny dodge" : defense.kind === "fortification" ? `Fortification ${defense.value}% (${defense.qualifier})` : defense.kind === "concealment" ? `${defense.qualifier === "total concealment" ? "Total concealment" : "Concealment"} ${defense.value}%` : defense.kind === "missChance" ? `Miss chance ${defense.value}%` : defense.kind === "fastHealing" ? `Fast healing ${defense.value}` : defense.kind === "regeneration" ? `Regeneration ${defense.value}` : `Spell resistance ${defense.value}`}</strong>
        <span>{defense.condition ? `${defense.condition} Â· ` : ""}{defense.source}</span>
      </li>)}</ul>
    </section>}
    {modifierSources.length > 0 && <section className="conditional-modifiers">
      <h3>Applied feat modifiers</h3>
      <ul>{modifierSources.map((modifier, index) => <li key={`${modifier.source}-${modifier.target}-${index}`}>
        <strong>{signed(modifier.bonus)} {modifier.target}</strong>
        <span>{modifier.source}{modifier.choice ? ` · ${modifier.choice}` : ""}</span>
      </li>)}</ul>
    </section>}
    {conditionalModifiers.length > 0 && <section className="conditional-modifiers">
      <h3>Conditional modifiers</h3>
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
