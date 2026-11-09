// Daily AI usage limits (audit H3).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildDatabase, signUp, asUser, asOwner } from "./db.js";

const STUDENT = "c0000000-0000-0000-0000-000000000001";
let db;

before(async () => {
  ({ db } = await buildDatabase());
  await signUp(db, STUDENT, "student");
});
after(async () => db?.close());

const asService = async (sql) => {
  await db.exec("BEGIN; SET LOCAL ROLE service_role;");
  try {
    const r = await db.query(sql);
    await db.exec("COMMIT");
    return { rows: r.rows };
  } catch (error) {
    await db.exec("ROLLBACK");
    return { error: error.message };
  }
};

test("the server can count uses up to the daily limit, then refuses", async () => {
  const results = [];
  for (let i = 0; i < 4; i++) {
    const r = await asService(`select consume_ai_quota('${STUDENT}', 'lecture_summary', 3) as q`);
    assert.equal(r.error, undefined, r.error);
    results.push(r.rows[0].q.allowed);
  }
  assert.deepEqual(results, [true, true, true, false]);
});

test("limits are counted per feature", async () => {
  const r = await asService(`select consume_ai_quota('${STUDENT}', 'written_answer_marking', 3) as q`);
  assert.equal(r.rows[0].q.allowed, true);
});

test("a user cannot call the counter themselves", async () => {
  const r = await asUser(db, STUDENT, `select consume_ai_quota('${STUDENT}', 'lecture_summary', 1000)`);
  assert.match(r.error ?? "", /permission denied/);
});

test("a user cannot reset or edit their own usage", async () => {
  await asUser(db, STUDENT, `delete from ai_usage where user_id = '${STUDENT}'`);
  await asUser(db, STUDENT, `update ai_usage set count = 0 where user_id = '${STUDENT}'`);
  const [row] = await asOwner(db, `select count from ai_usage where user_id = '${STUDENT}' and feature = 'lecture_summary'`);
  assert.equal(row.count, 3);
});

test("a user can see their own usage", async () => {
  const r = await asUser(db, STUDENT, `select feature, count from ai_usage order by feature`);
  assert.deepEqual(r.rows.map((x) => x.feature), ["lecture_summary", "written_answer_marking"]);
});
