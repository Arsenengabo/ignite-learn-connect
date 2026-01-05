-- Add columns to exam_responses for enhanced AI feedback
ALTER TABLE public.exam_responses 
ADD COLUMN IF NOT EXISTS grammar_corrections jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS key_points_covered text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS key_points_missing text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS semantic_score numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS corrected_answer text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.exam_responses.grammar_corrections IS 'JSON containing original text, corrected text, and list of errors with types';
COMMENT ON COLUMN public.exam_responses.key_points_covered IS 'Array of key points that the student answer covered';
COMMENT ON COLUMN public.exam_responses.key_points_missing IS 'Array of key points that the student answer missed';
COMMENT ON COLUMN public.exam_responses.semantic_score IS 'Semantic similarity score 0-100 comparing student answer to expected answer';
COMMENT ON COLUMN public.exam_responses.corrected_answer IS 'Grammar-corrected version of student answer';