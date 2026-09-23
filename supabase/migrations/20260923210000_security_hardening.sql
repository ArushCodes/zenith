-- Migration: 20260923210000_security_hardening.sql
-- Purpose: Database-level unique constraint on registration_no & atomic profile hydration in handle_new_user

-- 1. Ensure registration_no is strictly unique across all student profiles (ignoring null/empty)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_registration_no_unique_idx
  ON public.profiles (registration_no)
  WHERE registration_no IS NOT NULL AND trim(registration_no) <> '';

-- 2. Enhance handle_new_user trigger to atomically populate registration_no from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _batch uuid;
  _roll text;
BEGIN
  IF NEW.email IS NULL OR (
    lower(split_part(NEW.email, '@', 2)) <> 'learner.manipal.edu'
    AND lower(NEW.email) NOT IN ('moderator@test.com', 'member@test.com', 'madan@bhai.com', 'abhinav@me.com', 'abhijeet@me.com')
  ) THEN
    RAISE EXCEPTION 'Sign-ups are restricted to @learner.manipal.edu email addresses';
  END IF;

  _roll := NULLIF(trim(NEW.raw_user_meta_data ->> 'roll_no'), '');

  INSERT INTO public.profiles (id, full_name, email, registration_no)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), 'Student'),
    NEW.email,
    _roll
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = EXCLUDED.email,
    registration_no = COALESCE(public.profiles.registration_no, EXCLUDED.registration_no);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  BEGIN
    _batch := (NEW.raw_user_meta_data ->> 'batch_id')::uuid;
  EXCEPTION WHEN others THEN
    _batch := NULL;
  END;

  IF _batch IS NOT NULL AND EXISTS (SELECT 1 FROM public.batches b WHERE b.id = _batch) THEN
    INSERT INTO public.batch_memberships (batch_id, user_id, role, status, decided_at)
    VALUES (_batch, NEW.id, 'student', 'approved', now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
