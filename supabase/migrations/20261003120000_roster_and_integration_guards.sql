-- Apply before deploying the new auth/sync handlers. Existing accounts are retained.
CREATE TABLE IF NOT EXISTS private.auth_attempts (
  bucket text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL
);
REVOKE ALL ON private.auth_attempts FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.consume_auth_attempt(bucket_key text, max_attempts integer DEFAULT 8)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, private AS $$
DECLARE count_now integer;
BEGIN
  INSERT INTO private.auth_attempts AS a VALUES (bucket_key, 1, now() + interval '15 minutes')
  ON CONFLICT (bucket) DO UPDATE SET
    attempts = CASE WHEN a.expires_at <= now() THEN 1 ELSE a.attempts + 1 END,
    expires_at = CASE WHEN a.expires_at <= now() THEN now() + interval '15 minutes' ELSE a.expires_at END
  RETURNING attempts INTO count_now;
  DELETE FROM private.auth_attempts WHERE expires_at < now() - interval '1 day';
  RETURN count_now <= greatest(1, least(max_attempts, 30));
END; $$;
REVOKE ALL ON FUNCTION public.consume_auth_attempt(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_auth_attempt(text, integer) TO service_role;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mahe_id text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_mahe_id_unique ON public.profiles(mahe_id) WHERE mahe_id IS NOT NULL;
-- This fails rather than silently merging students if old data contains duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_roll_normalized_unique ON public.profiles(upper(trim(registration_no)))
  WHERE registration_no IS NOT NULL AND trim(registration_no) <> '';

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE batch_id_value uuid; roll_value text; mahe_value text;
BEGIN
  IF NEW.email IS NULL OR lower(split_part(NEW.email, '@', 2)) <> 'learner.manipal.edu' THEN
    RAISE EXCEPTION 'A learner.manipal.edu email is required';
  END IF;
  IF COALESCE(NEW.raw_app_meta_data ->> 'zenith_roster_verified', 'false') <> 'true' THEN
    RAISE EXCEPTION 'Register through the verified student roster';
  END IF;
  roll_value := upper(trim(NEW.raw_user_meta_data ->> 'roll_no'));
  mahe_value := trim(NEW.raw_user_meta_data ->> 'mahe_id');
  batch_id_value := (NEW.raw_user_meta_data ->> 'batch_id')::uuid;
  IF roll_value IS NULL OR mahe_value IS NULL OR mahe_value !~ '^[0-9]{12}$' THEN
    RAISE EXCEPTION 'Verified student identity is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.batches WHERE id = batch_id_value) THEN RAISE EXCEPTION 'Unknown batch'; END IF;
  INSERT INTO public.profiles(id, full_name, email, registration_no, mahe_id)
  VALUES(NEW.id, NEW.raw_user_meta_data ->> 'full_name', lower(NEW.email), roll_value, mahe_value);
  INSERT INTO public.user_roles(user_id, role) VALUES(NEW.id, 'student');
  INSERT INTO public.batch_memberships(user_id, batch_id, role, status, decided_at)
  VALUES(NEW.id, batch_id_value, 'student', 'approved', now());
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_immutable_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, private AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT private.has_role(auth.uid(), 'admin') THEN
    NEW.id := OLD.id; NEW.email := OLD.email; NEW.created_at := OLD.created_at;
    NEW.registration_no := OLD.registration_no; NEW.mahe_id := OLD.mahe_id;
  END IF;
  RETURN NEW;
END; $$;

ALTER TABLE public.class_sessions ADD COLUMN IF NOT EXISTS is_cancelled boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.acquire_timetable_lease(target_batch uuid, force_run boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE acquired uuid;
BEGIN
  INSERT INTO public.batch_sync_state AS s(batch_id, lease_until, last_run_at)
  VALUES(target_batch, now() + interval '10 minutes', now())
  ON CONFLICT(batch_id) DO UPDATE SET lease_until = now() + interval '10 minutes', last_run_at = now()
  WHERE (force_run OR NOT s.paused) AND (s.lease_until IS NULL OR s.lease_until <= now())
  RETURNING batch_id INTO acquired;
  RETURN acquired IS NOT NULL;
END; $$;
REVOKE ALL ON FUNCTION public.acquire_timetable_lease(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_timetable_lease(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.replace_ics_sessions(target_batch uuid, payload jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  IF jsonb_typeof(payload) <> 'array' OR jsonb_array_length(payload) > 5000 THEN RAISE EXCEPTION 'Invalid calendar payload'; END IF;
  INSERT INTO public.class_sessions(batch_id, source, external_uid, title, course_code, course_name, short_name,
    faculty_name, section, classroom, session_number, start_at, end_at, is_holiday, is_cancelled)
  SELECT target_batch, 'ics', x.external_uid, x.title, x.course_code, x.course_name, x.short_name,
    x.faculty_name, x.section, x.classroom, x.session_number, x.start_at, x.end_at, x.is_holiday, false
  FROM jsonb_to_recordset(payload) AS x(external_uid text, title text, course_code text, course_name text,
    short_name text, faculty_name text, section text, classroom text, session_number integer,
    start_at timestamptz, end_at timestamptz, is_holiday boolean)
  ON CONFLICT(batch_id, external_uid) DO UPDATE SET title=EXCLUDED.title, course_code=EXCLUDED.course_code,
    course_name=EXCLUDED.course_name, short_name=EXCLUDED.short_name, faculty_name=EXCLUDED.faculty_name,
    section=EXCLUDED.section, classroom=EXCLUDED.classroom, session_number=EXCLUDED.session_number,
    start_at=EXCLUDED.start_at, end_at=EXCLUDED.end_at, is_holiday=EXCLUDED.is_holiday, is_cancelled=false;
  -- Preserve attendance history while hiding classes removed or cancelled in the feed.
  UPDATE public.class_sessions AS s SET is_cancelled=true
  WHERE s.batch_id=target_batch AND s.source='ics'
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(payload) AS x WHERE x->>'external_uid'=s.external_uid);
  RETURN jsonb_array_length(payload);
END; $$;
REVOKE ALL ON FUNCTION public.replace_ics_sessions(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_ics_sessions(uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.review_email_candidate(candidate_id uuid, approve boolean, draft jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path TO public, private AS $$
DECLARE candidate public.email_ingest; published_id uuid;
BEGIN
  SELECT * INTO candidate FROM public.email_ingest WHERE id=candidate_id FOR UPDATE;
  IF NOT FOUND OR NOT private.is_batch_mod(auth.uid(), candidate.batch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF candidate.status='approved' THEN RETURN candidate.deadline_id; END IF;
  IF candidate.status <> 'pending' THEN RAISE EXCEPTION 'Email already reviewed'; END IF;
  IF approve THEN
    IF COALESCE(trim(draft->>'title'),'')='' OR draft->>'due_at' IS NULL THEN RAISE EXCEPTION 'Title and date are required'; END IF;
    INSERT INTO public.deadlines(batch_id,title,subject,subject_code,type,due_at,work_mode,submission_link,notes,status,source,is_major,created_by)
    VALUES(candidate.batch_id,draft->>'title',COALESCE(draft->>'subject','General'),draft->>'subject_code',
      COALESCE(draft->>'type','assignment')::public.deadline_type,(draft->>'due_at')::timestamptz,
      COALESCE(draft->>'work_mode','individual')::public.work_mode,draft->>'submission_link',draft->>'notes',
      'approved','email',COALESCE(draft->>'type' IN ('midterm','endterm'),false),auth.uid()) RETURNING id INTO published_id;
  END IF;
  UPDATE public.email_ingest SET status=CASE WHEN approve THEN 'approved'::public.review_status ELSE 'rejected'::public.review_status END,
    deadline_id=published_id,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=candidate_id;
  RETURN published_id;
END; $$;
REVOKE ALL ON FUNCTION public.review_email_candidate(uuid, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_email_candidate(uuid, boolean, jsonb) TO authenticated;

DROP POLICY IF EXISTS "members view attendance" ON public.attendance_marks;
CREATE POLICY "self or batch managers view attendance" ON public.attendance_marks FOR SELECT TO authenticated
USING (private.is_batch_member(auth.uid(), batch_id) AND (user_id = auth.uid() OR private.is_batch_mod(auth.uid(), batch_id)));
DROP POLICY IF EXISTS "Mods can view all activity logs" ON public.user_activity_logs;
CREATE POLICY "admins or own batch managers view activity logs" ON public.user_activity_logs FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR (batch_id IS NOT NULL AND private.is_batch_mod(auth.uid(), batch_id)));
