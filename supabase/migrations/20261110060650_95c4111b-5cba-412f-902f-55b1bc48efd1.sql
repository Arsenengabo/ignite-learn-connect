ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint;
ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.dm_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_modern_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_modern_type_check CHECK (message_type IN ('text','image','file','audio'));
ALTER TABLE public.dm_messages DROP CONSTRAINT IF EXISTS dm_messages_modern_type_check;
ALTER TABLE public.dm_messages ADD CONSTRAINT dm_messages_modern_type_check CHECK (message_type IN ('text','image','file','audio'));
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(channel_id, created_at, sender_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dm_messages_unread ON public.dm_messages(thread_id, created_at, sender_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply ON public.chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dm_messages_reply ON public.dm_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

CREATE TABLE public.chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  dm_message_id uuid REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((message_id IS NOT NULL)::integer + (dm_message_id IS NOT NULL)::integer = 1),
  CHECK (emoji IN ('👍','❤️','😂','🎉','👏'))
);
GRANT SELECT ON public.chat_reactions TO authenticated;
GRANT ALL ON public.chat_reactions TO service_role;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX chat_reactions_room_once ON public.chat_reactions(message_id, user_id, emoji) WHERE message_id IS NOT NULL;
CREATE UNIQUE INDEX chat_reactions_dm_once ON public.chat_reactions(dm_message_id, user_id, emoji) WHERE dm_message_id IS NOT NULL;
CREATE INDEX idx_chat_reactions_dm ON public.chat_reactions(dm_message_id) WHERE dm_message_id IS NOT NULL;

CREATE TABLE public.chat_read_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  last_delivered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((channel_id IS NOT NULL)::integer + (thread_id IS NOT NULL)::integer = 1)
);
GRANT SELECT ON public.chat_read_states TO authenticated;
GRANT ALL ON public.chat_read_states TO service_role;
ALTER TABLE public.chat_read_states ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX chat_read_states_room_once ON public.chat_read_states(user_id, channel_id) WHERE channel_id IS NOT NULL;
CREATE UNIQUE INDEX chat_read_states_dm_once ON public.chat_read_states(user_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_chat_read_states_thread ON public.chat_read_states(thread_id) WHERE thread_id IS NOT NULL;

CREATE TABLE public.chat_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  dm_message_id uuid REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('message','mention')),
  preview text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chat_notifications TO authenticated;
GRANT ALL ON public.chat_notifications TO service_role;
ALTER TABLE public.chat_notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_chat_notifications_recipient ON public.chat_notifications(recipient_id, created_at DESC);
CREATE INDEX idx_chat_notifications_unread ON public.chat_notifications(recipient_id, channel_id, thread_id) WHERE read_at IS NULL;

CREATE OR REPLACE FUNCTION chat_private.safe_uuid(_value text)
RETURNS uuid LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN _value::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN NULL; END
$$;

