import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-sky-druid.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const bond = find("Nature Bond");
const embrace = find("Sky’s Embrace");
const resistance = find("Resist Storm");
const skymaster = find("Skymaster");
const wildShape = find("Wild Shape");
const soaring = find("Soaring Form");
const wildBlue = find("Into the Wild Blue");
const domainIds = ["domain-air", "subdomain-cloud", "subdomain-wind", "domain-animal", "subdomain-feather", "subdomain-fur", "domain-liberation", "subdomain-freedom", "subdomain-revolution", "domain-weather", "subdomain-seasons", "subdomain-storms"];

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "druid-nature-bonds",
  optionChoiceIds: ["druid-nature-bond-animal", "druid-nature-bond-domain"],
  progressionKey: "druid-nature-bond"
});

embrace.progressionProfiles = [{
  id: "sky-druid-skys-embrace",
  label: "Sky’s Embrace",
  classId: "druid",
  columns: [{ id: "falling", label: "Falling" }, { id: "skills", label: "Fly skill" }],
  steps: [{ level: 2, values: { falling: "No falling damage (constant feather fall)", skills: "May take ranks; may replace Acrobatics on jump checks" } }]
}];
embrace.resourceActions = [
  {
    id: "sky-druid-track-feather-fall",
    label: "Track Constant Feather Fall",
    classId: "druid",
    minimumLevel: 2,
    spellLikeAbility: { spellId: "feather-fall", spellName: "Feather Fall", cadence: "at-will", kind: "spell-equivalent" },
    activeEffect: { name: "Sky’s Embrace — Feather Fall", targets: ["self"], bonus: 0, description: "Constant feather fall prevents falling damage.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true },
    summary: "Record the constant feather fall effect."
  },
  {
    id: "sky-druid-fly-jump",
    label: "Jump using Fly",
    classId: "druid",
    minimumLevel: 2,
    diceRoll: {
      label: "Fly-based jump check",
      diceCountByLevel: [{ level: 2, count: 1 }],
      dieSidesByLevel: [{ level: 2, sides: 20 }],
      modifierInputLabel: "Fly skill modifier",
      targetDcInputLabel: "Jump DC",
      outcomesByMargin: [{ minimumMargin: 0, label: "jump succeeds" }],
      failureLabel: "jump fails"
    },
    summary: "Roll Fly instead of Acrobatics for a jump check."
  }
];

resistance.progressionProfiles = [{
  id: "sky-druid-resist-storm",
  label: "Resist Storm",
  classId: "druid",
  columns: [{ id: "bonus", label: "Save bonus" }, { id: "against", label: "Against" }],
  steps: [{ level: 4, values: { bonus: "+4", against: "Air/electricity spells and weather-controlling or modifying effects" } }]
}];

skymaster.resourceActions = [{
  id: "sky-druid-skymaster-flight",
  label: "Use Skymaster Flight",
  classId: "druid",
  minimumLevel: 5,
  resourceId: "skyDruidFlightMinutes",
  variableCost: { label: "Minutes", minimum: 1, maximumLevelDivisor: 1 },
  actionTypeByLevel: [{ level: 5, actionType: "standard" }],
  spellLikeAbility: { spellId: "fly", spellName: "Fly", cadence: "day", kind: "spell-equivalent" },
  activeEffect: { name: "Skymaster Flight", targets: ["self"], bonus: 0, description: "Gain the effects of fly for the selected number of minutes; this ability can target only the Sky Druid.", defaultRounds: 10, durationFromVariableCost: true, durationFromVariableCostMultiplier: 10, replaceExisting: true },
  summary: "Spend minutes one-for-one from the Druid-level daily flight pool."
}];

wildShape.progressionProfiles = [{
  id: "sky-druid-wild-shape-level",
  label: "Sky Druid Wild Shape",
  classId: "druid",
  columns: [{ id: "flying", label: "Form with fly speed" }, { id: "other", label: "Other legal form" }],
  steps: [{ level: 6, values: { flying: "Druid level + 1", other: "Druid level" } }]
}];
wildShape.resourceActions = [
  {
    id: "sky-druid-flying-wild-shape",
    label: "Use Flying Wild Shape",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 6, actionType: "standard" }],
    confirmations: [{ id: "flying-form", label: "Selected form has a fly speed", requiredForActivation: true }],
    activeEffect: { name: "Sky Druid Flying Wild Shape", targets: ["self"], bonus: 0, description: "Assume the selected flying form using Druid level + 1 for Wild Shape effects.", defaultRoundsByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 6) * 600 })), replaceExisting: true },
    summary: "Spend one Wild Shape use and apply the +1 effective-level benefit."
  },
  {
    id: "sky-druid-other-wild-shape",
    label: "Use Other Wild Shape",
    classId: "druid",
    minimumLevel: 6,
    resourceId: "wildShape",
    cost: 1,
    actionTypeByLevel: [{ level: 6, actionType: "standard" }],
    confirmations: [{ id: "legal-form", label: "Selected form is legal for normal Wild Shape at the Sky Druid's level", requiredForActivation: true }],
    activeEffect: { name: "Sky Druid Wild Shape", targets: ["self"], bonus: 0, description: "Assume the selected nonflying form using actual Druid level.", defaultRoundsByLevel: Array.from({ length: 15 }, (_, index) => ({ level: index + 6, rounds: (index + 6) * 600 })), replaceExisting: true },
    summary: "Spend one Wild Shape use at normal effective level."
  }
];

