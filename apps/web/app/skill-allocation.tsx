type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
type SkillEntry = { name: string; ability: AbilityName; ranks: number; total: number; isClassSkill: boolean };

const labels: Record<AbilityName, string> = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export function SkillAllocation({ skills, allocatedRanks, totalRanks, onRankChange }: { skills: SkillEntry[]; allocatedRanks: number; totalRanks: number; onRankChange: (name: string, ranks: number) => void }) {
  return <section className="skill-panel"><div><p className="eyebrow">SKILLS</p><h2>Allocate ranks</h2><p><strong>{allocatedRanks}</strong> of {totalRanks} total ranks allocated. Class skills gain +3 once at least one rank is invested.</p></div><div className="skill-list">{skills.map((skill) => <label key={skill.name}><span>{skill.name} <small>{labels[skill.ability]}</small></span><input type="number" min="0" max={totalRanks} value={skill.ranks} onChange={(event) => onRankChange(skill.name, Number(event.target.value))} /><strong className={skill.isClassSkill ? "class-skill" : ""}>{signed(skill.total)}{skill.isClassSkill && " class"}</strong></label>)}</div></section>;
}
