import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Hash, MessageSquare, Send, Users } from "lucide-react";
import { ChatMessageSchema, getValidationError } from "@/lib/validations";
import { DirectMessages } from "./DirectMessages";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  school_name?: string | null;
}

export const StudentChat = () => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selected, setSelected] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"rooms" | "direct">("rooms");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!cancelled) setUserId(auth.user?.id ?? null);

      const { data, error } = await supabase
        .from("chat_channels")
        .select("id, name, description, channel_type, school_name")
        .like("channel_type", "student_%")
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (error) {
        toast.error("Failed to load chat rooms");
      } else {
        setChannels(data ?? []);
        setSelected((prev) => prev ?? data?.[0] ?? null);
      }
      setLoading(false);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, message, sender_id, created_at")
        .eq("channel_id", selected.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (cancelled) return;
      if (error) {
        toast.error("Failed to load messages");
        return;
      }

      const named = await Promise.all(
        (data ?? []).map(async (msg) => {
          const { data: name } = await supabase.rpc("get_user_display_name", {
            _user_id: msg.sender_id,
          });
          return { ...msg, sender_name: (name as string) || "Student" };
        })
      );
      if (!cancelled) setMessages(named);
    };

    load();

    const channel = supabase
      .channel(`student-chat-${selected.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${selected.id}`,
        },
        async (payload) => {
          const incoming = payload.new as ChatMessage;
          const { data: name } = await supabase.rpc("get_user_display_name", {
            _user_id: incoming.sender_id,
          });
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id)
              ? prev
              : [...prev, { ...incoming, sender_name: (name as string) || "Student" }]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!draft.trim() || !selected || !userId) return;

    const parsed = ChatMessageSchema.safeParse({
      message: draft,
      channelId: selected.id,
      senderId: userId,
    });
    if (!parsed.success) {
      toast.error(getValidationError(parsed.error));
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      channel_id: parsed.data.channelId,
      sender_id: parsed.data.senderId,
      message: parsed.data.message,
    });

    if (error) {
      toast.error(error.message || "Failed to send message");
      return;
    }
    setDraft("");
  };

  const time = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="ilc-surface ilc-scope -mx-3 -my-4 min-h-[calc(100dvh-9rem)] space-y-4 rounded-none px-3 py-4 sm:-mx-4 sm:px-4 lg:-mx-6 lg:min-h-[calc(100dvh-11rem)] lg:rounded-xl lg:px-6 lg:py-5">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--ilc-teal-glow)", color: "var(--ilc-teal)" }}>
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold">Student chat</h2>
          <p className="text-xs ilc-muted">Talk with other learners in real time</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-lg border p-1 sm:flex sm:w-fit" style={{ borderColor: "var(--ilc-hairline)" }}>
        {([
          { id: "rooms", label: "Rooms" },
          { id: "direct", label: "Direct messages" },
        ] as const).map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="ghost"
            onClick={() => setMode(t.id)}
            aria-pressed={mode === t.id}
            className="min-h-10 rounded-md px-4 text-xs font-semibold sm:min-w-[150px]"
            style={{
              background: mode === t.id ? "var(--ilc-teal-glow)" : "transparent",
              color: mode === t.id ? "var(--ilc-teal)" : "var(--ilc-text-muted)",
              border: "1px solid var(--ilc-hairline)",
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {mode === "direct" ? (
        <DirectMessages />
      ) : (
        <>


      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Channel selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {channels.map((c) => {
          const active = c.id === selected?.id;
          return (
            <Button
              key={c.id}
              type="button"
              variant="ghost"
              onClick={() => setSelected(c)}
              aria-pressed={active}
              className="min-h-11 shrink-0 justify-start whitespace-nowrap rounded-lg px-3 text-sm lg:w-full"
              style={{
                background: active ? "var(--ilc-teal-glow)" : "transparent",
                color: active ? "var(--ilc-teal)" : "var(--ilc-text-muted)",
                border: "1px solid var(--ilc-hairline)",
              }}
            >
              {c.channel_type.includes("school") ? (
                <Users className="mr-1 inline h-3.5 w-3.5" />
              ) : (
                <Hash className="mr-1 inline h-3.5 w-3.5" />
              )}
              {c.name}
            </Button>
          );
        })}
      </div>

      <section className="ilc-card flex h-[calc(100dvh-16rem)] min-h-[420px] max-h-[760px] flex-col sm:h-[65vh] lg:h-[calc(100dvh-17rem)]">
        {loading ? (
          <p className="m-auto text-sm ilc-muted">Loading chat…</p>
        ) : !selected ? (
          <p className="m-auto text-sm ilc-muted">No chat rooms available yet.</p>
        ) : (
          <>
            <div className="mb-3 border-b pb-2" style={{ borderColor: "var(--ilc-hairline)" }}>
              <p className="text-sm font-semibold">{selected.name}</p>
              <p className="text-xs ilc-muted">{selected.description}</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
              {messages.length === 0 && (
                <p className="pt-8 text-center text-sm ilc-muted">
                  No messages yet — say hello.
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === userId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[88%] rounded-xl px-3 py-2 sm:max-w-[72%] lg:max-w-[62%]"
                      style={{
                        background: mine ? "var(--ilc-teal)" : "var(--ilc-hairline)",
                        color: mine ? "#04201E" : "inherit",
                      }}
                    >
                      {!mine && (
                        <p className="mb-0.5 text-xs font-semibold opacity-80">{m.sender_name}</p>
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm">{m.message}</p>
                      <p className="mt-1 text-[10px] opacity-70">{time(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="mt-3 flex items-end gap-2 border-t pt-3" style={{ borderColor: "var(--ilc-hairline)" }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type a message…"
                className="min-h-[44px] min-w-0 flex-1 rounded-lg border bg-transparent px-3 text-sm outline-none"
                style={{ borderColor: "var(--ilc-hairline)" }}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={send}
                disabled={!draft.trim() || !selected || !userId}
                aria-label="Send message"
                className="h-11 w-11 shrink-0 rounded-lg disabled:opacity-40"
                style={{ background: "var(--ilc-teal)", color: "#04201E" }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </section>
      </div>
        </>
      )}
    </div>
  );
};
