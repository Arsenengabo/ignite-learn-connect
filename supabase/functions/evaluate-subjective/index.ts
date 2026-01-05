import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionGradingData {
  questionId: string;
  studentAnswer: string;
  correctAnswer: string | null;
  sampleAnswer: string | null;
  keyPoints: string[] | null;
  evaluationGuidelines: string | null;
  questionType: string;
  maxMarks: number;
}

interface GrammarError {
  type: 'spelling' | 'grammar' | 'punctuation';
  original: string;
  correction: string;
  position?: number;
}

interface GrammarAnalysis {
  originalText: string;
  correctedText: string;
  errors: GrammarError[];
  grammarScore: number;
}

interface EnhancedGradingResult {
  questionId: string;
  marksAwarded: number;
  feedback: string;
  isCorrect: boolean;
  grammarAnalysis: GrammarAnalysis | null;
  keyPointsCovered: string[];
  keyPointsMissing: string[];
  semanticScore: number;
  correctedAnswer: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { attemptId, questions } = await req.json() as {
      attemptId: string;
      questions: QuestionGradingData[];
    };

    if (!attemptId || !questions || questions.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing attemptId or questions' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Evaluating ${questions.length} subjective questions for attempt ${attemptId} with enhanced NLP`);

    const results: EnhancedGradingResult[] = [];

    for (const q of questions) {
      if (!q.studentAnswer || q.studentAnswer.trim() === '') {
        results.push({
          questionId: q.questionId,
          marksAwarded: 0,
          feedback: 'No answer provided.',
          isCorrect: false,
          grammarAnalysis: null,
          keyPointsCovered: [],
          keyPointsMissing: q.keyPoints || [],
          semanticScore: 0,
          correctedAnswer: null,
        });
        continue;
      }

      const systemPrompt = `You are an expert academic evaluator with advanced NLP capabilities for grammar analysis and semantic understanding.

EVALUATION CRITERIA:
1. SEMANTIC ANALYSIS: Compare the meaning and intent of the student's answer with the expected answer. Focus on conceptual understanding, not exact wording.
2. GRAMMAR & SPELLING CHECK: Identify all spelling mistakes, grammatical errors, and punctuation issues. Provide corrections.
3. KEY POINTS COVERAGE: Check which required concepts/key points were addressed and which were missed.
4. PARTIAL MARKS: Award proportional marks based on coverage of key points and accuracy.
5. CONSTRUCTIVE FEEDBACK: Provide helpful feedback that guides improvement.

RESPONSE FORMAT (JSON only, no markdown):
{
  "marksAwarded": <number between 0 and ${q.maxMarks}>,
  "feedback": "<constructive feedback explaining the grade, max 100 words>",
  "isCorrect": <true if awarded 80%+ of marks>,
  "grammarAnalysis": {
    "originalText": "<first 200 chars of student's original text>",
    "correctedText": "<grammar-corrected version of the text>",
    "errors": [
      {"type": "spelling", "original": "<misspelled word>", "correction": "<correct spelling>"},
      {"type": "grammar", "original": "<grammatical error>", "correction": "<corrected form>"},
      {"type": "punctuation", "original": "<punctuation error>", "correction": "<corrected form>"}
    ],
    "grammarScore": <0-100 score for grammar quality>
  },
  "keyPointsCovered": ["<key point 1 that was addressed>", "<key point 2>"],
  "keyPointsMissing": ["<key point that was missed>"],
  "semanticScore": <0-100 semantic similarity score>
}`;

      let userPrompt = `QUESTION TYPE: ${q.questionType}
MAX MARKS: ${q.maxMarks}

STUDENT'S ANSWER:
"${q.studentAnswer}"

`;

      if (q.sampleAnswer) {
        userPrompt += `EXPECTED/SAMPLE ANSWER:
"${q.sampleAnswer}"

`;
      }

      if (q.keyPoints && q.keyPoints.length > 0) {
        userPrompt += `KEY POINTS TO CHECK (each point should contribute to the score):
${q.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

`;
      }

      if (q.evaluationGuidelines) {
        userPrompt += `EVALUATION GUIDELINES:
${q.evaluationGuidelines}

`;
      }

      userPrompt += `Evaluate the student's answer thoroughly including grammar analysis and semantic understanding. Return only valid JSON.`;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI evaluation failed for question ${q.questionId}:`, errorText);
          
          results.push({
            questionId: q.questionId,
            marksAwarded: 0,
            feedback: 'Could not evaluate answer automatically. Will require manual review.',
            isCorrect: false,
            grammarAnalysis: null,
            keyPointsCovered: [],
            keyPointsMissing: q.keyPoints || [],
            semanticScore: 0,
            correctedAnswer: null,
          });
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';

        let gradingResult: any;
        try {
          let cleanContent = content.trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.slice(7);
          }
          if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.slice(3);
          }
          if (cleanContent.endsWith('```')) {
            cleanContent = cleanContent.slice(0, -3);
          }
          
          gradingResult = JSON.parse(cleanContent.trim());
        } catch (parseError) {
          console.error('Failed to parse AI grading response:', content);
          results.push({
            questionId: q.questionId,
            marksAwarded: 0,
            feedback: 'Evaluation parsing failed. Requires manual review.',
            isCorrect: false,
            grammarAnalysis: null,
            keyPointsCovered: [],
            keyPointsMissing: q.keyPoints || [],
            semanticScore: 0,
            correctedAnswer: null,
          });
          continue;
        }

