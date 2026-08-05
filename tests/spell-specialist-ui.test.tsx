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
let Spellbook: typeof import("../apps/web/app/spellbook").Spellbook;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    localStorage: dom.window.localStorage,
  });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  ({ default: userEvent } = await import("@testing-library/user-event"));
  ({ Spellbook } = await import("../apps/web/app/spellbook"));
  Home = (await import("../apps/web/app/page")).default;
});
test.afterEach(() => { cleanup(); localStorage.clear(); });

const spells: CharacterSpell[] = [
  { id: "lightning-bolt", name: "Lightning Bolt", levelByClass: { arcanist: 3 }, summary: "Electricity in a line.", area: "120-ft. line", duration: "instantaneous" },
  { id: "fireball", name: "Fireball", levelByClass: { arcanist: 3 }, summary: "A fiery burst.", area: "20-ft.-radius spread", duration: "instantaneous" },
  { id: "sleet-storm", name: "Sleet Storm", levelByClass: { arcanist: 3 }, summary: "Driving sleet obscures an area.", area: "cylinder (40-ft. radius, 20 ft. high)", duration: "1 round/level" },
];

const signatureCosts = Object.fromEntries(spells.map((spell) => [spell.id, {
  cost: 0,
  label: "Signature Spell",
  consumesSpellSlot: true,
  saveDcBonus: 1,
  concentrationBonus: 2,
  signatureSpellTechniques: true,
}]));

function Harness() {
  const [reservoir, setReservoir] = useState(4);
  const [slotUses, setSlotUses] = useState<Record<number, number>>({});
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  return <>
    <output aria-label="Test reservoir">{reservoir}</output>
    <Spellbook
      spells={spells}
      classId="arcanist"
      className="Arcanist (Spell Specialist)"
      casterLevel={6}
      castingAbilityName="Intelligence"
      slots={[{ level: 3, base: 4, bonus: 0, count: 4 }]}
      preparedLimits={[{ level: 3, count: 2 }]}
      spellDcs={{ 3: 16 }}
      maximumSpellLevel={3}
      preparedSpellIds={[]}
      onPreparedSpellIdsChange={() => {}}
      slotUses={slotUses}
      onSlotUsesChange={setSlotUses}
      reservoir={{ current: reservoir, maximum: 9, dailyRefresh: 3 }}
      onReservoirChange={setReservoir}
      onRefreshDay={() => {}}
      onDemandSpellCosts={signatureCosts}
      activeEffects={effects}
      onAddEffect={(effect) => setEffects((current) => [...current.filter((item) => item.name !== effect.name), effect])}
      onRemoveEffectByName={(name) => setEffects((current) => current.filter((effect) => effect.name !== name))}
    />
  </>;
}

test("Spell Specialist enforces geometry and reservoir costs for Spell Bender and Spellwarp", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  assert.ok(screen.getByRole("button", { name: "Cast Lightning Bolt with Spell Bender" }));
  assert.equal(screen.queryByRole("button", { name: "Cast Fireball with Spell Bender" }), null);
  assert.ok(screen.getByRole("button", { name: "Cast Fireball with Spellwarp" }));
  assert.equal(screen.queryByRole("button", { name: "Cast Lightning Bolt with Spellwarp" }), null);

  await user.click(screen.getByRole("button", { name: "Cast Lightning Bolt with Spell Bender" }));
  assert.equal(screen.getByLabelText("Test reservoir").textContent, "3");
  assert.match(screen.getByLabelText("Lightning Bolt signature technique result").textContent ?? "", /90 degrees/);

  fireEvent.change(screen.getByLabelText("Fireball Spellwarp size"), { target: { value: "10" } });
  await user.click(screen.getByRole("button", { name: "Cast Fireball with Spellwarp" }));
  assert.equal(screen.getByLabelText("Test reservoir").textContent, "2");
  assert.match(screen.getByLabelText("Fireball signature technique result").textContent ?? "", /10 feet/);
});

test("Spell Specialist tracks duration spells and dismisses them for one reservoir point", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const dismiss = screen.getByRole("button", { name: "Dismiss Sleet Storm with Spell Specialist" });
  assert.equal((dismiss as HTMLButtonElement).disabled, true);
  await user.click(screen.getByRole("button", { name: "Cast Sleet Storm" }));
  assert.equal((dismiss as HTMLButtonElement).disabled, false);
  await user.click(dismiss);
  assert.equal(screen.getByLabelText("Test reservoir").textContent, "3");
  assert.match(screen.getByLabelText("Sleet Storm signature technique result").textContent ?? "", /dismissed as a swift action/);
  assert.equal((dismiss as HTMLButtonElement).disabled, true);
});

test("signature exchanges unlock only when an Arcanist class level is gained", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Archetype"), "arcanist-spell-specialist");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const signature = await screen.findByLabelText("Signature Spells level 1");
  await user.selectOptions(signature, "spell-specialist-signature-spells-magic-missile");
  assert.equal((signature as HTMLSelectElement).disabled, true);
  assert.ok(screen.getByText("Locked until another Arcanist class level is gained."));

  await user.click(screen.getByRole("button", { name: "Review level 2" }));
  await user.selectOptions(screen.getByLabelText("Class receiving this level"), "fighter");
  await user.click(screen.getByRole("button", { name: "Advance to level 2" }));
  assert.equal((signature as HTMLSelectElement).disabled, true, "a Fighter level must not grant a signature exchange");

  await user.click(screen.getByRole("button", { name: "Review level 3" }));
  await user.selectOptions(screen.getByLabelText("Class receiving this level"), "arcanist");
  await user.click(screen.getByRole("button", { name: "Advance to level 3" }));
  assert.equal((signature as HTMLSelectElement).disabled, false);
  assert.ok(screen.getByText("1 signature spell exchange available from Arcanist levels gained."));
  await user.selectOptions(signature, "spell-specialist-signature-spells-burning-hands");
  assert.equal((signature as HTMLSelectElement).disabled, true);
  assert.ok(screen.getByText("Locked until another Arcanist class level is gained."));
});
