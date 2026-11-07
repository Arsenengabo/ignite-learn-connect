import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Mic, MicOff, Pause, Play, RefreshCw, Sparkles, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLiveTranscript } from "@/hooks/useLiveTranscript";
import { LectureSummaryView, toSummary, type LectureSummary } from "./LectureSummaryView";

type StudyCourse = Tables<"study_courses">;
type StudySession = Tables<"study_sessions">;
type StudyLecture = Tables<"study_lectures">;

const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "fr-FR", label: "Français" },
  { value: "sw-KE", label: "Kiswahili" },
];

const AUTOSAVE_MS = 20_000;
const AUTO_SUMMARY_MS = 4 * 60_000;
const AUTO_SUMMARY_MIN_NEW_WORDS = 150;

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
};

/** The course whose class is on now, or starts within 30 minutes. */
const currentCourseId = (sessions: StudySession[]) => {
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const soon = new Date(now.getTime() + 30 * 60_000).toTimeString().slice(0, 5);
  const today = sessions.filter((s) => s.day_of_week === now.getDay());
  const live = today.find((s) => s.start_time.slice(0, 5) <= hhmm && s.end_time.slice(0, 5) > hhmm);
  const next = today.find((s) => s.start_time.slice(0, 5) > hhmm && s.start_time.slice(0, 5) <= soon);
  return (live ?? next)?.course_id ?? null;
};

/** Pulls the server's message out of a functions.invoke error. */
const invokeErrorMessage = async (error: unknown) => {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error) return body.error as string;
    } catch {
      /* fall through */
    }
  }
  return "Could not make the summary. Try again in a moment.";
};

type Tab = "summary" | "transcript" | "notes";
type Phase = "setup" | "live" | "review";

interface LectureScreenProps {
  userId: string;
  courses: StudyCourse[];
  sessions: StudySession[];
  /** Open an existing lecture; omit to start a new one. */
  lectureId?: string;
  onClose: () => void;
}

