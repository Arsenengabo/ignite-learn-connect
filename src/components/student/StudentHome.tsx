import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  Flame,
  Play,
  Star,
  Trophy,
  Users,
} from "lucide-react";

interface StudentHomeProps {
  userProfile?: any;
  stats: { quizzesTaken: number; competitions: number; courses: number; avgScore: number };
  onNavigate: (view: string) => void;
}

interface UpcomingExam {
  id: string;
  title: string;
  subject: string | null;
  time_limit_minutes: number | null;
  closes_at: string | null;
}

const ACTIONS = [
  { id: "quizzes", label: "Take a quiz", hint: "Short practice sets", icon: BookOpen, tone: "var(--ilc-teal)", glow: "var(--ilc-teal-glow)" },
  { id: "courses", label: "Continue learning", hint: "Your enrolled courses", icon: Play, tone: "var(--ilc-teal)", glow: "var(--ilc-teal-glow)" },
  { id: "competitions", label: "Competitions", hint: "Compete and climb the board", icon: Trophy, tone: "var(--ilc-coral)", glow: "var(--ilc-coral-glow)" },
  { id: "mentors", label: "Find a mentor", hint: "Request one-to-one guidance", icon: Users, tone: "var(--ilc-amber)", glow: "var(--ilc-amber-glow)" },
];

export const StudentHome = ({ userProfile, stats, onNavigate }: StudentHomeProps) => {
  const [streak, setStreak] = useState({ current: 0, longest: 0, totalDays: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingExam[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Server-side streak bump: counts today as an active learning day
      const { data: streakRow } = await supabase.rpc("touch_user_streak");
      const row: any = Array.isArray(streakRow) ? streakRow[0] : streakRow;
      if (!cancelled && row) {
        setStreak({
          current: row.current_streak ?? 0,
          longest: row.longest_streak ?? 0,
          totalDays: row.total_active_days ?? 0,
        });
      }

      const { data: exams } = await supabase
        .from("exams")
        .select("id, title, subject, time_limit_minutes, closes_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!cancelled) setUpcoming(exams ?? []);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = userProfile?.full_name?.split(" ")[0] || "Learner";
  // Flame intensity grows with the streak, capped at 7 days for a full flame
  const flameFill = Math.min(streak.current, 7) / 7;

  return (
    <div className="ilc-surface ilc-scope -mx-3 -my-4 space-y-4 rounded-none px-3 py-4 sm:-mx-4 sm:px-4 lg:-mx-6 lg:rounded-2xl lg:px-6">
      {/* Streak hero */}
      <section className="ilc-card-hero">
        <div className="flex items-center gap-4">
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--ilc-amber-glow)" }}
            aria-hidden
          >
            <Flame
              className="h-8 w-8"
              style={{
                color: streak.current > 0 ? "var(--ilc-amber)" : "var(--ilc-text-muted)",
                opacity: 0.4 + flameFill * 0.6,
              }}
              strokeWidth={2.2}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs ilc-muted">Welcome back, {firstName}</p>
            <p className="font-display text-xl font-bold">
              <span className="ilc-num" style={{ color: "var(--ilc-amber)" }}>{streak.current}</span>{" "}
              day{streak.current === 1 ? "" : "s"} streak
            </p>
            <p className="text-xs ilc-muted">
              Longest {streak.longest} · {streak.totalDays} active day{streak.totalDays === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Weekly flame track */}
        <div className="mt-4 flex gap-1.5" aria-label="Streak progress this week">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background: i < Math.min(streak.current, 7) ? "var(--ilc-amber)" : "var(--ilc-hairline)",
              }}
            />
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Quizzes", value: stats.quizzesTaken, icon: BookOpen, tone: "var(--ilc-teal)" },
          { label: "Courses", value: stats.courses, icon: Play, tone: "var(--ilc-teal)" },
          { label: "Contests", value: stats.competitions, icon: Trophy, tone: "var(--ilc-coral)" },
          { label: "Avg score", value: `${stats.avgScore}%`, icon: Star, tone: "var(--ilc-amber)" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="ilc-card">
              <Icon className="h-4 w-4" style={{ color: stat.tone }} />
              <p className="ilc-num mt-2 text-xl font-bold" style={{ color: stat.tone }}>{stat.value}</p>
              <p className="text-xs ilc-muted">{stat.label}</p>
            </div>
          );
        })}
      </section>

      {/* Upcoming exams */}
      <section className="ilc-card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4" style={{ color: "var(--ilc-amber)" }} />
            Upcoming exams
          </h3>
          <button type="button" className="text-xs" style={{ color: "var(--ilc-teal)" }} onClick={() => onNavigate("exams")}>
            See all
          </button>
        </div>
        {upcoming.length === 0 ? (
          <p className="py-4 text-sm ilc-muted">No published exams right now.</p>
        ) : (
          upcoming.map((exam) => (
            <button
              key={exam.id}
              type="button"
              onClick={() => onNavigate("exams")}
              className="ilc-row py-2.5 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{exam.title}</span>
                <span className="block truncate text-xs ilc-muted">
                  {exam.subject || "General"}
                  {exam.time_limit_minutes ? ` · ${exam.time_limit_minutes} min` : ""}
                  {exam.closes_at ? ` · closes ${new Date(exam.closes_at).toLocaleDateString()}` : ""}
                </span>
              </span>
              <span className="ilc-badge ilc-badge-warning shrink-0">Open</span>
            </button>
          ))
        )}
      </section>

      {/* Quick actions */}
      <section className="ilc-card">
        <h3 className="font-display mb-1 text-sm font-semibold">Keep going</h3>
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onNavigate(action.id)}
              className="ilc-row py-2.5 last:border-b-0"
            >
              <span className="ilc-icon-box" style={{ background: action.glow }}>
                <Icon className="h-4 w-4" style={{ color: action.tone }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{action.label}</span>
                <span className="block truncate text-xs ilc-muted">{action.hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--ilc-text-muted)" }} />
            </button>
          );
        })}
      </section>
    </div>
  );
};
