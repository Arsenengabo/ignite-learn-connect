import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PresencePerson {
  user_id: string;
  name?: string;
}

interface TypingPerson {
  name: string;
  until: number;
}

export const useChatPresence = (
  scope: "room" | "direct",
  conversationId: string | null,
  userId: string | null,
  userName: string,
) => {
  const [online, setOnline] = useState<Record<string, string>>({});
  const [typing, setTyping] = useState<Record<string, TypingPerson>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTyped = useRef(0);

  useEffect(() => {
    setOnline({});
    setTyping({});
    channelRef.current = null;
    if (!conversationId || !userId) return;

    const channel = supabase.channel(`chat-live-${scope}-${conversationId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePerson>();
        const people: Record<string, string> = {};
        Object.values(state).flat().forEach((person) => {
          if (person.user_id && person.user_id !== userId) people[person.user_id] = person.name || "Member";
        });
        setOnline(people);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const person = payload as PresencePerson;
        if (!person.user_id || person.user_id === userId) return;
        setTyping((current) => ({
          ...current,
          [person.user_id]: { name: person.name || "Member", until: Date.now() + 3500 },
        }));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user_id: userId, name: userName });
      });

    const cleanupTyping = window.setInterval(() => {
      const now = Date.now();
      setTyping((current) => {
        const active = Object.fromEntries(Object.entries(current).filter(([, value]) => value.until > now));
        return Object.keys(active).length === Object.keys(current).length ? current : active;
      });
    }, 1500);

    return () => {
      window.clearInterval(cleanupTyping);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversationId, scope, userId, userName]);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTyped.current < 1200 || !channelRef.current) return;
    lastTyped.current = now;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, name: userName },
    });
  }, [userId, userName]);

  const typingNames = Object.values(typing).map((person) => person.name);
  return {
    onlineCount: Object.keys(online).length,
    isOnline: (id: string) => Boolean(online[id]),
    typingNames,
    sendTyping,
  };
};
