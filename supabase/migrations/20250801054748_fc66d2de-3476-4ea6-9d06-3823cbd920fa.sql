-- Create storage policies for course-content bucket to allow teachers to upload files

-- Allow teachers to upload course content (thumbnails and module content)
CREATE POLICY "Teachers can upload course content" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'course-content' AND 
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'teacher'
  )
);

-- Allow teachers to view their uploaded course content
CREATE POLICY "Teachers can view their course content" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'course-content' AND 
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'teacher'
  )
);

-- Allow students to view published course content
CREATE POLICY "Students can view published course content" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'course-content' AND 
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'student'
  )
);

-- Allow teachers to update their course content
CREATE POLICY "Teachers can update their course content" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'course-content' AND 
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'teacher'
  )
);

-- Allow teachers to delete their course content
CREATE POLICY "Teachers can delete their course content" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'course-content' AND 
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'teacher'
  )
);