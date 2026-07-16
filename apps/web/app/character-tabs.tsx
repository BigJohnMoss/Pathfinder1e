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

export function CharacterTabs({ activeTab, onChange }: { activeTab: CharacterTabId; onChange: (tab: CharacterTabId) => void }) {
  return <nav className="character-tabs" aria-label="Character sections">{tabs.map((tab) => <button key={tab.id} type="button" aria-current={activeTab === tab.id ? "page" : undefined} className={activeTab === tab.id ? "active" : ""} onClick={() => onChange(tab.id)}><span aria-hidden="true">{tab.icon}</span><b>{tab.label}</b></button>)}</nav>;
}

export function StoragePlaceholder() {
  return <section className="storage-placeholder"><p className="eyebrow">STORAGE</p><h2>Equipment and carried items</h2><p>Inventory, currency, and encumbrance controls will live here. Current carrying-capacity rules are ready for the equipment catalogue to connect.</p></section>;
}
