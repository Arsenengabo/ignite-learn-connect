import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExamSection {
  name: string;
  questions: {
    type: "mcq" | "short_answer" | "long_answer" | "true_false";
    count: number;
    marksEach: number;
  }[];
}

interface ExamFormat {
  examName: string;
  subject: string;
  topics: string[];
  duration: number;
  totalMarks: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  instructions: string[];
  sections: ExamSection[];
}

function buildExamPrompt(format: ExamFormat, onlineExamReady: boolean = false): string {
  const basePrompt = `You are an AI exam-generation engine integrated into a React + Supabase + Gemini AI application that supports professional exam creation, online exam delivery, preview, PDF export, and AI-based answer evaluation.
Your task is to generate a fully structured, academically professional exam in strict JSON format, suitable for calculation-based subjects and automated assessment.`;

  const outputFormat = onlineExamReady ? `
Required Output Format for Online Exam (Strict JSON Only):
{
  "metadata": {
    "examId": "string (UUID format)",
    "examName": "string",
    "subject": "string",
    "totalMarks": number,
    "duration": number,
    "totalQuestions": number,
    "createdAt": "string (ISO timestamp)"
  },
  "config": {
    "allowNavigation": true,
    "allowFlagForReview": true,
    "autoSubmitOnTimeout": true,
    "showQuestionNumbers": true,
    "shuffleQuestions": false,
    "shuffleOptions": false
  },
  "instructions": ["string"],
  "studentView": {
    "sections": [{
      "id": "string",
      "name": "string",
      "order": number,
      "questions": [{
        "id": "string (unique question ID)",
        "number": number,
        "sectionId": "string",
        "type": "mcq" | "short_answer" | "long_answer" | "true_false",
        "questionText": "string",
        "marks": number,
        "options": ["string"] | null,
        "required": true
      }]
    }]
  },
  "gradingMetadata": {
    "questions": [{
      "id": "string (matching studentView question ID)",
      "type": "mcq" | "short_answer" | "long_answer" | "true_false",
      "correctAnswer": "string",
      "sampleAnswer": "string",
      "explanation": "string",
      "keyPoints": ["string"],
      "evaluationGuidelines": "string",
      "marks": number,
      "partialMarkingAllowed": boolean,
      "gradingType": "exact_match" | "semantic" | "keyword_based"
    }]
  }
}

CRITICAL ONLINE EXAM RULES:
- studentView MUST NOT contain any answers, hints, explanations, or grading data
- All question IDs must be unique UUIDs that match between studentView and gradingMetadata
- Questions must be independently answerable and clearly worded
- Do not embed correct answers or hints inside the question text
- gradingMetadata is for backend use only and never exposed to students
- For MCQ/True-False: gradingType = "exact_match"
- For short_answer: gradingType = "keyword_based"
- For long_answer: gradingType = "semantic"` : `
Required Output Format (Strict JSON Only):
{
  "examName": "string",
  "subject": "string",
  "totalMarks": number,
  "duration": number,
  "instructions": ["string"],
  "sections": [{
    "name": "string",
    "totalMarks": number,
    "questions": [{
      "number": number,
      "type": "mcq" | "short_answer" | "long_answer" | "true_false",
      "question": "string",
      "marks": number,
      "options": ["string"] | null,
      "correctAnswer": "string",
      "explanation": "string",
      "sampleAnswer": "string",
      "evaluationGuidelines": "string",
      "keyPoints": ["string"]
    }]
  }]
}`;

  const systemPrompt = `${basePrompt}
${outputFormat}

General Exam Generation Rules:
- Use only the provided topics and distribute them evenly.
- Follow the selected difficulty level strictly.
- Respect section-wise question counts and marks exactly.
- Number questions continuously across all sections.

Mathematics, Physics & Calculation-Based Subject Standards:
For Mathematics, Physics, Chemistry, Engineering, Economics, follow professional academic conventions:
- Use standard notation suitable for PDF rendering.
- Clearly define variables and constants.
- Use SI units by default.
- Avoid informal or ambiguous language.

Answer Expectations:
- Short answers: final result with correct units.
- Long answers: step-by-step solution including formula, substitution, calculation, and final answer.

Question-Type Constraints:
MCQ:
- 4 options, one correct answer
- Include correctAnswer and brief explanation

True/False:
- Clear statement with correctAnswer

Short Answer:
- Include sampleAnswer, keyPoints (list of essential ideas or values), and evaluationGuidelines describing how partial credit should be awarded

Long Answer:
- Include structured sampleAnswer, keyPoints representing scoring criteria, and evaluationGuidelines explaining mark distribution

AI-Based Answer Evaluation Requirements:
The generated exam must support automatic or semi-automatic correction using a natural language model:
- Student answers may vary in wording but express the same meaning.
- Evaluation must be based on semantic similarity to sampleAnswer, coverage of listed keyPoints, and logical correctness and clarity.
- Allow partial marking based on how many key points are correctly addressed.
- Penalize incorrect reasoning, missing critical steps (for long answers), and incorrect units or final conclusions (for numerical answers).

PDF Export Compatibility:
- Clean, professional, print-ready language
- No emojis, markdown, or decorative formatting
- Linear math expressions only

Output Constraints:
- Return JSON only
- Do not invent topics, formulas, or marks`;

  const userPrompt = `Generate a complete exam with the following specifications:

Exam Name: ${format.examName}
Subject: ${format.subject}
Topics: ${format.topics.join(", ")}
Duration: ${format.duration} minutes
Total Marks: ${format.totalMarks}
Difficulty: ${format.difficulty}
Instructions: ${format.instructions.join("; ")}

Sections:
${format.sections.map((section, idx) => `
Section ${idx + 1}: ${section.name}
${section.questions.map(q => `- ${q.count} ${q.type} questions, ${q.marksEach} marks each`).join("\n")}
`).join("\n")}

${onlineExamReady ? 'Generate the ONLINE-EXAM-READY format with separated studentView and gradingMetadata.' : 'Generate the complete exam now.'} Return ONLY the JSON object, no markdown or additional text.`;

  return JSON.stringify({ systemPrompt, userPrompt });
}

