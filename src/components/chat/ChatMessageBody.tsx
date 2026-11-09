import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, CheckCheck, Download, FileText, Loader2, Pin, Reply, SmilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  formatFileSize,
  REACTIONS,
  type ChatAttachment,
  type ChatMessageKind,
  type ChatReactionSummary,
  type ChatReceipt,
  type ChatReplyPreview,
} from "./messageFeatures";

const signedUrlCache = new Map<string, { url: string; expires: number }>();

export const useSignedChatFile = (path: string | null) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!path) {
      setLoading(false);
      return;
    }
    const cached = signedUrlCache.get(path);
    if (cached && cached.expires > Date.now()) {
      setUrl(cached.url);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase.storage.from("chat-files").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data?.signedUrl) {
        signedUrlCache.set(path, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
        setUrl(data.signedUrl);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [path]);

  return { url, loading };
};

const highlightedText = (text: string, search: string): ReactNode => {
  const mentionParts = text.split(/(@[^\n@]+?)(?=\s{2,}|$|[.,!?;:](?:\s|$))/g);
  const query = search.trim();
  if (!query) return mentionParts.map((part, index) => part.startsWith("@") ? <strong key={index} className="chat-mention">{part}</strong> : part);
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`(${safe})`, "ig");
  return mentionParts.map((part, index) => {
    if (part.startsWith("@")) return <strong key={index} className="chat-mention">{part}</strong>;
    return part.split(expression).map((piece, pieceIndex) =>
      piece.toLowerCase() === query.toLowerCase() ? <mark key={`${index}-${pieceIndex}`}>{piece}</mark> : piece,
    );
  });
};

export const ChatAttachmentView = ({ attachment, kind }: { attachment: ChatAttachment; kind: ChatMessageKind }) => {
  const { url, loading } = useSignedChatFile(attachment.path);
  if (loading) return <div className="chat-attachment-loading"><Loader2 className="animate-spin" /> Opening attachment…</div>;
  if (!url) return <div className="chat-attachment-loading"><FileText /> Attachment unavailable</div>;

  if (kind === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="chat-image-link" aria-label={`Open ${attachment.name}`}>
        <img src={url} alt={attachment.name} className="chat-image-attachment" loading="lazy" />
        <span>{attachment.name}</span>
      </a>
    );
  }
  if (kind === "audio") {
    return (
      <div className="chat-audio-attachment">
        <audio controls preload="metadata" src={url}>Your browser cannot play this voice note.</audio>
        <span>Voice note · {formatFileSize(attachment.size)}</span>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" download={attachment.name} className="chat-file-attachment">
      <span className="chat-file-icon"><FileText /></span>
      <span className="min-w-0 flex-1">
        <strong>{attachment.name}</strong>
        <small>{formatFileSize(attachment.size)}</small>
      </span>
      <Download aria-hidden="true" />
    </a>
  );
};

interface ChatMessageBodyProps {
  text: string;
  deleted?: boolean;
  deletedLabel?: string;
  kind?: ChatMessageKind;
  attachment?: ChatAttachment | null;
  reply?: ChatReplyPreview | null;
  editedAt?: string | null;
  pinned?: boolean;
  search?: string;
  reactions?: ChatReactionSummary[];
  onReact?: (emoji: string) => void;
}

export const ChatMessageBody = ({
  text,
  deleted,
  deletedLabel = "Message deleted",
  kind = "text",
  attachment,
  reply,
  editedAt,
  pinned,
  search = "",
  reactions = [],
  onReact,
}: ChatMessageBodyProps) => (
  <>
    {pinned && <span className="chat-pin-tag mb-1"><Pin /> Pinned</span>}
    {deleted ? <p className="chat-removed">{deletedLabel}</p> : (
      <>
        {reply && (
          <button type="button" className="chat-reply-preview" onClick={() => document.getElementById(`msg-${reply.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
            <Reply aria-hidden="true" />
            <span><strong>{reply.senderName}</strong><small>{reply.text || reply.attachmentName || "Attachment"}</small></span>
          </button>
        )}
        {attachment && <ChatAttachmentView attachment={attachment} kind={kind} />}
        {text && <p className="whitespace-pre-wrap break-words">{highlightedText(text, search)}</p>}
        {editedAt && <span className="chat-edited">Edited</span>}
      </>
    )}
    {!deleted && onReact && (
      <div className="chat-reactions" aria-label="Message reactions">
        {reactions.map((reaction) => (
          <button key={reaction.emoji} type="button" className={reaction.reacted ? "chat-reaction chat-reaction-mine" : "chat-reaction"} onClick={() => onReact(reaction.emoji)} aria-pressed={reaction.reacted} aria-label={`${reaction.emoji} ${reaction.count} reactions`}>
            {reaction.emoji} <span>{reaction.count}</span>
          </button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="chat-add-reaction" aria-label="Add reaction"><SmilePlus /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="chat-reaction-picker" align="start">
            {REACTIONS.map((emoji) => <DropdownMenuItem key={emoji} onSelect={() => onReact(emoji)} className="chat-reaction-choice">{emoji}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )}
  </>
);

export const ChatMessageMeta = ({ timestamp, receipt, edited }: { timestamp: string; receipt?: ChatReceipt; edited?: boolean }) => {
  const time = useMemo(() => new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), [timestamp]);
  return (
    <span className="chat-time">
      {edited && "Edited · "}{time}
      {receipt === "sent" && <Check aria-label="Sent" />}
      {receipt === "delivered" && <CheckCheck aria-label="Delivered" />}
      {receipt === "read" && <CheckCheck className="chat-receipt-read" aria-label="Read" />}
    </span>
  );
};
