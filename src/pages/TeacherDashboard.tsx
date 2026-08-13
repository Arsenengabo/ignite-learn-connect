import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { QuizBuilder } from "@/components/teacher/QuizBuilder";
import { RecentQuizzes } from "@/components/teacher/RecentQuizzes";
import { CompetitionCreator } from "@/components/teacher/CompetitionCreator";
import { TeacherChat } from "@/components/teacher/TeacherChat";
import { CourseCreator } from "@/components/teacher/CourseCreator";
import { CourseManager } from "@/components/teacher/CourseManager";
import { AIQuestionGenerator } from "@/components/teacher/AIQuestionGenerator";
import { MCQScanner } from "@/components/teacher/MCQScanner";
import { AnswerSheetGenerator } from "@/components/teacher/AnswerSheetGenerator";
import { TeacherHome } from "@/components/teacher/TeacherHome";
import { ClassAnalytics } from "@/components/teacher/ClassAnalytics";
import { useOptionalAppNav } from "@/contexts/AppNavContext";

/** Bottom-nav tab -> dashboard view */
const TAB_TO_VIEW: Record<string, string | null> = {
  home: null,
  classes: "course-manager",
  exams: "exams",
  analytics: "analytics",
  profile: null,
};

const TeacherDashboard = ({ userProfile }: { userProfile?: any }) => {
  const nav = useOptionalAppNav();
  const [activeView, setActiveView] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [editingCourse, setEditingCourse] = useState<any>(null);

  const activeTab = nav?.activeTab;
  const isTeacherView = nav ? nav.viewRole !== "student" : true;

  useEffect(() => {
    if (!activeTab || !isTeacherView) return;
    if (activeTab in TAB_TO_VIEW) {
      setActiveView(TAB_TO_VIEW[activeTab]);
    }
  }, [activeTab, isTeacherView]);


  const handleEditQuiz = (quiz: any) => {
    setEditingQuiz(quiz);
    setActiveView('quiz');
  };

  const handleQuizSaved = () => {
    setActiveView(null);
    setEditingQuiz(null);
  };

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    setActiveView('course');
  };

  const handleCourseSaved = () => {
    setActiveView('course-manager');
    setEditingCourse(null);
  };

  const handleBackToDashboard = () => {
    setActiveView(null);
    setEditingQuiz(null);
    setEditingCourse(null);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'quiz':
        return (
          <QuizBuilder 
            editingQuiz={editingQuiz} 
            onQuizSaved={handleQuizSaved}
            onBack={handleBackToDashboard}
          />
        );
      case 'competition':
        return <CompetitionCreator />;
      case 'chat':
        return <TeacherChat />;
      case 'course':
        return <CourseCreator editingCourse={editingCourse} onCourseSaved={handleCourseSaved} />;
      case 'course-manager':
        return <CourseManager onEditCourse={handleEditCourse} onCreateNew={() => setActiveView('course')} />;
      case 'ai-questions':
        return <AIQuestionGenerator />;
      case 'mcq-scanner':
        return <MCQScanner />;
      case 'answer-generator':
        return <AnswerSheetGenerator />;
      default:
        return null;
    }
  };

  if (activeView) {
    return (
      <div className="space-y-6">
        <Button 
          onClick={handleBackToDashboard}
          variant="outline" 
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        {renderActiveView()}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6">
      {/* Welcome Section */}
      <div className="bg-gradient-subtle rounded-lg p-3 sm:p-4 lg:p-6 text-white mb-3 sm:mb-4 lg:mb-6">
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold mb-1 sm:mb-2 text-indigo-500">Welcome back, Teacher! 👨‍🏫</h2>
        <p className="text-[10px] xs:text-xs sm:text-sm lg:text-base text-indigo-400">Shape the future of education with your expertise</p>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <RecentQuizzes onEditQuiz={handleEditQuiz} />
        </div>
        
        <div className="space-y-2 sm:space-y-3 lg:space-y-4 order-1 lg:order-2">
          {/* Create Quiz Card */}
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('quiz')}>
            <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
                <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Create Quiz</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">
                Design interactive quizzes for your students
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <Button className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={(e) => { e.stopPropagation(); setActiveView('quiz'); }}>
                Create New Quiz
              </Button>
            </CardContent>
          </Card>

          {/* Organize Competition Card */}
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('competition')}>
            <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-accent flex-shrink-0" />
                <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Organize Competition</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">
                Host study competitions for students
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <Button variant="outline" className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={(e) => { e.stopPropagation(); setActiveView('competition'); }}>
                Create Competition
              </Button>
            </CardContent>
          </Card>

          {/* Teacher Chat Card */}
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('chat')}>
            <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-secondary flex-shrink-0" />
                <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Teacher Chat</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">
                Connect with fellow educators
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <Button variant="secondary" className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={(e) => { e.stopPropagation(); setActiveView('chat'); }}>
                Join Discussion
              </Button>
            </CardContent>
          </Card>

          {/* Manage Courses Card */}
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('course-manager')}>
            <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
              <div className="flex items-center space-x-2">
                <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
                <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Manage Courses</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">
                Create and manage your online courses
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <Button variant="outline" className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={(e) => { e.stopPropagation(); setActiveView('course-manager'); }}>
                Course Manager
              </Button>
            </CardContent>
          </Card>

          {/* Create Answer Sheet Card */}
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('answer-generator')}>
            <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
                <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Create Answer Sheet</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">
                Generate optimized OMR answer sheets
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <Button variant="outline" className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={(e) => { e.stopPropagation(); setActiveView('answer-generator'); }}>
                Generate Sheet
              </Button>
            </CardContent>
          </Card>

          {/* Grade Sheets Card */}
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('mcq-scanner')}>
            <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
              <div className="flex items-center space-x-2">
                <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
                <CardTitle className="text-sm sm:text-base lg:text-xl truncate">Grade Sheets</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">
                Scan and grade multiple-choice answer sheets
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <Button variant="outline" className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={(e) => { e.stopPropagation(); setActiveView('mcq-scanner'); }}>
                Start Grading
              </Button>
            </CardContent>
          </Card>

          {/* AI Question Generator Card */}
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20" onClick={() => setActiveView('ai-questions')}>
            <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
                <CardTitle className="text-sm sm:text-base lg:text-xl truncate">AI Question Generator</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">
                Generate questions from books using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <Button className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10" onClick={(e) => { e.stopPropagation(); setActiveView('ai-questions'); }}>
                Try AI Generator
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;