import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("builds and persists a martial loadout", async ({ page }) => {
  await page.getByLabel("Character name").fill("Valeros");
  await page.getByLabel("Class").selectOption("fighter");
  await page.getByRole("button", { name: "Storage" }).click();
  await page.getByLabel("Equipment catalogue").selectOption("longsword");
  await page.getByLabel("Equipment catalogue").selectOption("chain-shirt");

  const armor = page.locator("article").filter({ hasText: "Chain shirt" });
  await armor.getByRole("checkbox", { name: "Equipped" }).check();
  await page.getByLabel("GP").fill("125");
  await expect(page.getByText("29 lb. carried — light load")).toBeVisible();

  const sword = page.locator("article").filter({ hasText: "Longsword" });
  await expect(sword).toContainText("Damage 1d8");
  await expect(sword).toContainText("Critical 19–20/×2");
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByRole("button", { name: "Storage" }).click();
  await expect(page.getByLabel("GP")).toHaveValue("125");
  await expect(page.locator("article").filter({ hasText: "Chain shirt" }).getByRole("checkbox", { name: "Equipped" })).toBeChecked();
});

test("prepares and casts a Druid spell", async ({ page }) => {
  await page.getByLabel("Class").selectOption("druid");
  await page.getByLabel("Wisdom base score").fill("16");
  await page.getByLabel("Level").fill("5");
  await page.getByRole("button", { name: "Spells" }).click();
  await expect(page.getByRole("heading", { name: "Prepared spells" })).toBeVisible();
  await page.getByLabel("Search spells").fill("Entangle");
  await page.getByRole("button", { name: "Add Entangle" }).click();
  await expect(page.getByLabel("Entangle prepared")).toHaveText("1");
  await page.getByRole("button", { name: "Cast Entangle" }).click();
  await expect(page.getByText(/Druid slots:/)).toContainText("1st-level");
});

test("learns and casts a spontaneous Bard spell", async ({ page }) => {
  await page.getByLabel("Class").selectOption("bard");
  await page.getByLabel("Charisma base score").fill("16");
  await page.getByRole("button", { name: "Spells" }).click();
  await expect(page.getByRole("heading", { name: "Spontaneous spells" })).toBeVisible();
  await page.getByLabel("Search spells").fill("Cure Light Wounds");
  await page.getByRole("button", { name: "Learn Cure Light Wounds" }).click();
  await expect(page.getByLabel("Cure Light Wounds known")).toHaveText("Known");
  await page.getByRole("button", { name: "Cast Cure Light Wounds" }).click();
  await expect(page.getByText(/Bard slots:/)).toBeVisible();
});

test("updates feat eligibility at a prerequisite boundary", async ({ page }) => {
  await page.getByLabel("Class").selectOption("fighter");
  await page.getByRole("button", { name: "Feats" }).click();
  const powerAttack = page.getByLabel("Human bonus feat").locator('option[value="power-attack"]');
  await expect(powerAttack).toHaveAttribute("disabled", "");
  await page.getByRole("button", { name: "Basic info" }).click();
  await page.getByLabel("Strength base score").fill("13");
  await page.getByRole("button", { name: "Feats" }).click();
  await expect(page.getByLabel("Human bonus feat").locator('option[value="power-attack"]')).not.toHaveAttribute("disabled", "");
});
