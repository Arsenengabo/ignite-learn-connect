// Chat rules: who sees which room, who may post, moderation, reports, blocks and limits.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildDatabase, signUp, asUser, asOwner } from "./db.js";

const OWNER = "c0000000-0000-0000-0000-000000000001"; // Codex platform admin
const ADMIN_A = "c0000000-0000-0000-0000-000000000002";
const TEACHER = "c0000000-0000-0000-0000-000000000003";
const STUDENT1 = "c0000000-0000-0000-0000-000000000004";
const STUDENT2 = "c0000000-0000-0000-0000-000000000005";
const STUDENT3 = "c0000000-0000-0000-0000-000000000006";
const PENDING = "c0000000-0000-0000-0000-000000000007";
const ADMIN_B = "c0000000-0000-0000-0000-000000000008";
const OUTSIDER = "c0000000-0000-0000-0000-000000000009"; // student at another school

let db;
let schoolA;
let schoolRoom;
let classRoom;

const ok = (r) => {
  assert.equal(r.error, undefined, r.error);
  return r.rows;
};
const one = async (user, sql) => ok(await asUser(db, user, sql))[0];
const post = (user, channel, text, extra = {}) => {
  const cols = ["channel_id", "sender_id", "message", ...Object.keys(extra)];
  const vals = [`'${channel}'`, `'${user}'`, `'${text}'`, ...Object.values(extra).map((v) => (v === null ? "null" : `'${v}'`))];
  return asUser(db, user, `insert into chat_messages(${cols.join(",")}) values (${vals.join(",")}) returning id`);
};

async function registerSchool(admin, name) {
  const reg = await one(admin, `select register_school('${name}', 'Kigali', 'Gasabo', '{}', 'school@example.com', '') as r`);
  ok(await asUser(db, OWNER, `select set_account_verification('${admin}', 'verified')`));
  return reg.r;
}
async function joinAndApprove(user, code, role, admin) {
  ok(await asUser(db, user, `select join_school_by_code('${code}', '${role}')`));
  const [{ id }] = await asOwner(db, `select id from school_members where user_id = '${user}'`);
  ok(await asUser(db, admin, `select set_school_member_status('${id}', 'approved')`));
}

before(async () => {
  // Same replay as the approvals tests: the two archived drafts were never applied remotely.
  ({ db } = await buildDatabase({ excludeMigrations: ["20261107180000", "20261107190000"] }));
  await signUp(db, OWNER, "student");
  await signUp(db, ADMIN_A, "school_admin");
  await signUp(db, ADMIN_B, "school_admin");
  await signUp(db, TEACHER, "teacher");
  for (const s of [STUDENT1, STUDENT2, STUDENT3, PENDING, OUTSIDER]) await signUp(db, s, "student");
  await asOwner(db, `insert into platform_admins(user_id, note) values ('${OWNER}', 'test owner')`);

  const a = await registerSchool(ADMIN_A, "Lycee A");
  const b = await registerSchool(ADMIN_B, "College B");
  schoolA = a.school_id ?? (await asOwner(db, `select id from schools where name = 'Lycee A'`))[0].id;
  await joinAndApprove(TEACHER, a.join_code, "teacher", ADMIN_A);
  for (const s of [STUDENT1, STUDENT2, STUDENT3]) await joinAndApprove(s, a.join_code, "student", ADMIN_A);
  ok(await asUser(db, PENDING, `select join_school_by_code('${a.join_code}', 'student')`));
  await joinAndApprove(OUTSIDER, b.join_code, "student", ADMIN_B);

  [{ id: schoolRoom }] = await asOwner(db, `select id from chat_channels where school_id = '${schoolA}' and channel_type = 'school_room'`);
});

after(async () => db?.close());

