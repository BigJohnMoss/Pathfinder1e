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

const alchemist = JSON.parse(readFileSync(new URL("../packages/data/src/classes/alchemist.json", import.meta.url), "utf8")) as CharacterClass;
const ectochymist = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-ectochymist.json", import.meta.url), "utf8")) as CharacterArchetype;
const aerochemist = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-aerochemist.json", import.meta.url), "utf8")) as CharacterArchetype;
const oenopionResearcher = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-oenopion-researcher.json", import.meta.url), "utf8")) as CharacterArchetype;
const royalAlchemist = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-royal-alchemist.json", import.meta.url), "utf8")) as CharacterArchetype;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ClassFeatures = (await import("../apps/web/app/class-features")).ClassFeatures;
});

test.afterEach(() => cleanup());

test("generic archetype actions spend their calculated resource", async () => {
  const spent = [] as number[];
  const applied = applyArchetype(alchemist, ectochymist);
  render(<ClassFeatures
    level={5}
    className={applied.name}
    features={featuresThroughLevel(applied, 5)}
    classLevels={{ alchemist: 5 }}
    dailyResources={[{ id: "ectoplasmicBlanche", label: "Ectoplasmic Blanche", unit: "use", maximum: 8, used: 0, onUsedChange: (used) => spent.push(used) }]}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Use Ectoplasmic Blanche" }));
  assert.deepEqual(spent, [1]);
  assert.equal(screen.getByLabelText("Use Ectoplasmic Blanche result").textContent, "Ability used.");
});

test("Aeromantic Concoction scales its duration and gates shared doses behind Infusion", async () => {
  const effects: ActiveEffect[] = [];
  const applied = applyArchetype(alchemist, aerochemist);
  const view = render(<ClassFeatures
    level={14}
    className={applied.name}
    features={featuresThroughLevel(applied, 14)}
    classLevels={{ alchemist: 14 }}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  assert.equal(screen.queryByRole("button", { name: "Brew and consume shared concoction" }), null);
  await userEvent.setup().selectOptions(screen.getByLabelText("Brew and consume personal concoction mode"), "air-walk");
  await userEvent.setup().click(screen.getByRole("button", { name: "Brew and consume personal concoction" }));
  assert.equal(effects[0]?.name, "Aeromantic Concoction");
  assert.equal(effects[0]?.roundsRemaining, 8400);
  assert.match(effects[0]?.description ?? "", /air walk/i);

  view.unmount();
  render(<ClassFeatures
    level={14}
    className={applied.name}
    features={featuresThroughLevel(applied, 14)}
    classLevels={{ alchemist: 14 }}
    selectedOptionIds={["infusion"]}
    activeEffects={[]}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Brew and consume shared concoction" }));
  assert.equal(effects.at(-1)?.target, "allies");
  assert.equal(effects.at(-1)?.roundsRemaining, 1400);
});

test("Experimental Mutagen applies its selected ability and linked natural armor", async () => {
  const effects: ActiveEffect[] = [];
  const applied = applyArchetype(alchemist, oenopionResearcher);
  render(<ClassFeatures
    level={8}
    className={applied.name}
    features={featuresThroughLevel(applied, 8)}
    classLevels={{ alchemist: 8 }}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  await userEvent.setup().selectOptions(screen.getByLabelText("Brew and consume experimental mutagen affected ability"), "dexterity");
  await userEvent.setup().click(screen.getByRole("button", { name: "Brew and consume experimental mutagen" }));
  assert.deepEqual(effects.map(({ target, bonus, roundsRemaining }) => ({ target, bonus, roundsRemaining })), [
    { target: "dexterity", bonus: 2, roundsRemaining: 800 },
    { target: "armorClass", bonus: 1, roundsRemaining: 800 },
  ]);
});

test("Royal Alchemist antidotes enforce pool cost and calculate bonus and duration", async () => {
  const effects: ActiveEffect[] = [];
  const used: number[] = [];
  const applied = applyArchetype(alchemist, royalAlchemist);
  render(<ClassFeatures
    level={10}
    className={applied.name}
    features={featuresThroughLevel(applied, 10)}
    classLevels={{ alchemist: 10 }}
    abilityModifiers={{ intelligence: 4 }}
    dailyResources={[{ id: "alchemicalAntidotePoints", label: "Alchemical Antidote", unit: "point", maximum: 9, used: 0, onUsedChange: (value) => used.push(value) }]}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  const setup = userEvent.setup();
  const poison = screen.getByRole("button", { name: "Prepare poison antidote" });
  await setup.clear(screen.getByLabelText("Prepare poison antidote antidote points"));
  await setup.type(screen.getByLabelText("Prepare poison antidote antidote points"), "4");
  await setup.click(poison);
  assert.deepEqual(used, [4]);
  assert.equal(effects[0]?.bonus, 4);
  assert.equal(effects[0]?.roundsRemaining, 2400);
  assert.equal(screen.getByRole("button", { name: "Prepare immunity antidote" }).hasAttribute("disabled"), true);
});
