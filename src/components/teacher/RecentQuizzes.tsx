import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty_level: string;
  is_published: boolean;
  total_questions: number;
  created_at: string;
  updated_at: string;
}

interface RecentQuizzesProps {
  onEditQuiz: (quiz: Quiz) => void;
}

export const RecentQuizzes = ({ onEditQuiz }: RecentQuizzesProps) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentQuizzes();
  }, []);

  const fetchRecentQuizzes = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('teacher_id', user.user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error("Failed to load recent quizzes");
    } finally {
      setLoading(false);
    }
  };

  const togglePublishStatus = async (quiz: Quiz) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: !quiz.is_published })
        .eq('id', quiz.id);

      if (error) throw error;
      
      setQuizzes(quizzes.map(q => 
        q.id === quiz.id ? { ...q, is_published: !q.is_published } : q
      ));
      
      toast.success(`Quiz ${!quiz.is_published ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error("Failed to update quiz status");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Quizzes</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Quizzes</CardTitle>
        <CardDescription>Manage your recent quiz activities</CardDescription>
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <p className="text-muted-foreground">No quizzes created yet. Start by creating your first quiz!</p>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-muted-foreground text-sm mt-1">{quiz.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {quiz.subject && (
                        <Badge variant="secondary">{quiz.subject}</Badge>
                      )}
                      {quiz.difficulty_level && (
                        <Badge variant="outline">{quiz.difficulty_level}</Badge>
                      )}
                      <Badge variant={quiz.is_published ? "default" : "secondary"}>
                        {quiz.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {quiz.total_questions} questions
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(quiz.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditQuiz(quiz)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant={quiz.is_published ? "secondary" : "default"}
                      size="sm"
                      onClick={() => togglePublishStatus(quiz)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {quiz.is_published ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};