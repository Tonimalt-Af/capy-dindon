import { describe, expect, it } from 'vitest';
import { PuzzleSim, runPuzzleBot } from '../../src/game/logic/puzzle';

const idle = { left: false, right: false, jumpHeld: false, jumpPressed: false };

describe('pantry puzzle', () => {
  it('opens the gate only when each plate holds a crate', () => {
    const sim = new PuzzleSim();
    sim.step(idle, 1 / 60);
    expect(sim.gateOpen).toBe(false);
    const [plateA, plateB] = sim.layout.plates;
    sim.crates[0].x = plateA.x;
    sim.crates[0].y = 0.44;
    sim.crates[1].x = plateB.x;
    sim.crates[1].y = 0.44;
    sim.step(idle, 1 / 60);
    expect(sim.gateOpen).toBe(true);
  });

  it('does not award the feather while the gate is shut', () => {
    const sim = new PuzzleSim();
    sim.player.x = sim.layout.feather.x;
    sim.player.y = sim.layout.feather.y;
    sim.step(idle, 1 / 60);
    expect(sim.won).toBe(false);
  });

  it('pushes a crate, grips it on a plate, and stops it on the gate', () => {
    const sim = new PuzzleSim();
    const start = sim.crates[0].x;
    for (let i = 0; i < 70; i++) sim.step({ ...idle, right: true }, 1 / 60);
    expect(sim.crates[0].x).toBeGreaterThan(start + 1);
    sim.crates[0].x = sim.layout.plates[0].x;
    sim.crates[0].y = 0.44;
    for (let i = 0; i < 30; i++) sim.step({ ...idle, right: true }, 1 / 60);
    expect(sim.crates[0].x).toBeCloseTo(sim.layout.plates[0].x, 1);
    sim.crates[0].x = sim.layout.gate.x - 0.75;
    const parked = sim.crates[0].x;
    sim.player.x = parked - 0.8;
    for (let i = 0; i < 40; i++) sim.step({ ...idle, right: true }, 1 / 60);
    expect(sim.crates[0].x).toBeLessThan(sim.layout.gate.x - 0.15);
    expect(sim.crates[0].x).toBeLessThan(parked + 0.4);
  });

  it('is solved by the practice bot', () => {
    const result = runPuzzleBot(24);
    expect(result, JSON.stringify(result)).toMatchObject({ won: true, gate: true });
  });

  it('puts the crates back when asked', () => {
    const sim = new PuzzleSim();
    sim.crates[0].x = 0;
    sim.resetCrates();
    expect(sim.crates[0].x).toBe(sim.layout.crates[0].x);
  });
});
