import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, CheckCircle2, XCircle, Sparkles, RotateCcw } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

export const MCQGenerator = () => {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [mcqData, setMcqData] = useState<MCQData | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
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

    try {
      const { data, error } = await supabase.functions.invoke("generate-mcqs", {
        body: { subject, topic, count: 10 },
      });

      if (error) throw error;

      setMcqData(data);
      toast({
        title: "MCQs Generated! 🎯",
        description: "10 questions ready to test your knowledge",
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
  };

  if (mcqData) {
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
                disabled={showResults}
                className="space-y-3 ml-12"
              >
                {mcq.options.map((option, oIndex) => {
                  const isCorrect = mcq.correctAnswer === oIndex;
                  const isSelected = answers[qIndex] === oIndex;
                  const showFeedback = showResults && (isSelected || isCorrect);

                  return (
                    <div
                      key={oIndex}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        showResults
                          ? isCorrect
                            ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                            : isSelected
                            ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                            : "bg-background border-border"
                          : isSelected
                          ? "bg-primary/5 border-primary/20"
                          : "bg-background border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                      <Label htmlFor={`q${qIndex}-o${oIndex}`} className="flex-1 cursor-pointer flex items-center gap-2">
                        {option}
                        {showFeedback && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {showFeedback && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-600" />}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>

              {showResults && (
                <div className="mt-4 ml-12 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-1">
                    💡 Explanation:
                  </p>
                  <p className="text-sm text-muted-foreground">{mcq.explanation}</p>
                </div>
              )}
            </Card>
          ))}
        </div>

        {!showResults ? (
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
        ) : (
          <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="space-y-2">
              <p className="text-lg font-medium text-muted-foreground">Your Score</p>
              <p className="text-5xl font-bold text-primary">
                {calculateScore()}/{mcqData.mcqs.length}
              </p>
              <p className="text-lg text-muted-foreground">
                {calculateScore() === mcqData.mcqs.length
                  ? "Perfect! Outstanding work! 🌟"
                  : calculateScore() >= mcqData.mcqs.length * 0.7
                  ? "Great job! Keep it up! 💪"
                  : "Keep practicing! You'll get there! 📚"}
              </p>
            </div>
          </Card>
        )}
      </div>
    );
  }

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
