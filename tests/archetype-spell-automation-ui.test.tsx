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
    automaticExtendDuration: undefined,
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
