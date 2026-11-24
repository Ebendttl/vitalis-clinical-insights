"use server";

import { z } from "zod";
import { writeAudit } from "@/features/audit/server/log";
import { VITAL_TYPES, type VitalType } from "@/features/vitals/lib/definitions";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { nextReadings } from "../lib/simulate";

const Input = z.object({ patientId: z.uuid() });

export type SimulateResult = { ok: true; inserted: number } | { ok: false; error: string };

/**
 * Inserts one simulated check-in (all six vitals) as the signed-in clinician.
 * RLS only allows source='simulated' rows for assigned patients, so this can't
 * forge clinical data or touch anyone else's panel.
 */
export async function simulateReading(input: z.input<typeof Input>): Promise<SimulateResult> {
  if (!env.DEMO_SIMULATION_ENABLED) return { ok: false, error: "Live demo is disabled." };
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid patient." };
  const { patientId } = parsed.data;

  const supabase = await createClient();
  const { data: recent, error: readError } = await supabase
    .from("vital_readings")
    .select("type, value")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false })
    .limit(VITAL_TYPES.length * 2);
  if (readError) return { ok: false, error: "Couldn't read the latest vitals." };

  const latest: Partial<Record<VitalType, number>> = {};
  for (const r of recent ?? []) latest[r.type] ??= Number(r.value);

  const recordedAt = new Date().toISOString();
  const rows = nextReadings(latest).map((r) => ({ ...r, patient_id: patientId, recorded_at: recordedAt, source: "simulated" as const }));
  const { error } = await supabase.from("vital_readings").insert(rows);
  if (error) return { ok: false, error: "This patient isn't on your panel." };

  void writeAudit({ action: "demo.reading_simulated", entityType: "patient", entityId: patientId, patientId });
  return { ok: true, inserted: rows.length };
}
