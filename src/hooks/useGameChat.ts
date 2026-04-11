import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  playerName: string;
  playerAvatar: string;
  playerColor: string;
  text: string;
  timestamp: number;
}

export function useGameChat(roomId: string | null, playerName: string, playerAvatar: string, playerColor: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`chat-${roomId}`)
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages(prev => [...prev.slice(-99), payload as ChatMessage]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId]);

  const sendMessage = useCallback((text: string) => {
    if (!channelRef.current || !text.trim()) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      playerName,
      playerAvatar,
      playerColor,
      text: text.trim().slice(0, 200),
      timestamp: Date.now(),
    };
    channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg });
    // Add to own messages immediately
    setMessages(prev => [...prev.slice(-99), msg]);
  }, [playerName, playerAvatar, playerColor]);

  return { messages, sendMessage };
}
