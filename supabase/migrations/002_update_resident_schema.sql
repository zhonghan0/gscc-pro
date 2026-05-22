-- Migration 002: Update residents table to new patient record format
-- Run this in Supabase SQL Editor after the initial schema.

-- 1. Drop old columns that are replaced by the new schema
ALTER TABLE public.residents
  DROP COLUMN IF EXISTS photo_url,
  DROP COLUMN IF EXISTS room_number,
  DROP COLUMN IF EXISTS medical_conditions,
  DROP COLUMN IF EXISTS medications,
  DROP COLUMN IF EXISTS allergies,
  DROP COLUMN IF EXISTS primary_doctor_name,
  DROP COLUMN IF EXISTS primary_doctor_phone,
  DROP COLUMN IF EXISTS dietary_needs,
  DROP COLUMN IF EXISTS mobility_status,
  DROP COLUMN IF EXISTS special_notes;

-- 2. Make date_of_birth nullable (it will be auto-derived from NRIC)
ALTER TABLE public.residents
  ALTER COLUMN date_of_birth DROP NOT NULL;

-- 3. Replace gender check constraint to only allow male/female
ALTER TABLE public.residents
  DROP CONSTRAINT IF EXISTS residents_gender_check;

ALTER TABLE public.residents
  ADD CONSTRAINT residents_gender_check CHECK (gender IN ('male', 'female'));

-- 4. Add new columns — Details
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS nric        text,
  ADD COLUMN IF NOT EXISTS condition   text CHECK (condition IN ('mobile', 'wheelchair_bound', 'bedridden')),
  ADD COLUMN IF NOT EXISTS address     text,
  ADD COLUMN IF NOT EXISTS date_of_discharge date;

-- 5. Add new columns — Package
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS physio          text CHECK (physio IN ('yes', 'no', 'foc', 'alternate_day')) DEFAULT 'no',
  ADD COLUMN IF NOT EXISTS physio_remark   text,
  ADD COLUMN IF NOT EXISTS caregiver       text,
  ADD COLUMN IF NOT EXISTS include_misc    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pay_day         integer CHECK (pay_day >= 1 AND pay_day <= 31),
  ADD COLUMN IF NOT EXISTS fee             numeric(10, 2),
  ADD COLUMN IF NOT EXISTS account         text CHECK (account IN ('quickbook', 'cash')),
  ADD COLUMN IF NOT EXISTS package_remark  text;

-- 6. Add new columns — Health Condition
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS health_condition  text,
  ADD COLUMN IF NOT EXISTS health_remark     text;

-- 7. Add unique constraint on NRIC (optional — remove if you need duplicates)
-- ALTER TABLE public.residents ADD CONSTRAINT residents_nric_unique UNIQUE (nric);
