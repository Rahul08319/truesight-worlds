// Sound effects using Web Audio API - no external files needed

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  isEnabled() {
    return this.enabled;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  private playNoise(duration: number, volume = 0.1) {
    if (!this.enabled) return;
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
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {}
  }

  diceRoll() {
    // Rattling dice sound
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playNoise(0.05, 0.08);
        this.playTone(200 + Math.random() * 400, 0.04, 'square', 0.03);
      }, i * 80);
    }
    // Landing thud
    setTimeout(() => {
      this.playTone(120, 0.15, 'sine', 0.2);
      this.playNoise(0.1, 0.12);
    }, 500);
  }

  tokenMove() {
    this.playTone(600, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(800, 0.08, 'sine', 0.08), 60);
  }

  tokenKill() {
    this.playTone(300, 0.15, 'sawtooth', 0.12);
    setTimeout(() => this.playTone(200, 0.2, 'sawtooth', 0.1), 100);
    setTimeout(() => this.playTone(100, 0.3, 'sawtooth', 0.08), 200);
  }

  tokenGoal() {
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.12), i * 120);
    });
  }

  win() {
    // Victory fanfare
    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.35, 'sine', 0.15), i * 150);
    });
    setTimeout(() => {
      this.playTone(1047, 0.6, 'triangle', 0.12);
      this.playTone(1319, 0.6, 'triangle', 0.1);
    }, melody.length * 150);
  }

  cantMove() {
    this.playTone(200, 0.2, 'square', 0.06);
    setTimeout(() => this.playTone(150, 0.3, 'square', 0.05), 150);
  }

  tokenOut() {
    this.playTone(400, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(600, 0.1, 'sine', 0.1), 80);
    setTimeout(() => this.playTone(800, 0.15, 'sine', 0.1), 160);
  }

  chatMessage() {
    this.playTone(880, 0.06, 'sine', 0.08);
    setTimeout(() => this.playTone(1100, 0.08, 'sine', 0.06), 50);
  }

  chatEmoji() {
    this.playTone(1200, 0.05, 'triangle', 0.1);
    setTimeout(() => this.playTone(1500, 0.07, 'triangle', 0.08), 40);
    setTimeout(() => this.playTone(1800, 0.05, 'triangle', 0.06), 80);
  }
}

export const soundManager = new SoundManager();
