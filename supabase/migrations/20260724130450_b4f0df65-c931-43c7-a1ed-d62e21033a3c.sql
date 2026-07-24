
CREATE INDEX IF NOT EXISTS idx_exams_published_created ON public.exams (is_published, created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_quizzes_published_created ON public.quizzes (is_published, created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_courses_published_created ON public.courses (is_published, created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_exam ON public.exam_attempts (student_id, exam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_student_quiz ON public.quiz_sessions (student_id, quiz_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_order ON public.exam_questions (exam_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exam_sections_exam_order ON public.exam_sections (exam_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_order ON public.quiz_questions (quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exam_responses_attempt ON public.exam_responses (attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session ON public.quiz_responses (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON public.chat_messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_progress_student_course ON public.course_progress (student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_order ON public.course_modules (course_id, order_index);
