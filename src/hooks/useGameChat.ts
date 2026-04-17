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

interface TypingPayload {
  id: string;
  playerName: string;
  playerColor: string;
  timestamp: number;
}

export interface TypingUser {
  id: string;
  playerName: string;
  playerColor: string;
}

const TYPING_TIMEOUT = 3000;
const TYPING_THROTTLE = 1500;

export function useGameChat(roomId: string | null, playerName: string, playerAvatar: string, playerColor: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const selfIdRef = useRef<string>(crypto.randomUUID());
  const lastTypingSentRef = useRef(0);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`chat-${roomId}`)
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        const msg = payload as ChatMessage;
        setMessages(prev => [...prev.slice(-99), msg]);
        // Clear typing indicator for this sender
        setTypingUsers(prev => prev.filter(u => u.playerName !== msg.playerName));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const t = payload as TypingPayload;
        if (t.id === selfIdRef.current) return;
        setTypingUsers(prev => {
          const existing = prev.find(u => u.id === t.id);
          if (existing) return prev;
          return [...prev, { id: t.id, playerName: t.playerName, playerColor: t.playerColor }];
        });
        // Reset removal timer
        const existingTimer = typingTimersRef.current.get(t.id);
        if (existingTimer) clearTimeout(existingTimer);
        const timer = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.id !== t.id));
          typingTimersRef.current.delete(t.id);
        }, TYPING_TIMEOUT);
        typingTimersRef.current.set(t.id, timer);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      typingTimersRef.current.forEach(t => clearTimeout(t));
      typingTimersRef.current.clear();
      setTypingUsers([]);
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
    setMessages(prev => [...prev.slice(-99), msg]);
  }, [playerName, playerAvatar, playerColor]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE) return;
    lastTypingSentRef.current = now;
    const payload: TypingPayload = {
      id: selfIdRef.current,
      playerName,
      playerColor,
      timestamp: now,
    };
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload });
  }, [playerName, playerColor]);

  return { messages, sendMessage, typingUsers, sendTyping };
}
