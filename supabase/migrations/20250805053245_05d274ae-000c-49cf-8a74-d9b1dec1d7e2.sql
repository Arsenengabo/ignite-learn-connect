-- Create table to track student course progress
CREATE TABLE public.course_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage NUMERIC DEFAULT 0,
  modules_completed INTEGER DEFAULT 0,
  total_modules INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for course progress
CREATE POLICY "Students can view their own progress"
ON public.course_progress
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own progress"
ON public.course_progress
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own progress"
ON public.course_progress
FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view progress for their courses"
ON public.course_progress
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.courses
  WHERE courses.id = course_progress.course_id
  AND courses.teacher_id = auth.uid()
));

-- Create trigger for timestamp updates
CREATE TRIGGER update_course_progress_updated_at
BEFORE UPDATE ON public.course_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time for course_progress table
ALTER TABLE public.course_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_progress;