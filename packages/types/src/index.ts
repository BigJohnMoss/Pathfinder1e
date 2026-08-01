export type Progression = "full" | "three-quarters" | "half";
export type SaveProgression = "good" | "poor";
export type FeatureType =
  | "core"
  | "selectable"
  | "scaling"
  | "bonus-feat"
  | "capstone"
  | "spellcasting";
export type AbilityName =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";
export type AbilityScores = Record<AbilityName, number>;
export interface CharacterClassLevel {
  classId: string;
  level: number;
}

export interface CharacterDraftV1 {
  version: 1;
  exportedAt?: string;
  name: string;
  classId: string;
  classLevels: CharacterClassLevel[];
  archetypeId: string;
  archetypeIdsByClass: Record<string, string>;
  archetypeStacksByClass?: Record<string, string[]>;
  prestigeSpellcastingTargets: Record<string, string[]>;
  ancestryId: string;
  selectedAlternateRacialTraitIds: string[];
  level: number;
  humanAbility: AbilityName;
  baseAbilities: AbilityScores;
  pointBuyBudget: 10 | 15 | 20 | 25;
  abilityBoosts: AbilityName[];
  favoredClassHitPoints: number;
  favoredClassSkillRanks: number;
  favoredClassAlternateBonuses: Record<string, number>;
  selectedFeatIds: string[];
  selectedTraitIds: string[];
  selectedTraitChoices: Record<string, string>;
  selectedFeatChoices: Record<string, string>;
  skillRanks: Record<string, number>;
  selectedOptions: Record<string, string>;
  preparedSpells: string[];
  preparedSpellsByClass: Record<string, string[]>;
  knownPreparedSpellsByClass?: Record<string, string[]>;
  spellSlotUses: Record<string, number>;
  spellSlotUsesByClass: Record<string, Record<string, number>>;
  classResourceUsesByClass?: Record<string, Record<string, number>>;
  companions?: Record<string, {
    kind: "animal" | "mount" | "familiar" | "eidolon";
    optionId: string;
    name: string;
    currentHitPoints: number | null;
    skillRanks: Record<string, number>;
    featIds: string[];
  }>;
  eidolon?: { size: "Small" | "Medium"; evolutionIds: string[] };
  arcaneReservoir: number | null;
  bardicPerformanceUsed: number;
  wildShapeUsed: number;
  currentHitPoints: number | null;
  temporaryHitPoints: number;
  activeEffects: ActiveEffect[];
  inventory: Array<{
    itemId: string;
    quantity: number;
    equipped: boolean;
    enhancementBonus?: number;
  }>;
  coins: { cp: number; sp: number; gp: number; pp: number };
}

export type CharacterDraft = CharacterDraftV1;
export type ActiveEffectTarget =
  "initiative" | "armorClass" | "fortitude" | "reflex" | "will";
export interface ActiveEffect {
  id: string;
  name: string;
  target: ActiveEffectTarget;
  bonus: number;
  roundsRemaining: number;
}

