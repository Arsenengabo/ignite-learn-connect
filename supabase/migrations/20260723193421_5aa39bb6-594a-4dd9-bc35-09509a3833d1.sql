
CREATE INDEX IF NOT EXISTS idx_exams_teacher_id ON public.exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exams_is_published ON public.exams(is_published);
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher_id ON public.quizzes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_published ON public.quizzes(is_published);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz_id ON public.quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_student_id ON public.quiz_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session_id ON public.quiz_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_student_id ON public.course_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course_id ON public.course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_competitions_organizer_id ON public.competitions(organizer_id);
CREATE INDEX IF NOT EXISTS idx_mcq_scans_teacher_id ON public.mcq_scans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_mcq_scans_quiz_id ON public.mcq_scans(quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
