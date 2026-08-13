import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { JSDOM } from "jsdom";
import { applyArchetype, featuresThroughLevel } from "../packages/engine/src/index.js";
import type { ActiveEffect, CharacterArchetype, CharacterClass } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let userEvent: typeof import("@testing-library/user-event").default;
let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;
let ActivePlayPanel: typeof import("../apps/web/app/active-play-panel").ActivePlayPanel;

const monk = JSON.parse(readFileSync(new URL("../packages/data/src/classes/monk.json", import.meta.url), "utf8")) as CharacterClass;
const sohei = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/monk-sohei.json", import.meta.url), "utf8")) as CharacterArchetype;
const magus = JSON.parse(readFileSync(new URL("../packages/data/src/classes/magus.json", import.meta.url), "utf8")) as CharacterClass;
const spireDefender = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/magus-spire-defender.json", import.meta.url), "utf8")) as CharacterArchetype;
const bard = JSON.parse(readFileSync(new URL("../packages/data/src/classes/bard.json", import.meta.url), "utf8")) as CharacterClass;
const sorrowsoul = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/bard-sorrowsoul.json", import.meta.url), "utf8")) as CharacterArchetype;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
  ActivePlayPanel = (await import("../apps/web/app/active-play-panel")).ActivePlayPanel;
});

test("skill-specific timed effects preserve the selected skill", async () => {
  const effects: ActiveEffect[] = [];
  const applied = applyArchetype(magus, spireDefender);
  render(<ClassFeatures
    level={19}
    className={applied.name}
    features={featuresThroughLevel(applied, 19)}
    classLevels={{ magus: 19 }}
    dailyResources={[{ id: "arcanePool", label: "Magus Arcane Pool", unit: "point", maximum: 10, used: 0, onUsedChange: () => {} }]}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("Activate Arcane Augmentation affected skill"), "Stealth");
  await user.click(screen.getByRole("button", { name: "Activate Arcane Augmentation" }));
  assert.deepEqual(effects.map(({ target, bonus, roundsRemaining, skillIds }) => ({ target, bonus, roundsRemaining, skillIds })), [
    { target: "skillChecks", bonus: 10, roundsRemaining: 10, skillIds: ["Stealth"] },
  ]);
});

test.afterEach(() => cleanup());

test("timed effect activation spends ki and applies every scaled target", async () => {
  const spent: number[] = [];
  const effects: ActiveEffect[] = [];
  const applied = applyArchetype(monk, sohei);
  render(<ClassFeatures
    level={20}
    className={applied.name}
    features={featuresThroughLevel(applied, 20)}
    classLevels={{ monk: 20 }}
    dailyResources={[{ id: "kiPool", label: "Monk Ki Pool", unit: "point", maximum: 15, used: 0, onUsedChange: (used) => spent.push(used) }]}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Activate Ki Weapon" }));
  assert.deepEqual(spent, [1]);
  assert.deepEqual(effects.map(({ target, bonus, roundsRemaining }) => ({ target, bonus, roundsRemaining })), [
    { target: "attackRolls", bonus: 5, roundsRemaining: 1 },
    { target: "damageRolls", bonus: 5, roundsRemaining: 1 },
  ]);
  assert.match(screen.getByLabelText("Activate Ki Weapon result").textContent ?? "", /Active for 1 round/);
});

test("Spurn Harm applies every defense earned at the current level", async () => {
  const spent: number[] = [];
  const effects: ActiveEffect[] = [];
  const applied = applyArchetype(bard, sorrowsoul);
  render(<ClassFeatures
    level={17}
    className={applied.name}
    features={featuresThroughLevel(applied, 17)}
    classLevels={{ bard: 17 }}
    dailyResources={[{ id: "bardicPerformance", label: "Bardic Performance", unit: "round", maximum: 38, used: 0, onUsedChange: (used) => spent.push(used) }]}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Activate Spurn Harm" }));
  assert.deepEqual(spent, [3]);
  assert.deepEqual(effects.map(({ target, bonus, roundsRemaining }) => ({ target, bonus, roundsRemaining })), [
    { target: "fortitude", bonus: 2, roundsRemaining: 1 },
    { target: "reflex", bonus: 2, roundsRemaining: 1 },
    { target: "will", bonus: 2, roundsRemaining: 1 },
    { target: "spellResistance", bonus: 28, roundsRemaining: 1 },
    { target: "damageReduction", bonus: 10, roundsRemaining: 1 },
  ]);
});

test("active damage reduction reduces incoming damage before hit points", async () => {
  function Harness() {
    const [hitPoints, setHitPoints] = React.useState(20);
    return <ActivePlayPanel
      maximumHitPoints={20}
      currentHitPoints={hitPoints}
      temporaryHitPoints={0}
      attacks={[]}
      checks={[]}
      skills={[]}
      effects={[{ id: "spurn-harm-dr", name: "Spurn Harm damage reduction", target: "damageReduction", bonus: 10, roundsRemaining: 1 }]}
      onCurrentHitPointsChange={setHitPoints}
      onTemporaryHitPointsChange={() => {}}
      onEffectsChange={() => {}}
    />;
  }
  render(<Harness />);
  const user = userEvent.setup();
  fireEvent.change(screen.getByLabelText("Hit point adjustment"), { target: { value: "12" } });
  await user.click(screen.getByRole("button", { name: "Take 12 damage" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "18");
  assert.match(screen.getByText(/Current DR:/).textContent ?? "", /10/);
  await user.click(screen.getByLabelText("Damage bypasses damage reduction"));
  await user.click(screen.getByRole("button", { name: "Take 12 damage" }));
  assert.equal((screen.getByLabelText("Current HP") as HTMLInputElement).value, "6");
});
