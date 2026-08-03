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

  test(`selects and restores an expanding archetype feat list on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("cleric");
    await page.getByLabel("Archetype", { exact: true }).selectOption("cleric-crusader");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("20");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    const choice = page.getByLabel("Bonus Feat level 20");
    await expect(choice.locator("option")).toHaveCount(17);
    await choice.selectOption("greater-shield-specialization");

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Bonus Feat level 20")).toHaveValue("greater-shield-specialization");
  });

  test(`selects a prerequisite-derived archetype feat on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("skald");
    await page.getByLabel("Archetype", { exact: true }).selectOption("skald-undying-word");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("7");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await page.getByLabel("Bonus Feat level 1").selectOption("endurance");
    const laterChoice = page.getByLabel("Bonus Feat level 7");
    await expect(laterChoice.locator('option[value="diehard"]')).toHaveCount(1);
    await laterChoice.selectOption("diehard");

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Bonus Feat level 7")).toHaveValue("diehard");
  });

  test(`uses an existing class choice slot for an archetype feat on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("slayer");
    await page.getByLabel("Archetype", { exact: true }).selectOption("slayer-butterfly-blade");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("2");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    const talent = page.getByLabel("Slayer Talent level 2");
    await expect(talent.locator('option[value="enforcer"]')).toHaveCount(1);
    await talent.selectOption("enforcer");
    await expect(page.getByLabel("Slayer Talent level 4")).toHaveCount(0);

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Slayer Talent level 2")).toHaveValue("enforcer");
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

  test(`replaces and expands a core class bonus-feat list on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("monk");
    await page.getByLabel("Archetype", { exact: true }).selectOption("monk-hamatulatsu-master");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("10");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    const firstChoice = page.getByLabel("Bonus Feat level 1").last();
    await expect(firstChoice.locator('option[value="catch-off-guard"]')).toHaveCount(0);
    await expect(firstChoice.locator('option[value="intimidating-prowess"]')).toHaveCount(1);
    const tenthLevelChoice = page.getByLabel("Bonus Feat level 10");
    await expect(tenthLevelChoice.locator('option[value="hamatulatsu"]')).toHaveCount(1);
    await expect(tenthLevelChoice.locator('option[value="impaling-critical"]')).toHaveCount(1);
    await tenthLevelChoice.selectOption("impaling-critical");
    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Bonus Feat level 10")).toHaveValue("impaling-critical");
  });

  test(`adds constructed pugilist feats to brawler bonus-feat slots on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("brawler");
    await page.getByLabel("Archetype", { exact: true }).selectOption("brawler-constructed-pugilist");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("5");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();

    const secondLevelChoice = page.getByLabel("Bonus Combat Feat level 2");
    await expect(secondLevelChoice.locator('option[value="agile-maneuvers"]')).toHaveCount(1);
    await expect(secondLevelChoice.locator('option[value="skill-focus"]')).toHaveCount(1);
    await secondLevelChoice.selectOption("skill-focus");

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Bonus Combat Feat level 2")).toHaveValue("skill-focus");
  });

  test(`selects and restores feats from the chosen Bloodrager bloodline on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("bloodrager");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("18");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await page.getByLabel("Bloodline level 1").selectOption("bloodrager-arcane");

    const sixthLevelChoice = page.getByLabel("Bloodline Feat level 6");
    await expect(sixthLevelChoice.locator("option")).toHaveCount(6);
    await expect(sixthLevelChoice.locator('option[value="disruptive"]')).toHaveCount(1);
    await expect(sixthLevelChoice.locator('option[value="dodge"]')).toHaveCount(0);
    await sixthLevelChoice.selectOption("disruptive");
    await page.getByLabel("Bloodline Feat level 9").selectOption("spellbreaker");

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Bloodline Feat level 6")).toHaveValue("disruptive");
    await expect(page.getByLabel("Bloodline Feat level 9")).toHaveValue("spellbreaker");
  });

  test(`combines distinct Crossblooded Rager feat lists on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("bloodrager");
    await page.getByLabel("Archetype", { exact: true }).selectOption("bloodrager-crossblooded-rager");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("9");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();

    await page.getByLabel("Primary Bloodline level 1").selectOption("bloodrager-arcane");
    const secondary = page.getByLabel("Secondary Bloodline level 1");
    await expect(secondary.locator('option[value="bloodrager-arcane"]')).toHaveCount(0);
    await secondary.selectOption("bloodrager-celestial");
    const featChoice = page.getByLabel("Bloodline Feat level 6");
    await expect(featChoice.locator('option[value="disruptive"]')).toHaveCount(1);
    await expect(featChoice.locator('option[value="weapon-focus"]')).toHaveCount(1);
  });

  test(`configures Blade Adept exploits and dependent weapon feats on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("arcanist");
    await page.getByLabel("Archetype", { exact: true }).selectOption("arcanist-blade-adept");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("13");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();

    const fifthLevelExploit = page.getByLabel("Arcanist Exploit level 5");
    await expect(fifthLevelExploit.locator('option[value="blade-adept-student-weapon-focus"]')).toHaveCount(1);
    await expect(fifthLevelExploit.locator('option[value="blade-adept-magus-arcana-critical-strike"]')).toHaveCount(1);
    await fifthLevelExploit.selectOption("blade-adept-student-weapon-focus");
    await page.getByLabel("Arcanist Exploit Bonded weapon").first().fill("rapier");

    const seventhLevelExploit = page.getByLabel("Arcanist Exploit level 7");
    await expect(seventhLevelExploit.locator('option[value="blade-adept-weapon-specialization"]')).toHaveCount(1);
    await seventhLevelExploit.selectOption("blade-adept-weapon-specialization");
    await page.getByLabel("Arcanist Exploit Bonded weapon").last().fill("rapier");

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Arcanist Exploit level 5")).toHaveValue("blade-adept-student-weapon-focus");
    await expect(page.getByLabel("Arcanist Exploit level 7")).toHaveValue("blade-adept-weapon-specialization");
  });

  test(`enforces Elemental Master preparation rules on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("arcanist");
    await page.getByLabel("Archetype", { exact: true }).selectOption("arcanist-elemental-master");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("3");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await page.getByLabel("Elemental Focus (Su) level 1").selectOption("wizard-school-fire");

    await page.getByRole("tab", { name: "Spells" }).click();
    await expect(page.getByText(/Each spell level includes 1 Fire School bonus slot/)).toBeVisible();
    const search = page.getByLabel("Search spells");
    await search.fill("Shield");
    const addShield = page.getByRole("button", { name: "Add Shield", exact: true });
    await addShield.click();
    await addShield.click();
    await addShield.click();
    await expect(addShield).toBeDisabled();

    await search.fill("Burning Hands");
    const addBurningHands = page.getByRole("button", { name: "Add Burning Hands", exact: true });
    await expect(addBurningHands).toBeEnabled();
    await addBurningHands.click();
    await expect(page.getByLabel("Burning Hands prepared")).toHaveText("1");
    await expect(page.getByText(/eligible for Fire School bonus slot/)).toBeVisible();

    await search.fill("Hydraulic Push");
    await expect(page.getByText(/opposition school: costs 2 prepared slots/)).toBeVisible();

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Elemental Focus (Su) level 1")).toHaveValue("wizard-school-fire");
  });

  test(`configures School Savant schools and specialist slots on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("arcanist");
    await page.getByLabel("Archetype", { exact: true }).selectOption("arcanist-school-savant");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("4");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();

    await page.getByLabel("School Focus level 1").selectOption("wizard-school-evocation");
    const firstOpposition = page.getByLabel("First Opposition School level 1");
    await expect(firstOpposition.locator('option[value="wizard-opposition-evocation"]')).toHaveCount(0);
    await firstOpposition.selectOption("wizard-opposition-conjuration");
    const secondOpposition = page.getByLabel("Second Opposition School level 1");
    await secondOpposition.selectOption("wizard-opposition-transmutation");

    const firstSpecialist = page.getByLabel("1st-level Specialist School Slot level 1");
    await expect(firstSpecialist.locator('option[value="burning-hands"]')).toHaveCount(1);
    await firstSpecialist.selectOption("burning-hands");
    await page.getByRole("button", { name: "Cast Burning Hands from 1st-level Specialist School Slot" }).click();
    await expect(page.getByLabel("1st-level Specialist School Slot status")).toHaveText("Used");

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("School Focus level 1")).toHaveValue("wizard-school-evocation");
    await expect(page.getByLabel("First Opposition School level 1")).toHaveValue("wizard-opposition-conjuration");
    await expect(page.getByLabel("1st-level Specialist School Slot level 1")).toHaveValue("burning-hands");
  });

  test(`configures Blood Arcanist without excluded bloodline benefits on ${journey.name}`, async ({ page }) => {
    await page.setViewportSize(journey.viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    await page.getByLabel("Class", { exact: true }).selectOption("arcanist");
    await page.getByLabel("Archetype", { exact: true }).selectOption("arcanist-blood-arcanist");
    await page.locator('input[type="number"][min="1"][max="20"]').fill("9");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();

    const bloodline = page.getByLabel("Bloodline level 1");
    await expect(bloodline.locator('option[value="sorcerer-bloodline-draconic-black-dragon"]')).toHaveCount(1);
    await bloodline.selectOption("sorcerer-bloodline-draconic-black-dragon");
    await expect(page.getByText("Bloodline arcana:", { exact: true })).toBeVisible();
    await expect(page.getByText("Bloodline powers", { exact: true })).toBeVisible();
    await expect(page.getByText("Bloodline class skill:", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Bloodline bonus spells", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Bloodline bonus feats", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Arcanist Exploit level 5").locator('option[value="bloodline-development"]')).toHaveCount(0);

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByLabel("Additional class").selectOption("sorcerer");
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    const sorcererBloodline = page.getByLabel("Bloodline level 1").first();
    await expect(sorcererBloodline.locator('option[value="sorcerer-bloodline-arcane"]')).toHaveCount(0);
    await expect(sorcererBloodline.locator('option[value="sorcerer-bloodline-draconic"]')).toHaveCount(1);
    await sorcererBloodline.selectOption("sorcerer-bloodline-draconic");
    await expect(page.getByLabel("Bloodline variant choice")).toHaveValue("black-dragon");

    if (journey.mobile) await page.getByRole("button", { name: "Character & levels" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await openCharacterPanel(page, journey.mobile);
    const load = page.getByRole("button", { name: "Load" });
    if (journey.mobile) await load.evaluate((button: HTMLButtonElement) => button.click());
    else await load.click();
    if (journey.mobile) await page.getByRole("button", { name: "Close", exact: true }).evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole("tab", { name: "Features" }).click();
    await expect(page.getByLabel("Bloodline level 1").first()).toHaveValue("sorcerer-bloodline-draconic");
    await expect(page.getByLabel("Bloodline level 1").last()).toHaveValue("sorcerer-bloodline-draconic-black-dragon");
    await expect(page.getByLabel("Bloodline variant choice")).toHaveValue("black-dragon");
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
