import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const archetypeUrl = new URL("packages/data/src/archetypes/druid-wild-whisperer.json", root);
const sourceOptionsUrl = new URL("packages/data/src/options/investigator-talents.json", root);
const optionUrl = new URL("packages/data/src/options/druid-wild-whisperer-talents.json", root);
const archetype = JSON.parse(await readFile(archetypeUrl, "utf8"));
const sourceGroup = JSON.parse(await readFile(sourceOptionsUrl, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const inspiration = find("Inspiration");
const wildShape = find("Wild Shape");
const expertise = find("Natural Expertise");
const talent = find("Investigator Talent");
if (![inspiration, wildShape, expertise, talent].every(Boolean)) throw new Error("Wild Whisperer source features were not found");

const optionId = (id) => `wild-whisperer-${id.replace(/^investigator-/, "")}`;
const choiceDetails = {
  "investigator-device-talent": ["device-skill", "Device-related skill selected"],
  "investigator-rogue-talent": ["rogue-talent", "Rogue talent selected"],
};
const options = sourceGroup.options.map((raw) => {
  const detail = choiceDetails[raw.id];
  return {
    ...sourceGroup.optionDefaults,
    ...raw,
    id: optionId(raw.id),
    groupId: "druid-wild-whisperer-talents",
    classIds: ["druid"],
    minimumLevel: Math.max(8, raw.minimumLevel ?? sourceGroup.optionDefaults.minimumLevel ?? 1),
    prerequisites: [],
    choice: detail ? { key: detail[0], label: detail[1], allowCustom: true, uniqueAcrossSelections: true } : raw.choice,
  };
});
await writeFile(optionUrl, `${JSON.stringify({
  id: "druid-wild-whisperer-talents",
  name: "Wild Whisperer Investigator Talents",
  classIds: ["druid"],
  uniqueAcrossSelections: true,
  options,
  source: archetype.source,
}, null, 2)}\n`);

const amazingId = optionId("investigator-amazing-inspiration-talent");
const combatId = optionId("investigator-combat-inspiration");
const tenaciousId = optionId("investigator-tenacious-inspiration");
const alteredDieOptions = [amazingId, tenaciousId];
const allCombatOptions = [amazingId, combatId, tenaciousId];
const freeModes = [
  ["handle-animal", "Handle Animal"], ["heal", "Heal"], ["knowledge-geography", "Knowledge (geography)"],
  ["knowledge-nature", "Knowledge (nature)"], ["ride", "Ride"], ["sense-motive", "Sense Motive"],
  ["survival", "Survival"], ["wild-empathy", "Wild Empathy"],
].map(([id, label]) => ({ id, label, summary: id === "wild-empathy" ? "Any Wild Empathy check is free." : "Free when trained in this skill." }));
const roll = (label, sides = 6, count = 1, takeHighest = false) => ({
  label,
  diceCountByLevel: [{ level: 2, count }],
  dieSidesByLevel: sides === 8 ? [{ level: 2, sides: 8 }, { level: 20, sides: 10 }] : [{ level: 2, sides }],
  ...(takeHighest ? { takeHighest: true } : {}),
});
const action = (id, label, cost, diceRoll, extra = {}) => ({
  id, label, classId: "druid", minimumLevel: 2,
  ...(cost ? { resourceId: "inspiration", cost } : {}),
  actionTypeByLevel: [{ level: 2, actionType: "free" }],
  diceRoll,
  ...extra,
});
const variants = (prefix, label, cost, extra = {}) => [
  action(`${prefix}-base`, label, cost, roll("Inspiration"), { blockedByOptionIds: extra.combat ? allCombatOptions : alteredDieOptions, ...extra.common }),
  action(`${prefix}-amazing`, `${label} (Amazing Inspiration)`, cost, roll("Amazing Inspiration", 8), { requiredOptionId: amazingId, ...extra.common }),
  ...(extra.combat ? [action(`${prefix}-combat`, `${label} (Combat Inspiration)`, 1, roll("Combat Inspiration"), { requiredOptionId: combatId, ...extra.common })] : []),
  action(`${prefix}-tenacious`, `${label} (Tenacious Inspiration)`, cost, roll("Tenacious Inspiration", 6, 2, true), { requiredOptionId: tenaciousId, ...extra.common }),
];

inspiration.resourceActions = [
  ...variants("wild-whisperer-free-inspiration", "Roll free Inspiration", 0, { common: {
    modeLabel: "Qualifying check", modes: freeModes,
    confirmations: [{ id: "free-use-legal", label: "The selected skill is trained, or this is a Wild Empathy check", requiredForActivation: true }],
    summary: "Roll the inspiration die without spending a point on the Wild Whisperer's trained nature skills or any Wild Empathy check.",
  } }),
  ...variants("wild-whisperer-skill-inspiration", "Spend Inspiration on skill or ability check", 1, { common: {
    modeLabel: "Check", modes: [{ id: "skill", label: "Skill check", summary: "Add the Inspiration die to a qualifying skill check." }, { id: "ability", label: "Ability check", summary: "Add the Inspiration die to a qualifying ability check." }],
    summary: "Spend one point and roll the inspiration die for a non-free skill or ability check.",
  } }),
  ...variants("wild-whisperer-combat-inspiration", "Spend Inspiration on attack or saving throw", 2, { combat: true, common: {
    modeLabel: "Roll", modes: [{ id: "attack", label: "Attack roll", summary: "Add the Inspiration die to an attack roll." }, { id: "save", label: "Saving throw", summary: "Add the Inspiration die to a saving throw." }],
    summary: "Spend the displayed cost and roll the inspiration die. Combat Inspiration reduces the cost to one point.",
  } }),
];

const freeTalentModes = [
  ["investigator-device-talent", "Use Magic Device"],
  ["investigator-expanded-inspiration", "Diplomacy, Perception, or Profession"],
  ["investigator-item-lore", "Appraise or Use Magic Device"],
  ["investigator-underworld-inspiration", "Bluff, Disable Device, Disguise, Intimidate, or Sleight of Hand"],
];
for (const [rawId, label] of freeTalentModes) {
  inspiration.resourceActions.push(action(`wild-whisperer-${rawId}-free`, `Roll free Inspiration: ${label}`, 0, roll("Inspiration"), {
    requiredOptionId: optionId(rawId),
    confirmations: [{ id: "talent-free-use-legal", label: "The selected check qualifies for this talent and the skill is trained", requiredForActivation: true }],
    summary: `The selected Investigator Talent makes Inspiration free on ${label} checks.`,
  }));
}
inspiration.resourceActions.push(
  {
    id: "wild-whisperer-effortless-aid-move", label: "Effortless Aid (move action)", classId: "druid", minimumLevel: 8,
    requiredOptionId: optionId("investigator-effortless-aid"), actionTypeByLevel: [{ level: 8, actionType: "move" }],
    activeEffect: { name: "Effortless Aid", targets: ["allies"], bonus: 2, description: "Apply the Aid Another bonus to the chosen ally's qualifying check or defense.", defaultRounds: 1, fixedRounds: true, replaceExisting: true },
    summary: "Aid Another as a move action without spending Inspiration.",
  },
  {
    id: "wild-whisperer-effortless-aid-swift", label: "Effortless Aid (swift action)", classId: "druid", minimumLevel: 8,
    requiredOptionId: optionId("investigator-effortless-aid"), actionTypeByLevel: [{ level: 8, actionType: "swift" }],
    resourceId: "inspiration", cost: 1,
    activeEffect: { name: "Effortless Aid", targets: ["allies"], bonus: 2, description: "Apply the Aid Another bonus to the chosen ally's qualifying check or defense.", defaultRounds: 1, fixedRounds: true, replaceExisting: true },
    summary: "Spend one Inspiration to Aid Another as a swift action.",
  },
  {
    id: "wild-whisperer-inspired-alertness", label: "Inspired Alertness", classId: "druid", minimumLevel: 8,
    requiredOptionId: optionId("investigator-inspired-alertness"), resourceId: "inspiration", cost: 1,
    actionTypeByLevel: [{ level: 8, actionType: "immediate" }],
    activeEffect: { name: "Inspired Alertness", targets: ["self"], bonus: 0, description: "You are not treated as flat-footed for this triggering attack or effect.", defaultRounds: 1, fixedRounds: true, replaceExisting: true },
    summary: "Spend one Inspiration as an immediate action to avoid being caught flat-footed.",
  },
);

wildShape.progressionKey = "wild-shape";
wildShape.progressionProfiles = [{
  id: "wild-whisperer-wild-shape", label: "Restricted Wild Shape", classId: "druid",
  columns: [{ id: "forms", label: "Legal forms" }, { id: "spell", label: "Polymorph rules" }, { id: "uses", label: "Use progression" }],
  steps: [{ level: 4, values: { forms: "Small or Medium animals", spell: "Beast shape I", uses: "Normal Druid uses, except no increases at levels 6 and 8" } }],
  summary: "No elemental, plant, Tiny, Large, Huge, or greater beast-shape forms ever unlock.",
}];
wildShape.resourceActions = [{
  id: "wild-whisperer-wild-shape", label: "Wild Shape", classId: "druid", minimumLevel: 4,
  resourceId: "wildShape", cost: 1, actionTypeByLevel: [{ level: 4, actionType: "standard" }],
  modeLabel: "Beast shape I form size",
  modes: [
    { id: "small-animal", label: "Small animal", summary: "+2 size Dexterity, +1 natural armor; gain the chosen legal movement and senses.", activeEffects: [
      { target: "dexterity", bonus: 2, label: "Wild Whisperer Small Shape — Dexterity", description: "+2 size bonus to Dexterity." },
      { target: "armorClass", bonus: 1, label: "Wild Whisperer Small Shape — natural armor", description: "+1 natural armor bonus." },
    ] },
    { id: "medium-animal", label: "Medium animal", summary: "+2 size Strength, +2 natural armor; gain the chosen legal movement and senses.", activeEffects: [
      { target: "strength", bonus: 2, label: "Wild Whisperer Medium Shape — Strength", description: "+2 size bonus to Strength." },
      { target: "armorClass", bonus: 2, label: "Wild Whisperer Medium Shape — natural armor", description: "+2 natural armor bonus." },
    ] },
  ],
  confirmations: [{ id: "legal-animal-form", label: "Selected creature is a legal Small or Medium animal under beast shape I", requiredForActivation: true }],
  activeEffect: {
    name: "Wild Whisperer Wild Shape", targets: ["self"], bonus: 0,
    description: "Assume the selected Small or Medium animal form under beast shape I for 1 hour per Druid level.",
    defaultRoundsByLevel: Array.from({ length: 17 }, (_, index) => ({ level: index + 4, rounds: (index + 4) * 600 })),
    replaceExisting: true,
  },
  summary: "Spend one Wild Shape use and apply the exact Beast Shape I size bonuses and duration.",
}];

expertise.resourceActions = variants("wild-whisperer-natural-expertise", "Natural Expertise Inspiration", 1, { common: {
  minimumLevel: 6,
  modeLabel: "Qualifying roll", modes: [{ id: "attack", label: "Attack against animal or vermin", summary: "Add Inspiration to an attack roll against an animal or vermin." }, { id: "save", label: "Save against animal or vermin effect", summary: "Add Inspiration to a saving throw against an animal or vermin effect." }],
  confirmations: [{ id: "natural-target", label: "The target or effect comes from an animal or vermin", requiredForActivation: true }],
  summary: "Natural Expertise reduces the Inspiration cost for these attack rolls and saving throws to one point.",
} }).map((entry) => ({ ...entry, minimumLevel: 6 }));

talent.type = "selectable";
talent.choiceRequired = true;
talent.optionGroupId = "druid-wild-whisperer-talents";
talent.optionChoiceIds = options.map((option) => option.id);
talent.progressionKey = "wild-whisperer-investigator-talent";
talent.summary = "Choose one Investigator Talent using Druid level as effective Investigator level. The selected talent updates the Inspiration controls when it changes the die, cost, free skills, or available actions.";

archetype.resourceAdjustments = [{
  resourceId: "inspiration", label: "Inspiration", unit: "point", operation: "replace", minimumLevel: 2,
  base: 0, levelDivisor: 2, abilityModifier: "intelligence", minimum: 1, refreshCadence: "day", dedicatedAction: true,
}];
archetype.wildShapeUseAdjustments = [{ level: 6, delta: -1 }, { level: 8, delta: -1 }];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = [
  "Daily Inspiration scaling and refresh, free and paid check actions, Combat/Amazing/Tenacious Inspiration changes, Natural Expertise's reduced cost, legal Investigator Talent selection, restricted Beast Shape I forms with exact size modifiers and duration, and the lost level-6 and level-8 Wild Shape uses are automated.",
];
await writeFile(archetypeUrl, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Wild Whisperer automation.");
