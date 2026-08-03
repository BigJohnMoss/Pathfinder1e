import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyArchetype } from "../packages/engine/src/index.js";
import { classSpellAutomation } from "../apps/web/app/archetype-spell-automation";
import type { CharacterArchetype, CharacterClass } from "../packages/types/src/index.js";

const arcanist = JSON.parse(
  readFileSync(new URL("../packages/data/src/classes/arcanist.json", import.meta.url), "utf8"),
) as CharacterClass;
const brownFur = JSON.parse(
  readFileSync(new URL("../packages/data/src/archetypes/arcanist-brown-fur-transmuter.json", import.meta.url), "utf8"),
) as CharacterArchetype;
const applied = applyArchetype(arcanist, brownFur);
const whiteMage = JSON.parse(
  readFileSync(new URL("../packages/data/src/archetypes/arcanist-white-mage.json", import.meta.url), "utf8"),
) as CharacterArchetype;
const appliedWhiteMage = applyArchetype(arcanist, whiteMage);

test("Brown-Fur spell automation unlocks and improves at the correct levels", () => {
  assert.equal(classSpellAutomation(applied, 8), undefined);
  assert.deepEqual(classSpellAutomation(applied, 9), {
    sharePersonalRange: {
      label: "Share Transmutation",
      school: "transmutation",
      resourceId: "arcaneReservoir",
      reservoirCost: 1,
      range: "touch",
      willingOnly: true,
    },
  });
  assert.deepEqual(classSpellAutomation(applied, 20), {
    sharePersonalRange: {
      label: "Share Transmutation",
      school: "transmutation",
      resourceId: "arcaneReservoir",
      reservoirCost: 1,
      range: "30 feet",
      willingOnly: true,
    },
    automaticExtendDuration: {
      label: "Transmutation Supremacy",
      school: "transmutation",
    },
  });
});

test("White Mage Fast Healing automation requires its greater exploit selection", () => {
  assert.equal(classSpellAutomation(appliedWhiteMage, 10, ["white-mage-fast-healing"]), undefined);
  assert.equal(classSpellAutomation(appliedWhiteMage, 11), undefined);
  assert.deepEqual(classSpellAutomation(appliedWhiteMage, 11, ["white-mage-fast-healing"]), {
    fastHealingAura: {
      label: "Fast Healing",
      resourceId: "arcaneReservoir",
      reservoirCost: 1,
      minimumSpellLevel: 2,
      range: "30 feet",
      healingDivisor: 2,
      durationAbility: "charisma",
      minimumRounds: 1,
    },
  });
});
