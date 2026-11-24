# 0003 — Data model, RLS and synthetic data

- **Status:** Accepted
- **Date:** 2026-11-24

## Decisions

- **Assignment-based access.** `clinician_patients` is the only authority. Every patient-data table's RLS policy calls `is_assigned(patient_id)`, a `SECURITY DEFINER` function that avoids recursive policy evaluation. Unassigned patients return no rows, which the app shows as 404 (not 403) to avoid leaking that a record exists.
- **`vital_readings` is narrow** (`patient_id, type, value, unit, recorded_at, source`). Blood pressure is two rows (`bp_systolic`, `bp_diastolic`) with the same timestamp. This keeps one shape for every vital at the cost of pairing them when reading. Indexes: `(patient_id, recorded_at desc)` for month buckets, and `(patient_id, type, recorded_at desc)` for "latest of type".
- **Directory filters are denormalised.** `patients.conditions text[]` is kept in sync by a trigger on `diagnoses` (GIN index). Name and MRN search uses `pg_trgm` GIN indexes, so `ilike '%q%'` stays fast as the table grows.
- **Writes clinicians may make are narrow.** Simulated readings only (`source = 'simulated'`) and diagnosis status changes through `change_diagnosis_status()`. That function writes the row, a `diagnosis_events` history entry and an audit entry in one transaction.
- **Append-only audit log.** No update or delete policies exist, and inserts go through `log_audit()`, which checks assignment. The AI rate limit reuses it (`recent_action_count`). pgTAP tests prove each guarantee (`supabase/tests/rls.test.sql`).
- **Risk score.** The Vitalis Risk Index is computed by one TypeScript function (`features/vitals/lib/risk.ts`) shared by the seed (persisted for directory sorting) and the UI (live breakdown in the header). It's a demonstration score inspired by NEWS2 and is not validated.
- **Synthetic data only.** The seed uses Faker with a fixed seed and cohort profiles: baselines, treatment effects, seasonality, acute episodes and rare isolated spikes. It produces 50 patients × 24 months by default (`--patients=N` for scale tests). Avatars are initials: no fake faces, no image assets.
