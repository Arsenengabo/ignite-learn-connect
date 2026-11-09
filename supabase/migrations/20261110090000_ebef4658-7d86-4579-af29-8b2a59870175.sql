-- Chat upgrade: safety tools, school rooms, class rooms and teacher posts.
--
-- * Every school gets one school room, visible only to its approved members.
-- * Teachers create class rooms for their school and add students to them.
-- * Teachers post Notes and Key points, pin them, and choose who may post
--   (everyone / students comment only / only teachers). They can mute a student.
-- * Anyone can delete their own messages, report a message and block a person.
--   Moderators (room teachers, school admins, Codex admins) remove messages; the
--   original text is kept in chat_moderation_log for review.
-- * Sending is rate limited, and private messages are limited to people who share
--   an approved school (or an approved mentor link).
--
-- Pattern (see AGENTS.md): caller-authorised SECURITY DEFINER functions live in the
-- private schema chat_private; the app calls SECURITY INVOKER wrappers in public.

CREATE SCHEMA IF NOT EXISTS chat_private;
REVOKE ALL ON SCHEMA chat_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA chat_private TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Columns on rooms and messages
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_channels DROP CONSTRAINT IF EXISTS chat_channels_channel_type_check;
ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_channel_type_check CHECK (
  channel_type IN ('teacher_general','teacher_school','student_general','student_school','school_room','class_room'));
ALTER TABLE public.chat_channels
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS posting_mode text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.chat_channels DROP CONSTRAINT IF EXISTS chat_channels_posting_mode_check;
ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_posting_mode_check
  CHECK (posting_mode IN ('everyone','comments_only','teachers_only'));
