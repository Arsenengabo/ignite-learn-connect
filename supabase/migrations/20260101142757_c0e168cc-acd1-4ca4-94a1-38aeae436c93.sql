-- Create a secure function to submit and score quiz responses
-- This evaluates answers server-side without exposing correct_answer to students
CREATE OR REPLACE FUNCTION public.submit_quiz_responses(
  _session_id uuid,
  _responses jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_quiz_id UUID;
  v_total_score INTEGER := 0;
  v_max_score INTEGER := 0;
  v_response JSONB;
  v_question RECORD;
  v_answer TEXT;
  v_is_correct BOOLEAN;
  v_points_earned INTEGER;
BEGIN
  -- Verify the caller owns this session
  SELECT student_id, quiz_id INTO v_student_id, v_quiz_id
  FROM quiz_sessions
  WHERE id = _session_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_student_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: you can only submit your own quiz';
  END IF;

  -- Process each response
  FOR v_response IN SELECT * FROM jsonb_array_elements(_responses)
  LOOP
    -- Get question details including correct_answer (server-side only)
    SELECT 
      id,
      correct_answer,
      points
    INTO v_question
    FROM quiz_questions
    WHERE id = (v_response->>'question_id')::UUID
      AND quiz_id = v_quiz_id;

    IF v_question IS NULL THEN
      CONTINUE; -- Skip invalid question IDs
    END IF;

    v_answer := v_response->>'answer';
    v_max_score := v_max_score + v_question.points;

    -- Evaluate answer
    v_is_correct := LOWER(TRIM(v_answer)) = LOWER(TRIM(v_question.correct_answer));
    v_points_earned := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;
    v_total_score := v_total_score + v_points_earned;

    -- Upsert response
    INSERT INTO quiz_responses (session_id, question_id, answer, is_correct, points_earned)
    VALUES (_session_id, v_question.id, v_answer, v_is_correct, v_points_earned)
    ON CONFLICT (session_id, question_id)
    DO UPDATE SET
      answer = EXCLUDED.answer,
      is_correct = EXCLUDED.is_correct,
      points_earned = EXCLUDED.points_earned;
  END LOOP;

  -- Update session status
  UPDATE quiz_sessions
  SET 
    status = 'completed',
    completed_at = NOW(),
    score = v_total_score
  WHERE id = _session_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'total_score', v_total_score,
    'max_score', v_max_score,
    'percentage', CASE WHEN v_max_score > 0 THEN ROUND((v_total_score::NUMERIC / v_max_score) * 100) ELSE 0 END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_responses(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.submit_quiz_responses(uuid, jsonb) IS 
'Securely submits and scores quiz responses. Evaluates answers server-side without exposing correct_answer to students.';