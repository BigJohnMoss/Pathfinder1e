type CombatStats = {
  initiative: number;
  armorClass: { normal: number; touch: number; flatFooted: number };
  combatManeuverBonus: number;
  combatManeuverDefense: number;
  averageHitPoints: number;
  saves: { fortitude: number; reflex: number; will: number };
};

type Progression = { baseAttackBonus: number; skillRanks: number; featSlots: number };

const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export function CombatPanel({ combat }: { combat: CombatStats }) {
  return <article className="combat-panel"><p className="eyebrow">COMBAT</p><h2>Core statistics</h2><dl><div><dt>Initiative</dt><dd>{signed(combat.initiative)}</dd></div><div><dt>AC / touch / flat-footed</dt><dd>{combat.armorClass.normal} / {combat.armorClass.touch} / {combat.armorClass.flatFooted}</dd></div><div><dt>CMB / CMD</dt><dd>{signed(combat.combatManeuverBonus)} / {combat.combatManeuverDefense}</dd></div><div><dt>Average HP</dt><dd>{combat.averageHitPoints}</dd></div></dl><p className="hint">Average HP uses maximum 1st-level hit points and rounded-up average rolls thereafter. Equipment and temporary bonuses come next.</p></article>;
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
