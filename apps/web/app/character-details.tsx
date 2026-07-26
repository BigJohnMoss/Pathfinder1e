import { useRef } from "react";

export function CharacterDetails({ name, classId, archetypeId, ancestryId, level, classes, archetypes, ancestries, saveNotice, onNameChange, onClassChange, onArchetypeChange, onAncestryChange, onLevelChange, onReviewLevelUp, onSave, onLoad, onImport, onExport, onPrint, onReset }: {
  name: string;
  classId: string;
  archetypeId: string;
  ancestryId: string;
  level: number;
  classes: Array<{ id: string; name: string }>;
  archetypes: Array<{ id: string; name: string }>;
  ancestries: Array<{ id: string; name: string }>;
  saveNotice: string;
  onNameChange: (name: string) => void;
  onClassChange: (classId: string) => void;
  onArchetypeChange: (archetypeId: string) => void;
  onAncestryChange: (ancestryId: string) => void;
  onLevelChange: (level: number) => void;
  onReviewLevelUp: () => void;
  onSave: () => void;
  onLoad: () => void;
  onImport: (file: File) => void | Promise<void>;
  onExport: () => void;
  onPrint: () => void;
  onReset: () => void;
}) {
  const importInput = useRef<HTMLInputElement>(null);
  return <section className="builder" aria-label="Character details">
    <label>Character name<input value={name} placeholder="Unnamed hero" onChange={(event) => onNameChange(event.target.value)} /></label>
    <label>Class<select aria-label="Class" value={classId} onChange={(event) => onClassChange(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Archetype<select aria-label="Archetype" value={archetypeId} onChange={(event) => onArchetypeChange(event.target.value)}><option value="">Standard class</option>{archetypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Ancestry<select value={ancestryId} onChange={(event) => onAncestryChange(event.target.value)}>{ancestries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Level<input type="number" min="1" max="20" value={level} onChange={(event) => onLevelChange(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} />{level < 20 && <button type="button" className="level-up-trigger" onClick={onReviewLevelUp}>Review level {level + 1}</button>}</label>
    <div className="character-actions" role="group" aria-label="Character file actions">
      <span>Character file</span>
      <div>
        <button type="button" onClick={onSave} aria-label="Save character">Save</button>
        <button type="button" onClick={onLoad} aria-label="Load character">Load</button>
        <button type="button" onClick={() => importInput.current?.click()} aria-label="Import character file">Import</button>
        <input ref={importInput} hidden type="file" accept="application/json,.json" aria-label="Import character file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImport(file); event.target.value = ""; }} />
        <button type="button" onClick={onExport} aria-label="Export character">Export</button>
        <button type="button" onClick={onPrint} aria-label="Print character">Print</button>
        <button className="danger-button" type="button" onClick={onReset} aria-label="Reset character">Reset</button>
      </div>
      <small aria-live="polite">{saveNotice}</small>
    </div>
  </section>;
}
