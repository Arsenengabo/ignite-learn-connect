import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Ban, Flag, Forward, MoreHorizontal, MoreVertical, Pencil, Pin, PinOff, Reply, School, Search, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { chatApi, type ChatAttachmentInput, type DirectChat, type DirectMessage } from "@/lib/chatApi";
import { ReportDialog } from "@/components/chat/ReportDialog";
import { BlockedPeopleDialog } from "@/components/chat/BlockedPeopleDialog";
import { JoinSchoolCard } from "@/components/chat/JoinSchoolCard";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageBody, ChatMessageMeta } from "@/components/chat/ChatMessageBody";
import { ForwardMessageDialog } from "@/components/chat/ForwardMessageDialog";
import { useChatPresence } from "@/components/chat/useChatPresence";
import type { ChatOutgoingMessage, ChatReplyPreview } from "@/components/chat/messageFeatures";

interface StudentRow {
  user_id: string;
  full_name: string;
  school_name: string;
  province: string;
  district: string;
}

const time = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const initials = (name: string) => name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export const DirectMessages = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [ownName, setOwnName] = useState("You");
  const [threads, setThreads] = useState<DirectChat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftThread, setDraftThread] = useState<DirectChat | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [people, setPeople] = useState<StudentRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [reportTarget, setReportTarget] = useState<DirectMessage | null>(null);
  const [forwardTarget, setForwardTarget] = useState<DirectMessage | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatReplyPreview | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const messageSearchRef = useRef<HTMLInputElement>(null);
  const reloadTimer = useRef<number>();

  const active = threads.find((t) => t.thread_id === activeId) ?? (draftThread?.thread_id === activeId ? draftThread : null);
  const presence = useChatPresence("direct", activeId, userId, ownName);

  const loadThreads = useCallback(async () => {
    try {
      setThreads(await chatApi.listDirectChats());
    } catch (error) {
      toast.error((error as Error).message || "Could not load your conversations");
    }
  }, []);

  const loadMessages = useCallback(async (threadId: string, markRead = true) => {
    try {
      setMessages(await chatApi.listDirectMessages(threadId));
      if (markRead) await chatApi.markDirectActive(threadId);
      if (markRead) loadThreads();
    } catch (error) {
      toast.error((error as Error).message || "Could not load messages");
    }
  }, [loadThreads]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!cancelled) {
        setUserId(auth.user?.id ?? null);
        setOwnName(auth.user?.user_metadata?.full_name || "You");
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
      const { data, error } = await supabase.rpc("search_students", { _query: query.trim(), _same_school_only: true });
      if (cancelled) return;
      if (error) toast.error("Search failed");
      else setPeople((data as StudentRow[]) ?? []);
      setSearching(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [finding, query]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setMessages([]);
    setReplyTo(null);
    setEditing(null);
    loadMessages(activeId);

    const reload = () => {
      if (cancelled) return;
      window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => {
        loadMessages(activeId);
        loadThreads();
      }, 250);
    };
    const messagesChannel = supabase
      .channel(`dm-${activeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages", filter: `thread_id=eq.${activeId}` }, reload)
      .subscribe();
    const reactionsChannel = supabase
      .channel(`dm-reactions-${activeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reactions" }, reload)
      .subscribe();
    return () => {
      cancelled = true;
      window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [activeId, loadMessages, loadThreads]);

  const visibleThreads = useMemo(() => {
    const search = threadSearch.trim().toLowerCase();
    return threads.filter((thread) => !search || `${thread.other_name} ${thread.other_school} ${thread.last_message ?? ""}`.toLowerCase().includes(search));
  }, [threads, threadSearch]);

  const visibleMessages = useMemo(() => {
    const search = messageSearch.trim().toLowerCase();
    return search ? messages.filter((message) => `${message.content} ${message.attachment_name ?? ""}`.toLowerCase().includes(search)) : messages;
  }, [messages, messageSearch]);

  const pinnedMessages = useMemo(() => messages.filter((message) => message.is_pinned && !message.deleted_at).slice(-3), [messages]);

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
      unread_count: 0,
      other_last_read_at: null,
      other_last_delivered_at: null,
      last_message_type: "text",
    });
    open(data as string);
    setFinding(false);
    setQuery("");
    loadThreads();
  };

  const send = async ({ text, file }: ChatOutgoingMessage) => {
    if (!active || !userId) return;
    let uploaded: ChatAttachmentInput | null = null;
    try {
      if (editing) {
        await chatApi.editDirectMessage(editing.id, text);
        setEditing(null);
      } else {
        if (file) uploaded = await chatApi.uploadAttachment("direct", active.thread_id, userId, file);
        await chatApi.sendDirect({ threadId: active.thread_id, senderId: userId, message: text, replyToId: replyTo?.id ?? null, attachment: uploaded });
        setReplyTo(null);
      }
      await chatApi.markDirectActive(active.thread_id);
      await Promise.all([loadMessages(active.thread_id, false), loadThreads()]);
    } catch (error) {
      if (uploaded) await chatApi.removeAttachment(uploaded.path).catch(() => undefined);
      toast.error((error as Error).message || "Message not sent");
      throw error;
    }
  };

  const remove = async (message: DirectMessage) => {
    try {
      await chatApi.deleteDirectMessage(message.id);
      await Promise.all([loadMessages(message.thread_id), loadThreads()]);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const react = async (message: DirectMessage, emoji: string) => {
    try {
      await chatApi.react(null, message.id, emoji);
      await loadMessages(message.thread_id, false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const pin = async (message: DirectMessage) => {
    try {
      await chatApi.setDirectPinned(message.id, !message.is_pinned);
      await loadMessages(message.thread_id, false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const forward = async (target: { type: "room" | "direct"; id: string }) => {
    if (!forwardTarget) return;
    await chatApi.forward({ dmMessageId: forwardTarget.id }, target);
  };

  const setBlocked = async (thread: DirectChat, block: boolean) => {
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

  const actionsFor = (message: DirectMessage) => {
    if (message.deleted_at) return null;
    const mine = message.sender_id === userId;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="chat-message-actions" aria-label="Message actions"><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="[&_svg]:mr-2 [&_svg]:h-4 [&_svg]:w-4">
          <DropdownMenuItem onSelect={() => { setReplyTo({ id: message.id, senderName: mine ? ownName : active?.other_name || "Student", text: message.content, attachmentName: message.attachment_name }); setEditing(null); }}><Reply /> Reply</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pin(message)}>{message.is_pinned ? <PinOff /> : <Pin />} {message.is_pinned ? "Unpin" : "Pin"}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setForwardTarget(message)}><Forward /> Forward</DropdownMenuItem>
          {mine && <DropdownMenuItem onSelect={() => { setEditing({ id: message.id, text: message.content }); setReplyTo(null); }}><Pencil /> Edit</DropdownMenuItem>}
          {mine ? (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => remove(message)}><Trash2 /> Delete</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setReportTarget(message)}><Flag /> Report message</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const directory = (
    <aside className={`chat-directory ${active ? "chat-mobile-hidden" : ""}`}>
      <div className="chat-directory-header">
        <div className="flex items-center justify-between gap-3">
          <div><p className="chat-eyebrow">Schoolmates</p><h2 className="chat-heading">Messages</h2></div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={() => setBlockedOpen(true)} aria-label="Blocked people" title="Blocked people"><ShieldCheck /></Button>
            <Button type="button" variant="ghost" size="icon" className="chat-new-button" onClick={() => setFinding(true)} aria-label="New conversation" title="New conversation"><UserPlus /></Button>
          </div>
        </div>
        <label className="chat-search"><Search aria-hidden="true" /><span className="sr-only">Search conversations</span><input value={threadSearch} onChange={(event) => setThreadSearch(event.target.value)} placeholder="Search conversations" /></label>
      </div>
      <div className="chat-list">
        {loading && <p className="chat-state">Loading conversations…</p>}
        {!loading && visibleThreads.length === 0 && (
          <div className="chat-state-block"><Users /><p>No conversations yet.</p><Button type="button" onClick={() => setFinding(true)} className="chat-primary-action">Find schoolmates</Button></div>
        )}
        {visibleThreads.map((thread) => (
          <Button key={thread.thread_id} type="button" variant="ghost" onClick={() => open(thread.thread_id)} className={`chat-list-item ${thread.thread_id === activeId ? "chat-list-item-active" : ""}`}>
            <span className="chat-avatar">{initials(thread.other_name) || "ST"}</span>
            <span className="min-w-0 flex-1 text-left">
              <span className="chat-list-title">{thread.other_name}</span>
              <span className="chat-list-preview">{thread.is_blocked ? "Blocked" : thread.last_message || thread.other_school || "Start chatting"}</span>
            </span>
            <span className="chat-list-side">
              <span className="chat-list-time">{time(thread.last_message_at)}</span>
              {thread.unread_count > 0 && <span className="chat-unread-badge">{thread.unread_count > 99 ? "99+" : thread.unread_count}</span>}
            </span>
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
            <div className="flex items-center gap-2"><Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={() => setFinding(false)} aria-label="Back to conversations"><ArrowLeft /></Button><h2 className="chat-heading">Find schoolmates</h2></div>
            <label className="chat-search"><Search aria-hidden="true" /><span className="sr-only">Search students</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /></label>
            <p className="text-xs leading-relaxed text-[var(--chat-muted)]">To keep everyone safe, private messages are only open between students at the same school.</p>
          </div>
          <div className="chat-list">
            {searching && <p className="chat-state">Searching…</p>}
            {!searching && people.length === 0 && <><p className="chat-state">No schoolmates found.</p><JoinSchoolCard /></>}
            {people.map((person) => (
              <Button key={person.user_id} type="button" variant="ghost" onClick={() => openWith(person)} className="chat-list-item">
                <span className="chat-avatar">{initials(person.full_name) || "ST"}</span>
                <span className="min-w-0 flex-1 text-left"><span className="chat-list-title">{person.full_name}</span><span className="chat-list-preview"><School /> {person.school_name}{person.district ? ` · ${person.district}` : ""}</span></span>
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
              <div className="min-w-0 flex-1">
                <h3 className="chat-contact-name">{active.other_name}</h3>
                <p className="chat-contact-meta">
                  {presence.typingNames.length > 0 ? "typing…" : presence.isOnline(active.other_user_id) ? "Online" : active.other_school || "Student"}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={toggleMessageSearch} aria-label={messageSearchOpen ? "Close message search" : "Search this conversation"} aria-pressed={messageSearchOpen}><Search /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="chat-icon-button" aria-label="Conversation options" title="Conversation options"><MoreVertical /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="[&_svg]:mr-2 [&_svg]:h-4 [&_svg]:w-4">
                  <DropdownMenuItem onSelect={() => setBlocked(active, !active.is_blocked)} className={active.is_blocked ? "" : "text-destructive focus:text-destructive"}><Ban /> {active.is_blocked ? `Unblock ${active.other_name}` : `Block ${active.other_name}`}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setBlockedOpen(true)}><ShieldCheck /> Blocked people</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setFinding(true)}><UserPlus /> Message someone else</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>
            {messageSearchOpen && (
              <label className="chat-message-search"><Search aria-hidden="true" /><span className="sr-only">Search messages with {active.other_name}</span><input ref={messageSearchRef} value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder={`Search messages with ${active.other_name}`} /><span>{visibleMessages.length} found</span></label>
            )}
            {pinnedMessages.length > 0 && (
              <nav className="chat-pinned-bar" aria-label="Pinned messages"><Pin aria-hidden="true" />{pinnedMessages.map((message) => <button key={message.id} type="button" onClick={() => document.getElementById(`msg-${message.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{message.content || message.attachment_name || "Attachment"}</button>)}</nav>
            )}
            <Conversation className="chat-conversation">
              <ConversationContent className="chat-message-list">
                {messages.length === 0 ? <ConversationEmptyState title="Start the conversation" description={`Say hello to ${active.other_name}.`} /> : visibleMessages.length === 0 ? <ConversationEmptyState title="No matching messages" description="Try a different search term." /> : visibleMessages.map((message) => {
                  const mine = message.sender_id === userId;
                  const receipt = mine ? (active.other_last_read_at && message.created_at <= active.other_last_read_at ? "read" : active.other_last_delivered_at && message.created_at <= active.other_last_delivered_at ? "delivered" : "sent") : undefined;
                  return (
                    <div key={message.id} id={`msg-${message.id}`} className={`chat-row ${mine ? "chat-row-mine" : ""}`}>
                      <Message from={mine ? "user" : "assistant"} className="chat-message">
                        <MessageContent className={mine ? "chat-bubble-outgoing" : "chat-bubble-incoming"}>
                          <ChatMessageBody
                            text={message.content}
                            deleted={Boolean(message.deleted_at)}
                            kind={message.message_type}
                            attachment={message.attachment_path && message.attachment_name && message.attachment_mime && message.attachment_size ? { path: message.attachment_path, name: message.attachment_name, mime: message.attachment_mime, size: message.attachment_size } : null}
                            reply={message.reply_to_id ? { id: message.reply_to_id, senderName: message.reply_sender_name || "Student", text: message.reply_text || "" } : null}
                            editedAt={message.edited_at}
                            pinned={message.is_pinned}
                            search={messageSearch}
                            reactions={message.reactions}
                            onReact={(emoji) => react(message, emoji)}
                          />
                          <ChatMessageMeta timestamp={message.created_at} receipt={receipt} edited={Boolean(message.edited_at)} />
                        </MessageContent>
                      </Message>
                      {actionsFor(message)}
                    </div>
                  );
                })}
              </ConversationContent>
              <ConversationScrollButton className="chat-scroll-button" />
            </Conversation>
            <footer className="chat-composer-wrap">
              {active.is_blocked ? (
                <div className="chat-composer-notice">You blocked {active.other_name}. <button type="button" className="chat-link" onClick={() => setBlocked(active, false)}>Unblock</button></div>
              ) : !active.can_message ? (
                <p className="chat-composer-notice">You can't send messages here any more. Private messages are only open between students at the same school.</p>
              ) : (
                <ChatComposer
                  onSend={send}
                  onTyping={presence.sendTyping}
                  placeholder="Type a message"
                  reply={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                  editing={editing}
                  onCancelEdit={() => setEditing(null)}
                  mentionOptions={[{ id: active.other_user_id, name: active.other_name }]}
                />
              )}
            </footer>
          </>
        ) : <ConversationEmptyState icon={<Users />} title="Your conversations" description="Choose a conversation or find a schoolmate to message." />}
      </main>
      {reportTarget && active && (
        <ReportDialog open onOpenChange={(isOpen) => !isOpen && setReportTarget(null)} authorName={active.other_name} preview={reportTarget.content || reportTarget.attachment_name || "Attachment"} reviewer="your school admin" onSubmit={(reason, details) => chatApi.reportDirectMessage(reportTarget.id, reason, details)} onBlock={() => setBlocked(active, true)} />
      )}
      <ForwardMessageDialog open={Boolean(forwardTarget)} onOpenChange={(isOpen) => !isOpen && setForwardTarget(null)} onForward={forward} />
      {blockedDialog}
    </>
  );
};
