import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, parseOklch } from "@/lib/color";

/**
 * Parses tokens.css and asserts every foreground/background pairing used in the UI
 * meets WCAG 2.2 AA in both themes. If a designer tweaks a token, CI catches it.
 */

const css = readFileSync(join(__dirname, "tokens.css"), "utf8");

function readBlock(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("\n}", start);
  const block = css.slice(start, end);
  const vars: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[name] = value.trim();
  }
  return vars;
}

const light = readBlock(":root");
const dark = { ...light, ...readBlock(".dark") };

function resolve(theme: Record<string, string>, name: string): string {
  let value = theme[name];
  while (value?.startsWith("var(--")) value = theme[value.slice(6, -1)];
  if (!value) throw new Error(`Unknown token --${name}`);
  return value;
}

// [foreground, background, minimum ratio]. 4.5 = body text, 3 = large text / UI boundaries.
const PAIRS: Array<[string, string, number]> = [
  ["foreground", "background", 4.5],
  ["foreground", "card", 4.5],
  ["foreground", "muted", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["primary", "card", 4.5],
  ["primary", "background", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["foreground", "accent", 4.5],
  ["status-normal", "card", 4.5],
  ["status-elevated", "card", 4.5],
  ["status-critical", "card", 4.5],
  ["status-normal", "status-normal-subtle", 4.5],
  ["status-elevated", "status-elevated-subtle", 4.5],
  ["status-critical", "status-critical-subtle", 4.5],
  ["input", "card", 3],
  ["input", "background", 3],
  ["ring", "card", 3],
  ["ring", "background", 3],
  ["chart-secondary", "card", 3],
  ["foreground", "sidebar", 4.5],
  ["muted-foreground", "sidebar", 4.5],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s theme contrast", (_name, theme) => {
  it.each(PAIRS)("%s on %s ≥ %s:1", (fg, bg, min) => {
    const ratio = contrastRatio(parseOklch(resolve(theme, fg)), parseOklch(resolve(theme, bg)));
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});
