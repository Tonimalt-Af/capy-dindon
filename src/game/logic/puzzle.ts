import { aabbOverlap, PHYS, Platformer } from './physics';
import type { MoveInput, Rect, Solid } from './types';

export interface PlateDef {
  id: string;
  x: number;
  w: number;
}

export interface CrateDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PuzzleLayout {
  floorTop: number;
  statics: Solid[];
  gate: Solid;
  plates: PlateDef[];
  crates: CrateDef[];
  feather: Rect;
  spawn: { x: number; y: number };
}

function solid(id: string, x: number, y: number, w: number, h: number): Solid {
  return { id, x, y, w, h, dx: 0, dy: 0 };
}

/** Side-view pantry. Two crates, two floor plates, a gate, then the feather. */
export const PANTRY: PuzzleLayout = {
  floorTop: 0,
  statics: [
    solid('floor', 0, -1.1, 24, 2.2),
    solid('wallL', -9.1, 2.4, 0.7, 7),
    solid('wallR', 9.1, 2.4, 0.7, 7),
    solid('pedestal', 7.15, 0.16, 1.5, 0.32),
  ],
  gate: solid('gate', 5.35, 2.7, 0.42, 5.4),
  plates: [
    { id: 'p1', x: -2.55, w: 1.2 },
    { id: 'p2', x: 3.05, w: 1.2 },
  ],
  crates: [
    { id: 'a', x: -5.05, y: 0.44, w: 0.88, h: 0.88 },
    { id: 'b', x: 0.65, y: 0.44, w: 0.88, h: 0.88 },
  ],
  feather: { x: 7.15, y: 1.15, w: 0.95, h: 1.2 },
  spawn: { x: -7.15, y: 0.62 },
};

interface CrateBody {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

export class PuzzleSim {
  readonly player: Platformer;
  readonly crates: CrateBody[];
  gateOpen = false;
  won = false;
  events: { type: 'jump' | 'land' | 'push' | 'win'; x: number; y: number }[] = [];

  constructor(readonly layout: PuzzleLayout = PANTRY) {
    this.player = new Platformer(layout.spawn.x, layout.spawn.y, 0.48, 1);
    this.crates = layout.crates.map((c) => ({ ...c, vx: 0, vy: 0 }));
  }

  platesPressed(): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    for (const plate of this.layout.plates) map[plate.id] = this.crates.some((c) => this.presses(plate, c));
    return map;
  }

  presses(plate: PlateDef, crate: CrateBody): boolean {
    const bottom = crate.y - crate.h / 2;
    return Math.abs(bottom - this.layout.floorTop) < 0.14 && Math.abs(crate.x - plate.x) <= plate.w / 2;
  }

  step(input: MoveInput, dt: number): void {
    if (this.won) return;
    this.events = [];
    const step = Math.min(Math.max(dt, 0), 1 / 30);
    const gateOpen = this.layout.plates.every((plate) => this.crates.some((c) => this.presses(plate, c)));
    this.gateOpen = gateOpen;
    const statics = gateOpen ? this.layout.statics : [...this.layout.statics, this.layout.gate];

    for (const crate of this.crates) {
      crate.vx = 0;
      crate.vy = Math.max(-PHYS.maxFall, crate.vy - PHYS.gravity * step);
      const others = this.crates.filter((other) => other !== crate).map((other) => solid(other.id, other.x, other.y, other.w, other.h));
      collideBody(crate, [...statics, ...others], step);
    }

    this.pushCrates(input, statics, step);
    const crateSolids = this.crates.map((c) => solid(c.id, c.x, c.y, c.w, c.h));
    const motion = this.player.step(input, [...statics, ...crateSolids], step);
    if (motion.jumped) this.events.push({ type: 'jump', x: this.player.x, y: this.player.y });
    if (motion.landed) this.events.push({ type: 'land', x: this.player.x, y: this.player.y });
    separatePlayer(this.player, this.crates);

    this.gateOpen = this.layout.plates.every((plate) => this.crates.some((c) => this.presses(plate, c)));
    if (this.gateOpen && aabbOverlap(this.player, this.layout.feather)) {
      this.won = true;
      this.events.push({ type: 'win', x: this.player.x, y: this.player.y });
    }
  }

