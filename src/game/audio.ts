type Wave = OscillatorType;

interface Note {
  beat: number;
  midi: number;
  len: number;
}

interface Track {
  wave: Wave;
  gain: number;
  filter: number;
  notes: Note[];
}

interface Song {
  bpm: number;
  bars: number;
  tracks: Track[];
}

const n = (beat: number, midi: number, len = 1): Note => ({ beat, midi, len });

const SONGS: Record<string, Song> = {
  title: {
    bpm: 78,
    bars: 16,
    tracks: [
      {
        wave: 'sine',
        gain: 0.07,
        filter: 1800,
        notes: [
          n(0, 72), n(1, 76), n(2, 79), n(3, 76, 0.5), n(3.5, 74, 0.5),
          n(4, 72, 1.5), n(6, 67), n(7, 69),
          n(8, 72), n(9, 76), n(10, 81), n(11, 79),
          n(12, 76), n(13, 74), n(14, 72, 2),
        ],
      },
      {
        wave: 'triangle',
        gain: 0.045,
        filter: 420,
        notes: [n(0, 48, 4), n(4, 43, 4), n(8, 45, 4), n(12, 43, 4)],
      },
    ],
  },
  hub: {
    bpm: 96,
    bars: 16,
    tracks: [
      {
        wave: 'sine',
        gain: 0.06,
        filter: 1600,
        notes: [
          n(0, 76), n(1, 79), n(2, 81, 0.5), n(2.5, 79, 0.5), n(3, 76),
          n(4, 74), n(5, 76), n(6, 72, 2),
          n(8, 67), n(9, 72), n(10, 76), n(11, 79),
          n(12, 76), n(13, 74), n(14, 72), n(15, 67),
        ],
      },
      {
        wave: 'triangle',
        gain: 0.04,
        filter: 380,
        notes: [n(0, 48, 4), n(4, 45, 4), n(8, 43, 4), n(12, 48, 4)],
      },
    ],
  },
  glands: {
    bpm: 112,
    bars: 8,
    tracks: [
      {
        wave: 'triangle',
        gain: 0.055,
        filter: 1400,
        notes: [n(0, 76), n(1, 79), n(2, 84), n(3, 79), n(4, 81), n(5, 76), n(6, 74), n(7, 72)],
      },
      {
        wave: 'sine',
        gain: 0.04,
        filter: 360,
        notes: [n(0, 48, 2), n(2, 55, 2), n(4, 52, 2), n(6, 43, 2)],
      },
    ],
  },
  pantry: {
    bpm: 72,
    bars: 16,
    tracks: [
      {
        wave: 'sine',
        gain: 0.055,
        filter: 1200,
        notes: [
          n(0, 69, 1.5), n(2, 72), n(3, 74), n(4, 76, 1.5), n(6, 74), n(7, 72),
          n(8, 69, 1.5), n(10, 67), n(12, 69), n(14, 64, 2),
        ],
      },
      {
        wave: 'triangle',
        gain: 0.035,
        filter: 320,
        notes: [n(0, 45, 4), n(4, 41, 4), n(8, 43, 4), n(12, 40, 4)],
      },
    ],
  },
  parade: {
    bpm: 126,
    bars: 8,
    tracks: [
      {
        wave: 'square',
        gain: 0.03,
        filter: 900,
        notes: [n(0, 76, 0.5), n(0.5, 79, 0.5), n(1, 84), n(2, 79), n(3, 76), n(4, 74), n(5, 76), n(6, 81), n(7, 79)],
      },
      {
        wave: 'triangle',
        gain: 0.05,
        filter: 300,
        notes: [n(0, 48, 1), n(2, 55, 1), n(4, 52, 1), n(6, 43, 1)],
      },
    ],
  },
  evolve: {
    bpm: 76,
    bars: 16,
    tracks: [
      {
        wave: 'sine',
        gain: 0.07,
        filter: 2000,
        notes: [n(0, 76), n(1, 79), n(2, 84), n(3, 88), n(4, 84, 2), n(6, 79), n(8, 81), n(10, 84), n(12, 88, 2), n(14, 91, 2)],
      },
      {
        wave: 'triangle',
        gain: 0.04,
        filter: 400,
        notes: [n(0, 52, 8), n(8, 55, 8)],
      },
    ],
  },
};

