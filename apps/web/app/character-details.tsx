import { useRef } from "react";

export function CharacterDetails({ name, classId, secondaryClassId, secondaryClassLevel, archetypeId, ancestryId, level, classes, archetypes, ancestries, saveNotice, onNameChange, onClassChange, onSecondaryClassChange, onSecondaryClassLevelChange, onArchetypeChange, onAncestryChange, onLevelChange, onReviewLevelUp, onSave, onLoad, onImport, onExport, onPrint, onReset }: {
  name: string;
  classId: string;
  secondaryClassId: string;
  secondaryClassLevel: number;
  archetypeId: string;
  ancestryId: string;
  level: number;
  classes: Array<{ id: string; name: string }>;
  archetypes: Array<{ id: string; name: string }>;
  ancestries: Array<{ id: string; name: string }>;
  saveNotice: string;
  onNameChange: (name: string) => void;
  onClassChange: (classId: string) => void;
  onSecondaryClassChange: (classId: string) => void;
  onSecondaryClassLevelChange: (level: number) => void;
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
    <label>Additional class<select aria-label="Additional class" value={secondaryClassId} onChange={(event) => onSecondaryClassChange(event.target.value)}><option value="">None</option>{classes.filter((item) => item.id !== classId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {secondaryClassId && <label>Additional class levels<input aria-label="Additional class levels" type="number" min="1" max={Math.max(1, level - 1)} value={secondaryClassLevel} onChange={(event) => onSecondaryClassLevelChange(Math.max(1, Math.min(Math.max(1, level - 1), Number(event.target.value) || 1)))} /><small>{level - secondaryClassLevel} level{level - secondaryClassLevel === 1 ? "" : "s"} remain in the primary class.</small></label>}
    <label>Archetype<select aria-label="Archetype" value={archetypeId} onChange={(event) => onArchetypeChange(event.target.value)}><option value="">Standard class</option>{archetypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Ancestry<select value={ancestryId} onChange={(event) => onAncestryChange(event.target.value)}>{ancestries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Level<input type="number" min="1" max="20" value={level} onChange={(event) => onLevelChange(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} />{level < 20 && <button type="button" className="level-up-trigger" onClick={onReviewLevelUp}>Review level {level + 1}</button>}</label>
    <div className="character-actions">
      <span>Character file</span>
      <div><button type="button" onClick={onSave}>Save</button><button type="button" onClick={onLoad}>Load</button><button type="button" onClick={() => importInput.current?.click()}>Import</button><input ref={importInput} hidden type="file" accept="application/json,.json" aria-label="Import character file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImport(file); event.target.value = ""; }} /><button type="button" onClick={onExport}>Export</button><button type="button" onClick={onPrint}>Print</button><button className="danger-button" type="button" onClick={onReset}>Reset</button></div>
      <small aria-live="polite">{saveNotice}</small>
    </div>
  </section>;
}
