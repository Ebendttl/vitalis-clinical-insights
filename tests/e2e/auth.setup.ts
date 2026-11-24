import { test as setup } from "@playwright/test";
import { signInWithMagicLink } from "./helpers";

setup("sign in as the demo clinician", async ({ page }) => {
  await signInWithMagicLink(page);
  await page.context().storageState({ path: "tests/e2e/.auth/clinician.json" });
});
