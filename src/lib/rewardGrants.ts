// Exactly-once persistence for rewarded-ad grants.
//
// The Playables SDK may return `true` and then, seconds later, the player
// refreshes the tab or the game resumes from ytgame.saveData. Without
// deduping, we would grant the reward twice. Every successful ad produces a
// unique grantId; we persist it BEFORE applying the reward and treat
// re-application of a known grantId as a no-op.

const STORAGE_KEY = "ludo.rewardGrants.v1";
const APPLIED_KEY = "ludo.rewardGrants.applied.v1";

interface Grant {
  id: string;
  rewardId: string;
  timestamp: number;
  applied: boolean;
}

function read(key: string): Record<string, Grant> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function write(key: string, val: Record<string, Grant>) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function createGrant(rewardId: string): Grant {
  const id = `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const grants = read(STORAGE_KEY);
  grants[id] = { id, rewardId, timestamp: Date.now(), applied: false };
  write(STORAGE_KEY, grants);
  return grants[id];
}

// Returns true only the first time it is called for a given grantId.
// Safe against refresh, resume, and double-invocation.
export function applyGrantOnce(grantId: string): boolean {
  const applied = read(APPLIED_KEY);
  if (applied[grantId]) return false;
  const grants = read(STORAGE_KEY);
  const grant = grants[grantId];
  if (!grant) return false;
  grant.applied = true;
  applied[grantId] = grant;
  write(STORAGE_KEY, grants);
  write(APPLIED_KEY, applied);
  return true;
}

export function pendingGrants(): Grant[] {
  const grants = read(STORAGE_KEY);
  const applied = read(APPLIED_KEY);
  return Object.values(grants).filter(g => !applied[g.id]);
}

export function grantSummary() {
  const grants = read(STORAGE_KEY);
  const applied = read(APPLIED_KEY);
  return {
    total: Object.keys(grants).length,
    applied: Object.keys(applied).length,
    pending: pendingGrants().length,
  };
}