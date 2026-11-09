-- Week 2 (audit H3): daily limits on AI features, and teacher-only AI tools.
--
-- ai_limits says which roles may use each AI feature and how many times a day.
-- A feature/role pair with no row is not allowed. Change the numbers in the
-- Lovable table editor; no code change is needed.
-- Every AI edge function calls consume_ai_quota() before it calls the AI.

CREATE TABLE IF NOT EXISTS public.ai_limits (
  feature TEXT NOT NULL,
  role TEXT NOT NULL,
  daily_limit INTEGER NOT NULL CHECK (daily_limit >= 0),
  PRIMARY KEY (feature, role)
);

CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Kigali')::date,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, feature, day)
);

ALTER TABLE public.ai_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ai_limits, public.ai_usage TO authenticated;
GRANT ALL ON public.ai_limits, public.ai_usage TO service_role;

DROP POLICY IF EXISTS "Anyone signed in can read AI limits" ON public.ai_limits;
CREATE POLICY "Anyone signed in can read AI limits"
  ON public.ai_limits FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can see their own AI usage" ON public.ai_usage;
CREATE POLICY "Users can see their own AI usage"
  ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
-- No insert/update policies: usage is only counted by consume_ai_quota().

INSERT INTO public.ai_limits (feature, role, daily_limit) VALUES
  -- Study features, for everyone
  ('summarize-lecture', 'student', 40),
  ('summarize-lecture', 'teacher', 40),
  ('summarize-lecture', 'mentor', 40),
  ('summarize-lecture', 'school_admin', 40),
  -- AI marking of written exam answers (students trigger it once per exam; teachers re-mark)
  ('evaluate-subjective', 'student', 20),
  ('evaluate-subjective', 'teacher', 100),
  -- Teacher tools
  ('ai-question-generator', 'teacher', 30),
  ('generate-mcqs', 'teacher', 30),
  ('generate-exam', 'teacher', 15),
  ('generate-diagram-question', 'teacher', 20)
ON CONFLICT (feature, role) DO NOTHING;

-- Counts one use of an AI feature for the caller, or refuses.
-- Returns {allowed, used, limit}. Raises when the caller's role may not use the feature.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(_feature text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_limit integer;
  v_count integer;
  v_day date := (now() AT TIME ZONE 'Africa/Kigali')::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to use AI features';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE user_id = auth.uid();
  SELECT daily_limit INTO v_limit FROM ai_limits WHERE feature = _feature AND role = v_role;
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'AI_NOT_ALLOWED: This AI tool is not available for your account type';
  END IF;
  IF v_limit = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0);
  END IF;

  INSERT INTO ai_usage AS u (user_id, feature, day, count)
  VALUES (auth.uid(), _feature, v_day, 1)
  ON CONFLICT (user_id, feature, day)
  DO UPDATE SET count = u.count + 1
  WHERE u.count < v_limit
  RETURNING u.count INTO v_count;

  IF v_count IS NULL OR v_count > v_limit THEN
    -- Over the limit: nothing was counted.
    RETURN jsonb_build_object('allowed', false, 'used', v_limit, 'limit', v_limit);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'used', v_count, 'limit', v_limit);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_ai_quota(text) FROM anon;
