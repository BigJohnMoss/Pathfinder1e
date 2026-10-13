import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-leshy-warden.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const replacement = archetype.replacements[0];
replacement.features = replacement.features.filter((feature) => !["druid-leshy-warden-leshy-tender-ex-8", "druid-leshy-warden-leshy-tender-ex-12"].includes(feature.id));
const features = replacement.features;
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const familiar = find("Leshy Familiar");
const empathy = find("Green Empathy");
const summoner = find("Leshy Summoner");
const tender = find("Leshy Tender");
const wildShape = find("Wild Shape");
const whisperer = find("Plant Whisperer");

Object.assign(familiar, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "cleric-domains",
  optionChoiceIds: ["domain-plant", "subdomain-growth"],
  progressionKey: "leshy-warden-plant-domain",
  progressionProfiles: [{
    id: "leshy-warden-familiar-bond",
    label: "Leshy Familiar Bond",
    classId: "druid",
    columns: [{ id: "familiar", label: "Familiar" }, { id: "effectiveLevel", label: "Effective wizard level" }, { id: "domain", label: "Domain access" }],
    steps: [{ level: 1, values: { familiar: "Leaf leshy", effectiveLevel: "Druid level", domain: "Plant domain or Growth subdomain while familiar lives; Decay prohibited" } }]
  }]
});

empathy.resourceActions = [
  {
    id: "leshy-warden-green-empathy-plant",
    label: "Use Green Empathy — Plant",
    classId: "druid",
    minimumLevel: 1,
    diceRoll: {
      label: "Green Empathy check",
      diceCountByLevel: [{ level: 1, count: 1 }],
      dieSidesByLevel: [{ level: 1, sides: 20 }],
      modifierInputLabel: "Druid level + Charisma modifier",
      targetDcInputLabel: "Plant attitude DC",
      outcomesByMargin: [{ minimumMargin: 0, label: "attitude improves" }],
      failureLabel: "attitude unchanged"
    },
    summary: "Influence a plant creature, including a mindless plant, using the standard Wild Empathy check."
  },
  {
    id: "leshy-warden-green-empathy-animal",
    label: "Use Green Empathy — Animal",
    classId: "druid",
    minimumLevel: 1,
    diceRoll: {
      label: "Green Empathy check against animal",
      diceCountByLevel: [{ level: 1, count: 1 }],
      dieSidesByLevel: [{ level: 1, sides: 20 }],
      modifierInputLabel: "Druid level + Charisma modifier − 4",
      targetDcInputLabel: "Animal attitude DC",
      outcomesByMargin: [{ minimumMargin: 0, label: "attitude improves" }],
      failureLabel: "attitude unchanged"
    },
    summary: "Influence an animal with the archetype's mandatory −4 penalty."
  }
];

summoner.progressionProfiles = [{
  id: "leshy-warden-summon-list",
  label: "Leshy Summoner Additions",
  classId: "druid",
  columns: [{ id: "spell", label: "Summon nature's ally" }, { id: "leshy", label: "Added creature" }],
  steps: [
    { level: 1, values: { spell: "I", leshy: "Leaf leshy" } },
    { level: 3, values: { spell: "II", leshy: "Gourd leshy" } },
    { level: 5, values: { spell: "III", leshy: "Fungus leshy" } },
    { level: 7, values: { spell: "IV", leshy: "Seaweed leshy" } },
    { level: 9, values: { spell: "V", leshy: "Lotus leshy" } }
  ],
  summary: "The Leshy Warden also counts as a plant creature when growing leshys."
}];
summoner.resourceActions = [{
  id: "leshy-warden-summon-leshy",
  label: "Track Summoned Leshy",
  classId: "druid",
  minimumLevel: 1,
  modeLabel: "Summon nature's ally option",
  modes: [
    { id: "leaf", label: "SNA I — Leaf leshy", minimumLevel: 1, summary: "Summon a leaf leshy with summon nature's ally I." },
    { id: "gourd", label: "SNA II — Gourd leshy", minimumLevel: 3, summary: "Summon a gourd leshy with summon nature's ally II." },
    { id: "fungus", label: "SNA III — Fungus leshy", minimumLevel: 5, summary: "Summon a fungus leshy with summon nature's ally III." },
    { id: "seaweed", label: "SNA IV — Seaweed leshy", minimumLevel: 7, summary: "Summon a seaweed leshy with summon nature's ally IV." },
    { id: "lotus", label: "SNA V — Lotus leshy", minimumLevel: 9, summary: "Summon a lotus leshy with summon nature's ally V." }
  ],
  confirmations: [{ id: "cast-sna", label: "The matching summon nature's ally spell has been cast or converted", requiredForActivation: true }],
  activeEffect: { name: "Leshy Summoner Creature", targets: ["allies"], bonus: 0, description: "Track the selected leshy added to the corresponding summon nature's ally list.", defaultRoundsByLevel: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, rounds: index + 1 })) },
  summary: "Select and track the level-legal leshy summon for the matching spell."
}];

