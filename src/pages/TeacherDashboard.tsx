import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, MessageSquare, Play, Users, Plus, ScanLine, ArrowLeft } from "lucide-react";
import { QuizBuilder } from "@/components/teacher/QuizBuilder";
import { RecentQuizzes } from "@/components/teacher/RecentQuizzes";
import { CompetitionCreator } from "@/components/teacher/CompetitionCreator";
import { TeacherChat } from "@/components/teacher/TeacherChat";
import { CourseCreator } from "@/components/teacher/CourseCreator";
import { CourseManager } from "@/components/teacher/CourseManager";
import { AIQuestionGenerator } from "@/components/teacher/AIQuestionGenerator";
import { MCQScanner } from "@/components/teacher/MCQScanner";

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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Welcome Section */}
      <div className="bg-gradient-subtle rounded-lg p-4 sm:p-6 text-white">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 text-indigo-500">Welcome back, Teacher! 👨‍🏫</h2>
        <p className="text-sm sm:text-base text-indigo-400">Shape the future of education with your expertise</p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-3">
        <div className="lg:col-span-2 xl:col-span-2 order-2 lg:order-1">
          <RecentQuizzes onEditQuiz={handleEditQuiz} />
        </div>
        
        <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('quiz')}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <CardTitle className="text-lg sm:text-xl">Create Quiz</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Design interactive quizzes for your students
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full text-sm sm:text-base" onClick={(e) => { e.stopPropagation(); setActiveView('quiz'); }}>
                Create New Quiz
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('competition')}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                <CardTitle className="text-lg sm:text-xl">Organize Competition</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Host study competitions for students
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" className="w-full text-sm sm:text-base" onClick={(e) => { e.stopPropagation(); setActiveView('competition'); }}>
                Create Competition
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('chat')}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-6 w-6 text-secondary" />
                <CardTitle>Teacher Chat</CardTitle>
              </div>
              <CardDescription>
                Connect with fellow educators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full" onClick={(e) => { e.stopPropagation(); setActiveView('chat'); }}>
                Join Discussion
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('course-manager')}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Play className="h-6 w-6 text-primary" />
                <CardTitle>Manage Courses</CardTitle>
              </div>
              <CardDescription>
                Create and manage your online courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); setActiveView('course-manager'); }}>
                Course Manager
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => setActiveView('mcq-scanner')}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <ScanLine className="h-6 w-6 text-primary" />
                <CardTitle>Grade Sheets</CardTitle>
              </div>
              <CardDescription>
                Scan and grade multiple-choice answer sheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); setActiveView('mcq-scanner'); }}>
                Start Grading
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-shadow cursor-pointer bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20" onClick={() => setActiveView('ai-questions')}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <CardTitle>AI Question Generator</CardTitle>
              </div>
              <CardDescription>
                Generate questions from books and documents using AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={(e) => { e.stopPropagation(); setActiveView('ai-questions'); }}>
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