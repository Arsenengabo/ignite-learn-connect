import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  MessageSquare,
  Plus,
  ScanLine,
  School,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

interface TeacherHomeProps {
  userProfile?: any;
  onNavigate: (view: string) => void;
}

interface Stats {
  courses: number;
  exams: number;
  quizzes: number;
  pendingGrading: number;
}

const QUICK_ACTIONS = [
  {
    id: "ai-questions",
    label: "AI Question Generator",
    hint: "Build a full exam from topics",
    icon: Sparkles,
    tone: "var(--ilc-amber)",
    glow: "var(--ilc-amber-glow)",
  },
  {
    id: "quiz",
    label: "Create Quiz",
    hint: "Quick formative assessment",
    icon: Plus,
    tone: "var(--ilc-teal)",
    glow: "var(--ilc-teal-glow)",
  },
  {
    id: "course-manager",
    label: "Manage Courses",
    hint: "Modules, lessons and progress",
    icon: BookOpen,
    tone: "var(--ilc-teal)",
    glow: "var(--ilc-teal-glow)",
  },
  {
    id: "analytics",
    label: "Class Analytics",
    hint: "Scores, weak topics, remediation",
    icon: BarChart3,
    tone: "var(--ilc-amber)",
    glow: "var(--ilc-amber-glow)",
  },
  {
    id: "answer-generator",
    label: "Create Answer Sheet",
    hint: "Printable OMR sheets",
    icon: FileText,
    tone: "var(--ilc-text-muted)",
    glow: "hsl(var(--ilc-text-hsl) / 0.06)",
  },
  {
    id: "mcq-scanner",
    label: "Grade Sheets",
    hint: "Scan and auto-mark MCQs",
    icon: ScanLine,
    tone: "var(--ilc-text-muted)",
    glow: "hsl(var(--ilc-text-hsl) / 0.06)",
  },
  {
    id: "competition",
    label: "Organize Competition",
    hint: "Timed contests with prizes",
    icon: Trophy,
    tone: "var(--ilc-coral)",
    glow: "var(--ilc-coral-glow)",
  },
  {
    id: "chat",
    label: "Teacher Chat",
    hint: "Talk with fellow educators",
    icon: MessageSquare,
    tone: "var(--ilc-text-muted)",
    glow: "hsl(var(--ilc-text-hsl) / 0.06)",
  },
];

export const TeacherHome = ({ userProfile, onNavigate }: TeacherHomeProps) => {
  const [stats, setStats] = useState<Stats>({ courses: 0, exams: 0, quizzes: 0, pendingGrading: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      const countOf = async (table: "courses" | "exams" | "quizzes") => {
        const { count } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("teacher_id", uid);
        return count ?? 0;
      };

      const [courses, exams, quizzes] = await Promise.all([
        countOf("courses"),
        countOf("exams"),
        countOf("quizzes"),
      ]);

      // Submitted attempts still awaiting review
      const { count: pendingGrading } = await supabase
        .from("exam_attempts")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted");

      if (!cancelled) {
        setStats({ courses, exams, quizzes, pendingGrading: pendingGrading ?? 0 });
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    { label: "Courses", value: stats.courses, icon: BookOpen, tone: "var(--ilc-teal)" },
    { label: "Exams", value: stats.exams, icon: FileText, tone: "var(--ilc-amber)" },
    { label: "Quizzes", value: stats.quizzes, icon: GraduationCap, tone: "var(--ilc-teal)" },
    { label: "To grade", value: stats.pendingGrading, icon: Users, tone: "var(--ilc-coral)" },
  ];

  const firstName = userProfile?.full_name?.split(" ")[0] || "Teacher";

  return (
    <div className="ilc-surface ilc-scope -mx-3 -my-4 px-3 py-4 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6 space-y-4 rounded-none lg:rounded-2xl">
      {/* School hero */}
      <section className="ilc-card-hero">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs ilc-muted">Welcome back</p>
            <h2 className="font-display truncate text-lg font-bold sm:text-xl">{firstName}</h2>
            <div className="mt-2 flex items-center gap-1.5 text-xs ilc-muted">
              <School className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{userProfile?.school_name || "Independent teacher"}</span>
            </div>
          </div>
          <span className="ilc-badge ilc-badge-info shrink-0">
            {userProfile?.education_level_taught || "Teacher"}
          </span>
        </div>

        {/* AI assistant pill */}
        <button type="button" className="ilc-ai-pill mt-4" onClick={() => onNavigate("ai-questions")}>
          <span className="ilc-dot-pulse" />
          <span className="flex-1 text-left">Ask AI to build your next exam</span>
          <span className="text-xs ilc-muted">AI · Connected</span>
        </button>
      </section>

      {/* Stat row */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="ilc-card">
              <Icon className="h-4 w-4" style={{ color: stat.tone }} />
              <p className="ilc-num mt-2 text-xl font-bold" style={{ color: stat.tone }}>
                {loading ? "–" : stat.value}
              </p>
              <p className="text-xs ilc-muted">{stat.label}</p>
            </div>
          );
        })}
      </section>

      {/* Quick actions */}
      <section className="ilc-card">
        <h3 className="font-display mb-1 text-sm font-semibold">Quick actions</h3>
        <div>
          {QUICK_ACTIONS.map((action) => {
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
        </div>
      </section>
    </div>
  );
};
