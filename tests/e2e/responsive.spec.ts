import { expect, test } from "@playwright/test";

test("mobile: drawer navigation and no horizontal page scroll", async ({ page }) => {
  await page.goto("/patients");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Activity" })).toBeVisible();
  await page.keyboard.press("Escape");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
