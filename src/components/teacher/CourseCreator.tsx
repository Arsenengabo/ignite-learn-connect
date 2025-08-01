import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Upload, FileText, Video, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CourseModule {
  id?: string;
  title: string;
  description: string;
  contentType: 'video' | 'document' | 'text';
  contentUrl?: string;
  orderIndex: number;
  durationMinutes?: number;
  isPublished: boolean;
}

export const CourseCreator = () => {
  console.log('CourseCreator render start - React:', React);
  console.log('useState function:', useState);
  const [course, setCourse] = useState({
    title: "",
    description: "",
    subject: "",
    difficultyLevel: "",
    durationWeeks: 4,
    price: 0,
    isPublished: false,
    thumbnailUrl: "",
  });

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [currentModule, setCurrentModule] = useState<CourseModule>({
    title: "",
    description: "",
    contentType: 'text',
    orderIndex: 0,
    isPublished: false,
  });

  const [isUploading, setIsUploading] = useState(false);

  const addModule = () => {
    if (!currentModule.title.trim()) {
      toast.error("Please enter a module title");
      return;
    }

    const newModule = {
      ...currentModule,
      orderIndex: modules.length,
    };

    setModules([...modules, newModule]);
    setCurrentModule({
      title: "",
      description: "",
      contentType: 'text',
      orderIndex: 0,
      isPublished: false,
    });
    toast.success("Module added");
  };

  const removeModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'course' | 'module') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 100MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${type === 'course' ? 'course-thumbnails' : 'course-content'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-content')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      if (type === 'course') {
        setCourse({ ...course, thumbnailUrl: publicUrl });
        toast.success("Thumbnail uploaded successfully");
      } else {
        setCurrentModule({ ...currentModule, contentUrl: publicUrl });
        toast.success("Content uploaded successfully");
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error?.message || "Failed to upload file";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const saveCourse = async () => {
    try {
      if (!course.title.trim()) {
        toast.error("Please add a course title");
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("Please log in to create a course");
        return;
      }

      // Insert course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: course.title,
          description: course.description,
          subject: course.subject,
          difficulty_level: course.difficultyLevel,
          duration_weeks: course.durationWeeks,
          price: course.price,
          is_published: course.isPublished,
          thumbnail_url: course.thumbnailUrl,
          teacher_id: user.user.id,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Insert modules if any
      if (modules.length > 0) {
        const modulesToInsert = modules.map(module => ({
          course_id: courseData.id,
          title: module.title,
          description: module.description,
          content_type: module.contentType,
          content_url: module.contentUrl,
          order_index: module.orderIndex,
          duration_minutes: module.durationMinutes,
          is_published: module.isPublished,
        }));

        const { error: modulesError } = await supabase
          .from('course_modules')
          .insert(modulesToInsert);

        if (modulesError) throw modulesError;
      }

      toast.success("Course created successfully!");
      
      // Reset form
      setCourse({
        title: "",
        description: "",
        subject: "",
        difficultyLevel: "",
        durationWeeks: 4,
        price: 0,
        isPublished: false,
        thumbnailUrl: "",
      });
      setModules([]);
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error("Failed to create course");
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Course</CardTitle>
          <CardDescription>Build comprehensive online courses for your students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="courseTitle">Course Title</Label>
              <Input
                id="courseTitle"
                value={course.title}
                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                placeholder="Enter course title"
              />
            </div>
            <div>
              <Label htmlFor="courseSubject">Subject</Label>
              <Input
                id="courseSubject"
                value={course.subject}
                onChange={(e) => setCourse({ ...course, subject: e.target.value })}
                placeholder="e.g., Mathematics, Science"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="courseDescription">Description</Label>
            <Textarea
              id="courseDescription"
              value={course.description}
              onChange={(e) => setCourse({ ...course, description: e.target.value })}
              placeholder="Describe what students will learn in this course"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select onValueChange={(value) => setCourse({ ...course, difficultyLevel: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Duration (weeks)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={course.durationWeeks}
                onChange={(e) => setCourse({ ...course, durationWeeks: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={course.price}
                onChange={(e) => setCourse({ ...course, price: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="thumbnail">Course Thumbnail</Label>
            <div className="flex items-center gap-2">
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'course')}
                disabled={isUploading}
              />
              {course.thumbnailUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={course.thumbnailUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="publish"
              checked={course.isPublished}
              onCheckedChange={(checked) => setCourse({ ...course, isPublished: checked })}
            />
            <Label htmlFor="publish">Publish course (make available to students)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Course Module</CardTitle>
          <CardDescription>Create lessons and content for your course</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="moduleTitle">Module Title</Label>
              <Input
                id="moduleTitle"
                value={currentModule.title}
                onChange={(e) => setCurrentModule({ ...currentModule, title: e.target.value })}
                placeholder="Enter module title"
              />
            </div>
            <div>
              <Label htmlFor="contentType">Content Type</Label>
              <Select
                value={currentModule.contentType}
                onValueChange={(value: 'video' | 'document' | 'text') => 
                  setCurrentModule({ ...currentModule, contentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="text">Text Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="moduleDescription">Module Description</Label>
            <Textarea
              id="moduleDescription"
              value={currentModule.description}
              onChange={(e) => setCurrentModule({ ...currentModule, description: e.target.value })}
              placeholder="Describe what this module covers"
            />
          </div>

          {currentModule.contentType !== 'text' && (
            <div>
              <Label htmlFor="content">Upload Content</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="content"
                  type="file"
                  accept={currentModule.contentType === 'video' ? 'video/*,.mp4,.mov,.avi,.mkv' : '.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx'}
                  onChange={(e) => handleFileUpload(e, 'module')}
                  disabled={isUploading}
                />
                {currentModule.contentUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={currentModule.contentUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={currentModule.durationMinutes || ""}
                onChange={(e) => setCurrentModule({ 
                  ...currentModule, 
                  durationMinutes: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="Estimated duration"
              />
            </div>
          </div>

          <Button onClick={addModule} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Module
          </Button>
        </CardContent>
      </Card>

      {modules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Course Modules ({modules.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modules.map((module, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getContentTypeIcon(module.contentType)}
                      <span className="font-medium">{module.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{module.contentType}</Badge>
                      {module.durationMinutes && (
                        <Badge variant="outline">{module.durationMinutes} min</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeModule(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={saveCourse} className="min-w-[150px]">
          <Save className="w-4 h-4 mr-2" />
          Save Course
        </Button>
      </div>
    </div>
  );
};