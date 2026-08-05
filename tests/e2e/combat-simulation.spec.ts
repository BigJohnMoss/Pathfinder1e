import { expect, test } from "@playwright/test";

for (const journey of [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "narrow mobile", viewport: { width: 390, height: 844 } },
]) {
  test(`rolls attacks, damage, checks, skills, and custom dice on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByLabel("Class", { exact: true }).selectOption("fighter");
    await page.getByRole("tab", { name: "Storage" }).click();
    await page.getByLabel("Equipment catalogue").selectOption("longsword");
    await page.locator("article").filter({ hasText: "Longsword" }).getByRole("checkbox", { name: "Equipped" }).check();
    await page.getByRole("tab", { name: "Actions" }).click();

    await page.getByLabel("Target Armor Class").fill("15");
    await page.getByRole("button", { name: "Roll Longsword attack" }).click();
    await expect(page.getByLabel("Longsword attack total")).toBeVisible();
    await expect(page.getByLabel("Longsword attack total").locator("..")).toContainText(/(Hit|Miss|Critical threat) against AC 15/);
    await page.getByRole("button", { name: "Roll Longsword damage" }).click();
    await expect(page.getByLabel("Longsword damage total")).toBeVisible();
    await page.getByRole("button", { name: "Initiative roll, modifier +0" }).click();
    await expect(page.getByLabel("Initiative total")).toBeVisible();
    await page.getByLabel("Skill to roll").selectOption("Perception");
    await page.getByRole("button", { name: "Roll selected skill" }).click();
    await expect(page.getByLabel("Perception total")).toBeVisible();
    await page.getByLabel("Custom dice count").fill("2");
    await page.getByLabel("Custom die sides").selectOption("6");
    await page.getByLabel("Custom roll modifier").fill("3");
    await page.getByRole("button", { name: "Roll custom dice" }).click();
    await expect(page.getByLabel("Custom roll total")).toBeVisible();
    const requiredRolls = ["Longsword attack", "Longsword damage", "Initiative", "Perception", "Custom roll"];
    for (const label of requiredRolls) await expect(page.locator(".roll-history li").filter({ hasText: label })).toHaveCount(1);
    const rollCount = await page.locator(".roll-history li").count();
    expect([5, 6]).toContain(rollCount);
    if (rollCount === 6) await expect(page.locator(".roll-history li").filter({ hasText: "Longsword critical confirmation" })).toHaveCount(1);

    const dimensions = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  });
}
