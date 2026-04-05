import React from 'react';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  onClick: () => void;
  disabled: boolean;
}

const dotPositions: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

const Dice: React.FC<DiceProps> = ({ value, isRolling, onClick, disabled }) => {
  const dots = value ? dotPositions[value] : [];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-20 h-20 rounded-xl bg-dice-bg dice-3d
        transition-all duration-200 cursor-pointer
        hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isRolling ? 'animate-dice-roll' : ''}
      `}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={9}
            className="fill-dice-dot"
          />
        ))}
      </svg>
      {!value && !isRolling && (
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-board-wood opacity-60">
          Roll
        </span>
      )}
    </button>
  );
};

export default Dice;
