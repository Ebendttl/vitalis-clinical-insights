-- RLS guarantees, proven in the database itself. Run with `npm run db:test`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Two patients, two clinicians (created via auth.users so the trigger runs).
insert into public.patients (id, mrn, first_name, last_name, date_of_birth, sex, phone, address_line, city, postal_code,
  emergency_contact_name, emergency_contact_relation, emergency_contact_phone, insurance_provider, insurance_member_id, insurance_plan)
values
  ('11111111-1111-4111-8111-111111111111', 'T-1', 'Ada', 'One', '1970-01-01', 'female', '1', 'a', 'c', 'p', 'e', 'r', '1', 'i', 'm', 'pl'),
  ('22222222-2222-4222-8222-222222222222', 'T-2', 'Ben', 'Two', '1980-01-01', 'male', '1', 'a', 'c', 'p', 'e', 'r', '1', 'i', 'm', 'pl');

insert into auth.users (id, email, raw_user_meta_data, is_anonymous)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.dev', '{"full_name":"Dr A"}', false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.dev', '{"full_name":"Dr B"}', false);

-- Deterministic assignments for the test (the trigger's random panel is replaced).
delete from public.clinician_patients where clinician_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.clinician_patients values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', now());

insert into public.vital_readings (patient_id, type, value, unit, recorded_at, source) values
  ('11111111-1111-4111-8111-111111111111', 'heart_rate', 70, 'bpm', now(), 'clinic'),
  ('22222222-2222-4222-8222-222222222222', 'heart_rate', 80, 'bpm', now(), 'clinic');

select is((select full_name from public.clinicians where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'Dr A', 'signup trigger creates a clinician profile');

-- Act as clinician A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);

select results_eq($$ select mrn from public.patients $$, $$ values ('T-1') $$, 'A sees only assigned patients');
select is((select count(*)::int from public.vital_readings), 1, 'A sees only assigned patients'' readings');
select is((select count(*)::int from public.clinician_patients), 1, 'A sees only own assignments');
select is((select count(*)::int from public.clinicians), 1, 'A sees only own clinician profile');

select throws_ok(
  $$ insert into public.vital_readings (patient_id, type, value, unit, recorded_at, source)
     values ('11111111-1111-4111-8111-111111111111', 'heart_rate', 75, 'bpm', now(), 'clinic') $$,
  '42501', null, 'cannot insert non-simulated readings');
select lives_ok(
  $$ insert into public.vital_readings (patient_id, type, value, unit, recorded_at, source)
     values ('11111111-1111-4111-8111-111111111111', 'heart_rate', 75, 'bpm', now(), 'simulated') $$,
  'can insert simulated readings for an assigned patient');
select throws_ok(
  $$ insert into public.vital_readings (patient_id, type, value, unit, recorded_at, source)
     values ('22222222-2222-4222-8222-222222222222', 'heart_rate', 75, 'bpm', now(), 'simulated') $$,
  '42501', null, 'cannot insert readings for an unassigned patient');

select lives_ok($$ select public.log_audit('patient.viewed', 'patient', 'x', '11111111-1111-4111-8111-111111111111') $$, 'can audit an assigned patient');
select throws_ok($$ select public.log_audit('patient.viewed', 'patient', 'x', '22222222-2222-4222-8222-222222222222') $$, '42501', null, 'cannot audit an unassigned patient');
select is((select count(*)::int from public.audit_log), 1, 'audit entry visible to its author');

update public.audit_log set action = 'tampered';
select is((select action from public.audit_log limit 1), 'patient.viewed', 'audit log cannot be updated');
delete from public.audit_log;
select is((select count(*)::int from public.audit_log), 1, 'audit log cannot be deleted');

-- Clinician B cannot see A's audit trail.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select is((select count(*)::int from public.audit_log), 0, 'B cannot read A''s audit trail');

select * from finish();
rollback;
