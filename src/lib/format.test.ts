import { describe, expect, it } from "vitest";
import { formatRelative, initials } from "./format";

describe("format", () => {
  const now = Date.parse("2026-11-24T12:00:00Z");
  it("formats relative times", () => {
    expect(formatRelative(now - 30_000, now)).toBe("just now");
    expect(formatRelative(now - 2 * 3_600_000, now)).toBe("2 hr ago");
    expect(formatRelative(now - 86_400_000, now)).toBe("yesterday");
  });
  it("builds initials", () => {
    expect(initials("Maya Reyes")).toBe("MR");
    expect(initials("Cher")).toBe("C");
    expect(initials("Ana María de la Cruz")).toBe("AC");
  });
});
