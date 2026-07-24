import { mkdir, writeFile } from "node:fs/promises";

const SOURCE_BASE = "https://raw.githubusercontent.com/jasontankapps/pathfinder-data-1-e/33f1b75b8f62b43c59b96eab6bebb45e37c29229/json/";
const SOURCE_FILES = ["spells.json", ...Array.from({ length: 15 }, (_, index) => `spells${index + 2}.json`)];
const SCHOOL_PATTERN = /\b(abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation|universal)\b/i;

const normalizeName = (name) => name
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const schoolsByName = {};
let sourceRecords = 0;
for (const filename of SOURCE_FILES) {
  const response = await fetch(`${SOURCE_BASE}${filename}`);
  if (!response.ok) throw new Error(`Unable to fetch pinned spell data ${filename}: ${response.status} ${response.statusText}`);
  const source = await response.json();
  sourceRecords += Object.keys(source).length;
  for (const record of Object.values(source)) {
    if (!record || typeof record.name !== "string" || !Array.isArray(record.description)) continue;
    const directives = record.description.filter((line) => typeof line === "string" && line.startsWith("::spell{"));
    const school = directives.map((directive) => directive.match(SCHOOL_PATTERN)?.[1]?.toLowerCase()).find(Boolean);
    if (!school) continue;
    const key = normalizeName(record.name);
    if (!key) continue;
    const existing = schoolsByName[key];
    if (existing && existing !== school) throw new Error(`Conflicting schools for ${record.name}: ${existing} and ${school}`);
    schoolsByName[key] = school;
  }
}

const output = {
  source: {
    title: "Pf Data 1e spell catalogue",
    repository: "jasontankapps/pathfinder-data-1-e",
    commit: "33f1b75b8f62b43c59b96eab6bebb45e37c29229",
    files: SOURCE_FILES,
    license: "Open Game License 1.0a"
  },
  normalization: "NFKD lowercase alphanumeric words",
  schoolsByName: Object.fromEntries(Object.entries(schoolsByName).sort(([left], [right]) => left.localeCompare(right)))
};
await mkdir(new URL("../../packages/data/src/spell-schools/", import.meta.url), { recursive: true });
await writeFile(new URL("../../packages/data/src/spell-schools/pathfinder-data-1e.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${Object.keys(schoolsByName).length} spell school mappings from ${sourceRecords} pinned OGL records across ${SOURCE_FILES.length} files.`);
