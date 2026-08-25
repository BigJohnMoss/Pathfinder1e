import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../packages/data/src/archetypes/", import.meta.url);
const tracker = (id, label, level, resourceId, cost, summary, target = "self", minimumResourceRemaining, rounds = 1) => ({
  id,
  label,
  minimumLevel: level,
  resourceId,
  cost,
  ...(minimumResourceRemaining ? { minimumResourceRemaining } : {}),
  activeEffect: {
    name: label,
    targets: [target],
    bonus: 0,
    description: summary,
    defaultRounds: rounds,
    fixedRounds: true,
    replaceExisting: true,
  },
  summary,
});
const action = (id, label, level, resourceId, cost, summary, minimumResourceRemaining) => ({
  id,
  label,
  minimumLevel: level,
  resourceId,
  cost,
  ...(minimumResourceRemaining ? { minimumResourceRemaining } : {}),
  summary,
});
const rule = (id, name, minimumLevel, kind, summary, resourceId, options = {}) => ({
  id, name, minimumLevel, kind, summary,
  ...(resourceId ? { resourceId } : {}),
  ...options,
});

const definitions = {
  "gunslinger-black-powder-vaulter": {
    rules: [
      rule("mobile-reload", "Mobile Reload", 1, "passive", "Reload an eligible firearm as part of movement; from level 3 this can accompany Shot on the Run.", "grit", { minimumResource: 1 }),
      rule("daring-vault", "Daring Vault", 1, "active", "Spend grit as a swift action for +20 feet land speed through the end of the turn and unlock the wall-assisted second jump.", "grit", { cost: 1, actionIds: ["black-powder-vaulter-daring-vault"] }),
      rule("shot-on-the-run", "Shot on the Run", 3, "passive", "While maintaining grit, gain Shot on the Run with proficient firearms; at level 7 targeting can join the same full-round action.", "grit", { minimumResource: 1, grantedFeatIds: ["shot-on-the-run"] }),
      rule("art-of-the-gun", "Art of the Gun", 7, "active", "While maintaining grit, firearm attacks and reloads do not provoke and firearms threaten nearby squares; spend grit to fire a loaded firearm as an attack of opportunity.", "grit", { minimumResource: 1, cost: 1, actionIds: ["black-powder-vaulter-firearm-aao"] }),
      rule("dual-shot-on-the-run", "Dual Shot on the Run", 11, "passive", "Make two firearm attacks while using Shot on the Run.", "grit", { minimumResource: 1 }),
    ],
    actions: [
      tracker("black-powder-vaulter-daring-vault", "Daring Vault", 1, "grit", 1, "+20 feet land speed and wall-assisted second jump until the end of this turn."),
      action("black-powder-vaulter-firearm-aao", "Fire attack of opportunity", 7, "grit", 1, "Fire a loaded firearm as the provoking attack of opportunity; pistol-whip remains available at its normal grit cost.", 1),
    ],
  },
  "gunslinger-blatherskite": {
    rules: [
      rule("blatherskites-stagger", "Blatherskite's Stagger", 1, "active", "Convert a qualifying ranged hit to minimum damage and move 10 feet away as an immediate action; the paid level-2 form applies to a narrow hit margin.", "grit", { actionIds: ["blatherskite-stagger-miss", "blatherskite-stagger-hit"] }),
      rule("blatherskites-initiative", "Blatherskite's Initiative", 3, "active", "Maintain grit for +2 initiative and a 5-foot Stealth step; spend grit to move up to half speed instead.", "grit", { minimumResource: 1, actionIds: ["blatherskite-initiative-move"] }),
      rule("cheap-shot", "Cheap Shot", 3, "passive", "With grit, a non-scatter firearm hit against an unarmed target deals +1d6 precision damage.", "grit", { minimumResource: 1 }),
      rule("blatherskites-surprise", "Blatherskite's Surprise", 7, "active", "After succeeding against a listed condition, either accept it while maintaining grit or spend grit to make its source lose Dexterity to AC for the bounded duration.", "grit", { minimumResource: 1, actionIds: ["blatherskite-surprise-accept", "blatherskite-surprise-spend"] }),
    ],
    actions: [
      tracker("blatherskite-stagger-miss", "Stagger from missed ranged attack", 1, "grit", 0, "Allow the missed ranged attack to deal minimum damage and move 10 feet directly away; movement provokes.", "self"),
      tracker("blatherskite-stagger-hit", "Stagger from narrow ranged hit", 2, "grit", 1, "When the hit exceeds AC by no more than nimble, take minimum damage and move 10 feet directly away; movement provokes.", "self"),
      action("blatherskite-initiative-move", "Move during initiative", 3, "grit", 1, "Move up to half speed and attempt Stealth as part of initiative instead of the free 5-foot version.", 1),
      tracker("blatherskite-surprise-accept", "Accept effect and surprise its source", 7, "grit", 0, "Accept the resisted condition; its source loses Dexterity to AC for half the effect duration or half gunslinger level, whichever is lower (minimum 1 round).", "enemy", 1),
      tracker("blatherskite-surprise-spend", "Surprise source without accepting effect", 7, "grit", 1, "Its source loses Dexterity to AC for the bounded duration without you accepting the resisted condition.", "enemy"),
    ],
    conditionalModifiers: [{ sourceFeatureId: "gunslinger-blatherskite-deeds-1", label: "Initiative checks", condition: "At least 1 grit point remains", minimumLevel: 3, base: 2 }],
    precisionDamageAdjustments: [{ sourceFeatureId: "gunslinger-blatherskite-deeds-1", label: "Cheap Shot", dieSides: 6, diceByLevel: [{ level: 3, dice: 1 }], condition: "At least 1 grit remains; successful non-scatter firearm attack against an unarmed target", attackMode: "ranged", weaponType: "firearm" }],
  },
  "gunslinger-maverick": {
    rules: [
      rule("stacked-deck", "Stacked Deck", 1, "active", "Spend grit after a Bluff, Profession (gambler), or Sleight of Hand roll to add an exploding d6, bounded by Wisdom modifier.", "grit", { cost: 1, actionIds: ["maverick-stacked-deck"] }),
      rule("fist-fighter", "Fist Fighter", 3, "passive", "Maintain grit to gain Improved Unarmed Strike.", "grit", { minimumResource: 1, grantedFeatIds: ["improved-unarmed-strike"] }),
      rule("gun-twirl", "Gun Twirl", 3, "passive", "Maintain grit to gain Dazzling Display and use it with any firearm without Weapon Focus.", "grit", { minimumResource: 1, grantedFeatIds: ["dazzling-display"] }),
    ],
    actions: [{
      ...action("maverick-stacked-deck", "Roll Stacked Deck", 1, "grit", 1, "Add the result to the triggering skill check. Roll again on each natural 6, up to Wisdom modifier times (minimum 1)."),
      diceRoll: { label: "Stacked Deck", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 6 }] },
    }],
  },
  "swashbuckler-mouser": {
    rules: [
      rule("underfoot-assault", "Underfoot Assault", 1, "active", "After a larger adjacent foe misses in melee, spend panache as an immediate action to enter its space and apply the underfoot positioning rules.", "panache", { cost: 1, actionIds: ["mouser-underfoot-assault"] }),
      rule("quick-steal", "Quick Steal", 3, "active", "After hitting a larger foe with an eligible piercing weapon, spend panache as a swift action for a non-provoking steal maneuver.", "panache", { cost: 1, actionIds: ["mouser-quick-steal"] }),
      rule("hamstring", "Hamstring", 7, "active", "While maintaining panache, a qualifying hit against a larger foe enables a swift dirty trick that can only stagger.", "panache", { minimumResource: 1, actionIds: ["mouser-hamstring"] }),
      rule("cats-charge", "Cat's Charge", 11, "passive", "While maintaining panache, a charge against a larger foe may end in any reachable legal space rather than only the closest.", "panache", { minimumResource: 1 }),
    ],
    actions: [
      tracker("mouser-underfoot-assault", "Underfoot Assault", 1, "panache", 1, "Move 5 feet into the larger attacker's space without provoking and apply the underfoot flanking and attack-penalty rules until you or the foe leaves its space.", "enemy", undefined, 999),
      action("mouser-quick-steal", "Attempt Quick Steal", 3, "panache", 1, "Attempt the steal combat maneuver as a swift action without provoking after the qualifying hit."),
      tracker("mouser-hamstring", "Attempt Hamstring", 7, "panache", 0, "Attempt the swift dirty trick after a qualifying hit; on success the only available condition is staggered.", "enemy", 1),
    ],
  },
  "swashbuckler-noble-fencer": {
    rules: [
      rule("social-panache", "Social Panache", 1, "active", "Spend panache after a listed social check to add an exploding d6, or spend up to 4 before a verbal duel to gain tactic edges.", "panache", { cost: 1, actionIds: ["noble-fencer-social-panache", "noble-fencer-verbal-duel"] }),
      rule("incredible-aspirations", "Incredible Aspirations", 7, "passive", "While maintaining panache, the first natural 5 on derring-do or social panache also explodes; natural 6s continue normally.", "panache", { minimumResource: 1 }),
      rule("unshakable-presence", "Unshakable Presence", 11, "passive", "While maintaining panache, you cannot be demoralized by Intimidate.", "panache", { minimumResource: 1 }),
    ],
    actions: [
      { ...action("noble-fencer-social-panache", "Roll Social Panache", 1, "panache", 1, "Add the d6 to Bluff, Diplomacy, Intimidate, or Sense Motive. Natural 6s explode; from level 7 the first natural 5 also explodes while panache remains."), diceRoll: { label: "Social Panache", diceCountByLevel: [{ level: 1, count: 1 }], dieSidesByLevel: [{ level: 1, sides: 6 }] } },
      { ...action("noble-fencer-verbal-duel", "Prepare verbal-duel edges", 1, "panache", 1, "Spend 1–4 panache before a verbal duel; each point grants one edge tied to an eligible associated-skill tactic."), variableCost: { label: "Panache points", minimum: 1, maximum: 4 } },
    ],
  },
  "swashbuckler-veiled-blade": {
    rules: [
      rule("quick-draw", "Quick Draw", 1, "passive", "Maintain panache to gain Quick Draw.", "panache", { minimumResource: 1, grantedFeatIds: ["quick-draw"] }),
      rule("hidden-blade", "Hidden Blade", 3, "passive", "Maintain panache to hide any eligible piercing weapon and gain +4 insight on the Sleight of Hand check.", "panache", { minimumResource: 1 }),
      rule("instant-unveil", "Instant Unveil", 7, "passive", "When swashbuckler's initiative draws an eligible weapon, it may be drawn even while hidden.", "panache"),
      rule("soul-veil", "Soul Veil", 15, "active", "Merge an eligible piercing weapon into yourself as ghost brand; manifest or store it as a swift action.", "panache", { actionIds: ["veiled-blade-soul-veil"] }),
    ],
    actions: [tracker("veiled-blade-soul-veil", "Activate Soul Veil", 15, "panache", 0, "Merge with the eligible weapon; manifest or store it as a swift action. Remove this tracker when dispelled or when merging a different weapon.", "self", undefined, 999)],
    skillBonusAdjustments: [{ sourceFeatureId: "swashbuckler-veiled-blade-deeds-1", skill: "Sleight of Hand", minimumLevel: 3, base: 4, condition: "At least 1 panache remains and the check hides a light or one-handed piercing melee weapon" }],
  },
  "swashbuckler-wildstrider": {
    rules: [
      rule("subterfuge", "Subterfuge", 1, "passive", "Add Stealth to derring-do; from level 15 add Stealth to swashbuckler's edge take-10 skills.", "panache"),
      rule("adroit-step", "Adroit Step", 3, "active", "As a swift action normalize one 5-foot square of difficult terrain, or spend panache to ignore all difficult terrain through the end of the turn.", "panache", { actionIds: ["wildstrider-adroit-step-square", "wildstrider-adroit-step-all"] }),
      rule("keen-gaze", "Keen Gaze", 11, "passive", "Maintain panache to ignore concealment miss chance from fog, smoke, and undergrowth, but not total concealment or other sources.", "panache", { minimumResource: 1 }),
    ],
    actions: [
      tracker("wildstrider-adroit-step-square", "Normalize one difficult square", 3, "panache", 0, "Treat one 5-foot square of difficult terrain as normal terrain for this step."),
      tracker("wildstrider-adroit-step-all", "Ignore difficult terrain this turn", 3, "panache", 1, "Treat all difficult terrain as normal terrain through the end of this turn."),
    ],
    skillCheckRules: [{ sourceFeatureId: "swashbuckler-wildstrider-deeds-15", label: "Swashbuckler's Edge — Stealth", minimumLevel: 15, skills: ["Stealth"], result: 10, allowsStress: false, trainedOnly: false, condition: "Uses the swashbuckler's edge deed" }],
  },
};

for (const [id, definition] of Object.entries(definitions)) {
  const url = new URL(`${id}.json`, root);
  const archetype = JSON.parse(await readFile(url, "utf8"));
  const feature = archetype.replacements.flatMap((replacement) => replacement.features).find((candidate) => /^Deeds?$/i.test(candidate.name));
  if (!feature) throw new Error(`${id} has no Deeds feature`);
  feature.deedRules = definition.rules;
  feature.resourceActions = definition.actions;
  for (const key of ["conditionalModifiers", "precisionDamageAdjustments", "skillBonusAdjustments", "skillCheckRules"]) {
    if (definition[key]) archetype[key] = [...(archetype[key] ?? []).filter((entry) => entry.sourceFeatureId !== feature.id), ...definition[key]];
  }
  await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
}

console.log(`Annotated ${Object.keys(definitions).length} deed archetypes.`);
