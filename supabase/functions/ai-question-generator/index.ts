import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildPrompt(userPrompt: string): string {
  const schema = `Return ONLY a JSON array. Do not include markdown or backticks.
Each item must have: 
- question: string
- type: "multiple_choice" | "open_ended"
- options: string[] (only for multiple_choice, exactly 4 options)
- correct_answer: string (must match one of options for multiple_choice)
- explanation: string
- difficulty: "beginner" | "intermediate" | "advanced"`;
  return `${schema}\n\n${userPrompt}\n\nImportant: Output ONLY the JSON array.`;
}

async function callLovableAI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY secret");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are an expert educator who writes high-quality questions and always returns valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (res.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to your Lovable workspace.");
    }
    throw new Error(`AI gateway error: ${res.status} ${await res.text()}`);
  }
  
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function tryParseJsonArray(text: string) {
  // Clean the text first - remove markdown code blocks
  let cleanText = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  
  // Direct parse
  try {
    const parsed = JSON.parse(cleanText);
    if (Array.isArray(parsed)) return parsed;
    // If it's an object with a questions/mcqs array, extract it
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) return parsed.questions;
      if (Array.isArray(parsed.mcqs)) return parsed.mcqs;
    }
  } catch {}

  // Bracket extraction - find the outermost array
  const start = cleanText.indexOf("[");
  const end = cleanText.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const slice = cleanText.slice(start, end + 1);
    try {
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // Try to fix common JSON issues (trailing commas, etc.)
  try {
    const fixedText = cleanText
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/,\s*}/g, '}'); // Remove trailing commas in objects
    const parsed = JSON.parse(fixedText);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  console.error("Failed to parse AI response:", text.substring(0, 500));
  throw new Error("Failed to parse JSON array from AI response");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalPrompt = buildPrompt(prompt);
    const raw = await callLovableAI(finalPrompt);
    const questions = tryParseJsonArray(raw);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-question-generator error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
