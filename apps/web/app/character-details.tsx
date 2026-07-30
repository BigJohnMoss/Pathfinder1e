import { useEffect, useRef, useState } from "react";
import type { CharacterClassLevel } from "../../../packages/types/src/index.js";

export function CharacterDetails({ name, classId, additionalClassLevels, additionalArchetypeIds, prestigeSpellcastingTargets, archetypeId, ancestryId, level, classes, archetypes, ancestries, saveNotice, autosaveStatus, recoveryAvailable, onRecover, onDismissRecovery, onNameChange, onClassChange, onAdditionalClassLevelsChange, onAdditionalArchetypeChange, onPrestigeSpellcastingTargetChange, onArchetypeChange, onAncestryChange, onLevelChange, onReviewLevelUp, onSave, onLoad, onImport, onExport, onPrint, onReset }: {
  name: string;
  classId: string;
  additionalClassLevels: CharacterClassLevel[];
  additionalArchetypeIds: Record<string, string>;
  prestigeSpellcastingTargets: Record<string, string[]>;
  archetypeId: string;
  ancestryId: string;
  level: number;
  classes: Array<{ id: string; name: string; classType: string; maximumLevel?: number; requirements?: string[]; spellcasting?: { tradition?: "arcane" | "divine" }; spellcastingAdvancement?: { tradition: "arcane" | "divine" | "any"; levels: number[]; targetCount?: number; targetTraditions?: Array<"arcane" | "divine"> } }>;
  archetypes: Array<{ id: string; name: string; classId: string }>;
  ancestries: Array<{ id: string; name: string }>;
  saveNotice: string;
  autosaveStatus: string;
  recoveryAvailable: boolean;
  onRecover: () => void;
  onDismissRecovery: () => void;
  onNameChange: (name: string) => void;
  onClassChange: (classId: string) => void;
  onAdditionalClassLevelsChange: (classLevels: CharacterClassLevel[]) => void;
  onAdditionalArchetypeChange: (classId: string, archetypeId: string) => void;
  onPrestigeSpellcastingTargetChange: (prestigeClassId: string, targetClassId: string, targetIndex?: number) => void;
  onArchetypeChange: (archetypeId: string) => void;
  onAncestryChange: (ancestryId: string) => void;
  onLevelChange: (level: number) => void;
  onReviewLevelUp: () => void;
  onSave: (nameOverride?: string) => void;
  onLoad: () => void;
  onImport: (file: File) => void | Promise<void>;
  onExport: () => void;
  onPrint: () => void;
  onReset: () => void;
}) {
  const importInput = useRef<HTMLInputElement>(null);
  const nameCommitTimer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const [nameDraft, setNameDraft] = useState(name);
  const primaryArchetypes = archetypes.filter((item) => item.classId === classId);
  const selectedClassName = classes.find((item) => item.id === classId)?.name ?? "this class";
  useEffect(() => setNameDraft(name), [name]);
  useEffect(() => () => { if (nameCommitTimer.current !== null) globalThis.clearTimeout(nameCommitTimer.current); }, []);
  const cancelNameCommit = () => {
    if (nameCommitTimer.current !== null) globalThis.clearTimeout(nameCommitTimer.current);
    nameCommitTimer.current = null;
  };
  const scheduleNameCommit = () => {
    cancelNameCommit();
    if (nameDraft !== name) nameCommitTimer.current = globalThis.setTimeout(() => {
      nameCommitTimer.current = null;
      onNameChange(nameDraft);
    }, 0);
  };
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
    const classMaximum = classes.find((item) => item.id === additionalClassLevels[index]?.classId)?.maximumLevel ?? 20;
    const maximum = Math.max(1, Math.min(classMaximum, level - otherLevels - 1));
    onAdditionalClassLevelsChange(additionalClassLevels.map((entry, entryIndex) => entryIndex === index ? { ...entry, level: Math.max(1, Math.min(maximum, nextLevel || 1)) } : entry));
  };
  return <section className="builder" aria-label="Character details">
    <label>Character name<input value={nameDraft} placeholder="Unnamed hero" onChange={(event) => setNameDraft(event.target.value)} onBlur={(event) => { const nextAction = (event.relatedTarget as HTMLElement | null)?.closest("button")?.textContent?.trim(); if (!["Load", "Import", "Reset"].includes(nextAction ?? "")) scheduleNameCommit(); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
    <details className="sidebar-collapsible character-setup-section" open>
    <summary>Character setup</summary>
    <div className="sidebar-collapsible-content">
    <fieldset className="class-plan">
      <legend>Class progression</legend>
      <div className="primary-class-row">
        <label>Starting class<select aria-label="Class" value={classId} onChange={(event) => onClassChange(event.target.value)}>{classes.filter((item) => item.classType !== "prestige").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <span><small>Class levels</small><strong>{primaryLevels}</strong></span>
      </div>
    {additionalClassLevels.map((entry, index) => {
      const label = index === 0 ? "Additional class" : `Additional class ${index + 1}`;
      const levelLabel = index === 0 ? "Additional class levels" : `Additional class ${index + 1} levels`;
      const otherLevels = assignedAdditionalLevels - entry.level;
      const selectedClass = classes.find((item) => item.id === entry.classId);
      const maximumClassLevels = selectedClass?.maximumLevel ?? 20;
      const maximumEntryLevels = Math.max(1, Math.min(maximumClassLevels, level - otherLevels - 1));
      const classArchetypes = archetypes.filter((archetype) => archetype.classId === entry.classId);
      const divineClassIds = new Set(["cleric", "druid", "oracle", "paladin", "ranger"]);
      const advancement = selectedClass?.spellcastingAdvancement;
      const spellcastingTradition = (candidate: typeof classes[number]) => candidate.spellcasting?.tradition ?? (divineClassIds.has(candidate.id) ? "divine" : "arcane");
      const eligibleSpellcastingClasses = classes.filter((candidate) => availableClassIds.has(candidate.id) && candidate.id !== entry.classId && candidate.spellcasting && (
        advancement?.tradition === "any" || advancement?.tradition === spellcastingTradition(candidate)
      ));
      const targetTraditions = advancement?.targetTraditions ?? (advancement ? Array.from({ length: advancement.targetCount ?? 1 }, () => advancement.tradition) : []);
      return <div className="additional-class-row" key={`${entry.classId}-${index}`}>
        <label>{label}<select aria-label={label} value={entry.classId} onChange={(event) => updateAdditionalClass(index, event.target.value)}><option value="">Remove class</option>{classes.filter((item) => item.id === entry.classId || !availableClassIds.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}{item.classType === "prestige" ? " (prestige)" : ""}</option>)}</select></label>
        <label>{levelLabel}<input aria-label={levelLabel} type="number" min="1" max={maximumEntryLevels} value={entry.level} onChange={(event) => updateAdditionalLevel(index, Number(event.target.value))} /></label>
        {selectedClass?.classType === "prestige" && <div className="prestige-requirements"><strong>Entry requirements</strong><ul>{selectedClass.requirements?.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul><small>Confirm these requirements before adding the first prestige-class level.</small></div>}
        {advancement && targetTraditions.map((targetTradition, targetIndex) => {
          const targetCandidates = eligibleSpellcastingClasses.filter((candidate) => targetTradition === "any" || spellcastingTradition(candidate) === targetTradition);
          if (targetCandidates.length === 0) return null;
          const selectedTarget = prestigeSpellcastingTargets[entry.classId]?.[targetIndex] ?? (targetCandidates.length === 1 ? targetCandidates[0].id : "");
          const targetLabel = targetTraditions.length > 1 ? `${selectedClass?.name ?? "Prestige class"} ${targetTradition} spellcasting class` : `${selectedClass?.name ?? "Prestige class"} spellcasting class`;
          return <label className="prestige-spellcasting-target" key={`${entry.classId}-${targetTradition}-${targetIndex}`}>Advance {targetTradition === "any" ? "" : `${targetTradition} `}spellcasting<select aria-label={targetLabel} value={selectedTarget} onChange={(event) => onPrestigeSpellcastingTargetChange(entry.classId, event.target.value, targetIndex)}><option value="">Choose a class</option>{targetCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>;
        })}
        {classArchetypes.length > 0 && <label>{classes.find((item) => item.id === entry.classId)?.name ?? label} archetype<select aria-label={`${classes.find((item) => item.id === entry.classId)?.name ?? label} archetype`} value={additionalArchetypeIds[entry.classId] ?? ""} onChange={(event) => onAdditionalArchetypeChange(entry.classId, event.target.value)}><option value="">Standard class</option>{classArchetypes.map((archetype) => <option key={archetype.id} value={archetype.id}>{archetype.name}</option>)}</select></label>}
        <button type="button" className="secondary-button" aria-label={`Remove ${classes.find((item) => item.id === entry.classId)?.name ?? label}`} onClick={() => updateAdditionalClass(index, "")}>Remove</button>
      </div>;
    })}
    {level === 1 && <div className="multiclass-locked"><strong>Multiclassing unlocks at level 2</strong><small>Your first character level always belongs to your starting class. Use Review level 2 when you are ready to continue this class or begin another one.</small></div>}
    {level >= 2 && additionalClassLevels.length === 0 && <label>Multiclass<select aria-label="Additional class" value="" onChange={(event) => event.target.value && onAdditionalClassLevelsChange([{ classId: event.target.value, level: 1 }])}><option value="">Single class</option>{classes.filter((item) => item.id !== classId).map((item) => <option key={item.id} value={item.id}>{item.name}{item.classType === "prestige" ? " (prestige)" : ""}</option>)}</select><small className="field-help">Assign at least one of your {level - 1} later levels to another class.</small></label>}
    {additionalClassLevels.length > 0 && additionalClassLevels.length < classes.length - 1 && primaryLevels > 1 && <button type="button" className="add-class-button" onClick={() => {
      const nextClass = classes.find((item) => !availableClassIds.has(item.id));
      if (nextClass) onAdditionalClassLevelsChange([...additionalClassLevels, { classId: nextClass.id, level: 1 }]);
    }}>Add another class</button>}
    {additionalClassLevels.length > 0 && <p className="class-level-summary">{level} total levels · {primaryLevels} in your starting class · {assignedAdditionalLevels} in other classes.</p>}
    </fieldset>
    <label>Archetype<select aria-label="Archetype" value={archetypeId} disabled={primaryArchetypes.length === 0} onChange={(event) => onArchetypeChange(event.target.value)}><option value="">{primaryArchetypes.length === 0 ? `No ${selectedClassName} archetypes available` : "Standard class"}</option>{primaryArchetypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small className="field-help">{primaryArchetypes.length === 0 ? `The current catalogue does not yet include archetypes for ${selectedClassName}. Choose a class with supported archetypes to see its options.` : `${primaryArchetypes.length} class-specific archetype${primaryArchetypes.length === 1 ? "" : "s"} available.`}</small></label>
    <label>Ancestry<select value={ancestryId} onChange={(event) => onAncestryChange(event.target.value)}>{ancestries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Level<input type="number" min="1" max="20" value={level} onChange={(event) => onLevelChange(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} />{level < 20 && <button type="button" className="level-up-trigger" onClick={onReviewLevelUp}>Review level {level + 1}</button>}</label>
    </div>
    </details>
    <details className="sidebar-collapsible character-file-section" open>
      <summary>Character file</summary>
      <div className="sidebar-collapsible-content character-actions">
      {recoveryAvailable && <div className="recovery-notice" role="status"><strong>Unsaved work is available</strong><span>Recover the latest local autosave or dismiss it.</span><div><button type="button" onClick={onRecover}>Recover autosave</button><button type="button" className="secondary-button" onClick={onDismissRecovery}>Dismiss</button></div></div>}
      <div><button type="button" onClick={() => onSave(nameDraft)}>Save</button><button type="button" onClick={() => { cancelNameCommit(); setNameDraft(name); onLoad(); }}>Load</button><button type="button" onClick={() => { cancelNameCommit(); importInput.current?.click(); }}>Import</button><input ref={importInput} hidden type="file" accept="application/json,.json" aria-label="Import character file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImport(file); event.target.value = ""; }} /><button type="button" onClick={onExport}>Export</button><button type="button" onClick={onPrint}>Print</button><button className="danger-button" type="button" onClick={() => { cancelNameCommit(); setNameDraft(""); onReset(); }}>Reset</button></div>
      <small className="autosave-status" aria-live="polite">{autosaveStatus}</small>
      <small aria-live="polite">{saveNotice}</small>
      </div>
    </details>
  </section>;
}