ALTER TABLE public.chat_channels DROP CONSTRAINT IF EXISTS chat_channels_room_school_check;
ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_room_school_check
  CHECK (channel_type NOT IN ('school_room','class_room') OR school_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS chat_channels_one_school_room ON public.chat_channels(school_id) WHERE channel_type = 'school_room';
CREATE INDEX IF NOT EXISTS idx_chat_channels_school ON public.chat_channels(school_id);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS post_kind text NOT NULL DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comments_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_post_kind_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_post_kind_check CHECK (post_kind IN ('message','note','key_points'));
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent ON public.chat_messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created ON public.chat_messages(sender_id, created_at DESC);

ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender_created ON public.dm_messages(sender_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. New tables (written only through the functions below)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_room_members (
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_role text NOT NULL DEFAULT 'student' CHECK (member_role IN ('teacher','student')),
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON public.chat_room_members(user_id);

CREATE TABLE IF NOT EXISTS public.chat_mutes (
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  muted_until timestamptz NOT NULL,
  muted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

CREATE TABLE IF NOT EXISTS public.chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  channel_id uuid REFERENCES public.chat_channels(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  dm_message_id uuid REFERENCES public.dm_messages(id) ON DELETE SET NULL,
  reported_user_id uuid,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('bullying','harassment','inappropriate','spam','safety','other')),
  details text NOT NULL DEFAULT '',
  message_snapshot text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolution text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS chat_reports_once_per_message ON public.chat_reports(reporter_id, message_id) WHERE message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS chat_reports_once_per_dm ON public.chat_reports(reporter_id, dm_message_id) WHERE dm_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON public.chat_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_id uuid,
  channel_id uuid,
  message_id uuid,
  dm_message_id uuid,
  target_user_id uuid,
  original_text text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_moderation_log_channel ON public.chat_moderation_log(channel_id, created_at DESC);

ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_moderation_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.chat_room_members, public.chat_mutes, public.user_blocks, public.chat_reports TO authenticated;
GRANT ALL ON public.chat_room_members, public.chat_mutes, public.user_blocks, public.chat_reports, public.chat_moderation_log TO service_role;
REVOKE ALL ON public.chat_moderation_log FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Private helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION chat_private.is_school_member(_user uuid, _school uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members m JOIN public.schools s ON s.id = m.school_id
    WHERE m.user_id = _user AND m.school_id = _school AND m.status = 'approved' AND s.is_active)
$$;

CREATE OR REPLACE FUNCTION chat_private.is_school_teacher(_user uuid, _school uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members m
    JOIN public.schools s ON s.id = m.school_id
    JOIN public.profiles p ON p.user_id = m.user_id
    WHERE m.user_id = _user AND m.school_id = _school AND m.status = 'approved' AND s.is_active
      AND m.member_role = 'teacher' AND p.verification_status = 'verified'
      AND public.has_role(_user, 'teacher'::public.app_role))
$$;

CREATE OR REPLACE FUNCTION chat_private.share_school(_a uuid, _b uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ma.school_id
  FROM public.school_members ma
  JOIN public.school_members mb ON mb.school_id = ma.school_id AND mb.user_id = _b AND mb.status = 'approved'
  JOIN public.schools s ON s.id = ma.school_id AND s.is_active
  WHERE ma.user_id = _a AND ma.status = 'approved'
  ORDER BY ma.created_at
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION chat_private.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_blocks
                 WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a))
$$;

-- Private messages: same approved school, or an approved mentor link. Never when blocked.
CREATE OR REPLACE FUNCTION chat_private.can_direct_message(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _a IS NOT NULL AND _b IS NOT NULL AND _a <> _b
    AND NOT chat_private.is_blocked_between(_a, _b)
    AND (chat_private.share_school(_a, _b) IS NOT NULL
         OR EXISTS (SELECT 1 FROM public.mentor_enrollments e WHERE e.status = 'approved'
                    AND ((e.mentor_id = _a AND e.student_id = _b) OR (e.mentor_id = _b AND e.student_id = _a))))
$$;

CREATE OR REPLACE FUNCTION chat_private.can_moderate_room(_user uuid, _channel uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN c.channel_type = 'school_room' THEN
        public.is_school_admin(_user, c.school_id) OR chat_private.is_school_teacher(_user, c.school_id)
      WHEN c.channel_type = 'class_room' THEN
        public.is_school_admin(_user, c.school_id)
        OR (chat_private.is_school_teacher(_user, c.school_id)
            AND EXISTS (SELECT 1 FROM public.chat_room_members r
                        WHERE r.channel_id = c.id AND r.user_id = _user AND r.member_role = 'teacher'))
      ELSE public.is_platform_admin(_user)
    END
    FROM public.chat_channels c WHERE c.id = _channel), false)
$$;

CREATE OR REPLACE FUNCTION chat_private.can_view_room(_user uuid, _channel uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND COALESCE((
    SELECT CASE
      WHEN c.is_archived THEN chat_private.can_moderate_room(_user, c.id)
      WHEN c.channel_type LIKE 'teacher_%' THEN
        public.has_role(_user, 'teacher'::public.app_role) OR public.is_platform_admin(_user)
      WHEN c.channel_type LIKE 'student_%' THEN
        public.has_role(_user, 'student'::public.app_role) OR public.is_platform_admin(_user)
      WHEN c.channel_type = 'school_room' THEN chat_private.is_school_member(_user, c.school_id)
      WHEN c.channel_type = 'class_room' THEN
        public.is_school_admin(_user, c.school_id)
        OR (chat_private.is_school_member(_user, c.school_id)
            AND EXISTS (SELECT 1 FROM public.chat_room_members r WHERE r.channel_id = c.id AND r.user_id = _user))
      ELSE false
    END
    FROM public.chat_channels c WHERE c.id = _channel), false)
$$;

-- Rate limit: at most 20 messages a minute (rooms and private messages together).
CREATE OR REPLACE FUNCTION chat_private.check_send_rate(_user uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.chat_messages WHERE sender_id = _user AND created_at > now() - interval '1 minute')
   + (SELECT count(*) FROM public.dm_messages WHERE sender_id = _user AND created_at > now() - interval '1 minute') >= 20 THEN
    RAISE EXCEPTION 'You are sending messages too fast. Please wait a minute and try again.';
  END IF;
END $$;

-- Explains, in plain words, why a message can't be posted.
CREATE OR REPLACE FUNCTION chat_private.assert_can_post(_user uuid, _channel uuid, _kind text, _parent uuid, _pinned boolean)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room public.chat_channels%ROWTYPE;
  v_parent public.chat_messages%ROWTYPE;
  v_mod boolean;
  v_until timestamptz;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_room FROM public.chat_channels WHERE id = _channel;
  IF NOT FOUND OR NOT chat_private.can_view_room(_user, _channel) THEN
    RAISE EXCEPTION 'You are not a member of this room';
  END IF;
  v_mod := chat_private.can_moderate_room(_user, _channel);
  SELECT muted_until INTO v_until FROM public.chat_mutes
   WHERE channel_id = _channel AND user_id = _user AND muted_until > now();
  IF v_until IS NOT NULL AND NOT v_mod THEN
    RAISE EXCEPTION 'A teacher has paused your messages in this room until %',
      to_char(v_until AT TIME ZONE 'Africa/Kigali', 'DD Mon HH24:MI');
  END IF;
  IF COALESCE(_kind, 'message') NOT IN ('message','note','key_points') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
  IF COALESCE(_kind, 'message') <> 'message' AND NOT v_mod THEN
    RAISE EXCEPTION 'Only teachers can post notes and key points';
  END IF;
  IF COALESCE(_pinned, false) AND NOT v_mod THEN RAISE EXCEPTION 'Only teachers can pin posts'; END IF;

  IF _parent IS NOT NULL THEN
    SELECT * INTO v_parent FROM public.chat_messages WHERE id = _parent;
    IF NOT FOUND OR v_parent.channel_id <> _channel OR v_parent.parent_id IS NOT NULL OR v_parent.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'This post is no longer available';
    END IF;
    IF COALESCE(_kind, 'message') <> 'message' THEN RAISE EXCEPTION 'Comments must be plain messages'; END IF;
    IF NOT v_mod AND (NOT v_parent.comments_open OR v_room.posting_mode = 'teachers_only') THEN
      RAISE EXCEPTION 'Comments are turned off for this post';
    END IF;
  ELSIF NOT v_mod AND v_room.posting_mode = 'comments_only' THEN
    RAISE EXCEPTION 'Only teachers can start posts in this room. You can comment on their posts.';
  ELSIF NOT v_mod AND v_room.posting_mode = 'teachers_only' THEN
    RAISE EXCEPTION 'Only teachers can post in this room.';
  END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION chat_private.assert_can_send_dm(_user uuid, _thread uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_other uuid;
BEGIN
  SELECT CASE WHEN t.user_a = _user THEN t.user_b ELSE t.user_a END INTO v_other
    FROM public.dm_threads t WHERE t.id = _thread AND _user IN (t.user_a, t.user_b);
  IF v_other IS NULL THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  IF chat_private.is_blocked_between(_user, v_other) THEN
    RAISE EXCEPTION 'You can''t message this person.';
  END IF;
  IF NOT chat_private.can_direct_message(_user, v_other) THEN
    RAISE EXCEPTION 'Private messages are only open between members of the same school.';
  END IF;
  RETURN true;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Row-level security on rooms and messages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view channels based on role" ON public.chat_channels;
DROP POLICY IF EXISTS "Members can view their rooms" ON public.chat_channels;
CREATE POLICY "Members can view their rooms" ON public.chat_channels FOR SELECT TO authenticated
  USING (chat_private.can_view_room(auth.uid(), id));

DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to accessible channels" ON public.chat_messages;
DROP POLICY IF EXISTS "Room members can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Room members can send messages" ON public.chat_messages;
CREATE POLICY "Room members can read messages" ON public.chat_messages FOR SELECT TO authenticated
  USING (chat_private.can_view_room(auth.uid(), channel_id));
CREATE POLICY "Room members can send messages" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND chat_private.can_view_room(auth.uid(), channel_id));

DROP POLICY IF EXISTS "See your own room memberships, moderators see the room" ON public.chat_room_members;
CREATE POLICY "See your own room memberships, moderators see the room" ON public.chat_room_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR chat_private.can_moderate_room(auth.uid(), channel_id));
DROP POLICY IF EXISTS "See your own mutes, moderators see the room" ON public.chat_mutes;
CREATE POLICY "See your own mutes, moderators see the room" ON public.chat_mutes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR chat_private.can_moderate_room(auth.uid(), channel_id));
DROP POLICY IF EXISTS "See who you blocked" ON public.user_blocks;
CREATE POLICY "See who you blocked" ON public.user_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());
DROP POLICY IF EXISTS "See reports you made" ON public.chat_reports;
CREATE POLICY "See reports you made" ON public.chat_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Browser inserts: tidy the text, block forged fields, apply room rules and the rate limit.
-- SECURITY INVOKER on purpose: current_user tells browser writes apart from server functions.
CREATE OR REPLACE FUNCTION public.guard_chat_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF NEW.sender_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'You can only send messages as yourself'; END IF;
  NEW.message := btrim(COALESCE(NEW.message, ''));
  NEW.post_kind := COALESCE(NEW.post_kind, 'message');
  NEW.title := CASE WHEN NEW.post_kind = 'message' THEN NULL ELSE NULLIF(btrim(COALESCE(NEW.title, '')), '') END;
  IF NEW.message = '' THEN RAISE EXCEPTION 'Message cannot be empty'; END IF;
  IF char_length(NEW.message) > 4000 THEN RAISE EXCEPTION 'Message is too long (4,000 characters at most)'; END IF;
  IF char_length(COALESCE(NEW.title, '')) > 120 THEN RAISE EXCEPTION 'Title is too long (120 characters at most)'; END IF;
  NEW.deleted_at := NULL;
  NEW.deleted_by := NULL;
  NEW.comments_open := true;
  NEW.message_type := 'text';
  NEW.file_url := NULL;
  NEW.created_at := now();
  NEW.updated_at := now();
  PERFORM chat_private.assert_can_post(auth.uid(), NEW.channel_id, NEW.post_kind, NEW.parent_id, NEW.is_pinned);
  PERFORM chat_private.check_send_rate(auth.uid());
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_chat_message_insert ON public.chat_messages;
CREATE TRIGGER guard_chat_message_insert BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_chat_message_insert();

CREATE OR REPLACE FUNCTION public.guard_dm_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF NEW.sender_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'You can only send messages as yourself'; END IF;
  NEW.content := btrim(COALESCE(NEW.content, ''));
  IF NEW.content = '' THEN RAISE EXCEPTION 'Message cannot be empty'; END IF;
  IF char_length(NEW.content) > 2000 THEN RAISE EXCEPTION 'Message is too long (2,000 characters at most)'; END IF;
  NEW.deleted_at := NULL;
  NEW.deleted_by := NULL;
  NEW.created_at := now();
  PERFORM chat_private.assert_can_send_dm(auth.uid(), NEW.thread_id);
  PERFORM chat_private.check_send_rate(auth.uid());
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_dm_message_insert ON public.dm_messages;
CREATE TRIGGER guard_dm_message_insert BEFORE INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_dm_message_insert();

-- ---------------------------------------------------------------------------
-- 5. School rooms: one per school, created automatically
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION chat_private.sync_school_room()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.chat_channels (name, description, channel_type, school_id, school_name, is_premium, created_by)
    SELECT NEW.name, 'Everyone at ' || NEW.name || ': teachers, students and staff', 'school_room', NEW.id, NEW.name, false, NEW.created_by
    WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = NEW.created_by)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.chat_channels
       SET name = NEW.name, school_name = NEW.name,
           description = 'Everyone at ' || NEW.name || ': teachers, students and staff', updated_at = now()
     WHERE school_id = NEW.id AND channel_type = 'school_room';
    UPDATE public.chat_channels SET school_name = NEW.name, updated_at = now()
     WHERE school_id = NEW.id AND channel_type = 'class_room';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_school_room ON public.schools;
