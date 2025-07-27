import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, MessageSquare, Play, Users, Plus, ScanLine, ArrowLeft } from "lucide-react";
import { QuizBuilder } from "@/components/teacher/QuizBuilder";
import { CompetitionCreator } from "@/components/teacher/CompetitionCreator";
import { TeacherChat } from "@/components/teacher/TeacherChat";
import { CourseCreator } from "@/components/teacher/CourseCreator";
import { AIQuestionGenerator } from "@/components/teacher/AIQuestionGenerator";
import { MCQScanner } from "@/components/teacher/MCQScanner";
export const TeacherDashboard = () => {
  return <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-subtle rounded-lg p-6 text-white">
        <h2 className="text-3xl font-bold mb-2 text-indigo-500">Welcome back, Teacher! 👨‍🏫</h2>
        <p className="text-indigo-400">Shape the future of education with your expertise</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Quizzes</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Competitions</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <Trophy className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">156</p>
              </div>
              <Users className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Courses</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <Play className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Plus className="h-6 w-6 text-primary" />
              <CardTitle>Create Quiz</CardTitle>
            </div>
            <CardDescription>
              Design interactive quizzes for your students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Create New Quiz
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-accent" />
              <CardTitle>Organize Competition</CardTitle>
            </div>
            <CardDescription>
              Host study competitions for students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Create Competition
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
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
            <Button variant="secondary" className="w-full">
              Join Discussion
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Play className="h-6 w-6 text-primary" />
              <CardTitle>Create Course</CardTitle>
            </div>
            <CardDescription>
              Develop comprehensive online courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              New Course
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
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
            <Button variant="outline" className="w-full">
              Start Grading
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
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
            <Button className="w-full">
              Try AI Generator
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest teaching activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Biology Quiz #12</p>
                  <p className="text-sm text-muted-foreground">Created 1 hour ago</p>
                </div>
              </div>
              <Badge variant="secondary">15 responses</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Trophy className="h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">Chemistry Competition</p>
                  <p className="text-sm text-muted-foreground">Started yesterday</p>
                </div>
              </div>
              <Badge>45 participants</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Play className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Advanced Physics Course</p>
                  <p className="text-sm text-muted-foreground">Updated 2 days ago</p>
                </div>
              </div>
              <Badge variant="outline">67 enrolled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};