import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const catalogueUrl = "https://www.aonprd.com/Feats.aspx";
const featDirectory = new URL("../../packages/data/src/feats/", import.meta.url);
const outputDirectory = new URL("../../.tmp/feat-expansion/", import.meta.url);
const outputFile = new URL("inventory.json", outputDirectory);
const concurrency = 8;

const decode = (value) => value
  .replace(/<[^>]+>/g, " ")
  .replaceAll("&amp;", "&")
  .replaceAll("&nbsp;", " ")
  .replaceAll("&#39;", "'")
  .replaceAll("&apos;", "'")
  .replaceAll("&mdash;", "—")
  .replace(/\s+/g, " ")
  .trim();
const normalizedName = (value) => value.toLowerCase()
  .replace(/[\*⊤‡†]+/g, "")
  .replace(/\s+/g, " ")
  .trim();

const response = await fetch(catalogueUrl);
if (!response.ok) throw new Error(`Unable to download feat catalogue: ${response.status}`);
const html = await response.text();
const tableStart = html.indexOf('<th scope="col">Name</th><th scope="col">Prerequisite</th><th scope="col">Description</th>');
if (tableStart < 0) throw new Error("Unable to locate the feat catalogue table");
const rows = [...html.slice(tableStart).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map((row) => [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => decode(cell[1])))
  .filter((row) => row.length === 3);
const official = [...new Map(rows.map((row) => [normalizedName(row[0]), {
  name: row[0].replace(/[\*⊤‡†]+$/g, "").trim(),
  type: row[0].includes("*") ? "combat" : "general",
  prerequisiteText: row[1],
  benefit: row[2]
}])).values()];

const existing = [];
for (const file of await readdir(featDirectory)) {
  if (!file.endsWith(".json")) continue;
  existing.push(JSON.parse(await readFile(new URL(file, featDirectory), "utf8")));
}
const existingNames = new Set(existing.map((feat) => normalizedName(feat.name)));
const missing = official.filter((feat) => !existingNames.has(normalizedName(feat.name)));

await mkdir(outputDirectory, { recursive: true });
let prior = [];
try { prior = JSON.parse(await readFile(outputFile, "utf8")).missing ?? []; } catch {}
const enrichedByName = new Map(prior.map((feat) => [normalizedName(feat.name), feat]));

async function enrich(feat) {
  const cached = enrichedByName.get(normalizedName(feat.name));
  if (cached?.sourceTitle && cached.sourceTitle !== "Unknown source") {
    enrichedByName.set(normalizedName(feat.name), { ...feat, ...cached, type: feat.type });
    return;
  }
  const url = `https://www.aonprd.com/FeatDisplay.aspx?ItemName=${encodeURIComponent(feat.name)}`;
  const pageResponse = await fetch(url);
  if (!pageResponse.ok) throw new Error(`${feat.name}: ${pageResponse.status}`);
  const page = await pageResponse.text();
  const sourceMatch = page.match(/<b>Source<\/b>\s*<a[^>]*>\s*<i>([^<]+?)\s+pg\.\s*(\d+)<\/i>/i)
    ?? page.match(/Source\s*<a[^>]*>([^<]+?)\s+pg\.\s*(\d+)[^<]*<\/a>/i)
    ?? page.match(/Source\s*([^<\r\n]+?)\s+pg\.\s*(\d+)/i);
  enrichedByName.set(normalizedName(feat.name), {
    ...feat,
    sourceTitle: sourceMatch ? decode(sourceMatch[1]) : "Unknown source",
    sourcePage: sourceMatch ? Number(sourceMatch[2]) : null,
    url
  });
}

let cursor = 0;
let completed = enrichedByName.size;
const workers = Array.from({ length: concurrency }, async () => {
  while (cursor < missing.length) {
    const index = cursor++;
    await enrich(missing[index]);
    completed += 1;
    if (completed % 100 === 0) console.log(`Enriched ${Math.min(completed, missing.length)} of ${missing.length} missing feats`);
  }
});
await Promise.all(workers);

const enriched = missing.map((feat) => enrichedByName.get(normalizedName(feat.name)) ?? feat);
const sourceCounts = Object.entries(enriched.reduce((counts, feat) => {
  counts[feat.sourceTitle] = (counts[feat.sourceTitle] ?? 0) + 1;
  return counts;
}, {})).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count }));
await writeFile(outputFile, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  officialCount: official.length,
  existingCount: existing.length,
  matchedCount: official.length - missing.length,
  missingCount: missing.length,
  sourceCounts,
  missing: enriched
}, null, 2)}\n`);
console.log(`Wrote ${missing.length} missing feats across ${sourceCounts.length} sources to ${outputFile.pathname}`);
