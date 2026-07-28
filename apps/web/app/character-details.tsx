import { useRef } from "react";
import type { CharacterClassLevel } from "../../../packages/types/src/index.js";

export function CharacterDetails({ name, classId, additionalClassLevels, additionalArchetypeIds, archetypeId, ancestryId, level, classes, archetypes, ancestries, saveNotice, onNameChange, onClassChange, onAdditionalClassLevelsChange, onAdditionalArchetypeChange, onArchetypeChange, onAncestryChange, onLevelChange, onReviewLevelUp, onSave, onLoad, onImport, onExport, onPrint, onReset }: {
  name: string;
  classId: string;
  additionalClassLevels: CharacterClassLevel[];
  additionalArchetypeIds: Record<string, string>;
  archetypeId: string;
  ancestryId: string;
  level: number;
  classes: Array<{ id: string; name: string }>;
  archetypes: Array<{ id: string; name: string; classId: string }>;
  ancestries: Array<{ id: string; name: string }>;
  saveNotice: string;
  onNameChange: (name: string) => void;
  onClassChange: (classId: string) => void;
  onAdditionalClassLevelsChange: (classLevels: CharacterClassLevel[]) => void;
  onAdditionalArchetypeChange: (classId: string, archetypeId: string) => void;
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
  const assignedAdditionalLevels = additionalClassLevels.reduce((total, entry) => total + entry.level, 0);
  const primaryLevels = level - assignedAdditionalLevels;
  const availableClassIds = new Set([classId, ...additionalClassLevels.map((entry) => entry.classId)]);
  const updateAdditionalClass = (index: number, nextClassId: string) => {
    if (!nextClassId) {
      onAdditionalClassLevelsChange(additionalClassLevels.filter((_, entryIndex) => entryIndex !== index));
      return;
    }
    onAdditionalClassLevelsChange(additionalClassLevels.map((entry, entryIndex) => entryIndex === index ? { ...entry, classId: nextClassId } : entry));
  };
  const updateAdditionalLevel = (index: number, nextLevel: number) => {
    const otherLevels = additionalClassLevels.reduce((total, entry, entryIndex) => entryIndex === index ? total : total + entry.level, 0);
    const maximum = Math.max(1, level - otherLevels - 1);
    onAdditionalClassLevelsChange(additionalClassLevels.map((entry, entryIndex) => entryIndex === index ? { ...entry, level: Math.max(1, Math.min(maximum, nextLevel || 1)) } : entry));
  };
  return <section className="builder" aria-label="Character details">
    <label>Character name<input value={name} placeholder="Unnamed hero" onChange={(event) => onNameChange(event.target.value)} /></label>
    <label>Class<select aria-label="Class" value={classId} onChange={(event) => onClassChange(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {additionalClassLevels.map((entry, index) => {
      const label = index === 0 ? "Additional class" : `Additional class ${index + 1}`;
      const levelLabel = index === 0 ? "Additional class levels" : `Additional class ${index + 1} levels`;
      const otherLevels = assignedAdditionalLevels - entry.level;
      const classArchetypes = archetypes.filter((archetype) => archetype.classId === entry.classId);
      return <div className="additional-class-row" key={`${entry.classId}-${index}`}>
        <label>{label}<select aria-label={label} value={entry.classId} onChange={(event) => updateAdditionalClass(index, event.target.value)}><option value="">Remove class</option>{classes.filter((item) => item.id === entry.classId || !availableClassIds.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>{levelLabel}<input aria-label={levelLabel} type="number" min="1" max={Math.max(1, level - otherLevels - 1)} value={entry.level} onChange={(event) => updateAdditionalLevel(index, Number(event.target.value))} /></label>
        {classArchetypes.length > 0 && <label>{classes.find((item) => item.id === entry.classId)?.name ?? label} archetype<select aria-label={`${classes.find((item) => item.id === entry.classId)?.name ?? label} archetype`} value={additionalArchetypeIds[entry.classId] ?? ""} onChange={(event) => onAdditionalArchetypeChange(entry.classId, event.target.value)}><option value="">Standard class</option>{classArchetypes.map((archetype) => <option key={archetype.id} value={archetype.id}>{archetype.name}</option>)}</select></label>}
        <button type="button" className="secondary-button" aria-label={`Remove ${classes.find((item) => item.id === entry.classId)?.name ?? label}`} onClick={() => updateAdditionalClass(index, "")}>Remove</button>
      </div>;
    })}
    {additionalClassLevels.length === 0 && <label>Additional class<select aria-label="Additional class" value="" onChange={(event) => event.target.value && onAdditionalClassLevelsChange([{ classId: event.target.value, level: 1 }])}><option value="">None</option>{classes.filter((item) => item.id !== classId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    {additionalClassLevels.length > 0 && additionalClassLevels.length < classes.length - 1 && primaryLevels > 1 && <button type="button" className="add-class-button" onClick={() => {
      const nextClass = classes.find((item) => !availableClassIds.has(item.id));
      if (nextClass) onAdditionalClassLevelsChange([...additionalClassLevels, { classId: nextClass.id, level: 1 }]);
    }}>Add another class</button>}
    {additionalClassLevels.length > 0 && <p className="class-level-summary">{primaryLevels} level{primaryLevels === 1 ? "" : "s"} remain in the primary class.</p>}
    <label>Archetype<select aria-label="Archetype" value={archetypeId} onChange={(event) => onArchetypeChange(event.target.value)}><option value="">Standard class</option>{archetypes.filter((item) => item.classId === classId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Ancestry<select value={ancestryId} onChange={(event) => onAncestryChange(event.target.value)}>{ancestries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Level<input type="number" min="1" max="20" value={level} onChange={(event) => onLevelChange(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} />{level < 20 && <button type="button" className="level-up-trigger" onClick={onReviewLevelUp}>Review level {level + 1}</button>}</label>
    <div className="character-actions">
      <span>Character file</span>
      <div><button type="button" onClick={onSave}>Save</button><button type="button" onClick={onLoad}>Load</button><button type="button" onClick={() => importInput.current?.click()}>Import</button><input ref={importInput} hidden type="file" accept="application/json,.json" aria-label="Import character file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImport(file); event.target.value = ""; }} /><button type="button" onClick={onExport}>Export</button><button type="button" onClick={onPrint}>Print</button><button className="danger-button" type="button" onClick={onReset}>Reset</button></div>
      <small aria-live="polite">{saveNotice}</small>
    </div>
  </section>;
}
