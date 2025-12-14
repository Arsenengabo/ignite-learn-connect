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

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY secret");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert educator who writes high-quality questions and always returns valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY secret");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2000,
      messages: [
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content = data.content?.[0]?.text ?? "";
  return content;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY secret");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

async function callPerplexity(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) throw new Error("Missing PERPLEXITY_API_KEY secret");

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        { role: "system", content: "Be precise and concise. Return only JSON when asked to." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) throw new Error(`Perplexity error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function tryParseJsonArray(text: string) {
  // Direct parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  // Code block
  const block = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
  if (block?.[1]) {
    try {
      const parsed = JSON.parse(block[1].trim());
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // Bracket extraction
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const slice = text.slice(start, end + 1);
    try {
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  throw new Error("Failed to parse JSON array from provider response");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, prompt } = await req.json();
    if (!provider || !prompt) {
      return new Response(JSON.stringify({ error: "Missing provider or prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalPrompt = buildPrompt(prompt);

    let raw = "";
    switch (provider) {
      case "openai":
        raw = await callOpenAI(finalPrompt);
        break;
      case "anthropic":
        raw = await callAnthropic(finalPrompt);
        break;
      case "gemini":
        raw = await callGemini(finalPrompt);
        break;
      case "perplexity":
        raw = await callPerplexity(finalPrompt);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unsupported provider" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

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