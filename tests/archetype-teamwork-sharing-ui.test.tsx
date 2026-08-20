import test, { before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import archetypes from "../generated/pf1e-archetypes.mjs";
import data from "../generated/pf1e-data.mjs";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { ActiveEffect } from "../packages/types/src/index.js";

let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;
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
});

test("level 18 Tactical Leader grants two selected teamwork feats with scaled duration", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "inquisitor-tactical-leader");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "inquisitor");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  let used = 0;
  render(<ClassFeatures
    level={18}
    className={applied.name}
    features={featuresThroughLevel(applied, 18)}
    classLevels={{ inquisitor: 18 }}
    selectedFeats={[{ id: "outflank", name: "Outflank", type: "teamwork" }, { id: "precise-strike", name: "Precise Strike", type: "teamwork" }]}
    dailyResources={[{ id: "archetype-inquisitor-tactical-leader-tactician-ex-3", label: "Tactician", unit: "use", maximum: 5, used, onUsedChange: (next) => { used = next; } }]}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  assert.equal((screen.getByLabelText("Grant Tactician teamwork feat 1") as HTMLSelectElement).value, "outflank");
  assert.equal((screen.getByLabelText("Grant Tactician teamwork feat 2") as HTMLSelectElement).value, "precise-strike");
  fireEvent.click(screen.getByLabelText("Grant Tactician Recipients can see and hear you, and you remain conscious"));
  fireEvent.click(screen.getByRole("button", { name: "Grant Tactician" }));
  assert.equal(used, 1);
  assert.equal(effects[0].roundsRemaining, 12);
  assert.match(effects[0].description ?? "", /Outflank, Precise Strike/);
  assert.match(screen.getByLabelText("Grant Tactician result").textContent ?? "", /swift action/);
  cleanup();
});

test("Holy Guide requires the non-evil recipient confirmation", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "paladin-holy-guide");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "paladin");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  render(<ClassFeatures level={6} className={applied.name} features={featuresThroughLevel(applied, 6)} classLevels={{ paladin: 6 }} selectedFeats={[{ id: "outflank", name: "Outflank", type: "teamwork" }]} dailyResources={[{ id: "smiteEvil", label: "Smite Evil", unit: "use", maximum: 2, used: 0, onUsedChange: () => {} }]} />);
  const button = screen.getByRole("button", { name: "Grant Teamwork Feat" });
  assert.equal(button.hasAttribute("disabled"), true);
  fireEvent.click(screen.getByLabelText("Grant Teamwork Feat All recipients are non-evil allies"));
  fireEvent.click(screen.getByLabelText("Grant Teamwork Feat Recipients can see and hear you, and you remain conscious"));
  assert.equal(button.hasAttribute("disabled"), false);
  cleanup();
});

test("Majordomo Delegate exposes only legal modes and limits the daily mode to one feat", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "investigator-majordomo");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "investigator");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={16} className={applied.name} features={featuresThroughLevel(applied, 16)} classLevels={{ investigator: 16 }} selectedFeats={[{ id: "outflank", name: "Outflank", type: "teamwork" }, { id: "precise-strike", name: "Precise Strike", type: "teamwork" }, { id: "back-to-back", name: "Back to Back", type: "teamwork" }]} dailyResources={[{ id: "archetype-investigator-majordomo-delegate-ex-1", label: "Delegate", unit: "use", maximum: 6, used: 0, onUsedChange: () => {} }]} onAddEffect={(effect) => effects.push(effect)} />);
  assert.equal(screen.getAllByLabelText(/Grant Delegate teamwork feat/).length, 3);
  fireEvent.change(screen.getByLabelText("Grant Delegate mode"), { target: { value: "until-refresh" } });
  assert.equal(screen.getAllByLabelText(/Grant Delegate teamwork feat/).length, 1);
  assert.match(screen.getByText("Activation: 1-minute action.").textContent ?? "", /1-minute/);
  fireEvent.click(screen.getByRole("button", { name: "Grant Delegate" }));
  assert.equal(effects[0].roundsRemaining, 999);
  assert.match(screen.getByLabelText("Grant Delegate result").textContent ?? "", /1-minute action/);
  cleanup();
});

