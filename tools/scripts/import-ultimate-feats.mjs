import { readdir, readFile, writeFile } from "node:fs/promises";

const books = [
  {
    title: "Ultimate Magic",
    url: "https://legacy.aonprd.com/ultimateMagic/ultimateMagicFeats.html",
    headings: new Map([["Metamagic Feats", "metamagic"], ["Teamwork Feats", "teamwork"]])
  },
  {
    title: "Ultimate Combat",
    url: "https://legacy.aonprd.com/ultimateCombat/ultimateCombatFeats.html",
    headings: new Map([["Grit Feat", "grit"], ["Performance Feat", "performance"], ["Style Feat", "style"], ["Teamwork Feat", "teamwork"]])
  }
];

const featDirectory = new URL("../../packages/data/src/feats/", import.meta.url);
const entityMap = new Map([
  ["&amp;", "&"], ["&mdash;", "—"], ["&ndash;", "–"], ["&rsquo;", "’"],
  ["&#8217;", "’"], ["&#8220;", "“"], ["&#8221;", "”"], ["&nbsp;", " "], ["&#160;", " "]
]);
const clean = (value) => {
  let text = value.replace(/<[^>]+>/g, " ");
  for (const [entity, replacement] of entityMap) text = text.replaceAll(entity, replacement);
  return text.replace(/\s+/g, " ").trim();
};
const slug = (value) => value.toLowerCase()
  .replace(/[’']/g, "")
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const featId = (name) => name === "Snap Shot" ? "snap-shot-feat" : slug(name);

const existing = [];
for (const file of await readdir(featDirectory)) {
  if (!file.endsWith(".json")) continue;
  existing.push(JSON.parse(await readFile(new URL(file, featDirectory), "utf8")));
}
const existingNames = new Map(existing.map((feat) => [feat.name.toLowerCase(), feat.id]));

const extractRows = async (book) => {
  const response = await fetch(book.url);
  if (!response.ok) throw new Error(`Unable to download ${book.title}: ${response.status}`);
  const html = await response.text();
  const table = html.match(/<table[^>]*>[\s\S]*?<\/table>/i)?.[0];
  if (!table) throw new Error(`Unable to find the ${book.title} feat table`);
  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => clean(cell[1]))
  );
};

const allRows = [];
for (const book of books) {
  let category = "general";
  const seen = new Set();
  for (const cells of await extractRows(book)) {
    const rawName = cells[0] ?? "";
    const headingCategory = book.headings.get(rawName);
    if (headingCategory) { category = headingCategory; continue; }
    if (cells.length < 3 || !rawName || rawName === "Feat") continue;
    const combat = rawName.endsWith("*");
    const name = rawName.replace(/\*+$/, "").trim();
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    allRows.push({
      book,
      name,
      type: combat ? "combat" : category,
      prerequisiteText: cells[1],
      benefit: cells[2]
    });
  }
}

const allFeatNames = new Map([...existingNames]);
for (const row of allRows) allFeatNames.set(row.name.toLowerCase(), featId(row.name));
const featNamesLongestFirst = [...allFeatNames.entries()].sort((a, b) => b[0].length - a[0].length);
const abilities = new Map([
  ["Str", "strength"], ["Dex", "dexterity"], ["Con", "constitution"],
  ["Int", "intelligence"], ["Wis", "wisdom"], ["Cha", "charisma"]
]);

function parseSingleRequirement(segment, currentName) {
  const text = segment.trim().replace(/[.;]$/, "");
  if (!text || text === "—" || text === "-") return [];
  if (/\bor\b/i.test(text)) return [{ type: "rule", description: text }];

  const prerequisites = [];
  let remainder = text;
  const consume = (pattern, create) => {
    remainder = remainder.replace(pattern, (...match) => {
      prerequisites.push(create(match));
      return " ";
    });
  };

  consume(/\bbase attack bonus\s*\+?(\d+)\b/i, (match) => ({ type: "bab", minimum: Number(match[1]) }));
  consume(/\bcaster level\s*(\d+)(?:st|nd|rd|th)?\b/i, (match) => ({ type: "caster-level", minimum: Number(match[1]) }));
  consume(/\bcharacter level\s*(\d+)(?:st|nd|rd|th)?\b/i, (match) => ({ type: "level", minimum: Number(match[1]) }));
  consume(/\b([A-Za-z]+) level\s*(\d+)(?:st|nd|rd|th)?\b/i, (match) => ({ type: "class-level", classId: slug(match[1]), minimum: Number(match[2]) }));
  consume(/\b(Str|Dex|Con|Int|Wis|Cha)\s*(\d+)\b/i, (match) => ({ type: "ability", key: abilities.get(match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()), minimum: Number(match[2]) }));
  consume(/\b(.+?)\s+(\d+)\s+ranks?\b/i, (match) => ({ type: "skill", key: match[1].trim(), minimum: Number(match[2]) }));
  consume(/\bability to cast\s+(.+)$/i, (match) => ({ type: "spell-access", id: slug(match[1]) }));
  consume(/\b(.+?)\s+class feature\b/i, (match) => ({ type: "feature", id: slug(match[1]) }));

  for (const [lowerName, id] of featNamesLongestFirst) {
    if (lowerName === currentName.toLowerCase()) continue;
    const index = remainder.toLowerCase().indexOf(lowerName);
    if (index < 0) continue;
    prerequisites.push({ type: "feat", id });
    remainder = `${remainder.slice(0, index)} ${remainder.slice(index + lowerName.length)}`;
  }

  remainder = remainder.replace(/^[,\s]+|[,\s]+$/g, "").replace(/\s+/g, " ");
  if (remainder && remainder !== "and") prerequisites.push({ type: "rule", description: remainder });
  return prerequisites;
}

function parsePrerequisites(text, currentName) {
  if (!text || text === "—" || text === "-") return [];
  const segments = text.split(/,(?![^()]*\))/);
  return segments.flatMap((segment) => parseSingleRequirement(segment, currentName));
}

let created = 0;
for (const row of allRows) {
  if (existingNames.has(row.name.toLowerCase())) continue;
  const id = featId(row.name);
  const record = {
    id,
    name: row.name,
    type: row.type,
    prerequisites: parsePrerequisites(row.prerequisiteText, row.name),
    benefit: row.benefit,
    source: { title: row.book.title, page: null, url: row.book.url }
  };
  await writeFile(new URL(`${id}.json`, featDirectory), `${JSON.stringify(record, null, 2)}\n`);
  created += 1;
}

console.log(`Imported ${created} missing feats from the official Ultimate Magic and Ultimate Combat tables.`);
