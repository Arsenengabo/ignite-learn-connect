import { useCallback, useEffect, useState } from "react";
import { AtSign, Bell, CheckCheck, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { chatApi, type ChatNotification } from "@/lib/chatApi";

const when = (iso: string) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const ChatNotificationCenter = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const unread = items.filter((item) => !item.read_at).length;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setItems(await chatApi.notifications());
    } catch {
      toast.error("Could not load chat notifications");
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    load().finally(() => setLoading(false));
    const channel = supabase
      .channel(`chat-notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_notifications", filter: `recipient_id=eq.${userId}` }, (payload) => {
        const item = payload.new as ChatNotification;
        setItems((current) => [item, ...current].slice(0, 50));
        toast.info(item.kind === "mention" ? "You were mentioned" : "New message", { description: item.preview || undefined });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const markRead = async (id?: string) => {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (!id || item.id === id) && !item.read_at ? { ...item, read_at: now } : item));
    try {
      await chatApi.markNotificationsRead(id);
    } catch {
      load();
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="chat-rail-button chat-notification-button" aria-label={`Chat notifications${unread ? `, ${unread} unread` : ""}`} title="Notifications">
          <Bell />
          {unread > 0 && <span className="chat-notification-badge">{unread > 99 ? "99+" : unread}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="chat-notification-menu">
        <div className="chat-notification-header">
          <div><strong>Notifications</strong><small>{unread ? `${unread} unread` : "You are up to date"}</small></div>
          <Button type="button" variant="ghost" size="icon" onClick={() => markRead()} disabled={!unread} aria-label="Mark all notifications as read"><CheckCheck /></Button>
        </div>
        {loading && <p className="chat-state"><Loader2 className="animate-spin" /> Loading…</p>}
        {!loading && items.length === 0 && <p className="chat-state">No chat notifications yet.</p>}
        {items.map((item) => (
          <DropdownMenuItem key={item.id} className={item.read_at ? "chat-notification-item" : "chat-notification-item chat-notification-unread"} onSelect={() => markRead(item.id)}>
            <span className="chat-avatar chat-avatar-xs">{item.kind === "mention" ? <AtSign /> : <MessageCircle />}</span>
            <span className="min-w-0 flex-1">
              <strong>{item.kind === "mention" ? `${item.actor_name} mentioned you` : `Message from ${item.actor_name}`}</strong>
              <small>{item.conversation_name}</small>
              <p>{item.preview || "Attachment"}</p>
              <time>{when(item.created_at)}</time>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
