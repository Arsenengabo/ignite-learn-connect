-- Fix weak LIKE pattern matching in storage policy for course-content bucket
-- Drop existing flawed policy
DROP POLICY IF EXISTS "Students can view content from published courses" ON storage.objects;

-- Create improved policy with exact path matching
CREATE POLICY "Students can view content from published courses" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'course-content'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM public.course_modules cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE c.is_published = true
    AND cm.is_published = true
    AND (
      -- Exact match: content_url equals the object name
      cm.content_url = name
      -- Or content_url ends with the object name (for full URLs stored in content_url)
      OR cm.content_url = (
        SELECT CONCAT(
          'https://',
          'ucziztbaamtmmvycfyuz.supabase.co/storage/v1/object/public/course-content/',
          name
        )
      )
    )
  )
);