import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
const base=new URL("../../packages/data/src/",import.meta.url); const out=new URL("../../generated/",import.meta.url);
await mkdir(out,{recursive:true});
async function loadDir(name){const dir=new URL(`${name}/`,base);const files=(await readdir(dir)).filter(f=>f.endsWith('.json')).sort();return Promise.all(files.map(async f=>JSON.parse(await readFile(new URL(f,dir),'utf8'))));}
const spellCatalogues=await loadDir('spell-catalogues');
const bundle={generatedAt:new Date().toISOString(),classes:await loadDir('classes'),races:await loadDir('races'),optionGroups:await loadDir('options'),feats:await loadDir('feats'),spells:[...(await loadDir('spells')),...spellCatalogues.flatMap(catalogue=>catalogue.spells)]};
await writeFile(new URL('pf1e-data.json',out),JSON.stringify(bundle,null,2)+'\n');
console.log(`Generated bundle with ${bundle.classes.length} classes, ${bundle.feats.length} feats, and ${bundle.spells.length} spells.`);
