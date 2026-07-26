# School Admin Portal + School-Gated Access

## What we're building

A school layer on top of the existing platform:

- **Schools** become real entities with a unique join code, a principal/admin owner, and a member list.
- **Teachers** cannot use the platform standalone — at signup they must enter their school's code and are placed in a pending queue until the school admin approves them.
- **Mentors** are a new independent role — they sign up freely, no school required.
- **Students** choose at signup: join a school with a code, or continue independently. Independent (and school) students can send **enrollment requests** to mentors.
- **School admins** get a dedicated portal: roster, approvals, class/exam results overview, and the school join code.

## Access matrix

```text
Role          School required?   How they get in
------------  -----------------  --------------------------------------
school_admin  owns the school    Registers the school (gets code)
teacher       YES                Enters school code -> admin approves
mentor        NO                 Signs up freely
student       OPTIONAL           School code -> admin approves
                                 OR independent -> requests mentors
```

## Database changes

New enum values on `app_role`: `mentor`, `school_admin`.

**`schools`** — name, join_code (unique, short, auto-generated), province, district, education_levels, contact_email, phone, is_active, created_by.

**`school_members`** — school_id, user_id, member_role (`teacher` | `student` | `admin`), status (`pending` | `approved` | `rejected`), requested_at, approved_by, approved_at. Unique on (school_id, user_id).

**`mentor_enrollments`** — mentor_id, student_id, status (`pending` | `approved` | `rejected`), message, responded_at. Unique on (mentor_id, student_id).

Security-definer helpers (avoid RLS recursion):
- `is_school_admin(_user_id, _school_id)`
- `is_approved_school_member(_user_id, _school_id)`
- `get_user_school(_user_id)` → school_id of approved membership
- `join_school_by_code(_code)` → creates a pending membership, returns school name (never leaks the school list by code guessing beyond name)

RLS summary in plain terms:
- Anyone signed in can look up a school by code through the join function only.
- School admins can see and manage all membership rows for their own school.
- Members see only their own membership row.
- Mentors see enrollment requests addressed to them; students see their own requests.
- Existing exam/quiz visibility gains a school filter: content created by a school-affiliated teacher is visible to approved members of that school; mentor content is visible to their approved students; independent content stays public.

All new tables get explicit GRANTs and `created_at`/`updated_at` with triggers.

## Frontend changes

**Signup wizard (`SignUpWizard.tsx`)** — role step becomes four cards: Student, Teacher, Mentor, School Admin.
- Teacher: mandatory "School access code" field, validated live against `join_school_by_code`. Cannot submit without a valid code.
- Student: toggle — "I have a school code" vs "Continue independently".
- Mentor: no school fields; bio/expertise instead.
- School Admin: registers the school (name, province, district, levels, contact) and receives the generated join code on completion.

**New `SchoolAdminDashboard.tsx`** with tabs:
- *Overview* — member counts, pending approvals badge, exam activity.
- *Join code* — large code display, copy button, regenerate.
- *Approvals* — pending teachers/students, approve/reject.
- *Roster* — searchable, paginated member list with role filter and remove action.
- *Results* — school-wide exam attempts summary by class/subject.

**New `PendingApproval.tsx`** — shown to teachers/students whose membership is still pending, with the school name and a refresh.

**New `MentorDashboard.tsx`** — enrollment requests inbox (approve/reject) plus the existing teacher content tools.

**New `MentorDirectory.tsx`** (student side) — browse mentors, send an enrollment request with a short message, see request status.

**`Index.tsx` routing** — after loading role + membership:
- `school_admin` → SchoolAdminDashboard
- `teacher` with no approved membership → PendingApproval (or a "join a school" screen if none)
- `mentor` → MentorDashboard
- `student` → StudentDashboard with a Mentors card

**`AppLayout`** — shows the school name (or "Independent") under the role label.

## Technical notes

- `handle_new_user` trigger is extended to read `school_code`, `join_mode`, and mentor fields from signup metadata and create the pending `school_members` row atomically, so no client-side write gap exists.
- Role stays authoritative in `user_roles`; `profiles.role` remains mirrored and still protected by `protect_profile_role`.
- Join codes are 8-char base32 (no ambiguous characters), generated in the database and unique-checked.
- Pagination (`PAGE_SIZE = 24`) reused for the roster and mentor directory to stay consistent with the scalability work already shipped.

## Order of work

1. Migration: enum values, three tables, GRANTs, RLS, helper functions, updated signup trigger.
2. Signup wizard rewrite for four roles + code validation.
3. School admin portal (overview, code, approvals, roster, results).
4. Pending-approval gate + `Index.tsx` routing.
5. Mentor dashboard + student mentor directory and enrollment requests.
6. Content visibility filters on exams/quizzes by school/mentor scope.
