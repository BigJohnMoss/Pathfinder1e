import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("all five APG classes remain selectable through level 20", async ({ page }) => {
  test.setTimeout(60_000);
  for (const [id, name] of [["alchemist","Alchemist"],["cavalier","Cavalier"],["inquisitor","Inquisitor"],["witch","Witch"],["summoner","Summoner"]]) {
    await page.getByLabel("Class", { exact: true }).selectOption(id);
    await page.locator('input[type="number"][max="20"]').first().fill("20");
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByRole("heading", { name: new RegExp(`${name} features`, "i") })).toBeVisible();
  }
});

test("configures and restores a level-20 Summoner eidolon", async ({ page }) => {
  test.setTimeout(60_000);
  await page.getByLabel("Class", { exact: true }).selectOption("summoner");
  await page.locator('input[type="number"][max="20"]').first().fill("20");
  await page.getByRole("tab", { name: "Features" }).click();
  await page.getByLabel(/Eidolon.*level 1/i).selectOption("eidolon-quadruped");
  await expect(page.getByRole("heading", { name: "Build your eidolon" })).toBeVisible();
  await page.getByText("Tail", { exact: true }).click();
  await page.getByText("Tail Slap", { exact: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByRole("tab", { name: "Features" }).click();
  await expect(page.getByText("2 / 26 evolution points")).toBeVisible();
});

test("Magus, Gunslinger, and Samurai remain configurable through level 20", async ({ page }) => {
  test.setTimeout(120_000);
  for (const [id, name] of [["magus", "Magus"], ["gunslinger", "Gunslinger"], ["samurai", "Samurai"]]) {
    await page.getByLabel("Class", { exact: true }).selectOption(id);
    await page.locator('input[type="number"][min="1"][max="20"]').fill("20");
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByRole("heading", { name: new RegExp(`${name} features`, "i") })).toBeVisible();
  }
});
