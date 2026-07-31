import assert from "node:assert/strict";
import test from "node:test";
import { apgClassResourceMaximums, normalizeCharacterDraft, normalizeClassResourcesByClass } from "../packages/engine/src/index.js";

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
