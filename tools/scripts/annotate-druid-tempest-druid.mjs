import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-tempest-druid.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const alignment = find("Alignment");
const casting = find("Spontaneous Domain Casting");
const bond = find("Nature Bond");
const shore = find("Sodden Shore Sense");
const resistance = find("Electrical Resistance");
const eyes = find("Eyes of the Storm");
const bolt = find("Bend Bolt");
const domainIds = ["domain-air", "domain-aquatic", "subdomain-cloud", "subdomain-storms", "domain-swamp", "domain-weather", "subdomain-wind"];
const spellIdsByOption = {
  "domain-air": ["obscuring-mist", "wind-wall", "gaseous-form", "air-walk", "control-winds", "chain-lightning", "elemental-body-iv", "whirlwind", "elemental-swarm"],
  "domain-aquatic": ["hydraulic-push", "slipstream", "water-breathing", "freedom-of-movement", "black-tentacles", "freezing-sphere", "animal-shapes", "seamantle", "tsunami"],
  "subdomain-cloud": ["obscuring-mist", "wind-wall", "gaseous-form", "solid-fog", "control-winds", "chain-lightning", "elemental-body-iv", "whirlwind", "storm-of-vengeance"],
  "subdomain-storms": ["obscuring-mist", "fog-cloud", "call-lightning", "sleet-storm", "call-lightning-storm", "sirocco", "control-weather", "whirlwind", "storm-of-vengeance"],
  "domain-swamp": ["hydraulic-push", "later-spell-burst-of-nettles", "later-spell-lily-pad-stride", "cape-of-wasps", "insect-plague", "fester-mass", "animate-plants", "later-spell-blood-mist", "shambler"],
  "domain-weather": ["obscuring-mist", "fog-cloud", "call-lightning", "sleet-storm", "ice-storm", "control-winds", "control-weather", "whirlwind", "storm-of-vengeance"],
  "subdomain-wind": ["whispering-wind", "wind-wall", "gaseous-form", "air-walk", "control-winds", "wind-walk", "elemental-body-iv", "whirlwind", "winds-of-vengeance"],
};

Object.assign(alignment, { type: "selectable", choiceRequired: true, optionGroupId: "cleric-alignments", optionChoiceIds: ["alignment-chaotic-neutral"], progressionKey: "tempest-druid-alignment" });

casting.spellAutomation = { preparedOptionSpellConversion: { label: "Spontaneous Domain Casting", spellIdsByOption } };
casting.progressionProfiles = [{ id: "tempest-druid-spontaneous-domain-casting", label: "Spontaneous Domain Casting", classId: "druid", columns: [{ id: "rule", label: "Conversion rule" }], steps: [{ level: 1, values: { rule: "Lose a prepared spell to cast a selected-domain spell of the same or a lower level" } }], summary: "The selected domain's exact spell list receives prepared-slot conversion controls." }];

Object.assign(bond, { type: "selectable", choiceRequired: true, optionGroupId: "cleric-domains", optionChoiceIds: domainIds, progressionKey: "tempest-druid-domain" });

shore.progressionProfiles = [{ id: "tempest-druid-sodden-shore", label: "Sodden Shore Sense", classId: "druid", columns: [{ id: "bonus", label: "Knowledge (nature) and Survival" }, { id: "terrain", label: "Terrain" }], steps: [{ level: 1, values: { bonus: "+4", terrain: "Coastal or marshy lands" } }] }];

