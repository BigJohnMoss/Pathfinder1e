import { encumbrance } from "../../../packages/engine/src/index.js";

export type InventoryEntry = { itemId: string; quantity: number; equipped: boolean };
export type CoinPurse = { cp: number; sp: number; gp: number; pp: number };
type EquipmentItem = { id: string; name: string; category: "armor" | "shield" | "weapon" | "gear"; costGp: number; weight: number; armorBonus?: number; damage?: string; critical?: string; range?: number; ranged?: boolean };

export const equipmentItems: EquipmentItem[] = [
  { id: "backpack", name: "Backpack", category: "gear", costGp: 2, weight: 2 },
  { id: "bedroll", name: "Bedroll", category: "gear", costGp: 0.1, weight: 5 },
  { id: "rope-hemp-50", name: "Rope, hemp (50 ft.)", category: "gear", costGp: 1, weight: 10 },
  { id: "torch", name: "Torch", category: "gear", costGp: 0.01, weight: 1 },
  { id: "trail-rations", name: "Trail rations (1 day)", category: "gear", costGp: 0.5, weight: 1 },
  { id: "waterskin", name: "Waterskin", category: "gear", costGp: 1, weight: 4 },
  { id: "dagger", name: "Dagger", category: "weapon", costGp: 2, weight: 1, damage: "1d4", critical: "19–20/×2", range: 10 },
  { id: "longsword", name: "Longsword", category: "weapon", costGp: 15, weight: 4, damage: "1d8", critical: "19–20/×2" },
  { id: "longbow", name: "Longbow", category: "weapon", costGp: 75, weight: 3, damage: "1d8", critical: "×3", range: 100, ranged: true },
  { id: "leather-armor", name: "Leather armor", category: "armor", costGp: 10, weight: 15, armorBonus: 2 },
  { id: "chain-shirt", name: "Chain shirt", category: "armor", costGp: 100, weight: 25, armorBonus: 4 },
  { id: "heavy-wooden-shield", name: "Heavy wooden shield", category: "shield", costGp: 7, weight: 10, armorBonus: 2 }
];

export const equipmentArmorBonus = (inventory: InventoryEntry[]) => inventory.reduce((total, entry) => {
  const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
  return total + (entry.equipped ? item?.armorBonus ?? 0 : 0);
}, 0);

const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export function EquipmentPanel({ strength, strengthModifier, dexterityModifier, baseAttackBonus, inventory, coins, onInventoryChange, onCoinsChange }: {
  strength: number;
  strengthModifier: number;
  dexterityModifier: number;
  baseAttackBonus: number;
  inventory: InventoryEntry[];
  coins: CoinPurse;
  onInventoryChange: (inventory: InventoryEntry[]) => void;
  onCoinsChange: (coins: CoinPurse) => void;
}) {
  const carried = inventory.flatMap((entry) => {
    const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
    return item ? [{ weight: item.weight, quantity: entry.quantity }] : [];
  });
  const load = encumbrance(strength, carried);
  const addItem = (itemId: string) => {
    if (!itemId) return;
    const existing = inventory.find((entry) => entry.itemId === itemId);
    onInventoryChange(existing ? inventory.map((entry) => entry.itemId === itemId ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...inventory, { itemId, quantity: 1, equipped: false }]);
  };
  const updateEntry = (itemId: string, update: Partial<InventoryEntry>) => onInventoryChange(inventory.map((entry) => entry.itemId === itemId ? { ...entry, ...update } : entry));
  const removeEntry = (itemId: string) => onInventoryChange(inventory.filter((entry) => entry.itemId !== itemId));
  const equip = (entry: InventoryEntry, item: EquipmentItem, equipped: boolean) => {
    const exclusive = item.category === "armor";
    onInventoryChange(inventory.map((candidate) => {
      const candidateItem = equipmentItems.find((record) => record.id === candidate.itemId);
      if (candidate.itemId === entry.itemId) return { ...candidate, equipped };
      return exclusive && equipped && candidateItem?.category === "armor" ? { ...candidate, equipped: false } : candidate;
    }));
  };

  return <section className="equipment-panel">
    <div><p className="eyebrow">STORAGE</p><h2>Equipment and carried items</h2><p>Add Core adventuring gear, track money and weight, and equip armor, shields, and weapons.</p></div>
    <div className="coin-purse" aria-label="Coin purse">{(["cp", "sp", "gp", "pp"] as const).map((coin) => <label key={coin}>{coin.toUpperCase()}<input type="number" min="0" value={coins[coin]} onChange={(event) => onCoinsChange({ ...coins, [coin]: Math.max(0, Number.parseInt(event.target.value, 10) || 0) })} /></label>)}</div>
    <div className="equipment-add"><label>Add item<select aria-label="Equipment catalogue" defaultValue="" onChange={(event) => { addItem(event.target.value); event.target.value = ""; }}><option value="">Choose equipment</option>{equipmentItems.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.costGp} gp, {item.weight} lb.</option>)}</select></label></div>
    <div className={`load-summary ${load.load}`}><strong>{load.carriedWeight} lb. carried — {load.load} load</strong><span>Light {load.capacity.light} lb. · Medium {load.capacity.medium} lb. · Heavy {load.capacity.heavy} lb.</span></div>
    {inventory.length === 0 ? <p className="empty-tab">No equipment added yet.</p> : <div className="inventory-list">{inventory.map((entry) => {
      const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
      if (!item) return null;
      const equippable = item.category !== "gear";
      const attack = item.damage ? baseAttackBonus + (item.ranged ? dexterityModifier : strengthModifier) : null;
      return <article key={entry.itemId}><div><strong>{item.name}</strong><span>{item.category} · {item.weight * entry.quantity} lb. · {item.costGp * entry.quantity} gp</span>{attack !== null && <small>Attack {signed(attack)} · Damage {item.damage}{!item.ranged && strengthModifier !== 0 ? ` ${signed(strengthModifier)}` : ""} · Critical {item.critical ?? "×2"}{item.range ? ` · Range ${item.range} ft.` : ""}</small>}</div><label>Qty<input aria-label={`${item.name} quantity`} type="number" min="1" max="999" value={entry.quantity} onChange={(event) => updateEntry(entry.itemId, { quantity: Math.max(1, Math.min(999, Number.parseInt(event.target.value, 10) || 1)) })} /></label>{equippable && <label className="equip-toggle"><input type="checkbox" checked={entry.equipped} onChange={(event) => equip(entry, item, event.target.checked)} />Equipped</label>}<button type="button" onClick={() => removeEntry(entry.itemId)}>Remove</button></article>;
    })}</div>}
  </section>;
}
