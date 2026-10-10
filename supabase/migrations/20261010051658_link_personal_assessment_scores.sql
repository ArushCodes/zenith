-- Link a personal assessment result to one grading component. Scores remain private.
-- No automatic data matching or overwriting of existing personal marks.
ALTER TABLE public.exam_marks ADD COLUMN IF NOT EXISTS component_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS course_components_id_batch_unique ON public.course_components(id,batch_id);
ALTER TABLE public.component_marks ADD CONSTRAINT component_marks_component_batch_fk
  FOREIGN KEY(component_id,batch_id) REFERENCES public.course_components(id,batch_id) ON DELETE CASCADE;
ALTER TABLE public.exam_marks ADD CONSTRAINT exam_marks_component_batch_fk
  FOREIGN KEY(component_id,batch_id) REFERENCES public.course_components(id,batch_id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS exam_marks_one_result_per_component
  ON public.exam_marks(user_id,component_id) WHERE component_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.validate_assessment_score_link()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE component_weight numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.deadlines d WHERE d.id=NEW.deadline_id AND d.batch_id=NEW.batch_id) THEN
    RAISE EXCEPTION 'Assessment and batch do not match';
  END IF;
  IF NEW.component_id IS NOT NULL THEN
    SELECT c.weightage INTO component_weight FROM public.course_components c
      WHERE c.id=NEW.component_id AND c.batch_id=NEW.batch_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Grading component and batch do not match'; END IF;
    NEW.weightage := component_weight;
  ELSE
    NEW.weightage := 0; -- Unlinked results have no invented grading contribution.
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_assessment_score_link BEFORE INSERT OR UPDATE ON public.exam_marks
FOR EACH ROW EXECUTE FUNCTION private.validate_assessment_score_link();

CREATE OR REPLACE FUNCTION private.sync_assessment_score_to_grading()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.component_id IS NOT NULL THEN
      DELETE FROM public.component_marks WHERE component_id=OLD.component_id AND user_id=OLD.user_id AND batch_id=OLD.batch_id;
    END IF;
    RETURN NULL;
  END IF;
  IF pg_catalog.pg_trigger_depth()>1 THEN RETURN NULL; END IF;
  IF TG_OP='UPDATE' AND OLD.component_id IS NOT NULL AND OLD.component_id IS DISTINCT FROM NEW.component_id THEN
    DELETE FROM public.component_marks WHERE component_id=OLD.component_id AND user_id=OLD.user_id AND batch_id=OLD.batch_id;
  END IF;
  IF NEW.component_id IS NOT NULL THEN
    INSERT INTO public.component_marks(component_id,batch_id,user_id,score,total)
      VALUES(NEW.component_id,NEW.batch_id,NEW.user_id,NEW.score,NEW.total)
    ON CONFLICT(component_id,user_id) DO UPDATE SET score=EXCLUDED.score,total=EXCLUDED.total,updated_at=pg_catalog.now();
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER sync_assessment_score_to_grading AFTER INSERT OR UPDATE OR DELETE ON public.exam_marks
FOR EACH ROW EXECUTE FUNCTION private.sync_assessment_score_to_grading();

CREATE OR REPLACE FUNCTION private.sync_grading_score_to_assessment()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    DELETE FROM public.exam_marks WHERE component_id=OLD.component_id AND user_id=OLD.user_id AND batch_id=OLD.batch_id;
  ELSE
    IF pg_catalog.pg_trigger_depth()>1 THEN RETURN NULL; END IF;
    UPDATE public.exam_marks SET score=NEW.score,total=NEW.total,updated_at=pg_catalog.now()
      WHERE component_id=NEW.component_id AND user_id=NEW.user_id AND batch_id=NEW.batch_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER sync_grading_score_to_assessment AFTER INSERT OR UPDATE OR DELETE ON public.component_marks
FOR EACH ROW EXECUTE FUNCTION private.sync_grading_score_to_assessment();
REVOKE ALL ON FUNCTION private.validate_assessment_score_link() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.sync_assessment_score_to_grading() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.sync_grading_score_to_assessment() FROM PUBLIC;

-- Confirmed Maths split: Quiz 1 and Quiz 2 each carry 10%. Preserve any existing
-- aggregate scores instead of splitting them by guesswork.
WITH eligible AS (
  SELECT c.id FROM public.course_components c JOIN public.batches b ON b.id=c.batch_id
  WHERE b.slug='tapmi-ipm-2026' AND c.course_code='OPS 1101' AND c.kind='quiz' AND c.name='Quizzes'
    AND NOT EXISTS(SELECT 1 FROM public.component_marks m WHERE m.component_id=c.id)
    AND NOT EXISTS(SELECT 1 FROM public.exam_marks m WHERE m.component_id=c.id)
)
UPDATE public.course_components c SET name='Quiz 1',weightage=10,timing_note='After session 7',updated_at=pg_catalog.now()
  FROM eligible e WHERE c.id=e.id;
INSERT INTO public.course_components(batch_id,course_code,course_name,credits,is_mlc,is_provisional,name,weightage,kind,sequence,timing_note,work_mode,created_by)
  SELECT c.batch_id,c.course_code,c.course_name,c.credits,c.is_mlc,c.is_provisional,'Quiz 2',10,'quiz',c.sequence+1,'After session 17',c.work_mode,c.created_by
  FROM public.course_components c JOIN public.batches b ON b.id=c.batch_id
  WHERE b.slug='tapmi-ipm-2026' AND c.course_code='OPS 1101' AND c.kind='quiz' AND c.name='Quiz 1' AND c.weightage=10
    AND NOT EXISTS(SELECT 1 FROM public.course_components q WHERE q.batch_id=c.batch_id AND q.course_code=c.course_code AND q.name='Quiz 2');
NOTIFY pgrst,'reload schema';
