-- Live lecture notes: transcript captured in class, the student's own notes, and an AI summary.
CREATE TABLE public.study_lectures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.study_courses (id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Lecture' CHECK (char_length(title) BETWEEN 1 AND 200),
  language TEXT NOT NULL DEFAULT 'en-US',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  transcript TEXT NOT NULL DEFAULT '',
  my_notes TEXT NOT NULL DEFAULT '',
  summary JSONB,
  summarized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX study_lectures_user_started_idx ON public.study_lectures (user_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_lectures TO authenticated;
GRANT ALL ON public.study_lectures TO service_role;

ALTER TABLE public.study_lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own lectures"
  ON public.study_lectures FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      course_id IS NULL
      OR EXISTS (SELECT 1 FROM public.study_courses c WHERE c.id = course_id AND c.user_id = auth.uid())
    )
  );

CREATE TRIGGER update_study_lectures_updated_at
  BEFORE UPDATE ON public.study_lectures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
