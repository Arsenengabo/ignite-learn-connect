import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Flag,
  GraduationCap,
  Hash,
  ListChecks,
  Loader2,
  MessageSquare,
  MessagesSquare,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  School,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  StickyNote,
  Timer,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import {
  chatApi,
  formatWhen,
  MUTE_OPTIONS,
  POSTING_MODES,
  type PostingMode,
  type PostKind,
  type Room,
  type RoomMessage,
} from "@/lib/chatApi";
import { ReportDialog } from "./ReportDialog";
import { ChatReports } from "./ChatReports";
import { CreateClassDialog, MembersDialog } from "./ClassRoomDialogs";
import { BlockedPeopleDialog } from "./BlockedPeopleDialog";
import { JoinSchoolCard } from "./JoinSchoolCard";

type Filter = "all" | "class" | "school" | "community";

const initials = (name: string) =>
  name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
const shortTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const kindOf = (room: Room): Exclude<Filter, "all"> =>
  room.channel_type === "class_room" ? "class" : room.channel_type === "school_room" ? "school" : "community";
const modeLabel = (mode: PostingMode) => POSTING_MODES.find((m) => m.value === mode)?.label ?? mode;
const keyPoints = (text: string) =>
  text
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

const RoomIcon = ({ room }: { room: Room }) => {
  const kind = kindOf(room);
  if (kind === "class") return <GraduationCap />;
  if (kind === "school") return <School />;
  return <Hash />;
};

interface RoomsViewProps {
  audience: "student" | "teacher";
}

