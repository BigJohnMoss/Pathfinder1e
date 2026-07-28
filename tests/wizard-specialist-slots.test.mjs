import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { specialistSchoolSpells } from "../packages/engine/src/wizard-specialist-slots.js";

const wizard = JSON.parse(await readFile(new URL("../packages/data/src/classes/wizard.json", import.meta.url), "utf8"));
const schools = JSON.parse(await readFile(new URL("../packages/data/src/options/wizard-schools.json", import.meta.url), "utf8"));
const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const wizardSpells = bundle.spells.filter((spell) => spell.levelByClass.wizard !== undefined);
const schoolsForSpell = (spell) => Array.isArray(spell.schools) && spell.schools.length > 0 ? spell.schools : [spell.school].filter(Boolean);

const lissalanSchools = [
  "abjuration",
  "conjuration",
  "enchantment",
  "evocation",
  "illusion",
  "necromancy",
  "transmutation"
];

const verifiedCorrections = {
  "burning-arc-keleshite": "evocation",
  "snow-shape-ulfen": "transmutation",
  "ablative-sphere-garundi": "abjuration",
  "fleshwarping-swarm-drow": "transmutation",
  "summon-totem-creature-shoanti": "conjuration",
  "baphomets-blessing": "transmutation",
  "hasten-judgment": "necromancy"
};

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
  const missing = wizardSpells.filter((spell) => schoolsForSpell(spell).length === 0).map((spell) => `${spell.id} (${spell.name})`);
  assert.deepEqual(missing, [], `Wizard spells missing school metadata:\n${missing.join("\n")}`);
});

test("verified catalogue corrections retain their schools", () => {
  for (const [id, expectedSchool] of Object.entries(verifiedCorrections)) {
    const spell = wizardSpells.find((item) => item.id === id);
    assert.ok(spell, `${id} should be in the Wizard catalogue`);
    assert.equal(spell.school, expectedSchool, `${id} school`);
  }
});

test("each specialist school has at least one spell at every spell level", () => {
  const specialistSchools = schools.options.filter((school) => school.id !== "wizard-school-universalist");
  const missing = [];
  for (const school of specialistSchools) {
    const schoolId = school.associatedSchool ?? school.id.replace("wizard-school-", "");
    for (let level = 1; level <= 9; level += 1) {
      const options = specialistSchoolSpells(wizardSpells, school, level);
      if (options.length === 0) missing.push(`${school.id} level ${level}`);
      assert.ok(options.every((spell) =>
        (school.elementalSpellIdsByLevel ? school.elementalSpellIdsByLevel[String(level)].includes(spell.id) : schoolsForSpell(spell).includes(schoolId))
        && spell.levelByClass.wizard === level
      ));
    }
  }
  assert.deepEqual(missing, [], `Specialist school levels without spells:\n${missing.join("\n")}`);
});

test("elemental schools expose their complete level-specific APG spell lists", () => {
  for (const school of schools.options.filter((option) => option.elementalOppositionSchool)) {
    for (let level = 1; level <= 9; level += 1) {
      const expectedIds = school.elementalSpellIdsByLevel[String(level)];
      assert.deepEqual(specialistSchoolSpells(wizardSpells, school, level).map((spell) => spell.id).sort(), [...expectedIds].sort(), `${school.id} level ${level}`);
    }
  }
});

test("focused schools prepare specialist spells from their associated school", () => {
  const admixture = schools.options.find((school) => school.id === "wizard-school-admixture");
  const banishment = schools.options.find((school) => school.id === "wizard-school-banishment");
  assert.ok(specialistSchoolSpells(wizardSpells, admixture, 1).some((spell) => spell.id === "magic-missile"));
  assert.equal(specialistSchoolSpells(wizardSpells, admixture, 1).some((spell) => spell.id === "mage-armor"), false);
  assert.ok(specialistSchoolSpells(wizardSpells, banishment, 1).every((spell) => schoolsForSpell(spell).includes("abjuration")));
});

test("multi-school spells appear for each legal specialist school", () => {
  const spell = wizardSpells.find((item) => item.id === "lissalan-snake-sigil");
  assert.ok(spell, "Lissalan Snake Sigil should be in the Wizard catalogue");
  assert.equal(spell.school, "multiple");
  assert.deepEqual(spell.schools, lissalanSchools);

  const level = spell.levelByClass.wizard;
  for (const schoolId of lissalanSchools) {
    const school = schools.options.find((item) => item.id === `wizard-school-${schoolId}`);
    assert.ok(specialistSchoolSpells(wizardSpells, school, level).some((item) => item.id === spell.id), `${spell.id} should be available to ${schoolId}`);
  }
  const divination = schools.options.find((item) => item.id === "wizard-school-divination");
  assert.equal(specialistSchoolSpells(wizardSpells, divination, level).some((item) => item.id === spell.id), false);
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
