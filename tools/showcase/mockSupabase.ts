/* Stand-in database for recording product screenshots. Never shipped. */
const role = (localStorage.getItem("demoRole") || "student") as "student" | "teacher";
const STUDENT = "u-student", TEACHER = "u-teacher";
const uid = role === "teacher" ? TEACHER : STUDENT;
const now = Date.now(), day = 86400000, iso = (t: number) => new Date(t).toISOString();
const d = new Date().getDay(), hh = new Date().getHours();
const pad = (n: number) => String(n).padStart(2, "0");

const summary = {
  title: "X-ray production and the X-ray tube",
  overview: "How X-rays are produced when fast electrons hit the tungsten anode, the two kinds of radiation this creates, and how kVp and mAs change the beam and the image.",
  key_points: [
    "Electrons boil off the heated cathode and are accelerated towards the anode by the tube voltage.",
    "About 99% of the electrons' energy becomes heat; only about 1% becomes X-rays.",
    "Bremsstrahlung radiation gives a continuous spectrum of energies.",
    "Characteristic radiation gives sharp peaks at energies set by the anode material.",
    "kVp controls beam quality (penetration); mAs controls quantity.",
  ],
  lecturer_emphasis: [
    "Know the difference between bremsstrahlung and characteristic radiation. 'This always comes in the exam.'",
    "Heat is the main limit of the X-ray tube.",
  ],
  key_terms: [
    { term: "Bremsstrahlung", meaning: "'Braking radiation' made when an electron slows down near a nucleus.", search_query: "bremsstrahlung x-ray production" },
    { term: "kVp", meaning: "Peak kilovoltage across the tube; sets the beam's energy.", search_query: "kVp radiography" },
    { term: "Anode heel effect", meaning: "The beam is weaker on the anode side of the field.", search_query: "anode heel effect" },
  ],
  to_review: ["The percentage of characteristic radiation at 80 kVp was not clear."],
  exam_questions: ["Compare bremsstrahlung and characteristic radiation.", "Explain how changing kVp affects image contrast."],
  further_reading: [
    { term: "Bremsstrahlung", title: "Bremsstrahlung", extract: "Bremsstrahlung is electromagnetic radiation produced by the deceleration of a charged particle when deflected by another charged particle, typically an electron by an atomic nucleus.", url: "https://en.wikipedia.org/wiki/Bremsstrahlung" },
  ],
};

const courses = [
  { id: "c1", user_id: STUDENT, code: "MIS1101", name: "Radiographic Anatomy I", lecturer: "Dr. Uwase", credits: 10, color: "teal", created_at: iso(now - 30 * day), updated_at: "" },
  { id: "c2", user_id: STUDENT, code: "MIS1103", name: "Physics of Medical Imaging", lecturer: "Mr. Habimana", credits: 15, color: "amber", created_at: iso(now - 29 * day), updated_at: "" },
  { id: "c3", user_id: STUDENT, code: "MIS1105", name: "Patient Care and Communication", lecturer: "Ms. Ingabire", credits: 5, color: "coral", created_at: iso(now - 28 * day), updated_at: "" },
  { id: "c4", user_id: STUDENT, code: "MIS1107", name: "Radiation Protection", lecturer: "Dr. Mugisha", credits: 10, color: "green", created_at: iso(now - 27 * day), updated_at: "" },
];
const s = (id: string, c: string, dow: number, a: string, b: string, kind: string, loc: string | null) =>
  ({ id, user_id: STUDENT, course_id: c, day_of_week: dow, start_time: a + ":00", end_time: b + ":00", kind, location: loc, created_at: "", updated_at: "" });
