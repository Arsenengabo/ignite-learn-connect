import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Sparkles, Download, Eye, FileText, ClipboardList, Key, Loader2, Monitor, Flag, Clock, CheckCircle2, Upload, ExternalLink, ImageIcon, Palette } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Json } from "@/integrations/supabase/types";
import { DiagramQuestionGenerator } from "./DiagramQuestionGenerator";

interface SectionQuestion {
  type: "mcq" | "short_answer" | "long_answer" | "true_false" | "diagram_labeling";
  count: number;
  marksEach: number;
}

interface ExamSection {
  name: string;
  questions: SectionQuestion[];
}

interface DiagramSpec {
  type?: string;
  description?: string;
  labels?: string[];
  colorful?: boolean;
  image_url?: string;
}

interface GeneratedQuestion {
  number: number;
  type: "mcq" | "short_answer" | "long_answer" | "true_false" | "diagram_labeling";
  question: string;
  marks: number;
  options?: string[] | null;
  correctAnswer?: string;
  explanation?: string;
  sampleAnswer?: string;
  evaluationGuidelines?: string;
  keyPoints?: string[];
  diagram?: DiagramSpec | null;
  answer_key?: Record<string, string> | null;
}

interface GeneratedSection {
  name: string;
  totalMarks: number;
  questions: GeneratedQuestion[];
}

interface GeneratedExam {
  examName: string;
  subject: string;
  totalMarks: number;
  duration: number;
  instructions: string[];
  sections: GeneratedSection[];
}

// Online Exam Ready Interfaces
interface OnlineExamQuestion {
  id: string;
  number: number;
  sectionId: string;
  type: "mcq" | "short_answer" | "long_answer" | "true_false";
  questionText: string;
  marks: number;
  options: string[] | null;
  required: boolean;
}

interface OnlineExamSection {
  id: string;
  name: string;
  order: number;
  questions: OnlineExamQuestion[];
}

interface GradingQuestion {
  id: string;
  type: string;
  correctAnswer: string;
  sampleAnswer: string;
  explanation: string;
  keyPoints: string[];
  evaluationGuidelines: string;
  marks: number;
  partialMarkingAllowed: boolean;
  gradingType: "exact_match" | "semantic" | "keyword_based";
}

interface OnlineExamReady {
  metadata: {
    examId: string;
    examName: string;
    subject: string;
    totalMarks: number;
    duration: number;
    totalQuestions: number;
    createdAt: string;
  };
  config: {
    allowNavigation: boolean;
    allowFlagForReview: boolean;
    autoSubmitOnTimeout: boolean;
    showQuestionNumbers: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
  instructions: string[];
  studentView: {
    sections: OnlineExamSection[];
  };
  gradingMetadata: {
    questions: GradingQuestion[];
  };
}

export const AIQuestionGenerator = () => {
  const [examName, setExamName] = useState("");
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState("");
  const [duration, setDuration] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("medium");
  const [instructions, setInstructions] = useState("Answer all questions.\nWrite clearly and show all working.\nNo calculators unless specified.");
  const [sections, setSections] = useState<ExamSection[]>([
    {
      name: "Section A: Multiple Choice",
      questions: [{ type: "mcq", count: 10, marksEach: 1 }]
    }
  ]);
  
  const [generatedExam, setGeneratedExam] = useState<GeneratedExam | null>(null);
  const [onlineExam, setOnlineExam] = useState<OnlineExamReady | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedExamId, setSavedExamId] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<"standard" | "online">("standard");
  const [previewQuestion, setPreviewQuestion] = useState(0);
  const [includeDiagrams, setIncludeDiagrams] = useState(true);
  const [colorfulDiagrams, setColorfulDiagrams] = useState(true);

  const addSection = () => {
    setSections([...sections, {
      name: `Section ${String.fromCharCode(65 + sections.length)}`,
      questions: [{ type: "short_answer", count: 5, marksEach: 2 }]
    }]);
  };

