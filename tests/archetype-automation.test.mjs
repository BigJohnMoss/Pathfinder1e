import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { adjustedCompanionLevel, applyArchetype, archetypeAdvisoryFeatureIds, archetypeAutomationSummary, archetypeClericDomainReductionFeatureIds, archetypeCombatBonuses, archetypeCombatModifierAdjustments, archetypeConditionalModifiers, archetypeDefenseAdjustments, archetypeDefenses, archetypeInitiativeBonus, archetypeInitiativeBonusAdjustments, archetypeLandSpeedAdjustments, archetypeSaveBonusAdjustments, archetypeSavingThrowBonuses, archetypeSenseAdjustments, archetypeSenses, archetypeSkillBonusAdjustments, archetypeSkillBonuses, archetypeSpellcastingAdjustmentFeatureIds, characterLandSpeed, drakeCompanionProgression, inferArchetypeClassSkillChanges, inferArchetypeCombatModifierAdjustments, inferArchetypeDefenseAdjustments, inferArchetypeFeatAlternatives, inferArchetypeFeatChoices, inferArchetypeGrantedFeats, inferArchetypeInitiativeBonusAdjustments, inferArchetypeLandSpeedAdjustments, inferArchetypeProficiencyAdjustments, inferArchetypeSaveBonusAdjustments, inferArchetypeSenseAdjustments, inferArchetypeSkillBonusAdjustments, inferArchetypeSkillRankAdjustment, inferArchetypeSpellAdditions, spellcastingProgression } from "../packages/engine/src/index.js";
import { archetypeAbilityScoreAdjustments, archetypeAbilityScoreBonuses, inferArchetypeAbilityScoreAdjustments } from "../packages/engine/src/index.js";
import { mergeArchetypeAutomation } from "../packages/data/src/archetype-automation.js";
import catalogueArchetypes from "../generated/pf1e-archetypes.mjs";
import catalogueSpells from "../generated/pf1e-spells.mjs";
import { inferArchetypeAllowedAlignments } from "../packages/engine/src/index.js";

test("archetype automation reports calculated and manual mechanics separately", () => {
  const summary = archetypeAutomationSummary({
    mechanicalCoverage: "partial",
    classSkillAdditions: ["Ride"],
    spellListAdditions: { haste: 3 },
    replacements: [{ featureIds: ["base-feature"], features: [
      { id: "choice", name: "Choice", level: 1, choiceRequired: true, optionGroupId: "choices" },
      { id: "manual", name: "Bespoke Aura", level: 4 },
    ] }],
  });
  assert.ok(summary.automated.includes("Base feature replacements and level progression"));
  assert.ok(summary.automated.includes("Class skill changes"));
  assert.ok(summary.automated.includes("Spell-list additions"));
  assert.deepEqual(summary.manual, ["Bespoke Aura (level 4)"]);
});

test("full archetypes never report manual effects", () => {
  assert.deepEqual(archetypeAutomationSummary({ mechanicalCoverage: "full", replacements: [{ features: [{ name: "Feature", level: 1 }] }] }).manual, []);
});

test("static archetype alignment rules expose exact builder eligibility", () => {
  const automated = catalogueArchetypes.filter((archetype) => inferArchetypeAllowedAlignments(archetype).length);
  assert.equal(automated.length, 39);
  const allowed = (id) => inferArchetypeAllowedAlignments(catalogueArchetypes.find((archetype) => archetype.id === id));
  assert.deepEqual(allowed("cleric-elder-mythos-cultist"), ["chaotic-neutral", "chaotic-evil"]);
  assert.deepEqual(allowed("monk-karmic-monk"), ["lawful-good", "lawful-neutral", "neutral", "lawful-evil"]);
  assert.deepEqual(allowed("paladin-gray-paladin"), ["lawful-good", "neutral-good", "lawful-neutral"]);
  assert.deepEqual(allowed("spiritualist-necrologist"), ["lawful-evil", "neutral-evil", "chaotic-evil"]);
  assert.deepEqual(allowed("cleric-fiendish-vessel"), []);
  assert.deepEqual(allowed("hunter-divine-hunter"), []);
  for (const archetype of automated) {
    const alignmentFeature = archetype.replacements.flatMap((replacement) => replacement.features ?? []).find((feature) => feature.name === "Alignment");
    if (alignmentFeature) assert.equal(archetypeAutomationSummary(archetype, [], catalogueSpells).manual.includes(`Alignment (level ${alignmentFeature.level})`), false, archetype.id);
  }
});

test("permanent archetype ability-score bonuses apply at their published levels", () => {
  const hagbound = catalogueArchetypes.find((archetype) => archetype.id === "witch-hagbound");
  const greenKnight = catalogueArchetypes.find((archetype) => archetype.id === "cavalier-green-knight");
  assert.ok(hagbound && greenKnight);
  assert.deepEqual(inferArchetypeAbilityScoreAdjustments(hagbound), [{
    sourceFeatureId: "witch-hagbound-hunched-muscle-ex-2",
    label: "Hunched Muscle: Strength",
    ability: "strength",
    minimumLevel: 2,
    base: 2,
    bonusType: "size",
    maximum: 6,
    bonusByLevel: [
      { level: 2, bonus: 2 },
      { level: 8, bonus: 4 },
      { level: 14, bonus: 6 },
    ],
  }]);
  assert.equal(archetypeAbilityScoreBonuses([hagbound], { witch: 1 }).strength, 0);
  assert.equal(archetypeAbilityScoreBonuses([hagbound], { witch: 8 }).strength, 4);
  assert.equal(archetypeAbilityScoreBonuses([hagbound], { witch: 20 }).strength, 6);
  assert.equal(archetypeAbilityScoreBonuses([greenKnight], { cavalier: 19 }).constitution, 0);
  assert.equal(archetypeAbilityScoreBonuses([greenKnight], { cavalier: 20 }).constitution, 6);
  assert.ok(!archetypeAutomationSummary(hagbound).manual.some((item) => item.startsWith("Hunched Muscle")));
});

test("conditional ability-score rules remain visible without becoming permanent bonuses", () => {
  const dinosaurDruid = catalogueArchetypes.find((archetype) => archetype.id === "druid-dinosaur-druid");
  const natureBonded = catalogueArchetypes.find((archetype) => archetype.id === "magus-nature-bonded-magus");
  assert.ok(dinosaurDruid && natureBonded);
  assert.equal(archetypeAbilityScoreBonuses([dinosaurDruid], { druid: 20 }).constitution, 0);
  assert.deepEqual(archetypeConditionalModifiers([dinosaurDruid], { druid: 20 }).find((modifier) => modifier.label === "Dinosaur Shape: Constitution"), {
    label: "Dinosaur Shape: Constitution",
    condition: "when she assumes the form of a dinosaur via wild shape",
    bonus: 2,
    source: "Dinosaur Druid",
  });
  assert.deepEqual(archetypeAbilityScoreAdjustments(natureBonded).map((adjustment) => adjustment.ability), ["strength", "constitution"]);
  assert.equal(archetypeAbilityScoreBonuses([natureBonded], { magus: 20 }).strength, 0);
});

test("ability-score inference excludes choices and subordinate creatures across the catalogue", () => {
  for (const archetype of catalogueArchetypes) {
    const inferred = inferArchetypeAbilityScoreAdjustments(archetype);
    assert.equal(new Set(inferred.map((adjustment) => JSON.stringify(adjustment))).size, inferred.length, `${archetype.id} has duplicate ability-score rows`);
    for (const adjustment of inferred) {
      assert.ok(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].includes(adjustment.ability), `${archetype.id} has a valid ability target`);
      assert.ok(adjustment.base > 0 && adjustment.minimumLevel >= 1 && adjustment.minimumLevel <= 20, `${archetype.id} has bounded ability progression`);
      assert.doesNotMatch(adjustment.sourceFeatureId, /companion|mount|phantom/, `${archetype.id} excludes subordinate creature ability scores`);
      const levels = adjustment.bonusByLevel?.map((step) => step.level) ?? [];
      assert.ok(levels.every((level, index) => level >= adjustment.minimumLevel && level <= 20 && (!index || level > levels[index - 1])), `${archetype.id} has ordered ability milestones`);
    }
    if (archetype.mechanicalCoverage === "full") assert.deepEqual(archetypeAbilityScoreAdjustments(archetype), archetype.abilityScoreAdjustments ?? [], `${archetype.id} does not mix inference into full automation`);
  }
  const controlledRage = catalogueArchetypes.find((archetype) => archetype.id === "barbarian-urban-barbarian");
  const saurianChampion = catalogueArchetypes.find((archetype) => archetype.id === "cavalier-saurian-champion");
  assert.ok(controlledRage && saurianChampion);
  assert.deepEqual(inferArchetypeAbilityScoreAdjustments(controlledRage), []);
  assert.deepEqual(inferArchetypeAbilityScoreAdjustments(saurianChampion), []);
});

test("exact archetype initiative bonuses are inferred and scale at published levels", () => {
  const tactician = catalogueArchetypes.find((archetype) => archetype.id === "fighter-tactician");
  assert.ok(tactician);
  assert.deepEqual(inferArchetypeInitiativeBonusAdjustments(tactician), [{
    sourceFeatureId: "fighter-tactician-tactical-awareness-ex-2",
    label: "Initiative checks",
    minimumLevel: 2,
    base: 1,
    bonusByLevel: [
      { level: 2, bonus: 1 },
      { level: 6, bonus: 2 },
      { level: 10, bonus: 3 },
      { level: 14, bonus: 4 },
      { level: 18, bonus: 5 },
    ],
  }]);
  assert.equal(archetypeInitiativeBonus([tactician], { fighter: 1 }), 0);
  assert.equal(archetypeInitiativeBonus([tactician], { fighter: 10 }), 3);
  assert.equal(archetypeInitiativeBonus([tactician], { fighter: 20 }), 5);
  assert.ok(!archetypeAutomationSummary(tactician).manual.some((item) => item.startsWith("Tactical Awareness")));
});

test("conditional initiative rules remain separate from the always-applied roll modifier", () => {
  const deepWalker = catalogueArchetypes.find((archetype) => archetype.id === "ranger-deep-walker");
  assert.ok(deepWalker);
  assert.equal(archetypeInitiativeBonus([deepWalker], { ranger: 18 }), 0);
  assert.deepEqual(archetypeConditionalModifiers([deepWalker], { ranger: 18 }), [{
    label: "Initiative checks",
    condition: "while underground (in caves and dungeons)",
    bonus: 11,
    source: "Deep Walker",
  }]);
});

test("explicit initiative overlays suppress inferred duplicates", () => {
  const castellan = catalogueArchetypes.find((archetype) => archetype.id === "cavalier-castellan");
  assert.ok(castellan);
  assert.equal(archetypeInitiativeBonusAdjustments(castellan).length, 0);
  assert.equal(archetypeConditionalModifiers([castellan], { cavalier: 13 }).filter((modifier) => /initiative/i.test(modifier.label)).length, 1);
});

test("permanent archetype save bonuses alter only their published save targets", () => {
  const sanctified = catalogueArchetypes.find((archetype) => archetype.id === "rogue-sanctified-rogue");
  assert.ok(sanctified);
  assert.deepEqual(inferArchetypeSaveBonusAdjustments(sanctified), [{
    sourceFeatureId: "rogue-sanctified-rogue-divine-purpose-su-4",
    label: "Fortitude and Will saves",
    saveTargets: ["fortitude", "will"],
    minimumLevel: 4,
    base: 1,
  }]);
  assert.deepEqual(archetypeSavingThrowBonuses([sanctified], { rogue: 3 }), { fortitude: 0, reflex: 0, will: 0 });
  assert.deepEqual(archetypeSavingThrowBonuses([sanctified], { rogue: 4 }), { fortitude: 1, reflex: 0, will: 1 });
  assert.ok(!archetypeAutomationSummary(sanctified).manual.some((item) => item.startsWith("Divine Purpose")));
});

test("conditional save bonuses retain exact triggers and level scaling", () => {
  const resistance = catalogueArchetypes.find((archetype) => archetype.id === "alchemist-dragonblood-chymist");
  assert.ok(resistance);
  assert.deepEqual(archetypeSavingThrowBonuses([resistance], { alchemist: 10 }), { fortitude: 0, reflex: 0, will: 0 });
  assert.deepEqual(archetypeConditionalModifiers([resistance], { alchemist: 6 }).find((modifier) => modifier.source === "Dragonblood Chymist"), {
    label: "Saving throws",
    condition: "against paralysis and sleep effects",
    bonus: 4,
    source: "Dragonblood Chymist",
  });
  const dragonHunter = catalogueArchetypes.find((archetype) => archetype.id === "ranger-dragon-hunter");
  assert.ok(dragonHunter);
  assert.deepEqual(inferArchetypeSaveBonusAdjustments(dragonHunter).find((adjustment) => adjustment.sourceFeatureId === "ranger-dragon-hunter-undaunted-ex-10")?.saveTargets, ["reflex", "will"]);
});

test("save inference is normalized, conservative, and duplicate-free across the catalogue", () => {
  for (const archetype of catalogueArchetypes) {
    const adjustments = inferArchetypeSaveBonusAdjustments(archetype);
    assert.equal(new Set(adjustments.map((adjustment) => JSON.stringify(adjustment))).size, adjustments.length, `${archetype.id} has duplicate inferred save rows`);
    for (const adjustment of adjustments) {
      assert.ok(adjustment.saveTargets.length >= 1 && adjustment.saveTargets.every((save) => ["fortitude", "reflex", "will"].includes(save)), `${archetype.id} has valid save targets`);
      assert.ok(adjustment.base >= 0 && adjustment.minimumLevel >= 1 && adjustment.minimumLevel <= 20, `${archetype.id} has bounded save progression`);
      assert.ok(!/\+\d+.*\bbonus\b|\bhit points?\b/i.test(adjustment.condition ?? ""), `${archetype.id} does not absorb an unrelated rule into its condition`);
      const namedTargets = ["fortitude", "reflex", "will"].filter((save) => new RegExp(`\\b${save}\\b`, "i").test(adjustment.condition ?? ""));
      assert.ok(namedTargets.every((save) => adjustment.saveTargets.includes(save)), `${archetype.id} retains every save named by its condition`);
      const levels = adjustment.bonusByLevel?.map((step) => step.level) ?? [];
      assert.equal(new Set(levels).size, levels.length, `${archetype.id} has unique save milestones`);
    }
  }
  const explicit = catalogueArchetypes.find((archetype) => archetype.id === "bard-impervious-messenger");
  assert.ok(explicit);
  assert.equal(archetypeSaveBonusAdjustments(explicit).filter((adjustment) => adjustment.sourceFeatureId === "bard-impervious-messenger-cryptic-whisper-ex-2").length, 0);
  const legacyExplicit = catalogueArchetypes.find((archetype) => archetype.id === "barbarian-armored-hulk");
  assert.ok(legacyExplicit);
  assert.equal(archetypeConditionalModifiers([legacyExplicit], { barbarian: 3 }).filter((modifier) => modifier.label === "Reflex saves" && modifier.condition === "against trample attacks").length, 1);
});

