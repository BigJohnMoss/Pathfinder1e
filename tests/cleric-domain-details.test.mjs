import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const domains = bundle.optionGroups.find((group) => group.id === "cleric-domains");
const coreIds = ["domain-air","domain-animal","domain-chaos","domain-death","domain-destruction","domain-earth","domain-evil","domain-fire","domain-good","domain-healing","domain-knowledge","domain-law","domain-luck","domain-magic","domain-plant","domain-protection","domain-strength","domain-sun","domain-travel","domain-trickery","domain-war","domain-water"];

test("all 22 Core domains expose two granted powers and nine domain spells", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  for (const id of coreIds) {
    const domain = byId.get(id);
    assert.ok(domain, `missing ${id}`);
    assert.equal(domain.powers.length, 2, `${id} powers`);
    assert.equal(domain.domainSpells.length, 9, `${id} spells`);
    assert.deepEqual(domain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
});

test("Core domain detail records retain distinctive progressions", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  assert.deepEqual(byId.get("domain-animal").powers.map((power) => [power.name, power.level]), [["Speak with Animals",1],["Animal Companion",4]]);
  assert.deepEqual(byId.get("domain-fire").domainSpells.slice(0,3).map((spell) => spell.name), ["burning hands","produce flame","fireball"]);
  assert.equal(byId.get("domain-war").powers[1].name, "Weapon Master");
  assert.equal(byId.get("domain-water").domainSpells[8].name, "elemental swarm (water only)");
});