const sessions = [
  s("s1", "c1", d, "08:00", "10:00", "lecture", "Hall B"),
  s("s2", "c2", d, `${pad(Math.min(hh + 1, 22))}:00`, `${pad(Math.min(hh + 3, 23))}:00`, "lecture", "Hall A"),
  s("s3", "c4", (d + 1) % 7, "09:00", "11:00", "lecture", "Room 12"),
  s("s4", "c3", (d + 1) % 7, "14:00", "16:00", "tutorial", null),
  s("s5", "c1", (d + 2) % 7, "07:30", "12:30", "clinical", "CHUK Radiology"),
  s("s6", "c2", (d + 3) % 7, "10:00", "12:00", "lab", "Physics Lab 2"),
];
const lectures = [
  { id: "L1", user_id: STUDENT, course_id: "c2", title: "X-ray production and the X-ray tube", language: "en-US", started_at: iso(now - day), ended_at: iso(now - day + 5400000), transcript: "today we are going to look at how x-rays are produced inside the x-ray tube ".repeat(40), my_notes: "Draw the tube diagram from slide 4.", summary, summarized_at: iso(now - day), created_at: "", updated_at: "" },
  { id: "L2", user_id: STUDENT, course_id: "c1", title: "The upper limb: bones and joints", language: "en-US", started_at: iso(now - 2 * day), ended_at: iso(now - 2 * day + 5400000), transcript: "", my_notes: "", summary, summarized_at: iso(now - 2 * day), created_at: "", updated_at: "" },
  { id: "L3", user_id: STUDENT, course_id: "c4", title: "ALARA and dose limits", language: "en-US", started_at: iso(now - 4 * day), ended_at: iso(now - 4 * day + 5400000), transcript: "", my_notes: "", summary, summarized_at: iso(now - 4 * day), created_at: "", updated_at: "" },
];
const subjects = ["Radiographic Anatomy", "Physics of Imaging", "Radiation Protection", "Patient Care"];
const exams = subjects.map((sub, i) => ({ id: "e" + i, teacher_id: TEACHER, title: sub + " — CAT " + (i + 1), subject: sub, time_limit_minutes: 60, closes_at: iso(now + (i + 2) * day), is_published: true, total_marks: 50 }));
const pct = [[82, 74, 91, 66, 58, 77, 88, 95, 49, 71], [61, 55, 48, 72, 44, 58, 66, 39, 52, 63], [85, 90, 78, 92, 81, 88, 74, 96, 83, 79], [70, 76, 81, 68, 73, 79, 84, 65, 72, 88]];
const attempts = pct.flatMap((row, i) => row.map((p, j) => ({ id: `a${i}${j}`, exam_id: "e" + i, student_id: "s" + j, percentage: p, status: "evaluated", total_score: p / 2, max_score: 50 })));
const quizRows = [
  { id: "q1", title: "X-ray tube basics", description: "10 quick questions on X-ray production", subject: "Physics of Imaging", difficulty_level: "medium", total_questions: 10, time_limit: 15, is_premium: false, is_published: true, teacher_id: TEACHER, created_at: iso(now - day) },
  { id: "q2", title: "Bones of the upper limb", description: "Identify bones and landmarks", subject: "Radiographic Anatomy", difficulty_level: "easy", total_questions: 12, time_limit: 15, is_premium: false, is_published: true, teacher_id: TEACHER, created_at: iso(now - 2 * day) },
  { id: "q3", title: "Dose limits and ALARA", description: "Radiation protection rules", subject: "Radiation Protection", difficulty_level: "hard", total_questions: 8, time_limit: 10, is_premium: false, is_published: true, teacher_id: TEACHER, created_at: iso(now - 3 * day) },
];
const quizQuestions = [
  { id: "qq1", question_text: "Which exposure factor mainly controls the penetrating power of the X-ray beam?", question_type: "multiple_choice", options: ["kVp", "mAs", "Exposure time", "Focal spot size"], points: 1, order_index: 0 },
  { id: "qq2", question_text: "About how much of the electrons' energy becomes X-rays in the tube?", question_type: "multiple_choice", options: ["1%", "10%", "50%", "99%"], points: 1, order_index: 1 },
];
const profiles = [
  { id: "p1", user_id: STUDENT, full_name: "Aline Uwimana", email: "aline@example.com", role: "student", school_name: "University of Rwanda", verification_status: "verified", avatar_url: null },
  { id: "p2", user_id: TEACHER, full_name: "Eric Habimana", email: "eric@example.com", role: "teacher", school_name: "University of Rwanda", verification_status: "verified", avatar_url: null },
];
const channels = [
  { id: "ch1", name: "physics-of-imaging", description: "Questions about lectures and labs", channel_type: "text", created_at: iso(now - 9 * day), is_private: false },
  { id: "ch2", name: "anatomy-revision", description: "Revision group", channel_type: "text", created_at: iso(now - 8 * day), is_private: false },
];
const messages = [
  { id: "m1", channel_id: "ch1", user_id: "s3", content: "Does anyone have the tube diagram from today's slides?", created_at: iso(now - 50 * 60000) },
  { id: "m2", channel_id: "ch1", user_id: STUDENT, content: "Yes! It's in my Live lecture notes, sharing the key points now.", created_at: iso(now - 45 * 60000) },
  { id: "m3", channel_id: "ch1", user_id: "s5", content: "Thanks Aline. Quiz on Friday covers kVp vs mAs.", created_at: iso(now - 40 * 60000) },
];

