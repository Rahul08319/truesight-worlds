import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, TypingUser } from '@/hooks/useGameChat';
import { soundManager } from '@/lib/soundManager';
import type { PlayerColor } from '@/lib/ludoGame';
import EmojiPicker from '@/components/EmojiPicker';

export interface ChatPlayer {
  name: string;
  color: PlayerColor;
  avatar: string;
}

interface GameChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  typingUsers?: TypingUser[];
  onTyping?: () => void;
  isHost?: boolean;
  onClearChat?: () => void;
  players?: ChatPlayer[];
  selfName?: string;
  onMention?: (colors: PlayerColor[]) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

const colorText: Record<string, string> = {
  red: 'text-ludo-red',
  blue: 'text-ludo-blue',
  yellow: 'text-ludo-yellow',
  green: 'text-ludo-green',
};

const mentionBg: Record<string, string> = {
  red: 'bg-ludo-red/20 text-ludo-red',
  blue: 'bg-ludo-blue/20 text-ludo-blue',
  yellow: 'bg-ludo-yellow/20 text-ludo-yellow',
  green: 'bg-ludo-green/20 text-ludo-green',
};

const QUICK_MESSAGES = [
  '👍 Good move!',
  '🔪 Nice kill!',
  '🎲 Lucky roll!',
  '😤 Come on!',
  '😂 LOL',
  '🏆 GG!',
];

const GROUP_WINDOW_MS = 60_000;
const MUTE_WHEN_OPEN_KEY = 'ludo-mute-mentions-when-open-v1';

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

