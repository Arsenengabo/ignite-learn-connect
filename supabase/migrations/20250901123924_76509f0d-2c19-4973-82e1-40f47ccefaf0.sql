-- Create quiz system tables with proper security from the start

-- First create profiles table for user roles
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  time_limit INTEGER, -- in minutes
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users,
  total_questions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
CREATE POLICY "Published quizzes are viewable by everyone" ON public.quizzes
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can view their own quizzes" ON public.quizzes
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own quizzes" ON public.quizzes
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own quizzes" ON public.quizzes
  FOR DELETE USING (created_by = auth.uid());

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'open_ended')),
  options JSONB, -- Array of options for multiple choice
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on quiz_questions
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Quiz questions policies - SECURE from the start
CREATE POLICY "Quiz questions are viewable by quiz owners" ON public.quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q 
      WHERE q.id = quiz_questions.quiz_id 
      AND q.created_by = auth.uid()
    )
  );

CREATE POLICY "Quiz questions manageable by quiz owners" ON public.quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q 
      WHERE q.id = quiz_questions.quiz_id 
      AND q.created_by = auth.uid()
    )
  );

-- Create quiz_sessions table
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users,
  score INTEGER DEFAULT 0,
  total_questions INTEGER NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on quiz_sessions
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Quiz sessions policies
CREATE POLICY "Users can view their own sessions" ON public.quiz_sessions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Users can create their own sessions" ON public.quiz_sessions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON public.quiz_sessions
  FOR UPDATE USING (student_id = auth.uid());

-- Quiz owners can view sessions for their quizzes
CREATE POLICY "Quiz owners can view sessions" ON public.quiz_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q 
      WHERE q.id = quiz_sessions.quiz_id 
      AND q.created_by = auth.uid()
    )
  );

-- Create quiz_responses table
CREATE TABLE public.quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE(session_id, question_id)
);

-- Enable RLS on quiz_responses
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Quiz responses policies
CREATE POLICY "Users can view their own responses" ON public.quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_sessions s 
      WHERE s.id = quiz_responses.session_id 
      AND s.student_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own responses" ON public.quiz_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_sessions s 
      WHERE s.id = quiz_responses.session_id 
      AND s.student_id = auth.uid()
    )
  );

-- Quiz owners can view responses for their quizzes
CREATE POLICY "Quiz owners can view responses" ON public.quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_sessions s
      JOIN public.quizzes q ON q.id = s.quiz_id
      WHERE s.id = quiz_responses.session_id 
      AND q.created_by = auth.uid()
    )
  );

-- Create function to check if user completed a quiz
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

-- Create secure view for students - hides answers until quiz completion
CREATE OR REPLACE VIEW public.quiz_questions_safe AS
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
    WHEN public.has_completed_quiz(quiz_id, auth.uid())
    THEN correct_answer 
    ELSE NULL 
  END as correct_answer,
  CASE 
    WHEN public.has_completed_quiz(quiz_id, auth.uid())
    THEN explanation 
    ELSE NULL 
  END as explanation
FROM public.quiz_questions
WHERE EXISTS (
  SELECT 1 FROM public.quizzes q 
  WHERE q.id = quiz_questions.quiz_id 
  AND q.is_published = true
);

-- Grant permissions on the safe view
GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- Create secure quiz submission function
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

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON public.quiz_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quiz_sessions_updated_at BEFORE UPDATE ON public.quiz_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();