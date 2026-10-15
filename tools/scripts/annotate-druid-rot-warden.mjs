import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-rot-warden.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const decay = find("Invoke Decay");
const bond = find("Nature Bond");
const empathy = find("Vermin Empathy");
const swarm = find("Swarmcaller");
const enduring = find("Enduring Druid");
const shape = find("Wild Shape");

const decaySpells = [
  ["decompose-corpse", 1], ["warp-wood", 2], ["later-spell-fungal-infestation", 3],
  ["later-spell-explosion-of-rot", 4], ["insect-plague", 5], ["later-spell-swarm-skin", 6],
  ["creeping-doom", 7], ["horrid-wilting", 8], ["massacre", 9],
];
decay.spellAutomation = { preparedKeywordConversion: { label: "Invoke Decay", spellIds: decaySpells.map(([id]) => id) } };
decay.progressionProfiles = [{
  id: "rot-warden-invoke-decay",
  label: "Invoke Decay",
  classId: "druid",
  columns: [{ id: "spell", label: "Spontaneous spell" }],
  steps: decaySpells.map(([id, level]) => ({ level: level === 1 ? 1 : level * 2 - 1, values: { spell: `${level}: ${id.replace(/^later-spell-/, "").replaceAll("-", " ")}` } })),
  summary: "Each listed spell receives an Invoke Decay control that spends the lowest available prepared slot of the same or a higher level.",
}];

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  optionChoiceIds: ["druid-nature-bond-animal", "druid-nature-bond-domain"],
  progressionKey: "druid-nature-bond",
});

empathy.resourceActions = [{
  id: "rot-warden-vermin-empathy",
  label: "Roll Vermin Empathy",
  classId: "druid",
  minimumLevel: 1,
  modeLabel: "Vermin target",
  modes: [
    { id: "individual", label: "Individual vermin", summary: "No archetype penalty." },
    { id: "matching-swarm", label: "Matching swarm", summary: "Swarm matches the vermin companion or current Wild Shape; no penalty." },
    { id: "other-swarm", label: "Other vermin swarm", summary: "Apply the mandatory −4 penalty." },
  ],
  diceRoll: {
    label: "Vermin Empathy check",
    diceCountByLevel: [{ level: 1, count: 1 }],
    dieSidesByLevel: [{ level: 1, sides: 20 }],
    abilityModifier: "charisma",
    flatModifierByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, modifier: index + 1 })),
    targetDcInputLabel: "Unfriendly vermin attitude DC",
    outcomesByMargin: [{ minimumMargin: 0, label: "attitude improves" }],
    failureLabel: "attitude unchanged (subtract 4 from the total for an unmatched swarm)",
  },
  summary: "Roll 1d20 + Druid level + Charisma; unmatched vermin swarms impose −4.",
}];

const swarmChoices = [
  ["cockroach", "Cockroach swarm", 3], ["locust", "Locust swarm", 3], ["spider", "Spider swarm", 3],
  ["army-ant", "Army ant swarm", 9], ["centipede", "Centipede swarm", 9], ["wasp", "Wasp swarm", 9],
];
swarm.resourceActions = [{
  id: "rot-warden-swarmcaller",
  label: "Use Swarmcaller",
  classId: "druid",
  minimumLevel: 3,
  resourceId: "rotWardenSwarmcaller",
  cost: 1,
  actionTypeByLevel: [{ level: 3, actionType: "standard" }],
  spellLikeAbility: { spellId: "summon-swarm", spellName: "Summon Swarm", cadence: "day", kind: "spell-like" },
  modeLabel: "Swarm and timing",
  modes: swarmChoices.flatMap(([id, label, minimumLevel]) => [
    { id, label, minimumLevel, summary: `Summon ${label.toLowerCase()} outside a surprise round.` },
    { id: `${id}-surprise`, label: `${label} — surprise round`, minimumLevel, defaultRounds: 2, summary: "Hush nearby animals/vermin and shake flat-footed creatures through the first round.", activeEffects: [{ target: "enemy", bonus: 0, label: "Swarmcaller surprise", description: "Nearby animals and vermin are hushed; flat-footed creatures are shaken through the first round of combat. This fear does not stack." }] },
  ]),
  activeEffect: { name: "Swarmcaller Summon", targets: ["allies"], bonus: 0, description: "Track the chosen swarm as summon swarm. Maintain concentration, then remove it 2 rounds after concentration ends.", defaultRounds: 2, replaceExisting: true },
  summary: "Spend the once-daily use, choose a legal swarm, and optionally apply the surprise-round rider.",
}];

