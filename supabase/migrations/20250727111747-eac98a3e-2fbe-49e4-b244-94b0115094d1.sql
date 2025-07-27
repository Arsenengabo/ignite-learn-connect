-- Create table for quiz sessions and responses
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for quiz responses
CREATE TABLE public.quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for course content/modules
CREATE TABLE public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL, -- 'video', 'document', 'text'
  content_url TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for MCQ scan results
CREATE TABLE public.mcq_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id),
  scan_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  answer_key JSONB NOT NULL, -- Store correct answers
  results JSONB, -- Store scanning results
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for teacher chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'file', 'image'
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quiz sessions
CREATE POLICY "Students can manage their own quiz sessions"
ON public.quiz_sessions
FOR ALL
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view sessions for their quizzes"
ON public.quiz_sessions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.quizzes 
  WHERE quizzes.id = quiz_sessions.quiz_id 
  AND quizzes.teacher_id = auth.uid()
));

-- Create RLS policies for quiz responses
CREATE POLICY "Students can manage their own quiz responses"
ON public.quiz_responses
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.quiz_sessions 
  WHERE quiz_sessions.id = quiz_responses.session_id 
  AND quiz_sessions.student_id = auth.uid()
));

CREATE POLICY "Teachers can view responses for their quizzes"
ON public.quiz_responses
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.quiz_sessions 
  JOIN public.quizzes ON quizzes.id = quiz_sessions.quiz_id
  WHERE quiz_sessions.id = quiz_responses.session_id 
  AND quizzes.teacher_id = auth.uid()
));

-- Create RLS policies for course modules
CREATE POLICY "Teachers can manage their course modules"
ON public.course_modules
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.courses 
  WHERE courses.id = course_modules.course_id 
  AND courses.teacher_id = auth.uid()
));

CREATE POLICY "Students can view published course modules"
ON public.course_modules
FOR SELECT
USING (is_published = true AND EXISTS (
  SELECT 1 FROM public.courses 
  WHERE courses.id = course_modules.course_id 
  AND courses.is_published = true
));

-- Create RLS policies for MCQ scans
CREATE POLICY "Teachers can manage their own MCQ scans"
ON public.mcq_scans
FOR ALL
USING (auth.uid() = teacher_id);

-- Create RLS policies for chat messages
CREATE POLICY "Users can view messages in accessible channels"
ON public.chat_messages
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_channels 
  WHERE chat_channels.id = chat_messages.channel_id
  AND (
    (chat_channels.channel_type LIKE 'teacher_%' AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'teacher'
    ))
    OR
    (chat_channels.channel_type LIKE 'student_%' AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'student'
    ))
  )
));

CREATE POLICY "Users can send messages to accessible channels"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id AND EXISTS (
  SELECT 1 FROM public.chat_channels 
  WHERE chat_channels.id = chat_messages.channel_id
  AND (
    (chat_channels.channel_type LIKE 'teacher_%' AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'teacher'
    ))
    OR
    (chat_channels.channel_type LIKE 'student_%' AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'student'
    ))
  )
));

-- Create triggers for updating timestamps
CREATE TRIGGER update_course_modules_updated_at
BEFORE UPDATE ON public.course_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mcq_scans_updated_at
BEFORE UPDATE ON public.mcq_scans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();