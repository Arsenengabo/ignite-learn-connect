export type ChatMessageKind = "text" | "image" | "file" | "audio";
export type ChatReceipt = "sent" | "delivered" | "read";

export interface ChatAttachment {
  path: string;
  name: string;
  mime: string;
  size: number;
}

export interface ChatReplyPreview {
  id: string;
  senderName: string;
  text: string;
  attachmentName?: string | null;
}

export interface ChatReactionSummary {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface ChatOutgoingMessage {
  text: string;
  file: File | null;
}

export const REACTIONS = ["👍", "❤️", "😂", "🎉", "👏"] as const;
export const MAX_CHAT_FILE_SIZE = 10 * 1024 * 1024;

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const kindForFile = (file: File): ChatMessageKind => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};
