-- Create a SECURITY DEFINER function to evaluate exam responses server-side
-- This prevents students from accessing correct_answer directly

CREATE OR REPLACE FUNCTION public.evaluate_exam_responses(
  p_attempt_id UUID,
  p_responses JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_exam_id UUID;
  v_total_score NUMERIC := 0;
  v_max_score NUMERIC := 0;
  v_response JSONB;
  v_question RECORD;
  v_answer TEXT;
  v_is_correct BOOLEAN;
  v_marks_awarded NUMERIC;
  v_has_subjective BOOLEAN := FALSE;
BEGIN
  -- Verify the caller owns this attempt
  SELECT student_id, exam_id INTO v_student_id, v_exam_id
  FROM exam_attempts
  WHERE id = p_attempt_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF v_student_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: you can only submit your own exam';
  END IF;

  -- Process each response
  FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
  LOOP
    -- Get question details including correct_answer (server-side only)
    SELECT 
      id,
      question_type,
      correct_answer,
      marks
    INTO v_question
    FROM exam_questions
    WHERE id = (v_response->>'question_id')::UUID
      AND exam_id = v_exam_id;

    IF v_question IS NULL THEN
      CONTINUE; -- Skip invalid question IDs
    END IF;

    v_answer := v_response->>'answer';
    v_max_score := v_max_score + v_question.marks;

    -- Evaluate objective questions
    IF v_question.question_type IN ('mcq', 'true_false', 'fill_blank') THEN
      v_is_correct := LOWER(TRIM(v_answer)) = LOWER(TRIM(v_question.correct_answer));
      v_marks_awarded := CASE WHEN v_is_correct THEN v_question.marks ELSE 0 END;
      v_total_score := v_total_score + v_marks_awarded;

      -- Upsert response
      INSERT INTO exam_responses (attempt_id, question_id, answer, is_correct, marks_awarded, is_evaluated)
      VALUES (p_attempt_id, v_question.id, v_answer, v_is_correct, v_marks_awarded, TRUE)
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET
        answer = EXCLUDED.answer,
        is_correct = EXCLUDED.is_correct,
        marks_awarded = EXCLUDED.marks_awarded,
        is_evaluated = TRUE,
        updated_at = NOW();
    ELSE
      -- Subjective questions need teacher evaluation
      v_has_subjective := TRUE;
      
      INSERT INTO exam_responses (attempt_id, question_id, answer, is_evaluated)
      VALUES (p_attempt_id, v_question.id, v_answer, FALSE)
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET
        answer = EXCLUDED.answer,
        is_evaluated = FALSE,
        updated_at = NOW();
    END IF;
  END LOOP;

  -- Update attempt status
  UPDATE exam_attempts
  SET 
    status = CASE WHEN v_has_subjective THEN 'submitted' ELSE 'evaluated' END,
    submitted_at = NOW(),
    total_score = v_total_score,
    max_score = v_max_score,
    percentage = CASE WHEN v_max_score > 0 THEN (v_total_score / v_max_score) * 100 ELSE 0 END
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'total_score', v_total_score,
    'max_score', v_max_score,
    'has_subjective', v_has_subjective,
    'status', CASE WHEN v_has_subjective THEN 'submitted' ELSE 'evaluated' END
  );
END;
$$;

-- Add unique constraint for upsert if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'exam_responses_attempt_id_question_id_key'
  ) THEN
    ALTER TABLE exam_responses 
    ADD CONSTRAINT exam_responses_attempt_id_question_id_key 
    UNIQUE (attempt_id, question_id);
  END IF;
END $$;