import { encumbrance } from "../../../packages/engine/src/index.js";
import coreEquipment from "../../../packages/data/src/equipment/core-equipment.json";
import { useMemo, useState } from "react";
import type { ArcaneSpellFailureRules } from "../../../packages/types/src/index.js";

export type InventoryEntry = { itemId: string; quantity: number; equipped: boolean; enhancementBonus?: number };
export type CoinPurse = { cp: number; sp: number; gp: number; pp: number };
export type EquipmentItem = {
  id: string;
  name: string;
  category: "armor" | "shield" | "weapon" | "gear" | "magic";
  costGp: number;
  weight: number;
  armorBonus?: number;
  armorCategory?: "light" | "medium" | "heavy";
  arcaneSpellFailure?: number;
  damage?: string;
  critical?: string;
  range?: number;
  ranged?: boolean;
  magicBonus?: { armorClass?: { deflection?: number; natural?: number }; saves?: number };
};
export type EquipmentAttack = { id: string; name: string; attack: number; damage: string; damageBonus: number; critical: string; range?: number; enhancementBonus?: number };

export const equipmentItems = coreEquipment.items as EquipmentItem[];

export const equipmentMarketPrice = (entry: InventoryEntry) => {
  const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
  if (!item) return 0;
  const enhancement = Math.max(0, Math.min(5, entry.enhancementBonus ?? 0));
  const magicPrice = item.category === "weapon"
    ? enhancement ** 2 * 2000 + (enhancement > 0 ? 300 : 0)
    : ["armor", "shield"].includes(item.category)
      ? enhancement ** 2 * 1000 + (enhancement > 0 ? 150 : 0)
      : 0;
  return item.costGp + magicPrice;
};

export const equipmentCombatBonuses = (inventory: InventoryEntry[]) => {
  let armor = 0;
  let deflection = 0;
  let natural = 0;
  let resistance = 0;
  for (const entry of inventory.filter((candidate) => candidate.equipped)) {
    const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
    if (!item) continue;
    armor += (item.armorBonus ?? 0) + (["armor", "shield"].includes(item.category) ? entry.enhancementBonus ?? 0 : 0);
    deflection = Math.max(deflection, item.magicBonus?.armorClass?.deflection ?? 0);
    natural = Math.max(natural, item.magicBonus?.armorClass?.natural ?? 0);
    resistance = Math.max(resistance, item.magicBonus?.saves ?? 0);
  }
  return {
    armorClass: { normal: armor + deflection + natural, touch: deflection, flatFooted: armor + deflection + natural },
    saves: { fortitude: resistance, reflex: resistance, will: resistance }
  };
};

export const equipmentArmorBonus = (inventory: InventoryEntry[]) => equipmentCombatBonuses(inventory).armorClass.normal;

export const equippedArmorCategory = (inventory: InventoryEntry[]): "none" | "light" | "medium" | "heavy" => {
  const order = { none: 0, light: 1, medium: 2, heavy: 3 } as const;
  return inventory
    .filter((entry) => entry.equipped)
    .map((entry) => equipmentItems.find((item) => item.id === entry.itemId)?.armorCategory ?? "none")
    .reduce<"none" | "light" | "medium" | "heavy">((heaviest, category) => order[category] > order[heaviest] ? category : heaviest, "none");
};

export const equippedShieldBonus = (inventory: InventoryEntry[]) => inventory
  .filter((entry) => entry.equipped)
  .reduce((best, entry) => {
    const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
    return item?.category === "shield"
      ? Math.max(best, (item.armorBonus ?? 0) + (entry.enhancementBonus ?? 0))
      : best;
  }, 0);

export const equippedArcaneSpellFailureChance = (
  inventory: InventoryEntry[],
  rules: ArcaneSpellFailureRules | undefined,
  classLevel: number,
) => {
  if (rules?.applies === false) return 0;
  const ignoredArmor = new Set((rules?.ignoredArmorCategories ?? [])
    .filter(({ minimumLevel }) => classLevel >= minimumLevel)
    .map(({ category }) => category));
  const ignoresShields = Boolean(rules?.ignoreShieldsAtLevel && classLevel >= rules.ignoreShieldsAtLevel);
  return Math.min(100, inventory.reduce((chance, entry) => {
    if (!entry.equipped) return chance;
    const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
    if (!item?.arcaneSpellFailure) return chance;
    if (item.category === "armor" && item.armorCategory && ignoredArmor.has(item.armorCategory)) return chance;
    if (item.category === "shield" && ignoresShields) return chance;
    return chance + item.arcaneSpellFailure;
  }, 0));
};

