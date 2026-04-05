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
  red: 'from-red-500 to-red-700 shadow-red-900/50',
  blue: 'from-blue-400 to-blue-700 shadow-blue-900/50',
  green: 'from-green-400 to-green-700 shadow-green-900/50',
  yellow: 'from-yellow-300 to-yellow-600 shadow-yellow-900/50',
};

const TokenPiece: React.FC<TokenPieceProps> = ({ color, isSelectable, isSelected, onClick, small }) => {
  const size = small ? 'w-5 h-5' : 'w-7 h-7';

  return (
    <button
      onClick={onClick}
      disabled={!isSelectable}
      className={`
        ${size} rounded-full bg-gradient-to-b ${colorStyles[color]}
        token-shadow border-2 border-opacity-30
        transition-all duration-200
        ${isSelectable ? 'cursor-pointer hover:scale-125 animate-pulse-glow' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-primary scale-125' : ''}
        ${isSelectable ? 'border-foreground' : 'border-transparent'}
      `}
      style={{ zIndex: isSelectable ? 10 : 5 }}
    >
      <div className="w-full h-full rounded-full bg-gradient-to-b from-white/30 to-transparent" />
    </button>
  );
};

export default TokenPiece;
