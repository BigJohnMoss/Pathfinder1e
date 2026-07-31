export type EidolonEvolution={id:string;cost:number;minimumLevel?:number;baseForms?:string[];requiredEvolutionIds?:string[]};
export type EidolonForm={id:string;size:"Small"|"Medium";speed:number;armor:number;abilities:{strength:number;dexterity:number;constitution:number;intelligence:number;wisdom:number;charisma:number};goodSaves:string[];attacks:string[];freeEvolutions:string[]};
export function eidolonEvolutionPool(level:number):number;
export function eidolonProgression(level:number):{effectiveLevel:number;hitDice:number;baseAttackBonus:number;goodSave:number;badSave:number;skillRanks:number;feats:number;armorBonus:number;strengthDexterityBonus:number;evolutionPool:number;maxAttacks:number};
export function eidolonBaseForm(id:string,size?:"Small"|"Medium"):null|EidolonForm;
export function validateEidolonEvolutions(selectedIds:string[],evolutions:EidolonEvolution[],level:number,baseFormId:string,bonusPool?:number):{selectedIds:string[];spent:number;remaining:number;pool:number};
