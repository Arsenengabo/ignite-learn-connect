-- Account approvals (audit C3, part 2).
--
-- Who approves whom:
--   * Platform admins (the people who run Codex) approve school admins and mentors,
--     and can approve or reject any account.
--   * A school admin approves teachers by approving their school membership, as before;
--     the teacher's account becomes verified at the same time.
--   * An unverified school admin is not treated as an admin anywhere, so a school
--     cannot take in teachers or students until a platform admin approves its admin.
--
-- To make yourself a platform admin, add your user id to platform_admins in the
-- Lovable table editor (there is deliberately no way to do this from the app).

-- ---------------------------------------------------------------------------
-- Platform admins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;

DROP POLICY IF EXISTS "Admins can see their own admin row" ON public.platform_admins;
CREATE POLICY "Admins can see their own admin row"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- No insert/update/delete policies: rows are added by the project owner only.

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon;

-- ---------------------------------------------------------------------------
-- Who approved an account, and when
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_by UUID,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Users still cannot change these themselves (extends the Week 1 guard).
CREATE OR REPLACE FUNCTION public.set_profile_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := CASE WHEN NEW.role IN ('teacher', 'mentor', 'school_admin') THEN 'pending' ELSE 'verified' END;
    NEW.verified_by := NULL;
    NEW.verified_at := NULL;
  ELSIF public.is_browser_write() THEN
    NEW.verification_status := OLD.verification_status;
    NEW.verified_by := OLD.verified_by;
    NEW.verified_at := OLD.verified_at;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- An unverified school admin is not an admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id uuid, _school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_members m
    JOIN public.profiles p ON p.user_id = m.user_id
    WHERE m.user_id = _user_id AND m.school_id = _school_id
      AND m.member_role = 'admin' AND m.status = 'approved'
      AND p.verification_status = 'verified'
  );
$$;

-- Approving a teacher's school membership also verifies the teacher.
CREATE OR REPLACE FUNCTION public.set_school_member_status(_member_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member public.school_members%ROWTYPE;
BEGIN
  IF _status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT * INTO v_member FROM public.school_members WHERE id = _member_id;
  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT public.is_school_admin(auth.uid(), v_member.school_id) THEN
    IF EXISTS (
      SELECT 1 FROM public.school_members m JOIN public.profiles p ON p.user_id = m.user_id
      WHERE m.user_id = auth.uid() AND m.school_id = v_member.school_id AND m.member_role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Your school admin account is still being verified by Codex';
    END IF;
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.school_members
  SET status = _status,
      approved_at = CASE WHEN _status = 'approved' THEN now() ELSE NULL END,
      approved_by = CASE WHEN _status = 'approved' THEN auth.uid() ELSE NULL END,
      updated_at = now()
  WHERE id = _member_id;

  IF _status = 'approved' AND v_member.member_role = 'teacher' THEN
    UPDATE public.profiles
    SET verification_status = 'verified', verified_by = auth.uid(), verified_at = now()
    WHERE user_id = v_member.user_id AND verification_status <> 'verified';
  END IF;

  RETURN jsonb_build_object('success', true, 'status', _status);
END;
$$;

-- ---------------------------------------------------------------------------
-- Review queue for platform admins
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_accounts_for_review(_status text DEFAULT 'pending')
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text,
  organization_name text,
  school_name text,
  role_description text,
  subjects_taught text[],
  province text,
  district text,
  registered_school text,
  verification_status text,
  created_at timestamptz,
  verified_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Codex platform admins can review accounts';
  END IF;
  IF _status NOT IN ('pending', 'verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    COALESCE(p.full_name, ''),
    COALESCE(p.email, ''),
    p.role,
    COALESCE(p.organization_name, ''),
    COALESCE(p.school_name, ''),
    COALESCE(p.role_description, ''),
    COALESCE(p.subjects_taught, ARRAY[]::text[]),
    COALESCE(p.province, ''),
    COALESCE(p.district, ''),
    (SELECT s.name FROM public.schools s WHERE s.created_by = p.user_id ORDER BY s.created_at LIMIT 1),
    p.verification_status,
    p.created_at,
    p.verified_at
  FROM public.profiles p
  WHERE p.role IN ('teacher', 'mentor', 'school_admin')
    AND p.verification_status = _status
  ORDER BY CASE WHEN _status = 'pending' THEN p.created_at END ASC,
           p.verified_at DESC NULLS LAST,
           p.created_at DESC
  LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_account_verification(_user_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Codex platform admins can approve accounts';
  END IF;
  IF _status NOT IN ('verified', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own approval';
  END IF;

  UPDATE public.profiles
  SET verification_status = _status,
      verified_by = CASE WHEN _status = 'pending' THEN NULL ELSE auth.uid() END,
      verified_at = CASE WHEN _status = 'pending' THEN NULL ELSE now() END
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
  RETURN jsonb_build_object('success', true, 'status', _status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_accounts_for_review(text), public.set_account_verification(uuid, text) FROM anon;
