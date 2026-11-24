import { z } from "zod";

const KEY = "vitalis:recent-patients";
const MAX = 6;

export const RecentPatient = z.object({ id: z.string(), name: z.string(), mrn: z.string() });
export type RecentPatient = z.infer<typeof RecentPatient>;

/** Recently viewed patients, per browser. Parsed defensively: storage is user-editable. */
export function readRecentPatients(): RecentPatient[] {
  try {
    const parsed = RecentPatient.array().safeParse(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function rememberPatient(patient: RecentPatient) {
  try {
    const next = [patient, ...readRecentPatients().filter((p) => p.id !== patient.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / quota): recents are a convenience only.
  }
}
