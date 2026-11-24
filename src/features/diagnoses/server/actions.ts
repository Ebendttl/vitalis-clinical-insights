"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DIAGNOSIS_STATUSES } from "../schemas";

const Input = z.object({
  diagnosisId: z.uuid(),
  patientId: z.uuid(),
  status: z.enum(DIAGNOSIS_STATUSES),
  note: z.string().trim().max(500).optional(),
});

export type ChangeStatusResult = { ok: true } | { ok: false; error: string };

/** Status row, history event and audit entry are written in one transaction by change_diagnosis_status(). */
export async function changeDiagnosisStatus(input: z.input<typeof Input>): Promise<ChangeStatusResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_diagnosis_status", {
    p_diagnosis_id: parsed.data.diagnosisId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { ok: false, error: "Couldn't update the diagnosis. You may not have access to this patient." };
  revalidatePath(`/patients/${parsed.data.patientId}`, "layout");
  return { ok: true };
}
