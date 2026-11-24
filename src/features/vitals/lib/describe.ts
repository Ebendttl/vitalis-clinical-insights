import { formatDate } from "@/lib/format";
import { formatVital, VITALS, type VitalType } from "./definitions";
import type { Point, SeriesSummary } from "./series";

/** One-paragraph text alternative for a chart (WCAG 1.1.1). */
export function describeSeries(type: VitalType, points: Point[], summary: SeriesSummary): string {
  const def = VITALS[type];
  if (points.length === 0 || summary.mean === null || summary.min === null || summary.max === null) {
    return `${def.label}: no readings in this period.`;
  }
  const f = (v: number) => `${formatVital(type, v)} ${def.unit}`;
  return [
    `${def.label} from ${formatDate(points[0].t)} to ${formatDate(points.at(-1)?.t ?? points[0].t)}: ${summary.count} readings.`,
    `Average ${f(summary.mean)}, ranging ${f(summary.min)} to ${f(summary.max)}.`,
    `Normal range ${def.thresholds.low}–${def.thresholds.high} ${def.unit}.`,
    summary.outOfRange ? `${summary.outOfRange} readings out of range, ${summary.critical} critical.` : "All readings within range.",
  ].join(" ");
}
