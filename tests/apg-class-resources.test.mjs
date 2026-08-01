import assert from "node:assert/strict";
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
