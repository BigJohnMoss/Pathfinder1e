"use client";

import { useEffect, useMemo, useState } from "react";
import { ancestries, classes, feats, optionGroups, skills, spells } from "./character-catalogue";
import { AbilityEditor } from "./ability-editor";
import { CharacterDetails } from "./character-details";
import { ClassFeatures } from "./class-features";
import { Spellbook } from "./spellbook";
import { SkillAllocation } from "./skill-allocation";
import { FeatChoices } from "./feat-choices";
import { ClassOptions } from "./class-options";
import { CombatPanel, ProgressionSummary } from "./character-summary";
import { CharacterTabs, StoragePlaceholder, type CharacterTabId } from "./character-tabs";
import { abilityNames, arcaneReservoir, availableOptions, characterCombatStats, classProgression, featPrerequisiteResults, normalizeCharacterDraft, normalizePreparedSpells, normalizeSelectedFeats, normalizeSpellSlotUses, prerequisitesMet, skillRankBudget, skillTotal, spellSaveDC, spellcastingProgression, spellsAvailableToClass } from "../../../packages/engine/src/index.js";

const labels = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const defaultAbilities = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export default function Home() {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("arcanist");
  const [ancestryId, setAncestryId] = useState("human");
  const [level, setLevel] = useState(1);
  const [humanAbility, setHumanAbility] = useState<keyof typeof defaultAbilities>("intelligence");
  const [baseAbilities, setBaseAbilities] = useState(defaultAbilities);
  const [selectedFeatIds, setSelectedFeatIds] = useState<string[]>([]);
  const [skillRanks, setSkillRanks] = useState<Record<string, number>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [preparedSpells, setPreparedSpells] = useState<string[]>([]);
  const [spellSlotUses, setSpellSlotUses] = useState<Record<number, number>>({});
  const [reservoirPoints, setReservoirPoints] = useState(3);
  const [activeTab, setActiveTab] = useState<CharacterTabId>("overview");
  const [saveNotice, setSaveNotice] = useState("");
  const characterClass = classes.find((item) => item.id === classId) ?? classes[0];
  const ancestry = ancestries.find((item) => item.id === ancestryId) ?? ancestries[0];
  const fixedModifiers = (ancestry.abilityModifiers as { fixed?: Partial<typeof defaultAbilities> }).fixed ?? {};
  const choiceAmount = (ancestry.abilityModifiers as { choice?: { amount: number } }).choice?.amount ?? 0;
  const abilities = useMemo(() => Object.fromEntries(Object.keys(baseAbilities).map((ability) => [ability, baseAbilities[ability as keyof typeof baseAbilities] + (fixedModifiers[ability as keyof typeof baseAbilities] ?? 0) + (choiceAmount && ability === humanAbility ? choiceAmount : 0)])) as typeof baseAbilities, [baseAbilities, choiceAmount, fixedModifiers, humanAbility]);
  const ancestryBonusFeats = ancestry.traits.some((trait) => trait.id === "human-bonus-feat") ? 1 : 0;
  const progression = useMemo(() => classProgression(characterClass, level, {
    intelligenceScore: abilities.intelligence,
    racialSkillBonusPerLevel: ancestry.traits.some((trait) => trait.id === "skilled") ? 1 : 0,
    bonusFeats: ancestryBonusFeats
  }), [abilities.intelligence, ancestry, ancestryBonusFeats, characterClass, level]);
  const combat = useMemo(() => characterCombatStats(characterClass, level, abilities), [abilities, characterClass, level]);
  const featSlots = useMemo(() => Array.from({ length: progression.featSlots }, (_, index) => ({ index, name: index < ancestryBonusFeats ? `${ancestry.name} bonus feat` : `Feat ${index - ancestryBonusFeats + 1}` })), [ancestry.name, ancestryBonusFeats, progression.featSlots]);
  const featChoices = featSlots.map((slot) => { const selected = feats.find((feat) => feat.id === selectedFeatIds[slot.index]); const otherFeatIds = selectedFeatIds.filter((_, index) => index !== slot.index); const context = { abilities, baseAttackBonus: progression.baseAttackBonus, classLevel: level, selectedIds: otherFeatIds }; const checks = selected ? featPrerequisiteResults(selected, context) : []; return { ...slot, selected, checks, eligibleFeatIds: feats.filter((feat) => prerequisitesMet(feat.prerequisites, context)).map((feat) => feat.id) }; });
  useEffect(() => setSelectedFeatIds((current) => { const next = normalizeSelectedFeats(current, feats, { abilities, baseAttackBonus: progression.baseAttackBonus, classLevel: level }, featSlots.length); return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next; }), [abilities, featSlots.length, level, progression.baseAttackBonus]);
  const updateAbility = (ability: keyof typeof defaultAbilities, value: number) => setBaseAbilities((current) => ({ ...current, [ability]: Math.max(1, Math.min(40, value || 1)) }));
  const updateFeat = (index: number, featId: string) => setSelectedFeatIds((current) => { const next = [...current]; next[index] = featId; return next; });
  const skillBudget = skillRankBudget(progression.skillRanks, skillRanks);
  const allocatedSkillRanks = skillBudget.allocated;
  const updateSkill = (name: string, ranks: number) => setSkillRanks((current) => { const otherRanks = Object.fromEntries(Object.entries(current).filter(([skill]) => skill !== name)); const available = skillRankBudget(progression.skillRanks, otherRanks).remaining; return { ...current, [name]: Math.max(0, Math.min(available, ranks || 0)) }; });
  const skillEntries = skills.map((skill) => { const ranks = skillRanks[skill.name] ?? 0; const result = skillTotal(characterClass, skill, abilities[skill.ability], ranks); return { ...skill, ranks, ...result }; });
  const choiceFeatures = progression.features.filter((feature) => feature.choiceRequired && feature.optionGroupId);
  const classOptionChoices = choiceFeatures.map((feature) => { const group = optionGroups.find((item) => item.id === feature.optionGroupId); const selectedIds = [...selectedFeatIds, ...Object.values(selectedOptions)]; const options = group ? availableOptions(group, characterClass.id, level, selectedIds, { abilities, baseAttackBonus: progression.baseAttackBonus }) : []; return { id: feature.id, name: feature.name, level: feature.level, options, selected: options.find((option) => option.id === selectedOptions[feature.id]) }; });
  const updateClassOption = (featureId: string, optionId: string) => setSelectedOptions((current) => ({ ...current, [featureId]: optionId }));
  const castingAbility = "spellcasting" in characterClass && abilityNames.includes(characterClass.spellcasting?.ability as keyof typeof abilities) ? characterClass.spellcasting?.ability as keyof typeof abilities : null;
  const castingAbilityScore = castingAbility ? abilities[castingAbility] : 10;
  const spellcasting = useMemo(() => spellcastingProgression(characterClass, level, { abilityScore: castingAbilityScore }), [castingAbilityScore, characterClass, level]);
  const maximumSpellLevel = spellcasting?.maximumSpellLevel ?? 0;
  const availableSpells = useMemo(() => spellcasting ? spellsAvailableToClass(spells, characterClass.id, maximumSpellLevel) : [], [characterClass.id, maximumSpellLevel, spellcasting]);
  const spellDcs = spellcasting ? Object.fromEntries(spellcasting.slots.map((slot) => [slot.level, spellSaveDC(castingAbilityScore, slot.level)])) : {};
  const preparedLimits = useMemo(() => spellcasting?.prepared ?? [], [spellcasting]);
  const reservoir = classId === "arcanist" ? arcaneReservoir(level) : null;
  const updateSpellSlotUses = (uses: Record<number, number>) => setSpellSlotUses(normalizeSpellSlotUses(uses, spellcasting?.slots ?? []));
  const updateReservoir = (points: number) => setReservoirPoints(Math.max(0, Math.min(reservoir?.maximum ?? 0, points)));
  const refreshDay = () => { setSpellSlotUses({}); if (reservoir) setReservoirPoints(reservoir.dailyRefresh); };
  const updatePreparedSpells = (spellIds: string[]) => setPreparedSpells(normalizePreparedSpells(spellIds, availableSpells, characterClass.id, preparedLimits));
  useEffect(() => setPreparedSpells((current) => { const next = normalizePreparedSpells(current, availableSpells, characterClass.id, preparedLimits); return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next; }), [availableSpells, characterClass.id, preparedLimits]);
  useEffect(() => setSpellSlotUses((current) => normalizeSpellSlotUses(current, spellcasting?.slots ?? [])), [spellcasting]);
  useEffect(() => { if (reservoir) setReservoirPoints((current) => Math.min(current, reservoir.maximum)); }, [reservoir?.maximum]);
  const saveCharacter = () => { localStorage.setItem("pf1e-character-draft", JSON.stringify({ name, classId, ancestryId, level, humanAbility, baseAbilities, selectedFeatIds, skillRanks, selectedOptions, preparedSpells, spellSlotUses, arcaneReservoir: reservoirPoints })); setSaveNotice("Saved locally"); };
  const loadCharacter = () => { const saved = localStorage.getItem("pf1e-character-draft"); if (!saved) { setSaveNotice("No saved character"); return; } try { const draft = normalizeCharacterDraft(JSON.parse(saved), { classIds: classes.map((item) => item.id), ancestryIds: ancestries.map((item) => item.id) }); if (!draft) { setSaveNotice("Saved character is invalid"); return; } const draftClass = classes.find((item) => item.id === draft.classId) ?? classes[0]; const draftAncestry = ancestries.find((item) => item.id === draft.ancestryId) ?? ancestries[0]; const draftFixedModifiers = (draftAncestry.abilityModifiers as { fixed?: Partial<typeof defaultAbilities> }).fixed ?? {}; const draftChoiceAmount = (draftAncestry.abilityModifiers as { choice?: { amount: number } }).choice?.amount ?? 0; const draftAbilities = Object.fromEntries(Object.keys(draft.baseAbilities).map((ability) => [ability, draft.baseAbilities[ability as keyof typeof defaultAbilities] + (draftFixedModifiers[ability as keyof typeof defaultAbilities] ?? 0) + (draftChoiceAmount && ability === draft.humanAbility ? draftChoiceAmount : 0)])) as typeof defaultAbilities; const draftCastingAbility = "spellcasting" in draftClass && abilityNames.includes(draftClass.spellcasting?.ability as keyof typeof draftAbilities) ? draftClass.spellcasting?.ability as keyof typeof draftAbilities : null; const draftSpellcasting = spellcastingProgression(draftClass, draft.level, { abilityScore: draftCastingAbility ? draftAbilities[draftCastingAbility] : 10 }); const draftSpells = draftSpellcasting ? spellsAvailableToClass(spells, draftClass.id, draftSpellcasting.maximumSpellLevel) : []; const draftReservoir = draft.classId === "arcanist" ? arcaneReservoir(draft.level) : null; setName(draft.name); setClassId(draft.classId); setAncestryId(draft.ancestryId); setLevel(draft.level); setHumanAbility(draft.humanAbility); setBaseAbilities(draft.baseAbilities); setSelectedFeatIds(draft.selectedFeatIds); setSkillRanks(draft.skillRanks); setSelectedOptions(draft.selectedOptions); setPreparedSpells(normalizePreparedSpells(draft.preparedSpells, draftSpells, draftClass.id, draftSpellcasting?.prepared ?? [])); setSpellSlotUses(normalizeSpellSlotUses(draft.spellSlotUses, draftSpellcasting?.slots ?? [])); setReservoirPoints(draftReservoir ? Math.min(draft.arcaneReservoir ?? draftReservoir.dailyRefresh, draftReservoir.maximum) : 0); setSaveNotice("Loaded saved character"); } catch { setSaveNotice("Saved character is invalid"); } };
  const resetCharacter = () => { localStorage.removeItem("pf1e-character-draft"); setName(""); setClassId("arcanist"); setAncestryId("human"); setLevel(1); setHumanAbility("intelligence"); setBaseAbilities(defaultAbilities); setSelectedFeatIds([]); setSkillRanks({}); setSelectedOptions({}); setPreparedSpells([]); setSpellSlotUses({}); setReservoirPoints(3); setSaveNotice("Character reset"); };
  const exportCharacter = () => { const draft = { version: 1, exportedAt: new Date().toISOString(), name, classId, ancestryId, level, humanAbility, baseAbilities, selectedFeatIds, skillRanks, selectedOptions, preparedSpells }; const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `${name.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "pf1e-character"}.json`; link.click(); URL.revokeObjectURL(url); setSaveNotice("Character exported"); };
  const printCharacter = () => window.print();

  return <main>
    <header><p className="eyebrow">PATHFINDER FIRST EDITION</p><h1>{name || "Character Builder"}</h1><p>Create a character foundation, then see the rules statistics it earns.</p></header>
    <CharacterDetails name={name} classId={classId} ancestryId={ancestryId} level={level} classes={classes} ancestries={ancestries} saveNotice={saveNotice} onNameChange={setName} onClassChange={setClassId} onAncestryChange={setAncestryId} onLevelChange={setLevel} onSave={saveCharacter} onLoad={loadCharacter} onExport={exportCharacter} onPrint={printCharacter} onReset={resetCharacter} />
    <CharacterTabs activeTab={activeTab} onChange={setActiveTab} />
    <section className="tab-panel" aria-live="polite">
      {activeTab === "overview" && <><section className="sheet-grid"><AbilityEditor abilityNames={abilityNames} ancestryName={ancestry.name} choiceAbility={humanAbility} choiceAmount={choiceAmount} baseAbilities={baseAbilities} abilities={abilities} modifiers={combat.abilityModifiers} onChoiceAbilityChange={setHumanAbility} onAbilityChange={updateAbility} /><ProgressionSummary combat={combat} progression={progression} /></section></>}
      {activeTab === "actions" && <CombatPanel combat={combat} />}
      {activeTab === "storage" && <StoragePlaceholder />}
      {activeTab === "spells" && (spellcasting ? <Spellbook spells={availableSpells} classId={characterClass.id} className={characterClass.name} castingAbilityName={castingAbility ? labels[castingAbility] : "casting ability"} slots={spellcasting.slots} preparedLimits={preparedLimits} spellDcs={spellDcs} maximumSpellLevel={maximumSpellLevel} preparedSpellIds={preparedSpells} onPreparedSpellIdsChange={updatePreparedSpells} slotUses={spellSlotUses} onSlotUsesChange={updateSpellSlotUses} reservoir={reservoir ? { current: reservoirPoints, ...reservoir } : null} onReservoirChange={updateReservoir} onRefreshDay={refreshDay} /> : <p className="empty-tab">This class does not cast spells.</p>)}
      {activeTab === "skills" && <SkillAllocation skills={skillEntries} allocatedRanks={allocatedSkillRanks} totalRanks={progression.skillRanks} onRankChange={updateSkill} />}
      {activeTab === "feats" && <FeatChoices feats={feats} choices={featChoices} selectedFeatIds={selectedFeatIds} onFeatChange={updateFeat} />}
      {activeTab === "features" && <ClassFeatures level={level} className={characterClass.name} features={progression.features} />}
      {activeTab === "options" && (classOptionChoices.length > 0 ? <ClassOptions choices={classOptionChoices} selectedOptions={selectedOptions} onOptionChange={updateClassOption} /> : <p className="empty-tab">No selectable class options have been earned yet.</p>)}
    </section>
  </main>;
}
