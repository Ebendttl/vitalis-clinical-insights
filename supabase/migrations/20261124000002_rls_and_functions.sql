-- Row Level Security, helper functions, triggers, storage and realtime.

-- ---------------------------------------------------------------------------
-- Assignment check. SECURITY DEFINER so policies on other tables can call it
-- without recursing through clinician_patients' own RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_assigned(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clinician_patients cp
    where cp.clinician_id = (select auth.uid()) and cp.patient_id = p_patient_id
  );
$$;

alter table public.clinicians enable row level security;
alter table public.patients enable row level security;
alter table public.clinician_patients enable row level security;
alter table public.vital_readings enable row level security;
alter table public.diagnoses enable row level security;
alter table public.diagnosis_events enable row level security;
alter table public.lab_reports enable row level security;
alter table public.audit_log enable row level security;

create policy "clinicians read self" on public.clinicians
  for select to authenticated using (id = (select auth.uid()));
create policy "clinicians update self" on public.clinicians
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "assignments read own" on public.clinician_patients
  for select to authenticated using (clinician_id = (select auth.uid()));

create policy "patients read assigned" on public.patients
  for select to authenticated using (public.is_assigned(id));

create policy "vitals read assigned" on public.vital_readings
  for select to authenticated using (public.is_assigned(patient_id));
-- Clinicians may only write simulated readings (live demo mode).
create policy "vitals insert simulated" on public.vital_readings
  for insert to authenticated
  with check (source = 'simulated' and public.is_assigned(patient_id));

create policy "diagnoses read assigned" on public.diagnoses
  for select to authenticated using (public.is_assigned(patient_id));
create policy "diagnoses update assigned" on public.diagnoses
  for update to authenticated
  using (public.is_assigned(patient_id)) with check (public.is_assigned(patient_id));

create policy "diagnosis events read assigned" on public.diagnosis_events
  for select to authenticated using (public.is_assigned(patient_id));
create policy "diagnosis events insert own" on public.diagnosis_events
  for insert to authenticated
  with check (public.is_assigned(patient_id) and actor_id = (select auth.uid()));

create policy "labs read assigned" on public.lab_reports
  for select to authenticated using (public.is_assigned(patient_id));

-- Audit log is append-only and written through log_audit(); clinicians may read their own trail.
create policy "audit read own" on public.audit_log
  for select to authenticated using (actor_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
create or replace function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_patient_id uuid default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_patient_id is not null and not public.is_assigned(p_patient_id) then
    raise exception 'patient not assigned' using errcode = '42501';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, patient_id, metadata)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, p_patient_id, coalesce(p_metadata, '{}'));
end;
$$;

-- Counts recent actions for rate limiting (e.g. AI summaries) without exposing the table.
create or replace function public.recent_action_count(p_action text, p_window interval)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.audit_log
  where actor_id = (select auth.uid()) and action = p_action and created_at > now() - p_window;
$$;

-- ---------------------------------------------------------------------------
-- Diagnosis status change: one transaction for row + history + audit.
-- SECURITY INVOKER so the RLS policies above still apply.
-- ---------------------------------------------------------------------------
create or replace function public.change_diagnosis_status(
  p_diagnosis_id uuid,
  p_status public.diagnosis_status,
  p_note text default null
)
returns public.diagnoses
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old public.diagnoses;
  v_new public.diagnoses;
begin
  select * into v_old from public.diagnoses where id = p_diagnosis_id for update;
  if not found then
    raise exception 'diagnosis not found' using errcode = 'P0002';
  end if;
  if v_old.status = p_status then
    return v_old;
  end if;

  update public.diagnoses
  set status = p_status,
      resolved_date = case when p_status = 'resolved' then current_date else null end,
      updated_at = now()
  where id = p_diagnosis_id
  returning * into v_new;

  insert into public.diagnosis_events (diagnosis_id, patient_id, event_type, from_status, to_status, note, actor_id)
  values (p_diagnosis_id, v_old.patient_id, 'status_changed', v_old.status, p_status, p_note, (select auth.uid()));

  perform public.log_audit(
    'diagnosis.status_changed', 'diagnosis', p_diagnosis_id::text, v_old.patient_id,
    jsonb_build_object('from', v_old.status, 'to', p_status)
  );
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Keep patients.conditions in sync with unresolved diagnoses.
-- ---------------------------------------------------------------------------
create or replace function public.sync_patient_conditions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient uuid := coalesce(new.patient_id, old.patient_id);
begin
  update public.patients p
  set conditions = coalesce((
    select array_agg(distinct d.name order by d.name)
    from public.diagnoses d
    where d.patient_id = v_patient and d.status <> 'resolved'
  ), '{}')
  where p.id = v_patient;
  return null;
end;
$$;

create trigger diagnoses_sync_conditions
after insert or update of status, name or delete on public.diagnoses
for each row execute function public.sync_patient_conditions();

-- ---------------------------------------------------------------------------
-- New auth user -> clinician profile + a starter panel of patients.
-- Every sign-up (including anonymous "guest" sessions) gets 30 patients so the
-- demo is never empty, while RLS still proves clinicians are isolated.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.clinicians (id, full_name, email, is_guest)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             case when new.is_anonymous then 'Guest Clinician' else split_part(coalesce(new.email, 'clinician'), '@', 1) end),
    new.email,
    coalesce(new.is_anonymous, false)
  );

  insert into public.clinician_patients (clinician_id, patient_id)
  select new.id, p.id from public.patients p
  order by md5(p.id::text || new.id::text)
  limit 30;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects keyed by patient id folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lab-reports', 'lab-reports', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "lab pdfs read assigned" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lab-reports'
    and public.is_assigned(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Realtime: stream new readings (RLS is enforced on postgres_changes).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.vital_readings;
