import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Clock, GraduationCap, MapPin, Mic, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LectureScreen } from "./LectureScreen";

type StudyProfile = Tables<"study_profiles">;
type StudyCourse = Tables<"study_courses">;
type StudySession = Tables<"study_sessions">;
type LectureListItem = Pick<Tables<"study_lectures">, "id" | "title" | "course_id" | "started_at" | "summarized_at">;

/** Week shown Monday first, the way university timetables are printed. Values are JS day numbers (0 = Sunday). */
const WEEK = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
];

const KINDS = [
  { value: "lecture", label: "Lecture" },
  { value: "lab", label: "Lab / practical" },
  { value: "tutorial", label: "Tutorial" },
  { value: "clinical", label: "Clinical placement" },
  { value: "other", label: "Other" },
];

const COLORS: Record<string, { tone: string; glow: string }> = {
  teal: { tone: "var(--ilc-teal)", glow: "var(--ilc-teal-glow)" },
  amber: { tone: "var(--ilc-amber)", glow: "var(--ilc-amber-glow)" },
  coral: { tone: "var(--ilc-coral)", glow: "var(--ilc-coral-glow)" },
  green: { tone: "var(--ilc-success)", glow: "var(--ilc-success-glow)" },
};
const COLOR_KEYS = Object.keys(COLORS);

