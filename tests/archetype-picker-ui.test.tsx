import test from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let ArchetypePicker: typeof import("../apps/web/app/archetype-picker").ArchetypePicker;

const archetypes = [
  { id: "archer", name: "Archer", classId: "fighter", summary: "A ranged specialist.", replacesText: "Bravery", replacements: [{ featureIds: ["bravery-2"], features: [] }], mechanicalCoverage: "full" as const },
  { id: "armourer", name: "Armourer", classId: "fighter", summary: "An armour specialist.", replacesText: "Weapon Training", replacements: [{ featureIds: ["weapon-training-5"], features: [] }], mechanicalCoverage: "partial" as const },
  { id: "rival", name: "Rival Archer", classId: "fighter", summary: "Another ranged specialist.", replacesText: "Bravery", replacements: [{ featureIds: ["bravery-2"], features: [] }], mechanicalCoverage: "partial" as const },
  { id: "dwarven", name: "Dwarven Defender", classId: "fighter", summary: "A dwarven path.", requirements: [{ type: "ancestry" as const, id: "dwarf" }], replacements: [], mechanicalCoverage: "full" as const }
];

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, React });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  ({ ArchetypePicker } = await import("../apps/web/app/archetype-picker"));
});
test.afterEach(() => cleanup());

function Harness() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return <ArchetypePicker className="Fighter" archetypes={archetypes} selectedIds={selectedIds} ancestryId="human" onChange={setSelectedIds} />;
}

test("archetype search filters choices and ancestry restrictions stay unavailable", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.type(screen.getByRole("searchbox", { name: "Search archetypes" }), "armour");
  const select = screen.getByLabelText("Archetype") as HTMLSelectElement;
  assert.deepEqual([...select.options].map(option => option.text), ["Standard class", "Armourer"]);
  await user.clear(screen.getByRole("searchbox", { name: "Search archetypes" }));
  assert.equal([...select.options].find(option => option.value === "dwarven")?.disabled, true);
  await user.selectOptions(screen.getByLabelText("Mechanical coverage"), "full");
  assert.deepEqual([...select.options].filter(option => option.value).map(option => option.text), ["Archer", "Dwarven Defender"]);
});

test("compatible archetypes stack and conflicting choices are disabled", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.selectOptions(screen.getByLabelText("Archetype"), "archer");
  const additional = screen.getByLabelText("Add compatible archetype") as HTMLSelectElement;
  assert.equal([...additional.options].find(option => option.value === "rival")?.disabled, true);
  await user.selectOptions(additional, "armourer");
  assert.ok(screen.getByRole("button", { name: "Remove Archer" }));
  assert.ok(screen.getByRole("button", { name: "Remove Armourer" }));
});

test("changing ancestry removes a selected archetype that is no longer legal", async () => {
  const user = userEvent.setup();
  function AncestryHarness() {
    const [selectedIds, setSelectedIds] = useState<string[]>(["dwarven"]);
    const [ancestryId, setAncestryId] = useState("dwarf");
    return <><button type="button" onClick={() => setAncestryId("human")}>Become human</button><ArchetypePicker className="Fighter" archetypes={archetypes} selectedIds={selectedIds} ancestryId={ancestryId} onChange={setSelectedIds} /></>;
  }
  render(<AncestryHarness />);
  assert.ok(screen.getByRole("button", { name: "Remove Dwarven Defender" }));
  await user.click(screen.getByRole("button", { name: "Become human" }));
  assert.equal((screen.getByLabelText("Archetype") as HTMLSelectElement).value, "");
});
