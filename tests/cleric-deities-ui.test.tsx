import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

test("cleric domains follow the selected deity and show their powers and spells", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cleric");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const deity = screen.getAllByText("Deity").at(-1)!.closest("label")?.querySelector("select");
  const firstDomain = screen.getAllByText("First Domain").at(-1)!.closest("label")?.querySelector("select");
  const secondDomain = screen.getAllByText("Second Domain").at(-1)!.closest("label")?.querySelector("select");
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
  assert.ok(screen.getAllByText("burning hands").length >= 1);
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
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-caves"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-metal"), true);
  await user.selectOptions(firstDomain, "subdomain-metal");
  assert.ok(screen.getByText("Metal Fist"));
  assert.ok(screen.getByText("heat metal"));
  assert.equal((secondDomain.querySelector("option[value='domain-earth']") as HTMLOptionElement).disabled, true);
  assert.equal((secondDomain.querySelector("option[value='subdomain-caves']") as HTMLOptionElement).disabled, true);
  await user.selectOptions(deity, "deity-erastil");
  await user.selectOptions(firstDomain, "subdomain-feather");
  assert.ok(screen.getByText("Eyes of the Hawk"));
  assert.ok(screen.getByText("Granted class skills:").closest("p")?.textContent?.includes("Fly"));
  await user.click(screen.getByRole("tab", { name: "Skills" }));
  assert.ok(screen.getByText("Fly").closest("label")?.textContent?.includes("Class skill"));
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const liveDeity = screen.getAllByText("Deity").at(-1)!.closest("label")?.querySelector("select");
  const liveFirstDomain = screen.getAllByText("First Domain").at(-1)!.closest("label")?.querySelector("select");
  const liveSecondDomain = screen.getAllByText("Second Domain").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(liveDeity);
  assert.ok(liveFirstDomain);
  assert.ok(liveSecondDomain);
  await user.selectOptions(liveDeity, "deity-calistria");
  assert.equal([...liveFirstDomain.options].some((option) => option.value === "subdomain-protean"), true);
  assert.equal([...liveFirstDomain.options].some((option) => option.value === "subdomain-love"), true);
  assert.equal([...liveFirstDomain.options].some((option) => option.value === "subdomain-lust"), true);
  await user.selectOptions(liveFirstDomain, "subdomain-protean");
  await user.selectOptions(liveSecondDomain, "subdomain-love");
  assert.ok(screen.getByText("Aura of Chaos"));
  assert.ok(screen.getByText("Adoration"));
  assert.equal((liveFirstDomain.querySelector("option[value='subdomain-lust']") as HTMLOptionElement).disabled, true);
});

test("Community and Darkness subdomains inherit deity access and exclude their parent", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cleric");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const deity = screen.getAllByText("Deity").at(-1)!.closest("label")?.querySelector("select");
  const firstDomain = screen.getAllByText("First Domain").at(-1)!.closest("label")?.querySelector("select");
  const secondDomain = screen.getAllByText("Second Domain").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(deity);
  assert.ok(firstDomain);
  assert.ok(secondDomain);

  await user.selectOptions(deity, "deity-erastil");
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-family"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-home"), true);
  await user.selectOptions(firstDomain, "subdomain-family");
  assert.ok(screen.getByText("Binding Ties"));
  assert.ok(screen.getByText("create food and water"));
  assert.equal((secondDomain.querySelector("option[value='domain-community']") as HTMLOptionElement).disabled, true);
  assert.equal((secondDomain.querySelector("option[value='subdomain-home']") as HTMLOptionElement).disabled, true);

  await user.selectOptions(deity, "deity-zon-kuthon");
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-loss"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-night"), true);
  await user.selectOptions(firstDomain, "subdomain-night");
  assert.ok(screen.getByText("Night Hunter"));
  assert.ok(screen.getAllByText("sleep").length >= 1);
});

