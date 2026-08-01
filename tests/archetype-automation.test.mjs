import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyArchetype, archetypeAutomationSummary, spellcastingProgression } from "../packages/engine/src/index.js";

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
  ]);
  for (const [id, [minimumLevel, adjustment]] of cases) {
    const source = archetype(id);
    assert.equal(source.companionGrants.length, 1, `${id} companion count`);
    assert.equal(source.companionGrants[0].minimumLevel, minimumLevel, `${id} unlock`);
    assert.equal(source.companionGrants[0].effectiveLevelAdjustment ?? 0, adjustment, `${id} effective level`);
    const applied = applyArchetype({ id: source.classId, name: "Base", features: [], classSkills: [] }, source);
    assert.deepEqual(applied.companionGrants, source.companionGrants, `${id} applied companion`);
  }
});
