import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Loader2, Sparkles, TrendingUp } from "lucide-react";

interface ClassAnalyticsProps {
  onCreateRemedial?: (topic: string) => void;
}

interface AttemptRow {
  percentage: number | null;
  exam_id: string;
}

const BANDS = [
  { label: "0-39", min: 0, max: 39.999, tone: "var(--ilc-coral)" },
  { label: "40-49", min: 40, max: 49.999, tone: "var(--ilc-coral)" },
  { label: "50-59", min: 50, max: 59.999, tone: "var(--ilc-amber)" },
  { label: "60-69", min: 60, max: 69.999, tone: "var(--ilc-amber)" },
  { label: "70-79", min: 70, max: 79.999, tone: "var(--ilc-teal)" },
  { label: "80-100", min: 80, max: 100, tone: "var(--ilc-success)" },
];

export const ClassAnalytics = ({ onCreateRemedial }: ClassAnalyticsProps) => {
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [weakTopics, setWeakTopics] = useState<{ topic: string; accuracy: number; answered: number }[]>([]);
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

      // Exams owned by this teacher
      const { data: exams } = await supabase
        .from("exams")
        .select("id, subject")
        .eq("teacher_id", uid);

      const examIds = (exams ?? []).map((e) => e.id);
      if (examIds.length === 0) {
        if (!cancelled) {
          setAttempts([]);
          setWeakTopics([]);
          setLoading(false);
        }
        return;
      }

      const { data: attemptRows } = await supabase
        .from("exam_attempts")
        .select("percentage, exam_id, id")
        .in("exam_id", examIds)
        .not("submitted_at", "is", null)
        .limit(1000);

      // Per-subject accuracy stands in for topic-level weakness detection
      const subjectById = new Map((exams ?? []).map((e) => [e.id, e.subject || "General"]));
      const bySubject = new Map<string, { total: number; sum: number }>();
      (attemptRows ?? []).forEach((row) => {
        const subject = subjectById.get(row.exam_id) || "General";
        const entry = bySubject.get(subject) ?? { total: 0, sum: 0 };
        entry.total += 1;
        entry.sum += Number(row.percentage ?? 0);
        bySubject.set(subject, entry);
      });

      const topics = Array.from(bySubject.entries())
        .map(([topic, v]) => ({
          topic,
          accuracy: v.total ? Math.round(v.sum / v.total) : 0,
          answered: v.total,
        }))
        .filter((t) => t.accuracy < 65)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 4);

      if (!cancelled) {
        setAttempts(
          (attemptRows ?? []).map((r) => ({ percentage: r.percentage, exam_id: r.exam_id }))
        );
        setWeakTopics(topics);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const distribution = useMemo(
    () =>
      BANDS.map((band) => ({
        band: band.label,
        tone: band.tone,
        students: attempts.filter((a) => {
          const p = Number(a.percentage ?? 0);
          return p >= band.min && p <= band.max;
        }).length,
      })),
    [attempts]
  );

  const average = useMemo(() => {
    if (attempts.length === 0) return 0;
    const sum = attempts.reduce((acc, a) => acc + Number(a.percentage ?? 0), 0);
    return Math.round(sum / attempts.length);
  }, [attempts]);

  const passRate = useMemo(() => {
    if (attempts.length === 0) return 0;
    const passed = attempts.filter((a) => Number(a.percentage ?? 0) >= 50).length;
    return Math.round((passed / attempts.length) * 100);
  }, [attempts]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--ilc-amber)" }} />
      </div>
    );
  }

  return (
    <div className="ilc-surface ilc-scope space-y-4 rounded-2xl p-3 sm:p-4">
      <header>
        <h2 className="font-display text-lg font-bold">Class analytics</h2>
        <p className="text-xs ilc-muted">
          Based on {attempts.length} submitted attempt{attempts.length === 1 ? "" : "s"} across your exams
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2.5">
        <div className="ilc-card">
          <p className="text-xs ilc-muted">Average</p>
          <p className="ilc-num text-xl font-bold" style={{ color: "var(--ilc-amber)" }}>{average}%</p>
        </div>
        <div className="ilc-card">
          <p className="text-xs ilc-muted">Pass rate</p>
          <p className="ilc-num text-xl font-bold" style={{ color: "var(--ilc-teal)" }}>{passRate}%</p>
        </div>
        <div className="ilc-card">
          <p className="text-xs ilc-muted">Attempts</p>
          <p className="ilc-num text-xl font-bold">{attempts.length}</p>
        </div>
      </section>

      <section className="ilc-card">
        <h3 className="font-display mb-3 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4" style={{ color: "var(--ilc-teal)" }} />
          Score distribution
        </h3>
        {attempts.length === 0 ? (
          <p className="py-6 text-center text-sm ilc-muted">No submitted attempts yet.</p>
        ) : (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--ilc-text-hsl) / 0.08)" />
                <XAxis
                  dataKey="band"
                  tick={{ fontSize: 11, fill: "hsl(var(--ilc-text-muted-hsl))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--ilc-text-muted-hsl))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--ilc-navy-light)",
                    border: "1px solid var(--ilc-hairline)",
                    borderRadius: 8,
                    color: "var(--ilc-text)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="students" radius={[4, 4, 0, 0]}>
                  {distribution.map((entry) => (
                    <Cell key={entry.band} fill={entry.tone} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="ilc-card">
        <h3 className="font-display mb-2 flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4" style={{ color: "var(--ilc-coral)" }} />
          Weak areas detected
        </h3>
        {weakTopics.length === 0 ? (
          <p className="py-4 text-sm ilc-muted">
            No subject is averaging below 65%. Nothing needs remediation right now.
          </p>
        ) : (
          <div className="space-y-2.5">
            {weakTopics.map((topic) => (
              <div key={topic.topic}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{topic.topic}</span>
                  <span className="ilc-num text-xs" style={{ color: "var(--ilc-coral)" }}>
                    {topic.accuracy}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--ilc-hairline)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${topic.accuracy}%`, background: "var(--ilc-coral)" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onCreateRemedial?.(topic.topic)}
                  className="ilc-btn ilc-btn-ghost mt-2 w-full text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate remedial quiz for {topic.topic}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