  resetCrates(): void {
    this.crates.splice(0, this.crates.length, ...this.layout.crates.map((c) => ({ ...c, vx: 0, vy: 0 })));
    this.won = false;
    this.gateOpen = false;
  }

  private pushCrates(input: MoveInput, statics: readonly Solid[], dt: number): void {
    const dir = input.right && !input.left ? 1 : input.left && !input.right ? -1 : 0;
    if (!dir) return;
    for (const crate of this.crates) {
      const gap = dir > 0
        ? crate.x - crate.w / 2 - (this.player.x + this.player.w / 2)
        : this.player.x - this.player.w / 2 - (crate.x + crate.w / 2);
      if (gap > 0.08 || gap < -0.35) continue;
      if (this.layout.plates.some((plate) => this.presses(plate, crate))) continue;
      const overlapY = Math.min(this.player.y + this.player.h / 2, crate.y + crate.h / 2)
        - Math.max(this.player.y - this.player.h / 2, crate.y - crate.h / 2);
      if (overlapY < this.player.h * 0.42) continue;
      const next = { x: crate.x + dir * PHYS.speed * dt, y: crate.y, w: crate.w * 0.92, h: crate.h * 0.72 };
      const others = this.crates.filter((other) => other !== crate);
      const blocked = statics.some((s) => aabbOverlap(next, s)) || others.some((o) => aabbOverlap(next, o));
      if (blocked) continue;
      crate.x += dir * PHYS.speed * dt;
      this.events.push({ type: 'push', x: crate.x, y: crate.y });
    }
  }
}

function collideBody(body: CrateBody, solids: readonly Solid[], dt: number): void {
  const prevY = body.y;
  body.vy = Math.max(-PHYS.maxFall, body.vy);
  body.y += body.vy * dt;
  for (const solid of solids) {
    if (!aabbOverlap(body, solid)) continue;
    const prevFeet = prevY - body.h / 2;
    const top = solid.y + solid.h / 2;
    const prevHead = prevY + body.h / 2;
    const bottom = solid.y - solid.h / 2;
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

export function puzzleIntent(sim: PuzzleSim): MoveInput {
  const [plateA, plateB] = sim.layout.plates;
  const crateA = sim.crates.find((c) => c.id === 'a')!;
  const crateB = sim.crates.find((c) => c.id === 'b')!;
  const hop = (near: CrateBody): boolean =>
    sim.player.grounded &&
    sim.player.y < 0.78 &&
    sim.player.x > near.x - 1.2 &&
    sim.player.x < near.x - 0.2;
  if (!sim.presses(plateA, crateA)) {
    return { left: false, right: true, jumpHeld: false, jumpPressed: false };
  }
  if (!sim.presses(plateB, crateB)) {
    const jump = hop(crateA);
    return { left: false, right: true, jumpHeld: jump, jumpPressed: jump };
  }
  const feather = sim.layout.feather;
  const jump = hop(crateB) || (sim.player.grounded && sim.player.x > sim.layout.gate.x && sim.player.y < feather.y - 0.35);
  return {
    left: false,
    right: sim.player.x < feather.x - 0.05,
    jumpHeld: jump,
    jumpPressed: jump,
  };
}

export function runPuzzleBot(maxSeconds = 25): { won: boolean; time: number; gate: boolean; x: number; crates: string } {
  const sim = new PuzzleSim();
  let hold = 0;
  const dt = 1 / 60;
  for (let t = 0; t <= maxSeconds; t += dt) {
    const intent = puzzleIntent(sim);
    if (intent.jumpPressed) hold = 0.1;
    else hold = Math.max(0, hold - dt);
    sim.step({ ...intent, jumpHeld: intent.jumpHeld || hold > 0 }, dt);
    if (sim.won) {
      return { won: true, time: t, gate: sim.gateOpen, x: sim.player.x, crates: crateDump(sim) };
    }
  }
  return { won: false, time: maxSeconds, gate: sim.gateOpen, x: sim.player.x, crates: crateDump(sim) };
}

function crateDump(sim: PuzzleSim): string {
  return sim.crates.map((c) => `${c.id}@${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
}
