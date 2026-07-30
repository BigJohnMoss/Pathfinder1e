import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const arguments_ = process.argv.slice(2);
const importAll = arguments_.includes("--all");
const limitArgument = arguments_.find((argument) => argument.startsWith("--limit="));
const limit = limitArgument ? Number(limitArgument.split("=")[1]) : null;
if (!importAll && !Number.isInteger(limit)) throw new Error("Pass --all or --limit=N");

const root = new URL("../../", import.meta.url);
const featDirectory = new URL("packages/data/src/feats/", root);
const outputDirectory = new URL("packages/data/src/feat-details/", root);
const outputFile = new URL("aon-feat-details.json", outputDirectory);
const cacheDirectory = new URL(".tmp/feat-details-v2/", root);
const concurrency = 10;
const detailPageName = (name) => name
  .replace(/[\*†‡⊤]+$/g, "")
  .replace(/^Armor Proficiency \((Light|Medium|Heavy)\)$/, "Armor Proficiency, $1")
  .replace(/^Pass for Human$/, "Pass For Human")
  .replace(/^Sword And Pistol$/, "Sword and Pistol")
  .trim();

const decode = (value) => value
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const hexadecimal = code[1]?.toLowerCase() === "x";
    const point = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
  })
  .replace(/[ \t]+\n/g, "\n")
  .replace(/\n[ \t]+/g, "\n")
  .replace(/[ \t]{2,}/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

function parsePage(html, feat) {
  const match = html.match(/<span id="MainContent_DataListTypes_LabelName_0">([\s\S]*?)<\/span>/i);
  if (!match) throw new Error(`${feat.name}: feat detail block not found`);
  let content = match[1]
    .replace(/<h1[\s\S]*?<\/h1>/i, "")
    .replace(/<b>Source<\/b>[\s\S]*?<br\s*\/?>/i, "");
  content = content.split(/<h2[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>/i, 1)[0];
  const labelled = [...content.matchAll(/<b>([^<]+)<\/b>\s*:?\s*/gi)];
  const firstLabelIndex = labelled[0]?.index ?? content.length;
  const description = decode(content.slice(0, firstLabelIndex));
  const sections = labelled.map((label, index) => {
    const start = (label.index ?? 0) + label[0].length;
    const end = labelled[index + 1]?.index ?? content.length;
    return { label: decode(label[1]).replace(/:$/, ""), text: decode(content.slice(start, end)) };
  }).filter((section) => section.label && section.text);
  const benefit = sections.find((section) => section.label.toLowerCase() === "benefit")?.text;
  if (!benefit) throw new Error(`${feat.name}: Benefit section not found`);
  return { id: feat.id, description, sections };
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

await mkdir(outputDirectory, { recursive: true });
await mkdir(cacheDirectory, { recursive: true });
const files = (await readdir(featDirectory)).filter((file) => file.endsWith(".json")).sort();
const allFeats = await Promise.all(files.map(async (file) => JSON.parse(await readFile(new URL(file, featDirectory), "utf8"))));
const feats = limit ? allFeats.slice(0, limit) : allFeats;
let cursor = 0;
let completed = 0;
const details = new Array(feats.length);
const failures = [];

const workers = Array.from({ length: Math.min(concurrency, feats.length) }, async () => {
  while (cursor < feats.length) {
    const index = cursor++;
    const feat = feats[index];
    const cacheFile = new URL(`${feat.id}.json`, cacheDirectory);
    try {
      try {
        details[index] = JSON.parse(await readFile(cacheFile, "utf8"));
      } catch {
        const detailUrl = `https://www.aonprd.com/FeatDisplay.aspx?ItemName=${encodeURIComponent(detailPageName(feat.name))}`;
        const html = await fetchWithRetry(detailUrl);
        details[index] = parsePage(html, feat);
        await writeFile(cacheFile, `${JSON.stringify(details[index], null, 2)}\n`);
      }
    } catch (error) {
      failures.push({ id: feat.id, name: feat.name, url: feat.source.url, error: error instanceof Error ? error.message : String(error) });
    }
    completed += 1;
    if (completed % 100 === 0 || completed === feats.length) console.log(`Imported ${completed} of ${feats.length} feat detail pages`);
  }
});
await Promise.all(workers);

if (importAll) {
  const completeDetails = details.filter(Boolean);
  await writeFile(outputFile, `${JSON.stringify({ source: "Archives of Nethys", feats: completeDetails, failures }, null, 2)}\n`);
  console.log(`Updated ${outputFile.pathname} with ${completeDetails.length} complete feat records and ${failures.length} unresolved pages.`);
} else {
  console.log(`Validated ${details.length} feat detail pages without replacing the full overlay.`);
}
