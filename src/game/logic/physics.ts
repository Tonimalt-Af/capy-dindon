import type { MoveInput, Rect, SimEvent, Solid } from './types';

export const PHYS = {
  gravity: 36,
  jump: 13.2,
  speed: 6.5,
  coyote: 0.12,
  buffer: 0.12,
  maxFall: 24,
  accel: 70,
  friction: 55,
};

export function aabbOverlap(a: Rect, b: Rect): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

export interface CollisionResult {
  grounded: boolean;
  groundId: string | null;
}

/**
 * Discrete platformer move. X is resolved first, then Y.
 * Solids that the body is already standing on are not treated as walls.
 */
export function moveAndCollide(body: Rect & { vx: number; vy: number }, solids: readonly Solid[], dt: number): CollisionResult {
  const prevX = body.x;
  const prevY = body.y;

  body.vy = Math.max(-PHYS.maxFall, body.vy - PHYS.gravity * dt);
  body.x += body.vx * dt;

  for (const solid of solids) {
    if (!aabbOverlap(body, solid)) continue;
    const feet = prevY - body.h / 2;
    const top = solid.y + solid.h / 2;
    // Low lips are steps, not walls. Snap up instead of sticking.
    if (body.vy > -8 && feet < top - 0.02 && feet >= top - 0.4) {
      body.y = top + body.h / 2;
      body.vy = 0;
      continue;
    }
    if (feet >= top - 0.08) continue;
    if (prevX < solid.x) body.x = solid.x - solid.w / 2 - body.w / 2 - 0.001;
    else body.x = solid.x + solid.w / 2 + body.w / 2 + 0.001;
    body.vx = 0;
  }

  body.y += body.vy * dt;
  let grounded = false;
  let groundId: string | null = null;

  for (const solid of solids) {
    if (!aabbOverlap(body, solid)) continue;
    const prevFeet = prevY - body.h / 2;
    const prevHead = prevY + body.h / 2;
    const top = solid.y + solid.h / 2;
    const bottom = solid.y - solid.h / 2;
    if (body.vy <= 0 && prevFeet >= top - 0.05) {
      body.y = top + body.h / 2;
      body.vy = 0;
      body.x += solid.dx;
      body.y += solid.dy;
      grounded = true;
      groundId = solid.id;
    } else if (body.vy > 0 && prevHead <= bottom + 0.05) {
      body.y = bottom - body.h / 2 - 0.001;
      body.vy = 0;
    } else if (body.vy <= 0) {
      const pen = top - (body.y - body.h / 2);
      if (pen > 0 && pen < body.h * 0.6) {
        body.y = top + body.h / 2;
        body.vy = 0;
        grounded = true;
        groundId = solid.id;
      }
    }
  }

  return { grounded, groundId };
}

export class Platformer {
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = false;
  groundId: string | null = null;
  coyote = 0;
  private buffer = 0;
  private jumpCut = false;
  private wasGrounded = false;

  constructor(
    public x: number,
    public y: number,
    public w = 0.5,
    public h = 1,
  ) {}

  step(input: MoveInput, solids: readonly Solid[], dt: number, glide = false): { jumped: boolean; landed: boolean } {
    if (input.left === input.right) this.vx = approach(this.vx, 0, PHYS.friction * dt);
    else if (input.left) {
      this.vx = approach(this.vx, -PHYS.speed, PHYS.accel * dt);
      this.facing = -1;
    } else {
      this.vx = approach(this.vx, PHYS.speed, PHYS.accel * dt);
      this.facing = 1;
    }

    if (input.jumpPressed) this.buffer = PHYS.buffer;
    else this.buffer = Math.max(0, this.buffer - dt);

    if (this.grounded) this.coyote = PHYS.coyote;
    else this.coyote = Math.max(0, this.coyote - dt);

    let jumped = false;
    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = PHYS.jump;
      this.buffer = 0;
      this.coyote = 0;
      this.grounded = false;
      this.jumpCut = false;
      jumped = true;
    } else if (!input.jumpHeld && this.vy > 0 && !this.jumpCut) {
      this.vy *= 0.48;
      this.jumpCut = true;
    }

    // Held jump after a glide is earned. Cap just above the gravity step so the move itself stays near -3.
    if (glide && input.jumpHeld && !this.grounded && !jumped && this.vy < 1) {
      if (this.vy < -2.45) this.vy = -2.45;
      this.vx = approach(this.vx, this.facing * (PHYS.speed + 1.1), 24 * dt);
    }

    const hit = moveAndCollide(this, solids, dt);
    const landed = hit.grounded && !this.wasGrounded && !jumped;
    this.wasGrounded = hit.grounded;
    this.grounded = hit.grounded;
    this.groundId = hit.groundId;
    return { jumped, landed };
  }
}

function approach(value: number, target: number, delta: number): number {
  if (value < target) return Math.min(target, value + delta);
  return Math.max(target, value - delta);
}

export function blankEvent(type: SimEvent['type'], x: number, y: number, id?: string): SimEvent {
  return id ? { type, x, y, id } : { type, x, y };
}
