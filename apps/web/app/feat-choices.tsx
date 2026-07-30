import { useEffect, useMemo, useRef, useState } from "react";
import type { CharacterFeat as Feat, Prerequisite } from "../../../packages/types/src/index.js";

type FeatChoice = {
  index: number;
  name: string;
  selected?: Feat;
  checks: Array<{ met: boolean; prerequisite: Prerequisite }>;
  eligibleFeatIds: string[];
};

const labels: Record<string, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma"
};

const prerequisiteLabel = (prerequisite: Prerequisite, featNames: Map<string, string>): string => {
  if (prerequisite.type === "ability") return `${labels[prerequisite.key] ?? prerequisite.key} ${prerequisite.minimum}+`;
  if (prerequisite.type === "bab") return `BAB +${prerequisite.minimum}`;
  if (prerequisite.type === "caster-level") return `Caster level ${prerequisite.minimum}+`;
  if (prerequisite.type === "class-level") return `${prerequisite.classId} level ${prerequisite.minimum}+`;
  if (prerequisite.type === "skill") return `${prerequisite.key} ${prerequisite.minimum}+ ranks`;
  if (prerequisite.type === "matching-choice") return `Matching ${prerequisite.key} for ${featNames.get(prerequisite.featId) ?? prerequisite.featId}`;
  if (prerequisite.type === "choice-value") return `${prerequisite.key} for ${featNames.get(prerequisite.featId) ?? prerequisite.featId}: ${prerequisite.value}`;
  if (prerequisite.type === "any") return `One of: ${prerequisite.prerequisites.map((item) => prerequisiteLabel(item, featNames)).join("; ")}`;
  if (prerequisite.type === "level") return `Character level ${prerequisite.minimum}+`;
  if (prerequisite.type === "size") return `Size ${prerequisite.maximum ? `${prerequisite.maximum} or smaller` : `${prerequisite.minimum} or larger`}`;
  if (prerequisite.type === "feat") return featNames.get(prerequisite.id) ?? prerequisite.id;
  if (prerequisite.type === "feature") return `Feature: ${prerequisite.id}`;
  if (prerequisite.type === "spell-access") return `Able to cast: ${prerequisite.id.replaceAll("-", " ")}`;
  if (prerequisite.type === "rule") return `Manual requirement: ${prerequisite.description}`;
  return "id" in prerequisite ? `Ancestry: ${prerequisite.id}` : prerequisite.type;
};

