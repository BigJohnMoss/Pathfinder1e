import { useEffect, useMemo, useState } from "react";
import {
  preparedSpellSlotUsage,
  spellPreparationCost,
} from "../../../packages/engine/src/wizard-opposition-preparation.js";
import {
  extendedSpellDuration,
  isPersonalRangeSpell,
  spellHasDescriptor,
  spellHasSchool,
} from "../../../packages/engine/src/index.js";
import type { AbilityName, ActiveEffect, CharacterSpell } from "../../../packages/types/src/index.js";
import type { PreparedSpellAutomation } from "./archetype-spell-automation";
import { SpellDetails } from "./spell-details";

type Spell = CharacterSpell;
type Slot = { level: number; base: number; bonus: number; count: number };
type PreparedLimit = { level: number; count: number };
type SpellTraitBonuses = Record<
  string,
  { casterLevel: number; metamagicLevelAdjustment: number }
>;

const levelLabel = (level: number) =>
  level === 0
    ? "Cantrips"
    : `${level}${level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"}-level`;

export function Spellbook({
  spells,
  sourceBook,
  spellTraitBonuses = {},
  classId,
  className,
  casterLevel,
  castingAbilityName,
  slots,
  preparedLimits,
  spellDcs,
  maximumSpellLevel,
  preparedSpellIds,
  onPreparedSpellIdsChange,
  slotUses,
  onSlotUsesChange,
  reservoir,
  onReservoirChange,
  onRefreshDay,
  oppositionSchoolIds = [],
  oppositionSpellIds = [],
  restrictedBonus = null,
  onDemandSpellCosts = {},
  requiredPreparedSchool,
  spellAutomation,
  criticalStrikeResource,
  bondedObjectCastResource,
  abilityModifiers = {},
  spellMastery,
  onAddEffect,
  onRemoveEffectByName,
}: {
  spells: Spell[];
  sourceBook?: {
    label: string;
    catalogue: Spell[];
    knownSpellIds: string[];
    automaticSpellIds: string[];
    capacity: number;
    bonusCapacity?: number;
    onChange: (ids: string[]) => void;
  };
  spellTraitBonuses?: SpellTraitBonuses;
  classId: string;
  className: string;
  casterLevel?: number;
  castingAbilityName: string;
  slots: Slot[];
  preparedLimits: PreparedLimit[];
  spellDcs: Record<number, number>;
  maximumSpellLevel: number;
  preparedSpellIds: string[];
  onPreparedSpellIdsChange: (spellIds: string[]) => void;
  slotUses: Record<number, number>;
  onSlotUsesChange: (uses: Record<number, number>) => void;
  reservoir: { current: number; maximum: number; dailyRefresh: number } | null;
  onReservoirChange: (value: number) => void;
  onRefreshDay: () => void;
  oppositionSchoolIds?: string[];
  oppositionSpellIds?: string[];
  restrictedBonus?: { eligibleSpellIds: string[]; countPerLevel: number; label: string } | null;
  onDemandSpellCosts?: Record<string, { resourceId?: string; cost: number; label: string; consumesSpellSlot?: boolean; saveDcBonus?: number; concentrationBonus?: number; summonTracker?: { name: string; description: string; rounds: number; replaceExisting?: boolean; untilDismissed: boolean } }>;
  requiredPreparedSchool?: string;
  spellAutomation?: PreparedSpellAutomation;
  criticalStrikeResource?: { maximum: number | null; used: number; onUsedChange: (used: number) => void };
  bondedObjectCastResource?: { label: string; maximum: number | null; used: number; onUsedChange: (used: number) => void };
  abilityModifiers?: Partial<Record<AbilityName, number>>;
  spellMastery?: { limit: number; selectedIds: string[]; catalogue: Spell[]; onChange: (spellIds: string[]) => void };
  onAddEffect?: (effect: ActiveEffect) => void;
  onRemoveEffectByName?: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceLevel, setSourceLevel] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(250);
  const [levelFilter, setLevelFilter] = useState(String(maximumSpellLevel));
  const [shareTarget, setShareTarget] = useState("");
  const [shareResult, setShareResult] = useState("");
  const [fastHealingSlotLevel, setFastHealingSlotLevel] = useState(0);
  const [fastHealingResult, setFastHealingResult] = useState("");
  const [descriptorBoostResult, setDescriptorBoostResult] = useState("");
  const [masteryQuery, setMasteryQuery] = useState("");
  const [spellstrikeResult, setSpellstrikeResult] = useState("");
  const [bondedObjectCastResult, setBondedObjectCastResult] = useState("");
  useEffect(
    () => setLevelFilter(String(maximumSpellLevel)),
    [maximumSpellLevel],
  );

  const preparedUsage = useMemo(
    () =>
      preparedSpellSlotUsage(
        preparedSpellIds,
        spells,
        classId,
        oppositionSchoolIds,
        oppositionSpellIds,
      ),
    [
      classId,
      oppositionSchoolIds,
      oppositionSpellIds,
      preparedSpellIds,
      spells,
    ],
  );
  const preparedSelections = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of preparedSpellIds)
      counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()]
      .flatMap(([id, count]) => {
        const spell = spells.find((item) => item.id === id);
        return spell
          ? [{ spell, count, level: spell.levelByClass[classId] }]
          : [];
      })
      .sort(
        (left, right) =>
          left.level - right.level ||
          left.spell.name.localeCompare(right.spell.name),
      );
  }, [classId, preparedSpellIds, spells]);
  const preparedCount = (level: number) => preparedUsage[level] ?? 0;
  const restrictedEligibleIds = useMemo(
    () => new Set(restrictedBonus?.eligibleSpellIds ?? []),
    [restrictedBonus],
  );
  const restrictedIneligibleUsage = useMemo(
    () => preparedSpellIds.reduce<Record<number, number>>((usage, id) => {
      if (restrictedEligibleIds.has(id)) return usage;
      const spell = spells.find((candidate) => candidate.id === id);
      const level = spell?.levelByClass[classId];
      if (!spell || !Number.isInteger(level)) return usage;
      usage[level as number] = (usage[level as number] ?? 0) + spellPreparationCost(spell, oppositionSchoolIds, oppositionSpellIds);
      return usage;
    }, {}),
    [classId, oppositionSchoolIds, oppositionSpellIds, preparedSpellIds, restrictedEligibleIds, spells],
  );
  const limitFor = (level: number) =>
    (preparedLimits.find((entry) => entry.level === level)?.count ?? 0) + (level > 0 ? restrictedBonus?.countPerLevel ?? 0 : 0);
  const remainingSlots = (level: number) => {
    const slot = slots.find((entry) => entry.level === level);
    return slot ? slot.count - (slotUses[level] ?? 0) : Infinity;
  };
  const fastHealingRules = spellAutomation?.fastHealingAura;
  const eligibleFastHealingSlots = fastHealingRules
    ? slots.filter((slot) => slot.level >= fastHealingRules.minimumSpellLevel && slot.count > 0)
    : [];
  const selectedFastHealingSlotLevel = eligibleFastHealingSlots.some(
    (slot) => slot.level === fastHealingSlotLevel,
  )
    ? fastHealingSlotLevel
    : (eligibleFastHealingSlots[0]?.level ?? 0);
  const fastHealingValue = fastHealingRules && selectedFastHealingSlotLevel
    ? Math.max(1, Math.floor(selectedFastHealingSlotLevel / fastHealingRules.healingDivisor))
    : 0;
  const fastHealingRounds = fastHealingRules
    ? Math.max(
        fastHealingRules.minimumRounds,
        abilityModifiers[fastHealingRules.durationAbility] ?? 0,
      )
    : 0;
  const canUseFastHealing = Boolean(
    fastHealingRules &&
      reservoir &&
      onAddEffect &&
      selectedFastHealingSlotLevel &&
      reservoir.current >= fastHealingRules.reservoirCost &&
      remainingSlots(selectedFastHealingSlotLevel) > 0,
  );
  const descriptorBoostRules = spellAutomation?.descriptorReservoirBoost;
  const qualifyingDescriptor = (spell: Spell) => descriptorBoostRules?.descriptors.find(
    (descriptor) => spellHasDescriptor(spell, descriptor),
  );
  const canUseDescriptorBoost = (spell: Spell, level: number) => Boolean(
    descriptorBoostRules &&
      qualifyingDescriptor(spell) &&
      reservoir &&
      reservoir.current >= descriptorBoostRules.reservoirCost &&
      (level === 0 || remainingSlots(level) > 0),
  );
  const shareRules = spellAutomation?.sharePersonalRange;
  const shareEligible = (spell: Spell) =>
    Boolean(shareRules && spellHasSchool(spell, shareRules.school) && isPersonalRangeSpell(spell));
  const derivedDuration = (spell: Spell) =>
    spellAutomation?.automaticExtendDuration && spellHasSchool(spell, spellAutomation.automaticExtendDuration.school)
      ? extendedSpellDuration(spell.duration)
      : null;
  const useSpellSlot = (level: number) => {
    if (level > 0)
      onSlotUsesChange({
        ...slotUses,
        [level]: (slotUses[level] ?? 0) + 1,
      });
  };
  const shareSpell = (spell: Spell, level: number) => {
    if (!shareRules || !reservoir || !shareTarget.trim()) return;
    onReservoirChange(reservoir.current - shareRules.reservoirCost);
    useSpellSlot(level);
    setShareResult(
      `Shared ${spell.name} with ${shareTarget.trim()} ${shareRules.range === "touch" ? "by touch" : `within ${shareRules.range}`}.`,
    );
  };
  const spellstrikeEligible = (spell: Spell) => Boolean(
    spellAutomation?.spellstrike && (
      spell.range?.toLowerCase() === "touch" ||
      (spellAutomation.spellstrike.closeRange && /\bray\b/i.test([spell.name, spell.summary, spell.effect].filter(Boolean).join(" ")))
    ),
  );
  const useSpellstrike = (spell: Spell, level: number) => {
    if (!spellstrikeEligible(spell) || (level > 0 && remainingSlots(level) <= 0)) return;
    useSpellSlot(level);
    const closeRange = spell.range?.toLowerCase() !== "touch";
    const description = closeRange
      ? `${spell.name} is converted from a ray to a single melee touch effect and delivered with the bonded weapon; additional rays are lost.`
      : `${spell.name} is delivered through the bonded weapon as a free melee attack at your highest base attack bonus.`;
    onAddEffect?.({ id: `spellstrike-${Date.now()}-${Math.random()}`, name: `${spellAutomation!.spellstrike!.label}: ${spell.name}`, target: "self", bonus: 0, description, roundsRemaining: 1 });
    setSpellstrikeResult(description);
  };
  const criticalStrikeEligible = (spell: Spell) => Boolean(spellAutomation?.criticalStrike && spell.range?.toLowerCase() === "touch");
  const useCriticalStrike = (spell: Spell, level: number) => {
    if (!criticalStrikeEligible(spell) || !criticalStrikeResource || (criticalStrikeResource.maximum !== null && criticalStrikeResource.used >= criticalStrikeResource.maximum) || (level > 0 && remainingSlots(level) <= 0)) return;
    useSpellSlot(level);
    criticalStrikeResource.onUsedChange(criticalStrikeResource.used + 1);
    const description = `${spell.name} is cast as a swift action after a melee critical hit and delivered against that target with a free touch attack.`;
    onAddEffect?.({ id: `critical-strike-${Date.now()}-${Math.random()}`, name: `${spellAutomation!.criticalStrike!.label}: ${spell.name}`, target: "self", bonus: 0, description, roundsRemaining: 1 });
    setSpellstrikeResult(description);
  };
  const useBondedObjectCast = (spell: Spell) => {
    if (!bondedObjectCastResource || (bondedObjectCastResource.maximum !== null && bondedObjectCastResource.used >= bondedObjectCastResource.maximum)) return;
    bondedObjectCastResource.onUsedChange(bondedObjectCastResource.used + 1);
    setBondedObjectCastResult(`Cast ${spell.name} from the bonded blade without preparing it or consuming a spell slot.`);
  };
  const useFastHealing = () => {
    if (
      !fastHealingRules ||
      !reservoir ||
      !onAddEffect ||
      !selectedFastHealingSlotLevel ||
      reservoir.current < fastHealingRules.reservoirCost ||
      remainingSlots(selectedFastHealingSlotLevel) <= 0
    ) return;
    onReservoirChange(reservoir.current - fastHealingRules.reservoirCost);
    useSpellSlot(selectedFastHealingSlotLevel);
    const description = `Allies within ${fastHealingRules.range} gain fast healing ${fastHealingValue}`;
    onAddEffect({
      id: `fast-healing-${Date.now()}-${Math.random()}`,
      name: fastHealingRules.label,
      target: "allies",
      bonus: fastHealingValue,
      fastHealing: fastHealingValue,
      description,
      roundsRemaining: fastHealingRounds,
    });
    setFastHealingResult(`${description} for ${fastHealingRounds} round${fastHealingRounds === 1 ? "" : "s"}.`);
  };
  const useDescriptorBoost = (spell: Spell, level: number, mode: "casterLevel" | "saveDc") => {
    if (!descriptorBoostRules || !reservoir || !canUseDescriptorBoost(spell, level)) return;
    const descriptor = qualifyingDescriptor(spell);
    if (!descriptor) return;
    onReservoirChange(reservoir.current - descriptorBoostRules.reservoirCost);
    useSpellSlot(level);
    const bonus = mode === "casterLevel"
      ? descriptorBoostRules.casterLevelBonus
      : descriptorBoostRules.saveDcBonus;
    const statistic = mode === "casterLevel" ? "caster level" : "save DC";
    setDescriptorBoostResult(`Cast ${spell.name} with ${descriptorBoostRules.label}: +${bonus} ${statistic} (${descriptor} descriptor).`);
  };
  const requiredSchoolPrepared = (level: number) => !requiredPreparedSchool || preparedSpellIds.some((id) => {
    const spell = spells.find((candidate) => candidate.id === id);
    return spell?.levelByClass[classId] === level && spellHasSchool(spell, requiredPreparedSchool);
  });
  const filteredSpells = useMemo(
    () =>
      spells.filter((spell) => {
        const level = spell.levelByClass[classId];
        const matchesLevel = query
          ? true
          : levelFilter === "all" || level === Number(levelFilter);
        return (
          matchesLevel &&
          `${spell.name} ${spell.summary}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        );
      }),
    [classId, levelFilter, query, spells],
  );
  const groupedSpells = useMemo(
    () =>
      filteredSpells.slice(0, visibleLimit).reduce(
        (groups, spell) => {
          const level = spell.levelByClass[classId];
          (groups[level] ??= []).push(spell);
          return groups;
        },
        {} as Record<number, Spell[]>,
      ),
    [classId, filteredSpells, visibleLimit],
  );
  useEffect(() => setVisibleLimit(250), [query, levelFilter, classId]);
  const masteredSpellIdSet = new Set(spellMastery?.selectedIds ?? []);
  const masteredSpells = spellMastery?.selectedIds.flatMap((spellId) => {
    const spell = spellMastery.catalogue.find((candidate) => candidate.id === spellId);
    return spell ? [spell] : [];
  }) ?? [];
  const masteryCandidates = spellMastery?.catalogue
    .filter((spell) => !masteredSpellIdSet.has(spell.id) && (!masteryQuery.trim() || `${spell.name} ${spell.summary}`.toLowerCase().includes(masteryQuery.trim().toLowerCase())))
    .sort((left, right) => (left.levelByClass.arcanist ?? 0) - (right.levelByClass.arcanist ?? 0) || left.name.localeCompare(right.name))
    .slice(0, 30) ?? [];

  return (
    <section className="spell-panel">
      <p className="eyebrow">SPELLBOOK</p>
      <h2>Prepared spells</h2>
      {casterLevel !== undefined && <p><strong>Caster level:</strong> <output aria-label={`${className} caster level`}>{casterLevel}</output></p>}
      <p>
        {className} slots:{" "}
        {slots
          .map(
            (slot) =>
              `${remainingSlots(slot.level)}/${slot.count} ${levelLabel(slot.level)}${slot.bonus ? ` (${slot.base} base + ${slot.bonus} ${castingAbilityName})` : ""}`,
          )
          .join(", ")}
        .
      </p>
      {spellMastery && (
        <section className="archetype-spell-controls spell-mastery-controls" aria-label="Spell Mastery">
          <div>
            <strong>Spell Mastery</strong>
            <span>Master {spellMastery.limit} Arcanist spell{spellMastery.limit === 1 ? "" : "s"} across your copies of the feat. These spells can be prepared without a spellbook.</span>
          </div>
          <output aria-label="Spell Mastery selections">{masteredSpells.length}/{spellMastery.limit} mastered</output>
          {masteredSpells.length > 0 && <ul className="spell-mastery-list">{masteredSpells.map((spell) => <li key={spell.id}><span>{spell.name} · {levelLabel(spell.levelByClass.arcanist ?? 0)}</span><button type="button" aria-label={`Forget mastered spell ${spell.name}`} onClick={() => spellMastery.onChange(spellMastery.selectedIds.filter((spellId) => spellId !== spell.id))}>Remove</button></li>)}</ul>}
          {masteredSpells.length < spellMastery.limit && <>
            <label>Find an Arcanist spell<input type="search" aria-label="Search Spell Mastery spells" value={masteryQuery} placeholder="Spell name or effect" onChange={(event) => setMasteryQuery(event.target.value)} /></label>
            <div className="spell-mastery-results">{masteryCandidates.map((spell) => <button type="button" key={spell.id} aria-label={`Master ${spell.name}`} onClick={() => spellMastery.onChange([...spellMastery.selectedIds, spell.id])}>{spell.name} <small>{levelLabel(spell.levelByClass.arcanist ?? 0)}</small></button>)}</div>
          </>}
        </section>
      )}
      <p>
        {preparedLimits
          .map(
            (limit) =>
              `${preparedCount(limit.level)}/${limitFor(limit.level)} prepared ${levelLabel(limit.level)}`,
          )
          .join(" · ")}
      </p>
      {restrictedBonus && (
        <p className="hint">
          Each spell level includes 1 {restrictedBonus.label}; preparations beyond the normal limit must match that element.
        </p>
      )}
      {requiredPreparedSchool && (
        <p className="hint" role="status">
          Required preparation: at least one {requiredPreparedSchool} spell at every available spell level. Casting remains locked for levels still missing one.
        </p>
      )}
      {shareRules && (
        <section className="archetype-spell-controls" aria-label={shareRules.label}>
          <div>
            <strong>{shareRules.label}</strong>
            <span>
              Personal-range {shareRules.school} spells can target one {shareRules.willingOnly ? "willing " : ""}creature {shareRules.range === "touch" ? "by touch" : `within ${shareRules.range}`} for {shareRules.reservoirCost} reservoir point.
            </span>
          </div>
          <label>
            {shareRules.willingOnly ? "Willing target" : "Target"}
            <input
              aria-label={`${shareRules.label} ${shareRules.willingOnly ? "willing " : ""}target`}
              value={shareTarget}
              placeholder="Creature name"
              onChange={(event) => {
                setShareTarget(event.target.value);
                setShareResult("");
              }}
            />
          </label>
          {shareResult && <output aria-label={`${shareRules.label} result`}>{shareResult}</output>}
        </section>
      )}
      {fastHealingRules && (
        <section className="archetype-spell-controls" aria-label={fastHealingRules.label}>
          <div>
            <strong>{fastHealingRules.label}</strong>
            <span>
              Spend {fastHealingRules.reservoirCost} reservoir point and a {levelLabel(fastHealingRules.minimumSpellLevel)} or higher slot. Allies within {fastHealingRules.range} gain fast healing equal to half the sacrificed slot level for {fastHealingRounds} round{fastHealingRounds === 1 ? "" : "s"}.
            </span>
          </div>
          <div className="archetype-spell-action">
            <label>
              Sacrificed spell slot
              <select
                aria-label={`${fastHealingRules.label} spell slot`}
                value={selectedFastHealingSlotLevel}
                onChange={(event) => {
                  setFastHealingSlotLevel(Number(event.target.value));
                  setFastHealingResult("");
                }}
              >
                {eligibleFastHealingSlots.map((slot) => (
                  <option key={slot.level} value={slot.level} disabled={remainingSlots(slot.level) <= 0}>
                    {levelLabel(slot.level)} ({remainingSlots(slot.level)}/{slot.count} remaining) · fast healing {Math.max(1, Math.floor(slot.level / fastHealingRules.healingDivisor))}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" disabled={!canUseFastHealing} onClick={useFastHealing}>
              Use {fastHealingRules.label}
            </button>
          </div>
          {fastHealingResult && <output aria-label={`${fastHealingRules.label} result`}>{fastHealingResult}</output>}
        </section>
      )}
      {descriptorBoostRules && (
        <section className="archetype-spell-controls" aria-label={descriptorBoostRules.label}>
          <div>
            <strong>{descriptorBoostRules.label}</strong>
            <span>
              Spend {descriptorBoostRules.reservoirCost} reservoir point while casting an eligible spell to apply +{descriptorBoostRules.casterLevelBonus} caster level or +{descriptorBoostRules.saveDcBonus} save DC. Spells with the {descriptorBoostRules.descriptors.join(", ")} descriptors are marked below.
            </span>
          </div>
          {descriptorBoostResult && <output aria-label={`${descriptorBoostRules.label} result`}>{descriptorBoostResult}</output>}
        </section>
      )}
      <div className="spell-day-controls">
        <button type="button" onClick={onRefreshDay}>
          Refresh day
        </button>
        {reservoir && (
          <div className="reservoir-control">
            <output aria-label="Arcane Reservoir points">
              {reservoir.current}/{reservoir.maximum} reservoir
            </output>
            <button
              type="button"
              aria-label="Spend reservoir point"
              disabled={reservoir.current === 0}
              onClick={() => onReservoirChange(reservoir.current - 1)}
            >
              -
            </button>
            <button
              type="button"
              aria-label="Gain reservoir point"
              disabled={reservoir.current === reservoir.maximum}
              onClick={() => onReservoirChange(reservoir.current + 1)}
            >
              +
            </button>
          </div>
        )}
      </div>
      {sourceBook && (
        <details className="prepared-source-book" open>
          <summary>
            <strong>{sourceBook.label}</strong>{" "}
            <span>
              {sourceBook.knownSpellIds.length}/{sourceBook.capacity} chosen
              {sourceBook.bonusCapacity ? ` · ${sourceBook.bonusCapacity} favoured-class` : ""}
            </span>
          </summary>
          <p className="hint">
            Learn or copy spells here before preparing them.
            Cantrips and patron spells are included automatically.
          </p>
          <div className="prepared-source-filters">
            <label>Search {sourceBook.label}<input type="search" aria-label={`Search ${sourceBook.label}`} value={sourceQuery} placeholder="Spell name or effect" onChange={event => setSourceQuery(event.target.value)} /></label>
            <label>Spell level<select aria-label={`${sourceBook.label} spell level`} value={sourceLevel} onChange={event => setSourceLevel(event.target.value)}><option value="all">All levels</option>{Array.from({ length: maximumSpellLevel }, (_, index) => index + 1).map(level => <option key={level} value={level}>{levelLabel(level)}</option>)}</select></label>
          </div>
          {sourceBook.knownSpellIds.length > 0 && <div className="recorded-spells" aria-label={`${sourceBook.label} recorded spells`}><strong>Recorded spells</strong><div>{sourceBook.knownSpellIds.map(id => sourceBook.catalogue.find(spell => spell.id === id)).filter((spell): spell is Spell => Boolean(spell)).map(spell => <button type="button" key={spell.id} onClick={() => sourceBook.onChange(sourceBook.knownSpellIds.filter(id => id !== spell.id))} aria-label={`Remove ${spell.name} from ${sourceBook.label}`}>{spell.name} ×</button>)}</div></div>}
          <div className="prepared-source-list">
            {sourceBook.catalogue
              .filter((spell) => (spell.levelByClass[classId] ?? 0) > 0)
              .filter((spell) => sourceLevel === "all" || spell.levelByClass[classId] === Number(sourceLevel))
              .filter((spell) => !sourceQuery.trim() || `${spell.name} ${spell.summary}`.toLowerCase().includes(sourceQuery.trim().toLowerCase()))
              .slice(0, 500)
              .map((spell) => {
                const known = sourceBook.knownSpellIds.includes(spell.id);
                const automatic = sourceBook.automaticSpellIds.includes(
                  spell.id,
                );
                return (
                  <label key={spell.id}>
                    <input
                      type="checkbox"
                      checked={known || automatic}
                      disabled={
                        automatic ||
                        (!known &&
                          sourceBook.knownSpellIds.length >=
                            sourceBook.capacity)
                      }
                      onChange={() =>
                        sourceBook.onChange(
                          known
                            ? sourceBook.knownSpellIds.filter(
                                (id) => id !== spell.id,
                              )
                            : [...sourceBook.knownSpellIds, spell.id],
                        )
                      }
                    />
                    <span>
                      <strong>{spell.name}</strong>
                      <small>
                        level {spell.levelByClass[classId]}
                        {automatic ? " · granted" : ""}
                      </small>
                    </span>
                  </label>
                );
              })}
          </div>
        </details>
      )}
      <section
        className="prepared-summary"
        aria-labelledby="prepared-today-heading"
      >
        {spellstrikeResult && <output aria-label="Spellstrike result">{spellstrikeResult}</output>}
        {bondedObjectCastResult && <output aria-label={`${bondedObjectCastResource?.label ?? "Bonded object"} result`}>{bondedObjectCastResult}</output>}
        <div className="prepared-summary-heading">
          <div>
            <p className="eyebrow">READY TO CAST</p>
            <h3 id="prepared-today-heading">Prepared today</h3>
          </div>
          <strong>
            {preparedSpellIds.length} spell
            {preparedSpellIds.length === 1 ? "" : "s"}
          </strong>
        </div>
        {preparedSelections.length === 0 ? (
          <p className="hint">
            No spells prepared yet. Browse the catalogue below and use + to
            prepare one.
          </p>
        ) : (
          <div className="prepared-spell-groups">
            {preparedLimits.map(({ level }) => {
              const selections = preparedSelections.filter(
                (selection) => selection.level === level,
              );
              if (selections.length === 0) return null;
              return (
                <section key={level}>
                  <h4>
                    {levelLabel(level)}{" "}
                    <small>
                      {preparedCount(level)}/{limitFor(level)} slots prepared
                    </small>
                  </h4>
                  <ul>
                    {selections.map(({ spell, count }) => {
                      const canCast = level === 0 || remainingSlots(level) > 0;
                      const shareable = shareEligible(spell);
                      const boostDescriptor = qualifyingDescriptor(spell);
                      const automaticDuration = derivedDuration(spell);
                      const canShare = Boolean(
                        shareable &&
                          shareRules &&
                          reservoir &&
                          reservoir.current >= shareRules.reservoirCost &&
                          shareTarget.trim() &&
                          canCast,
                      );
                      return (
                        <li key={spell.id}>
                          <span>
                            <strong>{spell.name}</strong>
                            <small>
                              DC {spellDcs[level]} · prepared ×{count}
                              {automaticDuration ? ` · ${spellAutomation!.automaticExtendDuration!.label}: ${automaticDuration}` : ""}
                              {shareable ? ` · ${shareRules!.label}: ${shareRules!.range}` : ""}
                              {boostDescriptor ? ` · ${descriptorBoostRules!.label}: ${boostDescriptor}` : ""}
                            </small>
                          </span>
                          <div>
                            <button
                              type="button"
                              aria-label={`Quick cast ${spell.name}`}
                              disabled={!canCast}
                              onClick={() => useSpellSlot(level)}
                            >
                              Cast
                            </button>
                            {shareable && (
                              <button
                                type="button"
                                aria-label={`Share ${spell.name}`}
                                disabled={!canShare}
                                onClick={() => shareSpell(spell, level)}
                              >
                                Share
                              </button>
                            )}
                            {boostDescriptor && <>
                              <button type="button" className="descriptor-boost-button" aria-label={`Quick cast ${spell.name} with ${descriptorBoostRules!.label} caster level`} disabled={!canUseDescriptorBoost(spell, level)} onClick={() => useDescriptorBoost(spell, level, "casterLevel")}>+{descriptorBoostRules!.casterLevelBonus} CL</button>
                              <button type="button" className="descriptor-boost-button" aria-label={`Quick cast ${spell.name} with ${descriptorBoostRules!.label} save DC`} disabled={!canUseDescriptorBoost(spell, level)} onClick={() => useDescriptorBoost(spell, level, "saveDc")}>+{descriptorBoostRules!.saveDcBonus} DC</button>
                            </>}
                            <button
                              type="button"
                              aria-label={`Remove one prepared ${spell.name}`}
                              onClick={() =>
                                onPreparedSpellIdsChange(
                                  preparedSpellIds.filter(
                                    (id, index) =>
                                      id !== spell.id ||
                                      index !==
                                        preparedSpellIds.lastIndexOf(spell.id),
                                  ),
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </section>
      {maximumSpellLevel === 0 && (
        <p className="hint">
          Increase {castingAbilityName} to 11 or higher to cast 1st-level
          spells.
        </p>
      )}
      <h3 className="spell-catalogue-heading">Browse spell catalogue</h3>
      <div className="spell-controls">
        <label>
          Search spells
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or effect"
          />
        </label>
        <label>
          Spell level
          <select
            aria-label="Spell level filter"
            value={levelFilter}
            disabled={Boolean(query)}
            onChange={(event) => setLevelFilter(event.target.value)}
          >
            <option value="all">All levels</option>
            {Array.from({ length: maximumSpellLevel + 1 }, (_, level) => (
              <option key={level} value={level}>
                {levelLabel(level)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filteredSpells.length === 0 ? (
        <p className="hint">No spells match this search.</p>
      ) : (
        <>{Object.entries(groupedSpells).map(([rawLevel, spellsAtLevel]) => {
          const level = Number(rawLevel);
          return (
            <section className="spell-level" key={level}>
              <h3>
                {levelLabel(level)} <small>{spellsAtLevel.length} spells</small>
              </h3>
              <div className="spell-list">
                {spellsAtLevel.map((spell) => {
                  const prepared = preparedSpellIds.filter(
                    (id) => id === spell.id,
                  ).length;
                  const preparationCost = spellPreparationCost(
                    spell,
                    oppositionSchoolIds,
                    oppositionSpellIds,
                  );
                  const baseLimit = preparedLimits.find((entry) => entry.level === level)?.count ?? 0;
                  const restrictedIneligibleFull = Boolean(restrictedBonus)
                    && !restrictedEligibleIds.has(spell.id)
                    && (restrictedIneligibleUsage[level] ?? 0) + preparationCost > baseLimit;
                  const reservesRequiredSchoolSlot = Boolean(requiredPreparedSchool)
                    && !requiredSchoolPrepared(level)
                    && !spellHasSchool(spell, requiredPreparedSchool!)
                    && (restrictedIneligibleUsage[level] ?? 0) + preparationCost >= baseLimit;
                  const full =
                    preparedCount(level) + preparationCost > limitFor(level) || restrictedIneligibleFull || reservesRequiredSchoolSlot;
                  const canCast = (level === 0 || remainingSlots(level) > 0) && requiredSchoolPrepared(level);
                  const onDemandCost = onDemandSpellCosts[spell.id];
                  const canCastOnDemand = Boolean(onDemandCost && (!onDemandCost.resourceId || (reservoir && reservoir.current >= onDemandCost.cost)));
                  const consumesSpellSlot = onDemandCost?.consumesSpellSlot ?? true;
                  const shareable = shareEligible(spell);
                  const boostDescriptor = qualifyingDescriptor(spell);
                  const automaticDuration = derivedDuration(spell);
                  const canShare = Boolean(
                    shareable &&
                      prepared > 0 &&
                      shareRules &&
                      reservoir &&
                      reservoir.current >= shareRules.reservoirCost &&
                      shareTarget.trim() &&
                      canCast,
                  );
                  return (
                    <article key={spell.id}>
                      <div>
                        <strong>{spell.name}</strong>
                        <small>
                          level {level} · DC {spellDcs[level] + (onDemandCost?.saveDcBonus ?? 0)} · {spell.summary}
                          {spellTraitBonuses[spell.id]?.casterLevel
                            ? ` · trait: +${spellTraitBonuses[spell.id].casterLevel} caster level`
                            : ""}
                          {spellTraitBonuses[spell.id]?.metamagicLevelAdjustment
                            ? ` · trait: ${spellTraitBonuses[spell.id].metamagicLevelAdjustment} metamagic level adjustment`
                            : ""}
                          {preparationCost === 2
                            ? " · opposition school: costs 2 prepared slots"
                            : ""}
                          {restrictedBonus && restrictedEligibleIds.has(spell.id)
                            ? ` · eligible for ${restrictedBonus.label}`
                            : ""}
                          {onDemandCost
                            ? ` · ${onDemandCost.label}: cast on demand${onDemandCost.resourceId ? ` for ${onDemandCost.cost} reservoir point${onDemandCost.cost === 1 ? "" : "s"}` : ""}${onDemandCost.concentrationBonus ? ` · +${onDemandCost.concentrationBonus} concentration` : ""}`
                            : ""}
                          {automaticDuration
                            ? ` · ${spellAutomation!.automaticExtendDuration!.label}: ${automaticDuration}`
                            : ""}
                          {shareable
                            ? ` · ${shareRules!.label}: ${shareRules!.range}, ${shareRules!.reservoirCost} reservoir point`
                            : ""}
                          {boostDescriptor
                            ? ` · ${descriptorBoostRules!.label}: ${boostDescriptor}, +${descriptorBoostRules!.casterLevelBonus} caster level or +${descriptorBoostRules!.saveDcBonus} save DC`
                            : ""}
                        </small>
                      </div>
                      <div className="spell-actions">
                        <button
                          type="button"
                          className="cast-spell-button"
                          aria-label={`Cast ${spell.name}`}
                          disabled={(prepared === 0 && !canCastOnDemand) || (consumesSpellSlot && !canCast)}
                          onClick={() => {
                            if (prepared === 0 && onDemandCost?.resourceId && reservoir)
                              onReservoirChange(reservoir.current - onDemandCost.cost);
                            if (level > 0 && (prepared > 0 || consumesSpellSlot))
                              onSlotUsesChange({
                                ...slotUses,
                                [level]: (slotUses[level] ?? 0) + 1,
                              });
                            if (onDemandCost?.summonTracker && onAddEffect) {
                              const tracker = onDemandCost.summonTracker;
                              if (tracker.replaceExisting) onRemoveEffectByName?.(tracker.name);
                              onAddEffect({
                                id: `conjurers-focus-${Date.now()}-${Math.random()}`,
                                name: tracker.name,
                                target: "allies",
                                bonus: 0,
                                description: `${tracker.description.replaceAll("{spell}", spell.name)} ${tracker.untilDismissed ? "Duration: until dismissed." : `Duration: ${tracker.rounds} rounds.`}`,
                                roundsRemaining: tracker.rounds,
                              });
                            }
                          }}
                        >
                              Cast
                            </button>
                            {spellstrikeEligible(spell) && <button type="button" aria-label={`Cast ${spell.name} with Spellstrike`} disabled={!canCast} onClick={() => useSpellstrike(spell, level)}>Spellstrike</button>}
                            {criticalStrikeEligible(spell) && <button type="button" aria-label={`Cast ${spell.name} with Critical Strike`} disabled={!canCast || !criticalStrikeResource || (criticalStrikeResource.maximum !== null && criticalStrikeResource.used >= criticalStrikeResource.maximum)} onClick={() => useCriticalStrike(spell, level)}>Critical Strike</button>}
                            {bondedObjectCastResource && <button type="button" aria-label={`Cast ${spell.name} with ${bondedObjectCastResource.label}`} disabled={bondedObjectCastResource.maximum !== null && bondedObjectCastResource.used >= bondedObjectCastResource.maximum} onClick={() => useBondedObjectCast(spell)}>{bondedObjectCastResource.label}</button>}
                        {shareable && (
                          <button
                            type="button"
                            className="share-spell-button"
                            aria-label={`Share ${spell.name}`}
                            disabled={!canShare}
                            onClick={() => shareSpell(spell, level)}
                          >
                            Share
                          </button>
                        )}
                        {boostDescriptor && <>
                          <button type="button" className="descriptor-boost-button" aria-label={`Cast ${spell.name} with ${descriptorBoostRules!.label} caster level`} disabled={prepared === 0 || !canUseDescriptorBoost(spell, level) || !requiredSchoolPrepared(level)} onClick={() => useDescriptorBoost(spell, level, "casterLevel")}>+{descriptorBoostRules!.casterLevelBonus} CL</button>
                          <button type="button" className="descriptor-boost-button" aria-label={`Cast ${spell.name} with ${descriptorBoostRules!.label} save DC`} disabled={prepared === 0 || !canUseDescriptorBoost(spell, level) || !requiredSchoolPrepared(level)} onClick={() => useDescriptorBoost(spell, level, "saveDc")}>+{descriptorBoostRules!.saveDcBonus} DC</button>
                        </>}
                        <div className="spell-count">
                          <button
                            type="button"
                            aria-label={`Remove ${spell.name}`}
                            disabled={prepared === 0}
                            onClick={() =>
                              onPreparedSpellIdsChange(
                                preparedSpellIds.filter(
                                  (id, index) =>
                                    id !== spell.id ||
                                    index !==
                                      preparedSpellIds.lastIndexOf(spell.id),
                                ),
                              )
                            }
                          >
                            -
                          </button>
                          <output aria-label={`${spell.name} prepared`}>
                            {prepared}
                          </output>
                          <button
                            type="button"
                            aria-label={`Add ${spell.name}`}
                            disabled={full || Boolean(onDemandCost)}
                            onClick={() =>
                              onPreparedSpellIdsChange([
                                ...preparedSpellIds,
                                spell.id,
                              ])
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <SpellDetails
                        spell={spell}
                        derivedDuration={automaticDuration ? {
                          label: spellAutomation!.automaticExtendDuration!.label,
                          value: automaticDuration,
                        } : null}
                      />
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}{visibleLimit < filteredSpells.length && <button type="button" className="spell-show-more" onClick={() => setVisibleLimit(current => current + 100)}>Show 100 more spells</button>}</>
      )}
    </section>
  );
}
