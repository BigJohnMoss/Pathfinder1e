import { writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const schools = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];
const clean = value => value.replace(/\s+/g, " ").trim();
const slug = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const textFromHtml = html => clean(new JSDOM(`<body>${html}</body>`).window.document.body.textContent);
const options = [];

for (const school of schools) {
  const url = `https://www.aonprd.com/OccultistImplementsDisplay.aspx?ItemName=${encodeURIComponent(school)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const html = await response.text();
  const focusPowersAt = html.indexOf("Focus Powers");
  if (focusPowersAt < 0) throw new Error(`${school}: Focus Powers section not found`);
  const section = html.slice(focusPowersAt);
  const entries = [...section.matchAll(/<i>([^<]+) \((?:Sp|Su|Ex)\)<\/i>:\s*(.*?)(?=<br\s*\/?><br\s*\/?>|$)/gis)];
  for (const [, rawName, rawBenefit] of entries) {
    const name = textFromHtml(rawName);
    const benefit = textFromHtml(rawBenefit);
    const levelMatch = benefit.match(/must be at least (\d+)(?:st|nd|rd|th) level/i);
    options.push({
      id: `occultist-focus-${slug(name)}`,
      name,
      minimumLevel: levelMatch ? Number(levelMatch[1]) : 1,
      prerequisites: [{ type: "rule", description: `Requires the ${school} implement school.` }],
      benefit,
      source: { title: `${school} Implement School`, page: null, url }
    });
  }
}

const group = {
  id: "occultist-focus-powers",
  name: "Occultist Focus Powers",
  classIds: ["occultist"],
  optionDefaults: {
    groupId: "occultist-focus-powers",
    classIds: ["occultist"],
    minimumLevel: 1,
    prerequisites: [],
    source: { title: "Archives of Nethys", page: null, url: "https://www.aonprd.com/OccultistImplements.aspx" }
  },
  options
};
await writeFile(new URL("../../packages/data/src/options/occultist-focus-powers.json", import.meta.url), `${JSON.stringify(group, null, 2)}\n`);
console.log(`Imported ${options.length} occultist focus powers across ${schools.length} implement schools.`);