export interface SourceRef {
  title: string;
  page?: number | null;
  url: string;
}
export interface ClassFeatureOccurrence {
  id: string;
  name: string;
  level: number;
  type: FeatureType;
  summary: string;
  description?: string;
  progressionKey?: string | null;
  scaling?: string | null;
  uses?: string | null;
  choiceRequired?: boolean;
  optionGroupId?: string | null;
  featChoiceIds?: string[];
  featChoiceTypes?: string[];
  ignoreFeatPrerequisites?: boolean;
  grantedFeatId?: string;
  grantedFeatIds?: string[];
  source?: SourceRef;
  requiredOptionId?: string;
  requiredOptionMessage?: string;
}
export interface CharacterClass {
  id: string;
  name: string;
  classType: string;
  hitDie: 6 | 8 | 10 | 12;
  babProgression: Progression;
  saves: {
    fortitude: SaveProgression;
    reflex: SaveProgression;
    will: SaveProgression;
  };
  maximumLevel?: number;
  baseAttackBonusByLevel?: number[];
  savesByLevel?: Array<{ fortitude: number; reflex: number; will: number }>;
  requirements?: string[];
  spellcastingAdvancement?: {
    tradition: "arcane" | "divine" | "any";
    levels: number[];
    targetCount?: number;
    targetTraditions?: Array<"arcane" | "divine">;
  };
  skillRanksPerLevel: number;
  classSkills: string[];
  source: SourceRef;
  features: ClassFeatureOccurrence[];
  spellListAdditions?: Record<string, number>;
  bonusSpellAdditions?: Record<string, number>;
  spellSlotAdjustmentPerLevel?: number;
  preparedSpellAdjustmentPerLevel?: number;
  spellsKnownAdjustmentPerLevel?: number;
  companionGrants?: ArchetypeCompanionGrant[];
  wildShapeLevelAdjustment?: number;
  druidDomainIds?: string[];
  rangerCombatStyleIds?: string[];
  mountedCompanionOnly?: boolean;
  classSkillAdditions?: string[];
  classSkillRemovals?: string[];
  spellcasting?: {
    ability: "intelligence" | "wisdom" | "charisma";
    tradition?: "arcane" | "divine";
    castingType: "prepared" | "spontaneous";
    slotsByLevel: number[][];
    preparedByLevel?: number[][];
    knownByLevel?: number[][];
    spellLevelUnlocks?: number[];
    preparesFromSlots?: boolean;
  };
}
export interface CharacterArchetype {
  id: string;
  name: string;
  classId: string;
  summary: string;
  replacesText?: string;
  nestedReplacements?: string[];
  requirements?: Prerequisite[];
  manualRequirements?: string[];
  mechanicalCoverage?: "full" | "partial" | "descriptive";
  mechanicalNotes?: string[];
  replacements: Array<{
    featureIds?: string[];
    progressionKeys?: string[];
    features: ClassFeatureOccurrence[];
  }>;
  featureOverrides?: Array<{ featureId: string; summary: string }>;
  spellListAdditions?: Record<string, number>;
  bonusSpellAdditions?: Record<string, number>;
  spellSlotAdjustmentPerLevel?: number;
  preparedSpellAdjustmentPerLevel?: number;
  spellsKnownAdjustmentPerLevel?: number;
  companionGrants?: ArchetypeCompanionGrant[];
  removesSpellcasting?: boolean;
  wildShapeLevelAdjustment?: number;
  druidDomainIds?: string[];
  rangerCombatStyleIds?: string[];
  mountedCompanionOnly?: boolean;
  classSkillAdditions?: string[];
  classSkillRemovals?: string[];
  resourceAdjustments?: Array<{
    resourceId: string;
    label: string;
    unit: string;
    operation?: "add" | "replace";
    minimumLevel?: number;
    base: number;
    perInterval?: number;
    interval?: number;
    abilityModifier?: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
    minimum?: number;
    maximum?: number;
  }>;
  source: SourceRef;
}
export interface ArchetypeCompanionGrant {
  id: string;
  kind: "animal" | "mount" | "familiar";
  label: string;
  optionId: string;
  minimumLevel: number;
  effectiveLevelAdjustment?: number;
  stacksWithExisting?: boolean;
}
export type Prerequisite =
  | { type: "level"; minimum?: number; maximum?: number }
  | { type: "bab" | "caster-level"; minimum: number }
  | { type: "class-level"; classId: string; minimum: number }
  | {
      type: "spell-level";
      minimum: number;
      castingType?: "prepared" | "spontaneous";
    }
  | { type: "ability" | "skill"; key: string; minimum: number }
  | { type: "save"; key: "fortitude" | "reflex" | "will"; minimum: number }
  | { type: "feat" | "feature" | "spell-access"; id: string }
  | { type: "rule"; description: string }
  | { type: "ancestry"; id: string }
  | {
      type: "size";
      minimum?:
        | "fine"
        | "diminutive"
        | "tiny"
        | "small"
        | "medium"
        | "large"
        | "huge"
        | "gargantuan"
        | "colossal";
      maximum?:
        | "fine"
        | "diminutive"
        | "tiny"
        | "small"
        | "medium"
        | "large"
        | "huge"
        | "gargantuan"
        | "colossal";
    }
  | { type: "matching-choice"; featId: string; key: string }
  | { type: "choice-value"; featId: string; key: string; value: string }
  | { type: "any"; prerequisites: Exclude<Prerequisite, { type: "any" }>[] };
export interface SelectableOption {
  id: string;
  groupId: string;
  name: string;
  classIds: string[];
  minimumLevel: number;
  prerequisites: Prerequisite[];
  benefit: string;
  source: SourceRef;
  featId?: string;
  spellId?: string;
  spellLevel?: number;
  repeatable?: boolean;
  selectionLimit?: number;
  familyId?: string;
  exclusiveGroupId?: string;
  choice?: {
    key: string;
    label: string;
    options: Array<{ id: string; name: string }>;
    uniqueAcrossSelections?: boolean;
  };
}

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
  alternateTraits?: Array<{
    id: string;
    name: string;
    summary: string;
    replaces: string[];
    source?: SourceRef;
  }>;
  alternateTraitSource?: SourceRef;
  source: SourceRef;
}

