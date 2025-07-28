-- Create storage buckets for teacher dashboard functionality
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('scans', 'scans', false),
  ('course-content', 'course-content', false),
  ('quiz-attachments', 'quiz-attachments', false),
  ('ai-documents', 'ai-documents', false);

-- Create storage policies for scans bucket (MCQ scanner)
CREATE POLICY "Teachers can upload scans" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can view their own scans" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can delete their own scans" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for course content bucket
CREATE POLICY "Teachers can upload course content" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'course-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can view their own course content" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view published course content" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-content');

-- Create storage policies for quiz attachments
CREATE POLICY "Teachers can upload quiz attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'quiz-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can view their quiz attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'quiz-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view quiz attachments for published quizzes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'quiz-attachments');

-- Create storage policies for AI documents
CREATE POLICY "Teachers can upload AI documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ai-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can view their AI documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ai-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fix function security warnings by setting search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;