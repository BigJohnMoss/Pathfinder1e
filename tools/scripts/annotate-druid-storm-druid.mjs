import { readFile, writeFile } from "node:fs/promises";

const url = new URL("../../packages/data/src/archetypes/druid-storm-druid.json", import.meta.url);
const archetype = JSON.parse(await readFile(url, "utf8"));
const features = archetype.replacements.flatMap((replacement) => replacement.features ?? []);
const find = (prefix) => features.find((feature) => feature.name.startsWith(prefix));
const casting = find("Spontaneous Domain Casting");
const bond = find("Nature Bond");
const windwalker = find("Windwalker");
const voice = find("Stormvoice");
const eyes = find("Eyes of the Storm");
const windlord = find("Windlord");
const lord = find("Storm Lord");
const domainIds = ["domain-air", "domain-weather", "subdomain-cloud", "subdomain-storms", "subdomain-wind"];
const spellIdsByOption = {
  "domain-air": ["obscuring-mist", "wind-wall", "gaseous-form", "air-walk", "control-winds", "chain-lightning", "elemental-body-iv", "whirlwind", "elemental-swarm"],
  "domain-weather": ["obscuring-mist", "fog-cloud", "call-lightning", "sleet-storm", "ice-storm", "control-winds", "control-weather", "whirlwind", "storm-of-vengeance"],
  "subdomain-cloud": ["obscuring-mist", "wind-wall", "gaseous-form", "solid-fog", "control-winds", "chain-lightning", "elemental-body-iv", "whirlwind", "storm-of-vengeance"],
  "subdomain-storms": ["obscuring-mist", "fog-cloud", "call-lightning", "sleet-storm", "call-lightning-storm", "sirocco", "control-weather", "whirlwind", "storm-of-vengeance"],
  "subdomain-wind": ["whispering-wind", "wind-wall", "gaseous-form", "air-walk", "control-winds", "wind-walk", "elemental-body-iv", "whirlwind", "winds-of-vengeance"],
};

casting.spellAutomation = { preparedOptionSpellConversion: { label: "Spontaneous Domain Casting", spellIdsByOption } };
casting.progressionProfiles = [{
  id: "storm-druid-spontaneous-domain-casting",
  label: "Spontaneous Domain Casting",
  classId: "druid",
  columns: [{ id: "rule", label: "Conversion rule" }],
  steps: [{ level: 1, values: { rule: "Lose a prepared spell to cast a selected-domain spell of the same or a lower level" } }],
  summary: "The spellbook follows both selected domains after Windlord and spends the lowest available legal prepared slot.",
}];

Object.assign(bond, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "cleric-domains",
  optionChoiceIds: domainIds,
  progressionKey: "storm-druid-primary-domain",
});

windwalker.progressionProfiles = [{
  id: "storm-druid-windwalker",
  label: "Windwalker",
  classId: "druid",
  columns: [{ id: "severity", label: "Wind severity" }],
  steps: [{ level: 2, values: { severity: "Treat natural and magical wind effects as one step less severe" } }],
}];

voice.numericCalculations = [{
  id: "storm-druid-stormvoice-dc",
  label: "Stormvoice Hearing DC",
  inputLabel: "Original Perception DC",
  inputMinimum: 0,
  inputMaximum: 999,
  inputDefault: 20,
  outputLabel: "DC to hear the Storm Druid",
  baseByLevel: Array.from({ length: 18 }, (_, index) => ({ level: index + 3, value: -(index + 3) })),
  inputMultiplierByLevel: [{ level: 3, multiplier: 1 }],
  classId: "druid",
  summary: "Subtract current Druid level from the Perception DC required to hear the Storm Druid's voice.",
}];

eyes.progressionProfiles = [{
  id: "storm-druid-eyes-of-storm",
  label: "Eyes of the Storm",
  classId: "druid",
  columns: [{ id: "distance", label: "Inclement-weather sight" }],
  steps: [4, 8, 12, 16, 20].map((level) => ({ level, values: { distance: `${10 + 5 * Math.floor((level - 4) / 4)} feet` } })),
  summary: "Ignore concealment from magical fog, mist, gas, wind, rain, and similar weather within this distance.",
}];

Object.assign(windlord, {
  type: "selectable",
  choiceRequired: true,
  optionGroupId: "cleric-domains",
  optionChoiceIds: domainIds,
  progressionKey: "storm-druid-secondary-domain",
});
windlord.progressionProfiles = [{
  id: "storm-druid-windlord",
  label: "Windlord",
  classId: "druid",
  columns: [{ id: "benefit", label: "Second domain" }],
  steps: [{ level: 9, values: { benefit: "Choose a second, different Air/Weather domain or Cloud/Storms/Wind subdomain" } }],
}];

lord.progressionProfiles = [{
  id: "storm-druid-storm-lord",
  label: "Storm Lord",
  classId: "druid",
  columns: [{ id: "wind", label: "Wind" }, { id: "deafness", label: "Deafness" }, { id: "sonic", label: "Sonic saves" }],
  steps: [{ level: 13, values: { wind: "Unaffected by natural and magical wind", deafness: "Immune", sonic: "+2" } }],
}];
lord.resourceActions = [{
  id: "storm-druid-track-storm-lord",
  label: "Track Storm Lord",
  classId: "druid",
  minimumLevel: 13,
  activeEffect: { name: "Storm Lord", targets: ["self"], bonus: 0, description: "Unaffected by natural and magical wind and immune to deafness; +2 on saves against sonic effects is included in conditional modifiers.", defaultRounds: 999999, fixedRounds: true, replaceExisting: true },
  summary: "Record the permanent wind and deafness immunities.",
}];

archetype.druidNatureBondOptionIds = ["druid-nature-bond-domain"];
archetype.druidDomainIds = domainIds;
archetype.conditionalModifiers = [
  ...(archetype.conditionalModifiers ?? []).filter((entry) => entry.sourceFeatureId !== lord.id),
  { sourceFeatureId: lord.id, label: "Storm Lord", condition: "Saving throws against sonic effects", minimumLevel: 13, base: 2 },
];
archetype.mechanicalCoverage = "full";
archetype.mechanicalNotes = ["Primary and secondary domain/subdomain selection, selected-domain prepared-spell conversion, wind severity reduction, Stormvoice DC calculation, scaling inclement-weather sight, wind/deafness immunity, and sonic resistance are automated."];

await writeFile(url, `${JSON.stringify(archetype, null, 2)}\n`);
console.log("Annotated Storm Druid automation.");
