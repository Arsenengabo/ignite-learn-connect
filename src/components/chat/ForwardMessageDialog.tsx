import { useEffect, useMemo, useState } from "react";
import { Hash, Loader2, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { chatApi, type Room } from "@/lib/chatApi";

interface ThreadTarget {
  thread_id: string;
  other_name: string;
  other_school: string;
}

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onForward: (target: { type: "room" | "direct"; id: string }) => Promise<void>;
}

export const ForwardMessageDialog = ({ open, onOpenChange, onForward }: ForwardMessageDialogProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [threads, setThreads] = useState<ThreadTarget[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([chatApi.listRooms(), chatApi.listDirectChats()]).then(([roomList, threadList]) => {
      setRooms(roomList);
      setThreads(threadList as ThreadTarget[]);
    }).catch((error) => toast.error(error.message || "Could not load conversations")).finally(() => setLoading(false));
  }, [open]);

  const targets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [
      ...rooms.map((room) => ({ type: "room" as const, id: room.id, name: room.name, meta: room.school_name || "Room" })),
      ...threads.map((thread) => ({ type: "direct" as const, id: thread.thread_id, name: thread.other_name, meta: thread.other_school || "Private message" })),
    ].filter((target) => !q || `${target.name} ${target.meta}`.toLowerCase().includes(q));
  }, [rooms, threads, query]);

  const forward = async (target: { type: "room" | "direct"; id: string }) => {
    setForwarding(target.id);
    try {
      await onForward(target);
      toast.success("Message forwarded");
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message || "Message could not be forwarded");
    } finally {
      setForwarding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Forward message</DialogTitle><DialogDescription>Choose a room or private conversation.</DialogDescription></DialogHeader>
        <label className="chat-search"><Search /><span className="sr-only">Search destinations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" /></label>
        <div className="chat-forward-list">
          {loading && <p className="chat-state"><Loader2 className="animate-spin" /> Loading conversations…</p>}
          {!loading && targets.length === 0 && <p className="chat-state">No conversations found.</p>}
          {targets.map((target) => (
            <Button key={`${target.type}-${target.id}`} type="button" variant="ghost" className="chat-list-item" disabled={forwarding !== null} onClick={() => forward(target)}>
              <span className="chat-avatar">{target.type === "room" ? <Hash /> : <MessageCircle />}</span>
              <span className="min-w-0 flex-1 text-left"><span className="chat-list-title">{target.name}</span><span className="chat-list-preview">{target.meta}</span></span>
              {forwarding === target.id && <Loader2 className="animate-spin" />}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
