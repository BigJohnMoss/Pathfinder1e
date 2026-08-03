import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { applyArchetype, applyArchetypeResourceAdjustments, featuresThroughLevel } from "../packages/engine/src/index.js";

const directory = new URL("../packages/data/src/archetypes/", import.meta.url);
const arcanist = JSON.parse(await readFile(new URL("../packages/data/src/classes/arcanist.json", import.meta.url), "utf8"));
const elementalMasterElements = JSON.parse(await readFile(new URL("../packages/data/src/options/elemental-master-elements.json", import.meta.url), "utf8"));
const schoolSavantSchools = JSON.parse(await readFile(new URL("../packages/data/src/options/school-savant-schools.json", import.meta.url), "utf8"));
const schoolSavantOppositionSchools = JSON.parse(await readFile(new URL("../packages/data/src/options/school-savant-opposition-schools.json", import.meta.url), "utf8"));
const generatedData = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const archetypes = await Promise.all((await readdir(directory))
  .filter((name) => name.startsWith("arcanist-") && name.endsWith(".json"))
  .map(async (name) => JSON.parse(await readFile(new URL(name, directory), "utf8"))));

test("all published Arcanist archetypes have sourced replacement progressions", () => {
  assert.equal(archetypes.length, 15);
  assert.ok(archetypes.every((archetype) =>
    archetype.source.url.includes("ArchetypeDisplay.aspx") &&
    archetype.replacesText &&
    archetype.replacements.every((replacement) => replacement.featureIds.length && replacement.features.length)
  ));
  const featureIds = archetypes.flatMap((archetype) =>
    archetype.replacements.flatMap((replacement) => replacement.features.map((feature) => feature.id))
  );
  assert.equal(new Set(featureIds).size, featureIds.length);
});

test("Blade Adept replaces the correct exploit levels and exposes its complete rules", () => {
  const bladeAdept = archetypes.find((archetype) => archetype.id === "arcanist-blade-adept");
  const applied = applyArchetype(arcanist, bladeAdept);
  const features = featuresThroughLevel(applied, 20);
  assert.ok(features.some((feature) => feature.name === "Sword Bond (Su)" && /one-handed piercing or slashing/.test(feature.summary)));
  assert.ok(features.some((feature) => feature.name === "Sentient Sword (Su)" && /black blade/.test(feature.summary)));
  for (const id of ["arcanist-exploit-1", "arcanist-exploit-3", "arcanist-exploit-9"]) {
    assert.ok(!features.some((feature) => feature.id === id));
  }
  assert.ok(features.some((feature) => feature.id === "arcanist-blade-adept-exploit-5" && feature.optionGroupId === "blade-adept-exploits"));
  assert.deepEqual(features.filter((feature) => feature.optionGroupId === "blade-adept-exploits").map((feature) => feature.level), [5, 7, 11, 13, 15, 17, 19]);
});

test("Elemental Master requires one of four inherited elemental schools", () => {
  const elementalMaster = archetypes.find((archetype) => archetype.id === "arcanist-elemental-master");
  const applied = applyArchetype(arcanist, elementalMaster);
  const focus = applied.features.find((feature) => feature.id === "arcanist-elemental-master-elemental-focus-su-1");
  assert.equal(focus.type, "selectable");
  assert.equal(focus.choiceRequired, true);
  assert.equal(focus.optionGroupId, "elemental-master-elements");
  assert.equal(elementalMasterElements.inheritsOptionsFrom, "wizard-schools");
  assert.deepEqual(elementalMasterElements.inheritedOptionIds, [
    "wizard-school-air",
    "wizard-school-earth",
    "wizard-school-fire",
    "wizard-school-water",
  ]);
});

test("School Savant exposes inherited schools, opposition choices, and all nine specialist slots", () => {
  const schoolSavant = archetypes.find((archetype) => archetype.id === "arcanist-school-savant");
  const features = featuresThroughLevel(applyArchetype(arcanist, schoolSavant), 20);
  assert.equal(features.find((feature) => feature.id === "school-savant-school-focus-1")?.optionGroupId, "school-savant-schools");
  assert.equal(features.filter((feature) => feature.id.startsWith("school-savant-opposition-school-")).length, 2);
  assert.deepEqual(
    features.filter((feature) => feature.id.startsWith("school-savant-specialist-spell-")).map((feature) => feature.level),
    [1, 4, 6, 8, 10, 12, 14, 16, 18],
  );
  assert.equal(schoolSavantSchools.inheritsOptionsFrom, "wizard-schools");
  assert.equal(schoolSavantOppositionSchools.inheritsOptionsFrom, "wizard-opposition-schools");
});

test("Blood Arcanist inherits only its legal bloodline benefits and exploits", () => {
  const bloodArcanist = archetypes.find((archetype) => archetype.id === "arcanist-blood-arcanist");
  const features = featuresThroughLevel(applyArchetype(arcanist, bloodArcanist), 20);
  assert.equal(features.find((feature) => feature.id === "blood-arcanist-bloodline-1")?.optionGroupId, "blood-arcanist-bloodlines");
  assert.deepEqual(features.filter((feature) => feature.optionGroupId === "blood-arcanist-exploits").map((feature) => feature.level), [5, 7, 11, 13, 17, 19]);
  const bloodlines = generatedData.optionGroups.find((group) => group.id === "blood-arcanist-bloodlines").options;
  assert.equal(bloodlines.length, 32);
  assert.equal(bloodlines.filter((option) => option.selectedVariant).length, 14);
  assert.ok(bloodlines.every((option) => !option.classSkill && !option.classSkillChoices && !option.bonusSpells && !option.bonusFeats));
  assert.ok(bloodlines.every((option) => option.arcana && option.powers?.length));
  const exploits = generatedData.optionGroups.find((group) => group.id === "blood-arcanist-exploits").options;
  assert.equal(exploits.some((option) => option.id === "bloodline-development"), false);
});

