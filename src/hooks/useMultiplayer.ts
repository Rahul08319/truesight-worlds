import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { GameState, PlayerColor, PlayerType } from '@/lib/ludoGame';
import type { Json } from '@/integrations/supabase/types';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generatePlayerId(): string {
  const stored = sessionStorage.getItem('ludo_player_id');
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem('ludo_player_id', id);
  return id;
}

export interface MultiplayerRoom {
  id: string;
  roomCode: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  gameState: GameState | null;
  hostPlayerId: string;
}

export function useMultiplayer() {
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerId] = useState(generatePlayerId);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const createRoom = useCallback(async (playerName: string, playerAvatar: string, maxPlayers = 4) => {
    setLoading(true);
    setError(null);
    const roomCode = generateRoomCode();

    const lobbyState = {
      players: [{
        color: 'red' as PlayerColor,
        type: 'human' as PlayerType,
        name: playerName,
        avatar: playerAvatar,
        playerId,
        ready: true,
      }],
      status: 'waiting',
      maxPlayers,
    };

    const { data, error: err } = await supabase
      .from('game_rooms')
      .insert({
        room_code: roomCode,
        host_player_id: playerId,
        game_state: lobbyState as unknown as Json,
        status: 'waiting',
        max_players: maxPlayers,
        player_count: 1,
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }

    const newRoom: MultiplayerRoom = {
      id: data.id,
      roomCode: data.room_code,
      status: data.status,
      playerCount: data.player_count,
      maxPlayers: data.max_players,
      gameState: null,
      hostPlayerId: data.host_player_id,
    };

    setRoom(newRoom);
    setLoading(false);
    subscribeToRoom(data.id);
    return roomCode;
  }, [playerId]);

  const joinRoom = useCallback(async (roomCode: string, playerName: string, playerAvatar: string) => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (err || !data) {
      setError('Room not found');
      setLoading(false);
      return false;
    }

    if (data.status !== 'waiting') {
      setError('Game already in progress');
      setLoading(false);
      return false;
    }

    const lobbyState = data.game_state as any;
    if (lobbyState.players.length >= data.max_players) {
      setError('Room is full');
      setLoading(false);
      return false;
    }

    // Check if already joined
    const alreadyIn = lobbyState.players.find((p: any) => p.playerId === playerId);
    if (!alreadyIn) {
      const availableColors: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];
      const takenColors = lobbyState.players.map((p: any) => p.color);
      const color = availableColors.find(c => !takenColors.includes(c)) || 'blue';

      lobbyState.players.push({
        color,
        type: 'human',
        name: playerName,
        avatar: playerAvatar,
        playerId,
        ready: true,
      });

      await supabase
        .from('game_rooms')
        .update({
          game_state: lobbyState as unknown as Json,
          player_count: lobbyState.players.length,
        })
        .eq('id', data.id);
    }

    setRoom({
      id: data.id,
      roomCode: data.room_code,
      status: data.status,
      playerCount: lobbyState.players.length,
      maxPlayers: data.max_players,
      gameState: null,
      hostPlayerId: data.host_player_id,
    });

    setLoading(false);
    subscribeToRoom(data.id);
    return true;
  }, [playerId]);

  const subscribeToRoom = useCallback((roomId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as any;
          setRoom(prev => prev ? {
            ...prev,
            status: row.status,
            playerCount: row.player_count,
            gameState: row.status === 'playing' ? row.game_state as GameState : null,
          } : null);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  const updateGameState = useCallback(async (gameState: GameState) => {
    if (!room) return;
    await supabase
      .from('game_rooms')
      .update({
        game_state: gameState as unknown as Json,
        status: gameState.phase === 'finished' ? 'finished' : 'playing',
      })
      .eq('id', room.id);
  }, [room]);

  const startMultiplayerGame = useCallback(async (gameState: GameState) => {
    if (!room) return;
    await supabase
      .from('game_rooms')
      .update({
        game_state: gameState as unknown as Json,
        status: 'playing',
      })
      .eq('id', room.id);
  }, [room]);

  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setRoom(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    room,
    loading,
    error,
    playerId,
    createRoom,
    joinRoom,
    updateGameState,
    startMultiplayerGame,
    leaveRoom,
  };
}
