import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Hash,
  MessageCircle,
  MessagesSquare,
  MoreVertical,
  Search,
  Send,
  Users,
} from "lucide-react";
import { ChatMessageSchema, getValidationError } from "@/lib/validations";
import { DirectMessages } from "./DirectMessages";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

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

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const shortTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const StudentChat = () => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selected, setSelected] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"rooms" | "direct">("direct");
  const [roomSearch, setRoomSearch] = useState("");
  const [mobileRoomView, setMobileRoomView] = useState<"list" | "chat">("list");
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const roomSearchRef = useRef<HTMLInputElement>(null);
  const messageSearchRef = useRef<HTMLInputElement>(null);

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
      if (error) toast.error("Failed to load chat rooms");
      else {
        setChannels(data ?? []);
        setSelected(data?.[0] ?? null);
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
      if (error) return toast.error("Failed to load messages");
      const named = await Promise.all(
        (data ?? []).map(async (message) => {
          const { data: name } = await supabase.rpc("get_user_display_name", {
            _user_id: message.sender_id,
          });
          return { ...message, sender_name: (name as string) || "Student" };
        })
      );
      if (!cancelled) setMessages(named);
    };
    load();

    const realtime = supabase
      .channel(`student-chat-${selected.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${selected.id}` },
        async (payload) => {
          const incoming = payload.new as ChatMessage;
          const { data: name } = await supabase.rpc("get_user_display_name", {
            _user_id: incoming.sender_id,
          });
          setMessages((current) =>
            current.some((message) => message.id === incoming.id)
              ? current
              : [...current, { ...incoming, sender_name: (name as string) || "Student" }]
          );
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(realtime);
    };
  }, [selected]);

  const visibleChannels = useMemo(() => {
    const query = roomSearch.trim().toLowerCase();
    return query
      ? channels.filter((channel) => `${channel.name} ${channel.description ?? ""}`.toLowerCase().includes(query))
      : channels;
  }, [channels, roomSearch]);

  const visibleMessages = useMemo(() => {
    const query = messageSearch.trim().toLowerCase();
    return query ? messages.filter((message) => `${message.sender_name ?? ""} ${message.message}`.toLowerCase().includes(query)) : messages;
  }, [messages, messageSearch]);

  const toggleMessageSearch = () => {
    setMessageSearchOpen((open) => {
      if (open) setMessageSearch("");
      else window.setTimeout(() => messageSearchRef.current?.focus(), 0);
      return !open;
    });
  };

  const send = async ({ text }: { text: string }) => {
    if (!selected || !userId || !text.trim()) return;
    const parsed = ChatMessageSchema.safeParse({ message: text, channelId: selected.id, senderId: userId });
    if (!parsed.success) {
      toast.error(getValidationError(parsed.error));
      throw new Error("Invalid message");
    }
    const { error } = await supabase.from("chat_messages").insert({
      channel_id: parsed.data.channelId,
      sender_id: parsed.data.senderId,
      message: parsed.data.message,
    });
    if (error) {
      toast.error(error.message || "Failed to send message");
      throw error;
    }
  };

  return (
    <section className="chat-shell -mx-3 -my-4 sm:-mx-4 lg:-mx-6 lg:-my-6" aria-label="Student chat">
      <nav className="chat-rail" aria-label="Chat sections">
        <div className="chat-brand" aria-label="Ignite Learn Connect">ILC</div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={mode === "direct" ? "chat-rail-button-active" : "chat-rail-button"}
          onClick={() => setMode("direct")}
          aria-label="Direct messages"
          title="Direct messages"
        >
          <MessageCircle />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={mode === "rooms" ? "chat-rail-button-active" : "chat-rail-button"}
          onClick={() => setMode("rooms")}
          aria-label="Chat rooms"
          title="Chat rooms"
        >
          <Users />
        </Button>
        <div className="chat-rail-spacer" />
        <span className="chat-avatar chat-avatar-small">ME</span>
      </nav>

      {mode === "direct" ? (
        <DirectMessages />
      ) : (
        <>
          <aside className={`chat-directory ${mobileRoomView === "chat" ? "chat-mobile-hidden" : ""}`}>
            <div className="chat-directory-header">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="chat-eyebrow">Community</p>
                  <h2 className="chat-heading">Study rooms</h2>
                </div>
                <Button type="button" variant="ghost" size="icon" className="chat-icon-button" aria-label="Room options">
                  <MoreVertical />
                </Button>
              </div>
              <label className="chat-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Search rooms</span>
                <input ref={roomSearchRef} value={roomSearch} onChange={(event) => setRoomSearch(event.target.value)} placeholder="Search discussions" />
              </label>
              <div className="chat-filters" aria-label="Chat type">
                <Button type="button" variant="ghost" className="chat-filter-active">Rooms</Button>
                <Button type="button" variant="ghost" onClick={() => setMode("direct")} className="chat-filter">People</Button>
              </div>
            </div>

            <div className="chat-list">
              {loading && <p className="chat-state">Loading rooms…</p>}
              {!loading && visibleChannels.length === 0 && <p className="chat-state">No rooms found.</p>}
              {visibleChannels.map((channel) => {
                const active = selected?.id === channel.id;
                return (
                  <Button
                    key={channel.id}
                    type="button"
                    variant="ghost"
                    className={`chat-list-item ${active ? "chat-list-item-active" : ""}`}
                    onClick={() => {
                      setSelected(channel);
                      setMobileRoomView("chat");
                    }}
                  >
                    <span className="chat-avatar">{channel.channel_type.includes("school") ? <Users /> : <Hash />}</span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="chat-list-title">{channel.name}</span>
                      <span className="chat-list-preview">{channel.description || channel.school_name || "Student discussion"}</span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </aside>

          <main className={`chat-pane ${mobileRoomView === "list" ? "chat-mobile-hidden" : ""}`}>
            {selected ? (
              <>
                <header className="chat-pane-header">
                  <Button type="button" variant="ghost" size="icon" className="chat-back" onClick={() => setMobileRoomView("list")} aria-label="Back to rooms">
                    <ArrowLeft />
                  </Button>
                  <span className="chat-avatar">{initials(selected.name) || "#"}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="chat-contact-name">{selected.name}</h3>
                    <p className="chat-contact-meta">{selected.description || selected.school_name || "Student community room"}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={toggleMessageSearch} aria-label={messageSearchOpen ? "Close message search" : "Search this room"} aria-pressed={messageSearchOpen}><Search /></Button>
                  <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={() => roomSearchRef.current?.focus()} aria-label="Browse rooms" title="Browse rooms"><MoreVertical /></Button>
                </header>

                {messageSearchOpen && (
                  <label className="chat-message-search">
                    <Search aria-hidden="true" />
                    <span className="sr-only">Search messages in {selected.name}</span>
                    <input ref={messageSearchRef} value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder={`Search in ${selected.name}`} />
                    <span>{visibleMessages.length} found</span>
                  </label>
                )}

                <Conversation className="chat-conversation">
                  <ConversationContent className="chat-message-list">
                    <div className="chat-date-divider"><span>Today</span></div>
                    {messages.length === 0 ? (
                      <ConversationEmptyState icon={<MessagesSquare />} title="No messages yet" description="Say hello to everyone in this room." />
                    ) : visibleMessages.length === 0 ? (
                      <ConversationEmptyState icon={<Search />} title="No matching messages" description="Try a different search term." />
                    ) : visibleMessages.map((message) => {
                      const mine = message.sender_id === userId;
                      return (
                        <Message key={message.id} from={mine ? "user" : "assistant"} className="chat-message">
                          {!mine && <span className="chat-sender">{message.sender_name}</span>}
                          <MessageContent className={mine ? "chat-bubble-outgoing" : "chat-bubble-incoming"}>
                            <p className="whitespace-pre-wrap break-words">{message.message}</p>
                            <span className="chat-time">{shortTime(message.created_at)}{mine ? "  ✓✓" : ""}</span>
                          </MessageContent>
                        </Message>
                      );
                    })}
                  </ConversationContent>
                  <ConversationScrollButton className="chat-scroll-button" />
                </Conversation>

                <footer className="chat-composer-wrap">
                  <PromptInput onSubmit={send} className="chat-composer">
                    <PromptInputTextarea placeholder="Type a message" className="chat-composer-input" />
                    <PromptInputFooter className="chat-composer-footer">
                      <span className="chat-composer-hint">Enter to send · Shift + Enter for a new line</span>
                      <PromptInputSubmit className="chat-send" disabled={!selected || !userId} aria-label="Send message">
                        <Send />
                      </PromptInputSubmit>
                    </PromptInputFooter>
                  </PromptInput>
                </footer>
              </>
            ) : (
              <ConversationEmptyState icon={<MessagesSquare />} title="Choose a study room" description="Select a room from the list to start chatting." />
            )}
          </main>
        </>
      )}
    </section>
  );
};