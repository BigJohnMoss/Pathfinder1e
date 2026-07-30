import { useState } from "react";
import type { CharacterDraftV1 } from "../../../packages/types/src/index.js";

export const characterLibraryKey = "pf1e-character-library";
export const legacyCharacterKey = "pf1e-character-draft";
export const characterAutosaveKey = "pf1e-character-autosave";

export interface CharacterVersion {
  savedAt: string;
  draft: CharacterDraftV1;
}

export interface CharacterLibraryEntry {
  id: string;
  updatedAt: string;
  draft: CharacterDraftV1;
  versions?: CharacterVersion[];
}

export interface CharacterLibraryV1 {
  version: 1;
  activeCharacterId: string | null;
  characters: CharacterLibraryEntry[];
}

export const emptyCharacterLibrary = (): CharacterLibraryV1 => ({
  version: 1,
  activeCharacterId: null,
  characters: [],
});

export function normalizeCharacterLibrary(value: unknown): CharacterLibraryV1 {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) {
    return emptyCharacterLibrary();
  }
  const candidate = value as Partial<CharacterLibraryV1>;
  const characters = Array.isArray(candidate.characters)
    ? candidate.characters.filter((entry): entry is CharacterLibraryEntry => Boolean(
      entry && typeof entry.id === "string" && typeof entry.updatedAt === "string"
      && entry.draft && entry.draft.version === 1,
    ))
      .map((entry) => ({
        ...entry,
        versions: Array.isArray(entry.versions)
          ? entry.versions.filter((version): version is CharacterVersion => Boolean(
            version && typeof version.savedAt === "string" && version.draft?.version === 1,
          )).slice(-5)
          : [],
      }))
    : [];
  const activeCharacterId = typeof candidate.activeCharacterId === "string"
    && characters.some((entry) => entry.id === candidate.activeCharacterId)
    ? candidate.activeCharacterId
    : null;
  return { version: 1, activeCharacterId, characters };
}

export function CharacterLibrary({ library, classNames, ancestryNames, onOpen, onRestoreVersion, onDelete, onNew }: {
  library: CharacterLibraryV1;
  classNames: Record<string, string>;
  ancestryNames: Record<string, string>;
  onOpen: (entry: CharacterLibraryEntry) => void;
  onRestoreVersion: (entry: CharacterLibraryEntry, version: CharacterVersion) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const entries = [...library.characters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <section className="character-library" aria-labelledby="character-library-title">
    <div className="library-heading">
      <div><p className="eyebrow">CHARACTER LIBRARY</p><h2 id="character-library-title">Your characters</h2></div>
      <button type="button" onClick={onNew}>New character</button>
    </div>
    {entries.length === 0
      ? <p className="library-empty">No saved characters yet. Save the current character to add it here.</p>
      : <ul>{entries.map((entry) => <li key={entry.id} className={entry.id === library.activeCharacterId ? "active" : ""}>
        <div>
          <strong>{entry.draft.name.trim() || "Unnamed hero"}</strong>
          <span>Level {entry.draft.level} {ancestryNames[entry.draft.ancestryId] ?? entry.draft.ancestryId} {classNames[entry.draft.classId] ?? entry.draft.classId}</span>
          <small>Updated {new Date(entry.updatedAt).toLocaleString()}</small>
        </div>
        <div className="library-actions">
          <button type="button" onClick={() => onOpen(entry)}>{entry.id === library.activeCharacterId ? "Reload" : "Open"}</button>
          {confirmDeleteId === entry.id
            ? <><button className="danger-button" type="button" onClick={() => { onDelete(entry.id); setConfirmDeleteId(null); }}>Confirm delete</button><button type="button" onClick={() => setConfirmDeleteId(null)}>Cancel</button></>
            : <button className="danger-button" type="button" onClick={() => setConfirmDeleteId(entry.id)}>Delete</button>}
        </div>
        {entry.versions && entry.versions.length > 0 && <details className="character-versions">
          <summary>Recent versions ({entry.versions.length})</summary>
          <ul>{[...entry.versions].reverse().map((version) => <li key={version.savedAt}>
            <span>{new Date(version.savedAt).toLocaleString()}</span>
            <button type="button" onClick={() => onRestoreVersion(entry, version)}>Restore</button>
          </li>)}</ul>
        </details>}
      </li>)}</ul>}
  </section>;
}
