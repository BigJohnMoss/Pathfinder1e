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
  assert.equal(features.find((feature) => feature.name === "Sword Bond (Su)")?.optionGroupId, "blade-adept-bonded-weapons");
  assert.deepEqual(bladeAdept.proficiencyAdjustments, [{ category: "weapon", operation: "add", proficiencies: ["Selected bonded weapon (simple or martial)"] }]);
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
  assert.equal(bloodArcanist.mechanicalCoverage, "full");
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
  const reading = applied.find((feature) => feature.id === "arcanist-harrowed-society-student-harrow-reservoir-ex-8").resourceActions[0];
  assert.equal(reading.resourceId, "harrowReadings");
  assert.deepEqual(reading.variableRecovery, { resourceId: "arcaneReservoir", label: "Chosen-suit cards dealt", minimum: 0, maximum: 9, levelDivisor: 2 });
  const trump = applied.find((feature) => feature.id === "arcanist-harrowed-society-student-trump-card-su-9").resourceActions[0];
  assert.equal(trump.cost, 1);
  assert.deepEqual(trump.randomOutcomes.map((outcome) => outcome.label), ["Books", "Crowns", "Hammers", "Keys", "Shields", "Stars"]);
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
  assert.deepEqual(whiteMage.optionGroupAugmentations, [{
    targetGroupId: "arcanist-exploits",
    sourceGroupId: "white-mage-exploits",
    minimumFeatureLevel: 11,
  }]);
  const fastHealingOption = generatedData.optionGroups
    .find((group) => group.id === "white-mage-exploits")?.options
    .find((option) => option.id === "white-mage-fast-healing");
  assert.equal(fastHealingOption?.minimumLevel, 11);
  const fastHealing = applied.find((feature) => feature.id === "arcanist-white-mage-greater-exploit-11");
  assert.equal(fastHealing?.requiredOptionId, "white-mage-fast-healing");
  assert.deepEqual(fastHealing?.spellAutomation, {
    fastHealingAura: {
      label: "Fast Healing",
      resourceId: "arcaneReservoir",
      cost: 1,
      minimumSpellLevel: 2,
      range: "30 feet",
      healingDivisor: 2,
      durationAbility: "charisma",
      minimumRounds: 1,
    },
  });
  assert.equal(whiteMage.mechanicalCoverage, "full");
});

test("Occultist grants planar spells and scaling slot-free Conjurer's Focus summons", () => {
  const occultist = archetypes.find((archetype) => archetype.id === "arcanist-occultist");
  const applied = featuresThroughLevel(applyArchetype(arcanist, occultist), 20);
  const focus = applied.find((feature) => feature.id === "arcanist-occultist-conjurer-s-focus-sp-3");
  assert.equal(focus?.optionGroupId, "occultist-conjurers-focus");
  assert.equal(focus?.grantsAllOptions, true);
  assert.deepEqual(occultist.bonusSpellAdditions, {
    "planar-ally-lesser": 4,
    "plane-shift": 5,
    "planar-ally": 6,
    "later-spell-planar-ally-greater": 8,
  });
  const summons = generatedData.optionGroups.find((group) => group.id === "occultist-conjurers-focus").options;
  assert.equal(summons.length, 9);
  assert.deepEqual(summons.map((option) => option.minimumLevel).sort((a, b) => a - b), [1, 3, 5, 7, 9, 11, 13, 15, 17]);
  assert.ok(summons.every((option) => option.ignoresMaximumSpellLevel));
  assert.ok(summons.every((option) => option.resourceCost?.consumesSpellSlot === false));
  assert.ok(summons.every((option) => option.resourceCost?.freeAtClassLevel === 20));
  assert.ok(summons.every((option) => option.resourceCost?.levelDivisor === 1));
});