CREATE TRIGGER sync_school_room AFTER INSERT OR UPDATE OF name ON public.schools
  FOR EACH ROW EXECUTE FUNCTION chat_private.sync_school_room();

INSERT INTO public.chat_channels (name, description, channel_type, school_id, school_name, is_premium, created_by)
SELECT s.name, 'Everyone at ' || s.name || ': teachers, students and staff', 'school_room', s.id, s.name, false, s.created_by
FROM public.schools s
WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = s.created_by)
  AND NOT EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.school_id = s.id AND c.channel_type = 'school_room');

-- ---------------------------------------------------------------------------
-- 6. Private, caller-authorised functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION chat_private.log_action(_action text, _channel uuid, _message uuid, _dm uuid, _target uuid, _text text, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.chat_moderation_log (action, actor_id, channel_id, message_id, dm_message_id, target_user_id, original_text, details)
  VALUES (_action, auth.uid(), _channel, _message, _dm, _target, _text, COALESCE(_details, '{}'::jsonb))
$$;

CREATE OR REPLACE FUNCTION chat_private.list_my_rooms()
RETURNS TABLE(id uuid, name text, description text, channel_type text, school_id uuid, school_name text,
              posting_mode text, can_moderate boolean, member_count integer, last_message_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.description, c.channel_type, c.school_id,
         COALESCE(s.name, c.school_name, ''),
         c.posting_mode,
         chat_private.can_moderate_room(auth.uid(), c.id),
         CASE WHEN c.channel_type = 'class_room'
              THEN (SELECT count(*)::int FROM public.chat_room_members r WHERE r.channel_id = c.id)
              WHEN c.channel_type = 'school_room'
              THEN (SELECT count(*)::int FROM public.school_members m WHERE m.school_id = c.school_id AND m.status = 'approved')
              ELSE NULL END,
         (SELECT max(m.created_at) FROM public.chat_messages m WHERE m.channel_id = c.id)
  FROM public.chat_channels c
  LEFT JOIN public.schools s ON s.id = c.school_id
  WHERE auth.uid() IS NOT NULL AND NOT c.is_archived AND chat_private.can_view_room(auth.uid(), c.id)
  ORDER BY CASE c.channel_type WHEN 'class_room' THEN 0 WHEN 'school_room' THEN 1 ELSE 2 END, c.name
$$;

CREATE OR REPLACE FUNCTION chat_private.list_room_messages(_channel_id uuid, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, channel_id uuid, sender_id uuid, sender_name text, sender_is_teacher boolean,
              message text, post_kind text, title text, parent_id uuid, is_pinned boolean,
              comments_open boolean, is_deleted boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT chat_private.can_view_room(auth.uid(), _channel_id) THEN RAISE EXCEPTION 'You are not a member of this room'; END IF;
  RETURN QUERY
  SELECT m.id, m.channel_id, m.sender_id, COALESCE(p.full_name, 'Member'),
         public.has_role(m.sender_id, 'teacher'::public.app_role),
         CASE WHEN m.deleted_at IS NULL THEN m.message ELSE '' END,
         m.post_kind, CASE WHEN m.deleted_at IS NULL THEN m.title ELSE NULL END,
         m.parent_id, m.is_pinned AND m.deleted_at IS NULL, m.comments_open, m.deleted_at IS NOT NULL, m.created_at
  FROM (
    SELECT x.* FROM public.chat_messages x
    WHERE x.channel_id = _channel_id
    ORDER BY x.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(_limit, 200), 1), 500)
  ) m
  LEFT JOIN public.profiles p ON p.user_id = m.sender_id
  WHERE NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = m.sender_id)
  UNION
  SELECT m.id, m.channel_id, m.sender_id, COALESCE(p.full_name, 'Member'),
         public.has_role(m.sender_id, 'teacher'::public.app_role),
         m.message, m.post_kind, m.title, m.parent_id, true, m.comments_open, false, m.created_at
  FROM public.chat_messages m
  LEFT JOIN public.profiles p ON p.user_id = m.sender_id
  WHERE m.channel_id = _channel_id AND m.is_pinned AND m.deleted_at IS NULL
  ORDER BY 13;
