-- 1. Learning streaks
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  total_active_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own streak"
  ON public.user_streaks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users create their own streak"
  ON public.user_streaks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own streak"
  ON public.user_streaks FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Server-side streak bump (avoids client-side date tampering logic)
CREATE OR REPLACE FUNCTION public.touch_user_streak()
RETURNS public.user_streaks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.user_streaks;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_active_date, total_active_days)
  VALUES (_uid, 1, 1, CURRENT_DATE, 1)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _row FROM public.user_streaks WHERE user_id = _uid;

  IF _row.last_active_date IS DISTINCT FROM CURRENT_DATE THEN
    UPDATE public.user_streaks
    SET current_streak = CASE
          WHEN last_active_date = CURRENT_DATE - 1 THEN current_streak + 1
          ELSE 1
        END,
        total_active_days = total_active_days + 1,
        last_active_date = CURRENT_DATE
    WHERE user_id = _uid
    RETURNING * INTO _row;

    UPDATE public.user_streaks
    SET longest_streak = GREATEST(longest_streak, current_streak)
    WHERE user_id = _uid
    RETURNING * INTO _row;
  END IF;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_user_streak() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_user_streak() TO authenticated, service_role;

-- 2. Competition entries / leaderboard
CREATE TABLE public.competition_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (competition_id, student_id)
);

GRANT SELECT, INSERT, UPDATE ON public.competition_entries TO authenticated;
GRANT ALL ON public.competition_entries TO service_role;

ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users view competition entries"
  ON public.competition_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Students join competitions"
  ON public.competition_entries FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students update their own entry"
  ON public.competition_entries FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE TRIGGER update_competition_entries_updated_at
  BEFORE UPDATE ON public.competition_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_competition_entries_leaderboard
  ON public.competition_entries (competition_id, score DESC, time_taken_seconds ASC);

-- 3. Exam scheduling + proctoring settings
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS opens_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS closes_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS assigned_class TEXT,
  ADD COLUMN IF NOT EXISTS proctoring_settings JSONB NOT NULL DEFAULT '{"webcam": false, "tab_switch": true, "face_detection": false, "auto_submit_on_violation": true}'::jsonb;