// Daily AI limits and teacher-only AI tools (audit H3).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildDatabase, signUp, asUser, asOwner } from "./db.js";

const STUDENT = "c0000000-0000-0000-0000-000000000001";
const TEACHER = "c0000000-0000-0000-0000-000000000002";

let db;
const consume = async (user, feature) => {
  const r = await asUser(db, user, `select consume_ai_quota('${feature}') as q`);
  return r.error ? { error: r.error } : r.rows[0].q;
};

before(async () => {
  ({ db } = await buildDatabase());
  await signUp(db, STUDENT, "student");
  await signUp(db, TEACHER, "teacher");
});

after(async () => db?.close());

test("a student cannot use teacher-only AI tools", async () => {
  for (const feature of ["generate-exam", "generate-diagram-question", "ai-question-generator", "generate-mcqs"]) {
    const r = await consume(STUDENT, feature);
    assert.match(r.error ?? "", /AI_NOT_ALLOWED/, feature);
  }
});

test("an unknown AI feature is refused", async () => {
  const r = await consume(TEACHER, "something-new");
  assert.match(r.error ?? "", /AI_NOT_ALLOWED/);
});

test("a teacher can use a teacher tool, and each use is counted", async () => {
  const first = await consume(TEACHER, "generate-exam");
  assert.equal(first.allowed, true);
  assert.equal(first.used, 1);
  const second = await consume(TEACHER, "generate-exam");
  assert.equal(second.used, 2);
});

test("the daily limit is enforced", async () => {
  await asOwner(db, `update ai_limits set daily_limit = 3 where feature = 'summarize-lecture' and role = 'student'`);
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await consume(STUDENT, "summarize-lecture"));
  assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false, false]);
  const [row] = await asOwner(db, `select count from ai_usage where user_id = '${STUDENT}' and feature = 'summarize-lecture'`);
  assert.equal(row.count, 3, "refused calls are not counted");
});

test("a limit of 0 turns a feature off", async () => {
  await asOwner(db, `update ai_limits set daily_limit = 0 where feature = 'evaluate-subjective' and role = 'student'`);
  const r = await consume(STUDENT, "evaluate-subjective");
  assert.equal(r.allowed, false);
});

test("users cannot reset or change their own usage or limits", async () => {
  let r = await asUser(db, STUDENT, `delete from ai_usage where user_id = '${STUDENT}' returning user_id`);
  assert.equal(r.rows?.length ?? 0, 0);
  r = await asUser(db, STUDENT, `update ai_usage set count = 0 where user_id = '${STUDENT}' returning count`);
  assert.equal(r.rows?.length ?? 0, 0);
  r = await asUser(db, TEACHER, `update ai_limits set daily_limit = 9999 returning feature`);
  assert.equal(r.rows?.length ?? 0, 0);
  r = await asUser(db, STUDENT, `insert into ai_limits(feature, role, daily_limit) values ('generate-exam', 'student', 99)`);
  assert.match(r.error ?? "", /row-level security/);
});

test("users can see their own usage", async () => {
  const r = await asUser(db, STUDENT, `select feature, count from ai_usage`);
  assert.ok(r.rows.length >= 1);
  assert.ok(r.rows.every((x) => x.feature));
});
