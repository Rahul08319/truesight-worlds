// Sound effects using Web Audio API - no external files needed

export type SoundChannel = 'game' | 'chat';

const STORAGE_KEY = 'ludo-sound-prefs-v1';

interface Prefs {
  game: number; // 0..1
  chat: number; // 0..1
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        game: typeof p.game === 'number' ? Math.max(0, Math.min(1, p.game)) : 1,
        chat: typeof p.chat === 'number' ? Math.max(0, Math.min(1, p.chat)) : 1,
      };
    }
  } catch {}
  return { game: 1, chat: 1 };
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private prefs: Prefs = loadPrefs();
  private listeners = new Set<() => void>();

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  // Legacy: master toggle — true if any channel has volume > 0
  setEnabled(v: boolean) {
    if (v) {
      if (this.prefs.game === 0 && this.prefs.chat === 0) {
        this.prefs = { game: 1, chat: 1 };
      }
    } else {
      this.prefs = { game: 0, chat: 0 };
    }
    this.persist();
  }

  isEnabled() {
    return this.prefs.game > 0 || this.prefs.chat > 0;
  }

  getVolume(channel: SoundChannel): number {
    return this.prefs[channel];
  }

  setVolume(channel: SoundChannel, value: number) {
    this.prefs[channel] = Math.max(0, Math.min(1, value));
    this.persist();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch {}
    this.listeners.forEach(fn => fn());
  }

  private playTone(channel: SoundChannel, freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
    const channelVol = this.prefs[channel];
    if (channelVol <= 0) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume * channelVol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  private playNoise(channel: SoundChannel, duration: number, volume = 0.1) {
    const channelVol = this.prefs[channel];
    if (channelVol <= 0) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = volume * channelVol;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {}
  }

  diceRoll() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playNoise('game', 0.05, 0.08);
        this.playTone('game', 200 + Math.random() * 400, 0.04, 'square', 0.03);
      }, i * 80);
    }
    setTimeout(() => {
      this.playTone('game', 120, 0.15, 'sine', 0.2);
      this.playNoise('game', 0.1, 0.12);
    }, 500);
  }

  tokenMove() {
    this.playTone('game', 600, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone('game', 800, 0.08, 'sine', 0.08), 60);
  }

  tokenKill() {
    this.playTone('game', 300, 0.15, 'sawtooth', 0.12);
    setTimeout(() => this.playTone('game', 200, 0.2, 'sawtooth', 0.1), 100);
    setTimeout(() => this.playTone('game', 100, 0.3, 'sawtooth', 0.08), 200);
  }

  tokenGoal() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone('game', freq, 0.3, 'sine', 0.12), i * 120);
    });
  }

  win() {
    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      setTimeout(() => this.playTone('game', freq, 0.35, 'sine', 0.15), i * 150);
    });
    setTimeout(() => {
      this.playTone('game', 1047, 0.6, 'triangle', 0.12);
      this.playTone('game', 1319, 0.6, 'triangle', 0.1);
    }, melody.length * 150);
  }

  cantMove() {
    this.playTone('game', 200, 0.2, 'square', 0.06);
    setTimeout(() => this.playTone('game', 150, 0.3, 'square', 0.05), 150);
  }

  tokenOut() {
    this.playTone('game', 400, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone('game', 600, 0.1, 'sine', 0.1), 80);
    setTimeout(() => this.playTone('game', 800, 0.15, 'sine', 0.1), 160);
  }

  chatMessage() {
    this.playTone('chat', 880, 0.05, 'sine', 0.03);
    setTimeout(() => this.playTone('chat', 1100, 0.06, 'sine', 0.025), 50);
  }

  chatEmoji() {
    this.playTone('chat', 1200, 0.04, 'triangle', 0.035);
    setTimeout(() => this.playTone('chat', 1500, 0.05, 'triangle', 0.03), 40);
    setTimeout(() => this.playTone('chat', 1800, 0.04, 'triangle', 0.025), 80);
  }

  chatMention() {
    // Distinct two-tone "ping" — higher and a touch louder than a normal chat msg
    this.playTone('chat', 1320, 0.12, 'sine', 0.08);
    setTimeout(() => this.playTone('chat', 1760, 0.18, 'sine', 0.07), 110);
    setTimeout(() => this.playTone('chat', 2100, 0.12, 'triangle', 0.05), 240);
  }
}

export const soundManager = new SoundManager();
