export function CharacterDetails({ name, classId, level, classes, ancestryName, saveNotice, onNameChange, onClassChange, onLevelChange, onSave, onLoad, onExport, onPrint, onReset }: {
  name: string;
  classId: string;
  level: number;
  classes: Array<{ id: string; name: string }>;
  ancestryName: string;
  saveNotice: string;
  onNameChange: (name: string) => void;
  onClassChange: (classId: string) => void;
  onLevelChange: (level: number) => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onPrint: () => void;
  onReset: () => void;
}) {
  return <section className="builder" aria-label="Character details">
    <label>Character name<input value={name} placeholder="Unnamed hero" onChange={(event) => onNameChange(event.target.value)} /></label>
    <label>Class<select value={classId} onChange={(event) => onClassChange(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Ancestry<select disabled value="human"><option>{ancestryName}</option></select></label>
    <label>Level<input type="number" min="1" max="20" value={level} onChange={(event) => onLevelChange(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /></label>
    <div className="character-actions"><button type="button" onClick={onSave}>Save</button><button type="button" onClick={onLoad}>Load</button><button type="button" onClick={onExport}>Export</button><button type="button" onClick={onPrint}>Print</button><button type="button" onClick={onReset}>Reset</button><small>{saveNotice}</small></div>
  </section>;
}
