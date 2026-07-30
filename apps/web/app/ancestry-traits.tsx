"use client";

import type { CharacterAncestry } from "../../../packages/types/src/index.js";

export function AncestryTraits({ ancestry, selectedIds, onChange }: {
  ancestry: CharacterAncestry;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const alternateTraits = ancestry.alternateTraits ?? [];
  if (alternateTraits.length === 0) return null;
  const selected = alternateTraits.filter((trait) => selectedIds.includes(trait.id));
  const replacedIds = new Set(selected.flatMap((trait) => trait.replaces));
  return <section className="sheet-panel ancestry-traits">
    <p className="eyebrow">Ancestry options</p>
    <h2>Alternate racial traits</h2>
    <p>Exchange a standard {ancestry.name} trait for an Advanced Player&apos;s Guide option. Traits that replace the same ability cannot be combined.</p>
    <div className="feature-list">
      {alternateTraits.map((trait) => {
        const checked = selectedIds.includes(trait.id);
        const conflicts = !checked && trait.replaces.some((id) => replacedIds.has(id));
        const replacedNames = trait.replaces.map((id) => ancestry.traits.find((base) => base.id === id)?.name ?? id).join(", ");
        return <label className="feature-row" key={trait.id}>
          <span className="feature-row-copy">
            <strong>{trait.name}</strong>
            <small className="feature-row-summary">{trait.summary}</small>
            <small className="feature-row-replaces"><b>Replaces:</b> {replacedNames}</small>
          </span>
          <input aria-label={trait.name} type="checkbox" checked={checked} disabled={conflicts}
            onChange={() => onChange(checked ? selectedIds.filter((id) => id !== trait.id) : [...selectedIds, trait.id])} />
        </label>;
      })}
    </div>
  </section>;
}
