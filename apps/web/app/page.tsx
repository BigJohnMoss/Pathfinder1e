"use client";

import { useMemo, useState } from "react";
import arcanist from "../../../packages/data/src/classes/arcanist.json";
import barbarian from "../../../packages/data/src/classes/barbarian.json";
import fighter from "../../../packages/data/src/classes/fighter.json";
import rogue from "../../../packages/data/src/classes/rogue.json";
import human from "../../../packages/data/src/races/human.json";
import combatCasting from "../../../packages/data/src/feats/combat-casting.json";
import powerAttack from "../../../packages/data/src/feats/power-attack.json";
import { abilityNames, characterCombatStats, classProgression, featPrerequisiteResults } from "../../../packages/engine/src/index.js";

const classes = [arcanist, barbarian, fighter, rogue];
const labels = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const defaultAbilities = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
const feats = [combatCasting, powerAttack];
const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;
const prerequisiteLabel = (prerequisite: { type: string; key?: string; minimum?: number; id?: string }) => {
  if (prerequisite.type === "ability") return `${labels[prerequisite.key as keyof typeof labels]} ${prerequisite.minimum}+`;
  if (prerequisite.type === "bab") return `BAB +${prerequisite.minimum}`;
  return prerequisite.id ?? prerequisite.type;
};

export default function Home() {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("arcanist");
  const [level, setLevel] = useState(1);
  const [humanAbility, setHumanAbility] = useState<keyof typeof defaultAbilities>("intelligence");
  const [baseAbilities, setBaseAbilities] = useState(defaultAbilities);
  const [selectedFeatIds, setSelectedFeatIds] = useState<string[]>([]);
  const characterClass = classes.find((item) => item.id === classId) ?? classes[0];
  const abilities = useMemo(() => ({ ...baseAbilities, [humanAbility]: baseAbilities[humanAbility] + 2 }), [baseAbilities, humanAbility]);
  const progression = useMemo(() => classProgression(characterClass, level, {
    intelligenceScore: abilities.intelligence,
    racialSkillBonusPerLevel: 1,
    bonusFeats: 1
  }), [abilities.intelligence, characterClass, level]);
  const combat = useMemo(() => characterCombatStats(characterClass, level, abilities), [abilities, characterClass, level]);
  const featSlots = useMemo(() => Array.from({ length: progression.featSlots }, (_, index) => ({ index, name: index === 0 ? "Human bonus feat" : `Feat ${index}` })), [progression.featSlots]);
  const updateAbility = (ability: keyof typeof defaultAbilities, value: number) => setBaseAbilities((current) => ({ ...current, [ability]: Math.max(1, Math.min(40, value || 1)) }));
  const updateFeat = (index: number, featId: string) => setSelectedFeatIds((current) => { const next = [...current]; next[index] = featId; return next; });

  return <main>
    <header><p className="eyebrow">PATHFINDER FIRST EDITION</p><h1>{name || "Character Builder"}</h1><p>Create a character foundation, then see the rules statistics it earns.</p></header>
    <section className="builder" aria-label="Character details">
      <label>Character name<input value={name} placeholder="Unnamed hero" onChange={(event) => setName(event.target.value)} /></label>
      <label>Class<select value={classId} onChange={(event) => setClassId(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Ancestry<select disabled value="human"><option>{human.name}</option></select></label>
      <label>Level<input type="number" min="1" max="20" value={level} onChange={(event) => setLevel(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /></label>
    </section>
    <section className="sheet-grid">
      <article className="ability-panel"><div><p className="eyebrow">ABILITY SCORES</p><h2>Human abilities</h2></div><label className="human-choice">Human +2<select value={humanAbility} onChange={(event) => setHumanAbility(event.target.value as keyof typeof defaultAbilities)}>{abilityNames.map((ability) => <option key={ability} value={ability}>{labels[ability]}</option>)}</select></label><div className="ability-grid">{abilityNames.map((ability) => <label key={ability}><span>{labels[ability]}</span><input type="number" min="1" max="40" value={baseAbilities[ability]} onChange={(event) => updateAbility(ability, Number(event.target.value))} /><strong>{abilities[ability]} <small>{signed(combat.abilityModifiers[ability])}</small></strong></label>)}</div></article>
      <article className="combat-panel"><p className="eyebrow">COMBAT</p><h2>Core statistics</h2><dl><div><dt>Initiative</dt><dd>{signed(combat.initiative)}</dd></div><div><dt>AC / touch / flat-footed</dt><dd>{combat.armorClass.normal} / {combat.armorClass.touch} / {combat.armorClass.flatFooted}</dd></div><div><dt>CMB / CMD</dt><dd>{signed(combat.combatManeuverBonus)} / {combat.combatManeuverDefense}</dd></div><div><dt>Average HP</dt><dd>{combat.averageHitPoints}</dd></div></dl><p className="hint">Average HP uses maximum 1st-level hit points and rounded-up average rolls thereafter. Equipment and temporary bonuses come next.</p></article>
    </section>
    <section className="summary" aria-label="Character progression summary">
      <article><span>BAB</span><strong>{signed(progression.baseAttackBonus)}</strong></article>
      <article><span>Fortitude</span><strong>{signed(combat.saves.fortitude)}</strong></article>
      <article><span>Reflex</span><strong>{signed(combat.saves.reflex)}</strong></article>
      <article><span>Will</span><strong>{signed(combat.saves.will)}</strong></article>
      <article><span>Skill ranks</span><strong>{progression.skillRanks}</strong></article>
      <article><span>Feat slots</span><strong>{progression.featSlots}</strong></article>
    </section>
    <section className="feat-panel"><div><p className="eyebrow">FEATS</p><h2>Feat choices</h2><p>Prerequisites are shown for review and do not block a choice.</p></div><div className="feat-slots">{featSlots.map((slot) => { const selected = feats.find((feat) => feat.id === selectedFeatIds[slot.index]); const checks = selected ? featPrerequisiteResults(selected, { abilities, baseAttackBonus: progression.baseAttackBonus, classLevel: level, selectedIds: selectedFeatIds }) : []; return <article key={slot.index}><label>{slot.name}<select value={selectedFeatIds[slot.index] ?? ""} onChange={(event) => updateFeat(slot.index, event.target.value)}><option value="">Choose a feat</option>{feats.map((feat) => <option key={feat.id} value={feat.id} disabled={selectedFeatIds.some((id, index) => id === feat.id && index !== slot.index)}>{feat.name}</option>)}</select></label>{selected && <><strong>{selected.name}</strong><p>{selected.benefit}</p>{checks.length > 0 && <ul className="checks">{checks.map((check, index) => <li className={check.met ? "met" : "unmet"} key={index}>{check.met ? "Met" : "Check"}: {prerequisiteLabel(check.prerequisite)}</li>)}</ul>}</>}</article>; })}</div></section>
    <section className="features"><div><p className="eyebrow">LEVEL {level}</p><h2>{characterClass.name} features</h2><p>Feat slots include the Human bonus feat. Skill ranks include Skilled and the fourfold 1st-level allocation.</p></div><ol>{progression.features.map((feature) => <li key={feature.id}><div><strong>{feature.name}</strong><p>{feature.summary}</p></div>{feature.choiceRequired && <span className="choice">Choose</span>}</li>)}</ol></section>
  </main>;
}
