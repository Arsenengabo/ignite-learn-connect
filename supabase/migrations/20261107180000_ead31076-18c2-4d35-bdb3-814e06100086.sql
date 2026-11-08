-- Week 1 security fixes from the pre-launch audit (C2, H1, H2, C3).
--
-- Scores, grades and attempt status can now be written only by the server's own grading
-- functions (SECURITY DEFINER, which run as the function owner) or by the teacher who owns
-- the exam/quiz. Direct writes from the browser run as the "authenticated" role; the guard
-- triggers below check that role, so they work whatever the existing policy names are.
-- The guards are SECURITY INVOKER on purpose: inside a grading function current_user is the
-- function owner, which is how the guards tell the server apart from the browser.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_browser_write()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT current_user IN ('authenticated', 'anon')
$$;

CREATE OR REPLACE FUNCTION public.is_exam_teacher(_exam_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM exams WHERE id = _exam_id AND teacher_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_quiz_teacher(_quiz_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM quizzes WHERE id = _quiz_id AND teacher_id = auth.uid())
$$;

-- When answers stop being accepted: start + time limit + 2 minutes grace,
-- and never after the exam closes (+ grace). NULL limits mean no deadline.
CREATE OR REPLACE FUNCTION public.exam_attempt_deadline(_attempt_id uuid)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT LEAST(
    COALESCE(a.started_at + make_interval(mins => e.time_limit_minutes + 2), 'infinity'::timestamptz),
    COALESCE(e.closes_at + interval '2 minutes', 'infinity'::timestamptz)
  )
  FROM exam_attempts a JOIN exams e ON e.id = a.exam_id
  WHERE a.id = _attempt_id
$$;

REVOKE EXECUTE ON FUNCTION public.is_exam_teacher(uuid), public.is_quiz_teacher(uuid), public.exam_attempt_deadline(uuid) FROM anon;

-- ---------------------------------------------------------------------------
-- C2 / H2: quiz sessions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_quiz_sessions()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.is_browser_write() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF public.is_quiz_teacher(OLD.quiz_id) THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Quiz attempts cannot be deleted';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.student_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You can only start your own quiz';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM quizzes WHERE id = NEW.quiz_id AND is_published = true) THEN
      RAISE EXCEPTION 'This quiz is not available';
    END IF;
    NEW.status := 'in_progress';
    NEW.score := NULL;
    NEW.completed_at := NULL;
    NEW.started_at := now();
    RETURN NEW;
  END IF;

  -- UPDATE
  IF public.is_quiz_teacher(OLD.quiz_id) THEN RETURN NEW; END IF;
  IF OLD.status IS DISTINCT FROM 'in_progress'
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
     OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.quiz_id IS DISTINCT FROM OLD.quiz_id THEN
    RAISE EXCEPTION 'Quiz results can only be set by the grading system';
  END IF;
  RETURN NEW;  -- only total_questions may change, while in progress
END;
$$;

DROP TRIGGER IF EXISTS guard_quiz_sessions ON public.quiz_sessions;
CREATE TRIGGER guard_quiz_sessions
  BEFORE INSERT OR UPDATE OR DELETE ON public.quiz_sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_sessions();

-- Quiz responses are written only by submit_quiz_responses().
CREATE OR REPLACE FUNCTION public.guard_quiz_responses()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_quiz uuid;
BEGIN
  IF NOT public.is_browser_write() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT quiz_id INTO v_quiz FROM quiz_sessions WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  IF public.is_quiz_teacher(v_quiz) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Quiz answers are saved by the grading system';
END;
$$;

DROP TRIGGER IF EXISTS guard_quiz_responses ON public.quiz_responses;
CREATE TRIGGER guard_quiz_responses
  BEFORE INSERT OR UPDATE OR DELETE ON public.quiz_responses
  FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_responses();

