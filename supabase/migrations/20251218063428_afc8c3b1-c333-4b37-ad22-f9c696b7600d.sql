-- Fix the handle_new_user function to include the role column in profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Determine the role
  user_role := COALESCE(
    NULLIF(new.raw_user_meta_data->>'role', '')::app_role, 
    'student'::app_role
  );

  -- Insert into profiles with the role column
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name,
    role,
    school_name,
    province,
    district,
    education_level,
    subjects_taught,
    education_level_taught,
    combination_department,
    organization_name,
    role_description
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    user_role::text,
    COALESCE(new.raw_user_meta_data->>'school_name', ''),
    COALESCE(new.raw_user_meta_data->>'province', ''),
    COALESCE(new.raw_user_meta_data->>'district', ''),
    COALESCE(new.raw_user_meta_data->>'education_level', ''),
    CASE 
      WHEN new.raw_user_meta_data->>'subjects_taught' IS NOT NULL 
      THEN ARRAY(SELECT json_array_elements_text((new.raw_user_meta_data->>'subjects_taught')::json))
      ELSE NULL
    END,
    COALESCE(new.raw_user_meta_data->>'education_level_taught', ''),
    COALESCE(new.raw_user_meta_data->>'combination_department', ''),
    COALESCE(new.raw_user_meta_data->>'organization_name', ''),
    COALESCE(new.raw_user_meta_data->>'role_description', '')
  );

  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role);

  RETURN new;
END;
$function$;