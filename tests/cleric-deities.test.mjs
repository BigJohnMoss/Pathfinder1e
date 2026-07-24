import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const deities = JSON.parse(await readFile(new URL("../packages/data/src/options/cleric-deities.json", import.meta.url), "utf8"));

test("Core cleric deity catalogue includes the twenty Inner Sea deities", () => {
  assert.equal(deities.options.length, 20);
  assert.equal(new Set(deities.options.map((deity) => deity.id)).size, 20);
});

test("cleric deities retain their granted domain restrictions", () => {
  const byId = new Map(deities.options.map((deity) => [deity.id, deity]));
  assert.deepEqual(byId.get("deity-sarenrae").domains, ["domain-fire", "domain-glory", "domain-good", "domain-healing", "domain-sun"]);
  assert.deepEqual(byId.get("deity-torag").domains, ["domain-artifice", "domain-earth", "domain-good", "domain-law", "domain-protection"]);
  assert.deepEqual(byId.get("deity-pharasma").domains, ["domain-death", "domain-healing", "domain-knowledge", "domain-repose", "domain-water"]);
});
