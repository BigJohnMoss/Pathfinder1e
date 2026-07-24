import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { oppositionSchoolOptions } from "../packages/engine/src/wizard-schools.js";

const wizard = JSON.parse(await readFile(new URL("../packages/data/src/classes/wizard.json", import.meta.url), "utf8"));
const schools = JSON.parse(await readFile(new URL("../packages/data/src/options/wizard-schools.json", import.meta.url), "utf8"));
const opposition = JSON.parse(await readFile(new URL("../packages/data/src/options/wizard-opposition-schools.json", import.meta.url), "utf8"));

test("Core Wizard catalogue exposes eight specialist schools and Universalist", () => {
  assert.equal(schools.options.length, 9);
  assert.deepEqual(schools.options.map((school) => school.id), [
    "wizard-school-abjuration", "wizard-school-conjuration", "wizard-school-divination", "wizard-school-enchantment", "wizard-school-evocation",
    "wizard-school-illusion", "wizard-school-necromancy", "wizard-school-transmutation", "wizard-school-universalist"
  ]);
  for (const school of schools.options.filter((option) => option.id !== "wizard-school-universalist")) {
    assert.equal(school.powers.length, 3, `${school.id} powers`);
    assert.deepEqual(school.powers.map((power) => power.level), [1, 1, school.id === "wizard-school-abjuration" ? 6 : 8]);
  }
  assert.equal(schools.options.find((option) => option.id === "wizard-school-universalist").powers.length, 2);
});

test("Wizard class progression requires a school and two dependent opposition choices", () => {
  const schoolFeature = wizard.features.find((feature) => feature.id === "wizard-arcane-school-1");
  assert.equal(schoolFeature.choiceRequired, true);
  assert.equal(schoolFeature.optionGroupId, "wizard-schools");
  assert.deepEqual(wizard.features.filter((feature) => feature.id.startsWith("wizard-opposition-school-")).map((feature) => feature.optionGroupId), ["wizard-opposition-schools", "wizard-opposition-schools"]);
  assert.equal(opposition.options.length, 8);
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
