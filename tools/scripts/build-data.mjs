import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
const base=new URL("../../packages/data/src/",import.meta.url); const out=new URL("../../generated/",import.meta.url);
await mkdir(out,{recursive:true});
async function loadDir(name){const dir=new URL(`${name}/`,base);const files=(await readdir(dir)).filter(f=>f.endsWith('.json')).sort();return Promise.all(files.map(async f=>JSON.parse(await readFile(new URL(f,dir),'utf8'))));}
const normalizeName=(name)=>name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const spellCatalogues=await loadDir('spell-catalogues');
const spellSchoolFiles=await loadDir('spell-schools');
const schoolsByName=Object.assign({},...spellSchoolFiles.map(file=>file.schoolsByName??{}));
const domainDetailFiles=await loadDir('domain-details');
const domainDetails=new Map(domainDetailFiles.flatMap(file=>file.domains).map(domain=>[domain.id,domain]));
const optionGroups=(await loadDir('options')).map(group=>({...group,options:group.options.map(option=>({...option,...(domainDetails.get(option.id)??{})}))}));
const sourceSpells=[...(await loadDir('spells')),...spellCatalogues.flatMap(catalogue=>catalogue.spells)];
const spells=sourceSpells.map(spell=>{
  const withWizard=spell.levelByClass?.arcanist!==undefined&&spell.levelByClass.wizard===undefined?{...spell.levelByClass,wizard:spell.levelByClass.arcanist}:spell.levelByClass;
  const sharedArcaneLevel=withWizard?.wizard??withWizard?.arcanist;
  const levelByClass=sharedArcaneLevel!==undefined&&withWizard?.sorcerer===undefined?{...withWizard,sorcerer:sharedArcaneLevel}:withWizard;
  const mappedSchools=schoolsByName[normalizeName(spell.name)];
  const schools=spell.schools??(Array.isArray(mappedSchools)?mappedSchools:undefined);
  const school=spell.school??(schools?"multiple":typeof mappedSchools==="string"?mappedSchools:undefined);
  return {...spell,...(school?{school}:{}),...(schools?{schools}:{}),levelByClass};
});
const bundle={generatedAt:new Date().toISOString(),classes:await loadDir('classes'),races:await loadDir('races'),optionGroups,feats:await loadDir('feats'),spells};
const serialized=JSON.stringify(bundle);
await writeFile(new URL('pf1e-data.json',out),JSON.stringify(bundle,null,2)+'\n');
await writeFile(new URL('pf1e-data.mjs',out),`const data = JSON.parse(${JSON.stringify(serialized)});\nexport default data;\n`);
await writeFile(new URL('pf1e-data.d.mts',out),'declare const data: any;\nexport default data;\n');
console.log(`Generated bundle with ${bundle.classes.length} classes, ${bundle.feats.length} feats, and ${bundle.spells.length} spells.`);
