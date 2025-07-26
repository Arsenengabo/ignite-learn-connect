-- Create user profiles table with role-based system
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  avatar_url TEXT,
  school_name TEXT,
  bio TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  time_limit INTEGER, -- in minutes
  total_questions INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Quiz policies
CREATE POLICY "Teachers can manage their own quizzes" 
ON public.quizzes 
FOR ALL 
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view published quizzes" 
ON public.quizzes 
FOR SELECT 
USING (is_published = true);

-- Create quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB, -- Store multiple choice options
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for quiz questions
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Quiz questions policies
CREATE POLICY "Teachers can manage questions for their quizzes" 
ON public.quiz_questions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE quizzes.id = quiz_questions.quiz_id 
    AND quizzes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view questions for published quizzes" 
ON public.quiz_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE quizzes.id = quiz_questions.quiz_id 
    AND quizzes.is_published = true
  )
);

-- Create study competitions table
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_participants INTEGER,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for competitions
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

-- Competition policies
CREATE POLICY "Teachers can manage their own competitions" 
ON public.competitions 
FOR ALL 
USING (auth.uid() = organizer_id);

CREATE POLICY "Everyone can view competitions" 
ON public.competitions 
FOR SELECT 
USING (true);

-- Create chat channels table
CREATE TABLE public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('teacher_general', 'teacher_school', 'student_general', 'student_school')),
  school_name TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for chat channels
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

-- Chat channel policies
CREATE POLICY "Users can view channels based on role" 
ON public.chat_channels 
FOR SELECT 
USING (
  (channel_type LIKE 'teacher_%' AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'teacher'
  )) OR
  (channel_type LIKE 'student_%' AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'student'
  ))
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration_weeks INTEGER,
  price DECIMAL(10,2) DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Course policies
CREATE POLICY "Teachers can manage their own courses" 
ON public.courses 
FOR ALL 
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view published courses" 
ON public.courses 
FOR SELECT 
USING (is_published = true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();