const colorOf = (course?: StudyCourse) => COLORS[course?.color ?? "teal"] ?? COLORS.teal;
const hhmm = (time: string) => time.slice(0, 5);
const kindLabel = (kind: string) => KINDS.find((k) => k.value === kind)?.label ?? kind;
/** "Physics of Medical Imaging" -> "PMI": course codes often share a prefix, so name initials tell courses apart. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => w && !["of", "and", "the", "in", "for", "&"].includes(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

export const StudyHub = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudyProfile | null>(null);
  const [courses, setCourses] = useState<StudyCourse[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [lectures, setLectures] = useState<LectureListItem[]>([]);
  /** null = the hub; "new" = start a live lecture; otherwise a lecture id to open. */
  const [openLecture, setOpenLecture] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const [p, c, s, l] = await Promise.all([
      supabase.from("study_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("study_courses").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("study_sessions").select("*").eq("user_id", user.id).order("start_time"),
      supabase
        .from("study_lectures")
        .select("id, title, course_id, started_at, summarized_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(20),
    ]);
    if (p.error || c.error || s.error || l.error) {
      toast.error("Could not load your study plan. Please try again.");
    }
    setProfile(p.data ?? null);
    setCourses(c.data ?? []);
    setSessions(s.data ?? []);
    setLectures(l.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const today = new Date().getDay();
  const nowTime = new Date().toTimeString().slice(0, 5);
  const todaySessions = sessions.filter((s) => s.day_of_week === today);
  const nextSession = todaySessions.find((s) => hhmm(s.end_time) > nowTime);

  const deleteCourse = async (course: StudyCourse) => {
    const { error } = await supabase.from("study_courses").delete().eq("id", course.id);
    if (error) return toast.error("Could not remove the course.");
    toast.success(`${course.name} removed`);
    load();
  };

  const deleteSession = async (session: StudySession) => {
    const { error } = await supabase.from("study_sessions").delete().eq("id", session.id);
    if (error) return toast.error("Could not remove the class.");
    load();
  };

  if (loading) {
    return (
      <div className="ilc-surface ilc-scope -mx-3 -my-4 px-3 py-10 text-center text-sm ilc-muted sm:-mx-4 lg:-mx-6 lg:rounded-2xl">
        Loading your study plan…
      </div>
    );
  }

  if (openLecture && userId) {
    return (
      <LectureScreen
        key={openLecture}
        userId={userId}
        courses={courses}
        sessions={sessions}
        lectureId={openLecture === "new" ? undefined : openLecture}
        onClose={() => {
          setOpenLecture(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="ilc-surface ilc-scope -mx-3 -my-4 space-y-4 rounded-none px-3 py-4 sm:-mx-4 sm:px-4 lg:-mx-6 lg:rounded-2xl lg:px-6">
      {/* Profile hero */}
      <section className="ilc-card-hero">
        <div className="flex items-start gap-3">
          <span className="ilc-icon-box" style={{ background: "var(--ilc-amber-glow)" }}>
            <GraduationCap className="h-5 w-5" style={{ color: "var(--ilc-amber)" }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs ilc-muted">Study planner</p>
            {profile ? (
              <>
                <p className="font-display truncate text-lg font-bold">{profile.programme || "My programme"}</p>
                <p className="truncate text-xs ilc-muted">
                  {[profile.university, profile.year_of_study ? `Year ${profile.year_of_study}` : null, profile.semester]
                    .filter(Boolean)
                    .join(" · ")}
                  {profile.target_grade ? ` · Target: ${profile.target_grade}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-lg font-bold">Set up your semester</p>
                <p className="text-xs ilc-muted">Add your programme, courses and timetable to get started.</p>
              </>
            )}
          </div>
          <button
            type="button"
            className="ilc-btn ilc-btn-ghost shrink-0 px-3"
            onClick={() => setProfileOpen(true)}
            aria-label={profile ? "Edit study profile" : "Set up study profile"}
          >
            {profile ? <Pencil className="h-4 w-4" /> : "Set up"}
          </button>
        </div>
      </section>

      {/* Today */}
      <section className="ilc-card">
        <h3 className="font-display mb-2 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4" style={{ color: "var(--ilc-teal)" }} />
          Today · {WEEK.find((d) => d.value === today)?.long}
        </h3>
        {todaySessions.length === 0 ? (
          <p className="py-3 text-sm ilc-muted">No classes today. A good day for revision.</p>
        ) : (
          todaySessions.map((s) => {
            const course = courseById.get(s.course_id);
            const color = colorOf(course);
            const isNext = nextSession?.id === s.id;
            const isDone = hhmm(s.end_time) <= nowTime;
            return (
              <div key={s.id} className="ilc-row py-2.5 last:border-b-0" style={{ opacity: isDone ? 0.55 : 1 }}>
                <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: color.tone }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{course?.name ?? "Course"}</span>
                  <span className="block truncate text-xs ilc-muted">
                    {hhmm(s.start_time)}–{hhmm(s.end_time)} · {kindLabel(s.kind)}
                    {s.location ? ` · ${s.location}` : ""}
                  </span>
                </span>
                {isNext && <span className="ilc-badge ilc-badge-warning shrink-0">Next</span>}
              </div>
            );
          })
        )}
      </section>

      {/* Lectures */}
      <section className="ilc-card">
        <button type="button" className="ilc-btn ilc-btn-primary w-full" onClick={() => setOpenLecture("new")}>
          <Mic className="h-4 w-4" /> Start live lecture
        </button>
        <p className="mt-2 text-xs ilc-muted">Open it in class: it writes down the lecture and summarizes it as it goes.</p>
        {lectures.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold ilc-muted">Past lectures</p>
            {lectures.map((l) => {
              const course = l.course_id ? courseById.get(l.course_id) : undefined;
              return (
                <button key={l.id} type="button" onClick={() => setOpenLecture(l.id)} className="ilc-row py-2.5 last:border-b-0">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: colorOf(course).tone }} />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium">{l.title.replace(/ \(auto\)$/, "")}</span>
                    <span className="block truncate text-xs ilc-muted">
                      {new Date(l.started_at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                      {course ? ` · ${course.code || course.name}` : ""}
                    </span>
                  </span>
                  {l.summarized_at ? (
                    <span className="ilc-badge ilc-badge-success shrink-0">Summary</span>
                  ) : (
                    <span className="ilc-badge ilc-badge-warning shrink-0">No summary</span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--ilc-text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Courses */}
      <section className="ilc-card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
            <NotebookPen className="h-4 w-4" style={{ color: "var(--ilc-amber)" }} />
            My courses
          </h3>
          <button type="button" className="flex items-center gap-1 text-xs" style={{ color: "var(--ilc-teal)" }} onClick={() => setCourseOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add course
          </button>
        </div>
        {courses.length === 0 ? (
          <p className="py-3 text-sm ilc-muted">No courses yet. Add the courses you take this semester.</p>
        ) : (
          courses.map((course) => {
            const color = colorOf(course);
            const weekly = sessions.filter((s) => s.course_id === course.id).length;
            return (
              <div key={course.id} className="ilc-row py-2.5 last:border-b-0">
                <span className="ilc-icon-box" style={{ background: color.glow }}>
                  <span className="text-[10px] font-bold" style={{ color: color.tone }}>
                    {initials(course.name)}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{course.name}</span>
                  <span className="block truncate text-xs ilc-muted">
                    {[course.code, course.lecturer, course.credits != null ? `${course.credits} credits` : null, `${weekly} class${weekly === 1 ? "" : "es"} a week`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 p-2"
                  onClick={() => deleteCourse(course)}
                  aria-label={`Remove ${course.name}`}
                >
                  <Trash2 className="h-4 w-4" style={{ color: "var(--ilc-text-muted)" }} />
                </button>
              </div>
            );
          })
        )}
      </section>

      {/* Weekly timetable */}
      <section className="ilc-card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4" style={{ color: "var(--ilc-coral)" }} />
            Weekly timetable
          </h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs disabled:opacity-40"
            style={{ color: "var(--ilc-teal)" }}
            onClick={() => setSessionOpen(true)}
            disabled={courses.length === 0}
            title={courses.length === 0 ? "Add a course first" : undefined}
          >
            <Plus className="h-3.5 w-3.5" /> Add class
          </button>
        </div>
        {sessions.length === 0 ? (
          <p className="py-3 text-sm ilc-muted">
            {courses.length === 0 ? "Add a course first, then its lecture times." : "No classes yet. Add your lecture times."}
          </p>
        ) : (
          <div className="space-y-3">
            {WEEK.map((day) => {
              const daySessions = sessions.filter((s) => s.day_of_week === day.value);
              if (daySessions.length === 0) return null;
              return (
                <div key={day.value}>
                  <p className="mb-1 text-xs font-semibold" style={{ color: day.value === today ? "var(--ilc-amber)" : "var(--ilc-text-muted)" }}>
                    {day.long}
                  </p>
                  {daySessions.map((s) => {
                    const course = courseById.get(s.course_id);
                    const color = colorOf(course);
                    return (
                      <div key={s.id} className="ilc-row py-2 last:border-b-0">
                        <span className="ilc-num w-[88px] shrink-0 text-xs">
                          {hhmm(s.start_time)}–{hhmm(s.end_time)}
                        </span>
                        <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: color.tone }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{course?.code || course?.name}</span>
                          <span className="flex items-center gap-1 truncate text-xs ilc-muted">
                            {kindLabel(s.kind)}
                            {s.location && (
                              <>
                                <MapPin className="h-3 w-3 shrink-0" /> {s.location}
                              </>
                            )}
                          </span>
                        </span>
                        <button type="button" className="shrink-0 p-2" onClick={() => deleteSession(s)} aria-label="Remove class">
                          <Trash2 className="h-4 w-4" style={{ color: "var(--ilc-text-muted)" }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {userId && (
        <>
          <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} userId={userId} profile={profile} onSaved={load} />
          <CourseDialog open={courseOpen} onOpenChange={setCourseOpen} userId={userId} usedColors={courses.length} onSaved={load} />
          <SessionDialog open={sessionOpen} onOpenChange={setSessionOpen} userId={userId} courses={courses} onSaved={load} />
        </>
      )}
    </div>
  );
};

interface DialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved: () => void;
}

const Field = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
);

const ProfileDialog = ({ open, onOpenChange, userId, profile, onSaved }: DialogBaseProps & { profile: StudyProfile | null }) => {
  const [form, setForm] = useState({ university: "", programme: "", year: "", semester: "", target: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        university: profile?.university ?? "",
        programme: profile?.programme ?? "",
        year: profile?.year_of_study ? String(profile.year_of_study) : "",
        semester: profile?.semester ?? "",
        target: profile?.target_grade ?? "",
      });
    }
  }, [open, profile]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("study_profiles").upsert(
      {
        user_id: userId,
        university: form.university.trim() || null,
        programme: form.programme.trim() || null,
        year_of_study: form.year ? Number(form.year) : null,
        semester: form.semester.trim() || null,
        target_grade: form.target.trim() || null,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) return toast.error("Could not save your profile.");
    toast.success("Study profile saved");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your semester</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field id="sp-university" label="University">
            <Input id="sp-university" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} placeholder="e.g. University of Rwanda" />
          </Field>
          <Field id="sp-programme" label="Programme">
            <Input id="sp-programme" value={form.programme} onChange={(e) => setForm({ ...form, programme: e.target.value })} placeholder="e.g. BSc Medical Imaging Sciences" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="sp-year" label="Year of study">
              <Select value={form.year} onValueChange={(year) => setForm({ ...form, year })}>
                <SelectTrigger id="sp-year"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="sp-semester" label="Semester">
              <Input id="sp-semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="e.g. Semester 1" />
            </Field>
          </div>
          <Field id="sp-target" label="Target grade">
            <Input id="sp-target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="e.g. First Class or 70%+" />
          </Field>
        </div>
        <DialogFooter>
          <button type="button" className="ilc-btn ilc-btn-primary w-full sm:w-auto" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CourseDialog = ({ open, onOpenChange, userId, usedColors, onSaved }: DialogBaseProps & { usedColors: number }) => {
  const [form, setForm] = useState({ code: "", name: "", lecturer: "", credits: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ code: "", name: "", lecturer: "", credits: "" });
  }, [open]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Give the course a name.");
    const credits = form.credits.trim() ? Number(form.credits) : null;
    if (credits !== null && (Number.isNaN(credits) || credits < 0)) return toast.error("Credits must be a number.");
    setSaving(true);
    const { error } = await supabase.from("study_courses").insert({
      user_id: userId,
      code: form.code.trim() || null,
      name: form.name.trim(),
      lecturer: form.lecturer.trim() || null,
      credits,
      color: COLOR_KEYS[usedColors % COLOR_KEYS.length],
    });
    setSaving(false);
    if (error) return toast.error("Could not add the course.");
    toast.success("Course added");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a course</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field id="sc-name" label="Course name">
            <Input id="sc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Radiographic Anatomy I" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="sc-code" label="Code">
              <Input id="sc-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MIS1101" />
            </Field>
            <Field id="sc-credits" label="Credits">
              <Input id="sc-credits" inputMode="decimal" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} placeholder="e.g. 10" />
            </Field>
          </div>
          <Field id="sc-lecturer" label="Lecturer">
            <Input id="sc-lecturer" value={form.lecturer} onChange={(e) => setForm({ ...form, lecturer: e.target.value })} placeholder="Optional" />
          </Field>
        </div>
        <DialogFooter>
          <button type="button" className="ilc-btn ilc-btn-primary w-full sm:w-auto" onClick={save} disabled={saving}>
            {saving ? "Adding…" : "Add course"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SessionDialog = ({ open, onOpenChange, userId, courses, onSaved }: DialogBaseProps & { courses: StudyCourse[] }) => {
  const [form, setForm] = useState({ courseId: "", day: "1", start: "08:00", end: "10:00", kind: "lecture", location: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, courseId: f.courseId && courses.some((c) => c.id === f.courseId) ? f.courseId : courses[0]?.id ?? "", location: "" }));
  }, [open, courses]);

  const save = async () => {
    if (!form.courseId) return toast.error("Choose a course.");
    if (form.end <= form.start) return toast.error("End time must be after start time.");
    setSaving(true);
    const { error } = await supabase.from("study_sessions").insert({
      user_id: userId,
      course_id: form.courseId,
      day_of_week: Number(form.day),
      start_time: form.start,
      end_time: form.end,
      kind: form.kind,
      location: form.location.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error("Could not add the class.");
    toast.success("Class added to your timetable");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a class</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field id="ss-course" label="Course">
            <Select value={form.courseId} onValueChange={(courseId) => setForm({ ...form, courseId })}>
              <SelectTrigger id="ss-course"><SelectValue placeholder="Choose a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code ? `${c.code} · ${c.name}` : c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="ss-day" label="Day">
              <Select value={form.day} onValueChange={(day) => setForm({ ...form, day })}>
                <SelectTrigger id="ss-day"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEK.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.long}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="ss-kind" label="Type">
              <Select value={form.kind} onValueChange={(kind) => setForm({ ...form, kind })}>
                <SelectTrigger id="ss-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="ss-start" label="Starts">
              <Input id="ss-start" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field id="ss-end" label="Ends">
              <Input id="ss-end" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </Field>
          </div>
          <Field id="ss-location" label="Room">
            <Input id="ss-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Optional, e.g. Lab 2" />
          </Field>
        </div>
        <DialogFooter>
          <button type="button" className="ilc-btn ilc-btn-primary w-full sm:w-auto" onClick={save} disabled={saving}>
            {saving ? "Adding…" : "Add class"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
