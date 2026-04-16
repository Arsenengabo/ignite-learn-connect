import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  topic: string;
  questionType?: "labeling" | "mcq_labeling" | "matching_labeling" | "short_answer_labeling" | "structure_function";
  difficulty?: "easy" | "medium" | "hard" | "national_exam";
  numLabels?: number;
}

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function generateDiagramImage(topic: string, numLabels: number, apiKey: string): Promise<string> {
  const labels = Array.from({ length: numLabels }, (_, i) => String.fromCharCode(65 + i)).join(", ");

  const prompt = `Generate a clean, scientifically accurate, black-and-white educational diagram of: ${topic}.

STRICT REQUIREMENTS:
- Secondary school exam standard, suitable for printing on A4 paper
- Pure black-and-white line art (no color, no shading, no gradients)
- Simple, clear, readable lines
- White background only
- NO decorative elements, NO color
- Show ONLY the essential structures
- DO NOT write the original anatomical/structural names on the diagram
- Instead, place CLEAR alphabetical label markers exactly: ${labels}
- Each marker must be a bold capital letter inside a small circle, with a thin straight line pointing to the corresponding structure
- Markers must NOT overlap, must remain readable after printing
- Layout must be centered and balanced for an A4 exam page`;

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Image generation error:", res.status, errorText);
    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`Image generation failed: ${res.status}`);
  }

  const data = await res.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) throw new Error("No diagram image returned by AI");
  return imageUrl;
}

async function generateLabelingQuestion(
  topic: string,
  questionType: string,
  difficulty: string,
  numLabels: number,
  apiKey: string
) {
  const labels = Array.from({ length: numLabels }, (_, i) => String.fromCharCode(65 + i));

  const systemPrompt = `You are an intelligent exam question generator specialized in producing curriculum-aligned diagram-based assessment questions for secondary school national exams.

Generate a high-quality labeling question for the topic given by the user. The diagram has already been generated separately with markers ${labels.join(", ")}.

QUESTION TYPES:
- labeling: Students write what each labeled part is
- mcq_labeling: Multiple choice — give 4 options for each label
- matching_labeling: Provide a shuffled list of names; students match label letter to name
- short_answer_labeling: Short answer for each label
- structure_function: Students name the structure AND describe its function

OUTPUT STRICT JSON ONLY:
{
  "topic": "string",
  "diagram_required": true,
  "diagram_generated": true,
  "question_type": "string",
  "question_text": "string (instruction sentence shown to students)",
  "labels": ["A","B","C",...],
  "answer_key": { "A": "name of structure", "B": "name", ... },
  "options": null OR { "A": ["opt1","opt2","opt3","opt4"], "B": [...] } for mcq_labeling,
  "matching_pool": null OR ["name1","name2",...] (shuffled) for matching_labeling,
  "structure_function": null OR { "A": { "name": "...", "function": "..." }, ... } for structure_function,
  "marks": number (1 mark per label by default),
  "estimated_time_minutes": number
}

RULES:
- Difficulty: ${difficulty}. If "national_exam" use upper-secondary national exam standard, label only major structures.
- Use exactly the labels: ${labels.join(", ")}.
- Answer key MUST cover every label.
- Be scientifically accurate.
- Return JSON only, no markdown, no explanations.`;

  const userPrompt = `Topic: ${topic}
Question type: ${questionType}
Number of labels: ${numLabels}

Generate the labeling question now.`;

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Question generation error:", res.status, errorText);
    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`Question generation failed: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content received from AI");

  let cleanText = content.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const start = cleanText.indexOf("{");
  const end = cleanText.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in AI response");
  return JSON.parse(cleanText.slice(start, end + 1));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const topic = (body.topic || "").trim();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questionType = body.questionType || "labeling";
    const difficulty = body.difficulty || "national_exam";
    const numLabels = Math.min(Math.max(body.numLabels || 6, 2), 10);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log(`Generating diagram question — topic: ${topic}, type: ${questionType}, labels: ${numLabels}`);

    // Run image and question generation in parallel
    const [diagramImage, questionData] = await Promise.all([
      generateDiagramImage(topic, numLabels, LOVABLE_API_KEY),
      generateLabelingQuestion(topic, questionType, difficulty, numLabels, LOVABLE_API_KEY),
    ]);

    return new Response(
      JSON.stringify({
        ...questionData,
        diagram_image: diagramImage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-diagram-question error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
