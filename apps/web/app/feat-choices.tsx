type Feat = { id: string; name: string; benefit: string };
type Prerequisite = { type: string; key?: string; minimum?: number; id?: string };
type FeatChoice = { index: number; name: string; selected?: Feat; checks: Array<{ met: boolean; prerequisite: Prerequisite }>; eligibleFeatIds: string[] };

const labels: Record<string, string> = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const prerequisiteLabel = (prerequisite: Prerequisite) => {
  if (prerequisite.type === "ability") return `${labels[prerequisite.key ?? ""]} ${prerequisite.minimum}+`;
  if (prerequisite.type === "bab") return `BAB +${prerequisite.minimum}`;
  return prerequisite.id ?? prerequisite.type;
};

export function FeatChoices({ feats, choices, selectedFeatIds, onFeatChange }: { feats: Feat[]; choices: FeatChoice[]; selectedFeatIds: string[]; onFeatChange: (index: number, featId: string) => void }) {
  return <section className="feat-panel"><div><p className="eyebrow">FEATS</p><h2>Feat choices</h2><p>Only feats whose prerequisites are met can be selected.</p></div><div className="feat-slots">{choices.map((choice) => <article key={choice.index}><label>{choice.name}<select value={selectedFeatIds[choice.index] ?? ""} onChange={(event) => onFeatChange(choice.index, event.target.value)}><option value="">Choose a feat</option>{feats.map((feat) => <option key={feat.id} value={feat.id} disabled={!choice.eligibleFeatIds.includes(feat.id) || selectedFeatIds.some((id, index) => id === feat.id && index !== choice.index)}>{feat.name}</option>)}</select></label>{choice.selected && <><strong>{choice.selected.name}</strong><p>{choice.selected.benefit}</p>{choice.checks.length > 0 && <ul className="checks">{choice.checks.map((check, index) => <li className={check.met ? "met" : "unmet"} key={index}>{check.met ? "Met" : "Check"}: {prerequisiteLabel(check.prerequisite)}</li>)}</ul>}</>}</article>)}</div></section>;
}