/** Rooms for students and teachers: class rooms, the school room and community rooms. */
export const RoomsView = ({ audience }: RoomsViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [teachingSchools, setTeachingSchools] = useState<{ school_id: string; school_name: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState<null | "members" | "add">(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [openReports, setOpenReports] = useState(0);
  const [reportTarget, setReportTarget] = useState<RoomMessage | null>(null);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const [kind, setKind] = useState<PostKind>("message");
  const [title, setTitle] = useState("");
  const [pinNew, setPinNew] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const reloadTimer = useRef<number>();
  const messageSearchRef = useRef<HTMLInputElement>(null);

  const selected = rooms.find((room) => room.id === selectedId) ?? null;

  const loadRooms = useCallback(async (preferId?: string) => {
    try {
      const list = await chatApi.listRooms();
      setRooms(list);
      setSelectedId((current) => preferId ?? (current && list.some((r) => r.id === current) ? current : list[0]?.id ?? null));
    } catch (error) {
      toast.error((error as Error).message || "Failed to load rooms");
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
    loadRooms();
    chatApi.teachingSchools().then(setTeachingSchools).catch(() => setTeachingSchools([]));
    if (audience === "teacher") chatApi.reports("open").then((r) => setOpenReports(r.length)).catch(() => undefined);
  }, [audience, loadRooms]);

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      setMessages(await chatApi.listMessages(roomId));
    } catch (error) {
      toast.error((error as Error).message || "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setMessages([]);
    setLoadingMessages(true);
    setExpanded(new Set());
    setKind("message");
    setTitle("");
    setPinNew(false);
    loadMessages(selectedId);
    if (userId) chatApi.myMute(selectedId, userId).then(setMutedUntil).catch(() => setMutedUntil(null));

    const realtime = supabase
      .channel(`room-${selectedId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${selectedId}` }, () => {
        window.clearTimeout(reloadTimer.current);
        reloadTimer.current = window.setTimeout(() => loadMessages(selectedId), 250);
      })
      .subscribe();
    return () => {
      window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(realtime);
    };
  }, [selectedId, userId, loadMessages]);

  const visibleRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    return rooms.filter(
      (room) =>
        (filter === "all" || kindOf(room) === filter) &&
        (!q || `${room.name} ${room.description ?? ""} ${room.school_name}`.toLowerCase().includes(q)),
    );
  }, [rooms, filter, roomSearch]);

  const hasSchoolRoom = rooms.some((room) => room.channel_type === "school_room");

  const { timeline, comments, pinned } = useMemo(() => {
    const q = messageSearch.trim().toLowerCase();
    const byParent = new Map<string, RoomMessage[]>();
    const top: RoomMessage[] = [];
    for (const m of messages) {
      if (m.parent_id) byParent.set(m.parent_id, [...(byParent.get(m.parent_id) ?? []), m]);
      else top.push(m);
    }
    const matches = (m: RoomMessage) => !q || `${m.sender_name} ${m.title ?? ""} ${m.message}`.toLowerCase().includes(q);
    return {
      timeline: top.filter((m) => matches(m) || (byParent.get(m.id) ?? []).some(matches)),
      comments: byParent,
      pinned: top.filter((m) => m.is_pinned && !m.is_deleted),
    };
  }, [messages, messageSearch]);

  const isMuted = Boolean(mutedUntil && new Date(mutedUntil) > new Date()) && !selected?.can_moderate;
  const canStartPost = Boolean(selected && !isMuted && (selected.can_moderate || selected.posting_mode === "everyone"));
  const canComment = (post: RoomMessage) =>
    Boolean(selected && !isMuted && !post.is_deleted && (selected.can_moderate || (post.comments_open && selected.posting_mode !== "teachers_only")));

  const handleError = (error: unknown, fallback: string) => {
    const message = (error as Error).message || fallback;
    if (/paused your messages/.test(message) && selectedId && userId) chatApi.myMute(selectedId, userId).then(setMutedUntil);
    toast.error(message);
  };

  const send = async ({ text }: { text: string }) => {
    if (!selected || !userId || !text.trim()) return;
    if (kind !== "message" && !title.trim()) {
      toast.error(kind === "note" ? "Give your note a title" : "Give your key points a title");
      throw new Error("Missing title");
    }
    try {
      await chatApi.post({ channelId: selected.id, senderId: userId, message: text.trim(), kind, title: title.trim(), pinned: kind !== "message" && pinNew });
      if (kind !== "message") {
        setKind("message");
        setTitle("");
        setPinNew(false);
        toast.success(kind === "note" ? "Note posted" : "Key points posted");
      }
      loadMessages(selected.id);
    } catch (error) {
      handleError(error, "Failed to send message");
      throw error;
    }
  };

  const sendComment = async (post: RoomMessage, text: string) => {
    if (!selected || !userId) return false;
    try {
      await chatApi.post({ channelId: selected.id, senderId: userId, message: text, parentId: post.id });
      setExpanded((current) => new Set(current).add(post.id));
      loadMessages(selected.id);
      return true;
    } catch (error) {
      handleError(error, "Comment not sent");
      return false;
    }
  };

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      toast.success(done);
      if (selectedId) loadMessages(selectedId);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const changeMode = async (mode: PostingMode) => {
    if (!selected) return;
    try {
      await chatApi.setPostingMode(selected.id, mode);
      setRooms((list) => list.map((r) => (r.id === selected.id ? { ...r, posting_mode: mode } : r)));
      toast.success(modeLabel(mode));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const archive = async () => {
    if (!selected) return;
    try {
      await chatApi.archiveClass(selected.id);
      toast.success(`${selected.name} archived`);
      setSelectedId(null);
      setMobileView("list");
      loadRooms();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const block = async (person: { id: string; name: string }) => {
    await chatApi.block(person.id);
    toast.success(`${person.name} is blocked`, { description: "You won't see their messages or get private messages from them." });
    if (selectedId) loadMessages(selectedId);
  };

  const reviewer = selected?.school_id ? "your teachers and school admin" : "the Codex team";

  const actionsFor = (m: RoomMessage, isPost: boolean) => {
    if (!selected || m.is_deleted) return null;
    const mine = m.sender_id === userId;
    const mod = selected.can_moderate;
    const items: JSX.Element[] = [];
    if (mod && !m.parent_id) {
      items.push(
        <DropdownMenuItem key="pin" onSelect={() => run(() => chatApi.setPinned(m.id, !m.is_pinned), m.is_pinned ? "Unpinned" : "Pinned to the top")}>
          {m.is_pinned ? <PinOff /> : <Pin />} {m.is_pinned ? "Unpin" : "Pin to top"}
        </DropdownMenuItem>,
      );
      if (isPost)
        items.push(
          <DropdownMenuItem key="comments" onSelect={() => run(() => chatApi.setComments(m.id, !m.comments_open), m.comments_open ? "Comments turned off" : "Comments turned on")}>
            <MessageSquare /> {m.comments_open ? "Turn off comments" : "Turn on comments"}
          </DropdownMenuItem>,
        );
    }
    if (mine || mod)
      items.push(
        <DropdownMenuItem key="delete" className="text-destructive focus:text-destructive" onSelect={() => run(() => chatApi.deleteMessage(m.id), mine ? "Message deleted" : "Message removed")}>
          <Trash2 /> {mine ? "Delete" : "Remove message"}
        </DropdownMenuItem>,
      );
    if (!mine) {
      if (items.length) items.push(<DropdownMenuSeparator key="sep" />);
      items.push(
        <DropdownMenuItem key="report" onSelect={() => setReportTarget(m)}>
          <Flag /> Report message
        </DropdownMenuItem>,
      );
      if (mod && !m.sender_is_teacher)
        items.push(
          <DropdownMenuSub key="mute">
            <DropdownMenuSubTrigger><Timer className="mr-2 h-4 w-4" /> Pause {m.sender_name.split(" ")[0]}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {MUTE_OPTIONS.map((option) => (
                <DropdownMenuItem key={option.minutes} onSelect={() => run(() => chatApi.mute(selected.id, m.sender_id, option.minutes), `${m.sender_name} can't post here ${option.label.toLowerCase()}`)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>,
        );
      if (!m.sender_is_teacher)
        items.push(
          <DropdownMenuItem key="block" onSelect={() => block({ id: m.sender_id, name: m.sender_name }).catch((e) => toast.error(e.message))}>
            <Ban /> Block {m.sender_name.split(" ")[0]}
          </DropdownMenuItem>,
        );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="chat-message-actions" aria-label={`Actions for message from ${m.sender_name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="[&_svg]:mr-2 [&_svg]:h-4 [&_svg]:w-4">{items}</DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderComments = (post: RoomMessage) => {
    const list = (comments.get(post.id) ?? []).filter((c) => !c.is_deleted || selected?.can_moderate);
    const open = expanded.has(post.id);
    const shown = open ? list : list.slice(-2);
    return (
      <div className="chat-post-comments">
        {list.length > shown.length && (
          <button type="button" className="chat-link" onClick={() => setExpanded((s) => new Set(s).add(post.id))}>
            View all {list.length} comments
          </button>
        )}
        {shown.map((c) => (
          <div key={c.id} className="chat-comment">
            <span className="chat-avatar chat-avatar-xs">{initials(c.sender_name) || "?"}</span>
            <div className="min-w-0 flex-1">
              <p className="chat-comment-meta">
                <span className="font-semibold text-[var(--chat-ink)]">{c.sender_name}</span>
                {c.sender_is_teacher && <span className="chat-teacher-tag">Teacher</span>}
                <span>{shortTime(c.created_at)}</span>
              </p>
              {c.is_deleted ? <p className="chat-removed">Comment removed</p> : <p className="whitespace-pre-wrap break-words">{c.message}</p>}
            </div>
            {actionsFor(c, false)}
          </div>
        ))}
        {canComment(post) ? (
          <CommentBox onSend={(text) => sendComment(post, text)} />
        ) : !post.is_deleted ? (
          <p className="chat-comment-closed">{isMuted ? "Your messages are paused in this room." : "Comments are turned off for this post."}</p>
        ) : null}
      </div>
    );
  };

  const renderPost = (m: RoomMessage) => {
    const Icon = m.post_kind === "note" ? StickyNote : ListChecks;
    return (
      <article key={m.id} id={`msg-${m.id}`} className={`chat-post ${m.post_kind === "note" ? "chat-post-note" : "chat-post-points"}`}>
        <header className="chat-post-header">
          <span className="chat-post-icon"><Icon /></span>
          <div className="min-w-0 flex-1">
            <p className="chat-post-kind">
              {m.post_kind === "note" ? "Note" : "Key points"}
              {m.is_pinned && <span className="chat-pin-tag"><Pin /> Pinned</span>}
            </p>
            {m.is_deleted ? <h4 className="chat-removed">This post was removed</h4> : <h4 className="chat-post-title">{m.title || "Untitled"}</h4>}
            <p className="chat-post-by">{m.sender_name} · {formatWhen(m.created_at)}</p>
          </div>
          {actionsFor(m, true)}
        </header>
        {!m.is_deleted &&
          (m.post_kind === "key_points" ? (
            <ol className="chat-post-points-list">
              {keyPoints(m.message).map((point, i) => <li key={i}>{point}</li>)}
            </ol>
          ) : (
            <p className="chat-post-body">{m.message}</p>
          ))}
        {!m.is_deleted && renderComments(m)}
      </article>
    );
  };

  const renderMessage = (m: RoomMessage) => {
    const mine = m.sender_id === userId;
    const hasReplies = (comments.get(m.id) ?? []).length > 0;
    return (
      <div key={m.id} id={`msg-${m.id}`} className={`chat-row ${mine ? "chat-row-mine" : ""}`}>
        <Message from={mine ? "user" : "assistant"} className="chat-message">
          {!mine && (
            <span className="chat-sender">
              {m.sender_name}
              {m.sender_is_teacher && <span className="chat-teacher-tag">Teacher</span>}
            </span>
          )}
          <MessageContent className={mine ? "chat-bubble-outgoing" : "chat-bubble-incoming"}>
            {m.is_pinned && <span className="chat-pin-tag mb-1"><Pin /> Pinned</span>}
            {m.is_deleted ? <p className="chat-removed">Message removed</p> : <p className="whitespace-pre-wrap break-words">{m.message}</p>}
            <span className="chat-time">{shortTime(m.created_at)}</span>
          </MessageContent>
          {hasReplies && <div className="w-full">{renderComments(m)}</div>}
        </Message>
        {actionsFor(m, false)}
      </div>
    );
  };

  const composerNotice = !selected
    ? null
    : isMuted
      ? `A teacher paused your messages in this room until ${formatWhen(mutedUntil!)}.`
      : !canStartPost
        ? selected.posting_mode === "comments_only"
          ? "Only teachers start posts in this room. You can comment under their notes and key points."
          : "Only teachers post in this room."
        : null;

  return (
    <>
      <aside className={`chat-directory ${mobileView === "chat" ? "chat-mobile-hidden" : ""}`}>
        <div className="chat-directory-header">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="chat-eyebrow">Classes &amp; community</p>
              <h2 className="chat-heading">Rooms</h2>
            </div>
            <div className="flex items-center gap-1">
              {openReports > 0 && (
                <Button type="button" variant="ghost" className="chat-report-badge" onClick={() => setReportsOpen(true)} aria-label={`${openReports} reports waiting`}>
                  <ShieldAlert /> {openReports}
                </Button>
              )}
              {teachingSchools.length > 0 && (
                <Button type="button" variant="ghost" size="icon" className="chat-new-button" onClick={() => setCreateOpen(true)} aria-label="New class room" title="New class room">
                  <Plus />
                </Button>
              )}
            </div>
          </div>
          <label className="chat-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search rooms</span>
            <input value={roomSearch} onChange={(e) => setRoomSearch(e.target.value)} placeholder="Search rooms" />
          </label>
          <div className="chat-filters" aria-label="Room type">
            {(["all", "class", "school", "community"] as Filter[]).map((f) => (
              <Button key={f} type="button" variant="ghost" onClick={() => setFilter(f)} className={filter === f ? "chat-filter-active" : "chat-filter"} aria-pressed={filter === f}>
                {f === "all" ? "All" : f === "class" ? "Classes" : f === "school" ? "School" : "Community"}
              </Button>
            ))}
          </div>
        </div>

        <div className="chat-list">
          {audience === "student" && !loadingRooms && !hasSchoolRoom && <JoinSchoolCard onJoined={() => loadRooms()} />}
          {loadingRooms && <p className="chat-state">Loading rooms…</p>}
          {!loadingRooms && visibleRooms.length === 0 && (
            <p className="chat-state">
              {filter === "class"
                ? teachingSchools.length
                  ? "No class rooms yet. Press + to create one."
                  : "You haven't been added to a class room yet."
                : "No rooms found."}
            </p>
          )}
          {visibleRooms.map((room) => (
            <Button
              key={room.id}
              type="button"
              variant="ghost"
              className={`chat-list-item ${room.id === selectedId ? "chat-list-item-active" : ""}`}
              onClick={() => {
                setSelectedId(room.id);
                setMobileView("chat");
              }}
            >
              <span className={`chat-avatar chat-avatar-${kindOf(room)}`}><RoomIcon room={room} /></span>
              <span className="min-w-0 flex-1 text-left">
                <span className="chat-list-title">{room.name}</span>
                <span className="chat-list-preview">
                  {kindOf(room) === "class" ? "Class" : kindOf(room) === "school" ? "School room" : "Community"}
                  {room.member_count != null && ` · ${room.member_count} ${room.member_count === 1 ? "member" : "members"}`}
                  {room.can_moderate && kindOf(room) === "class" && " · You teach"}
                </span>
              </span>
              {room.last_message_at && <span className="chat-list-time">{shortTime(room.last_message_at)}</span>}
            </Button>
          ))}
        </div>
      </aside>

      <main className={`chat-pane ${mobileView === "list" ? "chat-mobile-hidden" : ""}`}>
        {selected ? (
          <>
            <header className="chat-pane-header">
              <Button type="button" variant="ghost" size="icon" className="chat-back" onClick={() => setMobileView("list")} aria-label="Back to rooms">
                <ArrowLeft />
              </Button>
              <span className={`chat-avatar chat-avatar-${kindOf(selected)}`}><RoomIcon room={selected} /></span>
              <div className="min-w-0 flex-1">
                <h3 className="chat-contact-name">{selected.name}</h3>
                <p className="chat-contact-meta">
                  {selected.school_name && kindOf(selected) === "class" ? `${selected.school_name} · ` : ""}
                  {selected.description || (kindOf(selected) === "community" ? "Open to everyone on Codex" : "")}
                  {selected.posting_mode !== "everyone" && ` · ${modeLabel(selected.posting_mode)}`}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="chat-icon-button" onClick={() => {
                setMessageSearchOpen((open) => {
                  if (open) setMessageSearch("");
                  else window.setTimeout(() => messageSearchRef.current?.focus(), 0);
                  return !open;
                });
              }} aria-label={messageSearchOpen ? "Close message search" : "Search this room"} aria-pressed={messageSearchOpen}>
                <Search />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="chat-icon-button" aria-label="Room settings" title="Room settings">
                    <Settings2 />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 [&_svg]:mr-2 [&_svg]:h-4 [&_svg]:w-4">
                  {selected.can_moderate && (
                    <>
                      <DropdownMenuLabel>Who can post</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={selected.posting_mode} onValueChange={(v) => changeMode(v as PostingMode)}>
                        {POSTING_MODES.map((mode) => (
                          <DropdownMenuRadioItem key={mode.value} value={mode.value} className="items-start">
                            <span>
                              <span className="block text-sm">{mode.label}</span>
                              <span className="block text-xs text-muted-foreground">{mode.hint}</span>
                            </span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      {kindOf(selected) === "class" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setMembersOpen("members")}><Users /> Members</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setMembersOpen("add")}><UserPlus /> Add students</DropdownMenuItem>
                        </>
                      )}
                      {openReports > 0 && <DropdownMenuItem onSelect={() => setReportsOpen(true)}><ShieldAlert /> Reports ({openReports})</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onSelect={() => setBlockedOpen(true)}><Ban /> Blocked people</DropdownMenuItem>
                  {selected.can_moderate && kindOf(selected) === "class" && (
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setArchiveOpen(true)}>
                      <Trash2 /> Archive class
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            {messageSearchOpen && (
              <label className="chat-message-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Search messages in {selected.name}</span>
                <input ref={messageSearchRef} value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} placeholder={`Search in ${selected.name}`} />
                <span>{timeline.length} found</span>
              </label>
            )}

            {pinned.length > 0 && (
              <nav className="chat-pinned-bar" aria-label="Pinned posts">
                <Pin aria-hidden="true" />
                {pinned.slice(-3).map((p) => (
                  <button key={p.id} type="button" onClick={() => document.getElementById(`msg-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    {p.title || p.message.slice(0, 40)}
                  </button>
                ))}
              </nav>
            )}

            <Conversation className="chat-conversation">
              <ConversationContent className="chat-message-list">
                {loadingMessages ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[var(--chat-muted)]" aria-label="Loading messages" /></div>
                ) : messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={<MessagesSquare />}
                    title="Nothing here yet"
                    description={selected.can_moderate ? "Post a note or key points for your class to get started." : "Say hello to everyone in this room."}
                  />
                ) : timeline.length === 0 ? (
                  <ConversationEmptyState icon={<Search />} title="No matching messages" description="Try a different search term." />
                ) : (
                  timeline.map((m) => (m.post_kind === "message" ? renderMessage(m) : renderPost(m)))
                )}
              </ConversationContent>
              <ConversationScrollButton className="chat-scroll-button" />
            </Conversation>

            <footer className="chat-composer-wrap">
              {composerNotice ? (
                <p className="chat-composer-notice">{composerNotice}</p>
              ) : (
                <>
                  {selected.can_moderate && (
                    <div className="chat-kind-row">
                      <div className="chat-kind-toggle" role="radiogroup" aria-label="What are you posting?">
                        {([
                          ["message", "Message", MessageSquare],
                          ["note", "Note", StickyNote],
                          ["key_points", "Key points", ListChecks],
                        ] as const).map(([value, label, Icon]) => (
                          <button key={value} type="button" role="radio" aria-checked={kind === value} className={kind === value ? "chat-kind-active" : ""} onClick={() => setKind(value)}>
                            <Icon aria-hidden="true" /> {label}
                          </button>
                        ))}
                      </div>
                      {kind !== "message" && (
                        <label className="chat-pin-toggle">
                          <input type="checkbox" checked={pinNew} onChange={(e) => setPinNew(e.target.checked)} /> Pin to top
                        </label>
                      )}
                    </div>
                  )}
                  {kind !== "message" && (
                    <input
                      className="chat-title-input"
                      value={title}
                      maxLength={120}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={kind === "note" ? "Title, e.g. Practical moved to Friday" : "Topic, e.g. Radiation protection"}
                      aria-label="Title"
                    />
                  )}
                  <PromptInput onSubmit={send} className="chat-composer">
                    <PromptInputTextarea
                      placeholder={kind === "note" ? "Write your note" : kind === "key_points" ? "One key point per line" : "Type a message"}
                      className="chat-composer-input"
                    />
                    <PromptInputFooter className="chat-composer-footer">
                      <span className="chat-composer-hint">
                        {kind === "key_points" ? "Shift + Enter for the next point · Enter to post" : "Enter to send · Shift + Enter for a new line"}
                      </span>
                      <PromptInputSubmit className="chat-send" disabled={!userId} aria-label={kind === "message" ? "Send message" : "Post"}>
                        <Send />
                      </PromptInputSubmit>
                    </PromptInputFooter>
                  </PromptInput>
                </>
              )}
            </footer>
          </>
        ) : (
          <ConversationEmptyState icon={<MessagesSquare />} title="Choose a room" description="Pick a class, your school room or a community room." />
        )}
      </main>

      {reportTarget && (
        <ReportDialog
          open
          onOpenChange={(open) => !open && setReportTarget(null)}
          authorName={reportTarget.sender_name}
          preview={[reportTarget.title, reportTarget.message].filter(Boolean).join("\n")}
          reviewer={reviewer}
          onSubmit={(reason, details) => chatApi.reportRoomMessage(reportTarget.id, reason, details)}
          onBlock={reportTarget.sender_is_teacher ? undefined : () => block({ id: reportTarget.sender_id, name: reportTarget.sender_name })}
        />
      )}
      <CreateClassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        schools={teachingSchools}
        onCreated={async (id) => {
          await loadRooms(id);
          setFilter("all");
          setMobileView("chat");
          setMembersOpen("add");
        }}
      />
      {selected && kindOf(selected) === "class" && selected.can_moderate && (
        <MembersDialog
          open={membersOpen !== null}
          onOpenChange={(open) => !open && setMembersOpen(null)}
          room={selected}
          initialTab={membersOpen ?? "members"}
          onChanged={() => loadRooms()}
        />
      )}
      <BlockedPeopleDialog open={blockedOpen} onOpenChange={setBlockedOpen} onChanged={() => selectedId && loadMessages(selectedId)} />
      <Dialog open={reportsOpen} onOpenChange={setReportsOpen}>
        <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Reports from your rooms</DialogTitle></DialogHeader>
          <ChatReports compact onCountChange={setOpenReports} />
        </DialogContent>
      </Dialog>
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selected?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Students won't see this class room any more. Messages are kept for your school.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const CommentBox = ({ onSend }: { onSend: (text: string) => Promise<boolean> }) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    if (await onSend(value)) setText("");
    setSending(false);
  };
  return (
    <form
      className="chat-comment-box"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" aria-label="Add a comment" />
      <Button type="submit" variant="ghost" size="icon" disabled={!text.trim() || sending} aria-label="Send comment">
        {sending ? <Loader2 className="animate-spin" /> : <Send />}
      </Button>
    </form>
  );
};
