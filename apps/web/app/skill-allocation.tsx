type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
type SkillEntry = { name: string; ability: AbilityName; ranks: number; total: number; isClassSkill: boolean };

const labels: Record<AbilityName, string> = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export function SkillAllocation({ skills, allocatedRanks, totalRanks, maximumRanksPerSkill, onRankChange }: { skills: SkillEntry[]; allocatedRanks: number; totalRanks: number; maximumRanksPerSkill: number; onRankChange: (name: string, ranks: number) => void }) {
  const remainingRanks = Math.max(0, totalRanks - allocatedRanks);
  return <section className="skill-panel">
    <div className="skill-heading">
      <div>
        <p className="eyebrow">SKILLS</p>
        <h2>Allocate ranks</h2>
        <p>Invest up to {maximumRanksPerSkill} {maximumRanksPerSkill === 1 ? "rank" : "ranks"} in each skill at this level. Trained class skills receive a +3 bonus.</p>
      </div>
      <div className="skill-budget" aria-label={`${remainingRanks} skill ranks remaining`}>
        <strong>{remainingRanks}</strong>
        <span>of {totalRanks} ranks remaining</span>
      </div>
    </div>
    <div className="skill-list">{skills.map((skill) => <label key={skill.name}>
      <span className="skill-name">{skill.name}<small>{labels[skill.ability]}</small></span>
      <span className="skill-rank"><small>Ranks</small><input aria-label={`${skill.name} ranks`} type="number" min="0" max={maximumRanksPerSkill} value={skill.ranks} onChange={(event) => onRankChange(skill.name, Number(event.target.value))} /></span>
      <span className="skill-total"><small>Total</small><strong>{signed(skill.total)}{skill.isClassSkill && <span className="sr-only"> class</span>}</strong></span>
      {skill.isClassSkill && <span className="class-skill">Class skill</span>}
    </label>)}</div>
  </section>;
}
