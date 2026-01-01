-- Create a security definer function to safely get public display name
-- This allows showing names in chat without exposing sensitive profile data
CREATE OR REPLACE FUNCTION public.get_user_display_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(full_name, 'Anonymous User')
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_display_name(uuid) TO authenticated;

-- Add comment explaining the function's purpose
COMMENT ON FUNCTION public.get_user_display_name(uuid) IS 
'Securely retrieves only the display name for a user. Used for showing sender names in chat without exposing sensitive profile data like email, school, or location.';