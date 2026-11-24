import { z } from "zod";

export const LabResultRow = z.object({
  analyte: z.string(),
  value: z.number(),
  unit: z.string(),
  low: z.number(),
  high: z.number(),
  flag: z.enum(["normal", "abnormal", "critical"]),
});

export const LabReport = z.object({
  id: z.uuid(),
  type: z.string(),
  status: z.enum(["pending", "final", "amended"]),
  flag: z.enum(["normal", "abnormal", "critical"]),
  collected_at: z.string(),
  reported_at: z.string().nullable(),
  file_path: z.string().nullable(),
  results: z.array(LabResultRow),
});
export type LabReport = z.infer<typeof LabReport>;
