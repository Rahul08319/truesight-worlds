import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LeaderboardEntry {
  id: string;
  player_name: string;
  avatar: string;
  wins: number;
  kills: number;
  games_played: number;
  total_moves: number;
}

export async function saveGameResult(players: { name: string; avatar: string; color: string }[], winnerColor: string, stats: Record<string, { kills: number; moves: number }>) {
  for (const p of players) {
    const isWinner = p.color === winnerColor;
    const pStats = stats[p.color] || { kills: 0, moves: 0 };

    // Try upsert by player_name + avatar
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('player_name', p.name)
      .eq('avatar', p.avatar)
      .maybeSingle();

    if (existing) {
      await supabase.from('leaderboard').update({
        wins: existing.wins + (isWinner ? 1 : 0),
        kills: existing.kills + pStats.kills,
        games_played: existing.games_played + 1,
        total_moves: existing.total_moves + pStats.moves,
      }).eq('id', existing.id);
    } else {
      await supabase.from('leaderboard').insert({
        player_name: p.name,
        avatar: p.avatar,
        wins: isWinner ? 1 : 0,
        kills: pStats.kills,
        games_played: 1,
        total_moves: pStats.moves,
      });
    }
  }
}

const Leaderboard: React.FC<{ trigger: React.ReactNode }> = ({ trigger }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('leaderboard')
      .select('*')
      .order('wins', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setEntries((data as LeaderboardEntry[]) || []);
        setLoading(false);
      });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">🏆 Leaderboard</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No games played yet!</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1">
            <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem] gap-2 text-xs text-muted-foreground font-medium px-2 pb-1 border-b border-border">
              <span>#</span><span>Player</span><span className="text-center">W</span><span className="text-center">K</span><span className="text-center">GP</span>
            </div>
            {entries.map((e, i) => (
              <div key={e.id} className={`grid grid-cols-[2rem_1fr_3rem_3rem_3rem] gap-2 items-center px-2 py-1.5 rounded-lg text-sm ${i < 3 ? 'bg-primary/10' : ''}`}>
                <span className="font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex items-center gap-1.5 truncate">
                  <span className="text-lg">{e.avatar}</span>
                  <span className="truncate font-medium text-foreground">{e.player_name}</span>
                </span>
                <span className="text-center font-bold text-foreground">{e.wins}</span>
                <span className="text-center text-muted-foreground">{e.kills}</span>
                <span className="text-center text-muted-foreground">{e.games_played}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Leaderboard;
