import { writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const clean = value => value.replace(/\s+/g, " ").trim();
const slug = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function importTable({ url, linkPattern, id, name, classId, idPrefix, file }) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const document = new JSDOM(await response.text()).window.document;
  const options = [...document.querySelectorAll("tr")].flatMap(row => {
    const link = [...row.querySelectorAll("a")].find(anchor => anchor.href.includes(linkPattern));
    if (!link) return [];
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return [];
    const optionName = clean(link.textContent);
    const benefit = clean(cells[1].textContent);
    return [{
      id: `${idPrefix}-${slug(optionName)}`,
      name: optionName,
      minimumLevel: 1,
      benefit,
      source: { title: "Archives of Nethys", page: null, url: new URL(link.getAttribute("href"), url).href }
    }];
  });
  const record = {
    id,
    name,
    classIds: [classId],
    optionDefaults: {
      groupId: id,
      classIds: [classId],
      minimumLevel: 1,
      prerequisites: [],
      source: { title: "Archives of Nethys", page: null, url }
    },
    options
  };
  await writeFile(new URL(`../../packages/data/src/options/${file}`, import.meta.url), `${JSON.stringify(record, null, 2)}\n`);
  return options.length;
}

const disciplines = await importTable({
  url: "https://www.aonprd.com/PsychicDisciplines.aspx",
  linkPattern: "PsychicDisciplinesDisplay.aspx",
  id: "psychic-disciplines",
  name: "Psychic Disciplines",
  classId: "psychic",
  idPrefix: "psychic-discipline",
  file: "psychic-disciplines.json"
});
const focuses = await importTable({
  url: "https://www.aonprd.com/PhantomFocus.aspx",
  linkPattern: "PhantomFocusDisplay.aspx",
  id: "spiritualist-emotional-focuses",
  name: "Phantom Emotional Focuses",
  classId: "spiritualist",
  idPrefix: "spiritualist-focus",
  file: "spiritualist-emotional-focuses.json"
});
console.log(`Imported ${disciplines} psychic disciplines and ${focuses} phantom emotional focuses.`);
