-- ============================================================
-- Migration 003: Workers & Positions
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────
-- positions
-- ─────────────────────────────────────────
create table public.positions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

alter table public.positions enable row level security;

create policy "All staff can view positions"
  on public.positions for select to authenticated using (true);

create policy "Admin can insert positions"
  on public.positions for insert to authenticated
  with check (public.current_user_role() = 'admin');

create policy "Admin can update positions"
  on public.positions for update to authenticated
  using (public.current_user_role() = 'admin');

create policy "Admin can delete positions"
  on public.positions for delete to authenticated
  using (public.current_user_role() = 'admin');

-- ─────────────────────────────────────────
-- workers  (local + foreign, unified table)
-- ─────────────────────────────────────────
create table public.workers (
  id          uuid primary key default gen_random_uuid(),
  worker_type text not null check (worker_type in ('local', 'foreign')),
  status      text not null default 'active' check (status in ('active', 'inactive')),
  name        text not null,

  -- Shared personal
  gender           text check (gender in ('male', 'female')),
  date_of_birth    date,
  contact_number   text,

  -- Shared employment & payroll
  date_start_work  date,
  date_end_work    date,
  current_salary   numeric(10, 2),
  remark           text,

  -- Local worker only
  nric                text,
  position_id         uuid references public.positions(id) on delete set null,
  address             text,
  bank                text,
  bank_account_number text,
  kwsp                text,   -- EPF/KWSP number

  -- Foreign worker only
  country_of_origin   text,
  passport_number     text,
  passport_expiry     date,
  passport_permit_date date,
  majikan             text,   -- employer name
  majikan_email       text,

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.workers enable row level security;

create policy "All staff can view workers"
  on public.workers for select to authenticated using (true);

create policy "Admin can insert workers"
  on public.workers for insert to authenticated
  with check (public.current_user_role() = 'admin');

create policy "Admin can update workers"
  on public.workers for update to authenticated
  using (public.current_user_role() = 'admin');

create policy "Admin can delete workers"
  on public.workers for delete to authenticated
  using (public.current_user_role() = 'admin');

-- auto updated_at
create trigger handle_workers_updated_at
  before update on public.workers
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────
-- Add caregiver_id FK to residents
-- ─────────────────────────────────────────
alter table public.residents
  add column if not exists caregiver_id uuid references public.workers(id) on delete set null;
