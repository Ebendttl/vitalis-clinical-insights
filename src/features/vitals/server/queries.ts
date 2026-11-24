import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { READING_COLUMNS, VitalReading } from "../schemas";

const DAY = 86_400_000;

/** Recent readings for the header sparklines; memoised so layout and page share one query. */
export const getRecentReadings = cache(async (patientId: string, days = 90): Promise<VitalReading[]> => {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * DAY).toISOString();
  const { data, error } = await supabase
    .from("vital_readings")
    .select(READING_COLUMNS)
    .eq("patient_id", patientId)
    .gte("recorded_at", since)
    .order("recorded_at");
  if (error) throw new Error(error.message);
  return VitalReading.array().parse(data);
});
