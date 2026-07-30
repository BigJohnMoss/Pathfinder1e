import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const classArgument = process.argv.find((argument) => argument.startsWith("--className=") || argument.startsWith("--class="));
const className = classArgument?.slice(classArgument.indexOf("=") + 1) ?? process.env.npm_config_classname;
if (!className) throw new Error("Pass --className=ClassName");
const overwrite = process.argv.includes("--force");
const classId = className.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const root = new URL("../../", import.meta.url);
const outputDirectory = new URL("packages/data/src/archetypes/", root);
const classRecord = JSON.parse(await readFile(new URL(`packages/data/src/classes/${classId}.json`, root), "utf8"));

const slug = (value) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const clean = (value) => value
  .replace(/\u00e2\u20ac\u2122/g, "\u2019")
  .replace(/\u00e2\u20ac\u0153/g, "\u201c")
  .replace(/\u00e2\u20ac\u009d/g, "\u201d")
  .replace(/\u00e2\u20ac\u201c/g, "\u2013")
  .replace(/\u00e2\u20ac\u201d/g, "\u2014")
  .replace(/\u00a0/g, " ")
  .replace(/[ \t]+\n/g, "\n")
  .replace(/\n[ \t]+/g, "\n")
  .replace(/[ \t]{2,}/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

async function fetchDocument(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const html = new TextDecoder("windows-1252").decode(await response.arrayBuffer());
  return new JSDOM(html).window.document;
}

function indexEntries(document) {
  return [...document.querySelectorAll("table tr")].flatMap((row) => {
    const cells = [...row.querySelectorAll("td")];
    const link = cells[0]?.querySelector('a[href*="ArchetypeDisplay.aspx"]');
    if (!link || cells.length < 3) return [];
    return [{
      name: clean(link.textContent),
      url: new URL(link.getAttribute("href"), "https://www.aonprd.com/").href,
      replacesText: clean(cells[1].textContent),
      summary: clean(cells[2].textContent)
    }];
  });
}

function replacedFeatureIds(replacesText) {
  const matches = new Set();
  const addProgression = (key, levels = []) => {
    for (const feature of classRecord.features) {
      if (feature.progressionKey === key && (!levels.length || levels.includes(feature.level))) matches.add(feature.id);
    }
  };
  const addFeature = (id) => {
    if (classRecord.features.some((feature) => feature.id === id)) matches.add(id);
  };

  for (const clause of replacesText.split(";")) {
    const levels = [...clause.matchAll(/\b(\d+)(?:st|nd|rd|th)\b/gi)].map((match) => Number(match[1]));
    const normalized = clause.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const target = normalized
      .replace(/\b\d+(?:st|nd|rd|th)?\b/g, "")
      .replace(/\blevel\b/g, "")
      .replace(/\b(?:and|the|class|feature|features|gained|at)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    for (const feature of classRecord.features) {
      if (levels.length && !levels.includes(feature.level)) continue;
      const candidates = [feature.name, feature.progressionKey ?? ""].map((value) => value
        .toLowerCase()
        .replace(/\b\d+d\d+\b/g, "")
        .replace(/\b[+-]?\d+\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(new RegExp(`\\b${classId}\\b`, "g"), "")
        .replace(/\s+/g, " ")
        .trim());
      if (candidates.some((candidate) => candidate && (target.includes(candidate) || candidate.includes(target)))) matches.add(feature.id);
    }

    if (/\b(?:arcane|arcanist) exploit/.test(normalized)) addProgression("arcanist-exploit", levels);
    if (/\barcane reservoir\b/.test(normalized)) addProgression("arcane-reservoir", levels);
    if (/\bconsume spells?\b/.test(normalized)) addFeature("consume-spells-1");
    if (/\bmagical supremacy\b/.test(normalized)) addFeature("magical-supremacy-20");
    if (classId === "arcanist" && /\bspellbooks?\b|\bspells?\b/.test(normalized)) addProgression("arcanist-spellcasting", levels);
  }

  return [...matches];
}

function detailFeatures(document, archetypeId) {
  const content = document.querySelector("#MainContent_DataListTypes_LabelName_0");
  if (!content) throw new Error(`${archetypeId}: archetype detail block not found`);
  const headings = [...content.querySelectorAll("b")].filter((heading) => clean(heading.textContent).toLowerCase() !== "source");
  return headings.map((heading, index) => {
    const fragments = [];
    let node = heading.nextSibling;
    const nextHeading = headings[index + 1];
    while (node && node !== nextHeading) {
      if (node.nodeType === 1 && node.tagName === "B") break;
      fragments.push(node.textContent ?? "");
      node = node.nextSibling;
    }
    const summary = clean(fragments.join(" ")).replace(/^:\s*/, "");
    if (!summary) return null;
    const level = Number(summary.match(/\b(?:at|upon reaching)\s+(\d+)(?:st|nd|rd|th)\s+level\b/i)?.[1] ?? 1);
    const name = clean(heading.textContent).replace(/:$/, "");
    return {
      id: `${archetypeId}-${slug(name)}-${level}`,
      name,
      level: Math.min(20, Math.max(1, level)),
      type: "archetype",
      summary
    };
  }).filter(Boolean).filter((feature, index, features) =>
    features.findIndex((candidate) => candidate.id === feature.id) === index
  );
}

await mkdir(outputDirectory, { recursive: true });
const indexUrl = `https://www.aonprd.com/Archetypes.aspx?Class=${encodeURIComponent(className)}`;
const entries = indexEntries(await fetchDocument(indexUrl));
if (!entries.length) throw new Error(`${className}: no archetypes found`);

for (const [index, entry] of entries.entries()) {
  const archetypeId = `${classId}-${slug(entry.name)}`;
  const outputFile = new URL(`${archetypeId}.json`, outputDirectory);
  if (!overwrite) {
    try {
      await access(outputFile);
      console.log(`Preserved ${index + 1}/${entries.length}: ${entry.name}`);
      continue;
    } catch {}
  }
  const featureIds = replacedFeatureIds(entry.replacesText);
  const features = detailFeatures(await fetchDocument(entry.url), archetypeId);
  if (!featureIds.length) throw new Error(`${entry.name}: could not map replacements: ${entry.replacesText}`);
  if (!features.length) throw new Error(`${entry.name}: no features parsed`);
  const record = {
    id: archetypeId,
    name: entry.name,
    classId,
    summary: entry.summary,
    replacesText: entry.replacesText,
    replacements: [{ featureIds, features }],
    source: { title: "Archives of Nethys", page: null, url: entry.url }
  };
  await writeFile(outputFile, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Imported ${index + 1}/${entries.length}: ${entry.name}`);
}
