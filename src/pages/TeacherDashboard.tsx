import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, MessageSquare, Play, Users, Plus, ScanLine, ArrowLeft, FileText } from "lucide-react";
import { QuizBuilder } from "@/components/teacher/QuizBuilder";
import { RecentQuizzes } from "@/components/teacher/RecentQuizzes";
import { CompetitionCreator } from "@/components/teacher/CompetitionCreator";
import { TeacherChat } from "@/components/teacher/TeacherChat";
import { CourseCreator } from "@/components/teacher/CourseCreator";
import { CourseManager } from "@/components/teacher/CourseManager";
import { AIQuestionGenerator } from "@/components/teacher/AIQuestionGenerator";
import { MCQScanner } from "@/components/teacher/MCQScanner";
import { AnswerSheetGenerator } from "@/components/teacher/AnswerSheetGenerator";

const TeacherDashboard = () => {
  const [activeView, setActiveView] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [editingCourse, setEditingCourse] = useState<any>(null);

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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Button
          onClick={handleBackToDashboard}
          variant="outline"
          className="flex items-center gap-2 transition-transform hover:-translate-x-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        {renderActiveView()}
      </div>
    );
  }

  // Config-driven cards so every card gets identical animation/hover
  // treatment and stagger timing without repeating the classes 7 times.
  const actionCards = [
    {
      key: 'quiz',
      icon: Plus,
      iconClass: 'text-primary',
      title: 'Create Quiz',
      description: 'Design interactive quizzes for your students',
      buttonLabel: 'Create New Quiz',
      buttonVariant: 'default' as const,
    },
    {
      key: 'competition',
      icon: Trophy,
      iconClass: 'text-accent',
      title: 'Organize Competition',
      description: 'Host study competitions for students',
      buttonLabel: 'Create Competition',
      buttonVariant: 'outline' as const,
    },
    {
      key: 'chat',
      icon: MessageSquare,
      iconClass: 'text-secondary',
      title: 'Teacher Chat',
      description: 'Connect with fellow educators',
      buttonLabel: 'Join Discussion',
      buttonVariant: 'secondary' as const,
    },
    {
      key: 'course-manager',
      icon: Play,
      iconClass: 'text-primary',
      title: 'Manage Courses',
      description: 'Create and manage your online courses',
      buttonLabel: 'Course Manager',
      buttonVariant: 'outline' as const,
    },
    {
      key: 'answer-generator',
      icon: FileText,
      iconClass: 'text-primary',
      title: 'Create Answer Sheet',
      description: 'Generate optimized OMR answer sheets',
      buttonLabel: 'Generate Sheet',
      buttonVariant: 'outline' as const,
    },
    {
      key: 'mcq-scanner',
      icon: ScanLine,
      iconClass: 'text-primary',
      title: 'Grade Sheets',
      description: 'Scan and grade multiple-choice answer sheets',
      buttonLabel: 'Start Grading',
      buttonVariant: 'outline' as const,
    },
  ];

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6">
      {/* Welcome Section */}
      <div className="bg-gradient-subtle rounded-lg p-3 sm:p-4 lg:p-6 text-white mb-3 sm:mb-4 lg:mb-6 animate-in fade-in slide-in-from-top-3 duration-500">
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold mb-1 sm:mb-2 text-indigo-500">
          Welcome back, Teacher! 👨‍🏫
        </h2>
        <p className="text-[10px] xs:text-xs sm:text-sm lg:text-base text-indigo-400">
          Shape the future of education with your expertise
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 order-2 lg:order-1 animate-in fade-in slide-in-from-left-3 duration-500 [animation-delay:150ms] [animation-fill-mode:backwards]">
          <RecentQuizzes onEditQuiz={handleEditQuiz} />
        </div>

        <div className="space-y-2 sm:space-y-3 lg:space-y-4 order-1 lg:order-2">
          {actionCards.map(({ key, icon: Icon, iconClass, title, description, buttonLabel, buttonVariant }, index) => (
            <Card
              key={key}
              className="hover:shadow-elegant hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 ease-out cursor-pointer animate-in fade-in slide-in-from-right-3 [animation-fill-mode:backwards]"
              style={{ animationDelay: `${index * 80}ms`, animationDuration: '450ms' }}
              onClick={() => setActiveView(key)}
            >
              <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
                <div className="flex items-center space-x-2 group">
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 ${iconClass} flex-shrink-0 transition-transform duration-300 group-hover:scale-110`} />
                  <CardTitle className="text-sm sm:text-base lg:text-xl truncate">{title}</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm line-clamp-2">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <Button
                  variant={buttonVariant}
                  className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10 transition-transform active:scale-95"
                  onClick={(e) => { e.stopPropagation(); setActiveView(key); }}
                >
                  {buttonLabel}
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* AI Question Generator Card — kept separate for its distinct
              gradient styling + ambient glow treatment */}
          <Card
            className="relative overflow-hidden hover:shadow-elegant hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 ease-out cursor-pointer bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 animate-in fade-in slide-in-from-right-3 [animation-fill-mode:backwards]"
            style={{ animationDelay: `${actionCards.length * 80}ms`, animationDuration: '450ms' }}
            onClick={() => setActiveView('ai-questions')}
          >
            {/* Subtle ambient glow behind the icon to signal "AI-powered"
                without being distracting -- a soft pulse, not a flash. */}
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl animate-pulse [animation-duration:3s]" />

            <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3 relative">
              <div className="flex items-center space-x-2 group">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <CardTitle className="text-sm sm:text-base lg:text-xl truncate">AI Question Generator</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">
                Generate questions from books using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 relative">
              <Button
                className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10 transition-transform active:scale-95"
                onClick={(e) => { e.stopPropagation(); setActiveView('ai-questions'); }}
              >
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
