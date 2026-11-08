// Account approval rules: who can approve whom.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildDatabase, signUp, asUser, asOwner } from "./db.js";

const OWNER = "a0000000-0000-0000-0000-000000000001"; // runs Codex (platform admin)
const SCHOOL_ADMIN = "a0000000-0000-0000-0000-000000000002";
const TEACHER = "a0000000-0000-0000-0000-000000000003";
const STUDENT = "a0000000-0000-0000-0000-000000000004";
const MENTOR = "a0000000-0000-0000-0000-000000000005";

let db;
let joinCode;
let teacherMemberId;

before(async () => {
  ({ db } = await buildDatabase());
  await signUp(db, OWNER, "student");
  await signUp(db, SCHOOL_ADMIN, "school_admin");
  await signUp(db, TEACHER, "teacher");
  await signUp(db, STUDENT, "student");
  await signUp(db, MENTOR, "mentor");
  await asOwner(db, `insert into platform_admins(user_id, note) values ('${OWNER}', 'test owner')`);

  const reg = await asUser(db, SCHOOL_ADMIN, `select register_school('Test High School', 'Kigali', 'Gasabo', '{}', 'school@example.com', '') as r`);
  assert.equal(reg.error, undefined, reg.error);
  joinCode = reg.rows[0].r.join_code;
  const join = await asUser(db, TEACHER, `select join_school_by_code('${joinCode}', 'teacher') as r`);
  assert.equal(join.error, undefined, join.error);
  [{ id: teacherMemberId }] = await asOwner(db, `select id from school_members where user_id = '${TEACHER}'`);
});

after(async () => db?.close());

test("an unverified school admin cannot approve teachers", async () => {
  const r = await asUser(db, SCHOOL_ADMIN, `select set_school_member_status('${teacherMemberId}', 'approved')`);
  assert.match(r.error ?? "", /still being verified/);
});

test("an unverified school admin cannot approve by editing the table directly", async () => {
  const r = await asUser(db, SCHOOL_ADMIN, `update school_members set status = 'approved' where id = '${teacherMemberId}' returning id`);
  assert.equal(r.rows?.length ?? 0, 0);
});

test("a normal user cannot see the review queue or approve anyone", async () => {
  let r = await asUser(db, STUDENT, `select * from list_accounts_for_review('pending')`);
  assert.match(r.error ?? "", /platform admins/);
  r = await asUser(db, SCHOOL_ADMIN, `select set_account_verification('${SCHOOL_ADMIN}', 'verified')`);
  assert.match(r.error ?? "", /platform admins/);
});

test("nobody can make themselves a platform admin from the app", async () => {
  const r = await asUser(db, STUDENT, `insert into platform_admins(user_id) values ('${STUDENT}')`);
  assert.match(r.error ?? "", /row-level security/);
});

test("the platform admin sees pending school admins, teachers and mentors", async () => {
  const r = await asUser(db, OWNER, `select user_id, role, registered_school from list_accounts_for_review('pending')`);
  assert.equal(r.error, undefined, r.error);
  const byId = Object.fromEntries(r.rows.map((x) => [x.user_id, x]));
  assert.equal(byId[SCHOOL_ADMIN].registered_school, "Test High School");
  assert.ok(byId[MENTOR]);
  assert.ok(byId[TEACHER]);
  assert.equal(byId[STUDENT], undefined);
});

test("the platform admin can approve a school admin, who can then approve teachers", async () => {
  let r = await asUser(db, OWNER, `select set_account_verification('${SCHOOL_ADMIN}', 'verified')`);
  assert.equal(r.error, undefined, r.error);
  r = await asUser(db, SCHOOL_ADMIN, `select set_school_member_status('${teacherMemberId}', 'approved')`);
  assert.equal(r.error, undefined, r.error);
});

test("approving a teacher's membership also verifies the teacher", async () => {
  const [p] = await asOwner(db, `select verification_status, verified_by from profiles where user_id = '${TEACHER}'`);
  assert.equal(p.verification_status, "verified");
  assert.equal(p.verified_by, SCHOOL_ADMIN);
});

test("the platform admin can reject a mentor, and the mentor stays hidden", async () => {
  let r = await asUser(db, OWNER, `select set_account_verification('${MENTOR}', 'rejected')`);
  assert.equal(r.error, undefined, r.error);
  r = await asUser(db, STUDENT, `select user_id from list_mentors()`);
  assert.equal(r.rows.length, 0);
});

test("users cannot set their own approval fields", async () => {
  await asUser(db, MENTOR, `update profiles set verification_status = 'verified', verified_by = '${MENTOR}' where user_id = '${MENTOR}'`);
  const [p] = await asOwner(db, `select verification_status from profiles where user_id = '${MENTOR}'`);
  assert.equal(p.verification_status, "rejected");
});

test("platform admins cannot change their own approval", async () => {
  const r = await asUser(db, OWNER, `select set_account_verification('${OWNER}', 'verified')`);
  assert.match(r.error ?? "", /own approval/);
});

test("approval rejects unknown statuses", async () => {
  const r = await asUser(db, OWNER, `select set_account_verification('${MENTOR}', 'active')`);
  assert.match(r.error ?? "", /Invalid status/);
});
