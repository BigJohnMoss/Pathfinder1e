import { useState } from "react";

type ProgressionFeature = {
  id: string;
  name: string;
  summary: string;
  level: number;
  choiceRequired?: boolean;
};

export function LevelProgression({
  currentLevel,
  selectedLevel,
  features,
  selectedOptions,
  suppressFeatureDetails = false,
  onSelectLevel,
  onReviewSection
}: {
  currentLevel: number;
  selectedLevel: number;
  features: ProgressionFeature[];
  selectedOptions: Record<string, string>;
  suppressFeatureDetails?: boolean;
  onSelectLevel: (level: number) => void;
  onReviewSection: (section: "overview" | "skills" | "feats" | "features" | "spells") => void;
}) {
  const levels = Array.from({ length: 20 }, (_, index) => index + 1);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const visibleLevels = showAllLevels ? levels : levels.filter(level =>
    level === selectedLevel || level === currentLevel || level === Math.min(20, currentLevel + 1) ||
    features.some(feature => feature.level === level && feature.choiceRequired && level <= currentLevel && !selectedOptions[feature.id])
  );
  const selectedFeatures = features.filter((feature) => feature.level === selectedLevel);
  const requiredFeatures = selectedFeatures.filter((feature) => feature.choiceRequired);
  const unresolvedFeatures = requiredFeatures.filter((feature) => !selectedOptions[feature.id]);
  const selectedState = selectedLevel < currentLevel
    ? "Completed level"
    : selectedLevel === currentLevel
      ? unresolvedFeatures.length > 0 ? "Current level · choices to review" : "Current level"
      : "Upcoming level";

  return <details className="level-progression sidebar-collapsible" aria-label="Character progression" open>
    <summary>Levels 1–20</summary>
    <div className="sidebar-collapsible-content">
    <div className="sidebar-section-heading">
      <p className="eyebrow">PROGRESSION</p>
      <h2 id="level-progression-heading">Levels 1–20</h2>
      <p>Review the current level, the next level, and any unresolved choices. Expand the full timeline when needed.</p>
    </div>
    <ol className="level-track" aria-label="Character advancement steps">
      {visibleLevels.map((level) => {
        const levelFeatures = features.filter((feature) => feature.level === level);
        const needsChoice = levelFeatures.some((feature) => feature.choiceRequired && !selectedOptions[feature.id]);
        const state = level < currentLevel ? "complete" : level === currentLevel ? needsChoice ? "attention" : "current" : "upcoming";
        const summary = levelFeatures.length > 0
          ? `${levelFeatures.length} class feature${levelFeatures.length === 1 ? "" : "s"}`
          : level <= currentLevel ? "Core progression" : "Not yet reached";
        return <li key={level}>
          <button
            type="button"
            className={`level-step level-${state}`}
            aria-label={`Advancement step ${level}: ${summary}; ${state === "attention" ? "required choices to review" : state}`}
            aria-current={level === currentLevel ? "step" : undefined}
            aria-pressed={selectedLevel === level}
            onClick={() => onSelectLevel(level)}
          >
            <span className="level-number">{level}</span>
            <span className="level-step-copy">
              <strong>Level {level}</strong>
              <small>{summary}</small>
            </span>
            <span className="level-status" aria-label={state === "attention" ? "Required choices to review" : state}>
              {state === "complete" ? "✓" : state === "attention" ? "!" : state === "current" ? "●" : "○"}
            </span>
          </button>
        </li>;
      })}
    </ol>
    <button type="button" className="level-track-toggle" aria-expanded={showAllLevels} onClick={() => setShowAllLevels(current => !current)}>
      {showAllLevels ? "Show relevant levels" : "View all 20 levels"}
    </button>
    <article className="level-detail" aria-live="polite">
      <p className="eyebrow">LEVEL {selectedLevel}</p>
      <h3>{selectedState}</h3>
      {selectedFeatures.length > 0 && !suppressFeatureDetails ? <ul>{selectedFeatures.map((feature) => <li key={feature.id}>
        <strong>{feature.name}</strong>
        <span>{feature.summary}</span>
        {feature.choiceRequired && <small>{selectedOptions[feature.id] ? "Choice recorded" : "Choice requires review"}</small>}
      </li>)}</ul> : <p>{selectedFeatures.length > 0 ? `${selectedFeatures.length} class feature${selectedFeatures.length === 1 ? " is" : "s are"} shown in the Features workspace.` : "No selectable class features are listed for this level. Core statistics may still improve."}</p>}
      <div className="level-detail-actions">
        <button type="button" onClick={() => onReviewSection("overview")}>Basic info</button>
        <button type="button" onClick={() => onReviewSection("skills")}>Skills</button>
        <button type="button" onClick={() => onReviewSection("feats")}>Feats</button>
        {selectedFeatures.length > 0 && <button type="button" onClick={() => onReviewSection("features")}>Features</button>}
        <button type="button" onClick={() => onReviewSection("spells")}>Spells</button>
      </div>
    </article>
    </div>
  </details>;
}
