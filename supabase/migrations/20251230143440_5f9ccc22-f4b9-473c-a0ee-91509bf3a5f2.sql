-- Fix overly permissive storage policy for course-content bucket
-- The old policy allows any student to access any file in course-content

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Students can view published course content" ON storage.objects;

-- Create a more restrictive policy that validates:
-- 1. User is a student
-- 2. The file belongs to a module of a published course
CREATE POLICY "Students can view content from published courses" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'course-content'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE c.is_published = true
    AND cm.is_published = true
    AND cm.content_url LIKE '%' || name
  )
);