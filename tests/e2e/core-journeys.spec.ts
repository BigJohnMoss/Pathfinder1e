import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("navigates the builder sections and skip link by keyboard", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to character builder" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#character-builder-main")).toBeFocused();
  const basicInfo = page.getByRole("tab", { name: "Basic info" });
  await basicInfo.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Actions" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "character-tab-actions");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Options" })).toBeFocused();
});

test("builds and persists a martial loadout", async ({ page }) => {
  await page.getByLabel("Character name").fill("Valeros");
  await page.getByLabel("Class", { exact: true }).selectOption("fighter");
  await page.getByRole("tab", { name: "Storage" }).click();
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
  await page.getByRole("tab", { name: "Storage" }).click();
  await expect(page.getByLabel("GP")).toHaveValue("125");
  await expect(page.locator("article").filter({ hasText: "Chain shirt" }).getByRole("checkbox", { name: "Equipped" })).toBeChecked();
});

test("prepares and casts a Druid spell", async ({ page }) => {
  await page.getByLabel("Class", { exact: true }).selectOption("druid");
  await page.getByLabel("Wisdom base score").fill("16");
  await page.getByLabel("Level").fill("5");
  await page.getByRole("tab", { name: "Spells" }).click();
  await expect(page.getByRole("heading", { name: "Prepared spells" })).toBeVisible();
  await page.getByLabel("Search spells").fill("Entangle");
  await page.getByRole("button", { name: "Add Entangle" }).click();
  await expect(page.getByLabel("Entangle prepared")).toHaveText("1");
  await page.getByRole("button", { name: "Cast Entangle", exact: true }).click();
  await expect(page.getByText(/Druid slots:/)).toContainText("1st-level");
});

test("learns and casts a spontaneous Bard spell", async ({ page }) => {
  await page.getByLabel("Class", { exact: true }).selectOption("bard");
  await page.getByLabel("Charisma base score").fill("16");
  await page.getByRole("tab", { name: "Spells" }).click();
  await expect(page.getByRole("heading", { name: "Spontaneous spells" })).toBeVisible();
  await page.getByLabel("Search spells").fill("Cure Light Wounds");
  await page.getByRole("button", { name: "Learn Cure Light Wounds" }).click();
  await expect(page.getByLabel("Cure Light Wounds known")).toHaveText("Known");
  await page.getByRole("button", { name: "Cast Cure Light Wounds" }).click();
  await expect(page.getByText(/Bard slots:/)).toBeVisible();
});

