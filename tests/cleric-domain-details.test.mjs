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

test("APG Glory and Knowledge subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-heroism", "domain-glory", "Divine Presence", "Aura of Heroism"],
    ["subdomain-honor", "domain-glory", "Touch of Glory", "Honor Bound"],
    ["subdomain-memory", "domain-knowledge", "Lore Keeper", "Recall"],
    ["subdomain-thought", "domain-knowledge", "Remote Viewing", "Read Minds"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.ok(subdomain.powers.some((power) => power.name === replacementPower));
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
  assert.equal(byId.get("subdomain-heroism").domainSpells[5].name, "greater heroism");
  assert.equal(byId.get("subdomain-honor").domainSpells[1].name, "zone of truth");
  assert.equal(byId.get("subdomain-memory").domainSpells[7].name, "moment of prescience");
  assert.equal(byId.get("subdomain-thought").domainSpells[4].name, "telepathic bond");
});

test("APG Law, Liberation, and Luck subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-inevitable", "domain-law", "Touch of Law", "Command"],
    ["subdomain-freedom", "domain-liberation", "Liberation", "Liberty's Blessing"],
    ["subdomain-revolution", "domain-liberation", "Freedom's Call", "Powerful Persuader"],
    ["subdomain-curse", "domain-luck", "Bit of Luck", "Malign Eye"],
    ["subdomain-fate", "domain-luck", "Good Fortune", "Tugging Strands"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.ok(subdomain.powers.some((power) => power.name === replacementPower));
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1,2,3,4,5,6,7,8,9]);
  }
  assert.equal(byId.get("subdomain-inevitable").domainSpells[5].name, "planar binding (inevitables only)");
  assert.equal(byId.get("subdomain-freedom").domainSpells[4].name, "plane shift");
  assert.equal(byId.get("subdomain-revolution").domainSpells[5].name, "symbol of persuasion");
  assert.equal(byId.get("subdomain-curse").domainSpells[5].name, "eyebite");
  assert.equal(byId.get("subdomain-fate").domainSpells[2].name, "borrow fortune");
});

test("APG Madness, Magic, and Nobility subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-insanity", "domain-madness", "Vision of Madness", "Insane Focus"],
    ["subdomain-nightmare", "domain-madness", "Vision of Madness", "Fearful Touch"],
    ["subdomain-arcane", "domain-magic", "Hand of the Acolyte", "Arcane Beacon"],
    ["subdomain-divine", "domain-magic", "Hand of the Acolyte", "Divine Vessel"],
    ["subdomain-leadership", "domain-nobility", "Inspiring Word", "Inspiring Command"],
    ["subdomain-martyr", "domain-nobility", "Leadership", "Sacrificial Bond"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.equal(subdomain.powers.length, 2);
    assert.equal(subdomain.powers.some((power) => power.name === replacementPower), true);
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
  assert.equal(byId.get("subdomain-insanity").domainSpells[5].name, "phantasmal web");
  assert.equal(byId.get("subdomain-nightmare").domainSpells[5].name, "cloak of dreams");
  assert.equal(byId.get("subdomain-arcane").domainSpells[3].name, "arcane eye");
  assert.equal(byId.get("subdomain-divine").domainSpells[8].name, "miracle");
  assert.equal(byId.get("subdomain-leadership").domainSpells[5].name, "brilliant inspiration");
  assert.equal(byId.get("subdomain-martyr").domainSpells[5].name, "sacrificial oath");
});

