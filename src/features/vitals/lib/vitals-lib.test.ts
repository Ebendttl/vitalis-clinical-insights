import { describe, expect, it } from "vitest";
import { classify, severityLabel, worstSeverity } from "./definitions";
import { monthBounds, monthKeysBetween, presetRange, previousPeriod } from "./ranges";
import { ageFromDob, computeRisk, riskLevel } from "./risk";
import { alignToPeriod, downsampleDaily, flaggedPoints, seriesFor, summarize, trend } from "./series";

const DAY = 86_400_000;

describe("classify", () => {
  it.each([
    ["bp_systolic", 120, "normal", null],
    ["bp_systolic", 129, "normal", null],
    ["bp_systolic", 130, "elevated", "high"],
    ["bp_systolic", 180, "critical", "high"],
    ["bp_systolic", 85, "elevated", "low"],
    ["bp_systolic", 79, "critical", "low"],
    ["temperature", 37.5, "normal", null],
    ["temperature", 37.6, "elevated", "high"],
    ["temperature", 39.2, "critical", "high"],
    ["spo2", 94, "elevated", "low"],
    ["spo2", 91, "critical", "low"],
    ["spo2", 100, "normal", null],
  ] as const)("%s %d → %s", (type, value, severity, direction) => {
    expect(classify(type, value)).toEqual({ severity, direction });
  });

  it("labels and ranks severities", () => {
    expect(severityLabel({ severity: "critical", direction: "low" })).toBe("Critically low");
    expect(severityLabel({ severity: "elevated", direction: "high" })).toBe("Above range");
    expect(worstSeverity(["normal", "critical", "elevated"])).toBe("critical");
    expect(worstSeverity([])).toBe("normal");
  });
});

