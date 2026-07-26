import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const domains = bundle.optionGroups.find((group) => group.id === "cleric-domains");
const coreIds = [
  "domain-air","domain-animal","domain-artifice","domain-chaos","domain-charm","domain-community","domain-darkness","domain-death","domain-destruction","domain-earth","domain-evil",
  "domain-fire","domain-glory","domain-good","domain-healing","domain-knowledge","domain-law","domain-liberation","domain-luck","domain-madness","domain-magic","domain-nobility",
  "domain-plant","domain-protection","domain-repose","domain-rune","domain-strength","domain-sun","domain-travel","domain-trickery","domain-war","domain-water","domain-weather"
];

test("all 33 Core domains expose two granted powers and nine domain spells", () => {
  const coreDomains = domains.options.filter((domain) => !domain.parentDomainId);
  assert.equal(coreDomains.length, 33);
  const byId = new Map(coreDomains.map((domain) => [domain.id, domain]));
  assert.deepEqual([...byId.keys()].sort(), [...coreIds].sort());
  for (const id of coreIds) {
    const domain = byId.get(id);
    assert.ok(domain, `missing ${id}`);
    assert.equal(domain.powers.length, 2, `${id} powers`);
    assert.equal(domain.domainSpells.length, 9, `${id} spells`);
    assert.deepEqual(domain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
    assert.ok(domain.powers.every((power) => power.name && power.summary), `${id} power details`);
    assert.ok(domain.domainSpells.every((spell) => spell.name), `${id} spell names`);
  }
});

test("APG Air and Earth subdomains replace powers and spells while retaining their parent domain", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-cloud", "domain-air", "Electricity Resistance", "Thundercloud"],
    ["subdomain-wind", "domain-air", "Lightning Arc", "Wind Blast"],
    ["subdomain-caves", "domain-earth", "Acid Resistance", "Tunnel Runner"],
    ["subdomain-metal", "domain-earth", "Acid Dart", "Metal Fist"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.ok(subdomain.powers.some((power) => power.name === replacementPower));
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
  assert.equal(byId.get("subdomain-cloud").domainSpells[3].name, "solid fog");
  assert.equal(byId.get("subdomain-caves").domainSpells[5].name, "hungry pit");
});

test("APG Animal and Artifice subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-feather", "domain-animal", "Speak with Animals", "Eyes of the Hawk"],
    ["subdomain-fur", "domain-animal", "Speak with Animals", "Predator's Grace"],
    ["subdomain-construct", "domain-artifice", "Dancing Weapons", "Animate Servant"],
    ["subdomain-toil", "domain-artifice", "Dancing Weapons", "Aura of Repetition"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.ok(subdomain.powers.some((power) => power.name === replacementPower));
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
  assert.deepEqual(byId.get("subdomain-feather").classSkills, ["Fly"]);
  assert.equal(byId.get("subdomain-construct").domainSpells[6].name, "limited wish");
  assert.equal(byId.get("subdomain-toil").domainSpells[4].name, "waves of fatigue");
});

test("Core domain detail records retain distinctive progressions", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  assert.deepEqual(byId.get("domain-animal").powers.map((power) => [power.name, power.level]), [["Speak with Animals",1],["Animal Companion",4]]);
  assert.deepEqual(byId.get("domain-fire").domainSpells.slice(0,3).map((spell) => spell.name), ["burning hands","produce flame","fireball"]);
  assert.equal(byId.get("domain-nobility").powers[1].name, "Leadership");
  assert.equal(byId.get("domain-repose").domainSpells[5].name, "undeath to death");
  assert.equal(byId.get("domain-rune").domainSpells[8].name, "teleportation circle");
  assert.equal(byId.get("domain-war").powers[1].name, "Weapon Master");
  assert.equal(byId.get("domain-water").domainSpells[8].name, "elemental swarm (water only)");
  assert.deepEqual(byId.get("domain-weather").domainSpells.slice(6).map((spell) => spell.name), ["control weather","whirlwind","storm of vengeance"]);
});
