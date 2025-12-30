-- Create a trigger function to prevent users from modifying the role column in profiles
-- This ensures roles can only be set during initial profile creation via handle_new_user trigger

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this is an UPDATE and the role is being changed
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- Prevent the role change by keeping the old value
    NEW.role := OLD.role;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to protect role column on updates
DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;

CREATE TRIGGER protect_profile_role_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- Also add a comment explaining the security measure
COMMENT ON FUNCTION public.protect_profile_role() IS 'Security trigger function that prevents users from modifying the role column in profiles table. Roles can only be set during user creation via handle_new_user trigger.';