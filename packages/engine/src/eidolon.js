const evolutionPools=[3,4,5,7,8,9,10,11,13,14,15,16,17,19,20,21,22,23,25,26];
const baseForms={
 biped:{size:"Medium",speed:30,armor:2,abilities:{strength:16,dexterity:12,constitution:13,intelligence:7,wisdom:10,charisma:11},goodSaves:["fortitude","will"],attacks:["2 claws (1d4)"],freeEvolutions:["claws","limbs-arms","limbs-legs"]},
 quadruped:{size:"Medium",speed:40,armor:2,abilities:{strength:14,dexterity:14,constitution:13,intelligence:7,wisdom:10,charisma:11},goodSaves:["fortitude","reflex"],attacks:["bite (1d6)"],freeEvolutions:["bite","limbs-legs-2"]},
 serpentine:{size:"Medium",speed:20,armor:2,abilities:{strength:12,dexterity:16,constitution:13,intelligence:7,wisdom:10,charisma:11},goodSaves:["reflex","will"],attacks:["bite (1d6)","tail slap (1d6)"],freeEvolutions:["bite","reach-bite","tail","tail-slap"]}
};
export function eidolonEvolutionPool(level){const value=Math.max(1,Math.min(20,Math.trunc(Number(level)||1)));return evolutionPools[value-1];}
export function eidolonBaseForm(id,size="Medium"){
 const form=baseForms[id]; if(!form) return null;
 if(size!=="Small") return {...form,id,size:"Medium"};
 return {...form,id,size:"Small",armor:form.armor+1,abilities:{...form.abilities,strength:form.abilities.strength-4,dexterity:form.abilities.dexterity+2,constitution:form.abilities.constitution-2}};
}
export function validateEidolonEvolutions(selectedIds,evolutions,level,baseFormId){
 const pool=eidolonEvolutionPool(level); const selected=[]; let spent=0;
 for(const id of Array.isArray(selectedIds)?selectedIds:[]){const evolution=evolutions.find(item=>item.id===id);if(!evolution||selected.includes(id)||level<(evolution.minimumLevel??1)||(evolution.baseForms?.length&&!evolution.baseForms.includes(baseFormId))||(evolution.requiredEvolutionIds??[]).some(required=>!selected.includes(required))||spent+evolution.cost>pool)continue;selected.push(id);spent+=evolution.cost;}
 return {selectedIds:selected,spent,remaining:pool-spent,pool};
}