export function FeatChoices({ feats, choices, selectedFeatIds, selectedFeatChoices, onFeatChange, onFeatChoiceChange }: {
  feats: Feat[];
  choices: FeatChoice[];
  selectedFeatIds: string[];
  selectedFeatChoices: Record<string, string>;
  onFeatChange: (index: number, featId: string) => void;
  onFeatChoiceChange: (featId: string, choice: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState<"eligible" | "all" | "selected">("eligible");
  const [type, setType] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(40);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const featNames = useMemo(() => new Map(feats.map((feat) => [feat.id, feat.name])), [feats]);
  const eligibleIds = useMemo(() => new Set(choices.flatMap((choice) => choice.eligibleFeatIds)), [choices]);
  const activeChoice = choices.find((choice) => choice.index === activeSlotIndex);
  const activeEligibleIds = useMemo(() => new Set(activeChoice?.eligibleFeatIds ?? []), [activeChoice]);
  const selectedIds = useMemo(() => new Set(selectedFeatIds.filter(Boolean)), [selectedFeatIds]);
  const featTypes = useMemo(() => [...new Set(feats.map((feat) => feat.type))].sort(), [feats]);
  const unlockedBy = useMemo(() => {
    const children = new Map<string, Feat[]>();
    for (const feat of feats) {
      for (const prerequisite of feat.prerequisites) {
        if (prerequisite.type !== "feat") continue;
        children.set(prerequisite.id, [...(children.get(prerequisite.id) ?? []), feat]);
      }
    }
    return children;
  }, [feats]);
  const visibleFeats = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return feats.filter((feat) => {
      if (availability === "eligible" && !(activeChoice ? activeEligibleIds : eligibleIds).has(feat.id)) return false;
      if (availability === "selected" && !selectedIds.has(feat.id)) return false;
      if (type !== "all" && feat.type !== type) return false;
      if (!normalizedQuery) return true;
      const searchable = [feat.name, feat.benefit, feat.type, ...feat.prerequisites.map((item) => prerequisiteLabel(item, featNames))].join(" ").toLocaleLowerCase();
      return searchable.includes(normalizedQuery);
    }).sort((left, right) => left.name.localeCompare(right.name));
  }, [activeChoice, activeEligibleIds, availability, eligibleIds, featNames, feats, query, selectedIds, type]);
  useEffect(() => setVisibleLimit(40), [availability, query, type]);

  const chooseFeat = (feat: Feat) => {
    if (activeChoice) {
      const selectedElsewhere = selectedFeatIds.some((id, index) => id === feat.id && index !== activeChoice.index);
      if (activeChoice.eligibleFeatIds.includes(feat.id) && !selectedElsewhere) {
        onFeatChange(activeChoice.index, feat.id);
        setActiveSlotIndex(null);
      }
      return;
    }
    const openSlot = choices.find((choice) => !selectedFeatIds[choice.index] && choice.eligibleFeatIds.includes(feat.id));
    if (openSlot) onFeatChange(openSlot.index, feat.id);
  };

  const startChoosing = (index: number) => {
    setActiveSlotIndex(index);
    setAvailability("eligible");
    setQuery("");
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  return <section className="feat-panel">
    <header className="feat-header">
      <div><p className="eyebrow">FEATS</p><h2>Feat manager</h2><p>Fill earned feat slots, browse legal choices, and follow prerequisite chains.</p></div>
      <div className="feat-progress" aria-label={`${selectedIds.size} of ${choices.length} feat slots filled`}><strong>{selectedIds.size}/{choices.length}</strong><span>slots filled</span></div>
    </header>

    <section aria-labelledby="feat-slots-heading">
      <h3 id="feat-slots-heading">Your feat slots</h3>
      <div className="feat-slots">{choices.map((choice) => <article className={activeSlotIndex === choice.index ? "feat-slot-active" : undefined} key={choice.index}>
        <div className="feat-slot-heading"><strong>{choice.name}</strong><span>{choice.selected ? "Filled" : "Open"}</span></div>
        {choice.selected && <div className="selected-feat-summary">
          <strong>{choice.selected.name}</strong>
          <span className="feat-type">{choice.selected.type}</span>
          <p>{choice.selected.benefit}</p>
          {choice.selected.choice && <label>{choice.selected.choice.label}{choice.selected.choice.allowCustom
            ? <input aria-label={`${choice.selected.name} ${choice.selected.choice.label}`} value={selectedFeatChoices[choice.selected.id] ?? ""} maxLength={80} onChange={(event) => onFeatChoiceChange(choice.selected!.id, event.target.value)} placeholder={`Enter ${choice.selected.choice.label.toLowerCase()}`} />
            : <select aria-label={`${choice.selected.name} ${choice.selected.choice.label}`} value={selectedFeatChoices[choice.selected.id] ?? ""} onChange={(event) => onFeatChoiceChange(choice.selected!.id, event.target.value)}><option value="">Choose {choice.selected.choice.label.toLowerCase()}</option>{choice.selected.choice.options?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
          }</label>}
          {choice.checks.length > 0 && <ul className="checks">{choice.checks.map((check, index) => <li className={check.met ? "met" : "unmet"} key={index}>{check.met ? "✓" : "○"} {prerequisiteLabel(check.prerequisite, featNames)}</li>)}</ul>}
        </div>}
        {!choice.selected && <p className="feat-slot-empty">No feat selected yet.</p>}
        <div className="feat-slot-actions">
          <button type="button" aria-label={`${choice.selected ? "Replace" : "Choose"} ${choice.name}`} onClick={() => startChoosing(choice.index)}>{choice.selected ? "Replace feat" : "Choose feat"}</button>
          {choice.selected && <button type="button" className="secondary" aria-label={`Remove ${choice.name}`} onClick={() => onFeatChange(choice.index, "")}>Remove</button>}
        </div>
      </article>)}</div>
    </section>

    <section className="feat-catalog" aria-labelledby="feat-catalog-heading">
      <div className="feat-catalog-heading"><div><h3 id="feat-catalog-heading">{activeChoice ? `Choose a feat for ${activeChoice.name}` : "Feat catalog"}</h3><p>{visibleFeats.length} of {feats.length} feats shown</p></div>
        {activeChoice && <button type="button" className="secondary" onClick={() => setActiveSlotIndex(null)}>Cancel choosing</button>}
      </div>
      <div className="feat-filters">
        <label>Search feats<input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, benefit, or requirement" /></label>
        <label>Availability<select value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)}><option value="eligible">Eligible now</option><option value="all">All feats</option><option value="selected">Selected</option></select></label>
        <label>Category<select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All categories</option>{featTypes.map((featType) => <option value={featType} key={featType}>{featType}</option>)}</select></label>
      </div>
      {visibleFeats.length === 0 ? <p className="feat-empty">No feats match these filters.</p> : <><div className="feat-catalog-list">{visibleFeats.slice(0, visibleLimit).map((feat) => {
        const featPrerequisites = feat.prerequisites.filter((item) => item.type === "feat");
        const children = unlockedBy.get(feat.id) ?? [];
        const selected = selectedIds.has(feat.id);
        const eligible = (activeChoice ? activeEligibleIds : eligibleIds).has(feat.id);
        const selectedElsewhere = selectedFeatIds.some((id, index) => id === feat.id && index !== activeChoice?.index);
        const hasOpenSlot = choices.some((choice) => !selectedFeatIds[choice.index] && choice.eligibleFeatIds.includes(feat.id));
        const canChooseActive = Boolean(activeChoice && eligible && !selectedElsewhere);
        return <details className="feat-card" key={feat.id}>
          <summary>
            <span><strong>{feat.name}</strong><small>{feat.type}</small></span>
            <span className={`feat-status ${selected ? "selected" : eligible ? "eligible" : "locked"}`}>{selected ? "Selected" : eligible ? "Eligible" : "Locked"}</span>
          </summary>
          <div className="feat-card-body">
            <p>{feat.benefit}</p>
            <div className="feat-tree-links">
              <div><strong>Requires</strong>{feat.prerequisites.length ? <ul>{feat.prerequisites.map((item, index) => <li key={index}>{prerequisiteLabel(item, featNames)}</li>)}</ul> : <p>Nothing</p>}</div>
              <div><strong>Unlocks</strong>{children.length ? <ul>{children.map((child) => <li key={child.id}>{child.name}</li>)}</ul> : <p>No feats in the current catalog</p>}</div>
            </div>
            {featPrerequisites.length > 0 && <p className="feat-path">Tree path: {featPrerequisites.map((item) => item.type === "feat" ? featNames.get(item.id) ?? item.id : "").join(" + ")} → {feat.name}</p>}
            <div className="feat-card-actions"><a href={feat.source.url} target="_blank" rel="noreferrer">Rules source</a>{(activeChoice || !selected) && <button type="button" disabled={activeChoice ? !canChooseActive : !hasOpenSlot} onClick={() => chooseFeat(feat)}>{activeChoice ? canChooseActive ? `Choose for ${activeChoice.name}` : selectedElsewhere ? "Already selected" : "Requirements not met" : hasOpenSlot ? "Add to open slot" : eligible ? "Choose a slot above" : "Requirements not met"}</button>}</div>
          </div>
        </details>;
      })}</div>{visibleLimit < visibleFeats.length && <button className="feat-show-more" type="button" onClick={() => setVisibleLimit((current) => current + 40)}>Show 40 more feats</button>}</>}
    </section>
  </section>;
}
