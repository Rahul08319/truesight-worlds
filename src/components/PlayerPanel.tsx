import React from 'react';
import type { GameState, PlayerColor } from '@/lib/ludoGame';

interface PlayerPanelProps {
  gameState: GameState;
}

const colorDot: Record<PlayerColor, string> = {
  red: 'bg-ludo-red',
  blue: 'bg-ludo-blue',
  yellow: 'bg-ludo-yellow',
  green: 'bg-ludo-green',
};

const PlayerPanel: React.FC<PlayerPanelProps> = ({ gameState }) => {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {gameState.players.map((player, idx) => {
        const isCurrent = idx === gameState.currentPlayerIndex && gameState.phase !== 'finished';
        const tokensHome = player.tokens.filter(t => t.isHome).length;
        const tokensGoal = player.tokens.filter(t => t.isGoal).length;

        return (
          <div
            key={player.color}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all
              ${isCurrent
                ? 'border-primary bg-primary/10 scale-105'
                : 'border-border bg-card/50'
              }
            `}
          >
            <div className={`w-3 h-3 rounded-full ${colorDot[player.color]}`} />
            <span className="font-semibold text-sm text-foreground">{player.name}</span>
            <span className="text-xs text-muted-foreground">
              {player.type === 'cpu' ? '🤖' : '👤'}
            </span>
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
          </div>
        );
      })}
    </div>
  );
};

export default PlayerPanel;