-- ---------------------------------------------------------------------------
-- C2 / H2: exam attempts (one attempt per student per exam, server-side timer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_exam_attempts()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_exam exams%ROWTYPE;
BEGIN
  IF NOT public.is_browser_write() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF public.is_exam_teacher(OLD.exam_id) THEN RETURN OLD; END IF;  -- a teacher can allow a retake
    RAISE EXCEPTION 'Exam attempts cannot be deleted';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.student_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You can only start your own exam';
    END IF;
    SELECT * INTO v_exam FROM exams WHERE id = NEW.exam_id;
    IF v_exam.id IS NULL OR v_exam.is_published IS NOT TRUE THEN
      RAISE EXCEPTION 'This exam is not available';
    END IF;
    IF v_exam.opens_at IS NOT NULL AND now() < v_exam.opens_at THEN
      RAISE EXCEPTION 'This exam has not opened yet';
    END IF;
    IF v_exam.closes_at IS NOT NULL AND now() > v_exam.closes_at THEN
      RAISE EXCEPTION 'This exam has closed';
    END IF;
    IF EXISTS (SELECT 1 FROM exam_attempts WHERE exam_id = NEW.exam_id AND student_id = NEW.student_id) THEN
      RAISE EXCEPTION 'You have already started this exam';
    END IF;
    NEW.status := 'in_progress';
    NEW.started_at := now();
    NEW.submitted_at := NULL;
    NEW.total_score := NULL;
    NEW.percentage := NULL;
    NEW.max_score := v_exam.total_marks;
    NEW.time_remaining_seconds := CASE WHEN v_exam.time_limit_minutes IS NULL THEN NULL ELSE v_exam.time_limit_minutes * 60 END;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF public.is_exam_teacher(OLD.exam_id) THEN RETURN NEW; END IF;
  IF OLD.status IS DISTINCT FROM 'in_progress'
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.total_score IS DISTINCT FROM OLD.total_score
     OR NEW.max_score IS DISTINCT FROM OLD.max_score
     OR NEW.percentage IS DISTINCT FROM OLD.percentage
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.exam_id IS DISTINCT FROM OLD.exam_id THEN
    RAISE EXCEPTION 'Exam results can only be set by the grading system';
  END IF;
  -- The countdown the browser saves can only go down.
  IF NEW.time_remaining_seconds IS NOT NULL AND OLD.time_remaining_seconds IS NOT NULL
     AND NEW.time_remaining_seconds > OLD.time_remaining_seconds THEN
    NEW.time_remaining_seconds := OLD.time_remaining_seconds;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_exam_attempts ON public.exam_attempts;
CREATE TRIGGER guard_exam_attempts
  BEFORE INSERT OR UPDATE OR DELETE ON public.exam_attempts
  FOR EACH ROW EXECUTE FUNCTION public.guard_exam_attempts();

-- Students may save their answer text while the exam is open; marks are set by the grading system or the teacher.
CREATE OR REPLACE FUNCTION public.guard_exam_responses()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_attempt exam_attempts%ROWTYPE;
BEGIN
  IF NOT public.is_browser_write() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT * INTO v_attempt FROM exam_attempts WHERE id = COALESCE(NEW.attempt_id, OLD.attempt_id);
  IF public.is_exam_teacher(v_attempt.exam_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Exam answers cannot be deleted';
  END IF;
  IF v_attempt.student_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only answer your own exam';
  END IF;
  IF v_attempt.status IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION 'This exam has already been submitted';
  END IF;
  IF now() > public.exam_attempt_deadline(v_attempt.id) THEN
    RAISE EXCEPTION 'Time is up for this exam';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.attempt_id IS DISTINCT FROM OLD.attempt_id OR NEW.question_id IS DISTINCT FROM OLD.question_id) THEN
    RAISE EXCEPTION 'Answers cannot be moved';
  END IF;

  -- Only the answer text comes from the browser.
  NEW.is_correct := NULL;
  NEW.marks_awarded := NULL;
  NEW.feedback := NULL;
  NEW.is_evaluated := false;
  NEW.grammar_corrections := NULL;
  NEW.key_points_covered := NULL;
  NEW.key_points_missing := NULL;
  NEW.semantic_score := NULL;
  NEW.corrected_answer := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_exam_responses ON public.exam_responses;
CREATE TRIGGER guard_exam_responses
  BEFORE INSERT OR UPDATE OR DELETE ON public.exam_responses
  FOR EACH ROW EXECUTE FUNCTION public.guard_exam_responses();

-- ---------------------------------------------------------------------------
-- C2: competition scores
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_competition_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.is_browser_write() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF EXISTS (SELECT 1 FROM competitions WHERE id = COALESCE(NEW.competition_id, OLD.competition_id) AND organizer_id = auth.uid()) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.score := 0;
    NEW.correct_answers := 0;
    NEW.time_taken_seconds := NULL;
    NEW.finished_at := NULL;
    NEW.joined_at := now();
    RETURN NEW;
  END IF;
  IF NEW.score IS DISTINCT FROM OLD.score
     OR NEW.correct_answers IS DISTINCT FROM OLD.correct_answers
     OR NEW.time_taken_seconds IS DISTINCT FROM OLD.time_taken_seconds
     OR NEW.finished_at IS DISTINCT FROM OLD.finished_at
     OR NEW.competition_id IS DISTINCT FROM OLD.competition_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'Competition scores can only be set by the scoring system';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_competition_entries ON public.competition_entries;
CREATE TRIGGER guard_competition_entries
  BEFORE INSERT OR UPDATE OR DELETE ON public.competition_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_competition_entries();

-- ---------------------------------------------------------------------------
-- H2: grading functions refuse a second submission and enforce the exam deadline
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_exam_responses(p_attempt_id uuid, p_responses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_status TEXT;
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

  -- Security (audit H2): one submission only, and the time limit is enforced here, not in the browser.
  SELECT status INTO v_status FROM exam_attempts WHERE id = p_attempt_id;
  IF v_status IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION 'This exam has already been submitted';
  END IF;
  IF now() > public.exam_attempt_deadline(p_attempt_id) THEN
    -- Late: grade only the answers that were saved before the deadline.
    SELECT COALESCE(jsonb_agg(jsonb_build_object('question_id', question_id, 'answer', answer)), '[]'::jsonb)
      INTO p_responses
      FROM exam_responses WHERE attempt_id = p_attempt_id;
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
$function$;

CREATE OR REPLACE FUNCTION public.submit_quiz_responses(_session_id uuid, _responses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Security (audit H2): a quiz session can be submitted once.
  IF (SELECT status FROM quiz_sessions WHERE id = _session_id) IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION 'This quiz has already been submitted';
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
$function$;

-- ---------------------------------------------------------------------------
-- C3: anyone can still pick teacher, mentor or school admin at signup (the signup
-- wizard and school registration depend on it), but such accounts now start as
-- "pending" until a person approves them. Students and all existing accounts are
-- "verified". Users cannot change their own status.
-- To approve someone for now: set profiles.verification_status = 'verified'
-- in the Lovable table editor. An approval screen follows once we decide who approves.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'verified'
  CHECK (verification_status IN ('pending', 'verified', 'rejected'));

CREATE OR REPLACE FUNCTION public.set_profile_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := CASE WHEN NEW.role IN ('teacher', 'mentor', 'school_admin') THEN 'pending' ELSE 'verified' END;
  ELSIF public.is_browser_write() AND NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    NEW.verification_status := OLD.verification_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_verification ON public.profiles;
CREATE TRIGGER set_profile_verification
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_verification();

-- Students only see approved mentors.
CREATE OR REPLACE FUNCTION public.list_mentors()
 RETURNS TABLE(user_id uuid, full_name text, organization_name text, role_description text, subjects_taught text[], province text, district text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.user_id,
    COALESCE(p.full_name, 'Mentor'),
    COALESCE(p.organization_name, ''),
    COALESCE(p.role_description, ''),
    COALESCE(p.subjects_taught, ARRAY[]::text[]),
    COALESCE(p.province, ''),
    COALESCE(p.district, '')
  FROM public.profiles p
  WHERE public.has_role(p.user_id, 'mentor'::app_role)
    AND p.verification_status = 'verified'  -- audit C3: unverified mentors are not shown to students
  ORDER BY p.full_name
$function$;

-- ---------------------------------------------------------------------------
-- H1: teachers can change and list only their own course files (folder = their user id).
-- Students keep read access to files of published courses (existing policy).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers can upload course content" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update their course content" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete their course content" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view their course content" ON storage.objects;

CREATE POLICY "Teachers can upload course content"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-content'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can update their course content"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-content' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'course-content' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers can delete their course content"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-content' AND (storage.foldername(name))[1] = auth.uid()::text);
