import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuizSchema, QuizQuestionSchema, getValidationError } from "@/lib/validations";

interface Question {
  id?: string;
  questionText: string;
  questionType: 'multiple_choice' | 'open_ended';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
  orderIndex: number;
}

interface QuizBuilderProps {
  editingQuiz?: any;
  onQuizSaved?: () => void;
  onBack?: () => void;
}

export const QuizBuilder = ({ editingQuiz, onQuizSaved, onBack }: QuizBuilderProps) => {
  const [quiz, setQuiz] = useState({
    title: editingQuiz?.title || "",
    description: editingQuiz?.description || "",
    subject: editingQuiz?.subject || "",
    difficultyLevel: editingQuiz?.difficulty_level || "",
    timeLimit: editingQuiz?.time_limit || 30,
    isPublished: editingQuiz?.is_published || false,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    questionText: "",
    questionType: 'multiple_choice',
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    points: 1,
    orderIndex: 0,
  });

  const addQuestion = () => {
    // Validate question with Zod
    const validationResult = QuizQuestionSchema.safeParse(currentQuestion);
    if (!validationResult.success) {
      toast.error(getValidationError(validationResult.error));
      return;
    }

    const newQuestion = {
      ...currentQuestion,
      orderIndex: questions.length,
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion({
      questionText: "",
      questionType: 'multiple_choice',
      options: ["", "", "", ""],
      correctAnswer: "",
      explanation: "",
      points: 1,
      orderIndex: 0,
    });
    toast.success("Question added");
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || [])];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const saveQuiz = async () => {
    try {
      // Validate quiz with Zod
      const validationResult = QuizSchema.safeParse(quiz);
      if (!validationResult.success) {
        toast.error(getValidationError(validationResult.error));
        return;
      }

      if (questions.length === 0) {
        toast.error("Please add at least one question");
        return;
      }

      const validated = validationResult.data;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("Please log in to create a quiz");
        return;
      }
      let quizData;

      if (editingQuiz) {
        // Update existing quiz
        const { data, error: quizError } = await supabase
          .from('quizzes')
          .update({
            title: validated.title,
            description: validated.description,
            subject: validated.subject,
            difficulty_level: validated.difficultyLevel,
            time_limit: validated.timeLimit,
            is_published: validated.isPublished,
            total_questions: questions.length,
          })
          .eq('id', editingQuiz.id)
          .select()
          .single();

        if (quizError) throw quizError;
        quizData = data;

        // Delete existing questions for this quiz
        const { error: deleteError } = await supabase
          .from('quiz_questions')
          .delete()
          .eq('quiz_id', editingQuiz.id);

        if (deleteError) throw deleteError;
      } else {
        // Insert new quiz
        const { data, error: quizError } = await supabase
          .from('quizzes')
          .insert({
            title: validated.title,
            description: validated.description,
            subject: validated.subject,
            difficulty_level: validated.difficultyLevel,
            time_limit: validated.timeLimit,
            is_published: validated.isPublished,
            teacher_id: user.user.id,
            total_questions: questions.length,
          })
          .select()
          .single();

        if (quizError) throw quizError;
        quizData = data;
      }

      // Insert questions
      const questionsToInsert = questions.map(q => ({
        quiz_id: quizData.id,
        question_text: q.questionText,
        question_type: q.questionType,
        options: q.questionType === 'multiple_choice' ? q.options : null,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points,
        order_index: q.orderIndex,
      }));

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast.success(editingQuiz ? "Quiz updated successfully!" : "Quiz created successfully!");
      
      if (onQuizSaved) {
        onQuizSaved();
      }
      
      if (!editingQuiz) {
        // Reset form only for new quizzes
        setQuiz({
          title: "",
          description: "",
          subject: "",
          difficultyLevel: "",
          timeLimit: 30,
          isPublished: false,
        });
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error("Failed to create quiz");
    }
  };

  // Load questions for editing
  useEffect(() => {
    if (editingQuiz) {
      fetchQuestionsForQuiz(editingQuiz.id);
    }
  }, [editingQuiz]);

  const fetchQuestionsForQuiz = async (quizId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

      if (error) throw error;

      const loadedQuestions = data.map(q => ({
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type as 'multiple_choice' | 'open_ended',
        options: q.options as string[] || [],
        correctAnswer: q.correct_answer,
        explanation: q.explanation || "",
        points: q.points,
        orderIndex: q.order_index,
      }));

      setQuestions(loadedQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error("Failed to load quiz questions");
    }
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="outline" onClick={onBack}>
          ← Back to Dashboard
        </Button>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</CardTitle>
          <CardDescription>Build interactive quizzes for your students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={quiz.subject}
                onChange={(e) => setQuiz({ ...quiz, subject: e.target.value })}
                placeholder="e.g., Mathematics, Science"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={quiz.description}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              placeholder="Brief description of the quiz"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select onValueChange={(value) => setQuiz({ ...quiz, difficultyLevel: value })}>
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
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={quiz.timeLimit}
                onChange={(e) => setQuiz({ ...quiz, timeLimit: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="questionText">Question</Label>
            <Textarea
              id="questionText"
              value={currentQuestion.questionText}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, questionText: e.target.value })}
              placeholder="Enter your question"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="questionType">Question Type</Label>
              <Select
                value={currentQuestion.questionType}
                onValueChange={(value: 'multiple_choice' | 'open_ended') => 
                  setCurrentQuestion({ ...currentQuestion, questionType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="open_ended">Open Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min="1"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {currentQuestion.questionType === 'multiple_choice' && (
            <div>
              <Label>Answer Options</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentQuestion.options?.map((option, index) => (
                  <Input
                    key={index}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="correctAnswer">Correct Answer</Label>
            {currentQuestion.questionType === 'multiple_choice' ? (
              <Select
                value={currentQuestion.correctAnswer}
                onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correctAnswer: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select correct answer" />
                </SelectTrigger>
                <SelectContent>
                  {currentQuestion.options?.filter(option => option.trim() !== '').map((option, index) => (
                    <SelectItem key={index} value={option}>
                      {option || `Option ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="correctAnswer"
                value={currentQuestion.correctAnswer}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                placeholder="Enter the correct answer"
              />
            )}
          </div>

          <div>
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              value={currentQuestion.explanation}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
              placeholder="Explain why this is the correct answer"
            />
          </div>

          <Button onClick={addQuestion} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questions Added ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{question.questionText}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{question.questionType}</Badge>
                      <Badge variant="outline">{question.points} pts</Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {questions.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={saveQuiz} className="min-w-[150px]">
            <Save className="w-4 h-4 mr-2" />
            {editingQuiz ? 'Update Quiz' : 'Save Quiz'}
          </Button>
        </div>
      )}
    </div>
  );
};