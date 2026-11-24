import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type AgeBand, DirectoryPatient, type DirectoryFilters, type DirectoryResult } from "../schemas";

export const DIRECTORY_COLUMNS = "id, mrn, full_name, date_of_birth, sex, conditions, risk_score, risk_level, last_reading_at";
export const DIRECTORY_LIMIT = 1000;

export const directoryKey = (filters: DirectoryFilters) => ["directory", normalizeFilters(filters)] as const;

/** Stable key: sorted risk list and trimmed query mean equivalent URLs share one cache entry. */
export function normalizeFilters(filters: DirectoryFilters): DirectoryFilters {
  return { ...filters, q: filters.q.trim(), risk: [...filters.risk].sort() };
}

/**
 * PostgREST's `or=` filter is a mini-language; commas, parentheses and wildcards in
 * user input would change its meaning. Keep only characters that appear in names/MRNs.
 */
export function sanitizeSearch(input: string): string {
  return input.replace(/[^\p{L}\p{N}\s'.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Inclusive DOB bounds (YYYY-MM-DD) for an age band relative to `now`. */
export function dobBounds(band: AgeBand, now: Date = new Date()): { min?: string; max?: string } {
  const yearsAgo = (years: number, extraDays = 0) => {
    const d = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate() + extraDays));
    return d.toISOString().slice(0, 10);
  };
  switch (band) {
    case "18-39":
      return { min: yearsAgo(40, 1), max: yearsAgo(18) };
    case "40-64":
      return { min: yearsAgo(65, 1), max: yearsAgo(40) };
    case "65+":
      return { max: yearsAgo(65) };
  }
}

export async function fetchDirectory(
  supabase: SupabaseClient<Database>,
  filters: DirectoryFilters,
  signal?: AbortSignal,
  limit: number = DIRECTORY_LIMIT,
): Promise<DirectoryResult> {
  const started = performance.now();
  let query = supabase.from("patients").select(DIRECTORY_COLUMNS, { count: "exact" });

  const q = sanitizeSearch(filters.q);
  if (q) query = query.or(`full_name.ilike.%${q}%,mrn.ilike.%${q}%`);
  if (filters.risk.length) query = query.in("risk_level", filters.risk);
  if (filters.condition) query = query.contains("conditions", [filters.condition]);
  if (filters.age) {
    const { min, max } = dobBounds(filters.age);
    if (min) query = query.gte("date_of_birth", min);
    if (max) query = query.lte("date_of_birth", max);
  }

  switch (filters.sort) {
    case "risk":
      query = query.order("risk_score", { ascending: false }).order("full_name");
      break;
    case "name":
      query = query.order("last_name").order("first_name");
      break;
    case "age":
      query = query.order("date_of_birth", { ascending: true });
      break;
    case "recent":
      query = query.order("last_reading_at", { ascending: false, nullsFirst: false });
      break;
  }

  if (signal) query = query.abortSignal(signal);
  const { data, error, count } = await query.limit(limit);
  if (error) throw new Error(error.message);

  return {
    patients: DirectoryPatient.array().parse(data),
    total: count ?? data.length,
    durationMs: Math.round(performance.now() - started),
  };
}
