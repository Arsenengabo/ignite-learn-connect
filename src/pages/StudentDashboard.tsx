import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, MessageSquare, Play, Star, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuizBrowser } from "@/components/student/QuizBrowser";
import { QuizTaker } from "@/components/student/QuizTaker";
import { CompetitionBrowser } from "@/components/student/CompetitionBrowser";
import { CourseBrowser } from "@/components/student/CourseBrowser";
import { CourseViewer } from "@/components/student/CourseViewer";
import ExamBrowser from "@/components/exam/ExamBrowser";

export const StudentDashboard = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'quizzes' | 'quiz-taking' | 'competitions' | 'courses' | 'course-viewing' | 'exams'>('dashboard');
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
  return <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-subtle rounded-lg p-3 sm:p-4 lg:p-6 text-white">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 text-indigo-500">Welcome back, Student! 🎓</h2>
        <p className="text-xs sm:text-sm lg:text-base text-indigo-400">Ready to continue your learning journey?</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] xs:text-xs sm:text-sm font-medium text-muted-foreground truncate">Quizzes Taken</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold">{stats.quizzesTaken}</p>
              </div>
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 lg:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] xs:text-xs sm:text-sm font-medium text-muted-foreground truncate">Competitions</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold">{stats.competitions}</p>
              </div>
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-accent flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 lg:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] xs:text-xs sm:text-sm font-medium text-muted-foreground truncate">Courses</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold">{stats.courses}</p>
              </div>
              <Play className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-secondary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 lg:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] xs:text-xs sm:text-sm font-medium text-muted-foreground truncate">Avg Score</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold">{stats.avgScore}%</p>
              </div>
              <Star className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Features */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
              <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Take Quizzes</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm line-clamp-2">
              Test your knowledge with interactive quizzes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <Button className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={() => setCurrentView('quizzes')}>
              Browse Quizzes
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
              <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Online Exams</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm line-clamp-2">
              Take exams created by your teachers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <Button variant="outline" className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={() => setCurrentView('exams')}>
              Browse Exams
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-accent flex-shrink-0" />
              <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Competitions</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm line-clamp-2">
              Join study competitions and win prizes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <Button variant="outline" className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={() => setCurrentView('competitions')}>
              Join Competition
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-secondary flex-shrink-0" />
              <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Student Chat</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm line-clamp-2">
              Connect with students from other schools
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <Button variant="secondary" className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10">
              Start Chatting
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
              <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Online Courses</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm line-clamp-2">
              Access teacher-created course content
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <Button variant="outline" className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={() => setCurrentView('courses')}>
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      </div>

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
    </div>;
};