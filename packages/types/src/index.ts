export type Progression = "full" | "three-quarters" | "half";
export type SaveProgression = "good" | "poor";
export type FeatureType = "core" | "selectable" | "scaling" | "bonus-feat" | "capstone" | "spellcasting";
export type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
export type AbilityScores = Record<AbilityName, number>;

export interface CharacterDraftV1 {
  version: 1;
  exportedAt?: string;
  name: string;
  classId: string;
  ancestryId: string;
  level: number;
  humanAbility: AbilityName;
  baseAbilities: AbilityScores;
  pointBuyBudget: 10 | 15 | 20 | 25;
  abilityBoosts: AbilityName[];
  selectedFeatIds: string[];
  selectedFeatChoices: Record<string, string>;
  skillRanks: Record<string, number>;
  selectedOptions: Record<string, string>;
  preparedSpells: string[];
  spellSlotUses: Record<string, number>;
  arcaneReservoir: number | null;
  bardicPerformanceUsed: number;
  wildShapeUsed: number;
}

export type CharacterDraft = CharacterDraftV1;

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
  spellcasting?: {
    ability: "intelligence" | "wisdom" | "charisma";
    castingType: "prepared" | "spontaneous";
    slotsByLevel: number[][];
    preparedByLevel?: number[][];
    knownByLevel?: number[][];
    spellLevelUnlocks?: number[];
    preparesFromSlots?: boolean;
  };
}
export type Prerequisite =
  | { type: "level"|"bab"|"caster-level"; minimum: number }
  | { type: "class-level"; classId: string; minimum: number }
  | { type: "ability"|"skill"; key: string; minimum: number }
  | { type: "feat"|"feature"; id: string }
  | { type: "ancestry"; id: string }
  | { type: "size"; maximum: "fine"|"diminutive"|"tiny"|"small"|"medium"|"large"|"huge"|"gargantuan"|"colossal" }
  | { type: "matching-choice"; featId: string; key: string }
  | { type: "choice-value"; featId: string; key: string; value: string }
  | { type: "any"; prerequisites: Exclude<Prerequisite, { type: "any" }>[] };
export interface SelectableOption { id:string; groupId:string; name:string; classIds:string[]; minimumLevel:number; prerequisites:Prerequisite[]; benefit:string; source:SourceRef; }

export interface CharacterAncestry {
  id: string;
  name: string;
  size: string;
  speed: number;
  type: string;
  subtypes: string[];
  abilityModifiers: {
    fixed?: Partial<AbilityScores>;
    choice?: { count: number; amount: number };
  };
  languages: { automatic: string[]; bonus: string | string[] };
  traits: Array<{ id: string; name: string; summary: string }>;
  source: SourceRef;
}

export interface CharacterFeat {
  id: string;
  name: string;
  type: string;
  benefit: string;
  prerequisites: Prerequisite[];
  source: SourceRef;
  choice?: {
    key: string;
    label: string;
    options?: Array<{ id: string; name: string }>;
    allowCustom?: boolean;
  };
}

export interface CharacterOption extends SelectableOption {
  alignment?: string;
  polarity?: string;
  domains?: string[];
  classSkill?: string;
  classSkillChoices?: string[];
  variants?: Array<{ id: string; name: string; energyType: string; breathShape?: string; movement?: string }>;
  arcana?: string;
  bonusSpells?: Array<{ sorcererLevel: number; spellLevel: number; name: string }>;
  bonusFeats?: string[];
  powers?: Array<{ name: string; level: number; summary: string }>;
  domainSpells?: Array<{ level: number; name: string }>;
}

export interface CharacterOptionGroup {
  id: string;
  name: string;
  classIds: string[];
  options: CharacterOption[];
}

export interface CharacterSpell {
  id: string;
  name: string;
  school?: string;
  schools?: string[];
  levelByClass: Record<string, number>;
  summary: string;
  source?: SourceRef;
}

export interface GeneratedDataBundle {
  generatedAt: string;
  classes: CharacterClass[];
  races: CharacterAncestry[];
  optionGroups: CharacterOptionGroup[];
  feats: CharacterFeat[];
  spells: CharacterSpell[];
}
