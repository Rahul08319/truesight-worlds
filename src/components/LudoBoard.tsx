import React from 'react';
import type { PlayerColor, Token, GameState } from '@/lib/ludoGame';
import { PLAYER_START, toGlobalPosition, SAFE_CELLS } from '@/lib/ludoGame';
import TokenPiece from './TokenPiece';

interface LudoBoardProps {
  gameState: GameState;
  movableTokens: number[];
  onTokenClick: (color: PlayerColor, tokenId: number) => void;
  animatingToken?: { color: PlayerColor; id: number } | null;
}

const TRACK_POSITIONS: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6],
  [3, 6], [2, 6], [1, 6], [0, 6], [0, 7],
  [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10],
  [6, 11], [6, 12], [6, 13], [6, 14], [7, 14],
  [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8],
  [11, 8], [12, 8], [13, 8], [14, 8], [14, 7],
  [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4],
  [8, 3], [8, 2], [8, 1], [8, 0], [7, 0],
  [6, 0],
];

const HOME_COLUMNS: Record<PlayerColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  green: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

const HOME_BASES: Record<PlayerColor, [number, number][]> = {
  red: [[2, 2], [2, 4], [4, 2], [4, 4]],
  blue: [[2, 10], [2, 12], [4, 10], [4, 12]],
  green: [[10, 2], [10, 4], [12, 2], [12, 4]],
  yellow: [[10, 10], [10, 12], [12, 10], [12, 12]],
};

// Richer quadrant gradients
const QUADRANT_STYLES: Record<PlayerColor, React.CSSProperties> = {
  red: { background: 'linear-gradient(135deg, hsla(0,70%,55%,0.25), hsla(0,60%,45%,0.15))' },
  blue: { background: 'linear-gradient(135deg, hsla(220,70%,55%,0.25), hsla(220,60%,45%,0.15))' },
  green: { background: 'linear-gradient(135deg, hsla(140,60%,45%,0.25), hsla(140,50%,35%,0.15))' },
  yellow: { background: 'linear-gradient(135deg, hsla(45,90%,60%,0.25), hsla(45,80%,50%,0.15))' },
};

const HOME_COL_STYLES: Record<PlayerColor, React.CSSProperties> = {
  red: { background: 'linear-gradient(90deg, hsla(0,70%,55%,0.35), hsla(0,60%,50%,0.2))' },
  blue: { background: 'linear-gradient(180deg, hsla(220,70%,55%,0.35), hsla(220,60%,50%,0.2))' },
  green: { background: 'linear-gradient(0deg, hsla(140,60%,45%,0.35), hsla(140,50%,40%,0.2))' },
  yellow: { background: 'linear-gradient(270deg, hsla(45,90%,60%,0.35), hsla(45,80%,50%,0.2))' },
};

const START_STYLES: Record<PlayerColor, React.CSSProperties> = {
  red: { background: 'hsla(0,70%,55%,0.4)' },
  blue: { background: 'hsla(220,70%,55%,0.4)' },
  green: { background: 'hsla(140,60%,45%,0.4)' },
  yellow: { background: 'hsla(45,90%,60%,0.4)' },
};

function getTokensAtPosition(state: GameState, globalPos: number): { token: Token; color: PlayerColor }[] {
  const result: { token: Token; color: PlayerColor }[] = [];
  for (const player of state.players) {
    for (const token of player.tokens) {
      if (!token.isHome && !token.isGoal && token.position < 52) {
        if (toGlobalPosition(token.position, player.color) === globalPos) {
          result.push({ token, color: player.color });
        }
      }
    }
  }
  return result;
}

function getTokensInHomeColumn(state: GameState, color: PlayerColor, colIndex: number): Token[] {
  const player = state.players.find(p => p.color === color);
  if (!player) return [];
  return player.tokens.filter(t => !t.isHome && !t.isGoal && t.position === 52 + colIndex);
}

