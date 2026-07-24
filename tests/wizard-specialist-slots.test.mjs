import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { specialistSchoolSpells } from "../packages/engine/src/wizard-specialist-slots.js";

const wizard = JSON.parse(await readFile(new URL("../packages/data/src/classes/wizard.json", import.meta.url), "utf8"));
const schools = JSON.parse(await readFile(new URL("../packages/data/src/options/wizard-schools.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const wizardSpells = bundle.spells.filter((spell) => spell.levelByClass.wizard !== undefined);

test("Wizard gains one specialist school slot with each new spell level", () => {
  const features = wizard.features.filter((feature) => feature.id.startsWith("wizard-specialist-spell-"));
  assert.deepEqual(features.map((feature) => feature.id), [
    "wizard-specialist-spell-1", "wizard-specialist-spell-2", "wizard-specialist-spell-3", "wizard-specialist-spell-4", "wizard-specialist-spell-5",
    "wizard-specialist-spell-6", "wizard-specialist-spell-7", "wizard-specialist-spell-8", "wizard-specialist-spell-9"
  ]);
  assert.deepEqual(features.map((feature) => feature.level), [1, 3, 5, 7, 9, 11, 13, 15, 17]);
  assert.ok(features.every((feature) => feature.choiceRequired && feature.optionGroupId === "wizard-schools" && feature.uses === "1 slot per day"));
});

test("every generated Wizard spell retains usable school metadata", () => {
  assert.ok(wizardSpells.length > 1000, `expected broad Wizard spell coverage, found ${wizardSpells.length}`);
  const missing = wizardSpells.filter((spell) => typeof spell.school !== "string" || spell.school.length === 0).map((spell) => `${spell.id} (${spell.name})`);
  assert.deepEqual(missing, [], `Wizard spells missing school metadata:\n${missing.join("\n")}`);
});

test("each specialist school has at least one spell at every spell level", () => {
  const specialistSchools = schools.options.filter((school) => school.id !== "wizard-school-universalist");
  const missing = [];
  for (const school of specialistSchools) {
    for (let level = 1; level <= 9; level += 1) {
      const options = specialistSchoolSpells(wizardSpells, school, level);
      if (options.length === 0) missing.push(`${school.id} level ${level}`);
      assert.ok(options.every((spell) => spell.school === school.id.replace("wizard-school-", "") && spell.levelByClass.wizard === level));
    }
  }
  assert.deepEqual(missing, [], `Specialist school levels without spells:\n${missing.join("\n")}`);
});

test("specialist filtering returns only the selected school and disables Universalists", () => {
  const evocation = schools.options.find((school) => school.id === "wizard-school-evocation");
  const conjuration = schools.options.find((school) => school.id === "wizard-school-conjuration");
  const universalist = schools.options.find((school) => school.id === "wizard-school-universalist");
  const evocationFirst = specialistSchoolSpells(wizardSpells, evocation, 1);
  assert.ok(evocationFirst.some((spell) => spell.id === "magic-missile"));
  assert.equal(evocationFirst.some((spell) => spell.id === "mage-armor"), false);
  const conjurationFirst = specialistSchoolSpells(wizardSpells, conjuration, 1);
  assert.ok(conjurationFirst.some((spell) => spell.id === "mage-armor"));
  assert.deepEqual(specialistSchoolSpells(wizardSpells, universalist, 1), []);
  assert.deepEqual(specialistSchoolSpells(wizardSpells, null, 1), []);
  assert.deepEqual(specialistSchoolSpells(wizardSpells, evocation, 0), []);
});
