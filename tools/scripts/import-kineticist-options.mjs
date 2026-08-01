import { writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const url = "https://www.aonprd.com/KineticistTalents.aspx";
const response = await fetch(url);
if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
const document = new JSDOM(await response.text()).window.document;
const clean = value => value.replace(/\s+/g, " ").trim();
const slug = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function parse(selector, idPrefix, levelToCharacterLevel) {
  return [...document.querySelectorAll(selector)].map(element => {
    const text = clean(element.textContent);
    const sourceAt = text.indexOf("Source ");
    if (sourceAt < 1) throw new Error(`Unable to find source metadata: ${text.slice(0, 120)}`);
    const name = text.slice(0, sourceAt).trim();
    const sourceMatch = text.slice(sourceAt).match(/^Source (.+?) pg\. (\d+)/);
    const levelMatch = text.match(/(?:^|; )Level (\d+|—)(?:;|$)/);
    if (!sourceMatch || !levelMatch) throw new Error(`Unable to parse talent metadata: ${text.slice(0, 160)}`);
    const talentLevel = levelMatch[1] === "—" ? 0 : Number(levelMatch[1]);
    return {
      id: `${idPrefix}-${slug(name)}`,
      name,
      minimumLevel: levelToCharacterLevel(talentLevel),
      benefit: text.slice(sourceAt + sourceMatch[0].length).trim(),
      source: { title: sourceMatch[1], page: Number(sourceMatch[2]), url }
    };
  });
}

async function writeGroup(file, id, name, minimumLevel, options) {
  const record = {
    id,
    name,
    classIds: ["kineticist"],
    optionDefaults: {
      groupId: id,
      classIds: ["kineticist"],
      minimumLevel,
      prerequisites: [],
      source: { title: "Archives of Nethys", page: null, url }
    },
    options
  };
  await writeFile(new URL(`../../packages/data/src/options/${file}`, import.meta.url), `${JSON.stringify(record, null, 2)}\n`);
}

const infusions = parse('[id^="MainContent_DataList3_LabelName_"]', "kineticist-infusion", level => Math.max(1, level * 2 - 1));
const utilities = parse('[id^="MainContent_DataList4_LabelName_"]', "kineticist-utility", level => Math.max(2, level * 2));
await writeGroup("kineticist-infusions.json", "kineticist-infusions", "Kineticist Infusions", 1, infusions);
await writeGroup("kineticist-utility-talents.json", "kineticist-utility-talents", "Kineticist Utility Wild Talents", 2, utilities);
console.log(`Imported ${infusions.length} kineticist infusions and ${utilities.length} utility wild talents.`);
