-- Yetta Holding Reporting Portal — schema

create extension if not exists "pgcrypto";

-- Profiles -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  department text,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: self select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: admin select all"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles: self update"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'department'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Reports ----------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  report_type text not null check (report_type in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'reviewed')),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports: owner select"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "reports: admin select all"
  on public.reports for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "reports: owner insert"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "reports: owner update"
  on public.reports for update
  using (auth.uid() = user_id);

create policy "reports: admin update"
  on public.reports for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "reports: owner delete"
  on public.reports for delete
  using (auth.uid() = user_id);

create policy "reports: admin delete"
  on public.reports for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create index if not exists reports_user_id_idx on public.reports (user_id);
create index if not exists reports_type_idx on public.reports (report_type);
create index if not exists reports_period_idx on public.reports (period_start, period_end);
create index if not exists reports_status_idx on public.reports (status);

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- DEFAULT ADMIN SEED: admin@yetta-holding.com / YettaAdmin2026!
-- =========================================================================
do $$
declare
  v_user_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_email text := 'admin@yetta-holding.com';
  v_password text := 'YettaAdmin2026!';
  v_encrypted_pw text;
begin
  v_encrypted_pw := crypt(v_password, gen_salt('bf'));

  if not exists (select 1 from auth.users where email = v_email) then
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      confirmation_token
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Executive Administrator","department":"Executive Management"}',
      now(),
      now(),
      'authenticated',
      ''
    );
  else
    update auth.users
    set encrypted_password = v_encrypted_pw,
        email_confirmed_at = coalesce(email_confirmed_at, now())
    where email = v_email;
    select id into v_user_id from auth.users where email = v_email;
  end if;

  insert into public.profiles (id, full_name, department, role)
  values (v_user_id, 'Executive Administrator', 'Executive Management', 'admin')
  on conflict (id) do update
  set role = 'admin',
      full_name = 'Executive Administrator',
      department = 'Executive Management';
end $$;
