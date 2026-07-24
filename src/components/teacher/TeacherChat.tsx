import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Users, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatMessageSchema, getValidationError } from "@/lib/validations";
interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

interface ChatChannel {
  id: string;
  name: string;
  description: string;
  channel_type: string;
  school_name?: string;
}

export const TeacherChat = () => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChannels();
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!selectedChannel) return;
    loadMessages(selectedChannel.id);
    const cleanup = subscribeToMessages(selectedChannel.id);
    return cleanup;
  }, [selectedChannel]);


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const loadChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .like('channel_type', 'teacher_%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error loading channels:', error);
      toast.error("Failed to load chat channels");
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      
      // Get sender names using the secure function
      const messagesWithNames = await Promise.all((data || []).map(async (msg) => {
        const { data: displayName } = await supabase
          .rpc('get_user_display_name', { _user_id: msg.sender_id });
        
        return {
          ...msg,
          sender_name: displayName || 'Unknown User'
        };
      }));
      
      setMessages(messagesWithNames);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error("Failed to load messages");
    }
  };

  const subscribeToMessages = (channelId: string) => {
    const channel = supabase
      .channel(`chat-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !currentUser) return;

    try {
      // Validate message with Zod
      const validationResult = ChatMessageSchema.safeParse({
        message: newMessage,
        channelId: selectedChannel.id,
        senderId: currentUser.user_id,
      });

      if (!validationResult.success) {
        toast.error(getValidationError(validationResult.error));
        return;
      }

      const validated = validationResult.data;

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: validated.channelId,
          sender_id: validated.senderId,
          message: validated.message,
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChannelIcon = (channelType: string) => {
    if (channelType.includes('general')) return <Hash className="w-4 h-4" />;
    if (channelType.includes('school')) return <Users className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Channels List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-secondary" />
            Teacher Channels
          </CardTitle>
          <CardDescription>Connect with fellow educators</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            <div className="space-y-2">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChannel?.id === channel.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getChannelIcon(channel.channel_type)}
                    <span className="font-medium truncate">{channel.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {channel.description}
                  </p>
                  {channel.school_name && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {channel.school_name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            {selectedChannel ? (
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getChannelIcon(selectedChannel.channel_type)}
                  {selectedChannel.name}
                </CardTitle>
                <CardDescription>{selectedChannel.description}</CardDescription>
              </div>
            ) : (
              <div>
                <CardTitle>Select a Channel</CardTitle>
                <CardDescription>Choose a channel to start chatting</CardDescription>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col h-[450px]">
            {selectedChannel ? (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === currentUser?.user_id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.sender_id === currentUser?.user_id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.sender_id !== currentUser?.user_id && (
                            <p className="text-xs font-medium mb-1">
                              {message.sender_name}
                            </p>
                          )}
                          <p className="text-sm">{message.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a channel to start chatting with other teachers</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};