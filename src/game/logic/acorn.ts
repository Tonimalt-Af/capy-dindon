import { aabbOverlap, blankEvent, Platformer } from './physics';
import type { MoveInput, SimEvent, Solid } from './types';

export interface Mover {
  amp: number;
  period: number;
  phase: number;
}

export interface PlatformDef {
  id: string;
  x: number;
  top: number;
  w: number;
  h?: number;
  mover?: Mover;
}

export interface AcornLevel {
  spawn: { x: number };
  platforms: PlatformDef[];
  acorns: { id: string; x: number; y: number }[];
  hazards: { id: string; y: number; w: number; h: number; patrol: { min: number; max: number; speed: number } }[];
  exit: { x: number; y: number };
  checkpoints: { id: string; x: number }[];
}

export const ACORN_LEVEL: AcornLevel = {
  spawn: { x: -1.6 },
  platforms: [
    { id: 'p0', x: 0, top: 0, w: 7.2 },
    { id: 'p1', x: 6.5, top: 0.85, w: 3 },
    { id: 'p2', x: 10.9, top: 1.65, w: 3 },
    { id: 'p3', x: 15.3, top: 1.15, w: 3.3, mover: { amp: 0.8, period: 3.8, phase: 0.4 } },
    { id: 'p4', x: 20.8, top: 0.95, w: 6.2 },
    { id: 'p5', x: 26.4, top: 2.15, w: 2.7 },
    { id: 'p6', x: 30.4, top: 1.15, w: 2.8 },
    { id: 'p7', x: 34.8, top: 1.35, w: 5 },
  ],
  acorns: [
    { id: 'a1', x: -0.5, y: 1.2 },
    { id: 'a2', x: 1.9, y: 1.2 },
    { id: 'a3', x: 6.5, y: 2.05 },
    { id: 'a4', x: 10.9, y: 2.85 },
    { id: 'a5', x: 19.2, y: 2.15 },
    { id: 'a6', x: 22.3, y: 2.15 },
    { id: 'a7', x: 26.4, y: 3.35 },
    { id: 'a8', x: 34.1, y: 2.55 },
  ],
  hazards: [{ id: 'pump', y: 1.32, w: 0.72, h: 0.68, patrol: { min: 18.6, max: 23, speed: 1.55 } }],
  exit: { x: 36.4, y: 2.55 },
  checkpoints: [
    { id: 'p0', x: -1.6 },
    { id: 'p4', x: 18.4 },
    { id: 'p7', x: 33.4 },
  ],
};

const COLLECT_R = 0.92;
const EXIT_R = 1.05;

export function platformTop(def: PlatformDef, time: number): number {
  if (!def.mover) return def.top;
  const omega = (Math.PI * 2) / def.mover.period;
  return def.top + Math.sin(omega * time + def.mover.phase) * def.mover.amp;
}

export function sampleLevel(level: AcornLevel, time: number, dt: number): { solids: Solid[]; hazards: { id: string; x: number; y: number; w: number; h: number }[] } {
  const solids = level.platforms.map((def) => {
    const h = def.h ?? 1.55;
    const top = platformTop(def, time);
    const prev = platformTop(def, time - dt);
    return {
      id: def.id,
      x: def.x,
      y: top - h / 2,
      w: def.w,
      h,
      dx: 0,
      dy: top - prev,
    };
  });
  const hazards = level.hazards.map((hz) => {
    const span = hz.patrol.max - hz.patrol.min;
    const period = (span * 2) / hz.patrol.speed;
    const u = ((time % period) + period) % period;
    const dist = hz.patrol.speed * u;
    const x = dist <= span ? hz.patrol.min + dist : hz.patrol.max - (dist - span);
    return { id: hz.id, x, y: hz.y, w: hz.w, h: hz.h };
  });
  return { solids, hazards };
}

export function gapReport(level: AcornLevel): { from: string; to: string; gap: number; rise: number }[] {
  const rows = [];
  for (let i = 0; i < level.platforms.length - 1; i++) {
    const a = level.platforms[i];
    const b = level.platforms[i + 1];
    const gap = b.x - b.w / 2 - (a.x + a.w / 2);
    const rise = b.top + (b.mover?.amp ?? 0) - a.top;
    rows.push({ from: a.id, to: b.id, gap, rise });
  }
  return rows;
}

export class AcornSim {
  readonly player: Platformer;
  readonly collected = new Set<string>();
  won = false;
  time = 0;
  invuln = 0;
  bonks = 0;
  solids: Solid[] = [];
  hazards: { id: string; x: number; y: number; w: number; h: number }[] = [];
  events: SimEvent[] = [];
  checkpoint = { x: 0, y: 1 };

  constructor(readonly level: AcornLevel = ACORN_LEVEL) {
    const top = level.platforms[0].top;
    this.player = new Platformer(level.spawn.x, top + 0.52, 0.5, 1);
    this.checkpoint = { x: level.spawn.x, y: top + 0.52 };
  }