test("conditional archetype combat bonuses preserve their trigger and exact progression", () => {
  const aerochemist = catalogueArchetypes.find((archetype) => archetype.id === "alchemist-aerochemist");
  assert.ok(aerochemist);
  assert.deepEqual(inferArchetypeCombatModifierAdjustments(aerochemist), [{
    sourceFeatureId: "alchemist-aerochemist-bombs-away-ex-2",
    label: "Attack rolls",
    combatTargets: ["attackRolls"],
    minimumLevel: 2,
    base: 1,
    condition: "made with thrown weapons against targets that are at least 10 feet below him",
    maximum: 5,
    bonusByLevel: [
      { level: 2, bonus: 1 },
      { level: 6, bonus: 2 },
      { level: 10, bonus: 3 },
      { level: 14, bonus: 4 },
      { level: 18, bonus: 5 },
    ],
  }]);
  assert.equal(archetypeConditionalModifiers([aerochemist], { alchemist: 14 }).find((modifier) => modifier.label === "Attack rolls")?.bonus, 4);
  assert.equal(archetypeCombatBonuses([aerochemist], { alchemist: 20 }).attackRolls, 0);
});

test("permanent archetype combat bonuses update only their published targets", () => {
  const loreWarden = catalogueArchetypes.find((archetype) => archetype.id === "fighter-lore-warden-pfs-field-guide");
  assert.ok(loreWarden);
  assert.deepEqual(archetypeCombatBonuses([loreWarden], { fighter: 2 }), { attackRolls: 0, damageRolls: 0, armorClass: { normal: 0, touch: 0, flatFooted: 0 }, combatManeuverBonus: 0, combatManeuverDefense: 0 });
  assert.deepEqual(archetypeCombatBonuses([loreWarden], { fighter: 7 }), { attackRolls: 0, damageRolls: 0, armorClass: { normal: 0, touch: 0, flatFooted: 0 }, combatManeuverBonus: 4, combatManeuverDefense: 4 });
});

test("natural armor inference preserves level scaling, activation rules, and player ownership", () => {
  const hagRiven = catalogueArchetypes.find((archetype) => archetype.id === "bloodrager-hag-riven");
  const ragechemist = catalogueArchetypes.find((archetype) => archetype.id === "alchemist-ragechemist");
  const scarredWitchDoctor = catalogueArchetypes.find((archetype) => archetype.id === "witch-scarred-witch-doctor");
  const treeSoul = catalogueArchetypes.find((archetype) => archetype.id === "oracle-tree-soul");
  const crystalTender = catalogueArchetypes.find((archetype) => archetype.id === "shaman-crystal-tender");
  assert.ok(hagRiven && ragechemist && scarredWitchDoctor && treeSoul && crystalTender);
  assert.deepEqual(inferArchetypeCombatModifierAdjustments(hagRiven), [{
    sourceFeatureId: "bloodrager-hag-riven-scarred-hide-ex-7",
    label: "Armor Class",
    combatTargets: ["armorClass"],
    minimumLevel: 7,
    base: 1,
    bonusType: "natural-armor",
    bonusByLevel: [
      { level: 7, bonus: 1 },
      { level: 10, bonus: 2 },
      { level: 13, bonus: 3 },
      { level: 16, bonus: 4 },
      { level: 19, bonus: 5 },
    ],
  }]);
  assert.deepEqual(archetypeCombatBonuses([hagRiven], { bloodrager: 19 }).armorClass, { normal: 5, touch: 0, flatFooted: 5 });
  assert.equal(inferArchetypeCombatModifierAdjustments(ragechemist)[0]?.condition, "whenever a ragechemist uses his rage mutagen");
  assert.deepEqual(inferArchetypeCombatModifierAdjustments(scarredWitchDoctor)[0], {
    sourceFeatureId: "witch-scarred-witch-doctor-scarshield-su-1",
    label: "Armor Class",
    combatTargets: ["armorClass"],
    minimumLevel: 1,
    base: 0,
    levelDivisor: 2,
    minimum: 1,
    bonusType: "enhancement",
    condition: "when Scarshield applies",
  });
  assert.equal(inferArchetypeCombatModifierAdjustments(treeSoul)[0]?.base, 4);
  assert.equal(inferArchetypeCombatModifierAdjustments(crystalTender).filter((adjustment) => adjustment.sourceFeatureId === "shaman-crystal-tender-scion-of-the-stones-ex-1").length, 0);
});

test("combat modifier inference is bounded, normalized, and conservative across the catalogue", () => {
  for (const archetype of catalogueArchetypes) {
    const adjustments = inferArchetypeCombatModifierAdjustments(archetype);
    assert.equal(new Set(adjustments.map((adjustment) => JSON.stringify(adjustment))).size, adjustments.length, `${archetype.id} has duplicate inferred combat rows`);
    for (const adjustment of adjustments) {
      assert.ok(adjustment.combatTargets.length >= 1 && adjustment.combatTargets.every((target) => ["attackRolls", "damageRolls", "armorClass", "cmb", "cmd"].includes(target)), `${archetype.id} has valid combat targets`);
      assert.ok(adjustment.base >= 0 && adjustment.minimumLevel >= 1 && adjustment.minimumLevel <= 20, `${archetype.id} has bounded combat progression`);
      assert.ok((adjustment.condition?.length ?? 0) <= 250, `${archetype.id} has a readable combat condition`);
      assert.ok(!/Leader gains|sacred\/profane/i.test(adjustment.condition ?? ""), `${archetype.id} does not absorb a choice table`);
      const levels = adjustment.bonusByLevel?.map((step) => step.level) ?? [];
      assert.equal(new Set(levels).size, levels.length, `${archetype.id} has unique combat milestones`);
    }
  }
  const armoredHulk = catalogueArchetypes.find((archetype) => archetype.id === "barbarian-armored-hulk");
  assert.ok(armoredHulk);
  assert.equal(archetypeCombatModifierAdjustments(armoredHulk).length, 0);
  assert.equal(archetypeConditionalModifiers([armoredHulk], { barbarian: 3 }).length, 5);
});

test("archetype senses preserve published alternatives, ranges, and level progression", () => {
  const mooncaller = catalogueArchetypes.find((archetype) => archetype.id === "druid-mooncaller");
  assert.ok(mooncaller);
  assert.deepEqual(archetypeSenses([mooncaller], { druid: 1 }), []);
  assert.deepEqual(archetypeSenses([mooncaller], { druid: 2 }), [
    { sense: "low-light-vision", label: "Low-light vision", operation: "grant", source: "Mooncaller" },
    { sense: "darkvision", label: "Darkvision", operation: "grant", range: 30, condition: "if she already has low-light vision", source: "Mooncaller" },
    { sense: "darkvision", label: "Darkvision", operation: "increase", range: 30, condition: "if already has darkvision", source: "Mooncaller" },
  ]);

  const shadowWalker = catalogueArchetypes.find((archetype) => archetype.id === "rogue-shadow-walker");
  assert.ok(shadowWalker);
  assert.equal(archetypeSenses([shadowWalker], { rogue: 1 }).find((sense) => sense.operation === "grant")?.range, 30);
  assert.equal(archetypeSenses([shadowWalker], { rogue: 19 }).find((sense) => sense.operation === "grant")?.range, 120);
  assert.equal(archetypeSenses([shadowWalker], { rogue: 19 }).find((sense) => sense.operation === "increase")?.range, 100);
});

test("sense inference remains player-owned, normalized, and bounded across the catalogue", () => {
  const allowed = new Set(["darkvision", "low-light-vision", "scent", "blindsense", "blindsight", "tremorsense"]);
  for (const archetype of catalogueArchetypes) {
    const inferred = inferArchetypeSenseAdjustments(archetype);
    if (archetype.mechanicalCoverage !== "full") assert.deepEqual(archetypeSenseAdjustments(archetype), inferred, `${archetype.id} exposes inferred senses at runtime`);
    const signatures = new Set();
    for (const adjustment of inferred) {
      assert.ok(allowed.has(adjustment.sense), `${archetype.id} has a supported sense`);
      assert.ok(["grant", "increase"].includes(adjustment.operation), `${archetype.id} has a supported sense operation`);
      assert.ok(adjustment.minimumLevel >= 1 && adjustment.minimumLevel <= 20, `${archetype.id} has a bounded sense level`);
      assert.ok(!/familiar|companion|eidolon|homunculus/i.test(adjustment.sourceFeatureId), `${archetype.id} excludes subordinate creature senses`);
      if (adjustment.range !== undefined) assert.ok(adjustment.range > 0 && adjustment.range <= 1000, `${archetype.id} has a bounded sense range`);
      assert.ok((adjustment.condition?.length ?? 0) <= 200, `${archetype.id} has a readable sense condition`);
      const steps = adjustment.rangeByLevel ?? [];
      assert.ok(steps.every((step, index) => step.level >= adjustment.minimumLevel && step.level <= 20 && step.range > 0 && (!index || step.level > steps[index - 1].level)), `${archetype.id} has ordered sense milestones`);
      const signature = JSON.stringify([adjustment.sourceFeatureId, adjustment.sense, adjustment.operation, adjustment.minimumLevel, adjustment.condition]);
      assert.ok(!signatures.has(signature), `${archetype.id} has no duplicate sense adjustment`);
      signatures.add(signature);
    }
    if (archetype.mechanicalCoverage === "full") assert.equal(archetypeSenseAdjustments(archetype).length, 0, `${archetype.id} does not duplicate curated full automation`);
  }
});

test("archetype land-speed inference applies permanent progression and preserves conditional rules", () => {
  const flamesinger = catalogueArchetypes.find((archetype) => archetype.id === "bard-flamesinger");
  const turfer = catalogueArchetypes.find((archetype) => archetype.id === "brawler-turfer");
  const nagaAspirant = catalogueArchetypes.find((archetype) => archetype.id === "druid-naga-aspirant");
  assert.ok(flamesinger && turfer && nagaAspirant);
  assert.equal(characterLandSpeed(30, "none", "light", [flamesinger], { bard: 1 }).speed, 30);
  assert.equal(characterLandSpeed(30, "none", "light", [flamesinger], { bard: 2 }).speed, 35);
  assert.equal(characterLandSpeed(30, "none", "light", [flamesinger], { bard: 18 }).speed, 55);
  assert.equal(characterLandSpeed(30, "none", "light", [turfer], { brawler: 16 }).speed, 30);
  assert.equal(archetypeConditionalModifiers([turfer], { brawler: 16 }).find((modifier) => modifier.label === "Land speed")?.bonus, 30);
  assert.match(archetypeLandSpeedAdjustments(nagaAspirant)[0]?.condition ?? "", /naga form/i);
  assert.equal(characterLandSpeed(30, "none", "light", [nagaAspirant], { druid: 20 }).speed, 30);
});

test("typed movement bonuses stack correctly and movement inference stays normalized", () => {
  const fixture = (bonusType) => ({ name: bonusType ?? "Untyped", classId: "fighter", mechanicalCoverage: "full", landSpeedAdjustments: [{ label: "Speed", bonus: 10, ...(bonusType ? { bonusType } : {}), timing: "beforeReduction" }] });
  assert.equal(characterLandSpeed(30, "none", "light", [fixture("enhancement"), fixture("enhancement")], { fighter: 1 }).speed, 40);
  assert.equal(characterLandSpeed(30, "none", "light", [fixture("enhancement"), fixture("insight")], { fighter: 1 }).speed, 50);
  assert.equal(characterLandSpeed(30, "none", "light", [fixture(), fixture()], { fighter: 1 }).speed, 50);
  for (const archetype of catalogueArchetypes) {
    const inferred = inferArchetypeLandSpeedAdjustments(archetype);
    assert.equal(new Set(inferred.map((adjustment) => JSON.stringify(adjustment))).size, inferred.length, `${archetype.id} has duplicate inferred movement rows`);
    for (const adjustment of inferred) {
      assert.ok(adjustment.minimumLevel >= 1 && adjustment.minimumLevel <= 20 && Number.isInteger(adjustment.bonus) && adjustment.bonus > 0, `${archetype.id} has bounded movement values`);
      assert.ok((adjustment.condition?.length ?? 0) <= 250, `${archetype.id} has a readable movement condition`);
      const levels = adjustment.bonusByLevel?.map((step) => step.level) ?? [];
      assert.equal(new Set(levels).size, levels.length, `${archetype.id} has unique movement milestones`);
      assert.ok(levels.every((level, index) => level >= adjustment.minimumLevel && level <= 20 && (!index || level > levels[index - 1])), `${archetype.id} has ordered movement milestones`);
      assert.doesNotMatch(adjustment.sourceFeatureId, /companion|familiar|eidolon|mount/, `${archetype.id} excludes subordinate creature movement`);
    }
    if (archetype.mechanicalCoverage === "full") assert.deepEqual(archetypeLandSpeedAdjustments(archetype), archetype.landSpeedAdjustments ?? [], `${archetype.id} does not mix inference into full automation`);
  }
});

