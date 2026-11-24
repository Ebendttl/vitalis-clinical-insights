import { describe, expect, it } from "vitest";
import { VITAL_TYPES } from "@/features/vitals/lib/definitions";
import { nextReadings } from "./simulate";

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe("nextReadings", () => {
  it("returns one plausible reading per vital type", () => {
    const out = nextReadings({ heart_rate: 72 }, seeded(1));
    expect(out.map((r) => r.type)).toEqual([...VITAL_TYPES]);
    for (const r of out) expect(Number.isFinite(r.value)).toBe(true);
    expect(out.find((r) => r.type === "spo2")?.value).toBeLessThanOrEqual(100);
  });

  it("reverts toward the normal band over time", () => {
    let latest: Record<string, number> = { heart_rate: 150 };
    const rand = seeded(7);
    for (let i = 0; i < 60; i++) {
      const next = nextReadings(latest, () => (rand() < 0.15 ? 0.5 : rand()));
      latest = Object.fromEntries(next.map((r) => [r.type, r.value]));
    }
    expect(latest.heart_rate).toBeLessThan(120);
  });
});
