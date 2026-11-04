-- IPM TERM 2 TT.xlsx, 'IPM TERM 2'!A47:H54: 8 courses, 20 credits.
-- Copy the verified term catalog into the existing course directory.
-- Assessment components and student attendance are unchanged.
INSERT INTO public.courses (batch_id, code, name, short_name, faculty_name, credits)
SELECT c.batch_id, c.code, c.name, c.name, c.faculty_name, c.credits::integer
FROM public.term_courses c
JOIN public.academic_terms t ON t.id = c.term_id AND t.batch_id = c.batch_id
WHERE c.batch_id = 'ee4a435d-4003-4a22-940b-0ee0e676b6f5' AND t.number = 2
ON CONFLICT (batch_id, code) DO UPDATE SET credits = EXCLUDED.credits;
