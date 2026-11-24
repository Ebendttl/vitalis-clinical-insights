import { type Classification, classify, KIND_META, VITAL_KINDS, type VitalKind, type VitalType, worstSeverity } from "./definitions";
import { computeRisk, type RiskResult } from "./risk";
import { downsampleDaily, type Point, type ReadingLike, seriesFor, type Trend, trend } from "./series";

export type KindSnapshot = {
  kind: VitalKind;
  label: string;
  unit: string;
  /** Primary + optional secondary (diastolic) latest values. */
  latest: { value: number; secondary?: number; recordedAt: string } | null;
  classification: Classification;
  trend: Trend | null;
  series: Point[];
  secondarySeries?: Point[];
  primaryType: VitalType;
  secondaryType?: VitalType;
};

export function latestTimestamp(readings: readonly ReadingLike[]): number {
  let max = 0;
  for (const r of readings) max = Math.max(max, Date.parse(r.recordedAt));
  return max;
}

export type PatientSnapshot = { kinds: KindSnapshot[]; risk: RiskResult };

/** Latest-reading-per-kind view used by the Vital Strip, recomputable on the client after live readings. */
export function buildSnapshot(
  readings: readonly ReadingLike[],
  context: { ageYears: number; activeChronicConditions: number },
  now: number = Date.now(),
): PatientSnapshot {
  const latestByType: Partial<Record<VitalType, { value: number; recordedAt: string }>> = {};
  for (const r of readings) {
    const prev = latestByType[r.type];
    if (!prev || r.recordedAt > prev.recordedAt) latestByType[r.type] = { value: r.value, recordedAt: r.recordedAt };
  }

  const kinds = VITAL_KINDS.map((kind): KindSnapshot => {
    const [primaryType, secondaryType] = KIND_META[kind].types;
    const primary = latestByType[primaryType];
    const secondary = secondaryType ? latestByType[secondaryType] : undefined;
    const raw = seriesFor(readings, primaryType);
    const classifications = [primary && classify(primaryType, primary.value), secondary && secondaryType && classify(secondaryType, secondary.value)].filter(
      (c): c is Classification => Boolean(c),
    );
    const worst = worstSeverity(classifications.map((c) => c.severity));
    return {
      kind,
      label: KIND_META[kind].label,
      unit: KIND_META[kind].unit,
      latest: primary ? { value: primary.value, secondary: secondary?.value, recordedAt: primary.recordedAt } : null,
      classification: classifications.find((c) => c.severity === worst) ?? { severity: "normal", direction: null },
      trend: trend(raw, primaryType, now),
      series: downsampleDaily(raw, primaryType, 60),
      secondarySeries: secondaryType ? downsampleDaily(seriesFor(readings, secondaryType), secondaryType, 60) : undefined,
      primaryType,
      secondaryType,
    };
  });

  const DAY = 86_400_000;
  const systolic30 = seriesFor(readings, "bp_systolic").filter((p) => p.t > now - 30 * DAY);
  const risk = computeRisk({
    latest: Object.fromEntries(Object.entries(latestByType).map(([k, v]) => [k, v.value])),
    ageYears: context.ageYears,
    activeChronicConditions: context.activeChronicConditions,
    meanSystolic30d: systolic30.length ? systolic30.reduce((s, p) => s + p.value, 0) / systolic30.length : undefined,
  });

  return { kinds, risk };
}
