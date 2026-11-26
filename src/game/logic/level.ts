import { platformTop, type PlatformDef } from './acorn';
import { aabbOverlap, blankEvent, PHYS, Platformer } from './physics';
import type { LevelId } from './types';
import type { MoveInput, Rect, SimEvent, Solid } from './types';

export interface LevelPlatform extends PlatformDef {
  /** The gap onto this platform is meant to be crossed while gliding. */
  glide?: boolean;
}

export interface LevelHazard {
  id: string;
  y: number;
  w: number;
  h: number;
  variant: 0 | 1 | 2;
  patrol?: { min: number; max: number; speed: number };
  roll?: { min: number; max: number; speed: number; phase: number };
}

export interface LevelHatch {
  x: number;
  y: number;
  w: number;
  h: number;
  zoneX: number;
  zoneY: number;
  zoneR: number;
}

export interface LevelDef {
  id: LevelId;
  backdrop: 'iles-aux-glands' | 'garde-manger' | 'la-ruee';
  room: boolean;
  islands: boolean;
  body: { w: number; h: number };
  spawn: { x: number; y: number };
  platforms: LevelPlatform[];
  statics: Solid[];
  plates: { id: string; x: number; w: number }[];
  crates: { id: string; x: number; y: number; w: number; h: number }[];
  gate: Solid | null;
  featherRect: Rect | null;
  glideFeather: { x: number; y: number } | null;
  acorns: { id: string; x: number; y: number }[];
  babies: { id: string; x: number; y: number; pose: 'idle' | 'sit' }[];
  hazards: LevelHazard[];
  mushrooms: { id: string; x: number; y: number }[];
  winds: { id: string; x: number; y: number; w: number; h: number; push: number }[];
  checkpoints: { id: string; x: number; y: number }[];
  hatch: LevelHatch | null;
  lumi: { x: number; y: number } | null;
  shelf: { x: number; top: number; w: number } | null;
  exit: { x: number; y: number };
  requiresGate: boolean;
  fallY: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface LevelInput extends MoveInput {
  action: boolean;
}

interface CrateBody {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

const COLLECT_R = 1.35;
const MAGNET_R = 2.4;
const BABY_R = 1.15;
const EXIT_R = 1.2;
const FEATHER_R = 1.45;

export function levelGaps(level: LevelDef): { from: string; to: string; gap: number; rise: number; glide: boolean }[] {
  const rows = [];
  for (let i = 0; i < level.platforms.length - 1; i++) {
    const a = level.platforms[i];
    const b = level.platforms[i + 1];
    rows.push({
      from: a.id,
      to: b.id,
      gap: b.x - b.w / 2 - (a.x + a.w / 2),
      rise: b.top + (b.mover?.amp ?? 0) - a.top,
      glide: Boolean(b.glide),
    });
  }
  return rows;
}

function hazardX(hz: LevelHazard, time: number): number {
  if (hz.roll) {
    const span = Math.max(0.01, hz.roll.max - hz.roll.min);
    const period = span / hz.roll.speed;
    const u = ((time + hz.roll.phase) % period + period) % period;
    return hz.roll.min + u * hz.roll.speed;
  }
  const patrol = hz.patrol;
  if (!patrol) return 0;
  const span = patrol.max - patrol.min;
  const period = (span * 2) / patrol.speed;
  const u = ((time % period) + period) % period;
  const dist = patrol.speed * u;
  return dist <= span ? patrol.min + dist : patrol.max - (dist - span);
}

function solidOf(id: string, x: number, y: number, w: number, h: number, dx = 0, dy = 0): Solid {
  return { id, x, y, w, h, dx, dy };
}

export class LevelSim {
  readonly player: Platformer;
  readonly collected = new Set<string>();
  readonly babies = new Set<string>();
  readonly crates: CrateBody[];
  readonly drift = new Map<string, { x: number; y: number }>();
  won = false;
  time = 0;
  invuln = 0;
  bonks = 0;
  still = 0;
  gliding = false;
  gateOpen = false;
  hatchOpen = false;
  lamp = '';
  solids: Solid[] = [];
  hazards: { id: string; x: number; y: number; w: number; h: number; variant: 0 | 1 | 2 }[] = [];
  events: SimEvent[] = [];
  checkpoint = { x: 0, y: 1 };
  private lastX = 0;