function formatAbsolute(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
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

// Find @mentions in text. Returns matched player names (case-insensitive, longest-first).
function findMentions(text: string, players: ChatPlayer[]): ChatPlayer[] {
  if (!players.length) return [];
  // Sort by name length desc to prefer longest matches first
  const sorted = [...players].sort((a, b) => b.name.length - a.name.length);
  const found = new Map<string, ChatPlayer>();
  const lower = text.toLowerCase();
  for (const p of sorted) {
    const needle = '@' + p.name.toLowerCase();
    if (lower.includes(needle)) {
      found.set(p.color, p);
    }
  }
  return Array.from(found.values());
}

// Render a message text with mentions highlighted
function renderTextWithMentions(text: string, players: ChatPlayer[], selfName?: string): React.ReactNode {
  if (!players.length) return text;
  // Build a regex of @Names sorted longest-first
  const sorted = [...players].sort((a, b) => b.name.length - a.name.length);
  const escaped = sorted.map(p => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`@(${escaped.join('|')})\\b`, 'gi');
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const name = m[1];
    const player = sorted.find(p => p.name.toLowerCase() === name.toLowerCase());
    const isSelf = selfName && name.toLowerCase() === selfName.toLowerCase();
    if (player) {
      parts.push(
        <span
          key={`m-${key++}`}
          className={`px-1 rounded font-semibold ${mentionBg[player.color] || 'bg-primary/20 text-primary'} ${isSelf ? 'ring-1 ring-primary' : ''}`}
        >
          @{player.name}
        </span>
      );
    } else {
      parts.push(m[0]);
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

function buildExportText(messages: ChatMessage[]): string {
  const lines = [
    `Ludo Game Chat — exported ${new Date().toLocaleString()}`,
    `Messages: ${messages.length}`,
    '─'.repeat(50),
    '',
  ];
  for (const m of messages) {
    lines.push(`[${formatAbsolute(m.timestamp)}] ${m.playerAvatar} ${m.playerName}: ${m.text}`);
  }
  return lines.join('\n');
}

const GameChat: React.FC<GameChatProps> = ({
  messages, onSend, typingUsers = [], onTyping, isHost, onClearChat,
  players = [], selfName, onMention, onToggleReaction,
}) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [gameVol, setGameVol] = useState(soundManager.getVolume('game'));
  const [chatVol, setChatVol] = useState(soundManager.getVolume('chat'));
  const [now, setNow] = useState(Date.now());
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [muteMentionsWhenOpen, setMuteMentionsWhenOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(MUTE_WHEN_OPEN_KEY) === '1'; } catch { return false; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const unreadRef = useRef(0);
  const [unread, setUnread] = useState(0);
  const mentionCountRef = useRef(0);
  const [mentionCount, setMentionCount] = useState(0);
  const lastSeenIdRef = useRef<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(MUTE_WHEN_OPEN_KEY, muteMentionsWhenOpen ? '1' : '0'); } catch {}
  }, [muteMentionsWhenOpen]);

  useEffect(() => {
    return soundManager.subscribe(() => {
      setGameVol(soundManager.getVolume('game'));
      setChatVol(soundManager.getVolume('chat'));
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isOpen]);

  // Process new messages: detect mentions, play sounds, fire callbacks
  useEffect(() => {
    if (messages.length === 0) return;
    const lastSeen = lastSeenIdRef.current;
    const lastSeenIdx = lastSeen ? messages.findIndex(m => m.id === lastSeen) : -1;
    const newOnes = lastSeenIdx >= 0 ? messages.slice(lastSeenIdx + 1) : messages;
    lastSeenIdRef.current = messages[messages.length - 1].id;
    if (newOnes.length === 0) return;

    // Find mentions across new messages
    const mentionedColors = new Set<PlayerColor>();
    let selfMentioned = false;
    for (const m of newOnes) {
      const mentions = findMentions(m.text, players);
      for (const p of mentions) {
        mentionedColors.add(p.color);
        if (selfName && p.name.toLowerCase() === selfName.toLowerCase()) {
          selfMentioned = true;
        }
      }
    }

    if (mentionedColors.size > 0) {
      onMention?.(Array.from(mentionedColors));
    }

    if (isOpen) {
      scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
      unreadRef.current = 0;
      setUnread(0);
      mentionCountRef.current = 0;
      setMentionCount(0);
    } else {
      unreadRef.current += newOnes.length;
      setUnread(unreadRef.current);
      if (selfMentioned) {
        mentionCountRef.current += 1;
        setMentionCount(mentionCountRef.current);
      }
    }

    if (selfMentioned) {
      // Suppress mention ping when chat is open AND the user opted-in to muting
      if (!(isOpen && muteMentionsWhenOpen)) {
        soundManager.chatMention();
      }
    } else if (!isOpen) {
      soundManager.chatMessage();
    }
  }, [messages, isOpen, players, selfName, onMention]);

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
    setShowMentionMenu(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.trim()) onTyping?.();

    // Detect open @mention menu: last @ before caret without intervening space
    const caret = e.target.selectionStart ?? val.length;
    const before = val.slice(0, caret);
    const atIdx = before.lastIndexOf('@');
    if (atIdx >= 0) {
      const seg = before.slice(atIdx + 1);
      if (!/\s/.test(seg)) {
        setShowMentionMenu(true);
        setMentionFilter(seg.toLowerCase());
        return;
      }
    }
    setShowMentionMenu(false);
  };

  const insertMention = (name: string) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? input.length;
    const before = input.slice(0, caret);
    const after = input.slice(caret);
    const atIdx = before.lastIndexOf('@');
    if (atIdx < 0) return;
    const newVal = before.slice(0, atIdx) + '@' + name + ' ' + after;
    setInput(newVal);
    setShowMentionMenu(false);
    setTimeout(() => {
      el?.focus();
      const pos = atIdx + name.length + 2;
      el?.setSelectionRange(pos, pos);
    }, 0);
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

  const handleExport = () => {
    if (messages.length === 0) return;
    const txt = buildExportText(messages);
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `ludo-chat-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setUnread(0); unreadRef.current = 0;
          setMentionCount(0); mentionCountRef.current = 0;
        }}
        className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg hover:brightness-110 transition-all"
      >
        💬 Chat
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
            {unread}
          </span>
        )}
        {mentionCount > 0 && (
          <span
            title={`${mentionCount} mention${mentionCount === 1 ? '' : 's'}`}
            className="absolute -top-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-ludo-yellow text-background text-[10px] font-bold flex items-center justify-center ring-2 ring-background animate-pulse"
          >
            @{mentionCount}
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

  const filteredMentionPlayers = players.filter(p =>
    p.name.toLowerCase().startsWith(mentionFilter)
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-card/95 backdrop-blur-sm rounded-xl border border-border shadow-xl flex flex-col animate-slide-in">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-heading font-semibold text-sm text-foreground">💬 Game Chat</span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleExport}
              title="Export chat as .txt"
              aria-label="Export chat"
              className="text-muted-foreground hover:text-foreground text-base px-1"
            >
              ⬇️
            </button>
          )}
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
          <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={muteMentionsWhenOpen}
              onChange={e => setMuteMentionsWhenOpen(e.target.checked)}
              className="accent-primary"
            />
            <span>Mute @mention ping while chat is open</span>
          </label>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 max-h-56 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && typingUsers.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No messages yet{players.length > 0 && <><br />Tip: type @ to mention a player</>}
          </p>
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
                {g.items.map(m => {
                  const reactions = m.reactions || {};
                  const reactionEntries = Object.entries(reactions).filter(([, v]) => v.length > 0);
                  return (
                    <div key={m.id} className="group/msg relative text-foreground break-words">
                      <div className="flex items-start gap-1">
                        <div className="flex-1">
                          {renderTextWithMentions(m.text, players, selfName)}
                        </div>
                        {onToggleReaction && (
                          <button
                            onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)}
                            title="React"
                            aria-label="Add reaction"
                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-[10px] px-1 rounded bg-muted hover:bg-accent text-muted-foreground hover:text-foreground"
                          >
                            😀+
                          </button>
                        )}
                      </div>
                      {reactionEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {reactionEntries.map(([emoji, names]) => {
                            const mine = !!selfName && names.includes(selfName);
                            return (
                              <button
                                key={emoji}
                                onClick={() => onToggleReaction(m.id, emoji)}
                                title={names.join(', ')}
                                className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full border transition-colors ${
                                  mine
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-muted border-border hover:bg-accent text-foreground'
                                }`}
                              >
                                <span className="text-sm align-middle">{emoji}</span>
                                <span className="ml-1 align-middle">{names.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {reactionPickerFor === m.id && onToggleReaction && (
                        <div className="absolute right-0 top-5 z-20">
                          <EmojiPicker
                            onSelect={emoji => onToggleReaction(m.id, emoji)}
                            onClose={() => setReactionPickerFor(null)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
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

      <div className="relative flex items-center gap-1 px-2 py-1 border-t border-border">
        <button
          onClick={() => setShowEmojiPicker(v => !v)}
          title="Open emoji picker"
          aria-label="Open emoji picker"
          className="text-base px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
        >
          😀
        </button>
        <span className="text-[10px] text-muted-foreground">Pick emoji to send</span>
        <button
          onClick={() => setShowQuick(v => !v)}
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {showQuick ? '▼' : '▲'} Quick
        </button>
        {showEmojiPicker && (
          <div className="absolute bottom-full left-2 mb-1 z-30">
            <EmojiPicker
              onSelect={emoji => { soundManager.chatEmoji(); onSend(emoji); }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>

      <div className="relative">
        {showMentionMenu && filteredMentionPlayers.length > 0 && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-10">
            {filteredMentionPlayers.map(p => (
              <button
                key={p.color}
                onClick={() => insertMention(p.name)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
              >
                <span>{p.avatar}</span>
                <span className={`font-semibold ${colorText[p.color]}`}>@{p.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1.5 p-2 border-t border-border">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSend();
              if (e.key === 'Escape') setShowMentionMenu(false);
            }}
            placeholder={players.length > 0 ? 'Type a message... (@ to mention)' : 'Type a message...'}
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
    </div>
  );
};

export default GameChat;
