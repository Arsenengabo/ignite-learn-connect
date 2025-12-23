-- Exams table (exam templates/definitions)
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  difficulty_level TEXT DEFAULT 'medium',
  total_marks INTEGER DEFAULT 100,
  time_limit_minutes INTEGER DEFAULT 60,
  instructions TEXT,
  is_published BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exam sections (for multi-section exams)
CREATE TABLE public.exam_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  marks_per_question INTEGER DEFAULT 1,
  negative_marking NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exam questions (supports multiple types)
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.exam_sections(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'mcq', 'true_false', 'short_answer', 'long_answer', 'fill_blank'
  options JSONB, -- for MCQ/true-false: ["Option A", "Option B", ...]
  correct_answer TEXT, -- for objective questions
  marks INTEGER DEFAULT 1,
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exam attempts (student taking an exam)
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_remaining_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'evaluated'
  total_score NUMERIC DEFAULT 0,
  max_score NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exam responses (individual question responses)
CREATE TABLE public.exam_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN,
  marks_awarded NUMERIC DEFAULT 0,
  feedback TEXT, -- for manual grading feedback
  is_evaluated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_responses ENABLE ROW LEVEL SECURITY;

-- Exams policies
CREATE POLICY "Teachers can manage their own exams" 
ON public.exams FOR ALL 
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view published exams" 
ON public.exams FOR SELECT 
USING (is_published = true);

-- Exam sections policies
CREATE POLICY "Teachers can manage sections of their exams" 
ON public.exam_sections FOR ALL 
USING (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_sections.exam_id AND exams.teacher_id = auth.uid()));

CREATE POLICY "Students can view sections of published exams" 
ON public.exam_sections FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_sections.exam_id AND exams.is_published = true));

-- Exam questions policies
CREATE POLICY "Teachers can manage questions of their exams" 
ON public.exam_questions FOR ALL 
USING (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_questions.exam_id AND exams.teacher_id = auth.uid()));

CREATE POLICY "Students can view questions of published exams" 
ON public.exam_questions FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_questions.exam_id AND exams.is_published = true));

-- Exam attempts policies
CREATE POLICY "Students can manage their own attempts" 
ON public.exam_attempts FOR ALL 
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view attempts for their exams" 
ON public.exam_attempts FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_attempts.exam_id AND exams.teacher_id = auth.uid()));

CREATE POLICY "Teachers can update attempts for evaluation" 
ON public.exam_attempts FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_attempts.exam_id AND exams.teacher_id = auth.uid()));

-- Exam responses policies
CREATE POLICY "Students can manage their own responses" 
ON public.exam_responses FOR ALL 
USING (EXISTS (SELECT 1 FROM public.exam_attempts WHERE exam_attempts.id = exam_responses.attempt_id AND exam_attempts.student_id = auth.uid()));

CREATE POLICY "Teachers can view responses for their exams" 
ON public.exam_responses FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.exam_attempts 
  JOIN public.exams ON exams.id = exam_attempts.exam_id 
  WHERE exam_attempts.id = exam_responses.attempt_id AND exams.teacher_id = auth.uid()
));

CREATE POLICY "Teachers can update responses for grading" 
ON public.exam_responses FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.exam_attempts 
  JOIN public.exams ON exams.id = exam_attempts.exam_id 
  WHERE exam_attempts.id = exam_responses.attempt_id AND exams.teacher_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_attempts_updated_at
BEFORE UPDATE ON public.exam_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_responses_updated_at
BEFORE UPDATE ON public.exam_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_exam_sections_exam_id ON public.exam_sections(exam_id);
CREATE INDEX idx_exam_questions_exam_id ON public.exam_questions(exam_id);
CREATE INDEX idx_exam_questions_section_id ON public.exam_questions(section_id);
CREATE INDEX idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_student_id ON public.exam_attempts(student_id);
CREATE INDEX idx_exam_responses_attempt_id ON public.exam_responses(attempt_id);