export const equipmentEncumbrance = (strength: number, inventory: InventoryEntry[]) => encumbrance(strength, inventory.flatMap((entry) => {
  const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
  return item ? [{ weight: item.weight, quantity: entry.quantity }] : [];
}));

const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export const equippedWeaponAttacks = (inventory: InventoryEntry[], baseAttackBonus: number, strengthModifier: number, dexterityModifier: number, weaponBonuses: Record<string, { attack: number; damage: number }> = {}, minimumWeaponEnhancements: Record<string, number> = {}): EquipmentAttack[] => inventory.flatMap((entry) => {
  const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
  if (!item?.damage || !entry.equipped) return [];
  const featBonus = weaponBonuses[item.id] ?? weaponBonuses[item.name.toLowerCase()] ?? { attack: 0, damage: 0 };
  const enhancement = Math.max(entry.enhancementBonus ?? 0, minimumWeaponEnhancements[item.id] ?? minimumWeaponEnhancements[item.name.toLowerCase()] ?? 0);
  return [{
    id: item.id,
    name: `${item.name}${enhancement > 0 ? ` +${enhancement}` : ""}`,
    attack: baseAttackBonus + (item.ranged ? dexterityModifier : strengthModifier) + featBonus.attack + enhancement,
    damage: item.damage,
    damageBonus: (item.ranged ? 0 : strengthModifier) + featBonus.damage + enhancement,
    critical: item.critical ?? "×2",
    range: item.range,
    enhancementBonus: enhancement,
  }];
});

export const unarmedStrikeAttack = (baseAttackBonus: number, strengthModifier: number, size: string, monkLevel = 0, weaponBonuses: Record<string, { attack: number; damage: number }> = {}): EquipmentAttack => {
  const small = String(size).toLowerCase() === "small";
  const monkDamage = monkLevel >= 20 ? (small ? "2d8" : "2d10")
    : monkLevel >= 16 ? (small ? "2d6" : "2d8")
      : monkLevel >= 12 ? (small ? "1d10" : "2d6")
        : monkLevel >= 8 ? (small ? "1d8" : "1d10")
          : monkLevel >= 4 ? (small ? "1d6" : "1d8")
            : (small ? "1d4" : "1d6");
  const bonus = weaponBonuses["unarmed-strike"] ?? weaponBonuses["unarmed strike"] ?? { attack: 0, damage: 0 };
  return {
    id: "unarmed-strike",
    name: "Unarmed strike",
    attack: baseAttackBonus + strengthModifier + bonus.attack,
    damage: monkLevel > 0 ? monkDamage : small ? "1d2" : "1d3",
    damageBonus: strengthModifier + bonus.damage,
    critical: "×2",
    enhancementBonus: 0,
  };
};

