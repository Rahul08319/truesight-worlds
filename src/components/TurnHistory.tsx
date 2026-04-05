import React, { useRef, useEffect } from 'react';
import type { PlayerColor } from '@/lib/ludoGame';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface LogEntry {
  id: number;
  color: PlayerColor;
  message: string;
  type: 'roll' | 'move' | 'kill' | 'goal' | 'skip' | 'info';
  timestamp: number;
}

interface TurnHistoryProps {
  entries: LogEntry[];
}

const colorDot: Record<PlayerColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
};

const typeIcon: Record<LogEntry['type'], string> = {
  roll: '🎲',
  move: '➡️',
  kill: '💀',
  goal: '🎉',
  skip: '⏭️',
  info: 'ℹ️',
};

const TurnHistory: React.FC<TurnHistoryProps> = ({ entries }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="w-64 bg-card/90 backdrop-blur-sm rounded-xl board-inset flex flex-col max-h-[560px]">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-heading font-semibold text-sm text-primary">Turn History</h3>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1.5">
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No moves yet</p>
          )}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 text-xs py-1 animate-slide-in"
            >
              <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${colorDot[entry.color]}`} />
              <span className="flex-shrink-0">{typeIcon[entry.type]}</span>
              <span className="text-foreground/80 leading-tight">{entry.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
};

export default TurnHistory;
