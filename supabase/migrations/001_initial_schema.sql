-- ============================================================
-- GSCC Pro — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable moddatetime extension for auto-updating updated_at
create extension if not exists moddatetime schema extensions;

-- ─────────────────────────────────────────
-- profiles (extends auth.users)
-- ─────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz default now()
);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- residents
-- ─────────────────────────────────────────
create table public.residents (
  id                   uuid primary key default gen_random_uuid(),
  full_name            text not null,
  date_of_birth        date not null,
  gender               text check (gender in ('male', 'female', 'other')),
  photo_url            text,
  room_number          text,
  admission_date       date not null default current_date,
  status               text not null default 'active' check (status in ('active', 'discharged')),
  -- Medical
  medical_conditions   text[] default '{}',
  medications          text[] default '{}',
  allergies            text[] default '{}',
  primary_doctor_name  text,
  primary_doctor_phone text,
  -- Care
  dietary_needs        text,
  mobility_status      text,
  special_notes        text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create trigger set_residents_updated_at
  before update on public.residents
  for each row execute procedure extensions.moddatetime(updated_at);

-- ─────────────────────────────────────────
-- emergency_contacts (one-to-many → residents)
-- ─────────────────────────────────────────
create table public.emergency_contacts (
  id           uuid primary key default gen_random_uuid(),
  resident_id  uuid not null references public.residents(id) on delete cascade,
  name         text not null,
  relationship text not null,
  phone        text not null,
  is_primary   boolean default false,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- care_notes
-- ─────────────────────────────────────────
create table public.care_notes (
  id          uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  note_text   text not null,
  note_date   timestamptz not null default now(),
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- Helper: get current user role
-- ─────────────────────────────────────────
create or replace function public.current_user_role()
returns text language sql security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.residents         enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.care_notes        enable row level security;

-- profiles
create policy "users read own profile"
  on public.profiles for select
  using (id = auth.uid() or current_user_role() = 'admin');

create policy "admin full access to profiles"
  on public.profiles for all
  using (current_user_role() = 'admin');

-- residents
create policy "authenticated users read residents"
  on public.residents for select
  using (auth.uid() is not null);

create policy "admin write residents"
  on public.residents for insert
  with check (current_user_role() = 'admin');

create policy "admin update residents"
  on public.residents for update
  using (current_user_role() = 'admin');

create policy "admin delete residents"
  on public.residents for delete
  using (current_user_role() = 'admin');

-- emergency_contacts
create policy "authenticated users read contacts"
  on public.emergency_contacts for select
  using (auth.uid() is not null);

create policy "admin write contacts"
  on public.emergency_contacts for insert
  with check (current_user_role() = 'admin');

create policy "admin update contacts"
  on public.emergency_contacts for update
  using (current_user_role() = 'admin');

create policy "admin delete contacts"
  on public.emergency_contacts for delete
  using (current_user_role() = 'admin');

-- care_notes
create policy "authenticated users read notes"
  on public.care_notes for select
  using (auth.uid() is not null);

create policy "authenticated users insert own notes"
  on public.care_notes for insert
  with check (author_id = auth.uid());

create policy "admin update notes"
  on public.care_notes for update
  using (current_user_role() = 'admin');

create policy "admin delete notes"
  on public.care_notes for delete
  using (current_user_role() = 'admin');

-- ─────────────────────────────────────────
-- Storage bucket (run separately in dashboard or here)
-- ─────────────────────────────────────────
-- insert into storage.buckets (id, name, public) values ('resident-photos', 'resident-photos', false);

-- Storage policies (adjust bucket name if needed)
-- create policy "authenticated read photos"
--   on storage.objects for select
--   using (bucket_id = 'resident-photos' and auth.uid() is not null);
-- create policy "admin upload photos"
--   on storage.objects for insert
--   with check (bucket_id = 'resident-photos' and current_user_role() = 'admin');
-- create policy "admin delete photos"
--   on storage.objects for delete
--   using (bucket_id = 'resident-photos' and current_user_role() = 'admin');

-- ─────────────────────────────────────────
-- Seed: first admin
-- After running this migration, go to Supabase Dashboard → Authentication
-- → Users → Invite user. Then run:
--   update public.profiles set role = 'admin' where id = '<your-user-uuid>';
-- ─────────────────────────────────────────
