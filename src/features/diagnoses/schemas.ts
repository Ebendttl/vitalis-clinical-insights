import { z } from "zod";

export const DIAGNOSIS_STATUSES = ["active", "under_observation", "resolved"] as const;
export type DiagnosisStatus = (typeof DIAGNOSIS_STATUSES)[number];

export const STATUS_LABELS: Record<DiagnosisStatus, string> = {
  active: "Active",
  under_observation: "Under observation",
  resolved: "Resolved",
};

export const DiagnosisEvent = z.object({
  id: z.number(),
  event_type: z.enum(["diagnosed", "status_changed", "note"]),
  from_status: z.enum(DIAGNOSIS_STATUSES).nullable(),
  to_status: z.enum(DIAGNOSIS_STATUSES).nullable(),
  note: z.string().nullable(),
  occurred_at: z.string(),
});
export type DiagnosisEvent = z.infer<typeof DiagnosisEvent>;

export const Diagnosis = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(DIAGNOSIS_STATUSES),
  onset_date: z.string(),
  resolved_date: z.string().nullable(),
  updated_at: z.string(),
  diagnosis_events: z.array(DiagnosisEvent).default([]),
});
export type Diagnosis = z.infer<typeof Diagnosis>;
