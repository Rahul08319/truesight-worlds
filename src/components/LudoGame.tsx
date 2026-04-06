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
import TurnHistory, { type LogEntry } from '@/components/TurnHistory';
import VictoryScreen, { type GameStats } from '@/components/VictoryScreen';
import MultiplayerLobby from '@/components/MultiplayerLobby';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import woodTable from '@/assets/wood-table.jpg';

let logIdCounter = 0;

const LudoGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [movableTokens, setMovableTokens] = useState<number[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [animatingToken, setAnimatingToken] = useState<{ color: PlayerColor; id: number } | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [gameStats, setGameStats] = useState<GameStats>({ totalRolls: 0, totalMoves: 0, totalKills: 0, perPlayer: {} as any });
  const [showVictory, setShowVictory] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const multiplayer = useMultiplayer();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevStateRef = useRef<GameState | null>(null);

  const addLog = useCallback((color: PlayerColor, message: string, type: LogEntry['type']) => {
    setLogEntries(prev => [...prev, { id: ++logIdCounter, color, message, type, timestamp: Date.now() }]);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundManager.setEnabled(next);
  };

  const initStats = (configs: { color: PlayerColor; type: PlayerType }[]): GameStats => {
    const perPlayer = {} as GameStats['perPlayer'];
    configs.filter(c => c.type !== 'empty').forEach(c => {
      perPlayer[c.color] = { rolls: 0, moves: 0, kills: 0, sixes: 0 };
    });
    return { totalRolls: 0, totalMoves: 0, totalKills: 0, perPlayer };
  };

  const handleStart = (configs: { color: PlayerColor; type: PlayerType; name?: string; avatar?: string }[]) => {
    logIdCounter = 0;
    setLogEntries([]);
    setGameStats(initStats(configs));
    setShowVictory(false);
    setGameState(createInitialState(configs));
  };

  // Detect events from state changes for sound + logging
  useEffect(() => {
    if (!gameState || !prevStateRef.current) {
      prevStateRef.current = gameState;
      return;
    }
    const prev = prevStateRef.current;
    const player = gameState.players[
      // For logging, we want to know who just acted. If the player changed, the previous player acted
      prev.currentPlayerIndex < prev.players.length ? prev.currentPlayerIndex : 0
    ];
    const playerColor = player?.color || 'red';

    if (gameState.phase === 'finished' && prev.phase !== 'finished') {
      soundManager.win();
      addLog(gameState.winner || playerColor, `🏆 Wins the game!`, 'goal');
      setShowVictory(true);
    } else if (gameState.message.includes('💀')) {
      soundManager.tokenKill();
      addLog(playerColor, gameState.message.replace(/.*?'s turn\.?/, '').trim() || gameState.message, 'kill');
      setGameStats(s => ({
        ...s, totalKills: s.totalKills + 1,
        perPlayer: { ...s.perPlayer, [playerColor]: { ...s.perPlayer[playerColor], kills: (s.perPlayer[playerColor]?.kills ?? 0) + 1 } },
      }));
    } else if (gameState.message.includes('🎉')) {
      soundManager.tokenGoal();
      addLog(playerColor, 'Reached the goal!', 'goal');
    } else if (gameState.message.includes("can't move")) {
      soundManager.cantMove();
      addLog(playerColor, `Rolled ${gameState.diceValue} — blocked`, 'skip');
    } else if (gameState.message.includes('moved a token out')) {
      soundManager.tokenOut();
      addLog(playerColor, 'Token out of home!', 'move');
      setGameStats(s => ({ ...s, totalMoves: s.totalMoves + 1, perPlayer: { ...s.perPlayer, [playerColor]: { ...s.perPlayer[playerColor], moves: (s.perPlayer[playerColor]?.moves ?? 0) + 1 } } }));
    } else if (gameState.message.includes('moved forward')) {
      addLog(playerColor, `Moved ${prev.diceValue} spaces`, 'move');
      setGameStats(s => ({ ...s, totalMoves: s.totalMoves + 1, perPlayer: { ...s.perPlayer, [playerColor]: { ...s.perPlayer[playerColor], moves: (s.perPlayer[playerColor]?.moves ?? 0) + 1 } } }));
    } else if (gameState.message.includes('home column')) {
      addLog(playerColor, `Advancing in home column`, 'move');
      setGameStats(s => ({ ...s, totalMoves: s.totalMoves + 1, perPlayer: { ...s.perPlayer, [playerColor]: { ...s.perPlayer[playerColor], moves: (s.perPlayer[playerColor]?.moves ?? 0) + 1 } } }));
    }

    prevStateRef.current = gameState;
  }, [gameState, addLog]);

  const handleRoll = useCallback(() => {
    if (!gameState || gameState.phase !== 'rolling') return;

    soundManager.diceRoll();
    const currentColor = gameState.players[gameState.currentPlayerIndex].color;
    const newState = { ...gameState, isRolling: true };
    setGameState(newState);

    setTimeout(() => {
      const dice = rollDice();
      addLog(currentColor, `Rolled ${dice}`, 'roll');
      setGameStats(s => ({
        ...s, totalRolls: s.totalRolls + 1,
        perPlayer: { ...s.perPlayer, [currentColor]: {
          ...s.perPlayer[currentColor],
          rolls: (s.perPlayer[currentColor]?.rolls ?? 0) + 1,
          sixes: (s.perPlayer[currentColor]?.sixes ?? 0) + (dice === 6 ? 1 : 0),
        }},
      }));

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
  }, [gameState, addLog]);

  const handleTokenClick = useCallback((color: PlayerColor, tokenId: number) => {
    if (!gameState || gameState.phase !== 'selecting') return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (color !== currentPlayer.color) return;
    if (!movableTokens.includes(tokenId)) return;

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
      className="min-h-screen flex items-center justify-center p-4 gap-4"
      style={{ backgroundImage: `url(${woodTable})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Main game area */}
      <div className="flex flex-col items-center gap-3 flex-shrink-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 w-full max-w-[520px] justify-between">
          <PlayerPanel gameState={gameState} />
          <div className="flex gap-2">
            <button
              onClick={toggleSound}
              className="px-3 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors"
              title={soundOn ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              onClick={() => setShowHistory(h => !h)}
              className="px-3 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors"
              title="Toggle history"
            >
              📋
            </button>
            <RulesModal
              trigger={
                <button className="px-3 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors">
                  📖
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
        <div className="flex items-center gap-4">
          <Dice
            value={gameState.diceValue}
            isRolling={gameState.isRolling}
            onClick={handleRoll}
            disabled={!canRoll}
          />

          <div className="bg-card/90 backdrop-blur-sm rounded-xl px-5 py-3 max-w-xs text-center board-inset">
            <p className="text-foreground text-sm font-medium">{gameState.message}</p>
          </div>
        </div>

        {gameState.phase === 'finished' && !showVictory && (
          <button
            onClick={() => setGameState(null)}
            className="px-6 py-3 rounded-xl font-heading font-bold bg-primary text-primary-foreground hover:brightness-110 transition-all"
          >
            Play Again
          </button>
        )}
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="hidden lg:block flex-shrink-0 animate-slide-in">
          <TurnHistory entries={logEntries} />
        </div>
      )}

      {/* Victory overlay */}
      {showVictory && gameState.winner && (
        <VictoryScreen
          winner={gameState.winner}
          stats={gameStats}
          onPlayAgain={() => { setShowVictory(false); setGameState(null); }}
        />
      )}
    </div>
  );
};

export default LudoGame;
