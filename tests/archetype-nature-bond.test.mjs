import test from "node:test";
import assert from "node:assert/strict";
import archetypes from "../generated/pf1e-archetypes.mjs";
import feats from "../generated/pf1e-feats.mjs";
import data from "../generated/pf1e-data.mjs";
import {
  applyArchetype,
  archetypeAutomationSummary,
  inferArchetypeNatureBondRules,
} from "../packages/engine/src/index.js";

const archetype = (id) => archetypes.find((item) => item.id === id);
const rules = (id) => inferArchetypeNatureBondRules(archetype(id));

const animal = "druid-nature-bond-animal";
const domain = "druid-nature-bond-domain";
const companion = (id) => `ranger-animal-companion-${id}`;

test("Nature Bond archetypes expose their exact path restrictions", () => {
  for (const id of ["druid-feral-child", "druid-survivor"])
    assert.deepEqual(rules(id), {
      natureBondOptionIds: [animal],
      animalCompanionIds: [],
      domainIds: [],
    }, id);
  assert.deepEqual(rules("druid-sunrider"), {
    natureBondOptionIds: [animal],
    animalCompanionIds: [companion("horse"), companion("pony")],
    domainIds: [],
  });
  assert.deepEqual(rules("druid-storm-druid"), {
    natureBondOptionIds: [domain],
    animalCompanionIds: [],
    domainIds: [
      "domain-air",
      "domain-weather",
      "subdomain-cloud",
      "subdomain-storms",
      "subdomain-wind",
    ],
  });
});

test("totem shamans expose their exact companion and domain lists", () => {
  const expected = {
    "druid-eagle-shaman": [[companion("bird")], ["domain-air", "domain-animal", "domain-nobility", "domain-weather"]],
    "druid-lion-shaman": [[companion("small-cat")], ["domain-animal", "domain-glory", "domain-nobility", "domain-sun"]],
    "druid-serpent-shaman": [[companion("constrictor-snake"), companion("viper-snake")], ["domain-animal", "domain-charm", "domain-trickery", "domain-water"]],
    "druid-shark-shaman": [[companion("shark")], ["domain-animal", "domain-death", "domain-war", "domain-water"]],
    "druid-wolf-shaman": [[companion("wolf")], ["domain-animal", "domain-community", "domain-liberation", "domain-travel"]],
  };
  for (const [id, [animalCompanionIds, domainIds]] of Object.entries(expected))
    assert.deepEqual(rules(id), {
      natureBondOptionIds: [animal, domain],
      animalCompanionIds,
      domainIds,
    }, id);
});

test("applied archetypes retain a functional selector and carry restrictions", () => {
  const druid = data.classes.find((item) => item.id === "druid");
  for (const id of ["druid-feral-child", "druid-survivor", "druid-sunrider"]){
    const applied = applyArchetype(druid, archetype(id), data.classes);
    const selectors = applied.features.filter((feature) => feature.optionGroupId === "druid-nature-bonds");
    assert.equal(selectors.length, 1, id);
    assert.equal(selectors[0].choiceRequired, true, id);
    assert.deepEqual(applied.druidNatureBondOptionIds, [animal], id);
  }
  const serpent = applyArchetype(druid, archetype("druid-serpent-shaman"), data.classes);
  assert.deepEqual(serpent.druidAnimalCompanionIds, [companion("constrictor-snake"), companion("viper-snake")]);
  assert.deepEqual(serpent.druidDomainIds, ["domain-animal", "domain-charm", "domain-trickery", "domain-water"]);
});

test("complete Nature Bond restriction rules leave the manual queue", () => {
  const ids = [
    "druid-feral-child", "druid-survivor", "druid-sunrider", "druid-storm-druid",
    "druid-eagle-shaman", "druid-lion-shaman", "druid-serpent-shaman",
    "druid-shark-shaman", "druid-wolf-shaman",
  ];
  for (const id of ids)
    assert.ok(!archetypeAutomationSummary(archetype(id), feats).manual.some((entry) => /^Nature Bond/.test(entry)), id);
  assert.ok(archetypeAutomationSummary(archetype("druid-ape-shaman"), feats).manual.some((entry) => /^Nature Bond/.test(entry)));
});

test("every inferred restriction references a known catalog option", () => {
  const knownPaths = new Set(data.optionGroups.find((group) => group.id === "druid-nature-bonds").options.map((option) => option.id));
  const knownCompanions = new Set(data.optionGroups.find((group) => group.id === "ranger-animal-companions").options.map((option) => option.id));
  const knownDomains = new Set(data.optionGroups.find((group) => group.id === "cleric-domains").options.map((option) => option.id));
  for (const item of archetypes) {
    const inferred = inferArchetypeNatureBondRules(item);
    assert.ok(inferred.natureBondOptionIds.every((id) => knownPaths.has(id)), item.id);
    assert.ok(inferred.animalCompanionIds.every((id) => knownCompanions.has(id)), item.id);
    assert.ok(inferred.domainIds.every((id) => knownDomains.has(id)), item.id);
  }
});
