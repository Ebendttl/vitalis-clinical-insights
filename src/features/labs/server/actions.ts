"use server";

import { z } from "zod";
import { writeAudit } from "@/features/audit/server/log";
import { createClient } from "@/lib/supabase/server";

const Input = z.object({ reportId: z.uuid(), mode: z.enum(["preview", "download"]) });

export type SignedUrlResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Short-lived signed URL for a lab PDF. Both the row lookup and the storage
 * signing run as the clinician, so RLS on lab_reports and storage.objects
 * independently prevent access to unassigned patients' files.
 */
export async function getLabReportUrl(input: z.input<typeof Input>): Promise<SignedUrlResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { data: report } = await supabase
    .from("lab_reports")
    .select("id, patient_id, type, file_path, collected_at")
    .eq("id", parsed.data.reportId)
    .maybeSingle();
  if (!report?.file_path) return { ok: false, error: "This report isn't available yet." };

  const filename = `${report.type.replace(/\W+/g, "-").toLowerCase()}-${report.collected_at.slice(0, 10)}.pdf`;
  const { data, error } = await supabase.storage
    .from("lab-reports")
    .createSignedUrl(report.file_path, 120, { download: parsed.data.mode === "download" ? filename : false });
  if (error || !data) return { ok: false, error: "Couldn't open the report. Try again." };

  void writeAudit({
    action: parsed.data.mode === "download" ? "lab.downloaded" : "lab.previewed",
    entityType: "lab_report",
    entityId: report.id,
    patientId: report.patient_id,
  });
  return { ok: true, url: data.signedUrl };
}