async function callLovableAI(systemPrompt: string, userPrompt: string): Promise<string> {
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
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 16000,
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

function tryParseExamJson(text: string) {
  // Clean the text first - remove markdown code blocks
  let cleanText = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  
  // Direct parse
  try {
    const parsed = JSON.parse(cleanText);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}

  // Brace extraction - find the outermost object
  const start = cleanText.indexOf("{");
  const end = cleanText.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const slice = cleanText.slice(start, end + 1);
    try {
      const parsed = JSON.parse(slice);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }

  // Try to fix common JSON issues (trailing commas, etc.)
  try {
    const fixedText = cleanText
      .replace(/,\s*]/g, ']')
      .replace(/,\s*}/g, '}');
    const parsed = JSON.parse(fixedText);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}

  console.error("Failed to parse AI response:", text.substring(0, 500));
  throw new Error("Failed to parse exam JSON from AI response");
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

    const body = await req.json();
    
    // Check if it's the new exam format or legacy prompt format
    if (body.examFormat) {
      const format = body.examFormat as ExamFormat;
      const onlineExamReady = body.onlineExamReady === true;
      
      if (!format.examName || !format.subject || !format.sections?.length) {
        return new Response(JSON.stringify({ error: "Missing required exam format fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompts = JSON.parse(buildExamPrompt(format, onlineExamReady));
      console.log("Generating exam:", format.examName, "online-ready:", onlineExamReady);
      
      const raw = await callLovableAI(prompts.systemPrompt, prompts.userPrompt);
      const exam = tryParseExamJson(raw);

      return new Response(JSON.stringify({ exam, onlineExamReady }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (body.prompt) {
      // Legacy simple question generation
      const { prompt } = body;
      
      const schema = `Return ONLY a JSON array. Do not include markdown or backticks.
Each item must have: 
- question: string
- type: "multiple_choice" | "open_ended"
- options: string[] (only for multiple_choice, exactly 4 options)
- correct_answer: string (must match one of options for multiple_choice)
- explanation: string
- difficulty: "beginner" | "intermediate" | "advanced"`;
      
      const finalPrompt = `${schema}\n\n${prompt}\n\nImportant: Output ONLY the JSON array.`;
      
      const raw = await callLovableAI(
        "You are an expert educator who writes high-quality questions and always returns valid JSON only. Keep responses concise.",
        finalPrompt
      );
      
      // Parse as array for legacy format
      let cleanText = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      let questions;
      
      try {
        questions = JSON.parse(cleanText);
        if (!Array.isArray(questions)) {
          const start = cleanText.indexOf("[");
          const end = cleanText.lastIndexOf("]");
          if (start !== -1 && end !== -1) {
            questions = JSON.parse(cleanText.slice(start, end + 1));
          }
        }
      } catch {
        throw new Error("Failed to parse questions from AI response");
      }

      return new Response(JSON.stringify({ questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Missing prompt or examFormat" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("ai-question-generator error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
