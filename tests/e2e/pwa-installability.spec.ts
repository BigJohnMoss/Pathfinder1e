import { expect, test } from "@playwright/test";

test("publishes installable desktop and Android metadata", async ({
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/manifest");

  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "PF1e Character Builder",
    short_name: "PF1e Builder",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#7f1d1d",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
  );
});

test("registers the service worker and reloads the builder offline", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Character name").fill("Offline Hero");
  await page.getByRole("button", { name: "Save" }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  // Reload once online so the active worker controls the page and caches the
  // current production chunks before simulating a disconnected launch.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Character Builder" }),
  ).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Character Builder" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Load" }).click();
  await expect(page.getByLabel("Character name")).toBeVisible();
  await expect(page.getByLabel("Character name")).toHaveValue("Offline Hero");
});

test("fits the builder at an Android phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Character Builder" }),
  ).toBeVisible();
  await expect(page.getByLabel("Character name")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});

test("keeps spell actions separate at an Android phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Spells" }).click();
  await page.getByLabel("Search spells").fill("Abjuring Step");

  const refresh = page.getByRole("button", { name: "Refresh day" });
  const reservoir = page.getByLabel("Arcane Reservoir points");
  const spell = page.locator(".spell-list article").filter({ hasText: "Abjuring Step" });
  const cast = spell.getByRole("button", { name: "Cast Abjuring Step" });
  const preparedControls = spell.locator(".spell-count");

  const [refreshBox, reservoirBox, castBox, preparedBox] = await Promise.all([
    refresh.boundingBox(),
    reservoir.boundingBox(),
    cast.boundingBox(),
    preparedControls.boundingBox(),
  ]);
  expect(refreshBox).not.toBeNull();
  expect(reservoirBox).not.toBeNull();
  expect(castBox).not.toBeNull();
  expect(preparedBox).not.toBeNull();
  expect(refreshBox!.y + refreshBox!.height).toBeLessThanOrEqual(reservoirBox!.y);
  expect(castBox!.x + castBox!.width).toBeLessThanOrEqual(preparedBox!.x);

  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});

test("keeps mobile name typing focused and uses compact accessible controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Character & levels" }).click();

  const name = page.getByLabel("Character name");
  await name.focus();
  for (const letter of "Kyra") {
    await page.keyboard.type(letter);
    await expect(name).toBeFocused();
  }
  await expect(name).toHaveValue("Kyra");

  await expect(page.locator(".character-setup-section")).toHaveAttribute("open", "");
  await expect(page.locator(".character-file-section")).toHaveAttribute("open", "");
  await page.locator(".character-file-section > summary").click();
  await expect(page.locator(".character-file-section")).not.toHaveAttribute("open", "");
  await page.locator(".level-progression > summary").click();
  await expect(page.locator(".level-progression")).not.toHaveAttribute("open", "");

  await page.getByRole("button", { name: "Review level 2" }).click();
  const classSelector = page.getByLabel("Class receiving this level");
  const selectorBox = await classSelector.boundingBox();
  expect(selectorBox).not.toBeNull();
  expect(selectorBox!.height).toBeGreaterThanOrEqual(44);
  expect(selectorBox!.width).toBeGreaterThan(250);

  const actionBoxes = await Promise.all([
    page.getByRole("button", { name: "Advance to level 2" }).boundingBox(),
    page.getByRole("button", { name: "Not yet" }).boundingBox(),
  ]);
  for (const box of actionBoxes) expect(box!.height).toBeGreaterThanOrEqual(44);

  const tabRows = await page.locator(".character-tabs [role=tab]").evaluateAll((tabs) => tabs.map((tab) => Math.round(tab.getBoundingClientRect().top)));
  expect(new Set(tabRows).size).toBe(1);
});

test("manages feat discovery and selection at an Android phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Feats" }).click();

  await expect(page.getByRole("heading", { name: "Feat manager" })).toBeVisible();
  await page.getByRole("button", { name: "Choose Human bonus feat" }).click();
  await page.getByRole("searchbox", { name: "Search feats" }).fill("Toughness");
  await expect(page.getByText("1 of 3448 feats shown")).toBeVisible();

  const toughness = page.locator(".feat-card").filter({ has: page.locator("summary strong", { hasText: "Toughness" }) });
  await toughness.locator("summary").click();
  await expect(toughness.getByText(/Gain 3 hit points/)).toBeVisible();
  await toughness.getByRole("button", { name: "Choose for Human bonus feat" }).click();
  await expect(toughness.getByText("Selected", { exact: true })).toBeVisible();
  await expect(page.locator(".selected-feat-summary > strong", { hasText: "Toughness" })).toBeVisible();
  await expect(page.locator(".feat-slots option")).toHaveCount(0);

  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});
