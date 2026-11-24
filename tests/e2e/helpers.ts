import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const DEMO_EMAIL = "demo@vitalis.test";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** Reads the newest magic link sent to `email` from the local Supabase mail catcher. */
export async function latestMagicLink(email: string, after: number): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await res.json()) as { messages: Array<{ ID: string; Created: string }> };
    const fresh = messages.find((m) => Date.parse(m.Created) >= after - 2_000);
    if (fresh) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()) as { Text: string; HTML: string };
      const link = /(https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]+)/.exec(msg.HTML || msg.Text)?.[1];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No magic link for ${email}`);
}

export async function signInWithMagicLink(page: Page, email = DEMO_EMAIL) {
  const sentAt = Date.now();
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
  await page.goto(await latestMagicLink(email, sentAt));
  await page.waitForURL("**/patients**");
}

/** Fails on any WCAG 2.2 A/AA violation. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
}

/** Collects console errors so specs can assert a clean console. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}
