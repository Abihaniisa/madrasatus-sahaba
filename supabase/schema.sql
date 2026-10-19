-- MADRASATUS SAHABA — SCHEMA (current, verified in production)
-- Full reset: paste this whole file into Supabase SQL Editor.
-- Canonical reg_no: YYYY/MS/NNN. Role lives in authorized_users only.

drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

create extension if not exists "uuid-ossp";

create table authorized_users (
  email text primary key,
  role text not null check (role in ('super_admin', 'admin')),
  expires_at date,
  created_at timestamptz not null default now()
);

create table students (
  id uuid primary key default uuid_generate_v4(),
  reg_no text unique not null,
  name text not null,
  section text not null,
  class_name text not null,
  mode text not null default 'physical' check (mode in ('online','physical')),
  status text not null default 'active' check (status in ('active','repeating','withdrawn','transferred','graduated')),
  joined date not null default current_date,
  dob date,
  gender text check (gender in ('male','female')),
  nin text,
  guardian_name text,
  guardian_phone text,
  student_phone text,
  address text,
  reg_no_norm text generated always as (upper(regexp_replace(reg_no, '[^A-Za-z0-9]', '', 'g'))) stored,
  created_at timestamptz not null default now()
);
create unique index students_nin_unique on students (nin) where nin is not null;
create index students_class_idx on students (class_name);
create index students_section_idx on students (section);
create index students_name_idx on students (lower(name));
create index students_reg_no_norm_idx on students (reg_no_norm);

create table assessments (
  id uuid primary key default uuid_generate_v4(),
  class_name text not null, subject text not null, label text not null,
  max_marks int not null default 10,
  session_label text not null default '2025/2026',
  semester int not null default 1,
  created_at timestamptz not null default now()
);
create index assessments_class_subject_idx on assessments (class_name, subject);

create table marks (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  value int, updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);
create index marks_student_idx on marks (student_id);

create table exams (
  id uuid primary key default uuid_generate_v4(),
  class_name text not null, subject text not null,
  student_id uuid not null references students(id) on delete cascade,
  session_label text not null default '2025/2026',
  semester int not null default 1,
  value int, updated_at timestamptz not null default now(),
  unique (student_id, subject, session_label, semester)
);
create index exams_student_idx on exams (student_id);

create table fees (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  year text not null, amount int not null default 5000, paid int not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid','scholarship')),
  updated_at timestamptz not null default now(),
  unique (student_id, year)
);
create index fees_student_idx on fees (student_id);

create table fee_payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  year text not null, amount int not null check (amount > 0),
  method text not null check (method in ('cash','transfer','pos','other')),
  reference text, note text,
  paid_on date not null default current_date,
  recorded_by text, created_at timestamptz not null default now()
);
create index fee_payments_student_idx on fee_payments (student_id, year);

create table materials (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  class_name text not null default 'all',
  subject text not null default 'general',
  note text, order_num int,
  kind text not null check (kind in ('file','link')),
  url text, storage_path text, file_name text, file_size bigint,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index materials_class_idx on materials (class_name);
create index materials_order_idx on materials (order_num);

create table enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  class_name text not null, session_label text not null,
  status text not null check (status in ('active','repeating','withdrawn','transferred','graduated')),
  started date not null default current_date, ended date,
  created_at timestamptz not null default now()
);
create index enrollments_student_idx on enrollments (student_id);
create index enrollments_session_idx on enrollments (session_label);

create table curriculum (
  id uuid primary key default uuid_generate_v4(),
  class_name text not null, semester int not null, week_num int not null,
  subject text not null, content text,
  created_at timestamptz not null default now(),
  unique (class_name, semester, week_num, subject)
);
create index curriculum_lookup_idx on curriculum (class_name, semester, week_num);

create table daura_programs (
  id uuid primary key default uuid_generate_v4(),
  name text not null, description text, start_date date, end_date date,
  weeks int not null default 6,
  status text not null default 'open' check (status in ('open','closed')),
  subjects text[] not null default array['Qur''an','Hadith','Fiqh','Arabic','Tajweed'],
  created_at timestamptz not null default now()
);

