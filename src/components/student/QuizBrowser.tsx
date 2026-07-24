import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Trophy, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty_level: string;
  total_questions: number;
  time_limit: number;
  is_premium: boolean;
}

interface QuizBrowserProps {
  onBack: () => void;
  onStartQuiz: (quizId: string) => void;
}

const PAGE_SIZE = 24;

export const QuizBrowser = ({ onBack, onStartQuiz }: QuizBrowserProps) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchQuizzes(0, true);

    // Realtime: refresh first page only on quiz changes to avoid heavy reloads
    const channel = supabase
      .channel('quiz-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quizzes'
        },
        () => {
          fetchQuizzes(0, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterQuizzes();
  }, [quizzes, searchTerm, subjectFilter, difficultyFilter]);

  const fetchQuizzes = async (pageIndex = 0, reset = false) => {
    try {
      if (pageIndex > 0) setLoadingMore(true);
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('quizzes')
        .select('id,title,description,subject,difficulty_level,total_questions,time_limit,is_premium')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load quizzes",
          variant: "destructive",
        });
        return;
      }

      const pageData = data || [];
      setHasMore(pageData.length === PAGE_SIZE);
      setQuizzes(prev => reset ? pageData : [...prev, ...pageData]);
      setPage(pageIndex);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };


  const filterQuizzes = () => {
    let filtered = quizzes;

    if (searchTerm) {
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (subjectFilter && subjectFilter !== "all") {
      filtered = filtered.filter(quiz => quiz.subject === subjectFilter);
    }

    if (difficultyFilter && difficultyFilter !== "all") {
      filtered = filtered.filter(quiz => quiz.difficulty_level === difficultyFilter);
    }

    setFilteredQuizzes(filtered);
  };

  const uniqueSubjects = [...new Set(quizzes.map(quiz => quiz.subject).filter(subject => subject && subject.trim() !== ''))];
  const difficultyLevels = ['beginner', 'intermediate', 'advanced'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold">Browse Quizzes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h2 className="text-2xl font-bold">Browse Quizzes</h2>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {uniqueSubjects.map(subject => (
              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {difficultyLevels.map(level => (
              <SelectItem key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => {
          setSearchTerm("");
          setSubjectFilter("all");
          setDifficultyFilter("all");
        }}>
          Clear Filters
        </Button>
      </div>

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuizzes.map(quiz => (
          <Card key={quiz.id} className="hover:shadow-elegant transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{quiz.title}</CardTitle>
                {quiz.is_premium && (
                  <Badge variant="secondary">
                    <Trophy className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              <CardDescription>{quiz.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {quiz.subject && (
                    <Badge variant="outline">{quiz.subject}</Badge>
                  )}
                  {quiz.difficulty_level && (
                    <Badge variant="outline">
                      {quiz.difficulty_level.charAt(0).toUpperCase() + quiz.difficulty_level.slice(1)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{quiz.total_questions} questions</span>
                  </div>
                  {quiz.time_limit && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{quiz.time_limit} min</span>
                    </div>
                  )}
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => onStartQuiz(quiz.id)}
                >
                  Start Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && !searchTerm && subjectFilter === "all" && difficultyFilter === "all" && filteredQuizzes.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => fetchQuizzes(page + 1, false)} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}


          {filteredQuizzes.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
          <p className="text-muted-foreground">
            {searchTerm || (subjectFilter !== "all") || (difficultyFilter !== "all")
              ? "Try adjusting your filters"
              : "Check back later for new quizzes"}
          </p>
        </div>
      )}
    </div>
  );
};