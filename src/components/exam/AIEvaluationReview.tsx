import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, XCircle, AlertTriangle, Sparkles, 
  BookOpen, Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GrammarError {
  type: 'spelling' | 'grammar' | 'punctuation';
  original: string;
  correction: string;
}

interface GrammarAnalysis {
  originalText: string;
  correctedText: string;
  errors: GrammarError[];
  grammarScore: number;
}

interface AIEvaluationReviewProps {
  studentAnswer: string;
  correctAnswer?: string;
  feedback: string;
  marksAwarded: number;
  maxMarks: number;
  grammarAnalysis?: GrammarAnalysis | null;
  keyPointsCovered?: string[];
  keyPointsMissing?: string[];
  semanticScore?: number;
  correctedAnswer?: string;
  showGrammarDetails?: boolean;
}

export default function AIEvaluationReview({
  studentAnswer,
  correctAnswer,
  feedback,
  marksAwarded,
  maxMarks,
  grammarAnalysis,
  keyPointsCovered = [],
  keyPointsMissing = [],
  semanticScore = 0,
  correctedAnswer,
  showGrammarDetails = true,
}: AIEvaluationReviewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'spelling': return <span className="text-destructive">Sp</span>;
      case 'grammar': return <span className="text-warning">Gr</span>;
      case 'punctuation': return <span className="text-primary">Pn</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Evaluation Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-primary/10">
          <Sparkles className="h-3 w-3 mr-1" />
          AI Evaluated
        </Badge>
        {semanticScore > 0 && (
          <Badge variant="secondary" className={getScoreColor(semanticScore)}>
            {semanticScore}% Semantic Match
          </Badge>
        )}
      </div>

      {/* Score Summary */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
        <div className="text-center">
          <div className={cn("text-2xl font-bold", getScoreColor((marksAwarded / maxMarks) * 100))}>
            {marksAwarded}/{maxMarks}
          </div>
          <div className="text-xs text-muted-foreground">Marks</div>
        </div>
        <Separator orientation="vertical" className="h-10" />
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">AI Feedback</div>
          <p className="text-sm text-muted-foreground">{feedback}</p>
        </div>
      </div>

      {/* Key Points Analysis */}
      {(keyPointsCovered.length > 0 || keyPointsMissing.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            Key Points Analysis
          </div>
          
          {keyPointsCovered.length > 0 && (
            <div className="space-y-1">
              {keyPointsCovered.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span className="text-success">{point}</span>
                </div>
              ))}
            </div>
          )}
          
          {keyPointsMissing.length > 0 && (
            <div className="space-y-1">
              {keyPointsMissing.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{point}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grammar Analysis */}
      {showGrammarDetails && grammarAnalysis && (
        <div className="space-y-3 p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4" />
              Grammar & Writing Analysis
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Score:</span>
              <Progress value={grammarAnalysis.grammarScore} className="w-16 h-2" />
              <span className={cn("text-sm font-medium", getScoreColor(grammarAnalysis.grammarScore))}>
                {grammarAnalysis.grammarScore}%
              </span>
            </div>
          </div>

          {grammarAnalysis.errors.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {grammarAnalysis.errors.length} issue(s) found:
              </div>
              <div className="space-y-1">
                {grammarAnalysis.errors.slice(0, 5).map((error, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded"
                  >
                    <Badge variant="outline" className="text-[10px] px-1">
                      {error.type}
                    </Badge>
                    <span className="text-destructive line-through">{error.original}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-success font-medium">{error.correction}</span>
                  </div>
                ))}
                {grammarAnalysis.errors.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{grammarAnalysis.errors.length - 5} more issues
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              No grammar or spelling issues detected
            </div>
          )}

          {/* Corrected Answer */}
          {correctedAnswer && correctedAnswer !== studentAnswer && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Suggested correction:
              </div>
              <div className="text-sm p-2 bg-success/10 rounded border border-success/20">
                {correctedAnswer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Semantic Similarity Bar */}
      {semanticScore > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Semantic Similarity</span>
            <span className={getScoreColor(semanticScore)}>{semanticScore}%</span>
          </div>
          <Progress value={semanticScore} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {semanticScore >= 80 
              ? "Excellent understanding of the concept" 
              : semanticScore >= 60 
                ? "Good understanding with some gaps"
                : "Needs improvement in conceptual understanding"}
          </p>
        </div>
      )}
    </div>
  );
}
