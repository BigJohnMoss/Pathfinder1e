export type CharacterTabId = "overview" | "actions" | "storage" | "spells" | "skills" | "feats" | "features" | "options";

const tabs: Array<{ id: CharacterTabId; icon: string; label: string; displayLabel: string; description: string }> = [
  { id: "overview", icon: "◉", label: "Basic info", displayLabel: "Overview", description: "Abilities & defenses" },
  { id: "actions", icon: "⚔", label: "Actions", displayLabel: "Combat", description: "HP, attacks & rounds" },
  { id: "storage", icon: "▣", label: "Storage", displayLabel: "Inventory", description: "Gear, coins & saves" },
  { id: "spells", icon: "✦", label: "Spells", displayLabel: "Spellbook", description: "Prepare, learn & cast" },
  { id: "skills", icon: "✎", label: "Skills", displayLabel: "Skills", description: "Ranks & totals" },
  { id: "feats", icon: "◆", label: "Feats", displayLabel: "Feats", description: "Slots & feat trees" },
  { id: "features", icon: "✺", label: "Features", displayLabel: "Class", description: "Features & choices" },
  { id: "options", icon: "☰", label: "Options", displayLabel: "Traits", description: "Character traits" },
];

export function CharacterTabs({ activeTab, onChange, showSpells = true }: { activeTab: CharacterTabId; onChange: (tab: CharacterTabId) => void; showSpells?: boolean }) {
  const visibleTabs = showSpells ? tabs : tabs.filter((tab) => tab.id !== "spells");
  const selectAdjacentTab = (currentIndex: number, direction: -1 | 1) => {
    const next = visibleTabs[(currentIndex + direction + visibleTabs.length) % visibleTabs.length];
    onChange(next.id);
    globalThis.setTimeout(() => document.getElementById(`character-tab-${next.id}`)?.focus(), 0);
  };
  return <nav className="character-tabs" aria-label="Character sections" role="tablist">{visibleTabs.map((tab, index) => <button
    key={tab.id}
    id={`character-tab-${tab.id}`}
    type="button"
    role="tab"
    aria-label={tab.label}
    aria-controls="character-tab-panel"
    aria-selected={activeTab === tab.id}
    tabIndex={activeTab === tab.id ? 0 : -1}
    className={activeTab === tab.id ? "active" : ""}
    title={`${tab.displayLabel}: ${tab.description}`}
    onClick={() => onChange(tab.id)}
    onKeyDown={(event) => {
      if (event.key === "ArrowRight") { event.preventDefault(); selectAdjacentTab(index, 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); selectAdjacentTab(index, -1); }
      if (event.key === "Home") { event.preventDefault(); onChange(visibleTabs[0].id); globalThis.setTimeout(() => document.getElementById(`character-tab-${visibleTabs[0].id}`)?.focus(), 0); }
      if (event.key === "End") { event.preventDefault(); onChange(visibleTabs[visibleTabs.length - 1].id); globalThis.setTimeout(() => document.getElementById(`character-tab-${visibleTabs[visibleTabs.length - 1].id}`)?.focus(), 0); }
    }}
  ><span aria-hidden="true">{tab.icon}</span><b aria-hidden="true">{tab.displayLabel}</b><small aria-hidden="true">{tab.description}</small></button>)}</nav>;
}
