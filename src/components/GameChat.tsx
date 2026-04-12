import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/hooks/useGameChat';
import { soundManager } from '@/lib/soundManager';

interface GameChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

const colorText: Record<string, string> = {
  red: 'text-ludo-red',
  blue: 'text-ludo-blue',
  yellow: 'text-ludo-yellow',
  green: 'text-ludo-green',
};

const QUICK_MESSAGES = [
  '👍 Good move!',
  '🔪 Nice kill!',
  '🎲 Lucky roll!',
  '😤 Come on!',
  '😂 LOL',
  '🏆 GG!',
];

const EMOJI_REACTIONS = ['👍', '😂', '🔥', '😮', '😢', '👏'];

const GameChat: React.FC<GameChatProps> = ({ messages, onSend }) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
      unreadRef.current = 0;
      setUnread(0);
    } else if (messages.length > 0) {
      unreadRef.current++;
      setUnread(unreadRef.current);
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    soundManager.chatMessage();
    onSend(input);
    setInput('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setUnread(0); unreadRef.current = 0; }}
        className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg hover:brightness-110 transition-all"
      >
        💬 Chat
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-card/95 backdrop-blur-sm rounded-xl border border-border shadow-xl flex flex-col animate-slide-in">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-heading font-semibold text-sm text-foreground">💬 Game Chat</span>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
      </div>

      <div ref={scrollRef} className="flex-1 max-h-56 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className="text-xs">
            <span className="mr-1">{msg.playerAvatar}</span>
            <span className={`font-semibold ${colorText[msg.playerColor] || 'text-foreground'}`}>
              {msg.playerName}:
            </span>{' '}
            <span className="text-foreground">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Quick messages */}
      {showQuick && (
        <div className="px-2 py-1.5 border-t border-border flex flex-wrap gap-1">
          {QUICK_MESSAGES.map(q => (
            <button
              key={q}
              onClick={() => { onSend(q); setShowQuick(false); }}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-foreground hover:bg-accent transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Emoji bar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-t border-border">
        {EMOJI_REACTIONS.map(e => (
          <button
            key={e}
            onClick={() => onSend(e)}
            className="text-sm hover:scale-125 transition-transform"
          >
            {e}
          </button>
        ))}
        <button
          onClick={() => setShowQuick(v => !v)}
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {showQuick ? '▼' : '▲'} Quick
        </button>
      </div>

      <div className="flex gap-1.5 p-2 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          maxLength={200}
          className="flex-1 bg-muted rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default GameChat;
