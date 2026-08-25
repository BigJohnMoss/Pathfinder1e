import { animalCompanionProgression, drakeCompanionProgression, eidolonProgression, familiarProgression, phantomProgression } from "../../../packages/engine/src/index.js";
import type { CharacterDraftV1 } from "../../../packages/types/src/index.js";

type CompanionState = NonNullable<CharacterDraftV1["companions"]>[string];
export type CompanionDescriptor = { id: string; kind: CompanionState["kind"]; optionId: string; label: string; effectiveLevel: number; bonusHitPoints?: number; bonusSkillRanks?: number; drakePowerLevels?: number[]; drakeSizeLevels?: number[]; rules?: string[] };

export function CompanionManager({ companions, states, masterHitPoints, onChange }: { companions: CompanionDescriptor[]; states: Record<string, CompanionState>; masterHitPoints: number; onChange: (states: Record<string, CompanionState>) => void }) {
  if (!companions.length) return null;
  const update = (descriptor: CompanionDescriptor, patch: Partial<CompanionState>) => {
    const current = states[descriptor.id];
    onChange({ ...states, [descriptor.id]: {
      kind: descriptor.kind,
      optionId: descriptor.optionId,
      name: patch.name ?? current?.name ?? "",
      currentHitPoints: patch.currentHitPoints !== undefined ? patch.currentHitPoints : current?.currentHitPoints ?? null,
      skillRanks: patch.skillRanks ?? current?.skillRanks ?? {},
      featIds: patch.featIds ?? current?.featIds ?? [],
    } });
  };
  return <section className="companion-manager" aria-labelledby="companion-manager-title">
    <div className="companion-manager-heading"><div><p className="eyebrow">Companions</p><h2 id="companion-manager-title">Companion sheets</h2></div><span>{companions.length} active</span></div>
    <p>Track each bonded creature here. Statistics advance automatically with its effective class level.</p>
    <div className="companion-list">{companions.map(descriptor => {
      const state = states[descriptor.id];
      const animal = descriptor.kind === "animal" || descriptor.kind === "mount" ? animalCompanionProgression(descriptor.effectiveLevel) : null;
      const familiar = descriptor.kind === "familiar" ? familiarProgression(descriptor.effectiveLevel, masterHitPoints) : null;
      const eidolon = descriptor.kind === "eidolon" ? eidolonProgression(descriptor.effectiveLevel) : null;
      const drake = descriptor.kind === "drake" ? drakeCompanionProgression(descriptor.effectiveLevel, { powerLevels: descriptor.drakePowerLevels, sizeLevels: descriptor.drakeSizeLevels }) : null;
      const phantom = descriptor.kind === "phantom" ? phantomProgression(descriptor.effectiveLevel, descriptor.optionId) : null;
      const suggestedHp = familiar ? familiar.hitPoints + (descriptor.bonusHitPoints ?? 0) : descriptor.bonusHitPoints ?? null;
      return <article className="companion-card" key={descriptor.id}>
        <header><div><strong>{descriptor.label}</strong><small>{descriptor.kind} · effective level {descriptor.effectiveLevel}</small></div></header>
        <div className="companion-fields">
          <label>Name<input value={state?.name ?? ""} placeholder={descriptor.label} onChange={event => update(descriptor, { name: event.target.value })} /></label>
          <label>Current HP<input type="number" min="0" inputMode="numeric" value={state?.currentHitPoints ?? ""} placeholder={suggestedHp === null ? "—" : String(suggestedHp)} onChange={event => update(descriptor, { currentHitPoints: event.target.value === "" ? null : Math.max(0, Math.min(9999, Number(event.target.value) || 0)) })} /></label>
        </div>
        {animal && <div className="companion-stats"><span><b>{animal.hitDice}</b> HD</span><span><b>+{animal.baseAttackBonus}</b> BAB</span><span><b>+{animal.naturalArmorBonus}</b> natural armour</span><span><b>{animal.feats}</b> feats</span><span><b>{animal.skillRanks + (descriptor.bonusSkillRanks ?? 0)}</b> skill ranks</span><span><b>{animal.bonusTricks}</b> bonus tricks</span>{Boolean(descriptor.bonusHitPoints) && <span><b>+{descriptor.bonusHitPoints}</b> favoured HP</span>}</div>}
        {familiar && <div className="companion-stats"><span><b>{familiar.hitPoints + (descriptor.bonusHitPoints ?? 0)}</b> max HP</span><span><b>+{familiar.naturalArmorAdjustment}</b> natural armour</span><span><b>{familiar.intelligence}</b> Intelligence</span>{Boolean(descriptor.bonusSkillRanks) && <span><b>+{descriptor.bonusSkillRanks}</b> bonus skill ranks</span>}</div>}
        {eidolon && <div className="companion-stats"><span><b>{eidolon.hitDice}</b> HD</span><span><b>+{eidolon.baseAttackBonus}</b> BAB</span><span><b>+{eidolon.armorBonus}</b> armour</span><span><b>{eidolon.feats}</b> feats</span><span><b>{eidolon.skillRanks + (descriptor.bonusSkillRanks ?? 0)}</b> skill ranks</span><span><b>{eidolon.maxAttacks}</b> max attacks</span>{Boolean(descriptor.bonusHitPoints) && <span><b>+{descriptor.bonusHitPoints}</b> favoured HP</span>}</div>}
        {drake && <div className="companion-stats"><span><b>{drake.hitDice}</b> d12 HD</span><span><b>+{drake.baseAttackBonus}</b> BAB</span><span><b>+{drake.baseSaveBonus}</b> saves</span><span><b>+{drake.naturalArmorBonus}</b> natural armour</span><span><b>{drake.feats}</b> feats</span><span><b>{drake.skillRanks}</b> skill ranks</span><span><b>{drake.drakePowers}</b> drake powers</span></div>}
        {phantom && <><div className="companion-stats"><span><b>{phantom.hitDice}</b> d10 HD</span><span><b>+{phantom.baseAttackBonus}</b> BAB</span><span><b>+{phantom.goodSaveBonus}</b> {phantom.focus?.goodSaves.join("/") ?? "good"} saves</span><span><b>+{phantom.badSaveBonus}</b> other save</span><span><b>+{phantom.armorBonus}</b> armour</span><span><b>2 × {phantom.slamDamage}</b> slams ({phantom.slamCritical})</span><span><b>{phantom.feats}</b> feats</span><span><b>{phantom.skillRanks}</b> free skill ranks</span></div><div className="companion-stats"><span><b>{phantom.abilityScores.strength}</b> Str</span><span><b>{phantom.abilityScores.dexterity}</b> Dex</span><span><b>{phantom.abilityScores.constitution}</b> Con</span><span><b>{phantom.abilityScores.intelligence}</b> Int</span><span><b>{phantom.abilityScores.wisdom}</b> Wis</span><span><b>{phantom.abilityScores.charisma}</b> Cha</span></div>{phantom.focus && <details open><summary>Emotional focus</summary><p><strong>Focus skills:</strong> {phantom.focus.skills.join(" and ")} each gain {phantom.hitDice} ranks.</p><ul>{phantom.focus.traits.map(trait => <li key={trait}>{trait}</li>)}{phantom.focus.abilities.map(ability => <li key={ability.name}><strong>{ability.name} (level {ability.minimumLevel}):</strong> {ability.summary}</li>)}</ul></details>}</>}
        {descriptor.rules?.length ? <details><summary>Companion rules</summary><ul>{descriptor.rules.map(rule => <li key={rule}>{rule}</li>)}</ul></details> : null}
        <details><summary>Level abilities</summary><ul>{(animal?.specialAbilities ?? familiar?.specialAbilities ?? drake?.specialAbilities ?? phantom?.specialAbilities ?? ["Link", "Share spells"]).map(ability => <li key={ability}>{ability}</li>)}</ul></details>
      </article>;
    })}</div>
  </section>;
}
