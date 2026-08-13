import test from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { JSDOM } from "jsdom";
import type { CharacterSpell } from "../packages/types/src/index.js";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let Spellbook: typeof import("../apps/web/app/spellbook").Spellbook;
let equippedArcaneSpellFailureChance: typeof import("../apps/web/app/equipment-panel").equippedArcaneSpellFailureChance;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ default: userEvent } = await import("@testing-library/user-event"));
  ({ Spellbook } = await import("../apps/web/app/spellbook"));
  ({ equippedArcaneSpellFailureChance } = await import("../apps/web/app/equipment-panel"));
});
test.afterEach(() => cleanup());

test("equipped armor and shields calculate level-aware arcane spell failure", () => {
  const inventory = [
    { itemId: "chain-shirt", quantity: 1, equipped: true },
    { itemId: "buckler", quantity: 1, equipped: true },
  ];
  assert.equal(equippedArcaneSpellFailureChance(inventory, { applies: true }, 1), 25);
  assert.equal(equippedArcaneSpellFailureChance(inventory, { applies: true, ignoredArmorCategories: [{ category: "light", minimumLevel: 1 }] }, 1), 5);
  assert.equal(equippedArcaneSpellFailureChance(inventory, { applies: true, ignoredArmorCategories: [{ category: "light", minimumLevel: 1 }], ignoreShieldsAtLevel: 1 }, 1), 0);
  assert.equal(equippedArcaneSpellFailureChance(inventory, { applies: false }, 1), 0);
});

const somaticSpell: CharacterSpell = { id: "test-somatic", name: "Test Somatic", levelByClass: { wizard: 1 }, summary: "A test spell.", components: ["V", "S"] };

function Harness() {
  const [uses, setUses] = useState<Record<number, number>>({});
  return <Spellbook spells={[somaticSpell]} classId="wizard" className="Wizard" castingAbilityName="Intelligence"
    slots={[{ level: 1, base: 1, bonus: 0, count: 1 }]} preparedLimits={[{ level: 1, count: 1 }]} spellDcs={{ 1: 12 }} maximumSpellLevel={1}
    preparedSpellIds={[somaticSpell.id]} onPreparedSpellIdsChange={() => {}} slotUses={uses} onSlotUsesChange={setUses}
    reservoir={null} onReservoirChange={() => {}} onRefreshDay={() => {}} arcaneSpellFailureChance={20} />;
}

test("casting rolls armor spell failure and consumes a failed prepared slot", async () => {
  const originalRandom = Math.random;
  Math.random = () => 0.09;
  try {
    render(<Harness />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Cast Test Somatic" }));
    assert.match(screen.getByLabelText("Arcane spell failure result").textContent ?? "", /rolled 10.*spell lost/);
    assert.match(screen.getByText(/Wizard slots:/).textContent ?? "", /0\/1 1st-level/);
  } finally {
    Math.random = originalRandom;
  }
});