  const removeSection = (index: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  const updateSection = (index: number, field: keyof ExamSection, value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const addQuestionType = (sectionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].questions.push({ type: "mcq", count: 5, marksEach: 1 });
    setSections(updated);
  };

  const removeQuestionType = (sectionIndex: number, questionIndex: number) => {
    const updated = [...sections];
    if (updated[sectionIndex].questions.length > 1) {
      updated[sectionIndex].questions = updated[sectionIndex].questions.filter((_, i) => i !== questionIndex);
      setSections(updated);
    }
  };

  const updateQuestionType = (sectionIndex: number, questionIndex: number, field: keyof SectionQuestion, value: string | number) => {
    const updated = [...sections];
    updated[sectionIndex].questions[questionIndex] = {
      ...updated[sectionIndex].questions[questionIndex],
      [field]: field === "type" ? value : Number(value)
    };
    setSections(updated);
  };

  const calculateTotalMarks = () => {
    return sections.reduce((total, section) => {
      return total + section.questions.reduce((sectionTotal, q) => sectionTotal + (q.count * q.marksEach), 0);
    }, 0);
  };

  const generateExam = async () => {
    if (!examName.trim() || !subject.trim() || !topics.trim()) {
      toast.error("Please fill in exam name, subject, and topics");
      return;
    }

    setIsGenerating(true);
    setGeneratedExam(null);
    setOnlineExam(null);
    
    try {
      const examFormat = {
        examName,
        subject,
        topics: topics.split(",").map(t => t.trim()).filter(Boolean),
        duration,
        totalMarks: calculateTotalMarks(),
        difficulty,
        instructions: instructions.split("\n").filter(Boolean),
        sections,
        includeDiagrams,
        colorfulDiagrams,
      };

      const { data, error } = await supabase.functions.invoke('ai-question-generator', {
        body: { 
          examFormat,
          onlineExamReady: generationMode === "online"
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate exam');
      }

      if (generationMode === "online") {
        const exam = data?.exam as OnlineExamReady;
        if (!exam || !exam.studentView || !exam.gradingMetadata) {
          throw new Error('Invalid online exam response format from AI');
        }
        setOnlineExam(exam);
        toast.success("Online exam generated successfully!");
      } else {
        const exam = data?.exam as GeneratedExam;
        if (!exam || !exam.sections) {
          throw new Error('Invalid response format from AI');
        }
        setGeneratedExam(exam);
        toast.success("Exam generated successfully!");
      }
    } catch (error: any) {
      console.error('Error generating exam:', error);
      toast.error(error.message || "Failed to generate exam. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToDatabase = async (publish: boolean = false) => {
    const examToSave = generationMode === "online" ? onlineExam : null;
    const standardExamToSave = generationMode === "standard" ? generatedExam : null;
    
    if (!examToSave && !standardExamToSave) {
      toast.error("No exam to save. Please generate an exam first.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Determine exam data source
      const examData = examToSave ? {
        name: examToSave.metadata.examName,
        subject: examToSave.metadata.subject,
        totalMarks: examToSave.metadata.totalMarks,
        duration: examToSave.metadata.duration,
        instructions: examToSave.instructions.join('\n'),
        sections: examToSave.studentView.sections,
        gradingData: examToSave.gradingMetadata.questions,
      } : {
        name: standardExamToSave!.examName,
        subject: standardExamToSave!.subject,
        totalMarks: standardExamToSave!.totalMarks,
        duration: standardExamToSave!.duration,
        instructions: standardExamToSave!.instructions.join('\n'),
        sections: standardExamToSave!.sections,
        gradingData: null,
      };

      // Create the exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          teacher_id: user.id,
          title: examData.name,
          subject: examData.subject,
          total_marks: examData.totalMarks,
          time_limit_minutes: examData.duration,
          instructions: examData.instructions,
          difficulty_level: difficulty,
          is_published: publish,
        })
        .select()
        .single();

      if (examError) throw examError;

      // Create sections and questions
      if (examToSave) {
        // Online exam format
        for (const section of examData.sections as OnlineExamSection[]) {
          const { data: sectionData, error: sectionError } = await supabase
            .from('exam_sections')
            .insert({
              exam_id: exam.id,
              title: section.name,
              order_index: section.order,
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          // Insert questions for this section
          for (const q of section.questions) {
            // Find grading data for this question
            const grading = (examData.gradingData as GradingQuestion[])?.find(g => g.id === q.id);

            const { error: questionError } = await supabase
              .from('exam_questions')
              .insert({
                exam_id: exam.id,
                section_id: sectionData.id,
                question_text: q.questionText,
                question_type: q.type,
                options: q.options as Json,
                marks: q.marks,
                order_index: q.number,
                correct_answer: grading?.correctAnswer || null,
                explanation: grading?.explanation || null,
                sample_answer: grading?.sampleAnswer || null,
                key_points: grading?.keyPoints as Json || null,
                evaluation_guidelines: grading?.evaluationGuidelines || null,
              });

            if (questionError) throw questionError;
          }
        }
      } else {
        // Standard exam format
        for (let sIndex = 0; sIndex < (examData.sections as GeneratedSection[]).length; sIndex++) {
          const section = (examData.sections as GeneratedSection[])[sIndex];
          
          const { data: sectionData, error: sectionError } = await supabase
            .from('exam_sections')
            .insert({
              exam_id: exam.id,
              title: section.name,
              order_index: sIndex,
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          // Insert questions
          for (const q of section.questions) {
            const { error: questionError } = await supabase
              .from('exam_questions')
              .insert({
                exam_id: exam.id,
                section_id: sectionData.id,
                question_text: q.question,
                question_type: q.type,
                options: q.options as Json,
                marks: q.marks,
                order_index: q.number,
                correct_answer: q.correctAnswer || null,
                explanation: q.explanation || null,
                sample_answer: q.sampleAnswer || null,
                key_points: q.keyPoints as Json || null,
                evaluation_guidelines: q.evaluationGuidelines || null,
              });

            if (questionError) throw questionError;
          }
        }
      }

      setSavedExamId(exam.id);
      toast.success(publish 
        ? "Exam saved and published! Students can now take it online." 
        : "Exam saved as draft. You can publish it from the Exam Manager."
      );

    } catch (error: any) {
      console.error('Error saving exam:', error);
      toast.error(error.message || "Failed to save exam. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportOnlineExamJSON = () => {
    if (!onlineExam) return;
    
    // Export only studentView for online exam delivery
    const studentExam = {
      metadata: onlineExam.metadata,
      config: onlineExam.config,
      instructions: onlineExam.instructions,
      studentView: onlineExam.studentView
    };
    
    const blob = new Blob([JSON.stringify(studentExam, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${onlineExam.metadata.examName}_student_exam.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Student exam JSON exported!");
  };

  const exportGradingMetadataJSON = () => {
    if (!onlineExam) return;
    
    const gradingData = {
      metadata: onlineExam.metadata,
      gradingMetadata: onlineExam.gradingMetadata
    };
    
    const blob = new Blob([JSON.stringify(gradingData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${onlineExam.metadata.examName}_grading_key.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Grading metadata exported!");
  };

  const exportPDF = (mode: "questions" | "answers" | "key") => {
    if (!generatedExam) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    const lineHeight = 7;
    const margin = 20;

    const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      
      if (yPos + lines.length * lineHeight > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(lines, margin, yPos);
      yPos += lines.length * lineHeight;
    };

    // Header
    addText(generatedExam.examName, 16, true);
    addText(`Subject: ${generatedExam.subject}`, 12);
    addText(`Duration: ${generatedExam.duration} minutes | Total Marks: ${generatedExam.totalMarks}`, 11);
    yPos += 5;

    if (mode !== "key") {
      addText("Instructions:", 12, true);
      generatedExam.instructions.forEach(inst => {
        addText(`• ${inst}`, 10);
      });
      yPos += 10;
    }

    generatedExam.sections.forEach(section => {
      addText(section.name, 14, true);
      addText(`(Total: ${section.totalMarks} marks)`, 10);
      yPos += 5;

      section.questions.forEach(q => {
        if (mode === "key") {
          addText(`Q${q.number}: ${q.correctAnswer || q.sampleAnswer || "N/A"}`, 10);
        } else {
          addText(`Q${q.number}. [${q.marks} marks]`, 11, true);
          addText(q.question, 11);

          if (q.options && q.options.length > 0) {
            q.options.forEach((opt, i) => {
              addText(`   ${String.fromCharCode(65 + i)}) ${opt}`, 10);
            });
          }

          if (mode === "answers") {
            yPos += 3;
            if (q.correctAnswer) {
              addText(`Answer: ${q.correctAnswer}`, 10);
            }
            if (q.sampleAnswer) {
              addText(`Sample Answer: ${q.sampleAnswer}`, 10);
            }
            if (q.explanation) {
              addText(`Explanation: ${q.explanation}`, 10);
            }
            if (q.keyPoints && q.keyPoints.length > 0) {
              addText("Key Points:", 10, true);
              q.keyPoints.forEach(kp => addText(`• ${kp}`, 9));
            }
          }
          yPos += 5;
        }
      });
      yPos += 10;
    });

    const fileName = mode === "questions" 
      ? `${generatedExam.examName}_Questions.pdf`
      : mode === "answers"
      ? `${generatedExam.examName}_With_Answers.pdf`
      : `${generatedExam.examName}_Answer_Key.pdf`;

    doc.save(fileName);
    toast.success(`${fileName} exported successfully!`);
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mcq: "Multiple Choice",
      short_answer: "Short Answer",
      long_answer: "Long Answer",
      true_false: "True/False"
    };
    return labels[type] || type;
  };

  return (
    <Tabs defaultValue="exam" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 max-w-xl">
        <TabsTrigger value="exam">
          <Sparkles className="w-4 h-4 mr-2" />
          AI Exam Generator
        </TabsTrigger>
        <TabsTrigger value="diagram">
          <ImageIcon className="w-4 h-4 mr-2" />
          Diagram Questions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="diagram" className="space-y-6">
        <DiagramQuestionGenerator />
      </TabsContent>

      <TabsContent value="exam" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Exam Generator
          </CardTitle>
          <CardDescription>
            Generate professional exams with AI-powered question creation and evaluation support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="examName">Exam Name *</Label>
              <Input
                id="examName"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g., Mid-Term Mathematics Exam 2024"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Mathematics, Physics"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="topics">Topics (comma-separated) *</Label>
            <Input
              id="topics"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder="e.g., Algebra, Quadratic Equations, Linear Functions"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                min={15}
                max={300}
              />
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={(v: typeof difficulty) => setDifficulty(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Calculated Total Marks</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center font-medium">
                {calculateTotalMarks()} marks
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="incl-diagrams" className="flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Include diagrams in exam
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  AI auto-renders labeled diagrams when relevant (biology, physics, geometry…).
                </p>
              </div>
              <Switch id="incl-diagrams" checked={includeDiagrams} onCheckedChange={setIncludeDiagrams} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="color-diagrams" className="flex items-center gap-2 cursor-pointer">
                  <Palette className="w-4 h-4 text-primary" />
                  Colorful diagrams
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Use educational colors (e.g. arteries red, veins blue) instead of B&amp;W.
                </p>
              </div>
              <Switch
                id="color-diagrams"
                checked={colorfulDiagrams}
                onCheckedChange={setColorfulDiagrams}
                disabled={!includeDiagrams}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Instructions (one per line)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Enter exam instructions..."
            />
          </div>

          <Separator />

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Exam Sections</Label>
              <Button onClick={addSection} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>

            <Accordion type="multiple" defaultValue={["section-0"]} className="space-y-2">
              {sections.map((section, sectionIndex) => (
                <AccordionItem key={sectionIndex} value={`section-${sectionIndex}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{String.fromCharCode(65 + sectionIndex)}</Badge>
                      <span>{section.name || `Section ${sectionIndex + 1}`}</span>
                      <Badge variant="outline" className="ml-2">
                        {section.questions.reduce((sum, q) => sum + q.count * q.marksEach, 0)} marks
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label>Section Name</Label>
                        <Input
                          value={section.name}
                          onChange={(e) => updateSection(sectionIndex, "name", e.target.value)}
                          placeholder="e.g., Section A: Multiple Choice"
                        />
                      </div>
                      {sections.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-6 text-destructive"
                          onClick={() => removeSection(sectionIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Question Types</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addQuestionType(sectionIndex)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Type
                        </Button>
                      </div>

                      {section.questions.map((q, qIndex) => (
                        <div key={qIndex} className="grid grid-cols-4 gap-2 items-end bg-muted/50 p-3 rounded-lg">
                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={q.type}
                              onValueChange={(v) => updateQuestionType(sectionIndex, qIndex, "type", v)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mcq">MCQ</SelectItem>
                                <SelectItem value="true_false">True/False</SelectItem>
                                <SelectItem value="short_answer">Short Answer</SelectItem>
                                <SelectItem value="long_answer">Long Answer</SelectItem>
                                <SelectItem value="diagram_labeling">Diagram Labeling</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Count</Label>
                            <Input
                              type="number"
                              className="h-9"
                              value={q.count}
                              onChange={(e) => updateQuestionType(sectionIndex, qIndex, "count", e.target.value)}
                              min={1}
                              max={50}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Marks Each</Label>
                            <Input
                              type="number"
                              className="h-9"
                              value={q.marksEach}
                              onChange={(e) => updateQuestionType(sectionIndex, qIndex, "marksEach", e.target.value)}
                              min={1}
                              max={50}
                            />
                          </div>
                          <div>
                            {section.questions.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 text-muted-foreground hover:text-destructive"
                                onClick={() => removeQuestionType(sectionIndex, qIndex)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <Button 
            onClick={generateExam} 
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Exam...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Exam
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Exam Preview */}
      {generatedExam && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>{generatedExam.examName}</CardTitle>
                <CardDescription>
                  {generatedExam.subject} | {generatedExam.duration} min | {generatedExam.totalMarks} marks
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {!savedExamId ? (
                  <>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => saveToDatabase(true)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Publish for Online
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => saveToDatabase(false)}
                      disabled={isSaving}
                    >
                      Save as Draft
                    </Button>
                  </>
                ) : (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Saved to Database
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={() => exportPDF("questions")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Questions Only
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPDF("answers")}>
                  <ClipboardList className="w-4 h-4 mr-2" />
                  With Answers
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPDF("key")}>
                  <Key className="w-4 h-4 mr-2" />
                  Answer Key
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Instructions:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {generatedExam.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>

                {/* Sections and Questions */}
                {generatedExam.sections.map((section, sIndex) => (
                  <div key={sIndex} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{section.name}</h3>
                      <Badge variant="secondary">{section.totalMarks} marks</Badge>
                    </div>

                    <div className="space-y-4">
                      {section.questions.map((q, qIndex) => (
                        <div key={qIndex} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <Badge>Q{q.number}</Badge>
                              <Badge variant="outline">{getQuestionTypeLabel(q.type)}</Badge>
                              <Badge variant="secondary">{q.marks} marks</Badge>
                            </div>
                          </div>

                          <p className="font-medium mb-3">{q.question}</p>

                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {q.options.map((opt, optIndex) => (
                                <div
                                  key={optIndex}
                                  className={`p-2 rounded text-sm ${
                                    opt === q.correctAnswer
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-300'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {opt}
                                </div>
                              ))}
                            </div>
                          )}

                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="answer" className="border-0">
                              <AccordionTrigger className="py-2 text-sm text-primary hover:no-underline">
                                <Eye className="w-4 h-4 mr-2" />
                                View Answer & Guidelines
                              </AccordionTrigger>
                              <AccordionContent className="space-y-3 pt-2">
                                {q.correctAnswer && (
                                  <div>
                                    <span className="font-medium text-sm">Correct Answer: </span>
                                    <span className="text-green-600 dark:text-green-400">{q.correctAnswer}</span>
                                  </div>
                                )}
                                {q.sampleAnswer && (
                                  <div>
                                    <span className="font-medium text-sm">Sample Answer: </span>
                                    <span className="text-muted-foreground text-sm">{q.sampleAnswer}</span>
                                  </div>
                                )}
                                {q.explanation && (
                                  <div>
                                    <span className="font-medium text-sm">Explanation: </span>
                                    <span className="text-muted-foreground text-sm">{q.explanation}</span>
                                  </div>
                                )}
                                {q.keyPoints && q.keyPoints.length > 0 && (
                                  <div>
                                    <span className="font-medium text-sm">Key Points:</span>
                                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                                      {q.keyPoints.map((kp, i) => (
                                        <li key={i}>{kp}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {q.evaluationGuidelines && (
                                  <div>
                                    <span className="font-medium text-sm">Evaluation Guidelines: </span>
                                    <span className="text-muted-foreground text-sm">{q.evaluationGuidelines}</span>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Online Exam Preview */}
      {onlineExam && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Monitor className="w-5 h-5 text-primary" />
                  <CardTitle>{onlineExam.metadata.examName}</CardTitle>
                </div>
                <CardDescription>
                  {onlineExam.metadata.subject} | {onlineExam.metadata.duration} min | {onlineExam.metadata.totalMarks} marks | {onlineExam.metadata.totalQuestions} questions
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {!savedExamId ? (
                  <>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => saveToDatabase(true)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Publish for Online
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => saveToDatabase(false)}
                      disabled={isSaving}
                    >
                      Save as Draft
                    </Button>
                  </>
                ) : (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Saved to Database
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={exportOnlineExamJSON}>
                  <Download className="w-4 h-4 mr-2" />
                  Student JSON
                </Button>
                <Button variant="outline" size="sm" onClick={exportGradingMetadataJSON}>
                  <Key className="w-4 h-4 mr-2" />
                  Grading Key
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Config Badges */}
              <div className="flex flex-wrap gap-2">
                {onlineExam.config.allowNavigation && (
                  <Badge variant="secondary">
                    <Flag className="w-3 h-3 mr-1" />
                    Navigation Enabled
                  </Badge>
                )}
                {onlineExam.config.allowFlagForReview && (
                  <Badge variant="secondary">
                    <Flag className="w-3 h-3 mr-1" />
                    Flag for Review
                  </Badge>
                )}
                {onlineExam.config.autoSubmitOnTimeout && (
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    Auto-Submit on Timeout
                  </Badge>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Instructions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {onlineExam.instructions.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ul>
              </div>

              {/* Sections Preview */}
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {onlineExam.studentView.sections.map((section, sIndex) => (
                    <div key={sIndex} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{section.name}</h3>
                        <Badge variant="secondary">{section.questions.length} questions</Badge>
                      </div>

                      <div className="space-y-3">
                        {section.questions.map((q, qIndex) => {
                          const gradingInfo = onlineExam.gradingMetadata.questions.find(g => g.id === q.id);
                          return (
                            <div key={qIndex} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-2">
                                  <Badge>Q{q.number}</Badge>
                                  <Badge variant="outline">{getQuestionTypeLabel(q.type)}</Badge>
                                  <Badge variant="secondary">{q.marks} marks</Badge>
                                </div>
                              </div>

                              <p className="font-medium mb-3">{q.questionText}</p>

                              {q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                  {q.options.map((opt, optIndex) => (
                                    <div
                                      key={optIndex}
                                      className="p-2 rounded text-sm bg-muted"
                                    >
                                      {String.fromCharCode(65 + optIndex)}. {opt}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Hidden grading data (only visible to teacher) */}
                              {gradingInfo && (
                                <Accordion type="single" collapsible className="w-full">
                                  <AccordionItem value="grading" className="border-0">
                                    <AccordionTrigger className="py-2 text-sm text-primary hover:no-underline">
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Grading Data (Hidden from Students)
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 pt-2 bg-muted/30 p-3 rounded">
                                      <div className="text-xs text-muted-foreground mb-2">
                                        This data is stored for AI grading and is not visible to students.
                                      </div>
                                      {gradingInfo.correctAnswer && (
                                        <div>
                                          <span className="font-medium text-sm">Correct Answer: </span>
                                          <span className="text-green-600 dark:text-green-400">{gradingInfo.correctAnswer}</span>
                                        </div>
                                      )}
                                      {gradingInfo.sampleAnswer && (
                                        <div>
                                          <span className="font-medium text-sm">Sample Answer: </span>
                                          <span className="text-muted-foreground text-sm">{gradingInfo.sampleAnswer}</span>
                                        </div>
                                      )}
                                      {gradingInfo.keyPoints && gradingInfo.keyPoints.length > 0 && (
                                        <div>
                                          <span className="font-medium text-sm">Key Points:</span>
                                          <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                                            {gradingInfo.keyPoints.map((kp, i) => (
                                              <li key={i}>{kp}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {gradingInfo.evaluationGuidelines && (
                                        <div>
                                          <span className="font-medium text-sm">Evaluation Guidelines: </span>
                                          <span className="text-muted-foreground text-sm">{gradingInfo.evaluationGuidelines}</span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-medium text-sm">Grading Type: </span>
                                        <Badge variant="outline">{gradingInfo.gradingType}</Badge>
                                        {gradingInfo.partialMarkingAllowed && (
                                          <Badge variant="secondary" className="ml-2">Partial Marking</Badge>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
      </TabsContent>
    </Tabs>

  );
};
