import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const expectedCounts = {
  alchemist: 383, arcanist: 1896, bloodrager: 320, hunter: 736,
  inquisitor: 586, investigator: 379, magus: 462, medium: 370,
  mesmerist: 543, occultist: 652, oracle: 986, psychic: 1081,
  shaman: 626, skald: 813, spiritualist: 398, summoner: 406,
  warpriest: 854, witch: 1131
};

test("later spellcasting classes use exact sourced list membership", async () => {
  const data = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  for (const [classId, expected] of Object.entries(expectedCounts)) {
    assert.equal(data.spells.filter(spell => spell.levelByClass[classId] !== undefined).length, expected, classId);
  }
});

test("source-marked spells keep each class's published rank", async () => {
  const { spells } = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  const spellById = new Map(spells.map((spell) => [spell.id, spell]));
  for (const [id, classId, rank] of [
    ["endure-elements", "alchemist", 1], ["endure-elements", "investigator", 1],
    ["stone-shield", "bloodrager", 1], ["stone-shield", "hunter", 1], ["stone-shield", "magus", 2],
    ["command", "inquisitor", 1], ["bless", "warpriest", 1],
  ]) {
    assert.equal(spellById.get(id)?.levelByClass[classId], rank, `${id} ${classId} rank`);
  }
});

test("occult and other class lists retain sourced spell ranks", async () => {
  const { spells } = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  const spellById = new Map(spells.map((spell) => [spell.id, spell]));
  for (const [id, classId, rank] of [
    ["command", "medium", 1], ["silence", "mesmerist", 2], ["make-whole", "occultist", 2],
    ["entropic-shield", "psychic", 1], ["bless", "shaman", 1], ["darkness", "skald", 2],
    ["animate-dead-lesser", "spiritualist", 2], ["stone-shield", "summoner", 1], ["command", "witch", 1],
  ]) {
    assert.equal(spellById.get(id)?.levelByClass[classId], rank, `${id} ${classId} rank`);
  }
});

test("refreshed Core classes use the published ranks for expanded spell access", async () => {
  const { spells } = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
  const spellById = new Map(spells.map((spell) => [spell.id, spell]));
  for (const [id, classId, rank] of [
    ["spark", "bard", 0], ["air-bubble", "druid", 1], ["keep-watch", "paladin", 1], ["anticipate-peril", "ranger", 1],
  ]) {
    assert.equal(spellById.get(id)?.levelByClass[classId], rank, `${id} ${classId} rank`);
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
