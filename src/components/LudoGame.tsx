import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PlayerColor, PlayerType, GameState } from '@/lib/ludoGame';
import {
  createInitialState,
  rollDice,
  getMovableTokens,
  moveToken,
  cpuSelectToken,
} from '@/lib/ludoGame';
import GameSetup from '@/components/GameSetup';
import LudoBoard from '@/components/LudoBoard';
import Dice from '@/components/Dice';
import PlayerPanel from '@/components/PlayerPanel';
import woodTable from '@/assets/wood-table.jpg';

const LudoGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [movableTokens, setMovableTokens] = useState<number[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = (configs: { color: PlayerColor; type: PlayerType }[]) => {
    setGameState(createInitialState(configs));
  };

  const handleRoll = useCallback(() => {
    if (!gameState || gameState.phase !== 'rolling') return;

    const newState = { ...gameState, isRolling: true };
    setGameState(newState);

    setTimeout(() => {
      const dice = rollDice();
      const stateWithDice: GameState = {
        ...gameState,
        diceValue: dice,
        isRolling: false,
        phase: 'selecting',
      };

      const player = stateWithDice.players[stateWithDice.currentPlayerIndex];
      const movable = getMovableTokens(player, dice, stateWithDice);

      if (movable.length === 0) {
        // No moves available, skip turn
        const nextIdx = (stateWithDice.currentPlayerIndex + 1) % stateWithDice.players.length;
        const skipped: GameState = {
          ...stateWithDice,
          phase: 'rolling',
          diceValue: dice,
          currentPlayerIndex: nextIdx,
          consecutiveSixes: 0,
          message: `${player.name} rolled ${dice} but can't move. ${stateWithDice.players[nextIdx].name}'s turn.`,
        };
        setGameState(skipped);
        setMovableTokens([]);
      } else if (movable.length === 1) {
        // Auto-move single option
        setMovableTokens(movable);
        const result = moveToken(stateWithDice, movable[0]);
        setTimeout(() => {
          setGameState(result);
          setMovableTokens([]);
        }, 500);
      } else {
        setMovableTokens(movable);
        stateWithDice.message = `${player.name} rolled ${dice}. Select a token to move.`;
        setGameState(stateWithDice);
      }
    }, 600);
  }, [gameState]);

  const handleTokenClick = useCallback((color: PlayerColor, tokenId: number) => {
    if (!gameState || gameState.phase !== 'selecting') return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (color !== currentPlayer.color) return;
    if (!movableTokens.includes(tokenId)) return;

    const result = moveToken(gameState, tokenId);
    setGameState(result);
    setMovableTokens([]);
  }, [gameState, movableTokens]);

  // CPU auto-play
  useEffect(() => {
    if (!gameState) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.type !== 'cpu' || gameState.phase === 'finished') return;

    if (gameState.phase === 'rolling') {
      timeoutRef.current = setTimeout(() => handleRoll(), 1000);
    } else if (gameState.phase === 'selecting' && movableTokens.length > 0) {
      timeoutRef.current = setTimeout(() => {
        const tokenId = cpuSelectToken(gameState);
        if (tokenId >= 0) {
          handleTokenClick(currentPlayer.color, tokenId);
        }
      }, 800);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [gameState, movableTokens, handleRoll, handleTokenClick]);

  if (!gameState) {
    return <GameSetup onStart={handleStart} />;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer.type === 'human';
  const canRoll = gameState.phase === 'rolling' && isHumanTurn;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 gap-4"
      style={{ backgroundImage: `url(${woodTable})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Player Panel */}
      <PlayerPanel gameState={gameState} />

      {/* Board */}
      <LudoBoard
        gameState={gameState}
        movableTokens={movableTokens}
        onTokenClick={handleTokenClick}
      />

      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
        <Dice
          value={gameState.diceValue}
          isRolling={gameState.isRolling}
          onClick={handleRoll}
          disabled={!canRoll}
        />

        <div className="bg-card/90 backdrop-blur-sm rounded-xl px-6 py-3 max-w-md text-center board-inset">
          <p className="text-foreground text-sm font-medium">{gameState.message}</p>
        </div>

        {gameState.phase === 'finished' && (
          <button
            onClick={() => setGameState(null)}
            className="px-6 py-3 rounded-xl font-heading font-bold bg-primary text-primary-foreground hover:brightness-110 transition-all"
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
};

export default LudoGame;
