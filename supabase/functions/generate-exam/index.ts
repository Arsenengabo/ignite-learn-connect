import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExamSection {
  title: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'long_answer' | 'fill_blank';
  questionCount: number;
  marksPerQuestion: number;
  instructions?: string;
}

interface ExamFormat {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sections: ExamSection[];
  generalInstructions?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Unauthorized access attempt:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { examFormat }: { examFormat: ExamFormat } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating exam for ${examFormat.subject}: ${examFormat.topic}`);
    console.log(`Sections: ${JSON.stringify(examFormat.sections)}`);

    const systemPrompt = `You are an expert exam creator. Generate high-quality, academically accurate exam questions.

CRITICAL RULES:
1. NEVER reveal answers within question text
2. Each question must be unique and test different concepts
3. Options for MCQ must be plausible but only one correct
4. Match difficulty level precisely
5. For short_answer and long_answer, provide model answers
6. For fill_blank, use ___ to indicate the blank

Return ONLY valid JSON in this exact format:
{
  "sections": [
    {
      "title": "Section title",
      "instructions": "Section specific instructions",
      "questions": [
        {
          "question_text": "The question",
          "question_type": "mcq|true_false|short_answer|long_answer|fill_blank",
          "options": ["A", "B", "C", "D"] or null,
          "correct_answer": "The correct answer",
          "explanation": "Why this is correct",
          "marks": number
        }
      ]
    }
  ]
}`;

    let sectionPrompts = examFormat.sections.map((section, idx) => {
      let typeDesc = '';
      switch (section.questionType) {
        case 'mcq':
          typeDesc = 'Multiple choice questions with 4 options (A, B, C, D)';
          break;
        case 'true_false':
          typeDesc = 'True or False questions';
          break;
        case 'short_answer':
          typeDesc = 'Short answer questions (1-2 sentences expected)';
          break;
        case 'long_answer':
          typeDesc = 'Long answer/essay questions (paragraph expected)';
          break;
        case 'fill_blank':
          typeDesc = 'Fill in the blank questions (use ___ for blank)';
          break;
      }
      return `Section ${idx + 1}: "${section.title}"
- Type: ${typeDesc}
- Number of questions: ${section.questionCount}
- Marks per question: ${section.marksPerQuestion}
${section.instructions ? `- Instructions: ${section.instructions}` : ''}`;
    }).join('\n\n');

    const userPrompt = `Create an exam for:
Subject: ${examFormat.subject}
Topic: ${examFormat.topic}
Difficulty: ${examFormat.difficulty}
${examFormat.generalInstructions ? `General Instructions: ${examFormat.generalInstructions}` : ''}

${sectionPrompts}

Generate exactly the specified number of questions for each section. Ensure academic accuracy and appropriate difficulty.`;

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
        temperature: 0.7,
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from AI");
    }

    // Parse JSON from response
    let examData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        examData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      throw new Error("Failed to parse exam data");
    }

    console.log("Successfully generated exam with", examData.sections?.length, "sections");

    return new Response(JSON.stringify(examData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating exam:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate exam" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