test("archetype special defenses preserve level formulas, milestones, and conditions", () => {
  const spellscar = catalogueArchetypes.find((archetype) => archetype.id === "cavalier-spellscar-drifter");
  const mooncaller = catalogueArchetypes.find((archetype) => archetype.id === "druid-mooncaller");
  const cinderwalker = catalogueArchetypes.find((archetype) => archetype.id === "ranger-cinderwalker");
  const untouchable = catalogueArchetypes.find((archetype) => archetype.id === "bloodrager-untouchable-rager");
  const juggler = catalogueArchetypes.find((archetype) => archetype.id === "bard-juggler");
  const drunkenRager = catalogueArchetypes.find((archetype) => archetype.id === "barbarian-drunken-rager");
  const castellan = catalogueArchetypes.find((archetype) => archetype.id === "cavalier-castellan");
  const mantisZealot = catalogueArchetypes.find((archetype) => archetype.id === "warpriest-mantis-zealot");
  const internalAlchemist = catalogueArchetypes.find((archetype) => archetype.id === "alchemist-internal-alchemist");
  const supernaturalist = catalogueArchetypes.find((archetype) => archetype.id === "druid-supernaturalist");
  const dragonheir = catalogueArchetypes.find((archetype) => archetype.id === "fighter-dragonheir-scion");
  const sensate = catalogueArchetypes.find((archetype) => archetype.id === "fighter-sensate");
  const darklandsSailor = catalogueArchetypes.find((archetype) => archetype.id === "ranger-darklands-sailor");
  const metamorph = catalogueArchetypes.find((archetype) => archetype.id === "alchemist-metamorph");
  const putrefactor = catalogueArchetypes.find((archetype) => archetype.id === "witch-putrefactor");
  const livingAvalanche = catalogueArchetypes.find((archetype) => archetype.id === "brawler-living-avalanche");
  const phalanxSoldier = catalogueArchetypes.find((archetype) => archetype.id === "fighter-phalanx-soldier");
  const sixthWingBulwark = catalogueArchetypes.find((archetype) => archetype.id === "warpriest-sixth-wing-bulwark");
  const sorrowsoul = catalogueArchetypes.find((archetype) => archetype.id === "bard-sorrowsoul");
  const plainsDruid = catalogueArchetypes.find((archetype) => archetype.id === "druid-plains");
  const skirmisher = catalogueArchetypes.find((archetype) => archetype.id === "fighter-skirmisher");
  const hellcat = catalogueArchetypes.find((archetype) => archetype.id === "monk-hellcat");
  const hermit = catalogueArchetypes.find((archetype) => archetype.id === "oracle-hermit");
  const duskKnight = catalogueArchetypes.find((archetype) => archetype.id === "paladin-dusk-knight");
  const guerrilla = catalogueArchetypes.find((archetype) => archetype.id === "rogue-guerrilla");
  const shadowScion = catalogueArchetypes.find((archetype) => archetype.id === "rogue-shadow-scion");
  const spelleater = catalogueArchetypes.find((archetype) => archetype.id === "bloodrager-spelleater");
  const foundation = catalogueArchetypes.find((archetype) => archetype.id === "cleric-foundation-of-faith");
  const verdivant = catalogueArchetypes.find((archetype) => archetype.id === "cavalier-verdivant");
  const sacredShield = catalogueArchetypes.find((archetype) => archetype.id === "paladin-sacred-shield");
  assert.ok(spellscar && mooncaller && cinderwalker && untouchable && juggler && drunkenRager && castellan && mantisZealot && internalAlchemist && supernaturalist && dragonheir && sensate && darklandsSailor && metamorph && putrefactor && livingAvalanche && phalanxSoldier && sixthWingBulwark && sorrowsoul && plainsDruid && skirmisher && hellcat && hermit && duskKnight && guerrilla && shadowScion && spelleater && foundation && verdivant && sacredShield);
  assert.equal(archetypeDefenses([spellscar], { cavalier: 12, fighter: 8 })[0]?.value, 30);
  assert.equal(archetypeDefenses([mooncaller], { druid: 13 }).find((defense) => defense.kind === "damageReduction")?.value, 3);
  assert.equal(archetypeDefenses([mooncaller], { druid: 16 }).find((defense) => defense.kind === "damageReduction")?.value, 4);
  assert.equal(archetypeDefenses([mooncaller], { druid: 19 }).find((defense) => defense.kind === "damageReduction")?.value, 5);
  assert.deepEqual(archetypeDefenses([cinderwalker], { ranger: 16 }).map((defense) => [defense.kind, defense.value]), [["energyResistance", 30]]);
  assert.deepEqual(archetypeDefenses([cinderwalker], { ranger: 20 }).map((defense) => [defense.kind, defense.qualifier]), [["immunity", "fire"]]);
  assert.match(archetypeDefenses([untouchable], { bloodrager: 20 })[0]?.condition ?? "", /bloodraging/i);
  assert.deepEqual(archetypeDefenses([juggler], { bard: 11 }).map((defense) => defense.kind), ["evasion"]);
  assert.deepEqual(archetypeDefenses([juggler], { bard: 12 }).map((defense) => defense.kind), ["improvedEvasion"]);
  assert.match(archetypeDefenses([drunkenRager], { barbarian: 2 })[0]?.condition ?? "", /at least 1 drunken rage point/i);
  assert.match(archetypeDefenses([drunkenRager], { barbarian: 5 }).find((defense) => defense.kind === "improvedEvasion")?.condition ?? "", /at least 2 drunken rage points/i);
  assert.match(archetypeDefenses([castellan], { cavalier: 16 })[0]?.condition ?? "", /cover \(but not soft cover\)/i);
  assert.deepEqual(archetypeDefenses([mantisZealot], { warpriest: 10 }).filter((defense) => /Evasion$/i.test(defense.kind)).map((defense) => [defense.kind, defense.condition]), [["evasion", "when he uses this ability"]]);
  assert.deepEqual(archetypeDefenses([mantisZealot], { warpriest: 19 }).filter((defense) => /Evasion$/i.test(defense.kind)).map((defense) => [defense.kind, defense.condition]), [["improvedEvasion", "when he uses this ability"]]);
  assert.equal(archetypeDefenses([internalAlchemist], { alchemist: 9 }).some((defense) => defense.kind === "immunity"), false);
  assert.deepEqual(archetypeDefenses([internalAlchemist], { alchemist: 10 }).filter((defense) => defense.kind === "immunity").map((defense) => defense.qualifier), ["disease"]);
  assert.deepEqual(archetypeDefenses([supernaturalist], { druid: 19 }), []);
  assert.deepEqual(archetypeDefenses([supernaturalist], { druid: 20 }).map((defense) => defense.qualifier), ["effects that affect only humanoids"]);
  assert.deepEqual(archetypeDefenses([dragonheir], { fighter: 20 }).map((defense) => defense.qualifier), ["paralysis, sleep, and damage of her energy type"]);
  assert.deepEqual(archetypeDefenses([sensate], { fighter: 6 }).map((defense) => defense.kind), ["uncannyDodge"]);
  assert.deepEqual(archetypeDefenses([sensate], { fighter: 7 }).map((defense) => defense.kind), ["improvedUncannyDodge"]);
  assert.deepEqual(archetypeDefenses([darklandsSailor], { ranger: 8 }).map((defense) => [defense.kind, defense.condition]), [["improvedUncannyDodge", "when underground and either swimming or aboard a boat"]]);
  assert.equal(archetypeDefenses([metamorph], { alchemist: 3 })[0]?.value, 25);
  assert.equal(archetypeDefenses([metamorph], { alchemist: 6 })[0]?.value, 50);
  assert.equal(archetypeDefenses([metamorph], { alchemist: 18 })[0]?.value, 75);
  assert.equal(archetypeDefenses([putrefactor], { witch: 10 })[0]?.value, 50);
  assert.equal(archetypeDefenses([putrefactor], { witch: 16 })[0]?.value, 75);
  assert.deepEqual([4, 9, 13, 18].map((level) => archetypeDefenses([livingAvalanche], { brawler: level })[0]?.value), [1, 2, 3, 4]);
  assert.deepEqual(archetypeDefenses([phalanxSoldier], { fighter: 20 }).map((defense) => [defense.kind, defense.condition]), [["evasion", "with a shield"], ["improvedEvasion", "with a tower shield"]]);
  assert.deepEqual(archetypeDefenses([sixthWingBulwark], { warpriest: 4 }).map((defense) => [defense.kind, defense.value]), [["damageReduction", 1], ["energyResistance", 5]]);
  assert.deepEqual(archetypeDefenses([sixthWingBulwark], { warpriest: 20 }).map((defense) => [defense.kind, defense.value]), [["damageReduction", 5], ["immunity", 0]]);
  assert.deepEqual(archetypeDefenses([sorrowsoul], { bard: 15 }).filter((defense) => defense.kind === "missChance").map((defense) => [defense.value, defense.condition]), [[50, "when using the lyric sorrow version of this performance"]]);
  assert.deepEqual(archetypeDefenses([plainsDruid], { druid: 4 }).filter((defense) => defense.kind === "concealment").map((defense) => [defense.value, defense.condition]), [[20, "while prone in natural terrain"]]);
  assert.deepEqual(archetypeDefenses([skirmisher], { fighter: 19 }).map((defense) => [defense.kind, defense.value, defense.condition]), [["missChance", 20, "while not immobilized or helpless, wearing light or no armor, and carrying a light load"]]);
  assert.deepEqual(archetypeDefenses([hellcat], { monk: 11 }).filter((defense) => defense.kind === "concealment").map((defense) => [defense.value, defense.condition]), [[20, "while Hellcat Ki is active in normal light"]]);
  assert.deepEqual([7, 14].map((level) => archetypeDefenses([hermit], { oracle: level }).find((defense) => defense.kind === "concealment")?.value), [20, 50]);
  assert.match(archetypeDefenses([hermit], { oracle: 14 }).find((defense) => defense.kind === "concealment")?.condition ?? "", /no creatures within 10 feet/i);
  assert.match(archetypeDefenses([duskKnight], { paladin: 1 }).find((defense) => defense.kind === "concealment")?.condition ?? "", /target of her smite evil/i);
  assert.deepEqual(archetypeDefenses([guerrilla], { rogue: 2 }).filter((defense) => defense.kind === "concealment").map((defense) => [defense.value, defense.condition]), [[50, "while in dim light or darkness and already benefiting from concealment"]]);
  assert.match(archetypeDefenses([shadowScion], { rogue: 8 }).find((defense) => defense.kind === "concealment")?.condition ?? "", /arrives on the Material Plane/i);
  assert.deepEqual([2, 7, 10, 19].map((level) => archetypeDefenses([spelleater], { bloodrager: level }).find((defense) => defense.kind === "fastHealing")?.value), [1, 2, 3, 6]);
  assert.match(archetypeDefenses([spelleater], { bloodrager: 19 }).find((defense) => defense.kind === "fastHealing")?.condition ?? "", /while bloodraging/i);
  assert.deepEqual([5, 7, 13, 19].map((level) => archetypeDefenses([foundation], { cleric: level }).find((defense) => defense.kind === "fastHealing")?.value), [1, 2, 5, 8]);
  assert.deepEqual([5, 9, 14, 17].map((level) => archetypeDefenses([verdivant], { cavalier: level }).find((defense) => defense.kind === "fastHealing")?.value), [1, 2, 3, 4]);
  assert.equal(archetypeDefenses([sacredShield], { paladin: 19 }).some((defense) => defense.kind === "regeneration"), false);
  assert.deepEqual(archetypeDefenses([sacredShield], { paladin: 20 }).filter((defense) => defense.kind === "regeneration").map((defense) => [defense.value, defense.condition]), [[10, "against damage caused by the active Bastion of Good target"]]);
});

test("defense inference is player-owned, normalized, and bounded across the catalogue", () => {
  for (const archetype of catalogueArchetypes) {
    const inferred = inferArchetypeDefenseAdjustments(archetype);
    const runtime = archetypeDefenseAdjustments(archetype);
    assert.ok(runtime.length >= inferred.length, `${archetype.id} exposes safe inferred defenses at runtime`);
    const signatures = new Set();
    for (const adjustment of inferred) {
      assert.ok(["damageReduction", "energyResistance", "spellResistance", "immunity", "evasion", "improvedEvasion", "uncannyDodge", "improvedUncannyDodge", "fortification", "concealment", "missChance", "fastHealing", "regeneration"].includes(adjustment.kind), `${archetype.id} has a supported defense kind`);
      assert.ok(adjustment.minimumLevel >= 1 && adjustment.minimumLevel <= 20 && Number.isInteger(adjustment.base) && adjustment.base >= 0, `${archetype.id} has bounded defense values`);
      assert.ok(adjustment.qualifier.length > 0 && adjustment.qualifier.length <= 120 && (adjustment.condition?.length ?? 0) <= 250, `${archetype.id} has readable defense details`);
      assert.doesNotMatch(adjustment.sourceFeatureId, /companion|familiar|eidolon|homunculus|mount/, `${archetype.id} excludes subordinate creature defenses`);
      const levels = adjustment.bonusByLevel?.map((step) => step.level) ?? [];
      assert.equal(new Set(levels).size, levels.length, `${archetype.id} has unique defense milestones`);
      assert.ok(levels.every((level, index) => level >= adjustment.minimumLevel && level <= (adjustment.maximumLevel ?? 20) && (!index || level > levels[index - 1])), `${archetype.id} has ordered defense milestones`);
      const signature = JSON.stringify([adjustment.sourceFeatureId, adjustment.kind, adjustment.qualifier, adjustment.condition]);
      assert.ok(!signatures.has(signature), `${archetype.id} has no duplicate defense adjustment`);
      signatures.add(signature);
    }
  }
  const promethean = catalogueArchetypes.find((archetype) => archetype.id === "alchemist-promethean-alchemist");
  assert.ok(promethean);
  assert.deepEqual(inferArchetypeDefenseAdjustments(promethean), []);
});

test("named-character immunities are inferred without capturing targets or negative rules", () => {
  const byId = (id) => catalogueArchetypes.find((archetype) => archetype.id === id);
  const dragonblood = byId("alchemist-dragonblood-chymist");
  assert.equal(archetypeDefenses([dragonblood], { alchemist: 9 }).some((defense) => defense.kind === "immunity"), false);
  assert.deepEqual(archetypeDefenses([dragonblood], { alchemist: 10 }).filter((defense) => defense.kind === "immunity").map((defense) => defense.qualifier), ["paralysis and sleep effects"]);

  const greenKnight = byId("cavalier-green-knight");
  assert.deepEqual(archetypeDefenses([greenKnight], { cavalier: 20 }).filter((defense) => defense.kind === "immunity").map((defense) => defense.qualifier), [
    "disease, infestations, and poison",
    "death effects and effects that would kill her without reducing her to 0 hit points",
  ]);
  const urushiol = byId("druid-urushiol");
  assert.equal(archetypeDefenses([urushiol], { druid: 1 }).find((defense) => defense.kind === "immunity")?.qualifier, "his own poison");
  assert.equal(archetypeDefenses([byId("investigator-spiritualist")], { investigator: 11 }).find((defense) => defense.kind === "immunity")?.qualifier, "death effects");

  for (const id of ["alchemist-mixologist", "barbarian-giant-stalker", "inquisitor-keeper-of-construct", "paladin-martyr"])
    assert.equal(inferArchetypeDefenseAdjustments(byId(id)).some((defense) => defense.kind === "immunity"), false, id);
});

test("independent rule engines combine only when every feature sentence is covered", () => {
  const dragonblood = catalogueArchetypes.find((archetype) => archetype.id === "alchemist-dragonblood-chymist");
  const plagueBringer = catalogueArchetypes.find((archetype) => archetype.id === "alchemist-plague-bringer");
  const energyScientist = catalogueArchetypes.find((archetype) => archetype.id === "alchemist-energy-scientist");
  const desertRaider = catalogueArchetypes.find((archetype) => archetype.id === "rogue-desert-raider");
  const skeptic = catalogueArchetypes.find((archetype) => archetype.id === "investigator-skeptic");
  const hamatulatsu = catalogueArchetypes.find((archetype) => archetype.id === "monk-hamatulatsu-master");
  assert.ok(dragonblood && plagueBringer && energyScientist && desertRaider && skeptic && hamatulatsu);
  assert.ok(!archetypeAutomationSummary(dragonblood).manual.some((item) => item.startsWith("Draconic Resistances")));
  assert.ok(!archetypeAutomationSummary(plagueBringer).manual.some((item) => item.startsWith("Disease Resistance")));
  assert.ok(!archetypeAutomationSummary(desertRaider).manual.some((item) => item.startsWith("Desert Tracker")));
  assert.ok(archetypeAutomationSummary(energyScientist).manual.some((item) => item.startsWith("Attuned Resistance")), "a separate planar-adaptation effect remains manual");
  assert.ok(!archetypeAutomationSummary(skeptic).manual.some((item) => item.startsWith("Suspect Hoax")));
  assert.deepEqual(archetypeConditionalModifiers([skeptic], { investigator: 8 }).filter((item) => item.label === "Saving throws").map((item) => [item.condition, item.bonus]), [
    ["against spells and spell-like abilities used to falsely create the impression of a supernatural presence", 3],
    ["caused by the effects of actual haunts or incorporeal undead", 3],
  ]);
  assert.ok(!archetypeAutomationSummary(hamatulatsu).manual.some((item) => item.startsWith("Infernal Resilience")));
  assert.equal(archetypeDefenses([hamatulatsu], { monk: 5 }).find((item) => item.kind === "immunity")?.qualifier, "all spells, spell-like abilities, and effects with the pain descriptor");
  assert.equal(archetypeConditionalModifiers([hamatulatsu], { monk: 5 }).find((item) => item.label === "Saving throws")?.condition, "against effects that would sicken, nauseate, stagger, or stun her");
  assert.equal(archetypeConditionalModifiers([dragonblood], { alchemist: 10 }).find((item) => item.label === "Saving throws")?.bonus, 6);
  assert.equal(archetypeDefenses([dragonblood], { alchemist: 10 }).find((item) => item.kind === "immunity")?.qualifier, "paralysis and sleep effects");
});

