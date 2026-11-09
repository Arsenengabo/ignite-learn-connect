import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { FileText, Loader2, Mic, Paperclip, Reply, Send, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MAX_CHAT_FILE_SIZE, formatFileSize, type ChatOutgoingMessage, type ChatReplyPreview } from "./messageFeatures";

interface MentionOption {
  id: string;
  name: string;
}

interface ChatComposerProps {
  onSend: (message: ChatOutgoingMessage) => Promise<void>;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  reply?: ChatReplyPreview | null;
  onCancelReply?: () => void;
  editing?: { id: string; text: string } | null;
  onCancelEdit?: () => void;
  mentionOptions?: MentionOption[];
}

export const ChatComposer = ({
  onSend,
  onTyping,
  placeholder = "Type a message",
  disabled,
  maxLength = 2000,
  reply,
  onCancelReply,
  editing,
  onCancelEdit,
  mentionOptions = [],
}: ChatComposerProps) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    setText(editing?.text ?? "");
    setFile(null);
    if (editing) window.setTimeout(() => textarea.current?.focus(), 0);
  }, [editing?.id, editing?.text]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current >= 59) recorder.current?.stop();
        return Math.min(current + 1, 60);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!chosen) return;
    if (chosen.size > MAX_CHAT_FILE_SIZE) return toast.error("Files must be 10 MB or smaller");
    setFile(chosen);
  };

  const stopTracks = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };

  const toggleRecording = async () => {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return toast.error("Voice recording is not supported by this browser");
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
      recorder.current = mediaRecorder;
      chunks.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        if (blob.size > 0) {
          const extension = type.includes("mp4") ? "m4a" : "webm";
          setFile(new File([blob], `voice-note-${Date.now()}.${extension}`, { type }));
        }
        setRecording(false);
        stopTracks();
      };
      setSeconds(0);
      setFile(null);
      mediaRecorder.start();
      setRecording(true);
    } catch {
      stopTracks();
      toast.error("Microphone access is needed to record a voice note");
    }
  };

  const submit = async () => {
    const value = text.trim();
    if (sending || disabled || (!value && !file) || recording) return;
    setSending(true);
    try {
      await onSend({ text: value, file });
      setText("");
      setFile(null);
      setSeconds(0);
    } catch {
      // The parent shows the specific server or upload error and keeps the draft.
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
    if (event.key === "Escape") {
      if (editing) onCancelEdit?.();
      else if (reply) onCancelReply?.();
      else setFile(null);
    }
  };

  const mentionMatch = text.slice(0, textarea.current?.selectionStart ?? text.length).match(/@([^\n@]*)$/);
  const mentionQuery = mentionMatch?.[1]?.toLowerCase() ?? null;
  const mentionMatches = mentionQuery === null && !editing ? [] : mentionOptions.filter((person) => person.name.toLowerCase().includes(mentionQuery ?? "")).slice(0, 5);
  const insertMention = (name: string) => {
    if (!mentionMatch) return;
    const caret = textarea.current?.selectionStart ?? text.length;
    const start = caret - mentionMatch[0].length;
    setText(`${text.slice(0, start)}@${name} ${text.slice(caret)}`);
    window.setTimeout(() => textarea.current?.focus(), 0);
  };

  return (
    <div className="chat-modern-composer">
      {(reply || editing) && (
        <div className="chat-composer-context">
          {editing ? <FileText /> : <Reply />}
          <span><strong>{editing ? "Edit message" : `Reply to ${reply?.senderName}`}</strong><small>{editing?.text || reply?.text || reply?.attachmentName}</small></span>
          <Button type="button" variant="ghost" size="icon" onClick={editing ? onCancelEdit : onCancelReply} aria-label={editing ? "Cancel editing" : "Cancel reply"}><X /></Button>
        </div>
      )}
      {file && (
        <div className="chat-upload-preview">
          <FileText />
          <span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span>
          <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove attachment"><X /></Button>
        </div>
      )}
      {recording && (
        <div className="chat-recording" role="status">
          <span className="chat-recording-dot" /> Recording voice note · 0:{String(seconds).padStart(2, "0")} / 1:00
        </div>
      )}
      {mentionMatches.length > 0 && (
        <div className="chat-mention-suggestions" role="listbox" aria-label="Mention someone">
          {mentionMatches.map((person) => <button key={person.id} type="button" role="option" onClick={() => insertMention(person.name)}>@{person.name}</button>)}
        </div>
      )}
      <div className="chat-composer-box">
        <textarea
          ref={textarea}
          value={text}
          maxLength={maxLength}
          rows={1}
          placeholder={placeholder}
          disabled={disabled || sending}
          aria-label={placeholder}
          onChange={(event) => { setText(event.target.value); onTyping?.(); }}
          onKeyDown={onKeyDown}
          className="chat-composer-input"
        />
        <div className="chat-composer-footer">
          <div className="chat-composer-tools">
            {!editing && (
              <>
                <input ref={fileInput} type="file" className="sr-only" accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" onChange={chooseFile} />
                <Button type="button" variant="ghost" size="icon" className="chat-attachment-button" onClick={() => fileInput.current?.click()} disabled={disabled || sending || recording} aria-label="Attach a photo or document" title="Attach a photo or document"><Paperclip /></Button>
                <Button type="button" variant="ghost" size="icon" className={recording ? "chat-record-button chat-recording-active" : "chat-record-button"} onClick={toggleRecording} disabled={disabled || sending} aria-label={recording ? "Stop and attach voice note" : "Record a voice note"} title={recording ? "Stop recording" : "Record a voice note"}>
                  {recording ? <Square /> : <Mic />}
                </Button>
              </>
            )}
            <span className="chat-composer-hint">{text.length}/{maxLength} · Enter to send</span>
          </div>
          <Button type="button" size="icon" className="chat-send" onClick={submit} disabled={disabled || sending || recording || (!text.trim() && !file)} aria-label={editing ? "Save edited message" : "Send message"}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </div>
  );
};
