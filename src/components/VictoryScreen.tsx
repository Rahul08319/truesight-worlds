import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { PlayerColor } from '@/lib/ludoGame';
import { saveGameResult } from '@/components/Leaderboard';

export interface GameStats {
  totalRolls: number;
  totalMoves: number;
  totalKills: number;
  perPlayer: Record<PlayerColor, { rolls: number; moves: number; kills: number; sixes: number }>;
}

interface VictoryScreenProps {
  winner: PlayerColor;
  stats: GameStats;
  onPlayAgain: () => void;
  players?: { name: string; avatar: string; color: string }[];
}

const colorMap: Record<PlayerColor, { bg: string; text: string; confetti: string[] }> = {
  red: { bg: 'from-red-600/90 to-red-900/90', text: 'text-red-200', confetti: ['#ef4444', '#fca5a5', '#dc2626'] },
  blue: { bg: 'from-blue-600/90 to-blue-900/90', text: 'text-blue-200', confetti: ['#3b82f6', '#93c5fd', '#2563eb'] },
  yellow: { bg: 'from-yellow-500/90 to-yellow-800/90', text: 'text-yellow-200', confetti: ['#eab308', '#fde047', '#ca8a04'] },
  green: { bg: 'from-green-600/90 to-green-900/90', text: 'text-green-200', confetti: ['#22c55e', '#86efac', '#16a34a'] },
};

const VictoryScreen: React.FC<VictoryScreenProps> = ({ winner, stats, onPlayAgain, players }) => {
  const fired = useRef(false);
  const colors = colorMap[winner];

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Save to leaderboard
    if (players && players.length > 0) {
      saveGameResult(players, winner, stats.perPlayer as any).catch(() => {});
    }

    const end = Date.now() + 3000;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors.confetti,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: colors.confetti,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [colors.confetti]);

  const winnerName = winner.charAt(0).toUpperCase() + winner.slice(1);
  const ps = stats.perPlayer[winner];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`bg-gradient-to-br ${colors.bg} rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/20 animate-scale-in`}>
        <div className="text-center space-y-6">
          <div className="text-6xl">🏆</div>
          <h2 className="font-heading text-3xl font-bold text-white">{winnerName} Wins!</h2>

          {/* Winner stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatCard label="Dice Rolls" value={ps?.rolls ?? 0} />
            <StatCard label="Moves" value={ps?.moves ?? 0} />
            <StatCard label="Kills" value={ps?.kills ?? 0} />
            <StatCard label="Sixes Rolled" value={ps?.sixes ?? 0} />
          </div>

          {/* Global stats */}
          <div className="border-t border-white/20 pt-4 space-y-1">
            <p className="text-white/70 text-xs uppercase tracking-wider">Game Totals</p>
            <p className="text-white/90 text-sm">
              {stats.totalRolls} rolls · {stats.totalMoves} moves · {stats.totalKills} kills
            </p>
          </div>

          <button
            onClick={onPlayAgain}
            className="px-8 py-3 rounded-xl font-heading font-bold bg-white/20 text-white hover:bg-white/30 transition-all text-lg backdrop-blur-sm border border-white/30"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-white/70">{label}</div>
  </div>
);

export default VictoryScreen;
