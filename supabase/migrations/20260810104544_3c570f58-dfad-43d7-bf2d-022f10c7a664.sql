GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT SELECT ON public.exams TO anon;
GRANT ALL ON public.exams TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_sections TO authenticated;
GRANT ALL ON public.exam_sections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_questions TO authenticated;
GRANT ALL ON public.exam_questions TO service_role;