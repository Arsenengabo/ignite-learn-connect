import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Clock, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, 
  Save, Send, Flag 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: unknown;
  marks: number;
  order_index: number;
  section_id: string;
}

interface Section {
  id: string;
  title: string;
  instructions: string;
  order_index: number;
}

interface ExamTakerProps {
  examId: string;
  onComplete: (attemptId: string, score: number) => void;
  onBack: () => void;
}

export default function ExamTaker({ examId, onComplete, onBack }: ExamTakerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [exam, setExam] = useState<{
    id: string;
    title: string;
    instructions: string;
    time_limit_minutes: number;
    total_marks: number;
  } | null>(null);
  
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string>("");
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load exam data
  useEffect(() => {
    const loadExam = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Fetch exam
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .single();

        if (examError) throw examError;
        setExam(examData);
        setTimeRemaining(examData.time_limit_minutes * 60);

        // Fetch sections
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('exam_sections')
          .select('*')
          .eq('exam_id', examId)
          .order('order_index');

        if (sectionsError) throw sectionsError;
        setSections(sectionsData || []);

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('exam_questions')
          .select('id, question_text, question_type, options, marks, order_index, section_id')
          .eq('exam_id', examId)
          .order('order_index');

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);

        // Create attempt
        const { data: attempt, error: attemptError } = await supabase
          .from('exam_attempts')
          .insert({
            exam_id: examId,
            student_id: user.id,
            time_remaining_seconds: examData.time_limit_minutes * 60,
            max_score: examData.total_marks
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(attempt.id);

      } catch (error) {
        console.error("Error loading exam:", error);
        toast({
          title: "Error",
          description: "Failed to load exam. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId, toast]);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const autoSave = setInterval(() => {
      saveProgress();
    }, 30000);

    return () => clearInterval(autoSave);
  }, [answers, attemptId]);

  const saveProgress = useCallback(async () => {
    if (!attemptId || Object.keys(answers).length === 0) return;

    try {
      // Update time remaining
      await supabase
        .from('exam_attempts')
        .update({ time_remaining_seconds: timeRemaining })
        .eq('id', attemptId);

      // Upsert responses
      const responses = Object.entries(answers).map(([questionId, answer]) => ({
        attempt_id: attemptId,
        question_id: questionId,
        answer
      }));

      for (const response of responses) {
        await supabase
          .from('exam_responses')
          .upsert(response, { onConflict: 'attempt_id,question_id' });
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  }, [attemptId, answers, timeRemaining]);

  const handleSubmit = async (autoSubmit = false) => {
    if (submitting) return;
    
    if (!autoSubmit) {
      const unanswered = questions.filter(q => !answers[q.id]).length;
      if (unanswered > 0) {
        const confirm = window.confirm(
          `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
        );
        if (!confirm) return;
      }
    }

    setSubmitting(true);
    try {
      // Save all responses
      let totalScore = 0;
      
      for (const question of questions) {
        const answer = answers[question.id] || "";
        
        // Get correct answer to auto-evaluate objective questions
        const { data: fullQuestion } = await supabase
          .from('exam_questions')
          .select('correct_answer')
          .eq('id', question.id)
          .single();

        const isObjective = ['mcq', 'true_false', 'fill_blank'].includes(question.question_type);
        const isCorrect = isObjective && fullQuestion 
          ? answer.toLowerCase().trim() === fullQuestion.correct_answer.toLowerCase().trim()
          : null;
        const marks = isCorrect ? question.marks : 0;
        
        if (isCorrect) totalScore += marks;

        await supabase
          .from('exam_responses')
          .upsert({
            attempt_id: attemptId,
            question_id: question.id,
            answer,
            is_correct: isCorrect,
            marks_awarded: marks,
            is_evaluated: isObjective
          }, { onConflict: 'attempt_id,question_id' });
      }

      // Update attempt
      const hasSubjective = questions.some(q => 
        ['short_answer', 'long_answer'].includes(q.question_type)
      );

      await supabase
        .from('exam_attempts')
        .update({
          status: hasSubjective ? 'submitted' : 'evaluated',
          submitted_at: new Date().toISOString(),
          total_score: totalScore,
          percentage: (totalScore / (exam?.total_marks || 1)) * 100
        })
        .eq('id', attemptId);

      toast({
        title: autoSubmit ? "Time's Up!" : "Exam Submitted",
        description: hasSubjective 
          ? "Your exam has been submitted. Subjective answers will be evaluated by the teacher."
          : `Your score: ${totalScore}/${exam?.total_marks}`
      });

      onComplete(attemptId, totalScore);
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: "Failed to submit exam. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFlag = (questionId: string) => {
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p>Exam not found or no questions available.</p>
          <Button onClick={onBack} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentSection = sections.find(s => s.id === currentQuestion?.section_id);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLowTime = timeRemaining < 300; // Less than 5 minutes

  return (
    <div className="space-y-4">
      {/* Header with timer */}
      <Card className={cn(
        "sticky top-0 z-10",
        isLowTime && "border-destructive bg-destructive/5"
      )}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">{exam.title}</h2>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              
              <div className={cn(
                "flex items-center gap-2 font-mono text-lg font-bold",
                isLowTime && "text-destructive animate-pulse"
              )}>
                <Clock className="h-5 w-5" />
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
          
          <Progress value={progress} className="mt-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          {currentSection && (
            <div className="text-sm text-primary font-medium mb-2">
              {currentSection.title}
            </div>
          )}
          <CardTitle className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-muted-foreground mr-2">Q{currentQuestionIndex + 1}.</span>
              {currentQuestion.question_text}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant={flagged.has(currentQuestion.id) ? "default" : "ghost"}
                size="sm"
                onClick={() => toggleFlag(currentQuestion.id)}
              >
                <Flag className={cn(
                  "h-4 w-4",
                  flagged.has(currentQuestion.id) && "fill-current"
                )} />
              </Button>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                [{currentQuestion.marks} mark{currentQuestion.marks > 1 ? 's' : ''}]
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: value
              }))}
            >
              {currentQuestion.options.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                    {String.fromCharCode(65 + idx)}. {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: value
              }))}
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer">True</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer">False</Label>
              </div>
            </RadioGroup>
          )}

          {currentQuestion.question_type === 'fill_blank' && (
            <Input
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: e.target.value
              }))}
              placeholder="Type your answer..."
              className="max-w-md"
            />
          )}

          {(currentQuestion.question_type === 'short_answer' || 
            currentQuestion.question_type === 'long_answer') && (
            <Textarea
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: e.target.value
              }))}
              placeholder="Type your answer..."
              rows={currentQuestion.question_type === 'long_answer' ? 8 : 4}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveProgress()}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          
          <Button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            variant="destructive"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Submitting..." : "Submit Exam"}
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(prev => 
            Math.min(questions.length - 1, prev + 1)
          )}
          disabled={currentQuestionIndex === questions.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Question Navigation Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Question Navigator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => (
              <Button
                key={q.id}
                variant={idx === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                className={cn(
                  "w-10 h-10",
                  answers[q.id] && idx !== currentQuestionIndex && "bg-success/20 border-success",
                  flagged.has(q.id) && "border-warning border-2"
                )}
                onClick={() => setCurrentQuestionIndex(idx)}
              >
                {idx + 1}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-success/20 border border-success rounded" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-warning rounded" />
              <span>Flagged</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded" />
              <span>Current</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
