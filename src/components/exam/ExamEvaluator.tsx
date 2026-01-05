import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, CheckCircle, Clock, User, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import AIEvaluationReview from "./AIEvaluationReview";

interface GrammarAnalysis {
  originalText: string;
  correctedText: string;
  errors: Array<{ type: 'spelling' | 'grammar' | 'punctuation'; original: string; correction: string }>;
  grammarScore: number;
}

interface Attempt {
  id: string;
  student_id: string;
  status: string;
  total_score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Response {
  id: string;
  question_id: string;
  answer: string;
  is_correct: boolean | null;
  marks_awarded: number;
  feedback: string;
  is_evaluated: boolean;
  grammar_corrections: GrammarAnalysis | null;
  key_points_covered: string[] | null;
  key_points_missing: string[] | null;
  semantic_score: number | null;
  corrected_answer: string | null;
  question: {
    question_text: string;
    question_type: string;
    options: unknown;
    correct_answer: string;
    marks: number;
    sample_answer: string | null;
    key_points: string[] | null;
    evaluation_guidelines: string | null;
  };
}

interface ExamEvaluatorProps {
  examId: string;
  onBack: () => void;
}

export default function ExamEvaluator({ examId, onBack }: ExamEvaluatorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiEvaluating, setAiEvaluating] = useState(false);
  
  const [exam, setExam] = useState<{ id: string; title: string; total_marks: number } | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [grades, setGrades] = useState<Record<string, { marks: number; feedback: string }>>({});

  useEffect(() => {
    loadExamData();
  }, [examId]);

  const loadExamData = async () => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id, title, total_marks')
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      setExam(examData);

