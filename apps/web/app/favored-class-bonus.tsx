export interface AlternateFavoredClassReward {
  id: string;
  ancestryId: string;
  classId: string;
  label: string;
  description: string;
  divisor?: number;
  resource?: "bardic-performance";
}

export const alternateFavoredClassRewards: AlternateFavoredClassReward[] = [
  { id: "dwarf-barbarian-rage", ancestryId: "dwarf", classId: "barbarian", label: "Rage", description: "+1 round of rage per day." },
  { id: "dwarf-cleric-domain", ancestryId: "dwarf", classId: "cleric", label: "Domain power", description: "+1/2 use of a 1st-level domain power.", divisor: 2 },
  { id: "dwarf-fighter-cmd", ancestryId: "dwarf", classId: "fighter", label: "Defensive training", description: "+1 CMD against bull rush and trip." },
  { id: "dwarf-oracle-weapon", ancestryId: "dwarf", classId: "oracle", label: "Ancestral weapon", description: "Reduce the nonproficiency penalty for one weapon by 1." },
  { id: "dwarf-paladin-concentration", ancestryId: "dwarf", classId: "paladin", label: "Concentration", description: "+1 on concentration checks." },
  { id: "dwarf-ranger-wild-empathy", ancestryId: "dwarf", classId: "ranger", label: "Underground empathy", description: "+1/2 on wild empathy checks with underground animals.", divisor: 2 },
  { id: "dwarf-rogue-stone-traps", ancestryId: "dwarf", classId: "rogue", label: "Stone traps", description: "+1/2 on Disable Device and trap sense against stone traps.", divisor: 2 },
  { id: "elf-barbarian-speed", ancestryId: "elf", classId: "barbarian", label: "Speed", description: "+1 foot to the speed bonus gained while raging (effective in increments of 5)." },
  { id: "elf-bard-magic", ancestryId: "elf", classId: "bard", label: "Elven magic", description: "+1 to CMD against disarm and sunder." },
  { id: "elf-fighter-cmd", ancestryId: "elf", classId: "fighter", label: "Graceful defence", description: "+1 CMD against disarm and sunder." },
  { id: "elf-ranger-critical", ancestryId: "elf", classId: "ranger", label: "Elven weapon criticals", description: "+1/2 on critical confirmation rolls with one elven weapon (maximum +4).", divisor: 2 },
  { id: "elf-sorcerer-power", ancestryId: "elf", classId: "sorcerer", label: "Bloodline power", description: "+1/2 use of a 1st-level bloodline power.", divisor: 2 },
  { id: "elf-wizard-school", ancestryId: "elf", classId: "wizard", label: "Arcane school", description: "+1/2 use of a 1st-level arcane school power.", divisor: 2 },
  { id: "gnome-bard-performance", ancestryId: "gnome", classId: "bard", label: "Bardic performance", description: "+1 round of bardic performance per day.", resource: "bardic-performance" },
  { id: "gnome-druid-resistance", ancestryId: "gnome", classId: "druid", label: "Energy resistance", description: "+1 energy resistance to acid, cold, electricity, or fire (maximum 10)." },
  { id: "gnome-oracle-curse", ancestryId: "gnome", classId: "oracle", label: "Oracle curse", description: "+1/2 effective level for the oracle's curse.", divisor: 2 },
  { id: "gnome-ranger-companion", ancestryId: "gnome", classId: "ranger", label: "Companion defence", description: "+1/2 DR/magic for an animal companion (maximum DR 10/magic).", divisor: 2 },
  { id: "gnome-rogue-writings", ancestryId: "gnome", classId: "rogue", label: "Magical writings", description: "+1 on Disable Device and Use Magic Device checks involving glyphs, symbols, scrolls, and magical writings." },
  { id: "gnome-wizard-school", ancestryId: "gnome", classId: "wizard", label: "Arcane school", description: "+1/2 use of a 1st-level arcane school power.", divisor: 2 },
  { id: "half-elf-bard-performance", ancestryId: "half-elf", classId: "bard", label: "Bardic performance", description: "+1 round of bardic performance per day.", resource: "bardic-performance" },
  { id: "half-elf-druid-bond", ancestryId: "half-elf", classId: "druid", label: "Nature bond", description: "+1/2 use of a domain power or +1 skill rank for an animal companion.", divisor: 2 },
  { id: "half-elf-fighter-cmd", ancestryId: "half-elf", classId: "fighter", label: "Combat manoeuvre defence", description: "+1 CMD against disarm and overrun." },
  { id: "half-elf-ranger-companion", ancestryId: "half-elf", classId: "ranger", label: "Companion training", description: "+1 skill rank for an animal companion." },
  { id: "half-elf-rogue-social", ancestryId: "half-elf", classId: "rogue", label: "Social expertise", description: "+1/2 on Bluff checks to feint and Diplomacy checks to gather information.", divisor: 2 },
  { id: "half-orc-barbarian-rage", ancestryId: "half-orc", classId: "barbarian", label: "Rage", description: "+1 round of rage per day." },
  { id: "half-orc-fighter-stability", ancestryId: "half-orc", classId: "fighter", label: "Stability", description: "+2 on Constitution checks to stabilize when dying." },
  { id: "half-orc-ranger-companion", ancestryId: "half-orc", classId: "ranger", label: "Companion vitality", description: "+1 hit point for an animal companion." },
  { id: "half-orc-sorcerer-fire", ancestryId: "half-orc", classId: "sorcerer", label: "Fire spell damage", description: "+1/2 damage on sorcerer fire spells.", divisor: 2 },
  { id: "halfling-bard-social", ancestryId: "halfling", classId: "bard", label: "Social performance", description: "+1/2 on selected social skill checks.", divisor: 2 },
  { id: "halfling-cleric-domain", ancestryId: "halfling", classId: "cleric", label: "Domain power", description: "+1/2 use of a 1st-level domain power.", divisor: 2 },
  { id: "halfling-fighter-cmd", ancestryId: "halfling", classId: "fighter", label: "Combat manoeuvre defence", description: "+1 CMD against grapple and trip." },
  { id: "halfling-monk-defence", ancestryId: "halfling", classId: "monk", label: "Grapple defence and stunning fist", description: "+1 CMD against grapple and +1/2 stunning attack per day.", divisor: 2 },
  { id: "halfling-paladin-lay-on-hands", ancestryId: "halfling", classId: "paladin", label: "Lay on hands", description: "+1/2 hit point healed by lay on hands.", divisor: 2 },
  { id: "halfling-ranger-defence", ancestryId: "halfling", classId: "ranger", label: "Favoured enemy defence", description: "+1/3 dodge bonus to AC against favoured enemies.", divisor: 3 },
  { id: "halfling-rogue-critical", ancestryId: "halfling", classId: "rogue", label: "Halfling weapon criticals", description: "+1/2 on critical confirmation rolls with a sling, dagger, or halfling weapon (maximum +4).", divisor: 2 },
  { id: "human-barbarian-trap-sense", ancestryId: "human", classId: "barbarian", label: "Trap sense", description: "+1/2 to trap sense.", divisor: 2 },
  { id: "human-bard-spell", ancestryId: "human", classId: "bard", label: "Spell known", description: "Add one bard spell known below the highest spell level available." },
  { id: "human-cleric-spell-resistance", ancestryId: "human", classId: "cleric", label: "Outsider spell resistance", description: "+1 on caster-level checks to overcome outsider spell resistance." },
  { id: "human-druid-attitude", ancestryId: "human", classId: "druid", label: "Animal attitude", description: "+1/2 on Diplomacy and Intimidate checks to change a creature's attitude.", divisor: 2 },
  { id: "human-fighter-cmd", ancestryId: "human", classId: "fighter", label: "Combat manoeuvre defence", description: "+1 CMD against two selected combat manoeuvres." },
  { id: "human-monk-ki", ancestryId: "human", classId: "monk", label: "Ki pool", description: "+1/4 point to the monk's ki pool.", divisor: 4 },
  { id: "human-oracle-spell", ancestryId: "human", classId: "oracle", label: "Spell known", description: "Add one oracle spell known below the highest spell level available." },
  { id: "human-paladin-resistance", ancestryId: "human", classId: "paladin", label: "Energy resistance", description: "+1 resistance to one energy type (maximum 10)." },
  { id: "human-ranger-companion", ancestryId: "human", classId: "ranger", label: "Companion training", description: "+1 hit point or skill rank for an animal companion." },
  { id: "human-rogue-talent", ancestryId: "human", classId: "rogue", label: "Rogue talent", description: "+1/6 of a new rogue talent.", divisor: 6 },
  { id: "human-sorcerer-spell", ancestryId: "human", classId: "sorcerer", label: "Spell known", description: "Add one sorcerer spell known below the highest spell level available." },
  { id: "human-wizard-spell", ancestryId: "human", classId: "wizard", label: "Spellbook spell", description: "Add one wizard spell below the highest spell level available to the spellbook." }
];

