
-- 1) Remove student direct SELECT on exam_questions (they use get_exam_questions_for_student RPC)
DROP POLICY IF EXISTS "Students can view questions of published exams" ON public.exam_questions;
CREATE POLICY "Teachers can view their exam questions"
  ON public.exam_questions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_questions.exam_id AND e.teacher_id = auth.uid()));

-- 2) Remove student direct SELECT on quiz_questions (they use get_quiz_questions_for_student RPC)
DROP POLICY IF EXISTS "Students can view questions for published quizzes (restricted)" ON public.quiz_questions;
CREATE POLICY "Teachers can view their quiz questions"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_questions.quiz_id AND q.teacher_id = auth.uid()));

-- 3) Lock down SECURITY DEFINER trigger-only functions - not callable by clients
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 4) Restrict SECURITY DEFINER helper/RPC functions to authenticated users only (no anon)
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_display_name(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_display_name(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_quiz_questions_for_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_student(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_exam_questions_for_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exam_questions_for_student(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.evaluate_exam_responses(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_exam_responses(uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_quiz_responses(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_responses(uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.has_completed_exam(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_completed_exam(uuid, uuid) TO authenticated;

-- 5) Consolidate overlapping storage policies on 'scans' bucket - keep the role-checked ones only
DROP POLICY IF EXISTS "Teachers can upload scans" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view their own scans" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete their own scans" ON storage.objects;
