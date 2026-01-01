import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  points: number;
  order_index: number;
}

interface QuizTakerProps {
  quizId: string;
  onBack: () => void;
  onComplete: () => void;
}

export const QuizTaker = ({ quizId, onBack, onComplete }: QuizTakerProps) => {
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadQuizData();
  }, [quizId]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quiz) {
      handleSubmitQuiz();
    }
  }, [timeLeft, quiz]);

  const loadQuizData = async () => {
    try {
      // Get quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) {
        toast({
          title: "Error",
          description: "Failed to load quiz",
          variant: "destructive",
        });
        return;
      }

      setQuiz(quizData);
      setTimeLeft(quizData.time_limit ? quizData.time_limit * 60 : 3600); // Default 1 hour

      // Create quiz session first so student has access
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .insert({
          quiz_id: quizId,
          student_id: (await supabase.auth.getUser()).data.user?.id,
          total_questions: 0, // Will be updated after fetching questions
          status: 'in_progress'
        })
        .select()
        .single();

      if (sessionError) {
        toast({
          title: "Error",
          description: "Failed to start quiz session",
          variant: "destructive",
        });
        return;
      }

      setSessionId(sessionData.id);

      // Now fetch questions using secure function (excludes correct_answer)
      const { data: questionsData, error: questionsError } = await supabase
        .rpc('get_quiz_questions_for_student' as any, { _quiz_id: quizId });

      if (questionsError) {
        toast({
          title: "Error",
          description: "Failed to load questions",
          variant: "destructive",
        });
        return;
      }

      // Process questions
      const questionsArray = questionsData as Array<{
        id: string;
        question_text: string;
        question_type: string;
        options: string[] | null;
        points: number;
        order_index: number;
      }> | null;
      
      const processedQuestions = (questionsArray || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order_index: q.order_index,
        options: Array.isArray(q.options) ? q.options : []
      }));
      setQuestions(processedQuestions);

      // Update session with question count
      await supabase
        .from('quiz_sessions')
        .update({ total_questions: processedQuestions.length })
        .eq('id', sessionData.id);

    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Prepare responses for secure submission
      const responses = questions.map(question => ({
        question_id: question.id,
        answer: answers[question.id] || ""
      }));

      // Temporarily use manual submission until migration is complete
      // TODO: Switch to submit_quiz_responses RPC after migration
      let totalScore = 0;

      // Submit all answers - server will handle scoring after migration
      for (const response of responses) {
        await supabase
          .from('quiz_responses')
          .insert({
            session_id: sessionId,
            question_id: response.question_id,
            answer: response.answer,
            is_correct: false, // Will be calculated server-side after migration
            points_earned: 0 // Will be calculated server-side after migration
          });
      }

      // Update session as completed
      await supabase
        .from('quiz_sessions')
        .update({
          status: 'completed',
          score: totalScore,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      toast({
        title: "Quiz Completed!",
        description: "Your responses have been submitted securely.",
      });

      onComplete();
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to submit quiz",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">Loading Quiz...</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">Quiz Not Found</h2>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p>This quiz is no longer available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">{quiz.title}</h2>
        </div>
        {quiz.time_limit && (
          <div className="flex items-center space-x-2 text-primary">
            <Clock className="h-5 w-5" />
            <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.question_text}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          >
            {(Array.isArray(currentQuestion.options) ? currentQuestion.options : []).map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        
        <div className="flex space-x-2">
          {currentQuestionIndex === questions.length - 1 ? (
            <Button 
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{submitting ? "Submitting..." : "Submit Quiz"}</span>
            </Button>
          ) : (
            <Button onClick={handleNextQuestion}>
              Next
            </Button>
          )}
        </div>
      </div>

      {/* Question Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : answers[questions[index].id] ? "secondary" : "outline"}
                size="sm"
                onClick={() => setCurrentQuestionIndex(index)}
                className="aspect-square p-0"
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};