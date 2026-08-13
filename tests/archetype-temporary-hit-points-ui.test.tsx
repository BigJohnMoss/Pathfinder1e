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
let userEvent: typeof import("@testing-library/user-event").default;
let ClassFeatures: typeof import("../apps/web/app/class-features").ClassFeatures;

const fighter = JSON.parse(readFileSync(new URL("../packages/data/src/classes/fighter.json", import.meta.url), "utf8")) as CharacterClass;
const siegebreaker = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/fighter-siegebreaker.json", import.meta.url), "utf8")) as CharacterArchetype;
const applied = applyArchetype(fighter, siegebreaker);

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

test.afterEach(() => cleanup());

test("Armored Vigor spends its inferred resource and grants scaled temporary HP", async () => {
  const spent: number[] = [];
  const granted: number[] = [];
  const effects: ActiveEffect[] = [];
  render(<ClassFeatures
    level={18}
    className="Fighter (Siegebreaker)"
    features={featuresThroughLevel(applied, 18)}
    classLevels={{ fighter: 18 }}
    dailyResources={[{ id: "archetype-fighter-siegebreaker-armored-vigor-ex-2", label: "Armored Vigor", unit: "use", maximum: 7, used: 0, onUsedChange: (used) => spent.push(used) }]}
    onTemporaryHitPointsChange={(amount) => granted.push(amount)}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  const user = userEvent.setup();
  assert.equal((screen.getByRole("button", { name: "Gain Armored Vigor temporary HP" }) as HTMLButtonElement).disabled, true);
  await user.click(screen.getByLabelText("Gain Armored Vigor temporary HP Wearing armor"));
  await user.click(screen.getByRole("button", { name: "Gain Armored Vigor temporary HP" }));
  assert.deepEqual(spent, [1]);
  assert.deepEqual(granted, [10]);
  assert.equal(effects[0]?.roundsRemaining, 10);
  assert.match(screen.getByLabelText("Gain Armored Vigor temporary HP result").textContent ?? "", /Gained 10 temporary hit points/);
});
