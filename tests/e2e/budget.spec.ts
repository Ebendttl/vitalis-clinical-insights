import { expect, test } from "@playwright/test";

const BUDGET_BYTES = 200 * 1024;

// Measured on the wire (compressed), which is what "first-load JS" costs a user.
// Only meaningful against a production build, so it's skipped under `next dev`.
test("directory page ships under 200 KB of JavaScript on first load", async ({ page }) => {
  test.skip(!process.env.CI && !process.env.BUDGET, "Run against `next start` (CI=1 or BUDGET=1).");
  const scripts: Array<Promise<number>> = [];
  page.on("requestfinished", (req) => {
    if (req.resourceType() === "script") scripts.push(req.sizes().then((s) => s.responseBodySize));
  });
  await page.goto("/patients", { waitUntil: "networkidle" });
  const total = (await Promise.all(scripts)).reduce((a, b) => a + b, 0);
  console.log(`First-load JS: ${(total / 1024).toFixed(1)} KB`);
  expect(total).toBeLessThan(BUDGET_BYTES);
});
