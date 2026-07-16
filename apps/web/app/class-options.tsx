type Option = { id: string; name: string; benefit: string };
type Choice = { id: string; name: string; level: number; options: Option[]; selected?: Option };

export function ClassOptions({ choices, selectedOptions, onOptionChange }: { choices: Choice[]; selectedOptions: Record<string, string>; onOptionChange: (featureId: string, optionId: string) => void }) {
  return <section className="choice-panel"><div><p className="eyebrow">CLASS OPTIONS</p><h2>Choose class features</h2><p>Each earned selectable feature gets its own choice.</p></div>{choices.map((choice) => <label key={choice.id}>{choice.name} <small>level {choice.level}</small><select value={selectedOptions[choice.id] ?? ""} onChange={(event) => onOptionChange(choice.id, event.target.value)}><option value="">Choose an option</option>{choice.options.map((option) => <option key={option.id} value={option.id} disabled={Object.entries(selectedOptions).some(([id, value]) => id !== choice.id && value === option.id)}>{option.name}</option>)}</select>{choice.selected && <span>{choice.selected.benefit}</span>}</label>)}</section>;
}
