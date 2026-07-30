import { readdir, readFile, writeFile } from "node:fs/promises";

const arguments_ = process.argv.slice(2);
const importAll = arguments_.includes("--all");
const requestedSources = new Set(arguments_.filter((argument) => argument !== "--all"));
if (!importAll && !requestedSources.size) throw new Error("Pass --all or one or more exact source titles to import");
const inventory = JSON.parse(await readFile(new URL("../../.tmp/feat-expansion/inventory.json", import.meta.url), "utf8"));
const featDirectory = new URL("../../packages/data/src/feats/", import.meta.url);
const existing = [];
for (const file of await readdir(featDirectory)) {
  if (file.endsWith(".json")) existing.push(JSON.parse(await readFile(new URL(file, featDirectory), "utf8")));
}
const slug = (value) => value.toLowerCase().replace(/[’']/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const existingNames = new Set(existing.map((feat) => feat.name.toLowerCase()));
const occupiedIds = new Set(existing.map((feat) => feat.id));
const idByName = new Map(existing.map((feat) => [feat.name.toLowerCase(), feat.id]));
for (const feat of inventory.missing) {
  const normalizedName = feat.name.toLowerCase();
  if (idByName.has(normalizedName)) continue;
  const baseId = slug(feat.name);
  let id = baseId;
  if (occupiedIds.has(id)) id = `${baseId}-${slug(feat.sourceTitle)}`;
  let suffix = 2;
  while (occupiedIds.has(id)) {
    id = `${baseId}-${slug(feat.sourceTitle)}-${suffix}`;
    suffix += 1;
  }
  idByName.set(normalizedName, id);
  occupiedIds.add(id);
}
const namesLongestFirst = [...idByName.entries()].sort((a, b) => b[0].length - a[0].length);
const abilities = { Str: "strength", Dex: "dexterity", Con: "constitution", Int: "intelligence", Wis: "wisdom", Cha: "charisma" };

function parseSegment(segment, currentName) {
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
  consume(/\b(Str|Dex|Con|Int|Wis|Cha)\s*(\d+)\b/i, (match) => ({ type: "ability", key: abilities[match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()], minimum: Number(match[2]) }));
  consume(/\b(.+?)\s+(\d+)\s+ranks?\b/i, (match) => ({ type: "skill", key: match[1].trim(), minimum: Number(match[2]) }));
  consume(/\bability to cast\s+(.+)$/i, (match) => ({ type: "spell-access", id: slug(match[1]) }));
  consume(/\b(.+?)\s+class feature\b/i, (match) => ({ type: "feature", id: slug(match[1]) }));
  for (const [name, id] of namesLongestFirst) {
    if (name === currentName.toLowerCase()) continue;
    const index = remainder.toLowerCase().indexOf(name);
    if (index < 0) continue;
    prerequisites.push({ type: "feat", id });
    remainder = `${remainder.slice(0, index)} ${remainder.slice(index + name.length)}`;
  }
  remainder = remainder.replace(/^[,;\s]+|[,;\s]+$/g, "").replace(/\s+/g, " ");
  if (remainder && remainder !== "and") prerequisites.push({ type: "rule", description: remainder });
  return prerequisites;
}

const sourceAliases = { "PRPG Core Rulebook": "Core Rulebook" };
let created = 0;
for (const feat of inventory.missing) {
  if ((!importAll && !requestedSources.has(feat.sourceTitle)) || existingNames.has(feat.name.toLowerCase())) continue;
  const recordId = idByName.get(feat.name.toLowerCase());
  const record = {
    id: recordId,
    name: feat.name,
    type: feat.type,
    prerequisites: feat.prerequisiteText.split(/,(?![^()]*\))/).flatMap((segment) => parseSegment(segment, feat.name)),
    benefit: feat.benefit,
    source: { title: sourceAliases[feat.sourceTitle] ?? feat.sourceTitle, page: feat.sourcePage, url: feat.url }
  };
  await writeFile(new URL(`${record.id}.json`, featDirectory), `${JSON.stringify(record, null, 2)}\n`);
  existingNames.add(feat.name.toLowerCase());
  created += 1;
}
console.log(`Imported ${created} feats from ${importAll ? "all inventory sources" : [...requestedSources].join(", ")}.`);
