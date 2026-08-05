import { readdir, readFile, writeFile } from "node:fs/promises";

const dataRoot = new URL("../../packages/data/src/", import.meta.url);
const normalize = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
async function loadDirectory(name) {
  const directory = new URL(`${name}/`, dataRoot);
  return Promise.all((await readdir(directory)).filter(file => file.endsWith(".json")).map(async file => JSON.parse(await readFile(new URL(file, directory), "utf8"))));
}

const records = [
  ...await loadDirectory("spells"),
  ...(await loadDirectory("spell-catalogues"))
    .filter(catalogue => catalogue.source?.title !== "Archives of Nethys class spell lists")
    .flatMap(catalogue => catalogue.spells ?? [])
];
const idsByName = new Map();
const existingIds = new Set(records.map(spell => spell.id));
for (const spell of records) {
  const key = normalize(spell.name);
  if (!idsByName.has(key)) idsByName.set(key, []);
  if (!idsByName.get(key).includes(spell.id)) idsByName.get(key).push(spell.id);
}

const classes = ["Alchemist", "Arcanist", "Bloodrager", "Hunter", "Inquisitor", "Investigator", "Magus", "Medium", "Mesmerist", "Occultist", "Oracle", "Psychic", "Shaman", "Skald", "Spiritualist", "Summoner", "Warpriest", "Witch", "Cleric"];
const levelsBySpellId = {};
const missing = [];
const importedSpellsByName = new Map();
const preferredAmbiguousIds = new Map([[normalize("Owl's Wisdom, Mass"), "owls-wisdom-mass"]]);
for (const className of classes) {
  const classId = className.toLowerCase();
  const url = `https://www.aonprd.com/Spells.aspx?Class=${encodeURIComponent(className)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const html = await response.text();
  const sections = [...html.matchAll(/<h2[^>]*>(\d+)(?:st|nd|rd|th)?-Level<\/h2>(.*?)(?=<h2|<\/span>)/gis)];
  let imported = 0;
  for (const [, rawLevel, section] of sections) {
    const level = Number(rawLevel);
    for (const match of section.matchAll(/SpellDisplay\.aspx\?ItemName=([^"&]+)"[^>]*>(?:<img[^>]*>)?\s*([^<]+)<\/a><\/b>:\s*(.*?)<br\s*\/?>/gi)) {
      const name = match[2].trim();
      const key = normalize(name);
      const candidates = idsByName.get(key) ?? [];
      let spellId = candidates.length === 1 ? candidates[0] : preferredAmbiguousIds.get(key);
      if (!spellId) {
        const existingImport = importedSpellsByName.get(key);
        if (existingImport) spellId = existingImport.id;
        else {
          const baseId = `later-spell-${key.replace(/ /g, "-")}`;
          spellId = existingIds.has(baseId) ? `${baseId}-aon` : baseId;
          existingIds.add(spellId);
          const summary = match[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          importedSpellsByName.set(key, {
            id: spellId,
            name,
            levelByClass: {},
            summary,
            source: { title: "Archives of Nethys", page: null, url: `https://www.aonprd.com/SpellDisplay.aspx?ItemName=${match[1]}` }
          });
        }
      }
      levelsBySpellId[spellId] = { ...(levelsBySpellId[spellId] ?? {}), [classId]: level };
      const importedSpell = importedSpellsByName.get(key);
      if (importedSpell) importedSpell.levelByClass[classId] = level;
      imported += 1;
    }
  }
  console.log(`${className}: imported ${imported} exact spell levels.`);
}

const overlay = {
  source: { title: "Archives of Nethys class spell lists", url: "https://www.aonprd.com/Spells.aspx?Class=All" },
  levelsBySpellId
};
await writeFile(new URL("spell-class-levels/later-classes-exact.json", dataRoot), `${JSON.stringify(overlay, null, 2)}\n`);
await writeFile(new URL("spell-catalogues/later-class-exclusive.json", dataRoot), `${JSON.stringify({ source: overlay.source, spells: [...importedSpellsByName.values()] }, null, 2)}\n`);
await writeFile(new URL("../../generated/later-spell-list-unmatched.json", import.meta.url), `${JSON.stringify(missing, null, 2)}\n`);
console.log(`Imported exact levels for ${Object.keys(levelsBySpellId).length} unique spells, including ${importedSpellsByName.size} newly catalogued spells.`);