  constructor(readonly level: LevelDef) {
    this.player = new Platformer(level.spawn.x, level.spawn.y, level.body.w, level.body.h);
    this.crates = level.crates.map((crate) => ({ ...crate, vx: 0, vy: 0 }));
    this.checkpoint = { x: level.spawn.x, y: level.spawn.y };
    this.lastX = level.spawn.x;
    this.resample(0);
  }

  acornAt(id: string): { x: number; y: number } | null {
    const acorn = this.level.acorns.find((item) => item.id === id);
    if (!acorn) return null;
    const drift = this.drift.get(id) ?? { x: 0, y: 0 };
    return { x: acorn.x + drift.x, y: acorn.y + drift.y };
  }

  platesPressed(): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    for (const plate of this.level.plates) map[plate.id] = this.crates.some((crate) => this.presses(plate, crate));
    return map;
  }

  presses(plate: { x: number; w: number }, crate: CrateBody): boolean {
    return Math.abs(crate.y - crate.h / 2) < 0.14 && Math.abs(crate.x - plate.x) <= plate.w / 2;
  }

  resetCrates(): void {
    this.crates.splice(0, this.crates.length, ...this.level.crates.map((crate) => ({ ...crate, vx: 0, vy: 0 })));
  }

  step(input: LevelInput, dt: number): void {
    this.events = [];
    const step = Math.min(Math.max(dt, 0), 1 / 30);
    this.time += step;
    this.invuln = Math.max(0, this.invuln - step);
    const gateOpen = this.level.gate ? this.level.plates.every((plate) => this.crates.some((crate) => this.presses(plate, crate))) : true;
    this.gateOpen = gateOpen;
    this.resample(step);
    const statics = this.restSolids(gateOpen);
    this.solids = [...this.solids, ...statics];
    for (const crate of this.crates) {
      crate.vx = 0;
      crate.vy = Math.max(-PHYS.maxFall, crate.vy - PHYS.gravity * step);
      const others = this.crates.filter((other) => other !== crate).map((other) => solidOf(other.id, other.x, other.y, other.w, other.h));
      dropCrate(crate, [...statics, ...others], step);
    }
    this.pushCrates(input, statics, step);

    for (const wind of this.level.winds) {
      if (!aabbOverlap(this.player, wind)) continue;
      this.player.vx = Math.max(-9, Math.min(9, this.player.vx + wind.push * step));
    }

    const crateSolids = this.crates.map((crate) => solidOf(crate.id, crate.x, crate.y, crate.w, crate.h));
    const motion = this.player.step(input, [...this.solids, ...crateSolids], step, this.gliding);
    if (motion.jumped) this.events.push(blankEvent('jump', this.player.x, this.player.y));
    if (motion.landed) this.events.push(blankEvent('land', this.player.x, this.player.y));
    separatePlayer(this.player, this.crates);
    this.gateOpen = this.level.gate ? this.level.plates.every((plate) => this.crates.some((crate) => this.presses(plate, crate))) : true;

    this.bounce();
    this.bonk();
    this.markLamp();
    this.pullAcorns(step);
    this.gatherBabies();
    this.takeFeather();
    this.tryHatch(input.action);
    this.tryExit();

    if (Math.abs(this.player.x - this.lastX) < 0.03) this.still += step;
    else this.still = 0;
    this.lastX = this.player.x;

    if (this.player.y < this.level.fallY) {
      this.player.x = this.checkpoint.x;
      this.player.y = this.checkpoint.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.invuln = 0.4;
      this.events.push(blankEvent('respawn', this.player.x, this.player.y, this.lamp || 'start'));
    }
  }

  private resample(dt: number): void {
    const time = this.time;
    this.solids = this.level.platforms.map((def) => {
      const h = def.h ?? 1.55;
      const top = platformTop(def, time);
      const prev = platformTop(def, time - dt);
      return solidOf(def.id, def.x, top - h / 2, def.w, h, 0, top - prev);
    });
    this.hazards = this.level.hazards.map((hz) => ({
      id: hz.id,
      x: hazardX(hz, time),
      y: hz.y,
      w: hz.w,
      h: hz.h,
      variant: hz.variant,
    }));
  }

