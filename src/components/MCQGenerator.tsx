import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, CheckCircle2, XCircle, Sparkles, RotateCcw, ChevronRight, Trophy, AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

const sanitizeOptionText = (raw: string) =>
  raw
    .replace(/^[A-D]\s*[\)\.\:\-]\s*/i, "")
    .replace(/\s*[✓✔]\s*/g, " ")
    .replace(/\s*\((?:correct|answer|ans)\)\s*/gi, " ")
    .replace(/\bcorrect\s*answer\b\s*[:\-].*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

interface MCQ {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface MCQData {
  subject: string;
  topic: string;
  mcqs: MCQ[];
}

type QuizMode = "practice" | "exam";

export const MCQGenerator = () => {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [mcqData, setMcqData] = useState<MCQData | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [mode, setMode] = useState<QuizMode>("practice");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { toast } = useToast();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !topic) {
      toast({
        title: "Missing Information",
        description: "Please enter both subject and topic",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setMcqData(null);
    setAnswers({});
    setShowResults(false);
    setCurrentQuestionIndex(0);

    try {
      const { data, error } = await supabase.functions.invoke("generate-mcqs", {
        body: { subject, topic, count: 10 },
      });

      if (error) throw error;

      setMcqData(data);
      toast({
        title: "MCQs Generated! 🎯",
        description: `10 questions ready in ${mode === "exam" ? "Exam" : "Practice"} mode`,
      });
    } catch (error: any) {
      console.error("Error generating MCQs:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate MCQs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers({ ...answers, [questionIndex]: optionIndex });
  };

  const handleNextQuestion = () => {
    if (!mcqData) return;
    if (currentQuestionIndex < mcqData.mcqs.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
    const score = calculateScore();
    toast({
      title: `Quiz Complete! 🎉`,
      description: `You scored ${score}/${mcqData?.mcqs.length || 0}`,
    });
  };

  const calculateScore = () => {
    if (!mcqData) return 0;
    return mcqData.mcqs.reduce((score, mcq, index) => {
      return answers[index] === mcq.correctAnswer ? score + 1 : score;
    }, 0);
  };

  const handleReset = () => {
    setMcqData(null);
    setAnswers({});
    setShowResults(false);
    setSubject("");
    setTopic("");
    setCurrentQuestionIndex(0);
  };

  // Render results screen (shared by both modes)
  const renderResults = () => {
    if (!mcqData) return null;
    const score = calculateScore();
    const percentage = Math.round((score / mcqData.mcqs.length) * 100);

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Results</h2>
              <p className="text-sm text-muted-foreground">
                {mcqData.subject} - {mcqData.topic}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            New Quiz
          </Button>
        </div>

        <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="space-y-2">
            <p className="text-lg font-medium text-muted-foreground">Your Score</p>
            <p className="text-5xl font-bold text-primary">
              {score}/{mcqData.mcqs.length}
            </p>
            <p className="text-2xl font-semibold text-muted-foreground">{percentage}%</p>
            <p className="text-lg text-muted-foreground">
              {percentage === 100
                ? "Perfect! Outstanding work! 🌟"
                : percentage >= 70
                ? "Great job! Keep it up! 💪"
                : "Keep practicing! You'll get there! 📚"}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Review Your Answers</h3>
          {mcqData.mcqs.map((mcq, qIndex) => {
            const isCorrect = answers[qIndex] === mcq.correctAnswer;
            return (
              <Card key={qIndex} className="p-4">
                <div className="flex gap-3 mb-3">
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isCorrect
                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                    }`}
                  >
                    {qIndex + 1}
                  </div>
                  <p className="font-medium text-foreground text-sm">{mcq.question}</p>
                </div>

                <div className="ml-10 space-y-2">
                  {mcq.options.map((option, oIndex) => {
                    const isThisCorrect = mcq.correctAnswer === oIndex;
                    const isThisSelected = answers[qIndex] === oIndex;
                    const displayOption = sanitizeOptionText(option);

                    return (
                      <div
                        key={oIndex}
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          isThisCorrect
                            ? "bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800"
                            : isThisSelected
                            ? "bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800"
                            : "bg-muted/30"
                        }`}
                      >
                        <span className="flex-1">{displayOption}</span>
                        {isThisCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {isThisSelected && !isThisCorrect && <XCircle className="h-4 w-4 text-red-600" />}
                      </div>
                    );
                  })}
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-foreground mb-1">💡 Explanation:</p>
                    <p className="text-xs text-muted-foreground">{mcq.explanation}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // Exam mode: one question at a time, no backtracking
  const renderExamMode = () => {
    if (!mcqData) return null;
    const mcq = mcqData.mcqs[currentQuestionIndex];
    const totalQuestions = mcqData.mcqs.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
    const hasAnsweredCurrent = answers[currentQuestionIndex] !== undefined;

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {mcqData.subject} - {mcqData.topic}
              </h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Exam Mode - No going back
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <Card className="p-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {currentQuestionIndex + 1}
            </div>
            <p className="font-medium text-foreground text-lg pt-1">{mcq.question}</p>
          </div>

          <RadioGroup
            value={answers[currentQuestionIndex]?.toString()}
            onValueChange={(value) => handleAnswer(currentQuestionIndex, parseInt(value))}
            className="space-y-3"
          >
            {mcq.options.map((option, oIndex) => {
              const isSelected = answers[currentQuestionIndex] === oIndex;
              const displayOption = sanitizeOptionText(option);

              return (
                <div
                  key={oIndex}
                  className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 border-primary/30"
                      : "bg-background border-border hover:bg-muted/50"
                  }`}
                  onClick={() => handleAnswer(currentQuestionIndex, oIndex)}
                >
                  <RadioGroupItem value={oIndex.toString()} id={`exam-q${currentQuestionIndex}-o${oIndex}`} />
                  <Label
                    htmlFor={`exam-q${currentQuestionIndex}-o${oIndex}`}
                    className="flex-1 cursor-pointer text-base"
                  >
                    {displayOption}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </Card>

        {/* Navigation */}
        <div className="flex justify-end">
          {isLastQuestion ? (
            <Button size="lg" onClick={handleSubmit} disabled={!hasAnsweredCurrent} className="px-8">
              <Trophy className="h-4 w-4 mr-2" />
              Submit Exam
            </Button>
          ) : (
            <Button size="lg" onClick={handleNextQuestion} disabled={!hasAnsweredCurrent} className="px-8">
              Next Question
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Practice mode: all questions visible
  const renderPracticeMode = () => {
    if (!mcqData) return null;

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {mcqData.subject} - {mcqData.topic}
              </h2>
              <p className="text-sm text-muted-foreground">
                Answer all {mcqData.mcqs.length} questions to test your knowledge
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            New Quiz
          </Button>
        </div>

        <div className="space-y-6">
          {mcqData.mcqs.map((mcq, qIndex) => (
            <Card key={qIndex} className="p-6">
              <div className="flex gap-4 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {qIndex + 1}
                </div>
                <p className="font-medium text-foreground pt-1">{mcq.question}</p>
              </div>

              <RadioGroup
                value={answers[qIndex]?.toString()}
                onValueChange={(value) => handleAnswer(qIndex, parseInt(value))}
                className="space-y-3 ml-12"
              >
                {mcq.options.map((option, oIndex) => {
                  const isSelected = answers[qIndex] === oIndex;
                  const displayOption = sanitizeOptionText(option);

                  return (
                    <div
                      key={oIndex}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? "bg-primary/5 border-primary/20"
                          : "bg-background border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                      <Label htmlFor={`q${qIndex}-o${oIndex}`} className="flex-1 cursor-pointer">
                        {displayOption}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== mcqData.mcqs.length}
            className="px-8"
          >
            Submit Answers
          </Button>
        </div>
      </div>
    );
  };

  // Main quiz view
  if (mcqData) {
    if (showResults) {
      return renderResults();
    }
    return mode === "exam" ? renderExamMode() : renderPracticeMode();
  }

  // Initial form
  return (
    <Card className="max-w-md mx-auto p-8">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-primary/10 rounded-full mb-4">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">MCQ Practice</h2>
        <p className="text-muted-foreground mt-2">Test your knowledge with AI-generated questions</p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Mathematics, Physics, Biology"
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Quadratic Equations, Newton's Laws"
            className="mt-2"
          />
        </div>

        {/* Mode toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="space-y-0.5">
            <Label htmlFor="exam-mode" className="text-base font-medium">
              Exam Mode
            </Label>
            <p className="text-xs text-muted-foreground">One question at a time, no backtracking</p>
          </div>
          <Switch
            id="exam-mode"
            checked={mode === "exam"}
            onCheckedChange={(checked) => setMode(checked ? "exam" : "practice")}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
              Generating Questions...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate 10 MCQs
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};
