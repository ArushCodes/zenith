-- Preserve unknown times and explicit windows after moderator review. Authorization and invoker security are unchanged.
CREATE OR REPLACE FUNCTION public.review_email_candidate(candidate_id uuid, approve boolean, draft jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path TO public, private AS $$
DECLARE candidate public.email_ingest; published_id uuid; starts_at timestamptz; ends_at timestamptz; time_unknown boolean;
BEGIN
  SELECT * INTO candidate FROM public.email_ingest WHERE id=candidate_id FOR UPDATE;
  IF NOT FOUND OR NOT private.is_batch_mod(auth.uid(), candidate.batch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF candidate.status='approved' THEN RETURN candidate.deadline_id; END IF;
  IF candidate.status <> 'pending' THEN RAISE EXCEPTION 'Email already reviewed'; END IF;
  IF approve THEN
    IF COALESCE(trim(draft->>'title'),'')='' OR draft->>'due_at' IS NULL THEN RAISE EXCEPTION 'Title and date are required'; END IF;
    starts_at := (draft->>'due_at')::timestamptz;
    ends_at := NULLIF(draft->>'end_at','')::timestamptz;
    time_unknown := COALESCE((draft->>'all_day')::boolean,false);
    IF NOT isfinite(starts_at) OR (ends_at IS NOT NULL AND (NOT isfinite(ends_at) OR ends_at <= starts_at OR time_unknown)) THEN
      RAISE EXCEPTION 'End time must follow a known start time';
    END IF;
    IF time_unknown THEN
      starts_at := date_trunc('day', starts_at AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
    END IF;
    INSERT INTO public.deadlines(batch_id,title,subject,subject_code,type,due_at,all_day,end_at,work_mode,submission_link,notes,status,source,is_major,created_by)
    VALUES(candidate.batch_id,draft->>'title',COALESCE(draft->>'subject','General'),draft->>'subject_code',
      COALESCE(draft->>'type','assignment')::public.deadline_type,starts_at,time_unknown,ends_at,
      COALESCE(draft->>'work_mode','individual')::public.work_mode,draft->>'submission_link',draft->>'notes',
      'approved','email',COALESCE(draft->>'type' IN ('midterm','endterm'),false),auth.uid()) RETURNING id INTO published_id;
  END IF;
  UPDATE public.email_ingest SET status=CASE WHEN approve THEN 'approved'::public.review_status ELSE 'rejected'::public.review_status END,
    deadline_id=published_id,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=candidate_id;
  RETURN published_id;
END; $$;
REVOKE ALL ON FUNCTION public.review_email_candidate(uuid, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_email_candidate(uuid, boolean, jsonb) TO authenticated;

