import { useEffect, useState } from "react";
import type { AbilityName } from "../../../packages/types/src/index.js";

const labels: Record<AbilityName, string> = { strength: "Strength", dexterity: "Dexterity", constitution: "Constitution", intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma" };
const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

export function AbilityEditor({ abilityNames, ancestryName, choiceAbility, choiceAmount, baseAbilities, abilities, modifiers, pointBuyBudget, pointBuySpent, abilityBoosts, onChoiceAbilityChange, onAbilityChange, onPointBuyBudgetChange, onAbilityBoostChange }: {
  abilityNames: AbilityName[];
  ancestryName: string;
  choiceAbility: AbilityName;
  choiceAmount: number;
  baseAbilities: Record<AbilityName, number>;
  abilities: Record<AbilityName, number>;
  modifiers: Record<AbilityName, number>;
  pointBuyBudget: 10 | 15 | 20 | 25;
  pointBuySpent: number;
  abilityBoosts: AbilityName[];
  onChoiceAbilityChange: (ability: AbilityName) => void;
  onAbilityChange: (ability: AbilityName, value: number) => void;
  onPointBuyBudgetChange: (budget: 10 | 15 | 20 | 25) => void;
  onAbilityBoostChange: (index: number, ability: AbilityName) => void;
}) {
  const remaining = pointBuyBudget - pointBuySpent;
  const [draftScores, setDraftScores] = useState<Record<AbilityName, string>>(() => Object.fromEntries(abilityNames.map((ability) => [ability, String(baseAbilities[ability])])) as Record<AbilityName, string>);
  useEffect(() => setDraftScores((current) => Object.fromEntries(abilityNames.map((ability) => [ability, current[ability] === "" ? "" : String(baseAbilities[ability])])) as Record<AbilityName, string>), [abilityNames, baseAbilities]);
  const editScore = (ability: AbilityName, rawValue: string) => {
    setDraftScores((current) => ({ ...current, [ability]: rawValue }));
    if (!/^\d{1,2}$/.test(rawValue)) return;
    const score = Number(rawValue);
    if (score >= 7 && score <= 18) onAbilityChange(ability, score);
  };
  const finishScore = (ability: AbilityName) => {
    const draft = draftScores[ability].trim();
    if (draft === "") return;
    const score = Number(draft);
    const normalized = Number.isFinite(score) ? Math.max(7, Math.min(18, score)) : baseAbilities[ability];
    setDraftScores((current) => ({ ...current, [ability]: String(normalized) }));
    if (normalized !== baseAbilities[ability]) onAbilityChange(ability, normalized);
  };
  return <article className="ability-panel">
    <div>
      <p className="eyebrow">ABILITY SCORES</p>
      <h2>{ancestryName} abilities</h2>
      <label className="point-buy-control">Point-buy budget
        <select value={pointBuyBudget} onChange={(event) => onPointBuyBudgetChange(Number(event.target.value) as 10 | 15 | 20 | 25)}>
          {[10, 15, 20, 25].map((budget) => <option key={budget} value={budget}>{budget} points</option>)}
        </select>
      </label>
      <p className={`hint${remaining < 0 ? " invalid" : ""}`} aria-live="polite">
        <strong>{pointBuySpent}</strong> of {pointBuyBudget} points spent · {remaining < 0 ? `${-remaining} overspent` : `${remaining} remaining`}.
      </p>
    </div>
    {choiceAmount > 0 && <label className="human-choice">{ancestryName} +{choiceAmount}
      <select value={choiceAbility} onChange={(event) => onChoiceAbilityChange(event.target.value as AbilityName)}>{abilityNames.map((ability) => <option key={ability} value={ability}>{labels[ability]}</option>)}</select>
    </label>}
    {abilityBoosts.map((selected, index) => <label className="human-choice" key={index}>Level {(index + 1) * 4} increase
      <select aria-label={`Level ${(index + 1) * 4} ability increase`} value={selected} onChange={(event) => onAbilityBoostChange(index, event.target.value as AbilityName)}>{abilityNames.map((ability) => <option key={ability} value={ability}>{labels[ability]}</option>)}</select>
    </label>)}
    <div className="ability-grid">{abilityNames.map((ability) => <label key={ability}>
      <span>{labels[ability]}</span>
      <input aria-label={`${labels[ability]} base score`} type="number" inputMode="numeric" min="7" max="18" value={draftScores[ability]} onFocus={(event) => event.currentTarget.select()} onChange={(event) => editScore(ability, event.target.value)} onBlur={() => finishScore(ability)} />
      <strong>{abilities[ability]} <small>{signed(modifiers[ability])}</small></strong>
    </label>)}</div>
  </article>;
}
