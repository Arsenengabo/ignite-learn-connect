import { useCallback, useEffect, useState } from "react";
import { Check, Flag, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chatApi, formatWhen, REPORT_REASONS, type ChatReport } from "@/lib/chatApi";

type Status = "open" | "resolved" | "dismissed";

const reasonLabel = (reason: string) => REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;

/** Review queue for reported chat messages (school admins, room teachers, Codex admins). */
export const ChatReports = ({ compact = false, onCountChange }: { compact?: boolean; onCountChange?: (open: number) => void }) => {
  const [status, setStatus] = useState<Status>("open");
  const [reports, setReports] = useState<ChatReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await chatApi.reports(status);
      setReports(rows);
      if (status === "open") onCountChange?.(rows.length);
    } catch (error) {
      toast.error((error as Error).message || "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [status, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (report: ChatReport, action: "dismiss" | "remove") => {
    setBusy(report.id);
    try {
      await chatApi.resolveReport(report.id, action);
      toast.success(action === "remove" ? "Message removed" : "Report closed");
      setReports((rows) => {
        const next = rows.filter((r) => r.id !== report.id);
        if (status === "open") onCountChange?.(next.length);
        return next;
      });
    } catch (error) {
      toast.error((error as Error).message || "Could not update the report");
    } finally {
      setBusy(null);
    }
  };

  const list = loading ? (
    <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /></div>
  ) : reports.length === 0 ? (
    <p className="py-10 text-center text-sm text-muted-foreground">
      {status === "open" ? "No reports are waiting. You're all caught up." : "Nothing here yet."}
    </p>
  ) : (
    <ul className="space-y-3">
      {reports.map((report) => (
        <li key={report.id}>
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">{reasonLabel(report.reason)}</Badge>
                <Badge variant="secondary">{report.source === "direct" ? "Private message" : report.room_name}</Badge>
                {report.school_name && <span className="text-xs text-muted-foreground">{report.school_name}</span>}
                <span className="ml-auto text-xs text-muted-foreground">{formatWhen(report.created_at)}</span>
              </div>
              <p className="text-sm">
                <span className="font-semibold">{report.reporter_name}</span> reported a message from{" "}
                <span className="font-semibold">{report.reported_name}</span>
              </p>
              <blockquote className="rounded-md border-l-4 border-destructive/50 bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap break-words">
                {report.message_snapshot || "(empty message)"}
              </blockquote>
              {report.details && <p className="text-sm text-muted-foreground">“{report.details}”</p>}
              {report.status === "open" ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="destructive" className="min-h-[40px]" disabled={busy === report.id} onClick={() => act(report, "remove")}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> {report.message_removed ? "Close report" : "Remove message"}
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-[40px]" disabled={busy === report.id} onClick={() => act(report, "dismiss")}>
                    <Check className="mr-1.5 h-4 w-4" /> No action needed
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{report.resolution}</p>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-4">
      {!compact && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <Flag className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl">Chat reports</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Messages people reported in rooms and private chats. Removing a message hides it for everyone; the original
                  text stays in the review log.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
      <Tabs value={status} onValueChange={(value) => setStatus(value as Status)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="open" className="text-xs sm:text-sm">Waiting</TabsTrigger>
          <TabsTrigger value="resolved" className="text-xs sm:text-sm">Handled</TabsTrigger>
          <TabsTrigger value="dismissed" className="text-xs sm:text-sm">No action</TabsTrigger>
        </TabsList>
      </Tabs>
      {list}
    </div>
  );
};
