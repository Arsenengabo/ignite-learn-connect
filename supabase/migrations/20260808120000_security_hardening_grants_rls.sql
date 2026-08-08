-- ============================================================
-- Migration: security_hardening_grants_and_rls
-- Fixes:
--   H1 — students can PATCH their own grade columns directly
--   H2 — anon can read exams/quizzes/courses/competitions unauthenticated
--   H3 — anon holds blanket arwdDxtm on every public table
-- Scope: matches ilc-rls-review.md remediation items 1–2 only.
--        M1 (chat role check) and M2/M3 (policy hygiene) are separate.
-- ============================================================

-- ----------------------------------------------------------------
-- H3 — Baseline: anon should not hold table-level privileges at all.
-- RLS policies are the only real gate today; a blanket anon grant
-- means one future `TO public` / `USING (true)` policy silently
-- opens a table to the internet with no login required.
-- ----------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- No app code needs these on any role; pure blast-radius reduction.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

-- ----------------------------------------------------------------
-- H2 — Re-grant SELECT to anon ONLY for the tables meant to be a
-- public catalogue. Adjust this list to match actual product intent
-- — this assumes exams/quizzes/courses previews should stay visible
-- to logged-out visitors, but competitions (which carry entry fees)
-- should require login.
-- ----------------------------------------------------------------
GRANT SELECT ON public.exams, public.quizzes, public.courses, public.course_modules TO anon;

-- Competitions intentionally NOT re-granted to anon. If you want an
-- unauthenticated "storefront" view of live competitions, uncomment:
-- GRANT SELECT ON public.competitions TO anon;
-- ...and narrow the existing "Everyone can view competitions" policy
-- from USING (true) to something that excludes payment-sensitive
-- columns, or split into a public summary view instead.

-- ----------------------------------------------------------------
-- H1 — Grades must be server-side only. The existing FOR ALL /
-- USING (own row) policies correctly gate row *access* but do not
-- restrict *which columns* an UPDATE can touch, so a student can
-- PATCH their own total_score / is_correct / points_earned straight
-- through PostgREST. Revoke table-level UPDATE and grant back only
-- the columns a student legitimately writes from the client.
-- Grading RPCs (evaluate_exam_responses, submit_quiz_responses, etc.)
-- run SECURITY DEFINER as the function owner and are unaffected.
-- ----------------------------------------------------------------

-- exam_attempts: student may update their own countdown only.
REVOKE UPDATE ON public.exam_attempts FROM authenticated;
GRANT UPDATE (time_remaining_seconds) ON public.exam_attempts TO authenticated;
-- If your submit flow sets status/submitted_at from the client rather
-- than through a DEFINER RPC, add them explicitly here instead of
-- leaving them protected — do NOT add total_score/max_score/percentage.

-- exam_responses: student may only edit their own answer text.
REVOKE UPDATE ON public.exam_responses FROM authenticated;
GRANT UPDATE (answer) ON public.exam_responses TO authenticated;

-- quiz_sessions: score/status must come from submit_quiz_responses.
REVOKE UPDATE ON public.quiz_sessions FROM authenticated;
GRANT UPDATE (completed_at) ON public.quiz_sessions TO authenticated;
-- If submit_quiz_responses already sets completed_at server-side,
-- you can drop this GRANT UPDATE entirely and rely solely on the RPC.

-- quiz_responses: student may only edit their own answer text.
REVOKE UPDATE ON public.quiz_responses FROM authenticated;
GRANT UPDATE (answer) ON public.quiz_responses TO authenticated;

-- ============================================================
-- Verify after applying (run manually, not part of the migration):
--
-- select grantee, table_name, privilege_type, string_agg(column_name, ',')
-- from information_schema.column_privileges
-- where table_schema = 'public'
--   and table_name in ('exam_attempts','exam_responses','quiz_sessions','quiz_responses')
-- group by 1,2,3
-- order by 2,1;
--
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and grantee = 'anon'
-- order by table_name;
-- ============================================================
