-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'other');

-- Create user_roles table for secure role storage
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS education_level text,
ADD COLUMN IF NOT EXISTS subjects_taught text[],
ADD COLUMN IF NOT EXISTS education_level_taught text,
ADD COLUMN IF NOT EXISTS combination_department text,
ADD COLUMN IF NOT EXISTS organization_name text,
ADD COLUMN IF NOT EXISTS role_description text;

-- Update handle_new_user function to not set role in profiles (role is in user_roles now)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
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
  user_role := COALESCE(
    NULLIF(new.raw_user_meta_data->>'role', '')::app_role, 
    'student'::app_role
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role);

  RETURN new;
END;
$$;