  step(input: MoveInput, dt: number): void {
    this.events = [];
    const step = Math.min(Math.max(dt, 0), 1 / 30);
    this.time += step;
    this.invuln = Math.max(0, this.invuln - step);
    const sampled = sampleLevel(this.level, this.time, step);
    this.solids = sampled.solids;
    this.hazards = sampled.hazards;
    const motion = this.player.step(input, this.solids, step);
    if (motion.jumped) this.events.push(blankEvent('jump', this.player.x, this.player.y));
    if (motion.landed) this.events.push(blankEvent('land', this.player.x, this.player.y));

    if (this.player.grounded && this.player.groundId) {
      const mark = this.level.checkpoints.find((c) => c.id === this.player.groundId);
      const solid = this.solids.find((s) => s.id === this.player.groundId);
      if (mark && solid) {
        this.checkpoint = { x: mark.x, y: solid.y + solid.h / 2 + this.player.h / 2 + 0.02 };
      }
    }

    if (this.invuln <= 0) {
      for (const hz of this.hazards) {
        const feet = this.player.y - this.player.h / 2;
        if (feet > hz.y + hz.h / 2 - 0.05) continue;
        if (!aabbOverlap(this.player, hz)) continue;
        const dir = Math.sign(this.player.x - hz.x) || -this.player.facing;
        this.player.vy = 9.2;
        this.player.vx = dir * 4.4;
        this.invuln = 0.75;
        this.bonks += 1;
        this.events.push(blankEvent('bonk', this.player.x, this.player.y, hz.id));
        break;
      }
    }

    for (const acorn of this.level.acorns) {
      if (this.collected.has(acorn.id)) continue;
      const dx = acorn.x - this.player.x;
      const dy = acorn.y - this.player.y;
      if (dx * dx + dy * dy <= COLLECT_R * COLLECT_R) {
        this.collected.add(acorn.id);
        this.events.push(blankEvent('collect', acorn.x, acorn.y, acorn.id));
      }
    }

    if (!this.won && this.collected.size >= this.level.acorns.length) {
      const dx = this.level.exit.x - this.player.x;
      const dy = this.level.exit.y - this.player.y;
      if (dx * dx + dy * dy <= EXIT_R * EXIT_R) {
        this.won = true;
        this.events.push(blankEvent('win', this.player.x, this.player.y));
      }
    }

    if (this.player.y < -5) {
      this.player.x = this.checkpoint.x;
      this.player.y = this.checkpoint.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.invuln = 0.35;
      this.events.push(blankEvent('respawn', this.player.x, this.player.y));
    }
  }
}

export function acornIntent(sim: AcornSim): { left: boolean; right: boolean; jump: boolean } {
  const remaining = sim.level.acorns.filter((a) => !sim.collected.has(a.id));
  remaining.sort((a, b) => a.x - b.x);
  const target = remaining[0] ?? sim.level.exit;
  const dx = target.x - sim.player.x;
  const dir: -1 | 0 | 1 = dx > 0.18 ? 1 : dx < -0.18 ? -1 : 0;
  const feet = sim.player.y - sim.player.h / 2;
  const probeDir = dir || 1;
  const probeX = sim.player.x + probeDir * 0.42;
  const groundAhead = sim.solids.some((s) => {
    const top = s.y + s.h / 2;
    return Math.abs(probeX - s.x) <= s.w / 2 + 0.02 && feet - top < 1.7 && feet - top > -0.35;
  });
  const wallBox = {
    x: sim.player.x + probeDir * (sim.player.w / 2 + 0.16),
    y: sim.player.y,
    w: 0.18,
    h: sim.player.h * 0.45,
  };
  const wall = sim.solids.some((s) => {
    const top = s.y + s.h / 2;
    return top > feet + 0.3 && aabbOverlap(wallBox, s);
  });
  const here = surfaceAt(sim, sim.player.x, feet);
  const there = surfaceAt(sim, target.x, feet + 3);
  const wantUp = here !== null && there !== null && there > here + 0.45;
  const hazard = sim.hazards.some((hz) => {
    const ahead = probeDir > 0 ? hz.x > sim.player.x - 0.2 : hz.x < sim.player.x + 0.2;
    return ahead && Math.abs(hz.x - sim.player.x) < 1.45 && feet < hz.y + hz.h;
  });
  return {
    left: dir < 0,
    right: dir > 0,
    jump: dir !== 0 && (wantUp || wall || hazard || !groundAhead),
  };
}

function surfaceAt(sim: AcornSim, x: number, maxTop: number): number | null {
  let best: number | null = null;
  for (const s of sim.solids) {
    if (Math.abs(x - s.x) > s.w / 2) continue;
    const top = s.y + s.h / 2;
    if (top > maxTop + 0.2) continue;
    if (best === null || top > best) best = top;
  }
  return best;
}

export function runAcornBot(maxSeconds = 40): { won: boolean; time: number; collected: number; x: number; bonks: number } {
  const sim = new AcornSim();
  let hold = 0;
  const dt = 1 / 60;
  for (let t = 0; t <= maxSeconds; t += dt) {
    const intent = acornIntent(sim);
    if (intent.jump && sim.player.grounded) hold = 0.22;
    else hold = Math.max(0, hold - dt);
    sim.step(
      {
        left: intent.left,
        right: intent.right,
        jumpHeld: hold > 0,
        jumpPressed: intent.jump && sim.player.grounded,
      },
      dt,
    );
    if (sim.won) {
      return { won: true, time: t, collected: sim.collected.size, x: sim.player.x, bonks: sim.bonks };
    }
  }
  return { won: false, time: maxSeconds, collected: sim.collected.size, x: sim.player.x, bonks: sim.bonks };
}
