import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";

let render: typeof import("@testing-library/react").render;
let screen: typeof import("@testing-library/react").screen;
let cleanup: typeof import("@testing-library/react").cleanup;
let waitFor: typeof import("@testing-library/react").waitFor;
let fireEvent: typeof import("@testing-library/react").fireEvent;
let userEvent: typeof import("@testing-library/user-event").default;
let Home: typeof import("../apps/web/app/page").default;

test.before(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.assign(globalThis, { React });
  ({ render, screen, cleanup, waitFor, fireEvent } = await import("@testing-library/react"));
  userEvent = (await import("@testing-library/user-event")).default;
  Home = (await import("../apps/web/app/page")).default;
});

test.afterEach(() => { cleanup(); localStorage.clear(); });

const ragePowerSelects = () => screen.getAllByRole("combobox").filter((select) =>
  [...(select as HTMLSelectElement).options].some((option) => option.value === "beast-totem-lesser")
) as HTMLSelectElement[];

const option = (select: HTMLSelectElement, value: string) => {
  const result = [...select.options].find((candidate) => candidate.value === value);
  assert.ok(result, `${value} option`);
  return result;
};

test("Barbarian permits one totem chain while disabling competing families", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "10" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  let powers = ragePowerSelects();
  assert.equal(powers.length, 5);
  await user.selectOptions(powers[0], "beast-totem-lesser");
  await waitFor(() => assert.equal(option(ragePowerSelects()[1], "chaos-totem-lesser").disabled, true));
  assert.equal(option(ragePowerSelects()[1], "beast-totem").disabled, false);

  await user.selectOptions(ragePowerSelects()[1], "beast-totem");
  await waitFor(() => assert.equal(option(ragePowerSelects()[2], "beast-totem-greater").disabled, false));
  await user.selectOptions(ragePowerSelects()[2], "beast-totem-greater");
  assert.equal(option(ragePowerSelects()[3], "spirit-totem-lesser").disabled, true);
});

test("Barbarian respects the five-selection cap for Energy Resistance", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.selectOptions(screen.getByLabelText("Class"), "barbarian");
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "20" } });
  await user.click(screen.getByRole("tab", { name: "Features" }));

  const energyTypes = ["acid", "cold", "electricity", "fire", "sonic"];
  for (let index = 0; index < energyTypes.length; index += 1) {
    await user.selectOptions(ragePowerSelects()[index], "energy-resistance");
    const detailSelects = screen.getAllByLabelText("Rage Power Energy type") as HTMLSelectElement[];
    if (index > 0) assert.equal(option(detailSelects[index], "acid").disabled, true);
    await user.selectOptions(detailSelects[index], energyTypes[index]);
  }
  await waitFor(() => assert.equal(option(ragePowerSelects()[5], "energy-resistance").disabled, true));
});

