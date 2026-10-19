-- ============================================================
-- MADRASATUS SAHABA — COMPLETE SCHEMA
-- Safe to re-run. Everything uses IF NOT EXISTS / OR REPLACE.
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists authorized_users (
  email text primary key,
  role text not null default 'admin',
  is_super boolean not null default false,
  expires_at date,
  created_at timestamptz not null default now()
);
alter table authorized_users add column if not exists is_super boolean not null default false;
alter table authorized_users add column if not exists expires_at date;

create table if not exists students (
  id uuid primary key default uuid_generate_v4(),
  reg_no text unique not null,
  name text not null,
  section text not null,
  class_name text not null,
  mode text not null default 'physical' check (mode in ('online','physical')),
  status text not null default 'active' check (status in ('active','repeating','withdrawn','transferred','graduated')),
  joined date not null default current_date,
  created_at timestamptz not null default now()
);
alter table students add column if not exists dob date;
alter table students add column if not exists gender text check (gender in ('male','female'));
alter table students add column if not exists nin text;
alter table students add column if not exists guardian_name text;
alter table students add column if not exists guardian_phone text;
alter table students add column if not exists student_phone text;
alter table students add column if not exists address text;
create unique index if not exists students_nin_unique on students (nin) where nin is not null;
create index if not exists students_class_idx on students (class_name);
create index if not exists students_section_idx on students (section);
create index if not exists students_name_idx on students (lower(name));

create table if not exists assessments (
  id uuid primary key default uuid_generate_v4(),
  class_name text not null,
  subject text not null,
  label text not null,
  max_marks int not null default 10,
  session_label text not null default '2025/2026',
  semester int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists assessments_class_subject_idx on assessments (class_name, subject);

create table if not exists marks (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  value int,
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);
create index if not exists marks_student_idx on marks (student_id);

create table if not exists exams (
  id uuid primary key default uuid_generate_v4(),
  class_name text not null,
  subject text not null,
  student_id uuid not null references students(id) on delete cascade,
  session_label text not null default '2025/2026',
  semester int not null default 1,
  value int,
  updated_at timestamptz not null default now(),
  unique (student_id, subject, session_label, semester)
);
create index if not exists exams_student_idx on exams (student_id);

create table if not exists fees (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  year text not null,
  amount int not null default 5000,
  paid int not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid','scholarship')),
  updated_at timestamptz not null default now(),
  unique (student_id, year)
);
create index if not exists fees_student_idx on fees (student_id);

create table if not exists materials (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  class_name text not null default 'all',
  subject text not null default 'general',
  note text,
  order_num int,
  kind text not null check (kind in ('file','link')),
  url text,
  storage_path text,
  file_name text,
  file_size bigint,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists materials_class_idx on materials (class_name);
create index if not exists materials_order_idx on materials (order_num);

create table if not exists enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  class_name text not null,
  session_label text not null,
  status text not null check (status in ('active','repeating','withdrawn','transferred','graduated')),
  started date not null default current_date,
  ended date,
  created_at timestamptz not null default now()
);
create index if not exists enrollments_student_idx on enrollments (student_id);
create index if not exists enrollments_session_idx on enrollments (session_label);

create table if not exists daura_programs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  start_date date,
  end_date date,
  weeks int not null default 6,
  status text not null default 'open' check (status in ('open','closed')),
  subjects text[] not null default array['Qur''an','Hadith','Fiqh','Arabic','Tajweed'],
  created_at timestamptz not null default now()
);
alter table daura_programs drop column if exists archived;

create table if not exists daura_participants (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references daura_programs(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  full_name text not null,
  external boolean not null default false,
  phone text,
  nin text,
  created_at timestamptz not null default now()
);
alter table daura_participants add column if not exists nin text;
create index if not exists daura_participants_program_idx on daura_participants (program_id);
create index if not exists daura_participants_student_idx on daura_participants (student_id);
create index if not exists daura_participants_nin_idx on daura_participants (nin) where nin is not null;

create table if not exists daura_assessments (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references daura_programs(id) on delete cascade,
  subject text not null,
  label text not null,
  max_marks int not null default 10,
  created_at timestamptz not null default now()
);
alter table daura_assessments drop column if exists week;
alter table daura_assessments drop column if exists day;
create index if not exists daura_assessments_program_idx on daura_assessments (program_id);

create table if not exists daura_marks (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references daura_assessments(id) on delete cascade,
  participant_id uuid not null references daura_participants(id) on delete cascade,
  value int,
  updated_at timestamptz not null default now(),
  unique (assessment_id, participant_id)
);

alter table authorized_users enable row level security;
alter table students enable row level security;
alter table assessments enable row level security;
alter table marks enable row level security;
alter table exams enable row level security;
alter table fees enable row level security;
alter table materials enable row level security;
alter table enrollments enable row level security;
alter table daura_programs enable row level security;
alter table daura_participants enable row level security;
alter table daura_assessments enable row level security;
alter table daura_marks enable row level security;

create or replace function is_authorized()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from authorized_users
    where email = (auth.jwt() ->> 'email')
      and (expires_at is null or expires_at >= current_date)
  );
