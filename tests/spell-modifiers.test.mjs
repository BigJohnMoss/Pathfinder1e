import test from "node:test";
import assert from "node:assert/strict";
import {
  extendedSpellDuration,
  isPersonalRangeSpell,
  isTransmutationSpell,
  spellHasSchool,
} from "../packages/engine/src/index.js";

test("spell schools and personal ranges normalize for archetype automation", () => {
  assert.equal(spellHasSchool({ school: "Transmutation" }, "transmutation"), true);
  assert.equal(spellHasSchool({ schools: ["illusion", "transmutation"] }, "TRANSMUTATION"), true);
  assert.equal(isTransmutationSpell({ school: "evocation" }), false);
  assert.equal(isPersonalRangeSpell({ range: " Personal " }), true);
  assert.equal(isPersonalRangeSpell({ range: "touch" }), false);
});

test("Extend Spell doubles eligible durations and excludes forbidden durations", () => {
  assert.equal(extendedSpellDuration("1 round/level (D)"), "2 rounds/level (D)");
  assert.equal(extendedSpellDuration("10 minutes/level"), "20 minutes/level");
  assert.equal(extendedSpellDuration("24 hours"), "48 hours");
  assert.equal(extendedSpellDuration("1d4 rounds"), "twice 1d4 rounds");
  assert.equal(extendedSpellDuration("concentration, up to 1 round/level"), null);
  assert.equal(extendedSpellDuration("instantaneous"), null);
  assert.equal(extendedSpellDuration("permanent (D)"), null);
});
