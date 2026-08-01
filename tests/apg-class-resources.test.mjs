import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { apgClassResourceMaximums, applyArchetypeResourceAdjustments, normalizeCharacterDraft, normalizeClassResourcesByClass } from "../packages/engine/src/index.js";

test("APG class resources follow their level and ability limits", () => {
  assert.deepEqual(apgClassResourceMaximums("alchemist", 1, { intelligence: 4 }), { bombs: 5 });
  assert.deepEqual(apgClassResourceMaximums("cavalier", 20), { challenges: 7, tactician: 3 });
  assert.deepEqual(apgClassResourceMaximums("inquisitor", 4), { judgments: 2 });
  assert.deepEqual(apgClassResourceMaximums("inquisitor", 20), { judgments: 7, baneRounds: 20 });
  assert.deepEqual(apgClassResourceMaximums("summoner", 10, { charisma: 3 }), { summonMonster: 6, bondSensesRounds: 10, makersCall: 2 });
});

test("character normalization keeps only resource counters for selected classes", () => {
  const normalized = normalizeCharacterDraft({
    classId: "alchemist", level: 2, classLevels: [{ classId: "alchemist", level: 2 }],
    baseAbilities: { strength: 10, dexterity: 10, constitution: 10, intelligence: 14, wisdom: 10, charisma: 10 },
    classResourceUsesByClass: { alchemist: { bombs: 2 }, cavalier: { challenges: 1 } }
  }, { classIds: ["alchemist", "cavalier"] });
  assert.deepEqual(normalized.classResourceUsesByClass, { alchemist: { bombs: 2 } });
});

test("APG resource persistence drops unknown classes and clamps overspending", () => {
  assert.deepEqual(normalizeClassResourcesByClass({
    alchemist: { bombs: 69, unknown: 4 },
    cavalier: { challenges: -3, tactician: 2 },
    wizard: { bombs: 4 }
  }, [
    { classId: "alchemist", level: 3 },
    { classId: "cavalier", level: 5 },
    { classId: "wizard", level: 12 }
  ], { intelligence: 2 }), {
    alchemist: { bombs: 5 },
    cavalier: { challenges: 0, tactician: 1 }
  });
});

test("archetypes can replace or add bounded reusable class resources", () => {
  const bouncer = { resourceAdjustments: [{ resourceId: "martialFlexibility", operation: "replace", minimumLevel: 2, base: 3, perInterval: 1, interval: 2 }] };
  assert.deepEqual(applyArchetypeResourceAdjustments(apgClassResourceMaximums("brawler", 10), [bouncer], 10), {
    martialFlexibility: 7,
    knockout: 2,
  });
  const healer = { resourceAdjustments: [{ resourceId: "healing", operation: "replace", minimumLevel: 2, base: 1, perInterval: 1, interval: 4, maximum: 5 }] };
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [healer], 20), { healing: 5 });
  assert.deepEqual(normalizeClassResourcesByClass({ bard: { healing: 69 } }, [{ classId: "bard", level: 20 }], {}, { bard: [healer] }), { bard: { healing: 5 } });
});

test("archetype resource catalogue covers reusable level and ability progressions", () => {
  const archetype = (id) => JSON.parse(readFileSync(new URL(`../packages/data/src/archetypes/${id}.json`, import.meta.url), "utf8"));
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("alchemist-ectochymist")], 10, { intelligence: 4 }), { ectoplasmicBlanche: 14 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("bloodrager-ancestral-harbinger")], 18), { spiritGuardian: 5 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("bloodrager-symbol-striker")], 18, { charisma: 3 }), { weaponRune: 3, runeTrap: 6 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("cleric-forgemaster")], 1, { intelligence: 2 }), { runeforger: 5 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("brawler-exemplar")], 10, { charisma: 2 }), { inspiringProwess: 12 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("gunslinger-mysterious-stranger")], 5, { charisma: 4 }), { strangersFortune: 4 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("hunter-colluding-scoundrel")], 12), { scapegoat: 12 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("hunter-patient-ambusher")], 11, { wisdom: 3 }), { snareTraps: 8 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("medium-fiend-keeper")], 10), { darkCommunion: 10 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("mesmerist-cult-master")], 3, { charisma: 4 }), { falseHealing: 7 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("occultist-esoteric-initiate")], 13), { symbolism: 13 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("slayer-bloody-jake")], 20, { charisma: 2 }), { cruelTricks: 22 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("kineticist-dark-elementalist")], 6, { intelligence: 4 }), { soulPower: 4 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("mesmerist-mindwyrm-mesmer")], 1, { charisma: -1 }), { phantasmagoricalBreath: 1 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("oracle-pei-zin-practitioner")], 1, { charisma: 3 }), { healersWay: 4 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("shaman-spirit-warden")], 2, { charisma: 2 }), { rebukeSpirits: 5 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("warpriest-fist-of-the-godclaw")], 3), { detectChaos: 3 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("witch-medium")], 2, { intelligence: 4 }), { ectoplasmicAptitude: 4 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("witch-vellemancer")], 12, { intelligence: 3 }), { investedHexes: 9 });
  assert.deepEqual(applyArchetypeResourceAdjustments({}, [archetype("wizard-wind-listener")], 20), { wispyForm: 20 });
});