test("Harrowed Society Student grants Psychic Sensitivity and bounded daily readings", () => {
  const student = archetypes.find((archetype) => archetype.id === "arcanist-harrowed-society-student");
  const psychicReader = student.replacements.flatMap((replacement) => replacement.features)
    .find((feature) => feature.id === "arcanist-harrowed-society-student-psychic-reader-ex-1");
  assert.equal(psychicReader.grantedFeatId, "psychic-sensitivity");
  assert.equal(student.replacements.flatMap((replacement) => replacement.features)
    .find((feature) => feature.id === "arcanist-harrowed-society-student-harrow-reservoir-ex-8").level, 1);
  assert.deepEqual(student.resourceAdjustments, [{
    resourceId: "harrowReadings",
    label: "Harrow Readings",
    unit: "reading",
    operation: "add",
    minimumLevel: 1,
    base: 1,
    levelDivisor: 8,
    maximum: 3,
  }]);
  assert.deepEqual([1, 7, 8, 15, 16, 20].map((level) =>
    applyArchetypeResourceAdjustments({}, [student], level).harrowReadings
  ), [1, 1, 2, 2, 3, 3]);
  const applied = featuresThroughLevel(applyArchetype(arcanist, student), 20);
  const mysteryChoices = applied.filter((feature) => feature.optionGroupId === "harrowed-divine-mysteries");
  assert.deepEqual(mysteryChoices.map((feature) => feature.level), [5, 7, 9, 11, 13, 15, 17, 19]);
  assert.ok(mysteryChoices.every((feature) => feature.choiceRequired));

  const spells = generatedData.optionGroups.find((group) => group.id === "harrowed-divine-mysteries").options;
  assert.ok(spells.length >= 80);
  assert.ok(spells.every((option) => option.spellId && option.spellLevel <= 8));
  assert.ok(spells.every((option) => generatedData.spells.find((spell) => spell.id === option.spellId)?.levelByClass.arcanist === undefined));
  assert.deepEqual([5, 7, 9, 11, 13, 15, 17].map((level) =>
    Math.max(...spells.filter((option) => option.minimumLevel <= level).map((option) => option.spellLevel))
  ), [2, 3, 4, 5, 6, 6, 8]);
});

test("Magaambyan Initiate exposes one legal Druid spell choice per class level", () => {
  const initiate = archetypes.find((archetype) => archetype.id === "arcanist-magaambyan-initiate");
  const applied = featuresThroughLevel(applyArchetype(arcanist, initiate), 20);
  const halcyonChoices = applied.filter((feature) => feature.optionGroupId === "magaambyan-halcyon-spells");
  assert.deepEqual(halcyonChoices.map((feature) => feature.level), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.ok(halcyonChoices.every((feature) => feature.choiceRequired));
  assert.equal(applied.find((feature) => feature.id === "arcanist-magaambyan-initiate-spell-mastery-5")?.grantedFeatId, "spell-mastery");

  const spells = generatedData.optionGroups.find((group) => group.id === "magaambyan-halcyon-spells").options;
  assert.ok(spells.length >= 100);
  assert.ok(spells.every((option) => option.spellId && option.spellLevel <= 9));
  assert.ok(spells.every((option) => option.castsAsPrepared));
  assert.ok(spells.every((option) => option.resourceCost?.resourceId === "arcaneReservoir"));
  assert.ok(spells.every((option) => option.resourceCost?.levelDivisor === 2 && option.resourceCost?.minimum === 1));
  assert.ok(spells.every((option) => generatedData.spells.find((spell) => spell.id === option.spellId)?.levelByClass.arcanist === undefined));
  assert.deepEqual([1, 3, 5, 7, 9, 11, 13, 15, 17].map((level) =>
    Math.max(...spells.filter((option) => option.minimumLevel <= level).map((option) => option.spellLevel))
  ), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("White Mage automatically grants level-aware on-demand cure spells", () => {
  const whiteMage = archetypes.find((archetype) => archetype.id === "arcanist-white-mage");
  const applied = featuresThroughLevel(applyArchetype(arcanist, whiteMage), 20);
  const healing = applied.find((feature) => feature.id === "arcanist-white-mage-spontaneous-healing-su-1");
  assert.equal(healing?.optionGroupId, "white-mage-cure-spells");
  assert.equal(healing?.grantsAllOptions, true);
  const options = generatedData.optionGroups.find((group) => group.id === "white-mage-cure-spells").options;
  const cures = options.filter((option) => option.spellId !== "breath-of-life");
  assert.deepEqual(cures.map((option) => option.spellLevel).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(cures.every((option) => option.castsAsPrepared && option.resourceCost?.base === 1));
  assert.deepEqual(cures.map((option) => option.minimumLevel).sort((a, b) => a - b), [1, 3, 5, 7, 9, 11, 13, 15]);
  const breathOfLife = options.find((option) => option.spellId === "breath-of-life");
  assert.equal(breathOfLife?.minimumLevel, 10);
  assert.equal(breathOfLife?.spellLevel, 5);
  assert.equal(breathOfLife?.resourceCost?.base, 5);
});
