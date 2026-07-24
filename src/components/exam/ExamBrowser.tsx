import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, BookOpen, Award, Search, Play, CheckCircle } from "lucide-react";
import ExamTaker from "./ExamTaker";
import ExamResults from "./ExamResults";

interface Exam {
  id: string;
  title: string;
  subject: string;
  description: string;
  difficulty_level: string;
  time_limit_minutes: number;
  total_marks: number;
  created_at: string;
}

interface Attempt {
  id: string;
  exam_id: string;
  status: string;
  total_score: number;
  percentage: number;
  submitted_at: string;
  created_at: string;
}

interface ExamBrowserProps {
  onBack?: () => void;
}

const PAGE_SIZE = 24;

export default function ExamBrowser({ onBack }: ExamBrowserProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [viewingResultsId, setViewingResultsId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadExams(0, true);
  }, []);

  const loadExams = async (pageIndex = 0, reset = false) => {
    try {
      if (pageIndex > 0) setLoadingMore(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch a page of published exams (only fields the card needs)
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id,title,subject,description,difficulty_level,time_limit_minutes,total_marks,created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (examsError) throw examsError;
      const pageExams = examsData || [];
      setHasMore(pageExams.length === PAGE_SIZE);
      setExams(prev => reset ? pageExams : [...prev, ...pageExams]);
      setPage(pageIndex);

      // Fetch attempts only for the exams currently loaded
      const examIds = (reset ? pageExams : [...exams, ...pageExams]).map(e => e.id);
      if (examIds.length > 0) {
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('exam_attempts')
          .select('id,exam_id,status,total_score,percentage,submitted_at,created_at')
          .eq('student_id', user.id)
          .in('exam_id', examIds);

        if (attemptsError) throw attemptsError;

        const attemptsMap: Record<string, Attempt> = {};
        attemptsData?.forEach(attempt => {
          if (!attemptsMap[attempt.exam_id] ||
              new Date(attempt.created_at) > new Date(attemptsMap[attempt.exam_id].created_at)) {
            attemptsMap[attempt.exam_id] = attempt;
          }
        });
        setAttempts(attemptsMap);
      }
    } catch (error) {
      console.error("Error loading exams:", error);
      toast({
        title: "Error",
        description: "Failed to load exams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleExamComplete = (attemptId: string, score: number) => {
    setActiveExamId(null);
    setViewingResultsId(attemptId);
    loadExams(0, true); // Refresh attempts
  };


  const filteredExams = exams.filter(exam => 
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-success/10 text-success';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'hard': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (activeExamId) {
    return (
      <ExamTaker
        examId={activeExamId}
        onComplete={handleExamComplete}
        onBack={() => setActiveExamId(null)}
      />
    );
  }

  if (viewingResultsId) {
    return (
      <ExamResults
        attemptId={viewingResultsId}
        onBack={() => setViewingResultsId(null)}
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
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              ← Back
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Available Exams</h2>
            <p className="text-muted-foreground">Take exams and test your knowledge</p>
          </div>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? "No exams match your search" : "No exams available yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map(exam => {
            const attempt = attempts[exam.id];
            const isCompleted = attempt?.status === 'submitted' || attempt?.status === 'evaluated';
            
            return (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-1">{exam.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {exam.description || exam.subject}
                      </CardDescription>
                    </div>
                    {isCompleted && (
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {exam.subject && (
                      <Badge variant="secondary">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {exam.subject}
                      </Badge>
                    )}
                    <Badge className={getDifficultyColor(exam.difficulty_level)}>
                      {exam.difficulty_level}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {exam.time_limit_minutes} min
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      {exam.total_marks} marks
                    </div>
                  </div>

                  {isCompleted ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Your Score:</span>
                        <span className="font-bold">
                          {attempt.total_score}/{exam.total_marks} ({Math.round(attempt.percentage)}%)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setViewingResultsId(attempt.id)}
                        >
                          View Results
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => setActiveExamId(exam.id)}
                        >
                          Retake
                        </Button>
                      </div>
                    </div>
                  ) : attempt?.status === 'in_progress' ? (
                    <Button
                      className="w-full"
                      onClick={() => setActiveExamId(exam.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Continue Exam
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => setActiveExamId(exam.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Exam
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {hasMore && !searchQuery && filteredExams.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => loadExams(page + 1, false)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

    </div>
  );
}
