"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { liveKey, recentVitalsKey, vitalsMonthKey } from "@/features/vitals/lib/query-keys";
import { monthKey } from "@/features/vitals/lib/ranges";
import { VitalReading } from "@/features/vitals/schemas";
import { getBrowserClient } from "@/lib/supabase/browser";

export type LiveStatus = "idle" | "connecting" | "live" | "error";

/**
 * Subscribes to new readings for one patient and writes them straight into the
 * query cache (current month bucket + header snapshot). Only components reading
 * those keys re-render; there's no refetch and no page-level state change.
 */
export function useLiveVitals(patientId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const supabase = getBrowserClient();
    queryClient.setQueryData(liveKey(patientId), true);

    const channel = supabase
      .channel(`vitals:${patientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vital_readings", filter: `patient_id=eq.${patientId}` },
        (payload) => {
          const parsed = VitalReading.safeParse(payload.new);
          if (!parsed.success) return;
          const reading = parsed.data;
          setLastLatencyMs(Math.max(0, Date.now() - Date.parse(reading.recordedAt)));
          const append = (old: VitalReading[] | undefined) =>
            old?.some((r) => r.id === reading.id) ? old : [...(old ?? []), reading];
          queryClient.setQueryData(vitalsMonthKey(patientId, monthKey(new Date(reading.recordedAt))), append);
          queryClient.setQueryData(recentVitalsKey(patientId), append);
        },
      )
      .subscribe((s) => setStatus(s === "SUBSCRIBED" ? "live" : s === "CHANNEL_ERROR" || s === "TIMED_OUT" ? "error" : "connecting"));

    return () => {
      queryClient.setQueryData(liveKey(patientId), false);
      void supabase.removeChannel(channel);
      setStatus("idle");
    };
  }, [enabled, patientId, queryClient]);

  return { status, lastLatencyMs };
}
