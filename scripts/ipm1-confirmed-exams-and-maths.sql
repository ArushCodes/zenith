-- Confirmed from the two images supplied by the user on 5 October 2026.
BEGIN;
UPDATE public.course_components SET is_provisional=false,
 timing_note=CASE kind WHEN 'midterm' THEN '75 minutes, closed book' WHEN 'endterm' THEN '120 minutes, closed book' WHEN 'quiz' THEN 'Quiz 1: 10%, after session 7; Quiz 2: 10%, after session 17' WHEN 'participation' THEN 'All sessions' ELSE timing_note END,
 weightage=CASE WHEN kind IN ('participation','project') THEN 10 ELSE weightage END
WHERE batch_id='ee4a435d-4003-4a22-940b-0ee0e676b6f5' AND course_code='OPS 1101';
INSERT INTO public.course_components(batch_id,course_code,course_name,credits,name,weightage,kind,sequence,timing_note,work_mode)
SELECT 'ee4a435d-4003-4a22-940b-0ee0e676b6f5','OPS 1101','Basic Mathematics - I',3,'Project work',10,'project',3,'Sessions 23–24','group'
WHERE NOT EXISTS(SELECT 1 FROM public.course_components WHERE batch_id='ee4a435d-4003-4a22-940b-0ee0e676b6f5' AND course_code='OPS 1101' AND kind='project');
-- Keep the existing combined quiz component and its marks: the two quizzes together weigh 20%.
DO $$
DECLARE exam record; existing_id uuid;
BEGIN
FOR exam IN SELECT * FROM (VALUES
 ('OPS 1101','Basic Mathematics – I','2026-10-15'),
 ('HRM 1102','English Language and Literature – I','2026-10-16'),
 ('OPS 1102','Basics of Statistics','2026-10-19'),
 ('HRM 1101','Foundations of Psychology','2026-10-21'),
 ('MGT 1101','Introduction to Sociology','2026-10-23')
) AS schedule(code,subject,exam_date) LOOP
 SELECT id INTO existing_id FROM public.deadlines WHERE batch_id='ee4a435d-4003-4a22-940b-0ee0e676b6f5' AND type='endterm' AND (subject_code=exam.code OR lower(replace(subject,'–','-'))=lower(replace(exam.subject,'–','-'))) ORDER BY created_at LIMIT 1;
 IF existing_id IS NOT NULL THEN
 UPDATE public.deadlines SET due_at=(exam.exam_date||'T10:00:00+05:30')::timestamptz,end_at=(exam.exam_date||'T12:00:00+05:30')::timestamptz,all_day=false,is_major=true WHERE id=existing_id;
 ELSE
 INSERT INTO public.deadlines(batch_id,title,subject,subject_code,type,due_at,end_at,all_day,is_major,work_mode)
 VALUES('ee4a435d-4003-4a22-940b-0ee0e676b6f5',exam.subject||' End-Term',exam.subject,exam.code,'endterm',(exam.exam_date||'T10:00:00+05:30')::timestamptz,(exam.exam_date||'T12:00:00+05:30')::timestamptz,false,true,'individual');
 END IF;
END LOOP;
END $$;
COMMIT;
