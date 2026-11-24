import { z } from "zod";
import { VITAL_TYPES } from "./lib/definitions";

export const VitalReading = z
  .object({
    id: z.number(),
    patient_id: z.uuid(),
    type: z.enum(VITAL_TYPES),
    value: z.coerce.number(),
    unit: z.string(),
    recorded_at: z.string(),
    source: z.enum(["clinic", "home_device", "simulated"]),
  })
  .transform((r) => ({
    id: r.id,
    patientId: r.patient_id,
    type: r.type,
    value: r.value,
    unit: r.unit,
    recordedAt: r.recorded_at,
    source: r.source,
  }));

export type VitalReading = z.output<typeof VitalReading>;

export const READING_COLUMNS = "id, patient_id, type, value, unit, recorded_at, source";
