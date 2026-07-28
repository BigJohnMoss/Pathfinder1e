export type CharacterTabId = "overview" | "actions" | "storage" | "spells" | "skills" | "feats" | "features" | "options";

const tabs: Array<{ id: CharacterTabId; icon: string; label: string }> = [
  { id: "overview", icon: "◉", label: "Basic info" },
  { id: "actions", icon: "⚔", label: "Actions" },
  { id: "storage", icon: "▣", label: "Storage" },
  { id: "spells", icon: "✦", label: "Spells" },
  { id: "skills", icon: "✎", label: "Skills" },
  { id: "feats", icon: "◆", label: "Feats" },
  { id: "features", icon: "✺", label: "Features" },
  { id: "options", icon: "☰", label: "Options" }
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
    aria-controls="character-tab-panel"
    aria-selected={activeTab === tab.id}
    tabIndex={activeTab === tab.id ? 0 : -1}
    className={activeTab === tab.id ? "active" : ""}
    onClick={() => onChange(tab.id)}
    onKeyDown={(event) => {
      if (event.key === "ArrowRight") { event.preventDefault(); selectAdjacentTab(index, 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); selectAdjacentTab(index, -1); }
      if (event.key === "Home") { event.preventDefault(); onChange(visibleTabs[0].id); globalThis.setTimeout(() => document.getElementById(`character-tab-${visibleTabs[0].id}`)?.focus(), 0); }
      if (event.key === "End") { event.preventDefault(); onChange(visibleTabs[visibleTabs.length - 1].id); globalThis.setTimeout(() => document.getElementById(`character-tab-${visibleTabs[visibleTabs.length - 1].id}`)?.focus(), 0); }
    }}
  ><span aria-hidden="true">{tab.icon}</span><b>{tab.label}</b></button>)}</nav>;
}
