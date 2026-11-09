# Security tests

These tests rebuild the Codex database in memory from `supabase/migrations`, then act as students, teachers and mentors to try known attacks: changing their own grades, resubmitting exams, answering after the time limit, deleting other teachers' files, approving themselves.

They also check that normal use still works: submitting a quiz, a teacher grading an exam, a teacher managing their own files.

```bash
cd security-tests
npm install
npm test
```

Run them after any change to the database or its access rules. If a test fails, the change has reopened a hole.

Limits: the test database stands in for Supabase's `auth` and `storage` schemas, and skips 4 old migrations (September 2025) that no longer replay on an empty database. The test prints which ones it skipped.

## Test files
- `attacks.test.js`: grades, exams, roles and course files (audit fixes C1–C3, H1, H2).
- `approvals.test.js`: who can approve which accounts.
- `ai-limits.test.js`: daily AI usage limits.
- `chat.test.js`: who sees which room, teacher-only posting, removing messages, pausing students, reports, blocking, the sending limit and same-school private messages.
