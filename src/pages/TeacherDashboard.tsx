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
      case 'analytics':
        return <ClassAnalytics onCreateRemedial={() => setActiveView('ai-questions')} />;
      case 'exams':
        return <RecentQuizzes onEditQuiz={handleEditQuiz} />;
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
    <div className="space-y-4">
      <TeacherHome userProfile={userProfile} onNavigate={(view) => setActiveView(view)} />
      <RecentQuizzes onEditQuiz={handleEditQuiz} />
    </div>
  );
};

export default TeacherDashboard;
