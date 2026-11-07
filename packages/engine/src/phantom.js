const clampLevel = (level) => Math.max(1, Math.min(20, Math.trunc(Number(level) || 1)));

const progression = [
  [1,1,2,0,2,1,0,0,"1d6"], [2,2,3,0,4,1,2,1,"1d6"], [3,3,3,1,6,2,2,1,"1d6"], [3,3,3,1,6,2,2,1,"1d6"],
  [4,4,4,1,8,2,4,2,"1d8"], [5,5,4,1,10,3,4,2,"1d8"], [6,6,5,2,12,3,6,2,"1d8"], [6,6,5,2,12,3,6,3,"1d8"],
  [7,7,5,2,14,4,6,3,"1d10"], [8,8,6,2,16,4,8,4,"1d10"], [9,9,6,3,18,5,8,4,"1d10"], [9,9,6,3,18,5,10,5,"1d10"],
  [10,10,7,3,20,5,10,5,"2d6"], [11,11,7,3,22,6,10,5,"2d6"], [12,12,8,4,24,6,12,6,"2d6"], [12,12,8,4,24,6,12,6,"2d6"],
  [13,13,8,4,26,7,14,7,"2d8"], [14,14,9,4,28,7,14,7,"2d8"], [15,15,9,5,30,8,14,7,"2d8"], [15,15,9,5,30,8,16,8,"2d8"],
];