test("APG Protection, Repose, and Rune subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-defense", "domain-protection", "Resistant Touch", "Deflection Aura"],
    ["subdomain-purity", "domain-protection", "Aura of Protection", "Purifying Touch"],
    ["subdomain-ancestors", "domain-repose", "Ward Against Death", "Speak With Dead"],
    ["subdomain-souls", "domain-repose", "Gentle Rest", "Touch the Spirit World"],
    ["subdomain-language", "domain-rune", "Spell Rune", "Rune Shift"],
    ["subdomain-wards", "domain-rune", "Spell Rune", "Warding Rune"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.equal(subdomain.powers.length, 2);
    assert.equal(subdomain.powers.some((power) => power.name === replacementPower), true);
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
  assert.equal(byId.get("subdomain-defense").domainSpells[6].name, "deflection");
  assert.equal(byId.get("subdomain-purity").domainSpells[4].name, "atonement");
  assert.equal(byId.get("subdomain-ancestors").domainSpells[3].name, "rest eternal");
  assert.equal(byId.get("subdomain-souls").domainSpells[8].name, "trap the soul");
  assert.equal(byId.get("subdomain-language").domainSpells[4].name, "telepathic bond");
  assert.equal(byId.get("subdomain-wards").domainSpells[5].name, "guards and wards");
});

test("APG Strength, Sun, and Travel subdomains expose complete replacements", () => {
  const byId = new Map(domains.options.map((domain) => [domain.id, domain]));
  const expected = [
    ["subdomain-ferocity", "domain-strength", "Strength Surge", "Ferocious Strike"],
    ["subdomain-resolve", "domain-strength", "Might of the Gods", "Bestow Resolve"],
    ["subdomain-day", "domain-sun", "Nimbus of Light", "Day's Resurgence"],
    ["subdomain-light", "domain-sun", "Sun's Blessing", "Blinding Flash"],
    ["subdomain-exploration", "domain-travel", "Agile Feet", "Door Sight"],
    ["subdomain-trade", "domain-travel", "Agile Feet", "Silver-Tongued Haggler"]
  ];
  for (const [id, parentDomainId, replacesPower, replacementPower] of expected) {
    const subdomain = byId.get(id);
    assert.equal(subdomain.parentDomainId, parentDomainId);
    assert.equal(subdomain.replacesPower, replacesPower);
    assert.equal(subdomain.powers.length, 2);
    assert.equal(subdomain.powers.some((power) => power.name === replacementPower), true);
    assert.deepEqual(subdomain.domainSpells.map((spell) => spell.level), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
  assert.equal(byId.get("subdomain-ferocity").domainSpells[5].name, "mass bull's strength");
  assert.equal(byId.get("subdomain-resolve").domainSpells[5].name, "heroes' feast");
  assert.equal(byId.get("subdomain-day").domainSpells[1].name, "continual flame");
  assert.equal(byId.get("subdomain-light").domainSpells[0].name, "faerie fire");
  assert.equal(byId.get("subdomain-exploration").domainSpells[8].name, "world wave");
  assert.equal(byId.get("subdomain-trade").domainSpells[4].name, "overland flight");
});

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
    "protean", "love", "lust",
    "family", "home", "loss", "night", "murder", "undead", "catastrophe", "rage", "caves", "metal",
    "daemon", ["devil", ["subdomain-devil-evil", "subdomain-devil-law"]], "ash", "smoke", "heroism", "honor",
    "agathion", ["archon", ["subdomain-archon-good", "subdomain-archon-law"]], "restoration",
    "resurrection", "memory", "thought", "inevitable", "freedom", "revolution", "curse", "fate", "insanity",
    "nightmare", "arcane", "divine", "leadership", "martyr", "decay", "growth", "defense", "purity",
    "ancestors", "souls", "language", "wards", "ferocity", "resolve", "day", "light", "exploration", "trade",
    "deception", "thievery", "blood", "tactics", "ice", "oceans", "seasons", "storms"
  ];
  assert.equal(expected.length, 66);
  for (const entry of expected) {
    const [name, recordIds] = Array.isArray(entry) ? entry : [entry, [`subdomain-${entry}`]];
    for (const id of recordIds) {
      assert.equal(ids.has(id), true, `missing APG subdomain ${name} (${id})`);
    }
  }
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
