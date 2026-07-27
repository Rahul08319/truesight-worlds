// YouTube Playables SDK wrapper
// Docs: https://developers.google.com/youtube/gaming/playables/reference/sdk
// The SDK is loaded via <script> in index.html and exposed as window.ytgame.
// It runs as a no-op when served outside of YouTube.

export type YtContentType = 'PLAYABLE' | 'VIDEO';

export interface YtScore {
  value: number;
}
export interface YtContent {
  id: string;
  contentType?: YtContentType;
}

export interface YtGame {
  IN_PLAYABLES_ENV: boolean;
  SDK_VERSION: string;
  game: {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string>;
    saveData(data: string): Promise<void>;
  };
  system: {
    getLanguage(): Promise<string>;
    isAudioEnabled(): boolean;
    onAudioEnabledChange(cb: (enabled: boolean) => void): () => void;
    onPause(cb: () => void): () => void;
    onResume(cb: () => void): () => void;
  };
  engagement: {
    sendScore(score: YtScore): Promise<void>;
    openYTContent(content: YtContent): Promise<void>;
    ContentType: { PLAYABLE: 'PLAYABLE'; VIDEO: 'VIDEO' };
  };
  ads: {
    requestInterstitialAd(): Promise<void>;
    requestRewardedAd(rewardId: string): Promise<boolean>;
  };
  health: {
    logError(): void;
    logWarning(): void;
  };
}

declare global {
  interface Window {
    ytgame?: YtGame;
  }
}

export const yt = (): YtGame | undefined =>
  typeof window !== 'undefined' ? window.ytgame : undefined;

export const inPlayables = (): boolean => !!yt()?.IN_PLAYABLES_ENV;

let firstFrameSent = false;
let gameReadySent = false;

export const lifecycle = {
  get firstFrameSent() { return firstFrameSent; },
  get gameReadySent() { return gameReadySent; },
};

export function firstFrameReady() {
  if (firstFrameSent) return;
  try {
    yt()?.game.firstFrameReady();
    firstFrameSent = true;
  } catch (e) {
    console.warn('[ytgame] firstFrameReady failed', e);
  }
}

export function gameReady() {
  if (gameReadySent) return;
  // Spec: firstFrameReady must be called before gameReady.
  firstFrameReady();
  try {
    yt()?.game.gameReady();
    gameReadySent = true;
  } catch (e) {
    console.warn('[ytgame] gameReady failed', e);
  }
}

export async function sendScore(value: number) {
  if (!Number.isFinite(value)) return;
  try {
    await yt()?.engagement.sendScore({ value: Math.max(0, Math.floor(value)) });
  } catch (e) {
    console.warn('[ytgame] sendScore failed', e);
  }
}

export async function saveData(data: string) {
  try {
    await yt()?.game.saveData(data);
  } catch (e) {
    console.warn('[ytgame] saveData failed', e);
  }
}

export async function loadData(): Promise<string | null> {
  try {
    const d = await yt()?.game.loadData();
    return d ?? null;
  } catch {
    return null;
  }
}

export async function requestInterstitialAd() {
  try {
    await yt()?.ads.requestInterstitialAd();
  } catch (e) {
    console.warn('[ytgame] interstitial failed', e);
  }
}

export async function requestRewardedAd(rewardId: string): Promise<boolean> {
  try {
    return (await yt()?.ads.requestRewardedAd(rewardId)) ?? false;
  } catch (e) {
    console.warn('[ytgame] rewarded failed', e);
    return false;
  }
}

export function onPause(cb: () => void) {
  try {
    return yt()?.system.onPause(cb);
  } catch {}
}

export function onResume(cb: () => void) {
  try {
    return yt()?.system.onResume(cb);
  } catch {}
}

export function onAudioEnabledChange(cb: (enabled: boolean) => void) {
  try {
    return yt()?.system.onAudioEnabledChange(cb);
  } catch {}
}

export function isAudioEnabled(): boolean {
  try {
    return yt()?.system.isAudioEnabled() ?? true;
  } catch {
    return true;
  }
}

export async function getLanguage(): Promise<string | null> {
  try {
    return (await yt()?.system.getLanguage()) ?? null;
  } catch {
    return null;
  }
}

export function logError() {
  try { yt()?.health.logError(); } catch {}
}

export function logWarning() {
  try { yt()?.health.logWarning(); } catch {}
}

// ── Ad engagement analytics ─────────────────────────────────────────────
// Structured events funneled through ytgame.health for post-release
// monitoring. Every event carries a timestamp + outcome code so the
// Playables dashboard (and local QA) can trace ad funnel drop-off.

export type AdOutcome =
  | "REQUESTED"        // player initiated the ad
  | "GRANTED"          // SDK reported reward true
  | "DISMISSED"        // SDK reported reward false (user skipped)
  | "FAILED"           // SDK threw
  | "TIMEOUT"          // wrapper timed out waiting for SDK
  | "RETRY";           // player retried after a failure

