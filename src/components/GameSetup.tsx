import React, { useState } from 'react';
import type { PlayerColor, PlayerType } from '@/lib/ludoGame';
import { PLAYER_COLORS } from '@/lib/ludoGame';
import woodTable from '@/assets/wood-table.jpg';

interface GameSetupProps {
  onStart: (configs: { color: PlayerColor; type: PlayerType }[]) => void;
}

const colorLabels: Record<PlayerColor, string> = {
  red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green',
};

const colorBg: Record<PlayerColor, string> = {
  red: 'bg-ludo-red/20 border-ludo-red',
  blue: 'bg-ludo-blue/20 border-ludo-blue',
  yellow: 'bg-ludo-yellow/20 border-ludo-yellow',
  green: 'bg-ludo-green/20 border-ludo-green',
};

const colorDot: Record<PlayerColor, string> = {
  red: 'bg-ludo-red',
  blue: 'bg-ludo-blue',
  yellow: 'bg-ludo-yellow',
  green: 'bg-ludo-green',
};

const GameSetup: React.FC<GameSetupProps> = ({ onStart }) => {
  const [configs, setConfigs] = useState<Record<PlayerColor, PlayerType>>({
    red: 'human',
    blue: 'cpu',
    yellow: 'empty',
    green: 'empty',
  });

  const setType = (color: PlayerColor, type: PlayerType) => {
    setConfigs(prev => ({ ...prev, [color]: type }));
  };

  const activePlayers = Object.values(configs).filter(t => t !== 'empty').length;

  const handleStart = () => {
    onStart(PLAYER_COLORS.map(c => ({ color: c, type: configs[c] })));
  };

  const handleDemo = () => {
    onStart(PLAYER_COLORS.map(c => ({ color: c, type: 'cpu' as PlayerType })));
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundImage: `url(${woodTable})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="w-full max-w-md bg-card/95 backdrop-blur-sm rounded-2xl p-8 board-inset animate-slide-in">
        <h1 className="text-3xl font-heading font-bold text-center mb-2 gold-accent">
          Ludo & Friends
        </h1>
        <p className="text-center text-muted-foreground mb-8 text-sm">
          Select players to begin
        </p>

        <div className="space-y-4 mb-8">
          {PLAYER_COLORS.map(color => (
            <div
              key={color}
              className={`flex items-center gap-4 p-3 rounded-xl border-2 ${colorBg[color]} transition-all`}
            >
              <div className={`w-4 h-4 rounded-full ${colorDot[color]}`} />
              <span className="font-semibold text-foreground w-16">{colorLabels[color]}</span>
              <div className="flex gap-2 ml-auto">
                {(['human', 'cpu', 'empty'] as PlayerType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setType(color, type)}
                    className={`
                      px-3 py-1 rounded-lg text-xs font-medium transition-all
                      ${configs[color] === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                      }
                    `}
                  >
                    {type === 'human' ? '👤 Human' : type === 'cpu' ? '🤖 CPU' : '— Empty'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleStart}
            disabled={activePlayers < 2}
            className="
              w-full py-4 rounded-xl font-heading font-bold text-lg
              bg-primary text-primary-foreground
              hover:brightness-110 active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {activePlayers < 2 ? 'Select at least 2 players' : 'Start Game 🎲'}
          </button>

          <button
            onClick={handleDemo}
            className="
              w-full py-3 rounded-xl font-heading font-semibold text-sm
              bg-secondary text-secondary-foreground
              hover:brightness-110 active:scale-[0.98]
              transition-all duration-200
            "
          >
            🤖 Watch Demo (4 CPU Players)
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
