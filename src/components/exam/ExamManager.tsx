import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, MoreVertical, Edit, Trash2, Eye, Users, Download, 
  Clock, Award, BookOpen, CheckCircle, XCircle 
} from "lucide-react";
import ExamCreator from "./ExamCreator";
import ExamPreview from "./ExamPreview";
import ExamEvaluator from "./ExamEvaluator";
import { generateExamPDF } from "@/utils/examPdfGenerator";

interface Exam {
  id: string;
  title: string;
  subject: string;
  description: string;
  difficulty_level: string;
  time_limit_minutes: number;
  total_marks: number;
  is_published: boolean;
  created_at: string;
  _count?: {
    attempts: number;
  };
}

interface Section {
  title: string;
  instructions: string;
  questions: {
    question_text: string;
    question_type: string;
    options: string[] | null;
    correct_answer: string;
    explanation: string;
    marks: number;
  }[];
}

export default function ExamManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'preview' | 'evaluate'>('list');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [previewSections, setPreviewSections] = useState<Section[]>([]);

  useEffect(() => {
    if (view === 'list') {
      loadExams();
    }
  }, [view]);

  const loadExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error("Error loading exams:", error);
      toast({
        title: "Error",
        description: "Failed to load exams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (exam: Exam) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: !exam.is_published })
        .eq('id', exam.id);

      if (error) throw error;

      toast({
        title: exam.is_published ? "Exam Unpublished" : "Exam Published",
        description: exam.is_published 
          ? "Students can no longer see this exam" 
          : "Students can now take this exam"
      });

      loadExams();
    } catch (error) {
      console.error("Error updating exam:", error);
      toast({
        title: "Error",
        description: "Failed to update exam",
        variant: "destructive"
      });
    }
  };

  const deleteExam = async (exam: Exam) => {
    if (!confirm(`Are you sure you want to delete "${exam.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', exam.id);

      if (error) throw error;

      toast({
        title: "Exam Deleted",
        description: `${exam.title} has been deleted`
      });

      loadExams();
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast({
        title: "Error",
        description: "Failed to delete exam",
        variant: "destructive"
      });
    }
  };

  const handlePreview = async (exam: Exam) => {
    try {
      // Fetch sections and questions
      const { data: sections } = await supabase
        .from('exam_sections')
        .select('*')
        .eq('exam_id', exam.id)
        .order('order_index');

      const { data: questions } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', exam.id)
        .order('order_index');

      // Group questions by section
      const sectionsWithQuestions: Section[] = (sections || []).map(section => ({
        title: section.title,
        instructions: section.instructions || "",
        questions: (questions || [])
          .filter(q => q.section_id === section.id)
          .map(q => ({
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options as string[] | null,
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
            marks: q.marks
          }))
      }));

      // Include questions without sections
      const orphanQuestions = (questions || []).filter(q => !q.section_id);
      if (orphanQuestions.length > 0) {
        sectionsWithQuestions.unshift({
          title: "General Questions",
          instructions: "",
          questions: orphanQuestions.map(q => ({
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options as string[] | null,
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
            marks: q.marks
          }))
        });
      }

      setPreviewSections(sectionsWithQuestions);
      setSelectedExam(exam);
      setView('preview');
    } catch (error) {
      console.error("Error loading preview:", error);
      toast({
        title: "Error",
        description: "Failed to load exam preview",
        variant: "destructive"
      });
    }
  };

  const handleExportPDF = () => {
    if (!selectedExam || previewSections.length === 0) return;

    generateExamPDF({
      title: selectedExam.title,
      subject: selectedExam.subject,
      topic: selectedExam.description || "",
      instructions: "",
      timeLimit: selectedExam.time_limit_minutes,
      totalMarks: selectedExam.total_marks,
      sections: previewSections
    });
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-success/10 text-success';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'hard': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (view === 'create') {
    return (
      <ExamCreator
        onExamCreated={() => setView('list')}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'preview' && selectedExam) {
    return (
      <ExamPreview
        title={selectedExam.title}
        subject={selectedExam.subject}
        topic={selectedExam.description || ""}
        instructions=""
        timeLimit={selectedExam.time_limit_minutes}
        totalMarks={selectedExam.total_marks}
        sections={previewSections}
        onBack={() => {
          setView('list');
          setSelectedExam(null);
        }}
        onExport={handleExportPDF}
        showAnswers
      />
    );
  }

  if (view === 'evaluate' && selectedExam) {
    return (
      <ExamEvaluator
        examId={selectedExam.id}
        onBack={() => {
          setView('list');
          setSelectedExam(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Exam Manager</h2>
          <p className="text-muted-foreground">Create, manage, and evaluate exams</p>
        </div>
        <Button onClick={() => setView('create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No exams created yet</p>
            <Button onClick={() => setView('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{exam.title}</h3>
                      {exam.is_published ? (
                        <Badge className="bg-success/20 text-success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {exam.description || exam.subject}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview(exam)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedExam(exam);
                        setView('evaluate');
                      }}>
                        <Users className="h-4 w-4 mr-2" />
                        Evaluate Submissions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePublish(exam)}>
                        {exam.is_published ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Publish
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteExam(exam)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4">
                  {exam.subject && (
                    <Badge variant="secondary">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {exam.subject}
                    </Badge>
                  )}
                  <Badge className={getDifficultyColor(exam.difficulty_level)}>
                    {exam.difficulty_level}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {exam.time_limit_minutes} min
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Award className="h-4 w-4" />
                    {exam.total_marks} marks
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
