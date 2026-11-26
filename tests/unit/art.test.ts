import { describe, expect, it } from 'vitest';
import {
  FRAME,
  GRASS_FRAC,
  LAYER_BOUNDS,
  MID_DY,
  chaseGroundLayout,
  fitFrame,
  imageCover,
  midOffsetY,
  planeCenterY,
  planeHeight,
  rowY,
  walkBounds,
} from '../../src/game/render/artLayout';
import { WALK_BODY, WALK_CYCLE } from '../../src/game/render/capybara';

describe('painted layout', () => {
  it('uses the authored mid offsets', () => {
    expect(MID_DY).toEqual({
      'camp-des-nuages': -220,
      'iles-aux-glands': -220,
      'garde-manger': 0,
      parade: -170,
      eveil: -200,
      'la-ruee': -40,
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

  it('trims layers to pixels that exist', () => {
    for (const layers of Object.values(LAYER_BOUNDS)) {
      for (const rect of Object.values(layers)) {
        expect(rect.x0).toBeGreaterThanOrEqual(0);
        expect(rect.y0).toBeGreaterThanOrEqual(0);
        expect(rect.x1).toBeLessThanOrEqual(1280);
        expect(rect.y1).toBeLessThanOrEqual(720);
        expect(rect.x1 - rect.x0).toBeGreaterThan(80);
        expect(rect.y1 - rect.y0).toBeGreaterThan(40);
      }
    }
  });

  it('frames the camp inside the plate on tablet, phone and desktop', () => {
    const cover = imageCover(24, 0.02, GRASS_FRAC['camp-des-nuages']);
    const totem = -9.2;
    for (const aspect of [1366 / 1024, 844 / 390, 1440 / 900]) {
      const fit = fitFrame({
        aspect,
        want: FRAME['camp-des-nuages'].want,
        lookY: FRAME['camp-des-nuages'].focusY + 0.78,
        focusX: -3.4 + FRAME['camp-des-nuages'].bias,
        cover,
      });
      const halfW = Math.tan((14 * Math.PI) / 180) * fit.distance * aspect;
      expect(fit.x - halfW).toBeLessThanOrEqual(totem);
      expect(fit.x - halfW).toBeGreaterThanOrEqual(cover.left - 0.05);
      expect(fit.x + halfW).toBeLessThanOrEqual(cover.right + 0.05);
      const halfH = Math.tan((14 * Math.PI) / 180) * fit.distance;
      const lookY = FRAME['camp-des-nuages'].focusY + 0.78;
      expect(lookY + halfH).toBeLessThanOrEqual(cover.top + 0.05);
      expect(lookY - halfH).toBeGreaterThanOrEqual(cover.bottom - 0.05);
    }
  });

  it('keeps chase island tips on the mesh instead of slicing the plate', () => {
    for (const width of [6, 6.6, 7.4, 14]) {
      const layout = chaseGroundLayout(width);
      expect(layout.width).toBe(width);
      expect(layout.height).toBeGreaterThan(3);
      expect(layout.height).toBeLessThan(6);
      expect(layout.grassFromTop).toBeGreaterThan(0.05);
      expect(layout.grassFromTop).toBeLessThan(0.2);
    }
    expect(chaseGroundLayout(14).height).toBeCloseTo(chaseGroundLayout(6).height, 5);
  });

  it('bridges the walk frames with idle', () => {
    expect(WALK_CYCLE).toEqual(['walk1', 'idle', 'walk2', 'idle']);
    expect(WALK_BODY.walk2).toBeGreaterThan(WALK_BODY.walk1);
    expect(WALK_BODY.walk2).toBeLessThan(1.2);
  });
});
