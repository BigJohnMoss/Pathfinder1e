import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import data from "../generated/pf1e-data.mjs";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let ClassOptions: typeof import("../apps/web/app/class-options").ClassOptions;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ClassOptions = (await import("../apps/web/app/class-options")).ClassOptions;
});

test.afterEach(() => cleanup());

test("Holy Guide shows exact accumulated bonuses and only selected terrain increase targets", () => {
  const rangerTerrains = data.optionGroups.find((group) => group.id === "ranger-favored-terrains")!.options;
  const holyGuideTerrains = data.optionGroups.find((group) => group.id === "holy-guide-favored-terrain-mercies")!.options.map((option) => ({ ...option, groupId: "paladin-mercies" }));
  const selectedOptions = {
    "holy-guide-favored-terrain-3": "ranger-terrain-forest",
    "paladin-mercy-9": "holy-guide-favored-terrain-desert",
    "paladin-mercy-9-favoredTerrainIncrease": "ranger-terrain-forest",
    "paladin-mercy-12": "holy-guide-favored-terrain-urban",
    "paladin-mercy-12-favoredTerrainIncrease": "ranger-terrain-desert",
  };
  const choice = (id: string, name: string, level: number, options: typeof rangerTerrains, baseBonus?: number) => ({
    id, name, level, favoredTerrainBaseBonus: baseBonus, options,
    selected: options.find((option) => option.id === selectedOptions[id as keyof typeof selectedOptions]),
  });
  render(<ClassOptions
    choices={[
      choice("holy-guide-favored-terrain-3", "Favored Terrain", 3, rangerTerrains, 2),
      choice("paladin-mercy-9", "Mercy 3", 9, holyGuideTerrains),
      choice("paladin-mercy-12", "Mercy 4", 12, holyGuideTerrains),
    ]}
    selectedOptions={selectedOptions}
    classLevel={12}
    charismaModifier={2}
    onOptionChange={() => {}}
  />);
  const summary = screen.getByRole("complementary", { name: "Favored terrain bonuses" });
  assert.match(summary.textContent ?? "", /Desert\+4/);
  assert.match(summary.textContent ?? "", /Forest\+4/);
  assert.match(summary.textContent ?? "", /Urban\+2/);
  const targets = screen.getByLabelText("Mercy 4 Increase favored terrain bonus") as HTMLSelectElement;
  assert.deepEqual(Array.from(targets.options).map((option) => option.value), ["", "ranger-terrain-desert", "ranger-terrain-forest", "ranger-terrain-urban"]);
  assert.equal(Array.from(targets.options).some((option) => option.value === "ranger-terrain-water"), false);
});
