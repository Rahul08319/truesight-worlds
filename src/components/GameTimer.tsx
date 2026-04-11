import React, { useState, useEffect, useRef } from 'react';
import type { PlayerColor } from '@/lib/ludoGame';

interface GameTimerProps {
  currentPlayerColor: PlayerColor;
  isFinished: boolean;
}

const colorText: Record<PlayerColor, string> = {
  red: 'text-ludo-red',
  blue: 'text-ludo-blue',
  yellow: 'text-ludo-yellow',
  green: 'text-ludo-green',
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const GameTimer: React.FC<GameTimerProps> = ({ currentPlayerColor, isFinished }) => {
  const [totalTime, setTotalTime] = useState(0);
  const [turnTime, setTurnTime] = useState(0);
  const prevColor = useRef(currentPlayerColor);

  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setTotalTime(t => t + 1);
      setTurnTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  useEffect(() => {
    if (prevColor.current !== currentPlayerColor) {
      setTurnTime(0);
      prevColor.current = currentPlayerColor;
    }
  }, [currentPlayerColor]);

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span className="text-muted-foreground">⏱ {formatTime(totalTime)}</span>
      <span className={`${colorText[currentPlayerColor]} font-semibold`}>
        Turn: {formatTime(turnTime)}
      </span>
    </div>
  );
};

export default GameTimer;
