"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ancestries,
  archetypes as compactArchetypes,
  classes,
  feats,
  optionGroups,
  skills,
  traits,
} from "./character-catalogue";
import { AbilityEditor } from "./ability-editor";
import { CharacterDetails } from "./character-details";
import { ClassFeatures } from "./class-features";
import { Spellbook } from "./spellbook";
import { classSpellAutomation } from "./archetype-spell-automation";
import { SpontaneousSpellbook } from "./spontaneous-spellbook";
import { ClassSpellbook } from "./class-spellbook";
import { SkillAllocation } from "./skill-allocation";
import { FeatChoices } from "./feat-choices";
import { ClassOptions } from "./class-options";
import { EidolonBuilder } from "./eidolon-builder";
import { CompanionManager, type CompanionDescriptor } from "./companion-manager";
import { ArchetypeAutomationStatus } from "./archetype-automation-status";
import { CombatPanel, ProgressionSummary } from "./character-summary";
import { CharacterTabs, type CharacterTabId } from "./character-tabs";
import { TraitChoices } from "./trait-choices";
import {
  EquipmentPanel,
  equipmentCombatBonuses,
  equipmentEncumbrance,
  equippedArmorCategory,
  equippedWeaponAttacks,
  type CoinPurse,
  type InventoryEntry,
} from "./equipment-panel";
import { LevelUpPanel } from "./level-up-panel";
import { ActivePlayPanel } from "./active-play-panel";
import { TwilightSageControls } from "./twilight-sage-controls";
import { CharacterWorkspace } from "./character-workspace";
import { LevelProgression } from "./level-progression";
import {
  alternateFavoredClassRewards,
  alternateRewardValue,
  FavoredClassBonus,
  FavoredClassBenefits,
} from "./favored-class-bonus";
import { AncestryTraits } from "./ancestry-traits";
import {
  CharacterLibrary,
  characterAutosaveKey,
  characterLibraryKey,
  emptyCharacterLibrary,
  legacyCharacterKey,
  normalizeCharacterLibrary,
  type CharacterLibraryV1,
  type CharacterVersion,
} from "./character-library";
import { useFeatCatalogue } from "./use-feat-catalogue";
import { useArchetypeCatalogue } from "./use-archetype-catalogue";
import { useSpellCatalogue } from "./use-spell-catalogue";
import {
  abilityBoostCount,
  abilityNames,
  apgClassResourceMaximums,
  archetypeConditionalModifiers,
  archetypeInitiativeBonus,
  archetypeSkillBonusAdjustments,
  archetypeSkillBonuses,
  applyArchetypeResourceAdjustments,
  applyArchetypes,
  adjustedCompanionLevel,
  arcaneReservoir,
  availableOptions,
  bardicPerformanceRounds,
  characterCombatStats,
  characterLandSpeed,
  classProgression,
  druidWildShapeUses,
  effectiveSpellcastingLevels,
  featBonuses,
  featPrerequisiteResults,
  inferArchetypeFeatAlternatives,
  inferArchetypeFeatChoices,
  inferArchetypeGrantedFeats,
  inferArchetypeResourceAdjustments,
  multiclassAverageHitPoints,
  multiclassProgression,
  normalizeAbilityBoosts,
  normalizeCharacterDraft,
  normalizeClassResourcesByClass,
  normalizePreparedSourceSpells,
  preparedSourceAvailableSpells,
  preparedSourceSpellCapacity,
  normalizeSelectedAlternateRacialTraits,
  normalizeSelectedFeatChoices,
  normalizeSelectedFeats,
  normalizeSelectedTraitChoices,
  normalizeSelectedTraits,
  normalizeSkillRanks,
  normalizeSpellSlotUses,
  pointBuySummary,
  prerequisitesMet,
  skillRankBudget,
  skillTotal,
  spellSaveDC,
  spellcastingProgression,
  spellsAvailableToClass,
  traitBonuses,
  validateEidolonEvolutions,
  witchPatronSpells,
} from "../../../packages/engine/src/index.js";
import { normalizePreparedSpellsWithOpposition } from "../../../packages/engine/src/wizard-opposition-preparation.js";
import {
  normalizeKnownSpells,
  spontaneousSpellcastingProgression,
} from "../../../packages/engine/src/spontaneous-spellcasting.js";
import {
  bloodlineBonusSpells,
  bloodlineClassSkills,
} from "../../../packages/engine/src/sorcerer-bloodlines.js";
import { mysteryBonusSpells } from "../../../packages/engine/src/oracle-mysteries.js";
import type {
  ActiveEffect,
  CharacterClassLevel,
  CharacterDraftV1,
  CharacterOption,
  CharacterSpell,
  Prerequisite,
} from "../../../packages/types/src/index.js";

const labels = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};
const defaultAbilities = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};
const prerequisiteFeatureKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const signatureSpellOption = (spell: CharacterSpell): CharacterOption => ({
  id: `spell-specialist-signature-spells-${spell.id}`,
  name: spell.name,
  groupId: "spell-specialist-signature-spells",
  classIds: ["arcanist"],
  minimumLevel: 1,
  prerequisites: [],
  benefit: `Cast ${spell.name} as a signature spell without preparing it. ${spell.summary}`,
  spellId: spell.id,
  spellLevel: spell.levelByClass.arcanist,
  castsAsPrepared: true,
  preparedCapacityCost: 1,
  spellSaveDcBonus: 1,
  concentrationBonus: { base: 2, improvedAtLevel: 10, improved: 4 },
  signatureSpellTechniques: true,
  source: { title: "Advanced Class Guide", page: 78, url: "https://www.aonprd.com/ArchetypeDisplay.aspx?FixedName=Arcanist%20Spell%20Specialist" },
});
const prerequisiteIncludesFeat = (prerequisites: Prerequisite[], featIds: string[]): boolean =>
  prerequisites.some((prerequisite) =>
    prerequisite.type === "feat"
      ? featIds.includes(prerequisite.id)
      : prerequisite.type === "any"
        ? prerequisiteIncludesFeat(prerequisite.prerequisites, featIds)
        : false,
  );
const generatedFeatGroupIds = new Set([
  "archetype-feats",
  "monk-bonus-feats",
  "warpriest-weapon-focus",
  "warpriest-bonus-feats",
  "swashbuckler-bonus-feats",
  "brawler-bonus-feats",
  "bloodrager-bloodline-feats",
]);
const magaambyanMasteryKeyPrefix = "magaambyan-spell-mastery-";
const monkBonusFeatIds = [
  "catch-off-guard",
  "combat-reflexes",
  "deflect-arrows",
  "dodge",
  "improved-grapple",
  "scorpion-style",
  "throw-anything",
];
const monkBonusFeatIdsAt6 = [
  "gorgons-fist",
  "improved-bull-rush",
  "improved-disarm",
  "improved-feint",
  "improved-trip",
  "mobility",
];
const monkBonusFeatIdsAt10 = [
  "improved-critical",
  "medusas-wrath",
  "snatch-arrows",
  "spring-attack",
];
const adaptBonusFeatPrerequisite = (prerequisite: Prerequisite, classId: string): Prerequisite => {
  if (prerequisite.type === "class-level" && ["fighter", "monk"].includes(prerequisite.classId) && ["brawler"].includes(classId)) {
    return { ...prerequisite, classId };
  }
  if (prerequisite.type === "class-level" && prerequisite.classId === "fighter" && ["warpriest", "swashbuckler", "bloodrager"].includes(classId)) {
    return { ...prerequisite, classId };
  }
  if (prerequisite.type === "bab" && classId === "warpriest") {
    return { type: "class-level", classId, minimum: prerequisite.minimum };
  }
  if (prerequisite.type === "any") {
    return { ...prerequisite, prerequisites: prerequisite.prerequisites.map((item) => adaptBonusFeatPrerequisite(item, classId) as Exclude<Prerequisite, { type: "any" }>) };
  }
  return prerequisite;
};
const archetypeIdsByClass = Object.fromEntries(
  classes.map((characterClass) => [
    characterClass.id,
    compactArchetypes
      .filter((archetype) => archetype.classId === characterClass.id)
      .map((archetype) => archetype.id),
  ]),
);
const abilityForSpecializedSkill = (name: string) =>
  name.startsWith("Craft (") || name.startsWith("Knowledge (")
    ? "intelligence" as const
    : name.startsWith("Perform (")
      ? "charisma" as const
      : name.startsWith("Profession (")
        ? "wisdom" as const
        : null;
const wizardOppositionFeatureIds = [
  "wizard-opposition-school-1-first",
  "wizard-opposition-school-1-second",
] as const;
const schoolSavantOppositionFeatureIds = [
  "school-savant-opposition-school-1-first",
  "school-savant-opposition-school-1-second",
] as const;
const oppositionSchoolsFromOptions = (
  selectedClassId: string,
  options: Record<string, string>,
) =>
  selectedClassId === "wizard" || selectedClassId === "arcanist"
    ? (selectedClassId === "wizard" ? wizardOppositionFeatureIds : schoolSavantOppositionFeatureIds)
        .map((featureId) => options[featureId])
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
const elementalMasterPreparationFromOptions = (
  characterClass: (typeof classes)[number] | undefined,
  options: Record<string, string>,
) => {
  if (!characterClass?.features.some((feature) => feature.id === "arcanist-elemental-master-elemental-focus-su-1")) return null;
  const element = optionGroups
    .find((group) => group.id === "elemental-master-elements")
    ?.options.find((option) => option.id === options["arcanist-elemental-master-elemental-focus-su-1"]);
  if (!element) return null;
  const oppositionElement = optionGroups
    .find((group) => group.id === "wizard-schools")
    ?.options.find((option) => option.id === `wizard-school-${element.elementalOppositionSchool}`);
  return {
    eligibleSpellIds: Object.values(element.elementalSpellIdsByLevel ?? {}).flat(),
    oppositionSpellIds: Object.values(oppositionElement?.elementalSpellIdsByLevel ?? {}).flat(),
    countPerLevel: 1,
    label: `${element.name} bonus slot`,
  };
};
const requiredPreparedSchool = (characterClass: (typeof classes)[number] | undefined) =>
  characterClass?.features.some((feature) => feature.id === "arcanist-twilight-sage-necromantic-focus-ex-1")
    ? "necromancy"
    : undefined;
const bloodlineFromOptions = (
  selectedClassId: string,
  options: Record<string, string>,
) =>
  selectedClassId === "sorcerer"
    ? optionGroups
        .find((group) => group.id === "sorcerer-bloodlines")
        ?.options.find(
          (option) => option.id === options["sorcerer-bloodline-1"],
        )
    : undefined;
const mysteryFromOptions = (
  selectedClassId: string,
  options: Record<string, string>,
) =>
  selectedClassId === "oracle"
    ? optionGroups
        .find((group) => group.id === "oracle-mysteries")
        ?.options.find((option) => option.id === options["oracle-mystery-1"])
    : undefined;
const witchPatronFromOptions = (
  selectedClassId: string,
  options: Record<string, string>,
) =>
  selectedClassId === "witch"
    ? optionGroups
        .find((group) => group.id === "witch-patrons")
        ?.options.find((option) => option.id === options["witch-patron-1"])
    : undefined;

function mergeSpellLists<T extends { id: string }>(
  baseSpells: T[],
  grantedSpells: T[],
) {
  const byId = new Map(baseSpells.map((spell) => [spell.id, spell]));
  for (const spell of grantedSpells) byId.set(spell.id, spell);
  return [...byId.values()];
}

function spellsFromAdditions<T extends { id: string; levelByClass: Record<string, number> }>(
  catalogue: T[],
  additions: Record<string, number> | undefined,
  classId: string,
  maximumSpellLevel: number,
) {
  return Object.entries(additions ?? {}).flatMap(([spellId, spellLevel]) => {
    const spell = catalogue.find((candidate) => candidate.id === spellId);
    return spell && spellLevel <= maximumSpellLevel
      ? [{ ...spell, levelByClass: { ...spell.levelByClass, [classId]: spellLevel } }]
      : [];
  });
}

function onDemandSpellCosts(options: CharacterOption[], classId: string, classLevel: number) {
  return Object.fromEntries(options.flatMap((option) => {
    if (!option.castsAsPrepared || !option.spellId || !option.classIds.includes(classId)) return [];
    const spellLevel = option.spellLevel ?? 0;
    const resource = option.resourceCost;
    const cost = !resource || classLevel >= (resource.freeAtClassLevel ?? Number.POSITIVE_INFINITY) ? 0 : Math.max(
      resource.minimum ?? 0,
      (resource.base ?? 0) + (resource.levelDivisor ? Math.floor(spellLevel / resource.levelDivisor) : 0),
    );
    const concentrationBonus = classLevel >= (option.concentrationBonus?.improvedAtLevel ?? Number.POSITIVE_INFINITY)
      ? option.concentrationBonus?.improved ?? option.concentrationBonus?.base ?? 0
      : option.concentrationBonus?.base ?? 0;
    return [[option.spellId, {
      resourceId: resource?.resourceId,
      cost,
      label: resource?.label ?? "Signature Spell",
      consumesSpellSlot: resource?.consumesSpellSlot ?? true,
      saveDcBonus: option.spellSaveDcBonus ?? 0,
      concentrationBonus,
      signatureSpellTechniques: option.signatureSpellTechniques ?? false,
      ...(resource?.summonTracker ? {
        summonTracker: {
          name: resource.summonTracker.name,
          description: resource.summonTracker.description,
          rounds: classLevel >= (resource.summonTracker.untilDismissedAtClassLevel ?? Number.POSITIVE_INFINITY)
            ? 999
            : Math.min(999, classLevel * resource.summonTracker.roundsPerClassLevel),
          replaceExisting: resource.summonTracker.replaceExisting,
          untilDismissed: classLevel >= (resource.summonTracker.untilDismissedAtClassLevel ?? Number.POSITIVE_INFINITY),
        },
      } : {}),
    }]];
  }));
}

function preparedCapacityCosts(options: CharacterOption[], classId: string) {
  return options.reduce<Record<number, number>>((costs, option) => {
    if (!option.classIds.includes(classId) || !option.preparedCapacityCost || option.spellLevel === undefined) return costs;
    costs[option.spellLevel] = (costs[option.spellLevel] ?? 0) + option.preparedCapacityCost;
    return costs;
  }, {});
}

function normalizeAdditionalClassLevels(
  entries: CharacterClassLevel[],
  primaryClassId: string,
  characterLevel: number,
) {
  const seen = new Set([primaryClassId]);
  const valid = entries
    .filter((entry) => {
      if (
        !classes.some((item) => item.id === entry.classId) ||
        seen.has(entry.classId)
      )
        return false;
      seen.add(entry.classId);
      return true;
    })
    .slice(0, Math.max(0, characterLevel - 1));
  let remaining = characterLevel - 1;
  return valid.map((entry, index) => {
    const maximum = remaining - (valid.length - index - 1);
    const normalized = {
      classId: entry.classId,
      level: Math.max(1, Math.min(entry.level, maximum)),
    };
    remaining -= normalized.level;
    return normalized;
  });
}

