import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../../packages/data/src/", import.meta.url);
const errors = [];
const ids = new Map();
const classIds = new Set();
const groupIds = new Set();

async function jsonFiles(directory) {
  const dir = new URL(directory, root);
  return (await readdir(dir)).filter(name => name.endsWith(".json")).map(name => new URL(name, dir));
}
async function load(url) { return JSON.parse(await readFile(url, "utf8")); }
function checkId(record, file) {
  if (!record.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) errors.push(`${file}: invalid or missing id`);
  if (ids.has(record.id)) errors.push(`${file}: duplicate id ${record.id} (also in ${ids.get(record.id)})`);
  else ids.set(record.id, file);
}

for (const url of await jsonFiles("classes/")) {
  const c=await load(url); const file=url.pathname.split('/').pop(); checkId(c,file); classIds.add(c.id);
  for (const key of ["name","hitDie","babProgression","saves","skillRanksPerLevel","source","features"]) if (c[key] === undefined) errors.push(`${file}: missing ${key}`);
  const featureIds=new Set();
  for (const f of c.features ?? []) {
    if (featureIds.has(f.id)) errors.push(`${file}: duplicate feature id ${f.id}`); featureIds.add(f.id);
    if (!Number.isInteger(f.level) || f.level<1 || f.level>20) errors.push(`${file}: ${f.id} has invalid level`);
    if (f.choiceRequired && !f.optionGroupId) errors.push(`${file}: ${f.id} requires a choice but has no optionGroupId`);
  }
}
for (const url of await jsonFiles("options/")) { const g=await load(url); const file=url.pathname.split('/').pop(); checkId(g,file); groupIds.add(g.id); for (const o of g.options??[]) {checkId(o,`${file}:${o.id}`); if(!Number.isInteger(o.minimumLevel)) errors.push(`${file}:${o.id} missing minimumLevel`);} }
for (const directory of ["races/","feats/","spells/"]) for (const url of await jsonFiles(directory)) { const r=await load(url); checkId(r,url.pathname.split('/').pop()); }
for (const url of await jsonFiles("classes/")) { const c=await load(url); for (const f of c.features??[]) if(f.optionGroupId && !groupIds.has(f.optionGroupId) && !["combat-feats","fighter-weapon-groups"].includes(f.optionGroupId)) errors.push(`${c.id}:${f.id} references missing option group ${f.optionGroupId}`); }
if(errors.length){ console.error(`Data validation failed with ${errors.length} error(s):`); errors.forEach(e=>console.error(`- ${e}`)); process.exit(1); }
console.log(`Validated ${ids.size} unique records across ${classIds.size} classes and ${groupIds.size} option groups.`);
