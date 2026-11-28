import { readdir, readFile, writeFile } from "node:fs/promises";
import { parseClassSpellList } from "./aon-spell-list.mjs";

const dataRoot = new URL("../../packages/data/src/", import.meta.url);
const normalize = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
async function loadDirectory(name) {
  const directory = new URL(`${name}/`, dataRoot);
  return Promise.all((await readdir(directory)).filter(file => file.endsWith(".json")).map(async file => JSON.parse(await readFile(new URL(file, directory), "utf8"))));
}

const sourceTitle = "Archives of Nethys class spell lists";
const classes = ["Alchemist", "Arcanist", "Bloodrager", "Hunter", "Inquisitor", "Investigator", "Magus", "Medium", "Mesmerist", "Occultist", "Oracle", "Psychic", "Shaman", "Skald", "Spiritualist", "Summoner", "Warpriest", "Witch", "Cleric"];
const existingClassesArg = process.argv.slice(2).find(argument => argument.startsWith("--existing-classes="));
const existingClasses = existingClassesArg?.slice("--existing-classes=".length).split(",").map(name => name.trim().toLowerCase());
if (existingClasses?.some(name => !classes.some(className => className.toLowerCase() === name))) {
  throw new Error("Pass supported class names to --existing-classes, separated by commas.");
}
const importClasses = existingClasses ? classes.filter(name => existingClasses.includes(name.toLowerCase())) : classes;
const levelFile = new URL("spell-class-levels/later-classes-exact.json", dataRoot);
const records = [
  ...await loadDirectory("spells"),
  ...(await loadDirectory("spell-catalogues"))
    .filter(catalogue => existingClasses || catalogue.source?.title !== sourceTitle)
    .flatMap(catalogue => catalogue.spells ?? [])
];
const idsByName = new Map();
const existingIds = new Set(records.map(spell => spell.id));
for (const spell of records) {
  const key = normalize(spell.name);
  if (!idsByName.has(key)) idsByName.set(key, []);
  if (!idsByName.get(key).includes(spell.id)) idsByName.get(key).push(spell.id);
}

const levelsBySpellId = existingClasses ? JSON.parse(await readFile(levelFile, "utf8")).levelsBySpellId : {};
const missing = [];
const importedSpellsByName = new Map();
const preferredAmbiguousIds = new Map([[normalize("Owl's Wisdom, Mass"), "owls-wisdom-mass"]]);
for (const className of importClasses) {
  const classId = className.toLowerCase();
  const url = `https://www.aonprd.com/Spells.aspx?Class=${encodeURIComponent(className)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const entries = parseClassSpellList(await response.text());
  if (!entries.length) throw new Error(`Found no spell rows for ${className} at ${url}.`);
  let imported = 0;
  for (const { itemName, name, level, summary } of entries) {
    const key = normalize(name);
    const candidates = idsByName.get(key) ?? [];
    let spellId = candidates.length === 1 ? candidates[0] : preferredAmbiguousIds.get(key);
    if (!spellId && existingClasses) {
      missing.push({ classId, name, level, candidateIds: candidates });
      continue;
    }
    if (!spellId) {
      const existingImport = importedSpellsByName.get(key);
      if (existingImport) spellId = existingImport.id;
      else {
        const baseId = `later-spell-${key.replace(/ /g, "-")}`;
        spellId = existingIds.has(baseId) ? `${baseId}-aon` : baseId;
        existingIds.add(spellId);
        importedSpellsByName.set(key, {
          id: spellId,
          name,
          levelByClass: {},
          summary,
          source: { title: "Archives of Nethys", page: null, url: `https://www.aonprd.com/SpellDisplay.aspx?ItemName=${itemName}` }
        });
      }
    }
    levelsBySpellId[spellId] = { ...(levelsBySpellId[spellId] ?? {}), [classId]: level };
    const importedSpell = importedSpellsByName.get(key);
    if (importedSpell) importedSpell.levelByClass[classId] = level;
    imported += 1;
  }
  console.log(`${className}: imported ${imported} exact spell levels.`);
}

const overlay = {
  source: { title: sourceTitle, url: "https://www.aonprd.com/Spells.aspx?Class=All" },
  levelsBySpellId
};
await writeFile(levelFile, `${JSON.stringify(overlay, null, 2)}\n`);
if (!existingClasses) {
  await writeFile(new URL("spell-catalogues/later-class-exclusive.json", dataRoot), `${JSON.stringify({ source: overlay.source, spells: [...importedSpellsByName.values()] }, null, 2)}\n`);
}
await writeFile(new URL("../../generated/later-spell-list-unmatched.json", import.meta.url), `${JSON.stringify(missing, null, 2)}\n`);
console.log(`Imported exact levels for ${Object.keys(levelsBySpellId).length} unique spells, including ${importedSpellsByName.size} newly catalogued spells.`);
