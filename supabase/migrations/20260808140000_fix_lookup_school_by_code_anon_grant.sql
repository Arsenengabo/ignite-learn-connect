-- Pre-existing bug (unrelated to the RLS hardening migration): the
-- school join-code lookup happens before account creation, as `anon`,
-- but EXECUTE on lookup_school_by_code was only ever granted to
-- authenticated. Function is SECURITY DEFINER and only exposes
-- id/name/province/district for active schools -- safe to open to anon.
GRANT EXECUTE ON FUNCTION public.lookup_school_by_code(TEXT) TO anon;
