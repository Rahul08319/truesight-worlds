import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PlayerColor, PlayerType, GameState, CpuDifficulty } from '@/lib/ludoGame';
import {
  createInitialState,
  rollDice,
  getMovableTokens,
  moveToken,
  cpuSelectToken,
  toGlobalPosition,
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
import GameTimer from '@/components/GameTimer';
import GameChat from '@/components/GameChat';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { useGameChat } from '@/hooks/useGameChat';
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
  const [undoStack, setUndoStack] = useState<{ state: GameState; stats: GameStats; logs: LogEntry[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ state: GameState; stats: GameStats; logs: LogEntry[] }[]>([]);
  const multiplayer = useMultiplayer();
  const isMultiplayerGame = !!multiplayer.room;
  const currentPlayerForChat = gameState?.players[gameState.currentPlayerIndex];
  const chat = useGameChat(
    isMultiplayerGame ? multiplayer.room!.id : null,
    currentPlayerForChat?.name || 'Player',
    currentPlayerForChat?.avatar || '👤',
    currentPlayerForChat?.color || 'red'
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevStateRef = useRef<GameState | null>(null);
  const animatingRef = useRef(false);

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

  const handleStart = (configs: { color: PlayerColor; type: PlayerType; name?: string; avatar?: string; difficulty?: CpuDifficulty }[]) => {
    logIdCounter = 0;
    setLogEntries([]);
    setGameStats(initStats(configs));
    setShowVictory(false);
    setUndoStack([]);
    setRedoStack([]);
    setGameState(createInitialState(configs));
  };

  // Save snapshot before a human's turn for undo
  const saveUndoSnapshot = useCallback(() => {
    if (!gameState) return;
    setUndoStack(prev => [...prev.slice(-19), { state: JSON.parse(JSON.stringify(gameState)), stats: JSON.parse(JSON.stringify(gameStats)), logs: [...logEntries] }]);
    setRedoStack([]);
  }, [gameState, gameStats, logEntries]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || animatingRef.current) return;
    const snapshot = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, { state: JSON.parse(JSON.stringify(gameState!)), stats: JSON.parse(JSON.stringify(gameStats)), logs: [...logEntries] }]);
    setUndoStack(prev => prev.slice(0, -1));
    setGameState(snapshot.state);
    setGameStats(snapshot.stats);
    setLogEntries(snapshot.logs);
    setMovableTokens([]);
    prevStateRef.current = snapshot.state;
  }, [undoStack, gameState, gameStats, logEntries]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || animatingRef.current) return;
    const snapshot = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, { state: JSON.parse(JSON.stringify(gameState!)), stats: JSON.parse(JSON.stringify(gameStats)), logs: [...logEntries] }]);
    setRedoStack(prev => prev.slice(0, -1));
    setGameState(snapshot.state);
    setGameStats(snapshot.stats);
    setLogEntries(snapshot.logs);
    setMovableTokens([]);
    prevStateRef.current = snapshot.state;
  }, [redoStack, gameState, gameStats, logEntries]);

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
      const diceMatch = gameState.message.match(/(\d+) spaces/);
      addLog(playerColor, `Moved ${diceMatch ? diceMatch[1] : gameState.diceValue ?? prev.diceValue ?? '?'} spaces`, 'move');
      setGameStats(s => ({ ...s, totalMoves: s.totalMoves + 1, perPlayer: { ...s.perPlayer, [playerColor]: { ...s.perPlayer[playerColor], moves: (s.perPlayer[playerColor]?.moves ?? 0) + 1 } } }));
    } else if (gameState.message.includes('home column')) {
      addLog(playerColor, `Advancing in home column`, 'move');
      setGameStats(s => ({ ...s, totalMoves: s.totalMoves + 1, perPlayer: { ...s.perPlayer, [playerColor]: { ...s.perPlayer[playerColor], moves: (s.perPlayer[playerColor]?.moves ?? 0) + 1 } } }));
    }

    prevStateRef.current = gameState;
  }, [gameState, addLog]);

  // Animate token step-by-step then apply final state
  const animateAndMove = useCallback((state: GameState, tokenId: number, onDone: () => void) => {
    const player = state.players[state.currentPlayerIndex];
    const token = player.tokens.find(t => t.id === tokenId)!;
    const dice = state.diceValue!;
    const color = player.color;

    // Calculate steps
    const steps: number[] = [];
    if (token.isHome) {
      // Moving out: just one step to start position
      steps.push(0);
    } else {
      for (let i = 1; i <= dice; i++) {
        steps.push(token.position + i);
      }
    }

    if (steps.length === 0) {
      const result = moveToken(state, tokenId);
      onDone();
      setGameState(result);
      return;
    }

    animatingRef.current = true;
    setAnimatingToken({ color, id: tokenId });

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (stepIdx >= steps.length) {
        clearInterval(stepInterval);
        setAnimatingToken(null);
        animatingRef.current = false;
        const result = moveToken(state, tokenId);
        setGameState(result);
        onDone();
        return;
      }

      // Create intermediate visual state
      setGameState(prev => {
        if (!prev) return prev;
        const intermediate = JSON.parse(JSON.stringify(prev)) as GameState;
        const p = intermediate.players[intermediate.currentPlayerIndex];
        const t = p.tokens.find(tk => tk.id === tokenId)!;
        const pos = steps[stepIdx];

        if (t.isHome) {
          t.isHome = false;
          t.position = 0;
          t.globalPosition = toGlobalPosition(0, color);
        } else if (pos < 52) {
          t.position = pos;
          t.globalPosition = toGlobalPosition(pos, color);
        } else if (pos <= 57) {
          t.position = pos;
          t.globalPosition = -1;
        }

        return intermediate;
      });
      soundManager.tokenMove();
      stepIdx++;
    }, 120);
  }, []);

  const handleRoll = useCallback(() => {
    if (!gameState || gameState.phase !== 'rolling' || animatingRef.current) return;
    // Save undo snapshot before human rolls
    const currentP = gameState.players[gameState.currentPlayerIndex];
    if (currentP.type === 'human') {
      saveUndoSnapshot();
    }

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
        animateAndMove(stateWithDice, movable[0], () => setMovableTokens([]));
      } else {
        setMovableTokens(movable);
        stateWithDice.message = `${player.name} rolled ${dice}. Select a token to move.`;
        setGameState(stateWithDice);
      }
    }, 600);
  }, [gameState, addLog, animateAndMove, saveUndoSnapshot]);

  const handleTokenClick = useCallback((color: PlayerColor, tokenId: number) => {
    if (!gameState || gameState.phase !== 'selecting' || animatingRef.current) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (color !== currentPlayer.color) return;
    if (!movableTokens.includes(tokenId)) return;

    animateAndMove(gameState, tokenId, () => setMovableTokens([]));
  }, [gameState, movableTokens, animateAndMove]);

  // CPU auto-play
  useEffect(() => {
    if (!gameState) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.type !== 'cpu' || gameState.phase === 'finished') return;

    if (gameState.phase === 'rolling') {
      timeoutRef.current = setTimeout(() => handleRoll(), 1000);
    } else if (gameState.phase === 'selecting' && movableTokens.length > 0) {
      timeoutRef.current = setTimeout(() => {
        const tokenId = cpuSelectToken(gameState, currentPlayer.difficulty);
        if (tokenId >= 0) {
          handleTokenClick(currentPlayer.color, tokenId);
        }
      }, 800);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [gameState, movableTokens, handleRoll, handleTokenClick]);

  // Handle multiplayer game state updates from realtime
  useEffect(() => {
    if (multiplayer.room?.gameState && multiplayer.room.status === 'playing') {
      setGameState(multiplayer.room.gameState);
    }
  }, [multiplayer.room?.gameState, multiplayer.room?.status]);

  // Auto-join from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setShowMultiplayer(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const lobbyPlayers = multiplayer.room
    ? ((multiplayer.room as any).gameState?.players || []).map((p: any) => ({
        color: p.color, name: p.name, avatar: p.avatar,
      }))
    : [];

  // Fetch lobby state from DB when in waiting room
  const [lobbyData, setLobbyData] = useState<any[]>([]);
  useEffect(() => {
    if (!multiplayer.room || multiplayer.room.status !== 'waiting') return;
    const fetchLobby = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('game_rooms')
        .select('game_state')
        .eq('id', multiplayer.room!.id)
        .single();
      if (data?.game_state) {
        const gs = data.game_state as any;
        setLobbyData(gs.players || []);
      }
    };
    fetchLobby();
    const interval = setInterval(fetchLobby, 2000);
    return () => clearInterval(interval);
  }, [multiplayer.room?.id, multiplayer.room?.status, multiplayer.room?.playerCount]);

  const handleStartMultiplayerGame = useCallback(async () => {
    if (!multiplayer.room) return;
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('game_rooms')
      .select('game_state')
      .eq('id', multiplayer.room.id)
      .single();
    if (!data?.game_state) return;
    const lobby = data.game_state as any;
    const configs = lobby.players.map((p: any) => ({
      color: p.color as PlayerColor,
      type: 'human' as PlayerType,
      name: p.name,
      avatar: p.avatar,
    }));
    const initialState = createInitialState(configs);
    await multiplayer.startMultiplayerGame(initialState);
    setGameState(initialState);
    setGameStats(initStats(configs));
  }, [multiplayer]);

  if (showMultiplayer && !gameState) {
    return (
      <MultiplayerLobby
        onCreateRoom={multiplayer.createRoom}
        onJoinRoom={multiplayer.joinRoom}
        onBack={() => { multiplayer.leaveRoom(); setShowMultiplayer(false); }}
        loading={multiplayer.loading}
        error={multiplayer.error}
        room={multiplayer.room ? { roomCode: multiplayer.room.roomCode, playerCount: multiplayer.room.playerCount, maxPlayers: multiplayer.room.maxPlayers } : null}
        lobbyPlayers={lobbyData.length > 0 ? lobbyData : lobbyPlayers}
        isHost={multiplayer.room ? multiplayer.room.hostPlayerId === multiplayer.playerId : false}
        onStartGame={handleStartMultiplayerGame}
      />
    );
  }

  if (!gameState) {
    return <GameSetup onStart={handleStart} onOnlineClick={() => setShowMultiplayer(true)} />;
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
          <GameTimer currentPlayerColor={currentPlayer.color} isFinished={gameState.phase === 'finished'} />
          <div className="flex gap-1.5">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0 || animatingRef.current}
              className="px-2.5 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo last move"
            >
              ↩️
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0 || animatingRef.current}
              className="px-2.5 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo"
            >
              ↪️
            </button>
            <button
              onClick={toggleSound}
              className="px-2.5 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors"
              title={soundOn ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              onClick={() => setShowHistory(h => !h)}
              className="px-2.5 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors"
              title="Toggle history"
            >
              📋
            </button>
            <RulesModal
              trigger={
                <button className="px-2.5 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground text-sm hover:bg-card transition-colors">
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
          players={gameState.players.map(p => ({ name: p.name, avatar: p.avatar, color: p.color }))}
        />
      )}

      {/* Multiplayer chat */}
      {isMultiplayerGame && gameState && (
        <GameChat messages={chat.messages} onSend={chat.sendMessage} />
      )}
    </div>
  );
};

export default LudoGame;
