import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const expectedCounts = {
  alchemist: 287, arcanist: 1896, bloodrager: 213, hunter: 608,
  inquisitor: 497, investigator: 284, magus: 327, medium: 308,
  mesmerist: 447, occultist: 488, oracle: 986, psychic: 868,
  shaman: 485, skald: 688, spiritualist: 314, summoner: 319,
  warpriest: 681, witch: 875
};

test("later spellcasting classes use exact sourced list membership", async () => {
  const data = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  for (const [classId, expected] of Object.entries(expectedCounts)) {
    assert.equal(data.spells.filter(spell => spell.levelByClass[classId] !== undefined).length, expected, classId);
  }
});

test("Cleric and Oracle both have their published ranks for source-marked divine staples", async () => {
  const data = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  const spellById = new Map(data.spells.map((spell) => [spell.id, spell]));
  for (const [id, rank] of [["bless", 1], ["command", 1], ["divine-favor", 1], ["flame-strike", 5], ["resurrection", 7]]) {
    assert.equal(spellById.get(id)?.levelByClass.cleric, rank, `${id} cleric rank`);
    assert.equal(spellById.get(id)?.levelByClass.oracle, rank, `${id} oracle rank`);
  }
  assert.equal(data.spells.filter((spell) => spell.levelByClass.cleric !== undefined).length, 994);
});

test("both divine lists include the restored Core spells and the existing qualified names", async () => {
  const { spells } = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  const spellById = new Map(spells.map((spell) => [spell.id, spell]));
  for (const [id, rank] of [
    ["bane", 1], ["sanctuary", 1], ["death-knell", 2], ["searing-light", 3], ["raise-dead", 5], ["harm", 6],
    ["planar-ally-lesser", 4], ["greater-restoration", 7],
  ]) {
    const spell = spellById.get(id);
    assert.equal(spell?.levelByClass.cleric, rank, `${id} Cleric rank`);
    assert.equal(spell?.levelByClass.oracle, rank, `${id} Oracle rank`);
    assert.ok(spell.source?.url, `${id} rules source`);
  }
  assert.ok(spellById.get("raise-dead").components.includes("M (diamond worth 5,000 gp)"));
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