test("common exact skill-bonus rules are inferred conservatively", () => {
  const exact = {
    id: "exact",
    name: "Exact",
    classId: "bard",
    replacements: [{ features: [{
      id: "agile",
      name: "Agile",
      level: 1,
      summary: "A daredevil adds half her class level (minimum 1) on Acrobatics, Bluff, Climb, and Escape Artist checks. This ability replaces bardic knowledge.",
    }] }],
  };
  assert.deepEqual(inferArchetypeSkillBonusAdjustments(exact).map((adjustment) => adjustment.skill), ["Acrobatics", "Bluff", "Climb", "Escape Artist"]);
  assert.deepEqual(archetypeSkillBonuses([exact], { bard: 9 }).skillBonuses, { Acrobatics: 4, Bluff: 4, Climb: 4, "Escape Artist": 4 });
  assert.deepEqual(archetypeAutomationSummary(exact).manual, []);

  const conditional = {
    id: "conditional",
    name: "Conditional",
    classId: "wizard",
    replacements: [{ features: [{
      id: "conditional-feature",
      name: "Conditional Feature",
      level: 1,
      summary: "She gains a +4 bonus on Perception checks while underground. This ability replaces arcane bond.",
    }] }],
  };
  assert.deepEqual(inferArchetypeSkillBonusAdjustments(conditional), [{
    sourceFeatureId: "conditional-feature",
    skill: "Perception",
    minimumLevel: 1,
    base: 4,
    condition: "while underground",
  }]);
  assert.deepEqual(archetypeSkillBonuses([conditional], { wizard: 1 }).conditionalModifiers, [{
    label: "Perception checks",
    condition: "while underground",
    bonus: 4,
    source: "Conditional",
  }]);
  assert.deepEqual(archetypeAutomationSummary(conditional).manual, []);

  const choice = {
    id: "choice",
    name: "Choice",
    classId: "hunter",
    replacements: [{ features: [{
      id: "focus",
      name: "Focus",
      level: 1,
      summary: "She selects one of the following aspects. Fox: The creature gains a +4 competence bonus on Bluff checks.",
    }] }],
  };
  assert.deepEqual(inferArchetypeSkillBonusAdjustments(choice), []);
  const scaling = {
    id: "scaling",
    name: "Scaling",
    classId: "bard",
    replacements: [{ features: [{
      id: "wit",
      name: "Wit",
      level: 1,
      summary: "A wit gains a +1 bonus on Bluff checks. This bonus increases by 1 at 4th level.",
    }] }],
  };
  assert.deepEqual(inferArchetypeSkillBonusAdjustments(scaling), []);
});

test("inferred bonuses preserve specialized skills and do not duplicate explicit overlays", () => {
  const inferred = {
    id: "planar",
    name: "Planar Scholar",
    classId: "wizard",
    replacements: [{ features: [{ id: "planar-knowledge", name: "Planar Knowledge", level: 1, summary: "You gain a +3 bonus on Knowledge (planes) checks." }] }],
  };
  assert.equal(archetypeSkillBonuses([inferred], { wizard: 1 }).skillBonuses["Knowledge (planes)"], 3);
  const explicit = { ...inferred, skillBonusAdjustments: [{ sourceFeatureId: "planar-knowledge", skill: "Knowledge (planes)", base: 4 }] };
  assert.equal(archetypeSkillBonusAdjustments(explicit).length, 1);
  assert.equal(archetypeSkillBonuses([explicit], { wizard: 1 }).skillBonuses["Knowledge (planes)"], 4);

  const conditionalOverride = {
    ...inferred,
    replacements: [{ features: [{ id: "planar-knowledge", name: "Planar Knowledge", level: 1, summary: "You gain a +3 bonus on Knowledge (planes) checks against outsiders." }] }],
    skillBonusAdjustments: [{ sourceFeatureId: "planar-knowledge", skill: "Knowledge (planes)", base: 5, condition: "identifying outsiders" }],
  };
  assert.equal(archetypeSkillBonusAdjustments(conditionalOverride).length, 1);
});

test("exact skill-bonus scaling language produces published milestone tables", () => {
  const archetype = (id) => catalogueArchetypes.find((item) => item.id === id);
  assert.equal(archetypeSkillBonuses([archetype("bard-wit")], { bard: 3 }).skillBonuses.Bluff, 1);
  assert.equal(archetypeSkillBonuses([archetype("bard-wit")], { bard: 4 }).skillBonuses.Bluff, 2);
  assert.equal(archetypeSkillBonuses([archetype("bard-wit")], { bard: 20 }).skillBonuses.Bluff, 6);
  assert.equal(archetypeSkillBonuses([archetype("mesmerist-vexing-trickster")], { mesmerist: 1 }).skillBonuses.Stealth, 1);
  assert.equal(archetypeSkillBonuses([archetype("mesmerist-vexing-trickster")], { mesmerist: 16 }).skillBonuses.Stealth, 6);
  assert.equal(archetypeSkillBonuses([archetype("rogue-sczarni-swindler")], { rogue: 2 }).skillBonuses.Bluff, undefined);
  assert.equal(archetypeSkillBonuses([archetype("rogue-sczarni-swindler")], { rogue: 18 }).skillBonuses["Profession (gambler)"], 6);
  assert.equal(archetypeSkillBonuses([archetype("swashbuckler-daring-infiltrator")], { swashbuckler: 18 }).skillBonuses.Bluff, 5);
  assert.deepEqual(inferArchetypeSkillBonusAdjustments(archetype("fighter-dragonheir-scion"))[0].bonusByLevel, [
    { level: 1, bonus: 1 },
    { level: 6, bonus: 2 },
    { level: 10, bonus: 3 },
    { level: 14, bonus: 4 },
    { level: 18, bonus: 5 },
  ]);
  assert.ok(!archetypeAutomationSummary(archetype("mesmerist-vexing-trickster")).manual.some((item) => item.startsWith("Consummate Trickster")));
  assert.ok(!archetypeAutomationSummary(archetype("swashbuckler-daring-infiltrator")).manual.some((item) => item.startsWith("Quick-Tongued")));

  const milestones = {
    id: "milestones",
    name: "Milestones",
    classId: "rogue",
    replacements: [{ features: [{
      id: "milestone-feature",
      name: "Milestone Feature",
      level: 3,
      summary: "At 3rd level, she gains a +1 bonus on Perception checks. This bonus increases to +2 at 6th level, +3 at 9th level, and +4 at 12th level. This ability replaces trap sense.",
    }] }],
  };
  assert.deepEqual(inferArchetypeSkillBonusAdjustments(milestones)[0].bonusByLevel, [
    { level: 3, bonus: 1 },
    { level: 6, bonus: 2 },
    { level: 9, bonus: 3 },
    { level: 12, bonus: 4 },
  ]);
});

test("exact conditional skill bonuses retain their published trigger", () => {
  const archetype = (id) => catalogueArchetypes.find((item) => item.id === id);
  assert.deepEqual(archetypeSkillBonuses([archetype("druid-tempest-druid")], { druid: 1 }).conditionalModifiers, [
    { label: "Knowledge (nature) checks", condition: "in coastal or marshy lands", bonus: 4, source: "Tempest Druid" },
    { label: "Survival checks", condition: "in coastal or marshy lands", bonus: 4, source: "Tempest Druid" },
  ]);
  assert.equal(archetypeSkillBonuses([archetype("gunslinger-commando")], { gunslinger: 10 }).conditionalModifiers[0].bonus, 5);
  assert.ok(!archetypeAutomationSummary(archetype("gunslinger-commando")).manual.some((item) => item.startsWith("Track")));
  assert.ok(archetypeAutomationSummary(archetype("druid-aerie-protector")).manual.some((item) => item.startsWith("Sky and Stone")), "an additional untracked benefit keeps the feature manual");
  assert.ok(!inferArchetypeSkillBonusAdjustments(archetype("slayer-spiritslayer")).some((adjustment) => adjustment.sourceFeatureId === "slayer-spiritslayer-spiritslayer-talents-1"), "optional talents are never granted automatically");
  assert.equal(archetypeSkillBonuses([archetype("bard-magician")], { bard: 10 }).skillBonuses.Spellcraft, 5);
  assert.equal(archetypeSkillBonuses([archetype("bard-detective")], { bard: 10 }).conditionalModifiers.find((item) => item.label === "Perception checks")?.bonus, 5);
  assert.equal(archetypeSkillBonuses([archetype("barbarian-brutish-swamper")], { barbarian: 20 }).conditionalModifiers.find((item) => item.label === "Survival checks")?.bonus, 8);
  assert.ok(!archetypeAutomationSummary(archetype("barbarian-brutish-swamper")).manual.some((item) => item.startsWith("Home")), "the shared skill and initiative progression is now fully calculated");
});

test("skill-bonus inference remains normalized and conservative across the full catalogue", () => {
  const unsafeFeatureIds = new Set([
    "alchemist-tinkerer-tinkering-ex-2",
    "fighter-aerial-assaulter-aerial-expertise-ex-2",
    "hunter-courtly-hunter-refined-focus-su-8",
    "monk-sin-monk-well-of-sin-su-4",
    "paladin-knight-of-coins-blessing-of-prosperity-su-3",
    "psychic-mutation-mind-improved-bodily-mutations-11",
    "slayer-spiritslayer-spiritslayer-talents-1",
    "swashbuckler-daring-infiltrator-deeds-3",
  ]);
  let inferredCount = 0;
  for (const archetype of catalogueArchetypes) {
    const inferred = inferArchetypeSkillBonusAdjustments(archetype);
    inferredCount += inferred.length;
    const keys = new Set();
    for (const adjustment of inferred) {
      assert.ok(!unsafeFeatureIds.has(adjustment.sourceFeatureId), `${archetype.id} excludes option, target, condition, and scaling rules`);
      assert.match(adjustment.skill, /^(?:Acrobatics|Appraise|Bluff|Climb|Craft \([^)]+\)|Diplomacy|Disable Device|Disguise|Escape Artist|Fly|Handle Animal|Heal|Intimidate|Knowledge \([^)]+\)|Linguistics|Perception|Perform \([^)]+\)|Profession \([^)]+\)|Ride|Sense Motive|Sleight of Hand|Spellcraft|Stealth|Survival|Swim|Use Magic Device)$/);
      assert.ok(Number.isFinite(adjustment.base));
      assert.ok(adjustment.minimumLevel >= 1 && adjustment.minimumLevel <= 20);
      for (const [index, step] of (adjustment.bonusByLevel ?? []).entries()) {
        assert.ok(step.level >= adjustment.minimumLevel && step.level <= 20);
        assert.ok(Number.isFinite(step.bonus));
        if (index) {
          assert.ok(step.level > adjustment.bonusByLevel[index - 1].level, `${archetype.id} scaling levels increase`);
          assert.ok(step.bonus >= adjustment.bonusByLevel[index - 1].bonus, `${archetype.id} scaling bonuses do not decrease`);
        }
      }
      const key = `${adjustment.sourceFeatureId}:${adjustment.skill}`;
      assert.ok(!keys.has(key), `${archetype.id} has no duplicate inferred adjustment ${key}`);
      keys.add(key);
    }
    const combined = archetypeSkillBonusAdjustments(archetype);
    const explicitKeys = new Set((archetype.skillBonusAdjustments ?? []).map((adjustment) => `${adjustment.skill}:${adjustment.condition ?? ""}`));
    for (const key of explicitKeys)
      assert.equal(combined.filter((adjustment) => `${adjustment.skill}:${adjustment.condition ?? ""}` === key).length, 1, `${archetype.id} explicit adjustment overrides inference for ${key}`);
  }
  assert.ok(inferredCount >= 20, "catalogue inference continues to cover a meaningful reusable batch");
});

test("generated automation overlays merge without mutating sources and calculate level-aware skill bonuses", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const overlay = JSON.parse(readFileSync(new URL("../packages/data/src/archetype-automation/skill-bonuses-02.json", import.meta.url), "utf8"));
  const nextOverlay = JSON.parse(readFileSync(new URL("../packages/data/src/archetype-automation/skill-bonuses-03.json", import.meta.url), "utf8"));
  const source = ["bard-court-fool", "barbarian-sea-reaver", "fighter-dragonheir-scion", "druid-river-druid", "bard-chelish-diva", "barbarian-fearsome-defender", "bard-impervious-messenger", "cavalier-castellan", "cavalier-courtly-knight"]
    .map(record);
  const snapshot = structuredClone(source);
  const merged = mergeArchetypeAutomation(source, [overlay, nextOverlay]);
  const archetype = (id) => merged.find((item) => item.id === id);

  assert.deepEqual(source, snapshot, "overlay merge leaves imported source records unchanged");
  assert.deepEqual(archetypeSkillBonuses([archetype("bard-court-fool")], { bard: 10 }).skillBonuses, {
    Acrobatics: 5,
    Bluff: 5,
    Climb: 5,
    Disguise: 5,
  });
  assert.deepEqual(archetypeSkillBonuses([archetype("fighter-dragonheir-scion")], { fighter: 6 }).conditionalModifiers[0], {
    label: "Intimidate checks",
    condition: "demoralizing a foe",
    bonus: 2,
    source: "Dragonheir Scion",
  });
  assert.equal(archetypeSkillBonuses([archetype("barbarian-sea-reaver")], { barbarian: 9 }).conditionalModifiers.find((item) => item.label === "Profession (sailor) checks")?.bonus, 3);
  assert.equal(archetypeSkillBonuses([archetype("druid-river-druid")], { druid: 10 }).conditionalModifiers.find((item) => item.label === "Swim checks")?.bonus, 5);
  assert.equal(archetype("druid-river-druid").classSkillAdditions.filter((skill) => skill === "Diplomacy").length, 1);
  assert.ok(!archetypeAutomationSummary(archetype("bard-court-fool")).manual.some((item) => item.startsWith("Buffoonery")));

  const diva16 = archetypeSkillBonuses([archetype("bard-chelish-diva")], { bard: 16 }).conditionalModifiers;
  assert.equal(diva16.find((item) => item.label === "Bluff checks")?.bonus, 4);
  assert.equal(diva16.find((item) => item.label === "Diplomacy checks"), undefined);
  const diva17 = archetypeSkillBonuses([archetype("bard-chelish-diva")], { bard: 17 }).conditionalModifiers;
  assert.equal(diva17.find((item) => item.label === "Bluff checks"), undefined);
  assert.equal(diva17.find((item) => item.label === "Diplomacy checks")?.bonus, 5);
  assert.equal(diva17.find((item) => item.label === "Intimidate checks")?.bonus, 5);
  assert.equal(archetypeSkillBonuses([archetype("barbarian-fearsome-defender")], { barbarian: 15 }).skillBonuses.Intimidate, 5);

  const messenger = archetypeSkillBonuses([archetype("bard-impervious-messenger")], { bard: 10 });
  assert.equal(messenger.skillBonuses.Linguistics, 5);
  assert.equal(messenger.conditionalModifiers.find((item) => item.label === "Bluff checks")?.bonus, 5);
  assert.equal(archetype("bard-impervious-messenger").conditionalModifiers[0].base, 4);
  assert.equal(archetypeSkillBonuses([archetype("cavalier-castellan")], { cavalier: 13 }).conditionalModifiers.find((item) => item.label === "Stealth checks")?.bonus, 6);
  assert.equal(archetypeSkillBonuses([archetype("cavalier-castellan")], { cavalier: 13 }).conditionalModifiers.filter((item) => item.label === "Stealth checks").length, 1);
  assert.equal(archetypeSkillBonuses([archetype("cavalier-courtly-knight")], { cavalier: 20 }).skillBonuses.Diplomacy, 6);
});

