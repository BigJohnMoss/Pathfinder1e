export type Progression = "full" | "three-quarters" | "half";
export type SaveProgression = "good" | "poor";
export type FeatureType = "core" | "selectable" | "scaling" | "bonus-feat" | "capstone" | "spellcasting";

export interface SourceRef { title: string; page?: number | null; url: string; }
export interface ClassFeatureOccurrence {
  id: string; name: string; level: number; type: FeatureType;
  summary: string; description?: string; progressionKey?: string | null;
  scaling?: string | null; uses?: string | null; choiceRequired?: boolean;
  optionGroupId?: string | null; source?: SourceRef;
}
export interface CharacterClass {
  id: string; name: string; classType: string; hitDie: 6|8|10|12;
  babProgression: Progression; saves: {fortitude: SaveProgression; reflex: SaveProgression; will: SaveProgression};
  skillRanksPerLevel: number; classSkills: string[]; source: SourceRef;
  features: ClassFeatureOccurrence[];
}
export type Prerequisite =
  | { type: "level"|"bab"; minimum: number }
  | { type: "ability"; key: string; minimum: number }
  | { type: "feat"|"feature"; id: string };
export interface SelectableOption { id:string; groupId:string; name:string; classIds:string[]; minimumLevel:number; prerequisites:Prerequisite[]; benefit:string; source:SourceRef; }