test("every school gets a school room that only its approved members can open", async () => {
  const mine = ok(await asUser(db, STUDENT1, `select id, channel_type from list_my_rooms()`));
  assert.ok(mine.some((r) => r.id === schoolRoom && r.channel_type === "school_room"));

  for (const stranger of [OUTSIDER, PENDING]) {
    const rooms = ok(await asUser(db, stranger, `select id from list_my_rooms()`));
    assert.ok(!rooms.some((r) => r.id === schoolRoom), "outsiders and pending members can't see the room");
    assert.equal(ok(await asUser(db, stranger, `select id from chat_channels where id = '${schoolRoom}'`)).length, 0);
    assert.match((await post(stranger, schoolRoom, "hi")).error ?? "", /not a member|row-level security/);
    assert.match((await asUser(db, stranger, `select * from list_room_messages('${schoolRoom}')`)).error ?? "", /not a member/);
  }
  ok(await post(STUDENT1, schoolRoom, "Hello school"));
  assert.equal(ok(await asUser(db, OUTSIDER, `select id from chat_messages where channel_id = '${schoolRoom}'`)).length, 0);
});

test("the old community rooms still follow the account role", async () => {
  const studentRooms = ok(await asUser(db, STUDENT2, `select name from list_my_rooms()`)).map((r) => r.name);
  assert.ok(studentRooms.includes("Student Lounge"));
  assert.ok(!studentRooms.includes("Staff Room"));
  const teacherRooms = ok(await asUser(db, TEACHER, `select name from list_my_rooms()`)).map((r) => r.name);
  assert.ok(teacherRooms.includes("Staff Room"));
});

test("only approved teachers create class rooms, and only school members can be added", async () => {
  assert.match((await asUser(db, STUDENT1, `select create_class_room('${schoolA}', 'Fake class')`)).error ?? "", /Only approved teachers/);
  assert.match((await asUser(db, OUTSIDER, `select create_class_room('${schoolA}', 'Fake class')`)).error ?? "", /Only approved teachers/);
  ({ create_class_room: classRoom } = await one(TEACHER, `select create_class_room('${schoolA}', 'Radiography Year 1', 'Main class') `));

  assert.ok(!ok(await asUser(db, STUDENT1, `select id from list_my_rooms()`)).some((r) => r.id === classRoom));
  const added = await one(TEACHER, `select add_room_members('${classRoom}', array['${STUDENT1}','${STUDENT2}','${OUTSIDER}','${PENDING}']::uuid[]) as n`);
  assert.equal(added.n, 2, "people outside the school (or not yet approved) are skipped");
  assert.ok(ok(await asUser(db, STUDENT1, `select id from list_my_rooms()`)).some((r) => r.id === classRoom));
  assert.ok(!ok(await asUser(db, STUDENT3, `select id from list_my_rooms()`)).some((r) => r.id === classRoom));

  assert.match((await asUser(db, STUDENT1, `select add_room_members('${classRoom}', array['${STUDENT3}']::uuid[])`)).error ?? "", /Only the class teacher/);
  assert.match((await asUser(db, STUDENT1, `insert into chat_room_members(channel_id, user_id) values ('${classRoom}', '${STUDENT3}')`)).error ?? "", /row-level security/);
});

