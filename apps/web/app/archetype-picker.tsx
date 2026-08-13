import { useEffect, useMemo, useState } from "react";
import type { Alignment, CharacterArchetype, CharacterClass } from "../../../packages/types/src/index.js";
import { archetypeConflictReasons, archetypeEligibilityIssues, compatibleArchetypes } from "../../../packages/engine/src/index.js";

export function ArchetypePicker({ className, characterClass, archetypes, selectedIds, ancestryId, alignment, onChange, label = "Archetype" }: {
  className: string;
  characterClass?: CharacterClass;
  archetypes: CharacterArchetype[];
  selectedIds: string[];
  ancestryId: string;
  alignment: Alignment;
  onChange: (ids: string[]) => void;
  label?: string;
}) {
  const [search, setSearch] = useState("");
  const [coverage, setCoverage] = useState<"all" | "full" | "partial">("all");
  const selected = selectedIds.flatMap(id => archetypes.find(archetype => archetype.id === id) ?? []);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return archetypes.filter(archetype =>
      (coverage === "all" || (archetype.mechanicalCoverage ?? "partial") === coverage)
      && (!query || `${archetype.name} ${archetype.summary} ${archetype.replacesText ?? ""}`.toLowerCase().includes(query))
    );
  }, [archetypes, coverage, search]);
  const candidates = filtered.filter(archetype => !selectedIds.includes(archetype.id));
  const coverageLabel = (archetype: CharacterArchetype) => archetype.mechanicalCoverage === "full"
    ? "Fully automated"
    : archetype.mechanicalCoverage === "descriptive"
      ? "Rules reference"
      : "Partially automated";
  const requirementIssues = (archetype: CharacterArchetype) => archetypeEligibilityIssues(archetype, { ancestryId, alignment });
  const primaryOptions = [...selected, ...filtered.filter(archetype => !selectedIds.includes(archetype.id))];
  useEffect(() => {
    const legalIds = selectedIds.filter(id => {
      const archetype = archetypes.find(item => item.id === id);
      return archetype && requirementIssues(archetype).length === 0;
    });
    if (legalIds.length !== selectedIds.length) onChange(legalIds);
  }, [alignment, ancestryId, archetypes, selectedIds.join("|")]);
  return <section className="archetype-picker" aria-label={`${className} archetypes`}>
    <div className="archetype-picker-heading">
      <label>{label}
        <select aria-label={label} value={selectedIds[0] ?? ""} disabled={archetypes.length === 0} onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}>
          <option value="">{archetypes.length === 0 ? `No ${className} archetypes available` : "Standard class"}</option>
          {primaryOptions.map(archetype => <option key={archetype.id} value={archetype.id} disabled={requirementIssues(archetype).length > 0}>{archetype.name}</option>)}
        </select>
      </label>
      {archetypes.length > 3 && <label>Search archetypes
        <input type="search" value={search} placeholder="Name, feature, or theme" onChange={event => setSearch(event.target.value)} />
      </label>}
      {archetypes.length > 3 && <label>Mechanical coverage
        <select aria-label="Mechanical coverage" value={coverage} onChange={event => setCoverage(event.target.value as typeof coverage)}>
          <option value="all">All archetypes</option>
          <option value="full">Fully automated</option>
          <option value="partial">Partially automated</option>
        </select>
      </label>}
    </div>
    <small className="field-help">{archetypes.length} class-specific archetype{archetypes.length === 1 ? "" : "s"} available. Compatible archetypes can be combined.</small>
    {selected.length > 0 && <div className="selected-archetypes" aria-label="Selected archetypes">
      {selected.map(archetype => <article key={archetype.id}>
        <div><strong>{archetype.name}</strong><span className={`coverage-badge coverage-${archetype.mechanicalCoverage ?? "partial"}`}>{coverageLabel(archetype)}</span></div>
        <p>{archetype.summary}</p>
        {archetype.replacesText && <small>Replaces: {archetype.replacesText}</small>}
        {archetype.mechanicalNotes?.map(note => <small className="archetype-mechanical-note" key={note}>{note}</small>)}
        {requirementIssues(archetype).length > 0 && <ul className="archetype-requirements">{requirementIssues(archetype).map(issue => <li key={issue}>{issue}</li>)}</ul>}
        <button type="button" className="secondary-button" onClick={() => onChange(selectedIds.filter(id => id !== archetype.id))}>Remove {archetype.name}</button>
      </article>)}
    </div>}
    {selected.length > 0 && candidates.length > 0 && <label>Add compatible archetype
      <select aria-label="Add compatible archetype" value="" onChange={event => event.target.value && onChange([...selectedIds, event.target.value])}>
        <option value="">Choose another archetype</option>
        {candidates.map(archetype => {
          const conflicts = selected.flatMap(current => archetypeConflictReasons(current, archetype, characterClass));
          const issues = requirementIssues(archetype);
          const disabled = !compatibleArchetypes(selected, archetype, characterClass) || issues.length > 0;
          return <option key={archetype.id} value={archetype.id} disabled={disabled}>{archetype.name}{conflicts.length ? ` — conflicts: ${conflicts[0]}` : issues.length ? ` — ${issues[0]}` : ""}</option>;
        })}
      </select>
    </label>}
    {search && <small className="field-help">{filtered.length} matching archetype{filtered.length === 1 ? "" : "s"}.</small>}
  </section>;
}
