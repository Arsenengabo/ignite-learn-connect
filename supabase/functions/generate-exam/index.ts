import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExamSection {
  title: string;
  questionType: string;
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
  includeDiagrams?: boolean;
  colorfulDiagrams?: boolean;
}

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
      ? `Use clean educational COLORS to distinguish parts (e.g. anatomical conventions: arteries red, veins blue; biology organelles distinct pastel colors). Use soft, print-friendly colors with good contrast. White background.`
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

// Recursively walk the question tree, collect diagrams that need rendering,
// generate their images in parallel, then attach image_url + labels back.
async function attachDiagramImages(examData: any, colorful: boolean, apiKey: string) {
  const tasks: Array<{ node: any; promise: Promise<string | null> }> = [];

  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (node.diagram && typeof node.diagram === "object" && node.diagram.description) {
      // Ensure label list exists
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
  };
  walk(examData);

  if (tasks.length === 0) return;
  console.log(`Rendering ${tasks.length} diagram image(s) in parallel (colorful=${colorful})…`);

  const results = await Promise.all(tasks.map(t => t.promise));
  results.forEach((url, i) => {
    if (url) tasks[i].node.image_url = url;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { examFormat }: { examFormat: ExamFormat } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const includeDiagrams = examFormat.includeDiagrams !== false; // default true
    const colorful = examFormat.colorfulDiagrams !== false; // default true

    console.log(`Generating exam for ${examFormat.subject}: ${examFormat.topic} (diagrams=${includeDiagrams}, colorful=${colorful})`);

    const diagramRule = includeDiagrams
      ? `Use diagrams when they GENUINELY help: anatomy, biology structures, physics apparatus / circuits, chemistry setups, geography maps, geometry, graphs, processes. Whenever you include a diagram-labeling question, you MUST attach a "diagram" object on that question.`
      : `Do NOT add any diagram objects.`;

    const systemPrompt = `You are an expert exam creator that generates high-quality, structured exams matching real national exam standards.

TASK:
Generate a structured exam based on the given subject, topics, difficulty, and marks.

The exam MUST include:
- Proper question hierarchy (Q1, a, b, i, ii)
- Tables where appropriate (data presentation, comparisons, experimental results)
- Diagrams where appropriate (processes, graphs, labeling structures)
- A mix of question types with logical progression of difficulty
- Balanced marking scheme

QUESTION TYPES:
- mcq: 4 options, one correct
- true_false: Clear statement
- fill_blank: Use ___ for blanks
- short_answer: 1-2 sentence answers
- long_answer: Paragraph/essay answers
- calculation: Must include numerical data, correctAnswer, and workingSteps
- critical_thinking: Require reasoning, not recall. Use scenarios or case-based prompts
- problem_solving: Multi-step reasoning, may include table or diagram support
- diagram_labeling: Diagram-based labeling — students identify the labeled parts (A, B, C…). Provide the answer_key for each label.

STRUCTURE REQUIREMENTS:
- Use main questions (1, 2, 3...)
- Include sub-questions: a, b, c and i, ii, iii where necessary
- Group related questions under a parent question with type "group"

DIAGRAM FORMAT (${diagramRule})
"diagram": {
  "type": "generated",
  "description": "detailed visual description of WHAT to draw (the structure / apparatus / process), enough for an image model to render it accurately",
  "labels": ["A","B","C","D","E","F"],
  "colorful": true
}
For diagram_labeling questions ALSO include:
"answer_key": { "A": "name of structure A", "B": "name of structure B", ... }
The question text should instruct: "Study the diagram below and identify the labeled parts A, B, C…"

TABLE FORMAT (include for data presentation, comparisons, experimental results):
"table": {
  "headers": ["Column 1", "Column 2"],
  "rows": [["value1", "value2"], ["value3", "value4"]]
}

QUESTION QUALITY RULES:
- Questions must be clear and exam-level
- Avoid vague or trivial questions
- Ensure logical progression (easy → hard)
- Use real-world context for problem solving
- Harder questions = higher marks

CALCULATION QUESTIONS must include:
- Clear numerical data
- correctAnswer with units
- workingSteps showing formula, substitution, calculation

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "sections": [
    {
      "title": "Section A",
      "instructions": "Section instructions",
      "totalMarks": 0,
      "questions": [
        {
          "number": "1",
          "type": "group",
          "question": "Main question prompt",
          "diagram": null,
          "table": null,
          "subQuestions": [
            {
              "number": "a",
              "type": "mcq",
              "question": "Sub question text",
              "options": ["A", "B", "C", "D"],
              "correctAnswer": "A",
              "explanation": "Why",
              "marks": 1
            },
            {
              "number": "b",
              "type": "diagram_labeling",
              "question": "Study the diagram and identify labeled parts A–F.",
              "diagram": {
                "type": "generated",
                "description": "Cross-section of the human heart showing the four chambers, major vessels and septum",
                "labels": ["A","B","C","D","E","F"],
                "colorful": true
              },
              "answer_key": {"A":"Right atrium","B":"Left atrium","C":"Right ventricle","D":"Left ventricle","E":"Aorta","F":"Septum"},
              "marks": 6
            }
          ]
        }
      ]
    }
  ]
}

VALIDATION before returning:
- Ensure proper hierarchy (Q → a → i)
- ${includeDiagrams ? 'Include at least one diagram_labeling question if the topic supports it (biology, physics, chemistry, geography, geometry)' : 'No diagrams'}
- Ensure all requested question types are represented
- Ensure total marks match what's requested
- Return ONLY valid JSON, no markdown, no explanations`;

    const sectionPrompts = examFormat.sections.map((section, idx) => {
      const typeDescMap: Record<string, string> = {
        mcq: 'Multiple choice questions with 4 options',
        true_false: 'True or False questions',
        short_answer: 'Short answer questions (1-2 sentences)',
        long_answer: 'Long answer/essay questions (paragraph)',
        fill_blank: 'Fill in the blank questions (use ___ for blank)',
        calculation: 'Calculation questions with working steps',
        critical_thinking: 'Critical thinking / scenario-based questions',
        problem_solving: 'Multi-step problem solving questions',
        diagram_labeling: 'Diagram labeling questions (A-F markers, students name each part)',
        mixed: 'A mix of all question types (mcq, true_false, fill_blank, short_answer, long_answer, calculation, critical_thinking, problem_solving' + (includeDiagrams ? ', diagram_labeling' : '') + ')',
      };
      const typeDesc = typeDescMap[section.questionType] || section.questionType;
      return `Section ${idx + 1}: "${section.title}"
- Type: ${typeDesc}
- Number of questions: ${section.questionCount}
- Marks per question: ${section.marksPerQuestion}
${section.instructions ? `- Instructions: ${section.instructions}` : ''}`;
    }).join('\n\n');

    const totalMarks = examFormat.sections.reduce((s, sec) => s + sec.questionCount * sec.marksPerQuestion, 0);

    const userPrompt = `Create an exam for:
Subject: ${examFormat.subject}
Topic: ${examFormat.topic}
Difficulty: ${examFormat.difficulty}
Total Marks: ${totalMarks}
${examFormat.generalInstructions ? `General Instructions: ${examFormat.generalInstructions}` : ''}

${sectionPrompts}

Use hierarchical question structure (groups with sub-questions a, b, c, i, ii) where appropriate.
${includeDiagrams ? 'Include diagrams (with proper "diagram" objects) where they enhance question quality.' : 'Do NOT include any diagrams.'}
Include tables where they enhance question quality.
Generate exactly the specified number of questions for each section.
Ensure academic accuracy, appropriate difficulty, and logical progression from easy to hard.
Return ONLY the JSON object.`;

    const response = await fetch(LOVABLE_AI_URL, {
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
        max_tokens: 16000,
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
    if (!content) throw new Error("No content received from AI");

    let examData;
    try {
      let cleanText = content.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      const start = cleanText.indexOf("{");
      const end = cleanText.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        examData = JSON.parse(cleanText.slice(start, end + 1));
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content.substring(0, 500));
      throw new Error("Failed to parse exam data from AI response");
    }

    // Render diagram images in parallel and attach to the tree
    if (includeDiagrams) {
      await attachDiagramImages(examData, colorful, LOVABLE_API_KEY);
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
