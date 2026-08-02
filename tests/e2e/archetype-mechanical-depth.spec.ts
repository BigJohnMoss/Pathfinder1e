import { expect, test, type Page } from "@playwright/test";

const journeys = [
  { name: "desktop", viewport: { width: 1440, height: 1000 }, mobile: false },
  { name: "narrow mobile", viewport: { width: 390, height: 844 }, mobile: true },
];

async function openCharacterPanel(page: Page, mobile: boolean) {
  if (mobile && !(await page.getByLabel("Character name").isVisible())) {
    await page.getByRole("button", { name: "Character & levels" }).click();
  }
}

for (const journey of journeys) {
  test(`selects and restores inferred restricted archetype feats on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("hunter");
    await page.getByLabel("Archetype", { exact: true }).selectOption("hunter-flood-flourisher");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("3");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    const choice = page.getByLabel("Skilled Ambusher bonus feat level 3");
    await expect(choice.locator("option")).toHaveText(["Choose an option", "Athletic", "Stealthy"]);
    await choice.selectOption("athletic");
    await expect(page.getByText("1 restricted bonus feat choice")).toBeVisible();

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Skilled Ambusher bonus feat level 3")).toHaveValue("athletic");
  });

  test(`applies inferred archetype bonus feats at their earned level on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("ranger");
    await page.getByLabel("Archetype", { exact: true }).selectOption("ranger-summit-sentinel");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("2");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());

    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByText("1 level-aware bonus feat grant")).toBeVisible();
    await page.getByRole("tab", { name: "Actions" }).click();
    await expect(page.locator(".combat-panel").getByText("Average HP", { exact: true }).locator("xpath=..")).toContainText("19");
  });

  test(`tracks inferred archetype resources on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("alchemist");
    await page.getByLabel("Archetype", { exact: true }).selectOption("alchemist-metamorph");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("18");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());

    await page.getByRole("tab", { name: "Features" }).click();
    const shapechangerRemaining = page.getByLabel("Alchemist Shapechanger remaining");
    const shapechanger = shapechangerRemaining.locator("xpath=ancestor::*[contains(@class, 'daily-resource')]");
    await expect(shapechangerRemaining).toHaveText("9/9 use remaining");
    await shapechanger.getByRole("button", { name: "Spend 1 use" }).click();
    await expect(shapechangerRemaining).toHaveText("8/9 use remaining");
    await shapechanger.getByRole("button", { name: "Refresh alchemist shapechanger" }).click();
    await expect(shapechangerRemaining).toHaveText("9/9 use remaining");

    await expect(page.getByText("1 tracked class resource adjustment")).toBeVisible();
  });

  test(`applies inferred archetype skill ranks on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("fighter");
    await page.getByLabel("Archetype", { exact: true }).selectOption("fighter-lore-warden");
    await expect(page.getByLabel("Archetype", { exact: true })).toHaveValue("fighter-lore-warden");
    if (journey.mobile) {
      await page.getByRole("button", { name: "Close", exact: true }).evaluate((button) => button.click());
    }
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByText("Class skill-rank progression: +2 per level")).toBeVisible();
    await page.getByRole("tab", { name: "Basic info" }).click();
    await expect(page.getByLabel("Character progression summary").getByText("Skill ranks").locator("..")).toContainText("6");
  });

  test(`applies inferred archetype proficiencies on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("bard");
    await page.getByLabel("Archetype", { exact: true }).selectOption("bard-geisha");
    await expect(page.getByLabel("Archetype", { exact: true })).toHaveValue("bard-geisha");
    if (journey.mobile) {
      await page.getByRole("button", { name: "Close", exact: true }).evaluate((button) => button.click());
    }
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByText("Weapon proficiencies: gain All simple weapons")).toBeVisible();
    await expect(page.getByText("Armor proficiencies: lose All armor")).toBeVisible();
    await expect(page.getByText("Shield proficiencies: lose All shields")).toBeVisible();
  });

  test(`applies inferred archetype class skills on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("fighter");
    await page.getByLabel("Archetype", { exact: true }).selectOption("fighter-aerial-assaulter");
    await expect(page.getByLabel("Archetype", { exact: true })).toHaveValue("fighter-aerial-assaulter");
    if (journey.mobile) {
      await page.getByRole("button", { name: "Close", exact: true }).evaluate((button) => button.click());
    }
    await page.getByRole("tab", { name: "Skills" }).click();
    await expect(page.getByLabel("Acrobatics ranks").locator("xpath=ancestor::label")).toContainText("Class skill");
    await expect(page.getByLabel("Ride ranks").locator("xpath=ancestor::label")).not.toContainText("Class skill");
    await expect(page.getByLabel("Swim ranks").locator("xpath=ancestor::label")).not.toContainText("Class skill");
  });

  test(`persists a level-20 archetyped multiclass combat chassis on ${journey.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);

    await page.getByLabel("Character name").fill("Cassia the Cardinal");
    await page.getByLabel("Class", { exact: true }).selectOption("cleric");
    await page.getByLabel("Archetype", { exact: true }).selectOption("cleric-cardinal");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("20");
    await page.getByLabel("Additional class").selectOption("fighter");
    await page.getByLabel("Additional class levels").fill("2");

    await expect(page.getByText("20 total levels")).toContainText("18 in your starting class");
    await expect(page.getByText("20 total levels")).toContainText("2 in other classes");
    await expect(page.getByLabel("Character progression summary").getByText("BAB").locator("..")).toContainText("+11");
    await expect(page.getByLabel("Character progression summary").getByText("Skill ranks").locator("..")).toContainText("152");

    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByText("Class combat-statistic progression")).toBeVisible();
    await expect(page.getByText("Armor proficiencies: use only Light armor")).toBeVisible();
    await expect(page.getByText("Shield proficiencies: lose All shields")).toBeVisible();

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();

    await expect(page.getByLabel("Character name")).toHaveValue("Cassia the Cardinal");
    await expect(page.getByLabel("Class", { exact: true })).toHaveValue("cleric");
    await expect(page.getByLabel("Archetype", { exact: true })).toHaveValue("cleric-cardinal");
    await expect(page.getByLabel("Additional class", { exact: true })).toHaveValue("fighter");
    await expect(page.getByLabel("Additional class levels")).toHaveValue("2");
    await expect(page.getByLabel("Character progression summary").getByText("BAB").locator("..")).toContainText("+11");

    if (journey.mobile) {
      const dimensions = await page.evaluate(() => ({
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    }
  });
}