describe("ranges", () => {
  const now = new Date("2026-11-24T12:00:00Z");

  it("builds preset ranges and month keys", () => {
    const r = presetRange("3m", now);
    expect(r.from.toISOString()).toBe("2026-08-24T12:00:00.000Z");
    expect(monthKeysBetween(r)).toEqual(["2026-08", "2026-09", "2026-10", "2026-11"]);
  });

  it("a shorter preset's months are a subset of a longer one's (cache reuse)", () => {
    const short = new Set(monthKeysBetween(presetRange("3m", now)));
    const long = new Set(monthKeysBetween(presetRange("12m", now)));
    for (const k of short) expect(long.has(k)).toBe(true);
  });

  it("crosses year boundaries", () => {
    expect(monthKeysBetween({ from: new Date("2025-11-15Z"), to: new Date("2026-02-01Z") })).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("returns half-open month bounds and previous periods", () => {
    expect(monthBounds("2026-12")).toEqual({
      start: "2026-12-01T00:00:00.000Z",
      end: "2027-01-01T00:00:00.000Z",
    });
    const prev = previousPeriod({ from: new Date("2026-06-01Z"), to: new Date("2026-07-01Z") });
    expect(prev.from.toISOString()).toBe("2026-05-02T00:00:00.000Z");
    expect(prev.to.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
});

describe("series", () => {
  const base = Date.parse("2026-01-01T08:00:00Z");
  const readings = [
    { type: "heart_rate" as const, value: 80, recordedAt: new Date(base + 2 * DAY).toISOString() },
    { type: "heart_rate" as const, value: 70, recordedAt: new Date(base).toISOString() },
    { type: "spo2" as const, value: 97, recordedAt: new Date(base).toISOString() },
    { type: "heart_rate" as const, value: 140, recordedAt: new Date(base + DAY).toISOString() },
  ];

  it("extracts sorted points for a type and range", () => {
    const pts = seriesFor(readings, "heart_rate");
    expect(pts.map((p) => p.value)).toEqual([70, 140, 80]);
    const ranged = seriesFor(readings, "heart_rate", { from: new Date(base + DAY), to: new Date(base + 3 * DAY) });
    expect(ranged.map((p) => p.value)).toEqual([140, 80]);
  });

  it("summarises with out-of-range counts", () => {
    const s = summarize(seriesFor(readings, "heart_rate"), "heart_rate");
    expect(s).toMatchObject({ count: 3, min: 70, max: 140, mean: 290 / 3, outOfRange: 1, critical: 1 });
    expect(s.latest?.value).toBe(80);
    expect(summarize([], "heart_rate").latest).toBeNull();
  });

  it("flags abnormal points", () => {
    expect(flaggedPoints(seriesFor(readings, "heart_rate"), "heart_rate")).toEqual([
      expect.objectContaining({ value: 140, severity: "critical" }),
    ]);
  });

  it("downsamples to daily means but keeps abnormal spikes", () => {
    const dense = Array.from({ length: 20 }, (_, i) => ({ t: base + (i % 2) * 3_600_000 + Math.floor(i / 2) * DAY, value: 70 }));
    dense[5] = { ...dense[5], value: 150 };
    const out = downsampleDaily(dense, "heart_rate", 5);
    expect(out).toHaveLength(10);
    expect(out.some((p) => p.value === 150)).toBe(true);
    expect(downsampleDaily(dense, "heart_rate", 100)).toHaveLength(20);
  });

  it("computes trend direction against a baseline", () => {
    const now = base + 40 * DAY;
    const pts = [
      ...Array.from({ length: 30 }, (_, i) => ({ t: base + (i + 3) * DAY, value: 70 })),
      ...Array.from({ length: 5 }, (_, i) => ({ t: now - i * DAY, value: 80 })),
    ];
    expect(trend(pts, "heart_rate", now)).toMatchObject({ direction: "up", delta: 10 });
    expect(trend(pts.slice(0, 30), "heart_rate", now)).toBeNull();
    const flat = pts.map((p) => ({ ...p, value: 70 + (p.t % 2) }));
    expect(trend(flat, "heart_rate", now)?.direction).toBe("stable");
  });

  it("aligns a previous period onto the current axis", () => {
    const prev = { from: new Date(base), to: new Date(base + 10 * DAY) };
    const cur = { from: new Date(base + 10 * DAY), to: new Date(base + 20 * DAY) };
    expect(alignToPeriod([{ t: base + DAY, value: 1 }], prev, cur)).toEqual([{ t: base + 11 * DAY, value: 1 }]);
  });
});

describe("risk", () => {
  it("scores a healthy adult as low", () => {
    const r = computeRisk({
      latest: { respiratory_rate: 14, spo2: 98, bp_systolic: 118, heart_rate: 68, temperature: 36.7 },
      ageYears: 34,
      activeChronicConditions: 0,
    });
    expect(r).toEqual({ score: 0, level: "low", factors: [] });
  });

  it("accumulates physiology and context factors, sorted by weight", () => {
    const r = computeRisk({
      latest: { respiratory_rate: 25, spo2: 91, bp_systolic: 150, heart_rate: 115, temperature: 38.5 },
      ageYears: 82,
      activeChronicConditions: 3,
      meanSystolic30d: 148,
    });
    // RR 3 + SpO2 3 + HR 2 + temp 1 + age 2 + chronic 2 + sustained HTN 2
    expect(r.score).toBe(15);
    expect(r.level).toBe("critical");
    expect(r.factors[0].points).toBe(3);
  });

  it("caps at 20 and maps levels", () => {
    expect(riskLevel(3)).toBe("low");
    expect(riskLevel(4)).toBe("moderate");
    expect(riskLevel(6)).toBe("elevated");
    expect(riskLevel(8)).toBe("critical");
    const extreme = computeRisk({
      latest: { respiratory_rate: 30, spo2: 80, bp_systolic: 80, heart_rate: 150, temperature: 34 },
      ageYears: 90,
      activeChronicConditions: 5,
      meanSystolic30d: 160,
    });
    expect(extreme.score).toBe(20);
  });

  it("computes age around birthdays", () => {
    const now = new Date("2026-11-24T00:00:00Z");
    expect(ageFromDob("1990-11-24", now)).toBe(36);
    expect(ageFromDob("1990-11-25", now)).toBe(35);
  });
});
