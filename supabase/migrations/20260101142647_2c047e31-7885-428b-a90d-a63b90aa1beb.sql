-- Fix quiz_questions security: Students should not see correct_answer before/during quiz

-- Drop existing student policy
DROP POLICY IF EXISTS "Students can view questions for published quizzes" ON public.quiz_questions;

-- Create a more restrictive policy
-- Teachers can see everything for their quizzes
-- Students can only access questions during active quiz sessions
CREATE POLICY "Students can view questions for published quizzes (restricted)" 
ON public.quiz_questions 
FOR SELECT 
USING (
  -- Teachers can see all fields for their own quizzes
  EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.id = quiz_questions.quiz_id 
    AND q.teacher_id = auth.uid()
  )
  OR
  -- Students can view questions only for quizzes where they have an active session
  (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_questions.quiz_id 
      AND q.is_published = true
      AND EXISTS (
        SELECT 1 FROM quiz_sessions qs
        WHERE qs.quiz_id = q.id 
        AND qs.student_id = auth.uid()
      )
    )
  )
);

-- Create a secure function to get quiz questions for students (without correct_answer)
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  question_text text,
  question_type text,
  options jsonb,
  points integer,
  order_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    qq.id,
    qq.question_text,
    qq.question_type,
    qq.options,
    qq.points,
    qq.order_index
  FROM public.quiz_questions qq
  JOIN public.quizzes q ON q.id = qq.quiz_id
  WHERE qq.quiz_id = _quiz_id
  AND q.is_published = true
  AND EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.quiz_id = _quiz_id 
    AND qs.student_id = auth.uid()
  )
  ORDER BY qq.order_index
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_student(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_quiz_questions_for_student(uuid) IS 
'Securely retrieves quiz questions for students without exposing correct_answer or explanation. Students must have an active session.';

-- Fix exam_sections security: Restrict to students with active attempts
DROP POLICY IF EXISTS "Students can view sections of published exams" ON public.exam_sections;

CREATE POLICY "Students can view sections of published exams (restricted)" 
ON public.exam_sections 
FOR SELECT 
USING (
  -- Teachers can see sections for their own exams
  EXISTS (
    SELECT 1 FROM exams e
    WHERE e.id = exam_sections.exam_id 
    AND e.teacher_id = auth.uid()
  )
  OR
  -- Students can only view sections for exams they're actively taking
  EXISTS (
    SELECT 1 FROM exams e
    WHERE e.id = exam_sections.exam_id 
    AND e.is_published = true
    AND EXISTS (
      SELECT 1 FROM exam_attempts ea
      WHERE ea.exam_id = e.id 
      AND ea.student_id = auth.uid()
    )
  )
);