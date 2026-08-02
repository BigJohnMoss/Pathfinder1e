import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { adjustedCompanionLevel, applyArchetype, archetypeAutomationSummary, drakeCompanionProgression, inferArchetypeClassSkillChanges, inferArchetypeFeatChoices, inferArchetypeGrantedFeats, inferArchetypeProficiencyAdjustments, inferArchetypeSkillRankAdjustment, spellcastingProgression } from "../packages/engine/src/index.js";

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
