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
