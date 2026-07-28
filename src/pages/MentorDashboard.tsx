import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, GraduationCap, Loader2, X } from "lucide-react";
import TeacherDashboard from "./TeacherDashboard";

interface EnrollmentRequest {
  id: string;
  student_id: string;
  student_name: string;
  message: string;
  status: string;
  created_at: string;
}

const MentorDashboard = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_mentor_enrollment_requests");
    if (error) console.error(error);
    setRequests((data as EnrollmentRequest[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.rpc("respond_mentor_enrollment", {
      _enrollment_id: id,
      _status: status,
    });
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "approved" ? "Student enrolled" : "Request declined" });
    load();
  };

  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Enrollment Requests</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Students who want to learn with you. {approved.length} enrolled.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-2">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {!loading && pending.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No pending requests right now
            </p>
          )}
          {pending.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{r.student_name}</p>
                  {r.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.message}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" onClick={() => respond(r.id, "approved")} className="min-h-[44px]">
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respond(r.id, "rejected")}
                  className="min-h-[44px]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {approved.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs text-muted-foreground">My students</p>
              <div className="flex flex-wrap gap-2">
                {approved.map((r) => (
                  <Badge key={r.id} variant="secondary">{r.student_name}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TeacherDashboard />
    </div>
  );
};

export default MentorDashboard;