test("Spell Specialist exposes one level-matched signature slot per spell level", () => {
  const specialist = archetypes.find((archetype) => archetype.id === "arcanist-spell-specialist");
  const applied = featuresThroughLevel(applyArchetype(arcanist, specialist), 20);
  const signatures = applied.filter((feature) => feature.optionGroupId === "spell-specialist-signature-spells");
  assert.deepEqual(signatures.map((feature) => feature.level), [1, 4, 6, 8, 10, 12, 14, 16, 18]);
  assert.deepEqual(signatures.map((feature) => feature.requiredSpellLevel), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(signatures.every((feature) => feature.choiceRequired));
});

test("reservoir-powered archetype features expose enforceable action costs", () => {
  const expected = new Map([
    ["arcanist-aeromancer", [["air-mastery-caster-level", 1], ["air-mastery-save-dc", 1], ["wind-s-embrace", 2], ["rebuking-gale", 3]]],
    ["arcanist-brown-fur-transmuter", [["powerful-change", 1]]],
    ["arcanist-arcane-tinkerer", [["manipulate-construct", 1]]],
    ["arcanist-twilight-sage", [["twilight-transfer", 1]]],
  ]);
  for (const [archetypeId, actions] of expected) {
    const archetype = archetypes.find((candidate) => candidate.id === archetypeId);
    const actual = archetype.replacements.flatMap((replacement) => replacement.features)
      .flatMap((feature) => feature.resourceActions ?? [])
      .map((action) => [action.id, action.cost ?? action.costs?.find((cost) => cost.resourceId === "arcaneReservoir")?.cost]);
    assert.deepEqual(actual, actions);
  }
  const brownFur = archetypes.find((candidate) => candidate.id === "arcanist-brown-fur-transmuter");
  const powerfulChange = brownFur.replacements.flatMap((replacement) => replacement.features)
    .find((feature) => feature.id === "arcanist-brown-fur-transmuter-powerful-change-su-3").resourceActions[0];
  assert.deepEqual(powerfulChange.activeEffect, {
    name: "Powerful Change",
    targets: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
    bonus: 2,
    improvedAtLevel: 20,
    improvedBonus: 4,
    defaultRounds: 10,
  });
  const share = brownFur.replacements.flatMap((replacement) => replacement.features)
    .find((feature) => feature.id === "arcanist-brown-fur-transmuter-share-transmutation-su-9");
  const supremacy = brownFur.replacements.flatMap((replacement) => replacement.features)
    .find((feature) => feature.id === "arcanist-brown-fur-transmuter-transmutation-supremacy-su-20");
  assert.deepEqual(share.spellAutomation, {
    sharePersonalRange: {
      school: "transmutation",
      resourceId: "arcaneReservoir",
      cost: 1,
      range: "touch",
      willingOnly: true,
      improvedAtLevel: 20,
      improvedRange: "30 feet",
    },
  });
  assert.deepEqual(supremacy.spellAutomation, { extendDuration: { school: "transmutation" } });
  assert.equal(brownFur.mechanicalCoverage, "full");
});

test("Twilight Sage enforces its mandatory exploit, necromancy focus, and daily transfer", () => {
  const twilight = archetypes.find((archetype) => archetype.id === "arcanist-twilight-sage");
  const features = featuresThroughLevel(applyArchetype(arcanist, twilight), 20);
  const barrier = features.find((feature) => feature.id === "arcanist-twilight-sage-twilight-barrier-ex-1");
  const transfer = features.find((feature) => feature.id === "arcanist-twilight-sage-twilight-transfer-su-11");
  assert.equal(barrier?.optionGroupId, "twilight-sage-mandatory-exploit");
  assert.equal(barrier?.grantsAllOptions, true);
  assert.deepEqual(transfer?.resourceActions?.[0].costs, [
    { resourceId: "arcaneReservoir", cost: 1 },
    { resourceId: "twilightTransfer", cost: 1 },
  ]);
  assert.equal(twilight.resourceAdjustments.find((resource) => resource.resourceId === "twilightTransfer")?.maximum, 1);
});

test("Arcane Tinkerer unlocks at 1st level and branches at 7th and 13th", () => {
  const tinkerer = archetypes.find((archetype) => archetype.id === "arcanist-arcane-tinkerer");
  const applied = applyArchetype(arcanist, tinkerer);
  assert.ok(featuresThroughLevel(applied, 1).some((feature) => feature.id === "arcanist-arcane-tinkerer-manipulate-construct-su-1"));
  for (const level of [1, 5, 7, 11, 13]) assert.ok(!applied.features.some((feature) => feature.id === `arcanist-exploit-${level}`));
  const choices = featuresThroughLevel(applied, 13).filter((feature) => feature.optionGroupId?.startsWith("arcane-tinkerer-level-"));
  assert.deepEqual(choices.map((feature) => feature.level), [7, 13]);
  const seventh = generatedData.optionGroups.find((group) => group.id === "arcane-tinkerer-level-7-choice");
  const thirteenth = generatedData.optionGroups.find((group) => group.id === "arcane-tinkerer-level-13-choice");
  assert.ok(seventh.options.some((option) => option.id === "arcane-tinkerer-slow-construct"));
  assert.deepEqual(thirteenth.options.find((option) => option.id === "arcane-tinkerer-helpless-construct")?.prerequisites, [{ type: "feature", id: "arcane-tinkerer-slow-construct" }]);
});

test("Aeromancer Air Mastery unlocks and spends reservoir points at 1st level", () => {
  const aeromancer = archetypes.find((archetype) => archetype.id === "arcanist-aeromancer");
  const firstLevel = featuresThroughLevel(applyArchetype(arcanist, aeromancer), 1);
  const mastery = firstLevel.find((feature) => feature.id === "arcanist-aeromancer-air-mastery-su-1");
  assert.equal(mastery?.level, 1);
  assert.deepEqual(mastery?.resourceActions?.map((action) => action.cost), [1, 1]);
});

test("Eldritch Font tracks surge strain and Bottomless Well recovery", () => {
  const font = archetypes.find((archetype) => archetype.id === "arcanist-eldritch-font");
  const features = featuresThroughLevel(applyArchetype(arcanist, font), 20);
  assert.equal(font.resourceAdjustments.find((resource) => resource.resourceId === "eldritchSurgeStrain")?.maximum, 2);
  const actions = features.flatMap((feature) => feature.resourceActions ?? []);
  assert.equal(actions.filter((action) => action.resourceId === "eldritchSurgeStrain").length, 5);
  assert.deepEqual(actions.find((action) => action.id === "bottomless-well")?.changes, [{ resourceId: "arcaneReservoir", usedDelta: -10 }]);
  assert.equal(font.spellSlotAdjustmentPerLevel, 1);
  assert.equal(font.preparedSpellAdjustmentPerLevel, -1);
});
