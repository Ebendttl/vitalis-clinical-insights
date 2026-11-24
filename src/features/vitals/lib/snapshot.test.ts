import { describe, expect, it } from "vitest";
import { buildSnapshot } from "./snapshot";

const now = Date.parse("2026-11-24T12:00:00Z");
const at = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

describe("buildSnapshot", () => {
  const readings = [
    { type: "bp_systolic" as const, value: 120, recordedAt: at(20) },
    { type: "bp_diastolic" as const, value: 78, recordedAt: at(20) },
    { type: "bp_systolic" as const, value: 150, recordedAt: at(1) },
    { type: "bp_diastolic" as const, value: 125, recordedAt: at(1) },
    { type: "spo2" as const, value: 98, recordedAt: at(1) },
  ];
  const snap = buildSnapshot(readings, { ageYears: 50, activeChronicConditions: 1 }, now);

  it("combines systolic/diastolic and reports the worse classification", () => {
    const bp = snap.kinds.find((k) => k.kind === "blood_pressure");
    expect(bp?.latest).toEqual({ value: 150, secondary: 125, recordedAt: at(1) });
    // Diastolic 125 is critical, systolic 150 only elevated: the tile shows critical.
    expect(bp?.classification).toEqual({ severity: "critical", direction: "high" });
    expect(bp?.trend?.direction).toBe("up");
  });

  it("handles kinds without data", () => {
    const temp = snap.kinds.find((k) => k.kind === "temperature");
    expect(temp?.latest).toBeNull();
    expect(temp?.series).toEqual([]);
  });

  it("computes live risk from the latest values", () => {
    expect(snap.risk.factors.map((f) => f.label)).toContain("Chronic condition");
    expect(snap.risk.score).toBeGreaterThanOrEqual(1);
  });
});