test("Unlettered Arcanist replaces its spell catalogue without changing Arcanist casting progression", () => {
  const source = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/arcanist-unlettered-arcanist.json", import.meta.url), "utf8"));
  const base = {
    id: "arcanist",
    name: "Arcanist",
    features: [],
    classSkills: [],
    spellcasting: {
      ability: "intelligence",
      castingType: "prepared",
      slotsByLevel: [[2]],
      preparedByLevel: [[4, 2]],
    },
  };
  const applied = applyArchetype(base, source);
  assert.equal(applied.spellListClassId, "witch");
  assert.equal(applied.spellcasting.castingType, "prepared");
  assert.deepEqual(applied.spellcasting.slotsByLevel, base.spellcasting.slotsByLevel);
  assert.equal(source.mechanicalCoverage, "full");
});

test("shared archetype feat choices expose every earned selection slot", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const featChoices = (id) => archetype(id).replacements.flatMap((replacement) => replacement.features).filter((feature) => feature.optionGroupId === "archetype-feats");
  assert.deepEqual(featChoices("bloodrager-blood-conduit").map((feature) => feature.level), [1]);
  assert.deepEqual(featChoices("brawler-hinyasi").map((feature) => feature.level), [1]);
  assert.deepEqual(featChoices("slayer-vanguard").map((feature) => feature.level), [2]);
  assert.deepEqual(featChoices("paladin-vindictive-bastard").map((feature) => feature.level), [3, 9, 15]);
  assert.deepEqual(featChoices("occultist-battle-host").map((feature) => feature.level), [4, 8, 12, 16]);
  assert.deepEqual(featChoices("swashbuckler-guiding-blade").map((feature) => feature.level), [1, 4, 8, 12, 16, 20]);
  assert.deepEqual(featChoices("bard-phrenologist").map((feature) => feature.level), [10]);
  assert.deepEqual(featChoices("cleric-undead-lord").map((feature) => feature.level), [10]);
  assert.deepEqual(featChoices("cleric-mendevian-priest").map((feature) => feature.level), [4, 8]);
  assert.deepEqual(featChoices("barbarian-wildborn").map((feature) => feature.level), [4, 10, 16]);
  assert.deepEqual(featChoices("druid-ape-shaman").map((feature) => feature.level), [9, 13, 17]);
  assert.deepEqual(featChoices("druid-bear-shaman").map((feature) => feature.level), [9, 13, 17]);
  assert.deepEqual(featChoices("druid-boar-shaman").map((feature) => feature.level), [9, 13, 17]);

  const grantedFeats = (id) => archetype(id).replacements
    .flatMap((replacement) => replacement.features)
    .map((feature) => feature.grantedFeatId)
    .filter(Boolean);
  assert.ok(grantedFeats("bard-phrenologist").includes("psychic-sensitivity"));
  assert.ok(grantedFeats("cleric-undead-lord").includes("feat-command-undead"));

  const wildborn = archetype("barbarian-wildborn").replacements.flatMap((replacement) => replacement.features);
  assert.deepEqual(wildborn.find((feature) => feature.id === "barbarian-wildborn-weapon-and-armor-proficiencies-1").grantedFeatIds, ["improved-unarmed-strike", "catch-off-guard"]);

  const multipleGrantCases = new Map([
    ["cavalier-green-knight", ["endurance", "diehard"]],
    ["cavalier-spellscar-drifter", ["amateur-gunslinger", "gunsmithing"]],
    ["fighter-high-guardian", ["bodyguard", "in-harms-way"]],
    ["fighter-unbreakable", ["endurance", "diehard"]],
    ["inquisitor-expulsionist", ["alignment-channel", "turn-undead"]],
    ["investigator-steel-hound", ["amateur-gunslinger", "gunsmithing"]],
    ["magus-spire-defender", ["combat-expertise", "dodge"]],
    ["monk-serpent-fire-adept", ["chakra-initiate", "psychic-sensitivity"]],
    ["paladin-holy-gun", ["amateur-gunslinger", "gunsmithing"]],
    ["rogue-makeshift-scrapper", ["catch-off-guard", "throw-anything"]],
  ]);
  for (const [id, expected] of multipleGrantCases) {
    const grants = archetype(id).replacements.flatMap((replacement) => replacement.features).flatMap((feature) => feature.grantedFeatIds ?? []);
    assert.deepEqual(grants, expected, `${id} fixed feat grants`);
  }
});

test("standard bonus-feat wording grants exact catalogue feats at the stated level", () => {
  const juggler = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/bard-juggler.json", import.meta.url), "utf8"));
  assert.deepEqual(inferArchetypeGrantedFeats(juggler, [
    { id: "deflect-arrows", name: "Deflect Arrows" },
    { id: "snatch-arrows", name: "Snatch Arrows" },
  ]), [
    { featureId: "bard-juggler-fast-reactions-ex-1", featId: "deflect-arrows", level: 1 },
    { featureId: "bard-juggler-fast-reactions-ex-1", featId: "snatch-arrows", level: 5 },
  ]);
  assert.ok(archetypeAutomationSummary(juggler, [
    { id: "deflect-arrows", name: "Deflect Arrows" },
    { id: "snatch-arrows", name: "Snatch Arrows" },
  ]).automated.includes("2 level-aware bonus feat grants"));
  assert.ok(archetypeAutomationSummary(juggler, [
    { id: "deflect-arrows", name: "Deflect Arrows" },
    { id: "snatch-arrows", name: "Snatch Arrows" },
  ]).manual.some(item => item.startsWith("Fast Reactions")), "unimplemented extra uses keep the source feature manual");

  const unsafe = { replacements: [{ features: [
    { id: "choice", level: 1, summary: "She gains either Dodge or Mobility as a bonus feat." },
    { id: "companion", level: 1, summary: "Her animal companion gains Dodge as a bonus feat." },
    { id: "negative", level: 1, summary: "She does not gain Weapon Focus as a bonus feat." },
  ] }] };
  assert.deepEqual(inferArchetypeGrantedFeats(unsafe, [{ id: "dodge", name: "Dodge" }, { id: "mobility", name: "Mobility" }, { id: "weapon-focus", name: "Weapon Focus" }]), []);
});

test("fixed feat grants resolve source suffixes, direct feat wording, and names containing and", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cases = [
    ["cleric-forgemaster", { id: "craft-magic-arms-and-armor", name: "Craft Magic Arms and Armor" }, "cleric-forgemaster-craft-magic-arms-and-armor-3", 3],
    ["fighter-cad", { id: "catch-off-guard", name: "Catch Off-Guard" }, "fighter-cad-catch-off-guard-3", 3],
    ["ranger-ilsurian-archer", { id: "bullseye-shot", name: "Bullseye Shot" }, "ranger-ilsurian-archer-bullseye-shot-ex-1", 1],
    ["skald-belkzen-war-drummer", { id: "craft-magic-arms-and-armor", name: "Craft Magic Arms and Armor" }, "skald-belkzen-war-drummer-weapon-master-ex-7", 7],
  ];
  for (const [id, feat, featureId, level] of cases) {
    assert.ok(inferArchetypeGrantedFeats(record(id), [feat]).some(grant => grant.featureId === featureId && grant.featId === feat.id && grant.level === level), id);
    assert.ok(!archetypeAutomationSummary(record(id), [feat]).manual.some(item => item.startsWith(record(id).replacements.flatMap(item => item.features).find(feature => feature.id === featureId).name)), `${id} complete fixed grant`);
  }

  const toxic = record("slayer-toxic-sniper");
  assert.ok(inferArchetypeGrantedFeats(toxic, [{ id: "gunsmithing", name: "Gunsmithing" }]).some(grant => grant.featId === "gunsmithing"));
  assert.ok(archetypeAutomationSummary(toxic, [{ id: "gunsmithing", name: "Gunsmithing" }]).manual.some(item => item.startsWith("Scrapper’s Gun")), "the battered gun and restoration rules remain manual");
  assert.ok(!inferArchetypeGrantedFeats(record("spiritualist-grim-apostle"), [{ id: "power-attack", name: "Power Attack" }]).some(grant => grant.featId === "power-attack"), "a phantom's pronoun grant is not applied to the character");
});

test("multiple fixed grants in one sentence use their nearest published levels", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const warriorPoet = inferArchetypeGrantedFeats(record("samurai-warrior-poet"), [
    { id: "spring-attack", name: "Spring Attack" },
    { id: "improved-spring-attack", name: "Improved Spring Attack" },
    { id: "greater-spring-attack", name: "Greater Spring Attack" },
  ]).filter(grant => grant.featureId === "samurai-warrior-poet-battle-dance-ex-6");
  assert.deepEqual(warriorPoet, [
    { featureId: "samurai-warrior-poet-battle-dance-ex-6", featId: "spring-attack", level: 6 },
    { featureId: "samurai-warrior-poet-battle-dance-ex-6", featId: "improved-spring-attack", level: 12 },
    { featureId: "samurai-warrior-poet-battle-dance-ex-6", featId: "greater-spring-attack", level: 18 },
  ]);
  assert.deepEqual(inferArchetypeGrantedFeats(record("rogue-sharper"), [
    { id: "improved-steal", name: "Improved Steal" },
    { id: "greater-steal", name: "Greater Steal" },
    { id: "quick-steal", name: "Quick Steal" },
  ]), [
    { featureId: "rogue-sharper-sticky-fingers-ex-2", featId: "improved-steal", level: 2 },
    { featureId: "rogue-sharper-sticky-fingers-ex-2", featId: "greater-steal", level: 6 },
    { featureId: "rogue-sharper-sticky-fingers-ex-2", featId: "quick-steal", level: 8 },
  ]);
});

test("restricted archetype feat wording creates level-aware catalogue choices", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const feats = [
    { id: "athletic", name: "Athletic", type: "general" },
    { id: "stealthy", name: "Stealthy", type: "general" },
    { id: "lookout", name: "Lookout", type: "teamwork" },
    { id: "craft-magic-arms-and-armor", name: "Craft Magic Arms and Armor", type: "item-creation" },
  ];
  const flood = inferArchetypeFeatChoices(archetype("hunter-flood-flourisher"), feats);
  assert.deepEqual(flood.map(choice => ({ level: choice.level, ids: choice.featChoiceIds })), [
    { level: 3, ids: ["athletic", "stealthy"] },
  ]);
  assert.deepEqual(inferArchetypeFeatChoices(archetype("inquisitor-tactical-leader"), feats).map(choice => choice.level), [3, 9, 18]);
  assert.deepEqual(inferArchetypeFeatChoices(archetype("paladin-holy-tactician"), feats).map(choice => choice.level), [3, 7, 11, 15, 19]);
  assert.deepEqual(inferArchetypeFeatChoices(archetype("bard-hoaxer"), feats).map(choice => choice.level), [5, 11, 17]);
  assert.ok(archetypeAutomationSummary(archetype("hunter-flood-flourisher"), feats).automated.includes("1 restricted bonus feat choice"));
});

test("named archetype feat lists create every recurring selection slot", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const feats = readdirSync(new URL("../packages/data/src/feats/", import.meta.url))
    .filter(file => file.endsWith(".json"))
    .map(file => JSON.parse(readFileSync(new URL(`../packages/data/src/feats/${file}`, import.meta.url), "utf8")));

  const idRager = inferArchetypeFeatChoices(archetype("bloodrager-id-rager"), feats);
  assert.deepEqual(idRager.map(choice => choice.level), [6, 9, 12, 15, 18]);
  assert.equal(idRager[0].featChoiceIds.length, 13);

  const batShaman = inferArchetypeFeatChoices(archetype("druid-bat-shaman"), feats);
  assert.deepEqual(batShaman.map(choice => choice.level), [9, 13, 17]);
  assert.deepEqual(batShaman[0].featChoiceIds, [
    "acrobatic",
    "agile-maneuvers",
    "improved-initiative",
    "lightning-reflexes",
    "skill-focus",
  ]);
});

test("level-dependent archetype feat lists expand at their published milestones", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const feats = readdirSync(new URL("../packages/data/src/feats/", import.meta.url))
    .filter(file => file.endsWith(".json"))
    .map(file => JSON.parse(readFileSync(new URL(`../packages/data/src/feats/${file}`, import.meta.url), "utf8")));
  const progression = (id) => inferArchetypeFeatChoices(archetype(id), feats);

  assert.deepEqual(progression("cavalier-gendarme").map(choice => choice.level), [1, 5, 8, 11, 14, 17, 20]);
  assert.deepEqual(progression("paladin-divine-guardian").map(choice => choice.level), [7, 10, 13]);
  assert.deepEqual(progression("monk-brazen-disciple").map(choice => [choice.level, choice.featChoiceIds.length]), [
    [2, 6], [10, 16], [14, 16], [18, 16],
  ]);
  assert.deepEqual(progression("kineticist-elemental-annihilator").map(choice => [choice.level, choice.featChoiceIds.length]), [
    [2, 9], [8, 11], [10, 15], [14, 15], [18, 15],
  ]);
  const crusader = progression("cleric-crusader");
  assert.deepEqual(crusader.map(choice => [choice.level, choice.featChoiceIds.length]), [
    [1, 7], [5, 7], [10, 14], [15, 14], [20, 16],
  ]);
  assert.ok(crusader.every(choice => choice.ignoreFeatPrerequisites));

  assert.deepEqual(progression("inquisitor-cloaked-wolf").map(choice => choice.level), [6, 9, 12, 15, 18]);
  assert.deepEqual(progression("paladin-tempered-champion").map(choice => choice.level), [4, 8, 12, 16, 20]);
  assert.deepEqual(progression("ranger-wave-warden").map(choice => [choice.level, choice.featChoiceIds.length]), [
    [2, 9], [6, 12], [10, 14], [14, 14], [18, 14],
  ]);
  const urbanHunter = progression("hunter-urban-hunter");
  assert.deepEqual(urbanHunter.map(choice => [choice.level, choice.featChoiceIds.length]), [
    [6, 5], [9, 5], [12, 14], [15, 14], [18, 14],
  ]);
  assert.ok(urbanHunter.every(choice => choice.ignoreFeatPrerequisites));
});