DROP POLICY IF EXISTS "Chat participants can read reactions" ON public.chat_reactions;
CREATE POLICY "Chat participants can read reactions" ON public.chat_reactions FOR SELECT TO authenticated USING (
  (message_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = message_id AND chat_private.can_view_room(auth.uid(), m.channel_id)))
  OR (dm_message_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.dm_messages d WHERE d.id = dm_message_id AND public.is_dm_participant(auth.uid(), d.thread_id)))
);
DROP POLICY IF EXISTS "Users can see relevant read states" ON public.chat_read_states;
CREATE POLICY "Users can see relevant read states" ON public.chat_read_states FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR (thread_id IS NOT NULL AND public.is_dm_participant(auth.uid(), thread_id))
);
DROP POLICY IF EXISTS "Users can see their own chat notifications" ON public.chat_notifications;
CREATE POLICY "Users can see their own chat notifications" ON public.chat_notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_chat_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, storage AS $$
DECLARE v_reply public.chat_messages%ROWTYPE;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF NEW.sender_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'You can only send messages as yourself'; END IF;
  NEW.message := btrim(COALESCE(NEW.message, ''));
  NEW.post_kind := COALESCE(NEW.post_kind, 'message');
  NEW.title := CASE WHEN NEW.post_kind = 'message' THEN NULL ELSE NULLIF(btrim(COALESCE(NEW.title, '')), '') END;
  IF char_length(NEW.message) > 4000 THEN RAISE EXCEPTION 'Message is too long (4,000 characters at most)'; END IF;
  IF char_length(COALESCE(NEW.title, '')) > 120 THEN RAISE EXCEPTION 'Title is too long (120 characters at most)'; END IF;
  IF NEW.message = '' AND NEW.attachment_path IS NULL THEN RAISE EXCEPTION 'Write a message or attach a file'; END IF;
  NEW.message_type := COALESCE(NEW.message_type, 'text');
  IF NEW.message_type NOT IN ('text','image','file','audio') THEN RAISE EXCEPTION 'Invalid attachment type'; END IF;
  IF NEW.attachment_path IS NOT NULL THEN
    IF NEW.parent_id IS NOT NULL THEN RAISE EXCEPTION 'Comments cannot include attachments'; END IF;
    IF NEW.attachment_path NOT LIKE 'rooms/' || NEW.channel_id::text || '/' || auth.uid()::text || '/%' THEN RAISE EXCEPTION 'Invalid attachment location'; END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'chat-files' AND o.name = NEW.attachment_path) THEN RAISE EXCEPTION 'Upload the attachment before sending'; END IF;
    IF NEW.attachment_size IS NULL OR NEW.attachment_size <= 0 OR NEW.attachment_size > 10485760 THEN RAISE EXCEPTION 'Files must be 10 MB or smaller'; END IF;
    IF char_length(COALESCE(NEW.attachment_name, '')) NOT BETWEEN 1 AND 255 OR char_length(COALESCE(NEW.attachment_mime, '')) NOT BETWEEN 1 AND 150 THEN RAISE EXCEPTION 'Invalid attachment details'; END IF;
  ELSE
    NEW.message_type := 'text'; NEW.attachment_name := NULL; NEW.attachment_mime := NULL; NEW.attachment_size := NULL;
  END IF;
  IF NEW.reply_to_id IS NOT NULL THEN
    SELECT * INTO v_reply FROM public.chat_messages WHERE id = NEW.reply_to_id;
    IF NOT FOUND OR v_reply.channel_id <> NEW.channel_id OR v_reply.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'The message you replied to is unavailable'; END IF;
  END IF;
  NEW.deleted_at := NULL; NEW.deleted_by := NULL; NEW.edited_at := NULL;
  NEW.comments_open := true; NEW.file_url := NULL; NEW.created_at := now(); NEW.updated_at := now();
  PERFORM chat_private.assert_can_post(auth.uid(), NEW.channel_id, NEW.post_kind, NEW.parent_id, NEW.is_pinned);
  PERFORM chat_private.check_send_rate(auth.uid());
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_dm_message_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, storage AS $$
DECLARE v_reply public.dm_messages%ROWTYPE;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF NEW.sender_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'You can only send messages as yourself'; END IF;
  NEW.content := btrim(COALESCE(NEW.content, ''));
  IF char_length(NEW.content) > 2000 THEN RAISE EXCEPTION 'Message is too long (2,000 characters at most)'; END IF;
  IF NEW.content = '' AND NEW.attachment_path IS NULL THEN RAISE EXCEPTION 'Write a message or attach a file'; END IF;
  NEW.message_type := COALESCE(NEW.message_type, 'text');
  IF NEW.message_type NOT IN ('text','image','file','audio') THEN RAISE EXCEPTION 'Invalid attachment type'; END IF;
  IF NEW.attachment_path IS NOT NULL THEN
    IF NEW.attachment_path NOT LIKE 'direct/' || NEW.thread_id::text || '/' || auth.uid()::text || '/%' THEN RAISE EXCEPTION 'Invalid attachment location'; END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'chat-files' AND o.name = NEW.attachment_path) THEN RAISE EXCEPTION 'Upload the attachment before sending'; END IF;
    IF NEW.attachment_size IS NULL OR NEW.attachment_size <= 0 OR NEW.attachment_size > 10485760 THEN RAISE EXCEPTION 'Files must be 10 MB or smaller'; END IF;
    IF char_length(COALESCE(NEW.attachment_name, '')) NOT BETWEEN 1 AND 255 OR char_length(COALESCE(NEW.attachment_mime, '')) NOT BETWEEN 1 AND 150 THEN RAISE EXCEPTION 'Invalid attachment details'; END IF;
  ELSE
    NEW.message_type := 'text'; NEW.attachment_name := NULL; NEW.attachment_mime := NULL; NEW.attachment_size := NULL;
  END IF;
  IF NEW.reply_to_id IS NOT NULL THEN
    SELECT * INTO v_reply FROM public.dm_messages WHERE id = NEW.reply_to_id;
    IF NOT FOUND OR v_reply.thread_id <> NEW.thread_id OR v_reply.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'The message you replied to is unavailable'; END IF;
  END IF;
  NEW.deleted_at := NULL; NEW.deleted_by := NULL; NEW.edited_at := NULL; NEW.is_pinned := false; NEW.created_at := now();
  PERFORM chat_private.assert_can_send_dm(auth.uid(), NEW.thread_id);
  PERFORM chat_private.check_send_rate(auth.uid());
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION chat_private.notify_new_room_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.post_kind <> 'message' OR NEW.parent_id IS NOT NULL THEN RETURN NEW; END IF;
  INSERT INTO public.chat_notifications(recipient_id, actor_id, channel_id, message_id, kind, preview)
  SELECT p.user_id, NEW.sender_id, NEW.channel_id, NEW.id, 'mention', left(COALESCE(NULLIF(NEW.message, ''), NEW.attachment_name, 'Attachment'), 160)
  FROM public.profiles p
  WHERE p.user_id <> NEW.sender_id AND p.full_name IS NOT NULL AND btrim(p.full_name) <> ''
    AND NEW.message ILIKE '%@' || p.full_name || '%'
    AND (
      EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.id = NEW.channel_id AND c.channel_type = 'school_room' AND chat_private.is_school_member(p.user_id, c.school_id))
      OR EXISTS (SELECT 1 FROM public.chat_room_members r WHERE r.channel_id = NEW.channel_id AND r.user_id = p.user_id)
    )
  LIMIT 100;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_new_room_message ON public.chat_messages;
