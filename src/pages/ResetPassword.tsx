import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";

/**
 * Opened from the "reset your password" email. Supabase signs the person in with a
 * one-time recovery session; they then choose a new password here.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) setStatus("ready");
    });
    // The link may already have been processed before this page mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus("ready");
    });
    const timer = setTimeout(() => setStatus((s) => (s === "checking" ? "invalid" : s)), 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH || password !== confirm) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast({ title: "Could not change your password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password changed", description: "You are signed in with your new password." });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <KeyRound className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>For your Codex account</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "checking" && (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking your reset link…
            </p>
          )}

          {status === "invalid" && (
            <div className="space-y-4 py-2 text-center">
              <p className="text-sm text-muted-foreground">
                This reset link is not valid or has expired. Links work once and only for a short time.
              </p>
              <Button asChild className="w-full">
                <Link to="/">Back to sign in</Link>
              </Button>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  aria-invalid={tooShort}
                  required
                />
                {tooShort && <p className="text-xs text-destructive">Use at least {MIN_PASSWORD_LENGTH} characters.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Type it again</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={mismatch}
                  required
                />
                {mismatch && <p className="text-xs text-destructive">The two passwords are different.</p>}
              </div>
              <Button type="submit" className="w-full" disabled={saving || password.length < MIN_PASSWORD_LENGTH || password !== confirm}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Save new password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
