import { describe, expect, it } from 'vitest';
import { ACORN_LEVEL, AcornSim, gapReport, runAcornBot } from '../../src/game/logic/acorn';

describe('acorn level', () => {
  it('keeps every gap and rise inside a comfortable jump', () => {
    for (const row of gapReport(ACORN_LEVEL)) {
      expect(row.gap, `${row.from}->${row.to}`).toBeLessThan(2.15);
      expect(row.gap).toBeGreaterThan(-0.2);
      expect(row.rise, `${row.from}->${row.to}`).toBeLessThan(2.1);
    }
    expect(ACORN_LEVEL.acorns).toHaveLength(8);
  });

  it('is cleared by the practice bot', () => {
    const result = runAcornBot(36);
    expect(result, JSON.stringify(result)).toMatchObject({ won: true, collected: 8 });
    expect(result.time).toBeLessThan(32);
  });

  it('respawns without deleting acorns', () => {
    const sim = new AcornSim();
    sim.collected.add('a1');
    sim.player.y = -8;
    sim.step({ left: false, right: false, jumpHeld: false, jumpPressed: false }, 1 / 60);
    expect(sim.collected.has('a1')).toBe(true);
    expect(sim.player.y).toBeGreaterThan(0);
  });
});
