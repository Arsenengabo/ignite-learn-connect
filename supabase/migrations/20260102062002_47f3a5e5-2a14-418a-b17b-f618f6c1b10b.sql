-- Create a secure function to get exam questions for students (without exposing correct answers)
CREATE OR REPLACE FUNCTION public.get_exam_questions_for_student(_exam_id uuid)
RETURNS TABLE(
  id uuid, 
  question_text text, 
  question_type text, 
  options jsonb, 
  marks integer, 
  order_index integer,
  section_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    eq.id,
    eq.question_text,
    eq.question_type,
    eq.options,
    eq.marks,
    eq.order_index,
    eq.section_id
  FROM public.exam_questions eq
  JOIN public.exams e ON e.id = eq.exam_id
  WHERE eq.exam_id = _exam_id
  AND e.is_published = true
  AND EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    WHERE ea.exam_id = _exam_id 
    AND ea.student_id = auth.uid()
  )
  ORDER BY eq.order_index
$$;