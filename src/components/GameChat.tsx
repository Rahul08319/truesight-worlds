import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, TypingUser } from '@/hooks/useGameChat';
import { soundManager } from '@/lib/soundManager';

interface GameChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  typingUsers?: TypingUser[];
  onTyping?: () => void;
  isHost?: boolean;
  onClearChat?: () => void;
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

const GROUP_WINDOW_MS = 60_000; // group messages within 1 min from same sender

function formatRelative(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

interface MessageGroup {
  key: string;
  playerName: string;
  playerAvatar: string;
  playerColor: string;
  firstTimestamp: number;
  lastTimestamp: number;
  items: ChatMessage[];
}

function groupMessages(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.playerName === m.playerName &&
      last.playerColor === m.playerColor &&
      m.timestamp - last.lastTimestamp <= GROUP_WINDOW_MS
    ) {
      last.items.push(m);
      last.lastTimestamp = m.timestamp;
    } else {
      groups.push({
        key: m.id,
        playerName: m.playerName,
        playerAvatar: m.playerAvatar,
        playerColor: m.playerColor,
        firstTimestamp: m.timestamp,
        lastTimestamp: m.timestamp,
        items: [m],
      });
    }
  }
  return groups;
}

const GameChat: React.FC<GameChatProps> = ({
  messages, onSend, typingUsers = [], onTyping, isHost, onClearChat,
}) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [gameVol, setGameVol] = useState(soundManager.getVolume('game'));
  const [chatVol, setChatVol] = useState(soundManager.getVolume('chat'));
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    return soundManager.subscribe(() => {
      setGameVol(soundManager.getVolume('game'));
      setChatVol(soundManager.getVolume('chat'));
    });
  }, []);

  // Tick relative timestamps every 30s while open
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
      unreadRef.current = 0;
      setUnread(0);
    } else if (messages.length > 0) {
      soundManager.chatMessage();
      unreadRef.current++;
      setUnread(unreadRef.current);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && typingUsers.length > 0) {
      scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [typingUsers, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    soundManager.chatMessage();
    onSend(input);
    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.trim()) onTyping?.();
  };

  const handleClear = () => {
    if (!onClearChat) return;
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    onClearChat();
    setConfirmClear(false);
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

  const typingLabel = (() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].playerName} is typing`;
    if (typingUsers.length === 2) return `${typingUsers[0].playerName} and ${typingUsers[1].playerName} are typing`;
    return `${typingUsers.length} players are typing`;
  })();

  const soundIcon = gameVol === 0 && chatVol === 0 ? '🔇' : '🔊';
  const groups = groupMessages(messages);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-card/95 backdrop-blur-sm rounded-xl border border-border shadow-xl flex flex-col animate-slide-in">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-heading font-semibold text-sm text-foreground">💬 Game Chat</span>
        <div className="flex items-center gap-1">
          {isHost && onClearChat && messages.length > 0 && (
            <button
              onClick={handleClear}
              title={confirmClear ? 'Click again to confirm' : 'Clear chat history'}
              aria-label="Clear chat history"
              className={`text-base px-1 transition-colors ${
                confirmClear ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {confirmClear ? '⚠️' : '🗑️'}
            </button>
          )}
          <button
            onClick={() => setShowSettings(v => !v)}
            title="Sound settings"
            aria-label="Sound settings"
            className="text-muted-foreground hover:text-foreground text-base px-1"
          >
            {soundIcon}
          </button>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground text-lg px-1">✕</button>
        </div>
      </div>

      {showSettings && (
        <div className="px-3 py-2 border-b border-border space-y-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-14">🎲 Game</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(gameVol * 100)}
              onChange={e => soundManager.setVolume('game', Number(e.target.value) / 100)}
              className="flex-1 accent-primary"
              aria-label="Game sound volume"
            />
            <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round(gameVol * 100)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-14">💬 Chat</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(chatVol * 100)}
              onChange={e => soundManager.setVolume('chat', Number(e.target.value) / 100)}
              className="flex-1 accent-primary"
              aria-label="Chat sound volume"
            />
            <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round(chatVol * 100)}</span>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 max-h-56 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && typingUsers.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
        )}
        {groups.map(g => {
          const colorClass = colorText[g.playerColor] || 'text-foreground';
          return (
            <div key={g.key} className="text-xs">
              <div className="flex items-baseline gap-1.5">
                <span>{g.playerAvatar}</span>
                <span className={`font-semibold ${colorClass}`}>{g.playerName}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {formatRelative(g.lastTimestamp, now)}
                </span>
              </div>
              <div className="pl-6 space-y-0.5">
                {g.items.map(m => (
                  <div key={m.id} className="text-foreground break-words">{m.text}</div>
                ))}
              </div>
            </div>
          );
        })}
        {typingLabel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic pt-0.5">
            <span className={colorText[typingUsers[0].playerColor] || 'text-foreground'}>{typingLabel}</span>
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        )}
      </div>

      {showQuick && (
        <div className="px-2 py-1.5 border-t border-border flex flex-wrap gap-1">
          {QUICK_MESSAGES.map(q => (
            <button
              key={q}
              onClick={() => { soundManager.chatMessage(); onSend(q); setShowQuick(false); }}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-foreground hover:bg-accent transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-0.5 px-2 py-1 border-t border-border">
        {EMOJI_REACTIONS.map(e => (
          <button
            key={e}
            onClick={() => { soundManager.chatEmoji(); onSend(e); }}
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
          onChange={handleInputChange}
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
