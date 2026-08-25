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

test("Martial Master selects a prerequisite chain, spends one use per feat, and tracks both feats", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "fighter-martial-master");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "fighter");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  const catalogue = data.feats.filter((feat: { id: string }) => ["power-attack", "cleave", "dodge"].includes(feat.id));
  const effects: ActiveEffect[] = [];
  let used = 0;
  render(<ClassFeatures
    level={9}
    className={applied.name}
    features={featuresThroughLevel(applied, 9)}
    classLevels={{ fighter: 9 }}
    featCatalogue={catalogue}
    featEligibility={(featId, priorIds) => featId !== "cleave" || priorIds.includes("power-attack")}
    dailyResources={[{ id: "archetype-fighter-martial-master-martial-flexibility-ex-5", label: "Martial Flexibility", unit: "use", maximum: 7, used, onUsedChange: (next) => { used = next; } }]}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  fireEvent.change(screen.getByLabelText("Use Martial Flexibility mode"), { target: { value: "two-move" } });
  const first = screen.getByLabelText("Use Martial Flexibility temporary combat feat 1") as HTMLSelectElement;
  assert.equal([...first.options].some((option) => option.value === "cleave"), false);
  fireEvent.change(first, { target: { value: "power-attack" } });
  const second = screen.getByLabelText("Use Martial Flexibility temporary combat feat 2") as HTMLSelectElement;
  assert.equal([...second.options].some((option) => option.value === "cleave"), true);
  fireEvent.change(second, { target: { value: "cleave" } });
  fireEvent.click(screen.getByRole("button", { name: "Use Martial Flexibility" }));
  assert.equal(used, 2);
  assert.deepEqual(effects[0].grantedFeatIds, ["power-attack", "cleave"]);
  assert.equal(effects[0].roundsRemaining, 10);
  assert.match(effects[0].description ?? "", /Power Attack, Cleave/);
  assert.match(screen.getByLabelText("Use Martial Flexibility result").textContent ?? "", /move action/);
  cleanup();
});

test("level 20 Martial Master exposes a bounded any-number package", () => {
  const source = archetypes.find((candidate: { id: string }) => candidate.id === "fighter-martial-master");
  const base = data.classes.find((candidate: { id: string }) => candidate.id === "fighter");
  const applied = applyArchetype(base, source, data.classes, data.spells);
  render(<ClassFeatures level={20} className={applied.name} features={featuresThroughLevel(applied, 20)} classLevels={{ fighter: 20 }} featCatalogue={data.feats.slice(0, 25)} dailyResources={[{ id: "archetype-fighter-martial-master-martial-flexibility-ex-5", label: "Martial Flexibility", unit: "use", maximum: 13, used: 0, onUsedChange: () => {} }]} />);
  assert.equal((screen.getByLabelText("Use Martial Flexibility mode") as HTMLSelectElement).value, "any-swift");
  fireEvent.change(screen.getByLabelText("Use Martial Flexibility number of feats"), { target: { value: "99" } });
  assert.equal((screen.getByLabelText("Use Martial Flexibility number of feats") as HTMLInputElement).value, "13");
  assert.equal(screen.getAllByLabelText(/Use Martial Flexibility temporary combat feat/).length, 13);
  cleanup();
});
