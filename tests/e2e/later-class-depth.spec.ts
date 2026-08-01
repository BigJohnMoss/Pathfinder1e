import { expect, test, type Page } from "@playwright/test";

const journeys = [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "narrow mobile", viewport: { width: 390, height: 844 } },
];

async function buildLevelTwentyPsychic(page: Page, enforceViewportFit: boolean) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByLabel("Character name").fill("Mira the Far-Seer");
  await page.getByLabel("Class", { exact: true }).selectOption("psychic");
  await page.getByLabel("Archetype", { exact: true }).selectOption("psychic-esoteric-starseeker");
  await page.locator('input[type="number"][min="1"][max="20"]').fill("20");

  await page.getByRole("tab", { name: "Features" }).click();
  const discipline = page.getByLabel(/Psychic Discipline.*level 1/i);
  const amplification = page.getByLabel(/Phrenic Amplification.*level 1/i);
  await discipline.selectOption("psychic-discipline-dream");
  await amplification.selectOption("psychic-amp-biokinetic-healing");
  await expect(discipline).toHaveValue("psychic-discipline-dream");
  await expect(amplification).toHaveValue("psychic-amp-biokinetic-healing");

  const pool = page.getByLabel("Psychic Phrenic Pool remaining");
  await expect(pool).toContainText("point remaining");
  const beforeSpend = await pool.textContent();
  await page.getByRole("button", { name: "Spend 1 point" }).first().click();
  await expect(pool).not.toHaveText(beforeSpend ?? "");

  await page.getByRole("tab", { name: "Spells" }).click();
  await page.getByLabel("Search spells").fill("Mind Thrust I");
  await page.getByRole("button", { name: "Learn Mind Thrust I", exact: true }).click();
  await page.getByRole("button", { name: "Cast Mind Thrust I", exact: true }).click();
  await expect(page.getByLabel("Mind Thrust I known")).toHaveText("Known");

  if (enforceViewportFit) await page.getByRole("button", { name: "Character & levels" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.reload();
  if (enforceViewportFit) await page.getByRole("button", { name: "Character & levels" }).click();
  await page.getByRole("button", { name: "Load" }).click();

  await expect(page.getByLabel("Character name")).toHaveValue("Mira the Far-Seer");
  await expect(page.getByLabel("Class", { exact: true })).toHaveValue("psychic");
  await expect(page.getByLabel("Archetype", { exact: true })).toHaveValue("psychic-esoteric-starseeker");
  await expect(page.locator('input[type="number"][min="1"][max="20"]')).toHaveValue("20");

  if (enforceViewportFit) await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("tab", { name: "Features" }).click();
  await expect(page.getByLabel(/Psychic Discipline.*level 1/i)).toHaveValue("psychic-discipline-dream");
  await expect(page.getByLabel(/Phrenic Amplification.*level 1/i)).toHaveValue("psychic-amp-biokinetic-healing");
  await expect(page.getByLabel("Psychic Phrenic Pool remaining")).not.toHaveText(beforeSpend ?? "");

  await page.getByRole("tab", { name: "Spells" }).click();
  await page.getByLabel("Search spells").fill("Mind Thrust I");
  await expect(page.getByLabel("Mind Thrust I known")).toHaveText("Known");

  if (enforceViewportFit) {
    const dimensions = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
}

for (const journey of journeys) {
  test(`persists an archetyped level-20 Psychic journey on ${journey.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(journey.viewport);
    await buildLevelTwentyPsychic(page, journey.name === "narrow mobile");
  });
}
