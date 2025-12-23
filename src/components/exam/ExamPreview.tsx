import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Clock, BookOpen } from "lucide-react";

interface Question {
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  marks: number;
}

interface Section {
  title: string;
  instructions: string;
  questions: Question[];
}

interface ExamPreviewProps {
  title: string;
  subject: string;
  topic: string;
  instructions: string;
  timeLimit: number;
  totalMarks: number;
  sections: Section[];
  onBack: () => void;
  onExport: () => void;
  showAnswers?: boolean;
}

export default function ExamPreview({
  title,
  subject,
  topic,
  instructions,
  timeLimit,
  totalMarks,
  sections,
  onBack,
  onExport,
  showAnswers = false
}: ExamPreviewProps) {
  let questionNumber = 0;

  const renderQuestion = (question: Question, index: number) => {
    questionNumber++;
    
    return (
      <div key={index} className="mb-6">
        <div className="flex items-start gap-2 mb-2">
          <span className="font-semibold text-foreground min-w-[2rem]">
            {questionNumber}.
          </span>
          <div className="flex-1">
            <p className="text-foreground mb-2">{question.question_text}</p>
            
            {question.question_type === 'mcq' && question.options && (
              <div className="ml-4 space-y-1">
                {question.options.map((option, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {String.fromCharCode(65 + optIdx)})
                    </span>
                    <span className={showAnswers && question.correct_answer === option 
                      ? "text-success font-medium" 
                      : "text-foreground"
                    }>
                      {option}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {question.question_type === 'true_false' && (
              <div className="ml-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">A)</span>
                  <span className={showAnswers && question.correct_answer.toLowerCase() === 'true' 
                    ? "text-success font-medium" 
                    : "text-foreground"
                  }>True</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">B)</span>
                  <span className={showAnswers && question.correct_answer.toLowerCase() === 'false' 
                    ? "text-success font-medium" 
                    : "text-foreground"
                  }>False</span>
                </div>
              </div>
            )}
            
            {question.question_type === 'fill_blank' && (
              <div className="ml-4 mt-2">
                <div className="border-b-2 border-dashed border-muted-foreground w-48 h-6" />
                {showAnswers && (
                  <p className="text-success text-sm mt-1">Answer: {question.correct_answer}</p>
                )}
              </div>
            )}
            
            {(question.question_type === 'short_answer' || question.question_type === 'long_answer') && (
              <div className="ml-4 mt-2">
                <div className={`border border-dashed border-muted-foreground rounded p-2 ${
                  question.question_type === 'long_answer' ? 'min-h-[100px]' : 'min-h-[50px]'
                }`}>
                  {showAnswers && (
                    <p className="text-success text-sm">{question.correct_answer}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-right text-sm text-muted-foreground mt-1">
              [{question.marks} mark{question.marks > 1 ? 's' : ''}]
            </div>
            
            {showAnswers && question.explanation && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                <span className="font-medium">Explanation:</span> {question.explanation}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Editor
        </Button>
        <Button onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center border-b">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {subject} - {topic}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {timeLimit} minutes
            </div>
            <div>Total Marks: {totalMarks}</div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {instructions && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold mb-2">General Instructions:</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{instructions}</p>
            </div>
          )}

          <ScrollArea className="h-[600px] pr-4">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="mb-8">
                <div className="bg-primary/10 p-3 rounded-lg mb-4">
                  <h2 className="font-bold text-lg">{section.title}</h2>
                  {section.instructions && (
                    <p className="text-sm text-muted-foreground mt-1">{section.instructions}</p>
                  )}
                </div>

                {section.questions.map((q, qIdx) => renderQuestion(q, qIdx))}

                {sIdx < sections.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