const focus = (skills, goodSaves, traits, abilities, abilityFocus) => ({ skills, goodSaves, traits, abilities, abilityFocus });
const focuses = {
  "spiritualist-focus-anger": focus(["Intimidate", "Survival"], ["Fortitude", "Will"], ["Strength +2, Dexterity -2; level bonuses improve Strength instead of Dexterity", "Power Attack bonus feat", "Slam damage counts as one size larger"], [
    [1, "Powerful Strike", "Larger slam damage and Power Attack."], [7, "Aura of Fury", "Swift 20-foot aura: creatures gain +2 melee attack and take -2 AC."], [12, "Ferocious Mien", "Once/day swift enlargement and rage for 1 round per class level; gains frightful presence at level 18."], [17, "Furious Wail", "Once/day standard wail of the banshee using phantom HD and a Charisma-based DC."],
  ], "strength"),
  "spiritualist-focus-dedication": focus(["Diplomacy", "Sense Motive"], ["Reflex", "Will"], ["Iron Will bonus feat; grants Iron Will to its master while confined"], [
    [1, "Dutiful Strike", "+2 attack and larger damage against the latest creature to attack its master."], [7, "Defending Aura", "Swift 10-foot aura: allies gain +2 deflection AC, CMD, and saves."], [12, "Devoted Servant", "Automatically manifests when its unaware master is attacked."], [17, "Steadfast Devotion", "Immune to detrimental mind-affecting effects, possession, banishment, and dismissal."],
  ]),
  "spiritualist-focus-despair": focus(["Intimidate", "Stealth"], ["Fortitude", "Will"], ["+2 attack and damage against creatures affected by fear or despair"], [
    [1, "Miserable Strike", "Slam forces a Charisma-based Will save or -2 attack and damage for 1 round."], [7, "Aura of Despair", "Swift 10-foot aura: enemies take -2 on all saves."], [12, "Despairing Shout", "Three/day crushing despair using phantom HD and a Charisma-based DC."], [17, "Inescapable Despair", "Miserable Strike no longer allows a save."],
  ]),
  "spiritualist-focus-desperation": focus(["Acrobatics", "Escape Artist"], ["Reflex", "Will"], ["Combat Reflexes bonus feat; grants it to its master while confined", "Uses Dexterity for grapple CMB; +4 grapple and grapple CMD below half HP"], [
    [1, "Frantic Grip", "Dexterity applies to grapple CMB, with a below-half-HP bonus."], [7, "Aura of Desperation", "Swift 10-foot aura forces concentration checks for verbal spells."], [12, "Clutch of Terror", "Three/day ranged hands grapple and deal slam damage within 60 feet."], [17, "Burst of Desperation", "Once/day haste for phantom and master, dismissible by either."],
  ]),
  "spiritualist-focus-fear": focus(["Intimidate", "Stealth"], ["Reflex", "Will"], ["Stealthy bonus feat"], [
    [1, "Horrifying Strike", "Slam forces a Charisma-based Will save or shaken for 1d4 rounds."], [7, "Increase Fear", "Swift 20-foot aura escalates failed fear saves by one step."], [12, "Frightful Attack", "Slam can frighten instead of shake."], [17, "Shelter Allies", "Allies in the aura and the master are immune to fear."],
  ]),
  "spiritualist-focus-greed": focus(["Appraise", "Sleight of Hand"], ["Fortitude", "Reflex"], ["Adds half HD (minimum 1) to Appraise and its master's magic-item Spellcraft checks", "Slams threaten 19-20 and become x3 criticals at level 11"], [
    [1, "Ruthless Combatant", "Improved slam critical range and level-11 multiplier."], [7, "Assume Effect", "A non-personal self spell can also affect the phantom 1/day, 2/day at 12, 3/day at 19."], [12, "Covetous Aura", "Swift 20-foot aura copies nearby harmless spells of level 2 or lower for HD rounds/day."], [17, "Take It with You", "At 0 HP transfers up to Charisma modifier harmless spells to its master."],
  ]),
  "spiritualist-focus-hatred": focus(["Acrobatics", "Perception"], ["Fortitude", "Reflex"], ["Weapon Finesse bonus feat"], [
    [1, "Hated Target", "Designate one target: +2 attack and half-HD damage; swift with no off-target penalty at level 7."], [7, "Hateful Aura", "Swift 10-foot aura damages enemies that harm phantom or master by the phantom's Charisma bonus."], [12, "Sneak Attack", "+3d6 against the hated target, increasing to +5d6 at level 18."], [17, "Shared Hatred", "Allies gain +2 attack and +4 damage against the hated target; incorporeal slam can strike it."],
  ]),
  "spiritualist-focus-jealousy": focus(["Appraise", "Bluff"], ["Reflex", "Will"], ["Deceitful bonus feat"], [
    [1, "Jealous Combatant", "A hit gives the target -2 attacks against anyone except the phantom for 1 round."], [7, "Resentful Aura", "Swift 20-foot aura can stagger enemies that exclude the phantom from attacks or spells."], [12, "Retribution", "After an attack on its master, hits against that attacker deal +2d8 precision damage for one turn."], [17, "Mine to Take", "Once/day immediate swap with its master before an attack or save."],
  ]),
  "spiritualist-focus-kindness": focus(["Diplomacy", "Heal"], ["Fortitude", "Will"], ["Aid another grants +1 extra, or +2 extra when aiding its master"], [
    [1, "Opening Strike", "A successful standard-action attack lets one designated ally attack immediately."], [7, "Etheric Healing", "Lay on hands as a Paladin of phantom HD; may heal its master as a swift action."], [12, "Expanded Aid", "Aid another as a move action and add four level-12 Paladin mercies."], [17, "Exceptional Aid", "Aid another as a swift action; Opening Strike adds Charisma modifier damage."],
  ]),
  "spiritualist-focus-lust": focus(["Bluff", "Diplomacy"], ["Fortitude", "Will"], ["Constitution +2, Dexterity -2; level bonuses improve Constitution instead of Dexterity"], [
    [1, "Alluring Presence", "Immediate Diplomacy check can redirect a harmful attack or spell from master to phantom."], [7, "Mine Alone", "Master and phantom use the better of their two saves against charm and compulsion."], [12, "Aura of Ecstasy", "Adjacent creatures save each round or become shaken and staggered; success grants 24-hour immunity."], [17, "Sinful Command", "Once/day dominate monster with a Charisma-based DC."],
  ], "constitution"),
  "spiritualist-focus-pride": focus(["Intimidate", "Perception"], ["Reflex", "Will"], ["Immune to fear until an ability, skill, or attack roll fails, then loses immunity for 1 hour"], [
    [1, "Flagrant Disregard", "Swift scaling attack bonus with an equal scaling AC risk."], [7, "Vainglorious Oration", "Swift audible 30-foot aura makes enemies shaken."], [12, "Overwhelming Confidence", "Doubles morale bonuses while Resolve immunity is active; converts them to penalties if it fails."], [17, "Illusion of Perfection", "Swift Charisma-to-melee-damage illusion for HD minutes/day; targets can disbelieve for half bonus."],
  ]),
  "spiritualist-focus-remorse": focus(["Perception", "Sense Motive"], ["Fortitude", "Will"], ["Antagonize bonus feat"], [
    [1, "Long-Suffering Strike", "Slam save failure grants all attacks +1 attack and damage against the target for 1 round."], [7, "Aura of Regret", "Swift 10-foot aura gives enemies -2 to skills, caster-level checks, CMB, and CMD."], [12, "Keening", "Once/day 30-foot cone of terrible remorse using phantom HD and a Charisma-based DC."], [17, "Utter Misery", "Long-Suffering Strike also stuns on a failed save for 1 round."],
  ]),
  "spiritualist-focus-suffering": focus(["Climb", "Heal"], ["Fortitude", "Will"], ["Endurance bonus feat; grants it to its master while confined"], [
    [1, "Repelling Strike", "Swift bull rush after melee damage using the attack roll, pushing up to 5 feet."], [7, "Numbing Aura", "Swift 20-foot aura grants allies +4 saves against curse, disease, evil, fear, pain, and poison."], [12, "Suffer in Stead", "Immediate transfer of a listed condition from master to nearby manifested phantom; allies at level 18."], [17, "Willing Martyr", "Takes HP or ability damage for a nearby ally at one-quarter HP or less."],
  ]),
  "spiritualist-focus-whimsey": focus(["Acrobatics", "Perception"], ["Reflex", "Will"], ["Improved Dirty Trick bonus feat without prerequisites"], [
    [1, "Colorful Burst", "Once/day 15-foot color spray scaled by phantom HD with a Charisma-based DC."], [7, "Aura of Laughter", "Swift 10-foot audible aura: enemies take -2 attack/damage and -5 Perception."], [12, "Telekinetic Prankster", "Combat maneuvers at 15 feet using Charisma instead of Strength."], [17, "Invoke Laughter", "Once/day 30-foot burst of hideous laughter with a Charisma-based DC."],
  ]),
  "spiritualist-focus-zeal": focus(["Acrobatics", "Survival"], ["Fortitude", "Reflex"], ["Adds half HD (minimum 1) to Survival checks to track", "Slams threaten 19-20 and become x3 criticals at level 11"], [
    [1, "Ruthless Combatant", "Improved slam critical range and level-11 multiplier."], [7, "Determination Aura", "Swift 20-foot aura grants allies +2 competence attack and saves."], [12, "Steadfast Servant", "Remains manifested while its master is unconscious or asleep."], [17, "Zeal's Resolve", "Three/day reroll a missed attack or failed save, taking the new result."],
  ]),
};

