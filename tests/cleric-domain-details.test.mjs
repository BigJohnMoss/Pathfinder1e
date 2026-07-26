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

test("APG Chaos and Charm subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-protean", "domain-chaos", "Chaos Blade", "Aura of Chaos"],
    ["subdomain-love", "domain-charm", "Dazing Touch", "Adoration"],
    ["subdomain-lust", "domain-charm", "Charming Smile", "Anything to Please"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.ok(subdomain.powers.some((power) => power.name === replacementPower));
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
  assert.equal(byId.get("subdomain-protean").domainSpells[5].name, "planar binding (proteans only)");
  assert.equal(byId.get("subdomain-love").domainSpells[7].name, "euphoric tranquility");
  assert.equal(byId.get("subdomain-lust").domainSpells[3].name, "confusion");
});

test("APG Community and Darkness subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-family", "domain-community", "Calming Touch", "Binding Ties"],
    ["subdomain-home", "domain-community", "Unity", "Guarded Hearth"],
    ["subdomain-loss", "domain-darkness", "Eyes of Darkness", "Aura of Forgetfulness"],
    ["subdomain-night", "domain-darkness", "Touch of Darkness", "Night Hunter"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.ok(subdomain.powers.some((power) => power.name === replacementPower));
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
  assert.equal(byId.get("subdomain-family").domainSpells[2].name, "create food and water");
  assert.equal(byId.get("subdomain-home").domainSpells[6].name, "guards and wards");
  assert.equal(byId.get("subdomain-loss").domainSpells[8].name, "energy drain");
  assert.equal(byId.get("subdomain-night").domainSpells[0].name, "sleep");
});

test("APG Death and Destruction subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-murder", "domain-death", "Death's Embrace", "Killing Blow"],
    ["subdomain-undead", "domain-death", "Bleeding Touch", "Death's Kiss"],
    ["subdomain-catastrophe", "domain-destruction", "Destructive Aura", "Deadly Weather"],
    ["subdomain-rage", "domain-destruction", "Destructive Aura", "Rage"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.ok(subdomain.powers.some((power) => power.name === replacementPower));
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
  assert.equal(byId.get("subdomain-murder").domainSpells[8].name, "mass suffocation");
  assert.equal(byId.get("subdomain-undead").domainSpells[3].name, "enervation");
  assert.equal(byId.get("subdomain-catastrophe").domainSpells[6].name, "control weather");
  assert.equal(byId.get("subdomain-rage").domainSpells[5].name, "moonstruck");
});

test("APG Evil and Fire subdomains expose complete parent-specific replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-daemon", "domain-evil", "Scythe of Evil", "Whispering Evil"],
    ["subdomain-demon-chaos", "domain-chaos", "Touch of Chaos", "Fury of the Abyss"],
    ["subdomain-demon-evil", "domain-evil", "Touch of Evil", "Fury of the Abyss"],
    ["subdomain-devil-evil", "domain-evil", "Touch of Evil", "Hell's Corruption"],
    ["subdomain-devil-law", "domain-law", "Touch of Law", "Hell's Corruption"],
    ["subdomain-ash", "domain-fire", "Fire Resistance", "Wall of Ashes"],
    ["subdomain-smoke", "domain-fire", "Fire Bolt", "Cloud of Smoke"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.ok(subdomain.powers.some((power) => power.name === replacementPower));
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
  assert.equal(byId.get("subdomain-demon-chaos").domainSpells[3].name, "chaos hammer");
  assert.equal(byId.get("subdomain-demon-evil").domainSpells[3].name, "unholy blight");
  assert.equal(byId.get("subdomain-devil-law").domainSpells[3].name, "order's wrath");
  assert.equal(byId.get("subdomain-ash").domainSpells[8].name, "fiery body");
  assert.equal(byId.get("subdomain-smoke").domainSpells[2].name, "stinking cloud");
});

test("APG Good and Healing subdomains expose complete parent-specific replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-agathion", "domain-good", "Holy Lance", "Protective Aura"],
    ["subdomain-archon-good", "domain-good", "Holy Lance", "Aura of Menace"],
    ["subdomain-archon-law", "domain-law", "Staff of Order", "Aura of Menace"],
    ["subdomain-azata-chaos", "domain-chaos", "Touch of Chaos", "Elysium's Call"],
    ["subdomain-azata-good", "domain-good", "Touch of Good", "Elysium's Call"],
    ["subdomain-restoration", "domain-healing", "Rebuke Death", "Restorative Touch"],
    ["subdomain-resurrection", "domain-healing", "Healer's Blessing", "Gift of Life"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.ok(subdomain.powers.some((power) => power.name === replacementPower));
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
  assert.equal(byId.get("subdomain-archon-law").domainSpells[3].name, "order's wrath");
  assert.equal(byId.get("subdomain-azata-chaos").domainSpells[3].name, "chaos hammer");
  assert.equal(byId.get("subdomain-restoration").domainSpells[4].name, "break enchantment");
  assert.equal(byId.get("subdomain-resurrection").domainSpells[8].name, "true resurrection");
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
