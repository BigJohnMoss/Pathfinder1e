import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const featDirectory = new URL("../../packages/data/src/feats/", import.meta.url);
const outputDirectory = new URL("../../packages/data/src/feat-categories/", import.meta.url);
const outputFile = new URL("aon-teamwork.json", outputDirectory);
const sourceUrl = "https://aonprd.com/Feats.aspx?Category=Teamwork";

const decode = (value) => value
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&amp;/gi, "&")
  .replace(/&mdash;|&ndash;/gi, "-")
  .replace(/&nbsp;/gi, " ");
const clean = (value) => decode(String(value).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const normalize = (value) => clean(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[’']/g, "'")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const response = await fetch(sourceUrl);
if (!response.ok) throw new Error(`Unable to download the Archives of Nethys teamwork feat index: ${response.status}`);
const html = await response.text();
const published = [];
for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
  const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
  if (!cells.length || !/FeatDisplay\.aspx\?ItemName=/i.test(cells[0][1])) continue;
  const label = clean(cells[0][1]);
  const name = label.replace(/\*+$/, "").trim();
  if (name) published.push({ name, types: label.endsWith("*") ? ["combat", "teamwork"] : ["teamwork"] });
}
if (published.length < 100) throw new Error(`Expected at least 100 teamwork feats, found ${published.length}`);

const featFiles = (await readdir(featDirectory)).filter((file) => file.endsWith(".json"));
const idsByName = new Map();
for (const file of featFiles) {
  const feat = JSON.parse(await readFile(new URL(file, featDirectory), "utf8"));
  const key = normalize(feat.name);
  idsByName.set(key, [...(idsByName.get(key) ?? []), feat.id]);
}

const categoriesByFeatId = {};
const unmatched = [];
for (const feat of published) {
  const ids = idsByName.get(normalize(feat.name)) ?? [];
  if (!ids.length) unmatched.push(feat.name);
  for (const id of ids) categoriesByFeatId[id] = feat.types;
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, `${JSON.stringify({
  source: { title: "Archives of Nethys teamwork feat index", url: sourceUrl },
  categoriesByFeatId,
}, null, 2)}\n`);
console.log(`Imported category metadata for ${Object.keys(categoriesByFeatId).length} feat records (${unmatched.length} published feats are not in the local catalog).`);
if (unmatched.length) console.log(`Unmatched: ${unmatched.join(", ")}`);
