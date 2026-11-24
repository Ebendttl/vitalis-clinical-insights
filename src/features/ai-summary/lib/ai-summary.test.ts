import { describe, expect, it } from "vitest";
import { AiSummary } from "../schema";
import { buildDigest } from "./digest";
import { ruleBasedSummary } from "./rule-based";

const now = Date.parse("2026-11-24T12:00:00Z");
const day = (n: number) => new Date(now - n * 86_400_000).toISOString();

function readings(sbp: (d: number) => number, spo2 = 98) {
  return Array.from({ length: 40 }, (_, d) => [
    { type: "bp_systolic" as const, value: sbp(d), recordedAt: day(d) },
    { type: "bp_diastolic" as const, value: 78, recordedAt: day(d) },
    { type: "heart_rate" as const, value: 70, recordedAt: day(d) },
    { type: "respiratory_rate" as const, value: 14, recordedAt: day(d) },
    { type: "temperature" as const, value: 36.8, recordedAt: day(d) },
    { type: "spo2" as const, value: d === 0 ? spo2 : 98, recordedAt: day(d) },
  ]).flat();
}

const base = { ageYears: 61, sex: "female" as const, conditions: ["Hypertension"], abnormalLabs: [], now };

describe("buildDigest", () => {
  it("contains no identifiers and summarises each vital", () => {
    const digest = buildDigest({ ...base, readings: readings(() => 120) });
    expect(JSON.stringify(digest)).not.toMatch(/name|mrn|phone|email/i);
    const sbp = digest.vitals.find((v) => v.type === "bp_systolic");
    expect(sbp).toMatchObject({ latest: 120, mean7d: 120, outOfRange30d: 0 });
  });
});

describe("ruleBasedSummary", () => {
  it("reports a stable patient as stable and validates against the schema", () => {
    const summary = ruleBasedSummary(buildDigest({ ...base, readings: readings(() => 118) }));
    expect(AiSummary.parse(summary)).toEqual(summary);
    expect(summary.status).toBe("stable");
    expect(summary.flags).toEqual([]);
  });

  it("detects a worsening BP trend and a critical SpO₂", () => {
    const summary = ruleBasedSummary(buildDigest({ ...base, readings: readings((d) => (d < 7 ? 150 : 125), 89) }));
    expect(summary.status).toBe("concerning");
    expect(summary.trends).toContainEqual(expect.objectContaining({ vital: "blood_pressure", direction: "worsening" }));
    expect(summary.flags).toContainEqual(expect.objectContaining({ severity: "critical" }));
    expect(summary.followUps.length).toBeGreaterThan(0);
  });
});
