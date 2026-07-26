export type CharacterTabId = "overview" | "actions" | "storage" | "spells" | "skills" | "feats" | "features" | "options";

const tabs: Array<{ id: CharacterTabId; icon: string; label: string }> = [
  { id: "overview", icon: "tree", label: "Basic info" },
  { id: "actions", icon: "sword", label: "Actions" },
  { id: "storage", icon: "box", label: "Storage" },
  { id: "spells", icon: "star", label: "Spells" },
  { id: "skills", icon: "pencil", label: "Skills" },
  { id: "feats", icon: "diamond", label: "Feats" },
  { id: "features", icon: "burst", label: "Features" },
  { id: "options", icon: "menu", label: "Options" }
];

export function CharacterTabs({ activeTab, onChange }: { activeTab: CharacterTabId; onChange: (tab: CharacterTabId) => void }) {
  const selectAdjacentTab = (currentIndex: number, direction: -1 | 1) => {
    const next = tabs[(currentIndex + direction + tabs.length) % tabs.length];
    onChange(next.id);
    globalThis.setTimeout(() => document.getElementById(`character-tab-${next.id}`)?.focus(), 0);
  };
  const renderIcon = (icon: string) => {
    switch (icon) {
      case "tree":
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2C10 4 6 5 6 8c0 2 2 3 2 3H7a3 3 0 0 0-3 3c0 2 2 3 2 3h10s2-1 2-3a3 3 0 0 0-3-3h-1s2-1 2-3c0-3-4-4-6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
      case "sword":
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 21l3-3 7.5-7.5L13.5 6 6 13.5 3 21z" fill="currentColor"/><path d="M14 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
      case "box":
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M12 6v12" stroke="currentColor" strokeWidth="1.2"/></svg>;
      case "star":
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l2.6 6.6L21 10l-5 3.7L17.2 21 12 17.8 6.8 21 8 13.7 3 10l6.4-1.4L12 2z" fill="currentColor"/></svg>;
      case "pencil":
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 21l3-1 10.6-10.6 1-3L14 3 13 4 2 15v2z" fill="currentColor"/></svg>;
      case "diamond":
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l9 8-9 12L3 10 12 2z" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>;
      case "burst":
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
      case "menu":
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
      default:
        return <span aria-hidden="true">•</span>;
    }
  };

  return <nav className="character-tabs" aria-label="Character sections" role="tablist" aria-orientation="horizontal">{tabs.map((tab, index) => <button
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
      // Arrow navigation moves focus and activates the adjacent tab
      if (event.key === "ArrowRight") { event.preventDefault(); selectAdjacentTab(index, 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); selectAdjacentTab(index, -1); }
      // Home/End navigate to first/last
      if (event.key === "Home") { event.preventDefault(); onChange(tabs[0].id); globalThis.setTimeout(() => document.getElementById(`character-tab-${tabs[0].id}`)?.focus(), 0); }
      if (event.key === "End") { event.preventDefault(); onChange(tabs[tabs.length - 1].id); globalThis.setTimeout(() => document.getElementById(`character-tab-${tabs[tabs.length - 1].id}`)?.focus(), 0); }
      // Space or Enter activates the focused tab
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onChange(tab.id); }
    }}
  >
      <span aria-hidden="true" className="tab-icon">{renderIcon(tab.icon)}</span>
      <b>{tab.label}</b>
    </button>)}</nav>;
}
