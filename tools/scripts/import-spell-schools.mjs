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
  if (typeof value !== "string") return [];
  const values = new Set([value]);
  const withoutParenthetical = value.replace(/\s*[\[(][^\])]*[\])]\s*$/, "").trim();
  if (withoutParenthetical) values.add(withoutParenthetical);

  const aliases = new Set();
  for (const candidate of values) {
    const normalized = normalizeName(candidate);
    if (!normalized) continue;
    aliases.add(normalized);
    const words = normalized.split(" ");
    const last = words.at(-1);
    if (ROMAN_TO_NUMBER[last]) aliases.add([...words.slice(0, -1), ROMAN_TO_NUMBER[last]].join(" "));
    if (NUMBER_TO_ROMAN[last]) aliases.add([...words.slice(0, -1), NUMBER_TO_ROMAN[last]].join(" "));
    if (MODIFIERS.has(last) && words.length > 1) aliases.add([last, ...words.slice(0, -1)].join(" "));
    const first = words[0];
    if (MODIFIERS.has(first) && words.length > 1) aliases.add([...words.slice(1), first].join(" "));
  }
  return [...aliases];
};

const headingName = (line) => {
  if (typeof line !== "string") return null;
  const markdown = line.match(/^#{2,6}\s+(.+?)\s*$/)?.[1];
  const directive = line.match(/^::h[2-6]\[(.+?)\](?:\{.*\})?\s*$/)?.[1];
  const heading = markdown ?? directive;
  return heading?.replace(/[*_`]/g, "").trim() || null;
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

const variantsByKey = new Map();
for (const [key, record] of records) {
  let currentName = typeof record.name === "string" ? record.name : key.replaceAll("_", " ");
  const variants = [];
  if (Array.isArray(record.description)) {
    for (const line of record.description) {
      currentName = headingName(line) ?? currentName;
      if (typeof line !== "string" || !line.startsWith("::spell{")) continue;
      const school = line.match(SCHOOL_PATTERN)?.[1]?.toLowerCase();
      if (school) variants.push({ name: currentName, school });
    }
  }
  variantsByKey.set(key, variants);
}

const resolvedSchools = new Map();
const resolveSchool = (key, requestedName, path = new Set()) => {
  const requestedAliases = new Set(aliasesFor(requestedName ?? key));
  const cacheKey = `${key}|${[...requestedAliases].sort().join("|")}`;
  if (resolvedSchools.has(cacheKey)) return resolvedSchools.get(cacheKey);
  if (path.has(cacheKey)) throw new Error(`Circular spell school inheritance: ${[...path, cacheKey].join(" -> ")}`);

  const record = records.get(key);
  if (!record) return null;
  const variants = variantsByKey.get(key) ?? [];
  const exactVariant = variants.find((variant) => aliasesFor(variant.name).some((alias) => requestedAliases.has(alias)));
  if (exactVariant) {
    resolvedSchools.set(cacheKey, exactVariant.school);
    return exactVariant.school;
  }

  const recordAliases = new Set([
    ...aliasesFor(key),
    ...(typeof record.name === "string" ? aliasesFor(record.name) : [])
  ]);
  const baseVariant = variants.find((variant) => aliasesFor(variant.name).some((alias) => recordAliases.has(alias))) ?? variants[0];
  const inheritedKey = typeof record.copyof === "string" ? record.copyof : typeof record.redirect === "string" ? record.redirect : null;
  const school = inheritedKey
    ? resolveSchool(inheritedKey, requestedName ?? record.name ?? key, new Set(path).add(cacheKey))
    : baseVariant?.school ?? null;
  resolvedSchools.set(cacheKey, school);
  return school;
};

const schoolsByName = {};
const setSchool = (alias, school, source) => {
  if (!alias || !school) return;
  const existing = schoolsByName[alias];
  if (existing && existing !== school) throw new Error(`Conflicting schools for alias ${alias}: ${existing} and ${school} (${source})`);
  schoolsByName[alias] = school;
};

for (const [key, variants] of variantsByKey) {
  for (const variant of variants) {
    for (const alias of aliasesFor(variant.name)) setSchool(alias, variant.school, `${key} variant ${variant.name}`);
  }
}

for (const [key, record] of records) {
  const requestedName = typeof record.name === "string" ? record.name : key.replaceAll("_", " ");
  const school = resolveSchool(key, requestedName);
  if (!school) continue;
  for (const alias of new Set([...aliasesFor(key), ...aliasesFor(requestedName)])) setSchool(alias, school, key);
}

const output = {
  source: {
    title: "Pf Data 1e spell catalogue",
    repository: "jasontankapps/pathfinder-data-1-e",
    commit: "33f1b75b8f62b43c59b96eab6bebb45e37c29229",
    files: SOURCE_FILES,
    license: "Open Game License 1.0a"
  },
  normalization: "NFKD lowercase alphanumeric words with section-aware inherited, modifier-order, parenthetical, and Roman numeral aliases",
  schoolsByName: Object.fromEntries(Object.entries(schoolsByName).sort(([left], [right]) => left.localeCompare(right)))
};
await mkdir(new URL("../../packages/data/src/spell-schools/", import.meta.url), { recursive: true });
await writeFile(new URL("../../packages/data/src/spell-schools/pathfinder-data-1e.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${Object.keys(schoolsByName).length} spell school aliases from ${sourceRecords} pinned OGL records across ${SOURCE_FILES.length} files.`);
