-- Create function to check if student has completed an exam
-- This is used by the secure view to determine if answers should be revealed
CREATE OR REPLACE FUNCTION public.has_completed_exam(exam_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.exam_attempts 
    WHERE exam_id = exam_id_param 
    AND student_id = user_id_param 
    AND status IN ('submitted', 'evaluated')
  );
END;
$$;

-- Create secure view that hides correct_answer and explanation during exam
-- Students can only see answers after they have submitted the exam
CREATE OR REPLACE VIEW public.exam_questions_student_view AS
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
COMMENT ON VIEW public.exam_questions_student_view IS 'Secure view for students that hides correct_answer and explanation until the exam is submitted. Teachers should use the exam_questions table directly.';

COMMENT ON FUNCTION public.has_completed_exam(UUID, UUID) IS 'Security function to check if a student has completed an exam (status is submitted or evaluated). Used by exam_questions_student_view to control answer visibility.';