export function alternateRewardValue(reward: AlternateFavoredClassReward, levels: number) {
  return Math.floor(levels / (reward.divisor ?? 1));
}

export function FavoredClassBonus({ ancestryId, ancestryName, classId, className, level, hitPoints, skillRanks, alternateBonuses, onChange }: {
  ancestryId: string;
  ancestryName: string;
  classId: string;
  className: string;
  level: number;
  hitPoints: number;
  skillRanks: number;
  alternateBonuses: Record<string, number>;
  onChange: (hitPoints: number, skillRanks: number, alternateBonuses: Record<string, number>) => void;
}) {
  const rewards = alternateFavoredClassRewards.filter((reward) => reward.ancestryId === ancestryId && reward.classId === classId);
  const alternateAllocated = Object.values(alternateBonuses).reduce((total, value) => total + value, 0);
  const allocated = hitPoints + skillRanks + alternateAllocated;
  const remaining = Math.max(0, level - allocated);
  const update = (nextHitPoints: number, nextSkillRanks: number, nextAlternates = alternateBonuses) =>
    onChange(Math.max(0, nextHitPoints), Math.max(0, nextSkillRanks), nextAlternates);
  const updateReward = (rewardId: string, value: number) => {
    const otherAllocated = allocated - (alternateBonuses[rewardId] ?? 0);
    const next = Math.max(0, Math.min(level - otherAllocated, value || 0));
    const bonuses = { ...alternateBonuses };
    if (next > 0) bonuses[rewardId] = next;
    else delete bonuses[rewardId];
    update(hitPoints, skillRanks, bonuses);
  };
  return <section className="favored-class-bonus" aria-labelledby="favored-class-heading">
    <div>
      <p className="eyebrow">FAVORED CLASS</p>
      <h2 id="favored-class-heading">{className} bonuses</h2>
      <p>Assign one reward for each of your {level} {className} {level === 1 ? "level" : "levels"}. You may mix universal and {ancestryName} rewards.</p>
    </div>
    <div className="favored-class-controls">
      <label>Bonus hit points<input aria-label="Favored class bonus hit points" type="number" min="0" max={hitPoints + remaining} value={hitPoints} onChange={event => update(Number(event.target.value) || 0, skillRanks)} /></label>
      <label>Bonus skill ranks<input aria-label="Favored class bonus skill ranks" type="number" min="0" max={skillRanks + remaining} value={skillRanks} onChange={event => update(hitPoints, Number(event.target.value) || 0)} /></label>
      {rewards.map((reward) => <label key={reward.id}>{reward.label}
        <input aria-label={`${reward.label} favored class allocation`} type="number" min="0" max={(alternateBonuses[reward.id] ?? 0) + remaining} value={alternateBonuses[reward.id] ?? 0} onChange={event => updateReward(reward.id, Number(event.target.value))} />
        <span className="hint">{reward.description} Current benefit: +{alternateRewardValue(reward, alternateBonuses[reward.id] ?? 0)}.</span>
      </label>)}
    </div>
    <div className="favored-class-actions">
      <button type="button" disabled={remaining === 0} onClick={() => update(hitPoints + remaining, skillRanks)}>Assign remaining to hit points</button>
      <button type="button" disabled={remaining === 0} onClick={() => update(hitPoints, skillRanks + remaining)}>Assign remaining to skill ranks</button>
      <button type="button" disabled={allocated === 0} onClick={() => onChange(0, 0, {})}>Clear bonuses</button>
    </div>
    <p className={`hint${remaining > 0 ? " invalid" : ""}`} aria-live="polite"><strong>{allocated}</strong> of {level} favored-class bonuses assigned · {remaining} remaining.</p>
  </section>;
}
