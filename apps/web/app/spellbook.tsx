import { useEffect, useMemo, useState } from "react";
import {
  preparedSpellSlotUsage,
  spellPreparationCost,
} from "../../../packages/engine/src/wizard-opposition-preparation.js";
import type { CharacterSpell } from "../../../packages/types/src/index.js";
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
  onDemandSpellCosts?: Record<string, { resourceId?: string; cost: number; label: string; consumesSpellSlot?: boolean; saveDcBonus?: number; concentrationBonus?: number }>;
}) {
  const [query, setQuery] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceLevel, setSourceLevel] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(250);
  const [levelFilter, setLevelFilter] = useState(String(maximumSpellLevel));
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

  return (
    <section className="spell-panel">
      <p className="eyebrow">SPELLBOOK</p>
      <h2>Prepared spells</h2>
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
                      return (
                        <li key={spell.id}>
                          <span>
                            <strong>{spell.name}</strong>
                            <small>
                              DC {spellDcs[level]} · prepared ×{count}
                            </small>
                          </span>
                          <div>
                            <button
                              type="button"
                              aria-label={`Quick cast ${spell.name}`}
                              disabled={!canCast}
                              onClick={() => {
                                if (level > 0)
                                  onSlotUsesChange({
                                    ...slotUses,
                                    [level]: (slotUses[level] ?? 0) + 1,
                                  });
                              }}
                            >
                              Cast
                            </button>
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
                  const full =
                    preparedCount(level) + preparationCost > limitFor(level) || restrictedIneligibleFull;
                  const canCast = level === 0 || remainingSlots(level) > 0;
                  const onDemandCost = onDemandSpellCosts[spell.id];
                  const canCastOnDemand = Boolean(onDemandCost && (!onDemandCost.resourceId || (reservoir && reservoir.current >= onDemandCost.cost)));
                  const consumesSpellSlot = onDemandCost?.consumesSpellSlot ?? true;
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
                          }}
                        >
                          Cast
                        </button>
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
                      <SpellDetails spell={spell} />
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
