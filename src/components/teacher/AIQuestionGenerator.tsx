import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Link, Sparkles, Download, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeneratedQuestion {
  question: string;
  type: 'multiple_choice' | 'open_ended';
  options?: string[];
  correct_answer: string;
  explanation?: string;
  difficulty: string;
}

export const AIQuestionGenerator = () => {
  const [inputMethod, setInputMethod] = useState<'pdf' | 'url' | 'text'>('text');
  const [textContent, setTextContent] = useState("");
  const [urlContent, setUrlContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [generationSettings, setGenerationSettings] = useState({
    questionCount: 5,
    questionType: 'mixed',
    difficulty: 'mixed',
    subject: '',
    focus: '',
  });
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      toast.success("PDF file selected");
    } else {
      toast.error("Please select a valid PDF file");
    }
  };

  const generateQuestions = async () => {
    // Using secure server-side API keys via Supabase Edge Function
    if (!textContent.trim() && !urlContent.trim() && !pdfFile) {
      toast.error("Please provide content to generate questions from");
      return;
    }

    setIsGenerating(true);
    try {
      let content = "";
      
      if (inputMethod === 'text') {
        content = textContent;
      } else if (inputMethod === 'url') {
        content = `Please fetch content from: ${urlContent}`;
      } else if (inputMethod === 'pdf' && pdfFile) {
        // In a real implementation, you would extract text from PDF
        content = "PDF content would be extracted here";
        toast.info("PDF text extraction would be implemented here");
      }

      const prompt = `Generate ${generationSettings.questionCount} ${generationSettings.questionType} questions based on the following content. 
      
Content: ${content}

Requirements:
- Difficulty: ${generationSettings.difficulty}
- Subject: ${generationSettings.subject || 'General'}
- Focus: ${generationSettings.focus || 'Comprehensive understanding'}
- Question types: ${generationSettings.questionType}

For multiple choice questions, provide 4 options.
For each question, include an explanation of the correct answer.

Return the response as a JSON array with this format:
[
  {
    "question": "Question text",
    "type": "multiple_choice" or "open_ended",
    "options": ["A", "B", "C", "D"] (only for multiple choice),
    "correct_answer": "Correct answer",
    "explanation": "Why this is correct",
    "difficulty": "beginner/intermediate/advanced"
  }
]`;

      const { data, error } = await supabase.functions.invoke('ai-question-generator', {
        body: { prompt },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate questions');
      }

      const questions = (data as any)?.questions as GeneratedQuestion[] | undefined;
      if (!questions || !Array.isArray(questions)) {
        throw new Error('Invalid response format from AI provider');
      }
      setGeneratedQuestions(questions);
      toast.success(`Generated ${questions.length} questions successfully!`);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error("Failed to generate questions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyQuestion = (question: GeneratedQuestion) => {
    const questionText = `Question: ${question.question}
Type: ${question.type}
${question.options ? `Options: ${question.options.join(', ')}` : ''}
Correct Answer: ${question.correct_answer}
${question.explanation ? `Explanation: ${question.explanation}` : ''}`;
    
    navigator.clipboard.writeText(questionText);
    toast.success("Question copied to clipboard");
  };

  const exportQuestions = () => {
    const questionsText = generatedQuestions.map((q, index) => 
      `Question ${index + 1}: ${q.question}
Type: ${q.type}
${q.options ? `Options: ${q.options.join(', ')}` : ''}
Correct Answer: ${q.correct_answer}
${q.explanation ? `Explanation: ${q.explanation}` : ''}
Difficulty: ${q.difficulty}
`).join('\n\n');

    const blob = new Blob([questionsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-questions.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Question Generator
          </CardTitle>
          <CardDescription>
            Generate questions from PDFs, URLs, or text using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Method Selection */}
          <div>
            <Label>Content Source</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                variant={inputMethod === 'text' ? 'default' : 'outline'}
                onClick={() => setInputMethod('text')}
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Text
              </Button>
              <Button
                variant={inputMethod === 'url' ? 'default' : 'outline'}
                onClick={() => setInputMethod('url')}
                size="sm"
              >
                <Link className="w-4 h-4 mr-2" />
                URL
              </Button>
              <Button
                variant={inputMethod === 'pdf' ? 'default' : 'outline'}
                onClick={() => setInputMethod('pdf')}
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          {/* Content Input */}
          {inputMethod === 'text' && (
            <div>
              <Label htmlFor="textContent">Text Content</Label>
              <Textarea
                id="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your content here..."
                rows={6}
              />
            </div>
          )}

          {inputMethod === 'url' && (
            <div>
              <Label htmlFor="urlContent">Website URL</Label>
              <Input
                id="urlContent"
                value={urlContent}
                onChange={(e) => setUrlContent(e.target.value)}
                placeholder="https://example.com/article"
              />
            </div>
          )}

          {inputMethod === 'pdf' && (
            <div>
              <Label htmlFor="pdfFile">Upload PDF</Label>
              <Input
                id="pdfFile"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
              />
              {pdfFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {pdfFile.name}
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Generation Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Select
                value={generationSettings.questionCount.toString()}
                onValueChange={(value) => setGenerationSettings({
                  ...generationSettings,
                  questionCount: parseInt(value)
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Questions</SelectItem>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="questionType">Question Type</Label>
              <Select
                value={generationSettings.questionType}
                onValueChange={(value) => setGenerationSettings({
                  ...generationSettings,
                  questionType: value
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice Only</SelectItem>
                  <SelectItem value="open_ended">Open Ended Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={generationSettings.difficulty}
                onValueChange={(value) => setGenerationSettings({
                  ...generationSettings,
                  difficulty: value
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={generationSettings.subject}
                onChange={(e) => setGenerationSettings({
                  ...generationSettings,
                  subject: e.target.value
                })}
                placeholder="e.g., Mathematics, Science"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="focus">Focus/Theme (Optional)</Label>
            <Input
              id="focus"
              value={generationSettings.focus}
              onChange={(e) => setGenerationSettings({
                ...generationSettings,
                focus: e.target.value
              })}
              placeholder="e.g., Problem solving, Critical thinking"
            />
          </div>

          <Button 
            onClick={generateQuestions} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              "Generating Questions..."
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Questions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Questions */}
      {generatedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Questions ({generatedQuestions.length})</CardTitle>
                <CardDescription>Review and use the AI-generated questions</CardDescription>
              </div>
              <Button onClick={exportQuestions} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedQuestions.map((question, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Q{index + 1}</Badge>
                        <Badge variant="outline">{question.type}</Badge>
                        <Badge variant="outline">{question.difficulty}</Badge>
                      </div>
                      <h4 className="font-medium mb-2">{question.question}</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyQuestion(question)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  {question.options && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Options:</p>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        {question.options.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className={`p-2 rounded ${
                              option === question.correct_answer
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-muted'
                            }`}
                          >
                            {String.fromCharCode(65 + optionIndex)}. {option}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Correct Answer: </span>
                      <span className="text-green-600 dark:text-green-400">
                        {question.correct_answer}
                      </span>
                    </div>
                    {question.explanation && (
                      <div>
                        <span className="font-medium">Explanation: </span>
                        <span className="text-muted-foreground">{question.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};