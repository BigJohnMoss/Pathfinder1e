const evolutionPools=[3,4,5,7,8,9,10,11,13,14,15,16,17,19,20,21,22,23,25,26];
const progression=[
 [1,1,2,0,4,1,0,0,3],[2,2,3,0,8,1,2,1,3],[3,3,3,1,12,2,2,1,3],[3,3,3,1,12,2,2,1,4],
 [4,4,4,1,16,2,4,2,4],[5,5,4,1,20,3,4,2,4],[6,6,5,2,24,3,6,3,4],[6,6,5,2,24,3,6,3,4],
 [7,7,5,2,28,4,6,3,5],[8,8,6,2,32,4,8,4,5],[9,9,6,3,36,5,8,4,5],[9,9,6,3,36,5,10,5,5],
 [10,10,7,3,40,5,10,5,5],[11,11,7,3,44,6,10,5,6],[12,12,8,4,48,6,12,6,6],[12,12,8,4,48,6,12,6,6],
 [13,13,8,4,52,7,14,7,6],[14,14,9,4,56,7,14,7,6],[15,15,9,5,60,8,14,7,7],[15,15,9,5,60,8,16,8,7]
];
const baseForms={
 biped:{size:"Medium",speed:30,armor:2,abilities:{strength:16,dexterity:12,constitution:13,intelligence:7,wisdom:10,charisma:11},goodSaves:["fortitude","will"],attacks:["2 claws (1d4)"],freeEvolutions:["claws","limbs-arms","limbs-legs"]},
 quadruped:{size:"Medium",speed:40,armor:2,abilities:{strength:14,dexterity:14,constitution:13,intelligence:7,wisdom:10,charisma:11},goodSaves:["fortitude","reflex"],attacks:["bite (1d6)"],freeEvolutions:["bite","limbs-legs-2"]},
 serpentine:{size:"Medium",speed:20,armor:2,abilities:{strength:12,dexterity:16,constitution:13,intelligence:7,wisdom:10,charisma:11},goodSaves:["reflex","will"],attacks:["bite (1d6)","tail slap (1d6)"],freeEvolutions:["bite","reach-bite","tail","tail-slap"]}
};
export function eidolonEvolutionPool(level){const value=Math.max(1,Math.min(20,Math.trunc(Number(level)||1)));return evolutionPools[value-1];}
export function eidolonProgression(level){const effectiveLevel=Math.max(1,Math.min(20,Math.trunc(Number(level)||1)));const [hitDice,baseAttackBonus,goodSave,badSave,skillRanks,feats,armorBonus,strengthDexterityBonus,maxAttacks]=progression[effectiveLevel-1];return {effectiveLevel,hitDice,baseAttackBonus,goodSave,badSave,skillRanks,feats,armorBonus,strengthDexterityBonus,evolutionPool:evolutionPools[effectiveLevel-1],maxAttacks};}
export function eidolonBaseForm(id,size="Medium"){
 const form=baseForms[id]; if(!form) return null;
 if(size!=="Small") return {...form,id,size:"Medium"};
 return {...form,id,size:"Small",armor:form.armor+1,abilities:{...form.abilities,strength:form.abilities.strength-4,dexterity:form.abilities.dexterity+2,constitution:form.abilities.constitution-2}};
}
export function validateEidolonEvolutions(selectedIds,evolutions,level,baseFormId,bonusPool=0){
 const pool=eidolonEvolutionPool(level)+Math.max(0,Math.trunc(Number(bonusPool)||0)); const selected=[]; let spent=0;
 for(const id of Array.isArray(selectedIds)?selectedIds:[]){const evolution=evolutions.find(item=>item.id===id);if(!evolution||selected.includes(id)||level<(evolution.minimumLevel??1)||(evolution.baseForms?.length&&!evolution.baseForms.includes(baseFormId))||(evolution.requiredEvolutionIds??[]).some(required=>!selected.includes(required))||spent+evolution.cost>pool)continue;selected.push(id);spent+=evolution.cost;}
 return {selectedIds:selected,spent,remaining:pool-spent,pool};
}
