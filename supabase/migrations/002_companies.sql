-- Multi-company support: each company owns its own settings (deadline window,
-- letterhead/print format, logo, SLA, Telegram/ERP keys). Existing data is
-- backfilled into a default "YETAF HOLDING" company so nothing breaks.

-- Companies ---------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create policy "companies: select all"
  on public.companies for select
  using (true);

-- Company settings (one row per company) ----------------------------------
create table if not exists public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  window_mode text not null default 'scheduled' check (window_mode in ('scheduled', 'force_open', 'force_closed')),
  open_day integer not null default 5,
  open_time text not null default '06:00',
  close_day integer not null default 1,
  close_time text not null default '04:00',
  timezone text not null default 'Africa/Addis_Ababa',
  telegram_bot_token text,
  telegram_bot_username text,
  auto_warn_enabled boolean not null default false,
  penalty_policy_verified boolean not null default false,
  sla_response_days integer not null default 3 check (sla_response_days between 1 and 60),
  system_name text not null default 'Directive Follow-up System',
  letterhead_config jsonb not null default '{}',
  erp_api_key text,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;

create policy "company_settings: select all"
  on public.company_settings for select
  using (true);

create policy "company_settings: admin manage"
  on public.company_settings for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()::uuid
        and u.role in ('admin', 'super_admin')
    )
  );

-- Scope users to a company -------------------------------------------------
alter table public.users add column if not exists company_id uuid references public.companies(id);
create index if not exists users_company_id_idx on public.users(company_id);

-- Scope reports to a company -----------------------------------------------
alter table public.reports add column if not exists company_id uuid references public.companies(id);
create index if not exists reports_company_id_idx on public.reports(company_id);

-- Seed the three companies --------------------------------------------------
insert into public.companies (name, slug, logo_url, is_active) values
  ('YETAF HOLDING', 'yetaf-holding', null, true),
  ('Team Transport', 'team-transport', null, true),
  ('Taf Energies', 'taf-energies', null, true)
on conflict (slug) do nothing;

-- Backfill existing users/reports to YETAF HOLDING and migrate settings -----
do $$
declare v_yetaf_id uuid;
begin
  select id into v_yetaf_id from public.companies where slug = 'yetaf-holding' limit 1;

  if v_yetaf_id is not null then
    -- Assign existing users/reports without a company to YETAF HOLDING
    update public.users set company_id = v_yetaf_id where company_id is null;
    update public.reports set company_id = v_yetaf_id where company_id is null;

    -- Migrate the single global portal_settings row into YETAF HOLDING's company_settings
    insert into public.company_settings (
      company_id, window_mode, open_day, open_time, close_day, close_time,
      timezone, telegram_bot_token, telegram_bot_username, auto_warn_enabled,
      penalty_policy_verified, sla_response_days, system_name, letterhead_config,
      erp_api_key, updated_by, updated_at
    )
    select
      v_yetaf_id,
      window_mode, open_day, open_time, close_day, close_time,
      timezone, telegram_bot_token, telegram_bot_username, auto_warn_enabled,
      penalty_policy_verified, sla_response_days, system_name, letterhead_config,
      erp_api_key, updated_by, updated_at
    from public.portal_settings where id = 'default'
    on conflict (company_id) do nothing;
  end if;
end $$;