export interface CharacterFeat {
  id: string;
  name: string;
  type: string;
  benefit: string;
  description?: string;
  rulesSections?: Array<{ label: string; text: string }>;
  prerequisites: Prerequisite[];
  source: SourceRef;
  effects?: {
    initiative?: number;
    saves?: Partial<Record<"fortitude" | "reflex" | "will", number>>;
    armorClass?: Partial<Record<"normal" | "touch" | "flatFooted", number>>;
    hitPoints?: { minimum: number; perLevel: number };
    skillBonuses?: Record<string, number>;
    chosenSkill?: {
      bonus: number;
      rankThreshold?: { minimum: number; bonus: number };
    };
    chosenWeapon?: {
      attack?: number;
      damage?: number;
    };
  };
  choice?: {
    key: string;
    label: string;
    options?: Array<{ id: string; name: string }>;
    allowCustom?: boolean;
  };
}

export type TraitCategory = "combat" | "faith" | "magic" | "social";
export interface CharacterTrait {
  id: string;
  name: string;
  category: TraitCategory;
  summary: string;
  effects: {
    initiative?: number;
    saves?: Partial<Record<"fortitude" | "reflex" | "will", number>>;
    skillBonuses?: Record<string, number>;
    classSkills?: string[];
    conditionalModifiers?: Array<{
      label: string;
      bonus?: number;
      condition: string;
    }>;
    chosenSpell?: {
      casterLevel?: number;
      metamagicLevelAdjustment?: number;
      spellLikeAbilityUses?: number;
    };
  };
  choice?:
    | {
        key: "classSkill";
        label: string;
        options: string[];
      }
    | {
        key: "spell";
        label: string;
        optionSource: "spells";
        maximumSpellLevel?: number;
      }
    | {
        key: "class";
        label: string;
        optionSource: "classes";
      };
  source: SourceRef;
}

export interface CharacterOption extends SelectableOption {
  cost?: number;
  baseForms?: string[];
  requiredEvolutionIds?: string[];
  patronSpells?: string[];
  associatedSchool?: string;
  elementalOppositionSchool?: string;
  elementalSpellIdsByLevel?: Record<string, string[]>;
  parentDomainId?: string;
  replacesPower?: string;
  classSkills?: string[];
  alignment?: string;
  polarity?: string;
  domains?: string[];
  classSkill?: string;
  classSkillChoices?: string[];
  variants?: Array<{
    id: string;
    name: string;
    energyType: string;
    breathShape?: string;
    movement?: string;
  }>;
  arcana?: string;
  bonusSpells?: Array<{
    sorcererLevel: number;
    spellLevel: number;
    name: string;
  }>;
  bonusFeats?: string[];
  powers?: Array<{ name: string; level: number; summary: string }>;
  domainSpells?: Array<{ level: number; name: string }>;
  mysteryId?: string;
  incompatibleOptionIds?: string[];
  mysterySpells?: Array<{
    oracleLevel: number;
    spellLevel: number;
    name: string;
  }>;
  revelations?: Array<{
    id: string;
    name: string;
    minimumLevel: number;
    summary: string;
  }>;
  finalRevelation?: string;
}

export interface CharacterOptionGroup {
  id: string;
  name: string;
  classIds: string[];
  options: CharacterOption[];
  generatedSpellOptions?: {
    classId: string;
    targetClassId?: string;
    school?: string;
    maximumSpellLevel?: number;
    additionalSpellIds?: string[];
    additionalSpellLevels?: Record<string, number>;
  };
}

export interface CharacterSpell {
  id: string;
  name: string;
  school?: string;
  schools?: string[];
  levelByClass: Record<string, number>;
  summary: string;
  description?: string;
  components?: string[];
  castingTime?: string;
  range?: string;
  target?: string;
  area?: string;
  effect?: string;
  duration?: string;
  savingThrow?: string;
  spellResistance?: string;
  source?: SourceRef;
}

export interface GeneratedDataBundle {
  generatedAt: string;
  classes: CharacterClass[];
  archetypes: CharacterArchetype[];
  races: CharacterAncestry[];
  optionGroups: CharacterOptionGroup[];
  feats: CharacterFeat[];
  traits: CharacterTrait[];
  spells: CharacterSpell[];
}