export function phantomFocusDetails(optionId, level) {
  const definition = focuses[optionId];
  if (!definition) return null;
  const effectiveLevel = clampLevel(level);
  return { ...definition, abilities: definition.abilities.filter(([minimumLevel]) => minimumLevel <= effectiveLevel).map(([minimumLevel, name, summary]) => ({ minimumLevel, name, summary })) };
}

export function phantomProgression(level, optionId) {
  const effectiveLevel = clampLevel(level);
  const [hitDice, baseAttackBonus, goodSaveBonus, badSaveBonus, skillRanks, feats, armorBonus, dexterityCharismaBonus, slamDamage] = progression[effectiveLevel - 1];
  const focusDetails = phantomFocusDetails(optionId, effectiveLevel);
  const abilityFocus = focusDetails?.abilityFocus;
  const abilityScores = {
    strength: 12 + (abilityFocus === "strength" ? 2 + dexterityCharismaBonus : 0),
    dexterity: 14 + (abilityFocus ? -2 : dexterityCharismaBonus),
    constitution: 13 + (abilityFocus === "constitution" ? 2 + dexterityCharismaBonus : 0),
    intelligence: 7,
    wisdom: 10,
    charisma: 13 + dexterityCharismaBonus,
  };
  const largerSlam = { "1d6": "1d8", "1d8": "2d6", "1d10": "2d8", "2d6": "3d6", "2d8": "3d8" };
  return {
    effectiveLevel, hitDice, baseAttackBonus, goodSaveBonus, badSaveBonus, skillRanks, feats, armorBonus, dexterityCharismaBonus,
    slamDamage: optionId === "spiritualist-focus-anger" ? largerSlam[slamDamage] : slamDamage,
    slamCritical: ["spiritualist-focus-greed", "spiritualist-focus-zeal"].includes(optionId) ? (effectiveLevel >= 11 ? "19-20/x3" : "19-20/x2") : "20/x2",
    abilityScores,
    focus: focusDetails,
    specialAbilities: [
      "Darkvision 60 feet", "Link", "Share spells",
      ...(effectiveLevel >= 3 ? [`Deliver touch spells (${effectiveLevel >= 12 ? 50 : 30} feet)`] : []),
      ...(effectiveLevel >= 4 ? ["Magic attacks"] : []),
      ...([5, 10, 15].filter((threshold) => effectiveLevel >= threshold).map((threshold) => `Ability score increase (level ${threshold})`)),
      ...(effectiveLevel >= 6 ? ["Devotion"] : []),
      ...(effectiveLevel >= 9 ? ["Incorporeal flight"] : []),
    ],
  };
}
