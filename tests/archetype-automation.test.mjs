import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { adjustedCompanionLevel, applyArchetype, archetypeAutomationSummary, archetypeCombatBonuses, archetypeCombatModifierAdjustments, archetypeConditionalModifiers, archetypeInitiativeBonus, archetypeInitiativeBonusAdjustments, archetypeLandSpeedAdjustments, archetypeSaveBonusAdjustments, archetypeSavingThrowBonuses, archetypeSenseAdjustments, archetypeSenses, archetypeSkillBonusAdjustments, archetypeSkillBonuses, characterLandSpeed, drakeCompanionProgression, inferArchetypeClassSkillChanges, inferArchetypeCombatModifierAdjustments, inferArchetypeFeatAlternatives, inferArchetypeFeatChoices, inferArchetypeGrantedFeats, inferArchetypeInitiativeBonusAdjustments, inferArchetypeLandSpeedAdjustments, inferArchetypeProficiencyAdjustments, inferArchetypeSaveBonusAdjustments, inferArchetypeSenseAdjustments, inferArchetypeSkillBonusAdjustments, inferArchetypeSkillRankAdjustment, spellcastingProgression } from "../packages/engine/src/index.js";
import { mergeArchetypeAutomation } from "../packages/data/src/archetype-automation.js";
import catalogueArchetypes from "../generated/pf1e-archetypes.mjs";

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

  const unsafe = { replacements: [{ features: [
    { id: "choice", level: 1, summary: "She gains either Dodge or Mobility as a bonus feat." },
    { id: "companion", level: 1, summary: "Her animal companion gains Dodge as a bonus feat." },
  ] }] };
  assert.deepEqual(inferArchetypeGrantedFeats(unsafe, [{ id: "dodge", name: "Dodge" }, { id: "mobility", name: "Mobility" }]), []);
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

test("standard archetype rules text applies unannotated proficiency changes", () => {
  const record = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  const cases = new Map([
    ["barbarian-sea-reaver", [{ category: "armor", operation: "remove", proficiencies: ["Medium armor"] }]],
    ["bard-geisha", [
      { category: "armor", operation: "remove", proficiencies: ["All armor"] },
      { category: "shield", operation: "remove", proficiencies: ["All shields"] },
      { category: "weapon", operation: "add", proficiencies: ["All simple weapons"] },
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

test("inferred proficiency automation stays normalized across the full archetype catalogue", () => {
  const directory = new URL("../packages/data/src/archetypes/", import.meta.url);
  const records = readdirSync(directory)
    .filter(file => file.endsWith(".json"))
    .map(file => JSON.parse(readFileSync(new URL(file, directory), "utf8")));
  const inferred = records.map(archetype => ({ archetype, adjustments: inferArchetypeProficiencyAdjustments(archetype) }))
    .filter(item => item.adjustments.length > 0);
  assert.equal(inferred.length, 158);
  assert.equal(inferred.filter(item => !item.archetype.proficiencyAdjustments?.length).length, 142);
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
