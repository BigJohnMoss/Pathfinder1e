import { archetypeAutomationSummary } from "../../../packages/engine/src/index.js";
import type { CharacterArchetype } from "../../../packages/types/src/index.js";

export function ArchetypeAutomationStatus({ archetypes }: { archetypes: CharacterArchetype[] }) {
  if (!archetypes.length) return null;
  return <section className="archetype-automation" aria-labelledby="archetype-automation-title">
    <div><p className="eyebrow">Archetype tracking</p><h2 id="archetype-automation-title">Automation status</h2><p>Automated rules are included in the calculated character. Manual items remain visible so they are never silently omitted.</p></div>
    {archetypes.map(archetype => {
      const summary = archetypeAutomationSummary(archetype);
      return <article key={archetype.id}>
        <h3>{archetype.name}</h3>
        <div className="automation-columns">
          <div><strong>Calculated automatically</strong>{summary.automated.length ? <ul>{summary.automated.map(item => <li key={item}>{item}</li>)}</ul> : <p>No derived effects yet.</p>}</div>
          <div className={summary.manual.length ? "manual-items" : "complete-items"}><strong>{summary.manual.length ? `Track manually (${summary.manual.length})` : "Fully automated"}</strong>{summary.manual.length ? <ul>{summary.manual.map(item => <li key={item}>{item}</li>)}</ul> : <p>No untracked bespoke effects.</p>}</div>
        </div>
        <a href={archetype.source.url} target="_blank" rel="noreferrer">Rules source</a>
      </article>;
    })}
  </section>;
}
