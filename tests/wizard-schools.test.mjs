import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { oppositionSchoolOptions } from "../packages/engine/src/wizard-schools.js";

const wizard = JSON.parse(await readFile(new URL("../packages/data/src/classes/wizard.json", import.meta.url), "utf8"));
const schools = JSON.parse(await readFile(new URL("../packages/data/src/options/wizard-schools.json", import.meta.url), "utf8"));
const opposition = JSON.parse(await readFile(new URL("../packages/data/src/options/wizard-opposition-schools.json", import.meta.url), "utf8"));

test("Core Wizard catalogue exposes eight specialist schools and Universalist", () => {
  const coreSchools = schools.options.filter((school) => !school.associatedSchool && !school.elementalOppositionSchool);
  assert.equal(coreSchools.length, 9);
  assert.deepEqual(coreSchools.map((school) => school.id), [
    "wizard-school-abjuration", "wizard-school-conjuration", "wizard-school-divination", "wizard-school-enchantment", "wizard-school-evocation",
    "wizard-school-illusion", "wizard-school-necromancy", "wizard-school-transmutation", "wizard-school-universalist"
  ]);
  for (const school of coreSchools.filter((option) => option.id !== "wizard-school-universalist")) {
    assert.equal(school.powers.length, 3, `${school.id} powers`);
    assert.deepEqual(school.powers.map((power) => power.level), [1, 1, school.id === "wizard-school-abjuration" ? 6 : 8]);
  }
  assert.equal(schools.options.find((option) => option.id === "wizard-school-universalist").powers.length, 2);
});

test("APG focused schools cover every published specialization and retain their associated school", () => {
  const focusedSchools = schools.options.filter((school) => school.associatedSchool);
  assert.deepEqual(focusedSchools.map((school) => school.id), [
    "wizard-school-admixture", "wizard-school-banishment", "wizard-school-controller", "wizard-school-counterspell",
    "wizard-school-creation", "wizard-school-enhancement", "wizard-school-foresight", "wizard-school-generation",
    "wizard-school-life", "wizard-school-manipulator", "wizard-school-phantasm", "wizard-school-scryer",
    "wizard-school-shadow", "wizard-school-shapechange", "wizard-school-teleportation", "wizard-school-undead"
  ]);
  assert.ok(focusedSchools.every((school) => school.powers.length >= 1));
  assert.deepEqual(
    focusedSchools.filter((school) => school.associatedSchool === "abjuration").map((school) => school.id),
    ["wizard-school-banishment", "wizard-school-counterspell"]
  );
});

test("Wizard class progression requires a school and two dependent opposition choices", () => {
  const schoolFeature = wizard.features.find((feature) => feature.id === "wizard-arcane-school-1");
  assert.equal(schoolFeature.choiceRequired, true);
  assert.equal(schoolFeature.optionGroupId, "wizard-schools");
  assert.deepEqual(wizard.features.filter((feature) => feature.id.startsWith("wizard-opposition-school-")).map((feature) => feature.optionGroupId), ["wizard-opposition-schools", "wizard-opposition-schools"]);
  assert.equal(opposition.options.filter((option) => !["air", "earth", "fire", "water"].includes(option.id.replace("wizard-opposition-", ""))).length, 8);
});

test("opposition school filtering excludes the specialty and disables Universalists", () => {
  const evocation = schools.options.find((option) => option.id === "wizard-school-evocation");
  const universalist = schools.options.find((option) => option.id === "wizard-school-universalist");
  const evokerChoices = oppositionSchoolOptions(opposition.options, evocation);
  assert.equal(evokerChoices.length, 7);
  assert.equal(evokerChoices.some((option) => option.id === "wizard-opposition-evocation"), false);
  assert.deepEqual(oppositionSchoolOptions(opposition.options, universalist), []);
  assert.deepEqual(oppositionSchoolOptions(opposition.options, null), []);
});

test("focused schools exclude their associated school from opposition choices", () => {
  const admixture = schools.options.find((option) => option.id === "wizard-school-admixture");
  const choices = oppositionSchoolOptions(opposition.options, admixture);
  assert.equal(choices.length, 7);
  assert.equal(choices.some((option) => option.id === "wizard-opposition-evocation"), false);
});

test("APG elemental schools force one opposed element", () => {
  const elementalSchools = schools.options.filter((school) => school.elementalOppositionSchool);
  assert.deepEqual(elementalSchools.map((school) => school.id), [
    "wizard-school-air", "wizard-school-earth", "wizard-school-fire", "wizard-school-water"
  ]);
  assert.deepEqual(elementalSchools.map((school) => school.elementalOppositionSchool), ["earth", "air", "water", "fire"]);
  for (const school of elementalSchools) {
    assert.equal(school.powers.length, 3);
    assert.deepEqual(Object.keys(school.elementalSpellIdsByLevel), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    const choices = oppositionSchoolOptions(opposition.options, school);
    assert.deepEqual(choices.map((option) => option.id), [`wizard-opposition-${school.elementalOppositionSchool}`]);
  }
});
