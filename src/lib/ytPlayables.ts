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