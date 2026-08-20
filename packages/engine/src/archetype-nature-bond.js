const animalBond = "druid-nature-bond-animal";
const domainBond = "druid-nature-bond-domain";
const companion = (id) => `ranger-animal-companion-${id}`;
const domain = (id) => `domain-${id}`;

const exactRules = new Map([
  ["druid-feral-child", {
    natureBondOptionIds: [animalBond],
  }],
  ["druid-survivor", {
    natureBondOptionIds: [animalBond],
  }],
  ["druid-sunrider", {
    natureBondOptionIds: [animalBond],
    animalCompanionIds: [companion("horse"), companion("pony")],
  }],
  ["druid-storm-druid", {
    natureBondOptionIds: [domainBond],
    domainIds: [domain("air"), domain("weather"), "subdomain-cloud", "subdomain-storms", "subdomain-wind"],
  }],
  ["druid-eagle-shaman", {
    natureBondOptionIds: [animalBond, domainBond],
    animalCompanionIds: [companion("bird")],
    domainIds: [domain("air"), domain("animal"), domain("nobility"), domain("weather")],
  }],
  ["druid-lion-shaman", {
    natureBondOptionIds: [animalBond, domainBond],
    animalCompanionIds: [companion("small-cat")],
    domainIds: [domain("animal"), domain("glory"), domain("nobility"), domain("sun")],
  }],
  ["druid-serpent-shaman", {
    natureBondOptionIds: [animalBond, domainBond],
    animalCompanionIds: [companion("constrictor-snake"), companion("viper-snake")],
    domainIds: [domain("animal"), domain("charm"), domain("trickery"), domain("water")],
  }],
  ["druid-shark-shaman", {
    natureBondOptionIds: [animalBond, domainBond],
    animalCompanionIds: [companion("shark")],
    domainIds: [domain("animal"), domain("death"), domain("war"), domain("water")],
  }],
  ["druid-wolf-shaman", {
    natureBondOptionIds: [animalBond, domainBond],
    animalCompanionIds: [companion("wolf")],
    domainIds: [domain("animal"), domain("community"), domain("liberation"), domain("travel")],
  }],
]);

export function inferredArchetypeNatureBondDetails(archetype) {
  const rule = exactRules.get(archetype?.id);
  const feature = (archetype?.replacements ?? [])
    .flatMap((replacement) => replacement.features ?? [])
    .find((entry) => /^Nature Bond(?: \(Ex\))?$/i.test(entry.name ?? ""));
  if (!rule || !feature) return {
    natureBondOptionIds: [],
    animalCompanionIds: [],
    domainIds: [],
    fullyAutomatedFeatureIds: new Set(),
  };
  return {
    natureBondOptionIds: rule.natureBondOptionIds,
    animalCompanionIds: rule.animalCompanionIds ?? [],
    domainIds: rule.domainIds ?? [],
    fullyAutomatedFeatureIds: new Set([feature.id]),
  };
}

export function inferArchetypeNatureBondRules(archetype) {
  const details = inferredArchetypeNatureBondDetails(archetype);
  return {
    natureBondOptionIds: details.natureBondOptionIds,
    animalCompanionIds: details.animalCompanionIds,
    domainIds: details.domainIds,
  };
}
