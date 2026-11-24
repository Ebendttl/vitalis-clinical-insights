import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Diagnosis } from "../schemas";

export const getDiagnoses = cache(async (patientId: string): Promise<Diagnosis[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diagnoses")
    .select("id, code, name, description, status, onset_date, resolved_date, updated_at, diagnosis_events(id, event_type, from_status, to_status, note, occurred_at)")
    .eq("patient_id", patientId)
    .order("onset_date", { ascending: false })
    .order("occurred_at", { referencedTable: "diagnosis_events", ascending: false });
  if (error) throw new Error(error.message);
  return Diagnosis.array().parse(data);
});
