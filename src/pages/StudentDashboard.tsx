import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, MessageSquare, Play, Star } from "lucide-react";

export const StudentDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-subtle rounded-lg p-6 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, Student! 🎓</h2>
        <p className="text-white/80">Ready to continue your learning journey?</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quizzes Taken</p>
                <p className="text-2xl font-bold">12</p>
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
                <p className="text-2xl font-bold">3</p>
              </div>
              <Trophy className="h-8 w-8 text-accent" />
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
              <Play className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
              <Star className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <CardTitle>Take Quizzes</CardTitle>
            </div>
            <CardDescription>
              Test your knowledge with interactive quizzes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Browse Quizzes
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-accent" />
              <CardTitle>Competitions</CardTitle>
            </div>
            <CardDescription>
              Join study competitions and win prizes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Join Competition
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-6 w-6 text-secondary" />
              <CardTitle>Student Chat</CardTitle>
            </div>
            <CardDescription>
              Connect with students from other schools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full">
              Start Chatting
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Play className="h-6 w-6 text-primary" />
              <CardTitle>Online Courses</CardTitle>
            </div>
            <CardDescription>
              Access teacher-created course content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest learning activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Mathematics Quiz #5</p>
                  <p className="text-sm text-muted-foreground">Completed 2 hours ago</p>
                </div>
              </div>
              <Badge variant="secondary">92%</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Trophy className="h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">Science Competition</p>
                  <p className="text-sm text-muted-foreground">Joined yesterday</p>
                </div>
              </div>
              <Badge>Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Play className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Physics Course - Chapter 3</p>
                  <p className="text-sm text-muted-foreground">Started 3 days ago</p>
                </div>
              </div>
              <Badge variant="outline">In Progress</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};