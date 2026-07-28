-- Roster for school admins (names/emails without exposing the profiles table)
CREATE OR REPLACE FUNCTION public.get_school_roster(_school_id uuid)
RETURNS TABLE(
  member_id uuid,
  user_id uuid,
  member_role text,
  status text,
  created_at timestamptz,
  full_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sm.id,
    sm.user_id,
    sm.member_role,
    sm.status,
    sm.created_at,
    COALESCE(p.full_name, 'Unknown'),
    COALESCE(p.email, '')
  FROM public.school_members sm
  LEFT JOIN public.profiles p ON p.user_id = sm.user_id
  WHERE sm.school_id = _school_id
    AND public.is_school_admin(_school_id, auth.uid())
  ORDER BY sm.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_school_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_school_roster(uuid) TO authenticated;

-- Approve / reject a school member (admins of that school only)
CREATE OR REPLACE FUNCTION public.set_school_member_status(_member_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
BEGIN
  IF _status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT school_id INTO v_school_id FROM public.school_members WHERE id = _member_id;
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT public.is_school_admin(v_school_id, auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.school_members
  SET status = _status,
      approved_at = CASE WHEN _status = 'approved' THEN now() ELSE NULL END,
      approved_by = CASE WHEN _status = 'approved' THEN auth.uid() ELSE NULL END,
      updated_at = now()
  WHERE id = _member_id;

  RETURN jsonb_build_object('success', true, 'status', _status);
END;
$$;

REVOKE ALL ON FUNCTION public.set_school_member_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_school_member_status(uuid, text) TO authenticated;

-- Public mentor directory for students
CREATE OR REPLACE FUNCTION public.list_mentors()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  organization_name text,
  role_description text,
  subjects_taught text[],
  province text,
  district text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    COALESCE(p.full_name, 'Mentor'),
    COALESCE(p.organization_name, ''),
    COALESCE(p.role_description, ''),
    COALESCE(p.subjects_taught, ARRAY[]::text[]),
    COALESCE(p.province, ''),
    COALESCE(p.district, '')
  FROM public.profiles p
  WHERE public.has_role(p.user_id, 'mentor'::app_role)
  ORDER BY p.full_name
$$;

REVOKE ALL ON FUNCTION public.list_mentors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_mentors() TO authenticated;

-- Enrollment requests addressed to the calling mentor, with student names
CREATE OR REPLACE FUNCTION public.get_mentor_enrollment_requests()
RETURNS TABLE(
  id uuid,
  student_id uuid,
  student_name text,
  message text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    me.id,
    me.student_id,
    COALESCE(p.full_name, 'Student'),
    me.message,
    me.status,
    me.created_at
  FROM public.mentor_enrollments me
  LEFT JOIN public.profiles p ON p.user_id = me.student_id
  WHERE me.mentor_id = auth.uid()
  ORDER BY me.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_mentor_enrollment_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mentor_enrollment_requests() TO authenticated;

-- Mentor responds to an enrollment request
CREATE OR REPLACE FUNCTION public.respond_mentor_enrollment(_enrollment_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.mentor_enrollments
  SET status = _status,
      responded_at = now(),
      updated_at = now()
  WHERE id = _enrollment_id
    AND mentor_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or unauthorized';
  END IF;

  RETURN jsonb_build_object('success', true, 'status', _status);
END;
$$;

REVOKE ALL ON FUNCTION public.respond_mentor_enrollment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_mentor_enrollment(uuid, text) TO authenticated;