test("Death and Destruction subdomains inherit deity access and exclude their parent", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cleric");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const deity = screen.getAllByText("Deity").at(-1)!.closest("label")?.querySelector("select");
  const firstDomain = screen.getAllByText("First Domain").at(-1)!.closest("label")?.querySelector("select");
  const secondDomain = screen.getAllByText("Second Domain").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(deity);
  assert.ok(firstDomain);
  assert.ok(secondDomain);

  await user.selectOptions(deity, "deity-norgorber");
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-murder"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-undead"), true);
  await user.selectOptions(firstDomain, "subdomain-murder");
  assert.ok(screen.getByText("Killing Blow"));
  assert.ok(screen.getByText("mass suffocation"));
  assert.equal((secondDomain.querySelector("option[value='domain-death']") as HTMLOptionElement).disabled, true);
  assert.equal((secondDomain.querySelector("option[value='subdomain-undead']") as HTMLOptionElement).disabled, true);

  await user.selectOptions(deity, "deity-gorum");
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-catastrophe"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-rage"), true);
  await user.selectOptions(firstDomain, "subdomain-catastrophe");
  assert.ok(screen.getByText("Deadly Weather"));
  assert.ok(screen.getByText("control weather"));
  assert.equal((secondDomain.querySelector("option[value='domain-destruction']") as HTMLOptionElement).disabled, true);
  assert.equal((secondDomain.querySelector("option[value='subdomain-rage']") as HTMLOptionElement).disabled, true);
});

test("Evil and Fire subdomains inherit access with parent-specific outsider variants", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cleric");
  await user.click(screen.getByRole("tab", { name: "Features" }));
  const deity = screen.getAllByText("Deity").at(-1)!.closest("label")?.querySelector("select");
  const firstDomain = screen.getAllByText("First Domain").at(-1)!.closest("label")?.querySelector("select");
  const secondDomain = screen.getAllByText("Second Domain").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(deity); assert.ok(firstDomain); assert.ok(secondDomain);

  await user.selectOptions(deity, "deity-lamashtu");
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-demon-chaos"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-demon-evil"), true);
  await user.selectOptions(firstDomain, "subdomain-demon-chaos");
  assert.ok(screen.getByText("Fury of the Abyss"));
  assert.ok(screen.getByText("chaos hammer"));
  assert.equal((secondDomain.querySelector("option[value='domain-chaos']") as HTMLOptionElement).disabled, true);
  assert.equal((secondDomain.querySelector("option[value='subdomain-demon-evil']") as HTMLOptionElement).disabled, false);

  await user.selectOptions(deity, "deity-asmodeus");
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-devil-evil"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-devil-law"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-ash"), true);
  assert.equal([...firstDomain.options].some((option) => option.value === "subdomain-smoke"), true);
  await user.selectOptions(firstDomain, "subdomain-devil-law");
  assert.ok(screen.getByText("Hell's Corruption"));
  assert.ok(screen.getByText("order's wrath"));
  await user.selectOptions(secondDomain, "subdomain-ash");
  assert.ok(screen.getByText("Wall of Ashes"));
  assert.ok(screen.getByText("fiery body"));
});

