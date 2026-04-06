import React, { useState } from 'react';
import woodTable from '@/assets/wood-table.jpg';

interface MultiplayerLobbyProps {
  onCreateRoom: (name: string, avatar: string, maxPlayers: number) => Promise<string | null>;
  onJoinRoom: (code: string, name: string, avatar: string) => Promise<boolean>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
  room: { roomCode: string; playerCount: number; maxPlayers: number } | null;
  lobbyPlayers: { color: string; name: string; avatar: string }[];
  isHost: boolean;
  onStartGame: () => void;
}

const AVATARS = ['👤', '🦁', '🐯', '🦊', '🐻', '🐼', '🐸', '🐵', '🦅', '🐲', '🎭', '👑'];

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  onCreateRoom, onJoinRoom, onBack, loading, error, room, lobbyPlayers, isHost, onStartGame,
}) => {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦁');
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    await onCreateRoom(name.trim() || 'Player', avatar, maxPlayers);
  };

  const handleJoin = async () => {
    await onJoinRoom(joinCode.trim(), name.trim() || 'Player', avatar);
  };

  const copyCode = () => {
    if (room) {
      const url = `${window.location.origin}?join=${room.roomCode}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const colorDots: Record<string, string> = {
    red: 'bg-red-500', blue: 'bg-blue-500', yellow: 'bg-yellow-400', green: 'bg-green-500',
  };

  // In-room lobby view
  if (room) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundImage: `url(${woodTable})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="w-full max-w-md bg-card/95 backdrop-blur-sm rounded-2xl p-8 board-inset animate-slide-in">
          <h2 className="text-2xl font-heading font-bold text-center mb-1 gold-accent">Game Lobby</h2>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-lg font-mono font-bold text-primary tracking-widest">{room.roomCode}</span>
            <button onClick={copyCode} className="text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
              {copied ? '✓ Copied!' : '📋 Copy Link'}
            </button>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Players ({lobbyPlayers.length}/{room.maxPlayers})</p>
            {lobbyPlayers.map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-card/50 rounded-xl px-4 py-3 border border-border">
                <span className="text-xl">{p.avatar}</span>
                <div className={`w-3 h-3 rounded-full ${colorDots[p.color] || 'bg-muted'}`} />
                <span className="font-semibold text-sm text-foreground">{p.name}</span>
                {i === 0 && <span className="ml-auto text-xs text-primary">Host</span>}
              </div>
            ))}
            {Array.from({ length: room.maxPlayers - lobbyPlayers.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 bg-card/20 rounded-xl px-4 py-3 border border-border/30">
                <span className="text-xl opacity-30">👤</span>
                <span className="text-sm text-muted-foreground italic">Waiting for player...</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mb-4">
            Share the link or code with friends to join!
          </p>

          <div className="space-y-2">
            {isHost && (
              <button
                onClick={onStartGame}
                disabled={lobbyPlayers.length < 2}
                className="w-full py-3 rounded-xl font-heading font-bold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {lobbyPlayers.length < 2 ? 'Waiting for players...' : 'Start Game 🎲'}
              </button>
            )}
            {!isHost && (
              <p className="text-center text-sm text-muted-foreground py-3">Waiting for host to start...</p>
            )}
            <button onClick={onBack} className="w-full py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
              Leave Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Choose / Create / Join views
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundImage: `url(${woodTable})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="w-full max-w-md bg-card/95 backdrop-blur-sm rounded-2xl p-8 board-inset animate-slide-in">
        <h2 className="text-2xl font-heading font-bold text-center mb-6 gold-accent">Online Multiplayer</h2>

        {error && <p className="text-destructive text-sm text-center mb-4 bg-destructive/10 rounded-lg p-2">{error}</p>}

        {mode === 'choose' && (
          <div className="space-y-4">
            {/* Player setup */}
            <div className="space-y-3 mb-4">
              <label className="text-sm text-muted-foreground">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter name..."
                maxLength={12}
                className="w-full bg-muted/50 rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 ring-primary transition-all"
              />
              <label className="text-sm text-muted-foreground">Avatar</label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map(av => (
                  <button
                    key={av}
                    onClick={() => setAvatar(av)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-110 ${
                      avatar === av ? 'bg-primary/30 ring-2 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setMode('create')}
              className="w-full py-4 rounded-xl font-heading font-bold text-lg bg-primary text-primary-foreground hover:brightness-110 transition-all"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-3 rounded-xl font-heading font-semibold text-sm bg-secondary text-secondary-foreground hover:brightness-110 transition-all"
            >
              Join Room
            </button>
            <button onClick={onBack} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <label className="text-sm text-muted-foreground">Max Players</label>
            <div className="flex gap-2">
              {[2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                    maxPlayers === n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-4 rounded-xl font-heading font-bold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button onClick={() => setMode('choose')} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">
              ← Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            <label className="text-sm text-muted-foreground">Room Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              maxLength={6}
              className="w-full bg-muted/50 rounded-xl px-4 py-3 text-foreground text-center font-mono text-2xl tracking-widest outline-none focus:ring-2 ring-primary uppercase transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={loading || joinCode.length < 6}
              className="w-full py-4 rounded-xl font-heading font-bold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
            <button onClick={() => setMode('choose')} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerLobby;
