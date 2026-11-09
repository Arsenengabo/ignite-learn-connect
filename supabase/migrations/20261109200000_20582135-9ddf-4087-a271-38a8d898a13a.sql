-- Daily AI usage limits (audit H3).
-- Each AI feature has a per-user daily limit. Only the server-side AI functions
-- (running with the service role) can count usage, so users cannot reset or raise
-- their own counters. Users can read their own usage to see what is left.

CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Kigali')::date,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, day)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;

DROP POLICY IF EXISTS "Users can see their own AI usage" ON public.ai_usage;
CREATE POLICY "Users can see their own AI usage"
  ON public.ai_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- No insert/update/delete policies: only consume_ai_quota() writes here.

-- Counts one use of a feature for today (Kigali time) if the user is under the limit.
-- Returns {allowed, used, limit}. Callable by the service role only.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(_user_id uuid, _feature text, _daily_limit integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Africa/Kigali')::date;
  v_count integer;
BEGIN
  IF _user_id IS NULL OR _feature IS NULL OR _daily_limit IS NULL OR _daily_limit < 1 THEN
    RAISE EXCEPTION 'Invalid quota request';
  END IF;

  INSERT INTO public.ai_usage AS u (user_id, feature, day, count, updated_at)
  VALUES (_user_id, _feature, v_today, 1, now())
  ON CONFLICT (user_id, feature, day)
  DO UPDATE SET count = u.count + 1, updated_at = now()
  WHERE u.count < _daily_limit
  RETURNING u.count INTO v_count;

  IF v_count IS NULL THEN
    SELECT count INTO v_count FROM public.ai_usage WHERE user_id = _user_id AND feature = _feature AND day = v_today;
    RETURN jsonb_build_object('allowed', false, 'used', v_count, 'limit', _daily_limit);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'used', v_count, 'limit', _daily_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text, integer) TO service_role;
