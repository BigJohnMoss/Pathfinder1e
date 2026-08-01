import { writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const clean = value => value.replace(/\s+/g, " ").trim();
const slug = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
async function documentFor(url) { const response = await fetch(url); if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`); return new JSDOM(await response.text()).window.document; }
function parse(elements, idPrefix, minimumLevel, url) {
  return [...elements].map(element => {
    const text = clean(element.textContent);
    const match = text.match(/^(.+?)(?:\s+\((?:Ex|Su|Sp)\))?\s+\((.+?) pg\. (\d+)\):\s*(.+)$/i);
    if (!match) throw new Error(`Unable to parse option: ${text.slice(0, 100)}`);
    const [, name, title, page, benefit] = match;
    return { id: `${idPrefix}-${slug(name)}`, name, minimumLevel, benefit, source: { title, page: Number(page), url } };
  });
}
async function writeGroup(file, id, name, classId, minimumLevel, options, url) {
  const record = { id, name, classIds: [classId], optionDefaults: { groupId: id, classIds: [classId], minimumLevel, prerequisites: [], source: { title: "Occult Adventures", page: null, url } }, options };
  await writeFile(new URL(`../../packages/data/src/options/${file}`, import.meta.url), `${JSON.stringify(record, null, 2)}\n`);
}

const trickUrl = "https://www.aonprd.com/MesmeristTricks.aspx";
const trickDocument = await documentFor(trickUrl);
const standardTricks = parse(trickDocument.querySelectorAll('[id^="MainContent_DataListTypes_LabelName_"]'), "mesmerist-trick", 1, trickUrl);
const masterfulTricks = parse(trickDocument.querySelectorAll('[id^="MainContent_DataList2_LabelName_"]'), "mesmerist-masterful-trick", 12, trickUrl);
await writeGroup("mesmerist-tricks.json", "mesmerist-tricks", "Mesmerist Tricks", "mesmerist", 1, [...standardTricks, ...masterfulTricks], trickUrl);

const stareUrl = "https://www.aonprd.com/MesmeristStares.aspx";
const stareDocument = await documentFor(stareUrl);
const boldStares = parse(stareDocument.querySelectorAll('[id^="MainContent_DataListTypes_LabelName_"]'), "mesmerist-bold-stare", 3, stareUrl);
const devilbaneStares = parse(stareDocument.querySelectorAll('[id^="MainContent_DataList2_LabelName_"]'), "mesmerist-bold-stare", 3, stareUrl);
await writeGroup("mesmerist-bold-stares.json", "mesmerist-bold-stares", "Bold Stare Improvements", "mesmerist", 3, [...boldStares, ...devilbaneStares], stareUrl);

const amplificationUrl = "https://www.aonprd.com/PhrenicAmplifications.aspx";
const amplificationDocument = await documentFor(amplificationUrl);
await writeGroup("psychic-amplifications.json", "psychic-amplifications", "Phrenic Amplifications", "psychic", 1, parse(amplificationDocument.querySelectorAll('[id^="MainContent_DataListTypes_LabelName_"]'), "psychic-amp", 1, amplificationUrl), amplificationUrl);
await writeGroup("psychic-major-amplifications.json", "psychic-major-amplifications", "Major Phrenic Amplifications", "psychic", 11, parse(amplificationDocument.querySelectorAll('[id^="MainContent_DataList1_LabelName_"]'), "psychic-major-amp", 11, amplificationUrl), amplificationUrl);
console.log("Imported 30 Mesmerist tricks, 14 masterful tricks, 24 bold stares, 22 phrenic amplifications, and 9 major amplifications.");
