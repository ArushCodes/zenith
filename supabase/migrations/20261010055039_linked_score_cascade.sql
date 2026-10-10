-- Referential cleanup must work for authorized moderator event deletion without
-- broadening personal-score RLS or using a privileged synchronization function.
ALTER TABLE public.component_marks ADD COLUMN assessment_mark_id uuid
  REFERENCES public.exam_marks(id) ON DELETE CASCADE;
CREATE INDEX component_marks_assessment_mark_idx ON public.component_marks(assessment_mark_id);
CREATE OR REPLACE FUNCTION private.validate_grading_assessment_link()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.assessment_mark_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.exam_marks e WHERE e.id=NEW.assessment_mark_id AND e.component_id=NEW.component_id
      AND e.user_id=NEW.user_id AND e.batch_id=NEW.batch_id
  ) THEN RAISE EXCEPTION 'Assessment score and grading record do not match'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_grading_assessment_link BEFORE INSERT OR UPDATE ON public.component_marks
FOR EACH ROW EXECUTE FUNCTION private.validate_grading_assessment_link();
REVOKE ALL ON FUNCTION private.validate_grading_assessment_link() FROM PUBLIC;

UPDATE public.component_marks c SET assessment_mark_id=e.id FROM public.exam_marks e
  WHERE e.component_id=c.component_id AND e.batch_id=c.batch_id AND e.user_id=c.user_id;

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
    INSERT INTO public.component_marks(component_id,batch_id,user_id,score,total,assessment_mark_id)
      VALUES(NEW.component_id,NEW.batch_id,NEW.user_id,NEW.score,NEW.total,NEW.id)
    ON CONFLICT(component_id,user_id) DO UPDATE SET score=EXCLUDED.score,total=EXCLUDED.total,
      assessment_mark_id=EXCLUDED.assessment_mark_id,updated_at=pg_catalog.now();
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.sync_assessment_score_to_grading() FROM PUBLIC;
NOTIFY pgrst,'reload schema';
