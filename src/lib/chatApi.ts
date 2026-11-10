// Typed calls for the chat database functions (rooms, teacher posts, safety tools).
// The generated Supabase types are refreshed by Lovable after the migration runs, so
// these calls go through a loosely typed client and return the shapes declared here.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as SupabaseClient<any>;

export type PostingMode = "everyone" | "comments_only" | "teachers_only";
export type PostKind = "message" | "note" | "key_points";
export type ReportReason = "bullying" | "harassment" | "inappropriate" | "spam" | "safety" | "other";

export interface Room {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  school_id: string | null;
  school_name: string;
  posting_mode: PostingMode;
  can_moderate: boolean;
  member_count: number | null;
  last_message_at: string | null;
  last_message?: string;
  unread_count?: number;
  mention_count?: number;
}

export interface RoomMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  sender_is_teacher: boolean;
  message: string;
  post_kind: PostKind;
  title: string | null;
  parent_id: string | null;
  is_pinned: boolean;
  comments_open: boolean;
  is_deleted: boolean;
  created_at: string;
  edited_at?: string | null;
  reply_to_id?: string | null;
  reply_sender_name?: string | null;
  reply_text?: string | null;
  message_type?: "text" | "image" | "file" | "audio";
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
}

export interface DirectChat {
  thread_id: string;
  other_user_id: string;
  other_name: string;
  other_school: string;
  last_message: string | null;
  last_message_at: string;
  is_blocked: boolean;
  can_message: boolean;
  unread_count: number;
  other_last_read_at: string | null;
  other_last_delivered_at: string | null;
  last_message_type: "text" | "image" | "file" | "audio";
}

export interface DirectMessage {
  id: string;
  thread_id: string;
  content: string;
  sender_id: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  is_pinned: boolean;
  reply_to_id: string | null;
  reply_sender_name: string | null;
  reply_text: string | null;
  message_type: "text" | "image" | "file" | "audio";
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  reactions: { emoji: string; count: number; reacted: boolean }[];
}

export interface ChatNotification {
  id: string;
  actor_id: string;
  actor_name: string;
  channel_id: string | null;
  thread_id: string | null;
  conversation_name: string;
  kind: "message" | "mention";
  preview: string;
  read_at: string | null;
  created_at: string;
}

export interface ChatAttachmentInput {
  path: string;
  name: string;
  mime: string;
  size: number;
  kind: "text" | "image" | "file" | "audio";
}

export interface RoomMember {
  user_id: string;
  full_name: string;
  member_role: "teacher" | "student";
  muted_until: string | null;
}

export interface ChatReport {
  id: string;
  created_at: string;
  source: "room" | "direct";
  reason: ReportReason;
  details: string;
  message_snapshot: string;
  status: "open" | "resolved" | "dismissed";
  room_name: string;
  school_name: string;
  reporter_name: string;
  reported_user_id: string | null;
  reported_name: string;
  message_removed: boolean;
  resolution: string | null;
}

export interface BlockedUser {
  user_id: string;
  full_name: string;
  blocked_at: string;
}

export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: "bullying", label: "Bullying", hint: "Mocking, threats or picking on someone" },
  { value: "harassment", label: "Harassment", hint: "Unwanted messages that won't stop" },
  { value: "inappropriate", label: "Inappropriate", hint: "Sexual, violent or hateful content" },
  { value: "safety", label: "I feel unsafe", hint: "Someone asked to meet, keep secrets or move to another app" },
  { value: "spam", label: "Spam", hint: "Ads, links or the same message again and again" },
  { value: "other", label: "Something else", hint: "Tell us in the box below" },
];

export const POSTING_MODES: { value: PostingMode; label: string; hint: string }[] = [
  { value: "everyone", label: "Everyone can post", hint: "Students and teachers chat freely" },
  { value: "comments_only", label: "Students comment only", hint: "Teachers post; students reply under posts" },
  { value: "teachers_only", label: "Only teachers", hint: "Announcements only, no replies" },
];

export class ChatError extends Error {}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new ChatError(error.message);
  return data as T;
}

