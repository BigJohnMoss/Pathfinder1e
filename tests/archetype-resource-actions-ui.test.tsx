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
const gloomChymist = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-gloom-chymist.json", import.meta.url), "utf8")) as CharacterArchetype;
const concocter = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-concocter.json", import.meta.url), "utf8")) as CharacterArchetype;
const dragonbloodChymist = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-dragonblood-chymist.json", import.meta.url), "utf8")) as CharacterArchetype;
const plagueBringer = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-plague-bringer.json", import.meta.url), "utf8")) as CharacterArchetype;
const alchemicalTrapper = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-alchemical-trapper.json", import.meta.url), "utf8")) as CharacterArchetype;
const cloneMaster = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-clone-master.json", import.meta.url), "utf8")) as CharacterArchetype;
const wingedMarauder = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-winged-marauder.json", import.meta.url), "utf8")) as CharacterArchetype;
const bogbornAlchemist = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-bogborn-alchemist.json", import.meta.url), "utf8")) as CharacterArchetype;
const crimsonChymist = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-crimson-chymist.json", import.meta.url), "utf8")) as CharacterArchetype;
const blazingTorchbearer = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-blazing-torchbearer.json", import.meta.url), "utf8")) as CharacterArchetype;
const iceChemist = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-ice-chemist.json", import.meta.url), "utf8")) as CharacterArchetype;
const deepBomber = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/alchemist-deep-bomber.json", import.meta.url), "utf8")) as CharacterArchetype;
const sanctifiedRogue = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/rogue-sanctified-rogue.json", import.meta.url), "utf8")) as CharacterArchetype;
const makeshiftScrapper = JSON.parse(readFileSync(new URL("../packages/data/src/archetypes/rogue-makeshift-scrapper.json", import.meta.url), "utf8")) as CharacterArchetype;

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