test("teachers post notes and key points; students comment only", async () => {
  // New class rooms start in "students comment only" mode.
  assert.match((await post(STUDENT1, classRoom, "Is there class tomorrow?")).error ?? "", /Only teachers can start posts/);
  assert.match((await post(STUDENT1, classRoom, "Fake note", { post_kind: "note", title: "Exam moved" })).error ?? "", /Only teachers|Only teachers can start/);

  const [{ id: noteId }] = ok(await post(TEACHER, classRoom, "Bring your lab coat.", { post_kind: "note", title: "Practical on Friday", is_pinned: "true" }));
  ok(await post(TEACHER, classRoom, "X-rays are ionising\\nProtect the patient", { post_kind: "key_points", title: "Radiation safety" }));

  const [{ id: commentId }] = ok(await post(STUDENT1, classRoom, "Thank you", { parent_id: noteId }));
  const pinned = ok(await asUser(db, STUDENT2, `select id, is_pinned, post_kind, sender_is_teacher from list_room_messages('${classRoom}') where id = '${noteId}'`));
  assert.deepEqual(pinned[0], { id: noteId, is_pinned: true, post_kind: "note", sender_is_teacher: true });
  assert.match((await post(STUDENT1, classRoom, "reply to a reply", { parent_id: commentId })).error ?? "", /no longer available/);
  assert.match((await post(STUDENT1, classRoom, "sneaky pin", { parent_id: noteId, is_pinned: "true" })).error ?? "", /Only teachers can pin/);

  ok(await asUser(db, TEACHER, `select set_post_comments('${noteId}', false)`));
  assert.match((await post(STUDENT2, classRoom, "comment", { parent_id: noteId })).error ?? "", /Comments are turned off/);
  ok(await asUser(db, TEACHER, `select set_post_comments('${noteId}', true)`));
  assert.match((await asUser(db, STUDENT1, `select set_post_comments('${noteId}', false)`)).error ?? "", /Only teachers/);

  ok(await asUser(db, TEACHER, `select set_room_posting_mode('${classRoom}', 'teachers_only')`));
  assert.match((await post(STUDENT2, classRoom, "comment", { parent_id: noteId })).error ?? "", /Comments are turned off/);
  ok(await asUser(db, TEACHER, `select set_room_posting_mode('${classRoom}', 'everyone')`));
  ok(await post(STUDENT2, classRoom, "Now we can all talk"));
  assert.match((await asUser(db, STUDENT2, `select set_room_posting_mode('${classRoom}', 'everyone')`)).error ?? "", /Only teachers/);
});

test("nobody can send as someone else or forge removed/pinned flags", async () => {
  const r = await asUser(db, STUDENT1, `insert into chat_messages(channel_id, sender_id, message) values ('${schoolRoom}', '${TEACHER}', 'x')`);
  assert.match(r.error ?? "", /as yourself|row-level security/);
  const forged = ok(await post(STUDENT1, schoolRoom, "  spaced  ", { deleted_at: "2020-01-01", comments_open: "false" }));
  const [row] = await asOwner(db, `select message, deleted_at, comments_open from chat_messages where id = '${forged[0].id}'`);
  assert.deepEqual(row, { message: "spaced", deleted_at: null, comments_open: true });
  assert.match((await post(STUDENT1, schoolRoom, "a".repeat(4001))).error ?? "", /too long/);
});

test("people delete their own messages; teachers remove others' and the text is kept for review", async () => {
  const [{ id: mine }] = ok(await post(STUDENT1, schoolRoom, "oops wrong room"));
  const [{ id: rude }] = ok(await post(STUDENT2, schoolRoom, "something rude"));

  assert.equal(ok(await asUser(db, STUDENT1, `update chat_messages set message = 'edited' where id = '${rude}' returning id`)).length, 0);
  assert.equal(ok(await asUser(db, STUDENT1, `delete from chat_messages where id = '${rude}' returning id`)).length, 0);
  assert.match((await asUser(db, STUDENT1, `select delete_chat_message('${rude}')`)).error ?? "", /only delete your own/);

  ok(await asUser(db, STUDENT1, `select delete_chat_message('${mine}')`));
  ok(await asUser(db, TEACHER, `select delete_chat_message('${rude}')`));
  const shown = ok(await asUser(db, STUDENT3, `select id, message, is_deleted from list_room_messages('${schoolRoom}') where id in ('${mine}','${rude}')`));
  assert.ok(shown.every((m) => m.is_deleted && m.message === ""));
  const [{ message: raw }] = await asOwner(db, `select message from chat_messages where id = '${rude}'`);
  assert.equal(raw, "", "the visible copy is blanked");
  const log = await asOwner(db, `select action, original_text, actor_id from chat_moderation_log where message_id = '${rude}'`);
  assert.deepEqual(log[0], { action: "remove", original_text: "something rude", actor_id: TEACHER });
  const peek = await asUser(db, TEACHER, `select * from chat_moderation_log`);
  assert.ok(peek.error?.match(/permission denied/) || peek.rows.length === 0, "the review log is not readable from the app");
});

