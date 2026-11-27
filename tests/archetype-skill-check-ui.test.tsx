import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let userEvent: typeof import("@testing-library/user-event").default;
let ActivePlayPanel: typeof import("../apps/web/app/active-play-panel").ActivePlayPanel;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ActivePlayPanel = (await import("../apps/web/app/active-play-panel")).ActivePlayPanel;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("Take 10 uses the selected skill modifier and records a deterministic result", async () => {
  const user = userEvent.setup();
  render(<ActivePlayPanel maximumHitPoints={10} currentHitPoints={10} temporaryHitPoints={0} attacks={[]} checks={[]} skills={[{ id: "Swim", name: "Swim", modifier: 4 }]} effects={[]} skillCheckRules={[{ id: "dauntless-swimmer", label: "Dauntless Swimmer", skills: ["Swim"], result: 10, allowsStress: true, source: "Kraken Caller" }]} onCurrentHitPointsChange={() => {}} onTemporaryHitPointsChange={() => {}} onEffectsChange={() => {}} />);
  assert.ok(screen.getByLabelText("Archetype skill check options"));
  await user.click(screen.getByRole("button", { name: "Take 10" }));
  const total = screen.getByLabelText("Swim — Dauntless Swimmer total");
  assert.equal(total.textContent, "14");
  assert.match(total.closest("li")?.textContent ?? "", /Take 10 \+ 4/);
});

test("the live character path exposes level-gated archetype skill options", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "2" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "druid-kraken-caller");
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  await user.selectOptions(screen.getByLabelText("Skill to roll"), "Swim");
  assert.ok(screen.getByText("Dauntless Swimmer"));
  assert.ok(screen.getByRole("button", { name: "Take 10" }));
  assert.match(screen.getByLabelText("Archetype skill check options").textContent ?? "", /distracted or endangered/);
});

test("trained-only deterministic checks remain unavailable without a skill rank", () => {
  render(<ActivePlayPanel maximumHitPoints={10} currentHitPoints={10} temporaryHitPoints={0} attacks={[]} checks={[]} skills={[{ id: "Bluff", name: "Bluff", modifier: 2, ranks: 0 }]} effects={[]} skillCheckRules={[{ id: "master-of-mischief", label: "Master of Mischief", skills: ["Bluff"], result: 10, trainedOnly: true, source: "Fey Prankster" }]} onCurrentHitPointsChange={() => {}} onTemporaryHitPointsChange={() => {}} onEffectsChange={() => {}} />);
  assert.equal((screen.getByRole("button", { name: "Take 10" }) as HTMLButtonElement).disabled, true);
  assert.match(screen.getByLabelText("Archetype skill check options").textContent ?? "", /requires at least 1 rank/);
});

test("timed skill bonuses apply only to their selected skill", async () => {
  const user = userEvent.setup();
  render(<ActivePlayPanel maximumHitPoints={10} currentHitPoints={10} temporaryHitPoints={0} attacks={[]} checks={[]} skills={[{ id: "Perception", name: "Perception", modifier: 2 }, { id: "Stealth", name: "Stealth", modifier: 4 }]} effects={[{ id: "augmentation", name: "Arcane Augmentation", target: "skillChecks", bonus: 5, roundsRemaining: 10, skillIds: ["Stealth"] }]} onCurrentHitPointsChange={() => {}} onTemporaryHitPointsChange={() => {}} onEffectsChange={() => {}} />);
  await user.selectOptions(screen.getByLabelText("Skill to roll"), "Perception");
  await user.click(screen.getByRole("button", { name: "Roll selected skill" }));
  assert.match(screen.getByLabelText("Perception total").closest("li")?.textContent ?? "", /1d20 \+ 2/);
  await user.selectOptions(screen.getByLabelText("Skill to roll"), "Stealth");
  await user.click(screen.getByRole("button", { name: "Roll selected skill" }));
  assert.match(screen.getByLabelText("Stealth total").closest("li")?.textContent ?? "", /1d20 \+ 9/);
});

test("Groom rolls its own and each concealed mount's Stealth with the shared bonus", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "ranger");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "ranger-groom");
  await user.click(screen.getByRole("tab", { name: "Actions" }));

  const concealment = screen.getByRole("group", { name: "Hide the Horses" });
  assert.match(concealment.textContent ?? "", /Stealth bonus \+2/);
  await user.selectOptions(screen.getByLabelText("Skill to roll"), "Stealth");
  await user.click(screen.getByRole("button", { name: "Roll selected skill" }));
  await user.click(screen.getByRole("button", { name: "Roll own Stealth" }));

  const normalTotal = screen.getByLabelText("Stealth total");
  const concealmentTotal = screen.getByLabelText("Stealth — Hide the Horses total");
  const modifierFromRoll = (output: HTMLElement) => {
    const natural = output.closest("li")?.textContent?.match(/dice \[(\d+)\]/)?.[1];
    assert.ok(natural);
    return Number(output.textContent) - Number(natural);
  };
  assert.equal(modifierFromRoll(concealmentTotal), modifierFromRoll(normalTotal) + 2);

  const rollMount = screen.getByRole<HTMLButtonElement>("button", { name: "Roll concealed mount Stealth" });
  assert.ok(rollMount.disabled);
  const nameInput = screen.getByLabelText("Concealed mount name");
  const modifierInput = screen.getByLabelText("Concealed mount base Stealth modifier");
  await user.type(nameInput, "Pony");
  await user.type(modifierInput, "-1");
  await user.click(rollMount);
  assert.equal(modifierFromRoll(screen.getByLabelText("Pony Stealth — Hide the Horses total")), 1);

  await user.clear(nameInput);
  await user.type(nameInput, "Riding dog");
  await user.clear(modifierInput);
  await user.type(modifierInput, "0");
  await user.click(rollMount);
  assert.equal(modifierFromRoll(screen.getByLabelText("Riding dog Stealth — Hide the Horses total")), 2);
});
