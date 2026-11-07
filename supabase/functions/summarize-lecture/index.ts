import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// About 2.5 hours of speech. Longer transcripts keep the start and the end.
const MAX_CHARS = 150_000;
const MAX_LOOKUPS = 5;

interface KeyTerm {
  term: string;
  meaning: string;
  search_query?: string;
}

interface LectureSummary {
  title: string;
  overview: string;
  key_points: string[];
  lecturer_emphasis: string[];
  key_terms: KeyTerm[];
  to_review: string[];
  exam_questions: string[];
  further_reading: { term: string; title: string; extract: string; url: string }[];
}

const asStrings = (v: unknown, max: number) =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()).slice(0, max) : [];

function parseModelJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Model did not return JSON");
  }
}

/** Looks a term up on Wikipedia and returns its short summary, or null when there is no clear article. */
async function wikipediaSummary(query: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    // Search first, so "ALARA principle" finds the article "ALARP" and similar near-matches.
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&srsearch=${encodeURIComponent(query)}`;
    const headers = { "User-Agent": "Codex-StudyHub/1.0 (education app)" };
    const search = await fetch(searchUrl, { headers, signal: controller.signal });
    if (!search.ok) return null;
    const hit = (await search.json())?.query?.search?.[0]?.title as string | undefined;
    if (!hit) return null;
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit)}`, {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const page = await res.json();
    if (page.type !== "standard" || !page.extract) return null;
    return {
      title: page.title as string,
      extract: (page.extract as string).slice(0, 600),
      url: (page.content_urls?.desktop?.page as string) ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(hit)}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { lectureId, lookup = true } = (await req.json()) as { lectureId?: string; lookup?: boolean };
    if (!lectureId) return json({ error: "Missing lectureId" }, 400);

    // Row-level security means this only finds the caller's own lecture.
    const { data: lecture, error: lectureError } = await supabase
      .from("study_lectures")
      .select("id, title, transcript, my_notes, course_id, study_courses(name, code)")
      .eq("id", lectureId)
      .maybeSingle();
    if (lectureError || !lecture) return json({ error: "Lecture not found" }, 404);

    let transcript = (lecture.transcript ?? "").trim();
    const notes = (lecture.my_notes ?? "").trim();
    if (transcript.split(/\s+/).length + notes.split(/\s+/).length < 40) {
      return json({ error: "Not enough lecture text yet. Keep listening a little longer." }, 422);
    }
    if (transcript.length > MAX_CHARS) {
      const half = MAX_CHARS / 2;
      transcript = `${transcript.slice(0, half)}\n[… middle of the lecture cut for length …]\n${transcript.slice(-half)}`;
    }

    // deno-lint-ignore no-explicit-any
    const course = (lecture as any).study_courses as { name?: string; code?: string } | null;
    const courseLabel = course?.name ? `${course.code ? course.code + " " : ""}${course.name}` : "Unknown course";

    const systemPrompt = `You are a study assistant for a university student. You turn a live lecture transcript into study notes.
The transcript comes from automatic speech recognition, so it has no punctuation and contains mistakes: fix obvious mis-hearings using the course context (for example "x ray" -> "X-ray", "alarm principle" -> "ALARA principle").
Only use what the lecturer said, plus well-established textbook facts needed to make a point clear. Never invent numbers, doses or protocols that were not said; if something sounds wrong, put it in to_review instead.
Write in clear, simple English.

Return JSON only, no markdown, with exactly these keys:
{
  "title": "<short lecture title, max 8 words>",
  "overview": "<2-3 sentences: what this lecture was about>",
  "key_points": ["<the main ideas in order, max 12, each one sentence>"],
  "lecturer_emphasis": ["<things the lecturer stressed, repeated, or said will be in the exam, max 6>"],
  "key_terms": [{"term": "<term>", "meaning": "<one-sentence meaning>", "search_query": "<good web search query for this term>"}],
  "to_review": ["<parts that were unclear, cut off, or need checking in the textbook, max 6>"],
  "exam_questions": ["<likely exam or quiz questions on this lecture, max 5>"]
}
Give at most 8 key_terms, the most important first.`;

    const userPrompt = `Course: ${courseLabel}
Lecture title so far: ${lecture.title}

LECTURE TRANSCRIPT:
${transcript || "(none)"}

STUDENT'S OWN NOTES:
${notes || "(none)"}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiResponse.status === 429) return json({ error: "Too many requests right now. Try again in a minute." }, 429);
    if (aiResponse.status === 402) return json({ error: "AI credits are used up. Add credits in Lovable." }, 402);
    if (!aiResponse.ok) {
      console.error("summarize-lecture AI error", aiResponse.status, await aiResponse.text());
      return json({ error: "Could not summarize the lecture." }, 502);
    }

    const ai = await aiResponse.json();
    const raw = parseModelJson(ai.choices?.[0]?.message?.content ?? "");

    const keyTerms: KeyTerm[] = Array.isArray(raw.key_terms)
      ? (raw.key_terms as KeyTerm[])
          .filter((t) => t && typeof t.term === "string" && typeof t.meaning === "string")
          .slice(0, 8)
          .map((t) => ({ term: t.term.trim(), meaning: t.meaning.trim(), search_query: (t.search_query || t.term).trim() }))
      : [];

    const summary: LectureSummary = {
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 120) : lecture.title,
      overview: typeof raw.overview === "string" ? raw.overview.trim() : "",
      key_points: asStrings(raw.key_points, 12),
      lecturer_emphasis: asStrings(raw.lecturer_emphasis, 6),
      key_terms: keyTerms,
      to_review: asStrings(raw.to_review, 6),
      exam_questions: asStrings(raw.exam_questions, 5),
      further_reading: [],
    };

    if (lookup && keyTerms.length > 0) {
      const lookups = await Promise.all(
        keyTerms.slice(0, MAX_LOOKUPS).map(async (t) => {
          const page = await wikipediaSummary(t.search_query || t.term);
          return page ? { term: t.term, ...page } : null;
        }),
      );
      const seen = new Set<string>();
      summary.further_reading = lookups.filter((x): x is NonNullable<typeof x> => {
        if (!x || seen.has(x.url)) return false;
        seen.add(x.url);
        return true;
      });
    }

    const { error: saveError } = await supabase
      .from("study_lectures")
      .update({ summary, summarized_at: new Date().toISOString() })
      .eq("id", lectureId);
    if (saveError) console.error("summarize-lecture save error", saveError);

    return json({ summary });
  } catch (error) {
    console.error("summarize-lecture error", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
