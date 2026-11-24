import { expect, type Page, test } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./helpers";

async function openFirstPatient(page: Page) {
  await page.goto("/patients");
  await page.getByRole("list", { name: "Patients" }).getByRole("link").first().click();
  await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
  return page.url();
}

test("overview shows the signature header with every vital", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await openFirstPatient(page);
  const header = page.getByRole("region", { name: /./ }).filter({ has: page.getByRole("heading", { level: 1 }) }).first();
  await expect(header.getByText("Vitalis Risk Index")).toBeVisible();
  for (const label of ["Blood pressure", "Heart rate", "Respiratory rate", "Temperature", "Oxygen saturation"]) {
    await expect(page.getByRole("link", { name: new RegExp(label) }).first()).toBeVisible();
  }
  await expectNoA11yViolations(page);
  expect(errors).toEqual([]);
});

test("switching vitals ranges never refetches cached months", async ({ page }) => {
  const url = await openFirstPatient(page);
  const monthRequests: string[] = [];
  page.on("request", (r) => r.url().includes("/rest/v1/vital_readings") && monthRequests.push(r.url()));

  await page.goto(`${url}/vitals?range=12m`);
  await expect(page.getByRole("region", { name: "Blood pressure" })).toBeVisible();
  await expect(page.getByText(/readings$/)).toBeVisible();
  const after12m = monthRequests.length;
  expect(after12m).toBeGreaterThanOrEqual(12);

  for (const label of ["3 months", "6 months", "12 months"]) {
    await page.getByRole("radio", { name: label }).click();
    await expect(page.getByRole("radio", { name: label })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("region", { name: "Blood pressure" })).toBeVisible();
  }
  expect(monthRequests.length).toBe(after12m);
});

test("every chart has a keyboard-accessible data table", async ({ page }) => {
  const url = await openFirstPatient(page);
  await page.goto(`${url}/vitals`);
  const panel = page.getByRole("region", { name: "Heart rate" });
  const chart = panel.getByRole("group", { name: /Heart rate chart/ });
  await chart.focus();
  await page.keyboard.press("End");
  await expect(panel.locator("[aria-live=polite]").last()).toContainText("Heart rate");

  await panel.getByRole("radio", { name: "Table" }).click();
  const table = panel.getByRole("table", { name: "Heart rate readings" });
  await expect(table).toBeVisible();
  await expect(table.getByRole("row").nth(1)).toBeVisible();
  await expectNoA11yViolations(page);
});

test("AI summary streams, validates and is clearly labelled", async ({ page }) => {
  await openFirstPatient(page);
  const card = page.getByRole("region", { name: "Clinical summary" });
  await expect(card.getByText(/for demonstration only, not medical advice/)).toBeVisible();

  const started = Date.now();
  await card.getByRole("button", { name: "Generate summary" }).click();
  await expect(card.getByRole("status").or(card.locator("p.text-base"))).toBeVisible();
  await expect(card.locator("p.text-base")).toBeVisible({ timeout: 15_000 });
  expect(Date.now() - started).toBeLessThan(10_000);
  await expect(card.getByText("Schema-verified")).toBeVisible({ timeout: 20_000 });
  await expect(card.getByRole("button", { name: "Regenerate" })).toBeVisible();
});

test("lab reports preview in-app", async ({ page }) => {
  const url = await openFirstPatient(page);
  await page.goto(`${url}/labs`);
  await page.getByRole("button", { name: "Preview" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /lab-reports/);
});

test("command palette navigates to a patient", async ({ page }) => {
  await page.goto("/patients");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").fill("a");
  await dialog.getByRole("option").first().click();
  await page.waitForURL(/\/patients\/[0-9a-f-]{36}/);
});
