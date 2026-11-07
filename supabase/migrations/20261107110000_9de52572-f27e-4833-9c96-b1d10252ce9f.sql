-- Study Hub: personal study planner for university students.
-- Every row belongs to one user and is private to them.

-- 1. Study profile (one per user)
CREATE TABLE public.study_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  university TEXT,
  programme TEXT,
  year_of_study SMALLINT CHECK (year_of_study BETWEEN 1 AND 7),
  semester TEXT,
  target_grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. The student's own courses this semester
CREATE TABLE public.study_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  lecturer TEXT,
  credits NUMERIC(4,1) CHECK (credits IS NULL OR credits >= 0),
  color TEXT NOT NULL DEFAULT 'teal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX study_courses_user_idx ON public.study_courses (user_id);

-- 3. Weekly timetable slots
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.study_courses (id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  kind TEXT NOT NULL DEFAULT 'lecture' CHECK (kind IN ('lecture', 'lab', 'tutorial', 'clinical', 'other')),
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX study_sessions_user_day_idx ON public.study_sessions (user_id, day_of_week);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_profiles, public.study_courses, public.study_sessions TO authenticated;
GRANT ALL ON public.study_profiles, public.study_courses, public.study_sessions TO service_role;

ALTER TABLE public.study_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own study profile"
  ON public.study_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage their own study courses"
  ON public.study_courses FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- A session must point at a course the same user owns
CREATE POLICY "Users manage their own study sessions"
  ON public.study_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.study_courses c
      WHERE c.id = course_id AND c.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_study_profiles_updated_at
  BEFORE UPDATE ON public.study_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_courses_updated_at
  BEFORE UPDATE ON public.study_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at
  BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
