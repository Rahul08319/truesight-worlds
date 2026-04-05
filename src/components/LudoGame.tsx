import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PlayerColor, PlayerType, GameState } from '@/lib/ludoGame';
import {
  createInitialState,
  rollDice,
  getMovableTokens,
  moveToken,
  cpuSelectToken,
} from '@/lib/ludoGame';
import { soundManager } from '@/lib/soundManager';
import GameSetup from '@/components/GameSetup';
import LudoBoard from '@/components/LudoBoard';
import Dice from '@/components/Dice';
import PlayerPanel from '@/components/PlayerPanel';
import RulesModal from '@/components/RulesModal';
import woodTable from '@/assets/wood-table.jpg';

const LudoGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [movableTokens, setMovableTokens] = useState<number[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [animatingToken, setAnimatingToken] = useState<{ color: PlayerColor; id: number } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevStateRef = useRef<GameState | null>(null);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundManager.setEnabled(next);
  };

  const handleStart = (configs: { color: PlayerColor; type: PlayerType }[]) => {
    setGameState(createInitialState(configs));
  };

  // Detect events from state changes for sound
  useEffect(() => {
    if (!gameState || !prevStateRef.current) {
      prevStateRef.current = gameState;
      return;
    }
    const prev = prevStateRef.current;

    // Check for win
    if (gameState.phase === 'finished' && prev.phase !== 'finished') {
      soundManager.win();
    }

    // Check for kills - a token went home that wasn't home before
    if (gameState.message.includes('💀')) {
      soundManager.tokenKill();
    } else if (gameState.message.includes('🎉')) {
      soundManager.tokenGoal();
    } else if (gameState.message.includes("can't move")) {
      soundManager.cantMove();
    } else if (gameState.message.includes('moved a token out')) {
      soundManager.tokenOut();
    }

    prevStateRef.current = gameState;
  }, [gameState]);

  const handleRoll = useCallback(() => {
    if (!gameState || gameState.phase !== 'rolling') return;

    soundManager.diceRoll();
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
        setMovableTokens(movable);
        // Animate then move
        setAnimatingToken({ color: player.color, id: movable[0] });
        soundManager.tokenMove();
        const result = moveToken(stateWithDice, movable[0]);
        setTimeout(() => {
          setAnimatingToken(null);
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

    // Animate
    setAnimatingToken({ color, id: tokenId });
    soundManager.tokenMove();
    const result = moveToken(gameState, tokenId);

    setTimeout(() => {
      setAnimatingToken(null);
      setGameState(result);
      setMovableTokens([]);
    }, 400);
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
      className="min-h-screen flex flex-col items-center justify-center p-4 gap-3"
      style={{ backgroundImage: `url(${woodTable})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 w-full max-w-[600px] justify-between">
        <PlayerPanel gameState={gameState} />
        <div className="flex gap-2">
          <button
            onClick={toggleSound}
            className="px-3 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors"
            title={soundOn ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <RulesModal
            trigger={
              <button className="px-3 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors">
                📖 Rules
              </button>
            }
          />
        </div>
      </div>

      {/* Board */}
      <LudoBoard
        gameState={gameState}
        movableTokens={movableTokens}
        onTokenClick={handleTokenClick}
        animatingToken={animatingToken}
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
