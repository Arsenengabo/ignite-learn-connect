import { useEffect, useState } from "react";
import { Clock, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shown in chat when a student isn't an approved member of any school yet.
 * School rooms, class rooms and private messages all need an approved school.
 */
export const JoinSchoolCard = ({ onJoined }: { onJoined?: () => void }) => {
  const [status, setStatus] = useState<"loading" | "none" | "pending" | "approved">("loading");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setStatus("none");
    const { data } = await supabase.from("school_members").select("status").eq("user_id", auth.user.id);
    const statuses = (data ?? []).map((row) => row.status);
    setStatus(statuses.includes("approved") ? "approved" : statuses.includes("pending") ? "pending" : "none");
  };

  useEffect(() => {
    load();
  }, []);

  const join = async () => {
    if (code.trim().length < 4) return;
    setJoining(true);
    const { error } = await supabase.rpc("join_school_by_code", { _code: code.trim().toUpperCase(), _member_role: "student" });
    setJoining(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent", { description: "Your school admin will review it." });
    setStatus("pending");
    onJoined?.();
  };

  if (status === "loading" || status === "approved") return null;

  return (
    <div className="chat-join-card">
      {status === "pending" ? (
        <>
          <Clock aria-hidden="true" />
          <p className="font-semibold">Waiting for your school to approve you</p>
          <p>Your school room, class rooms and schoolmates appear here once your school admin accepts your request.</p>
        </>
      ) : (
        <>
          <KeyRound aria-hidden="true" />
          <p className="font-semibold">Join your school to see your classes</p>
          <p>Ask your teacher or school admin for the school access code.</p>
          <div className="flex w-full max-w-xs gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="Access code"
              aria-label="School access code"
              maxLength={12}
              className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 font-mono tracking-widest uppercase outline-none focus:border-[hsl(var(--ilc-teal-hsl))]"
            />
            <Button onClick={join} disabled={joining || code.trim().length < 4} className="chat-primary-action h-10">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
