import { describe, expect, it } from 'vitest';
import {
  GRASS_FRAC,
  MID_DY,
  midOffsetY,
  planeCenterY,
  planeHeight,
  rowY,
  walkBounds,
} from '../../src/game/render/artLayout';

describe('painted layout', () => {
  it('uses the authored mid offsets', () => {
    expect(MID_DY).toEqual({
      'camp-des-nuages': -220,
      'iles-aux-glands': -220,
      'garde-manger': 0,
      parade: -170,
      eveil: -200,
    });
  });

  it('puts the grass row on the walk surface', () => {
    for (const [scene, grass] of Object.entries(GRASS_FRAC)) {
      const span = 20;
      const groundY = scene === 'garde-manger' ? 0 : 0.08;
      const center = planeCenterY(span, groundY, grass);
      expect(rowY(center, planeHeight(span), grass)).toBeCloseTo(groundY, 5);
    }
  });

  it('moves the mid layer down when dy is positive', () => {
    expect(midOffsetY(18, 0)).toBeCloseTo(0);
    expect(midOffsetY(18, 220)).toBeLessThan(0);
    expect(midOffsetY(18, -220)).toBeGreaterThan(0);
    expect(midOffsetY(18, -220)).toBeCloseTo((220 / 720) * planeHeight(18), 5);
  });

  it('keeps the camp gates on the painted island', () => {
    const bounds = walkBounds('camp-des-nuages', 24);
    for (const x of [-6.8, -3.4, 0.15, 5.5, 8.3]) {
      expect(x).toBeGreaterThan(bounds.left);
      expect(x).toBeLessThan(bounds.right);
    }
  });
});
