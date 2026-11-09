import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Ban, Flag, MoreHorizontal, MoreVertical, School, Search, Send, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { chatApi } from "@/lib/chatApi";
import { ReportDialog } from "@/components/chat/ReportDialog";
import { BlockedPeopleDialog } from "@/components/chat/BlockedPeopleDialog";
import { JoinSchoolCard } from "@/components/chat/JoinSchoolCard";

interface ThreadRow {
  thread_id: string;
  other_user_id: string;
  other_name: string;
  other_school: string;
  last_message: string | null;
  last_message_at: string;
  is_blocked: boolean;
  can_message: boolean;
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
  deleted_at: string | null;
}

const time = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const initials = (name: string) =>
  name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export const DirectMessages = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftThread, setDraftThread] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [people, setPeople] = useState<StudentRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [reportTarget, setReportTarget] = useState<DM | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const messageSearchRef = useRef<HTMLInputElement>(null);

  const active = threads.find((t) => t.thread_id === activeId) ?? (draftThread?.thread_id === activeId ? draftThread : null);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_direct_chats");
    if (error) toast.error("Could not load your conversations");
    else setThreads((data as unknown as ThreadRow[]) ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!cancelled) setUserId(auth.user?.id ?? null);
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
      const { data, error } = await supabase.rpc("search_students", { _query: query.trim(), _same_school_only: true });
      if (cancelled) return;
      if (error) toast.error("Search failed");
      else setPeople((data as StudentRow[]) ?? []);
      setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [finding, query]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("thread_id", activeId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (error) toast.error("Could not load messages");
      else setMessages((data as unknown as DM[]) ?? []);
    })();

    const channel = supabase
      .channel(`dm-${activeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages", filter: `thread_id=eq.${activeId}` }, (payload) => {
        const incoming = payload.new as DM;
        if (!incoming?.id) return;
        setMessages((current) =>
          current.some((m) => m.id === incoming.id)
            ? current.map((m) => (m.id === incoming.id ? incoming : m))
            : [...current, incoming],
        );
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  const visibleThreads = useMemo(() => {
    const search = threadSearch.trim().toLowerCase();
    return threads.filter((thread) => !search || `${thread.other_name} ${thread.other_school} ${thread.last_message ?? ""}`.toLowerCase().includes(search));
  }, [threads, threadSearch]);

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

  const open = (threadId: string) => {
    setMessages([]);
    setActiveId(threadId);
  };

  const openWith = async (person: StudentRow) => {
    const { data, error } = await supabase.rpc("start_direct_chat", { _other_user_id: person.user_id });
    if (error || !data) return toast.error(error?.message || "Could not start the conversation");
    setDraftThread({
      thread_id: data as string,
      other_user_id: person.user_id,
      other_name: person.full_name,
      other_school: person.school_name,
      last_message: null,
      last_message_at: new Date().toISOString(),
      is_blocked: false,
      can_message: true,
    });
    open(data as string);
    setFinding(false);
    setQuery("");
    loadThreads();
  };

  const send = async ({ text }: { text: string }) => {
    const content = text.trim();
    if (!content || !active || !userId) return;
    if (content.length > 2000) {
      toast.error("Message is too long (2,000 characters at most)");
      throw new Error("Message is too long");
    }
    const { error } = await supabase.from("dm_messages").insert({ thread_id: active.thread_id, sender_id: userId, content });
    if (error) {
      toast.error(error.message || "Message not sent");
      throw error;
    }
    loadThreads();
  };

  const remove = async (message: DM) => {
    try {
      await chatApi.deleteDirectMessage(message.id);
      setMessages((list) => list.map((m) => (m.id === message.id ? { ...m, content: "", deleted_at: new Date().toISOString() } : m)));
      loadThreads();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const setBlocked = async (thread: ThreadRow, block: boolean) => {
    try {
      if (block) await chatApi.block(thread.other_user_id);
      else await chatApi.unblock(thread.other_user_id);
      toast.success(block ? `${thread.other_name} is blocked` : `${thread.other_name} is unblocked`, {
        description: block ? "They can't send you private messages, and they aren't told." : undefined,
      });
      setDraftThread(null);
      loadThreads();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const directory = (
    <aside className={`chat-directory ${active ? "chat-mobile-hidden" : ""}`}>
      <div className="chat-directory-header">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="chat-eyebrow">Schoolmates</p>
            <h2 className="chat-heading">Messages</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={() => setBlockedOpen(true)} aria-label="Blocked people" title="Blocked people">
              <ShieldCheck />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="chat-new-button" onClick={() => setFinding(true)} aria-label="New conversation" title="New conversation">
              <UserPlus />
            </Button>
          </div>
        </div>
        <label className="chat-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search conversations</span>
          <input value={threadSearch} onChange={(event) => setThreadSearch(event.target.value)} placeholder="Search conversations" />
        </label>
      </div>
      <div className="chat-list">
        {loading && <p className="chat-state">Loading conversations…</p>}
        {!loading && visibleThreads.length === 0 && (
          <div className="chat-state-block">
            <Users />
            <p>No conversations yet.</p>
            <Button type="button" onClick={() => setFinding(true)} className="chat-primary-action">Find schoolmates</Button>
          </div>
        )}
        {visibleThreads.map((thread) => (
          <Button
            key={thread.thread_id}
            type="button"
            variant="ghost"
            onClick={() => open(thread.thread_id)}
            className={`chat-list-item ${thread.thread_id === activeId ? "chat-list-item-active" : ""}`}
          >
            <span className="chat-avatar">{initials(thread.other_name) || "ST"}</span>
            <span className="min-w-0 flex-1 text-left">
              <span className="chat-list-title">{thread.other_name}</span>
              <span className="chat-list-preview">
                {thread.is_blocked ? "Blocked" : thread.last_message || thread.other_school || "Start chatting"}
              </span>
            </span>
            <span className="chat-list-time">{time(thread.last_message_at)}</span>
          </Button>
        ))}
      </div>
    </aside>
  );

  const blockedDialog = <BlockedPeopleDialog open={blockedOpen} onOpenChange={setBlockedOpen} onChanged={loadThreads} />;

  if (finding) {
    return (
      <>
        <aside className="chat-directory chat-finder">
          <div className="chat-directory-header">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={() => setFinding(false)} aria-label="Back to conversations"><ArrowLeft /></Button>
              <h2 className="chat-heading">Find schoolmates</h2>
            </div>
            <label className="chat-search"><Search aria-hidden="true" /><span className="sr-only">Search students</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /></label>
            <p className="text-xs leading-relaxed text-[var(--chat-muted)]">
              To keep everyone safe, private messages are only open between students at the same school.
            </p>
          </div>
          <div className="chat-list">
            {searching && <p className="chat-state">Searching…</p>}
            {!searching && people.length === 0 && (
              <>
                <p className="chat-state">No schoolmates found.</p>
                <JoinSchoolCard />
              </>
            )}
            {people.map((person) => (
              <Button key={person.user_id} type="button" variant="ghost" onClick={() => openWith(person)} className="chat-list-item">
                <span className="chat-avatar">{initials(person.full_name) || "ST"}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="chat-list-title">{person.full_name}</span>
                  <span className="chat-list-preview"><School /> {person.school_name}{person.district ? ` · ${person.district}` : ""}</span>
                </span>
              </Button>
            ))}
          </div>
        </aside>
        <main className="chat-pane chat-empty-pane"><ConversationEmptyState icon={<Users />} title="Message a schoolmate" description="Ask about homework, share notes and study together." /></main>
        {blockedDialog}
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
              <Button type="button" variant="ghost" size="icon" className="chat-back" onClick={() => setActiveId(null)} aria-label="Back to conversations"><ArrowLeft /></Button>
              <span className="chat-avatar">{initials(active.other_name) || "ST"}</span>
              <div className="min-w-0 flex-1"><h3 className="chat-contact-name">{active.other_name}</h3><p className="chat-contact-meta">{active.other_school || "Student"}</p></div>
              <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={toggleMessageSearch} aria-label={messageSearchOpen ? "Close message search" : "Search this conversation"} aria-pressed={messageSearchOpen}><Search /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="chat-icon-button" aria-label="Conversation options" title="Conversation options"><MoreVertical /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="[&_svg]:mr-2 [&_svg]:h-4 [&_svg]:w-4">
                  <DropdownMenuItem onSelect={() => setBlocked(active, !active.is_blocked)} className={active.is_blocked ? "" : "text-destructive focus:text-destructive"}>
                    <Ban /> {active.is_blocked ? `Unblock ${active.other_name}` : `Block ${active.other_name}`}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setBlockedOpen(true)}><ShieldCheck /> Blocked people</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setFinding(true)}><UserPlus /> Message someone else</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                {messages.length === 0 ? (
                  <ConversationEmptyState title="Start the conversation" description={`Say hello to ${active.other_name}.`} />
                ) : visibleMessages.length === 0 ? (
                  <ConversationEmptyState title="No matching messages" description="Try a different search term." />
                ) : visibleMessages.map((message) => {
                  const mine = message.sender_id === userId;
                  return (
                    <div key={message.id} className={`chat-row ${mine ? "chat-row-mine" : ""}`}>
                      <Message from={mine ? "user" : "assistant"} className="chat-message">
                        <MessageContent className={mine ? "chat-bubble-outgoing" : "chat-bubble-incoming"}>
                          {message.deleted_at ? <p className="chat-removed">Message deleted</p> : <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                          <span className="chat-time">{time(message.created_at)}</span>
                        </MessageContent>
                      </Message>
                      {!message.deleted_at && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="chat-message-actions" aria-label="Message actions"><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="[&_svg]:mr-2 [&_svg]:h-4 [&_svg]:w-4">
                            {mine ? (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => remove(message)}><Trash2 /> Delete</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => setReportTarget(message)}><Flag /> Report message</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </ConversationContent>
              <ConversationScrollButton className="chat-scroll-button" />
            </Conversation>
            <footer className="chat-composer-wrap">
              {active.is_blocked ? (
                <div className="chat-composer-notice">
                  You blocked {active.other_name}.{" "}
                  <button type="button" className="chat-link" onClick={() => setBlocked(active, false)}>Unblock</button>
                </div>
              ) : !active.can_message ? (
                <p className="chat-composer-notice">
                  You can't send messages here any more. Private messages are only open between students at the same school.
                </p>
              ) : (
                <PromptInput onSubmit={send} className="chat-composer">
                  <PromptInputTextarea placeholder="Type a message" className="chat-composer-input" />
                  <PromptInputFooter className="chat-composer-footer">
                    <span className="chat-composer-hint">Enter to send · Shift + Enter for a new line</span>
                    <PromptInputSubmit className="chat-send" disabled={!userId} aria-label="Send message"><Send /></PromptInputSubmit>
                  </PromptInputFooter>
                </PromptInput>
              )}
            </footer>
          </>
        ) : <ConversationEmptyState icon={<Users />} title="Your conversations" description="Choose a conversation or find a schoolmate to message." />}
      </main>
      {reportTarget && active && (
        <ReportDialog
          open
          onOpenChange={(isOpen) => !isOpen && setReportTarget(null)}
          authorName={active.other_name}
          preview={reportTarget.content}
          reviewer="your school admin"
          onSubmit={(reason, details) => chatApi.reportDirectMessage(reportTarget.id, reason, details)}
          onBlock={() => setBlocked(active, true)}
        />
      )}
      {blockedDialog}
    </>
  );
};
