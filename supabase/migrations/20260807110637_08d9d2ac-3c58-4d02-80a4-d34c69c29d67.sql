CREATE OR REPLACE FUNCTION public.get_school_roster(_school_id uuid)
 RETURNS TABLE(member_id uuid, user_id uuid, member_role text, status text, created_at timestamp with time zone, full_name text, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND public.is_school_admin(auth.uid(), _school_id)
  ORDER BY sm.created_at DESC
$function$;

CREATE OR REPLACE FUNCTION public.set_school_member_status(_member_id uuid, _status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF NOT public.is_school_admin(auth.uid(), v_school_id) THEN
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
$function$;

REVOKE EXECUTE ON FUNCTION public.get_school_roster(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_school_member_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_school_roster(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_school_member_status(uuid, text) TO authenticated;