import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { LabReport } from "../schemas";

export const getLabReports = cache(async (patientId: string): Promise<LabReport[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lab_reports")
    .select("id, type, status, flag, collected_at, reported_at, file_path, results")
    .eq("patient_id", patientId)
    .order("collected_at", { ascending: false });
  if (error) throw new Error(error.message);
  return LabReport.array().parse(data);
});
