import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/game/logic/levels';
import { LevelSim, levelGaps, runLevelBot } from '../../src/game/logic/level';
import { Platformer } from '../../src/game/logic/physics';

describe('level format', () => {
  it('gives each course a handful of glands and three babies', () => {
    for (const level of Object.values(LEVELS)) {
      expect(level.acorns.length).toBeGreaterThanOrEqual(20);
      expect(level.acorns.length).toBeLessThanOrEqual(30);
      expect(level.babies).toHaveLength(3);
      expect(new Set(level.acorns.map((acorn) => acorn.id)).size).toBe(level.acorns.length);
    }
  });

  it('keeps ordinary gaps jumpable and marks the one glide', () => {
    for (const level of [LEVELS.glands, LEVELS.ruee]) {
      const glides = levelGaps(level).filter((row) => row.glide);
      expect(glides).toHaveLength(level.id === 'ruee' ? 1 : 0);
      for (const row of levelGaps(level)) {
        if (row.glide) expect(row.gap).toBeGreaterThan(4.2);
        else expect(row.gap).toBeLessThan(2.15);
        expect(row.rise).toBeLessThan(2.1);
      }
    }
  });

  it('hides one Cueillette baby left of the start', () => {
    const hidden = LEVELS.glands.babies.filter((baby) => baby.x < LEVELS.glands.spawn.x - 0.6);
    expect(hidden).toHaveLength(1);
  });
});

describe('level traversal', () => {
  it('finishes the extended harvest', () => {
    const result = runLevelBot(LEVELS.glands, 90);
    expect(result, JSON.stringify(result)).toMatchObject({ won: true });
    expect(result.time).toBeLessThan(90);
  });

  it('finishes the pantry without a new button', () => {
    const result = runLevelBot(LEVELS.pantry, 30);
    expect(result, JSON.stringify(result)).toMatchObject({ won: true });
  });

  it('finishes the pumpkin chase', () => {
    const result = runLevelBot(LEVELS.ruee, 80);
    expect(result, JSON.stringify(result)).toMatchObject({ won: true });
  });

  it('knocks back without dropping glands, and a fall returns to the lantern', () => {
    const sim = new LevelSim(LEVELS.glands);
    sim.collected.add('a1');
    const hazard = sim.hazards[0];
    sim.player.x = hazard.x;
    sim.player.y = hazard.y;
    sim.step({ left: false, right: false, jumpHeld: false, jumpPressed: false, action: false }, 1 / 60);
    expect(sim.collected.has('a1')).toBe(true);
    expect(sim.bonks).toBe(1);
    expect(sim.won).toBe(false);
    sim.player.y = -8;
    sim.step({ left: false, right: false, jumpHeld: false, jumpPressed: false, action: false }, 1 / 60);
    expect(sim.player.x).toBeCloseTo(sim.checkpoint.x, 2);
    expect(sim.collected.has('a1')).toBe(true);
  });

  it('opens the hatch with Action and keeps the glide from killing a rise', () => {
    const pantry = new LevelSim(LEVELS.pantry);
    pantry.player.x = LEVELS.pantry.hatch!.zoneX;
    pantry.player.y = LEVELS.pantry.hatch!.zoneY;
    pantry.step({ left: false, right: false, jumpHeld: false, jumpPressed: false, action: true }, 1 / 60);
    expect(pantry.hatchOpen).toBe(true);
    pantry.player.x = -8.25;
    pantry.player.y = 0.6;
    pantry.step({ left: false, right: false, jumpHeld: false, jumpPressed: false, action: false }, 1 / 60);
    expect(pantry.babies.has('b-hatch')).toBe(true);

    const capy = new Platformer(0, 6, 0.5, 1);
    capy.grounded = false;
    capy.vy = -8;
    for (let i = 0; i < 20; i++) {
      capy.step({ left: false, right: true, jumpHeld: true, jumpPressed: false }, [], 1 / 60, true);
    }
    expect(capy.vy).toBeGreaterThan(-4);
    expect(capy.y).toBeGreaterThan(4);
  });
});
