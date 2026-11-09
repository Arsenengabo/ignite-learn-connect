import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, KeyRound, Loader2 } from "lucide-react";
import { passwordProblem } from "@/lib/passwordRules";

type Stage = "checking" | "ready" | "invalid" | "done";

/**
 * Where the emailed reset link lands (audit M2). Supabase signs the person in with a
 * short-lived recovery session; they choose a new password here.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) setStage("ready");
    });
    // The link may already have been processed before this page loaded.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStage("ready");
    });
    const timeout = setTimeout(() => setStage((s) => (s === "checking" ? "invalid" : s)), 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const issue = passwordProblem(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issue || password !== confirm) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(
        /same|different/i.test(updateError.message)
          ? "Choose a password you haven't used before."
          : "We couldn't save your new password. The link may have expired; request a new one.",
      );
      return;
    }
    setStage("done");
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {stage === "done" ? <Check className="h-6 w-6 text-primary" /> : <KeyRound className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle>{stage === "done" ? "Password changed" : "Choose a new password"}</CardTitle>
          <CardDescription>
            {stage === "done"
              ? "You're signed in with your new password."
              : stage === "invalid"
                ? "This reset link is invalid or has expired."
                : "Use at least 8 characters, with letters and numbers."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === "checking" && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Checking your link" />
            </div>
          )}

          {stage === "invalid" && (
            <Button className="w-full" onClick={() => navigate("/")}>
              Back to sign in to request a new link
            </Button>
          )}

          {stage === "done" && (
            <Button className="w-full" onClick={() => navigate("/")}>
              Continue to Codex
            </Button>
          )}

          {stage === "ready" && (
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {password && issue && <p className="text-xs text-destructive">{issue}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {mismatch && <p className="text-xs text-destructive">Passwords don't match</p>}
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={saving || !!issue || password !== confirm}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save new password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default ResetPassword;
