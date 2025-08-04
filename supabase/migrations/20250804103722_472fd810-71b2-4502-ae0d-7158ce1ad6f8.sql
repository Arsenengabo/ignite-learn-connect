-- Update existing course modules to be published
UPDATE course_modules 
SET is_published = true 
WHERE course_id = '1440868d-64bd-4914-970c-9e4feaf00d6c' AND is_published = false;