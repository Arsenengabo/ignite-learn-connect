-- Create storage policies for course content uploads

-- Policy for teachers to upload course content
CREATE POLICY "Teachers can upload course content" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'course-content' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
);

-- Policy for teachers to view their uploaded content
CREATE POLICY "Teachers can view their course content" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'course-content' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
);

-- Policy for students to view published course content  
CREATE POLICY "Students can view published course content" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'course-content'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'student'
  )
);

-- Policy for teachers to update/delete their content
CREATE POLICY "Teachers can update their course content" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'course-content' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
);

CREATE POLICY "Teachers can delete their course content" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'course-content' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
);