// Rooms, teacher posts and private messages for the chat screens.
const rooms = [
  { id: "r-class", name: "Radiography Year 1", description: "Physics of Medical Imaging · Hall A", channel_type: "class_room", school_id: "sc1", school_name: "University of Rwanda", posting_mode: "comments_only", can_moderate: role === "teacher", member_count: 42, last_message_at: iso(now - 20 * 60000) },
  { id: "r-school", name: "University of Rwanda", description: "Everyone at University of Rwanda: teachers, students and staff", channel_type: "school_room", school_id: "sc1", school_name: "University of Rwanda", posting_mode: "everyone", can_moderate: role === "teacher", member_count: 812, last_message_at: iso(now - 2 * 3600000) },
  { id: "r-lounge", name: role === "teacher" ? "Staff Room" : "Student Lounge", description: role === "teacher" ? "Teachers across Codex" : "Casual chat with students across the platform", channel_type: role === "teacher" ? "teacher_general" : "student_general", school_id: null, school_name: "", posting_mode: "everyone", can_moderate: false, member_count: null, last_message_at: iso(now - day) },
];
const rm = (id: string, sender: string, name: string, teacher: boolean, mins: number, message: string, extra: any = {}) =>
  ({ id, channel_id: "r-class", sender_id: sender, sender_name: name, sender_is_teacher: teacher, message, post_kind: "message", title: null, parent_id: null, is_pinned: false, comments_open: true, is_deleted: false, created_at: iso(now - mins * 60000), ...extra });
const roomMessages = [
  rm("p1", TEACHER, "Eric Habimana", true, 26 * 60, "Bring your lab coat and dosimeter badge. We meet in Physics Lab 2 at 10:00. Late arrivals can't join the exposure session.", { post_kind: "note", title: "Practical moved to Friday", is_pinned: true }),
  rm("c1", "s3", "Jean Bosco", false, 25 * 60, "Thank you sir, is it the whole class or group A only?", { parent_id: "p1" }),
  rm("c2", TEACHER, "Eric Habimana", true, 24 * 60, "Whole class. Groups rotate inside the lab.", { parent_id: "p1" }),
  rm("p2", TEACHER, "Eric Habimana", true, 3 * 60, "Electrons leave the heated cathode and hit the tungsten anode\nAbout 99% of the energy becomes heat, only 1% X-rays\nBremsstrahlung gives a continuous spectrum\nCharacteristic radiation gives sharp peaks\nkVp controls penetration; mAs controls quantity", { post_kind: "key_points", title: "X-ray production: what to know for the CAT" }),
  rm("c3", STUDENT, "Aline Uwimana", false, 2 * 60, "Is the anode heel effect in the CAT too?", { parent_id: "p2" }),
  rm("c4", "s5", "Divine Mukamana", false, 20, "Same question 🙏", { parent_id: "p2" }),
];
const reports = [
  { id: "rep1", created_at: iso(now - 40 * 60000), source: "room", reason: "bullying", details: "He keeps posting this about her", message_snapshot: "nobody wants you in this group lol", status: "open", room_name: "Radiography Year 1", school_name: "University of Rwanda", reporter_name: "Divine Mukamana", reported_user_id: "s9", reported_name: "Kevin N.", message_removed: false, resolution: null },
];
const threads = [
  { thread_id: "t1", other_user_id: "s3", other_name: "Jean Bosco", other_school: "University of Rwanda", last_message: "Can you share the anatomy notes?", last_message_at: iso(now - 30 * 60000), is_blocked: false, can_message: true },
  { thread_id: "t2", other_user_id: "s5", other_name: "Divine Mukamana", other_school: "University of Rwanda", last_message: "See you at the lab", last_message_at: iso(now - 5 * 3600000), is_blocked: false, can_message: true },
];
const dms = [
  { id: "d1", thread_id: "t1", sender_id: "s3", content: "Hi Aline! Did you record today's physics lecture?", created_at: iso(now - 40 * 60000), deleted_at: null },
  { id: "d2", thread_id: "t1", sender_id: STUDENT, content: "Yes, the summary is in my Study tab. I'll send the key points.", created_at: iso(now - 35 * 60000), deleted_at: null },
  { id: "d3", thread_id: "t1", sender_id: "s3", content: "Can you share the anatomy notes?", created_at: iso(now - 30 * 60000), deleted_at: null },
];

const db: Record<string, any[]> = {
  profiles, user_roles: [{ user_id: STUDENT, role: "student" }, { user_id: TEACHER, role: "teacher" }],
  school_members: [{ user_id: STUDENT, status: "approved", school_id: "sc1", created_at: "" }, { user_id: TEACHER, status: "approved", school_id: "sc1", created_at: "" }],
  schools: [{ id: "sc1", name: "University of Rwanda" }],
  study_profiles: [{ id: "sp", user_id: STUDENT, university: "University of Rwanda", programme: "BSc Medical Imaging Sciences", year_of_study: 1, semester: "Semester 1", target_grade: "First Class" }],
  study_courses: courses, study_sessions: sessions, study_lectures: lectures,
  quiz_sessions: [7, 9, 8, 6].map((sc, i) => ({ id: "qs" + i, student_id: STUDENT, status: "completed", score: sc, total_questions: 10, completed_at: iso(now - i * day), quizzes: { title: quizRows[i % 3].title, subject: quizRows[i % 3].subject } })),
  course_progress: [{ id: "cp1", student_id: STUDENT, progress_percentage: 100, updated_at: "", courses: { title: "Radiographic Anatomy I", subject: "Anatomy" } }, { id: "cp2", student_id: STUDENT, progress_percentage: 40, updated_at: "", courses: { title: "Physics of Imaging", subject: "Physics" } }],
  exams, exam_attempts: attempts, quizzes: quizRows, courses: [{ id: "co1", teacher_id: TEACHER, title: "Radiographic Anatomy I", is_published: true }],
  competitions: [], competition_entries: [], user_streaks: [{ user_id: STUDENT, current_streak: 6, longest_streak: 9 }],
  chat_channels: channels, chat_messages: messages, chat_channel_members: [], dm_messages: dms, chat_mutes: [],
};