$$;

create or replace function is_super_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from authorized_users
    where email = (auth.jwt() ->> 'email')
      and is_super = true
      and (expires_at is null or expires_at >= current_date)
  );
$$;

drop policy if exists "authorized read allowlist" on authorized_users;
create policy "authorized read allowlist" on authorized_users
  for select using (is_super_admin() or email = (auth.jwt() ->> 'email'));
drop policy if exists "super insert allowlist" on authorized_users;
create policy "super insert allowlist" on authorized_users
  for insert with check (is_super_admin());
drop policy if exists "super update allowlist" on authorized_users;
create policy "super update allowlist" on authorized_users
  for update using (is_super_admin());
drop policy if exists "super delete allowlist" on authorized_users;
create policy "super delete allowlist" on authorized_users
  for delete using (is_super_admin() and email <> (auth.jwt() ->> 'email'));

drop policy if exists "authorized all students" on students;
create policy "authorized all students" on students for all using (is_authorized()) with check (is_authorized());

drop policy if exists "authorized all assessments" on assessments;
create policy "authorized all assessments" on assessments for all using (is_authorized()) with check (is_authorized());

drop policy if exists "authorized all marks" on marks;
create policy "authorized all marks" on marks for all using (is_authorized()) with check (is_authorized());

drop policy if exists "authorized all exams" on exams;
create policy "authorized all exams" on exams for all using (is_authorized()) with check (is_authorized());

drop policy if exists "authorized all fees" on fees;
create policy "authorized all fees" on fees for all using (is_authorized()) with check (is_authorized());

drop policy if exists "authorized all enrollments" on enrollments;
create policy "authorized all enrollments" on enrollments for all using (is_authorized()) with check (is_authorized());

drop policy if exists "public read published materials" on materials;
create policy "public read published materials" on materials
  for select using (published = true or is_authorized());
drop policy if exists "authorized write materials" on materials;
create policy "authorized write materials" on materials for insert with check (is_authorized());
drop policy if exists "authorized update materials" on materials;
create policy "authorized update materials" on materials for update using (is_authorized());
drop policy if exists "authorized delete materials" on materials;
create policy "authorized delete materials" on materials for delete using (is_authorized());

drop policy if exists "authorized all daura_programs" on daura_programs;
create policy "authorized all daura_programs" on daura_programs for all using (is_authorized()) with check (is_authorized());
drop policy if exists "authorized all daura_participants" on daura_participants;
create policy "authorized all daura_participants" on daura_participants for all using (is_authorized()) with check (is_authorized());
drop policy if exists "authorized all daura_assessments" on daura_assessments;
create policy "authorized all daura_assessments" on daura_assessments for all using (is_authorized()) with check (is_authorized());
drop policy if exists "authorized all daura_marks" on daura_marks;
create policy "authorized all daura_marks" on daura_marks for all using (is_authorized()) with check (is_authorized());

insert into authorized_users (email, role, is_super)
values ('bayeroisa2003@gmail.com', 'super_admin', true)
on conflict (email) do update set is_super = true, role = 'super_admin';

insert into authorized_users (email, role, is_super)
values ('abihaniisa@gmail.com', 'admin', false)
on conflict (email) do nothing;

insert into students (reg_no, name, section, class_name, mode, joined)
values ('2026-MS-0001', 'Abihani Isa', 'secondary', 'Thanawiyyah 1', 'online', current_date)
on conflict (reg_no) do nothing;

-- ============================================================
-- STUDENT PORTAL RPC
-- ============================================================
create or replace function student_portal(p_nin text, p_reg_no text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student students;
  v_result json;
begin
  select * into v_student
  from students
  where nin = p_nin and reg_no = p_reg_no and status = 'active'
  limit 1;

  if v_student.id is null then
    return json_build_object('ok', false, 'error', 'No matching student.');
  end if;

  select json_build_object(
    'ok', true,
    'student', row_to_json(v_student),
    'marks', coalesce((select json_agg(m.*) from marks m where m.student_id = v_student.id), '[]'::json),
    'exams', coalesce((select json_agg(e.*) from exams e where e.student_id = v_student.id), '[]'::json),
    'assessments', coalesce((select json_agg(a.*) from assessments a where a.class_name = v_student.class_name), '[]'::json),
    'fees', coalesce((select json_agg(f.*) from fees f where f.student_id = v_student.id), '[]'::json),
    'fee_payments', coalesce((select json_agg(fp.*) from fee_payments fp where fp.student_id = v_student.id), '[]'::json),
    'daura_participations', coalesce((select json_agg(dp.*) from daura_participants dp where dp.student_id = v_student.id), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function student_portal(text, text) to anon;
