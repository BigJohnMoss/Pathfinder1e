import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const expectedCounts = {
  alchemist: 283, arcanist: 1896, bloodrager: 213, hunter: 604,
  inquisitor: 484, investigator: 280, magus: 327, medium: 308,
  mesmerist: 446, occultist: 479, oracle: 754, psychic: 868,
  shaman: 474, skald: 684, spiritualist: 302, summoner: 319,
  warpriest: 667, witch: 864
};

test("later spellcasting classes use exact sourced list membership", async () => {
  const data = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  for (const [classId, expected] of Object.entries(expectedCounts)) {
    assert.equal(data.spells.filter(spell => spell.levelByClass[classId] !== undefined).length, expected, classId);
  }
});

test("later-class-exclusive spells retain direct rules sources", async () => {
  const catalogue = JSON.parse(await readFile(new URL("../packages/data/src/spell-catalogues/later-class-exclusive.json", import.meta.url), "utf8"));
  assert.equal(catalogue.spells.length, 685);
  assert.ok(catalogue.spells.every(spell => spell.source.url.startsWith("https://www.aonprd.com/SpellDisplay.aspx")));
});

test("pinned spell metadata retains descriptors used by archetype automation", async () => {
  const data = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  const expected = {
    "gust-of-wind": "air",
    "cone-of-cold": "cold",
    "lightning-bolt": "electricity",
    "sound-burst": "sonic",
  };
  for (const [spellId, descriptor] of Object.entries(expected)) {
    assert.ok(data.spells.find(spell => spell.id === spellId)?.descriptors?.includes(descriptor), `${spellId} should have the ${descriptor} descriptor`);
  }
});
