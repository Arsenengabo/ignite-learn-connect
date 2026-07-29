REVOKE EXECUTE ON FUNCTION public.get_user_school(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_school(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_school(uuid) TO service_role;