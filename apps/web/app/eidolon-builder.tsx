import type { CharacterOption } from "../../../packages/types/src/index.js";
import { eidolonBaseForm, validateEidolonEvolutions } from "../../../packages/engine/src/index.js";

export function EidolonBuilder({ level, baseFormId, size, evolutionIds, evolutions, onSizeChange, onEvolutionIdsChange }: {
  level: number;
  baseFormId: string;
  size: "Small" | "Medium";
  evolutionIds: string[];
  evolutions: CharacterOption[];
  onSizeChange: (size: "Small" | "Medium") => void;
  onEvolutionIdsChange: (ids: string[]) => void;
}) {
  const formId = baseFormId.replace(/^eidolon-/, "");
  const form = eidolonBaseForm(formId, size);
  const validEvolutions = evolutions.filter((evolution): evolution is CharacterOption & { cost: number } => Number.isFinite(evolution.cost));
  const allocation = validateEidolonEvolutions(evolutionIds, validEvolutions, level, formId);
  const selected = new Set(allocation.selectedIds);
  const toggle = (id: string) => onEvolutionIdsChange(validateEidolonEvolutions(selected.has(id) ? allocation.selectedIds.filter(item => item !== id) : [...allocation.selectedIds, id], validEvolutions, level, formId).selectedIds);

  return <section className="eidolon-builder" aria-labelledby="eidolon-builder-title">
    <div className="eidolon-heading">
      <div><p className="eyebrow">Bonded companion</p><h2 id="eidolon-builder-title">Build your eidolon</h2></div>
      <strong>{allocation.spent} / {allocation.pool} evolution points</strong>
    </div>
    {!form ? <p>Choose an eidolon base form above to unlock evolutions.</p> : <>
      <div className="eidolon-summary">
        <label>Size<select value={size} onChange={event => onSizeChange(event.target.value as "Small" | "Medium")}><option>Medium</option><option>Small</option></select></label>
        <span><b>{formId[0].toUpperCase() + formId.slice(1)}</b><small>Speed {form.speed} ft. · Armour +{form.armor}</small></span>
        <span><b>STR {form.abilities.strength} · DEX {form.abilities.dexterity} · CON {form.abilities.constitution}</b><small>{form.attacks.join("; ")}</small></span>
      </div>
      <p className="eidolon-budget">{allocation.remaining} points remaining. Choices that exceed the pool or fail a requirement are disabled.</p>
      <div className="eidolon-evolutions">
        {evolutions.map(evolution => {
          const isSelected = selected.has(evolution.id);
          const missingRequirement = evolution.requiredEvolutionIds?.some(id => !selected.has(id));
          const unavailable = !isSelected && ((evolution.minimumLevel ?? 1) > level || Boolean(evolution.baseForms?.length && !evolution.baseForms.includes(formId)) || Boolean(missingRequirement) || (evolution.cost ?? 0) > allocation.remaining);
          return <label key={evolution.id} className={isSelected ? "selected" : ""}>
            <input type="checkbox" checked={isSelected} disabled={unavailable} onChange={() => toggle(evolution.id)} />
            <span><b>{evolution.name}</b><small>{evolution.cost ?? 0} point{evolution.cost === 1 ? "" : "s"} · {evolution.benefit}</small></span>
          </label>;
        })}
      </div>
    </>}
  </section>;
}
