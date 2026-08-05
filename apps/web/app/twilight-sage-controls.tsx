"use client";

import { useState } from "react";
import { rollDice } from "../../../packages/engine/src/index.js";
import type { ActiveEffect } from "../../../packages/types/src/index.js";
import type { DailyResource } from "./class-features";

const barrierEffectName = "Twilight Barrier";
const deathReleaseEffectName = "Death's Release spirit";

export function TwilightSageControls({ characterLevel, arcanistLevel, charismaModifier, reservoirPoints, reservoirMaximum, onReservoirPointsChange, barrierUses, transferResource, activeEffects, temporaryHitPoints, onTemporaryHitPointsChange, onAddEffect, onRemoveEffectByName }: {
  characterLevel: number;
  arcanistLevel: number;
  charismaModifier: number;
  reservoirPoints: number;
  reservoirMaximum: number;
  onReservoirPointsChange: (points: number) => void;
  barrierUses?: DailyResource;
  transferResource?: DailyResource;
  activeEffects: ActiveEffect[];
  temporaryHitPoints: number;
  onTemporaryHitPointsChange: (points: number) => void;
  onAddEffect: (effect: ActiveEffect) => void;
  onRemoveEffectByName: (name: string) => void;
}) {
  const [consumeTargetHitDice, setConsumeTargetHitDice] = useState(2);
  const [consumeLiving, setConsumeLiving] = useState(false);
  const [consumeHelpless, setConsumeHelpless] = useState(false);
  const [consumeBelowZero, setConsumeBelowZero] = useState(false);
  const [consumeResult, setConsumeResult] = useState("");
  const [barrierResult, setBarrierResult] = useState("");
  const [recipientHitDice, setRecipientHitDice] = useState(1);
  const [donorHitDice, setDonorHitDice] = useState(1);
  const [recipientRecentAndEligible, setRecipientRecentAndEligible] = useState(false);
  const [donorWillingOrUnconscious, setDonorWillingOrUnconscious] = useState(false);
  const [donorLivingAndInRange, setDonorLivingAndInRange] = useState(false);
  const [donorWillDie, setDonorWillDie] = useState(false);
  const [transferResult, setTransferResult] = useState("");
  const [characterDied, setCharacterDied] = useState(false);
  const [characterBecameUndead, setCharacterBecameUndead] = useState(false);

  const consumeEligible = consumeLiving && consumeHelpless && consumeBelowZero && consumeTargetHitDice >= 2;
  const consumeRecovery = consumeTargetHitDice >= characterLevel ? 2 : consumeTargetHitDice * 2 >= characterLevel ? 1 : 0;
  const useConsumeLife = () => {
    if (!consumeEligible) return;
    const recovered = Math.min(consumeRecovery, Math.max(0, reservoirMaximum - reservoirPoints));
    onReservoirPointsChange(reservoirPoints + recovered);
    setConsumeResult(`Eligible target consumed as a full-round death effect. ${recovered} reservoir point${recovered === 1 ? "" : "s"} recovered${recovered < consumeRecovery ? "; excess recovery was lost" : ""}.`);
  };

  const barrierActivationCount = barrierUses?.used ?? 0;
  const barrierCost = barrierActivationCount + 1;
  const barrierTemporaryHitPoints = Math.max(0, arcanistLevel + charismaModifier);
  const activateBarrier = () => {
    if (!barrierUses || reservoirPoints < barrierCost || barrierTemporaryHitPoints <= 0) return;
    onReservoirPointsChange(reservoirPoints - barrierCost);
    barrierUses.onUsedChange(barrierActivationCount + 1);
    onTemporaryHitPointsChange(barrierTemporaryHitPoints);
    onRemoveEffectByName(barrierEffectName);
    onAddEffect({
      id: `twilight-barrier-${Date.now()}-${Math.random()}`,
      name: barrierEffectName,
      target: "self",
      bonus: 0,
      description: `${barrierTemporaryHitPoints} temporary hit points. If an attack removes the last one, the attacker takes ${barrierTemporaryHitPoints} negative energy damage.`,
      roundsRemaining: Math.min(999, arcanistLevel * 10),
      temporaryHitPointsGranted: barrierTemporaryHitPoints,
      expiresWhenTemporaryHitPointsLost: true,
      retaliationDamage: barrierTemporaryHitPoints,
      retaliationDamageType: "negative energy damage",
    });
    setBarrierResult(`${barrierTemporaryHitPoints} temporary hit points gained for ${arcanistLevel} minute${arcanistLevel === 1 ? "" : "s"}; activation ${barrierActivationCount + 1} cost ${barrierCost} reservoir point${barrierCost === 1 ? "" : "s"}.`);
  };

  const transferRemaining = transferResource?.maximum === null ? 0 : Math.max(0, (transferResource?.maximum ?? 0) - (transferResource?.used ?? 0));
  const transferEligible = recipientRecentAndEligible && donorWillingOrUnconscious && donorLivingAndInRange && donorWillDie && donorHitDice >= recipientHitDice;
  const useTwilightTransfer = () => {
    if (!transferResource || !transferEligible || transferRemaining <= 0 || reservoirPoints < 1) return;
    transferResource.onUsedChange(transferResource.used + 1);
    onReservoirPointsChange(reservoirPoints - 1);
    const casterLevelBonus = Math.min(arcanistLevel, 25);
    const healing = rollDice(5, 8, casterLevelBonus);
    setTransferResult(`The donor dies and the recipient receives breath of life: ${healing.rolls.join(" + ")} + ${casterLevelBonus} = ${healing.total} hit points restored.`);
  };

  const deathReleaseActive = activeEffects.some((effect) => effect.deathRelease);
  const enterDeathRelease = () => {
    if (arcanistLevel < 20 || !characterDied || characterBecameUndead || reservoirPoints <= 0) return;
    onRemoveEffectByName(deathReleaseEffectName);
    onAddEffect({
      id: `death-release-${Date.now()}-${Math.random()}`,
      name: deathReleaseEffectName,
      target: "self",
      bonus: 0,
      description: "Ephemeral spirit at the corpse. Cast a legal spell this round for 1 + spell level reservoir points or disappear.",
      roundsRemaining: 1,
      deathRelease: true,
    });
  };

  return <section className="twilight-sage-controls" aria-labelledby="twilight-sage-controls-heading">
    <div><p className="eyebrow">TWILIGHT SAGE</p><h3 id="twilight-sage-controls-heading">Life, death, and barrier controls</h3><p>Confirm targets here before the app spends resources or applies an effect.</p></div>
    <article>
      <h4>Consume Life</h4>
      <label>Target Hit Dice<input aria-label="Consume Life target Hit Dice" type="number" min="0" max="999" value={consumeTargetHitDice} onChange={event => setConsumeTargetHitDice(Math.max(0, Math.min(999, Number(event.target.value) || 0)))} /></label>
      <label><input type="checkbox" checked={consumeLiving} onChange={event => setConsumeLiving(event.target.checked)} />Living creature</label>
      <label><input type="checkbox" checked={consumeHelpless} onChange={event => setConsumeHelpless(event.target.checked)} />Helpless</label>
      <label><input type="checkbox" checked={consumeBelowZero} onChange={event => setConsumeBelowZero(event.target.checked)} />Below 0 hit points</label>
      <output aria-label="Consume Life eligibility">{consumeEligible ? `Eligible · ${consumeRecovery} reservoir point${consumeRecovery === 1 ? "" : "s"}` : "Requires a living, helpless target below 0 HP with at least 2 Hit Dice"}</output>
      <button type="button" disabled={!consumeEligible} onClick={useConsumeLife}>Consume life</button>
      {consumeResult && <output aria-label="Consume Life result">{consumeResult}</output>}
    </article>
    <article>
      <h4>Twilight Barrier</h4>
      <p>{barrierTemporaryHitPoints} temporary HP · next activation costs {barrierCost} reservoir point{barrierCost === 1 ? "" : "s"}.</p>
      <button type="button" disabled={!barrierUses || reservoirPoints < barrierCost || barrierTemporaryHitPoints <= 0} onClick={activateBarrier}>Activate Twilight Barrier</button>
      {temporaryHitPoints > 0 && activeEffects.some((effect) => effect.name === barrierEffectName) && <small>Barrier active with {temporaryHitPoints} temporary HP.</small>}
      {barrierResult && <output aria-label="Twilight Barrier result">{barrierResult}</output>}
    </article>
    {arcanistLevel >= 11 && <article>
      <h4>Twilight Transfer</h4>
      <label>Recipient Hit Dice<input aria-label="Twilight Transfer recipient Hit Dice" type="number" min="1" max="999" value={recipientHitDice} onChange={event => setRecipientHitDice(Math.max(1, Math.min(999, Number(event.target.value) || 1)))} /></label>
      <label>Donor Hit Dice<input aria-label="Twilight Transfer donor Hit Dice" type="number" min="1" max="999" value={donorHitDice} onChange={event => setDonorHitDice(Math.max(1, Math.min(999, Number(event.target.value) || 1)))} /></label>
      <label><input type="checkbox" checked={recipientRecentAndEligible} onChange={event => setRecipientRecentAndEligible(event.target.checked)} />Recipient is touched, died within the past round, and can receive breath of life</label>
      <label><input type="checkbox" checked={donorWillingOrUnconscious} onChange={event => setDonorWillingOrUnconscious(event.target.checked)} />Donor is willing or unconscious</label>
      <label><input type="checkbox" checked={donorLivingAndInRange} onChange={event => setDonorLivingAndInRange(event.target.checked)} />Donor is living and within 300 feet</label>
      <label><input type="checkbox" checked={donorWillDie} onChange={event => setDonorWillDie(event.target.checked)} />Donor will actually die from this death effect</label>
      <output aria-label="Twilight Transfer eligibility">{transferEligible ? "Targets eligible" : donorHitDice < recipientHitDice ? "Donor must have at least as many Hit Dice as the recipient" : "Confirm every recipient and donor requirement"}</output>
      <button type="button" disabled={!transferResource || !transferEligible || transferRemaining <= 0 || reservoirPoints < 1} onClick={useTwilightTransfer}>Use Twilight Transfer</button>
      {transferResult && <output aria-label="Twilight Transfer result">{transferResult}</output>}
    </article>}
    {arcanistLevel >= 20 && <article>
      <h4>Death&apos;s Release</h4>
      <label><input type="checkbox" checked={characterDied} onChange={event => setCharacterDied(event.target.checked)} />Character died</label>
      <label><input type="checkbox" checked={characterBecameUndead} onChange={event => setCharacterBecameUndead(event.target.checked)} />Character became undead</label>
      <button type="button" disabled={deathReleaseActive || !characterDied || characterBecameUndead || reservoirPoints <= 0} onClick={enterDeathRelease}>Enter Death&apos;s Release</button>
      {deathReleaseActive && <><output aria-label="Death's Release status">Spirit active. Cast a legal spell this round or the spirit disappears.</output><button type="button" className="secondary-button" onClick={() => onRemoveEffectByName(deathReleaseEffectName)}>End Death&apos;s Release</button></>}
    </article>}
  </section>;
}