export default function Home() {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("arcanist");
  const [additionalClassLevels, setAdditionalClassLevels] = useState<
    CharacterClassLevel[]
  >([]);
  const [archetypeId, setArchetypeId] = useState("");
  const [additionalArchetypeIds, setAdditionalArchetypeIds] = useState<
    Record<string, string>
  >({});
  const [archetypeStacksByClass, setArchetypeStacksByClass] = useState<
    Record<string, string[]>
  >({});
  const [prestigeSpellcastingTargets, setPrestigeSpellcastingTargets] =
    useState<Record<string, string[]>>({});
  const [ancestryId, setAncestryId] = useState("human");
  const [selectedAlternateRacialTraitIds, setSelectedAlternateRacialTraitIds] =
    useState<string[]>([]);
  const [level, setLevel] = useState(1);
  const [humanAbility, setHumanAbility] =
    useState<keyof typeof defaultAbilities>("intelligence");
  const [baseAbilities, setBaseAbilities] = useState(defaultAbilities);
  const [pointBuyBudget, setPointBuyBudget] = useState<10 | 15 | 20 | 25>(15);
  const [abilityBoosts, setAbilityBoosts] = useState<
    (keyof typeof defaultAbilities)[]
  >([]);
  const [favoredClassHitPoints, setFavoredClassHitPoints] = useState(0);
  const [favoredClassSkillRanks, setFavoredClassSkillRanks] = useState(0);
  const [favoredClassAlternateBonuses, setFavoredClassAlternateBonuses] =
    useState<Record<string, number>>({});
  const [selectedFeatIds, setSelectedFeatIds] = useState<string[]>([]);
  const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>([]);
  const [selectedTraitChoices, setSelectedTraitChoices] = useState<
    Record<string, string>
  >({});
  const [selectedFeatChoices, setSelectedFeatChoices] = useState<
    Record<string, string>
  >({});
  const [skillRanks, setSkillRanks] = useState<Record<string, number>>({});
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [signatureSpellHighestClassLevel, setSignatureSpellHighestClassLevel] =
    useState<number | null>(null);
  const [signatureSpellExchangeCredits, setSignatureSpellExchangeCredits] =
    useState(0);
  const [selectedSpellIds, setSelectedSpellIds] = useState<string[]>([]);
  const [spellSlotUses, setSpellSlotUses] = useState<Record<number, number>>(
    {},
  );
  const [secondarySelectedSpellIds, setSecondarySelectedSpellIds] = useState<
    string[]
  >([]);
  const [secondarySpellSlotUses, setSecondarySpellSlotUses] = useState<
    Record<number, number>
  >({});
  const [extraSelectedSpellsByClass, setExtraSelectedSpellsByClass] = useState<
    Record<string, string[]>
  >({});
  const [knownPreparedSpellsByClass, setKnownPreparedSpellsByClass] = useState<
    Record<string, string[]>
  >({});
  const [extraSpellSlotUsesByClass, setExtraSpellSlotUsesByClass] = useState<
    Record<string, Record<number, number>>
  >({});
  const [activeSpellClassId, setActiveSpellClassId] = useState("");
  const [reservoirPoints, setReservoirPoints] = useState(3);
  const [bardicPerformanceUsed, setBardicPerformanceUsed] = useState(0);
  const [wildShapeUsed, setWildShapeUsed] = useState(0);
  const [classResourceUsesByClass, setClassResourceUsesByClass] = useState<
    Record<string, Record<string, number>>
  >({});
  const [companions, setCompanions] = useState<
    NonNullable<CharacterDraftV1["companions"]>
  >({});
  const [eidolonSize, setEidolonSize] = useState<"Small" | "Medium">("Medium");
  const [eidolonEvolutionIds, setEidolonEvolutionIds] = useState<string[]>([]);
  const [currentHitPoints, setCurrentHitPoints] = useState<number | null>(null);
  const [temporaryHitPoints, setTemporaryHitPoints] = useState(0);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const addActiveEffect = useCallback((effect: ActiveEffect) => {
    setActiveEffects((current) => [
      ...current.filter((item) => item.name !== effect.name || item.target !== effect.target),
      effect,
    ].slice(-20));
  }, []);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [coins, setCoins] = useState<CoinPurse>({ cp: 0, sp: 0, gp: 0, pp: 0 });
  const [activeTab, setActiveTab] = useState<CharacterTabId>("overview");
  const { feats: displayFeats, loading: featCatalogueLoading } =
    useFeatCatalogue(activeTab === "feats");
  const { spells, loading: spellCatalogueLoading } = useSpellCatalogue(
    activeTab === "spells",
  );
  const hasSelectedArchetype =
    Boolean(archetypeId) ||
    Object.values(additionalArchetypeIds).some(Boolean) ||
    Object.values(archetypeStacksByClass).some((ids) => ids.length > 0);
  const { archetypes, loading: archetypeCatalogueLoading } =
    useArchetypeCatalogue(hasSelectedArchetype);
  const [saveNotice, setSaveNotice] = useState("");
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProgressionLevel, setSelectedProgressionLevel] = useState(1);
  const [levelUpClassId, setLevelUpClassId] = useState("");
  const [characterLibrary, setCharacterLibrary] = useState<CharacterLibraryV1>(
    emptyCharacterLibrary,
  );
  const [autosaveStatus, setAutosaveStatus] = useState(
    "All changes saved locally",
  );
  const [recoveryDraft, setRecoveryDraft] = useState<{
    updatedAt: string;
    draft: CharacterDraftV1;
  } | null>(null);
  const autosaveReady = useRef(false);
  const lastPersistedDraft = useRef("");
  const skipNextFeatNormalization = useRef(false);

  const baseCharacterClass =
    classes.find((item) => item.id === classId) ?? classes[0];
  const availableArchetypes = useMemo(
    () => archetypes.filter((item) => item.classId === baseCharacterClass.id),
    [archetypes, baseCharacterClass.id],
  );
  const primaryArchetypeIds =
    archetypeStacksByClass[classId] ?? (archetypeId ? [archetypeId] : []);
  const selectedArchetypes = useMemo(
    () =>
      primaryArchetypeIds.flatMap(
        (id) => availableArchetypes.find((item) => item.id === id) ?? [],
      ),
    [availableArchetypes, primaryArchetypeIds.join("|")],
  );
  const selectedArchetypeReplacesText = selectedArchetypes
    .map((item) => item.replacesText)
    .filter(Boolean)
    .join("; ");
  const characterClass = useMemo(
    () => applyArchetypes(baseCharacterClass, selectedArchetypes),
    [baseCharacterClass, selectedArchetypes],
  );
  const additionalCharacterClasses = useMemo(
    () =>
      additionalClassLevels
        .map((entry) => {
          const baseClass = classes.find((item) => item.id === entry.classId);
          const selectedIds =
            archetypeStacksByClass[entry.classId] ??
            (additionalArchetypeIds[entry.classId]
              ? [additionalArchetypeIds[entry.classId]]
              : []);
          const selectedAdditionalArchetypes = selectedIds.flatMap(
            (id) =>
              archetypes.find(
                (item) => item.id === id && item.classId === entry.classId,
              ) ?? [],
          );
          return baseClass
            ? applyArchetypes(baseClass, selectedAdditionalArchetypes)
            : undefined;
        })
        .filter((item): item is (typeof classes)[number] => Boolean(item)),
    [additionalArchetypeIds, additionalClassLevels, archetypeStacksByClass],
  );
  const allSelectedArchetypes = useMemo(() => {
    const selectedIds = new Set([
      ...primaryArchetypeIds,
      ...Object.values(archetypeStacksByClass).flat(),
      ...Object.values(additionalArchetypeIds).filter(Boolean),
    ]);
    return archetypes.filter((archetype) => selectedIds.has(archetype.id));
  }, [
    additionalArchetypeIds,
    archetypeStacksByClass,
    archetypes,
    primaryArchetypeIds.join("|"),
  ]);
  const secondaryClassId = additionalClassLevels[0]?.classId ?? "";
  const secondaryClassLevel = additionalClassLevels[0]?.level ?? 0;
  const secondaryCharacterClass = additionalCharacterClasses[0];
  const assignedAdditionalLevels = additionalClassLevels.reduce(
    (total, entry) => total + entry.level,
    0,
  );
  const primaryClassLevel = level - assignedAdditionalLevels;
  const classLevels = useMemo(
    () => [
      { classId: characterClass.id, level: primaryClassLevel },
      ...additionalClassLevels,
    ],
    [additionalClassLevels, characterClass.id, primaryClassLevel],
  );
  const progressionClasses = useMemo(
    () => [characterClass, ...additionalCharacterClasses],
    [additionalCharacterClasses, characterClass],
  );
  const selectedLevelUpClassId = levelUpClassId || characterClass.id;
  const levelUpClassEntry = classLevels.find(
    (entry) => entry.classId === selectedLevelUpClassId,
  ) ?? { classId: selectedLevelUpClassId, level: 0 };
  const levelUpClassChoices = classes
    .filter(
      (item) =>
        item.classType !== "prestige" ||
        classLevels.some((entry) => entry.classId === item.id),
    )
    .map((item) => ({ id: item.id, name: item.name }));
  const classLevelMap = useMemo(
    () =>
      Object.fromEntries(
        classLevels.map((entry) => [entry.classId, entry.level]),
      ),
    [classLevels],
  );
  const hasSpellSpecialist = allSelectedArchetypes.some(
    (archetype) => archetype.id === "arcanist-spell-specialist",
  );
  const arcanistClassLevel = classLevelMap.arcanist ?? 0;
  useEffect(() => {
    if (!hasSpellSpecialist) {
      if (signatureSpellHighestClassLevel !== null)
        setSignatureSpellHighestClassLevel(null);
      if (signatureSpellExchangeCredits !== 0)
        setSignatureSpellExchangeCredits(0);
      return;
    }
    if (signatureSpellHighestClassLevel === null) {
      setSignatureSpellHighestClassLevel(Math.max(1, arcanistClassLevel));
      return;
    }
    if (arcanistClassLevel > signatureSpellHighestClassLevel) {
      setSignatureSpellExchangeCredits((current) =>
        Math.min(19, current + arcanistClassLevel - signatureSpellHighestClassLevel),
      );
      setSignatureSpellHighestClassLevel(arcanistClassLevel);
    }
  }, [arcanistClassLevel, hasSpellSpecialist, signatureSpellExchangeCredits, signatureSpellHighestClassLevel]);
  const effectiveSpellcastingLevelMap = useMemo(
    () =>
      effectiveSpellcastingLevels(
        progressionClasses,
        classLevels,
        prestigeSpellcastingTargets,
      ),
    [classLevels, prestigeSpellcastingTargets, progressionClasses],
  );
  const primarySpellcastingLevel =
    effectiveSpellcastingLevelMap[characterClass.id] ?? primaryClassLevel;
  const secondarySpellcastingLevel =
    effectiveSpellcastingLevelMap[secondaryClassId] ?? secondaryClassLevel;
  const eldritchSurgeCasterLevelBonus = activeEffects.filter((effect) => effect.target === "casterLevel").reduce((total, effect) => total + effect.bonus, 0);
  const ancestry =
    ancestries.find((item) => item.id === ancestryId) ?? ancestries[0];
  const selectedAlternateRacialTraits = (ancestry.alternateTraits ?? []).filter(
    (trait) => selectedAlternateRacialTraitIds.includes(trait.id),
  );
  const replacedRacialTraitIds = new Set(
    selectedAlternateRacialTraits.flatMap((trait) => trait.replaces),
  );
  const effectiveRacialTraits = ancestry.traits.filter(
    (trait) => !replacedRacialTraitIds.has(trait.id),
  );
  const selectedTraitBonuses = useMemo(
    () =>
      traitBonuses(selectedTraitIds, traits, selectedTraitChoices, {
        spells,
        classes,
        classId,
      }),
    [classId, selectedTraitChoices, selectedTraitIds],
  );
  const selectedBloodline = useMemo(
    () => bloodlineFromOptions(classId, selectedOptions),
    [classId, selectedOptions],
  );
  const selectedMystery = useMemo(
    () => mysteryFromOptions(classId, selectedOptions),
    [classId, selectedOptions],
  );
  const selectedWitchPatron = useMemo(
    () => witchPatronFromOptions(classId, selectedOptions),
    [classId, selectedOptions],
  );
  const selectedBloodlineClassSkill =
    selectedOptions["sorcerer-bloodline-class-skill"];
  const selectedOptionClassSkills = useMemo(() => {
    const selectedIds = new Set(Object.values(selectedOptions));
    return optionGroups
      .flatMap((group) => group.options)
      .filter((option) => selectedIds.has(option.id))
      .flatMap((option) => option.classSkills ?? []);
  }, [selectedOptions]);
  const skillCharacterClass = useMemo(() => {
    const bloodlineSkills = selectedBloodline?.classSkill
      ? bloodlineClassSkills(
          characterClass.classSkills,
          selectedBloodline,
          selectedBloodlineClassSkill,
        )
      : characterClass.classSkills;
    return {
      ...characterClass,
      classSkills: [
        ...new Set([
          ...bloodlineSkills,
          ...additionalCharacterClasses.flatMap((item) => item.classSkills),
          ...selectedTraitBonuses.classSkills,
          ...selectedOptionClassSkills,
        ]),
      ],
    };
  }, [
    additionalCharacterClasses,
    characterClass,
    selectedBloodline,
    selectedBloodlineClassSkill,
    selectedOptionClassSkills,
    selectedTraitBonuses.classSkills,
  ]);
  const fixedModifiers =
    (ancestry.abilityModifiers as { fixed?: Partial<typeof defaultAbilities> })
      .fixed ?? {};
  const choiceAmount =
    (ancestry.abilityModifiers as { choice?: { amount: number } }).choice
      ?.amount ?? 0;
  const abilities = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(baseAbilities).map((ability) => [
          ability,
          baseAbilities[ability as keyof typeof baseAbilities] +
            (fixedModifiers[ability as keyof typeof baseAbilities] ?? 0) +
            (choiceAmount && ability === humanAbility ? choiceAmount : 0) +
            abilityBoosts.filter((boost) => boost === ability).length +
            activeEffects.filter((effect) => effect.target === ability).reduce((total, effect) => total + effect.bonus, 0),
        ]),
      ) as typeof baseAbilities,
    [abilityBoosts, activeEffects, baseAbilities, choiceAmount, fixedModifiers, humanAbility],
  );
  const pointBuy = pointBuySummary(baseAbilities, pointBuyBudget);
  useEffect(
    () =>
      setAbilityBoosts((current) => {
        const next = normalizeAbilityBoosts(current, level);
        while (next.length < abilityBoostCount(level)) next.push("strength");
        return next;
      }),
    [level],
  );
  useEffect(() => setSelectedProgressionLevel(level), [level]);
  useEffect(() => {
    const validRewardIds = new Set(
      alternateFavoredClassRewards
        .filter(
          (reward) =>
            reward.ancestryId === ancestryId && reward.classId === classId,
        )
        .map((reward) => reward.id),
    );
    let remaining = primaryClassLevel;
    setFavoredClassHitPoints((current) => {
      const next = Math.min(current, remaining);
      remaining -= next;
      return next;
    });
    setFavoredClassSkillRanks((current) => {
      const next = Math.min(current, remaining);
      remaining -= next;
      return next;
    });
    setFavoredClassAlternateBonuses((current) => {
      const next: Record<string, number> = {};
      for (const [id, value] of Object.entries(current)) {
        if (!validRewardIds.has(id) || remaining <= 0) continue;
        next[id] = Math.min(value, remaining);
        remaining -= next[id];
      }
      return next;
    });
  }, [ancestryId, classId, primaryClassLevel]);
  useEffect(
    () =>
      setAdditionalClassLevels((current) => {
        const next = normalizeAdditionalClassLevels(current, classId, level);
        return next.length === current.length &&
          next.every(
            (entry, index) =>
              entry.classId === current[index].classId &&
              entry.level === current[index].level,
          )
          ? current
          : next;
      }),
    [classId, level],
  );
  const ancestryBonusFeats = effectiveRacialTraits.some(
    (trait) => trait.id === "human-bonus-feat",
  )
    ? 1
    : 0;
  const progression = useMemo(() => {
    const options = {
      intelligenceScore: abilities.intelligence,
      racialSkillBonusPerLevel: effectiveRacialTraits.some(
        (trait) => trait.id === "skilled",
      )
        ? 1
        : 0,
      bonusFeats: ancestryBonusFeats,
    };
    const base =
      additionalCharacterClasses.length > 0
        ? multiclassProgression(progressionClasses, classLevels, options)
        : classProgression(characterClass, level, options);
    return { ...base, skillRanks: base.skillRanks + favoredClassSkillRanks };
  }, [
    abilities.intelligence,
    additionalCharacterClasses.length,
    ancestry,
    ancestryBonusFeats,
    characterClass,
    classLevels,
    favoredClassSkillRanks,
    level,
    progressionClasses,
    selectedAlternateRacialTraitIds,
  ]);
  const inferredArchetypeFeatChoices = useMemo(
    () => selectedArchetypes.flatMap((archetype) => {
      const classLevel = classLevelMap[archetype.classId] ?? 0;
      return inferArchetypeFeatChoices(archetype, feats).filter((feature) => feature.level <= classLevel);
    }),
    [classLevelMap, selectedArchetypes],
  );
  const archetypeFeatAlternatives = useMemo(
    () => selectedArchetypes.flatMap((archetype) => inferArchetypeFeatAlternatives(archetype, feats)),
    [selectedArchetypes],
  );
  const retainedArchetypeFeatSlots = useMemo(() => {
    const groups = new Set(archetypeFeatAlternatives.map((alternative) => alternative.optionGroupId));
    return baseCharacterClass.features.filter((feature) =>
      feature.choiceRequired &&
      groups.has(feature.optionGroupId ?? "") &&
      feature.level <= primaryClassLevel &&
      !characterClass.features.some((candidate) => candidate.id === feature.id),
    );
  }, [archetypeFeatAlternatives, baseCharacterClass.features, characterClass.features, primaryClassLevel]);
  const selectableProgressionFeatures = useMemo(
    () => [...progression.features, ...inferredArchetypeFeatChoices, ...retainedArchetypeFeatSlots],
    [inferredArchetypeFeatChoices, progression.features, retainedArchetypeFeatSlots],
  );
  const alternativeAllowsFeat = (feature: (typeof progression.features)[number], feat: (typeof feats)[number]) =>
    archetypeFeatAlternatives.some((alternative) =>
      alternative.optionGroupId === feature.optionGroupId &&
      feature.level >= alternative.minimumLevel &&
      ((alternative.featChoiceIds ?? []).includes(feat.id) || (alternative.featChoiceTypes ?? []).includes(feat.type)),
    );
  const unresolvedChoiceCount = selectableProgressionFeatures.filter(
    (feature) =>
      feature.level <= level &&
      feature.choiceRequired &&
      !selectedOptions[feature.id],
  ).length;
  const nextProgression = useMemo(() => {
    if (level >= 20) return null;
    const options = {
      intelligenceScore: abilities.intelligence,
      racialSkillBonusPerLevel: effectiveRacialTraits.some(
        (trait) => trait.id === "skilled",
      )
        ? 1
        : 0,
      bonusFeats: ancestryBonusFeats,
    };
    const existingEntry = classLevels.some(
      (entry) => entry.classId === levelUpClassEntry.classId,
    );
    const nextClassLevels = existingEntry
      ? classLevels.map((entry) =>
          entry.classId === levelUpClassEntry.classId
            ? { ...entry, level: entry.level + 1 }
            : entry,
        )
      : [...classLevels, { classId: levelUpClassEntry.classId, level: 1 }];
    const nextClasses = existingEntry
      ? progressionClasses
      : [
          ...progressionClasses,
          classes.find((item) => item.id === levelUpClassEntry.classId)!,
        ].filter(Boolean);
    return nextClassLevels.length > 1
      ? multiclassProgression(nextClasses, nextClassLevels, options)
      : classProgression(characterClass, level + 1, options);
  }, [
    abilities.intelligence,
    ancestry,
    ancestryBonusFeats,
    characterClass,
    classLevels,
    level,
    levelUpClassEntry.classId,
    progressionClasses,
    selectedAlternateRacialTraitIds,
  ]);
  const baseCombat = useMemo(() => {
    const base = characterCombatStats(characterClass, level, abilities);
    if (additionalCharacterClasses.length === 0) return base;
    const saves = progression.saves;
    return {
      ...base,
      baseAttackBonus: progression.baseAttackBonus,
      saves: {
        fortitude: saves.fortitude + base.abilityModifiers.constitution,
        reflex: saves.reflex + base.abilityModifiers.dexterity,
        will: saves.will + base.abilityModifiers.wisdom,
      },
      combatManeuverBonus:
        progression.baseAttackBonus + base.abilityModifiers.strength,
      combatManeuverDefense:
        10 +
        progression.baseAttackBonus +
        base.abilityModifiers.strength +
        base.abilityModifiers.dexterity,
      averageHitPoints: multiclassAverageHitPoints(
        progressionClasses,
        classLevels,
        base.abilityModifiers.constitution,
      ),
    };
  }, [
    abilities,
    additionalCharacterClasses.length,
    characterClass,
    classLevels,
    level,
    progression.baseAttackBonus,
    progression.saves,
    progressionClasses,
  ]);
  const selectedClassFeatIds = useMemo(
    () => [
      ...progression.features.flatMap((feature) =>
        [feature.grantedFeatId, ...(feature.grantedFeatIds ?? [])].filter((featId): featId is string => Boolean(featId)),
      ),
      ...selectedArchetypes.flatMap((archetype) => {
        const classLevel = classLevels.find((entry) => entry.classId === archetype.classId)?.level ?? 0;
        return inferArchetypeGrantedFeats(archetype, feats)
          .filter((grant) => grant.level <= classLevel)
          .map((grant) => grant.featId);
      }),
      ...Object.entries(selectedOptions).flatMap(([featureId, optionId]) => {
        const feature = selectableProgressionFeatures.find((candidate) => candidate.id === featureId);
        const selectedFeat = feats.find((feat) => feat.id === optionId);
        if (feature && selectedFeat && (generatedFeatGroupIds.has(feature.optionGroupId ?? "") || alternativeAllowsFeat(feature, selectedFeat))) return [optionId];
        const option = optionGroups
          .flatMap((group) => group.options)
          .find((candidate) => candidate.id === optionId);
        return option?.featId ? [option.featId] : [];
      }),
    ],
    [archetypeFeatAlternatives, classLevels, selectableProgressionFeatures, progression.features, selectedArchetypes, selectedOptions],
  );
  const selectedClassFeatChoices = useMemo(
    () => Object.fromEntries(Object.entries(selectedOptions).flatMap(([featureId, optionId]) => {
      const feature = selectableProgressionFeatures.find((candidate) => candidate.id === featureId);
      const selectedOption = optionGroups.flatMap((group) => group.options).find((candidate) => candidate.id === optionId);
      const feat = feats.find((candidate) => candidate.id === optionId || candidate.id === selectedOption?.featId);
      if (!feature || !feat) return [];
      const permittedFeatChoice = generatedFeatGroupIds.has(feature.optionGroupId ?? "") || alternativeAllowsFeat(feature, feat) || selectedOption?.featId === feat.id;
      if (!permittedFeatChoice) return [];
      const choice = selectedOption?.choice ?? feat.choice;
      if (!choice) return [];
      const value = selectedOptions[`${featureId}-${choice.key}`];
      return value ? [[feat.id, value]] : [];
    })),
    [archetypeFeatAlternatives, selectableProgressionFeatures, selectedOptions],
  );
  const selectedFeatBonuses = useMemo(
    () =>
      featBonuses(
        [...selectedFeatIds, ...selectedClassFeatIds],
        feats,
        { ...selectedFeatChoices, ...selectedClassFeatChoices },
        { level, skillRanks },
      ),
    [
      level,
      selectedClassFeatIds,
      selectedClassFeatChoices,
      selectedFeatChoices,
      selectedFeatIds,
      skillRanks,
    ],
  );
  const selectedArchetypeInitiativeBonus = useMemo(
    () => archetypeInitiativeBonus(allSelectedArchetypes, classLevelMap),
    [allSelectedArchetypes, classLevelMap],
  );
  const combat = useMemo(() => {
    const equipmentBonuses = equipmentCombatBonuses(inventory);
    const activeBonus = (target: ActiveEffect["target"]) =>
      activeEffects
        .filter((effect) => effect.target === target)
        .reduce((total, effect) => total + effect.bonus, 0);
    return {
      ...baseCombat,
      initiative:
        baseCombat.initiative +
        selectedTraitBonuses.initiative +
        selectedFeatBonuses.initiative +
        selectedArchetypeInitiativeBonus +
        activeBonus("initiative"),
      saves: {
        fortitude:
          baseCombat.saves.fortitude +
          selectedTraitBonuses.saves.fortitude +
          selectedFeatBonuses.saves.fortitude +
          equipmentBonuses.saves.fortitude +
          activeBonus("fortitude"),
        reflex:
          baseCombat.saves.reflex +
          selectedTraitBonuses.saves.reflex +
          selectedFeatBonuses.saves.reflex +
          equipmentBonuses.saves.reflex +
          activeBonus("reflex"),
        will:
          baseCombat.saves.will +
          selectedTraitBonuses.saves.will +
          selectedFeatBonuses.saves.will +
          equipmentBonuses.saves.will +
          activeBonus("will"),
      },
      armorClass: {
        normal:
          baseCombat.armorClass.normal +
          equipmentBonuses.armorClass.normal +
          selectedFeatBonuses.armorClass.normal +
          activeBonus("armorClass"),
        touch:
          baseCombat.armorClass.touch +
          equipmentBonuses.armorClass.touch +
          selectedFeatBonuses.armorClass.touch +
          activeBonus("armorClass"),
        flatFooted:
          baseCombat.armorClass.flatFooted +
          equipmentBonuses.armorClass.flatFooted +
          selectedFeatBonuses.armorClass.flatFooted +
          activeBonus("armorClass"),
      },
      averageHitPoints:
        baseCombat.averageHitPoints +
        selectedFeatBonuses.hitPoints +
        favoredClassHitPoints,
    };
  }, [
    activeEffects,
    baseCombat,
    favoredClassHitPoints,
    inventory,
    selectedArchetypeInitiativeBonus,
    selectedFeatBonuses,
    selectedTraitBonuses,
  ]);
  const landSpeed = useMemo(() => {
    const load = equipmentEncumbrance(abilities.strength, inventory).load;
    return characterLandSpeed(
      ancestry.speed,
      equippedArmorCategory(inventory),
      load,
      allSelectedArchetypes,
      classLevelMap,
    );
  }, [abilities.strength, allSelectedArchetypes, ancestry.speed, classLevelMap, inventory]);
  const selectedArchetypeConditionalModifiers = useMemo(
    () => archetypeConditionalModifiers(allSelectedArchetypes, classLevelMap),
    [allSelectedArchetypes, classLevelMap],
  );
  const selectedArchetypeSkillBonuses = useMemo(
    () => archetypeSkillBonuses(allSelectedArchetypes, classLevelMap),
    [allSelectedArchetypes, classLevelMap],
  );
  const featSlots = useMemo(
    () =>
      Array.from({ length: progression.featSlots }, (_, index) => {
        const regularFeatIndex = index - ancestryBonusFeats;
        return {
          index,
          level: regularFeatIndex < 0 ? 1 : regularFeatIndex * 2 + 1,
          name:
            regularFeatIndex < 0
              ? `${ancestry.name} bonus feat`
              : `Feat ${regularFeatIndex + 1}`,
        };
      }),
    [ancestry.name, ancestryBonusFeats, progression.featSlots],
  );
  const levelUpGains = useMemo(() => {
    if (!nextProgression) return [];
    const currentFeatureIds = new Set(
      progression.features.map((feature) => feature.id),
    );
    const gains = nextProgression.features
      .filter((feature) => !currentFeatureIds.has(feature.id))
      .map((feature) => `${feature.name}: ${feature.summary}`);
    const featGain = nextProgression.featSlots - progression.featSlots;
    const skillGain = nextProgression.skillRanks - progression.skillRanks;
    if (abilityBoostCount(level + 1) > abilityBoostCount(level))
      gains.push("Choose a +1 increase to one ability score.");
    if (featGain > 0)
      gains.push(`Choose ${featGain} new feat${featGain === 1 ? "" : "s"}.`);
    if (skillGain > 0)
      gains.push(
        `Allocate ${skillGain} new skill rank${skillGain === 1 ? "" : "s"}.`,
      );
    return gains;
  }, [level, nextProgression, progression.featSlots, progression.skillRanks]);
  const casterLevel = Math.max(
    0,
    ...Object.values(effectiveSpellcastingLevelMap),
  );
  const hasMagaambyanInitiate = selectedArchetypes.some(
    (archetype) => archetype.id === "arcanist-magaambyan-initiate",
  );
  const repeatableFeatIds = useMemo(
    () => feats.filter((feat) => feat.repeatable).map((feat) => feat.id),
    [feats],
  );
  const spellMasteryCount = hasMagaambyanInitiate && (classLevelMap.arcanist ?? 0) >= 5
    ? 1 + selectedFeatIds.filter((featId) => featId === "spell-mastery").length
    : 0;
  const spellMasteryLimit = spellMasteryCount * Math.max(0, combat.abilityModifiers.intelligence ?? 0);
  const featClassLevelMap = useMemo(() => {
    if (!hasMagaambyanInitiate) return classLevelMap;
    return {
      ...classLevelMap,
      wizard: (classLevelMap.wizard ?? 0) + (classLevelMap.arcanist ?? 0),
    };
  }, [classLevelMap, hasMagaambyanInitiate]);
  const featSpellIds = useMemo(
    () => [
      ...new Set(
        progressionClasses.flatMap((entry) => {
          const classLevel =
            effectiveSpellcastingLevelMap[entry.id] ??
            classLevelMap[entry.id] ??
            0;
          if (!entry.spellcasting || classLevel < 1) return [];
          let casting;
          try {
            casting = spellcastingProgression(entry, classLevel, {
              abilityScore: abilities[entry.spellcasting.ability],
            });
          } catch {
            // Partial class fixtures and work-in-progress class records may not yet
            // define a complete casting table. They grant no spell-access feats.
            return [];
          }
          const availableSpellLevel = casting
            ? Math.max(
                casting.maximumSpellLevel,
                ...casting.slots
                  .filter((slot) => slot.count > 0)
                  .map((slot) => slot.level),
              )
            : -1;
          return casting
            ? spellsAvailableToClass(
                spells,
                entry.spellListClassId ?? entry.id,
                availableSpellLevel,
                entry.spellListAdditions,
              ).map((spell) => spell.id)
            : [];
        }),
      ),
    ],
    [
      abilities,
      classLevelMap,
      effectiveSpellcastingLevelMap,
      progressionClasses,
    ],
  );
  const featSpellLevels = useMemo(
    () =>
      progressionClasses.reduce<
        Partial<Record<"prepared" | "spontaneous", number>>
      >((levels, entry) => {
        const classLevel =
          effectiveSpellcastingLevelMap[entry.id] ??
          classLevelMap[entry.id] ??
          0;
        if (!entry.spellcasting || classLevel < 1) return levels;
        try {
          const casting = spellcastingProgression(entry, classLevel, {
            abilityScore: abilities[entry.spellcasting.ability],
          });
          if (casting)
            levels[entry.spellcasting.castingType] = Math.max(
              levels[entry.spellcasting.castingType] ?? 0,
              casting.maximumSpellLevel,
            );
        } catch {
          // Incomplete class fixtures do not grant spell-level prerequisites.
        }
        return levels;
      }, {}),
    [
      abilities,
      classLevelMap,
      effectiveSpellcastingLevelMap,
      progressionClasses,
    ],
  );
  const selectedOptionFeatureIds = useMemo(
    () =>
      Object.values(selectedOptions)
        .flatMap((optionId) => [
          optionId,
          optionId.startsWith("domain-") ? "domain" : null,
          optionId.startsWith("oracle-mystery-") ? "mystery" : null,
          optionId.includes("animal-companion") ? "animal-companion" : null,
          optionId.includes("familiar") ? "familiar" : null,
          optionId.includes("mount") ? "mount" : null,
        ])
        .filter((id): id is string => Boolean(id)),
    [selectedOptions],
  );
  const featContext = useMemo(
    () => ({
      classId: characterClass.id,
      classLevels: featClassLevelMap,
      ancestryId,
      size: ancestry.size,
      classLevel: level,
      casterLevel,
      spellLevels: featSpellLevels,
      abilities,
      baseAttackBonus: progression.baseAttackBonus,
      saves: progression.saves,
      skillRanks,
      featureIds: [
        ...new Set([
          ...progression.features.flatMap((feature) => {
            const key = prerequisiteFeatureKey(feature.name);
            return [
              feature.id,
              key,
              key.replace(/-\d+$/, ""),
              ...(feature.progressionKey ? [feature.progressionKey] : []),
            ];
          }),
          ...selectedOptionFeatureIds,
        ]),
      ],
      spellIds: featSpellIds,
      selectedIds: selectedClassFeatIds,
      selectedFeatChoices,
    }),
    [
      abilities,
      ancestry.size,
      ancestryId,
      casterLevel,
      characterClass.id,
      featClassLevelMap,
      featSpellIds,
      featSpellLevels,
      level,
      progression.baseAttackBonus,
      progression.features,
      progression.saves,
      selectedClassFeatIds,
      selectedFeatChoices,
      selectedOptionFeatureIds,
      skillRanks,
    ],
  );
  const featChoices = featSlots.map((slot) => {
    const selected = feats.find(
      (feat) => feat.id === selectedFeatIds[slot.index],
    );
    const otherFeatIds = selectedFeatIds.filter(
      (_, index) => index !== slot.index,
    );
    const context = {
      ...featContext,
      acquisitionLevel: slot.level,
      candidateId: selected?.id,
      selectedIds: [...selectedClassFeatIds, ...otherFeatIds],
    };
    const checks = selected ? featPrerequisiteResults(selected, context) : [];
    return {
      ...slot,
      selected,
      checks,
      eligibleFeatIds: feats
        .filter((feat) =>
          prerequisitesMet(feat.prerequisites, {
            ...context,
            candidateId: feat.id,
          }),
        )
        .map((feat) => feat.id),
    };
  });
  useEffect(() => {
    if (skipNextFeatNormalization.current) {
      skipNextFeatNormalization.current = false;
      return;
    }
    setSelectedFeatIds((current) => {
      const next = normalizeSelectedFeats(
        current,
        feats,
        featContext,
        featSlots.length,
        featSlots.map((slot) => slot.level),
        repeatableFeatIds,
      );
      return next.length === current.length &&
        next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [featContext, featSlots, repeatableFeatIds]);
  useEffect(
    () =>
      setSelectedFeatChoices((current) => {
        const next = normalizeSelectedFeatChoices(
          current,
          selectedFeatIds,
          feats,
        );
        return Object.keys(next).length === Object.keys(current).length &&
          Object.entries(next).every(([id, choice]) => current[id] === choice)
          ? current
          : next;
      }),
    [selectedFeatIds],
  );
  useEffect(
    () =>
      setSelectedTraitChoices((current) => {
        const next = normalizeSelectedTraitChoices(
          current,
          selectedTraitIds,
          traits,
          { spells, classes, classId },
        );
        return Object.keys(next).length === Object.keys(current).length &&
          Object.entries(next).every(([id, choice]) => current[id] === choice)
          ? current
          : next;
      }),
    [classId, selectedTraitIds],
  );

  const updateAbility = (
    ability: keyof typeof defaultAbilities,
    value: number,
  ) =>
    setBaseAbilities((current) => ({
      ...current,
      [ability]: Math.max(7, Math.min(18, value || 7)),
    }));
  const updateAbilityBoost = (
    index: number,
    ability: keyof typeof defaultAbilities,
  ) =>
    setAbilityBoosts((current) =>
      current.map((value, boostIndex) =>
        boostIndex === index ? ability : value,
      ),
    );
  const updateFeat = (index: number, featId: string) =>
    setSelectedFeatIds((current) => {
      const next = [...current];
      next[index] = featId;
      return next;
    });
  const updateFeatChoice = (featId: string, choice: string) =>
    setSelectedFeatChoices((current) => ({ ...current, [featId]: choice }));
  const skillBudget = skillRankBudget(progression.skillRanks, skillRanks);
  const allocatedSkillRanks = skillBudget.allocated;
  const updateSkill = (skillName: string, ranks: number) =>
    setSkillRanks((current) => {
      const otherRanks = Object.fromEntries(
        Object.entries(current).filter(([skill]) => skill !== skillName),
      );
      const available = skillRankBudget(
        progression.skillRanks,
        otherRanks,
      ).remaining;
      return {
        ...current,
        [skillName]: Math.max(0, Math.min(level, available, ranks || 0)),
      };
    });
  const bladeAdeptBondOption = selectedOptions["arcanist-blade-adept-sword-bond-su-1"];
  const bladeAdeptWeaponKey = bladeAdeptBondOption === "blade-adept-bond-other"
    ? selectedOptions["arcanist-blade-adept-sword-bond-su-1-weapon"]?.trim().toLowerCase()
    : bladeAdeptBondOption?.replace("blade-adept-bond-", "");
  const wieldingBlackBlade = selectedArchetypes.some((archetype) => archetype.id === "arcanist-blade-adept") && (classLevelMap.arcanist ?? 0) >= 3 && Boolean(bladeAdeptWeaponKey) && inventory.some((entry) => entry.equipped && entry.itemId === bladeAdeptWeaponKey);
  const displayedSkills = useMemo(() => {
    const standardNames = new Set(skills.map((skill) => skill.name));
    const specialized = [...new Set(allSelectedArchetypes.flatMap((archetype) =>
      archetypeSkillBonusAdjustments(archetype).map((adjustment) => adjustment.skill),
    ))].flatMap((name) => {
      const ability = abilityForSpecializedSkill(name);
      return !standardNames.has(name as (typeof skills)[number]["name"]) && ability ? [{ name, ability }] : [];
    });
    return [...skills, ...specialized].sort((left, right) => left.name.localeCompare(right.name));
  }, [allSelectedArchetypes]);
  const skillEntries = displayedSkills.map((skill) => {
    const ranks = skillRanks[skill.name] ?? 0;
    const result = skillTotal(
      skillCharacterClass,
      skill,
      abilities[skill.ability],
      ranks,
    );
    return {
      ...skill,
      ranks,
      ...result,
      total:
        result.total +
        (selectedTraitBonuses.skillBonuses[skill.name] ?? 0) +
        (selectedFeatBonuses.skillBonuses[skill.name] ?? 0) +
        (selectedArchetypeSkillBonuses.skillBonuses[skill.name] ?? 0) +
        (wieldingBlackBlade && ["Perception", "Sense Motive"].includes(skill.name) ? (ranks >= 10 ? 4 : 2) : 0),
    };
  });
  useEffect(
    () =>
      setSkillRanks((current) => {
        const next = normalizeSkillRanks(
          current,
          progression.skillRanks,
          level,
        );
        return Object.keys(next).length === Object.keys(current).length &&
          Object.entries(next).every(
            ([skill, ranks]) => current[skill] === ranks,
          )
          ? current
          : next;
      }),
    [level, progression.skillRanks],
  );

  const choiceFeatures = selectableProgressionFeatures.filter(
    (feature) => feature.choiceRequired && feature.optionGroupId,
  );
  const classOptionChoices = choiceFeatures.map((feature) => {
    const featureClassId =
      "classId" in feature && typeof feature.classId === "string"
        ? feature.classId
        : characterClass.id;
    const featureClassLevel =
      classLevelMap[featureClassId] ?? primaryClassLevel;
    const featureCharacterClass = progressionClasses.find(
      (item) => item.id === featureClassId,
    );
    const generatedFeatConfig = (() => {
      if (feature.optionGroupId === "archetype-feats") return {
        ids: feature.featChoiceIds ?? [],
        types: feature.featChoiceTypes ?? [],
        prerequisiteIds: feature.featChoicePrerequisiteIds ?? [],
        ignorePrerequisites: Boolean(feature.ignoreFeatPrerequisites),
      };
      if (feature.optionGroupId === "monk-bonus-feats") return {
        ids: [...monkBonusFeatIds, ...(feature.level >= 6 ? monkBonusFeatIdsAt6 : []), ...(feature.level >= 10 ? monkBonusFeatIdsAt10 : [])],
        types: [],
        prerequisiteIds: [],
        ignorePrerequisites: true,
      };
      if (feature.optionGroupId === "warpriest-weapon-focus") return { ids: ["weapon-focus"], types: [], prerequisiteIds: [], ignorePrerequisites: true };
      if (feature.optionGroupId === "bloodrager-bloodline-feats") {
        const selectedBloodlineIds = [
          selectedOptions["bloodrager-bloodline-1"],
          selectedOptions["bloodrager-crossblooded-rager-primary-bloodline-1"],
          selectedOptions["bloodrager-crossblooded-rager-secondary-bloodline-1"],
        ].filter((id): id is string => Boolean(id));
        const bloodlineOptions = optionGroups.find((group) => group.id === "bloodrager-bloodlines")?.options ?? [];
        const bloodlineFeatIds = [...new Set(selectedBloodlineIds.flatMap((id) => bloodlineOptions.find((option) => option.id === id)?.featIds ?? []))];
        return { ids: bloodlineFeatIds.length ? bloodlineFeatIds : ["bloodline-selection-required"], types: [], prerequisiteIds: [], ignorePrerequisites: false };
      }
      if (feature.optionGroupId === "warpriest-bonus-feats" || feature.optionGroupId === "swashbuckler-bonus-feats" || feature.optionGroupId === "brawler-bonus-feats") return { ids: [], types: ["combat"], prerequisiteIds: [], ignorePrerequisites: false };
      return null;
    })();
    const generatedFeatGroup: (typeof optionGroups)[number] | undefined = generatedFeatConfig
      ? {
          id: feature.optionGroupId!,
          name: "Bonus feats",
          classIds: [featureClassId],
          options: feats
            .filter((feat) => {
              const allowedIds = generatedFeatConfig.ids;
              const allowedTypes = generatedFeatConfig.types;
              const prerequisiteIds = generatedFeatConfig.prerequisiteIds;
              return (
                (allowedIds.length === 0 && allowedTypes.length === 0 && prerequisiteIds.length === 0) ||
                allowedIds.includes(feat.id) ||
                allowedTypes.includes(feat.type) ||
                prerequisiteIncludesFeat(feat.prerequisites, prerequisiteIds)
              );
            })
            .map((feat) => ({
              id: feat.id,
              name: feat.name,
              groupId: feature.optionGroupId!,
              classIds: [featureClassId],
              minimumLevel: 1,
              prerequisites: generatedFeatConfig.ignorePrerequisites ? [] : feat.prerequisites.map((item) => adaptBonusFeatPrerequisite(item, featureClassId)),
              benefit: feat.benefit,
              featId: feat.id,
              source: feat.source,
              choice: feat.choice,
            })),
        }
      : undefined;
    const signatureGroup = feature.optionGroupId === "spell-specialist-signature-spells"
      ? {
          ...(optionGroups.find((item) => item.id === feature.optionGroupId)!),
          options: spells
            .filter((spell) => spell.levelByClass.arcanist === feature.requiredSpellLevel)
            .map(signatureSpellOption),
        }
      : undefined;
    const rawBaseGroup = generatedFeatGroup ?? signatureGroup ?? optionGroups.find(
      (item) => item.id === feature.optionGroupId,
    );
    const augmentationOptions = (featureCharacterClass?.optionGroupAugmentations ?? [])
      .filter((augmentation) =>
        augmentation.targetGroupId === feature.optionGroupId &&
        feature.level >= (augmentation.minimumFeatureLevel ?? 1),
      )
      .flatMap((augmentation) =>
        optionGroups.find((group) => group.id === augmentation.sourceGroupId)?.options ?? [],
      )
      .map((option) => ({ ...option, groupId: feature.optionGroupId! }));
    const baseGroup = rawBaseGroup && augmentationOptions.length
      ? {
          ...rawBaseGroup,
          options: [
            ...rawBaseGroup.options,
            ...augmentationOptions.filter((option) =>
              !rawBaseGroup.options.some((baseOption) => baseOption.id === option.id),
            ),
          ],
        }
      : rawBaseGroup;
    const matchingAlternatives = archetypeFeatAlternatives.filter((alternative) =>
      alternative.optionGroupId === feature.optionGroupId && feature.level >= alternative.minimumLevel,
    );
    const alternativeOptions = feats.filter((feat) => matchingAlternatives.some((alternative) =>
      (alternative.featChoiceIds ?? []).includes(feat.id) || (alternative.featChoiceTypes ?? []).includes(feat.type),
    )).map((feat) => ({
      id: feat.id,
      name: feat.name,
      groupId: feature.optionGroupId!,
      classIds: [featureClassId],
      minimumLevel: 1,
      prerequisites: feature.optionGroupId === "monk-bonus-feats" || matchingAlternatives.some((alternative) => alternative.ignoreFeatPrerequisites && ((alternative.featChoiceIds ?? []).includes(feat.id) || (alternative.featChoiceTypes ?? []).includes(feat.type))) ? [] : feat.prerequisites.map((item) => adaptBonusFeatPrerequisite(item, featureClassId)),
      benefit: feat.benefit,
      featId: feat.id,
      source: feat.source,
      choice: feat.choice,
    }));
    const retainedBaseOptions = matchingAlternatives.some((alternative) => alternative.mode === "replace") ? [] : (baseGroup?.options ?? []);
    const group: (typeof optionGroups)[number] | undefined = baseGroup && alternativeOptions.length
      ? { ...baseGroup, options: [...retainedBaseOptions, ...alternativeOptions.filter((option) => !retainedBaseOptions.some((baseOption) => baseOption.id === option.id))] }
      : baseGroup;
    const selectedIds = [...selectedFeatIds, ...Object.values(selectedOptions)];
    const baseOptions =
      group && feature.id === "sacred-servant-deity-1"
        ? group.options.filter((option) =>
            ["lawful-good", "lawful-neutral", "neutral-good"].includes(
              option.alignment ?? "",
            ),
          )
        : group && feature.id.startsWith("sacred-servant-domain-")
          ? group.options
          : group &&
              group.id === "ranger-combat-styles" &&
              featureCharacterClass?.rangerCombatStyleIds
            ? group.options.filter((option) =>
                featureCharacterClass.rangerCombatStyleIds?.includes(option.id),
              )
            : group &&
                featureCharacterClass?.mountedCompanionOnly &&
                group.id === "ranger-animal-companions"
              ? availableOptions(
                  group,
                  featureClassId,
                  featureClassLevel,
                  selectedIds,
                  {
                    abilities,
                    size: ancestry.size,
                    baseAttackBonus: progression.baseAttackBonus,
                    classLevels: classLevelMap,
                    featureIds: [
                      ...progression.features.map((entry) => entry.id),
                      ...selectedIds,
                    ],
                  },
                ).filter((option) => {
                  const mediumMounts = [
                    "ranger-animal-companion-camel",
                    "ranger-animal-companion-horse",
                  ];
                  const smallMounts = [
                    "ranger-animal-companion-pony",
                    "ranger-animal-companion-wolf",
                    ...(featureClassLevel >= 7
                      ? ["ranger-animal-companion-dog"]
                      : []),
                  ];
                  return (
                    ancestry.size === "small" ? smallMounts : mediumMounts
                  ).includes(option.id);
                })
              : group &&
                  featureClassId === "druid" &&
                  group.id === "ranger-animal-companions"
                ? group.options.filter(
                    (option) => option.minimumLevel <= featureClassLevel,
                  )
                : group &&
                    featureClassId === "druid" &&
                    group.id === "cleric-domains"
                  ? group.options.filter((option) =>
                      (
                        featureCharacterClass?.druidDomainIds ?? [
                          "domain-air",
                          "domain-animal",
                          "domain-earth",
                          "domain-fire",
                          "domain-plant",
                          "domain-water",
                          "domain-weather",
                        ]
                      ).includes(option.id),
                    )
                  : group
                    ? availableOptions(
                        group,
                        featureClassId,
                        featureClassLevel,
                        selectedIds,
                        {
                          abilities,
                          size: ancestry.size,
                          baseAttackBonus: progression.baseAttackBonus,
                          classLevels: classLevelMap,
                          featureIds: [
                            ...progression.features.map((entry) => entry.id),
                            ...selectedIds,
                          ],
                        },
                      )
                    : [];
    const options =
      feature.requiredOptionId &&
      !selectedIds.includes(feature.requiredOptionId)
        ? []
        : feature.optionGroupId === "bloodrager-bloodlines" && feature.id.startsWith("bloodrager-crossblooded-rager-")
          ? baseOptions.filter((option) =>
              option.id === selectedOptions[feature.id] ||
              !Object.entries(selectedOptions).some(([featureId, optionId]) =>
                featureId !== feature.id && featureId.startsWith("bloodrager-crossblooded-rager-") && optionId === option.id,
              ),
            )
        : generatedFeatGroupIds.has(feature.optionGroupId ?? "")
          ? baseOptions.filter((option) =>
              option.id === selectedOptions[feature.id] ||
              !Object.entries(selectedOptions).some(([featureId, optionId]) => featureId !== feature.id && optionId === option.id),
            )
          : feature.requiredSpellLevel !== undefined
            ? baseOptions.filter((option) => (option as CharacterOption).spellLevel === feature.requiredSpellLevel)
            : baseOptions;
    const levelAwareOptions = options.map((option) => {
      const richOption = option as CharacterOption;
      return richOption.powers && feature.optionGroupId === "blood-arcanist-bloodlines"
        ? { ...option, powers: richOption.powers.filter((power) => power.level <= featureClassLevel) }
        : option;
    });
    return {
      id: feature.id,
      name: feature.name,
      level: feature.level,
      classLevel: featureClassLevel,
      options: levelAwareOptions,
      selected: levelAwareOptions.find(
        (option) => option.id === selectedOptions[feature.id],
      ),
      requiredOptionId: feature.requiredOptionId,
      requiredOptionMessage: feature.requiredOptionMessage,
    };
  });
  const signatureSpellChoicePrefix = "arcanist-spell-specialist-signature-spells-";
  const updateClassOption = (featureId: string, optionId: string) => {
    const currentOptionId = selectedOptions[featureId] ?? "";
    if (
      featureId.startsWith(signatureSpellChoicePrefix) &&
      currentOptionId &&
      optionId !== currentOptionId
    ) {
      if (!optionId) {
        setSaveNotice("A signature spell must be exchanged for another spell of the same level; it cannot be left empty.");
        return;
      }
      if (signatureSpellExchangeCredits <= 0) {
        setSaveNotice("Gain another Arcanist class level before exchanging a signature spell.");
        return;
      }
      setSignatureSpellExchangeCredits((current) => Math.max(0, current - 1));
      setSaveNotice(`Exchanged one signature spell. ${signatureSpellExchangeCredits - 1} exchange${signatureSpellExchangeCredits - 1 === 1 ? "" : "s"} remain from Arcanist levels gained.`);
    }
    setSelectedOptions((current) => ({ ...current, [featureId]: optionId }));
  };
  const signatureSpellChoiceChangeRules = Object.fromEntries(
    classOptionChoices
      .filter((choice) => choice.id.startsWith(signatureSpellChoicePrefix))
      .map((choice) => {
        const selected = Boolean(selectedOptions[choice.id]);
        const available = signatureSpellExchangeCredits > 0;
        return [choice.id, {
          locked: selected && !available,
          preventClear: true,
          message: selected
            ? available
              ? `${signatureSpellExchangeCredits} signature spell exchange${signatureSpellExchangeCredits === 1 ? "" : "s"} available from Arcanist levels gained.`
              : "Locked until another Arcanist class level is gained."
            : "Choose this signature spell once; later changes use one level-up exchange.",
        }];
      }),
  );
  const updateTrait = (index: number, traitId: string) =>
    setSelectedTraitIds((current) => {
      const next = [...current];
      if (traitId) next[index] = traitId;
      else next.splice(index, 1);
      const normalized = normalizeSelectedTraits(next, traits);
      setSelectedTraitChoices((choices) =>
        normalizeSelectedTraitChoices(choices, normalized, traits, {
          spells,
          classes,
          classId,
        }),
      );
      return normalized;
    });
  const updateTraitChoice = (traitId: string, choice: string) =>
    setSelectedTraitChoices((current) =>
      normalizeSelectedTraitChoices(
        { ...current, [traitId]: choice },
        selectedTraitIds,
        traits,
        { spells, classes, classId },
      ),
    );

  const castingAbility =
    characterClass.spellcasting &&
    abilityNames.includes(
      characterClass.spellcasting.ability as keyof typeof abilities,
    )
      ? (characterClass.spellcasting.ability as keyof typeof abilities)
      : null;
  const castingAbilityScore = castingAbility ? abilities[castingAbility] : 10;
  const isSpontaneous =
    characterClass.spellcasting?.castingType === "spontaneous";
  const preparedCasting = useMemo(
    () =>
      characterClass.spellcasting && !isSpontaneous
        ? spellcastingProgression(characterClass, primarySpellcastingLevel, {
            abilityScore: castingAbilityScore,
          })
        : null,
    [
      castingAbilityScore,
      characterClass,
      isSpontaneous,
      primarySpellcastingLevel,
    ],
  );
  const spontaneousCasting = useMemo(
    () =>
      isSpontaneous
        ? spontaneousSpellcastingProgression(
            characterClass,
            primarySpellcastingLevel,
            { abilityScore: castingAbilityScore },
          )
        : null,
    [
      castingAbilityScore,
      characterClass,
      isSpontaneous,
      primarySpellcastingLevel,
    ],
  );
  const spellSlots = useMemo(
    () => spontaneousCasting?.slots ?? preparedCasting?.slots ?? [],
    [preparedCasting, spontaneousCasting],
  );
  const maximumSpellLevel =
    spontaneousCasting?.maximumSpellLevel ??
    preparedCasting?.maximumSpellLevel ??
    0;
  const hasSpellcasting = Boolean(preparedCasting || spontaneousCasting);
  const baseAvailableSpells = useMemo(
    () =>
      hasSpellcasting
        ? spellsAvailableToClass(
            spells,
            characterClass.spellListClassId ?? characterClass.id,
            maximumSpellLevel,
            characterClass.spellListAdditions,
          )
        : [],
    [
      characterClass.id,
      characterClass.spellListClassId,
      characterClass.spellListAdditions,
      hasSpellcasting,
      maximumSpellLevel,
      spells,
    ],
  );
  const spellMasteryCatalogue = useMemo(() => {
    const arcanistLevel = classLevelMap.arcanist ?? 0;
    const highestSpellLevel = arcanistLevel > 0 ? Math.min(9, Math.floor((arcanistLevel + 1) / 2)) : 0;
    return hasMagaambyanInitiate
      ? spellsAvailableToClass(spells, "arcanist", highestSpellLevel)
      : [];
  }, [classLevelMap.arcanist, hasMagaambyanInitiate, spells]);
  const spellMasterySpellIds = useMemo(
    () => Object.entries(selectedOptions)
      .filter(([key]) => key.startsWith(magaambyanMasteryKeyPrefix))
      .sort(([left], [right]) => Number(left.slice(magaambyanMasteryKeyPrefix.length)) - Number(right.slice(magaambyanMasteryKeyPrefix.length)))
      .map(([, spellId]) => spellId),
    [selectedOptions],
  );
  const updateSpellMasterySpellIds = (spellIds: string[]) => setSelectedOptions((current) => {
    const next = Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(magaambyanMasteryKeyPrefix)));
    spellIds.slice(0, spellMasteryLimit).forEach((spellId, index) => { next[`${magaambyanMasteryKeyPrefix}${index}`] = spellId; });
    return next;
  });
  useEffect(() => {
    const legalIds = new Set(spellMasteryCatalogue.map((spell) => spell.id));
    const normalized = [...new Set(spellMasterySpellIds.filter((spellId) => legalIds.has(spellId)))].slice(0, spellMasteryLimit);
    if (normalized.length !== spellMasterySpellIds.length || normalized.some((spellId, index) => spellId !== spellMasterySpellIds[index])) updateSpellMasterySpellIds(normalized);
  }, [spellMasteryCatalogue, spellMasteryLimit, spellMasterySpellIds]);
  const bloodlineSpells = useMemo(
    () =>
      classId === "sorcerer"
        ? bloodlineBonusSpells(
            spells,
            selectedBloodline,
            primaryClassLevel,
            characterClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[characterClass.id] <= maximumSpellLevel,
          )
        : [],
    [
      characterClass.id,
      classId,
      maximumSpellLevel,
      primaryClassLevel,
      selectedBloodline,
      spells,
    ],
  );
  const mysterySpells = useMemo(
    () =>
      classId === "oracle"
        ? mysteryBonusSpells(
            spells,
            selectedMystery,
            primaryClassLevel,
            characterClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[characterClass.id] <= maximumSpellLevel,
          )
        : [],
    [
      characterClass.id,
      classId,
      maximumSpellLevel,
      primaryClassLevel,
      selectedMystery,
      spells,
    ],
  );
  const patronSpells = useMemo(
    () =>
      classId === "witch"
        ? witchPatronSpells(
            spells,
            selectedWitchPatron,
            primaryClassLevel,
            characterClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[characterClass.id] <= maximumSpellLevel,
          )
        : [],
    [
      characterClass.id,
      classId,
      maximumSpellLevel,
      primaryClassLevel,
      selectedWitchPatron,
      spells,
    ],
  );
  const selectedOptionSpellChoices = useMemo(
    () =>
      [...Object.entries(selectedOptions).flatMap(([featureId, optionId]) => {
        const option = optionGroups
          .flatMap((group) => group.options)
          .find((candidate) => candidate.id === optionId);
        if (option?.spellId) return [option];
        if (featureId.startsWith("arcanist-spell-specialist-signature-spells-") && optionId.startsWith("spell-specialist-signature-spells-")) {
          const spell = spells.find((candidate) => `spell-specialist-signature-spells-${candidate.id}` === optionId);
          return spell ? [signatureSpellOption(spell)] : [];
        }
        return [];
      }), ...characterClass.features
        .filter((feature) => feature.level <= primaryClassLevel && feature.grantsAllOptions && feature.optionGroupId)
        .flatMap((feature) => optionGroups.find((group) => group.id === feature.optionGroupId)?.options ?? [])
        .filter((option) => option.minimumLevel <= primaryClassLevel)],
    [characterClass.features, primaryClassLevel, selectedOptions, spells],
  );
  const selectedOptionSpells = useMemo(
    () =>
      selectedOptionSpellChoices
        .filter((option) => option.classIds.includes(characterClass.id))
        .flatMap((option) => {
          const spell = spells.find(
            (candidate) => candidate.id === option.spellId,
          );
          const spellLevel =
            option.spellLevel ?? spell?.levelByClass[characterClass.id];
          return spell &&
            spellLevel !== undefined &&
            (option.ignoresMaximumSpellLevel || spellLevel <= maximumSpellLevel)
            ? [
                {
                  ...spell,
                  levelByClass: {
                    ...spell.levelByClass,
                    [characterClass.id]: spellLevel,
                  },
                },
              ]
            : [];
        }),
    [characterClass.id, maximumSpellLevel, selectedOptionSpellChoices, spells],
  );
  const archetypeBonusSpells = useMemo(
    () => spellsFromAdditions(spells, characterClass.bonusSpellAdditions, characterClass.id, maximumSpellLevel),
    [characterClass.bonusSpellAdditions, characterClass.id, maximumSpellLevel, spells],
  );
  const grantedSpells = useMemo(
    () => [
      ...bloodlineSpells,
      ...mysterySpells,
      ...patronSpells,
      ...selectedOptionSpells,
      ...archetypeBonusSpells,
    ],
    [archetypeBonusSpells, bloodlineSpells, mysterySpells, patronSpells, selectedOptionSpells],
  );
  const availableSpells = useMemo(
    () => mergeSpellLists(baseAvailableSpells, grantedSpells),
    [baseAvailableSpells, grantedSpells],
  );
  const grantedSpellIds = useMemo(
    () => grantedSpells.map((spell) => spell.id),
    [grantedSpells],
  );
  const spellDcs = hasSpellcasting
    ? Object.fromEntries(
        Array.from({ length: Math.max(maximumSpellLevel, ...selectedOptionSpellChoices.filter((option) => option.classIds.includes(characterClass.id)).map((option) => option.spellLevel ?? 0)) + 1 }, (_, spellLevel) => [
          spellLevel,
          spellSaveDC(castingAbilityScore, spellLevel) + activeEffects.filter((effect) => effect.target === "spellSaveDc").reduce((total, effect) => total + effect.bonus, 0),
        ]),
      )
    : {};
  const preparedLimits = useMemo(
    () => {
      const costs = preparedCapacityCosts(selectedOptionSpellChoices, characterClass.id);
      return (preparedCasting?.prepared ?? []).map((entry) => ({ ...entry, count: Math.max(0, entry.count - (costs[entry.level] ?? 0)) }));
    },
    [characterClass.id, preparedCasting, selectedOptionSpellChoices],
  );
  const knownLimits = useMemo(
    () => spontaneousCasting?.known ?? [],
    [spontaneousCasting],
  );
  const oppositionSchoolIds = useMemo(
    () => oppositionSchoolsFromOptions(classId, selectedOptions),
    [classId, selectedOptions],
  );
  const craftingOppositionSchools = useMemo(
    () => oppositionSchoolIds.map((optionId) => {
      const id = optionId.replace(/^wizard-opposition-/, "");
      return { id, name: id.charAt(0).toUpperCase() + id.slice(1) };
    }),
    [oppositionSchoolIds],
  );
  const primaryOnDemandSpellCosts = useMemo(
    () => onDemandSpellCosts(selectedOptionSpellChoices, characterClass.id, primaryClassLevel),
    [characterClass.id, primaryClassLevel, selectedOptionSpellChoices],
  );
  const elementalMasterPreparation = useMemo(
    () => elementalMasterPreparationFromOptions(characterClass, selectedOptions),
    [characterClass, selectedOptions],
  );
  const secondaryCastingAbility =
    secondaryCharacterClass?.spellcasting &&
    abilityNames.includes(
      secondaryCharacterClass.spellcasting.ability as keyof typeof abilities,
    )
      ? (secondaryCharacterClass.spellcasting.ability as keyof typeof abilities)
      : null;
  const secondaryCastingAbilityScore = secondaryCastingAbility
    ? abilities[secondaryCastingAbility]
    : 10;
  const secondaryIsSpontaneous =
    secondaryCharacterClass?.spellcasting?.castingType === "spontaneous";
  const secondaryPreparedCasting = useMemo(
    () =>
      secondaryCharacterClass?.spellcasting && !secondaryIsSpontaneous
        ? spellcastingProgression(
            secondaryCharacterClass,
            secondarySpellcastingLevel,
            { abilityScore: secondaryCastingAbilityScore },
          )
        : null,
    [
      secondaryCastingAbilityScore,
      secondaryCharacterClass,
      secondaryIsSpontaneous,
      secondarySpellcastingLevel,
    ],
  );
  const secondarySpontaneousCasting = useMemo(
    () =>
      secondaryCharacterClass && secondaryIsSpontaneous
        ? spontaneousSpellcastingProgression(
            secondaryCharacterClass,
            secondarySpellcastingLevel,
            { abilityScore: secondaryCastingAbilityScore },
          )
        : null,
    [
      secondaryCastingAbilityScore,
      secondaryCharacterClass,
      secondaryIsSpontaneous,
      secondarySpellcastingLevel,
    ],
  );
  const secondarySpellSlots = useMemo(
    () =>
      secondarySpontaneousCasting?.slots ??
      secondaryPreparedCasting?.slots ??
      [],
    [secondaryPreparedCasting, secondarySpontaneousCasting],
  );
  const secondaryMaximumSpellLevel =
    secondarySpontaneousCasting?.maximumSpellLevel ??
    secondaryPreparedCasting?.maximumSpellLevel ??
    0;
  const secondaryHasSpellcasting = Boolean(
    secondaryPreparedCasting || secondarySpontaneousCasting,
  );
  const secondarySelectedBloodline = useMemo(
    () =>
      secondaryCharacterClass
        ? bloodlineFromOptions(secondaryCharacterClass.id, selectedOptions)
        : undefined,
    [secondaryCharacterClass, selectedOptions],
  );
  const secondarySelectedMystery = useMemo(
    () =>
      secondaryCharacterClass
        ? mysteryFromOptions(secondaryCharacterClass.id, selectedOptions)
        : undefined,
    [secondaryCharacterClass, selectedOptions],
  );
  const secondarySelectedWitchPatron = useMemo(
    () =>
      secondaryCharacterClass
        ? witchPatronFromOptions(secondaryCharacterClass.id, selectedOptions)
        : undefined,
    [secondaryCharacterClass, selectedOptions],
  );
  const secondaryBaseSpells = useMemo(
    () =>
      secondaryHasSpellcasting && secondaryCharacterClass
        ? spellsAvailableToClass(
            spells,
            secondaryCharacterClass.spellListClassId ?? secondaryCharacterClass.id,
            secondaryMaximumSpellLevel,
            secondaryCharacterClass.spellListAdditions,
          )
        : [],
    [
      secondaryCharacterClass,
      secondaryHasSpellcasting,
      secondaryMaximumSpellLevel,
      spells,
    ],
  );
  const secondaryBloodlineSpells = useMemo(
    () =>
      secondaryCharacterClass?.id === "sorcerer"
        ? bloodlineBonusSpells(
            spells,
            secondarySelectedBloodline,
            secondaryClassLevel,
            secondaryCharacterClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[secondaryCharacterClass.id] <=
              secondaryMaximumSpellLevel,
          )
        : [],
    [
      secondaryCharacterClass,
      secondaryClassLevel,
      secondaryMaximumSpellLevel,
      secondarySelectedBloodline,
      spells,
    ],
  );
  const secondaryMysterySpells = useMemo(
    () =>
      secondaryCharacterClass?.id === "oracle"
        ? mysteryBonusSpells(
            spells,
            secondarySelectedMystery,
            secondaryClassLevel,
            secondaryCharacterClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[secondaryCharacterClass.id] <=
              secondaryMaximumSpellLevel,
          )
        : [],
    [
      secondaryCharacterClass,
      secondaryClassLevel,
      secondaryMaximumSpellLevel,
      secondarySelectedMystery,
      spells,
    ],
  );
  const secondaryPatronSpells = useMemo(
    () =>
      secondaryCharacterClass?.id === "witch"
        ? witchPatronSpells(
            spells,
            secondarySelectedWitchPatron,
            secondaryClassLevel,
            secondaryCharacterClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[secondaryCharacterClass.id] <=
              secondaryMaximumSpellLevel,
          )
        : [],
    [
      secondaryCharacterClass,
      secondaryClassLevel,
      secondaryMaximumSpellLevel,
      secondarySelectedWitchPatron,
      spells,
    ],
  );
  const secondarySelectedOptionSpells = useMemo(
    () =>
      !secondaryCharacterClass
        ? []
        : selectedOptionSpellChoices
            .filter((option) =>
              option.classIds.includes(secondaryCharacterClass.id),
            )
            .flatMap((option) => {
              const spell = spells.find(
                (candidate) => candidate.id === option.spellId,
              );
              const spellLevel =
                option.spellLevel ??
                spell?.levelByClass[secondaryCharacterClass.id];
              return spell &&
                spellLevel !== undefined &&
                spellLevel <= secondaryMaximumSpellLevel
                ? [
                    {
                      ...spell,
                      levelByClass: {
                        ...spell.levelByClass,
                        [secondaryCharacterClass.id]: spellLevel,
                      },
                    },
                  ]
                : [];
            }),
    [
      secondaryCharacterClass,
      secondaryMaximumSpellLevel,
      selectedOptionSpellChoices,
      spells,
    ],
  );
  const secondaryGrantedSpells = useMemo(
    () => [
      ...secondaryBloodlineSpells,
      ...secondaryMysterySpells,
      ...secondaryPatronSpells,
      ...secondarySelectedOptionSpells,
      ...spellsFromAdditions(spells, secondaryCharacterClass?.bonusSpellAdditions, secondaryCharacterClass?.id ?? "", secondaryMaximumSpellLevel),
    ],
    [
      secondaryBloodlineSpells,
      secondaryMysterySpells,
      secondaryPatronSpells,
      secondarySelectedOptionSpells,
      secondaryCharacterClass,
      secondaryMaximumSpellLevel,
      spells,
    ],
  );
  const secondaryAvailableSpells = useMemo(
    () => mergeSpellLists(secondaryBaseSpells, secondaryGrantedSpells),
    [secondaryBaseSpells, secondaryGrantedSpells],
  );
  const secondaryGrantedSpellIds = useMemo(
    () => secondaryGrantedSpells.map((spell) => spell.id),
    [secondaryGrantedSpells],
  );
  const secondaryPreparedLimits = useMemo(
    () => {
      const costs = secondaryCharacterClass ? preparedCapacityCosts(selectedOptionSpellChoices, secondaryCharacterClass.id) : {};
      return (secondaryPreparedCasting?.prepared ?? []).map((entry) => ({ ...entry, count: Math.max(0, entry.count - (costs[entry.level] ?? 0)) }));
    },
    [secondaryCharacterClass, secondaryPreparedCasting, selectedOptionSpellChoices],
  );
  const secondaryKnownLimits = useMemo(
    () => secondarySpontaneousCasting?.known ?? [],
    [secondarySpontaneousCasting],
  );
  const secondarySpellDcs = secondaryHasSpellcasting
    ? Object.fromEntries(
        Array.from(
          { length: secondaryMaximumSpellLevel + 1 },
          (_, spellLevel) => [
            spellLevel,
            spellSaveDC(secondaryCastingAbilityScore, spellLevel),
          ],
        ),
      )
    : {};
  const secondaryOppositionSchoolIds = useMemo(
    () =>
      oppositionSchoolsFromOptions(
        secondaryCharacterClass?.id ?? "",
        selectedOptions,
      ),
    [secondaryCharacterClass, selectedOptions],
  );
  const secondaryOnDemandSpellCosts = useMemo(
    () => secondaryCharacterClass ? onDemandSpellCosts(selectedOptionSpellChoices, secondaryCharacterClass.id, secondaryClassLevel) : {},
    [secondaryCharacterClass, secondaryClassLevel, selectedOptionSpellChoices],
  );
  const secondaryElementalMasterPreparation = useMemo(
    () => elementalMasterPreparationFromOptions(secondaryCharacterClass, selectedOptions),
    [secondaryCharacterClass, selectedOptions],
  );
  const sourceBookFor = (
    selectedClassId: string,
    selectedClassLevel: number,
    maximumLevel: number,
    catalogue: typeof spells,
    automaticSpellIds: string[],
  ) => {
    const sourceBookRewardIds = selectedClassId === "alchemist"
      ? ["human-alchemist-formula"]
      : selectedClassId === "witch"
        ? ["human-witch-spell", "half-elf-witch-spell"]
        : [];
    const bonusSourceSpells = sourceBookRewardIds.reduce((total, rewardId) => {
      const reward = alternateFavoredClassRewards.find(item => item.id === rewardId);
      return total + (reward ? alternateRewardValue(reward, favoredClassAlternateBonuses[rewardId] ?? 0) : 0);
    }, 0);
    const capacity = preparedSourceSpellCapacity(
      selectedClassId,
      selectedClassLevel,
      combat.abilityModifiers.intelligence,
      bonusSourceSpells,
    );
    if (capacity === null) return undefined;
    const knownSpellIds = normalizePreparedSourceSpells(
      knownPreparedSpellsByClass[selectedClassId] ?? [],
      catalogue,
      selectedClassId,
      maximumLevel,
      capacity,
      automaticSpellIds,
    );
    return {
      label:
        selectedClassId === "alchemist" || selectedClassId === "investigator" ? "Formula book" : "Familiar spellbook",
      catalogue,
      knownSpellIds,
      automaticSpellIds,
      capacity,
      bonusCapacity: bonusSourceSpells,
      onChange: (ids: string[]) =>
        setKnownPreparedSpellsByClass((current) => ({
          ...current,
          [selectedClassId]: normalizePreparedSourceSpells(
            ids,
            catalogue,
            selectedClassId,
            maximumLevel,
            capacity,
            automaticSpellIds,
          ),
        })),
    };
  };
  const primarySourceBook = sourceBookFor(
    characterClass.id,
    primaryClassLevel,
    maximumSpellLevel,
    availableSpells,
    patronSpells.map((spell) => spell.id),
  );
  const secondarySourceBook = secondaryCharacterClass
    ? sourceBookFor(
        secondaryCharacterClass.id,
        secondaryClassLevel,
        secondaryMaximumSpellLevel,
        secondaryAvailableSpells,
        secondaryPatronSpells.map((spell) => spell.id),
      )
    : undefined;
  const primaryPreparedCatalogue = primarySourceBook
    ? preparedSourceAvailableSpells(
        availableSpells,
        characterClass.id,
        primarySourceBook.knownSpellIds,
        primarySourceBook.automaticSpellIds,
      )
    : availableSpells;
  const secondaryPreparedCatalogue =
    secondaryCharacterClass && secondarySourceBook
      ? preparedSourceAvailableSpells(
          secondaryAvailableSpells,
          secondaryCharacterClass.id,
          secondarySourceBook.knownSpellIds,
          secondarySourceBook.automaticSpellIds,
        )
      : secondaryAvailableSpells;
  const reservoir =
    classId === "arcanist" ? arcaneReservoir(primaryClassLevel) : null;
  const secondaryReservoir =
    secondaryCharacterClass?.id === "arcanist"
      ? arcaneReservoir(secondaryClassLevel)
      : null;
  const bardClassLevel = classLevelMap.bard ?? 0;
  const druidClassLevel = classLevelMap.druid ?? 0;
  const summonerClassLevel = classLevelMap.summoner ?? 0;
  const eidolonBaseFormId =
    Object.entries(selectedOptions).find(([featureId]) =>
      featureId.startsWith("summoner-eidolon-"),
    )?.[1] ?? "";
  const eidolonEvolutions =
    optionGroups.find((group) => group.id === "eidolon-evolutions")?.options ??
    [];
  const halfElfEidolonReward = alternateFavoredClassRewards.find(
    (reward) => reward.id === "half-elf-summoner-evolutions",
  );
  const bonusEidolonEvolutionPoints = halfElfEidolonReward
    ? alternateRewardValue(
        halfElfEidolonReward,
        favoredClassAlternateBonuses[halfElfEidolonReward.id] ?? 0,
      )
    : 0;
  const companionDescriptors = useMemo(() => {
    const descriptors: CompanionDescriptor[] = [];
    const selectedValue = (prefix: string) =>
      Object.entries(selectedOptions).find(([featureId]) =>
        featureId.startsWith(prefix),
      )?.[1] ?? "";
    const optionLabel = (optionId: string, fallback: string) =>
      optionGroups.flatMap((group) => group.options).find((option) => option.id === optionId)?.name ?? fallback;
    const reward = (id: string) => {
      const definition = alternateFavoredClassRewards.find(item => item.id === id);
      return definition ? alternateRewardValue(definition, favoredClassAlternateBonuses[id] ?? 0) : 0;
    };
    const add = (id: string, kind: CompanionDescriptor["kind"], optionId: string, fallback: string, effectiveLevel: number, bonuses: Pick<CompanionDescriptor, "bonusHitPoints" | "bonusSkillRanks"> = {}) => {
      if (optionId && effectiveLevel > 0) descriptors.push({ id, kind, optionId, label: optionLabel(optionId, fallback), effectiveLevel, ...bonuses });
    };
    add("eidolon", "eidolon", eidolonBaseFormId, "Eidolon", summonerClassLevel, { bonusHitPoints: reward("gnome-summoner-eidolon-hp"), bonusSkillRanks: reward("halfling-summoner-eidolon-skill") });
    add("witch-familiar", "familiar", selectedValue("witch-familiar-"), "Witch familiar", classLevelMap.witch ?? 0, { bonusSkillRanks: reward("half-orc-witch-familiar") });
    add("shaman-spirit-animal", "familiar", selectedValue("shaman-spirit-animal-"), "Spirit animal", classLevelMap.shaman ?? 0);
    if (selectedValue("wizard-arcane-bond-") === "wizard-arcane-bond-familiar")
      add("wizard-familiar", "familiar", selectedValue("wizard-familiar-"), "Wizard familiar", classLevelMap.wizard ?? 0);
    if (selectedValue("druid-nature-bond-") === "druid-nature-bond-animal")
      add("druid-companion", "animal", selectedValue("druid-animal-companion-"), "Animal companion", classLevelMap.druid ?? 0);
    if (selectedValue("ranger-hunters-bond-") === "ranger-hunters-bond-animal")
      add("ranger-companion", "animal", selectedValue("ranger-animal-companion-"), "Animal companion", Math.max(1, (classLevelMap.ranger ?? 0) - 3), { bonusHitPoints: reward("half-orc-ranger-companion"), bonusSkillRanks: reward("half-elf-ranger-companion") });
    add("hunter-companion", "animal", selectedValue("hunter-animal-companion-"), "Hunter companion", classLevelMap.hunter ?? 0);
    if (selectedValue("paladin-divine-bond-") === "paladin-divine-bond-mount")
      descriptors.push({ id: "paladin-mount", kind: "mount", optionId: "paladin-divine-bond-mount", label: "Bonded mount", effectiveLevel: classLevelMap.paladin ?? 1 });
    add("cavalier-mount", "mount", selectedValue("cavalier-mount-"), "Cavalier mount", classLevelMap.cavalier ?? 0, { bonusHitPoints: reward("elf-cavalier-mount") });
    add("samurai-mount", "mount", selectedValue("samurai-mount-"), "Samurai mount", classLevelMap.samurai ?? 0);
    if (selectedValue("magus-arcana-") === "magus-arcana-familiar")
      descriptors.push({ id: "magus-familiar", kind: "familiar", optionId: "magus-arcana-familiar", label: "Magus familiar", effectiveLevel: classLevelMap.magus ?? 1 });
    for (const progressionClass of progressionClasses) {
      const classLevel = classLevelMap[progressionClass.id] ?? 0;
      for (const grant of progressionClass.companionGrants ?? []) {
        if (classLevel < grant.minimumLevel) continue;
        const effectiveLevel = Math.max(1, (grant.usesCharacterLevel ? level : classLevel) + (grant.effectiveLevelAdjustment ?? 0));
        const existing = grant.stacksWithExisting
          ? descriptors.find((descriptor) => descriptor.kind === grant.kind)
          : undefined;
        if (existing) {
          existing.effectiveLevel += effectiveLevel;
          existing.label = `${existing.label} / ${grant.label}`;
          continue;
        }
        descriptors.push({
          id: `archetype-${progressionClass.id}-${grant.id}`,
          kind: grant.kind,
          optionId: grant.optionId,
          label: grant.label,
          effectiveLevel,
        });
      }
      for (const adjustment of progressionClass.companionProgressionAdjustments ?? []) {
        const companion = descriptors.find((descriptor) => descriptor.id === adjustment.companionId);
        if (companion) companion.effectiveLevel = adjustedCompanionLevel(companion.effectiveLevel, adjustment);
      }
    }
    const prohibitedKinds = new Set(allSelectedArchetypes.flatMap((archetype) => archetype.prohibitedCompanionKinds ?? []));
    return descriptors.filter((descriptor) => !prohibitedKinds.has(descriptor.kind));
  }, [allSelectedArchetypes, classLevelMap, eidolonBaseFormId, favoredClassAlternateBonuses, level, progressionClasses, selectedOptions, summonerClassLevel]);
  const validEidolonEvolutions = eidolonEvolutions.filter(
    (evolution): evolution is typeof evolution & { cost: number } =>
      Number.isFinite(evolution.cost),
  );
  const druidCharacterClass = progressionClasses.find(
    (item) => item.id === "druid",
  );
  const druidWildShapeEffectiveLevel = Math.max(
    1,
    Math.min(
      20,
      druidClassLevel + (druidCharacterClass?.wildShapeLevelAdjustment ?? 0),
    ),
  );
  const alternateBardicPerformanceRounds = alternateFavoredClassRewards
    .filter((reward) => reward.resource === "bardic-performance")
    .reduce(
      (total, reward) =>
        total +
        alternateRewardValue(
          reward,
          favoredClassAlternateBonuses[reward.id] ?? 0,
        ),
      0,
    );
  const bardicPerformanceMaximum =
    bardClassLevel > 0
      ? bardicPerformanceRounds(
          bardClassLevel,
          combat.abilityModifiers.charisma,
        ) + alternateBardicPerformanceRounds
      : 0;
  const wildShapeMaximum =
    druidClassLevel > 0 ? druidWildShapeUses(druidWildShapeEffectiveLevel) : 0;
  const resourceLabels: Record<string, [string, string]> = {
    bombs: ["Bombs", "bomb"],
    challenges: ["Challenges", "challenge"],
    tactician: ["Tactician", "use"],
    judgments: ["Judgments", "judgment"],
    baneRounds: ["Bane", "round"],
    summonMonster: ["Summon Monster", "use"],
    bondSensesRounds: ["Bond Senses", "round"],
    makersCall: ["Maker's Call", "use"],
    arcanePool: ["Arcane Pool", "point"],
    grit: ["Grit", "point"],
    resolve: ["Resolve", "use"],
    martialFlexibility: ["Martial Flexibility", "use"],
    knockout: ["Knockout", "use"],
    panache: ["Panache", "point"],
    charmedLife: ["Charmed Life", "use"],
    bloodrageRounds: ["Bloodrage", "round"],
    inspiration: ["Inspiration", "point"],
    ragingSongRounds: ["Raging Song", "round"],
    spellKenning: ["Spell Kenning", "use"],
    blessingUses: ["Blessings", "use"],
    fervor: ["Fervor", "use"],
    burn: ["Burn accepted", "point"],
    influence: ["Spirit Influence", "point"],
    mesmeristTrick: ["Mesmerist Tricks", "implant"],
    mentalFocus: ["Mental Focus", "point"],
    phrenicPool: ["Phrenic Pool", "point"],
    bondedManifestation: ["Bonded Manifestation", "round"],
  };
  const apgDailyResources = classLevels.flatMap(
    ({ classId: resourceClassId, level: resourceClassLevel }) => {
      const resourceArchetypes = archetypes.filter((archetype) =>
        archetype.classId === resourceClassId && (archetypeStacksByClass[resourceClassId] ?? []).includes(archetype.id)
      );
      const adjustments = resourceArchetypes.flatMap((archetype) =>
        archetype.resourceAdjustments?.length
          ? archetype.resourceAdjustments
          : inferArchetypeResourceAdjustments(archetype)
      );
      return Object.entries(
        applyArchetypeResourceAdjustments(
          apgClassResourceMaximums(resourceClassId, resourceClassLevel, combat.abilityModifiers),
          resourceArchetypes,
          resourceClassLevel,
          combat.abilityModifiers,
          {
            selectedOptionIds: Object.values(selectedOptions),
            casterLevel: effectiveSpellcastingLevelMap[resourceClassId] ?? resourceClassLevel,
          },
        )
      ).map(([resourceId, maximum]) => {
        const adjustment = adjustments.find((item) => item.resourceId === resourceId);
        const gnomeBombReward = resourceClassId === "alchemist" && resourceId === "bombs"
          ? alternateFavoredClassRewards.find(reward => reward.id === "gnome-alchemist-bombs")
          : undefined;
        const resourceMaximum = maximum + (gnomeBombReward
          ? alternateRewardValue(gnomeBombReward, favoredClassAlternateBonuses[gnomeBombReward.id] ?? 0)
          : 0);
        return {
          classId: resourceClassId,
          id: resourceId,
          label: `${classes.find((item) => item.id === resourceClassId)?.name ?? resourceClassId} ${adjustment?.label ?? resourceLabels[resourceId]?.[0] ?? resourceId}`,
          unit: adjustment?.unit ?? resourceLabels[resourceId]?.[1] ?? "use",
          maximum: resourceMaximum,
          refreshCadence: adjustment?.refreshCadence ?? "day",
          hidden: adjustment?.hidden ?? false,
          used: classResourceUsesByClass[resourceClassId]?.[resourceId] ?? 0,
          onUsedChange: (used: number) =>
            setClassResourceUsesByClass((current) => ({
              ...current,
              [resourceClassId]: {
                ...(current[resourceClassId] ?? {}),
                [resourceId]: Math.max(0, Math.min(resourceMaximum, used)),
              },
            })),
        };
      });
    },
  );
  useEffect(
    () =>
      setClassResourceUsesByClass((current) =>
        normalizeClassResourcesByClass(
          current,
          classLevels,
          combat.abilityModifiers,
          Object.fromEntries(classLevels.map(({ classId }) => [classId, archetypes.filter((archetype) => archetype.classId === classId && (archetypeStacksByClass[classId] ?? []).includes(archetype.id))])),
          Object.fromEntries(classLevels.map(({ classId, level: classLevel }) => [classId, { selectedOptionIds: Object.values(selectedOptions), casterLevel: effectiveSpellcastingLevelMap[classId] ?? classLevel }])),
        ),
      ),
    [
      classLevels,
      combat.abilityModifiers.charisma,
      combat.abilityModifiers.intelligence,
      combat.abilityModifiers.constitution,
      archetypeStacksByClass,
      archetypes,
      effectiveSpellcastingLevelMap,
      selectedOptions,
    ],
  );
  useEffect(() => {
    if (!summonerClassLevel) {
      setEidolonEvolutionIds([]);
      return;
    }
    const formId = eidolonBaseFormId.replace(/^eidolon-/, "");
    setEidolonEvolutionIds(
      (current) =>
        validateEidolonEvolutions(
          current,
          validEidolonEvolutions,
          summonerClassLevel,
          formId,
        ).selectedIds,
    );
  }, [summonerClassLevel, eidolonBaseFormId]);
  const classDailyResources = [
    ...(reservoir
      ? [
          {
            id: "arcaneReservoir",
            label: "Arcane Reservoir",
            unit: "point",
            maximum: reservoir.maximum,
            used: Math.max(0, reservoir.maximum - reservoirPoints),
            refreshUsed: reservoir.maximum - reservoir.dailyRefresh,
            onUsedChange: (used: number) =>
              setReservoirPoints(Math.max(0, reservoir.maximum - used)),
          },
        ]
      : []),
    ...(bardClassLevel > 0
      ? [
          {
            label: "Performance rounds",
            unit: "round",
            maximum: bardicPerformanceMaximum,
            used: bardicPerformanceUsed,
            onUsedChange: setBardicPerformanceUsed,
          },
        ]
      : []),
    ...(wildShapeMaximum !== 0
      ? [
          {
            label: "Wild Shape",
            unit: "use",
            maximum: wildShapeMaximum,
            used: wildShapeUsed,
            onUsedChange: setWildShapeUsed,
          },
        ]
      : []),
    ...apgDailyResources,
  ];
  const updateSpellSlotUses = (uses: Record<number, number>) =>
    setSpellSlotUses(normalizeSpellSlotUses(uses, spellSlots));
  const updateSecondarySpellSlotUses = (uses: Record<number, number>) =>
    setSecondarySpellSlotUses(
      normalizeSpellSlotUses(uses, secondarySpellSlots),
    );
  const updateReservoir = (points: number) =>
    setReservoirPoints(Math.max(0, Math.min(reservoir?.maximum ?? 0, points)));
  const updateSecondaryReservoir = (points: number) =>
    setReservoirPoints(
      Math.max(0, Math.min(secondaryReservoir?.maximum ?? 0, points)),
    );
  const refreshTrackedClassResources = (resourceClassId: string) =>
    setClassResourceUsesByClass((current) => ({
      ...current,
      [resourceClassId]: Object.fromEntries(
        Object.entries(current[resourceClassId] ?? {}).filter(([resourceId]) =>
          apgDailyResources.some((resource) => resource.classId === resourceClassId && resource.id === resourceId && resource.refreshCadence === "week"),
        ),
      ),
    }));
  const refreshDay = () => {
    setSpellSlotUses({});
    refreshTrackedClassResources(classId);
    if (reservoir) setReservoirPoints(reservoir.dailyRefresh);
    if (classId === "bard") setBardicPerformanceUsed(0);
    if (classId === "druid") setWildShapeUsed(0);
    setActiveEffects((current) => current.filter((effect) => !["Eldritch Surge fatigue", "Eldritch Surge exhaustion", "Eldritch Surge spell", "Eldritch Surge exploit"].includes(effect.name)));
  };
  const refreshSecondaryDay = () => {
    setSecondarySpellSlotUses({});
    if (secondaryCharacterClass)
      refreshTrackedClassResources(secondaryCharacterClass.id);
    if (secondaryReservoir) setReservoirPoints(secondaryReservoir.dailyRefresh);
    if (secondaryCharacterClass?.id === "bard") setBardicPerformanceUsed(0);
    if (secondaryCharacterClass?.id === "druid") setWildShapeUsed(0);
    setActiveEffects((current) => current.filter((effect) => !["Eldritch Surge fatigue", "Eldritch Surge exhaustion", "Eldritch Surge spell", "Eldritch Surge exploit"].includes(effect.name)));
  };
  const normalizeSelectedSpells = (spellIds: string[]) =>
    isSpontaneous
      ? normalizeKnownSpells(
          spellIds,
          availableSpells,
          characterClass.spellListClassId ?? characterClass.id,
          knownLimits,
          grantedSpellIds,
        )
      : normalizePreparedSpellsWithOpposition(
          spellIds.filter((id) => !primaryOnDemandSpellCosts[id]),
          primaryPreparedCatalogue,
          characterClass.spellListClassId ?? characterClass.id,
          preparedLimits,
          oppositionSchoolIds,
          elementalMasterPreparation?.oppositionSpellIds ?? [],
          elementalMasterPreparation,
          requiredPreparedSchool(characterClass),
        );
  const updateSelectedSpells = (spellIds: string[]) =>
    setSelectedSpellIds(normalizeSelectedSpells(spellIds));
  const normalizeSecondarySelectedSpells = (spellIds: string[]) =>
    !secondaryCharacterClass
      ? []
      : secondaryIsSpontaneous
        ? normalizeKnownSpells(
            spellIds,
            secondaryAvailableSpells,
            secondaryCharacterClass.spellListClassId ?? secondaryCharacterClass.id,
            secondaryKnownLimits,
            secondaryGrantedSpellIds,
          )
        : normalizePreparedSpellsWithOpposition(
            spellIds.filter((id) => !secondaryOnDemandSpellCosts[id]),
            secondaryPreparedCatalogue,
            secondaryCharacterClass.spellListClassId ?? secondaryCharacterClass.id,
            secondaryPreparedLimits,
            secondaryOppositionSchoolIds,
            secondaryElementalMasterPreparation?.oppositionSpellIds ?? [],
            secondaryElementalMasterPreparation,
            requiredPreparedSchool(secondaryCharacterClass),
          );
  const updateSecondarySelectedSpells = (spellIds: string[]) =>
    setSecondarySelectedSpellIds(normalizeSecondarySelectedSpells(spellIds));
  useEffect(
    () =>
      setSelectedSpellIds((current) => {
        const next = normalizeSelectedSpells(current);
        return next.length === current.length &&
          next.every((id, index) => id === current[index])
          ? current
          : next;
      }),
    [
      availableSpells,
      grantedSpellIds,
      characterClass.id,
      isSpontaneous,
      knownLimits,
      oppositionSchoolIds,
      elementalMasterPreparation,
      preparedLimits,
    ],
  );
  useEffect(
    () =>
      setSpellSlotUses((current) =>
        normalizeSpellSlotUses(current, spellSlots),
      ),
    [spellSlots],
  );
  useEffect(
    () =>
      setSecondarySelectedSpellIds((current) => {
        const next = normalizeSecondarySelectedSpells(current);
        return next.length === current.length &&
          next.every((id, index) => id === current[index])
          ? current
          : next;
      }),
    [
      secondaryAvailableSpells,
      secondaryCharacterClass?.id,
      secondaryGrantedSpellIds,
      secondaryIsSpontaneous,
      secondaryKnownLimits,
      secondaryOppositionSchoolIds,
      secondaryPreparedLimits,
    ],
  );
  useEffect(
    () =>
      setSecondarySpellSlotUses((current) =>
        normalizeSpellSlotUses(current, secondarySpellSlots),
      ),
    [secondarySpellSlots],
  );
  const spellcastingClassIds = useMemo(
    () =>
      progressionClasses
        .filter(
          (item) =>
            item.spellcasting &&
            (effectiveSpellcastingLevelMap[item.id] ?? 0) > 0,
        )
        .map((item) => item.id),
    [effectiveSpellcastingLevelMap, progressionClasses],
  );
  useEffect(
    () =>
      setActiveSpellClassId((current) =>
        spellcastingClassIds.includes(current)
          ? current
          : (spellcastingClassIds[0] ?? ""),
      ),
    [spellcastingClassIds],
  );
  useEffect(() => {
    if (activeTab === "spells" && spellcastingClassIds.length === 0)
      setActiveTab("features");
  }, [activeTab, spellcastingClassIds.length]);
  useEffect(() => {
    if (reservoir)
      setReservoirPoints((current) => Math.min(current, reservoir.maximum));
  }, [reservoir?.maximum]);
  useEffect(
    () =>
      setBardicPerformanceUsed((current) =>
        Math.min(current, bardicPerformanceMaximum),
      ),
    [bardicPerformanceMaximum],
  );
  useEffect(
    () =>
      setWildShapeUsed((current) =>
        wildShapeMaximum === null ? 0 : Math.min(current, wildShapeMaximum),
      ),
    [wildShapeMaximum],
  );

  const primarySpellbook = spontaneousCasting ? (
    <SpontaneousSpellbook
      key={characterClass.id}
      spells={availableSpells}
      spellTraitBonuses={selectedTraitBonuses.spellBonuses}
      classId={characterClass.spellListClassId ?? characterClass.id}
      className={characterClass.name}
      casterLevel={primarySpellcastingLevel + (characterClass.id === "arcanist" ? eldritchSurgeCasterLevelBonus : 0)}
      castingAbilityName={
        castingAbility ? labels[castingAbility] : "casting ability"
      }
      slots={spontaneousCasting.slots}
      knownLimits={knownLimits}
      spellDcs={spellDcs}
      maximumSpellLevel={maximumSpellLevel}
      knownSpellIds={selectedSpellIds}
      grantedSpellIds={grantedSpellIds}
      grantedSpellLabel={
        selectedOptionSpells.length > 0 ? "Feature" : undefined
      }
      onKnownSpellIdsChange={updateSelectedSpells}
      slotUses={spellSlotUses}
      onSlotUsesChange={updateSpellSlotUses}
      onRefreshDay={refreshDay}
    />
  ) : preparedCasting ? (
    <Spellbook
      key={characterClass.id}
      spells={primaryPreparedCatalogue}
      sourceBook={primarySourceBook}
      spellTraitBonuses={selectedTraitBonuses.spellBonuses}
      classId={characterClass.spellListClassId ?? characterClass.id}
      className={characterClass.name}
      casterLevel={primarySpellcastingLevel + (characterClass.id === "arcanist" ? eldritchSurgeCasterLevelBonus : 0)}
      castingAbilityName={
        castingAbility ? labels[castingAbility] : "casting ability"
      }
      slots={preparedCasting.slots}
      preparedLimits={preparedLimits}
      spellDcs={spellDcs}
      maximumSpellLevel={maximumSpellLevel}
      preparedSpellIds={selectedSpellIds}
      onPreparedSpellIdsChange={updateSelectedSpells}
      slotUses={spellSlotUses}
      onSlotUsesChange={updateSpellSlotUses}
      reservoir={reservoir ? { current: reservoirPoints, ...reservoir } : null}
      onReservoirChange={updateReservoir}
      onRefreshDay={refreshDay}
      oppositionSchoolIds={oppositionSchoolIds}
      oppositionSpellIds={elementalMasterPreparation?.oppositionSpellIds}
      restrictedBonus={elementalMasterPreparation}
      onDemandSpellCosts={primaryOnDemandSpellCosts}
      requiredPreparedSchool={requiredPreparedSchool(characterClass)}
      spellAutomation={classSpellAutomation(characterClass, primaryClassLevel, Object.values(selectedOptions))}
      criticalStrikeResource={classDailyResources.find((resource) => resource.id === "bladeAdeptCriticalStrike")}
      bondedObjectCastResource={characterClass.features.some((feature) => feature.id === "arcanist-blade-adept-sword-bond-su-1") ? classDailyResources.find((resource) => resource.id === "bladeAdeptSwordBondSpell") : undefined}
      abilityModifiers={combat.abilityModifiers}
      spellMastery={characterClass.id === "arcanist" && spellMasteryCount > 0 ? { limit: spellMasteryLimit, selectedIds: spellMasterySpellIds, catalogue: spellMasteryCatalogue, onChange: updateSpellMasterySpellIds } : undefined}
      activeEffects={activeEffects}
      onAddEffect={addActiveEffect}
      onRemoveEffectByName={(effectName) => setActiveEffects((current) => current.filter((effect) => effect.name !== effectName))}
    />
  ) : null;
  const secondarySpellbook =
    secondaryCharacterClass && secondarySpontaneousCasting ? (
      <SpontaneousSpellbook
        key={secondaryCharacterClass.id}
        spells={secondaryAvailableSpells}
        spellTraitBonuses={selectedTraitBonuses.spellBonuses}
        classId={secondaryCharacterClass.spellListClassId ?? secondaryCharacterClass.id}
        className={secondaryCharacterClass.name}
        casterLevel={secondarySpellcastingLevel + (secondaryCharacterClass.id === "arcanist" ? eldritchSurgeCasterLevelBonus : 0)}
        castingAbilityName={
          secondaryCastingAbility
            ? labels[secondaryCastingAbility]
            : "casting ability"
        }
        slots={secondarySpontaneousCasting.slots}
        knownLimits={secondaryKnownLimits}
        spellDcs={secondarySpellDcs}
        maximumSpellLevel={secondaryMaximumSpellLevel}
        knownSpellIds={secondarySelectedSpellIds}
        grantedSpellIds={secondaryGrantedSpellIds}
        grantedSpellLabel={
          secondarySelectedOptionSpells.length > 0 ? "Feature" : undefined
        }
        onKnownSpellIdsChange={updateSecondarySelectedSpells}
        slotUses={secondarySpellSlotUses}
        onSlotUsesChange={updateSecondarySpellSlotUses}
        onRefreshDay={refreshSecondaryDay}
      />
    ) : secondaryCharacterClass && secondaryPreparedCasting ? (
      <Spellbook
        key={secondaryCharacterClass.id}
        spells={secondaryPreparedCatalogue}
        sourceBook={secondarySourceBook}
        spellTraitBonuses={selectedTraitBonuses.spellBonuses}
        classId={secondaryCharacterClass.spellListClassId ?? secondaryCharacterClass.id}
        className={secondaryCharacterClass.name}
        casterLevel={secondarySpellcastingLevel + (secondaryCharacterClass.id === "arcanist" ? eldritchSurgeCasterLevelBonus : 0)}
        castingAbilityName={
          secondaryCastingAbility
            ? labels[secondaryCastingAbility]
            : "casting ability"
        }
        slots={secondaryPreparedCasting.slots}
        preparedLimits={secondaryPreparedLimits}
        spellDcs={secondarySpellDcs}
        maximumSpellLevel={secondaryMaximumSpellLevel}
        preparedSpellIds={secondarySelectedSpellIds}
        onPreparedSpellIdsChange={updateSecondarySelectedSpells}
        slotUses={secondarySpellSlotUses}
        onSlotUsesChange={updateSecondarySpellSlotUses}
        reservoir={
          secondaryReservoir
            ? { current: reservoirPoints, ...secondaryReservoir }
            : null
        }
        onReservoirChange={updateSecondaryReservoir}
        onRefreshDay={refreshSecondaryDay}
        oppositionSchoolIds={secondaryOppositionSchoolIds}
        oppositionSpellIds={secondaryElementalMasterPreparation?.oppositionSpellIds}
        restrictedBonus={secondaryElementalMasterPreparation}
        onDemandSpellCosts={secondaryOnDemandSpellCosts}
        requiredPreparedSchool={requiredPreparedSchool(secondaryCharacterClass)}
        spellAutomation={classSpellAutomation(secondaryCharacterClass, secondaryClassLevel, Object.values(selectedOptions))}
        criticalStrikeResource={classDailyResources.find((resource) => resource.id === "bladeAdeptCriticalStrike")}
        bondedObjectCastResource={secondaryCharacterClass.features.some((feature) => feature.id === "arcanist-blade-adept-sword-bond-su-1") ? classDailyResources.find((resource) => resource.id === "bladeAdeptSwordBondSpell") : undefined}
        abilityModifiers={combat.abilityModifiers}
        spellMastery={secondaryCharacterClass.id === "arcanist" && spellMasteryCount > 0 ? { limit: spellMasteryLimit, selectedIds: spellMasterySpellIds, catalogue: spellMasteryCatalogue, onChange: updateSpellMasterySpellIds } : undefined}
        activeEffects={activeEffects}
        onAddEffect={addActiveEffect}
        onRemoveEffectByName={(effectName) => setActiveEffects((current) => current.filter((effect) => effect.name !== effectName))}
      />
    ) : null;
  const extraActiveClassLevel = additionalClassLevels
    .slice(1)
    .find((entry) => entry.classId === activeSpellClassId);
  const extraActiveClass = extraActiveClassLevel
    ? additionalCharacterClasses.find((item) => item.id === extraActiveClassLevel.classId)
    : undefined;
  const extraSpellbook =
    extraActiveClass && extraActiveClassLevel ? (
      <ClassSpellbook
        key={extraActiveClass.id}
        characterClass={extraActiveClass}
        spells={spells}
        classLevel={
          effectiveSpellcastingLevelMap[extraActiveClass.id] ??
          extraActiveClassLevel.level
        }
        abilities={abilities}
        selectedOptions={selectedOptions}
        spellTraitBonuses={selectedTraitBonuses.spellBonuses}
        selectedSpellIds={extraSelectedSpellsByClass[extraActiveClass.id] ?? []}
        onSelectedSpellIdsChange={(spellIds) =>
          setExtraSelectedSpellsByClass((current) => ({
            ...current,
            [extraActiveClass.id]: spellIds,
          }))
        }
        slotUses={extraSpellSlotUsesByClass[extraActiveClass.id] ?? {}}
        onSlotUsesChange={(uses) =>
          setExtraSpellSlotUsesByClass((current) => ({
            ...current,
            [extraActiveClass.id]: uses,
          }))
        }
        reservoirPoints={reservoirPoints}
        onReservoirPointsChange={setReservoirPoints}
        criticalStrikeResource={classDailyResources.find((resource) => resource.id === "bladeAdeptCriticalStrike")}
        bondedObjectCastResource={extraActiveClass.features.some((feature) => feature.id === "arcanist-blade-adept-sword-bond-su-1") ? classDailyResources.find((resource) => resource.id === "bladeAdeptSwordBondSpell") : undefined}
        onRefreshClassResources={() => refreshTrackedClassResources(extraActiveClass.id)}
        activeEffects={activeEffects}
        onAddEffect={addActiveEffect}
        onRemoveEffectByName={(effectName) => setActiveEffects((current) => current.filter((effect) => effect.name !== effectName))}
      />
    ) : null;

  const preparedSpellsByClass = Object.fromEntries(
    classLevels.map((entry, index) => [
      entry.classId,
      index === 0
        ? selectedSpellIds
        : index === 1
          ? secondarySelectedSpellIds
          : (extraSelectedSpellsByClass[entry.classId] ?? []),
    ]),
  );
  const spellSlotUsesByClass = Object.fromEntries(
    classLevels.map((entry, index) => [
      entry.classId,
      Object.fromEntries(
        Object.entries(
          index === 0
            ? spellSlotUses
            : index === 1
              ? secondarySpellSlotUses
              : (extraSpellSlotUsesByClass[entry.classId] ?? {}),
        ),
      ),
    ]),
  );
  const savedArchetypeIdsByClass = Object.fromEntries(
    classLevels.flatMap((entry, index) => {
      const selectedId = (
        archetypeStacksByClass[entry.classId] ?? [
          index === 0 ? archetypeId : additionalArchetypeIds[entry.classId],
        ]
      ).filter(Boolean)[0];
      return selectedId ? [[entry.classId, selectedId]] : [];
    }),
  );
  const characterDraft: CharacterDraftV1 = {
    version: 1,
    name,
    classId,
    classLevels,
    archetypeId,
    archetypeIdsByClass: savedArchetypeIdsByClass,
    archetypeStacksByClass,
    prestigeSpellcastingTargets,
    ancestryId,
    selectedAlternateRacialTraitIds,
    level,
    humanAbility,
    baseAbilities,
    pointBuyBudget,
    abilityBoosts,
    favoredClassHitPoints,
    favoredClassSkillRanks,
    favoredClassAlternateBonuses,
    selectedFeatIds,
    selectedTraitIds,
    selectedTraitChoices,
    selectedFeatChoices,
    skillRanks,
    selectedOptions,
    signatureSpellHighestClassLevel,
    signatureSpellExchangeCredits,
    preparedSpells: selectedSpellIds,
    preparedSpellsByClass,
    knownPreparedSpellsByClass,
    spellSlotUses: Object.fromEntries(Object.entries(spellSlotUses)),
    spellSlotUsesByClass,
    classResourceUsesByClass,
    companions,
    eidolon: summonerClassLevel
      ? { size: eidolonSize, evolutionIds: eidolonEvolutionIds }
      : undefined,
    arcaneReservoir: classLevelMap.arcanist ? reservoirPoints : null,
    bardicPerformanceUsed: bardClassLevel > 0 ? bardicPerformanceUsed : 0,
    wildShapeUsed: druidClassLevel > 0 ? wildShapeUsed : 0,
    currentHitPoints,
    temporaryHitPoints,
    activeEffects,
    inventory,
    coins,
  };
  const bladeAdeptAdvancementLevel = Object.values(selectedOptions).includes("blade-adept-eldritch-blade")
    ? effectiveSpellcastingLevelMap.arcanist ?? classLevelMap.arcanist ?? 0
    : classLevelMap.arcanist ?? 0;
  const bladeAdeptEnhancement = selectedArchetypes.some((archetype) => archetype.id === "arcanist-blade-adept") && bladeAdeptAdvancementLevel >= 3
    ? bladeAdeptAdvancementLevel >= 17 ? 5 : bladeAdeptAdvancementLevel >= 13 ? 4 : bladeAdeptAdvancementLevel >= 9 ? 3 : bladeAdeptAdvancementLevel >= 5 ? 2 : 1
    : 0;
  const intrinsicWeaponEnhancements = bladeAdeptWeaponKey && bladeAdeptEnhancement ? { [bladeAdeptWeaponKey]: bladeAdeptEnhancement } : {};
  const combatAttacks = equippedWeaponAttacks(
    inventory,
    progression.baseAttackBonus,
    combat.abilityModifiers.strength,
    combat.abilityModifiers.dexterity,
    selectedFeatBonuses.weaponBonuses,
    intrinsicWeaponEnhancements,
  );
  const serializedCharacterDraft = JSON.stringify(characterDraft);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(characterLibraryKey);
      const library = stored
        ? normalizeCharacterLibrary(JSON.parse(stored))
        : emptyCharacterLibrary();
      const legacy = localStorage.getItem(legacyCharacterKey);
      if (library.characters.length === 0 && legacy) {
        const draft = normalizeCharacterDraft(JSON.parse(legacy), {
          classIds: classes.map((item) => item.id),
          ancestryIds: ancestries.map((item) => item.id),
          archetypeIds: archetypes.map((item) => item.id),
          archetypeIdsByClass,
        });
        if (draft) {
          const id =
            globalThis.crypto?.randomUUID?.() ?? `character-${Date.now()}`;
          const migrated = {
            version: 1 as const,
            activeCharacterId: id,
            characters: [{ id, updatedAt: new Date().toISOString(), draft }],
          };
          localStorage.setItem(characterLibraryKey, JSON.stringify(migrated));
          setCharacterLibrary(migrated);
          setSaveNotice(
            "Your previous save was added to the character library",
          );
          return;
        }
      }
      setCharacterLibrary(library);
      const autosave = localStorage.getItem(characterAutosaveKey);
      if (autosave) {
        const candidate = JSON.parse(autosave) as {
          updatedAt?: unknown;
          draft?: unknown;
        };
        const draft = normalizeCharacterDraft(candidate.draft, {
          classIds: classes.map((item) => item.id),
          ancestryIds: ancestries.map((item) => item.id),
          archetypeIds: archetypes.map((item) => item.id),
          archetypeIdsByClass,
        });
        const activeDraft = library.characters.find(
          (entry) => entry.id === library.activeCharacterId,
        )?.draft;
        if (
          draft &&
          typeof candidate.updatedAt === "string" &&
          JSON.stringify(draft) !== JSON.stringify(activeDraft)
        )
          setRecoveryDraft({ updatedAt: candidate.updatedAt, draft });
      }
    } catch {
      setSaveNotice(
        "Saved character library is invalid; starting with an empty library",
      );
    }
  }, []);
  useEffect(() => {
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      lastPersistedDraft.current = serializedCharacterDraft;
      return;
    }
    if (serializedCharacterDraft === lastPersistedDraft.current) return;
    setAutosaveStatus("Unsaved changes");
    const timer = globalThis.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      localStorage.setItem(
        characterAutosaveKey,
        JSON.stringify({ updatedAt, draft: characterDraft }),
      );
      lastPersistedDraft.current = serializedCharacterDraft;
      setAutosaveStatus(
        `Autosaved ${new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      );
    }, 750);
    return () => globalThis.clearTimeout(timer);
  }, [serializedCharacterDraft]);
  useEffect(() => {
    const protectUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (serializedCharacterDraft === lastPersistedDraft.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectUnsavedChanges);
    return () =>
      window.removeEventListener("beforeunload", protectUnsavedChanges);
  }, [serializedCharacterDraft]);
  const persistLibrary = (library: CharacterLibraryV1) => {
    localStorage.setItem(characterLibraryKey, JSON.stringify(library));
    setCharacterLibrary(library);
  };
  const applyCharacterDraft = (value: unknown, successNotice: string) => {
    if (
      value &&
      typeof value === "object" &&
      "version" in value &&
      value.version !== 1
    ) {
      setSaveNotice("Unsupported character file version");
      return null;
    }
    const draft = normalizeCharacterDraft(value, {
      classIds: classes.map((item) => item.id),
      ancestryIds: ancestries.map((item) => item.id),
      archetypeIds: archetypes
        .filter(
          (item) => item.classId === (value as { classId?: string })?.classId,
        )
        .map((item) => item.id),
      archetypeIdsByClass,
    });
    if (!draft) {
      setSaveNotice("Character file is invalid");
      return null;
    }
    // Reset and load can queue feat normalization from different renders. Keep
    // the normalized saved selections intact until the restored class, level,
    // ancestry, and archetype context have committed together.
    skipNextFeatNormalization.current = true;
    const draftArchetypes = (selectedClassId: string) =>
      (
        draft.archetypeStacksByClass?.[selectedClassId] ??
        (draft.archetypeIdsByClass[selectedClassId]
          ? [draft.archetypeIdsByClass[selectedClassId]]
          : [])
      ).flatMap(
        (id) =>
          archetypes.find(
            (item) => item.id === id && item.classId === selectedClassId,
          ) ?? [],
      );
    const draftBaseClass =
      classes.find((item) => item.id === draft.classId) ?? classes[0];
    const draftClass = applyArchetypes(
      draftBaseClass,
      draftArchetypes(draft.classId),
    );
    const draftPrimaryLevel = draft.classLevels[0]?.level ?? draft.level;
    const draftSecondaryLevel = draft.classLevels[1];
    const draftSecondaryBaseClass = classes.find(
      (item) => item.id === draftSecondaryLevel?.classId,
    );
    const draftSecondaryClass = draftSecondaryBaseClass
      ? applyArchetypes(
          draftSecondaryBaseClass,
          draftArchetypes(draftSecondaryBaseClass.id),
        )
      : undefined;
    const draftProgressionClasses = draft.classLevels.flatMap((entry) => {
      const baseClass = classes.find((item) => item.id === entry.classId);
      return baseClass
        ? [applyArchetypes(baseClass, draftArchetypes(entry.classId))]
        : [];
    });
    const draftEffectiveSpellcastingLevels = effectiveSpellcastingLevels(
      draftProgressionClasses,
      draft.classLevels,
      draft.prestigeSpellcastingTargets,
    );
    const draftPrimarySpellcastingLevel =
      draftEffectiveSpellcastingLevels[draft.classId] ?? draftPrimaryLevel;
    const draftSecondarySpellcastingLevel = draftSecondaryLevel
      ? (draftEffectiveSpellcastingLevels[draftSecondaryLevel.classId] ??
        draftSecondaryLevel.level)
      : 1;
    const draftAncestry =
      ancestries.find((item) => item.id === draft.ancestryId) ?? ancestries[0];
    const draftFixedModifiers =
      (
        draftAncestry.abilityModifiers as {
          fixed?: Partial<typeof defaultAbilities>;
        }
      ).fixed ?? {};
    const draftChoiceAmount =
      (draftAncestry.abilityModifiers as { choice?: { amount: number } }).choice
        ?.amount ?? 0;
    const draftAbilities = Object.fromEntries(
      Object.keys(draft.baseAbilities).map((ability) => [
        ability,
        draft.baseAbilities[ability as keyof typeof defaultAbilities] +
          (draftFixedModifiers[ability as keyof typeof defaultAbilities] ?? 0) +
          (draftChoiceAmount && ability === draft.humanAbility
            ? draftChoiceAmount
            : 0) +
          draft.abilityBoosts.filter((boost) => boost === ability).length,
      ]),
    ) as typeof defaultAbilities;
    const draftCastingAbility =
      draftClass.spellcasting &&
      abilityNames.includes(
        draftClass.spellcasting.ability as keyof typeof draftAbilities,
      )
        ? (draftClass.spellcasting.ability as keyof typeof draftAbilities)
        : null;
    const draftAbilityScore = draftCastingAbility
      ? draftAbilities[draftCastingAbility]
      : 10;
    const draftIsSpontaneous =
      draftClass.spellcasting?.castingType === "spontaneous";
    const draftPreparedCasting =
      draftClass.spellcasting && !draftIsSpontaneous
        ? spellcastingProgression(draftClass, draftPrimarySpellcastingLevel, {
            abilityScore: draftAbilityScore,
          })
        : null;
    const draftSpontaneousCasting = draftIsSpontaneous
      ? spontaneousSpellcastingProgression(
          draftClass,
          draftPrimarySpellcastingLevel,
          { abilityScore: draftAbilityScore },
        )
      : null;
    const draftCasting = draftSpontaneousCasting ?? draftPreparedCasting;
    const draftBaseSpells = draftCasting
      ? spellsAvailableToClass(
          spells,
          draftClass.spellListClassId ?? draftClass.id,
          draftCasting.maximumSpellLevel,
          draftClass.spellListAdditions,
        )
      : [];
    const draftReservoir =
      draft.classId === "arcanist" ? arcaneReservoir(draftPrimaryLevel) : null;
    const draftBardLevel =
      draft.classLevels.find((entry) => entry.classId === "bard")?.level ?? 0;
    const draftDruidLevel =
      draft.classLevels.find((entry) => entry.classId === "druid")?.level ?? 0;
    const draftBardicPerformanceMaximum =
      draftBardLevel > 0
        ? bardicPerformanceRounds(
            draftBardLevel,
            Math.floor((draftAbilities.charisma - 10) / 2),
          )
        : 0;
    const draftDruidClass =
      draftClass.id === "druid"
        ? draftClass
        : draftSecondaryClass?.id === "druid"
          ? draftSecondaryClass
          : undefined;
    const draftWildShapeEffectiveLevel = Math.max(
      1,
      Math.min(
        20,
        draftDruidLevel + (draftDruidClass?.wildShapeLevelAdjustment ?? 0),
      ),
    );
    const draftWildShapeMaximum =
      draftDruidLevel > 0
        ? druidWildShapeUses(draftWildShapeEffectiveLevel)
        : 0;
    const draftOppositionSchoolIds = oppositionSchoolsFromOptions(
      draft.classId,
      draft.selectedOptions,
    );
    const draftBloodline = bloodlineFromOptions(
      draft.classId,
      draft.selectedOptions,
    );
    const draftBloodlineSpells =
      draftIsSpontaneous && draftCasting
        ? bloodlineBonusSpells(
            spells,
            draftBloodline,
            draftPrimaryLevel,
            draftClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[draftClass.id] <=
              draftCasting.maximumSpellLevel,
          )
        : [];
    const draftPatronSpells =
      draftClass.id === "witch" && draftCasting
        ? witchPatronSpells(
            spells,
            witchPatronFromOptions(draft.classId, draft.selectedOptions),
            draftPrimaryLevel,
            draftClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[draftClass.id] <=
              draftCasting.maximumSpellLevel,
          )
        : [];
    const draftOptionSpellChoices = Object.values(
      draft.selectedOptions,
    ).flatMap((optionId) => {
      const option = optionGroups
        .flatMap((group) => group.options)
        .find((candidate) => candidate.id === optionId);
      return option?.spellId ? [option] : [];
    });
    const draftOptionSpells = draftOptionSpellChoices
      .filter((option) => option.classIds.includes(draftClass.id))
      .flatMap((option) => {
        const spell = spells.find(
          (candidate) => candidate.id === option.spellId,
        );
        const spellLevel =
          option.spellLevel ?? spell?.levelByClass[draftClass.id];
        return spell &&
          spellLevel !== undefined &&
          spellLevel <= (draftCasting?.maximumSpellLevel ?? 0)
          ? [
              {
                ...spell,
                levelByClass: {
                  ...spell.levelByClass,
                  [draftClass.id]: spellLevel,
                },
              },
            ]
          : [];
      });
    const draftGrantedSpells = [
      ...draftBloodlineSpells,
      ...draftPatronSpells,
      ...draftOptionSpells,
      ...spellsFromAdditions(spells, draftClass.bonusSpellAdditions, draftClass.id, draftCasting?.maximumSpellLevel ?? 0),
    ];
    const draftSpells = mergeSpellLists(draftBaseSpells, draftGrantedSpells);
    const draftBloodlineSpellIds = draftGrantedSpells.map((spell) => spell.id);
    const draftPrimarySelections =
      draft.preparedSpellsByClass[draft.classId] ?? draft.preparedSpells;
    const normalizedDraftSpells = draftIsSpontaneous
      ? normalizeKnownSpells(
          draftPrimarySelections,
          draftSpells,
          draftClass.spellListClassId ?? draftClass.id,
          draftSpontaneousCasting?.known ?? [],
          draftBloodlineSpellIds,
        )
      : normalizePreparedSpellsWithOpposition(
          draftPrimarySelections,
          draftSpells,
          draftClass.spellListClassId ?? draftClass.id,
          draftPreparedCasting?.prepared ?? [],
          draftOppositionSchoolIds,
          [],
          null,
          requiredPreparedSchool(draftClass),
        );
    const draftSecondaryAbility =
      draftSecondaryClass?.spellcasting &&
      abilityNames.includes(
        draftSecondaryClass.spellcasting.ability as keyof typeof draftAbilities,
      )
        ? (draftSecondaryClass.spellcasting
            .ability as keyof typeof draftAbilities)
        : null;
    const draftSecondaryAbilityScore = draftSecondaryAbility
      ? draftAbilities[draftSecondaryAbility]
      : 10;
    const draftSecondaryIsSpontaneous =
      draftSecondaryClass?.spellcasting?.castingType === "spontaneous";
    const draftSecondaryPrepared =
      draftSecondaryClass?.spellcasting && !draftSecondaryIsSpontaneous
        ? spellcastingProgression(
            draftSecondaryClass,
            draftSecondarySpellcastingLevel,
            { abilityScore: draftSecondaryAbilityScore },
          )
        : null;
    const draftSecondarySpontaneous =
      draftSecondaryClass && draftSecondaryIsSpontaneous
        ? spontaneousSpellcastingProgression(
            draftSecondaryClass,
            draftSecondarySpellcastingLevel,
            { abilityScore: draftSecondaryAbilityScore },
          )
        : null;
    const draftSecondaryCasting =
      draftSecondarySpontaneous ?? draftSecondaryPrepared;
    const draftSecondaryBaseSpells =
      draftSecondaryClass && draftSecondaryCasting
        ? spellsAvailableToClass(
            spells,
            draftSecondaryClass.spellListClassId ?? draftSecondaryClass.id,
            draftSecondaryCasting.maximumSpellLevel,
            draftSecondaryClass.spellListAdditions,
          )
        : [];
    const draftSecondaryBloodline = draftSecondaryClass
      ? bloodlineFromOptions(draftSecondaryClass.id, draft.selectedOptions)
      : undefined;
    const draftSecondaryMystery = draftSecondaryClass
      ? mysteryFromOptions(draftSecondaryClass.id, draft.selectedOptions)
      : undefined;
    const draftSecondaryGranted =
      draftSecondaryClass?.id === "sorcerer" && draftSecondaryCasting
        ? bloodlineBonusSpells(
            spells,
            draftSecondaryBloodline,
            draftSecondaryLevel?.level ?? 1,
            draftSecondaryClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[draftSecondaryClass.id] <=
              draftSecondaryCasting.maximumSpellLevel,
          )
        : draftSecondaryClass?.id === "oracle" && draftSecondaryCasting
          ? mysteryBonusSpells(
            spells,
              draftSecondaryMystery,
              draftSecondaryLevel?.level ?? 1,
              draftSecondaryClass.id,
            ).filter(
              (spell) =>
                spell.levelByClass[draftSecondaryClass.id] <=
                draftSecondaryCasting.maximumSpellLevel,
            )
          : [];
    const draftSecondaryPatronSpells =
      draftSecondaryClass?.id === "witch" && draftSecondaryCasting
        ? witchPatronSpells(
            spells,
            witchPatronFromOptions(
              draftSecondaryClass.id,
              draft.selectedOptions,
            ),
            draftSecondaryLevel?.level ?? 1,
            draftSecondaryClass.id,
          ).filter(
            (spell) =>
              spell.levelByClass[draftSecondaryClass.id] <=
              draftSecondaryCasting.maximumSpellLevel,
          )
        : [];
    const draftSecondaryOptionSpells = !draftSecondaryClass
      ? []
      : draftOptionSpellChoices
          .filter((option) => option.classIds.includes(draftSecondaryClass.id))
          .flatMap((option) => {
            const spell = spells.find(
              (candidate) => candidate.id === option.spellId,
            );
            const spellLevel =
              option.spellLevel ?? spell?.levelByClass[draftSecondaryClass.id];
            return spell &&
              spellLevel !== undefined &&
              spellLevel <= (draftSecondaryCasting?.maximumSpellLevel ?? 0)
              ? [
                  {
                    ...spell,
                    levelByClass: {
                      ...spell.levelByClass,
                      [draftSecondaryClass.id]: spellLevel,
                    },
                  },
                ]
              : [];
          });
    const draftAllSecondaryGranted = [
      ...draftSecondaryGranted,
      ...draftSecondaryPatronSpells,
      ...draftSecondaryOptionSpells,
      ...spellsFromAdditions(spells, draftSecondaryClass?.bonusSpellAdditions, draftSecondaryClass?.id ?? "", draftSecondaryCasting?.maximumSpellLevel ?? 0),
    ];
    const draftSecondarySpells = mergeSpellLists(
      draftSecondaryBaseSpells,
      draftAllSecondaryGranted,
    );
    const draftSecondarySelections = draftSecondaryClass
      ? (draft.preparedSpellsByClass[draftSecondaryClass.id] ?? [])
      : [];
    const normalizedDraftSecondarySpells = !draftSecondaryClass
      ? []
      : draftSecondaryIsSpontaneous
        ? normalizeKnownSpells(
            draftSecondarySelections,
            draftSecondarySpells,
            draftSecondaryClass.id,
            draftSecondarySpontaneous?.known ?? [],
            draftAllSecondaryGranted.map((spell) => spell.id),
          )
        : normalizePreparedSpellsWithOpposition(
            draftSecondarySelections,
            draftSecondarySpells,
            draftSecondaryClass.id,
            draftSecondaryPrepared?.prepared ?? [],
            oppositionSchoolsFromOptions(
              draftSecondaryClass.id,
              draft.selectedOptions,
            ),
            [],
            null,
            requiredPreparedSchool(draftSecondaryClass),
          );
    const draftTraitIds = normalizeSelectedTraits(
      draft.selectedTraitIds,
      traits,
    );
    const draftSecondaryReservoir =
      draftSecondaryClass?.id === "arcanist"
        ? arcaneReservoir(draftSecondaryLevel?.level ?? 1)
        : null;
    const draftArcanistLevel = draft.classLevels.find(
      (entry) => entry.classId === "arcanist",
    )?.level;
    const draftAnyReservoir = draftArcanistLevel
      ? arcaneReservoir(draftArcanistLevel)
      : null;
    setClassResourceUsesByClass(
      normalizeClassResourcesByClass(
        draft.classResourceUsesByClass,
        draft.classLevels,
        {
          constitution: Math.floor((draftAbilities.constitution - 10) / 2),
          intelligence: Math.floor((draftAbilities.intelligence - 10) / 2),
          charisma: Math.floor((draftAbilities.charisma - 10) / 2),
        },
        Object.fromEntries(draft.classLevels.map(({ classId }) => [classId, draftArchetypes(classId)])),
        Object.fromEntries(draft.classLevels.map(({ classId, level: classLevel }) => [classId, { selectedOptionIds: Object.values(draft.selectedOptions), casterLevel: draftEffectiveSpellcastingLevels[classId] ?? classLevel }])),
      ),
    );
    setCompanions(draft.companions ?? {});
    setEidolonSize(draft.eidolon?.size ?? "Medium");
    setEidolonEvolutionIds(draft.eidolon?.evolutionIds ?? []);
    setSelectedAlternateRacialTraitIds(
      normalizeSelectedAlternateRacialTraits(
        draft.selectedAlternateRacialTraitIds,
        draftAncestry.alternateTraits ?? [],
      ),
    );
    setName(draft.name);
    setClassId(draft.classId);
    setAdditionalClassLevels(draft.classLevels.slice(1));
    setArchetypeId(
      draft.archetypeIdsByClass[draft.classId] ?? draft.archetypeId,
    );
    setAdditionalArchetypeIds(
      Object.fromEntries(
        Object.entries(draft.archetypeIdsByClass).filter(
          ([selectedClassId]) => selectedClassId !== draft.classId,
        ),
      ),
    );
    setArchetypeStacksByClass(draft.archetypeStacksByClass ?? {});
    setPrestigeSpellcastingTargets(draft.prestigeSpellcastingTargets);
    setAncestryId(draft.ancestryId);
    setLevel(draft.level);
    setHumanAbility(draft.humanAbility);
    setBaseAbilities(draft.baseAbilities);
    setPointBuyBudget(draft.pointBuyBudget);
    setAbilityBoosts(draft.abilityBoosts);
    setFavoredClassHitPoints(draft.favoredClassHitPoints);
    setFavoredClassSkillRanks(draft.favoredClassSkillRanks);
    setFavoredClassAlternateBonuses(draft.favoredClassAlternateBonuses);
    setSelectedFeatIds(draft.selectedFeatIds);
    setSelectedTraitIds(draftTraitIds);
    setSelectedTraitChoices(
      normalizeSelectedTraitChoices(
        draft.selectedTraitChoices,
        draftTraitIds,
        traits,
        { spells, classes, classId: draft.classId },
      ),
    );
    setSelectedFeatChoices(
      normalizeSelectedFeatChoices(
        draft.selectedFeatChoices,
        draft.selectedFeatIds,
        feats,
      ),
    );
    setSkillRanks(draft.skillRanks);
    setSelectedOptions(draft.selectedOptions);
    const draftHasSpellSpecialist = Object.values(draft.archetypeStacksByClass ?? {})
      .flat()
      .includes("arcanist-spell-specialist") || draft.archetypeId === "arcanist-spell-specialist";
    const loadedSpellSpecialistLevel = draft.classLevels.find((entry) => entry.classId === "arcanist")?.level ?? 0;
    setSignatureSpellHighestClassLevel(
      draftHasSpellSpecialist
        ? draft.signatureSpellHighestClassLevel ?? Math.max(1, loadedSpellSpecialistLevel)
        : null,
    );
    setSignatureSpellExchangeCredits(
      draftHasSpellSpecialist ? draft.signatureSpellExchangeCredits ?? 0 : 0,
    );
    setSelectedSpellIds(normalizedDraftSpells);
    setSecondarySelectedSpellIds(normalizedDraftSecondarySpells);
    setKnownPreparedSpellsByClass(draft.knownPreparedSpellsByClass ?? {});
    setExtraSelectedSpellsByClass(
      Object.fromEntries(
        draft.classLevels
          .slice(2)
          .map((entry) => [
            entry.classId,
            draft.preparedSpellsByClass[entry.classId] ?? [],
          ]),
      ),
    );
    setSpellSlotUses(
      normalizeSpellSlotUses(
        draft.spellSlotUsesByClass[draft.classId] ?? draft.spellSlotUses,
        draftCasting?.slots ?? [],
      ),
    );
    setSecondarySpellSlotUses(
      normalizeSpellSlotUses(
        draftSecondaryClass
          ? (draft.spellSlotUsesByClass[draftSecondaryClass.id] ?? {})
          : {},
        draftSecondaryCasting?.slots ?? [],
      ),
    );
    setExtraSpellSlotUsesByClass(
      Object.fromEntries(
        draft.classLevels
          .slice(2)
          .map((entry) => [
            entry.classId,
            Object.fromEntries(
              Object.entries(
                draft.spellSlotUsesByClass[entry.classId] ?? {},
              ).map(([spellLevel, uses]) => [Number(spellLevel), uses]),
            ),
          ]),
      ),
    );
    setReservoirPoints(
      draftAnyReservoir
        ? Math.min(
            draft.arcaneReservoir ?? draftAnyReservoir.dailyRefresh,
            draftAnyReservoir.maximum,
          )
        : 0,
    );
    setBardicPerformanceUsed(
      Math.min(draft.bardicPerformanceUsed, draftBardicPerformanceMaximum),
    );
    setWildShapeUsed(
      draftWildShapeMaximum === null
        ? 0
        : Math.min(draft.wildShapeUsed, draftWildShapeMaximum),
    );
    setCurrentHitPoints(draft.currentHitPoints);
    setTemporaryHitPoints(draft.temporaryHitPoints);
    setActiveEffects(draft.activeEffects);
    setInventory(draft.inventory);
    setCoins(draft.coins);
    setSaveNotice(successNotice);
    return draft;
  };
  const saveCharacter = (nameOverride = name) => {
    const id =
      characterLibrary.activeCharacterId ??
      globalThis.crypto?.randomUUID?.() ??
      `character-${Date.now()}`;
    const draft =
      nameOverride === characterDraft.name
        ? characterDraft
        : { ...characterDraft, name: nameOverride };
    const previous = characterLibrary.characters.find((item) => item.id === id);
    const versions =
      previous && JSON.stringify(previous.draft) !== JSON.stringify(draft)
        ? [
            ...(previous.versions ?? []),
            { savedAt: previous.updatedAt, draft: previous.draft },
          ].slice(-5)
        : (previous?.versions ?? []);
    const entry = { id, updatedAt: new Date().toISOString(), draft, versions };
    persistLibrary({
      version: 1,
      activeCharacterId: id,
      characters: [
        ...characterLibrary.characters.filter((item) => item.id !== id),
        entry,
      ],
    });
    localStorage.setItem(legacyCharacterKey, JSON.stringify(draft));
    localStorage.setItem(
      characterAutosaveKey,
      JSON.stringify({ updatedAt: entry.updatedAt, draft }),
    );
    lastPersistedDraft.current = JSON.stringify(draft);
    setAutosaveStatus("All changes saved locally");
    setRecoveryDraft(null);
    setName(nameOverride);
    setSaveNotice(
      `Saved ${nameOverride.trim() || "unnamed hero"} to your library`,
    );
  };
  const loadCharacter = () => {
    let latestLibrary = characterLibrary;
    try {
      const storedLibrary = localStorage.getItem(characterLibraryKey);
      if (storedLibrary)
        latestLibrary = normalizeCharacterLibrary(JSON.parse(storedLibrary));
    } catch {
      // Fall back to the last valid in-memory library.
    }
    const active = latestLibrary.characters.find(
      (entry) => entry.id === latestLibrary.activeCharacterId,
    );
    if (active) {
      if (latestLibrary !== characterLibrary) setCharacterLibrary(latestLibrary);
      applyCharacterDraft(active.draft, "Loaded saved character");
      return;
    }
    const saved = localStorage.getItem(legacyCharacterKey);
    if (!saved) {
      setSaveNotice("No saved character");
      return;
    }
    try {
      const draft = applyCharacterDraft(
        JSON.parse(saved),
        "Loaded saved character",
      );
      if (draft) {
        const id =
          globalThis.crypto?.randomUUID?.() ?? `character-${Date.now()}`;
        persistLibrary({
          version: 1,
          activeCharacterId: id,
          characters: [{ id, updatedAt: new Date().toISOString(), draft }],
        });
        localStorage.setItem(legacyCharacterKey, JSON.stringify(draft));
      }
    } catch {
      setSaveNotice("Saved character is invalid");
    }
  };
  const importCharacter = async (file: File) => {
    if (file.size > 1_000_000) {
      setSaveNotice("Character file is too large");
      return;
    }
    try {
      applyCharacterDraft(JSON.parse(await file.text()), "Imported character");
    } catch {
      setSaveNotice("Character file is invalid");
    }
  };
  const resetCharacter = () => {
    localStorage.removeItem(legacyCharacterKey);
    setName("");
    setClassId("arcanist");
    setAdditionalClassLevels([]);
    setArchetypeId("");
    setAdditionalArchetypeIds({});
    setArchetypeStacksByClass({});
    setPrestigeSpellcastingTargets({});
    setAncestryId("human");
    setLevel(1);
    setHumanAbility("intelligence");
    setBaseAbilities(defaultAbilities);
    setPointBuyBudget(15);
    setAbilityBoosts([]);
    setFavoredClassHitPoints(0);
    setFavoredClassSkillRanks(0);
    setFavoredClassAlternateBonuses({});
    setSelectedFeatIds([]);
    setSelectedTraitIds([]);
    setSelectedTraitChoices({});
    setSelectedFeatChoices({});
    setSkillRanks({});
    setSelectedOptions({});
    setSignatureSpellHighestClassLevel(null);
    setSignatureSpellExchangeCredits(0);
    setSelectedSpellIds([]);
    setSecondarySelectedSpellIds([]);
    setExtraSelectedSpellsByClass({});
    setKnownPreparedSpellsByClass({});
    setSpellSlotUses({});
    setSecondarySpellSlotUses({});
    setExtraSpellSlotUsesByClass({});
    setActiveSpellClassId("");
    setReservoirPoints(3);
    setBardicPerformanceUsed(0);
    setWildShapeUsed(0);
    setClassResourceUsesByClass({});
    setCompanions({});
    setEidolonSize("Medium");
    setEidolonEvolutionIds([]);
    setCurrentHitPoints(null);
    setTemporaryHitPoints(0);
    setActiveEffects([]);
    setInventory([]);
    setCoins({ cp: 0, sp: 0, gp: 0, pp: 0 });
    setSaveNotice("Character reset");
  };
  const newCharacter = () => {
    resetCharacter();
    persistLibrary({ ...characterLibrary, activeCharacterId: null });
    setSaveNotice("New character started; your library is unchanged");
  };
  const openLibraryCharacter = (
    entry: CharacterLibraryV1["characters"][number],
  ) => {
    const draft = applyCharacterDraft(
      entry.draft,
      `Opened ${entry.draft.name.trim() || "unnamed hero"}`,
    );
    if (draft) {
      persistLibrary({ ...characterLibrary, activeCharacterId: entry.id });
      localStorage.setItem(legacyCharacterKey, JSON.stringify(draft));
    }
  };
  const restoreCharacterVersion = (
    entry: CharacterLibraryV1["characters"][number],
    version: CharacterVersion,
  ) => {
    const draft = applyCharacterDraft(
      version.draft,
      `Restored version from ${new Date(version.savedAt).toLocaleString()}`,
    );
    if (draft) {
      persistLibrary({ ...characterLibrary, activeCharacterId: entry.id });
      lastPersistedDraft.current = JSON.stringify(draft);
      setAutosaveStatus("Restored version; save to keep it");
    }
  };
  const recoverAutosave = () => {
    if (!recoveryDraft) return;
    const draft = applyCharacterDraft(
      recoveryDraft.draft,
      `Recovered autosave from ${new Date(recoveryDraft.updatedAt).toLocaleString()}`,
    );
    if (draft) {
      lastPersistedDraft.current = JSON.stringify(draft);
      setAutosaveStatus("Recovered autosave");
      setRecoveryDraft(null);
    }
  };
  const dismissRecovery = () => {
    localStorage.removeItem(characterAutosaveKey);
    setRecoveryDraft(null);
  };
  const deleteLibraryCharacter = (id: string) => {
    const characters = characterLibrary.characters.filter(
      (entry) => entry.id !== id,
    );
    const activeCharacterId =
      characterLibrary.activeCharacterId === id
        ? null
        : characterLibrary.activeCharacterId;
    persistLibrary({ version: 1, activeCharacterId, characters });
    if (!activeCharacterId) localStorage.removeItem(legacyCharacterKey);
    setSaveNotice("Character deleted from your library");
  };
  const exportCharacter = () => {
    const draft = { ...characterDraft, exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      name
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase() || "pf1e-character"
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveNotice("Character exported");
  };
  const printCharacter = () => window.print();

  const reviewProgressionSection = (tab: CharacterTabId) => {
    if (tab === "spells" && spellcastingClassIds.length === 0) return;
    setActiveTab(tab);
    setSidebarOpen(false);
    globalThis.setTimeout(
      () => document.getElementById(`character-tab-${tab}`)?.focus(),
      0,
    );
  };

  return (
    <main id="character-builder-main" tabIndex={-1}>
      <CharacterWorkspace
        sidebarOpen={sidebarOpen}
        onSidebarOpen={() => setSidebarOpen(true)}
        onSidebarClose={() => setSidebarOpen(false)}
        sidebar={
          <>
            <CharacterDetails
              name={name}
              classId={classId}
              additionalClassLevels={additionalClassLevels}
              additionalArchetypeIds={additionalArchetypeIds}
              archetypeStacksByClass={archetypeStacksByClass}
              prestigeSpellcastingTargets={prestigeSpellcastingTargets}
              archetypeId={archetypeId}
              ancestryId={ancestryId}
              level={level}
              classes={classes}
              archetypes={archetypes}
              ancestries={ancestries}
              saveNotice={saveNotice}
              autosaveStatus={autosaveStatus}
              recoveryAvailable={Boolean(recoveryDraft)}
              onRecover={recoverAutosave}
              onDismissRecovery={dismissRecovery}
              onNameChange={setName}
              onClassChange={(next) => {
                setClassId(next);
                setArchetypeId("");
                setArchetypeStacksByClass((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(
                      ([selectedClassId]) => selectedClassId !== classId,
                    ),
                  ),
                );
              }}
              onAdditionalClassLevelsChange={(next) => {
                setAdditionalClassLevels(next);
                const validIds = new Set(next.map((entry) => entry.classId));
                setAdditionalArchetypeIds((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(([selectedClassId]) =>
                      validIds.has(selectedClassId),
                    ),
                  ),
                );
                setArchetypeStacksByClass((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(
                      ([selectedClassId]) =>
                        selectedClassId === classId ||
                        validIds.has(selectedClassId),
                    ),
                  ),
                );
                setPrestigeSpellcastingTargets((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(([prestigeClassId]) =>
                      validIds.has(prestigeClassId),
                    ),
                  ),
                );
              }}
              onAdditionalArchetypeChange={(selectedClassId, selectedId) =>
                setAdditionalArchetypeIds((current) =>
                  selectedId
                    ? { ...current, [selectedClassId]: selectedId }
                    : Object.fromEntries(
                        Object.entries(current).filter(
                          ([key]) => key !== selectedClassId,
                        ),
                      ),
                )
              }
              onArchetypeStackChange={(selectedClassId, ids) => {
                setArchetypeStacksByClass((current) =>
                  ids.length
                    ? { ...current, [selectedClassId]: ids }
                    : Object.fromEntries(
                        Object.entries(current).filter(
                          ([key]) => key !== selectedClassId,
                        ),
                      ),
                );
                if (selectedClassId !== classId)
                  setAdditionalArchetypeIds((current) =>
                    ids[0]
                      ? { ...current, [selectedClassId]: ids[0] }
                      : Object.fromEntries(
                          Object.entries(current).filter(
                            ([key]) => key !== selectedClassId,
                          ),
                        ),
                  );
              }}
              onPrestigeSpellcastingTargetChange={(
                prestigeClassId,
                targetClassId,
                targetIndex = 0,
              ) =>
                setPrestigeSpellcastingTargets((current) => {
                  const targets = [...(current[prestigeClassId] ?? [])];
                  targets[targetIndex] = targetClassId;
                  return targets.some(Boolean)
                    ? { ...current, [prestigeClassId]: targets }
                    : Object.fromEntries(
                        Object.entries(current).filter(
                          ([key]) => key !== prestigeClassId,
                        ),
                      );
                })
              }
              onArchetypeChange={setArchetypeId}
              onAncestryChange={(next) => {
                setAncestryId(next);
                setSelectedAlternateRacialTraitIds([]);
              }}
              onLevelChange={(next) => {
                setAdditionalClassLevels((current) =>
                  normalizeAdditionalClassLevels(current, classId, next),
                );
                setLevel(next);
                setShowLevelUp(false);
              }}
              onReviewLevelUp={() => {
                setLevelUpClassId(characterClass.id);
                setShowLevelUp(true);
                setSidebarOpen(false);
              }}
              onSave={saveCharacter}
              onLoad={loadCharacter}
              onImport={importCharacter}
              onExport={exportCharacter}
              onPrint={printCharacter}
              onReset={resetCharacter}
            />
            <LevelProgression
              currentLevel={level}
              selectedLevel={selectedProgressionLevel}
              features={progression.features}
              selectedOptions={selectedOptions}
              suppressFeatureDetails={activeTab === "features"}
              onSelectLevel={setSelectedProgressionLevel}
              onReviewSection={reviewProgressionSection}
            />
          </>
        }
      >
        <header className="workspace-header">
          <div>
            <p className="eyebrow">PATHFINDER FIRST EDITION</p>
            <h1>{name || "Character Builder"}</h1>
            <p>
              {ancestry.name} ·{" "}
              {additionalClassLevels.length > 0
                ? classLevels
                    .map(
                      (entry) =>
                        `${classes.find((item) => item.id === entry.classId)?.name ?? entry.classId} ${entry.level}`,
                    )
                    .join(" / ")
                : `${characterClass.name} ${level}`}
            </p>
          </div>
          <div className="workspace-vitals" aria-label="Character at a glance">
            <span>
              <small>Level</small>
              <strong>{level}</strong>
            </span>
            <span>
              <small>Hit points</small>
              <strong>
                {currentHitPoints ?? combat.averageHitPoints}/
                {combat.averageHitPoints}
              </strong>
            </span>
            <span>
              <small>Armor class</small>
              <strong>{combat.armorClass.normal}</strong>
            </span>
            <span>
              <small>Base attack</small>
              <strong>
                {progression.baseAttackBonus >= 0 ? "+" : ""}
                {progression.baseAttackBonus}
              </strong>
            </span>
          </div>
        </header>
        {unresolvedChoiceCount > 0 && (
          <button
            type="button"
            className="unresolved-choice-banner"
            onClick={() => {
              setActiveTab("features");
              setSidebarOpen(false);
            }}
          >
            <strong>
              {unresolvedChoiceCount} choice
              {unresolvedChoiceCount === 1 ? "" : "s"} remaining
            </strong>
            <span>Open Features to finish this character level.</span>
          </button>
        )}
        {showLevelUp && level < 20 && (
          <LevelUpPanel
            currentLevel={level}
            classId={levelUpClassEntry.classId}
            classLevel={levelUpClassEntry.level}
            classChoices={levelUpClassChoices}
            gains={levelUpGains}
            onClassChange={setLevelUpClassId}
            onCancel={() => setShowLevelUp(false)}
            onConfirm={() => {
              if (levelUpClassEntry.classId !== characterClass.id)
                setAdditionalClassLevels((current) => {
                  const existing = current.find(
                    (entry) => entry.classId === levelUpClassEntry.classId,
                  );
                  return existing
                    ? current.map((entry) =>
                        entry.classId === levelUpClassEntry.classId
                          ? { ...entry, level: entry.level + 1 }
                          : entry,
                      )
                    : [
                        ...current,
                        { classId: levelUpClassEntry.classId, level: 1 },
                      ];
                });
              setLevel(level + 1);
              setShowLevelUp(false);
              setSaveNotice(
                levelUpClassEntry.classId === characterClass.id
                  ? `Advanced to level ${level + 1}. Review newly unlocked choices.`
                  : `Advanced ${levelUpClassChoices.find((choice) => choice.id === levelUpClassEntry.classId)?.name ?? levelUpClassEntry.classId} to level ${levelUpClassEntry.level + 1}. Review newly unlocked choices.`,
              );
            }}
          />
        )}
        <CharacterTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          showSpells={spellcastingClassIds.length > 0}
        />
        <section
          id="character-tab-panel"
          className="tab-panel"
          role="tabpanel"
          aria-labelledby={`character-tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === "overview" && (
            <section className="sheet-grid">
              <AbilityEditor
                abilityNames={abilityNames}
                ancestryName={ancestry.name}
                choiceAbility={humanAbility}
                choiceAmount={choiceAmount}
                baseAbilities={baseAbilities}
                abilities={abilities}
                modifiers={combat.abilityModifiers}
                pointBuyBudget={pointBuyBudget}
                pointBuySpent={pointBuy.spent}
                abilityBoosts={abilityBoosts}
                onChoiceAbilityChange={setHumanAbility}
                onAbilityChange={updateAbility}
                onPointBuyBudgetChange={setPointBuyBudget}
                onAbilityBoostChange={updateAbilityBoost}
              />
              <ProgressionSummary combat={combat} progression={progression} />
              <FavoredClassBonus
                ancestryId={ancestry.id}
                ancestryName={ancestry.name}
                classId={characterClass.id}
                className={characterClass.name}
                level={primaryClassLevel}
                hitPoints={favoredClassHitPoints}
                skillRanks={favoredClassSkillRanks}
                alternateBonuses={favoredClassAlternateBonuses}
                onChange={(hitPoints, skillRanks, alternateBonuses) => {
                  setFavoredClassHitPoints(hitPoints);
                  setFavoredClassSkillRanks(skillRanks);
                  setFavoredClassAlternateBonuses(alternateBonuses);
                }}
              />
              <AncestryTraits
                ancestry={ancestry}
                selectedIds={selectedAlternateRacialTraitIds}
                onChange={(ids) =>
                  setSelectedAlternateRacialTraitIds(
                    normalizeSelectedAlternateRacialTraits(
                      ids,
                      ancestry.alternateTraits ?? [],
                    ),
                  )
                }
              />
            </section>
          )}
          {activeTab === "actions" && (
            <div className="actions-workspace">
              <CombatPanel
                combat={combat}
                landSpeed={landSpeed}
                modifierSources={selectedFeatBonuses.sources}
                conditionalModifiers={[
                  ...(selectedTraitBonuses.conditionalModifiers ?? []),
                  ...selectedArchetypeConditionalModifiers,
                  ...selectedArchetypeSkillBonuses.conditionalModifiers,
                ]}
              />
              <ActivePlayPanel
                maximumHitPoints={combat.averageHitPoints}
                currentHitPoints={currentHitPoints ?? combat.averageHitPoints}
                temporaryHitPoints={temporaryHitPoints}
                attacks={combatAttacks}
                checks={[
                  { id: "initiative", name: "Initiative", modifier: combat.initiative },
                  { id: "fortitude", name: "Fortitude save", modifier: combat.saves.fortitude },
                  { id: "reflex", name: "Reflex save", modifier: combat.saves.reflex },
                  { id: "will", name: "Will save", modifier: combat.saves.will },
                  { id: "caster-level", name: "Caster level check", modifier: Math.max(0, ...Object.values(effectiveSpellcastingLevelMap)) + eldritchSurgeCasterLevelBonus },
                ]}
                skills={skillEntries.map(skill => ({ id: skill.name, name: skill.name, modifier: skill.total }))}
                effects={activeEffects}
                craftingOppositionSchools={craftingOppositionSchools}
                onCurrentHitPointsChange={setCurrentHitPoints}
                onTemporaryHitPointsChange={setTemporaryHitPoints}
                onEffectsChange={setActiveEffects}
              />
            </div>
          )}
          {activeTab === "storage" && (
            <div className="storage-workspace">
              <CharacterLibrary
                library={characterLibrary}
                classNames={Object.fromEntries(
                  classes.map((item) => [item.id, item.name]),
                )}
                ancestryNames={Object.fromEntries(
                  ancestries.map((item) => [item.id, item.name]),
                )}
                onOpen={openLibraryCharacter}
                onRestoreVersion={restoreCharacterVersion}
                onDelete={deleteLibraryCharacter}
                onNew={newCharacter}
              />
              <EquipmentPanel
                strength={abilities.strength}
                strengthModifier={combat.abilityModifiers.strength}
                dexterityModifier={combat.abilityModifiers.dexterity}
                baseAttackBonus={progression.baseAttackBonus}
                weaponBonuses={selectedFeatBonuses.weaponBonuses}
                minimumWeaponEnhancements={intrinsicWeaponEnhancements}
                inventory={inventory}
                coins={coins}
                onInventoryChange={setInventory}
                onCoinsChange={setCoins}
              />
            </div>
          )}
          {activeTab === "spells" &&
            (spellcastingClassIds.length > 0 ? (
              <div className="spell-workspace">
                {spellCatalogueLoading && (
                  <p className="catalogue-loading" role="status">
                    Loading full spell rules…
                  </p>
                )}
                {spellcastingClassIds.length > 1 && (
                  <label className="spell-class-selector">
                    Spellcasting class
                    <select
                      aria-label="Spellcasting class"
                      value={activeSpellClassId}
                      onChange={(event) =>
                        setActiveSpellClassId(event.target.value)
                      }
                    >
                      {spellcastingClassIds.map((castingClassId) => (
                        <option key={castingClassId} value={castingClassId}>
                          {classes.find((item) => item.id === castingClassId)
                            ?.name ?? castingClassId}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {activeSpellClassId === characterClass.id
                  ? primarySpellbook
                  : activeSpellClassId === secondaryCharacterClass?.id
                    ? secondarySpellbook
                    : extraSpellbook}
              </div>
            ) : (
              <p className="empty-tab">These classes do not cast spells.</p>
            ))}
          {activeTab === "skills" && (
            <SkillAllocation
              skills={skillEntries}
              allocatedRanks={allocatedSkillRanks}
              totalRanks={progression.skillRanks}
              maximumRanksPerSkill={level}
              onRankChange={updateSkill}
            />
          )}
          {activeTab === "feats" && (
            <>
              {featCatalogueLoading && (
                <p className="catalogue-loading" role="status">
                  Loading feat details…
                </p>
              )}
              <FeatChoices
                feats={displayFeats}
                choices={featChoices}
                selectedFeatIds={selectedFeatIds}
                selectedFeatChoices={selectedFeatChoices}
                repeatableFeatIds={repeatableFeatIds}
                onFeatChange={updateFeat}
                onFeatChoiceChange={updateFeatChoice}
              />
            </>
          )}
          {activeTab === "features" && (
            <div className="feature-workspace">
              {archetypeCatalogueLoading && (
                <p className="catalogue-loading" role="status">
                  Loading complete archetype rules…
                </p>
              )}
              <ClassFeatures
                level={level}
                className={
                  additionalClassLevels.length > 0
                    ? classLevels
                        .map(
                          (entry) =>
                            `${classes.find((item) => item.id === entry.classId)?.name ?? entry.classId} ${entry.level}`,
                        )
                        .join(" / ")
                    : characterClass.name
                }
                features={progression.features}
                dailyResources={classDailyResources}
                abilityModifiers={combat.abilityModifiers}
                saveModifiers={combat.saves}
                baseAttackBonus={progression.baseAttackBonus}
                classLevels={classLevelMap}
                casterLevels={effectiveSpellcastingLevelMap}
                selectedOptionIds={Object.values(selectedOptions)}
                selectedOptions={selectedOptions}
                activeEffects={activeEffects}
                onAddEffect={addActiveEffect}
                onRemoveEffectByName={(name) => setActiveEffects((current) => current.filter((effect) => effect.name !== name))}
                onTemporaryHitPointsChange={setTemporaryHitPoints}
              />
              {progression.features.some((feature) => feature.id === "arcanist-twilight-sage-consume-life-su-1") && reservoir && <TwilightSageControls
                characterLevel={level}
                arcanistLevel={classLevelMap.arcanist ?? 0}
                charismaModifier={combat.abilityModifiers.charisma}
                reservoirPoints={reservoirPoints}
                reservoirMaximum={reservoir.maximum}
                onReservoirPointsChange={setReservoirPoints}
                barrierUses={classDailyResources.find((resource) => resource.id === "twilightBarrierActivations")}
                transferResource={classDailyResources.find((resource) => resource.id === "twilightTransfer")}
                activeEffects={activeEffects}
                temporaryHitPoints={temporaryHitPoints}
                onTemporaryHitPointsChange={setTemporaryHitPoints}
                onAddEffect={addActiveEffect}
                onRemoveEffectByName={(name) => setActiveEffects((current) => current.filter((effect) => effect.name !== name))}
              />}
              <FavoredClassBenefits allocations={favoredClassAlternateBonuses} />
              <ArchetypeAutomationStatus archetypes={selectedArchetypes} feats={feats} />
              {classOptionChoices.length > 0 && (
                <ClassOptions
                  choices={classOptionChoices.map((choice) => ({ ...choice, options: choice.options.filter((option) => !allSelectedArchetypes.some((archetype) => archetype.prohibitedOptionIds?.includes(option.id))) }))}
                  selectedOptions={selectedOptions}
                  classLevel={primaryClassLevel + activeEffects.filter((effect) => effect.target === "exploitEffectiveLevel").reduce((total, effect) => total + effect.bonus, 0)}
                  charismaModifier={combat.abilityModifiers.charisma}
                  abilityModifiers={combat.abilityModifiers}
                  dailyResources={classDailyResources}
                  archetypeReplacesText={
                    selectedArchetypeReplacesText || undefined
                  }
                  choiceChangeRules={signatureSpellChoiceChangeRules}
                  onOptionChange={updateClassOption}
                  onAddEffect={addActiveEffect}
                />
              )}
              {summonerClassLevel > 0 && (
                <EidolonBuilder
                  level={summonerClassLevel}
                  baseFormId={eidolonBaseFormId}
                  size={eidolonSize}
                  evolutionIds={eidolonEvolutionIds}
                  evolutions={eidolonEvolutions}
                  bonusEvolutionPoints={bonusEidolonEvolutionPoints}
                  onSizeChange={setEidolonSize}
                  onEvolutionIdsChange={setEidolonEvolutionIds}
                />
              )}
              <CompanionManager
                companions={companionDescriptors}
                states={companions}
                masterHitPoints={combat.averageHitPoints}
                onChange={setCompanions}
              />
            </div>
          )}
          {activeTab === "options" && (
            <TraitChoices
              traits={traits}
              spells={spells}
              classes={classes}
              classId={characterClass.id}
              selectedTraitIds={selectedTraitIds}
              selectedTraitChoices={selectedTraitChoices}
              onChange={updateTrait}
              onChoiceChange={updateTraitChoice}
            />
          )}
        </section>
      </CharacterWorkspace>
    </main>
  );
}