export interface AdEvent {
  rewardId: string;
  outcome: AdOutcome;
  code: number;       // 0 ok, 1 dismissed, 2 failed, 3 timeout, 4 requested, 5 retry
  timestamp: number;
  detail?: string;
  attempt?: number;
}

const OUTCOME_CODE: Record<AdOutcome, number> = {
  REQUESTED: 4, GRANTED: 0, DISMISSED: 1, FAILED: 2, TIMEOUT: 3, RETRY: 5,
};

const adEventLog: AdEvent[] = [];
let lastAdEvent: AdEvent | null = null;

export function getAdEventLog(): AdEvent[] { return adEventLog.slice(); }
export function getLastAdEvent(): AdEvent | null { return lastAdEvent; }

export function logAdEvent(
  outcome: AdOutcome,
  rewardId: string,
  detail?: string,
  attempt?: number,
): AdEvent {
  const evt: AdEvent = {
    rewardId,
    outcome,
    code: OUTCOME_CODE[outcome],
    timestamp: Date.now(),
    detail,
    attempt,
  };
  adEventLog.push(evt);
  if (adEventLog.length > 100) adEventLog.shift();
  lastAdEvent = evt;

  // Route to ytgame.health so YouTube's monitoring picks it up.
  try {
    if (outcome === "FAILED" || outcome === "TIMEOUT") yt()?.health.logError();
    else if (outcome === "DISMISSED") yt()?.health.logWarning();
  } catch {}

  const tag = outcome === "GRANTED" ? "✅" : outcome === "REQUESTED" ? "▶️" : "⚠️";
  console.info(`[ytgame:ad] ${tag} ${outcome} (${evt.code})`, evt);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ytgame:adevent", { detail: evt }));
  }
  return evt;
}

// Request a rewarded ad with timeout + structured analytics.
export async function requestRewardedAdTracked(
  rewardId: string,
  opts: { timeoutMs?: number; attempt?: number } = {},
): Promise<{ granted: boolean; outcome: AdOutcome }> {
  const { timeoutMs = 30_000, attempt = 1 } = opts;
  logAdEvent("REQUESTED", rewardId, undefined, attempt);
  const sdk = yt();
  if (!sdk) {
    logAdEvent("FAILED", rewardId, "SDK not present", attempt);
    return { granted: false, outcome: "FAILED" };
  }
  try {
    const raced = await Promise.race([
      sdk.ads.requestRewardedAd(rewardId).then(v => ({ ok: true, v })),
      new Promise<{ ok: false }>((resolve) =>
        setTimeout(() => resolve({ ok: false }), timeoutMs),
      ),
    ]);
    if (!raced.ok) {
      logAdEvent("TIMEOUT", rewardId, `>${timeoutMs}ms`, attempt);
      return { granted: false, outcome: "TIMEOUT" };
    }
    if (raced.v) {
      logAdEvent("GRANTED", rewardId, undefined, attempt);
      return { granted: true, outcome: "GRANTED" };
    }
    logAdEvent("DISMISSED", rewardId, undefined, attempt);
    return { granted: false, outcome: "DISMISSED" };
  } catch (e: any) {
    logAdEvent("FAILED", rewardId, String(e?.message ?? e), attempt);
    return { granted: false, outcome: "FAILED" };
  }
}

// ── Composite score (single source of truth) ────────────────────────────
export interface ScoreInputs {
  kills: number;
  moves: number;
  won: boolean;
}
export function computeCompositeScore({ kills, moves, won }: ScoreInputs): number {
  const base = won ? 10000 : 0;
  return base + Math.max(0, kills) * 100 + Math.max(0, 500 - Math.max(0, moves));
}

let lastSentScore: { value: number; timestamp: number; verified: boolean } | null = null;
export function getLastSentScore() { return lastSentScore; }

// Verified sendScore: recompute locally and confirm the caller's value matches
// before handing it to the SDK. Any mismatch is logged and blocked.
export async function sendScoreVerified(value: number, inputs: ScoreInputs) {
  const expected = computeCompositeScore(inputs);
  const verified = expected === value;
  if (!verified) {
    console.error("[ytgame:score] mismatch — refusing to send", { value, expected, inputs });
    try { yt()?.health.logError(); } catch {}
    lastSentScore = { value: expected, timestamp: Date.now(), verified: false };
    // Send the verified (recomputed) value instead of the tampered one.
    await sendScore(expected);
    return { sent: expected, verified: false };
  }
  await sendScore(value);
  lastSentScore = { value, timestamp: Date.now(), verified: true };
  console.info("[ytgame:score] sent + verified", lastSentScore);
  return { sent: value, verified: true };
}