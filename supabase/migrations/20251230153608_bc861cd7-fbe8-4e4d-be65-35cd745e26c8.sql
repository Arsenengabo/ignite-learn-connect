-- Add columns to exam_questions for AI evaluation metadata
ALTER TABLE public.exam_questions 
ADD COLUMN IF NOT EXISTS sample_answer text,
ADD COLUMN IF NOT EXISTS key_points jsonb,
ADD COLUMN IF NOT EXISTS evaluation_guidelines text;

-- Add index for faster question lookups during grading
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_section 
ON public.exam_questions(exam_id, section_id, order_index);