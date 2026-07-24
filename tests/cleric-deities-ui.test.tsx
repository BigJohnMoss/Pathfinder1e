import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("cleric domains follow the selected deity and show their powers and spells", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cleric");
  await user.click(screen.getByRole("button", { name: "Options" }));

  const deity = screen.getByText("Deity").closest("label")?.querySelector("select");
  const firstDomain = screen.getByText("First Domain").closest("label")?.querySelector("select");
  const secondDomain = screen.getByText("Second Domain").closest("label")?.querySelector("select");
  assert.ok(deity);
  assert.ok(firstDomain);
  assert.ok(secondDomain);
  assert.equal(firstDomain.disabled, true);
  assert.equal(secondDomain.disabled, true);
  assert.equal(firstDomain.options[0].text, "Choose a deity first");

  await user.selectOptions(deity, "deity-sarenrae");
  assert.equal(firstDomain.disabled, false);
  assert.equal([...firstDomain.options].some((option) => option.value === "domain-fire"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "domain-law"), false);

  await user.selectOptions(firstDomain, "domain-fire");
  assert.equal(firstDomain.value, "domain-fire");
  assert.ok(screen.getByText("Fire Bolt"));
  assert.ok(screen.getByText("Fire Resistance"));
  assert.ok(screen.getByText("burning hands"));
  assert.ok(screen.getByText("elemental swarm (fire only)"));
  assert.equal((secondDomain.querySelector("option[value='domain-fire']") as HTMLOptionElement).disabled, true);

  await user.selectOptions(secondDomain, "domain-sun");
  assert.equal(secondDomain.value, "domain-sun");
  assert.ok(screen.getByText("Sun's Blessing"));
  assert.ok(screen.getByText("Nimbus of Light"));
  assert.ok(screen.getByText("sunburst"));

  await user.selectOptions(deity, "deity-torag");
  assert.equal([...firstDomain.options].some((option) => option.value === "domain-law"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "domain-fire"), false);
  assert.equal(firstDomain.value, "");
  assert.equal(secondDomain.value, "");
});
