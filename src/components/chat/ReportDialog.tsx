import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS, type ReportReason } from "@/lib/chatApi";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Who wrote the message, shown in the title. */
  authorName: string;
  preview: string;
  /** Who will read the report, e.g. "your school admin". */
  reviewer: string;
  onSubmit: (reason: ReportReason, details: string) => Promise<unknown>;
  /** Offered after reporting, e.g. to block the person too. */
  onBlock?: () => Promise<unknown>;
}

export const ReportDialog = ({ open, onOpenChange, authorName, preview, reviewer, onSubmit, onBlock }: ReportDialogProps) => {
  const [reason, setReason] = useState<ReportReason>("bullying");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("bullying");
      setDetails("");
      setAlsoBlock(false);
    }
  }, [open]);

  const submit = async () => {
    setSending(true);
    try {
      await onSubmit(reason, details.trim());
      if (alsoBlock && onBlock) await onBlock();
      toast.success("Report sent", { description: `Thank you. ${reviewer[0].toUpperCase()}${reviewer.slice(1)} will look at it.` });
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message || "Could not send the report");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden="true" /> Report a message from {authorName}
          </DialogTitle>
          <DialogDescription>
            Only {reviewer} sees your report. {authorName} is not told who reported it.
          </DialogDescription>
        </DialogHeader>
        <blockquote className="max-h-24 overflow-y-auto rounded-md border-l-4 border-destructive/50 bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap break-words">
          {preview || "(empty message)"}
        </blockquote>
        <RadioGroup value={reason} onValueChange={(value) => setReason(value as ReportReason)} className="gap-1" aria-label="Reason">
          {REPORT_REASONS.map((option) => (
            <Label
              key={option.value}
              htmlFor={`reason-${option.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-md border p-2.5 font-normal has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem value={option.value} id={`reason-${option.value}`} className="mt-0.5" />
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        <div className="space-y-1.5">
          <Label htmlFor="report-details">Anything else we should know? (optional)</Label>
          <Textarea id="report-details" value={details} maxLength={1000} onChange={(event) => setDetails(event.target.value)} rows={3} />
        </div>
        {onBlock && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={alsoBlock} onChange={(event) => setAlsoBlock(event.target.checked)} className="h-4 w-4 accent-primary" />
            Also block {authorName}
          </label>
        )}
        <p className="text-xs text-muted-foreground">
          If you are in danger right now, tell a teacher or an adult you trust straight away.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