END $$;

CREATE OR REPLACE FUNCTION chat_private.delete_chat_message(_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg public.chat_messages%ROWTYPE; v_mod boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_msg FROM public.chat_messages WHERE id = _message_id FOR UPDATE;
  IF NOT FOUND OR NOT chat_private.can_view_room(auth.uid(), v_msg.channel_id) THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF v_msg.deleted_at IS NOT NULL THEN RETURN jsonb_build_object('success', true); END IF;
  v_mod := chat_private.can_moderate_room(auth.uid(), v_msg.channel_id);
  IF v_msg.sender_id <> auth.uid() AND NOT v_mod THEN RAISE EXCEPTION 'You can only delete your own messages'; END IF;
  PERFORM chat_private.log_action(CASE WHEN v_msg.sender_id = auth.uid() THEN 'delete_own' ELSE 'remove' END,
    v_msg.channel_id, v_msg.id, NULL, v_msg.sender_id,
    COALESCE(v_msg.title || E'\n', '') || v_msg.message, '{}'::jsonb);
  UPDATE public.chat_messages
     SET message = '', title = NULL, is_pinned = false, deleted_at = now(), deleted_by = auth.uid(), updated_at = now()
   WHERE id = _message_id;
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION chat_private.set_message_pinned(_message_id uuid, _pinned boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg public.chat_messages%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.chat_messages WHERE id = _message_id FOR UPDATE;
  IF NOT FOUND OR NOT chat_private.can_moderate_room(auth.uid(), v_msg.channel_id) THEN RAISE EXCEPTION 'Only teachers can pin posts'; END IF;
  IF v_msg.parent_id IS NOT NULL OR v_msg.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'This message can''t be pinned'; END IF;
  UPDATE public.chat_messages SET is_pinned = COALESCE(_pinned, false), updated_at = now() WHERE id = _message_id;
  PERFORM chat_private.log_action(CASE WHEN _pinned THEN 'pin' ELSE 'unpin' END, v_msg.channel_id, v_msg.id, NULL, v_msg.sender_id, NULL);
  RETURN jsonb_build_object('success', true, 'is_pinned', COALESCE(_pinned, false));
END $$;

CREATE OR REPLACE FUNCTION chat_private.set_post_comments(_message_id uuid, _open boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg public.chat_messages%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.chat_messages WHERE id = _message_id FOR UPDATE;
  IF NOT FOUND OR NOT chat_private.can_moderate_room(auth.uid(), v_msg.channel_id) THEN RAISE EXCEPTION 'Only teachers can change comments'; END IF;
  IF v_msg.parent_id IS NOT NULL THEN RAISE EXCEPTION 'Comments can only be changed on a post'; END IF;
  UPDATE public.chat_messages SET comments_open = COALESCE(_open, true), updated_at = now() WHERE id = _message_id;
  PERFORM chat_private.log_action(CASE WHEN _open THEN 'comments_on' ELSE 'comments_off' END, v_msg.channel_id, v_msg.id, NULL, NULL, NULL);
  RETURN jsonb_build_object('success', true, 'comments_open', COALESCE(_open, true));
END $$;

CREATE OR REPLACE FUNCTION chat_private.set_room_posting_mode(_channel_id uuid, _mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT chat_private.can_moderate_room(auth.uid(), _channel_id) THEN RAISE EXCEPTION 'Only teachers can change who can post'; END IF;
  IF _mode NOT IN ('everyone','comments_only','teachers_only') THEN RAISE EXCEPTION 'Invalid posting setting'; END IF;
  UPDATE public.chat_channels SET posting_mode = _mode, updated_at = now() WHERE id = _channel_id;
  PERFORM chat_private.log_action('posting_mode', _channel_id, NULL, NULL, NULL, NULL, jsonb_build_object('mode', _mode));
  RETURN jsonb_build_object('success', true, 'posting_mode', _mode);
END $$;

CREATE OR REPLACE FUNCTION chat_private.list_my_teaching_schools()
RETURNS TABLE(school_id uuid, school_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name FROM public.schools s
  WHERE auth.uid() IS NOT NULL AND s.is_active
    AND (chat_private.is_school_teacher(auth.uid(), s.id) OR public.is_school_admin(auth.uid(), s.id))
  ORDER BY s.name
$$;

CREATE OR REPLACE FUNCTION chat_private.create_class_room(_school_id uuid, _name text, _description text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_name text := btrim(COALESCE(_name, '')); v_teacher boolean; v_school text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_teacher := chat_private.is_school_teacher(auth.uid(), _school_id);
  IF NOT v_teacher AND NOT public.is_school_admin(auth.uid(), _school_id) THEN
    RAISE EXCEPTION 'Only approved teachers of this school can create class rooms';
  END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 80 THEN RAISE EXCEPTION 'Give the class a name (2 to 80 characters)'; END IF;
  IF (SELECT count(*) FROM public.chat_channels WHERE created_by = auth.uid() AND channel_type = 'class_room' AND NOT is_archived) >= 50 THEN
    RAISE EXCEPTION 'You already have 50 class rooms. Archive one before creating another.';
  END IF;
  SELECT name INTO v_school FROM public.schools WHERE id = _school_id;
  INSERT INTO public.chat_channels (name, description, channel_type, school_id, school_name, is_premium, created_by, posting_mode)
  VALUES (v_name, left(btrim(COALESCE(_description, '')), 300), 'class_room', _school_id, v_school, false, auth.uid(), 'comments_only')
  RETURNING id INTO v_id;
  IF v_teacher THEN
    INSERT INTO public.chat_room_members (channel_id, user_id, member_role, added_by) VALUES (v_id, auth.uid(), 'teacher', auth.uid());
  END IF;
  PERFORM chat_private.log_action('create_room', v_id, NULL, NULL, NULL, NULL, jsonb_build_object('name', v_name));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION chat_private.archive_class_room(_channel_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.chat_channels WHERE id = _channel_id AND channel_type = 'class_room')
     OR NOT chat_private.can_moderate_room(auth.uid(), _channel_id) THEN
    RAISE EXCEPTION 'Only the class teacher can archive this room';
  END IF;
  UPDATE public.chat_channels SET is_archived = true, updated_at = now() WHERE id = _channel_id;
  PERFORM chat_private.log_action('archive_room', _channel_id, NULL, NULL, NULL, NULL);
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION chat_private.list_room_members(_channel_id uuid)
RETURNS TABLE(user_id uuid, full_name text, member_role text, muted_until timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT chat_private.can_moderate_room(auth.uid(), _channel_id) THEN RAISE EXCEPTION 'Only teachers can see the member list'; END IF;
  RETURN QUERY
  SELECT r.user_id, COALESCE(p.full_name, 'Member'), r.member_role,
         (SELECT mu.muted_until FROM public.chat_mutes mu WHERE mu.channel_id = _channel_id AND mu.user_id = r.user_id AND mu.muted_until > now())
  FROM public.chat_room_members r LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.channel_id = _channel_id
  ORDER BY r.member_role, p.full_name;
END $$;

CREATE OR REPLACE FUNCTION chat_private.list_room_candidates(_channel_id uuid, _query text DEFAULT '')
RETURNS TABLE(user_id uuid, full_name text, member_role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid;
BEGIN
  SELECT c.school_id INTO v_school FROM public.chat_channels c WHERE c.id = _channel_id AND c.channel_type = 'class_room';
  IF v_school IS NULL OR NOT chat_private.can_moderate_room(auth.uid(), _channel_id) THEN
    RAISE EXCEPTION 'Only the class teacher can add members';
  END IF;
  RETURN QUERY
  SELECT m.user_id, COALESCE(p.full_name, 'Member'), m.member_role
  FROM public.school_members m LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.school_id = v_school AND m.status = 'approved' AND m.member_role IN ('teacher','student')
    AND NOT EXISTS (SELECT 1 FROM public.chat_room_members r WHERE r.channel_id = _channel_id AND r.user_id = m.user_id)
    AND (COALESCE(_query, '') = '' OR p.full_name ILIKE '%' || _query || '%')
  ORDER BY m.member_role DESC, p.full_name
  LIMIT 300;
END $$;

CREATE OR REPLACE FUNCTION chat_private.add_room_members(_channel_id uuid, _user_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_count integer;
BEGIN
  SELECT c.school_id INTO v_school FROM public.chat_channels c WHERE c.id = _channel_id AND c.channel_type = 'class_room';
  IF v_school IS NULL OR NOT chat_private.can_moderate_room(auth.uid(), _channel_id) THEN
    RAISE EXCEPTION 'Only the class teacher can add members';
  END IF;
  IF COALESCE(array_length(_user_ids, 1), 0) > 500 THEN RAISE EXCEPTION 'Add at most 500 people at a time'; END IF;
  INSERT INTO public.chat_room_members (channel_id, user_id, member_role, added_by)
  SELECT _channel_id, m.user_id, m.member_role, auth.uid()
  FROM public.school_members m
  WHERE m.school_id = v_school AND m.status = 'approved' AND m.member_role IN ('teacher','student')
    AND m.user_id = ANY (COALESCE(_user_ids, ARRAY[]::uuid[]))
  ON CONFLICT (channel_id, user_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM chat_private.log_action('add_members', _channel_id, NULL, NULL, NULL, NULL, jsonb_build_object('added', v_count));
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION chat_private.remove_room_member(_channel_id uuid, _user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room public.chat_channels%ROWTYPE;
BEGIN
  SELECT * INTO v_room FROM public.chat_channels WHERE id = _channel_id AND channel_type = 'class_room';
  IF NOT FOUND OR NOT chat_private.can_moderate_room(auth.uid(), _channel_id) THEN
    RAISE EXCEPTION 'Only the class teacher can remove members';
  END IF;
  IF _user_id = v_room.created_by AND NOT public.is_school_admin(auth.uid(), v_room.school_id) THEN
    RAISE EXCEPTION 'The teacher who created the class can''t be removed';
  END IF;
  DELETE FROM public.chat_room_members WHERE channel_id = _channel_id AND user_id = _user_id;
  PERFORM chat_private.log_action('remove_member', _channel_id, NULL, NULL, _user_id, NULL);
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION chat_private.mute_room_member(_channel_id uuid, _user_id uuid, _minutes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_until timestamptz;
BEGIN
  IF NOT chat_private.can_moderate_room(auth.uid(), _channel_id) THEN RAISE EXCEPTION 'Only teachers can pause messages'; END IF;
  IF _user_id = auth.uid() OR chat_private.can_moderate_room(_user_id, _channel_id) THEN
    RAISE EXCEPTION 'Teachers can''t be paused';
  END IF;
  IF NOT chat_private.can_view_room(_user_id, _channel_id) THEN RAISE EXCEPTION 'This person is not in the room'; END IF;
  IF COALESCE(_minutes, 0) <= 0 THEN
    DELETE FROM public.chat_mutes WHERE channel_id = _channel_id AND user_id = _user_id;
    PERFORM chat_private.log_action('unmute', _channel_id, NULL, NULL, _user_id, NULL);
    RETURN jsonb_build_object('success', true, 'muted_until', NULL);
  END IF;
  v_until := now() + make_interval(mins => LEAST(_minutes, 10080));
  INSERT INTO public.chat_mutes (channel_id, user_id, muted_until, muted_by)
  VALUES (_channel_id, _user_id, v_until, auth.uid())
  ON CONFLICT (channel_id, user_id) DO UPDATE SET muted_until = EXCLUDED.muted_until, muted_by = EXCLUDED.muted_by, created_at = now();
  PERFORM chat_private.log_action('mute', _channel_id, NULL, NULL, _user_id, NULL, jsonb_build_object('minutes', LEAST(_minutes, 10080)));
  RETURN jsonb_build_object('success', true, 'muted_until', v_until);
END $$;

CREATE OR REPLACE FUNCTION chat_private.block_user(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _user_id IS NULL OR _user_id = auth.uid() THEN RAISE EXCEPTION 'You can''t block yourself'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN RAISE EXCEPTION 'Person not found'; END IF;
  INSERT INTO public.user_blocks (blocker_id, blocked_id) VALUES (auth.uid(), _user_id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION chat_private.unblock_user(_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (DELETE FROM public.user_blocks WHERE blocker_id = auth.uid() AND blocked_id = _user_id RETURNING 1)
  SELECT jsonb_build_object('success', true)
$$;

CREATE OR REPLACE FUNCTION chat_private.list_blocked_users()
RETURNS TABLE(user_id uuid, full_name text, blocked_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.blocked_id, COALESCE(p.full_name, 'Member'), b.created_at
  FROM public.user_blocks b LEFT JOIN public.profiles p ON p.user_id = b.blocked_id
  WHERE b.blocker_id = auth.uid()
  ORDER BY b.created_at DESC
$$;

CREATE OR REPLACE FUNCTION chat_private.report_chat_message(_message_id uuid, _reason text, _details text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg public.chat_messages%ROWTYPE; v_school uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_msg FROM public.chat_messages WHERE id = _message_id;
  IF NOT FOUND OR NOT chat_private.can_view_room(auth.uid(), v_msg.channel_id) THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF v_msg.sender_id = auth.uid() THEN RAISE EXCEPTION 'You can''t report your own message'; END IF;
  IF _reason NOT IN ('bullying','harassment','inappropriate','spam','safety','other') THEN RAISE EXCEPTION 'Choose a reason'; END IF;
  SELECT school_id INTO v_school FROM public.chat_channels WHERE id = v_msg.channel_id;
  INSERT INTO public.chat_reports (reporter_id, channel_id, message_id, reported_user_id, school_id, reason, details, message_snapshot)
  VALUES (auth.uid(), v_msg.channel_id, v_msg.id, v_msg.sender_id, v_school, _reason, left(COALESCE(_details, ''), 1000),
          COALESCE(v_msg.title || E'\n', '') || v_msg.message)
  ON CONFLICT (reporter_id, message_id) WHERE message_id IS NOT NULL
  DO UPDATE SET reason = EXCLUDED.reason, details = EXCLUDED.details
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION chat_private.report_direct_message(_dm_message_id uuid, _reason text, _details text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg public.dm_messages%ROWTYPE; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_msg FROM public.dm_messages WHERE id = _dm_message_id;
  IF NOT FOUND OR NOT public.is_dm_participant(auth.uid(), v_msg.thread_id) THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF v_msg.sender_id = auth.uid() THEN RAISE EXCEPTION 'You can''t report your own message'; END IF;
  IF _reason NOT IN ('bullying','harassment','inappropriate','spam','safety','other') THEN RAISE EXCEPTION 'Choose a reason'; END IF;
  INSERT INTO public.chat_reports (reporter_id, dm_message_id, reported_user_id, school_id, reason, details, message_snapshot)
  VALUES (auth.uid(), v_msg.id, v_msg.sender_id, chat_private.share_school(auth.uid(), v_msg.sender_id), _reason,
          left(COALESCE(_details, ''), 1000), v_msg.content)
  ON CONFLICT (reporter_id, dm_message_id) WHERE dm_message_id IS NOT NULL
  DO UPDATE SET reason = EXCLUDED.reason, details = EXCLUDED.details
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Who reviews a report: Codex admins (all), school admins (their school), room teachers (their room).
CREATE OR REPLACE FUNCTION chat_private.can_review_report(_user uuid, _report uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_reports r WHERE r.id = _report AND (
      public.is_platform_admin(_user)
      OR (r.school_id IS NOT NULL AND public.is_school_admin(_user, r.school_id))
      OR (r.channel_id IS NOT NULL AND r.school_id IS NOT NULL AND chat_private.can_moderate_room(_user, r.channel_id))))
$$;

CREATE OR REPLACE FUNCTION chat_private.list_chat_reports(_status text DEFAULT 'open')
RETURNS TABLE(id uuid, created_at timestamptz, source text, reason text, details text, message_snapshot text,
              status text, room_name text, school_name text, reporter_name text, reported_user_id uuid,
              reported_name text, message_removed boolean, resolution text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.created_at,
         CASE WHEN r.dm_message_id IS NOT NULL THEN 'direct' ELSE 'room' END,
         r.reason, r.details, r.message_snapshot, r.status,
         COALESCE(c.name, CASE WHEN r.dm_message_id IS NOT NULL THEN 'Private message' ELSE 'Room' END),
         COALESCE(s.name, ''),
         COALESCE(rp.full_name, 'Member'), r.reported_user_id, COALESCE(tp.full_name, 'Member'),
         COALESCE(cm.deleted_at IS NOT NULL, dm.deleted_at IS NOT NULL, true),
         r.resolution
  FROM public.chat_reports r
  LEFT JOIN public.chat_channels c ON c.id = r.channel_id
  LEFT JOIN public.schools s ON s.id = r.school_id
  LEFT JOIN public.profiles rp ON rp.user_id = r.reporter_id
  LEFT JOIN public.profiles tp ON tp.user_id = r.reported_user_id
  LEFT JOIN public.chat_messages cm ON cm.id = r.message_id
  LEFT JOIN public.dm_messages dm ON dm.id = r.dm_message_id
  WHERE auth.uid() IS NOT NULL
    AND (COALESCE(_status, 'open') = 'all' OR r.status = COALESCE(_status, 'open'))
    AND chat_private.can_review_report(auth.uid(), r.id)
  ORDER BY r.created_at DESC
  LIMIT 200
$$;

CREATE OR REPLACE FUNCTION chat_private.resolve_chat_report(_report_id uuid, _action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_report public.chat_reports%ROWTYPE; v_text text;
BEGIN
  IF _action NOT IN ('dismiss','resolve','remove') THEN RAISE EXCEPTION 'Invalid action'; END IF;
  SELECT * INTO v_report FROM public.chat_reports WHERE id = _report_id FOR UPDATE;
  IF NOT FOUND OR NOT chat_private.can_review_report(auth.uid(), _report_id) THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF v_report.reporter_id = auth.uid() AND NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Someone else needs to review a report you made';
  END IF;
  IF _action = 'remove' THEN
    IF v_report.message_id IS NOT NULL THEN
      SELECT COALESCE(title || E'\n', '') || message INTO v_text FROM public.chat_messages WHERE id = v_report.message_id AND deleted_at IS NULL;
      UPDATE public.chat_messages SET message = '', title = NULL, is_pinned = false, deleted_at = now(), deleted_by = auth.uid(), updated_at = now()
       WHERE id = v_report.message_id AND deleted_at IS NULL;
    ELSIF v_report.dm_message_id IS NOT NULL THEN
      SELECT content INTO v_text FROM public.dm_messages WHERE id = v_report.dm_message_id AND deleted_at IS NULL;
      UPDATE public.dm_messages SET content = '', deleted_at = now(), deleted_by = auth.uid()
       WHERE id = v_report.dm_message_id AND deleted_at IS NULL;
    END IF;
    PERFORM chat_private.log_action('remove', v_report.channel_id, v_report.message_id, v_report.dm_message_id,
                                    v_report.reported_user_id, COALESCE(v_text, v_report.message_snapshot), jsonb_build_object('report', _report_id));
  END IF;
  UPDATE public.chat_reports
     SET status = CASE WHEN _action = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
         resolution = CASE _action WHEN 'remove' THEN 'Message removed' WHEN 'dismiss' THEN 'No action needed' ELSE 'Handled' END,
         reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _report_id;
  -- Close other open reports about the same message too.
  UPDATE public.chat_reports
     SET status = CASE WHEN _action = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
         resolution = CASE _action WHEN 'remove' THEN 'Message removed' WHEN 'dismiss' THEN 'No action needed' ELSE 'Handled' END,
         reviewed_by = auth.uid(), reviewed_at = now()
   WHERE status = 'open' AND id <> _report_id
     AND ((v_report.message_id IS NOT NULL AND message_id = v_report.message_id)
       OR (v_report.dm_message_id IS NOT NULL AND dm_message_id = v_report.dm_message_id));
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION chat_private.delete_direct_message(_dm_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg public.dm_messages%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.dm_messages WHERE id = _dm_message_id FOR UPDATE;
  IF NOT FOUND OR v_msg.sender_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'You can only delete your own messages'; END IF;
  IF v_msg.deleted_at IS NOT NULL THEN RETURN jsonb_build_object('success', true); END IF;
  PERFORM chat_private.log_action('delete_own', NULL, NULL, v_msg.id, v_msg.sender_id, v_msg.content);
  UPDATE public.dm_messages SET content = '', deleted_at = now(), deleted_by = auth.uid() WHERE id = _dm_message_id;
  RETURN jsonb_build_object('success', true);
END $$;

-- Private messages: same school only, and nobody who blocked you (or whom you blocked).
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
  IF chat_private.is_blocked_between(v_me, _other_user_id) THEN RAISE EXCEPTION 'You can''t message this person.'; END IF;
  IF NOT chat_private.can_direct_message(v_me, _other_user_id) THEN
    RAISE EXCEPTION 'Private messages are only open between members of the same school.';
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

-- Search now always means "people at my school" (the _same_school_only flag is kept for old clients).
CREATE OR REPLACE FUNCTION public.search_students(_query text DEFAULT '', _same_school_only boolean DEFAULT true)
RETURNS TABLE(user_id uuid, full_name text, school_name text, province text, district text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id,
         COALESCE(p.full_name, 'Student'),
         COALESCE((SELECT s.name FROM public.schools s WHERE s.id = chat_private.share_school(auth.uid(), p.user_id)), ''),
         COALESCE(p.province, ''),
         COALESCE(p.district, '')
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id <> auth.uid()
    AND public.has_role(p.user_id, 'student'::app_role)
    AND (COALESCE(_query,'') = '' OR p.full_name ILIKE '%' || _query || '%')
    AND chat_private.share_school(auth.uid(), p.user_id) IS NOT NULL
    AND NOT chat_private.is_blocked_between(auth.uid(), p.user_id)
  ORDER BY p.full_name
  LIMIT 50
$$;
REVOKE EXECUTE ON FUNCTION public.search_students(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_students(text, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.list_direct_chats();
CREATE FUNCTION public.list_direct_chats()
RETURNS TABLE(thread_id uuid, other_user_id uuid, other_name text, other_school text, last_message text,
              last_message_at timestamptz, is_blocked boolean, can_message boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.id,
    o.other_id,
    COALESCE(p.full_name, 'Student'),
    COALESCE((SELECT s.name FROM public.schools s WHERE s.id = chat_private.share_school(auth.uid(), o.other_id)), p.school_name, ''),
    (SELECT CASE WHEN m.deleted_at IS NULL THEN m.content ELSE 'Message deleted' END
       FROM public.dm_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1),
    t.last_message_at,
    EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = o.other_id),
    chat_private.can_direct_message(auth.uid(), o.other_id)
  FROM public.dm_threads t
  CROSS JOIN LATERAL (SELECT CASE WHEN t.user_a = auth.uid() THEN t.user_b ELSE t.user_a END AS other_id) o
  LEFT JOIN public.profiles p ON p.user_id = o.other_id
  WHERE auth.uid() IN (t.user_a, t.user_b)
  ORDER BY t.last_message_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.list_direct_chats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_direct_chats() TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Public invoker wrappers the app calls
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_rooms()
RETURNS TABLE(id uuid, name text, description text, channel_type text, school_id uuid, school_name text,
              posting_mode text, can_moderate boolean, member_count integer, last_message_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_my_rooms() $$;

CREATE OR REPLACE FUNCTION public.list_room_messages(_channel_id uuid, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, channel_id uuid, sender_id uuid, sender_name text, sender_is_teacher boolean,
              message text, post_kind text, title text, parent_id uuid, is_pinned boolean,
              comments_open boolean, is_deleted boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_room_messages(_channel_id, _limit) $$;

CREATE OR REPLACE FUNCTION public.delete_chat_message(_message_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.delete_chat_message(_message_id) $$;
CREATE OR REPLACE FUNCTION public.set_message_pinned(_message_id uuid, _pinned boolean)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.set_message_pinned(_message_id, _pinned) $$;
CREATE OR REPLACE FUNCTION public.set_post_comments(_message_id uuid, _open boolean)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.set_post_comments(_message_id, _open) $$;
CREATE OR REPLACE FUNCTION public.set_room_posting_mode(_channel_id uuid, _mode text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.set_room_posting_mode(_channel_id, _mode) $$;
CREATE OR REPLACE FUNCTION public.list_my_teaching_schools()
RETURNS TABLE(school_id uuid, school_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_my_teaching_schools() $$;
CREATE OR REPLACE FUNCTION public.create_class_room(_school_id uuid, _name text, _description text DEFAULT '')
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.create_class_room(_school_id, _name, _description) $$;
CREATE OR REPLACE FUNCTION public.archive_class_room(_channel_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.archive_class_room(_channel_id) $$;
CREATE OR REPLACE FUNCTION public.list_room_members(_channel_id uuid)
RETURNS TABLE(user_id uuid, full_name text, member_role text, muted_until timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_room_members(_channel_id) $$;
CREATE OR REPLACE FUNCTION public.list_room_candidates(_channel_id uuid, _query text DEFAULT '')
RETURNS TABLE(user_id uuid, full_name text, member_role text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_room_candidates(_channel_id, _query) $$;
CREATE OR REPLACE FUNCTION public.add_room_members(_channel_id uuid, _user_ids uuid[])
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.add_room_members(_channel_id, _user_ids) $$;
CREATE OR REPLACE FUNCTION public.remove_room_member(_channel_id uuid, _user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.remove_room_member(_channel_id, _user_id) $$;
CREATE OR REPLACE FUNCTION public.mute_room_member(_channel_id uuid, _user_id uuid, _minutes integer)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.mute_room_member(_channel_id, _user_id, _minutes) $$;
CREATE OR REPLACE FUNCTION public.block_user(_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.block_user(_user_id) $$;
CREATE OR REPLACE FUNCTION public.unblock_user(_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.unblock_user(_user_id) $$;
CREATE OR REPLACE FUNCTION public.list_blocked_users()
RETURNS TABLE(user_id uuid, full_name text, blocked_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_blocked_users() $$;
CREATE OR REPLACE FUNCTION public.report_chat_message(_message_id uuid, _reason text, _details text DEFAULT '')
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.report_chat_message(_message_id, _reason, _details) $$;
CREATE OR REPLACE FUNCTION public.report_direct_message(_dm_message_id uuid, _reason text, _details text DEFAULT '')
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.report_direct_message(_dm_message_id, _reason, _details) $$;
CREATE OR REPLACE FUNCTION public.list_chat_reports(_status text DEFAULT 'open')
RETURNS TABLE(id uuid, created_at timestamptz, source text, reason text, details text, message_snapshot text,
              status text, room_name text, school_name text, reporter_name text, reported_user_id uuid,
              reported_name text, message_removed boolean, resolution text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_chat_reports(_status) $$;
CREATE OR REPLACE FUNCTION public.resolve_chat_report(_report_id uuid, _action text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.resolve_chat_report(_report_id, _action) $$;
CREATE OR REPLACE FUNCTION public.delete_direct_message(_dm_message_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.delete_direct_message(_dm_message_id) $$;

-- ---------------------------------------------------------------------------
-- 8. Who may run what
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA chat_private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA chat_private TO authenticated, service_role;
-- The trigger helpers are not meant to be called directly by anyone.
REVOKE ALL ON FUNCTION chat_private.sync_school_room() FROM authenticated;
REVOKE ALL ON FUNCTION chat_private.log_action(text, uuid, uuid, uuid, uuid, text, jsonb) FROM authenticated;

REVOKE ALL ON FUNCTION
  public.list_my_rooms(), public.list_room_messages(uuid, integer), public.delete_chat_message(uuid),
  public.set_message_pinned(uuid, boolean), public.set_post_comments(uuid, boolean), public.set_room_posting_mode(uuid, text),
  public.list_my_teaching_schools(), public.create_class_room(uuid, text, text), public.archive_class_room(uuid),
  public.list_room_members(uuid), public.list_room_candidates(uuid, text), public.add_room_members(uuid, uuid[]),
  public.remove_room_member(uuid, uuid), public.mute_room_member(uuid, uuid, integer), public.block_user(uuid),
  public.unblock_user(uuid), public.list_blocked_users(), public.report_chat_message(uuid, text, text),
  public.report_direct_message(uuid, text, text), public.list_chat_reports(text), public.resolve_chat_report(uuid, text),
  public.delete_direct_message(uuid), public.guard_chat_message_insert(), public.guard_dm_message_insert()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.list_my_rooms(), public.list_room_messages(uuid, integer), public.delete_chat_message(uuid),
  public.set_message_pinned(uuid, boolean), public.set_post_comments(uuid, boolean), public.set_room_posting_mode(uuid, text),
  public.list_my_teaching_schools(), public.create_class_room(uuid, text, text), public.archive_class_room(uuid),
  public.list_room_members(uuid), public.list_room_candidates(uuid, text), public.add_room_members(uuid, uuid[]),
  public.remove_room_member(uuid, uuid), public.mute_room_member(uuid, uuid, integer), public.block_user(uuid),
  public.unblock_user(uuid), public.list_blocked_users(), public.report_chat_message(uuid, text, text),
  public.report_direct_message(uuid, text, text), public.list_chat_reports(text), public.resolve_chat_report(uuid, text),
  public.delete_direct_message(uuid)
TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_chat_message_insert(), public.guard_dm_message_insert() TO authenticated, service_role;
