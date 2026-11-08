// Security tests from the pre-launch audit (November 2026).
// Each test tries an attack that used to work, or checks that normal use still works.
// Run: cd security-tests && npm install && npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildDatabase, signUp, asUser, asOwner } from "./db.js";

const TEACHER = "11111111-1111-1111-1111-111111111111";
const STUDENT = "22222222-2222-2222-2222-222222222222";
const TEACHER2 = "33333333-3333-3333-3333-333333333333";
const MENTOR = "44444444-4444-4444-4444-444444444444";
const QUIZ = "aaaaaaaa-0000-0000-0000-000000000001";
const QUESTION = "aaaaaaaa-0000-0000-0000-000000000002";
const EXAM = "bbbbbbbb-0000-0000-0000-000000000001";
const EXAM_Q = "bbbbbbbb-0000-0000-0000-000000000002";

let db;

before(async () => {
  const built = await buildDatabase();
  db = built.db;
  if (built.skipped.length) {
    console.log(`Skipped ${built.skipped.length} old migrations that no longer replay:\n  ${built.skipped.join("\n  ")}`);
  }
  await signUp(db, TEACHER, "teacher");
  await signUp(db, STUDENT, "student");
  await signUp(db, TEACHER2, "teacher");
  await signUp(db, MENTOR, "mentor");
  await db.exec(`
    insert into quizzes(id, teacher_id, title, is_published) values ('${QUIZ}', '${TEACHER}', 'Anatomy quiz', true);
    insert into quiz_questions(id, quiz_id, question_text, question_type, options, correct_answer, points, order_index)
      values ('${QUESTION}', '${QUIZ}', 'Largest bone?', 'multiple_choice', '["Femur","Tibia"]', 'Femur', 10, 0);
    insert into exams(id, teacher_id, title, is_published, time_limit_minutes, total_marks)
      values ('${EXAM}', '${TEACHER}', 'Physics exam', true, 60, 5);
    insert into exam_questions(id, exam_id, question_text, question_type, correct_answer, marks, order_index)
      values ('${EXAM_Q}', '${EXAM}', 'Unit of dose?', 'mcq', 'Gray', 5, 0);
  `);
});

after(async () => db?.close());

// ---- Quizzes ----------------------------------------------------------------

let sessionId;

test("a student can start a quiz", async () => {
  const r = await asUser(db, STUDENT, `insert into quiz_sessions(quiz_id, student_id, total_questions) values ('${QUIZ}', '${STUDENT}', 1) returning id, status, score`);
  assert.equal(r.error, undefined, r.error);
  sessionId = r.rows[0].id;
  assert.equal(r.rows[0].status, "in_progress");
});

test("C2: a student cannot set their own quiz score", async () => {
  const r = await asUser(db, STUDENT, `update quiz_sessions set score = 10, status = 'completed' where id = '${sessionId}'`);
  assert.match(r.error ?? "", /grading system/);
});

test("C2: a student cannot write quiz answers marked correct", async () => {
  const r = await asUser(db, STUDENT, `insert into quiz_responses(session_id, question_id, answer, is_correct, points_earned) values ('${sessionId}', '${QUESTION}', 'Tibia', true, 10)`);
  assert.match(r.error ?? "", /grading system/);
});

test("normal use: submitting through the grading function scores the quiz", async () => {
  const r = await asUser(db, STUDENT, `select submit_quiz_responses('${sessionId}', '[{"question_id":"${QUESTION}","answer":"Femur"}]'::jsonb) as result`);
  assert.equal(r.error, undefined, r.error);
  assert.equal(r.rows[0].result.total_score, 10);
});

test("H2: a quiz cannot be submitted a second time", async () => {
  const r = await asUser(db, STUDENT, `select submit_quiz_responses('${sessionId}', '[{"question_id":"${QUESTION}","answer":"Femur"}]'::jsonb)`);
  assert.match(r.error ?? "", /already been submitted/);
});

// ---- Exams ------------------------------------------------------------------

let attemptId;

test("a student can start an exam, and the server sets the timer", async () => {
  const r = await asUser(db, STUDENT, `insert into exam_attempts(exam_id, student_id, time_remaining_seconds, total_score) values ('${EXAM}', '${STUDENT}', 99999, 100) returning id, status, total_score, time_remaining_seconds`);
  assert.equal(r.error, undefined, r.error);
  attemptId = r.rows[0].id;
  assert.equal(r.rows[0].status, "in_progress");
  assert.equal(r.rows[0].total_score, null);
  assert.equal(r.rows[0].time_remaining_seconds, 3600);
});

test("H2: a student cannot start a second attempt at the same exam", async () => {
  const r = await asUser(db, STUDENT, `insert into exam_attempts(exam_id, student_id) values ('${EXAM}', '${STUDENT}')`);
  assert.match(r.error ?? "", /already started/);
});

test("C2: a student cannot set their own exam grade", async () => {
  const r = await asUser(db, STUDENT, `update exam_attempts set total_score = 100, percentage = 100, status = 'evaluated' where id = '${attemptId}'`);
  assert.match(r.error ?? "", /grading system/);
});

