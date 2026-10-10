-- SEVEN Root Diagnostic System · initial schema
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to read top to bottom.
--
-- Access model
--   * Admin: everything.
--   * Teacher: students in batches assigned to them (or students they created), and everything under those students.
--   * Parents never log in in Phase 1; they open a private, expiring share link served by the server.
--   * The AI pipeline runs on the server with the service-role key, which bypasses RLS.

create extension if not exists pgcrypto;

-- ───────────────────────── people ─────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher')) default 'teacher',
  full_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class int not null check (class between 5 and 12),
  board text not null check (board in ('CBSE', 'UP')) default 'CBSE',
  academic_year int not null,               -- start year, e.g. 2026 for 2026-27
  created_at timestamptz not null default now()
);

create table public.teacher_batches (
  teacher_id uuid not null references public.profiles(user_id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  primary key (teacher_id, batch_id)
);

create sequence public.student_code_seq start 1001;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  class int not null check (class between 5 and 12),
  section text,
  board text not null check (board in ('CBSE', 'UP')) default 'CBSE',
  school text,
  roll_no text,
  batch_id uuid references public.batches(id) on delete set null,
  pronoun text not null check (pronoun in ('he', 'she', 'they')) default 'they',
  academic_year int not null,
  -- the only identity ever sent to the AI
  pseudonym text not null unique default ('S-' || nextval('public.student_code_seq')),
  guardian_name text,
  guardian_phone_enc text,                  -- AES-256-GCM, encrypted by the app
  guardian_email_enc text,
  status text not null check (status in ('active', 'deleted')) default 'active',
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.students (batch_id);

-- ───────────────────────── consent & compliance (DPDP) ─────────────────────────
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_name text not null,
  relation text not null,
  method text not null check (method in ('signed_form', 'in_person', 'email_otp')),
  notice_version text not null,
  purposes text[] not null,
  evidence_path text,                       -- storage path of the signed form
  given_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  recorded_by uuid references public.profiles(user_id) on delete set null
);
create index on public.consents (student_id);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete set null,
  student_label text not null,              -- kept after erasure, e.g. "S-1042"
  requested_by text not null,
  reason text,
  status text not null check (status in ('pending', 'done', 'rejected')) default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references public.profiles(user_id) on delete set null
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,                     -- view / edit / export / share / delete / consent / approve
  entity text not null,
  entity_id text,
  detail jsonb,
  at timestamptz not null default now()
);
create index on public.audit_log (at desc);

-- ───────────────────────── papers, cases, answers ─────────────────────────
create table public.papers (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (subject in ('maths', 'physics', 'chemistry', 'biology')) default 'maths',
  class int not null,
  board text not null default 'CBSE',
  title text not null,
  short_name text not null,
  kind text not null check (kind in ('school_exam', 'diagnostic', 'confirmation', 'final_test', 'other')),
  test_date date,
  typed_text text,                          -- question paper typed instead of uploaded
  files jsonb not null default '[]',        -- [{path, mime, name}]
  key_files jsonb not null default '[]',
  parsed jsonb,                             -- PaperOut from the AI
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject text not null default 'maths',
  status text not null default 'collecting'
    check (status in ('collecting', 'processing', 'transcript_review', 'needs_review', 'approved', 'failed')),
  difficult boolean not null default false,
  check_transcripts boolean not null default false,  -- pause for teacher to check Claude's reading
  pipeline_step text,                       -- human-readable current step
  pipeline_error text,
  lease_until timestamptz,                  -- job lock
  approved_by uuid references public.profiles(user_id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.cases (student_id);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete restrict,
  seq int not null,                         -- 1 → "P1", 2 → "P2"
  source text not null check (source in ('scan', 'marksheet')),
  files jsonb not null default '[]',
  read_json jsonb,                          -- ReadOut from the AI
  transcript_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (case_id, seq)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  q text not null,
  max_marks numeric not null,
  teacher_marks numeric,
  suggested_marks numeric,
  marks numeric generated always as (coalesce(teacher_marks, suggested_marks)) stored,
  attempted boolean not null default true,
  illegible boolean not null default false,
  student_answer text not null default '',
  working text not null default '',
  marking_note text not null default '',
  outcome text check (outcome in ('right', 'wrong', 'partial', 'blank')),
  error_types text[] not null default '{}',
  unique (attempt_id, q)
);

-- ───────────────────────── AI outputs, documents, usage ─────────────────────────
create table public.case_outputs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  step text not null check (step in ('analysis', 'tracing', 'confirmation', 'workbook', 'plan', 'diagnostic')),
  part int not null default 0,              -- workbook: weak-area index
  version int not null default 1,
  json jsonb not null,
  edited boolean not null default false,
  superseded boolean not null default false,
  model text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (case_id, step, part, version)
);
create index on public.case_outputs (case_id, step, part) where not superseded;

