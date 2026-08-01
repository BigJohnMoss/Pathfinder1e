import { writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const url = "https://www.aonprd.com/MagusArcana.aspx";
const response = await fetch(url);
if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
const document = new JSDOM(await response.text()).window.document;
const slug = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clean = value => value.replace(/\s+/g, " ").trim();

const options = [...document.querySelectorAll('[id^="MainContent_DataListTypes_LabelName_"]')].map(element => {
  const text = clean(element.textContent);
  const match = text.match(/^(.+?)(?:\s+\((?:Ex|Su|Sp)\))?\s+\((.+?) pg\. (\d+)\):\s*(.+)$/i);
  if (!match) throw new Error(`Unable to parse Magus arcana: ${text.slice(0, 120)}`);
  const [, name, sourceTitle, pageText, benefit] = match;
  const minimumLevel = Number(benefit.match(/must be at least (\d+)(?:st|nd|rd|th) level/i)?.[1] ?? 3);
  return {
    id: `magus-arcana-${slug(name)}`,
    name,
    minimumLevel,
    benefit,
    source: { title: sourceTitle, page: Number(pageText), url }
  };
});

const record = {
  id: "magus-arcana",
  name: "Magus Arcana",
  classIds: ["magus"],
  optionDefaults: { groupId: "magus-arcana", classIds: ["magus"], minimumLevel: 3, prerequisites: [], source: { title: "Ultimate Magic", page: 11, url } },
  options
};
await writeFile(new URL("../../packages/data/src/options/magus-arcana.json", import.meta.url), `${JSON.stringify(record, null, 2)}\n`);
console.log(`Imported ${options.length} Magus arcana.`);
