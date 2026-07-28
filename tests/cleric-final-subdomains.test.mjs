import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bundle = JSON.parse(await readFile(new URL("../generated/pf1e-data.json", import.meta.url), "utf8"));
const domains = bundle.optionGroups.find((group) => group.id === "cleric-domains");

test("APG Plant, Trickery, War, Water, and Weather subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-decay", "domain-plant", "Bramble Armor", "Aura of Decay"],
    ["subdomain-growth", "domain-plant", "Wooden Fist", "Enlarge"],
    ["subdomain-deception", "domain-trickery", "Copycat", "Sudden Shift"],
    ["subdomain-thievery", "domain-trickery", "Master's Illusion", "Thief of the Gods"],
    ["subdomain-blood", "domain-war", "Weapon Master", "Wounding Blade"],
    ["subdomain-tactics", "domain-war", "Battle Rage", "Seize the Initiative"],
    ["subdomain-ice", "domain-water", "Cold Resistance", "Body of Ice"],
    ["subdomain-oceans", "domain-water", "Icicle", "Surge"],
    ["subdomain-seasons", "domain-weather", "Storm Burst", "Untouched by the Seasons"],
    ["subdomain-storms", "domain-weather", "Lightning Lord", "Gale Aura"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.equal(subdomain.powers.length, 2);
    assert.equal(subdomain.powers.some((power) => power.name === replacementPower), true);
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
  assert.equal(byId.get("subdomain-decay").domainSpells[5].name, "harm");
  assert.equal(byId.get("subdomain-growth").domainSpells[4].name, "righteous might");
  assert.equal(byId.get("subdomain-deception").domainSpells[6].name, "project image");
  assert.equal(byId.get("subdomain-thievery").domainSpells[6].name, "ethereal jaunt");
  assert.equal(byId.get("subdomain-blood").domainSpells[4].name, "wall of thorns");
  assert.equal(byId.get("subdomain-tactics").domainSpells[7].name, "greater planar ally");
  assert.equal(byId.get("subdomain-ice").domainSpells[8].name, "polar ray");
  assert.equal(byId.get("subdomain-oceans").domainSpells[8].name, "tsunami");
  assert.equal(byId.get("subdomain-seasons").domainSpells[7].name, "sunburst");
  assert.equal(byId.get("subdomain-storms").domainSpells[5].name, "sirocco");
});

test("APG subdomain catalogue includes every unique entry from the published table", () => {
  const ids = new Set(domains.options.map((domain) => domain.id));
  const expected = [
    "cloud", "wind", "feather", "fur", "construct", "toil",
    ["azata", ["subdomain-azata-chaos", "subdomain-azata-good"]],
    ["demon", ["subdomain-demon-chaos", "subdomain-demon-evil"]],
    "protean", "love", "lust", "family", "home", "loss", "night", "murder", "undead", "catastrophe", "rage", "caves", "metal",
    "daemon", ["devil", ["subdomain-devil-evil", "subdomain-devil-law"]], "ash", "smoke", "heroism", "honor",
    "agathion", ["archon", ["subdomain-archon-good", "subdomain-archon-law"]], "restoration", "resurrection", "memory", "thought", "inevitable",
    "freedom", "revolution", "curse", "fate", "insanity", "nightmare", "arcane", "divine", "leadership", "martyr", "decay", "growth", "defense", "purity",
    "ancestors", "souls", "language", "wards", "ferocity", "resolve", "day", "light", "exploration", "trade", "deception", "thievery", "blood", "tactics", "ice", "oceans", "seasons", "storms"
  ];
  assert.equal(expected.length, 66);
  for (const entry of expected) {
    const [name, recordIds] = Array.isArray(entry) ? entry : [entry, [`subdomain-${entry}`]];
    for (const id of recordIds) assert.equal(ids.has(id), true, `missing APG subdomain ${name} (${id})`);
  }
});
