import { describe, expect, it } from 'vitest';
import { PHYS, Platformer, moveAndCollide } from '../../src/game/logic/physics';
import type { Solid } from '../../src/game/logic/types';

const none = { left: false, right: false, jumpHeld: false, jumpPressed: false };

function floor(top = 0, w = 20): Solid {
  const h = 2;
  return { id: 'floor', x: 0, y: top - h / 2, w, h, dx: 0, dy: 0 };
}

function settle(player: Platformer, solids: Solid[], frames = 30): void {
  for (let i = 0; i < frames; i++) player.step(none, solids, 1 / 60);
}

describe('platformer physics', () => {
  it('lands on a platform and stays grounded', () => {
    const player = new Platformer(0, 3, 0.5, 1);
    const solids = [floor(0)];
    settle(player, solids, 90);
    expect(player.grounded).toBe(true);
    expect(player.y).toBeCloseTo(0.5, 1);
    const y = player.y;
    settle(player, solids, 30);
    expect(player.y).toBeCloseTo(y, 2);
  });

  it('does not tunnel through a floor on a long frame', () => {
    const player = new Platformer(0, 0.85, 0.5, 1);
    player.vy = -PHYS.maxFall;
    const hit = moveAndCollide(player, [floor(0)], 1 / 20);
    expect(player.y).toBeGreaterThan(0.45);
    expect(hit.grounded).toBe(true);
    expect(player.vy).toBe(0);
  });

  it('blocks on a wall', () => {
    const player = new Platformer(-2, 0.5, 0.5, 1);
    const wall: Solid = { id: 'wall', x: 0.2, y: 1, w: 0.4, h: 3, dx: 0, dy: 0 };
    for (let i = 0; i < 60; i++) player.step({ ...none, right: true }, [floor(0), wall], 1 / 60);
    expect(player.x).toBeLessThan(0);
  });

  it('jumps only with ground or coyote time', () => {
    const player = new Platformer(0, 4, 0.5, 1);
    player.step({ ...none, jumpPressed: true, jumpHeld: true }, [floor(0)], 1 / 60);
    expect(player.vy).toBeLessThan(0);
    const grounded = new Platformer(0, 0.5, 0.5, 1);
    settle(grounded, [floor(0)]);
    grounded.step({ ...none, jumpPressed: true, jumpHeld: true }, [floor(0)], 1 / 60);
    expect(grounded.vy).toBeGreaterThan(10);
  });

  it('reaches a readable jump height and a tap hops lower', () => {
    const full = new Platformer(0, 0.5, 0.5, 1);
    settle(full, [floor(0, 30)]);
    let peak = full.y;
    for (let i = 0; i < 80; i++) {
      full.step({ ...none, jumpPressed: i === 0, jumpHeld: true }, [floor(0, 30)], 1 / 60);
      peak = Math.max(peak, full.y);
    }
    const hop = peak - 0.5;
    expect(hop).toBeGreaterThan(2);
    expect(hop).toBeLessThan(2.8);

    const tap = new Platformer(0, 0.5, 0.5, 1);
    settle(tap, [floor(0, 30)]);
    let tapPeak = tap.y;
    for (let i = 0; i < 80; i++) {
      tap.step({ ...none, jumpPressed: i === 0, jumpHeld: i === 0 }, [floor(0, 30)], 1 / 60);
      tapPeak = Math.max(tapPeak, tap.y);
    }
    expect(tapPeak).toBeLessThan(peak - 0.6);
  });

  it('allows a coyote jump just after walking off a ledge', () => {
    const ledge: Solid = { id: 'ledge', x: 0, y: -1, w: 2, h: 2, dx: 0, dy: 0 };
    const player = new Platformer(0.2, 0.5, 0.5, 1);
    settle(player, [ledge]);
    let jumped = false;
    for (let i = 0; i < 12; i++) {
      const res = player.step({ ...none, right: true, jumpPressed: i === 6, jumpHeld: i >= 6 }, [ledge], 1 / 60);
      if (res.jumped) jumped = true;
    }
    expect(jumped).toBe(true);
    expect(player.y).toBeGreaterThan(0.7);
  });

  it('rides a moving platform', () => {
    const player = new Platformer(0, 1.2, 0.5, 1);
    let y = 0;
    for (let i = 0; i < 50; i++) {
      y = Math.sin(i / 10) * 0.4;
      const prev = Math.sin((i - 1) / 10) * 0.4;
      const plat: Solid = { id: 'lift', x: 0, y: y - 0.2, w: 4, h: 0.4, dx: 0, dy: i === 0 ? 0 : y - prev };
      player.step(none, [plat], 1 / 60);
    }
    expect(player.grounded).toBe(true);
    expect(player.y).toBeGreaterThan(y);
  });
});
