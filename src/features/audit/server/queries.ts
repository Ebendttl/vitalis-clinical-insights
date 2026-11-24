import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AuditRow = z.object({
  id: z.number(),
  action: z.string(),
  entity_type: z.string(),
  patient_id: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  patients: z.object({ full_name: z.string() }).nullable(),
});
export type AuditRow = z.infer<typeof AuditRow>;

/** The signed-in clinician's own trail (RLS: actor_id = auth.uid()). */
export async function getMyAuditTrail(limit = 100): Promise<AuditRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, patient_id, metadata, created_at, patients(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return AuditRow.array().parse(data);
}