test("hybrid archetype feat lists include catalogue descendants of a required feat", () => {
  const archetype = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/skald-undying-word.json", import.meta.url), "utf8"));
  const feats = readdirSync(new URL("../packages/data/src/feats/", import.meta.url))
    .filter(file => file.endsWith(".json"))
    .map(file => JSON.parse(readFileSync(new URL(`../packages/data/src/feats/${file}`, import.meta.url), "utf8")));
  const choices = inferArchetypeFeatChoices(archetype, feats);

  assert.deepEqual(choices.map(choice => choice.level), [1, 7, 13, 19]);
  assert.deepEqual(choices[0].featChoiceIds, ["endurance", "great-fortitude", "improved-great-fortitude"]);
  assert.deepEqual(choices[0].featChoicePrerequisiteIds, ["endurance"]);
  assert.ok(feats.some(feat => feat.id === "diehard" && feat.prerequisites.some(item => item.type === "feat" && item.id === "endurance")));
});

test("archetype feat alternatives augment existing class choice slots without granting extras", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const feats = readdirSync(new URL("../packages/data/src/feats/", import.meta.url))
    .filter(file => file.endsWith(".json"))
    .map(file => JSON.parse(readFileSync(new URL(`../packages/data/src/feats/${file}`, import.meta.url), "utf8")));

  assert.deepEqual(inferArchetypeFeatAlternatives(archetype("alchemist-fire-bomber"), feats)[0].featChoiceIds, ["burn-burn-burn", "fire-tamer", "flame-heart"]);
  assert.deepEqual(inferArchetypeFeatAlternatives(archetype("investigator-steel-hound"), feats)[0].featChoiceIds, ["extra-grit", "rapid-reload"]);
  assert.deepEqual(inferArchetypeFeatAlternatives(archetype("barbarian-pack-hunter"), feats)[0].featChoiceTypes, ["teamwork"]);
  const skulking = inferArchetypeFeatAlternatives(archetype("rogue-skulking-slayer"), feats);
  assert.deepEqual(skulking.map(item => [item.minimumLevel, item.featChoiceIds]), [
    [2, ["surprise-follow-through"]],
    [10, ["improved-surprise-follow-through"]],
  ]);
  const butterfly = inferArchetypeFeatAlternatives(archetype("slayer-butterfly-blade"), feats)[0];
  assert.equal(butterfly.optionGroupId, "slayer-talents");
  assert.equal(butterfly.ignoreFeatPrerequisites, true);
  assert.equal(butterfly.featChoiceIds.length, 5);

  const hamatulatsu = inferArchetypeFeatAlternatives(archetype("monk-hamatulatsu-master"), feats);
  assert.deepEqual(hamatulatsu.map(item => [item.minimumLevel, item.mode]), [[1, "replace"], [6, "augment"], [10, "augment"], [14, "augment"]]);
  assert.ok(hamatulatsu.find(item => item.minimumLevel === 6).featChoiceIds.includes("gorgons-fist"));
  assert.ok(hamatulatsu.find(item => item.minimumLevel === 10).featChoiceIds.includes("impaling-critical"));
  assert.ok(hamatulatsu.find(item => item.minimumLevel === 10).featChoiceIds.includes("medusas-wrath"));

  const hellcat = inferArchetypeFeatAlternatives(archetype("monk-hellcat"), feats);
  assert.deepEqual(hellcat.map(item => [item.minimumLevel, item.mode]), [[1, "replace"], [6, "augment"], [10, "augment"]]);

  const disenchanter = inferArchetypeFeatAlternatives(archetype("warpriest-disenchanter"), feats);
  assert.deepEqual(disenchanter.map(item => [item.minimumLevel, item.mode]), [[1, "replace"], [6, "augment"], [12, "augment"]]);
  assert.equal(disenchanter.every(item => item.ignoreFeatPrerequisites), true);

  const buccaneer = inferArchetypeFeatAlternatives(archetype("gunslinger-buccaneer"), feats)[0];
  assert.equal(buccaneer.optionGroupId, "gunslinger-bonus-feats");
  assert.equal(buccaneer.featChoiceIds.length, 5);

  const infiltrator = inferArchetypeFeatAlternatives(archetype("swashbuckler-daring-infiltrator"), feats)[0];
  assert.equal(infiltrator.optionGroupId, "swashbuckler-bonus-feats");
  assert.ok(infiltrator.featChoiceIds.includes("antagonize"));

  const constructedPugilist = inferArchetypeFeatAlternatives(archetype("brawler-constructed-pugilist"), feats)[0];
  assert.deepEqual(constructedPugilist, {
    sourceFeatureId: "brawler-constructed-pugilist-bonus-item-creation-feats-2",
    optionGroupId: "brawler-bonus-feats",
    minimumLevel: 2,
    mode: "augment",
    ignoreFeatPrerequisites: false,
    featChoiceIds: ["craft-magic-arms-and-armor", "master-craftsman", "skill-focus"],
  });
});