test("C2: a student can save an answer but not award themselves marks", async () => {
  const r = await asUser(db, STUDENT, `insert into exam_responses(attempt_id, question_id, answer, marks_awarded, is_correct, is_evaluated) values ('${attemptId}', '${EXAM_Q}', 'Sievert', 5, true, true) returning answer, marks_awarded, is_correct`);
  assert.equal(r.error, undefined, r.error);
  assert.deepEqual(r.rows[0], { answer: "Sievert", marks_awarded: null, is_correct: null });
});

test("security: a student cannot read the exam's answer key", async () => {
  const r = await asUser(db, STUDENT, `select correct_answer from exam_questions where exam_id = '${EXAM}'`);
  assert.equal(r.rows?.length ?? 0, 0);
});

test("H2: answers are refused after the time limit", async () => {
  await asOwner(db, `update exam_attempts set started_at = now() - interval '70 minutes' where id = '${attemptId}'`);
  const r = await asUser(db, STUDENT, `update exam_responses set answer = 'Gray' where attempt_id = '${attemptId}'`);
  assert.match(r.error ?? "", /Time is up/);
});

test("H2: a late submission is graded on answers saved before the deadline", async () => {
  const r = await asUser(db, STUDENT, `select evaluate_exam_responses('${attemptId}', '[{"question_id":"${EXAM_Q}","answer":"Gray"}]'::jsonb) as result`);
  assert.equal(r.error, undefined, r.error);
  assert.equal(Number(r.rows[0].result.total_score), 0, "the late answer 'Gray' must not count");
});

test("H2: an exam cannot be submitted a second time", async () => {
  const r = await asUser(db, STUDENT, `select evaluate_exam_responses('${attemptId}', '[]'::jsonb)`);
  assert.match(r.error ?? "", /already been submitted/);
});

test("normal use: the exam's teacher can still change the grade", async () => {
  const r = await asUser(db, TEACHER, `update exam_attempts set total_score = 4, status = 'evaluated' where id = '${attemptId}' returning total_score`);
  assert.equal(r.error, undefined, r.error);
  assert.equal(Number(r.rows[0].total_score), 4);
});

test("a different teacher cannot change that grade", async () => {
  const r = await asUser(db, TEACHER2, `update exam_attempts set total_score = 0 where id = '${attemptId}' returning id`);
  assert.equal(r.rows?.length ?? 0, 0);
});

// ---- Roles and accounts -----------------------------------------------------

test("security: a student cannot change their role", async () => {
  await asUser(db, STUDENT, `update profiles set role = 'teacher' where user_id = '${STUDENT}'`);
  const [p] = await asOwner(db, `select role from profiles where user_id = '${STUDENT}'`);
  assert.equal(p.role, "student");
});

test("C3: new teacher and mentor accounts start as pending; students are verified", async () => {
  const rows = await asOwner(db, `select user_id, verification_status from profiles where user_id in ('${STUDENT}', '${MENTOR}', '${TEACHER}')`);
  const status = Object.fromEntries(rows.map((r) => [r.user_id, r.verification_status]));
  assert.equal(status[STUDENT], "verified");
  assert.equal(status[MENTOR], "pending");
  assert.equal(status[TEACHER], "pending");
});

test("C3: users cannot approve themselves", async () => {
  await asUser(db, MENTOR, `update profiles set verification_status = 'verified' where user_id = '${MENTOR}'`);
  const [p] = await asOwner(db, `select verification_status from profiles where user_id = '${MENTOR}'`);
  assert.equal(p.verification_status, "pending");
});

test("C3: students only see approved mentors", async () => {
  let r = await asUser(db, STUDENT, `select user_id from list_mentors()`);
  assert.equal(r.rows.length, 0);
  await asOwner(db, `update profiles set verification_status = 'verified' where user_id = '${MENTOR}'`);
  r = await asUser(db, STUDENT, `select user_id from list_mentors()`);
  assert.deepEqual(r.rows.map((x) => x.user_id), [MENTOR]);
});

// ---- Course files -----------------------------------------------------------

test("H1: a teacher cannot delete another teacher's course file", async () => {
  await asOwner(db, `insert into storage.objects(bucket_id, name, owner) values ('course-content', '${TEACHER}/modules/lesson1.pdf', '${TEACHER}')`);
  const r = await asUser(db, TEACHER2, `delete from storage.objects where bucket_id = 'course-content' and name like '${TEACHER}/%' returning name`);
  assert.equal(r.rows?.length ?? 0, 0);
});

test("H1: a teacher cannot upload into another teacher's folder", async () => {
  const r = await asUser(db, TEACHER2, `insert into storage.objects(bucket_id, name) values ('course-content', '${TEACHER}/modules/fake.pdf')`);
  assert.match(r.error ?? "", /row-level security/);
});

test("normal use: a teacher can upload and delete their own course file", async () => {
  let r = await asUser(db, TEACHER, `insert into storage.objects(bucket_id, name) values ('course-content', '${TEACHER}/modules/lesson2.pdf') returning name`);
  assert.equal(r.error, undefined, r.error);
  r = await asUser(db, TEACHER, `delete from storage.objects where name = '${TEACHER}/modules/lesson2.pdf' returning name`);
  assert.equal(r.rows.length, 1);
});
