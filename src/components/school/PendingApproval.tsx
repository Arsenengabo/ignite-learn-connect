import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, KeyRound, Loader2, RefreshCw } from "lucide-react";

interface PendingApprovalProps {
  role: "teacher" | "student";
  hasMembership: boolean;
  onRefresh: () => void;
}

export const PendingApproval = ({ role, hasMembership, onRefresh }: PendingApprovalProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const join = async () => {
    if (code.trim().length < 4) return;
    setJoining(true);
    const { error } = await supabase.rpc("join_school_by_code", {
      _code: code.trim().toUpperCase(),
      _member_role: role,
    });
    setJoining(false);

    if (error) {
      toast({ title: "Could not join", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request sent", description: "Your school admin will review your request" });
    onRefresh();
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center p-4 sm:p-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            {hasMembership ? (
              <Clock className="w-7 h-7 text-primary" />
            ) : (
              <KeyRound className="w-7 h-7 text-primary" />
            )}
          </div>
          <CardTitle className="text-lg sm:text-xl">
            {hasMembership ? "Waiting for school approval" : "Enter your school portal"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {hasMembership
              ? "Your school administrator has been notified. You'll get access as soon as they approve you."
              : "Teachers must join through the school they teach at. Enter the access code from your school administrator."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
          {!hasMembership && (
            <>
              <div className="space-y-2">
                <Label htmlFor="joinCode">School Access Code</Label>
                <Input
                  id="joinCode"
                  placeholder="e.g., ILC-4K7Q2"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              <Button onClick={join} disabled={joining} className="w-full min-h-[44px]">
                {joining && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Join School
              </Button>
            </>
          )}

          <Button variant="outline" onClick={onRefresh} className="w-full min-h-[44px]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Check status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
