type Feat = { id: string; name: string; benefit: string; choice?: { key: string; label: string; options: Array<{ id: string; name: string }> } };
type Prerequisite = { type: string; key?: string; id?: string; featId?: string; classId?: string; minimum?: number; prerequisites?: Prerequisite[] };
type FeatChoice = { index: number; name: string; selected?: Feat; checks: Array<{ met: boolean; prerequisite: Prerequisite }>; eligibleFeatIds: string[] };

const labels: Record<string, string> = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const prerequisiteLabel = (prerequisite: Prerequisite) => {
  if (prerequisite.type === "ability") return `${labels[prerequisite.key ?? ""]} ${prerequisite.minimum}+`;
  if (prerequisite.type === "bab") return `BAB +${prerequisite.minimum}`;
  if (prerequisite.type === "caster-level") return `Caster level ${prerequisite.minimum}+`;
  if (prerequisite.type === "class-level") return `${prerequisite.classId ?? "class"} level ${prerequisite.minimum}+`;
  if (prerequisite.type === "skill") return `${prerequisite.key} ${prerequisite.minimum}+ ranks`;
  if (prerequisite.type === "matching-choice") return `matching ${prerequisite.key} for ${prerequisite.featId}`;
  if (prerequisite.type === "any") return `one of: ${prerequisite.prerequisites?.map(prerequisiteLabel).join(", ")}`;
  return prerequisite.id ?? prerequisite.type;
};

export function FeatChoices({ feats, choices, selectedFeatIds, selectedFeatChoices, onFeatChange, onFeatChoiceChange }: { feats: Feat[]; choices: FeatChoice[]; selectedFeatIds: string[]; selectedFeatChoices: Record<string, string>; onFeatChange: (index: number, featId: string) => void; onFeatChoiceChange: (featId: string, choice: string) => void }) {
  return <section className="feat-panel"><div><p className="eyebrow">FEATS</p><h2>Feat choices</h2><p>Only feats whose prerequisites are met can be selected.</p></div><div className="feat-slots">{choices.map((choice) => <article key={choice.index}><label>{choice.name}<select value={selectedFeatIds[choice.index] ?? ""} onChange={(event) => onFeatChange(choice.index, event.target.value)}><option value="">Choose a feat</option>{feats.map((feat) => <option key={feat.id} value={feat.id} disabled={!choice.eligibleFeatIds.includes(feat.id) || selectedFeatIds.some((id, index) => id === feat.id && index !== choice.index)}>{feat.name}</option>)}</select></label>{choice.selected && <><strong>{choice.selected.name}</strong><p>{choice.selected.benefit}</p>{choice.selected.choice && <label>{choice.selected.choice.label}<select aria-label={choice.selected.name + " " + choice.selected.choice.label} value={selectedFeatChoices[choice.selected.id] ?? ""} onChange={(event) => onFeatChoiceChange(choice.selected!.id, event.target.value)}><option value="">Choose {choice.selected.choice.label.toLowerCase()}</option>{choice.selected.choice.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>}{choice.checks.length > 0 && <ul className="checks">{choice.checks.map((check, index) => <li className={check.met ? "met" : "unmet"} key={index}>{check.met ? "Met" : "Check"}: {prerequisiteLabel(check.prerequisite)}</li>)}</ul>}</>}</article>)}</div></section>;
}
