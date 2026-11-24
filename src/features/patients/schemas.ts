import { z } from "zod";

export const RISK_LEVELS = ["low", "moderate", "elevated", "critical"] as const;
export const AGE_BANDS = ["18-39", "40-64", "65+"] as const;
export const SORTS = ["risk", "name", "age", "recent"] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];
export type AgeBand = (typeof AGE_BANDS)[number];
export type DirectorySort = (typeof SORTS)[number];

export const DirectoryFilters = z.object({
  q: z.string().max(80).default(""),
  risk: z.array(z.enum(RISK_LEVELS)).default([]),
  condition: z.string().max(80).nullable().default(null),
  age: z.enum(AGE_BANDS).nullable().default(null),
  sort: z.enum(SORTS).default("risk"),
});
export type DirectoryFilters = z.infer<typeof DirectoryFilters>;

export const DirectoryPatient = z.object({
  id: z.uuid(),
  mrn: z.string(),
  full_name: z.string(),
  date_of_birth: z.string(),
  sex: z.enum(["female", "male"]),
  conditions: z.array(z.string()),
  risk_score: z.number().int(),
  risk_level: z.enum(RISK_LEVELS),
  last_reading_at: z.string().nullable(),
});
export type DirectoryPatient = z.infer<typeof DirectoryPatient>;

export const DirectoryResult = z.object({
  patients: z.array(DirectoryPatient),
  total: z.number().int(),
  durationMs: z.number(),
});
export type DirectoryResult = z.infer<typeof DirectoryResult>;

export const PatientDetail = DirectoryPatient.extend({
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  address_line: z.string(),
  city: z.string(),
  postal_code: z.string(),
  emergency_contact_name: z.string(),
  emergency_contact_relation: z.string(),
  emergency_contact_phone: z.string(),
  insurance_provider: z.string(),
  insurance_member_id: z.string(),
  insurance_plan: z.string(),
  blood_type: z.string().nullable(),
});
export type PatientDetail = z.infer<typeof PatientDetail>;
