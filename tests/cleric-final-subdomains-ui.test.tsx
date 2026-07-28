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

test("Plant, Trickery, War, Water, and Weather subdomains inherit deity access and exclude their parents", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cleric");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const deity = screen.getAllByText("Deity").at(-1)!.closest("label")?.querySelector("select");
  const firstDomain = screen.getAllByText("First Domain").at(-1)!.closest("label")?.querySelector("select");
  const secondDomain = screen.getAllByText("Second Domain").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(deity); assert.ok(firstDomain); assert.ok(secondDomain);

  await user.selectOptions(deity, "deity-erastil");
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-decay"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-growth"), true);
  await user.selectOptions(firstDomain, "subdomain-growth");
  assert.ok(screen.getByText("Enlarge"));
  assert.ok(screen.getByText("righteous might"));
  assert.equal((secondDomain.querySelector("option[value='domain-plant']") as HTMLOptionElement).disabled, true);

  await user.selectOptions(deity, "deity-asmodeus");
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-deception"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-thievery"), true);
  await user.selectOptions(firstDomain, "subdomain-deception");
  assert.ok(screen.getByText("Sudden Shift"));
  assert.ok(screen.getByText("project image"));

  await user.selectOptions(deity, "deity-gorum");
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-blood"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-tactics"), true);
  await user.selectOptions(firstDomain, "subdomain-blood");
  assert.ok(screen.getByText("Wounding Blade"));
  assert.ok(screen.getByText("wall of thorns"));

  await user.selectOptions(deity, "deity-gozreh");
  for (const id of ["subdomain-ice", "subdomain-oceans", "subdomain-seasons", "subdomain-storms"]) {
    assert.equal([...firstDomain.options].some((option) => option.value === id), true);
  }
  await user.selectOptions(firstDomain, "subdomain-oceans");
  assert.ok(screen.getByText("Surge"));
  assert.ok(screen.getByText("tsunami"));
  await user.selectOptions(secondDomain, "subdomain-seasons");
  assert.ok(screen.getByText("Untouched by the Seasons"));
  assert.ok(screen.getByText("sunburst"));
});
