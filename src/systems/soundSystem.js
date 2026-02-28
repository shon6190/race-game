function createEngineLoopBuffer(context) {
  const duration = 1.5;
  const sampleRate = context.sampleRate;
  const frameCount = Math.floor(duration * sampleRate);
  const buffer = context.createBuffer(1, frameCount, sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i += 1) {
    const t = i / sampleRate;
    const fundamental = Math.sin(2 * Math.PI * 90 * t);
    const harmonicA = 0.5 * Math.sin(2 * Math.PI * 180 * t);
    const harmonicB = 0.25 * Math.sin(2 * Math.PI * 270 * t);
    const pulse = 0.1 * Math.sign(Math.sin(2 * Math.PI * 45 * t));
    channel[i] = (fundamental + harmonicA + harmonicB + pulse) * 0.45;
  }

  return buffer;
}

function createNoiseBuffer(context, duration = 0.35) {
  const sampleRate = context.sampleRate;
  const frameCount = Math.floor(sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    channel[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
  }
  return buffer;
}

class GameAudioSystem {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.engineGain = null;
    this.engineSource = null;
    this.engineBuffer = null;
    this.crashCooldownUntil = 0;
  }

  ensure() {
    if (this.context) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.context.destination);

    this.engineGain = this.context.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.masterGain);
    this.engineBuffer = createEngineLoopBuffer(this.context);
  }

  async resume() {
    this.ensure();
    if (!this.context) {
      return;
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  async startEngine() {
    await this.resume();
    if (!this.context || !this.engineGain || this.engineSource) {
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = this.engineBuffer;
    source.loop = true;
    source.playbackRate.value = 0.65;
    source.connect(this.engineGain);
    source.start();
    this.engineSource = source;
    this.engineGain.gain.cancelScheduledValues(this.context.currentTime);
    this.engineGain.gain.linearRampToValueAtTime(0.2, this.context.currentTime + 0.45);
  }

  stopEngine() {
    if (!this.context || !this.engineGain || !this.engineSource) {
      return;
    }

    const stopAt = this.context.currentTime + 0.4;
    this.engineGain.gain.cancelScheduledValues(this.context.currentTime);
    this.engineGain.gain.linearRampToValueAtTime(0.0, stopAt);

    const source = this.engineSource;
    source.stop(stopAt + 0.02);
    source.onended = () => {
      if (this.engineSource === source) {
        this.engineSource.disconnect();
        this.engineSource = null;
      }
    };
  }

  updateEngine(speedNorm, throttle) {
    if (!this.context || !this.engineSource || !this.engineGain) {
      return;
    }

    const t = this.context.currentTime;
    const playbackRate = 0.6 + speedNorm * 1.25;
    const gain = 0.1 + throttle * 0.15 + speedNorm * 0.18;
    this.engineSource.playbackRate.setTargetAtTime(playbackRate, t, 0.08);
    this.engineGain.gain.setTargetAtTime(gain, t, 0.08);
  }

  async playCountdownTick() {
    await this.resume();
    if (!this.context || !this.masterGain) {
      return;
    }

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'square';
    osc.frequency.value = 680;
    gain.gain.value = 0.001;
    gain.gain.exponentialRampToValueAtTime(0.13, this.context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.context.currentTime + 0.18);
  }

  async playCountdownGo() {
    await this.resume();
    if (!this.context || !this.masterGain) {
      return;
    }

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.context.currentTime + 0.28);
    gain.gain.value = 0.001;
    gain.gain.exponentialRampToValueAtTime(0.16, this.context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.42);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.context.currentTime + 0.45);
  }

  async playCrash() {
    await this.resume();
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = performance.now();
    if (now < this.crashCooldownUntil) {
      return;
    }
    this.crashCooldownUntil = now + 500;

    const source = this.context.createBufferSource();
    source.buffer = createNoiseBuffer(this.context);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    filter.Q.value = 1.1;

    const hitGain = this.context.createGain();
    hitGain.gain.value = 0.22;

    const delay = this.context.createDelay();
    delay.delayTime.value = 0.08;

    const feedback = this.context.createGain();
    feedback.gain.value = 0.28;

    const wetGain = this.context.createGain();
    wetGain.gain.value = 0.14;

    source.connect(filter);
    filter.connect(hitGain);
    hitGain.connect(this.masterGain);

    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(this.masterGain);

    source.start();
    source.stop(this.context.currentTime + 0.35);
  }
}

export const audioSystem = new GameAudioSystem();
