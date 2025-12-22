import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sanitizeText = (value: unknown) => (typeof value === "string" ? value : "").trim();

// Prevent the AI from embedding the answer inside the visible question/options.
const sanitizeOptionText = (value: unknown) => {
  const s = sanitizeText(value);
  return s
    .replace(/^[A-D]\s*[\)\.\:\-]\s*/i, "")
    .replace(/\s*[✓✔]\s*/g, " ")
    .replace(/\s*\((?:correct|answer|ans)\)\s*/gi, " ")
    .replace(/\bcorrect\s*answer\b\s*[:\-].*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
};

const sanitizeQuestionText = (value: unknown) => {
  const s = sanitizeText(value);
  // Remove obvious answer-reveal prefixes if the model leaks them into the question.
  return s
    .replace(/\b(correct\s*answer|answer)\b\s*[:\-].*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
};

const sanitizeMcqPayload = (payload: any) => {
  const subject = sanitizeText(payload?.subject);
  const topic = sanitizeText(payload?.topic);
  const mcqsRaw = Array.isArray(payload?.mcqs) ? payload.mcqs : null;

  if (!mcqsRaw) throw new Error("Invalid AI response format");

  const mcqs = mcqsRaw.map((q: any) => {
    const optionsRaw = Array.isArray(q?.options) ? q.options : [];
    const options = optionsRaw.map(sanitizeOptionText);

    const correctAnswer = typeof q?.correctAnswer === "number" ? q.correctAnswer : 0;

    return {
      question: sanitizeQuestionText(q?.question),
      options,
      correctAnswer: Math.min(Math.max(correctAnswer, 0), Math.max(options.length - 1, 0)),
      explanation: sanitizeText(q?.explanation),
    };
  });

  return { subject: subject || "", topic: topic || "", mcqs };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, topic, count = 10 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating ${count} MCQs for ${subject}: ${topic}`);

    const systemPrompt = `You are a friendly AI study assistant.
Generate challenging multiple-choice questions to test understanding after revision.

CRITICAL RULES:
- Return ONLY valid JSON (no markdown, no code fences).
- Do NOT reveal the correct answer inside the question text or the options.
- Options must be neutral: no labels like A/B/C/D, no hints, no "correct", no "answer", no ✓/✔.

Return ONLY valid JSON in this exact format:
{
  "subject": "subject name",
  "topic": "specific topic",
  "mcqs": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0,
      "explanation": "Why this is correct and why others are wrong"
    }
  ]
}`;

    const userPrompt = `Create ${count} multiple-choice questions for:
Subject: ${subject}
Topic: ${topic}

Make them challenging but fair, testing key concepts and understanding.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from AI");
    }

    let mcqData;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      mcqData = sanitizeMcqPayload(JSON.parse(cleanContent));
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    console.log(`${count} MCQs generated successfully`);

    return new Response(JSON.stringify(mcqData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-mcqs:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate MCQs" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
