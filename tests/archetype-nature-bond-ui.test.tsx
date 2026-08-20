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

async function openArchetype(id: string) {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "druid");
  await user.selectOptions(screen.getByLabelText("Archetype"), id);
  await user.click(screen.getByRole("tab", { name: "Features" }));
  return user;
}

test("Sunrider keeps a usable Nature Bond selector and only offers horse or pony", async () => {
  const user = await openArchetype("druid-sunrider");
  const bond = screen.getByLabelText("Nature Bond (Ex) level 1") as HTMLSelectElement;
  assert.deepEqual(Array.from(bond.options).filter((option) => option.value).map((option) => option.value), ["druid-nature-bond-animal"]);
  await user.selectOptions(bond, "druid-nature-bond-animal");
  const companion = screen.getByLabelText("Animal Companion Choice level 1") as HTMLSelectElement;
  assert.deepEqual(Array.from(companion.options).filter((option) => option.value).map((option) => option.value), [
    "ranger-animal-companion-horse",
    "ranger-animal-companion-pony",
  ]);
});

test("Storm Druid only offers the domain path and its five legal domains", async () => {
  const user = await openArchetype("druid-storm-druid");
  const bond = screen.getByLabelText("Nature Bond level 1") as HTMLSelectElement;
  assert.deepEqual(Array.from(bond.options).filter((option) => option.value).map((option) => option.value), ["druid-nature-bond-domain"]);
  await user.selectOptions(bond, "druid-nature-bond-domain");
  const domains = screen.getByLabelText("Nature Domain level 1") as HTMLSelectElement;
  assert.deepEqual(Array.from(domains.options).filter((option) => option.value).map((option) => option.value), [
    "domain-air", "domain-weather", "subdomain-cloud", "subdomain-wind", "subdomain-storms",
  ]);
});

test("Serpent Shaman filters both companion and domain branches", async () => {
  const user = await openArchetype("druid-serpent-shaman");
  const bond = screen.getByLabelText("Nature Bond level 1") as HTMLSelectElement;
  await user.selectOptions(bond, "druid-nature-bond-animal");
  const companion = screen.getByLabelText("Animal Companion Choice level 1") as HTMLSelectElement;
  assert.deepEqual(Array.from(companion.options).filter((option) => option.value).map((option) => option.value), [
    "ranger-animal-companion-constrictor-snake", "ranger-animal-companion-viper-snake",
  ]);
  await user.selectOptions(bond, "druid-nature-bond-domain");
  const domains = screen.getByLabelText("Nature Domain level 1") as HTMLSelectElement;
  assert.deepEqual(Array.from(domains.options).filter((option) => option.value).map((option) => option.value), [
    "domain-animal", "domain-charm", "domain-trickery", "domain-water",
  ]);
});
