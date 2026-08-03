import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
const base=new URL("../../packages/data/src/",import.meta.url); const out=new URL("../../generated/",import.meta.url);
await mkdir(out,{recursive:true});
async function loadDir(name){const dir=new URL(`${name}/`,base);const files=(await readdir(dir)).filter(f=>f.endsWith('.json')).sort();return Promise.all(files.map(async f=>JSON.parse(await readFile(new URL(f,dir),'utf8'))));}
const normalizeName=(name)=>name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const spellCatalogues=await loadDir('spell-catalogues');
const spellClassLevelFiles=await loadDir('spell-class-levels');
const exactLaterSpellLevels=spellClassLevelFiles.find(file=>file.source?.title==="Archives of Nethys class spell lists")?.levelsBySpellId??{};
const spellClassLevels={};
for(const file of spellClassLevelFiles) for(const [spellId,levels] of Object.entries(file.levelsBySpellId??{})){
  spellClassLevels[spellId]={...(spellClassLevels[spellId]??{}),...levels};
}
const spellSchoolFiles=await loadDir('spell-schools');
const schoolsByName=Object.assign({},...spellSchoolFiles.map(file=>file.schoolsByName??{}));
const domainDetailFiles=await loadDir('domain-details');
const domainDetails=new Map(domainDetailFiles.flatMap(file=>file.domains??[]).map(domain=>[domain.id,domain]));
const subdomains=domainDetailFiles.flatMap(file=>file.subdomains??[]);
const bloodlineDetailFiles=await loadDir('bloodline-details');
const bloodlineDetails=new Map(bloodlineDetailFiles.flatMap(file=>file.bloodlines).map(bloodline=>[bloodline.id,bloodline]));
const mysteryDetailFiles=await loadDir('mystery-details');
const mysteryDetails=new Map(mysteryDetailFiles.flatMap(file=>file.mysteries).map(mystery=>[mystery.id,mystery]));
const sourceOptionGroups=await loadDir('options');
const optionGroupById=new Map(sourceOptionGroups.map(group=>[group.id,group]));
const rawOptionGroups=sourceOptionGroups.map(group=>{
  const inheritedSource=group.inheritsOptionsFrom ? optionGroupById.get(group.inheritsOptionsFrom)?.options??[] : [];
  const inheritedIds=group.inheritedOptionIds ? new Set(group.inheritedOptionIds) : null;
  const excludedInheritedIds=new Set(group.excludedInheritedOptionIds??[]);
  const selectedInherited=(inheritedIds ? inheritedSource.filter(option=>inheritedIds.has(option.id)) : inheritedSource).filter(option=>!excludedInheritedIds.has(option.id));
  const omittedOptionFields=new Set(group.omitOptionFields??[]);
  const options=[...selectedInherited,...group.options].flatMap(option=>{
    const enriched={...group.optionDefaults,...option,groupId:group.id,classIds:group.classIds,...(domainDetails.get(option.id)??{}),...(bloodlineDetails.get(option.id)??{}),...(mysteryDetails.get(option.id)??{})};
    const cleaned=Object.fromEntries(Object.entries(enriched).filter(([key])=>!omittedOptionFields.has(key)));
    if(!group.expandVariants||!enriched.variants?.length) return [cleaned];
    return enriched.variants.map(variant=>({...cleaned,id:`${enriched.id}-${variant.id}`,name:`${enriched.name} (${variant.name})`,benefit:`${enriched.benefit} Selected variant: ${variant.name} (${variant.energyType}${variant.breathShape?`, ${variant.breathShape}`:""}${variant.movement?`, ${variant.movement}`:""}).`,variants:undefined,selectedVariant:variant,familyId:enriched.id}));
  });
  return {...group,options:[...options,...(group.id==="cleric-domains"?subdomains:[])]};
});
const spellDetailFiles=await loadDir('spell-details').catch(()=>[]);
const spellDetailsById=new Map(spellDetailFiles.flatMap(file=>file.spells??[]).map(detail=>[detail.id,detail]));
const sourceSpells=[...(await loadDir('spells')),...spellCatalogues.flatMap(catalogue=>catalogue.spells)];
const exactLaterSpellClasses=new Set(["alchemist","arcanist","bloodrager","hunter","inquisitor","investigator","magus","medium","mesmerist","occultist","oracle","psychic","shaman","skald","spiritualist","summoner","warpriest","witch"]);
const spells=sourceSpells.map(sourceSpell=>{
  const detail=spellDetailsById.get(sourceSpell.id)??{};
  const {classLevelOverlay,...spellDetail}=detail;
  const spell={...sourceSpell,...spellDetail};
  const withWizard=spell.levelByClass?.arcanist!==undefined&&spell.levelByClass.wizard===undefined?{...spell.levelByClass,wizard:spell.levelByClass.arcanist}:spell.levelByClass;
  const sharedArcaneLevel=withWizard?.wizard??withWizard?.arcanist;
  const sharedLevelByClass=sharedArcaneLevel!==undefined&&withWizard?.sorcerer===undefined?{...withWizard,sorcerer:sharedArcaneLevel}:withWizard;
  const withoutLegacyLaterLevels=Object.fromEntries(Object.entries(sharedLevelByClass??{}).filter(([classId])=>!exactLaterSpellClasses.has(classId)));
  const withoutLegacyDetailLevels=Object.fromEntries(Object.entries(classLevelOverlay??{}).filter(([classId])=>!exactLaterSpellClasses.has(classId)));
  const withoutSupersededFileLevels=Object.fromEntries(Object.entries(spellClassLevels[spell.id]??{}).filter(([classId])=>!exactLaterSpellClasses.has(classId)));
  const withClassOverlays={...withoutLegacyLaterLevels,...withoutLegacyDetailLevels,...withoutSupersededFileLevels,...(exactLaterSpellLevels[spell.id]??{})};
  // Arcanists prepare directly from the Sorcerer/Wizard spell list.  AoN's
  // class-search export contains only spells tagged separately for Arcanist,
  // so treating that export as the whole list silently drops shared staples.
  const levelByClass=withClassOverlays.wizard===undefined
    ? withClassOverlays
    : {...withClassOverlays,arcanist:withClassOverlays.wizard};
  const mappedSchools=schoolsByName[normalizeName(spell.name)];
  const schools=spell.schools??(Array.isArray(mappedSchools)?mappedSchools:undefined);
  const school=spell.school??(schools?"multiple":typeof mappedSchools==="string"?mappedSchools:undefined);
  return {...spell,...(school?{school}:{}),...(schools?{schools}:{}),levelByClass};
});
const classLevelForSpellLevel=(classId,spellLevel)=>classId==="bard"?([1,2,4,7,10,13,16][spellLevel]??20):1;
const optionGroups=rawOptionGroups.map(group=>{
  const filter=group.generatedSpellOptions;
  if(!filter) return group;
  const additionalIds=new Set(filter.additionalSpellIds??[]);
  const spellIds=new Set(filter.spellIds??[]);
  const matchesSchool=spell=>!filter.school||spell.school===filter.school||spell.schools?.includes(filter.school);
  const matchesName=spell=>!filter.nameIncludes||spell.name.toLowerCase().includes(filter.nameIncludes.toLowerCase());
  const generated=spells.filter(spell=>additionalIds.has(spell.id)||(
    (!spellIds.size||spellIds.has(spell.id))&&
    matchesSchool(spell)&&
    matchesName(spell)&&
    (filter.anyClassList?Object.keys(spell.levelByClass??{}).length>0:spell.levelByClass?.[filter.classId]!==undefined)&&
    (!filter.excludeClassId||spell.levelByClass?.[filter.excludeClassId]===undefined)
  )).map(spell=>{
    const publishedLevels=Object.values(spell.levelByClass??{}).filter(Number.isInteger);
    const spellLevel=filter.additionalSpellLevels?.[spell.id]??(filter.anyClassList?Math.min(...publishedLevels):spell.levelByClass?.[filter.classId])??0;
    if(filter.maximumSpellLevel!==undefined&&spellLevel>filter.maximumSpellLevel) return null;
    const targetClassId=filter.targetClassId??filter.classId;
    const minimumLevel=filter.minimumClassLevelBySpellLevel?.[spellLevel]??classLevelForSpellLevel(targetClassId,spellLevel);
    return {
      ...group.optionDefaults,
      id:`${group.id}-${spell.id}`,
      name:spell.name,
      classIds:group.classIds,
      minimumLevel,
      prerequisites:[],
      benefit:`Add ${spell.name} to your spells known as a bonus spell.`,
      spellId:spell.id,
      spellLevel,
      castsAsPrepared:filter.castsAsPrepared??false,
      ignoresMaximumSpellLevel:filter.ignoresMaximumSpellLevel??false,
      resourceCost:filter.resourceCost,
      source:spell.source??group.source
    };
  }).filter(Boolean);
  return {...group,options:[...group.options,...generated.filter(option=>!group.options.some(existing=>existing.id===option.id))]};
});
let feats=await loadDir('feats');
const featDetailFiles=await loadDir('feat-details').catch(()=>[]);
const featDetailsById=new Map(featDetailFiles.flatMap(file=>file.feats??[]).map(detail=>[detail.id,detail]));
feats=feats.map(feat=>{
  const detail=featDetailsById.get(feat.id);
  if(!detail) return feat;
  const fullBenefit=detail.sections?.find(section=>section.label.toLowerCase()==="benefit")?.text??feat.benefit;
  return {...feat,benefit:fullBenefit,description:detail.description,rulesSections:detail.sections};
});
const bundle={generatedAt:new Date().toISOString(),classes:await loadDir('classes'),archetypes:await loadDir('archetypes'),races:await loadDir('races'),optionGroups,feats,traits:await loadDir('traits'),spells};
const serialized=JSON.stringify(bundle);
const compactFeats=bundle.feats.map(({description,rulesSections,...feat})=>({...feat,benefit:"",source:{...feat.source,title:""}}));
const compactArchetypes=bundle.archetypes.map(archetype=>({...archetype,replacements:[],featureOverrides:undefined,mechanicalNotes:undefined}));
const compactSpells=bundle.spells.map(({description,components,castingTime,range,target,area,effect,duration,savingThrow,spellResistance,source,...spell})=>spell);
const clientBundle={...bundle,archetypes:compactArchetypes,feats:compactFeats,spells:compactSpells};
const serializedClientBundle=JSON.stringify(clientBundle);
await writeFile(new URL('pf1e-data.json',out),JSON.stringify(bundle,null,2)+'\n');
await writeFile(new URL('pf1e-data.mjs',out),`const data = JSON.parse(${JSON.stringify(serializedClientBundle)});\nexport default data;\n`);
await writeFile(new URL('pf1e-data.d.mts',out),'import type { GeneratedDataBundle } from "../packages/types/src/index.js";\ndeclare const data: GeneratedDataBundle;\nexport default data;\n');
await writeFile(new URL('pf1e-feats.mjs',out),`const feats = JSON.parse(${JSON.stringify(JSON.stringify(bundle.feats))});\nexport default feats;\n`);
await writeFile(new URL('pf1e-feats.d.mts',out),'import type { CharacterFeat } from "../packages/types/src/index.js";\ndeclare const feats: CharacterFeat[];\nexport default feats;\n');
await writeFile(new URL('pf1e-spells.mjs',out),`const spells = JSON.parse(${JSON.stringify(JSON.stringify(bundle.spells))});\nexport default spells;\n`);
await writeFile(new URL('pf1e-spells.d.mts',out),'import type { CharacterSpell } from "../packages/types/src/index.js";\ndeclare const spells: CharacterSpell[];\nexport default spells;\n');
await writeFile(new URL('pf1e-archetypes.mjs',out),`const archetypes = JSON.parse(${JSON.stringify(JSON.stringify(bundle.archetypes))});\nexport default archetypes;\n`);
await writeFile(new URL('pf1e-archetypes.d.mts',out),'import type { CharacterArchetype } from "../packages/types/src/index.js";\ndeclare const archetypes: CharacterArchetype[];\nexport default archetypes;\n');
console.log(`Generated bundle with ${bundle.classes.length} classes, ${bundle.feats.length} feats, ${bundle.traits.length} traits, and ${bundle.spells.length} spells.`);