test("Cleric prepares and tracks dedicated domain spell slots", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cleric");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "5" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const deity = screen.getAllByText("Deity").at(-1)!.closest("label")?.querySelector("select");
  const firstDomain = screen.getAllByText("First Domain").at(-1)!.closest("label")?.querySelector("select");
  const secondDomain = screen.getAllByText("Second Domain").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(deity);
  assert.ok(firstDomain);
  assert.ok(secondDomain);
  await user.selectOptions(deity, "deity-sarenrae");
  await user.selectOptions(firstDomain, "domain-fire");
  await user.selectOptions(secondDomain, "domain-sun");

  const firstSlot = screen.getAllByText("1st-level Domain Spell Slot").at(-1)!.closest("label")?.querySelector("select");
  const secondSlot = screen.getAllByText("2nd-level Domain Spell Slot").at(-1)!.closest("label")?.querySelector("select");
  const thirdSlot = screen.getAllByText("3rd-level Domain Spell Slot").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(firstSlot);
  assert.ok(secondSlot);
  assert.ok(thirdSlot);
  assert.deepEqual([...firstSlot.options].slice(1).map((option) => option.text), ["burning hands", "endure elements"]);
  assert.deepEqual([...secondSlot.options].slice(1).map((option) => option.text), ["heat metal", "produce flame"]);
  assert.deepEqual([...thirdSlot.options].slice(1).map((option) => option.text), ["fireball", "searing light"]);

  await user.selectOptions(firstSlot, "domain-spell-1-burning-hands");
  await user.selectOptions(secondSlot, "domain-spell-2-heat-metal");
  await user.selectOptions(thirdSlot, "domain-spell-3-fireball");
  assert.equal(screen.getByLabelText("1st-level Domain Spell Slot status").textContent, "Available");
  await user.click(screen.getByRole("button", { name: "Cast burning hands from 1st-level Domain Spell Slot" }));
  assert.equal(screen.getByLabelText("1st-level Domain Spell Slot status").textContent, "Used");
  assert.equal((screen.getByRole("button", { name: "Cast burning hands from 1st-level Domain Spell Slot" }) as HTMLButtonElement).disabled, true);

  await user.click(screen.getByRole("button", { name: "Refresh domain spell slots" }));
  assert.equal(screen.getByLabelText("1st-level Domain Spell Slot status").textContent, "Available");

  await user.selectOptions(firstDomain, "domain-healing");
  assert.equal(firstSlot.value, "");
  assert.equal([...firstSlot.options].some((option) => option.text === "cure light wounds"), true);
  assert.equal([...firstSlot.options].some((option) => option.text === "burning hands"), false);
});

test("Cleric alignment, channel polarity, and daily uses follow the selected deity", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "cleric");
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const deity = screen.getAllByText("Deity").at(-1)!.closest("label")?.querySelector("select");
  const alignment = screen.getAllByText("Alignment").at(-1)!.closest("label")?.querySelector("select");
  const channel = screen.getAllByText("Channel Energy Type").at(-1)!.closest("label")?.querySelector("select");
  assert.ok(deity);
  assert.ok(alignment);
  assert.ok(channel);
  assert.equal(alignment.disabled, true);
  assert.equal(channel.disabled, true);

  await user.selectOptions(deity, "deity-iomedae");
  assert.deepEqual([...alignment.options].slice(1).map((option) => option.text), ["Lawful Good", "Neutral Good", "Lawful Neutral"]);
  await user.selectOptions(alignment, "alignment-lawful-neutral");
  assert.equal(channel.value, "channel-positive");
  assert.equal(channel.disabled, true);
  assert.ok(screen.getByText(/Spontaneously convert prepared non-domain spells into cure spells/));
  assert.ok(screen.getByText("1d6"));
  assert.ok(screen.getByText("Will DC 10"));
  assert.equal(screen.getByLabelText("Channel energy uses").textContent, "3/3 uses remaining");

  await user.click(screen.getByRole("button", { name: "Use channel energy" }));
  await user.click(screen.getByRole("button", { name: "Use channel energy" }));
  assert.equal(screen.getByLabelText("Channel energy uses").textContent, "1/3 uses remaining");
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Refresh channels" }));
  assert.equal(screen.getByLabelText("Channel energy uses").textContent, "3/3 uses remaining");
  await user.click(screen.getByRole("button", { name: "Load" }));
  assert.equal(screen.getByLabelText("Channel energy uses").textContent, "1/3 uses remaining");

  await user.selectOptions(deity, "deity-asmodeus");
  assert.equal(alignment.value, "alignment-lawful-neutral");
  assert.equal(channel.value, "channel-negative");
  assert.ok(screen.getByText(/Spontaneously convert prepared non-domain spells into inflict spells/));
  assert.equal(screen.getByLabelText("Channel energy uses").textContent, "1/3 uses remaining");

  await user.selectOptions(deity, "deity-gozreh");
  assert.equal(alignment.value, "alignment-lawful-neutral");
  assert.equal(channel.disabled, false);
  assert.deepEqual([...channel.options].slice(1).map((option) => option.text), ["Positive Energy", "Negative Energy"]);
  await user.selectOptions(alignment, "alignment-neutral");
  await user.selectOptions(channel, "channel-negative");
  assert.equal(channel.value, "channel-negative");
});
