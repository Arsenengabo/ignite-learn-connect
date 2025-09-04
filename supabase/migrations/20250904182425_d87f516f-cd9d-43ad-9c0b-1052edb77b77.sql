-- Create storage policies for the scans bucket to allow teachers to upload and manage answer sheet scans

-- Policy to allow teachers to upload files to the scans bucket
-- Files should be organized by teacher ID in subfolders
CREATE POLICY "Teachers can upload scan files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'scans' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow teachers to view their own scan files
CREATE POLICY "Teachers can view their own scan files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'scans' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow teachers to update their own scan files
CREATE POLICY "Teachers can update their own scan files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'scans' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow teachers to delete their own scan files
CREATE POLICY "Teachers can delete their own scan files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'scans' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
  AND (storage.foldername(name))[1] = auth.uid()::text
);