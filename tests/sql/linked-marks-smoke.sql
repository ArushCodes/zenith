BEGIN;
DO $$
DECLARE u uuid; b uuid; c uuid:=gen_random_uuid(); d uuid:=gen_random_uuid();
BEGIN
  SELECT user_id,batch_id INTO u,b FROM public.batch_memberships
    WHERE private.is_batch_member(user_id,batch_id) LIMIT 1;
  IF u IS NULL THEN RAISE EXCEPTION 'An approved member is required for this rollback test'; END IF;
  INSERT INTO public.course_components(id,batch_id,course_code,course_name,name,kind,weightage,created_by)
    VALUES(c,b,'AUDIT TEST','AUDIT TEST','Audit quiz','quiz',10,u);
  INSERT INTO public.deadlines(id,batch_id,title,subject,type,due_at,created_by,status)
    VALUES(d,b,'AUDIT TEST','AUDIT TEST','quiz',now(),u,'approved');
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  PERFORM set_config('zenith.test.user',u::text,true);
  PERFORM set_config('zenith.test.batch',b::text,true);
  PERFORM set_config('zenith.test.component',c::text,true);
  PERFORM set_config('zenith.test.deadline',d::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE u uuid:=current_setting('zenith.test.user')::uuid; b uuid:=current_setting('zenith.test.batch')::uuid;
  c uuid:=current_setting('zenith.test.component')::uuid; d uuid:=current_setting('zenith.test.deadline')::uuid;
BEGIN
  INSERT INTO public.exam_marks(deadline_id,batch_id,user_id,component_id,score,total,weightage)
    VALUES(d,b,u,c,7,10,99);
  IF NOT EXISTS(SELECT 1 FROM public.component_marks WHERE component_id=c AND user_id=u AND score=7 AND total=10) THEN RAISE EXCEPTION 'Assessment did not sync to Grading'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.exam_marks WHERE deadline_id=d AND user_id=u AND weightage=10) THEN RAISE EXCEPTION 'Component weight was not authoritative'; END IF;
  UPDATE public.component_marks SET score=8 WHERE component_id=c AND user_id=u;
  IF NOT EXISTS(SELECT 1 FROM public.exam_marks WHERE deadline_id=d AND user_id=u AND score=8) THEN RAISE EXCEPTION 'Grading did not sync to assessment'; END IF;
  DELETE FROM public.component_marks WHERE component_id=c AND user_id=u;
  IF EXISTS(SELECT 1 FROM public.exam_marks WHERE deadline_id=d AND user_id=u) THEN RAISE EXCEPTION 'Clearing Grading left an assessment score'; END IF;
  INSERT INTO public.exam_marks(deadline_id,batch_id,user_id,component_id,score,total) VALUES(d,b,u,c,9,10);
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  IF EXISTS(SELECT 1 FROM public.exam_marks WHERE deadline_id=d) OR EXISTS(SELECT 1 FROM public.component_marks WHERE component_id=c) THEN RAISE EXCEPTION 'A different user can read private scores'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE c uuid:=current_setting('zenith.test.component')::uuid; d uuid:=current_setting('zenith.test.deadline')::uuid;
BEGIN
  DELETE FROM public.deadlines WHERE id=d;
  IF EXISTS(SELECT 1 FROM public.component_marks WHERE component_id=c) THEN RAISE EXCEPTION 'Deleting the assessment left a grading score'; END IF;
END $$;
SELECT true AS bidirectional_sync, true AS authoritative_weight, true AS private_scores, true AS mirrored_clear, true AS cascade_cleanup;
ROLLBACK;
