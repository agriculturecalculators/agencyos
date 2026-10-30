-- AgencyOS database schema. Run once in Supabase > SQL Editor.
-- Safe to re-run on an empty project. Does not contain any keys or passwords.

create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin
  create type user_role as enum ('admin','manager','team_leader','employee');
  create type client_status as enum ('active','pending','paused','inactive');
  create type project_status as enum ('pending','active','on_hold','completed');
  create type task_status as enum ('todo','in_progress','review','done');
  create type task_priority as enum ('low','medium','high','urgent');
  create type report_status as enum ('submitted','approved','rejected');
  create type tender_status as enum ('new','preparing','submitted','won','lost');
  create type invoice_status as enum ('pending','paid','overdue');
exception when duplicate_object then null; end $$;

-- ---------- tables ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text unique,
  email text,
  role user_role not null default 'employee',
  department text,
  job_title text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  service_package text,
  status client_status not null default 'active',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  name text not null,
  description text,
  status project_status not null default 'pending',
  progress int not null default 0 check (progress between 0 and 100),
  budget numeric(14,2) not null default 0,
  start_date date,
  deadline date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (project_id, user_id)
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  parent_id uuid references tasks(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  minutes int not null check (minutes > 0),
  note text,
  logged_on date not null default current_date
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  tender_id uuid,
  task_id uuid references tasks(id) on delete cascade,
  name text not null,
  path text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  report_date date not null default current_date,
  summary text,
  completed text,
  pending text,
  hours numeric(4,1) not null default 0,
  links text,
  challenges text,
  status report_status not null default 'submitted',
  reviewed_by uuid references profiles(id),
  review_note text,
  created_at timestamptz not null default now(),
  unique (user_id, report_date)
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  day date not null default current_date,
  status text not null default 'present' check (status in ('present','absent','late','leave')),
  unique (user_id, day)
);

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists tenders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text,
  estimated_budget numeric(14,2) not null default 0,
  requirements text,
  submission_deadline date,
  status tender_status not null default 'new',
  assigned_to uuid references profiles(id) on delete set null,
  converted_project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  number text not null,
  issue_date date not null default current_date,
  due_date date,
  total numeric(14,2) not null default 0,
  status invoice_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  amount numeric(14,2) not null,
  paid_on date not null default current_date,
  method text
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  amount numeric(14,2) not null,
  spent_on date not null default current_date,
  project_id uuid references projects(id) on delete set null
);

create table if not exists salaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  month date not null,
  amount numeric(14,2) not null,
  paid boolean not null default false
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role user_role not null default 'employee',
  invited_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_assignee on tasks(assignee_id);
create index if not exists idx_projects_client on projects(client_id);
create index if not exists idx_invoices_client on invoices(client_id);

-- ---------- helper functions ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role::text from profiles where id = auth.uid() and active $$;

create or replace function public.is_manager_up() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() in ('admin','manager'), false) $$;

create or replace function public.is_lead_up() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() in ('admin','manager','team_leader'), false) $$;

create or replace function public.can_see_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_manager_up() or exists (
     select 1 from project_members where project_id = pid and user_id = auth.uid()) $$;

create or replace function public.can_see_client(cid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_manager_up() or exists (
     select 1 from projects p join project_members m on m.project_id = p.id
     where p.client_id = cid and m.user_id = auth.uid()) $$;

-- Login with a username: returns the email for that username so the app can sign in.
create or replace function public.login_email(p_username text) returns text
language sql stable security definer set search_path = public as
$$ select email from profiles where lower(username) = lower(trim(p_username)) and active limit 1 $$;
grant execute on function public.login_email(text) to anon, authenticated;

-- ---------- new user trigger ----------
-- The very first account becomes the Admin. Later accounts must be on the invitations list.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_user boolean;
  inv invitations%rowtype;
  uname text;
begin
  select not exists (select 1 from profiles) into first_user;
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  if first_user then
    insert into profiles (id, full_name, username, email, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', uname), uname, new.email, 'admin');
    return new;
  end if;
  select * into inv from invitations where lower(email) = lower(new.email);
  if not found then
    raise exception 'This email has not been invited.';
  end if;
  insert into profiles (id, full_name, username, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', uname), uname, new.email, inv.role);
  delete from invitations where id = inv.id;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- row level security ----------
alter table profiles enable row level security;
alter table clients enable row level security;
alter table client_notes enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table milestones enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table time_entries enable row level security;
alter table documents enable row level security;
alter table daily_reports enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table tenders enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table salaries enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;
alter table invitations enable row level security;

-- profiles: everyone signed in can see the team; you edit yourself; admin edits anyone
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy profiles_admin_all on profiles for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- invitations: admin and manager only
create policy invitations_rw on invitations for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- clients
create policy clients_read on clients for select to authenticated using (public.can_see_client(id));
create policy clients_write on clients for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());
create policy client_notes_read on client_notes for select to authenticated using (public.can_see_client(client_id));
create policy client_notes_insert on client_notes for insert to authenticated
  with check (public.can_see_client(client_id) and author_id = auth.uid());
create policy client_notes_admin on client_notes for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- projects
create policy projects_read on projects for select to authenticated using (public.can_see_project(id));
create policy projects_write on projects for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());
create policy project_members_read on project_members for select to authenticated
  using (user_id = auth.uid() or public.is_manager_up());
create policy project_members_write on project_members for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());
create policy milestones_read on milestones for select to authenticated using (public.can_see_project(project_id));
create policy milestones_write on milestones for all to authenticated
  using (public.is_lead_up() and public.can_see_project(project_id))
  with check (public.is_lead_up() and public.can_see_project(project_id));

