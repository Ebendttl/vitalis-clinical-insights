"use client";

import { useQueries } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/supabase/browser";
import { fetchVitalsMonth, vitalsMonthKey } from "../lib/month-query";
import { type DateRange, monthKey, monthKeysBetween } from "../lib/ranges";
import type { VitalReading } from "../schemas";

/**
 * Readings for an arbitrary range, assembled from per-month cache entries.
 * Past months are immutable (staleTime: Infinity, kept for the session), so
 * switching 12m → 3m → 6m never refetches; only the current month refreshes.
 */
export function useVitalsRange(patientId: string, range: DateRange | null) {
  const months = range ? monthKeysBetween(range) : [];
  const current = monthKey(new Date());

  return useQueries({
    queries: months.map((month) => ({
      queryKey: vitalsMonthKey(patientId, month),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchVitalsMonth(getBrowserClient(), patientId, month, signal),
      staleTime: month === current ? 60_000 : Infinity,
      gcTime: month === current ? 5 * 60_000 : Infinity,
    })),
    combine: (results) => {
      const readings: VitalReading[] = [];
      for (const r of results) if (r.data) readings.push(...r.data);
      const from = range?.from.getTime() ?? 0;
      const to = range?.to.getTime() ?? 0;
      return {
        readings: readings.filter((r) => {
          const t = Date.parse(r.recordedAt);
          return t >= from && t <= to;
        }),
        isLoading: results.some((r) => r.isPending),
        isFetching: results.some((r) => r.isFetching),
        isError: results.some((r) => r.isError),
        refetch: () => Promise.all(results.filter((r) => r.isError).map((r) => r.refetch())),
        monthsLoaded: results.filter((r) => r.isSuccess).length,
        monthsTotal: results.length,
      };
    },
  });
}