function query(table: string) {
  let rows = [...(db[table] ?? [])];
  let count = false, head = false, single: null | "one" | "maybe" = null, pending: any[] | null = null;
  const q: any = {
    select: (_c?: string, o?: any) => { if (o?.count) count = true; if (o?.head) head = true; if (pending) rows = pending; return q; },
    eq: (k: string, v: any) => { rows = rows.filter((r) => !(k in r) || r[k] === v || (k === "student_id" && table === "exam_attempts")); return q; },
    neq: () => q, gt: () => q, gte: () => q, lt: () => q, lte: () => q, is: () => q, not: () => q, or: () => q, ilike: () => q, like: () => q, contains: () => q, filter: () => q, match: () => q,
    in: (k: string, vals: any[]) => { rows = rows.filter((r) => !(k in r) || vals.includes(r[k])); return q; },
    order: (k: string, o?: any) => { rows.sort((a, b) => (a[k] > b[k] ? 1 : -1) * (o?.ascending === false ? -1 : 1)); return q; },
    limit: (n: number) => { rows = rows.slice(0, n); return q; }, range: (a: number, b: number) => { rows = rows.slice(a, b + 1); return q; },
    single: () => { single = "one"; return q; }, maybeSingle: () => { single = "maybe"; return q; },
    insert: (v: any) => { const r = { id: "new-" + Math.random().toString(36).slice(2), started_at: iso(Date.now()), created_at: iso(Date.now()), ...(Array.isArray(v) ? v[0] : v) }; if (table === "study_lectures") Object.assign(r, { transcript: "", my_notes: "", summary: null, ended_at: null }); db[table]?.push(r); pending = [r]; rows = [r]; return q; },
    update: () => q, upsert: () => q, delete: () => q,
    then: (res: any, rej: any) => {
      const data = single ? rows[0] ?? null : head ? null : rows;
      return Promise.resolve({ data, error: single === "one" && !rows[0] ? { message: "none" } : null, count: count ? rows.length : null }).then(res, rej);
    },
  };
  return q;
}

const user = { id: uid, email: role === "teacher" ? "eric@example.com" : "aline@example.com" };
const session = { user, access_token: "demo" };
const chan: any = { on: () => chan, subscribe: () => chan, unsubscribe: () => {}, send: () => {} };

export const supabase: any = {
  auth: {
    getSession: async () => ({ data: { session } }),
    getUser: async () => ({ data: { user } }),
    onAuthStateChange: (cb: any) => { setTimeout(() => cb("SIGNED_IN", session), 0); return { data: { subscription: { unsubscribe() {} } } }; },
    signOut: async () => ({}),
  },
  from: query,
  rpc: async (fn: string, args: any = {}) => {
    if (fn === "list_my_rooms") return { data: rooms, error: null };
    if (fn === "list_room_messages") return { data: args._channel_id === "r-class" ? roomMessages : [], error: null };
    if (fn === "list_my_teaching_schools") return { data: role === "teacher" ? [{ school_id: "sc1", school_name: "University of Rwanda" }] : [], error: null };
    if (fn === "list_chat_reports") return { data: role === "teacher" && (args._status ?? "open") === "open" ? reports : [], error: null };
    if (fn === "list_direct_chats") return { data: threads, error: null };
    if (fn === "search_students") return { data: [], error: null };
    if (fn === "get_quiz_questions_for_student") return { data: quizQuestions, error: null };
    if (fn === "get_user_display_name") return { data: "Classmate", error: null };
    if (fn === "is_platform_admin") return { data: false, error: null };
    if (fn === "touch_user_streak") return { data: [{ current_streak: 6, longest_streak: 9, total_active_days: 24, last_active_date: new Date().toISOString().slice(0, 10) }], error: null };
    if (fn === "list_mentors") return { data: [], error: null };
    return { data: null, error: null };
  },
  functions: { invoke: async () => ({ data: { summary }, error: null }) },
  channel: () => chan, removeChannel: () => {},
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }), upload: async () => ({}) }) },
};
