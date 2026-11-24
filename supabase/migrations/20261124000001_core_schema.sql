-- Vitalis core schema.
-- Every table holding patient data is protected by RLS keyed on clinician_patients;
-- the service role (seed script) bypasses RLS, the browser never holds it.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.vital_type as enum (
  'bp_systolic', 'bp_diastolic', 'heart_rate', 'respiratory_rate', 'temperature', 'spo2'
);
create type public.reading_source as enum ('clinic', 'home_device', 'simulated');
create type public.sex as enum ('female', 'male');
create type public.risk_level as enum ('low', 'moderate', 'elevated', 'critical');
create type public.diagnosis_status as enum ('active', 'under_observation', 'resolved');
create type public.diagnosis_event_type as enum ('diagnosed', 'status_changed', 'note');
create type public.lab_status as enum ('pending', 'final', 'amended');
create type public.lab_flag as enum ('normal', 'abnormal', 'critical');

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.clinicians (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  specialty text not null default 'General Medicine',
  is_guest boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  mrn text not null unique,
  first_name text not null,
  last_name text not null,
  full_name text generated always as (first_name || ' ' || last_name) stored,
  date_of_birth date not null,
  sex public.sex not null,
  phone text not null,
  email text,
  address_line text not null,
  city text not null,
  postal_code text not null,
  emergency_contact_name text not null,
  emergency_contact_relation text not null,
  emergency_contact_phone text not null,
  insurance_provider text not null,
  insurance_member_id text not null,
  insurance_plan text not null,
  blood_type text,
  -- Denormalised for directory filtering; maintained by trigger from diagnoses.
  conditions text[] not null default '{}',
  -- Persisted output of the TS risk model (src/features/vitals/lib/risk.ts).
  risk_score smallint not null default 0 check (risk_score between 0 and 20),
  risk_level public.risk_level not null default 'low',
  last_reading_at timestamptz,
  created_at timestamptz not null default now()
);

create index patients_full_name_trgm on public.patients using gin (full_name extensions.gin_trgm_ops);
create index patients_mrn_trgm on public.patients using gin (mrn extensions.gin_trgm_ops);
create index patients_conditions_gin on public.patients using gin (conditions);
create index patients_risk on public.patients (risk_level, risk_score desc);

create table public.clinician_patients (
  clinician_id uuid not null references public.clinicians (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (clinician_id, patient_id)
);
create index clinician_patients_patient on public.clinician_patients (patient_id);

-- ---------------------------------------------------------------------------
-- Clinical data
-- ---------------------------------------------------------------------------
create table public.vital_readings (
  id bigint generated always as identity primary key,
  patient_id uuid not null references public.patients (id) on delete cascade,
  type public.vital_type not null,
  value numeric(6, 2) not null,
  unit text not null,
  recorded_at timestamptz not null,
  source public.reading_source not null default 'clinic'
);
-- Range scans for a whole month across all types (chart buckets)...
create index vital_readings_patient_time on public.vital_readings (patient_id, recorded_at desc);
-- ...and "latest reading of type X" lookups.
create index vital_readings_patient_type_time on public.vital_readings (patient_id, type, recorded_at desc);

create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  code text not null,
  name text not null,
  description text not null,
  status public.diagnosis_status not null,
  onset_date date not null,
  resolved_date date,
  updated_at timestamptz not null default now(),
  constraint resolved_date_matches_status check (
    (status = 'resolved') = (resolved_date is not null)
  ),
  constraint resolved_after_onset check (resolved_date is null or resolved_date >= onset_date)
);
create index diagnoses_patient on public.diagnoses (patient_id, status);

create table public.diagnosis_events (
  id bigint generated always as identity primary key,
  diagnosis_id uuid not null references public.diagnoses (id) on delete cascade,
  -- Denormalised so RLS can check assignment without a join.
  patient_id uuid not null references public.patients (id) on delete cascade,
  event_type public.diagnosis_event_type not null,
  from_status public.diagnosis_status,
  to_status public.diagnosis_status,
  note text,
  actor_id uuid references public.clinicians (id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index diagnosis_events_diagnosis on public.diagnosis_events (diagnosis_id, occurred_at desc);

create table public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  type text not null,
  status public.lab_status not null,
  flag public.lab_flag not null default 'normal',
  collected_at timestamptz not null,
  reported_at timestamptz,
  -- Object path inside the private `lab-reports` bucket: {patient_id}/{id}.pdf
  file_path text,
  results jsonb not null default '[]'
);
create index lab_reports_patient on public.lab_reports (patient_id, collected_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.clinicians (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  patient_id uuid references public.patients (id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_actor_time on public.audit_log (actor_id, created_at desc);
create index audit_log_patient_time on public.audit_log (patient_id, created_at desc);
create index audit_log_actor_action_time on public.audit_log (actor_id, action, created_at desc);