CREATE TRIGGER notify_new_room_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION chat_private.notify_new_room_message();

CREATE OR REPLACE FUNCTION chat_private.notify_new_direct_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_recipient uuid; v_name text;
BEGIN
  SELECT CASE WHEN t.user_a = NEW.sender_id THEN t.user_b ELSE t.user_a END INTO v_recipient FROM public.dm_threads t WHERE t.id = NEW.thread_id;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_recipient;
  INSERT INTO public.chat_notifications(recipient_id, actor_id, thread_id, dm_message_id, kind, preview)
  VALUES (v_recipient, NEW.sender_id, NEW.thread_id, NEW.id,
    CASE WHEN v_name IS NOT NULL AND NEW.content ILIKE '%@' || v_name || '%' THEN 'mention' ELSE 'message' END,
    left(COALESCE(NULLIF(NEW.content, ''), NEW.attachment_name, 'Attachment'), 160));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_new_direct_message ON public.dm_messages;
CREATE TRIGGER notify_new_direct_message AFTER INSERT ON public.dm_messages FOR EACH ROW EXECUTE FUNCTION chat_private.notify_new_direct_message();

CREATE OR REPLACE FUNCTION chat_private.toggle_reaction(_message_id uuid, _dm_message_id uuid, _emoji text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_channel uuid; v_thread uuid; v_added boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF (_message_id IS NOT NULL)::integer + (_dm_message_id IS NOT NULL)::integer <> 1 THEN RAISE EXCEPTION 'Choose one message'; END IF;
  IF _emoji NOT IN ('👍','❤️','😂','🎉','👏') THEN RAISE EXCEPTION 'Reaction not supported'; END IF;
  IF _message_id IS NOT NULL THEN
    SELECT channel_id INTO v_channel FROM public.chat_messages WHERE id = _message_id AND deleted_at IS NULL;
    IF v_channel IS NULL OR NOT chat_private.can_view_room(auth.uid(), v_channel) THEN RAISE EXCEPTION 'Message not found'; END IF;
    DELETE FROM public.chat_reactions WHERE message_id = _message_id AND user_id = auth.uid() AND emoji = _emoji;
    IF FOUND THEN v_added := false; ELSE INSERT INTO public.chat_reactions(message_id, user_id, emoji) VALUES (_message_id, auth.uid(), _emoji); v_added := true; END IF;
  ELSE
    SELECT thread_id INTO v_thread FROM public.dm_messages WHERE id = _dm_message_id AND deleted_at IS NULL;
    IF v_thread IS NULL OR NOT public.is_dm_participant(auth.uid(), v_thread) THEN RAISE EXCEPTION 'Message not found'; END IF;
    DELETE FROM public.chat_reactions WHERE dm_message_id = _dm_message_id AND user_id = auth.uid() AND emoji = _emoji;
    IF FOUND THEN v_added := false; ELSE INSERT INTO public.chat_reactions(dm_message_id, user_id, emoji) VALUES (_dm_message_id, auth.uid(), _emoji); v_added := true; END IF;
  END IF;
  RETURN jsonb_build_object('success', true, 'reacted', v_added);
END $$;
CREATE OR REPLACE FUNCTION public.toggle_chat_reaction(_message_id uuid, _dm_message_id uuid, _emoji text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.toggle_reaction(_message_id, _dm_message_id, _emoji) $$;

CREATE OR REPLACE FUNCTION chat_private.edit_room_message(_message_id uuid, _text text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg public.chat_messages%ROWTYPE; v_text text := btrim(COALESCE(_text, ''));
BEGIN
  SELECT * INTO v_msg FROM public.chat_messages WHERE id = _message_id FOR UPDATE;
  IF NOT FOUND OR v_msg.sender_id IS DISTINCT FROM auth.uid() OR NOT chat_private.can_view_room(auth.uid(), v_msg.channel_id) THEN RAISE EXCEPTION 'You can only edit your own messages'; END IF;
  IF v_msg.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Deleted messages cannot be edited'; END IF;
  IF v_text = '' OR char_length(v_text) > 4000 THEN RAISE EXCEPTION 'Message must contain 1 to 4,000 characters'; END IF;
  PERFORM chat_private.log_action('edit', v_msg.channel_id, v_msg.id, NULL, v_msg.sender_id, v_msg.message);
  UPDATE public.chat_messages SET message = v_text, edited_at = now(), updated_at = now() WHERE id = _message_id;
  RETURN jsonb_build_object('success', true, 'edited_at', now());
END $$;
CREATE OR REPLACE FUNCTION public.edit_room_message(_message_id uuid, _text text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.edit_room_message(_message_id, _text) $$;

CREATE OR REPLACE FUNCTION chat_private.edit_direct_message(_dm_message_id uuid, _text text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg public.dm_messages%ROWTYPE; v_text text := btrim(COALESCE(_text, ''));
BEGIN
  SELECT * INTO v_msg FROM public.dm_messages WHERE id = _dm_message_id FOR UPDATE;
  IF NOT FOUND OR v_msg.sender_id IS DISTINCT FROM auth.uid() OR NOT public.is_dm_participant(auth.uid(), v_msg.thread_id) THEN RAISE EXCEPTION 'You can only edit your own messages'; END IF;
  IF v_msg.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Deleted messages cannot be edited'; END IF;
  IF v_text = '' OR char_length(v_text) > 2000 THEN RAISE EXCEPTION 'Message must contain 1 to 2,000 characters'; END IF;
  PERFORM chat_private.log_action('edit', NULL, NULL, v_msg.id, v_msg.sender_id, v_msg.content);
  UPDATE public.dm_messages SET content = v_text, edited_at = now(), updated_at = now() WHERE id = _dm_message_id;
  RETURN jsonb_build_object('success', true, 'edited_at', now());
END $$;
CREATE OR REPLACE FUNCTION public.edit_direct_message(_dm_message_id uuid, _text text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.edit_direct_message(_dm_message_id, _text) $$;

CREATE OR REPLACE FUNCTION chat_private.set_direct_message_pinned(_dm_message_id uuid, _pinned boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_thread uuid;
BEGIN
  SELECT thread_id INTO v_thread FROM public.dm_messages WHERE id = _dm_message_id AND deleted_at IS NULL;
  IF v_thread IS NULL OR NOT public.is_dm_participant(auth.uid(), v_thread) THEN RAISE EXCEPTION 'Message not found'; END IF;
  UPDATE public.dm_messages SET is_pinned = COALESCE(_pinned, false), updated_at = now() WHERE id = _dm_message_id;
  RETURN jsonb_build_object('success', true, 'is_pinned', COALESCE(_pinned, false));
END $$;
CREATE OR REPLACE FUNCTION public.set_direct_message_pinned(_dm_message_id uuid, _pinned boolean)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.set_direct_message_pinned(_dm_message_id, _pinned) $$;

CREATE OR REPLACE FUNCTION chat_private.mark_room_read(_channel_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT chat_private.can_view_room(auth.uid(), _channel_id) THEN RAISE EXCEPTION 'You are not a member of this room'; END IF;
  INSERT INTO public.chat_read_states(user_id, channel_id) VALUES (auth.uid(), _channel_id)
  ON CONFLICT (user_id, channel_id) WHERE channel_id IS NOT NULL DO UPDATE SET last_read_at = now(), last_delivered_at = now(), updated_at = now();
  UPDATE public.chat_notifications SET read_at = now() WHERE recipient_id = auth.uid() AND channel_id = _channel_id AND read_at IS NULL;
  RETURN jsonb_build_object('success', true, 'read_at', now());
END $$;
CREATE OR REPLACE FUNCTION public.mark_room_read(_channel_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.mark_room_read(_channel_id) $$;

CREATE OR REPLACE FUNCTION chat_private.mark_direct_active(_thread_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_dm_participant(auth.uid(), _thread_id) THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  INSERT INTO public.chat_read_states(user_id, thread_id) VALUES (auth.uid(), _thread_id)
  ON CONFLICT (user_id, thread_id) WHERE thread_id IS NOT NULL DO UPDATE SET last_read_at = now(), last_delivered_at = now(), updated_at = now();
  UPDATE public.chat_notifications SET read_at = now() WHERE recipient_id = auth.uid() AND thread_id = _thread_id AND read_at IS NULL;
  RETURN jsonb_build_object('success', true, 'read_at', now());
END $$;
CREATE OR REPLACE FUNCTION public.mark_direct_active(_thread_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.mark_direct_active(_thread_id) $$;

CREATE OR REPLACE FUNCTION chat_private.get_direct_read_state(_thread_id uuid)
RETURNS TABLE(other_last_read_at timestamptz, other_last_delivered_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_other uuid;
BEGIN
  SELECT CASE WHEN t.user_a = auth.uid() THEN t.user_b ELSE t.user_a END INTO v_other FROM public.dm_threads t WHERE t.id = _thread_id AND auth.uid() IN (t.user_a, t.user_b);
  IF v_other IS NULL THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  RETURN QUERY SELECT r.last_read_at, r.last_delivered_at FROM public.chat_read_states r WHERE r.thread_id = _thread_id AND r.user_id = v_other;
END $$;
CREATE OR REPLACE FUNCTION public.get_direct_read_state(_thread_id uuid)
RETURNS TABLE(other_last_read_at timestamptz, other_last_delivered_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.get_direct_read_state(_thread_id) $$;

CREATE OR REPLACE FUNCTION chat_private.forward_message(_message_id uuid, _dm_message_id uuid, _target_channel_id uuid, _target_thread_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room public.chat_messages%ROWTYPE; v_dm public.dm_messages%ROWTYPE; v_new uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF (_message_id IS NOT NULL)::integer + (_dm_message_id IS NOT NULL)::integer <> 1 OR (_target_channel_id IS NOT NULL)::integer + (_target_thread_id IS NOT NULL)::integer <> 1 THEN RAISE EXCEPTION 'Choose one message and one destination'; END IF;
  IF _message_id IS NOT NULL THEN
    SELECT * INTO v_room FROM public.chat_messages WHERE id = _message_id AND deleted_at IS NULL;
    IF NOT FOUND OR NOT chat_private.can_view_room(auth.uid(), v_room.channel_id) THEN RAISE EXCEPTION 'Message not found'; END IF;
  ELSE
    SELECT * INTO v_dm FROM public.dm_messages WHERE id = _dm_message_id AND deleted_at IS NULL;
    IF NOT FOUND OR NOT public.is_dm_participant(auth.uid(), v_dm.thread_id) THEN RAISE EXCEPTION 'Message not found'; END IF;
  END IF;
  PERFORM chat_private.check_send_rate(auth.uid());
  IF _target_channel_id IS NOT NULL THEN
    PERFORM chat_private.assert_can_post(auth.uid(), _target_channel_id, 'message', NULL, false);
    INSERT INTO public.chat_messages(channel_id, sender_id, message, message_type, attachment_path, attachment_name, attachment_mime, attachment_size)
    VALUES (_target_channel_id, auth.uid(), COALESCE(v_room.message, v_dm.content, ''), COALESCE(v_room.message_type, v_dm.message_type, 'text'), COALESCE(v_room.attachment_path, v_dm.attachment_path), COALESCE(v_room.attachment_name, v_dm.attachment_name), COALESCE(v_room.attachment_mime, v_dm.attachment_mime), COALESCE(v_room.attachment_size, v_dm.attachment_size)) RETURNING id INTO v_new;
  ELSE
    PERFORM chat_private.assert_can_send_dm(auth.uid(), _target_thread_id);
    INSERT INTO public.dm_messages(thread_id, sender_id, content, message_type, attachment_path, attachment_name, attachment_mime, attachment_size)
    VALUES (_target_thread_id, auth.uid(), COALESCE(v_room.message, v_dm.content, ''), COALESCE(v_room.message_type, v_dm.message_type, 'text'), COALESCE(v_room.attachment_path, v_dm.attachment_path), COALESCE(v_room.attachment_name, v_dm.attachment_name), COALESCE(v_room.attachment_mime, v_dm.attachment_mime), COALESCE(v_room.attachment_size, v_dm.attachment_size)) RETURNING id INTO v_new;
  END IF;
  RETURN v_new;
END $$;
CREATE OR REPLACE FUNCTION public.forward_chat_message(_message_id uuid, _dm_message_id uuid, _target_channel_id uuid, _target_thread_id uuid)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.forward_message(_message_id, _dm_message_id, _target_channel_id, _target_thread_id) $$;

DROP FUNCTION IF EXISTS public.list_room_messages(uuid, integer);
DROP FUNCTION IF EXISTS chat_private.list_room_messages(uuid, integer);
CREATE FUNCTION chat_private.list_room_messages(_channel_id uuid, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, channel_id uuid, sender_id uuid, sender_name text, sender_is_teacher boolean,
  message text, post_kind text, title text, parent_id uuid, is_pinned boolean, comments_open boolean,
  is_deleted boolean, created_at timestamptz, edited_at timestamptz, reply_to_id uuid,
  reply_sender_name text, reply_text text, message_type text, attachment_path text,
  attachment_name text, attachment_mime text, attachment_size bigint, reactions jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT chat_private.can_view_room(auth.uid(), _channel_id) THEN RAISE EXCEPTION 'You are not a member of this room'; END IF;
  RETURN QUERY
  SELECT m.id, m.channel_id, m.sender_id, COALESCE(p.full_name, 'Member'), public.has_role(m.sender_id, 'teacher'::public.app_role),
    CASE WHEN m.deleted_at IS NULL THEN m.message ELSE '' END, m.post_kind,
    CASE WHEN m.deleted_at IS NULL THEN m.title ELSE NULL END, m.parent_id,
    m.is_pinned AND m.deleted_at IS NULL, m.comments_open, m.deleted_at IS NOT NULL, m.created_at, m.edited_at,
    m.reply_to_id, COALESCE(rp.full_name, 'Member'), COALESCE(r.message, r.attachment_name, 'Attachment'),
    m.message_type, CASE WHEN m.deleted_at IS NULL THEN m.attachment_path ELSE NULL END,
    CASE WHEN m.deleted_at IS NULL THEN m.attachment_name ELSE NULL END, m.attachment_mime, m.attachment_size,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('emoji', x.emoji, 'count', x.count, 'reacted', x.reacted) ORDER BY x.emoji)
      FROM (SELECT r.emoji, count(*) AS count, bool_or(r.user_id = auth.uid()) AS reacted FROM public.chat_reactions r WHERE r.message_id = m.id GROUP BY r.emoji) x), '[]'::jsonb)
  FROM public.chat_messages m
  LEFT JOIN public.profiles p ON p.user_id = m.sender_id
  LEFT JOIN public.chat_messages r ON r.id = m.reply_to_id
  LEFT JOIN public.profiles rp ON rp.user_id = r.sender_id
  WHERE m.channel_id = _channel_id
    AND (m.id IN (SELECT x.id FROM public.chat_messages x WHERE x.channel_id = _channel_id ORDER BY x.created_at DESC LIMIT LEAST(GREATEST(COALESCE(_limit, 200), 1), 500)) OR (m.is_pinned AND m.deleted_at IS NULL))
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = m.sender_id)
  ORDER BY m.created_at;
END $$;
CREATE FUNCTION public.list_room_messages(_channel_id uuid, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, channel_id uuid, sender_id uuid, sender_name text, sender_is_teacher boolean,
  message text, post_kind text, title text, parent_id uuid, is_pinned boolean, comments_open boolean,
  is_deleted boolean, created_at timestamptz, edited_at timestamptz, reply_to_id uuid,
  reply_sender_name text, reply_text text, message_type text, attachment_path text,
  attachment_name text, attachment_mime text, attachment_size bigint, reactions jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_room_messages(_channel_id, _limit) $$;

CREATE OR REPLACE FUNCTION chat_private.list_direct_messages(_thread_id uuid, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, thread_id uuid, sender_id uuid, content text, created_at timestamptz,
  edited_at timestamptz, deleted_at timestamptz, is_pinned boolean, reply_to_id uuid,
  reply_sender_name text, reply_text text, message_type text, attachment_path text,
  attachment_name text, attachment_mime text, attachment_size bigint, reactions jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_dm_participant(auth.uid(), _thread_id) THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  RETURN QUERY
  SELECT m.id, m.thread_id, m.sender_id, CASE WHEN m.deleted_at IS NULL THEN m.content ELSE '' END,
    m.created_at, m.edited_at, m.deleted_at, m.is_pinned AND m.deleted_at IS NULL, m.reply_to_id,
    COALESCE(p.full_name, 'Member'), COALESCE(r.content, r.attachment_name, 'Attachment'), m.message_type,
    CASE WHEN m.deleted_at IS NULL THEN m.attachment_path ELSE NULL END,
    CASE WHEN m.deleted_at IS NULL THEN m.attachment_name ELSE NULL END, m.attachment_mime, m.attachment_size,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('emoji', x.emoji, 'count', x.count, 'reacted', x.reacted) ORDER BY x.emoji)
      FROM (SELECT r.emoji, count(*) AS count, bool_or(r.user_id = auth.uid()) AS reacted FROM public.chat_reactions r WHERE r.dm_message_id = m.id GROUP BY r.emoji) x), '[]'::jsonb)
  FROM (SELECT x.* FROM public.dm_messages x WHERE x.thread_id = _thread_id ORDER BY x.created_at DESC LIMIT LEAST(GREATEST(COALESCE(_limit, 200), 1), 500)) m
  LEFT JOIN public.dm_messages r ON r.id = m.reply_to_id LEFT JOIN public.profiles p ON p.user_id = r.sender_id
  ORDER BY m.created_at;
END $$;
CREATE OR REPLACE FUNCTION public.list_direct_messages(_thread_id uuid, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, thread_id uuid, sender_id uuid, content text, created_at timestamptz,
  edited_at timestamptz, deleted_at timestamptz, is_pinned boolean, reply_to_id uuid,
  reply_sender_name text, reply_text text, message_type text, attachment_path text,
  attachment_name text, attachment_mime text, attachment_size bigint, reactions jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_direct_messages(_thread_id, _limit) $$;

DROP FUNCTION IF EXISTS public.list_my_rooms();
DROP FUNCTION IF EXISTS chat_private.list_my_rooms();
CREATE FUNCTION chat_private.list_my_rooms()
RETURNS TABLE(id uuid, name text, description text, channel_type text, school_id uuid, school_name text,
  posting_mode text, can_moderate boolean, member_count integer, last_message_at timestamptz,
  last_message text, unread_count integer, mention_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.description, c.channel_type, c.school_id, COALESCE(s.name, c.school_name, ''), c.posting_mode,
    chat_private.can_moderate_room(auth.uid(), c.id),
    CASE WHEN c.channel_type = 'class_room' THEN (SELECT count(*)::int FROM public.chat_room_members r WHERE r.channel_id = c.id)
      WHEN c.channel_type = 'school_room' THEN (SELECT count(*)::int FROM public.school_members sm WHERE sm.school_id = c.school_id AND sm.status = 'approved') ELSE NULL END,
    (SELECT max(m.created_at) FROM public.chat_messages m WHERE m.channel_id = c.id),
    COALESCE((SELECT CASE WHEN m.deleted_at IS NULL THEN NULLIF(m.message, '') ELSE 'Message deleted' END FROM public.chat_messages m WHERE m.channel_id = c.id ORDER BY m.created_at DESC LIMIT 1), ''),
    (SELECT count(*)::int FROM public.chat_messages m WHERE m.channel_id = c.id AND m.deleted_at IS NULL AND m.sender_id <> auth.uid()
      AND m.created_at > COALESCE((SELECT r.last_read_at FROM public.chat_read_states r WHERE r.channel_id = c.id AND r.user_id = auth.uid()), 'epoch'::timestamptz)),
    (SELECT count(*)::int FROM public.chat_notifications n WHERE n.channel_id = c.id AND n.recipient_id = auth.uid() AND n.kind = 'mention' AND n.read_at IS NULL)
  FROM public.chat_channels c LEFT JOIN public.schools s ON s.id = c.school_id
  WHERE auth.uid() IS NOT NULL AND NOT c.is_archived AND chat_private.can_view_room(auth.uid(), c.id)
  ORDER BY CASE c.channel_type WHEN 'class_room' THEN 0 WHEN 'school_room' THEN 1 ELSE 2 END, c.name
$$;
CREATE FUNCTION public.list_my_rooms()
RETURNS TABLE(id uuid, name text, description text, channel_type text, school_id uuid, school_name text,
  posting_mode text, can_moderate boolean, member_count integer, last_message_at timestamptz,
  last_message text, unread_count integer, mention_count integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_my_rooms() $$;

DROP FUNCTION IF EXISTS public.list_direct_chats();
CREATE FUNCTION public.list_direct_chats()
RETURNS TABLE(thread_id uuid, other_user_id uuid, other_name text, other_school text, last_message text,
  last_message_at timestamptz, is_blocked boolean, can_message boolean, unread_count integer,
  other_last_read_at timestamptz, other_last_delivered_at timestamptz, last_message_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, o.other_id, COALESCE(p.full_name, 'Student'), COALESCE((SELECT s.name FROM public.schools s WHERE s.id = chat_private.share_school(auth.uid(), o.other_id)), p.school_name, ''),
    (SELECT CASE WHEN m.deleted_at IS NOT NULL THEN 'Message deleted' WHEN NULLIF(m.content, '') IS NOT NULL THEN m.content WHEN m.message_type = 'audio' THEN 'Voice note' WHEN m.message_type = 'image' THEN 'Photo' ELSE COALESCE(m.attachment_name, 'Attachment') END FROM public.dm_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1),
    t.last_message_at, EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = o.other_id), chat_private.can_direct_message(auth.uid(), o.other_id),
    (SELECT count(*)::int FROM public.dm_messages m WHERE m.thread_id = t.id AND m.deleted_at IS NULL AND m.sender_id <> auth.uid() AND m.created_at > COALESCE((SELECT r.last_read_at FROM public.chat_read_states r WHERE r.thread_id = t.id AND r.user_id = auth.uid()), 'epoch'::timestamptz)),
    (SELECT r.last_read_at FROM public.chat_read_states r WHERE r.thread_id = t.id AND r.user_id = o.other_id),
    (SELECT r.last_delivered_at FROM public.chat_read_states r WHERE r.thread_id = t.id AND r.user_id = o.other_id),
    COALESCE((SELECT m.message_type FROM public.dm_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1), 'text')
  FROM public.dm_threads t CROSS JOIN LATERAL (SELECT CASE WHEN t.user_a = auth.uid() THEN t.user_b ELSE t.user_a END AS other_id) o
  LEFT JOIN public.profiles p ON p.user_id = o.other_id WHERE auth.uid() IN (t.user_a, t.user_b) ORDER BY t.last_message_at DESC
$$;

CREATE OR REPLACE FUNCTION chat_private.list_notifications(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, actor_id uuid, actor_name text, channel_id uuid, thread_id uuid,
  conversation_name text, kind text, preview text, read_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id, n.actor_id, COALESCE(p.full_name, 'Member'), n.channel_id, n.thread_id,
    COALESCE(c.name, CASE WHEN n.thread_id IS NOT NULL THEN 'Private message' ELSE 'Chat' END), n.kind, n.preview, n.read_at, n.created_at
  FROM public.chat_notifications n LEFT JOIN public.profiles p ON p.user_id = n.actor_id LEFT JOIN public.chat_channels c ON c.id = n.channel_id
  WHERE n.recipient_id = auth.uid() ORDER BY n.created_at DESC LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 100)
$$;
CREATE OR REPLACE FUNCTION public.list_chat_notifications(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, actor_id uuid, actor_name text, channel_id uuid, thread_id uuid,
  conversation_name text, kind text, preview text, read_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT * FROM chat_private.list_notifications(_limit) $$;
CREATE OR REPLACE FUNCTION chat_private.mark_notifications_read(_notification_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_notifications SET read_at = now() WHERE recipient_id = auth.uid() AND read_at IS NULL AND (_notification_id IS NULL OR id = _notification_id);
  RETURN jsonb_build_object('success', true);
END $$;
CREATE OR REPLACE FUNCTION public.mark_chat_notifications_read(_notification_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT chat_private.mark_notifications_read(_notification_id) $$;

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
  PERFORM chat_private.log_action(CASE WHEN v_msg.sender_id = auth.uid() THEN 'delete_own' ELSE 'remove' END, v_msg.channel_id, v_msg.id, NULL, v_msg.sender_id, COALESCE(v_msg.title || E'\n', '') || v_msg.message, '{}'::jsonb);
  UPDATE public.chat_messages SET message = '', title = NULL, is_pinned = false, deleted_at = now(), deleted_by = auth.uid(), attachment_path = NULL, attachment_name = NULL, attachment_mime = NULL, attachment_size = NULL, message_type = 'text', updated_at = now() WHERE id = _message_id;
  DELETE FROM public.chat_reactions WHERE message_id = _message_id;
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
  UPDATE public.dm_messages SET content = '', deleted_at = now(), deleted_by = auth.uid(), is_pinned = false, attachment_path = NULL, attachment_name = NULL, attachment_mime = NULL, attachment_size = NULL, message_type = 'text', updated_at = now() WHERE id = _dm_message_id;
  DELETE FROM public.chat_reactions WHERE dm_message_id = _dm_message_id;
  RETURN jsonb_build_object('success', true);
END $$;

DROP POLICY IF EXISTS "Chat members can view files" ON storage.objects;
DROP POLICY IF EXISTS "Chat members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Chat members can delete their files" ON storage.objects;
DROP POLICY IF EXISTS "Modern chat participants can view files" ON storage.objects;
DROP POLICY IF EXISTS "Modern chat participants can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Modern chat participants can delete their files" ON storage.objects;
CREATE POLICY "Modern chat participants can view files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'chat-files' AND (
    ((storage.foldername(name))[1] = 'rooms' AND chat_private.can_view_room(auth.uid(), chat_private.safe_uuid((storage.foldername(name))[2])))
    OR ((storage.foldername(name))[1] = 'direct' AND public.is_dm_participant(auth.uid(), chat_private.safe_uuid((storage.foldername(name))[2])))
  )
);
CREATE POLICY "Modern chat participants can upload files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'chat-files' AND (storage.foldername(name))[3] = auth.uid()::text AND (
    ((storage.foldername(name))[1] = 'rooms' AND chat_private.can_view_room(auth.uid(), chat_private.safe_uuid((storage.foldername(name))[2])))
    OR ((storage.foldername(name))[1] = 'direct' AND public.is_dm_participant(auth.uid(), chat_private.safe_uuid((storage.foldername(name))[2])))
  )
);
CREATE POLICY "Modern chat participants can delete their files" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'chat-files' AND (storage.foldername(name))[3] = auth.uid()::text AND (
    ((storage.foldername(name))[1] = 'rooms' AND chat_private.can_view_room(auth.uid(), chat_private.safe_uuid((storage.foldername(name))[2])))
    OR ((storage.foldername(name))[1] = 'direct' AND public.is_dm_participant(auth.uid(), chat_private.safe_uuid((storage.foldername(name))[2])))
  )
);

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA chat_private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA chat_private TO authenticated, service_role;
REVOKE ALL ON FUNCTION chat_private.log_action(text, uuid, uuid, uuid, uuid, text, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION chat_private.sync_school_room() FROM authenticated;
REVOKE ALL ON FUNCTION chat_private.notify_new_room_message() FROM authenticated;
REVOKE ALL ON FUNCTION chat_private.notify_new_direct_message() FROM authenticated;
REVOKE ALL ON FUNCTION
  public.toggle_chat_reaction(uuid, uuid, text), public.edit_room_message(uuid, text),
  public.edit_direct_message(uuid, text), public.set_direct_message_pinned(uuid, boolean),
  public.mark_room_read(uuid), public.mark_direct_active(uuid), public.get_direct_read_state(uuid),
  public.forward_chat_message(uuid, uuid, uuid, uuid), public.list_direct_messages(uuid, integer),
  public.list_chat_notifications(integer), public.mark_chat_notifications_read(uuid),
  public.list_room_messages(uuid, integer), public.list_my_rooms(), public.list_direct_chats(),
  public.guard_chat_message_insert(), public.guard_dm_message_insert()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.toggle_chat_reaction(uuid, uuid, text), public.edit_room_message(uuid, text),
  public.edit_direct_message(uuid, text), public.set_direct_message_pinned(uuid, boolean),
  public.mark_room_read(uuid), public.mark_direct_active(uuid), public.get_direct_read_state(uuid),
  public.forward_chat_message(uuid, uuid, uuid, uuid), public.list_direct_messages(uuid, integer),
  public.list_chat_notifications(integer), public.mark_chat_notifications_read(uuid),
  public.list_room_messages(uuid, integer), public.list_my_rooms(), public.list_direct_chats()
TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_chat_message_insert(), public.guard_dm_message_insert() TO authenticated, service_role;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_read_states; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;