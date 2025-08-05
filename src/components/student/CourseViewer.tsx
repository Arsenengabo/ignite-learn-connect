import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, CheckCircle, Clock, FileText, Video, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

// Video Player Component
const VideoPlayer = ({ contentUrl }: { contentUrl: string }) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const getVideoUrl = async () => {
      try {
        // Extract the file path from the full URL
        const urlParts = contentUrl.split('/course-content/');
        const filePath = urlParts[1];
        
        if (!filePath) {
          setError('Invalid video URL');
          setLoading(false);
          return;
        }

        const { data } = await supabase.storage
          .from('course-content')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (data?.signedUrl) {
          setVideoUrl(data.signedUrl);
        } else {
          setError('Failed to load video');
        }
      } catch (err) {
        console.error('Error loading video:', err);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    if (contentUrl) {
      getVideoUrl();
    }
  }, [contentUrl]);

  if (loading) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Video className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Video className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error || 'Video not available'}</p>
          <p className="text-xs text-muted-foreground">Path: {contentUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <video 
        controls 
        className="w-full h-full"
        src={videoUrl}
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

// Document Viewer Component
const DocumentViewer = ({ contentUrl }: { contentUrl: string }) => {
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const getDocumentUrl = async () => {
      try {
        // Extract the file path from the full URL
        const urlParts = contentUrl.split('/course-content/');
        const filePath = urlParts[1];
        
        if (!filePath) {
          setError('Invalid document URL');
          setLoading(false);
          return;
        }

        const { data } = await supabase.storage
          .from('course-content')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (data?.signedUrl) {
          setDocumentUrl(data.signedUrl);
        } else {
          setError('Failed to load document');
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    if (contentUrl) {
      getDocumentUrl();
    }
  }, [contentUrl]);

  if (loading) {
    return (
      <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !documentUrl) {
    return (
      <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error || 'Document not available'}</p>
          <p className="text-xs text-muted-foreground">Path: {contentUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span className="font-medium">Course Document</span>
        </div>
        <Button asChild size="sm">
          <a href={documentUrl} target="_blank" rel="noopener noreferrer">
            Open Document
          </a>
        </Button>
      </div>
      <iframe 
        src={documentUrl} 
        className="w-full h-96 border rounded"
        title="Course Document"
      />
    </div>
  );
};

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
  teacher_id: string;
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  content_type: string;
  content_url: string;
  duration_minutes: number;
  order_index: number;
}

interface CourseViewerProps {
  courseId: string;
  onBack: () => void;
}

export const CourseViewer = ({ courseId, onBack }: CourseViewerProps) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourseData();
    loadCourseProgress();
  }, [courseId]);

  // Set up real-time subscription for course progress
  useEffect(() => {
    const channel = supabase
      .channel('course-progress-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_progress',
          filter: `course_id=eq.${courseId}`
        },
        (payload) => {
          console.log('Course progress changed:', payload);
          loadCourseProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  const loadCourseProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: progressData, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (progressData) {
        setCourseProgress(progressData);
        // Set completed modules based on stored progress
        setCompletedModules(new Set());
      }
    } catch (error) {
      console.error('Error loading course progress:', error);
    }
  };

  const fetchCourseData = async () => {
    try {
      setLoading(true);

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('is_published', true)
        .single();

      if (courseError) {
        toast({
          title: "Error",
          description: "Failed to load course",
          variant: "destructive",
        });
        return;
      }

      setCourse(courseData);

      // Fetch course modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('order_index');

      if (modulesError) {
        toast({
          title: "Error",
          description: "Failed to load course modules",
          variant: "destructive",
        });
        return;
      }

      setModules(modulesData || []);

      // Initialize course progress if not exists
      if (modulesData && modulesData.length > 0) {
        await initializeCourseProgress(modulesData.length);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeCourseProgress = async (totalModules: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if progress already exists
      const { data: existingProgress } = await supabase
        .from('course_progress')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .single();

      // Only create if doesn't exist
      if (!existingProgress) {
        const { error } = await supabase
          .from('course_progress')
          .insert({
            student_id: user.id,
            course_id: courseId,
            total_modules: totalModules,
            modules_completed: 0,
            progress_percentage: 0
          });

        if (error) {
          console.error('Error initializing course progress:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing course progress:', error);
    }
  };

  const handleModuleComplete = async (moduleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newCompleted = new Set(completedModules);
      newCompleted.add(moduleId);
      setCompletedModules(newCompleted);
      
      const completedCount = newCompleted.size;
      const totalModules = modules.length;
      const progressPercentage = (completedCount / totalModules) * 100;
      const isCompleted = completedCount === totalModules;

      // Create or update course progress
      const progressData = {
        student_id: user.id,
        course_id: courseId,
        modules_completed: completedCount,
        total_modules: totalModules,
        progress_percentage: progressPercentage,
        completed_at: isCompleted ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('course_progress')
        .upsert(progressData, { 
          onConflict: 'student_id,course_id' 
        });

      if (error) {
        console.error('Error updating course progress:', error);
      }

      toast({
        title: isCompleted ? "🎉 Course Completed!" : "Module Completed!",
        description: isCompleted 
          ? "Congratulations! You've completed the entire course." 
          : "Great job! You've completed this module.",
      });

      // Auto-advance to next module if available and course not completed
      if (currentModuleIndex < modules.length - 1 && !isCompleted) {
        setCurrentModuleIndex(currentModuleIndex + 1);
      }
    } catch (error) {
      console.error('Error completing module:', error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    }
  };

  const getModuleIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'text':
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <Play className="h-4 w-4" />;
    }
  };

  const currentModule = modules[currentModuleIndex];
  const progress = modules.length > 0 ? (completedModules.size / modules.length) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="animate-pulse">
              <div className="h-64 bg-muted"></div>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardHeader>
            </Card>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Course not found</h3>
        <p className="text-muted-foreground mb-4">
          The course you're looking for doesn't exist or is not available.
        </p>
        <Button onClick={onBack}>Back to Courses</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {course.subject && <Badge variant="outline">{course.subject}</Badge>}
              {course.difficulty_level && (
                <Badge variant="outline">
                  {course.difficulty_level.charAt(0).toUpperCase() + course.difficulty_level.slice(1)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Progress</div>
          <div className="text-2xl font-bold">{Math.round(progress)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {currentModule ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getModuleIcon(currentModule.content_type)}
                    <CardTitle>{currentModule.title}</CardTitle>
                  </div>
                  {completedModules.has(currentModule.id) && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                <CardDescription>{currentModule.description}</CardDescription>
                {currentModule.duration_minutes && (
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{currentModule.duration_minutes} minutes</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentModule.content_type === 'video' && currentModule.content_url ? (
                    <VideoPlayer contentUrl={currentModule.content_url} />
                  ) : currentModule.content_type === 'document' && currentModule.content_url ? (
                    <DocumentViewer contentUrl={currentModule.content_url} />
                  ) : currentModule.content_type === 'text' ? (
                    <div className="prose max-w-none">
                      <p>Text content for this module would be displayed here.</p>
                      <p className="text-sm text-muted-foreground">
                        Content URL: {currentModule.content_url}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2" />
                      <p>Module content</p>
                      <p className="text-xs">{currentModule.content_url}</p>
                    </div>
                  )}

                  {!completedModules.has(currentModule.id) && (
                    <Button 
                      onClick={() => handleModuleComplete(currentModule.id)}
                      className="w-full"
                    >
                      Mark as Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No modules available</h3>
                <p className="text-muted-foreground">
                  This course doesn't have any modules yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Info */}
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{course.description}</p>
              <div className="space-y-2">
                {course.duration_weeks && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{course.duration_weeks} weeks</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Modules:</span>
                  <span>{modules.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{completedModules.size}/{modules.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module List */}
          <Card>
            <CardHeader>
              <CardTitle>Course Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {modules.map((module, index) => (
                  <button
                    key={module.id}
                    onClick={() => setCurrentModuleIndex(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      index === currentModuleIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getModuleIcon(module.content_type)}
                        <div>
                          <div className="font-medium text-sm">{module.title}</div>
                          {module.duration_minutes && (
                            <div className="text-xs opacity-70">
                              {module.duration_minutes} min
                            </div>
                          )}
                        </div>
                      </div>
                      {completedModules.has(module.id) && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </button>
                ))}
                {modules.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No modules available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};