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
    type: "mcq" | "short_answer" | "long_answer" | "true_false" | "diagram_labeling";
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
  includeDiagrams?: boolean;
  colorfulDiagrams?: boolean;
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
      "type": "mcq" | "short_answer" | "long_answer" | "true_false" | "diagram_labeling",
      "question": "string",
      "marks": number,
      "options": ["string"] | null,
      "correctAnswer": "string",
      "explanation": "string",
      "sampleAnswer": "string",
      "evaluationGuidelines": "string",
      "keyPoints": ["string"],
      "diagram": null | {
        "type": "generated",
        "description": "detailed visual description of WHAT to draw (for an image model)",
        "labels": ["A","B","C","D","E","F"],
        "colorful": true
      },
      "answer_key": null | { "A": "name", "B": "name", ... }
    }]
  }]
}

DIAGRAM RULES:
- For diagram_labeling questions, you MUST include both "diagram" and "answer_key" with one entry per label.
- The diagram description must be detailed enough for an image model to render the structure accurately (anatomy, apparatus, circuit, geographic feature, geometry, etc.).
- Use 4-8 labels (uppercase A, B, C…). The "labels" array must match the keys of "answer_key".
- The question text should instruct: "Study the diagram below and identify the labeled parts A, B, C…".`;

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

async function generateColoredDiagram(
  description: string,
  labels: string[] | undefined,
  colorful: boolean,
  apiKey: string,
): Promise<string | null> {
  try {
    const labelList = (labels && labels.length > 0)
      ? labels.join(", ")
      : Array.from({ length: 6 }, (_, i) => String.fromCharCode(65 + i)).join(", ");

    const colorRule = colorful
      ? `Use clean educational COLORS to distinguish parts (e.g. anatomical conventions: arteries red, veins blue; biology organelles distinct pastel colors). Soft, print-friendly colors with good contrast on a white background.`
      : `Pure black-and-white line art on a white background.`;

    const prompt = `Generate a clean, scientifically accurate educational exam diagram.

SUBJECT OF DIAGRAM:
${description}

REQUIREMENTS:
- Secondary school exam standard, suitable for printing on A4 paper
- ${colorRule}
- Simple, clear, readable lines and shapes
- NO decorative elements
- Show ONLY the essential structures relevant to the topic
- DO NOT write the original anatomical/structural names on the diagram
- Instead, place CLEAR alphabetical label markers exactly: ${labelList}
- Each marker is a bold capital letter inside a small white circle with a thin straight line pointing to the corresponding structure
- Markers must NOT overlap and must remain readable after printing
- Layout centered and balanced for an A4 exam page`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      console.error("Diagram image generation failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
  } catch (e) {
    console.error("Diagram image generation exception:", e);
    return null;
  }
}

async function attachDiagramImages(examData: any, colorful: boolean, apiKey: string) {
  const tasks: Array<{ node: any; promise: Promise<string | null> }> = [];
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (node.diagram && typeof node.diagram === "object" && node.diagram.description) {
      if (!Array.isArray(node.diagram.labels) || node.diagram.labels.length === 0) {
        node.diagram.labels = ["A", "B", "C", "D", "E", "F"];
      }
      const useColor = node.diagram.colorful !== false && colorful;
      tasks.push({
        node: node.diagram,
        promise: generateColoredDiagram(node.diagram.description, node.diagram.labels, useColor, apiKey),
      });
    }
    if (Array.isArray(node.subQuestions)) node.subQuestions.forEach(walk);
    if (Array.isArray(node.questions)) node.questions.forEach(walk);
    if (Array.isArray(node.sections)) node.sections.forEach(walk);
    if (node.studentView) walk(node.studentView);
  };
  walk(examData);

  if (tasks.length === 0) return;
  console.log(`Rendering ${tasks.length} diagram image(s) (colorful=${colorful})…`);
  const results = await Promise.all(tasks.map(t => t.promise));
  results.forEach((url, i) => { if (url) tasks[i].node.image_url = url; });
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
