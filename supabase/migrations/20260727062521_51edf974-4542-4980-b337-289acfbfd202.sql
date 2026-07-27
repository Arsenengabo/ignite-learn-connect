
-- ============ SCHOOLS ============
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  province TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  education_levels TEXT[] NOT NULL DEFAULT '{}',
  contact_email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- ============ SCHOOL MEMBERS ============
CREATE TABLE public.school_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  member_role TEXT NOT NULL CHECK (member_role IN ('teacher','student','admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_members TO authenticated;
GRANT ALL ON public.school_members TO service_role;
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_school_members_school_status ON public.school_members(school_id, status);
CREATE INDEX idx_school_members_user ON public.school_members(user_id);

-- ============ MENTOR ENROLLMENTS ============
CREATE TABLE public.mentor_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  message TEXT NOT NULL DEFAULT '',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_enrollments TO authenticated;
GRANT ALL ON public.mentor_enrollments TO service_role;
ALTER TABLE public.mentor_enrollments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mentor_enrollments_mentor ON public.mentor_enrollments(mentor_id, status);
CREATE INDEX idx_mentor_enrollments_student ON public.mentor_enrollments(student_id, status);

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id AND school_id = _school_id
      AND member_role = 'admin' AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_school_member(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id AND school_id = _school_id AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_school(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.school_members
  WHERE user_id = _user_id AND status = 'approved'
  ORDER BY created_at LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.generate_school_code()
RETURNS TEXT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.schools WHERE join_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- Look up a school by code without exposing the school list
CREATE OR REPLACE FUNCTION public.lookup_school_by_code(_code TEXT)
RETURNS TABLE(id UUID, name TEXT, province TEXT, district TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.province, s.district
  FROM public.schools s
  WHERE upper(trim(_code)) = s.join_code AND s.is_active = true
  LIMIT 1;
$$;

-- Join a school with a code (creates a pending membership for the caller)
CREATE OR REPLACE FUNCTION public.join_school_by_code(_code TEXT, _member_role TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_school public.schools%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _member_role NOT IN ('teacher','student') THEN
    RAISE EXCEPTION 'Invalid member role';
  END IF;

  SELECT * INTO v_school FROM public.schools
  WHERE join_code = upper(trim(_code)) AND is_active = true;

  IF v_school.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid school code');
  END IF;

  INSERT INTO public.school_members (school_id, user_id, member_role, status)
  VALUES (v_school.id, auth.uid(), _member_role, 'pending')
  ON CONFLICT (school_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'school_id', v_school.id,
    'school_name', v_school.name,
    'status', (SELECT status FROM public.school_members WHERE school_id = v_school.id AND user_id = auth.uid())
  );
END;
$$;

-- Register a new school and make the caller its approved admin
CREATE OR REPLACE FUNCTION public.register_school(
  _name TEXT, _province TEXT, _district TEXT,
  _education_levels TEXT[], _contact_email TEXT, _phone TEXT
)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
  v_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF coalesce(trim(_name),'') = '' THEN
    RAISE EXCEPTION 'School name is required';
  END IF;

  v_code := public.generate_school_code();

  INSERT INTO public.schools (name, join_code, province, district, education_levels, contact_email, phone, created_by)
  VALUES (left(trim(_name),150), v_code, coalesce(_province,''), coalesce(_district,''),
          coalesce(_education_levels,'{}'), coalesce(_contact_email,''), coalesce(_phone,''), auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.school_members (school_id, user_id, member_role, status, approved_by, approved_at)
  VALUES (v_id, auth.uid(), 'admin', 'approved', auth.uid(), now())
  ON CONFLICT (school_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'school_id', v_id, 'join_code', v_code);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_school_admin(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_school_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_school_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_school_by_code(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_school_by_code(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_school(TEXT,TEXT,TEXT,TEXT[],TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_school_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_school_by_code(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_school(TEXT,TEXT,TEXT,TEXT[],TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_school(UUID) TO authenticated;

-- ============ RLS POLICIES ============
CREATE POLICY "Members can view their school"
ON public.schools FOR SELECT TO authenticated
USING (public.is_approved_school_member(auth.uid(), id) OR created_by = auth.uid());

CREATE POLICY "School admins can update their school"
ON public.schools FOR UPDATE TO authenticated
USING (public.is_school_admin(auth.uid(), id))
WITH CHECK (public.is_school_admin(auth.uid(), id));

CREATE POLICY "Users can view their own membership"
ON public.school_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id));

CREATE POLICY "Users can request to join a school"
ON public.school_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending' AND member_role IN ('teacher','student'));

CREATE POLICY "School admins manage memberships"
ON public.school_members FOR UPDATE TO authenticated
USING (public.is_school_admin(auth.uid(), school_id))
WITH CHECK (public.is_school_admin(auth.uid(), school_id));

CREATE POLICY "School admins remove members"
ON public.school_members FOR DELETE TO authenticated
USING (public.is_school_admin(auth.uid(), school_id) AND user_id <> auth.uid());

CREATE POLICY "Students and mentors view their enrollments"
ON public.mentor_enrollments FOR SELECT TO authenticated
USING (student_id = auth.uid() OR mentor_id = auth.uid());

CREATE POLICY "Students create enrollment requests"
ON public.mentor_enrollments FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() AND status = 'pending');

CREATE POLICY "Mentors respond to enrollment requests"
ON public.mentor_enrollments FOR UPDATE TO authenticated
USING (mentor_id = auth.uid())
WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Students withdraw their requests"
ON public.mentor_enrollments FOR DELETE TO authenticated
USING (student_id = auth.uid());

-- ============ TIMESTAMP TRIGGERS ============
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_members_updated_at BEFORE UPDATE ON public.school_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mentor_enrollments_updated_at BEFORE UPDATE ON public.mentor_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SIGNUP TRIGGER (school code aware) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_role app_role;
  v_code TEXT;
  v_school_id UUID;
BEGIN
  user_role := COALESCE(
    NULLIF(new.raw_user_meta_data->>'role', '')::app_role,
    'student'::app_role
  );

  INSERT INTO public.profiles (
    user_id, email, full_name, role, school_name, province, district,
    education_level, subjects_taught, education_level_taught,
    combination_department, organization_name, role_description
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
    CASE WHEN new.raw_user_meta_data->>'subjects_taught' IS NOT NULL
      THEN ARRAY(SELECT json_array_elements_text((new.raw_user_meta_data->>'subjects_taught')::json))
      ELSE NULL END,
    COALESCE(new.raw_user_meta_data->>'education_level_taught', ''),
    COALESCE(new.raw_user_meta_data->>'combination_department', ''),
    COALESCE(new.raw_user_meta_data->>'organization_name', ''),
    COALESCE(new.raw_user_meta_data->>'role_description', '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Attach to a school when a join code was supplied at signup
  v_code := upper(trim(COALESCE(new.raw_user_meta_data->>'school_code', '')));
  IF v_code <> '' AND user_role IN ('teacher'::app_role, 'student'::app_role) THEN
    SELECT id INTO v_school_id FROM public.schools
    WHERE join_code = v_code AND is_active = true;

    IF v_school_id IS NOT NULL THEN
      INSERT INTO public.school_members (school_id, user_id, member_role, status)
      VALUES (v_school_id, new.id, user_role::text, 'pending')
      ON CONFLICT (school_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN new;
END;
$$;