export const chatApi = {
  listRooms: () => call<Room[]>("list_my_rooms").then((r) => r ?? []),
  listMessages: (channelId: string) =>
    call<RoomMessage[]>("list_room_messages", { _channel_id: channelId, _limit: 200 }).then((r) => r ?? []),
  async post(input: { channelId: string; senderId: string; message: string; kind?: PostKind; title?: string; parentId?: string | null; pinned?: boolean; replyToId?: string | null; attachment?: ChatAttachmentInput | null }) {
    const { error } = await db.from("chat_messages").insert({
      channel_id: input.channelId,
      sender_id: input.senderId,
      message: input.message,
      post_kind: input.kind ?? "message",
      title: input.title ?? null,
      parent_id: input.parentId ?? null,
      is_pinned: input.pinned ?? false,
      reply_to_id: input.replyToId ?? null,
      message_type: input.attachment?.kind ?? "text",
      attachment_path: input.attachment?.path ?? null,
      attachment_name: input.attachment?.name ?? null,
      attachment_mime: input.attachment?.mime ?? null,
      attachment_size: input.attachment?.size ?? null,
    });
    if (error) throw new ChatError(error.message);
  },
  async sendDirect(input: { threadId: string; senderId: string; message: string; replyToId?: string | null; attachment?: ChatAttachmentInput | null }) {
    const { error } = await db.from("dm_messages").insert({
      thread_id: input.threadId,
      sender_id: input.senderId,
      content: input.message,
      reply_to_id: input.replyToId ?? null,
      message_type: input.attachment?.kind ?? "text",
      attachment_path: input.attachment?.path ?? null,
      attachment_name: input.attachment?.name ?? null,
      attachment_mime: input.attachment?.mime ?? null,
      attachment_size: input.attachment?.size ?? null,
    });
    if (error) throw new ChatError(error.message);
  },
  async uploadAttachment(scope: "room" | "direct", conversationId: string, userId: string, file: File): Promise<ChatAttachmentInput> {
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new ChatError("Files must be 10 MB or smaller");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
    const path = `${scope === "room" ? "rooms" : "direct"}/${conversationId}/${userId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("chat-files").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) throw new ChatError(error.message);
    return {
      path,
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      kind: file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "file",
    };
  },
  removeAttachment: async (path: string) => { await supabase.storage.from("chat-files").remove([path]); },
  listDirectChats: () => call<DirectChat[]>("list_direct_chats").then((r) => r ?? []),
  listDirectMessages: (threadId: string) => call<DirectMessage[]>("list_direct_messages", { _thread_id: threadId, _limit: 200 }).then((r) => r ?? []),
  react: (messageId: string | null, dmMessageId: string | null, emoji: string) => call("toggle_chat_reaction", { _message_id: messageId, _dm_message_id: dmMessageId, _emoji: emoji }),
  editRoomMessage: (messageId: string, text: string) => call("edit_room_message", { _message_id: messageId, _text: text }),
  editDirectMessage: (messageId: string, text: string) => call("edit_direct_message", { _dm_message_id: messageId, _text: text }),
  setDirectPinned: (messageId: string, pinned: boolean) => call("set_direct_message_pinned", { _dm_message_id: messageId, _pinned: pinned }),
  markRoomRead: (channelId: string) => call("mark_room_read", { _channel_id: channelId }),
  markDirectActive: (threadId: string) => call("mark_direct_active", { _thread_id: threadId }),
  forward: (source: { messageId?: string; dmMessageId?: string }, target: { type: "room" | "direct"; id: string }) =>
    call<string>("forward_chat_message", {
      _message_id: source.messageId ?? null,
      _dm_message_id: source.dmMessageId ?? null,
      _target_channel_id: target.type === "room" ? target.id : null,
      _target_thread_id: target.type === "direct" ? target.id : null,
    }),
  notifications: () => call<ChatNotification[]>("list_chat_notifications", { _limit: 50 }).then((r) => r ?? []),
  markNotificationsRead: (notificationId?: string) => call("mark_chat_notifications_read", { _notification_id: notificationId ?? null }),
  deleteMessage: (messageId: string) => call("delete_chat_message", { _message_id: messageId }),
  setPinned: (messageId: string, pinned: boolean) => call("set_message_pinned", { _message_id: messageId, _pinned: pinned }),
  setComments: (messageId: string, open: boolean) => call("set_post_comments", { _message_id: messageId, _open: open }),
  setPostingMode: (channelId: string, mode: PostingMode) => call("set_room_posting_mode", { _channel_id: channelId, _mode: mode }),
  teachingSchools: () =>
    call<{ school_id: string; school_name: string }[]>("list_my_teaching_schools").then((r) => r ?? []),
  createClass: (schoolId: string, name: string, description: string) =>
    call<string>("create_class_room", { _school_id: schoolId, _name: name, _description: description }),
  archiveClass: (channelId: string) => call("archive_class_room", { _channel_id: channelId }),
  members: (channelId: string) => call<RoomMember[]>("list_room_members", { _channel_id: channelId }).then((r) => r ?? []),
  candidates: (channelId: string, query: string) =>
    call<{ user_id: string; full_name: string; member_role: "teacher" | "student" }[]>("list_room_candidates", {
      _channel_id: channelId,
      _query: query,
    }).then((r) => r ?? []),
  addMembers: (channelId: string, userIds: string[]) => call<number>("add_room_members", { _channel_id: channelId, _user_ids: userIds }),
  removeMember: (channelId: string, userId: string) => call("remove_room_member", { _channel_id: channelId, _user_id: userId }),
  mute: (channelId: string, userId: string, minutes: number) =>
    call("mute_room_member", { _channel_id: channelId, _user_id: userId, _minutes: minutes }),
  async myMute(channelId: string, userId: string): Promise<string | null> {
    const { data } = await db
      .from("chat_mutes")
      .select("muted_until")
      .eq("channel_id", channelId)
      .eq("user_id", userId)
      .gt("muted_until", new Date().toISOString())
      .maybeSingle();
    return (data?.muted_until as string | undefined) ?? null;
  },
  block: (userId: string) => call("block_user", { _user_id: userId }),
  unblock: (userId: string) => call("unblock_user", { _user_id: userId }),
  blocked: () => call<BlockedUser[]>("list_blocked_users").then((r) => r ?? []),
  reportRoomMessage: (messageId: string, reason: ReportReason, details: string) =>
    call<string>("report_chat_message", { _message_id: messageId, _reason: reason, _details: details }),
  reportDirectMessage: (dmMessageId: string, reason: ReportReason, details: string) =>
    call<string>("report_direct_message", { _dm_message_id: dmMessageId, _reason: reason, _details: details }),
  reports: (status: "open" | "resolved" | "dismissed" | "all") =>
    call<ChatReport[]>("list_chat_reports", { _status: status }).then((r) => r ?? []),
  resolveReport: (reportId: string, action: "dismiss" | "resolve" | "remove") =>
    call("resolve_chat_report", { _report_id: reportId, _action: action }),
  deleteDirectMessage: (dmMessageId: string) => call("delete_direct_message", { _dm_message_id: dmMessageId }),
};

export const MUTE_OPTIONS = [
  { minutes: 60, label: "For 1 hour" },
  { minutes: 60 * 24, label: "For 1 day" },
  { minutes: 60 * 24 * 7, label: "For 1 week" },
];

export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