      const { data: attemptsData, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .in('status', ['submitted', 'evaluated'])
        .order('submitted_at', { ascending: false });

      if (attemptsError) throw attemptsError;
      setAttempts(attemptsData || []);

    } catch (error) {
      console.error("Error loading exam data:", error);
      toast({
        title: "Error",
        description: "Failed to load exam data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAttemptResponses = async (attempt: Attempt) => {
    try {
      const { data, error } = await supabase
        .from('exam_responses')
        .select(`
          *,
          question:exam_questions(
            question_text,
            question_type,
            options,
            correct_answer,
            marks,
            sample_answer,
            key_points,
            evaluation_guidelines
          )
        `)
        .eq('attempt_id', attempt.id);

      if (error) throw error;
      
      const typedResponses = (data || []).map(r => ({
        ...r,
        grammar_corrections: r.grammar_corrections as unknown as GrammarAnalysis | null,
        key_points_covered: r.key_points_covered as string[] | null,
        key_points_missing: r.key_points_missing as string[] | null,
        question: {
          ...r.question,
          key_points: Array.isArray(r.question.key_points) ? r.question.key_points : null
        }
      })) as Response[];
      
      setResponses(typedResponses);
      
      const initialGrades: Record<string, { marks: number; feedback: string }> = {};
      data?.forEach(r => {
        initialGrades[r.id] = {
          marks: r.marks_awarded || 0,
          feedback: r.feedback || ""
        };
      });
      setGrades(initialGrades);
      setSelectedAttempt(attempt);

    } catch (error) {
      console.error("Error loading responses:", error);
      toast({
        title: "Error",
        description: "Failed to load student responses",
        variant: "destructive"
      });
    }
  };

  const runAIEvaluation = async () => {
    if (!selectedAttempt) return;
    
    setAiEvaluating(true);
    try {
      const subjectiveResponses = responses
        .filter(r => ['short_answer', 'long_answer'].includes(r.question.question_type))
        .map(r => ({
          questionId: r.question_id,
          studentAnswer: r.answer || "",
          correctAnswer: r.question.correct_answer,
          sampleAnswer: r.question.sample_answer,
          keyPoints: r.question.key_points,
          evaluationGuidelines: r.question.evaluation_guidelines,
          questionType: r.question.question_type,
          maxMarks: r.question.marks
        }));

      if (subjectiveResponses.length === 0) {
        toast({
          title: "No Subjective Questions",
          description: "There are no open-ended questions to evaluate with AI."
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('evaluate-subjective', {
        body: { attemptId: selectedAttempt.id, questions: subjectiveResponses }
      });

      if (error) throw error;

      toast({
        title: "AI Evaluation Complete",
        description: `Score: ${data.totalScore}/${data.maxScore}. Refresh to see detailed feedback.`
      });

      // Reload responses to get updated AI feedback
      await loadAttemptResponses(selectedAttempt);

    } catch (error) {
      console.error("AI evaluation error:", error);
      toast({
        title: "AI Evaluation Failed",
        description: "Could not complete AI evaluation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAiEvaluating(false);
    }
  };

  const saveGrades = async () => {
    if (!selectedAttempt) return;
    
    setSaving(true);
    try {
      let totalScore = 0;

      for (const response of responses) {
        const grade = grades[response.id];
        const marks = grade?.marks || 0;
        totalScore += marks;

        await supabase
          .from('exam_responses')
          .update({
            marks_awarded: marks,
            feedback: grade?.feedback || "",
            is_evaluated: true,
            is_correct: marks > 0
          })
          .eq('id', response.id);
      }

      await supabase
        .from('exam_attempts')
        .update({
          status: 'evaluated',
          total_score: totalScore,
          percentage: (totalScore / (exam?.total_marks || 1)) * 100
        })
        .eq('id', selectedAttempt.id);

      toast({
        title: "Grades Saved",
        description: `Total score: ${totalScore}/${exam?.total_marks}`
      });

      loadExamData();
      setSelectedAttempt(null);
      setResponses([]);

    } catch (error) {
      console.error("Error saving grades:", error);
      toast({
        title: "Error",
        description: "Failed to save grades",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateGrade = (responseId: string, field: 'marks' | 'feedback', value: number | string) => {
    setGrades(prev => ({
      ...prev,
      [responseId]: {
        ...prev[responseId],
        [field]: value
      }
    }));
  };

  const applyAIGrade = (responseId: string, response: Response) => {
    if (response.marks_awarded !== undefined) {
      setGrades(prev => ({
        ...prev,
        [responseId]: {
          marks: response.marks_awarded,
          feedback: response.feedback || prev[responseId]?.feedback || ""
        }
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (selectedAttempt) {
    const hasSubjective = responses.some(r => ['short_answer', 'long_answer'].includes(r.question.question_type));
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setSelectedAttempt(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
          <div className="flex gap-2">
            {hasSubjective && (
              <Button 
                variant="outline" 
                onClick={runAIEvaluation} 
                disabled={aiEvaluating}
              >
                {aiEvaluating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {aiEvaluating ? "Evaluating..." : "Run AI Evaluation"}
              </Button>
            )}
            <Button onClick={saveGrades} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Grades"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Evaluating Submission</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span>Submitted: {new Date(selectedAttempt.submitted_at).toLocaleString()}</span>
              <span>Current Score: {selectedAttempt.total_score}/{exam?.total_marks}</span>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {responses.map((response, idx) => {
                  const isSubjective = ['short_answer', 'long_answer'].includes(response.question.question_type);
                  const grade = grades[response.id] || { marks: 0, feedback: "" };
                  const hasAIAnalysis = response.semantic_score !== null;
                  
                  return (
                    <div 
                      key={response.id}
                      className={cn(
                        "p-4 rounded-lg border",
                        response.is_evaluated && !isSubjective && "bg-muted/20"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium">Question {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {response.question.question_type.replace('_', ' ')}
                          </Badge>
                          {hasAIAnalysis && (
                            <Badge className="bg-primary/20 text-primary">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Graded
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="mb-3">{response.question.question_text}</p>

                      <div className="mb-4 p-3 bg-muted/30 rounded">
                        <Label className="text-sm text-muted-foreground">Student's Answer:</Label>
                        <p className="mt-1">{response.answer || "(No answer provided)"}</p>
                      </div>

                      {!isSubjective && (
                        <div className="mb-4 p-3 bg-success/10 rounded">
                          <Label className="text-sm text-muted-foreground">Correct Answer:</Label>
                          <p className="mt-1 text-success">{response.question.correct_answer}</p>
                        </div>
                      )}

                      {/* AI Analysis Section for Subjective Questions */}
                      {isSubjective && hasAIAnalysis && (
                        <div className="mb-4">
                          <AIEvaluationReview
                            studentAnswer={response.answer}
                            correctAnswer={response.question.correct_answer}
                            feedback={response.feedback}
                            marksAwarded={response.marks_awarded}
                            maxMarks={response.question.marks}
                            grammarAnalysis={response.grammar_corrections}
                            keyPointsCovered={response.key_points_covered || []}
                            keyPointsMissing={response.key_points_missing || []}
                            semanticScore={response.semantic_score || 0}
                            correctedAnswer={response.corrected_answer || undefined}
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => applyAIGrade(response.id, response)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Accept AI Grade
                          </Button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`marks-${response.id}`}>
                            Marks (max: {response.question.marks})
                          </Label>
                          <div className="flex items-center gap-3">
                            <Slider
                              value={[grade.marks]}
                              max={response.question.marks}
                              step={0.5}
                              onValueChange={(value) => updateGrade(response.id, 'marks', value[0])}
                              className="flex-1"
                            />
                            <Input
                              id={`marks-${response.id}`}
                              type="number"
                              min={0}
                              max={response.question.marks}
                              value={grade.marks}
                              onChange={(e) => updateGrade(
                                response.id, 
                                'marks', 
                                Math.min(response.question.marks, Math.max(0, parseFloat(e.target.value) || 0))
                              )}
                              className="w-20"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`feedback-${response.id}`}>Feedback</Label>
                          <Textarea
                            id={`feedback-${response.id}`}
                            value={grade.feedback}
                            onChange={(e) => updateGrade(response.id, 'feedback', e.target.value)}
                            placeholder="Provide feedback..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Evaluate Submissions: {exam?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attempts.map(attempt => (
                <div 
                  key={attempt.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors flex-wrap gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Student Submission</p>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {new Date(attempt.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {attempt.total_score}/{attempt.max_score}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(attempt.percentage)}%
                      </p>
                    </div>
                    
                    <Badge className={
                      attempt.status === 'evaluated' 
                        ? 'bg-success/20 text-success' 
                        : 'bg-warning/20 text-warning'
                    }>
                      {attempt.status === 'evaluated' ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Evaluated
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>

                    <Button
                      variant="outline"
                      onClick={() => loadAttemptResponses(attempt)}
                    >
                      {attempt.status === 'evaluated' ? 'Review' : 'Evaluate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
