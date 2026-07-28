import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Search, UserPlus } from "lucide-react";

interface Mentor {
  user_id: string;
  full_name: string;
  organization_name: string;
  role_description: string;
  subjects_taught: string[];
  province: string;
  district: string;
}

export const MentorDirectory = () => {
  const { toast } = useToast();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Mentor | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [requested, setRequested] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [{ data: mentorData, error }, { data: userData }] = await Promise.all([
      supabase.rpc("list_mentors"),
      supabase.auth.getUser(),
    ]);

    if (error) console.error(error);
    setMentors((mentorData as Mentor[]) ?? []);

    const uid = userData.user?.id;
    if (uid) {
      const { data: enrollments } = await supabase
        .from("mentor_enrollments")
        .select("mentor_id, status")
        .eq("student_id", uid);
      const map: Record<string, string> = {};
      (enrollments ?? []).forEach((e: any) => {
        map[e.mentor_id] = e.status;
      });
      setRequested(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendRequest = async () => {
    if (!selected) return;
    setSending(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setSending(false);
      return;
    }

    const { error } = await supabase.from("mentor_enrollments").insert({
      mentor_id: selected.user_id,
      student_id: uid,
      message: message.trim(),
    });
    setSending(false);

    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request sent", description: `${selected.full_name} will review your request` });
    setSelected(null);
    setMessage("");
    load();
  };

  const filtered = mentors.filter((m) => {
    const q = search.toLowerCase();
    return (
      !q ||
      m.full_name.toLowerCase().includes(q) ||
      m.subjects_taught.some((s) => s.toLowerCase().includes(q)) ||
      m.district.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search mentors by name, subject or district"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">No mentors found</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => {
          const status = requested[m.user_id];
          return (
            <Card key={m.user_id}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base truncate">{m.full_name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {m.role_description || m.organization_name || "Independent mentor"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {m.subjects_taught.slice(0, 3).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
                {(m.district || m.province) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[m.district, m.province].filter(Boolean).join(", ")}
                  </p>
                )}
                <Button
                  className="w-full min-h-[44px]"
                  variant={status ? "outline" : "default"}
                  disabled={!!status}
                  onClick={() => setSelected(m)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {status === "approved"
                    ? "Enrolled"
                    : status === "pending"
                    ? "Request pending"
                    : status === "rejected"
                    ? "Request declined"
                    : "Request enrollment"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request enrollment</DialogTitle>
            <DialogDescription>
              Tell {selected?.full_name} what you would like to learn.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Introduce yourself and what you need help with"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <DialogFooter>
            <Button onClick={sendRequest} disabled={sending} className="min-h-[44px]">
              {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MentorDirectory;