export const LectureScreen = ({ userId, courses, sessions, lectureId, onClose }: LectureScreenProps) => {
  const [phase, setPhase] = useState<Phase>(lectureId ? "review" : "setup");
  const [lecture, setLecture] = useState<StudyLecture | null>(null);
  const [loading, setLoading] = useState(!!lectureId);
  const [tab, setTab] = useState<Tab>("summary");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState<LectureSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Setup form
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const [courseId, setCourseId] = useState<string>(() => currentCourseId(sessions) ?? courses[0]?.id ?? "none");
  const [language, setLanguage] = useState("en-US");
  const [title, setTitle] = useState("");

  const live = useLiveTranscript(lecture?.language ?? language);
  const transcript = live.finalText;

  // Latest values for timers, without restarting them on every word.
  const latest = useRef({ transcript, notes, lecture });
  latest.current = { transcript, notes, lecture };
  const saved = useRef({ transcript: "", notes: "" });
  const lastSummary = useRef({ at: 0, words: 0 });

  useEffect(() => {
    if (!lectureId) return;
    (async () => {
      const { data, error } = await supabase.from("study_lectures").select("*").eq("id", lectureId).maybeSingle();
      if (error || !data) {
        toast.error("Could not open this lecture.");
        onClose();
        return;
      }
      setLecture(data);
      live.setFinalText(data.transcript);
      setNotes(data.my_notes);
      saved.current = { transcript: data.transcript, notes: data.my_notes };
      setSummary(toSummary(data.summary));
      setTab(data.summary ? "summary" : "transcript");
      lastSummary.current = { at: Date.now(), words: wordCount(data.transcript) };
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per lecture
  }, [lectureId]);

  const save = useCallback(async (extra: Partial<StudyLecture> = {}) => {
    const { transcript: t, notes: n, lecture: l } = latest.current;
    if (!l) return;
    const changed = t !== saved.current.transcript || n !== saved.current.notes;
    if (!changed && Object.keys(extra).length === 0) return;
    const { error } = await supabase.from("study_lectures").update({ transcript: t, my_notes: n, ...extra }).eq("id", l.id);
    if (!error) saved.current = { transcript: t, notes: n };
  }, []);

  const summarize = useCallback(
    async (quiet = false) => {
      const l = latest.current.lecture;
      if (!l) return;
      if (wordCount(latest.current.transcript) + wordCount(latest.current.notes) < 40) {
        if (!quiet) toast.info("Not enough lecture text yet. Keep listening a little longer.");
        return;
      }
      setSummarizing(true);
      await save();
      const { data, error } = await supabase.functions.invoke("summarize-lecture", { body: { lectureId: l.id } });
      setSummarizing(false);
      lastSummary.current = { at: Date.now(), words: wordCount(latest.current.transcript) };
      if (error) {
        if (!quiet) toast.error(await invokeErrorMessage(error));
        return;
      }
      const s = toSummary(data?.summary);
      if (s) {
        setSummary(s);
        // Use the AI's title only if the student kept the automatic one.
        if (s.title && l.title.endsWith("(auto)")) {
          const newTitle = s.title;
          await supabase.from("study_lectures").update({ title: newTitle }).eq("id", l.id);
          setLecture({ ...l, title: newTitle });
        }
      }
    },
    [save],
  );

  // While live: tick the clock, autosave, and refresh the summary every few minutes.
  useEffect(() => {
    if (phase !== "live") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const autosave = setInterval(() => save(), AUTOSAVE_MS);
    const auto = setInterval(() => {
      const words = wordCount(latest.current.transcript);
      if (
        Date.now() - lastSummary.current.at >= AUTO_SUMMARY_MS &&
        words - lastSummary.current.words >= AUTO_SUMMARY_MIN_NEW_WORDS
      ) {
        summarize(true);
      }
    }, 30_000);
    return () => {
      clearInterval(tick);
      clearInterval(autosave);
      clearInterval(auto);
    };
  }, [phase, save, summarize]);

  // Save if the student leaves the page mid-lecture.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [save]);

  const startNew = async () => {
    const course = courseById.get(courseId);
    const date = new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const finalTitle = title.trim() || `${course?.name ?? "Lecture"} · ${date} (auto)`;
    const { data, error } = await supabase
      .from("study_lectures")
      .insert({ user_id: userId, course_id: course ? course.id : null, title: finalTitle, language })
      .select("*")
      .single();
    if (error || !data) {
      toast.error("Could not start the lecture. Check your connection.");
      return;
    }
    setLecture(data);
    saved.current = { transcript: "", notes: "" };
    lastSummary.current = { at: Date.now(), words: 0 };
    setTab("transcript");
    setPhase("live");
    live.start();
  };

  const resume = () => {
    setPhase("live");
    setTab("transcript");
    live.start();
  };

  const finish = async () => {
    live.stop();
    setPhase("review");
    setTab("summary");
    await save({ ended_at: new Date().toISOString() });
    await summarize();
  };

  const remove = async () => {
    if (!lecture) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    live.stop();
    const { error } = await supabase.from("study_lectures").delete().eq("id", lecture.id);
    if (error) return toast.error("Could not delete the lecture.");
    toast.success("Lecture deleted");
    onClose();
  };

  const back = async () => {
    if (phase === "live") {
      live.stop();
      await save();
    }
    onClose();
  };

  const shell = "ilc-surface ilc-scope -mx-3 -my-4 space-y-3 rounded-none px-3 py-4 sm:-mx-4 sm:px-4 lg:-mx-6 lg:rounded-2xl lg:px-6";

  if (loading) {
    return <div className={`${shell} py-10 text-center text-sm ilc-muted`}>Opening lecture…</div>;
  }

  const header = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={back} className="ilc-btn ilc-btn-ghost px-3" aria-label="Back to Study">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{lecture ? lecture.title.replace(/ \(auto\)$/, "") : "Live lecture"}</p>
        {lecture?.course_id && <p className="truncate text-xs ilc-muted">{courseById.get(lecture.course_id)?.name}</p>}
      </div>
      {lecture && phase === "review" && (
        <button
          type="button"
          onClick={remove}
          className="flex shrink-0 items-center gap-1 p-2 text-xs"
          style={{ color: confirmDelete ? "var(--ilc-coral)" : "var(--ilc-text-muted)" }}
          aria-label="Delete lecture"
        >
          <Trash2 className="h-4 w-4" /> {confirmDelete ? "Tap again to delete" : ""}
        </button>
      )}
    </div>
  );

  // ---- Setup ----
  if (phase === "setup") {
    return (
      <div className={shell}>
        {header}
        <section className="ilc-card-hero space-y-1">
          <p className="font-display text-lg font-bold">Start a live lecture</p>
          <p className="text-sm ilc-muted">
            Keep this screen open during class. It writes down what the lecturer says and builds a summary as the lecture goes on.
          </p>
        </section>

        {!live.supported && (
          <section className="ilc-card text-sm" style={{ borderColor: "var(--ilc-coral)" }}>
            <p className="flex items-center gap-2 font-semibold" style={{ color: "var(--ilc-coral)" }}>
              <MicOff className="h-4 w-4" /> Live listening does not work in this browser
            </p>
            <p className="mt-1 ilc-muted">
              Use Chrome on Android or a computer. You can still type notes here and get a summary from them.
            </p>
          </section>
        )}

        <section className="ilc-card space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ll-course">Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="ll-course"><SelectValue placeholder="Choose a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code ? `${c.code} · ${c.name}` : c.name}</SelectItem>
                ))}
                <SelectItem value="none">No course</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ll-title">Topic (optional)</Label>
            <Input id="ll-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty and the AI will name it" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ll-lang">Lecture language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="ll-lang"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button type="button" className="ilc-btn ilc-btn-primary w-full" onClick={startNew}>
            <Mic className="h-4 w-4" /> {live.supported ? "Start listening" : "Start with typed notes"}
          </button>
          <p className="text-[11px] ilc-muted">
            Ask your lecturer before capturing a lecture. Only the text is saved, never the audio. Speech recognition is done by your browser's provider (Google in Chrome).
          </p>
        </section>
      </div>
    );
  }

  // ---- Live and review ----
  const elapsed = lecture ? (lecture.ended_at && phase === "review" ? new Date(lecture.ended_at).getTime() : now) - new Date(lecture.started_at).getTime() : 0;
  const words = wordCount(transcript);

  return (
    <div className={shell}>
      {header}

      {phase === "live" ? (
        <section className="ilc-card-hero">
          <div className="flex items-center gap-3">
            <span
              className={live.listening ? "ilc-dot-pulse-coral" : ""}
              style={{ width: 12, height: 12, borderRadius: 999, background: live.listening ? "var(--ilc-coral)" : "var(--ilc-text-muted)" }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{live.listening ? "Listening" : live.supported ? "Paused" : "Typing notes"}</p>
              <p className="ilc-num text-xs ilc-muted">{clock(elapsed)} · {words} words</p>
            </div>
            {live.supported && (
              <button
                type="button"
                className="ilc-btn ilc-btn-ghost px-3"
                onClick={() => (live.listening ? live.stop() : live.start())}
                aria-label={live.listening ? "Pause listening" : "Resume listening"}
              >
                {live.listening ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            )}
            <button type="button" className="ilc-btn ilc-btn-danger px-3" onClick={finish}>
              <Square className="h-4 w-4" /> Finish
            </button>
          </div>
          {live.error && <p className="mt-2 text-xs" style={{ color: "var(--ilc-coral)" }}>{live.error}</p>}
        </section>
      ) : (
        <section className="ilc-card flex items-center gap-3">
          <p className="ilc-num min-w-0 flex-1 text-xs ilc-muted">
            {lecture && new Date(lecture.started_at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            {" · "}{clock(elapsed)} · {words} words
          </p>
          <button type="button" className="ilc-btn ilc-btn-ghost px-3 text-xs" onClick={resume}>
            <Mic className="h-4 w-4" /> Continue
          </button>
        </section>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-lg p-1" style={{ background: "var(--ilc-hairline-soft)" }} role="tablist">
        {(["summary", "transcript", "notes"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="min-h-[36px] rounded-md text-xs font-semibold capitalize"
            style={tab === t ? { background: "var(--ilc-navy-light)", color: "var(--ilc-text)" } : { color: "var(--ilc-text-muted)" }}
          >
            {t === "notes" ? "My notes" : t}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="space-y-3">
          <button
            type="button"
            className="ilc-btn ilc-btn-secondary w-full"
            onClick={() => summarize()}
            disabled={summarizing}
          >
            {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : summary ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {summarizing ? "Summarizing and looking things up…" : summary ? "Update summary" : "Summarize now"}
          </button>
          {summary ? (
            <LectureSummaryView summary={summary} />
          ) : (
            <p className="ilc-card py-6 text-center text-sm ilc-muted">
              {phase === "live"
                ? "The summary appears here after a few minutes of lecture and updates as the class goes on."
                : "No summary yet. Tap Summarize now."}
            </p>
          )}
        </div>
      )}

      {tab === "transcript" && (
        <TranscriptView text={transcript} interim={live.interim} live={phase === "live"} />
      )}

      {tab === "notes" && (
        <section className="ilc-card space-y-2">
          <Label htmlFor="ll-notes">Your own notes</Label>
          <Textarea
            id="ll-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => save()}
            rows={10}
            placeholder="Board notes, diagrams to draw later, questions for the lecturer… These go into the summary too."
          />
        </section>
      )}
    </div>
  );
};

const TranscriptView = ({ text, interim, live }: { text: string; interim: string; live: boolean }) => {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (live) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [text, interim, live]);

  return (
    <section className="ilc-card max-h-[55vh] overflow-y-auto text-sm leading-relaxed">
      {text || interim ? (
        <p className="whitespace-pre-wrap">
          {text}
          {interim && <span className="ilc-muted"> {interim}</span>}
        </p>
      ) : (
        <p className="py-6 text-center ilc-muted">{live ? "Waiting for the lecturer to speak…" : "No transcript for this lecture."}</p>
      )}
      <div ref={endRef} />
    </section>
  );
};
