import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Download, ImageIcon, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

type QuestionType =
  | "labeling"
  | "mcq_labeling"
  | "matching_labeling"
  | "short_answer_labeling"
  | "structure_function";

interface DiagramQuestion {
  topic: string;
  diagram_required: boolean;
  diagram_generated: boolean;
  question_type: QuestionType;
  question_text: string;
  labels: string[];
  answer_key: Record<string, string>;
  options?: Record<string, string[]> | null;
  matching_pool?: string[] | null;
  structure_function?: Record<string, { name: string; function: string }> | null;
  marks: number;
  estimated_time_minutes: number;
  diagram_image: string;
}

export const DiagramQuestionGenerator = () => {
  const [topic, setTopic] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("labeling");
  const [numLabels, setNumLabels] = useState(6);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "national_exam">(
    "national_exam"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<DiagramQuestion | null>(null);

  const generate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic (e.g., Human Heart)");
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-diagram-question", {
        body: { topic: topic.trim(), questionType, difficulty, numLabels },
      });

      if (error) throw new Error(error.message || "Failed to generate diagram question");
      if (!data || data.error) throw new Error(data?.error || "Unexpected response");

      setResult(data as DiagramQuestion);
      toast.success("Diagram question generated successfully!");
    } catch (e: any) {
      console.error("Diagram generation error:", e);
      toast.error(e.message || "Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDiagram = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.diagram_image;
    a.download = `${result.topic.replace(/\s+/g, "_")}_diagram.png`;
    a.click();
  };

  const exportPDF = (mode: "exam" | "key") => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    const addText = (txt: string, size = 12, bold = false) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(txt, pageWidth - 2 * margin);
      if (y + lines.length * (size * 0.45) > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.45) + 2;
    };

    // Header
    addText(`Topic: ${result.topic}`, 16, true);
    addText(
      `Marks: ${result.marks}    |    Estimated time: ${result.estimated_time_minutes} min`,
      11
    );
    y += 4;

    if (mode === "exam") {
      addText("Q1. " + result.question_text, 12, true);
      y += 2;

      // Embed diagram (centered)
      try {
        const imgWidth = 120;
        const imgHeight = 90;
        const x = (pageWidth - imgWidth) / 2;
        if (y + imgHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.addImage(result.diagram_image, "PNG", x, y, imgWidth, imgHeight);
        y += imgHeight + 8;
      } catch (e) {
        console.error("Failed to embed diagram in PDF", e);
        addText("[Diagram could not be embedded]", 10);
      }

      // Answer area
      if (result.question_type === "matching_labeling" && result.matching_pool) {
        addText("Word bank (match each label to one item):", 11, true);
        addText(result.matching_pool.join("   |   "), 11);
        y += 2;
      }

      if (result.question_type === "mcq_labeling" && result.options) {
        result.labels.forEach((l) => {
          addText(`${l} → __________________________`, 11, true);
          (result.options?.[l] || []).forEach((opt, i) => {
            addText(`   ${String.fromCharCode(97 + i)}) ${opt}`, 10);
          });
          y += 2;
        });
      } else if (result.question_type === "structure_function") {
        result.labels.forEach((l) => {
          addText(`${l} → Name: ____________________________`, 11);
          addText(`     Function: ____________________________________________`, 11);
          y += 2;
        });
      } else {
        result.labels.forEach((l) => {
          addText(`${l} → ___________________________________________`, 11);
          y += 1;
        });
      }
    } else {
      // Answer key
      addText("ANSWER KEY", 14, true);
      y += 2;
      result.labels.forEach((l) => {
        const ans = result.answer_key?.[l] || "—";
        if (result.question_type === "structure_function" && result.structure_function?.[l]) {
          const sf = result.structure_function[l];
          addText(`${l} → ${sf.name}`, 11, true);
          addText(`   Function: ${sf.function}`, 10);
        } else {
          addText(`${l} → ${ans}`, 11);
        }
      });
    }

    doc.save(
      `${result.topic.replace(/\s+/g, "_")}_${mode === "exam" ? "exam" : "answer_key"}.pdf`
    );
    toast.success("PDF exported");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Diagram Labeling Question Generator
          </CardTitle>
          <CardDescription>
            Auto-generate exam-ready diagrams (biology, physics, chemistry, geography, geometry…)
            with labeled markers and answer keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dq-topic">Topic *</Label>
              <Input
                id="dq-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Human Heart, Plant Cell, Electric Circuit"
              />
            </div>
            <div>
              <Label htmlFor="dq-type">Question Type</Label>
              <Select value={questionType} onValueChange={(v: QuestionType) => setQuestionType(v)}>
                <SelectTrigger id="dq-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="labeling">Diagram Labeling</SelectItem>
                  <SelectItem value="mcq_labeling">MCQ Labeling</SelectItem>
                  <SelectItem value="matching_labeling">Matching Labeling</SelectItem>
                  <SelectItem value="short_answer_labeling">Short Answer Labeling</SelectItem>
                  <SelectItem value="structure_function">Structure & Function</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dq-labels">Number of Labels (2–10)</Label>
              <Input
                id="dq-labels"
                type="number"
                min={2}
                max={10}
                value={numLabels}
                onChange={(e) => setNumLabels(Math.min(10, Math.max(2, parseInt(e.target.value) || 6)))}
              />
            </div>
            <div>
              <Label htmlFor="dq-diff">Difficulty</Label>
              <Select value={difficulty} onValueChange={(v: typeof difficulty) => setDifficulty(v)}>
                <SelectTrigger id="dq-diff">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="national_exam">National Exam Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={generate} disabled={isGenerating} className="w-full" size="lg">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating diagram & question…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Diagram Question
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>{result.topic}</CardTitle>
                <CardDescription>
                  {result.marks} marks · {result.estimated_time_minutes} min ·{" "}
                  {result.question_type.replace(/_/g, " ")}
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={downloadDiagram}>
                  <Download className="w-4 h-4 mr-2" />
                  PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPDF("exam")}>
                  <Download className="w-4 h-4 mr-2" />
                  Exam PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPDF("key")}>
                  <Key className="w-4 h-4 mr-2" />
                  Answer Key
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-background p-4 flex justify-center">
              <img
                src={result.diagram_image}
                alt={`Labeled diagram for ${result.topic}`}
                className="max-h-[480px] object-contain"
              />
            </div>

            <div>
              <h4 className="font-semibold mb-1">Question</h4>
              <p className="text-sm text-muted-foreground">{result.question_text}</p>
            </div>

            {result.question_type === "matching_labeling" && result.matching_pool && (
              <div>
                <h4 className="font-semibold mb-1">Word Bank</h4>
                <div className="flex flex-wrap gap-2">
                  {result.matching_pool.map((w, i) => (
                    <Badge key={i} variant="secondary">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Answer Key</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.labels.map((l) => (
                  <div
                    key={l}
                    className="flex items-start gap-3 rounded-md border p-3 bg-muted/40"
                  >
                    <Badge>{l}</Badge>
                    {result.question_type === "structure_function" &&
                    result.structure_function?.[l] ? (
                      <div className="text-sm">
                        <div className="font-medium">{result.structure_function[l].name}</div>
                        <div className="text-muted-foreground">
                          {result.structure_function[l].function}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <div className="font-medium">{result.answer_key?.[l] || "—"}</div>
                        {result.question_type === "mcq_labeling" && result.options?.[l] && (
                          <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                            {result.options[l].map((opt, i) => (
                              <li
                                key={i}
                                className={
                                  opt === result.answer_key?.[l]
                                    ? "text-green-600 dark:text-green-400 font-medium"
                                    : ""
                                }
                              >
                                {opt}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
