import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, FileText, Eye, Download } from "lucide-react";
import ExamPreview from "./ExamPreview";
import { generateExamPDF } from "@/utils/examPdfGenerator";

type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'long_answer' | 'fill_blank' | 'calculation' | 'critical_thinking' | 'problem_solving' | 'mixed';

interface ExamSection {
  id: string;
  title: string;
  questionType: QuestionType;
  questionCount: number;
  marksPerQuestion: number;
  instructions: string;
}

interface ExamCreatorProps {
  onExamCreated?: () => void;
  onBack?: () => void;
}

export default function ExamCreator({ onExamCreated, onBack }: ExamCreatorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [timeLimit, setTimeLimit] = useState(60);
  const [instructions, setInstructions] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  
  const [sections, setSections] = useState<ExamSection[]>([
    {
      id: crypto.randomUUID(),
      title: "Section A - Multiple Choice",
      questionType: 'mcq',
      questionCount: 10,
      marksPerQuestion: 1,
      instructions: "Choose the correct answer from the options given."
    }
  ]);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [generatedData, setGeneratedData] = useState<any>(null);

  const addSection = () => {
    setSections([...sections, {
      id: crypto.randomUUID(),
      title: `Section ${String.fromCharCode(65 + sections.length)}`,
      questionType: 'mcq',
      questionCount: 5,
      marksPerQuestion: 1,
      instructions: ""
    }]);
  };

  const removeSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(s => s.id !== id));
    }
  };

  const updateSection = (id: string, updates: Partial<ExamSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const getTotalMarks = () => {
    return sections.reduce((total, s) => total + (s.questionCount * s.marksPerQuestion), 0);
  };

  const generateExam = async () => {
    if (!subject.trim() || !topic.trim()) {
      toast({ title: "Missing Information", description: "Please provide subject and topic.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-exam', {
        body: {
          examFormat: {
            subject,
            topic,
            difficulty,
            sections: sections.map(s => ({
              title: s.title,
              questionType: s.questionType,
              questionCount: s.questionCount,
              marksPerQuestion: s.marksPerQuestion,
              instructions: s.instructions
            })),
            generalInstructions: instructions
          }
        }
      });

      if (error) throw error;

      if (data.sections) {
        setGeneratedData(data);
        toast({ title: "Exam Generated", description: "Questions have been generated with hierarchical structure, diagrams, and tables." });
      }
    } catch (error) {
      console.error("Error generating exam:", error);
      toast({ title: "Generation Failed", description: error instanceof Error ? error.message : "Failed to generate exam", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Flatten hierarchical questions for saving to DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattenQuestions = (questions: any[], sectionId: string, examId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flat: any[] = [];
    let order = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (items: any[], prefix: string) => {
      for (const q of items) {
        const num = prefix ? `${prefix}.${q.number}` : q.number?.toString() || '';
        if (q.type === 'group' && q.subQuestions?.length) {
          // Store group header as a question too for context
          if (q.question) {
            flat.push({
              exam_id: examId,
              section_id: sectionId,
              question_text: q.question,
              question_type: 'group_header',
              options: null,
              correct_answer: null,
              explanation: null,
              marks: 0,
              order_index: order++,
              sample_answer: null,
              evaluation_guidelines: null,
              key_points: q.diagram || q.table ? JSON.stringify({ diagram: q.diagram, table: q.table }) : null,
            });
          }
          walk(q.subQuestions, num);
        } else {
          flat.push({
            exam_id: examId,
            section_id: sectionId,
            question_text: q.question || q.question_text || '',
            question_type: q.type || q.question_type || 'short_answer',
            options: q.options || null,
            correct_answer: q.correctAnswer || q.correct_answer || null,
            explanation: q.explanation || q.workingSteps || null,
            marks: q.marks || 1,
            order_index: order++,
            sample_answer: q.correctAnswer || q.correct_answer || null,
            evaluation_guidelines: q.workingSteps || null,
            key_points: (q.diagram || q.table) ? JSON.stringify({ diagram: q.diagram, table: q.table }) : null,
          });
        }
      }
    };

    walk(questions, '');
    return flat;
  };

  const saveExam = async () => {
    if (!title.trim()) {
      toast({ title: "Missing Title", description: "Please provide a title.", variant: "destructive" });
      return;
    }
    if (!generatedData?.sections?.length) {
      toast({ title: "No Questions", description: "Please generate questions first.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          teacher_id: user.id, title, subject, description: topic,
          difficulty_level: difficulty, time_limit_minutes: timeLimit,
          instructions, total_marks: getTotalMarks(), is_published: isPublished
        })
        .select().single();

      if (examError) throw examError;

      for (let sIdx = 0; sIdx < generatedData.sections.length; sIdx++) {
        const genSection = generatedData.sections[sIdx];
        const originalSection = sections[sIdx];

        const { data: section, error: sectionError } = await supabase
          .from('exam_sections')
          .insert({
            exam_id: exam.id,
            title: genSection.title || originalSection?.title || `Section ${sIdx + 1}`,
            instructions: genSection.instructions || '',
            order_index: sIdx,
            marks_per_question: originalSection?.marksPerQuestion || 1
          })
          .select().single();

        if (sectionError) throw sectionError;

        const questions = genSection.questions || [];
        const flatQuestions = flattenQuestions(questions, section.id, exam.id);

        if (flatQuestions.length > 0) {
          const { error: qError } = await supabase.from('exam_questions').insert(flatQuestions);
          if (qError) throw qError;
        }
      }

      toast({ title: "Exam Saved", description: `${title} has been saved successfully.` });
      onExamCreated?.();
    } catch (error) {
      console.error("Error saving exam:", error);
      toast({ title: "Save Failed", description: error instanceof Error ? error.message : "Failed to save exam", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    if (!generatedData?.sections?.length) {
      toast({ title: "No Content", description: "Generate questions first.", variant: "destructive" });
      return;
    }
    generateExamPDF({
      title: title || "Untitled Exam", subject, topic, instructions, timeLimit,
      totalMarks: getTotalMarks(), sections: generatedData.sections
    });
    toast({ title: "PDF Downloaded", description: "Exam has been exported as PDF." });
  };

  if (showPreview && generatedData?.sections?.length) {
    return (
      <ExamPreview
        title={title || "Untitled Exam"} subject={subject} topic={topic}
        instructions={instructions} timeLimit={timeLimit} totalMarks={getTotalMarks()}
        sections={generatedData.sections}
        onBack={() => setShowPreview(false)} onExport={handleExportPDF}
      />
    );
  }

  const questionTypeLabels: Record<QuestionType, string> = {
    mcq: "Multiple Choice",
    true_false: "True/False",
    short_answer: "Short Answer",
    long_answer: "Long Answer",
    fill_blank: "Fill in the Blank",
    calculation: "Calculation",
    critical_thinking: "Critical Thinking",
    problem_solving: "Problem Solving",
    mixed: "Mixed (All Types)",
  };

  const getTotalGeneratedQuestions = () => {
    if (!generatedData?.sections) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let count = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countQ = (items: any[]) => {
      for (const q of items) {
        if (q.type === 'group' && q.subQuestions?.length) {
          countQ(q.subQuestions);
        } else {
          count++;
        }
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generatedData.sections.forEach((s: any) => countQ(s.questions || []));
    return count;
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Back to Dashboard
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create New Exam
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Exam Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Mid-Term Mathematics Exam" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Mathematics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic/Chapter</Label>
              <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Algebra and Quadratic Equations" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setDifficulty(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input id="timeLimit" type="number" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)} min={5} max={300} />
            </div>
            <div className="space-y-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                <Label htmlFor="published">Publish immediately</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">General Instructions</Label>
            <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Enter general instructions for the exam..." rows={3} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Exam Sections</Label>
              <div className="text-sm text-muted-foreground">
                Total Marks: <span className="font-bold text-foreground">{getTotalMarks()}</span>
              </div>
            </div>

            {sections.map((section, idx) => (
              <Card key={section.id} className="bg-muted/30">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Section {idx + 1}</span>
                    {sections.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeSection(section.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} placeholder="e.g., Section A" />
                    </div>
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select value={section.questionType} onValueChange={(v: QuestionType) => updateSection(section.id, { questionType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(questionTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Questions</Label>
                      <Input type="number" value={section.questionCount} onChange={(e) => updateSection(section.id, { questionCount: parseInt(e.target.value) || 1 })} min={1} max={50} />
                    </div>
                    <div className="space-y-2">
                      <Label>Marks per Question</Label>
                      <Input type="number" value={section.marksPerQuestion} onChange={(e) => updateSection(section.id, { marksPerQuestion: parseInt(e.target.value) || 1 })} min={1} max={20} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Section Instructions (optional)</Label>
                    <Input value={section.instructions} onChange={(e) => updateSection(section.id, { instructions: e.target.value })} placeholder="e.g., Choose the correct answer" />
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Section Marks: {section.questionCount * section.marksPerQuestion}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={addSection} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {generatedData?.sections?.length > 0 && (
            <Card className="bg-success/5 border-success/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium text-success">
                    ✓ {getTotalGeneratedQuestions()} Questions Generated (with hierarchical structure)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {generatedData.sections.map((section: any, idx: number) => (
                    <div key={idx}>
                      {section.title}: {section.questions?.length || 0} top-level questions
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-4">
            <Button onClick={generateExam} disabled={isGenerating || !subject.trim() || !topic.trim()} className="flex-1 min-w-[200px]">
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Questions...</>
              ) : (
                <><FileText className="h-4 w-4 mr-2" />Generate Questions</>
              )}
            </Button>
            
            {generatedData?.sections?.length > 0 && (
              <Button onClick={saveExam} disabled={isSaving || !title.trim()} variant="default" className="flex-1 min-w-[200px]">
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  "Save Exam"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
