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
const HISTORY_LIMIT = 100;

export function useGameChat(roomId: string | null, playerName: string, playerAvatar: string, playerColor: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const selfIdRef = useRef<string>(crypto.randomUUID());
  const lastTypingSentRef = useRef(0);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const seenIdsRef = useRef<Set<string>>(new Set());

  const addMessage = useCallback((msg: ChatMessage) => {
    if (seenIdsRef.current.has(msg.id)) return;
    seenIdsRef.current.add(msg.id);
    setMessages(prev => [...prev, msg].slice(-HISTORY_LIMIT));
  }, []);

  // Load history + subscribe
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    seenIdsRef.current = new Set();
    setMessages([]);

    // Load persisted history
    supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(HISTORY_LIMIT)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const loaded: ChatMessage[] = data.map((r: any) => ({
          id: r.id,
          playerName: r.player_name,
          playerAvatar: r.player_avatar,
          playerColor: r.player_color,
          text: r.text,
          timestamp: new Date(r.created_at).getTime(),
        }));
        loaded.forEach(m => seenIdsRef.current.add(m.id));
        setMessages(loaded);
      });

    const channel = supabase.channel(`chat-${roomId}`)
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        const msg = payload as ChatMessage;
        addMessage(msg);
        setTypingUsers(prev => prev.filter(u => u.playerName !== msg.playerName));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const t = payload as TypingPayload;
        if (t.id === selfIdRef.current) return;
        setTypingUsers(prev => {
          if (prev.find(u => u.id === t.id)) return prev;
          return [...prev, { id: t.id, playerName: t.playerName, playerColor: t.playerColor }];
        });
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
      cancelled = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
      typingTimersRef.current.forEach(t => clearTimeout(t));
      typingTimersRef.current.clear();
      setTypingUsers([]);
    };
  }, [roomId, addMessage]);

  const sendMessage = useCallback((text: string) => {
    if (!channelRef.current || !roomId || !text.trim()) return;
    const trimmed = text.trim().slice(0, 200);
    const id = crypto.randomUUID();
    const msg: ChatMessage = {
      id,
      playerName,
      playerAvatar,
      playerColor,
      text: trimmed,
      timestamp: Date.now(),
    };
    // Optimistic local + broadcast
    addMessage(msg);
    channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg });
    // Persist (fire-and-forget)
    supabase.from('chat_messages').insert({
      id,
      room_id: roomId,
      player_name: playerName,
      player_avatar: playerAvatar,
      player_color: playerColor,
      text: trimmed,
    }).then(({ error }) => {
      if (error) console.error('Chat persist failed:', error);
    });
  }, [playerName, playerAvatar, playerColor, roomId, addMessage]);

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
