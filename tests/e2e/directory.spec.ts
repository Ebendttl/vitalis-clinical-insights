import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./helpers";

test("search filters the list, syncs to the URL and responds in under 100 ms", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/patients");
  const list = page.getByRole("list", { name: "Patients" });
  await expect(list.getByRole("listitem").first()).toBeVisible();

  const firstName = (await list.getByRole("listitem").first().locator("span.font-medium").first().textContent())?.split(" ")[0] ?? "";
  const searchResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/patients") && r.url().includes("ilike"));
  await page.getByRole("searchbox", { name: /search patients/i }).fill(firstName);
  const res = await searchResponse;
  const timing = res.request().timing();
  expect(timing.responseEnd).toBeLessThan(100);

  await expect(page).toHaveURL(new RegExp(`q=${firstName}`));
  for (const item of await list.getByRole("listitem").all()) await expect(item).toContainText(firstName);
  expect(errors).toEqual([]);
});

test("risk filter and URL state survive a reload", async ({ page }) => {
  await page.goto("/patients");
  await page.getByRole("button", { name: /High/ }).click();
  await expect(page).toHaveURL(/risk=critical/);
  await page.reload();
  await expect(page.getByRole("button", { name: /High/ })).toHaveAttribute("aria-pressed", "true");
});

test("empty results offer a way back", async ({ page }) => {
  await page.goto("/patients?q=zzzzqqq");
  await expect(page.getByText("No patients match these filters")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/q=/);
});

test("directory has no accessibility violations", async ({ page }) => {
  await page.goto("/patients");
  await expect(page.getByRole("list", { name: "Patients" })).toBeVisible();
  await expectNoA11yViolations(page);
});
