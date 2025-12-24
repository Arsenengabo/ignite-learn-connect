import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, XCircle, Clock, Award, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateResultsPDF } from "@/utils/examPdfGenerator";

interface ExamResultsProps {
  attemptId: string;
  onBack: () => void;
}

interface Response {
  id: string;
  question_id: string;
  answer: string;
  is_correct: boolean | null;
  marks_awarded: number;
  feedback: string;
  is_evaluated: boolean;
  question: {
    question_text: string;
    question_type: string;
    options: string[] | null;
    correct_answer: string;
    explanation: string;
    marks: number;
  };
}

export default function ExamResults({ attemptId, onBack }: ExamResultsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<{
    id: string;
    total_score: number;
    max_score: number;
    percentage: number;
    status: string;
    started_at: string;
    submitted_at: string;
    exam: {
      id: string;
      title: string;
      subject: string;
    };
  } | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      // Fetch attempt with exam details
      const { data: attemptData, error: attemptError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          exam:exams(id, title, subject)
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;
      setAttempt(attemptData);

      // Fetch responses with questions
      const { data: responsesData, error: responsesError } = await supabase
        .from('exam_responses')
        .select(`
          *,
          question:exam_questions(
            question_text,
            question_type,
            options,
            correct_answer,
            explanation,
            marks
          )
        `)
        .eq('attempt_id', attemptId);

      if (responsesError) throw responsesError;
      setResponses((responsesData || []).map(r => ({
        ...r,
        question: {
          ...r.question,
          options: Array.isArray(r.question.options) ? r.question.options : null
        }
      })) as Response[]);

    } catch (error) {
      console.error("Error loading results:", error);
      toast({
        title: "Error",
        description: "Failed to load results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!attempt) return;
    
    generateResultsPDF({
      examTitle: attempt.exam.title,
      subject: attempt.exam.subject,
      totalScore: attempt.total_score,
      maxScore: attempt.max_score,
      percentage: attempt.percentage,
      submittedAt: attempt.submitted_at,
      responses
    });

    toast({
      title: "PDF Downloaded",
      description: "Results have been exported as PDF."
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-warning";
    return "text-destructive";
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "F";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p>Results not found.</p>
          <Button onClick={onBack} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  const correctCount = responses.filter(r => r.is_correct === true).length;
  const incorrectCount = responses.filter(r => r.is_correct === false).length;
  const pendingCount = responses.filter(r => r.is_correct === null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Score Summary */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{attempt.exam.title}</CardTitle>
          <p className="text-muted-foreground">{attempt.exam.subject}</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <div className={cn(
              "text-6xl font-bold mb-2",
              getScoreColor(attempt.percentage)
            )}>
              {getGrade(attempt.percentage)}
            </div>
            <div className="text-2xl font-semibold">
              {attempt.total_score} / {attempt.max_score}
            </div>
            <div className={cn(
              "text-lg",
              getScoreColor(attempt.percentage)
            )}>
              {Math.round(attempt.percentage)}%
            </div>
          </div>

          <Progress 
            value={attempt.percentage} 
            className="h-3 mb-6"
          />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-success/10 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-success" />
              <div className="text-2xl font-bold text-success">{correctCount}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-destructive" />
              <div className="text-2xl font-bold text-destructive">{incorrectCount}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="mt-4 p-4 bg-warning/10 rounded-lg text-center">
              <p className="text-sm text-warning">
                {pendingCount} subjective question(s) are pending evaluation by your teacher.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Review */}
      <Card>
        <CardHeader>
          <CardTitle>Question Review</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {responses.map((response, idx) => (
                <div 
                  key={response.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    response.is_correct === true && "border-success/30 bg-success/5",
                    response.is_correct === false && "border-destructive/30 bg-destructive/5",
                    response.is_correct === null && "border-muted bg-muted/20"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium">Question {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      {response.is_correct === true && (
                        <Badge className="bg-success/20 text-success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Correct
                        </Badge>
                      )}
                      {response.is_correct === false && (
                        <Badge className="bg-destructive/20 text-destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Incorrect
                        </Badge>
                      )}
                      {response.is_correct === null && (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {response.marks_awarded}/{response.question.marks}
                      </span>
                    </div>
                  </div>

                  <p className="mb-3">{response.question.question_text}</p>

                  {response.question.options && (
                    <div className="space-y-1 mb-3 ml-4">
                      {response.question.options.map((opt, optIdx) => (
                        <div 
                          key={optIdx}
                          className={cn(
                            "text-sm",
                            opt === response.question.correct_answer && "text-success font-medium",
                            opt === response.answer && opt !== response.question.correct_answer && "text-destructive line-through"
                          )}
                        >
                          {String.fromCharCode(65 + optIdx)}. {opt}
                          {opt === response.question.correct_answer && " ✓"}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-muted-foreground">Your answer: </span>
                      <span className={response.is_correct ? "text-success" : "text-foreground"}>
                        {response.answer || "(No answer)"}
                      </span>
                    </div>
                    
                    {response.is_correct === false && (
                      <div>
                        <span className="text-muted-foreground">Correct answer: </span>
                        <span className="text-success">{response.question.correct_answer}</span>
                      </div>
                    )}

                    {response.question.explanation && (
                      <div className="mt-2 p-2 bg-muted/50 rounded">
                        <span className="font-medium">Explanation: </span>
                        {response.question.explanation}
                      </div>
                    )}

                    {response.feedback && (
                      <div className="mt-2 p-2 bg-primary/10 rounded">
                        <span className="font-medium">Teacher Feedback: </span>
                        {response.feedback}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
