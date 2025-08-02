-- Update unpublished courses to be published so students can see them
UPDATE courses 
SET is_published = true 
WHERE is_published = false;