Object.assign(tender, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "leshy-warden-tender-4",
  optionChoiceIds: ["leshy-warden-tender-4-reinforce", "leshy-warden-tender-4-gourd"],
  progressionKey: "leshy-warden-tender-4"
});
const tenderFeatures = [
  {
    id: "druid-leshy-warden-leshy-tender-ex-8",
    name: "Leshy Tender (Ex) — 8th Level",
    level: 8,
    type: "selectable",
    summary: "Choose whether to grant the current leshy +2 Strength and Dexterity or transform it into a fungus leshy. A transformation uses the new form's normal scores and discards earlier Leshy Tender increases.",
    choiceRequired: true,
    optionGroupId: "leshy-warden-tender-8",
    optionChoiceIds: ["leshy-warden-tender-8-reinforce", "leshy-warden-tender-8-fungus"],
    progressionKey: "leshy-warden-tender-8"
  },
  {
    id: "druid-leshy-warden-leshy-tender-ex-12",
    name: "Leshy Tender (Ex) — 12th Level",
    level: 12,
    type: "selectable",
    summary: "Choose whether to grant the current leshy +2 Strength and Dexterity or transform it into a seaweed leshy. A transformation uses the new form's normal scores and discards earlier Leshy Tender increases.",
    choiceRequired: true,
    optionGroupId: "leshy-warden-tender-12",
    optionChoiceIds: ["leshy-warden-tender-12-reinforce", "leshy-warden-tender-12-seaweed"],
    progressionKey: "leshy-warden-tender-12"
  }
];
features.splice(features.indexOf(tender) + 1, 0, ...tenderFeatures);
tender.progressionProfiles = [{
  id: "leshy-warden-tender-results",
  label: "Leshy Tender Familiar",
  classId: "druid",
  columns: [{ id: "choice", label: "Choice" }, { id: "rule", label: "Result" }],
  steps: [
    { level: 4, values: { choice: "Reinforce or gourd", rule: "+2 Strength/Dexterity, or reset to normal gourd scores" } },
    { level: 8, values: { choice: "Reinforce or fungus", rule: "+2 Strength/Dexterity, or reset to normal fungus scores" } },
    { level: 12, values: { choice: "Reinforce or seaweed", rule: "+2 Strength/Dexterity, or reset to normal seaweed scores" } }
  ]
}];

wildShape.progressionProfiles = [{
  id: "leshy-warden-plant-shape",
  label: "Leshy Warden Wild Shape",
  classId: "druid",
  columns: [{ id: "forms", label: "Legal forms" }, { id: "spell", label: "As spell" }],
  steps: [
    { level: 6, values: { forms: "Small or Medium plant", spell: "Plant shape I" } },
    { level: 8, values: { forms: "Small, Medium, or Large plant", spell: "Plant shape II" } },
    { level: 10, values: { forms: "Small, Medium, Large, or Huge plant", spell: "Plant shape III" } }
  ]
}];
wildShape.resourceActions = [{
  id: "leshy-warden-plant-wild-shape",
  label: "Use Plant Wild Shape",
  classId: "druid",
  minimumLevel: 6,
  resourceId: "wildShape",
  cost: 1,
  actionTypeByLevel: [{ level: 6, actionType: "standard" }],
  modeLabel: "Plant shape tier",
  modes: [
    { id: "plant-shape-i", label: "Plant Shape I — Small or Medium", minimumLevel: 6, maximumLevel: 7, summary: "Assume a Small or Medium plant form as plant shape I." },
    { id: "plant-shape-ii", label: "Plant Shape II — up to Large", minimumLevel: 8, maximumLevel: 9, summary: "Assume a plant form up to Large size as plant shape II." },
    { id: "plant-shape-iii", label: "Plant Shape III — up to Huge", minimumLevel: 10, summary: "Assume a plant form up to Huge size as plant shape III." }
  ],
  confirmations: [{ id: "plant-form", label: "The selected form is a plant creature within the unlocked size limit", requiredForActivation: true }],
  activeEffect: { name: "Leshy Warden Plant Wild Shape", targets: ["self"], bonus: 0, description: "Assume the selected legal plant form at the level-appropriate plant shape tier.", defaultRoundsByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 6) * 600 })), replaceExisting: true },
  summary: "Spend one adjusted Wild Shape use. Duration is 1 hour per Druid level."
}];

whisperer.resourceActions = [
  {
    id: "leshy-warden-speak-with-plants",
    label: "Track Constant Speak with Plants",
    classId: "druid",
    minimumLevel: 13,
    spellLikeAbility: { spellId: "speak-with-plants", spellName: "Speak with Plants", cadence: "at-will", kind: "spell-equivalent" },
    activeEffect: { name: "Plant Whisperer — Speak with Plants", targets: ["self"], bonus: 0, description: "Constantly gain the effects of speak with plants.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true },
    summary: "Records the always-active speak with plants effect."
  },
  {
    id: "leshy-warden-commune-with-nature",
    label: "Commune with Nature",
    classId: "druid",
    minimumLevel: 13,
    resourceId: "leshyWardenCommune",
    cost: 1,
    actionTypeByLevel: [{ level: 13, actionType: "10-minute" }],
    spellLikeAbility: { spellId: "commune-with-nature", spellName: "Commune with Nature", cadence: "day", kind: "spell-equivalent" },
    summary: "Spend the once-daily use after 10 minutes of communion."
  }
];

archetype.wildShapeUseAdjustments = [{ level: 6, delta: -1 }];
archetype.druidDomainIds = ["domain-plant", "subdomain-growth"];
archetype.resourceAdjustments = [
  ...(archetype.resourceAdjustments ?? []).filter((entry) => entry?.resourceId && entry.resourceId !== "leshyWardenCommune"),
  { sourceFeatureId: whisperer.id, resourceId: "leshyWardenCommune", label: "Plant Whisperer commune", unit: "use", operation: "replace", minimumLevel: 13, base: 1, minimum: 0, maximum: 1, refreshCadence: "day", dedicatedAction: true }
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Leaf-leshy familiar and legal Plant-domain bond, both Green Empathy targets, expanded summon lists, all three persistent Leshy Tender decisions, adjusted Wild Shape uses and legal plant forms, and both Plant Whisperer effects are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Leshy Warden automation.");