enduring.progressionProfiles = [{
  id: "rot-warden-enduring-druid",
  label: "Enduring Druid",
  classId: "druid",
  columns: [{ id: "bonus", label: "Save bonus" }, { id: "against", label: "Against" }],
  steps: [{ level: 4, values: { bonus: "+4", against: "Vermin/swarm attacks and abilities; aging or decay effects against self or equipment" } }],
}];

shape.progressionKey = "druid-wild-shape";
shape.progressionProfiles = [{
  id: "rot-warden-wild-shape",
  label: "Rot Warden Wild Shape",
  classId: "druid",
  columns: [{ id: "effective", label: "Effective Druid level" }, { id: "added", label: "Added vermin forms" }],
  steps: [
    { level: 6, values: { effective: "Druid level − 2; no elemental forms", added: "—" } },
    { level: 8, values: { effective: "Druid level − 2", added: "Small or Medium vermin (vermin shape I)" } },
    { level: 10, values: { effective: "Druid level − 2", added: "Tiny or Large vermin (vermin shape II)" } },
    { level: 12, values: { effective: "Druid level − 2", added: "Huge vermin (vermin shape III)" } },
  ],
}];
shape.resourceActions = [{
  id: "rot-warden-wild-shape",
  label: "Assume Rot Warden Wild Shape",
  classId: "druid",
  minimumLevel: 6,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 6, actionType: "standard" }],
  modeLabel: "Legal form tier",
  modes: [
    { id: "animal-small-medium", label: "Small or Medium animal", minimumLevel: 6, summary: "Beast shape I." },
    { id: "animal-large", label: "Large animal", minimumLevel: 8, summary: "Beast shape II." },
    { id: "vermin-small-medium", label: "Small or Medium vermin", minimumLevel: 8, summary: "Vermin shape I." },
    { id: "animal-tiny-huge", label: "Tiny or Huge animal", minimumLevel: 10, summary: "Beast shape III." },
    { id: "plant-i", label: "Small or Medium plant", minimumLevel: 10, summary: "Plant shape I at effective level 8." },
    { id: "vermin-tiny-large", label: "Tiny or Large vermin", minimumLevel: 10, summary: "Vermin shape II." },
    { id: "plant-ii", label: "Tiny or Large plant", minimumLevel: 12, summary: "Plant shape II at effective level 10." },
    { id: "vermin-huge", label: "Huge vermin", minimumLevel: 12, summary: "Vermin shape III." },
    { id: "plant-iii", label: "Huge plant", minimumLevel: 14, summary: "Plant shape III at effective level 12." },
  ],
  activeEffect: { name: "Rot Warden Wild Shape", targets: ["self"], bonus: 0, description: "Assume the selected legal animal, plant, or vermin form at effective Druid level −2; elemental forms are prohibited.", defaultRoundsByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 4) * 600 })), replaceExisting: true },
  summary: "Spend one use; legal form tiers and duration use effective Druid level −2.",
}];

archetype.spellListAdditions = Object.fromEntries(decaySpells);
archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal", "druid-nature-bond-domain"];
archetype.druidDomainIds = ["domain-destruction", "domain-erosion", "domain-repose", "domain-vermin"];
archetype.optionGroupAugmentations = [{ targetGroupId: "cleric-domains", sourceGroupId: "rot-warden-domains" }];
archetype.resourceAdjustments = [
  ...(archetype.resourceAdjustments ?? []).filter((entry) => entry.resourceId !== "rotWardenSwarmcaller"),
  { sourceFeatureId: swarm.id, resourceId: "rotWardenSwarmcaller", label: "Swarmcaller", unit: "use", operation: "replace", minimumLevel: 3, base: 1, maximum: 1, refreshCadence: "day", dedicatedAction: true },
];
archetype.conditionalModifiers = [
  ...(archetype.conditionalModifiers ?? []).filter((entry) => entry.sourceFeatureId !== enduring.id),
  { sourceFeatureId: enduring.id, label: "Enduring Druid", condition: "Saving throws against vermin/swarm attacks and special abilities, or effects that age or decay the Rot Warden or equipment", minimumLevel: 4, base: 4 },
];
archetype.wildShapeLevelAdjustment = -2;
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["All nine Invoke Decay conversions, restricted bond domains (including imported Erosion and Vermin domains), Vermin Empathy cases, daily Swarmcaller choices and surprise rider, Enduring Druid defenses, and every legal delayed animal/plant/vermin Wild Shape tier are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Rot Warden automation.");