create table public.confirmation_results (
  case_id uuid primary key references public.cases(id) on delete cascade,
  results jsonb not null,                   -- {"A4": "wrong", "A5": "half", ...}
  entered_by uuid references public.profiles(user_id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete set null,
  step text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  duration_ms int,
  stop_reason text,
  fell_back boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);
create index on public.ai_runs (created_at desc);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  channel text not null check (channel in ('whatsapp', 'email', 'link')),
  documents text[] not null default '{parent_summary,mistakes_report}',
  expires_at timestamptz not null default now() + interval '30 days',
  first_viewed_at timestamptz,
  revoked boolean not null default false,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── libraries & settings ─────────────────────────
create table public.workbook_steps (
  id uuid primary key default gen_random_uuid(),
  subject text not null default 'maths',
  concept_id text not null,                 -- primary concept the level teaches
  title text not null,
  content jsonb not null,                   -- WorkbookStep
  status text not null check (status in ('draft', 'approved', 'retired')) default 'draft',
  source_case_id uuid references public.cases(id) on delete set null,
  approved_by uuid references public.profiles(user_id) on delete set null,
  times_used int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.workbook_steps (subject, concept_id) where status = 'approved';

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values
  ('routine_model', '"claude-sonnet-5-5"'),
  ('difficult_model', '"claude-opus-5-5"'),
  ('auto_escalate', 'true'),
  ('illegible_escalate_fraction', '0.25'),
  ('scan_retention_months', '12'),
  ('institute_address', '"Medical Road, Aligarh"'),
  ('prices', '{}'),
  ('gp_start_years', '{"6": 2024, "7": 2025, "8": 2025}');

-- ───────────────────────── access helpers ─────────────────────────
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where user_id = auth.uid() and active);
$$;

create or replace function public.can_see_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from students s
    where s.id = sid and s.status = 'active' and (
      s.created_by = auth.uid()
      or exists (select 1 from teacher_batches tb join profiles p on p.user_id = tb.teacher_id
                 where tb.teacher_id = auth.uid() and p.active and tb.batch_id = s.batch_id)
    )
  );
$$;

create or replace function public.can_see_case(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cases c where c.id = cid and public.can_see_student(c.student_id));
$$;

create or replace function public.has_consent(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from consents where student_id = sid and withdrawn_at is null);
$$;

-- ───────────────────────── row-level security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.batches enable row level security;
alter table public.teacher_batches enable row level security;
alter table public.students enable row level security;
alter table public.consents enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.audit_log enable row level security;
alter table public.papers enable row level security;
alter table public.cases enable row level security;
alter table public.attempts enable row level security;
alter table public.responses enable row level security;
alter table public.case_outputs enable row level security;
alter table public.confirmation_results enable row level security;
alter table public.ai_runs enable row level security;
alter table public.shares enable row level security;
alter table public.workbook_steps enable row level security;
alter table public.settings enable row level security;

create policy "own profile or admin" on public.profiles for select using (user_id = auth.uid() or public.is_admin());
create policy "admin manages profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "staff read batches" on public.batches for select using (public.is_staff());
create policy "admin manages batches" on public.batches for all using (public.is_admin()) with check (public.is_admin());
create policy "staff read assignments" on public.teacher_batches for select using (teacher_id = auth.uid() or public.is_admin());
create policy "admin manages assignments" on public.teacher_batches for all using (public.is_admin()) with check (public.is_admin());

create policy "see own students" on public.students for select using (public.can_see_student(id));
create policy "staff add students" on public.students for insert with check (public.is_staff() and created_by = auth.uid());
create policy "edit own students" on public.students for update using (public.can_see_student(id)) with check (public.is_staff());

create policy "consents via student" on public.consents for select using (public.can_see_student(student_id));
create policy "record consent" on public.consents for insert with check (public.can_see_student(student_id) and recorded_by = auth.uid());
create policy "withdraw consent" on public.consents for update using (public.can_see_student(student_id));

create policy "admin sees deletion requests" on public.deletion_requests for select using (public.is_admin());
create policy "staff file deletion requests" on public.deletion_requests for insert with check (public.is_staff());
create policy "admin handles deletion requests" on public.deletion_requests for update using (public.is_admin());

create policy "admin reads audit" on public.audit_log for select using (public.is_admin());

create policy "staff read papers" on public.papers for select using (public.is_staff());
create policy "staff add papers" on public.papers for insert with check (public.is_staff() and created_by = auth.uid());
create policy "staff edit papers" on public.papers for update using (public.is_staff());

create policy "cases via student" on public.cases for select using (public.can_see_student(student_id));
create policy "open case with consent" on public.cases for insert
  with check (public.can_see_student(student_id) and public.has_consent(student_id) and created_by = auth.uid());
create policy "update visible cases" on public.cases for update using (public.can_see_student(student_id));

create policy "attempts via case" on public.attempts for all using (public.can_see_case(case_id)) with check (public.can_see_case(case_id));
create policy "responses via attempt" on public.responses for all
  using (exists (select 1 from attempts a where a.id = attempt_id and public.can_see_case(a.case_id)))
  with check (exists (select 1 from attempts a where a.id = attempt_id and public.can_see_case(a.case_id)));
create policy "outputs via case" on public.case_outputs for select using (public.can_see_case(case_id));
create policy "teachers edit outputs" on public.case_outputs for insert with check (public.can_see_case(case_id) and edited);
create policy "results via case" on public.confirmation_results for all using (public.can_see_case(case_id)) with check (public.can_see_case(case_id));
create policy "admin reads usage" on public.ai_runs for select using (public.is_admin());
create policy "shares via case" on public.shares for select using (public.can_see_case(case_id));
create policy "create shares" on public.shares for insert with check (public.can_see_case(case_id) and created_by = auth.uid());
create policy "revoke shares" on public.shares for update using (public.can_see_case(case_id));

create policy "staff read library" on public.workbook_steps for select using (public.is_staff());
create policy "admin manages library" on public.workbook_steps for all using (public.is_admin()) with check (public.is_admin());
create policy "staff read settings" on public.settings for select using (public.is_staff());
create policy "admin edits settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());

-- New sign-ups get a teacher profile; the first user becomes admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (user_id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''),
          case when exists (select 1 from profiles) then 'teacher' else 'admin' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Private bucket for scans, papers and consent forms. No storage policies: only the server
-- (service role) reads or writes; browsers upload through short-lived signed upload URLs.
insert into storage.buckets (id, name, public) values ('private', 'private', false)
  on conflict (id) do nothing;