        const marksAwarded = Math.min(Math.max(0, gradingResult.marksAwarded || 0), q.maxMarks);
        
        results.push({
          questionId: q.questionId,
          marksAwarded,
          feedback: gradingResult.feedback || 'Evaluated by AI.',
          isCorrect: gradingResult.isCorrect || marksAwarded >= q.maxMarks * 0.8,
          grammarAnalysis: gradingResult.grammarAnalysis || null,
          keyPointsCovered: gradingResult.keyPointsCovered || [],
          keyPointsMissing: gradingResult.keyPointsMissing || [],
          semanticScore: gradingResult.semanticScore || 0,
          correctedAnswer: gradingResult.grammarAnalysis?.correctedText || null,
        });

      } catch (aiError) {
        console.error(`Error calling AI for question ${q.questionId}:`, aiError);
        results.push({
          questionId: q.questionId,
          marksAwarded: 0,
          feedback: 'Evaluation error. Requires manual review.',
          isCorrect: false,
          grammarAnalysis: null,
          keyPointsCovered: [],
          keyPointsMissing: q.keyPoints || [],
          semanticScore: 0,
          correctedAnswer: null,
        });
      }
    }

    // Update exam_responses with enhanced AI grades
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    for (const result of results) {
      const { error: updateError } = await serviceClient
        .from('exam_responses')
        .update({
          marks_awarded: result.marksAwarded,
          feedback: result.feedback,
          is_correct: result.isCorrect,
          is_evaluated: true,
          grammar_corrections: result.grammarAnalysis,
          key_points_covered: result.keyPointsCovered,
          key_points_missing: result.keyPointsMissing,
          semantic_score: result.semanticScore,
          corrected_answer: result.correctedAnswer,
        })
        .eq('attempt_id', attemptId)
        .eq('question_id', result.questionId);

      if (updateError) {
        console.error(`Failed to update response for question ${result.questionId}:`, updateError);
      }
    }

    // Recalculate total score for the attempt
    const { data: allResponses } = await serviceClient
      .from('exam_responses')
      .select('marks_awarded')
      .eq('attempt_id', attemptId);

    const totalScore = allResponses?.reduce((sum, r) => sum + (r.marks_awarded || 0), 0) || 0;

    const { data: attemptData } = await serviceClient
      .from('exam_attempts')
      .select('max_score')
      .eq('id', attemptId)
      .single();

    const maxScore = attemptData?.max_score || 100;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    await serviceClient
      .from('exam_attempts')
      .update({
        total_score: totalScore,
        percentage,
        status: 'evaluated',
      })
      .eq('id', attemptId);

    console.log(`Enhanced evaluation complete. Total score: ${totalScore}/${maxScore}`);

    return new Response(JSON.stringify({
      success: true,
      results,
      totalScore,
      maxScore,
      percentage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Evaluate subjective error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