test("updates feat eligibility at a prerequisite boundary", async ({ page }) => {
  await page.getByLabel("Class", { exact: true }).selectOption("fighter");
  await page.getByRole("tab", { name: "Feats" }).click();
  await page.getByRole("button", { name: "Choose Human bonus feat" }).click();
  await page.getByRole("searchbox", { name: "Search feats" }).fill("Power Attack");
  await expect(page.locator("summary strong", { hasText: "Power Attack" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Basic info" }).click();
  await page.getByLabel("Strength base score").fill("13");
  await page.getByRole("tab", { name: "Feats" }).click();
  await page.getByRole("button", { name: "Choose Human bonus feat" }).click();
  await page.getByRole("searchbox", { name: "Search feats" }).fill("Power Attack");
  await expect(page.locator("summary strong", { hasText: "Power Attack" })).toBeVisible();
});

test("applies and persists background traits", async ({ page }) => {
  await page.getByRole("tab", { name: "Options" }).click();
  await page.getByLabel("Trait 1").selectOption("reactionary");
  await page.getByLabel("Trait 2").selectOption("caretaker");
  await page.getByRole("tab", { name: "Actions" }).click();
  await expect(page.getByRole("definition").filter({ hasText: "+2" })).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByRole("tab", { name: "Options" }).click();
  await expect(page.getByLabel("Trait 1")).toHaveValue("reactionary");
  await expect(page.getByLabel("Trait 2")).toHaveValue("caretaker");
});

test("applies and persists a trait-specific class skill choice", async ({ page }) => {
  await page.getByRole("tab", { name: "Options" }).click();
  await page.getByLabel("Trait 1").selectOption("mathematical-prodigy");
  await page.getByLabel("Granted class skill").selectOption("Knowledge (engineering)");
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByRole("tab", { name: "Options" }).click();
  await expect(page.getByLabel("Trait 1")).toHaveValue("mathematical-prodigy");
  await expect(page.getByLabel("Granted class skill")).toHaveValue("Knowledge (engineering)");
});

test("applies and persists a trait-specific spell choice", async ({ page }) => {
  await page.getByRole("tab", { name: "Options" }).click();
  await page.getByLabel("Trait 1").selectOption("gifted-adept");
  await page.getByLabel("Affected spell").selectOption("mage-hand");
  await page.getByRole("tab", { name: "Spells" }).click();
  await page.getByLabel("Search spells").fill("Mage Hand");
  await expect(page.getByText("Mage Hand").locator("..")).toContainText("trait: +1 caster level");
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Load" }).click();
  await page.getByRole("tab", { name: "Options" }).click();
  await expect(page.getByLabel("Affected spell")).toHaveValue("mage-hand");
});

test("builds a complete Fighter through level 20 and preserves the user journey", async ({ page }) => {
  await page.getByLabel("Character name").fill("Aldric Twenty");
  await page.getByLabel("Class", { exact: true }).selectOption("fighter");
  await page.getByLabel("Strength base score").fill("16");
  await page.getByLabel("Constitution base score").fill("14");

  await page.getByRole("tab", { name: "Storage" }).click();
  await page.getByLabel("Equipment catalogue").selectOption("longsword");
  await page.getByLabel("Equipment catalogue").selectOption("chain-shirt");
  await page.getByLabel("Equipment catalogue").selectOption("heavy-wooden-shield");
  await page.locator("article").filter({ hasText: "Longsword" }).getByRole("checkbox", { name: "Equipped" }).check();
  await page.locator("article").filter({ hasText: "Chain shirt" }).getByRole("checkbox", { name: "Equipped" }).check();
  await page.locator("article").filter({ hasText: "Heavy wooden shield" }).getByRole("checkbox", { name: "Equipped" }).check();
  await page.getByLabel("GP").fill("150");

  await page.getByRole("tab", { name: "Skills" }).click();
  for (const skill of ["Climb", "Ride", "Survival", "Swim"]) await page.getByLabel(`${skill} ranks`).fill("1");
  await expect(page.getByLabel("0 skill ranks remaining")).toBeVisible();

  await page.getByRole("tab", { name: "Feats" }).click();
  await page.getByRole("button", { name: "Choose Human bonus feat" }).click();
  await page.getByRole("searchbox", { name: "Search feats" }).fill("Power Attack");
  await page.locator(".feat-card").filter({ has: page.locator("summary strong", { hasText: "Power Attack" }) }).locator("summary").click();
  await page.getByRole("button", { name: "Choose for Human bonus feat" }).click();
  await page.getByRole("button", { name: "Choose Feat 1" }).click();
  await page.getByRole("searchbox", { name: "Search feats" }).fill("Toughness");
  await page.locator(".feat-card").filter({ has: page.locator("summary strong", { hasText: "Toughness" }) }).locator("summary").click();
  await page.getByRole("button", { name: "Choose for Feat 1" }).click();
  await page.getByRole("tab", { name: "Features" }).click();
  await page.getByLabel("Bonus Combat Feat level 1").selectOption("fighter-improved-initiative");
  await page.getByRole("tab", { name: "Options" }).click();
  await page.getByLabel("Trait 1").selectOption("courageous");
  await page.getByLabel("Trait 2").selectOption("caretaker");

  for (let nextLevel = 2; nextLevel <= 20; nextLevel += 1) {
    await page.getByRole("button", { name: `Review level ${nextLevel}` }).click();
    await expect(page.getByRole("heading", { name: `Review Fighter level ${nextLevel}` })).toBeVisible();
    await page.getByRole("button", { name: `Advance to level ${nextLevel}` }).click();
    await expect(page.locator('input[type="number"][min="1"][max="20"]')).toHaveValue(String(nextLevel));
    await expect(page.getByText(`Advanced to level ${nextLevel}. Review newly unlocked choices.`)).toBeVisible();
  }

  await page.getByRole("tab", { name: "Actions" }).click();
  const coreStatistics = page
    .getByRole("heading", { name: "Core statistics" })
    .locator("..")
    .locator("dl");
  await expect(coreStatistics.getByText("Initiative").locator("..")).toContainText("+4");
  await expect(
    coreStatistics.getByText("AC / touch / flat-footed").locator(".."),
  ).toContainText("16 / 10 / 16");
  await expect(coreStatistics.getByText("CMB / CMD").locator("..")).toContainText(
    "+25 / 35",
  );
  await expect(page.getByRole("heading", { name: "Conditional trait modifiers" })).toBeVisible();

  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Load" }).click();
  await expect(page.getByLabel("Character name")).toHaveValue("Aldric Twenty");
  await expect(page.locator('input[type="number"][min="1"][max="20"]')).toHaveValue("20");
  await page.getByRole("tab", { name: "Storage" }).click();
  await expect(page.getByLabel("GP")).toHaveValue("150");
  await expect(page.locator("article").filter({ hasText: "Chain shirt" }).getByRole("checkbox", { name: "Equipped" })).toBeChecked();
  await page.getByRole("tab", { name: "Options" }).click();
  await expect(page.getByLabel("Trait 1")).toHaveValue("courageous");
  await expect(page.getByLabel("Trait 2")).toHaveValue("caretaker");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("aldric-twenty.json");
  await expect(page.getByText("Character exported")).toBeVisible();

  await page.evaluate(() => {
    window.print = () => document.documentElement.setAttribute("data-print-invoked", "true");
  });
  await page.getByRole("button", { name: "Print" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-invoked", "true");

  const exportedPath = await download.path();
  expect(exportedPath).toBeTruthy();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator('input[type="number"][min="1"][max="20"]')).toHaveValue("1");
  await page.getByLabel("Import character file").setInputFiles(exportedPath!);
  await expect(page.getByText("Imported character")).toBeVisible();
  await expect(page.getByLabel("Character name")).toHaveValue("Aldric Twenty");
  await expect(page.locator('input[type="number"][min="1"][max="20"]')).toHaveValue("20");
});
