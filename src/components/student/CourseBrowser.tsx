import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, BookOpen, Trophy, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty_level: string;
  duration_weeks: number;
  price: number;
  thumbnail_url: string;
  is_premium: boolean;
}

interface CourseBrowserProps {
  onBack: () => void;
  onStartCourse: (courseId: string) => void;
}

const PAGE_SIZE = 24;

export const CourseBrowser = ({ onBack, onStartCourse }: CourseBrowserProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses(0, true);

    const channel = supabase
      .channel('course-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses'
        },
        () => {
          fetchCourses(0, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCourses = async (pageIndex = 0, reset = false) => {
    try {
      if (pageIndex > 0) setLoadingMore(true);
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('courses')
        .select('id,title,description,subject,difficulty_level,duration_weeks,price,thumbnail_url,is_premium')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load courses",
          variant: "destructive",
        });
        return;
      }

      const pageData = data || [];
      setHasMore(pageData.length === PAGE_SIZE);
      setCourses(prev => reset ? pageData : [...prev, ...pageData]);
      setPage(pageIndex);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => fetchCourses(page + 1, false);


  const handleEnrollCourse = (courseId: string) => {
    onStartCourse(courseId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold">Online Courses</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg"></div>
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
        <h2 className="text-2xl font-bold">Online Courses</h2>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <Card key={course.id} className="hover:shadow-elegant transition-shadow overflow-hidden">
            {course.thumbnail_url ? (
              <div className="h-48 bg-muted relative">
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-48 bg-gradient-subtle flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-white/20" />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{course.title}</CardTitle>
                {course.is_premium && (
                  <Badge variant="secondary">
                    <Trophy className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              <CardDescription>{course.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {course.subject && (
                    <Badge variant="secondary">{course.subject}</Badge>
                  )}
                  {course.difficulty_level && (
                    <Badge 
                      variant="outline"
                      className={
                        course.difficulty_level.toLowerCase() === 'beginner' ? 'border-green-500 text-green-700' :
                        course.difficulty_level.toLowerCase() === 'intermediate' ? 'border-yellow-500 text-yellow-700' :
                        'border-red-500 text-red-700'
                      }
                    >
                      {course.difficulty_level.charAt(0).toUpperCase() + course.difficulty_level.slice(1)}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  {course.duration_weeks && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration_weeks} weeks</span>
                    </div>
                  )}
                  <div className="flex items-center justify-end">
                    {course.price > 0 ? (
                      <span className="font-semibold text-primary">${course.price}</span>
                    ) : (
                      <span className="font-semibold text-green-600">Free</span>
                    )}
                  </div>
                </div>

                <Button 
                  className="w-full flex items-center justify-center space-x-2" 
                  onClick={() => handleEnrollCourse(course.id)}
                  variant={course.price > 0 ? "default" : "secondary"}
                >
                  <Play className="h-4 w-4" />
                  <span>{course.price > 0 ? 'Enroll Now' : 'Start Free Course'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && courses.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}


      {courses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No courses available</h3>
          <p className="text-muted-foreground">
            Check back later for new learning opportunities!
          </p>
        </div>
      )}
    </div>
  );
};