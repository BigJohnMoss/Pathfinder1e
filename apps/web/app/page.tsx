"use client";

import { useMemo, useState } from "react";
import arcanist from "../../../packages/data/src/classes/arcanist.json";
import barbarian from "../../../packages/data/src/classes/barbarian.json";
import fighter from "../../../packages/data/src/classes/fighter.json";
import rogue from "../../../packages/data/src/classes/rogue.json";
import human from "../../../packages/data/src/races/human.json";
import combatCasting from "../../../packages/data/src/feats/combat-casting.json";
import powerAttack from "../../../packages/data/src/feats/power-attack.json";
import exploits from "../../../packages/data/src/options/arcanist-exploits.json";
import ragePowers from "../../../packages/data/src/options/rage-powers.json";
import rogueTalents from "../../../packages/data/src/options/rogue-talents.json";
import mageArmor from "../../../packages/data/src/spells/mage-armor.json";
import magicMissile from "../../../packages/data/src/spells/magic-missile.json";
import { abilityNames, availableOptions, characterCombatStats, classProgression, featPrerequisiteResults, normalizeCharacterDraft, skillTotal, spellsAvailableToClass } from "../../../packages/engine/src/index.js";

const classes = [arcanist, barbarian, fighter, rogue];
const labels = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const defaultAbilities = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
const feats = [combatCasting, powerAttack];
const optionGroups = [exploits, ragePowers, rogueTalents];
const spells = [mageArmor, magicMissile];
const skills = [{name:"Acrobatics",ability:"dexterity"},{name:"Climb",ability:"strength"},{name:"Diplomacy",ability:"charisma"},{name:"Knowledge (arcana)",ability:"intelligence"},{name:"Perception",ability:"wisdom"},{name:"Spellcraft",ability:"intelligence"},{name:"Stealth",ability:"dexterity"}] as const;
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
  const [skillRanks, setSkillRanks] = useState<Record<string, number>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [preparedSpells, setPreparedSpells] = useState<string[]>([]);
  const [saveNotice, setSaveNotice] = useState("");
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
  const allocatedSkillRanks = Object.values(skillRanks).reduce((total, ranks) => total + ranks, 0);
  const updateSkill = (name: string, ranks: number) => setSkillRanks((current) => ({ ...current, [name]: Math.max(0, Math.min(progression.skillRanks, ranks || 0)) }));
  const choiceFeatures = progression.features.filter((feature) => feature.choiceRequired && feature.optionGroupId);
  const maximumSpellLevel = Math.min(9, Math.floor((level + 1) / 2));
  const availableSpells = useMemo(() => spellsAvailableToClass(spells, characterClass.id, maximumSpellLevel), [characterClass.id, maximumSpellLevel]);
  const saveCharacter = () => { localStorage.setItem("pf1e-character-draft", JSON.stringify({ name, classId, level, humanAbility, baseAbilities, selectedFeatIds, skillRanks, selectedOptions, preparedSpells })); setSaveNotice("Saved locally"); };
  const loadCharacter = () => { const saved = localStorage.getItem("pf1e-character-draft"); if (!saved) { setSaveNotice("No saved character"); return; } try { const draft = normalizeCharacterDraft(JSON.parse(saved)); if (!draft) { setSaveNotice("Saved character is invalid"); return; } setName(draft.name); setClassId(draft.classId); setLevel(draft.level); setHumanAbility(draft.humanAbility); setBaseAbilities(draft.baseAbilities); setSelectedFeatIds(draft.selectedFeatIds); setSkillRanks(draft.skillRanks); setSelectedOptions(draft.selectedOptions); setPreparedSpells(draft.preparedSpells); setSaveNotice("Loaded saved character"); } catch { setSaveNotice("Saved character is invalid"); } };
  const resetCharacter = () => { localStorage.removeItem("pf1e-character-draft"); setName(""); setClassId("arcanist"); setLevel(1); setHumanAbility("intelligence"); setBaseAbilities(defaultAbilities); setSelectedFeatIds([]); setSkillRanks({}); setSelectedOptions({}); setPreparedSpells([]); setSaveNotice("Character reset"); };
  const exportCharacter = () => { const draft = { version: 1, exportedAt: new Date().toISOString(), name, classId, level, humanAbility, baseAbilities, selectedFeatIds, skillRanks, selectedOptions, preparedSpells }; const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `${name.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "pf1e-character"}.json`; link.click(); URL.revokeObjectURL(url); setSaveNotice("Character exported"); };
  const printCharacter = () => window.print();

  return <main>
    <header><p className="eyebrow">PATHFINDER FIRST EDITION</p><h1>{name || "Character Builder"}</h1><p>Create a character foundation, then see the rules statistics it earns.</p></header>
    <section className="builder" aria-label="Character details">
      <label>Character name<input value={name} placeholder="Unnamed hero" onChange={(event) => setName(event.target.value)} /></label>
      <label>Class<select value={classId} onChange={(event) => setClassId(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Ancestry<select disabled value="human"><option>{human.name}</option></select></label>
      <label>Level<input type="number" min="1" max="20" value={level} onChange={(event) => setLevel(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /></label>
      <div className="character-actions"><button type="button" onClick={saveCharacter}>Save</button><button type="button" onClick={loadCharacter}>Load</button><button type="button" onClick={exportCharacter}>Export</button><button type="button" onClick={printCharacter}>Print</button><button type="button" onClick={resetCharacter}>Reset</button><small>{saveNotice}</small></div>
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
    <section className="skill-panel"><div><p className="eyebrow">SKILLS</p><h2>Allocate ranks</h2><p><strong>{allocatedSkillRanks}</strong> of {progression.skillRanks} total ranks allocated. Class skills gain +3 once at least one rank is invested.</p></div><div className="skill-list">{skills.map((skill) => { const ranks = skillRanks[skill.name] ?? 0; const result = skillTotal(characterClass, skill, abilities[skill.ability], ranks); return <label key={skill.name}><span>{skill.name} <small>{labels[skill.ability]}</small></span><input type="number" min="0" max={progression.skillRanks} value={ranks} onChange={(event) => updateSkill(skill.name, Number(event.target.value))} /><strong className={result.isClassSkill ? "class-skill" : ""}>{signed(result.total)}{result.isClassSkill && " class"}</strong></label>; })}</div></section>
    {choiceFeatures.length > 0 && <section className="choice-panel"><div><p className="eyebrow">CLASS OPTIONS</p><h2>Choose class features</h2><p>Each earned selectable feature gets its own choice.</p></div>{choiceFeatures.map((feature) => { const group = optionGroups.find((item) => item.id === feature.optionGroupId); const options = group ? availableOptions(group, characterClass.id, level, Object.values(selectedOptions)) : []; const selected = options.find((option) => option.id === selectedOptions[feature.id]); return <label key={feature.id}>{feature.name} <small>level {feature.level}</small><select value={selectedOptions[feature.id] ?? ""} onChange={(event) => setSelectedOptions((current) => ({ ...current, [feature.id]: event.target.value }))}><option value="">Choose an option</option>{options.map((option) => <option key={option.id} value={option.id} disabled={Object.entries(selectedOptions).some(([id, value]) => id !== feature.id && value === option.id)}>{option.name}</option>)}</select>{selected && <span>{selected.benefit}</span>}</label>; })}</section>}
    {availableSpells.length > 0 && <section className="spell-panel"><p className="eyebrow">SPELLBOOK</p><h2>Prepared spells</h2><p>Starter spell catalogue — up to {maximumSpellLevel}th-level spells are available.</p>{availableSpells.map((spell) => <label key={spell.id}><input type="checkbox" checked={preparedSpells.includes(spell.id)} onChange={() => setPreparedSpells((current) => current.includes(spell.id) ? current.filter((id) => id !== spell.id) : [...current, spell.id])} /> {spell.name} <small>level {Math.min(...Object.values(spell.levelByClass))} · {spell.summary}</small></label>)}</section>}
    <section className="features"><div><p className="eyebrow">LEVEL {level}</p><h2>{characterClass.name} features</h2><p>Feat slots include the Human bonus feat. Skill ranks include Skilled and the fourfold 1st-level allocation.</p></div><ol>{progression.features.map((feature) => <li key={feature.id}><div><strong>{feature.name}</strong><p>{feature.summary}</p></div>{feature.choiceRequired && <span className="choice">Choose</span>}</li>)}</ol></section>
  </main>;
}
