import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, EyeOff, Users, Clock, BookOpen, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty_level: string;
  is_published: boolean;
  is_premium: boolean;
  price: number;
  duration_weeks: number;
  thumbnail_url: string;
  created_at: string;
  updated_at: string;
  enrollment_count?: number;
}

interface CourseManagerProps {
  onEditCourse: (course: Course) => void;
  onCreateNew: () => void;
}

export const CourseManager = ({ onEditCourse, onCreateNew }: CourseManagerProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', user.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const togglePublishStatus = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id);

      if (error) throw error;
      
      setCourses(courses.map(c => 
        c.id === course.id ? { ...c, is_published: !c.is_published } : c
      ));
      
      toast.success(`Course ${!course.is_published ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error("Failed to update course status");
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading courses...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Course Management</CardTitle>
            <CardDescription>Manage your created courses and track performance</CardDescription>
          </div>
          <Button onClick={onCreateNew}>
            <BookOpen className="w-4 h-4 mr-2" />
            Create New Course
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No courses created yet</p>
            <Button onClick={onCreateNew}>Create Your First Course</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {courses.map((course) => (
              <div key={course.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {course.thumbnail_url && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                        {course.description && (
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{course.description}</p>
                        )}
                        
                        <div className="flex items-center gap-2 mb-3">
                          {course.subject && (
                            <Badge variant="secondary">{course.subject}</Badge>
                          )}
                          {course.difficulty_level && (
                            <Badge className={getDifficultyColor(course.difficulty_level)}>
                              {course.difficulty_level}
                            </Badge>
                          )}
                          <Badge variant={course.is_published ? "default" : "secondary"}>
                            {course.is_published ? "Published" : "Draft"}
                          </Badge>
                          {course.is_premium && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                              Premium
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.duration_weeks} weeks
                          </div>
                          {course.price > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${course.price}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {course.enrollment_count || 0} enrolled
                          </div>
                          <div>
                            Updated: {new Date(course.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditCourse(course)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant={course.is_published ? "secondary" : "default"}
                          size="sm"
                          onClick={() => togglePublishStatus(course)}
                        >
                          {course.is_published ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-1" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Publish
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
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