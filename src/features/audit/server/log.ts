import "server-only";
import { after } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "patient.viewed"
  | "vitals.viewed"
  | "lab.previewed"
  | "lab.downloaded"
  | "diagnosis.status_changed"
  | "ai_summary.generated"
  | "ai_summary.failed"
  | "demo.reading_simulated";

type AuditEntry = { action: AuditAction; entityType: string; entityId?: string; patientId?: string; metadata?: Json };

/** Writes through the SECURITY DEFINER log_audit() so the table stays append-only. */
export async function writeAudit(entry: AuditEntry) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_audit", {
    p_action: entry.action,
    p_entity_type: entry.entityType,
    p_entity_id: entry.entityId,
    p_patient_id: entry.patientId,
    p_metadata: entry.metadata ?? {},
  });
  if (error) console.warn("[audit] failed", entry.action, error.message);
}

/** Records after the response streams, so auditing never slows a page view. */
export function auditAfterResponse(entry: AuditEntry) {
  after(() => writeAudit(entry));
}
