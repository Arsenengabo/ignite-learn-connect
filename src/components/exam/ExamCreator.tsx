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

interface ExamSection {
  id: string;
  title: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'long_answer' | 'fill_blank';
  questionCount: number;
  marksPerQuestion: number;
  instructions: string;
}

interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  marks: number;
}

interface GeneratedSection {
  title: string;
  instructions: string;
  questions: GeneratedQuestion[];
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
  
  // Exam metadata
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [timeLimit, setTimeLimit] = useState(60);
  const [instructions, setInstructions] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  
  // Sections
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
  
  // Generated content
  const [generatedSections, setGeneratedSections] = useState<GeneratedSection[]>([]);

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
      toast({
        title: "Missing Information",
        description: "Please provide subject and topic for the exam.",
        variant: "destructive"
      });
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
        setGeneratedSections(data.sections);
        toast({
          title: "Exam Generated",
          description: "Questions have been generated. Review and save when ready."
        });
      }
    } catch (error) {
      console.error("Error generating exam:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate exam questions",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveExam = async () => {
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please provide a title for the exam.",
        variant: "destructive"
      });
      return;
    }

    if (generatedSections.length === 0) {
      toast({
        title: "No Questions",
        description: "Please generate questions first.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          teacher_id: user.id,
          title,
          subject,
          description: topic,
          difficulty_level: difficulty,
          time_limit_minutes: timeLimit,
          instructions,
          total_marks: getTotalMarks(),
          is_published: isPublished
        })
        .select()
        .single();

      if (examError) throw examError;

      // Create sections and questions
      let questionOrder = 0;
      for (let sIdx = 0; sIdx < generatedSections.length; sIdx++) {
        const genSection = generatedSections[sIdx];
        const originalSection = sections[sIdx];

        // Create section
        const { data: section, error: sectionError } = await supabase
          .from('exam_sections')
          .insert({
            exam_id: exam.id,
            title: genSection.title,
            instructions: genSection.instructions,
            order_index: sIdx,
            marks_per_question: originalSection?.marksPerQuestion || 1
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Create questions
        for (const q of genSection.questions) {
          const { error: qError } = await supabase
            .from('exam_questions')
            .insert({
              exam_id: exam.id,
              section_id: section.id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              marks: q.marks,
              order_index: questionOrder++
            });

          if (qError) throw qError;
        }
      }

      toast({
        title: "Exam Saved",
        description: `${title} has been saved successfully.`
      });

      onExamCreated?.();
    } catch (error) {
      console.error("Error saving exam:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save exam",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    if (generatedSections.length === 0) {
      toast({
        title: "No Content",
        description: "Generate questions first before exporting.",
        variant: "destructive"
      });
      return;
    }

    generateExamPDF({
      title: title || "Untitled Exam",
      subject,
      topic,
      instructions,
      timeLimit,
      totalMarks: getTotalMarks(),
      sections: generatedSections
    });

    toast({
      title: "PDF Downloaded",
      description: "Exam has been exported as PDF."
    });
  };

  if (showPreview && generatedSections.length > 0) {
    return (
      <ExamPreview
        title={title || "Untitled Exam"}
        subject={subject}
        topic={topic}
        instructions={instructions}
        timeLimit={timeLimit}
        totalMarks={getTotalMarks()}
        sections={generatedSections}
        onBack={() => setShowPreview(false)}
        onExport={handleExportPDF}
      />
    );
  }

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
          {/* Exam Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Exam Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Mid-Term Mathematics Exam"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Mathematics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic/Chapter</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Algebra and Quadratic Equations"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setDifficulty(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
                min={5}
                max={300}
              />
            </div>
            <div className="space-y-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
                <Label htmlFor="published">Publish immediately</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">General Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter general instructions for the exam..."
              rows={3}
            />
          </div>

          {/* Sections */}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSection(section.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Section Title</Label>
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="e.g., Section A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select
                        value={section.questionType}
                        onValueChange={(v: ExamSection['questionType']) => 
                          updateSection(section.id, { questionType: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                          <SelectItem value="long_answer">Long Answer</SelectItem>
                          <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Questions</Label>
                      <Input
                        type="number"
                        value={section.questionCount}
                        onChange={(e) => updateSection(section.id, { 
                          questionCount: parseInt(e.target.value) || 1 
                        })}
                        min={1}
                        max={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Marks per Question</Label>
                      <Input
                        type="number"
                        value={section.marksPerQuestion}
                        onChange={(e) => updateSection(section.id, { 
                          marksPerQuestion: parseInt(e.target.value) || 1 
                        })}
                        min={1}
                        max={20}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Section Instructions (optional)</Label>
                    <Input
                      value={section.instructions}
                      onChange={(e) => updateSection(section.id, { instructions: e.target.value })}
                      placeholder="e.g., Choose the correct answer"
                    />
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

          {/* Generated Questions Preview */}
          {generatedSections.length > 0 && (
            <Card className="bg-success/5 border-success/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium text-success">
                    ✓ {generatedSections.reduce((sum, s) => sum + s.questions.length, 0)} Questions Generated
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
                  {generatedSections.map((section, idx) => (
                    <div key={idx}>
                      {section.title}: {section.questions.length} questions
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={generateExam}
              disabled={isGenerating || !subject.trim() || !topic.trim()}
              className="flex-1 min-w-[200px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>
            
            {generatedSections.length > 0 && (
              <Button
                onClick={saveExam}
                disabled={isSaving || !title.trim()}
                variant="default"
                className="flex-1 min-w-[200px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
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