  private restSolids(gateOpen: boolean): Solid[] {
    const extra = [...this.level.statics];
    if (this.level.gate && !gateOpen) extra.push(this.level.gate);
    if (this.level.hatch && !this.hatchOpen) {
      const hatch = this.level.hatch;
      extra.push(solidOf('hatch', hatch.x, hatch.y, hatch.w, hatch.h));
    }
    return extra;
  }

  private bounce(): void {
    const feet = this.player.y - this.player.h / 2;
    for (const mushroom of this.level.mushrooms) {
      if (Math.abs(this.player.x - mushroom.x) > 0.58) continue;
      if (feet > mushroom.y + 0.35 || feet < mushroom.y - 0.3) continue;
      if (this.player.vy > 0.2) continue;
      this.player.vy = 16.2;
      this.player.grounded = false;
      this.events.push(blankEvent('jump', this.player.x, this.player.y, mushroom.id));
      break;
    }
  }

  private bonk(): void {
    if (this.invuln > 0) return;
    const feet = this.player.y - this.player.h / 2;
    for (const hz of this.hazards) {
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

  private markLamp(): void {
    let best: { id: string; x: number; y: number } | null = null;
    let bestD = 1.15;
    const feet = this.player.y - this.player.h / 2;
    for (const lamp of this.level.checkpoints) {
      const dx = Math.abs(lamp.x - this.player.x);
      const above = feet - lamp.y;
      if (dx > 1.15 || above < -0.45 || above > 2.6) continue;
      if (dx < bestD) {
        bestD = dx;
        best = lamp;
      }
    }
    if (!best) return;
    this.lamp = best.id;
    this.checkpoint = { x: best.x, y: best.y + this.player.h / 2 + 0.02 };
  }

  private pullAcorns(dt: number): void {
    for (const acorn of this.level.acorns) {
      if (this.collected.has(acorn.id)) continue;
      const drift = this.drift.get(acorn.id) ?? { x: 0, y: 0 };
      const x = acorn.x + drift.x;
      const y = acorn.y + drift.y;
      const dx = this.player.x - x;
      const dy = this.player.y - y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      if (dist <= COLLECT_R) {
        this.collected.add(acorn.id);
        this.events.push(blankEvent('collect', x, y, acorn.id));
        continue;
      }
      if (dist < MAGNET_R) {
        const step = Math.min(4.5 * dt, dist - 0.2);
        const cap = 2.3;
        drift.x = Math.max(-cap, Math.min(cap, drift.x + (dx / dist) * step));
        drift.y = Math.max(-cap, Math.min(cap, drift.y + (dy / dist) * step));
        this.drift.set(acorn.id, drift);
      }
    }
  }

  private gatherBabies(): void {
    for (const baby of this.level.babies) {
      if (this.babies.has(baby.id)) continue;
      const dx = baby.x - this.player.x;
      const dy = baby.y + 0.35 - this.player.y;
      if (dx * dx + dy * dy <= BABY_R * BABY_R) {
        this.babies.add(baby.id);
        this.events.push(blankEvent('collect', baby.x, baby.y, baby.id));
      }
    }
  }

  private takeFeather(): void {
    const feather = this.level.glideFeather;
    if (!feather || this.gliding) return;
    const dx = feather.x - this.player.x;
    const dy = feather.y - this.player.y;
    if (dx * dx + dy * dy <= FEATHER_R * FEATHER_R) {
      this.gliding = true;
      this.events.push(blankEvent('collect', feather.x, feather.y, 'plume'));
    }
  }

  private tryHatch(action: boolean): void {
    const hatch = this.level.hatch;
    if (!action || !hatch || this.hatchOpen) return;
    const dx = hatch.zoneX - this.player.x;
    const dy = hatch.zoneY - this.player.y;
    if (dx * dx + dy * dy <= hatch.zoneR * hatch.zoneR) this.hatchOpen = true;
  }

  private tryExit(): void {
    if (this.won) return;
    if (this.level.requiresGate && !this.gateOpen) return;
    const rect = this.level.featherRect;
    const reached = rect
      ? aabbOverlap(this.player, rect)
      : (this.level.exit.x - this.player.x) ** 2 + (this.level.exit.y - this.player.y) ** 2 <= EXIT_R * EXIT_R;
    if (!reached) return;
    this.won = true;
    this.events.push(blankEvent('win', this.player.x, this.player.y));
  }

  private pushCrates(input: MoveInput, statics: readonly Solid[], dt: number): void {
    const dir = input.right && !input.left ? 1 : input.left && !input.right ? -1 : 0;
    if (!dir) return;
    for (const crate of this.crates) {
      const gap = dir > 0
        ? crate.x - crate.w / 2 - (this.player.x + this.player.w / 2)
        : this.player.x - this.player.w / 2 - (crate.x + crate.w / 2);
      if (gap > 0.08 || gap < -0.35) continue;
      if (this.level.plates.some((plate) => this.presses(plate, crate))) continue;
      const overlapY = Math.min(this.player.y + this.player.h / 2, crate.y + crate.h / 2)
        - Math.max(this.player.y - this.player.h / 2, crate.y - crate.h / 2);
      if (overlapY < this.player.h * 0.42) continue;
      const next = { x: crate.x + dir * PHYS.speed * dt, y: crate.y, w: crate.w * 0.92, h: crate.h * 0.72 };
      const others = this.crates.filter((other) => other !== crate);
      const blocked = statics.some((item) => aabbOverlap(next, item)) || others.some((other) => aabbOverlap(next, other));
      if (blocked) continue;
      crate.x += dir * PHYS.speed * dt;
      this.events.push(blankEvent('push', crate.x, crate.y, crate.id));
    }
  }
}

function dropCrate(body: CrateBody, solids: readonly Solid[], dt: number): void {
  const prevY = body.y;
  body.y += body.vy * dt;
  for (const item of solids) {
    if (!aabbOverlap(body, item)) continue;
    const prevFeet = prevY - body.h / 2;
    const top = item.y + item.h / 2;
    const prevHead = prevY + body.h / 2;
    const bottom = item.y - item.h / 2;
    if (body.vy <= 0 && prevFeet >= top - 0.06) {
      body.y = top + body.h / 2;
      body.vy = 0;
    } else if (body.vy > 0 && prevHead <= bottom + 0.05) {
      body.y = bottom - body.h / 2;
      body.vy = 0;
    } else if (body.vy <= 0 && top > body.y - body.h / 2) {
      body.y = top + body.h / 2;
      body.vy = 0;
    }
  }
}

function separatePlayer(player: Platformer, crates: readonly CrateBody[]): void {
  for (const crate of crates) {
    if (!aabbOverlap(player, crate)) continue;
    const feet = player.y - player.h / 2;
    const top = crate.y + crate.h / 2;
    if (feet >= top - 0.2) continue;
    if (player.x < crate.x) player.x = crate.x - crate.w / 2 - player.w / 2 - 0.001;
    else player.x = crate.x + crate.w / 2 + player.w / 2 + 0.001;
  }
}

export interface LevelIntent {
  left: boolean;
  right: boolean;
  jump: boolean;
  action: boolean;
  long: boolean;
}

export function levelIntent(sim: LevelSim): LevelIntent {
  if (sim.level.crates.length > 0) return pantryIntent(sim);
  return courseIntent(sim);
}

function pantryIntent(sim: LevelSim): LevelIntent {
  const plates = sim.level.plates;
  const [plateA, plateB] = plates;
  const crateA = sim.crates.find((crate) => crate.id === 'a');
  const crateB = sim.crates.find((crate) => crate.id === 'b');
  const feather = sim.level.featherRect ?? sim.level.exit;
  const hatch = sim.level.hatch;
  const action = Boolean(
    hatch && !sim.hatchOpen && Math.hypot(hatch.zoneX - sim.player.x, hatch.zoneY - sim.player.y) <= hatch.zoneR,
  );
  const hop = (near: CrateBody): boolean =>
    sim.player.grounded && sim.player.y < 0.78 && sim.player.x > near.x - 1.2 && sim.player.x < near.x - 0.2;
  if (plateA && crateA && !sim.presses(plateA, crateA)) {
    return { left: false, right: true, jump: false, action, long: false };
  }
  if (plateB && crateB && !sim.presses(plateB, crateB)) {
    const jump = crateA ? hop(crateA) : false;
    return { left: false, right: true, jump, action, long: false };
  }
  const jump = (crateB ? hop(crateB) : false) || (sim.player.grounded && sim.level.gate !== null && sim.player.x > sim.level.gate.x && sim.player.y < feather.y - 0.35);
  return {
    left: false,
    right: sim.player.x < feather.x - 0.05,
    jump,
    action,
    long: false,
  };
}

function courseIntent(sim: LevelSim): LevelIntent {
  const secret = sim.level.babies.find((baby) => baby.x < sim.level.spawn.x - 0.6 && !sim.babies.has(baby.id));
  const target = secret ?? sim.level.exit;
  const dx = target.x - sim.player.x;
  const dir: -1 | 0 | 1 = dx > 0.2 ? 1 : dx < -0.2 ? -1 : 0;
  const feet = sim.player.y - sim.player.h / 2;
  const probeDir = dir || 1;
  const probeX = sim.player.x + probeDir * 0.42;
  const groundAhead = sim.solids.some((item) => {
    const top = item.y + item.h / 2;
    return Math.abs(probeX - item.x) <= item.w / 2 + 0.02 && feet - top < 1.7 && feet - top > -0.35;
  });
  const wallBox = {
    x: sim.player.x + probeDir * (sim.player.w / 2 + 0.16),
    y: sim.player.y,
    w: 0.18,
    h: sim.player.h * 0.45,
  };
  const wall = sim.solids.some((item) => item.y + item.h / 2 > feet + 0.3 && aabbOverlap(wallBox, item));
  const here = sim.level.platforms.find((plat) => Math.abs(sim.player.x - plat.x) <= plat.w / 2 + 0.2 && Math.abs(feet - plat.top) < 0.9);
  const onward = here
    ? sim.level.platforms
        .filter((plat) => (probeDir > 0 ? plat.x > here.x + 0.3 : plat.x < here.x - 0.3))
        .sort((a, b) => Math.abs(a.x - here.x) - Math.abs(b.x - here.x))[0]
    : undefined;
  const gap = here && onward
    ? probeDir > 0
      ? onward.x - onward.w / 2 - (here.x + here.w / 2)
      : here.x - here.w / 2 - (onward.x + onward.w / 2)
    : 0;
  const rise = here && onward ? onward.top - here.top : 0;
  const hazard = sim.hazards.some((hz) => {
    const ahead = probeDir > 0 ? hz.x > sim.player.x - 0.2 : hz.x < sim.player.x + 0.2;
    return ahead && Math.abs(hz.x - sim.player.x) < 1.5 && feet < hz.y + hz.h;
  });
  const stuck = sim.still > 0.85 && sim.player.grounded;
  return {
    left: dir < 0,
    right: dir > 0,
    jump: dir !== 0 && (stuck || wall || hazard || !groundAhead),
    action: false,
    long: Boolean(onward?.glide) || gap > 1.45 || rise > 0.75,
  };
}

export function driveLevel(sim: LevelSim, hold: number, dt: number): { input: LevelInput; hold: number } {
  const intent = levelIntent(sim);
  const pantry = sim.level.crates.length > 0;
  let next = hold;
  if (intent.jump && sim.player.grounded) next = pantry ? 0.1 : intent.long ? 0.32 : 0.18;
  else if (!(sim.gliding && !sim.player.grounded)) next = Math.max(0, next - dt);
  return {
    hold: next,
    input: {
      left: intent.left,
      right: intent.right,
      jumpHeld: next > 0 || (sim.gliding && !sim.player.grounded),
      jumpPressed: intent.jump && sim.player.grounded,
      action: intent.action,
    },
  };
}

export function runLevelBot(level: LevelDef, maxSeconds = 90): { won: boolean; time: number; acorns: number; babies: number; x: number; y: number; bonks: number } {
  const sim = new LevelSim(level);
  let hold = 0;
  const dt = 1 / 60;
  for (let t = 0; t <= maxSeconds; t += dt) {
    const driven = driveLevel(sim, hold, dt);
    hold = driven.hold;
    sim.step(driven.input, dt);
    if (sim.won) {
      return { won: true, time: t, acorns: sim.collected.size, babies: sim.babies.size, x: sim.player.x, y: sim.player.y, bonks: sim.bonks };
    }
  }
  return { won: false, time: maxSeconds, acorns: sim.collected.size, babies: sim.babies.size, x: sim.player.x, y: sim.player.y, bonks: sim.bonks };
}
