CREATE TABLE public.platform_admins (user_id uuid PRIMARY KEY, note text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can see their own admin row" ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER update_platform_admins_updated_at BEFORE UPDATE ON public.platform_admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.profiles ADD COLUMN verification_status text NOT NULL DEFAULT 'verified', ADD COLUMN verified_by uuid, ADD COLUMN verified_at timestamptz;
CREATE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid()) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=_user_id) $$;
REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.set_profile_verification() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.verification_status := CASE WHEN NEW.role IN ('teacher','mentor','school_admin') THEN 'pending' ELSE 'verified' END;
  NEW.verified_by := NULL; NEW.verified_at := NULL;
 ELSIF current_user IN ('authenticated','anon') THEN
  NEW.verification_status := OLD.verification_status; NEW.verified_by := OLD.verified_by; NEW.verified_at := OLD.verified_at;
 END IF;
 IF NEW.verification_status NOT IN ('pending','verified','rejected') THEN RAISE EXCEPTION 'Invalid approval status'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS set_profile_verification ON public.profiles;
CREATE TRIGGER set_profile_verification BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_profile_verification();
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id uuid,_school_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.school_members m JOIN public.profiles p ON p.user_id=m.user_id WHERE m.user_id=_user_id AND m.school_id=_school_id AND m.member_role='admin' AND m.status='approved' AND p.verification_status='verified' AND public.has_role(_user_id,'school_admin'::public.app_role))
$$;
CREATE OR REPLACE FUNCTION public.set_school_member_status(_member_id uuid,_status text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_member public.school_members%ROWTYPE;
BEGIN
 IF _status NOT IN ('approved','rejected','pending') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 SELECT * INTO v_member FROM public.school_members WHERE id=_member_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
 IF NOT public.is_school_admin(auth.uid(),v_member.school_id) THEN
  IF EXISTS(SELECT 1 FROM public.school_members WHERE user_id=auth.uid() AND school_id=v_member.school_id AND member_role='admin') THEN RAISE EXCEPTION 'Your school admin account is still being verified by Codex'; END IF;
  RAISE EXCEPTION 'Unauthorized';
 END IF;
 IF v_member.user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot change your own approval'; END IF;
 UPDATE public.school_members SET status=_status, approved_at=CASE WHEN _status='approved' THEN now() ELSE NULL END, approved_by=CASE WHEN _status='approved' THEN auth.uid() ELSE NULL END, updated_at=now() WHERE id=_member_id;
 IF _status='approved' AND v_member.member_role='teacher' AND public.has_role(v_member.user_id,'teacher'::public.app_role) THEN
  UPDATE public.profiles SET verification_status='verified',verified_by=auth.uid(),verified_at=now() WHERE user_id=v_member.user_id AND verification_status='pending';
 END IF;
 RETURN jsonb_build_object('success',true,'status',_status);
END $$;
CREATE OR REPLACE FUNCTION public.list_mentors() RETURNS TABLE(user_id uuid,full_name text,organization_name text,role_description text,subjects_taught text[],province text,district text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.user_id,COALESCE(p.full_name,'Mentor'),COALESCE(p.organization_name,''),COALESCE(p.role_description,''),COALESCE(p.subjects_taught,ARRAY[]::text[]),COALESCE(p.province,''),COALESCE(p.district,'') FROM public.profiles p WHERE public.has_role(p.user_id,'mentor'::public.app_role) AND p.verification_status='verified' ORDER BY p.full_name
$$;
CREATE FUNCTION public.list_accounts_for_review(_status text DEFAULT 'pending') RETURNS TABLE(user_id uuid,full_name text,email text,role text,organization_name text,school_name text,role_description text,subjects_taught text[],province text,district text,registered_school text,verification_status text,created_at timestamptz,verified_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Codex platform admins can review accounts'; END IF;
 IF _status NOT IN ('pending','verified','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 RETURN QUERY SELECT p.user_id,COALESCE(p.full_name,''),COALESCE(p.email,''),r.role::text,COALESCE(p.organization_name,''),COALESCE(p.school_name,''),COALESCE(p.role_description,''),COALESCE(p.subjects_taught,ARRAY[]::text[]),COALESCE(p.province,''),COALESCE(p.district,''),(SELECT s.name FROM public.schools s WHERE s.created_by=p.user_id ORDER BY s.created_at LIMIT 1),p.verification_status,p.created_at,p.verified_at FROM public.profiles p JOIN LATERAL (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id=p.user_id AND ur.role IN ('teacher'::public.app_role,'mentor'::public.app_role,'school_admin'::public.app_role) ORDER BY ur.created_at LIMIT 1) r ON true WHERE p.verification_status=_status ORDER BY p.created_at ASC LIMIT 200;
END $$;
CREATE FUNCTION public.set_account_verification(_user_id uuid,_status text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Codex platform admins can approve accounts'; END IF;
 IF _status NOT IN ('verified','rejected','pending') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF _user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot change your own approval'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('teacher'::public.app_role,'mentor'::public.app_role,'school_admin'::public.app_role)) THEN RAISE EXCEPTION 'Account is not eligible for review'; END IF;
 UPDATE public.profiles SET verification_status=_status,verified_by=CASE WHEN _status='pending' THEN NULL ELSE auth.uid() END,verified_at=CASE WHEN _status='pending' THEN NULL ELSE now() END WHERE user_id=_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
 RETURN jsonb_build_object('success',true,'status',_status);
END $$;
REVOKE ALL ON FUNCTION public.list_accounts_for_review(text),public.set_account_verification(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_accounts_for_review(text),public.set_account_verification(uuid,text) TO authenticated,service_role;
CREATE INDEX profiles_verification_queue_idx ON public.profiles(verification_status,created_at);