import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GraduationCap, ArrowLeft, ArrowRight, Check, User, BookOpen, Briefcase } from "lucide-react";
import { SignUpWizard } from "./SignUpWizard";
import { takeStartTab } from "@/lib/signupIntent";

export const AuthForm = () => {
  const [startTab] = useState(takeStartTab);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { toast } = useToast();
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error && error.status === 429) {
      toast({ title: "Too many requests", description: "Please wait a minute and try again.", variant: "destructive" });
      return;
    }
    // Same message whether or not the email has an account, so nobody can check who is registered.
    setResetSent(true);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-foreground">Codex</h1>
          <p className="text-muted-foreground">Empowering education through technology</p>
        </div>

        <Card className="bg-card/95 backdrop-blur-sm border-primary/20">
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to continue or create a new account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={startTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                {forgotMode ? (
                  resetSent ? (
                    <div className="space-y-4 py-2 text-center" role="status">
                      <p className="text-sm">
                        If <strong>{formData.email}</strong> has a Codex account, we have sent it a link to choose a new
                        password. Check your inbox and spam folder.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setForgotMode(false);
                          setResetSent(false);
                        }}
                      >
                        Back to sign in
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendReset} className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Enter the email you signed up with and we will send you a link to choose a new password.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          value={formData.email}
                          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send reset link
                      </Button>
                      <Button type="button" variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>
                        Back to sign in
                      </Button>
                    </form>
                  )
                ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        email: e.target.value
                      }))} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setForgotMode(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      value={formData.password} 
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        password: e.target.value
                      }))} 
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <SignUpWizard />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