test("teachers can pause a student, students can't pause anyone", async () => {
  assert.match((await asUser(db, STUDENT2, `select mute_room_member('${schoolRoom}', '${STUDENT1}', 60)`)).error ?? "", /Only teachers/);
  assert.match((await asUser(db, ADMIN_A, `select mute_room_member('${schoolRoom}', '${TEACHER}', 60)`)).error ?? "", /Teachers can't be paused/);
  ok(await asUser(db, TEACHER, `select mute_room_member('${schoolRoom}', '${STUDENT1}', 60)`));
  assert.match((await post(STUDENT1, schoolRoom, "let me talk")).error ?? "", /paused your messages/);
  ok(await post(STUDENT1, classRoom, "other rooms are not affected"));
  ok(await asUser(db, TEACHER, `select mute_room_member('${schoolRoom}', '${STUDENT1}', 0)`));
  ok(await post(STUDENT1, schoolRoom, "thanks"));
});

test("reports reach the school's admin and room teachers, not other students or schools", async () => {
  const [{ id: bad }] = ok(await post(STUDENT1, classRoom, "mean message"));
  assert.match((await asUser(db, STUDENT1, `select report_chat_message('${bad}', 'bullying')`)).error ?? "", /your own message/);
  assert.match((await asUser(db, OUTSIDER, `select report_chat_message('${bad}', 'bullying')`)).error ?? "", /not found/);
  const { report_chat_message: reportId } = await one(STUDENT2, `select report_chat_message('${bad}', 'bullying', 'please check')`);

  assert.equal(ok(await asUser(db, STUDENT2, `select id from list_chat_reports('all')`)).length, 0);
  assert.equal(ok(await asUser(db, ADMIN_B, `select id from list_chat_reports('all')`)).length, 0);
  assert.equal(ok(await asUser(db, STUDENT2, `select id from chat_reports`)).length, 1, "reporters see their own report");
  assert.equal(ok(await asUser(db, STUDENT1, `select id from chat_reports`)).length, 0, "the reported person doesn't");
  const adminView = ok(await asUser(db, ADMIN_A, `select id, message_snapshot, reporter_name from list_chat_reports('open')`));
  assert.equal(adminView[0].message_snapshot, "mean message");
  assert.equal(ok(await asUser(db, TEACHER, `select id from list_chat_reports('open')`)).length, 1);
  assert.equal(ok(await asUser(db, OWNER, `select id from list_chat_reports('open')`)).length, 1);

  assert.match((await asUser(db, ADMIN_B, `select resolve_chat_report('${reportId}', 'remove')`)).error ?? "", /not found/);
  assert.equal(ok(await asUser(db, STUDENT2, `update chat_reports set status = 'dismissed' returning id`)).length, 0);
  ok(await asUser(db, ADMIN_A, `select resolve_chat_report('${reportId}', 'remove')`));
  const [{ deleted_at }] = await asOwner(db, `select deleted_at from chat_messages where id = '${bad}'`);
  assert.ok(deleted_at);
  assert.equal(ok(await asUser(db, ADMIN_A, `select id from list_chat_reports('open')`)).length, 0);
});

test("private messages stay inside the school", async () => {
  const found = ok(await asUser(db, STUDENT1, `select user_id from search_students('', false)`)).map((r) => r.user_id);
  assert.ok(found.includes(STUDENT2));
  assert.ok(!found.includes(OUTSIDER), "students at other schools don't appear, even when asked for all schools");
  assert.ok(!found.includes(PENDING));
  assert.match((await asUser(db, STUDENT1, `select start_direct_chat('${OUTSIDER}')`)).error ?? "", /same school/);

  // An old cross-school conversation can no longer be used.
  const [lo, hi] = [STUDENT1, OUTSIDER].sort();
  const [{ id: oldThread }] = await asOwner(db, `insert into dm_threads(user_a, user_b) values ('${lo}', '${hi}') returning id`);
  assert.match((await asUser(db, STUDENT1, `insert into dm_messages(thread_id, sender_id, content) values ('${oldThread}', '${STUDENT1}', 'hi')`)).error ?? "", /same school/);

  const { start_direct_chat: thread } = await one(STUDENT1, `select start_direct_chat('${STUDENT2}')`);
  const [{ id: dm }] = ok(await asUser(db, STUDENT1, `insert into dm_messages(thread_id, sender_id, content) values ('${thread}', '${STUDENT1}', 'hey') returning id`));
  assert.match((await asUser(db, STUDENT2, `select delete_direct_message('${dm}')`)).error ?? "", /only delete your own/);
  const { report_direct_message: dmReport } = await one(STUDENT2, `select report_direct_message('${dm}', 'harassment')`);
  assert.ok(dmReport);
  assert.ok(ok(await asUser(db, ADMIN_A, `select source from list_chat_reports('open')`)).some((r) => r.source === "direct"));
  ok(await asUser(db, STUDENT1, `select delete_direct_message('${dm}')`));
  const [{ content }] = await asOwner(db, `select content from dm_messages where id = '${dm}'`);
  assert.equal(content, "");
});

test("blocking stops private messages and hides the person's room messages", async () => {
  const [{ id: thread }] = await asOwner(db, `select id from dm_threads where '${STUDENT1}' in (user_a, user_b) and '${STUDENT2}' in (user_a, user_b)`);
  ok(await asUser(db, STUDENT1, `select block_user('${STUDENT2}')`));
  assert.match((await asUser(db, STUDENT2, `insert into dm_messages(thread_id, sender_id, content) values ('${thread}', '${STUDENT2}', 'hello?')`)).error ?? "", /can't message/);
  assert.match((await asUser(db, STUDENT2, `select start_direct_chat('${STUDENT1}')`)).error ?? "", /can't message/);
  assert.ok(!ok(await asUser(db, STUDENT2, `select user_id from search_students('')`)).some((r) => r.user_id === STUDENT1));

  ok(await post(STUDENT2, schoolRoom, "message from the blocked person"));
  const seen = ok(await asUser(db, STUDENT1, `select sender_id from list_room_messages('${schoolRoom}')`));
  assert.ok(!seen.some((m) => m.sender_id === STUDENT2));
  const [chat] = ok(await asUser(db, STUDENT1, `select is_blocked, can_message from list_direct_chats() where other_user_id = '${STUDENT2}'`));
  assert.deepEqual(chat, { is_blocked: true, can_message: false });
  assert.equal(ok(await asUser(db, STUDENT2, `select blocker_id from user_blocks`)).length, 0, "you can't see who blocked you");
  assert.match((await asUser(db, STUDENT2, `insert into user_blocks(blocker_id, blocked_id) values ('${STUDENT2}', '${STUDENT3}')`)).error ?? "", /row-level security/);

  ok(await asUser(db, STUDENT1, `select unblock_user('${STUDENT2}')`));
  ok(await asUser(db, STUDENT2, `insert into dm_messages(thread_id, sender_id, content) values ('${thread}', '${STUDENT2}', 'hello again')`));
});

test("sending is limited to 20 messages a minute", async () => {
  for (let i = 0; i < 20; i++) ok(await post(STUDENT3, schoolRoom, `message ${i}`));
  assert.match((await post(STUDENT3, schoolRoom, "one too many")).error ?? "", /too fast/);
});
