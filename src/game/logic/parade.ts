export const PARADE = {
  holes: 4,
  target: 8,
  duration: 22,
  popMin: 0.42,
  popMax: 0.78,
  visible: 1.08,
  bombChance: 0.24,
};

export type PopKind = 'turkey' | 'bomb';

export interface HoleState {
  kind: PopKind;
  life: number;
  phase: 'up' | 'down';
}

export interface ParadeState {
  holes: HoleState[];
  timeLeft: number;
  score: number;
  status: 'play' | 'win' | 'lose';
  selector: number;
  spawnIn: number;
  pops: number;
  rng: () => number;
}

export interface ParadeAction {
  selectorDelta: number;
  whack: number | null;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createParade(seed = 1): ParadeState {
  return {
    holes: Array.from({ length: PARADE.holes }, () => ({ kind: 'turkey' as const, life: 0, phase: 'down' as const })),
    timeLeft: PARADE.duration,
    score: 0,
    status: 'play',
    selector: 0,
    spawnIn: 0.35,
    pops: 0,
    rng: mulberry32(seed),
  };
}

export function stepParade(state: ParadeState, action: ParadeAction, dt: number): 'turkey' | 'bomb' | 'miss' | null {
  if (state.status !== 'play') return null;
  const step = Math.min(Math.max(dt, 0), 1 / 20);
  state.timeLeft = Math.max(0, state.timeLeft - step);
  if (action.selectorDelta) {
    const count = state.holes.length;
    state.selector = (state.selector + action.selectorDelta + count) % count;
  }
  let event: 'turkey' | 'bomb' | 'miss' | null = null;
  if (action.whack !== null) {
    const hole = state.holes[action.whack];
    if (!hole || hole.phase !== 'up') event = 'miss';
    else {
      hole.phase = 'down';
      hole.life = 0;
      if (hole.kind === 'turkey') {
        state.score += 1;
        event = 'turkey';
        if (state.score >= PARADE.target) state.status = 'win';
      } else {
        state.score = Math.max(0, state.score - 1);
        event = 'bomb';
      }
    }
  }
  for (const hole of state.holes) {
    if (hole.phase !== 'up') continue;
    hole.life -= step;
    if (hole.life <= 0) hole.phase = 'down';
  }
  state.spawnIn -= step;
  if (state.spawnIn <= 0 && state.status === 'play') {
    const hidden: number[] = [];
    state.holes.forEach((hole, index) => {
      if (hole.phase === 'down') hidden.push(index);
    });
    if (hidden.length) {
      const index = hidden[Math.floor(state.rng() * hidden.length)] ?? hidden[0];
      const hole = state.holes[index];
      hole.phase = 'up';
      hole.life = PARADE.visible;
      hole.kind = state.rng() < PARADE.bombChance ? 'bomb' : 'turkey';
      state.pops += 1;
    }
    state.spawnIn = PARADE.popMin + state.rng() * (PARADE.popMax - PARADE.popMin);
  }
  if (state.status === 'play' && state.timeLeft <= 0) state.status = 'lose';
  return event;
}

export function paradeBotAction(state: ParadeState): ParadeAction {
  const index = state.holes.findIndex((hole) => hole.phase === 'up' && hole.kind === 'turkey');
  return { selectorDelta: 0, whack: index >= 0 ? index : null };
}

export function runParadeBot(seed = 7, maxSeconds = PARADE.duration): { status: ParadeState['status']; score: number; time: number } {
  const state = createParade(seed);
  const dt = 1 / 60;
  let elapsed = 0;
  while (elapsed < maxSeconds && state.status === 'play') {
    stepParade(state, paradeBotAction(state), dt);
    elapsed += dt;
  }
  return { status: state.status, score: state.score, time: elapsed };
}
