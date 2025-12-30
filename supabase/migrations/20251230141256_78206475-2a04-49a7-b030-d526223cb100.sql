-- Drop the existing policy that allows students full access to exam_questions
DROP POLICY IF EXISTS "Students can view questions of published exams" ON public.exam_questions;

-- Create a new policy that only allows students to view questions through the secure view
-- by checking if they have an active (in_progress) attempt OR have completed the exam
-- This policy is more restrictive - students can only see questions they're actively taking
CREATE POLICY "Students can view questions of published exams" 
ON public.exam_questions 
FOR SELECT 
USING (
  -- Allow if exam is published AND student has an attempt for this exam
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_questions.exam_id 
    AND e.is_published = true
    AND EXISTS (
      SELECT 1 FROM public.exam_attempts ea
      WHERE ea.exam_id = e.id 
      AND ea.student_id = auth.uid()
    )
  )
  OR
  -- Allow teachers to always see their own exam questions
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_questions.exam_id 
    AND e.teacher_id = auth.uid()
  )
);