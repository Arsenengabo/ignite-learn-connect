
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_threads_pair_order CHECK (user_a < user_b),
  CONSTRAINT dm_threads_pair_unique UNIQUE (user_a, user_b)
);

GRANT SELECT ON public.dm_threads TO authenticated;
GRANT ALL ON public.dm_threads TO service_role;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their threads"
ON public.dm_threads FOR SELECT TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_dm_messages_thread_created ON public.dm_messages(thread_id, created_at);
CREATE INDEX idx_dm_threads_user_a ON public.dm_threads(user_a, last_message_at DESC);
CREATE INDEX idx_dm_threads_user_b ON public.dm_threads(user_b, last_message_at DESC);

CREATE OR REPLACE FUNCTION public.is_dm_participant(_user_id uuid, _thread_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = _thread_id AND (_user_id = t.user_a OR _user_id = t.user_b)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) TO authenticated;

CREATE POLICY "Participants can read messages"
ON public.dm_messages FOR SELECT TO authenticated
USING (public.is_dm_participant(auth.uid(), thread_id));

CREATE POLICY "Participants can send messages"
ON public.dm_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_dm_participant(auth.uid(), thread_id));

CREATE TRIGGER update_dm_threads_updated_at
BEFORE UPDATE ON public.dm_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_dm_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.dm_threads SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dm_messages_bump_thread
AFTER INSERT ON public.dm_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_dm_thread();

-- Open or reuse a private conversation with another learner
CREATE OR REPLACE FUNCTION public.start_direct_chat(_other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid();
  v_a uuid; v_b uuid; v_id uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other_user_id IS NULL OR _other_user_id = v_me THEN RAISE EXCEPTION 'Invalid recipient'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _other_user_id) THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  v_a := LEAST(v_me, _other_user_id);
  v_b := GREATEST(v_me, _other_user_id);

  SELECT id INTO v_id FROM public.dm_threads WHERE user_a = v_a AND user_b = v_b;
  IF v_id IS NULL THEN
    INSERT INTO public.dm_threads (user_a, user_b) VALUES (v_a, v_b) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.start_direct_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_direct_chat(uuid) TO authenticated;

-- List my conversations with the other person's name
CREATE OR REPLACE FUNCTION public.list_direct_chats()
RETURNS TABLE(thread_id uuid, other_user_id uuid, other_name text, other_school text, last_message text, last_message_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.id,
    CASE WHEN t.user_a = auth.uid() THEN t.user_b ELSE t.user_a END,
    COALESCE(p.full_name, 'Student'),
    COALESCE(p.school_name, ''),
    (SELECT m.content FROM public.dm_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1),
    t.last_message_at
  FROM public.dm_threads t
  LEFT JOIN public.profiles p
    ON p.user_id = CASE WHEN t.user_a = auth.uid() THEN t.user_b ELSE t.user_a END
  WHERE auth.uid() IN (t.user_a, t.user_b)
  ORDER BY t.last_message_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.list_direct_chats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_direct_chats() TO authenticated;

-- Find students to connect with (own school or all schools)
CREATE OR REPLACE FUNCTION public.search_students(_query text DEFAULT '', _same_school_only boolean DEFAULT false)
RETURNS TABLE(user_id uuid, full_name text, school_name text, province text, district text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id,
         COALESCE(p.full_name, 'Student'),
         COALESCE(p.school_name, ''),
         COALESCE(p.province, ''),
         COALESCE(p.district, '')
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id <> auth.uid()
    AND public.has_role(p.user_id, 'student'::app_role)
    AND (COALESCE(_query,'') = '' OR p.full_name ILIKE '%' || _query || '%')
    AND (
      NOT COALESCE(_same_school_only, false)
      OR p.school_name = (SELECT me.school_name FROM public.profiles me WHERE me.user_id = auth.uid())
    )
  ORDER BY p.full_name
  LIMIT 50
$$;
REVOKE EXECUTE ON FUNCTION public.search_students(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_students(text, boolean) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
