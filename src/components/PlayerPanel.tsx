import React from 'react';
import type { GameState, PlayerColor } from '@/lib/ludoGame';

interface PlayerPanelProps {
  gameState: GameState;
  mentionedColors?: PlayerColor[];
}

const colorDot: Record<PlayerColor, string> = {
  red: 'bg-ludo-red',
  blue: 'bg-ludo-blue',
  yellow: 'bg-ludo-yellow',
  green: 'bg-ludo-green',
};

const mentionRing: Record<PlayerColor, string> = {
  red: 'ring-ludo-red shadow-[0_0_20px_hsl(var(--ludo-red))]',
  blue: 'ring-ludo-blue shadow-[0_0_20px_hsl(var(--ludo-blue))]',
  yellow: 'ring-ludo-yellow shadow-[0_0_20px_hsl(var(--ludo-yellow))]',
  green: 'ring-ludo-green shadow-[0_0_20px_hsl(var(--ludo-green))]',
};

const PlayerPanel: React.FC<PlayerPanelProps> = ({ gameState, mentionedColors = [] }) => {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {gameState.players.map((player, idx) => {
        const isCurrent = idx === gameState.currentPlayerIndex && gameState.phase !== 'finished';
        const isMentioned = mentionedColors.includes(player.color);
        const tokensGoal = player.tokens.filter(t => t.isGoal).length;

        return (
          <div
            key={player.color}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all
              ${isCurrent
                ? 'border-primary bg-primary/10 scale-105'
                : 'border-border bg-card/50'
              }
              ${isMentioned ? `ring-4 ring-offset-2 ring-offset-background animate-pulse ${mentionRing[player.color]}` : ''}
            `}
          >
            <span className="text-lg" title={player.name}>{player.avatar}</span>
            <span className="font-semibold text-sm text-foreground max-w-[80px] truncate">{player.name}</span>
            {player.type === 'cpu' && <span className="text-xs text-muted-foreground">🤖</span>}
            <div className="flex gap-0.5 ml-1">
              {player.tokens.map(t => (
                <div
                  key={t.id}
                  className={`w-2 h-2 rounded-full ${
                    t.isGoal ? 'bg-primary' : t.isHome ? 'bg-muted-foreground/30' : colorDot[player.color]
                  }`}
                />
              ))}
            </div>
            {tokensGoal > 0 && (
              <span className="text-xs text-primary font-bold">{tokensGoal}⭐</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PlayerPanel;
