import test, { before, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, fireEvent, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

afterEach(() => { cleanup(); localStorage.clear(); });

const selectBard = async (archetypeId: string, level: number) => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "bard");
  await user.selectOptions(screen.getByLabelText("Archetype"), archetypeId);
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: String(level) } });
  await user.click(screen.getByRole("tab", { name: "Features" }));
  return user;
};

test("Dawnflower and Dervish Dancer show their corrected level-one controls", async () => {
  await selectBard("bard-dawnflower-dervish", 20);
  assert.ok(screen.getByLabelText("Deity level 1"));
  assert.ok(screen.getByRole("button", { name: "Begin doubled Inspire Courage dance" }));
  assert.ok(screen.getByLabelText("Bard Meditative Whirl remaining"));
  cleanup(); localStorage.clear();
  await selectBard("bard-dervish-dancer", 20);
  assert.ok(screen.getByRole("button", { name: "Begin Rain of Blows" }));
  assert.ok(screen.getByRole("button", { name: "Use Battle Fury" }));
});

test("Masked Performer exposes five unique social skills, two talents, and Stage Combat", async () => {
  await selectBard("bard-masked-performer", 18);
  assert.ok(screen.getByLabelText("Social Grace Skill 1 level 2"));
  assert.ok(screen.getByLabelText("Social Grace Skill 5 level 18"));
  const firstTalent = screen.getByLabelText("Masked Talent 1 level 5") as HTMLSelectElement;
  const secondTalent = screen.getByLabelText("Masked Talent 2 level 17") as HTMLSelectElement;
  assert.equal(Array.from(firstTalent.options).some((option) => /Hide in Plain Sight/.test(option.textContent ?? "")), false);
  assert.equal(Array.from(secondTalent.options).some((option) => /Hide in Plain Sight/.test(option.textContent ?? "")), true);
  assert.ok(screen.getByLabelText("Begin Stage Combat combat feat"));
});

test("Busker shows its separate pool and every stunt without Bardic Performance", async () => {
  await selectBard("bard-busker", 15);
  assert.ok(screen.getByLabelText("Bard Busker Stunts remaining"));
  for (const name of ["Begin Quick Hands", "Use Patter", "Begin Living Statue", "Begin Busker Fascinate", "Use Busker Suggestion", "Begin Inventive Juggler", "Store or retrieve an object"]) {
    assert.ok(screen.getByRole("button", { name }));
  }
  assert.equal(screen.queryByLabelText("Bard Bardic Performance remaining"), null);
});
