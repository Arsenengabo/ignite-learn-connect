import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Clock, BookOpen, Image, Table2 } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ExamPreviewProps {
  title: string;
  subject: string;
  topic: string;
  instructions: string;
  timeLimit: number;
  totalMarks: number;
  sections: any[];
  onBack: () => void;
  onExport: () => void;
  showAnswers?: boolean;
}

function DiagramPlaceholder({ diagram }: { diagram: any }) {
  if (!diagram) return null;

  // If an actual image was generated, render it inline
  if (diagram.image_url) {
    return (
      <div className="my-3 rounded-lg border bg-background p-3 flex flex-col items-center">
        <img
          src={diagram.image_url}
          alt={diagram.description || 'Exam diagram'}
          className="max-h-[420px] w-auto object-contain rounded"
        />
        {Array.isArray(diagram.labels) && diagram.labels.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Labels: {diagram.labels.join(', ')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="my-3 border-2 border-dashed border-muted-foreground/40 rounded-lg p-4 bg-muted/20 flex items-center gap-3">
      <Image className="h-8 w-8 text-muted-foreground/60 shrink-0" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">Diagram</p>
        <p className="text-sm text-muted-foreground/80">{diagram.description}</p>
      </div>
    </div>
  );
}

function TableRenderer({ table }: { table: any }) {
  if (!table?.headers?.length) return null;
  return (
    <div className="my-3 overflow-x-auto">
      <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
        <Table2 className="h-3 w-3" />
        <span>Data Table</span>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {table.headers.map((h: string, i: number) => (
              <th key={i} className="border border-border bg-muted/50 px-3 py-1.5 text-left font-medium text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows?.map((row: string[], rIdx: number) => (
            <tr key={rIdx}>
              {row.map((cell: string, cIdx: number) => (
                <td key={cIdx} className="border border-border px-3 py-1.5 text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuestionRenderer({ q, prefix, showAnswers, depth = 0 }: { q: any; prefix: string; showAnswers: boolean; depth?: number }) {
  const isGroup = q.type === 'group' && q.subQuestions?.length;
  const indent = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : '';
  const questionText = q.question || q.question_text || '';

  return (
    <div className={`mb-4 ${indent}`}>
      <div className="flex items-start gap-2">
        <span className="font-semibold text-foreground min-w-[2rem] shrink-0">
          {prefix}{depth === 0 ? '.' : ')'}
        </span>
        <div className="flex-1">
          {questionText && (
            <p className="text-foreground mb-1">{questionText}</p>
          )}

          {q.diagram && <DiagramPlaceholder diagram={q.diagram} />}
          {q.table && <TableRenderer table={q.table} />}

          {/* MCQ options */}
          {q.type === 'mcq' && q.options && (
            <div className="ml-4 space-y-1 mt-1">
              {q.options.map((opt: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{String.fromCharCode(65 + i)})</span>
                  <span className={showAnswers && (q.correctAnswer === opt || q.correct_answer === opt || q.correctAnswer === i)
                    ? "text-primary font-medium" : "text-foreground"
                  }>{opt}</span>
                </div>
              ))}
            </div>
          )}

          {/* True/False */}
          {q.type === 'true_false' && (
            <div className="ml-4 space-y-1 mt-1">
              {['True', 'False'].map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{String.fromCharCode(65 + i)})</span>
                  <span className={showAnswers && (q.correctAnswer || q.correct_answer || '').toLowerCase() === v.toLowerCase()
                    ? "text-primary font-medium" : "text-foreground"
                  }>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Fill blank */}
          {q.type === 'fill_blank' && (
            <div className="ml-4 mt-2">
              <div className="border-b-2 border-dashed border-muted-foreground w-48 h-6" />
              {showAnswers && <p className="text-primary text-sm mt-1">Answer: {q.correctAnswer || q.correct_answer}</p>}
            </div>
          )}

          {/* Short / Long answer */}
          {(q.type === 'short_answer' || q.type === 'long_answer') && (
            <div className="ml-4 mt-2">
              <div className={`border border-dashed border-muted-foreground rounded p-2 ${q.type === 'long_answer' ? 'min-h-[100px]' : 'min-h-[50px]'}`}>
                {showAnswers && <p className="text-primary text-sm">{q.correctAnswer || q.correct_answer}</p>}
              </div>
            </div>
          )}

          {/* Calculation */}
          {q.type === 'calculation' && (
            <div className="ml-4 mt-2">
              <div className="border border-dashed border-muted-foreground rounded p-2 min-h-[80px]">
                {showAnswers && (
                  <div className="text-sm space-y-1">
                    <p className="text-primary font-medium">Answer: {q.correctAnswer || q.correct_answer}</p>
                    {q.workingSteps && <p className="text-muted-foreground whitespace-pre-wrap">Working: {q.workingSteps}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Critical thinking / Problem solving */}
          {(q.type === 'critical_thinking' || q.type === 'problem_solving') && (
            <div className="ml-4 mt-2">
              <div className="border border-dashed border-muted-foreground rounded p-2 min-h-[100px]">
                {showAnswers && <p className="text-primary text-sm">{q.correctAnswer || q.correct_answer || q.sampleAnswer}</p>}
              </div>
            </div>
          )}

          {/* Diagram labeling — answer lines for each label */}
          {q.type === 'diagram_labeling' && (
            <div className="ml-4 mt-2 space-y-1">
              {(q.diagram?.labels || ['A', 'B', 'C', 'D', 'E', 'F']).map((label: string) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground w-6">{label} →</span>
                  {showAnswers ? (
                    <span className="text-primary font-medium">
                      {q.answer_key?.[label] || q.answerKey?.[label] || '—'}
                    </span>
                  ) : (
                    <span className="border-b border-muted-foreground flex-1 h-5" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Marks */}
          {q.marks > 0 && (
            <div className="text-right text-sm text-muted-foreground mt-1">
              [{q.marks} mark{q.marks > 1 ? 's' : ''}]
            </div>
          )}

          {/* Explanation */}
          {showAnswers && (q.explanation || q.workingSteps) && (
            <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
              <span className="font-medium">Explanation:</span> {q.explanation || q.workingSteps}
            </div>
          )}

          {/* Sub-questions */}
          {isGroup && (
            <div className="mt-3">
              {q.subQuestions.map((sub: any, i: number) => {
                const subPrefix = depth === 0
                  ? String.fromCharCode(97 + i) // a, b, c
                  : (depth === 1 ? ['i', 'ii', 'iii', 'iv', 'v', 'vi'][i] || `${i + 1}` : `${i + 1}`);
                return (
                  <QuestionRenderer key={i} q={sub} prefix={sub.number || subPrefix} showAnswers={showAnswers} depth={depth + 1} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExamPreview({
  title, subject, topic, instructions, timeLimit, totalMarks, sections,
  onBack, onExport, showAnswers = false
}: ExamPreviewProps) {
  let questionNumber = 0;

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
            {sections.map((section: any, sIdx: number) => (
              <div key={sIdx} className="mb-8">
                <div className="bg-primary/10 p-3 rounded-lg mb-4">
                  <h2 className="font-bold text-lg">{section.title}</h2>
                  {section.instructions && (
                    <p className="text-sm text-muted-foreground mt-1">{section.instructions}</p>
                  )}
                  {section.totalMarks && (
                    <p className="text-sm text-muted-foreground">Total: {section.totalMarks} marks</p>
                  )}
                </div>

                {(section.questions || []).map((q: any, qIdx: number) => {
                  questionNumber++;
                  return (
                    <QuestionRenderer
                      key={qIdx}
                      q={q}
                      prefix={q.number?.toString() || questionNumber.toString()}
                      showAnswers={showAnswers}
                      depth={0}
                    />
                  );
                })}

                {sIdx < sections.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
