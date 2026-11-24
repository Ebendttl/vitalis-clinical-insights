import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { READING_COLUMNS, VitalReading } from "../schemas";
import { monthBounds } from "./ranges";

export { vitalsMonthKey } from "./query-keys";

/** One calendar month of readings. Past months are immutable, so the cache never needs to refetch them. */
export async function fetchVitalsMonth(
  supabase: SupabaseClient<Database>,
  patientId: string,
  month: string,
  signal?: AbortSignal,
): Promise<VitalReading[]> {
  const { start, end } = monthBounds(month);
  let query = supabase
    .from("vital_readings")
    .select(READING_COLUMNS)
    .eq("patient_id", patientId)
    .gte("recorded_at", start)
    .lt("recorded_at", end)
    .order("recorded_at");
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return VitalReading.array().parse(data);
}
