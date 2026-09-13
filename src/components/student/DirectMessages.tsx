import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, School, Search, Send, UserPlus } from "lucide-react";

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

const time = (ts: string) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const DirectMessages = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [active, setActive] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState("");
  const [sameSchoolOnly, setSameSchoolOnly] = useState(true);
  const [people, setPeople] = useState<StudentRow[]>([]);
  const [searching, setSearching] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_direct_chats");
    if (error) {
      toast.error("Could not load your conversations");
      return;
    }
    setThreads((data as ThreadRow[]) ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!cancelled) setUserId(auth.user?.id ?? null);
      await loadThreads();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadThreads]);

  // Search people
  useEffect(() => {
    if (!finding) return;
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
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
      clearTimeout(t);
    };
  }, [finding, query, sameSchoolOnly]);

  // Messages + realtime for the open conversation
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${active.thread_id}`,
        },
        (payload) => {
          const incoming = payload.new as DM;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [active]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openWith = async (person: StudentRow) => {
    const { data, error } = await supabase.rpc("start_direct_chat", {
      _other_user_id: person.user_id,
    });
    if (error || !data) {
      toast.error(error?.message || "Could not start the conversation");
      return;
    }
    const thread: ThreadRow = {
      thread_id: data as string,
      other_user_id: person.user_id,
      other_name: person.full_name,
      other_school: person.school_name,
      last_message: null,
      last_message_at: new Date().toISOString(),
    };
    setMessages([]);
    setActive(thread);
    setFinding(false);
    setQuery("");
    loadThreads();
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !active || !userId) return;
    if (text.length > 2000) {
      toast.error("Message is too long");
      return;
    }
    const { error } = await supabase.from("dm_messages").insert({
      thread_id: active.thread_id,
      sender_id: userId,
      content: text,
    });
    if (error) {
      toast.error(error.message || "Message not sent");
      return;
    }
    setDraft("");
    loadThreads();
  };

  // --- Conversation view ---
  if (active) {
    return (
      <section className="ilc-card flex h-[60vh] min-h-[380px] flex-col">
        <div
          className="mb-3 flex items-center gap-2 border-b pb-2"
          style={{ borderColor: "var(--ilc-hairline)" }}
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            aria-label="Back to conversations"
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ border: "1px solid var(--ilc-hairline)" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{active.other_name}</p>
            <p className="truncate text-xs ilc-muted">{active.other_school || "Student"}</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <p className="pt-8 text-center text-sm ilc-muted">
              Say hello and start the connection.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-3 py-2"
                  style={{
                    background: mine ? "var(--ilc-teal)" : "var(--ilc-hairline)",
                    color: mine ? "#04201E" : "inherit",
                  }}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                  <p className="mt-1 text-[10px] opacity-70">{time(m.created_at)}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex gap-2">
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
            className="min-h-[44px] flex-1 rounded-xl border bg-transparent px-3 text-sm outline-none"
            style={{ borderColor: "var(--ilc-hairline)" }}
          />
          <button
            type="button"
            onClick={send}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--ilc-teal)", color: "#04201E" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  // --- People finder ---
  if (finding) {
    return (
      <section className="ilc-card flex h-[60vh] min-h-[380px] flex-col">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFinding(false)}
            aria-label="Back to conversations"
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ border: "1px solid var(--ilc-hairline)" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ilc-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students by name"
              className="min-h-[44px] w-full rounded-xl border bg-transparent pl-9 pr-3 text-sm outline-none"
              style={{ borderColor: "var(--ilc-hairline)" }}
            />
          </div>
        </div>

        <div className="mb-3 flex gap-2">
          {[
            { label: "My school", value: true },
            { label: "All schools", value: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setSameSchoolOnly(opt.value)}
              className="ilc-badge"
              style={{
                background: sameSchoolOnly === opt.value ? "var(--ilc-teal-glow)" : "transparent",
                color: sameSchoolOnly === opt.value ? "var(--ilc-teal)" : "var(--ilc-text-muted)",
                border: "1px solid var(--ilc-hairline)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {searching && <p className="pt-6 text-center text-sm ilc-muted">Searching…</p>}
          {!searching && people.length === 0 && (
            <p className="pt-6 text-center text-sm ilc-muted">No students found.</p>
          )}
          {people.map((p) => (
            <button
              key={p.user_id}
              type="button"
              onClick={() => openWith(p)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left"
              style={{ borderColor: "var(--ilc-hairline)" }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.full_name}</p>
                <p className="truncate text-xs ilc-muted">
                  <School className="mr-1 inline h-3 w-3" />
                  {p.school_name || "Independent learner"}
                  {p.district ? ` · ${p.district}` : ""}
                </p>
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--ilc-teal)" }}>
                Message
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // --- Conversation list ---
  return (
    <section className="ilc-card flex h-[60vh] min-h-[380px] flex-col">
      <button
        type="button"
        onClick={() => setFinding(true)}
        className="mb-3 flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-semibold"
        style={{ background: "var(--ilc-teal)", color: "#04201E" }}
      >
        <UserPlus className="h-4 w-4" />
        Find students to chat with
      </button>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {loading && <p className="pt-8 text-center text-sm ilc-muted">Loading…</p>}
        {!loading && threads.length === 0 && (
          <p className="pt-8 text-center text-sm ilc-muted">
            No conversations yet — find a schoolmate or a student from another school.
          </p>
        )}
        {threads.map((t) => (
          <button
            key={t.thread_id}
            type="button"
            onClick={() => setActive(t)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left"
            style={{ borderColor: "var(--ilc-hairline)" }}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.other_name}</p>
              <p className="truncate text-xs ilc-muted">
                {t.last_message || t.other_school || "Start chatting"}
              </p>
            </div>
            <span className="shrink-0 text-[10px] ilc-muted">{time(t.last_message_at)}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
