cat > supabase/functions/evaluate-subjective/index.ts << 'ILCEOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { attemptId, questions: clientQuestions } = await req.json() as {
      attemptId: string;
      questions: { questionId: string }[];
    };

    if (!attemptId || !clientQuestions || clientQuestions.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing attemptId or questions' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const questionIds = clientQuestions.map(q => q.questionId).filter(Boolean);
    if (questionIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid questionIds provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: attempt, error: attemptError } = await callerClient
      .from('exam_attempts')
      .select('id, exam_id, max_score')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ error: 'Attempt not found or not yours' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: questionRows, error: qError } = await serviceClient
      .from('exam_questions')
      .select('id, question_type, correct_answer, explanation, sample_answer, key_points, evaluation_guidelines, marks, exam_id')
      .in('id', questionIds)
      .eq('exam_id', attempt.exam_id);

    if (qError || !questionRows || questionRows.length === 0) {
      return new Response(JSON.stringify({ error: 'Questions not found for this exam' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: responseRows, error: rError } = await callerClient
      .from('exam_responses')
      .select('question_id, answer')
      .eq('attempt_id', attemptId)
      .in('question_id', questionIds);

    if (rError || !responseRows) {
      return new Response(JSON.stringify({ error: 'Could not load responses' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const answerByQuestion = new Map(responseRows.map(r => [r.question_id, r.answer]));

    const results = [];

    for (const q of questionRows) {
      const studentAnswer = answerByQuestion.get(q.id) || '';
      const maxMarks = q.marks;

      if (!studentAnswer.trim()) {
        results.push({ questionId: q.id, marksAwarded: 0, feedback: 'No answer provided.', isCorrect: false });
        continue;
      }

      const systemPrompt = `You are an expert academic evaluator with advanced NLP capabilities for grammar analysis and semantic understanding.

EVALUATION CRITERIA:
1. SEMANTIC ANALYSIS: Compare meaning/intent of the student's answer with the expected answer.
2. GRAMMAR & SPELLING CHECK: Identify errors and provide corrections.
3. KEY POINTS COVERAGE: Check which required concepts were addressed.
4. PARTIAL MARKS: Award proportional marks based on coverage and accuracy.
5. CONSTRUCTIVE FEEDBACK.

RESPONSE FORMAT (JSON only, no markdown):
{
  "marksAwarded": <number between 0 and ${maxMarks}>,
  "feedback": "<constructive feedback, max 100 words>",
  "isCorrect": <true if 80%+ of marks>,
  "grammarAnalysis": {"originalText": "...", "correctedText": "...", "errors": [], "grammarScore": <0-100>},
  "keyPointsCovered": ["..."],
  "keyPointsMissing": ["..."],
  "semanticScore": <0-100>
}`;

      let userPrompt = `QUESTION TYPE: ${q.question_type}\nMAX MARKS: ${maxMarks}\n\nSTUDENT'S ANSWER:\n"${studentAnswer}"\n\n`;
      if (q.sample_answer) userPrompt += `EXPECTED/SAMPLE ANSWER:\n"${q.sample_answer}"\n\n`;
      if (q.key_points?.length) userPrompt += `KEY POINTS:\n${q.key_points.map((kp: string, i: number) => `${i + 1}. ${kp}`).join('\n')}\n\n`;
      if (q.evaluation_guidelines) userPrompt += `EVALUATION GUIDELINES:\n${q.evaluation_guidelines}\n\n`;
      userPrompt += `Evaluate thoroughly. Return only valid JSON.`;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          }),
        });

        if (!aiResponse.ok) {
          results.push({ questionId: q.id, marksAwarded: 0, feedback: 'Could not evaluate automatically. Needs manual review.', isCorrect: false });
          continue;
        }

        const aiData = await aiResponse.json();
        let content = (aiData.choices?.[0]?.message?.content || '').trim();
        content = content.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

        const gradingResult = JSON.parse(content);
        const marksAwarded = Math.min(Math.max(0, gradingResult.marksAwarded || 0), maxMarks);

        results.push({
          questionId: q.id,
          marksAwarded,
          feedback: gradingResult.feedback || 'Evaluated by AI.',
          isCorrect: gradingResult.isCorrect || marksAwarded >= maxMarks * 0.8,
          grammarAnalysis: gradingResult.grammarAnalysis || null,
          keyPointsCovered: gradingResult.keyPointsCovered || [],
          keyPointsMissing: gradingResult.keyPointsMissing || [],
          semanticScore: gradingResult.semanticScore || 0,
          correctedAnswer: gradingResult.grammarAnalysis?.correctedText || null,
        });
      } catch {
        results.push({ questionId: q.id, marksAwarded: 0, feedback: 'Evaluation error. Needs manual review.', isCorrect: false });
      }
    }

    for (const result of results) {
      await serviceClient.from('exam_responses').update({
        marks_awarded: result.marksAwarded,
        feedback: result.feedback,
        is_correct: result.isCorrect,
        is_evaluated: true,
        grammar_corrections: (result as any).grammarAnalysis ?? null,
        key_points_covered: (result as any).keyPointsCovered ?? [],
        key_points_missing: (result as any).keyPointsMissing ?? [],
        semantic_score: (result as any).semanticScore ?? 0,
        corrected_answer: (result as any).correctedAnswer ?? null,
      }).eq('attempt_id', attemptId).eq('question_id', result.questionId);
    }

    const { data: allResponses } = await serviceClient
      .from('exam_responses').select('marks_awarded').eq('attempt_id', attemptId);
    const totalScore = allResponses?.reduce((sum, r) => sum + (r.marks_awarded || 0), 0) || 0;
    const maxScore = attempt.max_score || 100;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    await serviceClient.from('exam_attempts').update({
      total_score: totalScore, percentage, status: 'evaluated',
    }).eq('id', attemptId);

    return new Response(JSON.stringify({ success: true, results, totalScore, maxScore, percentage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Evaluate subjective error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
ILCEOF