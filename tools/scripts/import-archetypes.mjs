import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
  .replace(/\u00e2\u20ac\u02dc/g, "\u2018")
  .replace(/\u00e2\u20ac\u201c/g, "\u2013")
  .replace(/\u00e2\u20ac\u201d/g, "\u2014")
  .replace(/\u00e2\u20ac(?=\s|[,.)])/g, "\u2014")
  .replace(/\u00a0/g, " ")
  .replace(/[ \t]+\n/g, "\n")
  .replace(/\n[ \t]+/g, "\n")
  .replace(/[ \t]{2,}/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const singularize = (value) => value.split(" ").map((word) =>
  word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word
).join(" ");

async function fetchDocument(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  const declaredCharset = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1];
  const charset = declaredCharset || "utf-8";
  let html;
  try {
    html = new TextDecoder(charset).decode(await response.arrayBuffer());
  } catch (error) {
    throw new Error(`${url}: unsupported response charset ${charset}`, { cause: error });
  }
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
  const nestedReplacements = [];
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
    const target = singularize(normalized
      .replace(/\b\d+(?:st|nd|rd|th)?\b/g, "")
      .replace(/\blevel\b/g, "")
      .replace(/\b(?:and|the|class|feature|features|gained|at)\b/g, "")
      .replace(/\s+/g, " ")
      .trim());
    if (/\bdomain powers?\b|\bschool powers?\b/.test(normalized)) {
      nestedReplacements.push(clean(clause));
      continue;
    }

    for (const feature of classRecord.features) {
      if (levels.length && !levels.includes(feature.level)) continue;
      const candidates = [feature.name, feature.progressionKey ?? ""].map((value) => singularize(value
        .toLowerCase()
        .replace(/\b\d+d\d+\b/g, "")
        .replace(/\b[+-]?\d+\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(new RegExp(`\\b${classId}\\b`, "g"), "")
        .replace(/\s+/g, " ")
        .trim()));
      if (candidates.some((candidate) => candidate && (target.includes(candidate) || candidate.includes(target)))) matches.add(feature.id);
    }

    if (/\b(?:arcane|arcanist) exploit/.test(normalized)) addProgression("arcanist-exploit", levels);
    if (/\barcane reservoir\b/.test(normalized)) addProgression("arcane-reservoir", levels);
    if (/\bconsume spells?\b/.test(normalized)) addFeature("consume-spells-1");
    if (/\bmagical supremacy\b/.test(normalized)) addFeature("magical-supremacy-20");
    if (classId === "arcanist" && /\bspellbooks?\b|\bspells?\b/.test(normalized)) addProgression("arcanist-spellcasting", levels);
  }

  return { featureIds: [...matches], nestedReplacements };
}

function detailFeatures(document, archetypeId, archetypeName) {
  const content = document.querySelector("#MainContent_DataListTypes_LabelName_0");
  if (!content) throw new Error(`${archetypeId}: archetype detail block not found`);
  const headings = [...content.querySelectorAll("b")].filter((heading) => clean(heading.textContent).toLowerCase() !== "source");
  if (!headings.length) {
    const clone = content.cloneNode(true);
    clone.querySelector("h1")?.remove();
    const source = [...clone.querySelectorAll("b")].find((heading) => clean(heading.textContent).toLowerCase() === "source");
    let node = source;
    while (node) {
      const next = node.nextSibling;
      node.remove();
      if (node.nodeType === 1 && node.tagName === "BR") break;
      node = next;
    }
    const summary = clean(clone.textContent);
    return summary ? [{ id: `${archetypeId}-${slug(archetypeName)}-1`, name: archetypeName, level: 1, type: "archetype", summary }] : [];
  }
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
const existingRecords = await Promise.all((await readdir(outputDirectory))
  .filter((file) => file.endsWith(".json"))
  .map(async (file) => JSON.parse(await readFile(new URL(file, outputDirectory), "utf8"))));
const indexUrl = `https://www.aonprd.com/Archetypes.aspx?Class=${encodeURIComponent(className)}`;
const entries = indexEntries(await fetchDocument(indexUrl));
if (!entries.length) throw new Error(`${className}: no archetypes found`);

for (const [index, entry] of entries.entries()) {
  const archetypeId = `${classId}-${slug(entry.name)}`;
  const additiveArchetype = /^none$/i.test(entry.replacesText);
  const existingRecord = existingRecords.find((record) =>
    record.classId === classId && record.name.localeCompare(entry.name, undefined, { sensitivity: "base" }) === 0
  );
  if (!overwrite && existingRecord && existingRecord.source?.title !== "Archives of Nethys") {
    console.log(`Preserved curated ${index + 1}/${entries.length}: ${entry.name}`);
    continue;
  }
  const outputFile = new URL(`${archetypeId}.json`, outputDirectory);
  const { featureIds, nestedReplacements } = replacedFeatureIds(entry.replacesText);
  const features = detailFeatures(await fetchDocument(entry.url), archetypeId, entry.name);
  if (!features.length) throw new Error(`${entry.name}: no features parsed`);
  const record = {
    id: archetypeId,
    name: entry.name,
    classId,
    summary: entry.summary,
    replacesText: entry.replacesText,
    mechanicalCoverage: "partial",
    mechanicalNotes: ["Replacement progression is automated. Bespoke effects without a shared builder subsystem remain descriptive."],
    nestedReplacements: additiveArchetype ? undefined : nestedReplacements.length ? nestedReplacements : featureIds.length ? undefined : [entry.replacesText],
    replacements: [{ featureIds: additiveArchetype ? ["additive-archetype-features"] : featureIds.length ? featureIds : [`nested-${slug(entry.replacesText)}`], features }],
    source: { title: "Archives of Nethys", page: null, url: entry.url }
  };
  await writeFile(outputFile, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Imported ${index + 1}/${entries.length}: ${entry.name}${additiveArchetype ? " (additive)" : ""}`);
}
