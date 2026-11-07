import { AlertTriangle, BookOpenCheck, ExternalLink, HelpCircle, Lightbulb, ListChecks, Search, Star } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

export interface LectureSummary {
  title: string;
  overview: string;
  key_points: string[];
  lecturer_emphasis: string[];
  key_terms: { term: string; meaning: string; search_query?: string }[];
  to_review: string[];
  exam_questions: string[];
  further_reading: { term: string; title: string; extract: string; url: string }[];
}

/** Reads a stored summary defensively: older or partial rows may miss fields. */
export const toSummary = (value: Json | null | undefined): LectureSummary | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const list = (x: unknown) => (Array.isArray(x) ? (x.filter((i) => typeof i === "string") as string[]) : []);
  return {
    title: typeof v.title === "string" ? v.title : "",
    overview: typeof v.overview === "string" ? v.overview : "",
    key_points: list(v.key_points),
    lecturer_emphasis: list(v.lecturer_emphasis),
    key_terms: Array.isArray(v.key_terms) ? (v.key_terms as LectureSummary["key_terms"]) : [],
    to_review: list(v.to_review),
    exam_questions: list(v.exam_questions),
    further_reading: Array.isArray(v.further_reading) ? (v.further_reading as LectureSummary["further_reading"]) : [],
  };
};

const googleUrl = (query: string) => `https://www.google.com/search?q=${encodeURIComponent(query)}`;

const Section = ({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof Star;
  tone: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="ilc-card">
    <h3 className="font-display mb-2 flex items-center gap-2 text-sm font-semibold">
      <Icon className="h-4 w-4" style={{ color: tone }} />
      {title}
    </h3>
    {children}
  </section>
);

const Bullets = ({ items, ordered = false }: { items: string[]; ordered?: boolean }) => {
  const List = ordered ? "ol" : "ul";
  return (
    <List className={`space-y-1.5 pl-5 text-sm leading-relaxed ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </List>
  );
};

export const LectureSummaryView = ({ summary }: { summary: LectureSummary }) => (
  <div className="space-y-3">
    {summary.overview && (
      <section className="ilc-card-hero">
        <p className="text-xs ilc-muted">Overview</p>
        <p className="mt-1 text-sm leading-relaxed">{summary.overview}</p>
      </section>
    )}

    {summary.lecturer_emphasis.length > 0 && (
      <Section icon={Star} tone="var(--ilc-amber)" title="The lecturer stressed">
        <Bullets items={summary.lecturer_emphasis} />
      </Section>
    )}

    {summary.key_points.length > 0 && (
      <Section icon={ListChecks} tone="var(--ilc-teal)" title="Key points">
        <Bullets items={summary.key_points} ordered />
      </Section>
    )}

    {summary.key_terms.length > 0 && (
      <Section icon={Lightbulb} tone="var(--ilc-amber)" title="Key terms">
        {summary.key_terms.map((t) => (
          <div key={t.term} className="ilc-row items-start py-2 last:border-b-0">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t.term}</span>
              <span className="block text-sm ilc-muted">{t.meaning}</span>
            </span>
            <a
              href={googleUrl(t.search_query || t.term)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 p-1 text-xs"
              style={{ color: "var(--ilc-teal)" }}
              aria-label={`Search Google for ${t.term}`}
            >
              <Search className="h-3.5 w-3.5" /> Google
            </a>
          </div>
        ))}
      </Section>
    )}

    {summary.further_reading.length > 0 && (
      <Section icon={BookOpenCheck} tone="var(--ilc-teal)" title="Read more (from Wikipedia)">
        {summary.further_reading.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ilc-row items-start py-2.5 last:border-b-0"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--ilc-teal)" }}>
                {r.title} <ExternalLink className="h-3 w-3" />
              </span>
              <span className="mt-0.5 line-clamp-4 block text-xs leading-relaxed ilc-muted">{r.extract}</span>
            </span>
          </a>
        ))}
        <p className="mt-2 text-[11px] ilc-muted">Check clinical facts against your textbook and lecturer.</p>
      </Section>
    )}

    {summary.to_review.length > 0 && (
      <Section icon={AlertTriangle} tone="var(--ilc-coral)" title="Check in your textbook">
        <Bullets items={summary.to_review} />
      </Section>
    )}

    {summary.exam_questions.length > 0 && (
      <Section icon={HelpCircle} tone="var(--ilc-amber)" title="Possible exam questions">
        <Bullets items={summary.exam_questions} ordered />
      </Section>
    )}
  </div>
);
