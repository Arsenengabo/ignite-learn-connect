GRANT SELECT ON public.chat_channels TO authenticated;
GRANT ALL ON public.chat_channels TO service_role;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

INSERT INTO public.chat_channels (name, description, channel_type, is_premium, created_by)
SELECT v.name, v.description, v.channel_type, false, (SELECT user_id FROM public.profiles ORDER BY created_at LIMIT 1)
FROM (VALUES
  ('Student Lounge','Casual chat with students across the platform','student_general'),
  ('Homework Help','Ask questions and help each other with homework','student_general'),
  ('Exam Prep','Share revision tips and exam strategies','student_general'),
  ('Staff Room','General discussion for teachers','teacher_general'),
  ('Teaching Tips','Share classroom strategies and resources','teacher_general')
) AS v(name, description, channel_type)
WHERE NOT EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.name = v.name);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;