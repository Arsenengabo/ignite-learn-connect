import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, MessageSquare, Play, Star, FileText, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuizBrowser } from "@/components/student/QuizBrowser";
import { QuizTaker } from "@/components/student/QuizTaker";
import { CompetitionBrowser } from "@/components/student/CompetitionBrowser";
import { CourseBrowser } from "@/components/student/CourseBrowser";
import { CourseViewer } from "@/components/student/CourseViewer";
import ExamBrowser from "@/components/exam/ExamBrowser";
import { MentorDirectory } from "@/components/student/MentorDirectory";

export const StudentDashboard = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'quizzes' | 'quiz-taking' | 'competitions' | 'courses' | 'course-viewing' | 'exams' | 'mentors'>('dashboard');
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [stats, setStats] = useState({
    quizzesTaken: 0,
    competitions: 0,
    courses: 0,
    avgScore: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscriptions
    const quizChannel = supabase
      .channel('quiz-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions'
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const courseChannel = supabase
      .channel('course-progress-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_progress'
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(quizChannel);
      supabase.removeChannel(courseChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch quiz statistics
      const { data: sessions } = await supabase
        .from('quiz_sessions')
        .select('*, quizzes(title, subject)')
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      // Fetch course progress
      const { data: courseProgress } = await supabase
        .from('course_progress')
        .select('*, courses(title, subject)')
        .eq('student_id', user.id)
        .order('updated_at', { ascending: false });

      const quizzesTaken = sessions?.length || 0;
      const totalScore = sessions?.reduce((sum, session) => sum + (session.score || 0), 0) || 0;
      const totalPossible = sessions?.reduce((sum, session) => sum + (session.total_questions || 0), 0) || 0;
      const avgScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

      // Count completed courses
      const completedCourses = courseProgress?.filter(progress => progress.completed_at)?.length || 0;

      setStats({
        quizzesTaken,
        competitions: 0, // TODO: Implement when competition participation is ready
        courses: completedCourses,
        avgScore
      });

      // Combine recent activity from quizzes and courses
      const quizActivity = sessions?.slice(0, 2).map(session => ({
        id: session.id,
        type: 'quiz',
        title: session.quizzes?.title || 'Quiz',
        subject: session.quizzes?.subject,
        completed_at: session.completed_at,
        score: session.score,
        total_questions: session.total_questions
      })) || [];

      const courseActivity = courseProgress?.filter(progress => progress.completed_at)
        .slice(0, 2).map(progress => ({
          id: progress.id,
          type: 'course',
          title: progress.courses?.title || 'Course',
          subject: progress.courses?.subject,
          completed_at: progress.completed_at,
          progress_percentage: progress.progress_percentage
        })) || [];

      // Combine and sort by completion date
      const allActivity = [...quizActivity, ...courseActivity]
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
        .slice(0, 3);

      setRecentActivity(allActivity);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleStartQuiz = (quizId: string) => {
    setSelectedQuizId(quizId);
    setCurrentView('quiz-taking');
  };

  const handleQuizComplete = () => {
    setCurrentView('dashboard');
    fetchDashboardData();
  };

  const handleStartCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentView('course-viewing');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  if (currentView === 'quizzes') {
    return <QuizBrowser onBack={() => setCurrentView('dashboard')} onStartQuiz={handleStartQuiz} />;
  }

  if (currentView === 'quiz-taking') {
    return <QuizTaker quizId={selectedQuizId} onBack={() => setCurrentView('quizzes')} onComplete={handleQuizComplete} />;
  }

  if (currentView === 'competitions') {
    return <CompetitionBrowser onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'courses') {
    return <CourseBrowser onBack={() => setCurrentView('dashboard')} onStartCourse={handleStartCourse} />;
  }

  if (currentView === 'course-viewing') {
    return <CourseViewer courseId={selectedCourseId} onBack={() => setCurrentView('courses')} />;
  }

  if (currentView === 'exams') {
    return <ExamBrowser onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'mentors') {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setCurrentView('dashboard')} className="min-h-[44px]">
          Back to Dashboard
        </Button>
        <MentorDirectory />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <StudentHome
        userProfile={userProfile}
        stats={stats}
        onNavigate={(view) => setCurrentView(view as any)}
      />

      {/* Recent Activity */}
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="text-base sm:text-lg lg:text-xl">Recent Activity</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your latest learning activities</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    {activity.type === 'course' ? (
                      <Play className="h-4 w-4 sm:h-5 sm:w-5 text-secondary flex-shrink-0" />
                    ) : (
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs sm:text-sm lg:text-base truncate">{activity.title}</p>
                      <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                        {activity.type === 'course' ? 'Course completed' : 'Quiz completed'} {formatTimeAgo(activity.completed_at)}
                      </p>
                      {activity.subject && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs mt-1">{activity.subject}</Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs lg:text-sm flex-shrink-0">
                    {activity.type === 'course'
                      ? `${Math.round(activity.progress_percentage)}%`
                      : `${Math.round((activity.score / activity.total_questions) * 100)}%`
                    }
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 sm:py-6 text-muted-foreground">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">No recent activity</p>
                <p className="text-xs sm:text-sm">Take a quiz to get started!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