test("automatic companion sharing lists the character's selected teamwork feats", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "inquisitor-sacred-huntsmaster");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "inquisitor");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  render(<ClassFeatures level={3} className={applied.name} features={featuresThroughLevel(applied, 3)} classLevels={{ inquisitor: 3 }} selectedFeats={[{ id: "outflank", name: "Outflank", type: "teamwork" }, { id: "power-attack", name: "Power Attack", type: "combat" }]} />);
  const sharing = screen.getByRole("region", { name: "Hunter Tactics (Ex) shared teamwork feats" });
  assert.match(sharing.textContent ?? "", /Shared with Animal companion/);
  assert.match(sharing.textContent ?? "", /Outflank/);
  assert.doesNotMatch(sharing.textContent ?? "", /Power Attack/);
  assert.match(sharing.textContent ?? "", /does not need to meet their prerequisites/);
  cleanup();
});

test("Strategist Drill Instructor enforces visibility and records the chosen ally count", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "cavalier-strategist");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "cavalier");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  let used = 0;
  render(<ClassFeatures level={6} className={applied.name} features={featuresThroughLevel(applied, 6)} classLevels={{ cavalier: 6 }} selectedFeats={[{ id: "outflank", name: "Outflank", type: "teamwork" }]} dailyResources={[{ id: "challenges", label: "Challenge", unit: "use", maximum: 3, used, onUsedChange: (next) => { used = next; } }, { id: "tactician", label: "Strategist Tactician", unit: "use", maximum: 2, used: 0, onUsedChange: () => {} }]} onAddEffect={(effect) => effects.push(effect)} />);
  const button = screen.getByRole("button", { name: "Grant Drill Instructor" });
  assert.equal(button.hasAttribute("disabled"), true);
  fireEvent.change(screen.getByLabelText("Grant Drill Instructor recipient"), { target: { value: "4" } });
  fireEvent.click(screen.getByLabelText("Grant Drill Instructor Recipients can see and hear you, and you remain conscious"));
  fireEvent.click(button);
  assert.equal(used, 1);
  assert.equal(effects[0].roundsRemaining, 130);
  assert.match(effects[0].description ?? "", /Recipients: 4 allies/);
  assert.match(screen.getByLabelText("Grant Drill Instructor result").textContent ?? "", /4 allies.*130 rounds.*10-minute action/);
  cleanup();
});

test("Pack Rager selects its level-scaled rage feats and displays the current range", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "barbarian-pack-rager");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "barbarian");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  const effects: ActiveEffect[] = [];
  render(<ClassFeatures level={19} className={applied.name} features={featuresThroughLevel(applied, 19)} classLevels={{ barbarian: 19 }} selectedFeats={[{ id: "outflank", name: "Outflank", type: "teamwork" }, { id: "precise-strike", name: "Precise Strike", type: "teamwork" }, { id: "back-to-back", name: "Back to Back", type: "teamwork" }]} onAddEffect={(effect) => effects.push(effect)} />);
  assert.equal(screen.getAllByLabelText(/Grant Raging Tactician teamwork feat/).length, 3);
  assert.match(screen.getByText("Range: 60 feet.").textContent ?? "", /60 feet/);
  fireEvent.change(screen.getByLabelText("Grant Raging Tactician rounds"), { target: { value: "12" } });
  fireEvent.click(screen.getByLabelText("Grant Raging Tactician Recipients can see and hear you, and you remain conscious"));
  fireEvent.click(screen.getByLabelText("Grant Raging Tactician Rage is active"));
  fireEvent.click(screen.getByRole("button", { name: "Grant Raging Tactician" }));
  assert.equal(effects[0].roundsRemaining, 12);
  assert.match(effects[0].description ?? "", /Range: 60 feet/);
  cleanup();
});

test("Holy Tactician switches Battlefield Presence from a standard grant to a swift change", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "paladin-holy-tactician");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "paladin");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  render(<ClassFeatures level={3} className={applied.name} features={featuresThroughLevel(applied, 3)} classLevels={{ paladin: 3 }} selectedFeats={[{ id: "outflank", name: "Outflank", type: "teamwork" }]} />);
  fireEvent.click(screen.getByLabelText("Grant Battlefield Presence Recipients can see and hear you, and you remain conscious"));
  fireEvent.click(screen.getByLabelText("Grant Battlefield Presence You are not flat-footed or unconscious"));
  assert.match(screen.getByText("Activation: standard action.").textContent ?? "", /standard/);
  fireEvent.change(screen.getByLabelText("Grant Battlefield Presence mode"), { target: { value: "change" } });
  assert.match(screen.getByText("Activation: swift action.").textContent ?? "", /swift/);
  cleanup();
});
