-- 1. Fix privilege escalation: restrict self-insert on user_roles to only 'student' role.
-- Teachers/other elevated roles must be assigned via the handle_new_user trigger (SECURITY DEFINER) or by an admin.
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can self-assign student role only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'student'::public.app_role);

-- 2. Fix overpermissive quiz_questions policy (if it still exists from old migration).
DROP POLICY IF EXISTS "Authenticated users can manage quiz questions" ON public.quiz_questions;

-- 3. Tighten quiz-attachments storage bucket: only the owning teacher (file path prefixed with quiz_id they own)
-- or an enrolled student of the published quiz can read.
DROP POLICY IF EXISTS "Students can view quiz attachments for published quizzes" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can manage their quiz attachments" ON storage.objects;

-- Files are expected to be stored as: <quiz_id>/<filename>
CREATE POLICY "Teachers manage their quiz attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'quiz-attachments'
  AND EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id::text = (storage.foldername(name))[1]
      AND q.teacher_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'quiz-attachments'
  AND EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id::text = (storage.foldername(name))[1]
      AND q.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students view attachments for quizzes they have a session in"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'quiz-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.quizzes q
    JOIN public.quiz_sessions qs ON qs.quiz_id = q.id
    WHERE q.id::text = (storage.foldername(name))[1]
      AND q.is_published = true
      AND qs.student_id = auth.uid()
  )
);