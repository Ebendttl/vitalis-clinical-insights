/**
 * Time ranges and month buckets.
 *
 * Readings are cached per calendar month (UTC). A 3/6/12-month view is the union of
 * its month buckets, so switching ranges only ever fetches months not yet cached.
 */

export const RANGE_PRESETS = ["3m", "6m", "12m"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const PRESET_MONTHS: Record<RangePreset, number> = { "3m": 3, "6m": 6, "12m": 12 };

export const PRESET_LABELS: Record<RangePreset, string> = {
  "3m": "3 months",
  "6m": "6 months",
  "12m": "12 months",
};

export type DateRange = { from: Date; to: Date };

const DAY_MS = 86_400_000;

export function presetRange(preset: RangePreset, now: Date = new Date()): DateRange {
  const from = new Date(now);
  from.setUTCMonth(from.getUTCMonth() - PRESET_MONTHS[preset]);
  return { from, to: now };
}

/** The window of identical length immediately before `range`. */
export function previousPeriod(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - span), to: new Date(range.from.getTime()) };
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive list of YYYY-MM keys touched by the range. */
export function monthKeysBetween({ from, to }: DateRange): string[] {
  if (from > to) return [];
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (cursor <= to) {
    keys.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

/** Half-open [start, end) ISO bounds for a YYYY-MM key. */
export function monthBounds(key: string): { start: string; end: string } {
  const [year, month] = key.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export function daysBetween(range: DateRange): number {
  return Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export { DAY_MS };
