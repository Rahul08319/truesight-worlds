import React, { useState } from 'react';
import type { PlayerColor, PlayerType } from '@/lib/ludoGame';
import { PLAYER_COLORS } from '@/lib/ludoGame';
import woodTable from '@/assets/wood-table.jpg';
import Leaderboard from '@/components/Leaderboard';

interface PlayerConfig {
  color: PlayerColor;
  type: PlayerType;
  name: string;
  avatar: string;
}

interface GameSetupProps {
  onStart: (configs: PlayerConfig[]) => void;
  onOnlineClick?: () => void;
}

const AVATARS = ['👤', '🦁', '🐯', '🦊', '🐻', '🐼', '🐸', '🐵', '🦅', '🐲', '🎭', '👑', '⚔️', '🛡️', '🧙', '🏰'];

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

const defaultAvatars: Record<PlayerColor, string> = {
  red: '🦁', blue: '🐲', yellow: '🦊', green: '🐸',
};

const GameSetup: React.FC<GameSetupProps> = ({ onStart, onOnlineClick }) => {
  const [configs, setConfigs] = useState<Record<PlayerColor, { type: PlayerType; name: string; avatar: string }>>({
    red: { type: 'human', name: '', avatar: defaultAvatars.red },
    blue: { type: 'cpu', name: '', avatar: defaultAvatars.blue },
    yellow: { type: 'empty', name: '', avatar: defaultAvatars.yellow },
    green: { type: 'empty', name: '', avatar: defaultAvatars.green },
  });

  const [editingAvatar, setEditingAvatar] = useState<PlayerColor | null>(null);

  const setType = (color: PlayerColor, type: PlayerType) => {
    setConfigs(prev => ({ ...prev, [color]: { ...prev[color], type } }));
  };

  const setName = (color: PlayerColor, name: string) => {
    setConfigs(prev => ({ ...prev, [color]: { ...prev[color], name } }));
  };

  const setAvatar = (color: PlayerColor, avatar: string) => {
    setConfigs(prev => ({ ...prev, [color]: { ...prev[color], avatar } }));
    setEditingAvatar(null);
  };

  const activePlayers = Object.values(configs).filter(t => t.type !== 'empty').length;

  const handleStart = () => {
    onStart(PLAYER_COLORS.map(c => ({
      color: c,
      type: configs[c].type,
      name: configs[c].name.trim() || colorLabels[c],
      avatar: configs[c].avatar,
    })));
  };

  const handleDemo = () => {
    onStart(PLAYER_COLORS.map(c => ({
      color: c,
      type: 'cpu' as PlayerType,
      name: colorLabels[c],
      avatar: defaultAvatars[c],
    })));
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundImage: `url(${woodTable})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="w-full max-w-lg bg-card/95 backdrop-blur-sm rounded-2xl p-8 board-inset animate-slide-in">
        <h1 className="text-3xl font-heading font-bold text-center mb-2 gold-accent">
          Ludo & Friends
        </h1>
        <p className="text-center text-muted-foreground mb-6 text-sm">
          Customize players and begin
        </p>

        <div className="space-y-3 mb-6">
          {PLAYER_COLORS.map(color => {
            const cfg = configs[color];
            const isActive = cfg.type !== 'empty';

            return (
              <div key={color} className={`rounded-xl border-2 ${colorBg[color]} transition-all overflow-hidden`}>
                <div className="flex items-center gap-3 p-3">
                  {/* Avatar button */}
                  <button
                    onClick={() => isActive && setEditingAvatar(editingAvatar === color ? null : color)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                      isActive ? 'bg-card/60 hover:bg-card/80 cursor-pointer' : 'bg-card/30 cursor-default opacity-50'
                    }`}
                    disabled={!isActive}
                    title="Change avatar"
                  >
                    {cfg.avatar}
                  </button>

                  {/* Name input or color label */}
                  <div className="flex-1 min-w-0">
                    {isActive ? (
                      <input
                        type="text"
                        value={cfg.name}
                        onChange={e => setName(color, e.target.value)}
                        placeholder={colorLabels[color]}
                        maxLength={12}
                        className="w-full bg-transparent border-b border-foreground/20 focus:border-primary outline-none text-foreground font-semibold text-sm py-1 placeholder:text-muted-foreground/50 transition-colors"
                      />
                    ) : (
                      <span className="font-semibold text-foreground/40 text-sm">{colorLabels[color]}</span>
                    )}
                  </div>

                  {/* Type buttons */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {(['human', 'cpu', 'empty'] as PlayerType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setType(color, type)}
                        className={`
                          px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                          ${cfg.type === type
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-secondary'
                          }
                        `}
                      >
                        {type === 'human' ? '👤' : type === 'cpu' ? '🤖' : '—'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar picker dropdown */}
                {editingAvatar === color && (
                  <div className="px-3 pb-3 animate-fade-in">
                    <div className="flex flex-wrap gap-1.5 bg-card/50 rounded-lg p-2">
                      {AVATARS.map(av => (
                        <button
                          key={av}
                          onClick={() => setAvatar(color, av)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-110 ${
                            cfg.avatar === av ? 'bg-primary/30 ring-2 ring-primary' : 'hover:bg-card/80'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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

          {onOnlineClick && (
            <button
              onClick={onOnlineClick}
              className="
                w-full py-3 rounded-xl font-heading font-semibold text-sm
                bg-accent text-accent-foreground
                hover:brightness-110 active:scale-[0.98]
                transition-all duration-200
              "
            >
              🌐 Online Multiplayer
            </button>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <Leaderboard
            trigger={
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
                🏆 View Leaderboard
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
