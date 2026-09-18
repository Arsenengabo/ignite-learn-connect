import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, MoreVertical, School, Search, Send, UserPlus, Users } from "lucide-react";
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

interface ThreadRow {
  thread_id: string;
  other_user_id: string;
  other_name: string;
  other_school: string;
  last_message: string | null;
  last_message_at: string;
}

interface StudentRow {
  user_id: string;
  full_name: string;
  school_name: string;
  province: string;
  district: string;
}

interface DM {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

const time = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const initials = (name: string) =>
  name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export const DirectMessages = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [active, setActive] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [currentSchool, setCurrentSchool] = useState("");
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [sameSchoolOnly, setSameSchoolOnly] = useState(true);
  const [people, setPeople] = useState<StudentRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [threadScope, setThreadScope] = useState<"all" | "school">("all");
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const threadSearchRef = useRef<HTMLInputElement>(null);
  const messageSearchRef = useRef<HTMLInputElement>(null);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_direct_chats");
    if (error) toast.error("Could not load your conversations");
    else setThreads((data as ThreadRow[]) ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const nextUserId = auth.user?.id ?? null;
      if (!cancelled) setUserId(nextUserId);
      if (nextUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("school_name")
          .eq("id", nextUserId)
          .maybeSingle();
        if (!cancelled) setCurrentSchool(profile?.school_name ?? "");
      }
      await loadThreads();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadThreads]);

  useEffect(() => {
    if (!finding) return;
    let cancelled = false;
    setSearching(true);
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_students", {
        _query: query.trim(),
        _same_school_only: sameSchoolOnly,
      });
      if (cancelled) return;
      if (error) toast.error("Search failed");
      else setPeople((data as StudentRow[]) ?? []);
      setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [finding, query, sameSchoolOnly]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("id, content, sender_id, created_at")
        .eq("thread_id", active.thread_id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (error) toast.error("Could not load messages");
      else setMessages((data as DM[]) ?? []);
    })();

    const channel = supabase
      .channel(`dm-${active.thread_id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${active.thread_id}`,
      }, (payload) => {
        const incoming = payload.new as DM;
        setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [active]);

  const visibleThreads = useMemo(() => {
    const search = threadSearch.trim().toLowerCase();
    return threads.filter((thread) => {
      const matchesSearch = !search || `${thread.other_name} ${thread.other_school} ${thread.last_message ?? ""}`.toLowerCase().includes(search);
      const matchesScope = threadScope === "all" || (Boolean(currentSchool) && thread.other_school === currentSchool);
      return matchesSearch && matchesScope;
    });
  }, [threads, threadSearch, threadScope, currentSchool]);

  const visibleMessages = useMemo(() => {
    const search = messageSearch.trim().toLowerCase();
    return search ? messages.filter((message) => message.content.toLowerCase().includes(search)) : messages;
  }, [messages, messageSearch]);

  const toggleMessageSearch = () => {
    setMessageSearchOpen((open) => {
      if (open) setMessageSearch("");
      else window.setTimeout(() => messageSearchRef.current?.focus(), 0);
      return !open;
    });
  };

  const openWith = async (person: StudentRow) => {
    const { data, error } = await supabase.rpc("start_direct_chat", { _other_user_id: person.user_id });
    if (error || !data) return toast.error(error?.message || "Could not start the conversation");
    setMessages([]);
    setActive({
      thread_id: data as string,
      other_user_id: person.user_id,
      other_name: person.full_name,
      other_school: person.school_name,
      last_message: null,
      last_message_at: new Date().toISOString(),
    });
    setFinding(false);
    setQuery("");
    loadThreads();
  };

  const send = async ({ text }: { text: string }) => {
    const content = text.trim();
    if (!content || !active || !userId) return;
    if (content.length > 2000) {
      toast.error("Message is too long");
      throw new Error("Message is too long");
    }
    const { error } = await supabase.from("dm_messages").insert({
      thread_id: active.thread_id,
      sender_id: userId,
      content,
    });
    if (error) {
      toast.error(error.message || "Message not sent");
      throw error;
    }
    loadThreads();
  };

  const directory = (
    <aside className={`chat-directory ${active ? "chat-mobile-hidden" : ""}`}>
      <div className="chat-directory-header">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="chat-eyebrow">Connections</p>
            <h2 className="chat-heading">Messages</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" className="chat-new-button" onClick={() => setFinding(true)} aria-label="New conversation" title="New conversation">
            <UserPlus />
          </Button>
        </div>
        <label className="chat-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search conversations</span>
          <input ref={threadSearchRef} value={threadSearch} onChange={(event) => setThreadSearch(event.target.value)} placeholder="Search conversations" />
        </label>
        <div className="chat-filters" aria-label="Conversation filter">
          <Button type="button" variant="ghost" onClick={() => setThreadScope("all")} className={threadScope === "all" ? "chat-filter-active" : "chat-filter"} aria-pressed={threadScope === "all"}>All</Button>
          <Button type="button" variant="ghost" onClick={() => setThreadScope("school")} className={threadScope === "school" ? "chat-filter-active" : "chat-filter"} aria-pressed={threadScope === "school"} disabled={!currentSchool} title={currentSchool ? "Show students from your school" : "No school is linked to your profile"}>Schoolmates</Button>
        </div>
      </div>
      <div className="chat-list">
        {loading && <p className="chat-state">Loading conversations…</p>}
        {!loading && visibleThreads.length === 0 && (
          <div className="chat-state-block">
            <Users />
            <p>No conversations yet.</p>
            <Button type="button" onClick={() => setFinding(true)} className="chat-primary-action">Find students</Button>
          </div>
        )}
        {visibleThreads.map((thread) => (
          <Button
            key={thread.thread_id}
            type="button"
            variant="ghost"
            onClick={() => { setMessages([]); setActive(thread); }}
            className={`chat-list-item ${thread.thread_id === active?.thread_id ? "chat-list-item-active" : ""}`}
          >
            <span className="chat-avatar">{initials(thread.other_name) || "ST"}</span>
            <span className="min-w-0 flex-1 text-left">
              <span className="chat-list-title">{thread.other_name}</span>
              <span className="chat-list-preview">{thread.last_message || thread.other_school || "Start chatting"}</span>
            </span>
            <span className="chat-list-time">{time(thread.last_message_at)}</span>
          </Button>
        ))}
      </div>
    </aside>
  );

  if (finding) {
    return (
      <>
        <aside className="chat-directory chat-finder">
          <div className="chat-directory-header">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={() => setFinding(false)} aria-label="Back to conversations"><ArrowLeft /></Button>
              <h2 className="chat-heading">Find students</h2>
            </div>
            <label className="chat-search"><Search aria-hidden="true" /><span className="sr-only">Search students</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /></label>
            <div className="chat-filters">
              <Button type="button" variant="ghost" onClick={() => setSameSchoolOnly(true)} className={sameSchoolOnly ? "chat-filter-active" : "chat-filter"}>My school</Button>
              <Button type="button" variant="ghost" onClick={() => setSameSchoolOnly(false)} className={!sameSchoolOnly ? "chat-filter-active" : "chat-filter"}>All schools</Button>
            </div>
          </div>
          <div className="chat-list">
            {searching && <p className="chat-state">Searching…</p>}
            {!searching && people.length === 0 && <p className="chat-state">No students found.</p>}
            {people.map((person) => (
              <Button key={person.user_id} type="button" variant="ghost" onClick={() => openWith(person)} className="chat-list-item">
                <span className="chat-avatar">{initials(person.full_name) || "ST"}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="chat-list-title">{person.full_name}</span>
                  <span className="chat-list-preview"><School /> {person.school_name || "Independent learner"}{person.district ? ` · ${person.district}` : ""}</span>
                </span>
              </Button>
            ))}
          </div>
        </aside>
        <main className="chat-pane chat-empty-pane"><ConversationEmptyState icon={<Users />} title="Build your learning network" description="Connect with a schoolmate or a student from another school." /></main>
      </>
    );
  }

  return (
    <>
      {directory}
      <main className={`chat-pane ${!active ? "chat-mobile-hidden" : ""}`}>
        {active ? (
          <>
            <header className="chat-pane-header">
              <Button type="button" variant="ghost" size="icon" className="chat-back" onClick={() => setActive(null)} aria-label="Back to conversations"><ArrowLeft /></Button>
              <span className="chat-avatar">{initials(active.other_name) || "ST"}</span>
              <div className="min-w-0 flex-1"><h3 className="chat-contact-name">{active.other_name}</h3><p className="chat-contact-meta">{active.other_school || "Student"}</p></div>
              <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={toggleMessageSearch} aria-label={messageSearchOpen ? "Close message search" : "Search this conversation"} aria-pressed={messageSearchOpen}><Search /></Button>
              <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={() => setFinding(true)} aria-label="Find another student" title="Find another student"><MoreVertical /></Button>
            </header>
            {messageSearchOpen && (
              <label className="chat-message-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Search messages with {active.other_name}</span>
                <input ref={messageSearchRef} value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder={`Search messages with ${active.other_name}`} />
                <span>{visibleMessages.length} found</span>
              </label>
            )}
            <Conversation className="chat-conversation">
              <ConversationContent className="chat-message-list">
                <div className="chat-date-divider"><span>Today</span></div>
                {messages.length === 0 ? (
                  <ConversationEmptyState title="Start the conversation" description={`Say hello to ${active.other_name}.`} />
                ) : visibleMessages.length === 0 ? (
                  <ConversationEmptyState title="No matching messages" description="Try a different search term." />
                ) : visibleMessages.map((message) => {
                  const mine = message.sender_id === userId;
                  return (
                    <Message key={message.id} from={mine ? "user" : "assistant"} className="chat-message">
                      <MessageContent className={mine ? "chat-bubble-outgoing" : "chat-bubble-incoming"}>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <span className="chat-time">{time(message.created_at)}{mine ? "  ✓✓" : ""}</span>
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
                  <PromptInputSubmit className="chat-send" disabled={!active || !userId} aria-label="Send message"><Send /></PromptInputSubmit>
                </PromptInputFooter>
              </PromptInput>
            </footer>
          </>
        ) : <ConversationEmptyState icon={<Users />} title="Your conversations" description="Choose a conversation or find someone new to connect with." />}
      </main>
    </>
  );
};