-- tasks: see tasks in your projects or assigned to you; leads and managers manage; assignee can update
create policy tasks_read on tasks for select to authenticated
  using (assignee_id = auth.uid() or (project_id is not null and public.can_see_project(project_id)) or public.is_manager_up());
create policy tasks_insert on tasks for insert to authenticated
  with check (public.is_lead_up() or assignee_id = auth.uid());
create policy tasks_update on tasks for update to authenticated
  using (public.is_lead_up() or assignee_id = auth.uid())
  with check (public.is_lead_up() or assignee_id = auth.uid());
create policy tasks_delete on tasks for delete to authenticated using (public.is_lead_up());
create policy task_comments_read on task_comments for select to authenticated
  using (exists (select 1 from tasks t where t.id = task_id));
create policy task_comments_insert on task_comments for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from tasks t where t.id = task_id));
create policy time_entries_read on time_entries for select to authenticated
  using (user_id = auth.uid() or public.is_lead_up());
create policy time_entries_write on time_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- documents
create policy documents_read on documents for select to authenticated
  using ((project_id is not null and public.can_see_project(project_id))
      or (client_id is not null and public.can_see_client(client_id))
      or (task_id is not null and exists (select 1 from tasks t where t.id = task_id))
      or public.is_manager_up());
create policy documents_insert on documents for insert to authenticated with check (uploaded_by = auth.uid());
create policy documents_delete on documents for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_lead_up());

-- daily reports: your own; leads and managers review
create policy reports_read on daily_reports for select to authenticated
  using (user_id = auth.uid() or public.is_lead_up());
create policy reports_insert on daily_reports for insert to authenticated with check (user_id = auth.uid());
create policy reports_update_own on daily_reports for update to authenticated
  using (user_id = auth.uid() and status <> 'approved') with check (user_id = auth.uid() and status = 'submitted');
create policy reports_review on daily_reports for update to authenticated
  using (public.is_lead_up()) with check (public.is_lead_up());

-- attendance and leave
create policy attendance_read on attendance for select to authenticated
  using (user_id = auth.uid() or public.is_lead_up());
create policy attendance_write on attendance for all to authenticated
  using (user_id = auth.uid() or public.is_manager_up()) with check (user_id = auth.uid() or public.is_manager_up());
create policy leave_read on leave_requests for select to authenticated
  using (user_id = auth.uid() or public.is_lead_up());
create policy leave_insert on leave_requests for insert to authenticated with check (user_id = auth.uid());
create policy leave_review on leave_requests for update to authenticated
  using (public.is_lead_up()) with check (public.is_lead_up());

-- tenders: leads and above
create policy tenders_rw on tenders for all to authenticated
  using (public.is_lead_up()) with check (public.is_lead_up());

-- finance: admin and manager only (employees read their own salary)
create policy invoices_rw on invoices for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());
create policy payments_rw on payments for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());
create policy expenses_rw on expenses for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());
create policy salaries_admin on salaries for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy salaries_own on salaries for select to authenticated using (user_id = auth.uid());

-- notifications and logs
create policy notifications_own on notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_insert on notifications for insert to authenticated with check (public.is_lead_up());
create policy logs_read on activity_logs for select to authenticated using (public.is_manager_up());
create policy logs_insert on activity_logs for insert to authenticated with check (actor_id = auth.uid());

-- ---------- storage bucket for files ----------
insert into storage.buckets (id, name, public) values ('agency-files', 'agency-files', false)
on conflict (id) do nothing;
create policy "files read" on storage.objects for select to authenticated using (bucket_id = 'agency-files');
create policy "files upload" on storage.objects for insert to authenticated with check (bucket_id = 'agency-files');
create policy "files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'agency-files' and owner = auth.uid());

-- ---------- realtime ----------
alter publication supabase_realtime add table tasks, notifications;