const LudoBoard: React.FC<LudoBoardProps> = ({ gameState, movableTokens, onTokenClick, animatingToken }) => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const isInQuadrant = (row: number, col: number): PlayerColor | null => {
    if (row <= 5 && col <= 5) return 'red';
    if (row <= 5 && col >= 9) return 'blue';
    if (row >= 9 && col <= 5) return 'green';
    if (row >= 9 && col >= 9) return 'yellow';
    return null;
  };

  const isHomeColumn = (row: number, col: number): PlayerColor | null => {
    for (const [color, positions] of Object.entries(HOME_COLUMNS) as [PlayerColor, [number, number][]][]) {
      if (positions.some(([r, c]) => r === row && c === col)) return color;
    }
    return null;
  };

  const getTrackIndex = (row: number, col: number): number => {
    return TRACK_POSITIONS.findIndex(([r, c]) => r === row && c === col);
  };

  const isSafeCell = (trackIdx: number) => SAFE_CELLS.includes(trackIdx);
  const isStartCell = (trackIdx: number) => Object.values(PLAYER_START).includes(trackIdx);
  const isCenter = (row: number, col: number) => row === 7 && col === 7;

  const renderCell = (row: number, col: number) => {
    const quadrant = isInQuadrant(row, col);
    const homeCol = isHomeColumn(row, col);
    const trackIdx = getTrackIndex(row, col);
    const center = isCenter(row, col);

    let cellTokens: { token: Token; color: PlayerColor; isMovable: boolean; isAnimating: boolean }[] = [];

    if (trackIdx >= 0) {
      const tokensHere = getTokensAtPosition(gameState, trackIdx);
      cellTokens = tokensHere.map(({ token, color }) => ({
        token, color,
        isMovable: color === currentPlayer?.color && movableTokens.includes(token.id),
        isAnimating: animatingToken?.color === color && animatingToken?.id === token.id,
      }));
    }

    if (homeCol) {
      const colIndex = HOME_COLUMNS[homeCol].findIndex(([r, c]) => r === row && c === col);
      const tokens = getTokensInHomeColumn(gameState, homeCol, colIndex);
      cellTokens = tokens.map(t => ({
        token: t, color: homeCol,
        isMovable: homeCol === currentPlayer?.color && movableTokens.includes(t.id),
        isAnimating: animatingToken?.color === homeCol && animatingToken?.id === t.id,
      }));
    }

    let homeBaseToken: { token: Token; color: PlayerColor; isMovable: boolean; isAnimating: boolean } | null = null;
    for (const [color, positions] of Object.entries(HOME_BASES) as [PlayerColor, [number, number][]][]) {
      const baseIdx = positions.findIndex(([r, c]) => r === row && c === col);
      if (baseIdx >= 0) {
        const player = gameState.players.find(p => p.color === color);
        if (player) {
          const homeTokens = player.tokens.filter(t => t.isHome);
          if (homeTokens[0] && baseIdx < homeTokens.length) {
            homeBaseToken = {
              token: homeTokens[baseIdx], color,
              isMovable: color === currentPlayer?.color && movableTokens.includes(homeTokens[baseIdx].id),
              isAnimating: animatingToken?.color === color && animatingToken?.id === homeTokens[baseIdx].id,
            };
          }
        }
      }
    }

    // Style determination
    let cellStyle: React.CSSProperties = {};
    let extraClasses = '';

    if (center) {
      cellStyle = {
        background: `
          conic-gradient(
            from 0deg,
            hsla(0,70%,55%,0.5),
            hsla(220,70%,55%,0.5),
            hsla(45,90%,60%,0.5),
            hsla(140,60%,45%,0.5),
            hsla(0,70%,55%,0.5)
          )
        `,
      };
    } else if (homeCol) {
      cellStyle = HOME_COL_STYLES[homeCol];
    } else if (trackIdx >= 0 && isStartCell(trackIdx)) {
      const startColor = (Object.entries(PLAYER_START) as [PlayerColor, number][]).find(([_, pos]) => pos === trackIdx)?.[0];
      if (startColor) cellStyle = START_STYLES[startColor];
    } else if (trackIdx >= 0) {
      cellStyle = { background: 'hsl(var(--board-cell))' };
    } else if (quadrant && !Object.values(HOME_BASES).flat().some(([r, c]) => r === row && c === col)) {
      cellStyle = QUADRANT_STYLES[quadrant];
      return (
        <div key={`${row}-${col}`} className="border border-border/5" style={cellStyle} />
      );
    } else {
      cellStyle = { background: 'hsl(var(--board-cell))' };
    }

    if (trackIdx >= 0 && isSafeCell(trackIdx)) {
      extraClasses = 'ring-1 ring-inset ring-primary/20';
    }

    return (
      <div
        key={`${row}-${col}`}
        className={`border border-border/15 flex items-center justify-center relative transition-colors duration-200 ${extraClasses}`}
        style={cellStyle}
      >
        {homeBaseToken && (
          <div className={homeBaseToken.isAnimating ? 'animate-token-bounce' : ''}>
            <TokenPiece
              color={homeBaseToken.color}
              isSelectable={homeBaseToken.isMovable}
              isSelected={false}
              onClick={() => onTokenClick(homeBaseToken!.color, homeBaseToken!.token.id)}
              small
            />
          </div>
        )}
        {cellTokens.map(({ token, color, isMovable, isAnimating }, i) => (
          <div
            key={`${color}-${token.id}`}
            className={`absolute ${isAnimating ? 'animate-token-bounce' : ''}`}
            style={{ transform: `translate(${i * 3}px, ${i * -3}px)` }}
          >
            <TokenPiece
              color={color}
              isSelectable={isMovable}
              isSelected={false}
              onClick={() => onTokenClick(color, token.id)}
              small
            />
          </div>
        ))}
        {center && (
          <div className="w-5 h-5 rounded-full border-2 border-foreground/20"
            style={{ background: 'radial-gradient(circle, hsla(36,60%,50%,0.8), hsla(36,60%,40%,0.4))' }}
          />
        )}
        {trackIdx >= 0 && isSafeCell(trackIdx) && cellTokens.length === 0 && !homeBaseToken && (
          <span className="text-[7px] opacity-40">✦</span>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-[min(75vh,520px)] aspect-square mx-auto">
      <div className="w-full h-full rounded-2xl overflow-hidden board-inset border-4 border-board-border"
        style={{ background: 'linear-gradient(135deg, hsl(40,35%,88%), hsl(40,30%,82%))' }}
      >
        <div className="w-full h-full grid grid-cols-[repeat(15,1fr)] grid-rows-[repeat(15,1fr)]">
          {Array.from({ length: 15 }, (_, row) =>
            Array.from({ length: 15 }, (_, col) => renderCell(row, col))
          )}
        </div>
      </div>
    </div>
  );
};

export default LudoBoard;
