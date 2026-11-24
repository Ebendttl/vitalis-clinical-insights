/**
 * Locale-aware formatting. Formatters are created once (Intl constructors are
 * comparatively expensive) and reused across renders.
 */

const LOCALE = "en-GB";

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const monthFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", year: "2-digit" });
const relFmt = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto", style: "short" });

export const formatDate = (iso: string | number | Date) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string | number | Date) => dateTimeFmt.format(new Date(iso));
export const formatMonth = (iso: string | number | Date) => monthFmt.format(new Date(iso));

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function formatRelative(iso: string | number | Date, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return relFmt.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

export const formatSex = (sex: "female" | "male") => (sex === "female" ? "Female" : "Male");
