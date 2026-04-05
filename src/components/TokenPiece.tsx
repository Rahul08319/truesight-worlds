import React from 'react';
import type { PlayerColor } from '@/lib/ludoGame';

interface TokenPieceProps {
  color: PlayerColor;
  isSelectable: boolean;
  isSelected: boolean;
  onClick: () => void;
  small?: boolean;
}

const colorStyles: Record<PlayerColor, string> = {
  red: 'from-red-400 via-red-500 to-red-700',
  blue: 'from-blue-300 via-blue-500 to-blue-700',
  green: 'from-green-300 via-green-500 to-green-700',
  yellow: 'from-yellow-200 via-yellow-400 to-yellow-600',
};

const glowColors: Record<PlayerColor, string> = {
  red: '0 0 8px hsla(0, 75%, 50%, 0.6)',
  blue: '0 0 8px hsla(220, 75%, 50%, 0.6)',
  green: '0 0 8px hsla(140, 65%, 40%, 0.6)',
  yellow: '0 0 8px hsla(45, 95%, 55%, 0.6)',
};

const TokenPiece: React.FC<TokenPieceProps> = ({ color, isSelectable, isSelected, onClick, small }) => {
  const size = small ? 'w-6 h-6' : 'w-8 h-8';

  return (
    <button
      onClick={onClick}
      disabled={!isSelectable}
      className={`
        ${size} rounded-full bg-gradient-to-b ${colorStyles[color]}
        border-2 transition-all duration-200 relative
        ${isSelectable ? 'cursor-pointer hover:scale-130 animate-pulse-glow' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-primary scale-130' : ''}
        ${isSelectable ? 'border-foreground/40' : 'border-foreground/10'}
      `}
      style={{
        zIndex: isSelectable ? 10 : 5,
        boxShadow: `
          0 3px 6px hsla(0, 0%, 0%, 0.4),
          0 1px 3px hsla(0, 0%, 0%, 0.3),
          inset 0 1px 2px hsla(0, 0%, 100%, 0.4),
          inset 0 -2px 4px hsla(0, 0%, 0%, 0.2)
          ${isSelectable ? ', ' + glowColors[color] : ''}
        `,
      }}
    >
      {/* Inner highlight circle for 3D effect */}
      <div className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/10" />
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
    </button>
  );
};

export default TokenPiece;
