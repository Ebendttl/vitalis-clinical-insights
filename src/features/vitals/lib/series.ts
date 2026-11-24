import { classify, type Severity, type VitalType, VITALS } from "./definitions";
import { DAY_MS, type DateRange, startOfUtcDay } from "./ranges";

export type Point = { t: number; value: number };

export type ReadingLike = { type: VitalType; value: number; recordedAt: string };

/** Ascending points for one vital type within an optional range. */
export function seriesFor(readings: readonly ReadingLike[], type: VitalType, range?: DateRange): Point[] {
  const from = range?.from.getTime() ?? -Infinity;
  const to = range?.to.getTime() ?? Infinity;
  const points: Point[] = [];
  for (const r of readings) {
    if (r.type !== type) continue;
    const t = Date.parse(r.recordedAt);
    if (t >= from && t <= to) points.push({ t, value: r.value });
  }
  return points.sort((a, b) => a.t - b.t);
}

/**
 * Daily means when a series is too dense to draw legibly. Keeps the single most
 * extreme raw value per day as well, so abnormal spikes are never averaged away.
 */
export function downsampleDaily(points: readonly Point[], type: VitalType, maxPoints = 400): Point[] {
  if (points.length <= maxPoints) return [...points];
  const byDay = new Map<number, Point[]>();
  for (const p of points) {
    const day = startOfUtcDay(new Date(p.t)).getTime();
    const bucket = byDay.get(day);
    if (bucket) bucket.push(p);
    else byDay.set(day, [p]);
  }
  const { low, high } = VITALS[type].thresholds;
  const mid = (low + high) / 2;
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, bucket]) => {
      const extreme = bucket.reduce((a, b) => (Math.abs(b.value - mid) > Math.abs(a.value - mid) ? b : a));
      const isAbnormal = classify(type, extreme.value).severity !== "normal";
      const mean = bucket.reduce((sum, p) => sum + p.value, 0) / bucket.length;
      return { t: day + DAY_MS / 2, value: isAbnormal ? extreme.value : mean };
    });
}

export type SeriesSummary = {
  count: number;
  latest: Point | null;
  min: number | null;
  max: number | null;
  mean: number | null;
  outOfRange: number;
  critical: number;
};

export function summarize(points: readonly Point[], type: VitalType): SeriesSummary {
  if (points.length === 0) {
    return { count: 0, latest: null, min: null, max: null, mean: null, outOfRange: 0, critical: 0 };
  }
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let outOfRange = 0;
  let critical = 0;
  for (const p of points) {
    min = Math.min(min, p.value);
    max = Math.max(max, p.value);
    sum += p.value;
    const { severity } = classify(type, p.value);
    if (severity !== "normal") outOfRange++;
    if (severity === "critical") critical++;
  }
  return { count: points.length, latest: points.at(-1) ?? null, min, max, mean: sum / points.length, outOfRange, critical };
}

export type TrendDirection = "up" | "down" | "stable";
export type Trend = { direction: TrendDirection; delta: number; recentMean: number; baselineMean: number };

/**
 * Last `recentDays` mean vs the `baselineDays` before it. Means rather than single
 * readings so one noisy measurement doesn't flip the arrow.
 */
export function trend(
  points: readonly Point[],
  type: VitalType,
  now: number = Date.now(),
  recentDays = 7,
  baselineDays = 30,
): Trend | null {
  const recentStart = now - recentDays * DAY_MS;
  const baselineStart = recentStart - baselineDays * DAY_MS;
  const recent: number[] = [];
  const baseline: number[] = [];
  for (const p of points) {
    if (p.t > now) continue;
    if (p.t >= recentStart) recent.push(p.value);
    else if (p.t >= baselineStart) baseline.push(p.value);
  }
  if (recent.length === 0 || baseline.length === 0) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const recentMean = mean(recent);
  const baselineMean = mean(baseline);
  const delta = recentMean - baselineMean;
  const direction: TrendDirection =
    Math.abs(delta) < VITALS[type].trendEpsilon ? "stable" : delta > 0 ? "up" : "down";
  return { direction, delta, recentMean, baselineMean };
}

/** Points that fall outside the normal band, for chart markers and flag lists. */
export function flaggedPoints(points: readonly Point[], type: VitalType): Array<Point & { severity: Severity }> {
  return points
    .map((p) => ({ ...p, severity: classify(type, p.value).severity }))
    .filter((p) => p.severity !== "normal");
}

/**
 * Shifts a previous period onto the current period's time axis so both can be
 * drawn on the same chart (day 0 of the previous window aligns with day 0 of the current).
 */
export function alignToPeriod(points: readonly Point[], previous: DateRange, current: DateRange): Point[] {
  const offset = current.from.getTime() - previous.from.getTime();
  return points.map((p) => ({ t: p.t + offset, value: p.value }));
}