test("Gloom Chymist rolls scaling cold damage and tracks its light field", async () => {
  const effects: ActiveEffect[] = [];
  const used: number[] = [];
  const applied = applyArchetype(alchemist, gloomChymist);
  render(<ClassFeatures
    level={9}
    className={applied.name}
    features={featuresThroughLevel(applied, 9)}
    classLevels={{ alchemist: 9 }}
    abilityModifiers={{ dexterity: 3, intelligence: 4 }}
    baseAttackBonus={6}
    dailyResources={[{ id: "glooms", label: "Gloom", unit: "use", maximum: 7, used: 0, onUsedChange: (value) => used.push(value) }]}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try {
    await userEvent.setup().click(screen.getByRole("button", { name: "Throw gloom with light change" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.deepEqual(used, [1]);
  assert.equal(effects[0]?.roundsRemaining, 4);
  assert.equal(effects[0]?.target, "area");
  assert.match(screen.getByLabelText("Throw gloom with light change result").textContent ?? "", /5d6.*\+ 4.*cold damage/i);
  assert.match(screen.getByRole("button", { name: "Create empowered umbral gloom" }).closest("div")?.textContent ?? "", /Spend 2/);
});

test("Concocter tracks mutagenic mixtures and resolves weighted extract-potion outcomes", async () => {
  const effects: ActiveEffect[] = [];
  const used: number[] = [];
  const applied = applyArchetype(alchemist, concocter);
  const properties = {
    level: 6,
    className: applied.name,
    features: featuresThroughLevel(applied, 6),
    classLevels: { alchemist: 6 },
    dailyResources: [{ id: "mutagenicConcoctions", label: "Mutagenic Concoction", unit: "concoction", maximum: 2, used: 0, onUsedChange: (value: number) => used.push(value) }],
    activeEffects: effects,
    onAddEffect: (effect: ActiveEffect) => effects.push(effect),
    onRemoveEffectByName: (name: string) => { for (let index = effects.length - 1; index >= 0; index -= 1) if (effects[index]?.name === name) effects.splice(index, 1); },
  };
  const view = render(<ClassFeatures {...properties} />);
  const setup = userEvent.setup();
  await setup.selectOptions(screen.getByLabelText("Drink mutagenic concoction mode"), "dexterity");
  await setup.click(screen.getByRole("button", { name: "Drink mutagenic concoction" }));
  assert.deepEqual(used, [1]);
  assert.deepEqual(effects.map(({ target, bonus, roundsRemaining }) => ({ target, bonus, roundsRemaining })), [
    { target: "armorClass", bonus: 2, roundsRemaining: 60 },
    { target: "dexterity", bonus: 4, roundsRemaining: 60 },
    { target: "wisdom", bonus: -2, roundsRemaining: 60 },
  ]);

  const drinkMixture = screen.getByRole("button", { name: "Drink extract-potion mixture" });
  assert.equal(drinkMixture.hasAttribute("disabled"), true);
  await setup.click(screen.getByRole("button", { name: "Combine extract and potion" }));
  view.rerender(<ClassFeatures {...properties} activeEffects={[...effects]} />);
  assert.equal(screen.getByRole("button", { name: "Drink extract-potion mixture" }).hasAttribute("disabled"), false);
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await setup.click(screen.getByRole("button", { name: "Drink extract-potion mixture" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.match(screen.getByLabelText("Drink extract-potion mixture result").textContent ?? "", /Extract fails/);
  assert.equal(effects.some((effect) => effect.name === "Fresh Extract-Potion Mixture"), false);
});

test("Dragonblood Chymist scales its mutagen and resolves mandatory breath bombs", async () => {
  const effects: ActiveEffect[] = [];
  const used: number[] = [];
  const applied = applyArchetype(alchemist, dragonbloodChymist);
  render(<ClassFeatures
    level={16}
    className={applied.name}
    features={featuresThroughLevel(applied, 16)}
    classLevels={{ alchemist: 16 }}
    abilityModifiers={{ intelligence: 4 }}
    saveModifiers={{ reflex: 2 }}
    dailyResources={[{ id: "bombs", label: "Bomb", unit: "use", maximum: 20, used: 0, onUsedChange: (value) => used.push(value) }]}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  const setup = userEvent.setup();
  await setup.click(screen.getByRole("button", { name: "Brew and consume dragonblood mutagen" }));
  assert.deepEqual(effects.map(({ target, bonus, roundsRemaining }) => ({ target, bonus, roundsRemaining })), [
    { target: "strength", bonus: 6, roundsRemaining: 1600 },
    { target: "armorClass", bonus: 6, roundsRemaining: 1600 },
  ]);
  await setup.click(screen.getByRole("button", { name: "Use explosive breath" }));
  assert.deepEqual(used, [1]);
  assert.match(screen.getByLabelText("Use explosive breath result").textContent ?? "", /8d6.*\+ 4.*fire damage/i);
  assert.match(screen.getByLabelText("Use explosive breath result").textContent ?? "", /Reflex save/i);
});

test("Plague Bringer exposes the disease DC, duration, and weapon-delivery workflow", async () => {
  const effects: ActiveEffect[] = [];
  const applied = applyArchetype(alchemist, plagueBringer);
  render(<ClassFeatures
    level={10}
    className={applied.name}
    features={featuresThroughLevel(applied, 10)}
    classLevels={{ alchemist: 10 }}
    abilityModifiers={{ intelligence: 4 }}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  const setup = userEvent.setup();
  await setup.click(screen.getByRole("button", { name: "Drink plague vial" }));
  assert.equal(effects[0]?.name, "Plague Vial");
  assert.equal(effects[0]?.roundsRemaining, 1000);
  assert.match(screen.getByLabelText("Drink plague vial result").textContent ?? "", /Fortitude DC 19/i);
  await setup.click(screen.getByRole("button", { name: "Infect weapon from plague vial" }));
  assert.equal(effects.at(-1)?.target, "enemy");
  assert.equal(effects.at(-1)?.roundsRemaining, 10);
  assert.match(screen.getByLabelText("Infect weapon from plague vial result").textContent ?? "", /Fortitude DC 19/i);
});

test("Alchemical Trapper spends a bomb and creates a level-scaled trap", async () => {
  const effects: ActiveEffect[] = [];
  const used: number[] = [];
  const applied = applyArchetype(alchemist, alchemicalTrapper);
  render(<ClassFeatures
    level={9}
    className={applied.name}
    features={featuresThroughLevel(applied, 9)}
    classLevels={{ alchemist: 9 }}
    abilityModifiers={{ intelligence: 4 }}
    dailyResources={[{ id: "bombs", label: "Bomb", unit: "use", maximum: 13, used: 0, onUsedChange: (value) => used.push(value) }]}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Set bomb trap" }));
  assert.deepEqual(used, [1]);
  assert.equal(effects[0]?.target, "area");
  assert.equal(effects[0]?.roundsRemaining, 900);
  assert.match(screen.getByLabelText("Set bomb trap result").textContent ?? "", /5d6.*\+ 4.*fire damage/i);
  assert.match(screen.getByLabelText("Set bomb trap result").textContent ?? "", /Reflex save:.*vs DC 18/i);
});

test("Clone Master uses reduced bomb dice and persists one confirmed rebirth clone", async () => {
  const effects: ActiveEffect[] = [];
  const used: number[] = [];
  const applied = applyArchetype(alchemist, cloneMaster);
  const properties = {
    level: 9,
    className: applied.name,
    features: featuresThroughLevel(applied, 9),
    classLevels: { alchemist: 9 },
    abilityModifiers: { dexterity: 3, intelligence: 4 },
    baseAttackBonus: 6,
    dailyResources: [{ id: "bombs", label: "Bomb", unit: "use", maximum: 13, used: 0, onUsedChange: (value: number) => used.push(value) }],
    activeEffects: effects,
    onAddEffect: (effect: ActiveEffect) => effects.push(effect),
    onRemoveEffectByName: (name: string) => { for (let index = effects.length - 1; index >= 0; index -= 1) if (effects[index]?.name === name) effects.splice(index, 1); },
  };
  const view = render(<ClassFeatures {...properties} />);
  const setup = userEvent.setup();
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try {
    await setup.click(screen.getByRole("button", { name: "Throw reduced-die bomb" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.deepEqual(used, [1]);
  assert.match(screen.getByLabelText("Throw reduced-die bomb result").textContent ?? "", /5d4.*\+ 4.*fire damage/i);

  const recordClone = screen.getByRole("button", { name: "Record mature rebirth clone" });
  assert.equal(recordClone.hasAttribute("disabled"), true);
  await setup.click(screen.getByLabelText("5,000 gp creation cost has been paid"));
  await setup.click(screen.getByLabelText("1 week of work and 3 weeks of growth are complete"));
  await setup.click(recordClone);
  assert.equal(effects.at(-1)?.name, "Mature Rebirth Clone");
  view.rerender(<ClassFeatures {...properties} activeEffects={[...effects]} />);
  await setup.click(screen.getByRole("button", { name: "Awaken rebirth clone after death" }));
  assert.equal(effects.some((effect) => effect.name === "Mature Rebirth Clone"), false);
});

test("Winged Marauder gates Sipping Pet behind its discovery and usage requirements", async () => {
  const applied = applyArchetype(alchemist, wingedMarauder);
  const properties = {
    level: 6,
    className: applied.name,
    features: featuresThroughLevel(applied, 6),
    classLevels: { alchemist: 6 },
  };
  const view = render(<ClassFeatures {...properties} />);
  assert.equal(screen.queryByRole("button", { name: "Administer liquid with Sipping Pet" }), null);
  view.rerender(<ClassFeatures {...properties} selectedOptionIds={["winged-marauder-sipping-pet"]} />);
  const action = screen.getByRole("button", { name: "Administer liquid with Sipping Pet" });
  assert.equal(action.hasAttribute("disabled"), true);
  const setup = userEvent.setup();
  await setup.click(screen.getByLabelText("The selected liquid is available and expended"));
  await setup.click(screen.getByLabelText("The mount is adjacent or being ridden"));
  assert.equal(action.hasAttribute("disabled"), false);
  await setup.selectOptions(screen.getByLabelText("Administer liquid with Sipping Pet mode"), "potion");
  await setup.click(action);
  assert.match(screen.getByLabelText("Administer liquid with Sipping Pet result").textContent ?? "", /selected liquid has been administered/i);
});

test("Bogborn Alchemist tracks its confirmed amphibious mutagen duration", async () => {
  const effects: ActiveEffect[] = [];
  const applied = applyArchetype(alchemist, bogbornAlchemist);
  render(<ClassFeatures
    level={7}
    className={applied.name}
    features={featuresThroughLevel(applied, 7)}
    classLevels={{ alchemist: 7 }}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  const action = screen.getByRole("button", { name: "Use amphibious mutagen form" });
  assert.equal(action.hasAttribute("disabled"), true);
  const setup = userEvent.setup();
  await setup.click(screen.getByLabelText("A prepared mutagen is available and consumed"));
  await setup.click(action);
  assert.equal(effects[0]?.name, "Amphibious Mutagen");
  assert.equal(effects[0]?.roundsRemaining, 700);
  assert.match(effects[0]?.description ?? "", /15-foot swim speed/i);
});

test("Crimson Chymist applies mantis mutagen and gates its discovery workflows", async () => {
  const effects: ActiveEffect[] = [];
  const applied = applyArchetype(alchemist, crimsonChymist);
  const properties = {
    level: 10,
    className: applied.name,
    features: featuresThroughLevel(applied, 10),
    classLevels: { alchemist: 10 },
    selectedOptionIds: ["crimson-arms-of-achaekek", "crimson-improved-arms-of-achaekek"],
    activeEffects: effects,
    onAddEffect: (effect: ActiveEffect) => effects.push(effect),
  };
  const view = render(<ClassFeatures {...properties} />);
  const setup = userEvent.setup();
  await setup.click(screen.getByRole("button", { name: "Brew and consume mantis mutagen" }));
  assert.deepEqual(effects.map(({ target, bonus, roundsRemaining }) => ({ target, bonus, roundsRemaining })), [
    { target: "dexterity", bonus: 4, roundsRemaining: 1000 },
    { target: "armorClass", bonus: 2, roundsRemaining: 1000 },
    { target: "charisma", bonus: -2, roundsRemaining: 1000 },
  ]);
  view.rerender(<ClassFeatures {...properties} activeEffects={[...effects]} />);
  const arms = screen.getByRole("button", { name: "Manifest Arms of Achaekek" });
  assert.equal(arms.hasAttribute("disabled"), true);
  await setup.click(screen.getByLabelText("No armor or wrist-slot item is worn"));
  await setup.click(arms);
  assert.equal(effects.at(-1)?.name, "Arms of Achaekek");
  view.rerender(<ClassFeatures {...properties} activeEffects={[...effects]} />);
  assert.equal(screen.getByRole("button", { name: "Apply Improved Arms of Achaekek" }).hasAttribute("disabled"), false);
});

test("Blazing Torchbearer tracks its flash and randomized explosive-torch countdown", async () => {
  const effects: ActiveEffect[] = [];
  const used: number[] = [];
  const applied = applyArchetype(alchemist, blazingTorchbearer);
  render(<ClassFeatures
    level={6}
    className={applied.name}
    features={featuresThroughLevel(applied, 6)}
    classLevels={{ alchemist: 6 }}
    dailyResources={[{ id: "brilliantFlash", label: "Brilliant Flash", unit: "use", maximum: 1, used: 0, onUsedChange: (value) => used.push(value) }]}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  const setup = userEvent.setup();
  await setup.click(screen.getByRole("button", { name: "Create brilliant flash" }));
  assert.deepEqual(used, [1]);
  assert.deepEqual(effects.slice(0, 3).map((effect) => effect.target), ["self", "allies", "enemy"]);
  const prime = screen.getByRole("button", { name: "Prime explosive torch" });
  assert.equal(prime.hasAttribute("disabled"), true);
  await setup.click(screen.getByLabelText("A lit torch is held and the explosive powders are available"));
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await setup.click(prime);
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(effects.at(-1)?.name, "Primed Explosive Torch");
  assert.equal(effects.at(-1)?.roundsRemaining, 1);
  assert.match(effects.at(-1)?.description ?? "", /\+2d6 fire damage/i);
});

test("Ice Chemist resolves icy and frost bombs and gates its learned fire bombs", async () => {
  const used: number[] = [];
  const applied = applyArchetype(alchemist, iceChemist);
  const properties = {
    level: 9,
    className: applied.name,
    features: featuresThroughLevel(applied, 9),
    classLevels: { alchemist: 9 },
    abilityModifiers: { dexterity: 3, intelligence: 4 },
    baseAttackBonus: 6,
    dailyResources: [{ id: "bombs", label: "Bomb", unit: "use", maximum: 13, used: 0, onUsedChange: (value: number) => used.push(value) }],
  };
  const view = render(<ClassFeatures {...properties} />);
  assert.equal(screen.queryByRole("button", { name: "Throw learned fire bomb" }), null);
  const setup = userEvent.setup();
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try {
    await setup.click(screen.getByRole("button", { name: "Throw icy bomb" }));
  } finally {
    Math.random = originalRandom;
  }
  let frostRoll = 0;
  Math.random = () => frostRoll++ < 6 ? 0.99 : 0;
  try {
    await setup.click(screen.getByRole("button", { name: "Throw frost bomb" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.deepEqual(used, [1, 1]);
  assert.match(screen.getByLabelText("Throw icy bomb result").textContent ?? "", /5d6.*\+ 4.*cold damage/i);
  assert.match(screen.getByLabelText("Throw frost bomb result").textContent ?? "", /Frost Bomb Staggered applied for 1 round/i);
  view.rerender(<ClassFeatures {...properties} selectedOptionIds={["ice-chemist-fire-bombs"]} />);
  assert.ok(screen.getByRole("button", { name: "Throw learned fire bomb" }));
});

test("Deep Bomber combines targeting-bomb damage with faerie fire and tracks Stonekin", async () => {
  const effects: ActiveEffect[] = [];
  const used: number[] = [];
  const applied = applyArchetype(alchemist, deepBomber);
  render(<ClassFeatures
    level={7}
    className={applied.name}
    features={featuresThroughLevel(applied, 7)}
    classLevels={{ alchemist: 7 }}
    abilityModifiers={{ dexterity: 3, intelligence: 4 }}
    baseAttackBonus={5}
    dailyResources={[{ id: "bombs", label: "Bomb", unit: "use", maximum: 11, used: 0, onUsedChange: (value) => used.push(value) }]}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  const setup = userEvent.setup();
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try {
    await setup.click(screen.getByRole("button", { name: "Throw targeting bomb" }));
  } finally {
    Math.random = originalRandom;
  }
  assert.deepEqual(used, [1]);
  assert.match(screen.getByLabelText("Throw targeting bomb result").textContent ?? "", /4d6.*\+ 4.*fire damage/i);
  assert.equal(effects[0]?.name, "Targeting Bomb Faerie Fire");
  assert.equal(effects[0]?.roundsRemaining, 70);
  const stonekin = screen.getByRole("button", { name: "Use Stonekin stalagmite shape" });
  assert.equal(stonekin.hasAttribute("disabled"), true);
  await setup.click(screen.getByLabelText("A tree shape extract is prepared and consumed"));
  await setup.click(stonekin);
  assert.equal(effects.at(-1)?.name, "Stonekin Stalagmite Shape");
  assert.equal(effects.at(-1)?.roundsRemaining, 4200);
});

test("Sanctified Rogue tracks its daily Divine Epiphany augury", async () => {
  const used: number[] = [];
  const feature = sanctifiedRogue.replacements.flatMap((replacement) => replacement.features)
    .find((candidate) => candidate.id === "rogue-sanctified-rogue-divine-epiphany-su-8");
  assert.ok(feature);
  render(<ClassFeatures
    level={8}
    className="Sanctified Rogue"
    features={[feature]}
    classLevels={{ rogue: 8 }}
    dailyResources={[{ id: "divineEpiphany", label: "Divine Epiphany", unit: "use", maximum: 1, used: 0, onUsedChange: (value) => used.push(value) }]}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Use Divine Epiphany" }));
  assert.deepEqual(used, [1]);
  assert.equal(screen.getByLabelText("Use Divine Epiphany result").textContent, "Augury activated as a spell-equivalent effect.");
});

test("Makeshift Scrapper spends daily rounds and scales both weapon bonuses", async () => {
  const used: number[] = [];
  const effects: ActiveEffect[] = [];
  const feature = makeshiftScrapper.replacements.flatMap((replacement) => replacement.features)
    .find((candidate) => candidate.id === "rogue-makeshift-scrapper-supernatural-improvisation-su-3");
  assert.ok(feature);
  render(<ClassFeatures
    level={11}
    className="Makeshift Scrapper"
    features={[feature]}
    classLevels={{ rogue: 11 }}
    dailyResources={[{ id: "supernaturalImprovisation", label: "Supernatural Improvisation", unit: "round", maximum: 11, used: 0, onUsedChange: (value) => used.push(value) }]}
    activeEffects={effects}
    onAddEffect={(effect) => effects.push(effect)}
  />);
  await userEvent.setup().click(screen.getByRole("button", { name: "Use Supernatural Improvisation" }));
  assert.deepEqual(used, [1]);
  assert.deepEqual(effects.filter((effect) => ["attackRolls", "weaponDamageRolls"].includes(effect.target)).map((effect) => [effect.target, effect.bonus, effect.roundsRemaining]), [
    ["attackRolls", 3, 1],
    ["weaponDamageRolls", 3, 1]
  ]);
});
