import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PatientDetail } from "../schemas";

/** Distinct active condition names across the clinician's panel, for the filter menu. */
export async function getConditionOptions(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("patients").select("conditions");
  if (error) throw new Error(error.message);
  return [...new Set(data.flatMap((row) => row.conditions))].sort((a, b) => a.localeCompare(b));
}

/** RLS returns no row for unassigned patients, which we surface as a 404 (not 403) to avoid leaking existence. */
export const getPatient = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  return PatientDetail.parse(data);
});
