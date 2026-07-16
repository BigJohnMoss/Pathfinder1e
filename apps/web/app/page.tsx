"use client";

import { useMemo, useState } from "react";
import arcanist from "../../../packages/data/src/classes/arcanist.json";
import barbarian from "../../../packages/data/src/classes/barbarian.json";
import fighter from "../../../packages/data/src/classes/fighter.json";
import rogue from "../../../packages/data/src/classes/rogue.json";
import human from "../../../packages/data/src/races/human.json";
import { classProgression } from "../../../packages/engine/src/index.js";

const classes = [arcanist, barbarian, fighter, rogue];

export default function Home() {
  const [classId, setClassId] = useState("arcanist");
  const [level, setLevel] = useState(1);
  const [intelligence, setIntelligence] = useState(10);
  const characterClass = classes.find((item) => item.id === classId) ?? classes[0];
  const progression = useMemo(() => classProgression(characterClass, level, {
    intelligenceScore: intelligence,
    racialSkillBonusPerLevel: human.traits.some((trait) => trait.id === "skilled") ? 1 : 0,
    bonusFeats: human.traits.some((trait) => trait.id === "human-bonus-feat") ? 1 : 0
  }), [characterClass, intelligence, level]);

  return <main>
    <header><p className="eyebrow">PATHFINDER FIRST EDITION</p><h1>Character Builder</h1><p>Build a foundation, then see exactly what your character has earned.</p></header>
    <section className="builder" aria-label="Character details">
      <label>Class<select value={classId} onChange={(event) => setClassId(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Ancestry<select disabled value="human"><option>{human.name}</option></select></label>
      <label>Level<input type="number" min="1" max="20" value={level} onChange={(event) => setLevel(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /></label>
      <label>Intelligence<input type="number" min="1" max="40" value={intelligence} onChange={(event) => setIntelligence(Math.max(1, Math.min(40, Number(event.target.value) || 1)))} /></label>
    </section>
    <section className="summary" aria-label="Character progression summary">
      <article><span>BAB</span><strong>+{progression.baseAttackBonus}</strong></article>
      <article><span>Fortitude</span><strong>+{progression.saves.fortitude}</strong></article>
      <article><span>Reflex</span><strong>+{progression.saves.reflex}</strong></article>
      <article><span>Will</span><strong>+{progression.saves.will}</strong></article>
      <article><span>Skill ranks</span><strong>{progression.skillRanks}</strong></article>
      <article><span>Feat slots</span><strong>{progression.featSlots}</strong></article>
    </section>
    <section className="features"><div><p className="eyebrow">LEVEL {level}</p><h2>{characterClass.name} features</h2><p>Feat slots include the human bonus feat. Skill ranks include Human Skilled and the fourfold 1st-level allocation.</p></div><ol>{progression.features.map((feature) => <li key={feature.id}><div><strong>{feature.name}</strong><p>{feature.summary}</p></div>{feature.choiceRequired && <span className="choice">Choose</span>}</li>)}</ol></section>
  </main>;
}
