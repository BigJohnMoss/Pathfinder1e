import { useRef } from "react";

export function CharacterDetails({ name, classId, ancestryId, level, classes, ancestries, saveNotice, onNameChange, onClassChange, onAncestryChange, onLevelChange, onReviewLevelUp, onSave, onLoad, onImport, onExport, onPrint, onReset }: {
  name: string;
  classId: string;
  ancestryId: string;
  level: number;
  classes: Array<{ id: string; name: string }>;
  ancestries: Array<{ id: string; name: string }>;
  saveNotice: string;
  onNameChange: (name: string) => void;
  onClassChange: (classId: string) => void;
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
    <label>Class<select value={classId} onChange={(event) => onClassChange(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Ancestry<select value={ancestryId} onChange={(event) => onAncestryChange(event.target.value)}>{ancestries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Level<input type="number" min="1" max="20" value={level} onChange={(event) => onLevelChange(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} />{level < 20 && <button type="button" className="level-up-trigger" onClick={onReviewLevelUp}>Review level {level + 1}</button>}</label>
    <div className="character-actions">
      <span>Character file</span>
      <div><button type="button" onClick={onSave}>Save</button><button type="button" onClick={onLoad}>Load</button><button type="button" onClick={() => importInput.current?.click()}>Import</button><input ref={importInput} hidden type="file" accept="application/json,.json" aria-label="Import character file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImport(file); event.target.value = ""; }} /><button type="button" onClick={onExport}>Export</button><button type="button" onClick={onPrint}>Print</button><button className="danger-button" type="button" onClick={onReset}>Reset</button></div>
      <small aria-live="polite">{saveNotice}</small>
    </div>
  </section>;
}