function songIdGain(id: string): number {
  if (id === 'parade') return 0.03;
  if (id === 'glands') return 0.02;
  return 0.012;
}

function midiHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private songId = '';
  private origin = 0;
  private nextBeat = 0;
  music = 0.75;
  sfx = 0.85;
  muted = false;

  async unlock(): Promise<void> {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 20;
      comp.ratio.value = 3;
      comp.attack.value = 0.01;
      comp.release.value = 0.18;
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      const samples = this.ctx.sampleRate * 1;
      this.noise = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.applyGains();
  }

  applyGains(): void {
    if (!this.musicGain || !this.sfxGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.muted ? 0 : this.music, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.sfx, now, 0.05);
  }

  playSong(id: string): void {
    if (!SONGS[id] || this.songId === id) return;
    this.songId = id;
    if (this.ctx) {
      this.origin = this.ctx.currentTime + 0.06;
      this.nextBeat = 0;
    }
  }

  update(): void {
    if (!this.ctx || !this.musicGain || !this.songId) return;
    const song = SONGS[this.songId];
    const beat = 60 / song.bpm;
    const now = this.ctx.currentTime;
    if (this.origin + this.nextBeat * beat < now - 0.25) {
      this.origin = now + 0.02;
      this.nextBeat = 0;
    }
    let guard = 0;
    while (this.origin + this.nextBeat * beat < now + 0.22 && guard < 24) {
      const time = this.origin + this.nextBeat * beat;
      const slot = this.nextBeat % song.bars;
      for (const track of song.tracks) {
        for (const note of track.notes) {
          if (Math.abs(note.beat - slot) < 0.01) this.voice(time, midiHz(note.midi), note.len * beat, track);
        }
      }
      if (this.noise && slot % 2 === 0) this.hat(time, songIdGain(this.songId));
      this.nextBeat += 1;
      guard += 1;
    }
  }

  private voice(time: number, freq: number, dur: number, track: Track): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = track.filter;
    osc.type = track.wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, track.gain), time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.08, dur));
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.04);
  }

  private tone(freq: number, dur: number, type: Wave, gainValue: number, delay = 0): void {
    if (!this.ctx || !this.sfxGain) return;
    const time = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private puff(dur: number, gainValue: number, freq = 180): void {
    if (!this.ctx || !this.sfxGain || !this.noise) return;
    const time = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(time);
    src.stop(time + dur);
  }

  private hat(time: number, amount: number): void {
    if (!this.ctx || !this.musicGain || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(amount, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(time);
    src.stop(time + 0.05);
  }

  jump(): void {
    if (!this.ctx || !this.sfxGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, time);
    osc.frequency.exponentialRampToValueAtTime(760, time + 0.13);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.13, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + 0.18);
    this.puff(0.06, 0.045, 980);
  }

  land(): void {
    this.puff(0.1, 0.11, 170);
    this.tone(120, 0.07, 'sine', 0.06);
  }

  collect(): void {
    this.tone(784, 0.08, 'triangle', 0.07);
    this.tone(1046, 0.1, 'sine', 0.07, 0.045);
    this.tone(1318, 0.12, 'sine', 0.06, 0.09);
    this.tone(1976, 0.14, 'sine', 0.045, 0.14);
  }

  win(): void {
    [523, 659, 784, 1046].forEach((freq, i) => this.tone(freq, 0.22, 'triangle', 0.08, i * 0.09));
  }

  lose(): void {
    this.tone(392, 0.16, 'sine', 0.06);
    this.tone(311, 0.28, 'sine', 0.06, 0.12);
  }

  click(): void {
    this.tone(720, 0.045, 'sine', 0.05);
    this.tone(980, 0.06, 'triangle', 0.03, 0.02);
  }

  push(): void {
    this.puff(0.07, 0.07, 160);
  }

  turkey(): void {
    if (!this.ctx || !this.sfxGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, time);
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.linearRampToValueAtTime(480, time + 0.07);
    osc.frequency.linearRampToValueAtTime(160, time + 0.16);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.045, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  bomb(): void {
    this.puff(0.22, 0.16, 90);
    this.tone(160, 0.18, 'sine', 0.07);
    this.tone(80, 0.26, 'triangle', 0.05, 0.04);
  }

  evolve(): void {
    [659, 784, 988, 1175, 1318, 1568].forEach((freq, i) => this.tone(freq, 0.4, 'sine', 0.06, i * 0.08));
  }
}