export function EquipmentPanel({ strength, strengthModifier, dexterityModifier, baseAttackBonus, weaponBonuses = {}, minimumWeaponEnhancements = {}, proficiencyRules = [], inventory, coins, onInventoryChange, onCoinsChange }: {
  strength: number;
  strengthModifier: number;
  dexterityModifier: number;
  baseAttackBonus: number;
  weaponBonuses?: Record<string, { attack: number; damage: number }>;
  minimumWeaponEnhancements?: Record<string, number>;
  proficiencyRules?: Array<{ label: string; proficiencies: string[]; condition?: string; source: string }>;
  inventory: InventoryEntry[];
  coins: CoinPurse;
  onInventoryChange: (inventory: InventoryEntry[]) => void;
  onCoinsChange: (coins: CoinPurse) => void;
}) {
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [catalogueCategory, setCatalogueCategory] = useState<EquipmentItem["category"] | "all">("all");
  const filteredEquipment = useMemo(() => {
    const query = catalogueQuery.trim().toLocaleLowerCase();
    return equipmentItems.filter((item) => (catalogueCategory === "all" || item.category === catalogueCategory) && (!query || item.name.toLocaleLowerCase().includes(query)));
  }, [catalogueCategory, catalogueQuery]);
  const load = equipmentEncumbrance(strength, inventory);
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
    <div className="equipment-add">
      <label>Find equipment<input type="search" value={catalogueQuery} onChange={(event) => setCatalogueQuery(event.target.value)} placeholder="Search by name" /></label>
      <label>Category<select aria-label="Equipment category" value={catalogueCategory} onChange={(event) => setCatalogueCategory(event.target.value as typeof catalogueCategory)}><option value="all">All categories</option><option value="weapon">Weapons</option><option value="armor">Armor</option><option value="shield">Shields</option><option value="gear">Adventuring gear</option><option value="magic">Magic items</option></select></label>
      <label>Add item<select aria-label="Equipment catalogue" value="" onChange={(event) => addItem(event.target.value)}><option value="">{filteredEquipment.length ? `Choose from ${filteredEquipment.length} items` : "No matching equipment"}</option>{filteredEquipment.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.costGp} gp, {item.weight} lb.</option>)}</select></label>
    </div>
    <div className={`load-summary ${load.load}`}><strong>{load.carriedWeight} lb. carried — {load.load} load</strong><span>Light {load.capacity.light} lb. · Medium {load.capacity.medium} lb. · Heavy {load.capacity.heavy} lb.</span></div>
    {proficiencyRules.length > 0 && <section className="conditional-modifiers" aria-labelledby="archetype-weapon-rules-title">
      <h3 id="archetype-weapon-rules-title">Archetype weapon rules</h3>
      <ul>{proficiencyRules.map((rule, index) => <li key={`${rule.source}-${rule.label}-${index}`}>
        <strong>{rule.label}</strong>
        <span>{rule.proficiencies.join(", ")}{rule.condition ? ` · ${rule.condition}` : ""} · {rule.source}</span>
      </li>)}</ul>
    </section>}
    {inventory.length === 0 ? <p className="empty-tab">No equipment added yet.</p> : <div className="inventory-list">{inventory.map((entry) => {
      const item = equipmentItems.find((candidate) => candidate.id === entry.itemId);
      if (!item) return null;
      const equippable = item.category !== "gear";
      const featBonus = weaponBonuses[item.id] ?? weaponBonuses[item.name.toLowerCase()] ?? { attack: 0, damage: 0 };
      const enhancement = Math.max(entry.enhancementBonus ?? 0, minimumWeaponEnhancements[item.id] ?? minimumWeaponEnhancements[item.name.toLowerCase()] ?? 0);
      const attack = item.damage ? baseAttackBonus + (item.ranged ? dexterityModifier : strengthModifier) + featBonus.attack + enhancement : null;
      const damageBonus = (item.ranged ? 0 : strengthModifier) + featBonus.damage + enhancement;
      const enhanceable = ["weapon", "armor", "shield"].includes(item.category);
      return <article key={entry.itemId}><div><strong>{item.name}{enhancement > 0 ? ` +${enhancement}` : ""}</strong><span>{item.category} · {item.weight * entry.quantity} lb. · {equipmentMarketPrice(entry) * entry.quantity} gp{item.arcaneSpellFailure ? ` · ${item.arcaneSpellFailure}% arcane spell failure` : ""}</span>{attack !== null && <small>Attack {signed(attack)} · Damage {item.damage}{damageBonus !== 0 ? ` ${signed(damageBonus)}` : ""} · Critical {item.critical ?? "×2"}{item.range ? ` · Range ${item.range} ft.` : ""}</small>}</div><label>Qty<input aria-label={`${item.name} quantity`} type="number" min="1" max="999" value={entry.quantity} onChange={(event) => updateEntry(entry.itemId, { quantity: Math.max(1, Math.min(999, Number.parseInt(event.target.value, 10) || 1)) })} /></label>{enhanceable && <label>Enhancement<select aria-label={`${item.name} enhancement`} value={enhancement} onChange={(event) => updateEntry(entry.itemId, { enhancementBonus: Number(event.target.value) })}>{Array.from({ length: 6 }, (_, bonus) => <option key={bonus} value={bonus}>{bonus === 0 ? "Mundane" : `+${bonus}`}</option>)}</select></label>}{equippable && <label className="equip-toggle"><input type="checkbox" checked={entry.equipped} onChange={(event) => equip(entry, item, event.target.checked)} />Equipped</label>}<button type="button" onClick={() => removeEntry(entry.itemId)}>Remove</button></article>;
    })}</div>}
  </section>;
}
