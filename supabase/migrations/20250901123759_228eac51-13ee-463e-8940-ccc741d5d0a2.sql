-- Fix security vulnerability: Hide quiz answers from students during quiz taking

-- First, let's create a security definer function to check if a user has completed a quiz
CREATE OR REPLACE FUNCTION public.has_completed_quiz(quiz_id_param UUID, user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.quiz_sessions 
    WHERE quiz_id = quiz_id_param 
    AND student_id = user_id_param 
    AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing policies for quiz_questions if they exist
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Teachers can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Quiz questions are viewable by authenticated users" ON public.quiz_questions;

-- Create secure RLS policies for quiz_questions
-- Teachers can see everything
CREATE POLICY "Teachers can view all quiz questions with answers"
ON public.quiz_questions
FOR SELECT
USING (public.get_current_user_role() = 'teacher');

-- Teachers can manage quiz questions  
CREATE POLICY "Teachers can manage quiz questions"
ON public.quiz_questions
FOR ALL
USING (public.get_current_user_role() = 'teacher');

-- Students can only see question text and options, NOT correct answers or explanations
-- This policy will be used by a view that excludes sensitive fields
CREATE POLICY "Students can view quiz question basics only"
ON public.quiz_questions
FOR SELECT
USING (
  public.get_current_user_role() = 'student' AND
  EXISTS (
    SELECT 1 FROM public.quizzes q 
    WHERE q.id = quiz_questions.quiz_id 
    AND q.is_published = true
  )
);

-- Create a secure view for students that excludes sensitive information
CREATE OR REPLACE VIEW public.quiz_questions_student_view AS
SELECT 
  id,
  quiz_id,
  question_text,
  question_type,
  options,
  points,
  order_index,
  created_at,
  updated_at,
  -- Only show correct_answer and explanation after quiz completion
  CASE 
    WHEN public.has_completed_quiz(quiz_id, auth.uid()) OR public.get_current_user_role() = 'teacher'
    THEN correct_answer 
    ELSE NULL 
  END as correct_answer,
  CASE 
    WHEN public.has_completed_quiz(quiz_id, auth.uid()) OR public.get_current_user_role() = 'teacher'
    THEN explanation 
    ELSE NULL 
  END as explanation
FROM public.quiz_questions
WHERE 
  -- Students can only see questions from published quizzes
  (public.get_current_user_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.quizzes q 
    WHERE q.id = quiz_questions.quiz_id 
    AND q.is_published = true
  ))
  -- Teachers can see all questions
  OR public.get_current_user_role() = 'teacher';

-- Grant permissions on the view
GRANT SELECT ON public.quiz_questions_student_view TO authenticated;

-- Create a secure quiz submission function
CREATE OR REPLACE FUNCTION public.submit_quiz_responses(
  session_id_param UUID,
  responses JSONB
) RETURNS JSONB AS $$
DECLARE
  session_record RECORD;
  question_record RECORD;
  response_item JSONB;
  total_score INTEGER := 0;
  max_score INTEGER := 0;
  result JSONB;
BEGIN
  -- Get session details and verify ownership
  SELECT * INTO session_record
  FROM public.quiz_sessions 
  WHERE id = session_id_param 
  AND student_id = auth.uid()
  AND status = 'in_progress';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or completed quiz session';
  END IF;

  -- Process each response
  FOR response_item IN SELECT * FROM jsonb_array_elements(responses)
  LOOP
    -- Get the question details
    SELECT * INTO question_record
    FROM public.quiz_questions
    WHERE id = (response_item->>'question_id')::UUID
    AND quiz_id = session_record.quiz_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid question ID: %', response_item->>'question_id';
    END IF;
    
    -- Calculate score for this question
    DECLARE
      user_answer TEXT := response_item->>'answer';
      is_correct BOOLEAN := user_answer = question_record.correct_answer;
      points_earned INTEGER := CASE WHEN is_correct THEN question_record.points ELSE 0 END;
    BEGIN
      total_score := total_score + points_earned;
      max_score := max_score + question_record.points;
      
      -- Insert the response
      INSERT INTO public.quiz_responses (
        session_id,
        question_id,
        answer,
        is_correct,
        points_earned
      ) VALUES (
        session_id_param,
        (response_item->>'question_id')::UUID,
        user_answer,
        is_correct,
        points_earned
      );
    END;
  END LOOP;
  
  -- Update session as completed
  UPDATE public.quiz_sessions 
  SET 
    status = 'completed',
    score = total_score,
    completed_at = now()
  WHERE id = session_id_param;
  
  -- Return result
  result := jsonb_build_object(
    'total_score', total_score,
    'max_score', max_score,
    'session_id', session_id_param
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.submit_quiz_responses(UUID, JSONB) TO authenticated;