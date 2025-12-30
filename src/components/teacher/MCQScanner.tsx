import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScanLine, Upload, Download, CheckCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BubbleDetector } from "@/utils/bubbleDetector";

export const MCQScanner = () => {
  const [scanName, setScanName] = useState("");
  const [answerSheet, setAnswerSheet] = useState<File | null>(null);
  const [answerKey, setAnswerKey] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [detectionAccuracy, setDetectionAccuracy] = useState<number>(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setAnswerSheet(file);
      toast.success("Answer sheet uploaded");
    } else {
      toast.error("Please select a valid image or PDF file");
    }
  };

  const processScan = async () => {
    if (!answerSheet || !answerKey.trim() || !scanName.trim()) {
      toast.error("Please provide scan name, answer sheet, and answer key");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("Please log in to process scans");
        return;
      }

      // Upload the image file
      const fileExt = answerSheet.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.user.id}/answer-sheets/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('scans')
        .upload(filePath, answerSheet);

      if (uploadError) throw uploadError;

      // Generate signed URL for private bucket (1 hour expiry)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('scans')
        .createSignedUrl(filePath, 3600);

      if (signedUrlError) throw signedUrlError;

      const imageUrl = signedUrlData.signedUrl;

      // Parse answer key
      const answers = answerKey.split(',').map(a => a.trim().toUpperCase());

      // Use bubble detector to analyze the answer sheet
      const bubbleDetector = new BubbleDetector();
      const detectionResults = await bubbleDetector.detectBubbles(answerSheet);
      
      // Calculate accuracy metrics
      let correctAnswers = 0;
      let totalConfidence = 0;
      const studentAnswers = detectionResults.map((result, index) => {
        const correctAnswer = answers[index];
        const isCorrect = result.detectedAnswer === correctAnswer;
        if (isCorrect) correctAnswers++;
        totalConfidence += result.confidence;
        
        return {
          question: result.question,
          correct_answer: correctAnswer,
          student_answer: result.detectedAnswer || 'Not detected',
          is_correct: isCorrect,
          confidence: result.confidence
        };
      });

      const averageConfidence = totalConfidence / detectionResults.length;
      setDetectionAccuracy(Math.round(averageConfidence * 100));

      // Save scan record
      const { data: scanData, error: scanError } = await supabase
        .from('mcq_scans')
        .insert({
          teacher_id: user.user.id,
          scan_name: scanName,
          image_url: imageUrl,
          answer_key: answers,
          status: 'completed',
        })
        .select()
        .single();

      if (scanError) throw scanError;

      const processedResults = {
        total_questions: answers.length,
        correct_answers: correctAnswers,
        score_percentage: Math.round((correctAnswers / answers.length) * 100),
        student_answers: studentAnswers,
        detection_accuracy: Math.round(averageConfidence * 100)
      };

      setScanResults(processedResults);
      toast.success("Answer sheet processed successfully!");
      
      // Reset form
      setScanName("");
      setAnswerSheet(null);
      setAnswerKey("");
    } catch (error) {
      console.error('Error processing scan:', error);
      toast.error("Failed to process answer sheet");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            MCQ Answer Sheet Scanner
          </CardTitle>
          <CardDescription>
            Upload and scan bubble answer sheets for automatic grading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="scanName">Scan Name</Label>
            <Input
              id="scanName"
              value={scanName}
              onChange={(e) => setScanName(e.target.value)}
              placeholder="e.g., Math Quiz - Class 10A"
            />
          </div>

          <div>
            <Label htmlFor="answerSheet">Answer Sheet (Image/PDF)</Label>
            <Input
              id="answerSheet"
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
            />
            {answerSheet && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {answerSheet.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="answerKey">Answer Key</Label>
            <Input
              id="answerKey"
              value={answerKey}
              onChange={(e) => setAnswerKey(e.target.value)}
              placeholder="A,B,C,D,A,B,C,A,D,B (comma-separated)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter correct answers separated by commas
            </p>
          </div>

          <Button 
            onClick={processScan} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              "Processing..."
            ) : (
              <>
                <ScanLine className="w-4 h-4 mr-2" />
                Process Answer Sheet
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {scanResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Scan Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{scanResults.total_questions}</p>
                <p className="text-sm text-muted-foreground">Total Questions</p>
              </div>
              <div className="text-center p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {scanResults.correct_answers}
                </p>
                <p className="text-sm text-muted-foreground">Correct Answers</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {scanResults.score_percentage}%
                </p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
              <div className="text-center p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Eye className="w-4 h-4" />
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {scanResults.detection_accuracy}%
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">Detection Accuracy</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Question by Question Results:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {scanResults.student_answers.map((result: any, index: number) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-sm ${
                      result.is_correct
                        ? 'bg-green-100 dark:bg-green-900'
                        : 'bg-red-100 dark:bg-red-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Q{result.question}: </span>
                        <span className="font-semibold">{result.student_answer}</span>
                        {!result.is_correct && (
                          <span className="text-muted-foreground">
                            {" "}(Correct: {result.correct_answer})
                          </span>
                        )}
                      </div>
                      {result.confidence !== undefined && (
                        <Badge 
                          variant={result.confidence > 0.7 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {Math.round(result.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" className="w-full mt-4">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};