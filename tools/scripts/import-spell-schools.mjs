import { mkdir, writeFile } from "node:fs/promises";

const SOURCE_BASE = "https://raw.githubusercontent.com/jasontankapps/pathfinder-data-1-e/33f1b75b8f62b43c59b96eab6bebb45e37c29229/json/";
const SOURCE_FILES = ["spells.json", ...Array.from({ length: 15 }, (_, index) => `spells${index + 2}.json`)];
const SCHOOL_PATTERN = /\b(abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation|universal)\b/i;
const ROMAN_TO_NUMBER = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9" };
const NUMBER_TO_ROMAN = Object.fromEntries(Object.entries(ROMAN_TO_NUMBER).map(([roman, number]) => [number, roman]));
const MODIFIERS = new Set(["communal", "greater", "lesser", "mass"]);

const normalizeName = (name) => name
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const aliasesFor = (value) => {
  const normalized = normalizeName(value);
  if (!normalized) return [];
  const aliases = new Set([normalized]);
  const withoutParenthetical = normalized.replace(/\s+\([^)]*\)$/, "").trim();
  if (withoutParenthetical) aliases.add(withoutParenthetical);

  const words = normalized.split(" ");
  const last = words.at(-1);
  if (ROMAN_TO_NUMBER[last]) aliases.add([...words.slice(0, -1), ROMAN_TO_NUMBER[last]].join(" "));
  if (NUMBER_TO_ROMAN[last]) aliases.add([...words.slice(0, -1), NUMBER_TO_ROMAN[last]].join(" "));

  if (MODIFIERS.has(last) && words.length > 1) aliases.add([last, ...words.slice(0, -1)].join(" "));
  const first = words[0];
  if (MODIFIERS.has(first) && words.length > 1) aliases.add([...words.slice(1), first].join(" "));
  return [...aliases];
};

const records = new Map();
let sourceRecords = 0;
for (const filename of SOURCE_FILES) {
  const response = await fetch(`${SOURCE_BASE}${filename}`);
  if (!response.ok) throw new Error(`Unable to fetch pinned spell data ${filename}: ${response.status} ${response.statusText}`);
  const source = await response.json();
  sourceRecords += Object.keys(source).length;
  for (const [key, record] of Object.entries(source)) records.set(key, record);
}

const resolvedSchools = new Map();
const resolveSchool = (key, path = new Set()) => {
  if (resolvedSchools.has(key)) return resolvedSchools.get(key);
  if (path.has(key)) throw new Error(`Circular spell school inheritance: ${[...path, key].join(" -> ")}`);
  const record = records.get(key);
  if (!record) return null;
  const nextPath = new Set(path).add(key);
  const directives = Array.isArray(record.description)
    ? record.description.filter((line) => typeof line === "string" && line.startsWith("::spell{"))
    : [];
  const directSchools = [...new Set(directives.map((directive) => directive.match(SCHOOL_PATTERN)?.[1]?.toLowerCase()).filter(Boolean))];
  if (directSchools.length > 1) throw new Error(`Conflicting direct schools for ${key}: ${directSchools.join(", ")}`);
  const inheritedKey = typeof record.copyof === "string" ? record.copyof : typeof record.redirect === "string" ? record.redirect : null;
  const school = directSchools[0] ?? (inheritedKey ? resolveSchool(inheritedKey, nextPath) : null);
  resolvedSchools.set(key, school);
  return school;
};

const schoolsByName = {};
for (const [key, record] of records) {
  const school = resolveSchool(key);
  if (!school) continue;
  const aliases = new Set([...aliasesFor(key), ...(typeof record.name === "string" ? aliasesFor(record.name) : [])]);
  for (const alias of aliases) {
    const existing = schoolsByName[alias];
    if (existing && existing !== school) throw new Error(`Conflicting schools for alias ${alias}: ${existing} and ${school}`);
    schoolsByName[alias] = school;
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
  normalization: "NFKD lowercase alphanumeric words with inherited, modifier-order, and Roman numeral aliases",
  schoolsByName: Object.fromEntries(Object.entries(schoolsByName).sort(([left], [right]) => left.localeCompare(right)))
};
await mkdir(new URL("../../packages/data/src/spell-schools/", import.meta.url), { recursive: true });
await writeFile(new URL("../../packages/data/src/spell-schools/pathfinder-data-1e.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${Object.keys(schoolsByName).length} spell school aliases from ${sourceRecords} pinned OGL records across ${SOURCE_FILES.length} files.`);
