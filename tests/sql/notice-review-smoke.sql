BEGIN;
DO $$
DECLARE u uuid; b uuid; a uuid:=gen_random_uuid(); z uuid:=gen_random_uuid();
BEGIN
  SELECT user_id,batch_id INTO u,b FROM public.batch_memberships WHERE private.is_batch_mod(user_id,batch_id) LIMIT 1;
  IF u IS NULL THEN RAISE EXCEPTION 'A moderator is required for the rollback verification'; END IF;
  INSERT INTO public.email_ingest(id,batch_id,subject,status) VALUES(a,b,'AUDIT TEST date only','pending'),(z,b,'AUDIT TEST exam window','pending');
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  PERFORM set_config('zenith.test.notice_date',a::text,true);
  PERFORM set_config('zenith.test.notice_window',z::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE a uuid:=current_setting('zenith.test.notice_date')::uuid; z uuid:=current_setting('zenith.test.notice_window')::uuid; d uuid; e uuid;
BEGIN
  d:=public.review_email_candidate(a,true,'{"title":"AUDIT TEST date only","type":"quiz","due_at":"2026-10-15T10:00:00+05:30","all_day":true}');
  IF NOT EXISTS(SELECT 1 FROM public.deadlines WHERE id=d AND all_day AND end_at IS NULL AND due_at='2026-10-15T00:00:00+05:30'::timestamptz) THEN RAISE EXCEPTION 'Unknown time was not preserved'; END IF;
  e:=public.review_email_candidate(z,true,'{"title":"AUDIT TEST window","type":"endterm","due_at":"2026-10-15T10:00:00+05:30","end_at":"2026-10-15T12:00:00+05:30","all_day":false}');
  IF NOT EXISTS(SELECT 1 FROM public.deadlines WHERE id=e AND NOT all_day AND end_at='2026-10-15T12:00:00+05:30'::timestamptz) THEN RAISE EXCEPTION 'Exam window was not preserved'; END IF;
  IF public.review_email_candidate(a,true,'{}')<>d THEN RAISE EXCEPTION 'Approval was not idempotent'; END IF;
END $$;
RESET ROLE;
SELECT true AS unknown_time_preserved,true AS exam_window_preserved,true AS duplicate_approval_idempotent;
ROLLBACK;
