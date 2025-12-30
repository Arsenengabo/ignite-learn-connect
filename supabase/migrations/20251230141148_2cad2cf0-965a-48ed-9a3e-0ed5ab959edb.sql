-- Drop and recreate the view with explicit SECURITY INVOKER
-- This ensures the view runs with the permissions of the querying user
DROP VIEW IF EXISTS public.exam_questions_student_view;

CREATE VIEW public.exam_questions_student_view 
WITH (security_invoker = true)
AS
SELECT 
  id, 
  exam_id, 
  section_id, 
  question_text, 
  question_type, 
  options, 
  marks, 
  order_index, 
  created_at,
  CASE 
    WHEN public.has_completed_exam(exam_id, auth.uid())
    THEN correct_answer 
    ELSE NULL 
  END as correct_answer,
  CASE 
    WHEN public.has_completed_exam(exam_id, auth.uid())
    THEN explanation 
    ELSE NULL 
  END as explanation
FROM public.exam_questions;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.exam_questions_student_view TO authenticated;

-- Add comment explaining the security measure
COMMENT ON VIEW public.exam_questions_student_view IS 'Secure view for students that hides correct_answer and explanation until the exam is submitted. Uses SECURITY INVOKER so RLS on exam_questions is enforced.';