resistance.progressionProfiles = [{ id: "tempest-druid-electrical-resistance", label: "Electrical Resistance", classId: "druid", columns: [{ id: "resistance", label: "Electricity resistance" }, { id: "transfer", label: "Transfer" }], steps: [{ level: 3, values: { resistance: 5, transfer: "Standard action; another creature for 1 hour" } }] }];
resistance.resourceActions = [{
  id: "tempest-druid-electrical-resistance",
  label: "Set Electrical Resistance Holder",
  classId: "druid",
  minimumLevel: 3,
  actionTypeByLevel: [{ level: 3, actionType: "standard" }],
  modeLabel: "Resistance holder",
  modes: [
    { id: "self", label: "Tempest Druid", summary: "Electricity resistance 5 is on the Druid.", activeEffects: [{ target: "self", bonus: 0, label: "Electrical Resistance", description: "The Tempest Druid has electricity resistance 5." }] },
    { id: "ally", label: "Touched creature", defaultRounds: 600, summary: "Transfer electricity resistance 5 for 1 hour; the Druid loses it during this time.", activeEffects: [{ target: "allies", bonus: 0, label: "Electrical Resistance", description: "The touched creature has electricity resistance 5; the Tempest Druid does not." }] },
  ],
  summary: "Move the single resistance-5 effect between the Druid and a touched creature.",
}];

eyes.progressionProfiles = [{ id: "tempest-druid-eyes-of-storm", label: "Eyes of the Storm", classId: "druid", columns: [{ id: "distance", label: "Inclement-weather sight" }], steps: [4, 8, 12, 16, 20].map((level) => ({ level, values: { distance: `${10 + 5 * Math.floor((level - 4) / 4)} feet` } })), summary: "Ignore concealment from magical fog, mist, rain, wind, and similar conditions within this distance." }];

bolt.resourceActions = [{
  id: "tempest-druid-bend-bolt",
  label: "Bend Bolt",
  classId: "druid",
  minimumLevel: 9,
  resourceId: "tempestDruidBendBolt",
  cost: 1,
  actionTypeByLevel: [{ level: 9, actionType: "immediate" }],
  modeLabel: "Electricity effect",
  modes: [
    { id: "area", label: "Area attack", summary: "Make one square unaffected and affect one adjacent square not already in the area." },
    { id: "target", label: "Targeted attack", summary: "Shift the attack to a target adjacent to the original target." },
  ],
  confirmations: [{ id: "nearby-electricity", label: "The electricity attack is nearby and is not conducted by physical contact", requiredForActivation: true }],
  activeEffect: { name: "Bend Bolt Resolution", targets: ["area"], bonus: 0, description: "The selected electricity attack's area or target shifts 5 feet in the chosen direction.", defaultRounds: 1, fixedRounds: true, replaceExisting: true },
  summary: "Spend one Wisdom-based daily use and redirect a qualifying electrical attack by 5 feet.",
}];

archetype.proficiencyAdjustments = [{ sourceFeatureId: find("Armor and Weapon").id, category: "weapon", operation: "add", proficiencies: ["Trident"] }];
archetype.druidNatureBondOptionIds = ["druid-nature-bond-domain"];
archetype.druidDomainIds = domainIds;
archetype.optionGroupAugmentations = [{ targetGroupId: "cleric-domains", sourceGroupId: "tempest-druid-domains" }];
archetype.skillBonusAdjustments = ["Knowledge (nature)", "Survival"].map((skill) => ({ sourceFeatureId: shore.id, skill, minimumLevel: 1, base: 4, condition: "checks in coastal or marshy lands" }));
archetype.resourceAdjustments = [
  ...(archetype.resourceAdjustments ?? []).filter((entry) => entry.resourceId !== "tempestDruidBendBolt"),
  { sourceFeatureId: bolt.id, resourceId: "tempestDruidBendBolt", label: "Bend Bolt", unit: "use", operation: "replace", minimumLevel: 9, base: 0, abilityModifier: "wisdom", minimum: 0, refreshCadence: "day", dedicatedAction: true },
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Chaotic neutral alignment, trident proficiency, seven-domain selection (including imported Aquatic domain), selected-domain spell conversion, coastal skill bonuses, transferable electricity resistance, scaling storm sight, and Wisdom-based Bend Bolt uses and targeting are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Tempest Druid automation.");
