import test from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { JSDOM } from "jsdom";
import type { ActiveEffect, CharacterSpell } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;
let Spellbook: typeof import("../apps/web/app/spellbook").Spellbook;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
  Spellbook = (await import("../apps/web/app/spellbook")).Spellbook;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

async function openTwilightSage(user: ReturnType<typeof userEvent.setup>, level: number) {
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "arcanist");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: String(level) } });
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-twilight-sage");
  await user.click(screen.getByRole("tab", { name: "Features" }));
}

test("Twilight Sage validates Consume Life and tracks escalating Twilight Barrier costs", async () => {
  const user = userEvent.setup();
  await openTwilightSage(user, 20);
  assert.equal(screen.queryByText("Arcanist Twilight Barrier activations"), null, "internal activation counter stays hidden");
  const consume = screen.getByRole("button", { name: "Consume life" });
  assert.equal((consume as HTMLButtonElement).disabled, true);
  fireEvent.change(screen.getByLabelText("Consume Life target Hit Dice"), { target: { value: "20" } });
  await user.click(screen.getByLabelText("Living creature"));
  await user.click(screen.getByLabelText("Helpless"));
  await user.click(screen.getByLabelText("Below 0 hit points"));
  await user.click(consume);
  assert.match(screen.getByLabelText("Consume Life result").textContent ?? "", /2 reservoir points recovered/);
  assert.match(screen.getByLabelText("Arcane Reservoir remaining").textContent ?? "", /5\/23/);

  await user.click(screen.getByRole("button", { name: "Activate Twilight Barrier" }));
  assert.match(screen.getByLabelText("Twilight Barrier result").textContent ?? "", /20 temporary hit points.*cost 1 reservoir point/);
  assert.match(screen.getByLabelText("Arcane Reservoir remaining").textContent ?? "", /4\/23/);
  await user.click(screen.getByRole("button", { name: "Activate Twilight Barrier" }));
  assert.match(screen.getByLabelText("Twilight Barrier result").textContent ?? "", /activation 2 cost 2 reservoir points/);
  assert.match(screen.getByLabelText("Arcane Reservoir remaining").textContent ?? "", /2\/23/);

  await user.click(screen.getByRole("tab", { name: "Actions" }));
  fireEvent.change(screen.getByLabelText("Hit point adjustment"), { target: { value: "20" } });
  await user.click(screen.getByRole("button", { name: "Take 20 damage" }));
  assert.equal(screen.getByLabelText("Twilight Barrier retaliation total").textContent, "20");
  assert.equal(screen.queryByText("Twilight Barrier", { selector: ".active-effect-list strong" }), null);
  await user.click(screen.getByRole("tab", { name: "Spells" }));
  await user.click(screen.getByRole("button", { name: "Refresh day" }));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  assert.ok(screen.getByText(/next activation costs 1 reservoir point/));
  await user.click(screen.getByLabelText("Character died"));
  await user.click(screen.getByRole("button", { name: "Enter Death's Release" }));
  assert.match(screen.getByLabelText("Death's Release status").textContent ?? "", /Spirit active/);
  await user.click(screen.getByRole("tab", { name: "Actions" }));
  assert.ok(screen.getByText(/other Actions controls are locked/));
  assert.equal((screen.getByRole("group", { name: "Active play controls" }) as HTMLFieldSetElement).disabled, true);
});

test("Twilight Transfer requires legal targets before spending its daily use", async () => {
  const user = userEvent.setup();
  await openTwilightSage(user, 11);
  const transfer = screen.getByRole("button", { name: "Use Twilight Transfer" });
  assert.equal((transfer as HTMLButtonElement).disabled, true);
  fireEvent.change(screen.getByLabelText("Twilight Transfer recipient Hit Dice"), { target: { value: "6" } });
  fireEvent.change(screen.getByLabelText("Twilight Transfer donor Hit Dice"), { target: { value: "5" } });
  assert.match(screen.getByLabelText("Twilight Transfer eligibility").textContent ?? "", /at least as many Hit Dice/);
  fireEvent.change(screen.getByLabelText("Twilight Transfer donor Hit Dice"), { target: { value: "6" } });
  await user.click(screen.getByLabelText(/Recipient is touched, died within the past round/));
  await user.click(screen.getByLabelText("Donor is willing or unconscious"));
  await user.click(screen.getByLabelText("Donor is living and within 300 feet"));
  await user.click(screen.getByLabelText("Donor will actually die from this death effect"));
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await user.click(transfer);
  } finally {
    Math.random = originalRandom;
  }
  assert.match(screen.getByLabelText("Twilight Transfer result").textContent ?? "", /1 \+ 1 \+ 1 \+ 1 \+ 1 \+ 11 = 16 hit points restored/);
  assert.match(screen.getByLabelText("Arcane Reservoir remaining").textContent ?? "", /2\/14/);
  assert.match(screen.getByLabelText("Arcanist Twilight Transfer remaining").textContent ?? "", /0\/1/);
  assert.equal((transfer as HTMLButtonElement).disabled, true);
});

const releaseSpells: CharacterSpell[] = [
  { id: "magic-missile", name: "Magic Missile", school: "evocation", levelByClass: { arcanist: 1 }, summary: "Force missiles", range: "medium" },
  { id: "shocking-grasp", name: "Shocking Grasp", school: "evocation", levelByClass: { arcanist: 1 }, summary: "Melee touch attack", range: "touch" },
];

function DeathReleaseHarness() {
  const [reservoir, setReservoir] = useState(2);
  const [slotUses, setSlotUses] = useState<Record<number, number>>({});
  const [effects, setEffects] = useState<ActiveEffect[]>([{ id: "release", name: "Death's Release spirit", target: "self", bonus: 0, description: "Spirit", roundsRemaining: 1, deathRelease: true }]);
  return <><output aria-label="Harness reservoir">{reservoir}</output><output aria-label="Harness effects">{effects.length}</output><Spellbook
    spells={releaseSpells}
    classId="arcanist"
    className="Arcanist"
    casterLevel={20}
    castingAbilityName="Intelligence"
    slots={[{ level: 1, base: 2, bonus: 0, count: 2 }]}
    preparedLimits={[{ level: 1, count: 2 }]}
    spellDcs={{ 1: 14 }}
    maximumSpellLevel={1}
    preparedSpellIds={["magic-missile", "shocking-grasp"]}
    onPreparedSpellIdsChange={() => {}}
    slotUses={slotUses}
    onSlotUsesChange={setSlotUses}
    reservoir={{ current: reservoir, maximum: 14, dailyRefresh: 3 }}
    onReservoirChange={setReservoir}
    onRefreshDay={() => {}}
    activeEffects={effects}
    onAddEffect={(effect) => setEffects((current) => [...current.filter((item) => item.name !== effect.name), effect])}
    onRemoveEffectByName={(name) => setEffects((current) => current.filter((effect) => effect.name !== name))}
  /></>;
}

test("Death's Release charges reservoir points and blocks touch delivery", async () => {
  const user = userEvent.setup();
  render(<DeathReleaseHarness />);
  const touchCast = screen.getByRole("button", { name: "Quick cast Shocking Grasp" });
  assert.equal((touchCast as HTMLButtonElement).disabled, true);
  assert.match(touchCast.getAttribute("title") ?? "", /cannot deliver touch/);
  await user.click(screen.getByRole("button", { name: "Quick cast Magic Missile" }));
  assert.equal(screen.getByLabelText("Harness reservoir").textContent, "0");
  assert.equal(screen.getByLabelText("Harness effects").textContent, "0");
});