soaring.progressionProfiles = [{
  id: "sky-druid-soaring-form",
  label: "Soaring Form Immunities",
  classId: "druid",
  columns: [{ id: "altitude", label: "Altitude" }, { id: "wind", label: "Wind" }],
  steps: [{ level: 9, values: { altitude: "Immune to altitude sickness", wind: "Unaffected by natural or magical wind" } }]
}];

wildBlue.progressionProfiles = [{
  id: "sky-druid-wild-blue",
  label: "Into the Wild Blue",
  classId: "druid",
  columns: [{ id: "speed", label: "Fly speed" }, { id: "maneuverability", label: "Maneuverability" }],
  steps: [{ level: 13, values: { speed: "Twice base land speed", maneuverability: "Good" } }]
}];
wildBlue.numericCalculations = [{
  id: "sky-druid-fly-speed",
  label: "Into the Wild Blue Speed",
  inputLabel: "Base land speed (feet)",
  inputMinimum: 0,
  inputMaximum: 500,
  inputDefault: 30,
  outputLabel: "Fly speed (feet, good maneuverability)",
  baseByLevel: [{ level: 13, value: 0 }],
  inputMultiplierByLevel: [{ level: 13, multiplier: 2 }],
  classId: "druid",
  summary: "The permanent fly speed is twice current base land speed."
}];
wildBlue.resourceActions = [{
  id: "sky-druid-track-wild-blue",
  label: "Track Into the Wild Blue",
  classId: "druid",
  minimumLevel: 13,
  activeEffect: { name: "Into the Wild Blue", targets: ["self"], bonus: 0, description: "Gain a permanent fly speed equal to twice base land speed with good maneuverability.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true },
  summary: "Record the permanent level-13 flight benefit; use the calculator for its speed."
}];

archetype.proficiencyAdjustments = [{ category: "armor", operation: "remove", proficiencies: ["Medium armor"] }];
archetype.druidNatureBondOptionIds = ["druid-nature-bond-animal", "druid-nature-bond-domain"];
archetype.druidAnimalCompanionIds = ["ranger-animal-companion-bird", "ranger-animal-companion-bat"];
archetype.druidDomainIds = domainIds;
archetype.resourceAdjustments = [
  ...(archetype.resourceAdjustments ?? []).filter((entry) => entry?.resourceId !== "skyDruidFlightMinutes"),
  { sourceFeatureId: skymaster.id, resourceId: "skyDruidFlightMinutes", label: "Skymaster flight", unit: "minute", operation: "replace", minimumLevel: 5, base: 0, levelMultiplier: 1, maximum: 20, refreshCadence: "day", dedicatedAction: true }
];
archetype.conditionalModifiers = [
  ...(archetype.conditionalModifiers ?? []).filter((entry) => entry.sourceFeatureId !== resistance.id),
  { sourceFeatureId: resistance.id, label: "Resist Storm", condition: "Saving throws against air/electricity spells and effects that control or modify weather", minimumLevel: 4, base: 4 }
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Armor loss, flying-companion and legal domain/subdomain restrictions, constant feather fall and Fly-based jumps, storm resistance, minute-based Skymaster flight, conditional Wild Shape effective level, altitude/wind immunities, and permanent calculated flight are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Sky Druid automation.");
