import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signInWithMagicLink, trackConsoleErrors } from "./helpers";

test("signed-out visitors are redirected to sign-in, keeping their destination", async ({ page }) => {
  await page.goto("/patients?risk=critical");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fpatients%3Frisk%3Dcritical/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("validates the email address", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill("not-an-email");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("alert")).toHaveText("Enter a valid email address.");
});

test("signs in with a magic link and lands on the directory", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await signInWithMagicLink(page);
  await expect(page.getByRole("heading", { name: "Patients", level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("sign-in page has no accessibility violations", async ({ page }) => {
  await page.goto("/sign-in");
  await expectNoA11yViolations(page);
});