create table daura_participants (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references daura_programs(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  full_name text not null, external boolean not null default false,
  phone text, nin text, created_at timestamptz not null default now()
);
create index daura_participants_program_idx on daura_participants (program_id);
create index daura_participants_student_idx on daura_participants (student_id);

create table daura_assessments (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references daura_programs(id) on delete cascade,
  subject text not null, label text not null,
  max_marks int not null default 10, week int, day int,
  created_at timestamptz not null default now()
);
create index daura_assessments_program_idx on daura_assessments (program_id);

create table daura_marks (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references daura_assessments(id) on delete cascade,
  participant_id uuid not null references daura_participants(id) on delete cascade,
  value int, updated_at timestamptz not null default now(),
  unique (assessment_id, participant_id)
);

create or replace function assign_reg_no() returns trigger language plpgsql as $$
declare v_year text; v_next int; v_prefix text := 'MS';
begin
  v_year := to_char(coalesce(new.joined, current_date), 'YYYY');
  perform pg_advisory_xact_lock(hashtext('students_reg_no_' || v_year));
  select coalesce(max((regexp_match(reg_no, '^' || v_year || '/[A-Z]+/([0-9]+)$'))[1]::int), 0) + 1
    into v_next from students where reg_no ~ ('^' || v_year || '/[A-Z]+/[0-9]+$');
  new.reg_no := v_year || '/' || v_prefix || '/' || lpad(v_next::text, 3, '0');
  return new;
end;
$$;
create trigger students_assign_reg_no before insert on students
  for each row execute function assign_reg_no();

create or replace function prevent_nin_change() returns trigger language plpgsql as $$
begin
  if old.nin is not null and new.nin is distinct from old.nin then
    raise exception 'NIN is permanent and cannot be changed';
  end if;
  return new;
end;
$$;
create trigger students_prevent_nin_change before update on students
  for each row execute function prevent_nin_change();

alter table authorized_users enable row level security;
alter table students enable row level security;
alter table assessments enable row level security;
alter table marks enable row level security;
alter table exams enable row level security;
alter table fees enable row level security;
alter table fee_payments enable row level security;
alter table materials enable row level security;
alter table enrollments enable row level security;
alter table curriculum enable row level security;
alter table daura_programs enable row level security;
alter table daura_participants enable row level security;
alter table daura_assessments enable row level security;
alter table daura_marks enable row level security;

create or replace function is_authorized() returns boolean language sql security definer stable as $$
  select exists (select 1 from authorized_users where email = (auth.jwt() ->> 'email')
    and (expires_at is null or expires_at >= current_date));
$$;
create or replace function is_super_admin() returns boolean language sql security definer stable as $$
  select exists (select 1 from authorized_users where email = (auth.jwt() ->> 'email')
    and role = 'super_admin' and (expires_at is null or expires_at >= current_date));
$$;

create policy "read self" on authorized_users for select using (email = (auth.jwt() ->> 'email'));
create policy "super read all" on authorized_users for select using (is_super_admin());
create policy "super insert" on authorized_users for insert with check (is_super_admin());
create policy "super update" on authorized_users for update
  using (is_super_admin() and (role <> 'super_admin' or email = (auth.jwt() ->> 'email')))
  with check (is_super_admin());
create policy "super delete non-super" on authorized_users for delete
  using (is_super_admin() and email <> (auth.jwt() ->> 'email') and role <> 'super_admin');

create policy "authorized read students" on students for select using (is_authorized());
create policy "authorized update students" on students for update using (is_authorized()) with check (is_authorized());
create policy "super insert students" on students for insert with check (is_super_admin());
create policy "super delete students" on students for delete using (is_super_admin());

create policy "authorized read assessments" on assessments for select using (is_authorized());
create policy "super insert assessments" on assessments for insert with check (is_super_admin());
create policy "super update assessments" on assessments for update using (is_super_admin()) with check (is_super_admin());
create policy "super delete assessments" on assessments for delete using (is_super_admin());

create policy "authorized all marks" on marks for all using (is_authorized()) with check (is_authorized());
create policy "authorized all exams" on exams for all using (is_authorized()) with check (is_authorized());

create policy "authorized read fees" on fees for select using (is_authorized());
create policy "super insert fees" on fees for insert with check (is_super_admin());
create policy "super update fees" on fees for update using (is_super_admin()) with check (is_super_admin());
create policy "super delete fees" on fees for delete using (is_super_admin());

create policy "authorized read fee_payments" on fee_payments for select using (is_authorized());
create policy "super insert fee_payments" on fee_payments for insert with check (is_super_admin());
create policy "super update fee_payments" on fee_payments for update using (is_super_admin()) with check (is_super_admin());
create policy "super delete fee_payments" on fee_payments for delete using (is_super_admin());

create policy "public read published materials" on materials for select using (published = true or is_authorized());
create policy "super insert materials" on materials for insert with check (is_super_admin());
create policy "super update materials" on materials for update using (is_super_admin()) with check (is_super_admin());
create policy "super delete materials" on materials for delete using (is_super_admin());

create policy "authorized read enrollments" on enrollments for select using (is_authorized());
create policy "super insert enrollments" on enrollments for insert with check (is_super_admin());
create policy "super update enrollments" on enrollments for update using (is_super_admin()) with check (is_super_admin());
create policy "super delete enrollments" on enrollments for delete using (is_super_admin());

create policy "public read curriculum" on curriculum for select using (true);
create policy "super insert curriculum" on curriculum for insert with check (is_super_admin());
create policy "super update curriculum" on curriculum for update using (is_super_admin()) with check (is_super_admin());
create policy "super delete curriculum" on curriculum for delete using (is_super_admin());

create policy "authorized read daura_programs" on daura_programs for select using (is_authorized());
create policy "super insert daura_programs" on daura_programs for insert with check (is_super_admin());
create policy "super update daura_programs" on daura_programs for update using (is_super_admin()) with check (is_super_admin());
create policy "super delete daura_programs" on daura_programs for delete using (is_super_admin());

create policy "authorized read daura_participants" on daura_participants for select using (is_authorized());
create policy "super insert daura_participants" on daura_participants for insert with check (is_super_admin());
create policy "super update daura_participants" on daura_participants for update using (is_super_admin()) with check (is_super_admin());
create policy "super delete daura_participants" on daura_participants for delete using (is_super_admin());

create policy "authorized read daura_assessments" on daura_assessments for select using (is_authorized());
create policy "super insert daura_assessments" on daura_assessments for insert with check (is_super_admin());
create policy "super update daura_assessments" on daura_assessments for update using (is_super_admin()) with check (is_super_admin());
create policy "super delete daura_assessments" on daura_assessments for delete using (is_super_admin());

create policy "authorized all daura_marks" on daura_marks for all using (is_authorized()) with check (is_authorized());

create or replace function student_portal(p_nin text, p_reg_no text)
returns json language plpgsql security definer set search_path = public as $$
declare v_student students; v_norm text;
begin
  v_norm := upper(regexp_replace(coalesce(p_reg_no, ''), '[^A-Za-z0-9]', '', 'g'));
  select * into v_student from students
    where nin = p_nin and reg_no_norm = v_norm and status = 'active' limit 1;
  if v_student.id is null then
    return json_build_object('ok', false, 'error', 'No matching student.');
  end if;
  return json_build_object(
    'ok', true,
    'student', row_to_json(v_student),
    'marks', coalesce((select json_agg(m.*) from marks m where m.student_id = v_student.id), '[]'::json),
    'exams', coalesce((select json_agg(e.*) from exams e where e.student_id = v_student.id), '[]'::json),
    'assessments', coalesce((select json_agg(a.*) from assessments a where a.class_name = v_student.class_name), '[]'::json),
    'fees', coalesce((select json_agg(f.*) from fees f where f.student_id = v_student.id), '[]'::json),
    'fee_payments', coalesce((select json_agg(fp.*) from fee_payments fp where fp.student_id = v_student.id), '[]'::json),
    'daura_participations', coalesce((select json_agg(dp.*) from daura_participants dp where dp.student_id = v_student.id), '[]'::json),
    'classmates', coalesce((
      select json_agg(json_build_object('name', c.name, 'class_name', c.class_name,
        'section', c.section, 'gender', c.gender) order by c.name)
      from students c where c.class_name = v_student.class_name and c.status = 'active'
    ), '[]'::json)
  );
end;
$$;
grant execute on function student_portal(text, text) to anon;

insert into authorized_users (email, role) values
  ('bayeroisa2003@gmail.com', 'super_admin'),
  ('abihaniisa@gmail.com',    'admin')
on conflict (email) do update set role = excluded.role;