test("core monk, warpriest, swashbuckler, and brawler bonus feat milestones expose automated choice groups", () => {
  const characterClass = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/classes/${id}.json`, import.meta.url), "utf8"));
  const choices = (id, groupId) => characterClass(id).features.filter(feature => feature.optionGroupId === groupId);

  assert.deepEqual(choices("monk", "monk-bonus-feats").map(feature => feature.level), [1, 2, 6, 10, 14, 18]);
  assert.deepEqual(choices("warpriest", "warpriest-bonus-feats").map(feature => feature.level), [3, 6, 9, 12, 15, 18]);
  assert.deepEqual(choices("warpriest", "warpriest-weapon-focus").map(feature => feature.level), [1]);
  assert.deepEqual(choices("swashbuckler", "swashbuckler-bonus-feats").map(feature => feature.level), [4, 8, 12, 16, 20]);
  assert.deepEqual(choices("brawler", "brawler-bonus-feats").map(feature => feature.level), [2, 5, 8, 11, 14, 17, 20]);
});

test("all core Bloodrager bloodlines expose five selections from their published feat lists", () => {
  const bloodrager = JSON.parse(readFileSync(new URL("../packages/data/src/classes/bloodrager.json", import.meta.url), "utf8"));
  const bloodlines = JSON.parse(readFileSync(new URL("../packages/data/src/options/bloodrager-bloodlines.json", import.meta.url), "utf8"));
  const featIds = new Set(readdirSync(new URL("../packages/data/src/feats/", import.meta.url)).filter(file => file.endsWith(".json")).map(file => file.replace(/\.json$/, "")));

  assert.deepEqual(
    bloodrager.features.filter(feature => feature.optionGroupId === "bloodrager-bloodline-feats").map(feature => feature.level),
    [6, 9, 12, 15, 18],
  );
  assert.equal(bloodlines.options.length, 10);
  for (const bloodline of bloodlines.options) {
    assert.equal(bloodline.featIds.length, 7, `${bloodline.name} published feat count`);
    assert.equal(new Set(bloodline.featIds).size, 7, `${bloodline.name} feat choices are unique`);
    assert.ok(bloodline.featIds.every(featId => featIds.has(featId)), `${bloodline.name} feat ids resolve`);
  }
  assert.deepEqual(bloodlines.options.find(option => option.id === "bloodrager-arcane").featIds, [
    "combat-reflexes", "disruptive", "improved-initiative", "iron-will", "power-attack", "quick-draw", "spellbreaker",
  ]);
});

test("Crossblooded Rager exposes two distinct bloodline selectors for its combined feat list", () => {
  const crossblooded = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/bloodrager-crossblooded-rager.json", import.meta.url), "utf8"));
  const selectors = crossblooded.replacements.flatMap(replacement => replacement.features).filter(feature => feature.optionGroupId === "bloodrager-bloodlines");
  assert.deepEqual(selectors.map(feature => feature.id), [
    "bloodrager-crossblooded-rager-primary-bloodline-1",
    "bloodrager-crossblooded-rager-secondary-bloodline-1",
  ]);
  assert.ok(selectors.every(feature => feature.choiceRequired && feature.level === 1));
});

test("fixed archetype spell-list additions use catalogue spell ids and rule levels", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cases = new Map([
    ["alchemist-fire-bomber", { "elemental-body-ii": 4, "elemental-body-iv": 5 }],
    ["bard-cultivator", { entangle: 1, greensight: 2, "plant-growth": 3, "antiplant-shell": 4, "tree-stride": 5, "later-spell-green-caress": 6 }],
    ["bard-fortune-teller", { guidance: 0, "later-spell-object-reading": 1, augury: 2, "later-spell-analyze-aura": 3, divination: 4, retrocognition: 5, "true-seeing": 6, vision: 6 }],
    ["bard-stonesinger", { "magic-stone": 1, "stone-shield": 2, "stone-shape": 3, "earth-glide": 4, stoneskin: 5, "stone-tell": 6 }],
    ["bloodrager-symbol-striker", { "arcane-mark": 1, erase: 1 }],
    ["cleric-forgemaster", { "crafters-curse": 1, "crafters-fortune": 1, "later-spell-lead-blades": 1, "chill-metal": 2, "heat-metal": 2, shatter: 2, "keen-edge": 3, "versatile-weapon": 3, "iron-body": 8, "repel-metal-or-stone": 8 }],
    ["druid-toxicologist", { "poisoned-egg": 1, "later-spell-transmute-potion-to-poison": 2, "stinking-cloud": 3, "toxic-gift": 4, cloudkill: 5 }],
    ["magus-hexbreaker", { "remove-curse": 3, "break-enchantment": 4 }],
    ["ranger-summit-sentinel", { stoneskin: 4 }],
  ]);
  for (const [id, expected] of cases) assert.deepEqual(archetype(id).spellListAdditions, expected, `${id} spell-list additions`);
});

test("fixed archetype bonus spells are granted separately from normal spells known", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cases = new Map([
    ["bard-animal-speaker", 6],
    ["bard-brazen-deceiver", 10],
    ["bard-fey-courtier", 6],
    ["bard-flame-dancer", 3],
    ["bard-flamesinger", 6],
    ["bloodrager-ancestral-harbinger", 4],
    ["bloodrager-greenrager", 4],
  ]);
  for (const [id, expectedCount] of cases) {
    const bonusSpells = archetype(id).bonusSpellAdditions;
    assert.equal(Object.keys(bonusSpells).length, expectedCount, `${id} bonus spell count`);
    const applied = applyArchetype({ id: archetype(id).classId, name: "Base", features: [], classSkills: [] }, archetype(id));
    assert.deepEqual(applied.bonusSpellAdditions, bonusSpells, `${id} applied bonus spells`);
  }
});

test("fixed Oracle bonus-spell replacements grant resolved spells at exact class milestones", () => {
  const automated = catalogueArchetypes
    .map((archetype) => ({ archetype, rules: inferArchetypeSpellAdditions(archetype, catalogueSpells) }))
    .filter(({ rules }) => rules.bonusSpellReplacementClassLevels?.length);
  assert.equal(automated.length, 14);
  assert.equal(automated.reduce((total, { rules }) => total + rules.spellGrants.length, 0), 81);
  for (const { archetype, rules } of automated) {
    assert.equal(archetype.classId, "oracle");
    assert.ok(rules.spellGrants.every((grant) => grant.mode === "known" && grant.minimumClassLevel >= 1 && grant.minimumClassLevel <= 18));
    assert.equal(archetypeAutomationSummary(archetype, [], catalogueSpells).manual.includes("Bonus Spells (level 1)"), false, archetype.id);
  }
  for (const id of ["oracle-cyclopean-seer", "oracle-community-guardian"]) {
    const source = catalogueArchetypes.find((archetype) => archetype.id === id);
    assert.ok(source);
    assert.equal(archetypeAutomationSummary(source, [], catalogueSpells).manual.includes("Bonus Spells (level 1)"), true, `${id} remains manual`);
  }
});

test("archetype spellcasting adjustments change slots, preparations, and spells known", () => {
  const record = (directory, id) => JSON.parse(readFileSync(new URL(`../packages/data/src/${directory}/${id}.json`, import.meta.url), "utf8"));
  const adjusted = (classId, archetypeId) => applyArchetype(record("classes", classId), record("archetypes", archetypeId));

  const bard = record("classes", "bard");
  const arrowsong = adjusted("bard", "bard-arrowsong-minstrel");
  assert.deepEqual(arrowsong.spellcasting.slotsByLevel[9], bard.spellcasting.slotsByLevel[9].map((count) => Math.max(0, count - 1)));
  assert.deepEqual(arrowsong.spellcasting.knownByLevel, bard.spellcasting.knownByLevel);

  const cleric = record("classes", "cleric");
  const crusader = adjusted("cleric", "cleric-crusader");
  assert.deepEqual(crusader.spellcasting.preparedByLevel[9], cleric.spellcasting.preparedByLevel[9].map((count) => Math.max(0, count - 1)));
  assert.ok(spellcastingProgression(crusader, 10, { abilityScore: 18 }).slots.every((slot) => slot.count >= slot.bonus));

  const sorcerer = record("classes", "sorcerer");
  const crossblooded = adjusted("sorcerer", "sorcerer-crossblooded");
  assert.deepEqual(crossblooded.spellcasting.knownByLevel[9], sorcerer.spellcasting.knownByLevel[9].map((count) => Math.max(0, count - 1)));

  const arcanist = record("classes", "arcanist");
  const eldritchFont = adjusted("arcanist", "arcanist-eldritch-font");
  assert.deepEqual(eldritchFont.spellcasting.slotsByLevel[9], arcanist.spellcasting.slotsByLevel[9].map((count) => count + 1));
  assert.deepEqual(eldritchFont.spellcasting.preparedByLevel[9], arcanist.spellcasting.preparedByLevel[9].map((count) => Math.max(0, count - 1)));
});

test("pure diminished spellcasting rules leave the manual queue only when fully applied", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const pure = record("bard-arrowsong-minstrel");
  assert.equal(archetypeAutomationSummary(pure).manual.includes("Diminished Spellcasting (level 1)"), false);

  for (const id of ["oracle-purifier"]) {
    assert.equal(
      archetypeAutomationSummary(record(id)).manual.includes("Diminished Spellcasting (level 1)"),
      true,
      `${id} retains its uncovered spellcasting exception`,
    );
  }

  assert.equal(
    catalogueArchetypes.flatMap(archetypeSpellcastingAdjustmentFeatureIds).length,
    17,
    "catalogue diminished-spellcasting coverage stays intentional",
  );
});

test("single-domain cleric archetypes retain one deity-filtered domain and every domain spell slot", () => {
  const record = (directory, id) => JSON.parse(readFileSync(new URL(`../packages/data/src/${directory}/${id}.json`, import.meta.url), "utf8"));
  const cleric = record("classes", "cleric");
  for (const id of ["cleric-cloistered-cleric", "cleric-crusader", "cleric-mendevian-priest"]) {
    const source = record("archetypes", id);
    const applied = applyArchetype(cleric, source);
    assert.ok(applied.features.some((feature) => feature.id === "cleric-domain-1-first"), `${id} retains its first domain selector`);
    assert.ok(!applied.features.some((feature) => feature.id === "cleric-domain-1-second"), `${id} removes its second domain selector`);
    assert.deepEqual(
      applied.features.filter((feature) => /^cleric-domain-spell-/.test(feature.id)).map((feature) => feature.level),
      [1, 3, 5, 7, 9, 11, 13, 15, 17],
      `${id} retains all domain spell slots`,
    );
    assert.equal(archetypeAutomationSummary(source).manual.includes("Diminished Spellcasting (level 1)"), false);
  }
  assert.equal(catalogueArchetypes.flatMap(archetypeClericDomainReductionFeatureIds).length, 3);
});

test("archetype companion and familiar grants expose their unlock and effective-level rules", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cases = new Map([
    ["alchemist-construct-rider", [1, 0]],
    ["alchemist-winged-marauder", [1, 0]],
    ["barbarian-mounted-fury", [5, -4]],
    ["barbarian-shoanti-burn-rider", [4, -3]],
    ["bloodrager-bloodrider", [5, -4]],
    ["druid-sunrider", [1, 0]],
    ["kineticist-cinderlands-adept", [4, -3]],
    ["warpriest-divine-commander", [1, 0]],
    ["alchemist-cruorchymist", [3, 0]],
    ["alchemist-horticulturist", [4, 0]],
    ["alchemist-homunculist", [1, 0]],
    ["alchemist-tinkerer", [1, 0]],
    ["arcanist-unlettered-arcanist", [1, 0]],
    ["bard-duettist", [1, 0]],
    ["cleric-asmodean-advocate", [1, 0]],
    ["cleric-demonic-apostle", [1, 0]],
    ["druid-leshy-warden", [1, 0]],
    ["druid-swarm-monger", [1, 0]],
    ["barbarian-mad-dog", [1, 0]],
    ["brawler-wild-child", [1, 0]],
    ["fighter-eldritch-guardian", [1, 0]],
    ["inquisitor-sacred-huntsmaster", [1, 0]],
    ["investigator-bonded-investigator", [2, 0]],
    ["paladin-chosen-one", [1, 0]],
    ["rogue-carnivalist", [1, 0]],
    ["sorcerer-tattooed-sorcerer", [1, 0]],
    ["spiritualist-soul-warden", [1, 0]],
  ]);
  for (const [id, [minimumLevel, adjustment]] of cases) {
    const source = archetype(id);
    assert.equal(source.companionGrants.length, 1, `${id} companion count`);
    assert.equal(source.companionGrants[0].minimumLevel, minimumLevel, `${id} unlock`);
    assert.equal(source.companionGrants[0].effectiveLevelAdjustment ?? 0, adjustment, `${id} effective level`);
    if (source.companionGrants[0].kind === "familiar") assert.equal(source.companionGrants[0].stacksWithExisting, true, `${id} familiar stacking`);
    const applied = applyArchetype({ id: source.classId, name: "Base", features: [], classSkills: [] }, source);
    assert.deepEqual(applied.companionGrants, source.companionGrants, `${id} applied companion`);
  }
});

test("elemental ally exposes four independently tracked full-level eidolons", () => {
  const source = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/druid-elemental-ally.json", import.meta.url), "utf8"));
  assert.deepEqual(source.companionGrants.map((grant) => grant.optionId), ["eidolon-air", "eidolon-earth", "eidolon-fire", "eidolon-water"]);
  assert.ok(source.companionGrants.every((grant) => grant.kind === "eidolon" && grant.minimumLevel === 1));
  const applied = applyArchetype({ id: "druid", name: "Druid", features: [], classSkills: [] }, source);
  assert.deepEqual(applied.companionGrants, source.companionGrants);
});

test("master summoner halves eidolon progression with a minimum effective level of 1", () => {
  const source = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/summoner-master-summoner.json", import.meta.url), "utf8"));
  const [adjustment] = source.companionProgressionAdjustments;
  assert.equal(adjustedCompanionLevel(1, adjustment), 1);
  assert.equal(adjustedCompanionLevel(9, adjustment), 4);
  assert.equal(adjustedCompanionLevel(20, adjustment), 10);
  const applied = applyArchetype({ id: "summoner", name: "Summoner", features: [], classSkills: [] }, source);
  assert.deepEqual(applied.companionProgressionAdjustments, source.companionProgressionAdjustments);
});

test("drake archetypes use the dedicated full-BAB d12 progression", () => {
  assert.deepEqual(
    [1, 3, 5, 9, 20].map((level) => {
      const progression = drakeCompanionProgression(level);
      return [progression.hitDice, progression.baseAttackBonus, progression.drakePowers, progression.sizeIncreases];
    }),
    [[1, 1, 0, 0], [3, 3, 1, 0], [4, 4, 1, 1], [7, 7, 2, 2], [15, 15, 5, 4]],
  );
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cases = new Map([
    ["druid-draconic-druid", [1, 0]],
    ["cavalier-drakerider", [1, 0]],
    ["paladin-silver-champion", [5, 0]],
    ["ranger-drake-warden", [4, -3]],
  ]);
  for (const [id, [minimumLevel, adjustment]] of cases) {
    const grant = archetype(id).companionGrants[0];
    assert.equal(grant.kind, "drake", `${id} kind`);
    assert.equal(grant.minimumLevel, minimumLevel, `${id} unlock`);
    assert.equal(grant.effectiveLevelAdjustment ?? 0, adjustment, `${id} level adjustment`);
  }
});

test("fiendish vessel familiar advances with total character level", () => {
  const source = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/cleric-fiendish-vessel.json", import.meta.url), "utf8"));
  const [grant] = source.companionGrants;
  assert.equal(grant.minimumLevel, 3);
  assert.equal(grant.usesCharacterLevel, true);
  assert.equal(grant.stacksWithExisting, true);
  assert.equal(grant.kind, "familiar");
});

test("fixed archetype class-skill replacements apply across the migrated catalogue batch", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cases = new Map([
    ["alchemist-alchemical-sapper", [["Knowledge (engineering)", "Stealth"], []]],
    ["alchemist-oozemaster", [["Knowledge (dungeoneering)"], ["Knowledge (nature)"]]],
    ["alchemist-royal-alchemist", [["Diplomacy", "Knowledge (nobility)"], ["Knowledge (nature)", "Survival"]]],
    ["barbarian-cave-dweller", [["Stealth"], ["Ride"]]],
    ["barbarian-urban-barbarian", [["Diplomacy", "Knowledge (local)", "Knowledge (nobility)", "Linguistics", "Profession"], ["Handle Animal", "Knowledge (nature)", "Survival"]]],
    ["bard-solacer", [["Heal"], ["Appraise"]]],
    ["bloodrager-symbol-striker", [["Linguistics"], ["Handle Animal"]]],
    ["brawler-snakebite-striker", [["Bluff", "Stealth"], ["Intimidate"]]],
    ["cavalier-charger", [["Acrobatics", "Knowledge (nature)", "Survival"], ["Climb", "Handle Animal", "Ride"]]],
    ["cleric-cardinal", [["Bluff", "Intimidate", "Knowledge (geography)", "Knowledge (local)"], []]],
    ["druid-feral-child", [["Acrobatics"], ["Fly", "Profession"]]],
    ["druid-goliath-druid", [["Bluff", "Diplomacy", "Knowledge (local)"], ["Craft", "Profession", "Ride"]]],
    ["druid-halcyon-druid", [["Diplomacy", "Knowledge (arcana)", "Knowledge (dungeoneering)", "Knowledge (engineering)", "Knowledge (geography)", "Knowledge (history)", "Knowledge (local)", "Knowledge (nature)", "Knowledge (nobility)", "Knowledge (planes)", "Knowledge (religion)"], []]],
    ["druid-nithveil-adept", [["Bluff", "Diplomacy", "Disguise", "Perform", "Sense Motive", "Stealth"], []]],
    ["fighter-cavern-sniper", [["Stealth"], ["Intimidate"]]],
  ]);
  for (const [id, [additions, removals]] of cases) {
    const source = archetype(id);
    assert.deepEqual(source.classSkillAdditions, additions, `${id} additions`);
    assert.deepEqual(source.classSkillRemovals ?? [], removals, `${id} removals`);
    const applied = applyArchetype({ id: source.classId, name: "Base", features: [], classSkills: ["Appraise", "Handle Animal", "Knowledge (nature)", "Ride", "Survival"] }, source);
    for (const skill of additions) assert.ok(applied.classSkills.includes(skill), `${id} adds ${skill}`);
    for (const skill of removals) assert.ok(!applied.classSkills.includes(skill), `${id} removes ${skill}`);
  }
});

test("standard archetype rules text applies unannotated class-skill replacements", () => {
  const record = (directory, id) => JSON.parse(readFileSync(new URL(`../packages/data/src/${directory}/${id}.json`, import.meta.url), "utf8"));
  const cases = new Map([
    ["alchemist-aquachymist", [["Swim"], ["Fly"]]],
    ["fighter-aerial-assaulter", [["Acrobatics", "Fly"], ["Knowledge (dungeoneering)", "Ride", "Swim"]]],
    ["gunslinger-commando", [["Knowledge (geography)", "Knowledge (nature)", "Stealth"], ["Knowledge (engineering)", "Knowledge (local)", "Sleight of Hand"]]],
    ["druid-nature-priest", [["Knowledge (religion)"], ["Knowledge (geography)"]]],
    ["fighter-warlord", [["Acrobatics", "Knowledge (nobility)"], ["Swim", "Knowledge (dungeoneering)"]]],
  ]);
  for (const [id, [additions, removals]] of cases) {
    const archetype = record("archetypes", id);
    assert.deepEqual(inferArchetypeClassSkillChanges(archetype), { additions, removals }, `${id} inferred changes`);
    const applied = applyArchetype(record("classes", archetype.classId), archetype);
    for (const skill of additions) assert.ok(applied.classSkills.includes(skill), `${id} adds ${skill}`);
    for (const skill of removals) assert.ok(!applied.classSkills.includes(skill), `${id} removes ${skill}`);
    assert.ok(archetypeAutomationSummary(archetype).automated.includes("Class skill changes"), `${id} automation summary`);
  }
});

test("complete structural class-skill rules leave the manual queue only when every named skill is applied", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  for (const [id, featureName] of [
    ["brawler-wild-child", "Class Skills"],
    ["alchemist-aquachymist", "Class Skills"],
    ["fighter-cad", "Skills"],
    ["monk-sensei", "Skills"],
    ["inquisitor-suit-seeker", "Class Skills"],
  ]) {
    assert.ok(!archetypeAutomationSummary(record(id)).manual.some(item => item.startsWith(`${featureName} (level`)), `${id} structural rule`);
  }
  assert.ok(archetypeAutomationSummary(record("oracle-ancient-lorekeeper")).manual.some(item => item.startsWith("Class Skills (level")), "a feature with an additional skill bonus remains visible");
});

test("published replacement skill lists and all-Knowledge grants alter the applied class skill set", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const base = { id: "cleric", name: "Cleric", classSkills: ["Wrong"], features: [] };
  const cloistered = applyArchetype(base, record("cleric-cloistered-cleric"));
  assert.ok(cloistered.classSkills.includes("Appraise"));
  assert.ok(cloistered.classSkills.includes("Knowledge (planes)"));
  assert.ok(!cloistered.classSkills.includes("Wrong"));
  assert.ok(!archetypeAutomationSummary(record("cleric-cloistered-cleric")).manual.some(item => item.startsWith("Class Skills (level")));

  const sensei = applyArchetype({ id: "monk", name: "Monk", classSkills: [], features: [] }, record("monk-sensei"));
  assert.equal(sensei.classSkills.filter(skill => skill.startsWith("Knowledge (")).length, 10);
  const shigenjo = applyArchetype({ id: "oracle", name: "Oracle", classSkills: ["Diplomacy"], features: [] }, record("oracle-shigenjo"));
  assert.ok(shigenjo.classSkills.includes("Survival"));
  assert.ok(!shigenjo.classSkills.includes("Diplomacy"));
});

test("standard archetype rules text applies unannotated proficiency changes", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cases = new Map([
    ["barbarian-sea-reaver", [{ category: "armor", operation: "remove", proficiencies: ["Medium armor"] }]],
    ["bard-geisha", [
      { category: "armor", operation: "remove", proficiencies: ["All armor"] },
      { category: "shield", operation: "remove", proficiencies: ["All shields"] },
      { category: "weapon", operation: "replace", proficiencies: ["All simple weapons"] },
    ]],
    ["bard-dawnflower-dervish", [
      { category: "weapon", operation: "remove", proficiencies: ["Rapier", "Whip"] },
      { category: "weapon", operation: "add", proficiencies: ["Scimitar"] },
    ]],
    ["fighter-airborne-ambusher", [
      { category: "armor", operation: "remove", proficiencies: ["Heavy armor"] },
      { category: "shield", operation: "remove", proficiencies: ["Tower shields"] },
    ]],
    ["druid-survivor", [{ category: "weapon", operation: "add", proficiencies: ["Shortbow", "Longbow"] }]],
  ]);
  for (const [id, expected] of cases) {
    const archetype = record(id);
    assert.deepEqual(inferArchetypeProficiencyAdjustments(archetype), expected, `${id} inferred changes`);
    assert.deepEqual(applyArchetype({ id: archetype.classId, name: "Class", classSkills: [], features: [] }, archetype).proficiencyAdjustments, expected);
    assert.ok(archetypeAutomationSummary(archetype).automated.some(item => /proficiencies/.test(item)), `${id} automation summary`);
  }
});

test("proficiency inference handles exclusions, replacements, and mixed gain-loss lists without fragments", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("cavalier-beast-rider")), [
    { category: "armor", operation: "add", proficiencies: ["Medium armor", "Light armor"] },
    { category: "shield", operation: "add", proficiencies: ["All shields"] },
    { category: "shield", operation: "remove", proficiencies: ["Tower shields"] },
  ]);
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("rogue-makeshift-scrapper")), [
    { category: "weapon", operation: "replace", proficiencies: ["All simple weapons"] },
  ]);
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("rogue-skulking-slayer")), [
    { category: "weapon", operation: "remove", proficiencies: ["Rapiers", "Hand Crossbows"] },
    { category: "weapon", operation: "add", proficiencies: ["Greatclubs", "Whips"] },
  ]);
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("gunslinger-gun-tank")), [
    { category: "armor", operation: "add", proficiencies: ["All armor"] },
    { category: "shield", operation: "add", proficiencies: ["All shields", "Tower shields"] },
  ]);
  assert.ok(!archetypeAutomationSummary(record("rogue-makeshift-scrapper")).manual.some(item => item.startsWith("Weapon Proficiency (level")));
  assert.ok(archetypeAutomationSummary({
    id: "unannotated-positive-list",
    replacements: [{ features: [{ id: "unannotated-positive-list-proficiency", name: "Weapon Proficiency", level: 1, summary: "The archetype is proficient with all simple weapons." }] }],
  }).manual.some(item => item.startsWith("Weapon Proficiency (level")), "an unannotated positive list is not treated as a complete replacement");
});

test("complete multi-sentence proficiency rules leave the manual queue", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const automated = [
    ["alchemist-fire-bomber", "Weapon and Armor Proficiency"],
    ["barbarian-feral-gnasher", "Weapon and Armor Proficiency"],
    ["barbarian-savage-technologist", "Weapon and Armor Proficiency"],
    ["barbarian-true-primitive", "Weapon and Armor Proficiency"],
    ["bloodrager-urban-bloodrager", "Weapon and Armor Proficiency"],
    ["brawler-battle-dancer", "Armor Proficiency"],
    ["cavalier-saurian-champion", "Weapon and Armor Proficiency"],
    ["cavalier-beast-rider", "Armor Proficiency"],
    ["cavalier-wave-rider", "Weapon and Armor Proficiency"],
    ["cleric-angelfire-apostle", "Armor Proficiency"],
    ["cleric-cardinal", "Armor Proficiency"],
    ["cleric-cloistered-cleric", "Weapon and Armor Proficiency"],
    ["cleric-ecclesitheurge", "Weapon and Armor Proficiency"],
    ["cleric-mendevian-priest", "Weapon and Armor Proficiency"],
    ["druid-aerie-protector", "Weapon and Armor Proficiency"],
    ["druid-nature-priest", "Weapon Proficiencies"],
    ["druid-feral-child", "Weapon and Armor Proficiency"],
    ["druid-sky-druid", "Weapon and Armor Proficiency"],
    ["druid-supernaturalist", "Weapon and Armor Proficiency"],
    ["druid-tempest-druid", "Armor and Weapon Proficiencies"],
    ["fighter-viking", "Weapon and Armor Proficiency"],
    ["magus-iron-ring-striker", "Weapon Proficiency"],
    ["medium-medium-of-the-master", "Armor Proficiency"],
    ["paladin-hunting-paladin", "Weapon and Armor Proficiency"],
    ["paladin-holy-gun", "Weapon and Armor Proficiency"],
    ["paladin-virtuous-bravo", "Weapon and Armor Proficiency"],
    ["skald-urban-skald", "Weapon and Armor Proficiency"],
    ["skald-belkzen-war-drummer", "Weapon Proficiency"],
    ["slayer-deliverer", "Weapon and Armor Proficiency"],
    ["slayer-velvet-blade", "Armor Proficiency"],
    ["warpriest-sixth-wing-bulwark", "Weapon and Armor Proficiency"],
  ];
  for (const [id, name] of automated)
    assert.ok(!archetypeAutomationSummary(record(id)).manual.some(item => item.startsWith(`${name} (level`)), `${id} fully automated`);

  assert.ok(archetypeAutomationSummary(record("monk-sohei")).manual.some(item => item.startsWith("Weapon and Armor Proficiency (level")), "Sohei's flurry and AC interactions remain manual");
  assert.ok(archetypeAutomationSummary(record("rogue-eldritch-scoundrel")).manual.some(item => item.startsWith("Armor Proficiencies (level")), "spell-failure rules remain manual");
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("druid-sunrider")), [
    { category: "weapon", operation: "remove", proficiencies: ["Scythe", "Sickle", "Quarterstaff"] },
    { category: "weapon", operation: "add", proficiencies: ["Shortbow"] },
  ]);
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("fighter-child-of-acavna-and-amaznen")), [
    { category: "weapon", operation: "remove", proficiencies: ["Two-handed martial weapons"] },
    { category: "shield", operation: "remove", proficiencies: ["Tower shields"] },
  ]);
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("investigator-star-watcher")), [
    { category: "weapon", operation: "remove", proficiencies: ["Rapier"] },
    { category: "weapon", operation: "add", proficiencies: ["Starknife"] },
  ]);
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("magus-esoteric")), [
    { category: "weapon", operation: "replace", proficiencies: ["All simple weapons"] },
  ]);
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("swashbuckler-musketeer")), [
    { category: "weapon", operation: "replace", proficiencies: ["All simple weapons", "All martial weapons", "One-handed firearms", "Two-handed firearms"] },
  ]);
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("swashbuckler-mysterious-avenger")), [
    { category: "shield", operation: "remove", proficiencies: ["Bucklers"] },
    { category: "weapon", operation: "add", proficiencies: ["Whip"] },
  ]);
  assert.deepEqual(inferArchetypeProficiencyAdjustments(record("swashbuckler-picaroon")), [
    { category: "weapon", operation: "replace", proficiencies: ["All simple weapons", "All martial weapons", "One-handed firearms"] },
  ]);
  for (const [id, name] of [
    ["druid-sunrider", "Weapon and Armor Proficiencies"],
    ["fighter-child-of-acavna-and-amaznen", "Weapon and Armor Proficiency"],
    ["investigator-star-watcher", "Weapon and Armor Proficiency"],
    ["magus-esoteric", "Weapon and Armor Proficiency"],
    ["swashbuckler-mysterious-avenger", "Weapon and Armor Proficiency"],
  ]) assert.ok(!archetypeAutomationSummary(record(id)).manual.some(item => item.startsWith(`${name} (level`)), `${id} mixed proficiency rule is automated`);
  for (const id of ["swashbuckler-musketeer", "swashbuckler-picaroon"])
    assert.ok(!archetypeAutomationSummary(record(id)).manual.some(item => item.startsWith("Weapon Proficiency (level")), `${id} full replacement is automated`);
  assert.deepEqual(record("ranger-nirmathi-irregular").proficiencyAdjustments, [
    { category: "weapon", operation: "replace", proficiencies: ["All simple weapons", "All martial weapons"] },
    { category: "armor", operation: "replace", proficiencies: ["Light armor"] },
    { category: "shield", operation: "remove", proficiencies: ["All shields"] },
  ]);
  assert.deepEqual(record("barbarian-savage-technologist").proficiencyAdjustments, [
    { category: "weapon", operation: "replace", proficiencies: ["All simple weapons", "All martial weapons", "Firearms"] },
    { category: "armor", operation: "replace", proficiencies: ["Light armor"] },
    { category: "shield", operation: "replace", proficiencies: ["All shields"] },
    { category: "shield", operation: "remove", proficiencies: ["Tower shields"] },
  ]);
  assert.deepEqual(record("cavalier-beast-rider").proficiencyAdjustments, [
    { category: "armor", operation: "replace", proficiencies: ["Light armor", "Medium armor"] },
    { category: "shield", operation: "replace", proficiencies: ["All shields"] },
    { category: "shield", operation: "remove", proficiencies: ["Tower shields"] },
  ]);
  assert.deepEqual(record("paladin-holy-gun").proficiencyAdjustments, [
    { category: "weapon", operation: "replace", proficiencies: ["All simple weapons", "All martial weapons", "Firearms"] },
    { category: "armor", operation: "replace", proficiencies: ["Light armor"] },
    { category: "shield", operation: "remove", proficiencies: ["All shields"] },
  ]);
  assert.deepEqual(record("skald-belkzen-war-drummer").proficiencyAdjustments, [
    { category: "weapon", operation: "replace", proficiencies: ["All simple weapons", "Greatclub"] },
  ]);
  assert.ok(archetypeAutomationSummary(record("magus-spire-defender")).manual.some(item => item.startsWith("Weapon Proficiency (level")), "restricted weapon choices remain manual");
  assert.ok(archetypeAutomationSummary(record("cavalier-musketeer")).manual.some(item => item.startsWith("Weapon and Armor Proficiency (level")), "the unmodeled fighter-level stacking rule remains manual");
});

test("authored catalogue proficiency overlays complete exact multi-sentence replacements", () => {
  const batch = JSON.parse(readFileSync(new URL("../packages/data/src/archetype-automation/proficiencies-02.json", import.meta.url), "utf8"));
  assert.equal(batch.overlays.length, 20);
  for (const overlay of batch.overlays) {
    const archetype = catalogueArchetypes.find((entry) => entry.id === overlay.archetypeId);
    assert.ok(archetype, `${overlay.archetypeId} generated archetype`);
    assert.deepEqual(archetype.proficiencyAdjustments, overlay.proficiencyAdjustments, `${overlay.archetypeId} exact proficiency replacement`);
    assert.ok(!archetypeAutomationSummary(archetype).manual.some(item => /Proficienc(?:y|ies) \(level/.test(item)), `${overlay.archetypeId} complete proficiency feature`);
  }
});

test("inferred proficiency automation stays normalized across the full archetype catalogue", () => {
  const directory = new URL("../packages/data/src/archetypes/", import.meta.url);
  const records = readdirSync(directory)
    .filter(file => file.endsWith(".json"))
    .map(file => JSON.parse(readFileSync(new URL(file, directory), "utf8")));
  const inferred = records.map(archetype => ({ archetype, adjustments: inferArchetypeProficiencyAdjustments(archetype) }))
    .filter(item => item.adjustments.length > 0);
  assert.equal(inferred.length, 159);
  assert.equal(inferred.filter(item => !item.archetype.proficiencyAdjustments?.length).length, 138);
  for (const { archetype, adjustments } of inferred) {
    for (const adjustment of adjustments) {
      assert.ok(["weapon", "armor", "shield"].includes(adjustment.category), `${archetype.id} category`);
      assert.ok(["add", "remove", "replace"].includes(adjustment.operation), `${archetype.id} operation`);
      assert.equal(adjustment.proficiencies.length, new Set(adjustment.proficiencies).size, `${archetype.id} duplicates`);
      for (const proficiency of adjustment.proficiencies) {
        assert.ok(proficiency.length >= 3, `${archetype.id} short proficiency`);
        assert.ok(!/^(?:and|or|but|not|only|except|with|it|all)$/i.test(proficiency), `${archetype.id} fragment ${proficiency}`);
        if (adjustment.category === "weapon") assert.ok(!/armor|shield/i.test(proficiency), `${archetype.id} cross-category ${proficiency}`);
      }
    }
  }
});

test("standard archetype rules text applies per-level skill-rank progression", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cases = new Map([
    ["cleric-cloistered-cleric", { adjustment: { operation: "replace", value: 4 }, base: 2, expected: 4 }],
    ["fighter-lore-warden", { adjustment: { operation: "add", value: 2 }, base: 2, expected: 4 }],
    ["fighter-opportunist", { adjustment: { operation: "add", value: 2 }, base: 2, expected: 4 }],
    ["rogue-eldritch-raider", { adjustment: { operation: "replace", value: 6 }, base: 8, expected: 6 }],
    ["warpriest-cult-leader", { adjustment: { operation: "replace", value: 4 }, base: 2, expected: 4 }],
  ]);
  for (const [id, expected] of cases) {
    const archetype = record(id);
    assert.deepEqual(inferArchetypeSkillRankAdjustment(archetype), expected.adjustment, `${id} inferred adjustment`);
    const applied = applyArchetype({ id: archetype.classId, name: "Class", skillRanksPerLevel: expected.base, classSkills: [], features: [] }, archetype);
    assert.equal(applied.skillRanksPerLevel, expected.expected, `${id} applied ranks`);
    assert.ok(archetypeAutomationSummary(archetype).automated.some(item => item.startsWith("Class skill-rank progression:")), `${id} summary`);
    if (/^\d+\s*\+\s*Int modifier\.?$/i.test(archetype.replacements.flatMap(item => item.features).find(feature => feature.name === "Skill Ranks per Level")?.summary ?? ""))
      assert.ok(!archetypeAutomationSummary(archetype).manual.some(item => item.startsWith("Skill Ranks per Level (level")), `${id} exact structural feature`);
  }
});

test("skill-rank inference covers only explicit player-character progressions", () => {
  const directory = new URL("../packages/data/src/archetypes/", import.meta.url);
  const inferred = readdirSync(directory)
    .filter(file => file.endsWith(".json"))
    .map(file => JSON.parse(readFileSync(new URL(file, directory), "utf8")))
    .map(archetype => ({ archetype, adjustment: inferArchetypeSkillRankAdjustment(archetype) }))
    .filter(item => item.adjustment);
  assert.equal(inferred.length, 11);
  assert.ok(inferred.every(item => !/(?:companion|eidolon|familiar|homunculus|phantom|mount)/i.test(item.archetype.name)));
  assert.ok(inferred.every(item => item.adjustment.value >= 1 && item.adjustment.value <= 12));
});

test("archetype combat-statistic and proficiency replacements alter the calculated class chassis", () => {
  const source = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cleric = {
    id: "cleric",
    name: "Cleric",
    hitDie: 8,
    babProgression: "three-quarters",
    saves: { fortitude: "good", reflex: "poor", will: "good" },
    skillRanksPerLevel: 2,
    classSkills: ["Diplomacy"],
    features: [],
  };
  const cardinal = applyArchetype(cleric, source("cleric-cardinal"));
  assert.equal(cardinal.babProgression, "half");
  assert.equal(cardinal.skillRanksPerLevel, 6);
  assert.deepEqual(cardinal.proficiencyAdjustments, [
    { category: "armor", operation: "replace", proficiencies: ["Light armor"] },
    { category: "shield", operation: "remove", proficiencies: ["All shields"] },
  ]);

  const feyspeaker = applyArchetype({ ...cleric, id: "druid", name: "Druid", skillRanksPerLevel: 4 }, source("druid-feyspeaker"));
  assert.equal(feyspeaker.babProgression, "half");
  assert.equal(feyspeaker.skillRanksPerLevel, 6);
  for (const skill of ["Bluff", "Diplomacy", "Disguise", "Sense Motive"]) assert.ok(feyspeaker.classSkills.includes(skill));

  const truePrimitive = applyArchetype({ ...cleric, id: "barbarian", name: "Barbarian" }, source("barbarian-true-primitive"));
  assert.equal(truePrimitive.proficiencyAdjustments.length, 3);
  assert.deepEqual(truePrimitive.proficiencyAdjustments.map(item => item.category), ["weapon", "armor", "shield"]);
});

test("advisory option lists stay visible without being reported as unimplemented mechanics", () => {
  const advisory = {
    replacements: [{ features: [{
      id: "recommended-talents",
      name: "Rogue Talents",
      level: 1,
      summary: "The following rogue talents complement this archetype: fast stealth, ledge walker, and wall scramble.",
    }] }],
  };
  assert.deepEqual(archetypeAdvisoryFeatureIds(advisory), ["recommended-talents"]);
  assert.deepEqual(archetypeAutomationSummary(advisory).manual, []);
  assert.match(archetypeAutomationSummary(advisory).automated.join(" "), /advisory option recommendation/);

  const optionExpansion = {
    replacements: [{ features: [{
      id: "expanded-talents",
      name: "Rogue Talents",
      level: 1,
      summary: "A vaultbreaker can choose the following rogue talents in place of a discovery: fast stealth and wall scramble.",
    }] }],
  };
  assert.deepEqual(archetypeAdvisoryFeatureIds(optionExpansion), []);
  assert.deepEqual(archetypeAutomationSummary(optionExpansion).manual, ["Rogue Talents (level 1)"]);
});

test("catalogue advisory detection clears only recommendation-only feature records", () => {
  const advisoryFeatures = catalogueArchetypes.flatMap((archetype) => archetypeAdvisoryFeatureIds(archetype));
  assert.equal(advisoryFeatures.length, 236);
  const madDog = catalogueArchetypes.find((archetype) => archetype.id === "barbarian-mad-dog");
  assert.deepEqual(archetypeAdvisoryFeatureIds(madDog), []);
});
