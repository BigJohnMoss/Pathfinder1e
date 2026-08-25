import test, { before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { ActiveEffect } from "../packages/types/src/index";

let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;
let ActivePlayPanel: typeof import("../apps/web/app/active-play-panel").ActivePlayPanel;
let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let cleanup: typeof import("@testing-library/react").cleanup;

before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, fireEvent, cleanup } = await import("@testing-library/react"));
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
  ActivePlayPanel = (await import("../apps/web/app/active-play-panel")).ActivePlayPanel;
});

const selectedClass = (classId: string, archetypeId: string) => applyArchetype(
  data.classes.find((candidate: { id: string }) => candidate.id === classId),
  archetypes.find((candidate: { id: string }) => candidate.id === archetypeId),
  data.classes,
  data.spells,
);

const resource = (id: string, label: string, maximum: number, onUsedChange: (used: number) => void) => [{ id, label, unit: "round", maximum, used: 0, onUsedChange }];

test("Ocean's Echo exposes all songs with level-scaled effects and swift activation", () => {
  const oracle = selectedClass("oracle", "oracle-ocean-s-echo");
  const added: ActiveEffect[] = [];
  const spent: number[] = [];
  render(<ClassFeatures
    level={17}
    className={oracle.name}
    features={featuresThroughLevel(oracle, 17)}
    classLevels={{ oracle: 17 }}
    dailyResources={resource("inspiringSongRounds", "Inspiring Song", 21, (used) => spent.push(used))}
    onAddEffect={(effect) => added.push(effect)}
  />);

  const region = screen.getByRole("region", { name: "Inspiring Song (Ex) performance rules" });
  for (const name of ["Inspire Courage", "Inspire Competence", "Inspire Heroics"]) assert.match(region.textContent ?? "", new RegExp(name));
  const courage = screen.getByRole("button", { name: "Begin Inspire Courage" });
  assert.match(courage.closest("div")?.textContent ?? "", /swift action/);
  fireEvent.click(courage);
  assert.deepEqual(spent, [1]);
  assert.deepEqual(added.map(({ target, bonus }) => ({ target, bonus })), [
    { target: "attackRolls", bonus: 4 },
    { target: "weaponDamageRolls", bonus: 4 },
    { target: "savingThrowsAgainstCharmAndFear", bonus: 4 },
  ]);
  cleanup();
});

test("Wyrm Singer exposes the exact level-20 rage tier and Wyrm Saga", () => {
  const skald = selectedClass("skald", "skald-wyrm-singer");
  const added: ActiveEffect[] = [];
  const spent: number[] = [];
  render(<ClassFeatures
    level={20}
    className={skald.name}
    features={featuresThroughLevel(skald, 20)}
    classLevels={{ skald: 20 }}
    dailyResources={resource("ragingSongRounds", "Raging Song", 44, (used) => spent.push(used))}
    onAddEffect={(effect) => added.push(effect)}
  />);

  const mode = screen.getByLabelText("Begin Draconic Rage mode") as HTMLSelectElement;
  assert.equal(mode.value, "level-20");
  assert.equal(mode.options.length, 1);
  fireEvent.click(screen.getByRole("button", { name: "Begin Draconic Rage" }));
  assert.deepEqual(added.filter((effect) => effect.name.startsWith("Draconic Rage —")).map(({ target, bonus }) => ({ target, bonus })), [
    { target: "meleeAttackRolls", bonus: 4 },
    { target: "meleeDamageRolls", bonus: 4 },
    { target: "savingThrowsAgainstParalysisAndSleep", bonus: 7 },
    { target: "armorClass", bonus: -1 },
  ]);
  const saga = screen.getByRole("button", { name: "Begin Wyrm Saga" });
  assert.equal(saga.hasAttribute("disabled"), false);
  assert.match(saga.closest("div")?.textContent ?? "", /One ally within 60 feet/);
  fireEvent.click(saga);
  assert.deepEqual(spent, [1, 1]);
  cleanup();
});

test("melee and weapon-only effects modify only eligible equipped attacks", () => {
  render(<ActivePlayPanel
    maximumHitPoints={10}
    currentHitPoints={10}
    temporaryHitPoints={0}
    attacks={[
      { id: "longsword", name: "Longsword", attack: 1, damage: "1d8", damageBonus: 1, critical: "19–20/×2" },
      { id: "shortbow", name: "Shortbow", attack: 2, damage: "1d6", damageBonus: 0, critical: "×3", range: 60 },
    ]}
    checks={[]}
    skills={[]}
    effects={[
      { id: "melee-attack", name: "Melee attack", target: "meleeAttackRolls", bonus: 4, roundsRemaining: 1 },
      { id: "melee-damage", name: "Melee damage", target: "meleeDamageRolls", bonus: 4, roundsRemaining: 1 },
      { id: "weapon-damage", name: "Weapon damage", target: "weaponDamageRolls", bonus: 2, roundsRemaining: 1 },
    ]}
    onCurrentHitPointsChange={() => {}}
    onTemporaryHitPointsChange={() => {}}
    onEffectsChange={() => {}}
  />);
  assert.match(screen.getByText("Longsword").closest("article")?.textContent ?? "", /Attack \+5 · Damage 1d8 \+7/);
  assert.match(screen.getByText("Shortbow").closest("article")?.textContent ?? "", /Attack \+2 · Damage 1d6 \+2/);
  cleanup();
});
