-- Migration: 20260923200000_admin_arush.sql
-- Purpose: Grant master admin privileges to Arush Vipul Gaur and create user_activity_logs table

-- 1. Ensure user_activity_logs table exists for telemetry tracking
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text,
  user_email text,
  user_roll text,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  action text NOT NULL,
  title text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_logs_created_at_idx ON public.user_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_logs_batch_idx ON public.user_activity_logs (batch_id);
CREATE INDEX IF NOT EXISTS user_activity_logs_user_idx ON public.user_activity_logs (user_id);

GRANT SELECT, INSERT ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own telemetry
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_activity_logs' AND policyname = 'Users can insert activity logs'
  ) THEN
    CREATE POLICY "Users can insert activity logs" ON public.user_activity_logs
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Admins & mods can view all activity logs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_activity_logs' AND policyname = 'Mods can view all activity logs'
  ) THEN
    CREATE POLICY "Mods can view all activity logs" ON public.user_activity_logs
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'mod')
        )
      );
  END IF;
END $$;

-- 2. Automatically grant admin role to Arush Vipul Gaur (26U17 / 261600130020 / arush emails)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find user id matching Arush
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) LIKE '%arush%'
     OR raw_user_meta_data->>'registration_no' = '26U17'
     OR raw_user_meta_data->>'mahe_id' = '261600130020'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Ensure admin role in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure moderator & admin in batch memberships
    UPDATE public.batch_memberships
    SET role = 'admin', status = 'approved'
    WHERE user_id = v_user_id;
  END IF;
END $$;
