-- Two teachers, two batches. Teacher 1 must see only batch 1 students; cases need consent.
\set ON_ERROR_STOP on
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"full_name":"Owner"}'),
  ('00000000-0000-0000-0000-000000000001', '{"full_name":"T One"}'),
  ('00000000-0000-0000-0000-000000000002', '{"full_name":"T Two"}');
select user_id, role from public.profiles order by full_name;
insert into public.batches (id, name, class, academic_year) values
  ('10000000-0000-0000-0000-000000000001', 'X-A', 10, 2026), ('10000000-0000-0000-0000-000000000002', 'X-B', 10, 2026);
insert into public.teacher_batches values ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
                                          ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002');
insert into public.students (id, full_name, class, batch_id, academic_year) values
  ('20000000-0000-0000-0000-000000000001', 'Kid One', 10, '10000000-0000-0000-0000-000000000001', 2026),
  ('20000000-0000-0000-0000-000000000002', 'Kid Two', 10, '10000000-0000-0000-0000-000000000002', 2026);
grant select, insert, update on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select 'teacher1 sees' as t, full_name, pseudonym from public.students;
-- case without consent must fail
do $$ begin
  insert into public.cases (student_id, created_by) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
  raise exception 'case without consent was allowed';
exception when insufficient_privilege then raise notice 'ok: case blocked without consent';
end $$;
insert into public.consents (student_id, guardian_name, relation, method, notice_version, purposes, recorded_by)
  values ('20000000-0000-0000-0000-000000000001', 'Parent', 'father', 'signed_form', 'v1', '{diagnosis}', '00000000-0000-0000-0000-000000000001');
insert into public.cases (student_id, created_by) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
-- teacher 1 cannot reach teacher 2's student
do $$ begin
  insert into public.consents (student_id, guardian_name, relation, method, notice_version, purposes, recorded_by)
    values ('20000000-0000-0000-0000-000000000002', 'X', 'mother', 'signed_form', 'v1', '{diagnosis}', '00000000-0000-0000-0000-000000000001');
  raise exception 'cross-batch consent was allowed';
exception when insufficient_privilege then raise notice 'ok: cross-batch blocked';
end $$;
select 'teacher1 usage rows' as t, count(*) from public.ai_runs;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select 'teacher2 sees' as t, full_name from public.students;
select 'teacher2 cases' as t, count(*) from public.cases;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'admin sees' as t, count(*) from public.students;
reset role;
