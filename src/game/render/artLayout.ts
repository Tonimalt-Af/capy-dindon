export const ART_W = 1280;
export const ART_H = 720;

export type ArtScene = 'camp-des-nuages' | 'iles-aux-glands' | 'garde-manger' | 'parade' | 'eveil';

/** Positive dy moves the mid layer down, in source pixels. */
export const MID_DY: Record<ArtScene, number> = {
  'camp-des-nuages': -220,
  'iles-aux-glands': -220,
  'garde-manger': 0,
  parade: -170,
  eveil: -200,
};

/**
 * Row that should meet a character's feet.
 * Lower than the foliage top: the lawn, the near pantry floor, or the stage grass.
 */
export const GRASS_FRAC: Record<ArtScene, number> = {
  'camp-des-nuages': 0.46,
  'iles-aux-glands': 0.51,
  'garde-manger': 0.97,
  parade: 0.5,
  eveil: 0.45,
};

/** Opaque walk surface, as fractions of the image width. */
export const WALK_FRAC: Record<ArtScene, { left: number; right: number }> = {
  'camp-des-nuages': { left: 0.059, right: 0.923 },
  'iles-aux-glands': { left: 0.116, right: 0.875 },
  'garde-manger': { left: 0, right: 1 },
  parade: { left: 0.067, right: 0.933 },
  eveil: { left: 0.06, right: 0.923 },
};

export function planeHeight(span: number): number {
  return span * (ART_H / ART_W);
}

/** World y of a texture row. `fracFromTop` is 0 at the top of the image. */
export function rowY(centerY: number, height: number, fracFromTop: number): number {
  return centerY + height * (0.5 - fracFromTop);
}

/** Plane center so the grass row sits on `groundY`. */
export function planeCenterY(span: number, groundY: number, grassFrac: number): number {
  return groundY - planeHeight(span) * (0.5 - grassFrac);
}

/** World y offset for a mid layer. Positive `dy` moves it down. */
export function midOffsetY(span: number, dy: number): number {
  return -(dy / ART_H) * planeHeight(span);
}

export function walkBounds(scene: ArtScene, span: number, centerX = 0): { left: number; right: number; center: number; width: number } {
  const walk = WALK_FRAC[scene];
  const left = centerX - span / 2 + walk.left * span;
  const right = centerX - span / 2 + walk.right * span;
  return { left, right, center: (left + right) / 2, width: right - left };
}

export function groundSpanFor(scene: ArtScene, walkWidth: number): number {
  const walk = WALK_FRAC[scene];
  return walkWidth / (walk.right - walk.left);
}

export interface PxRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Opaque-ish content of each trimmed layer, in source pixels. Sky stays full-frame. */
export const LAYER_BOUNDS: Record<ArtScene, Record<'far' | 'ground' | 'mid', PxRect>> = {
  'camp-des-nuages': {
    far: { x0: 10, y0: 29, x1: 1263, y1: 482 },
    ground: { x0: 8, y0: 233, x1: 1276, y1: 522 },
    mid: { x0: 60, y0: 174, x1: 1278, y1: 616 },
  },
  'iles-aux-glands': {
    far: { x0: 25, y0: 20, x1: 1264, y1: 486 },
    ground: { x0: 8, y0: 235, x1: 1277, y1: 538 },
    mid: { x0: 5, y0: 235, x1: 1280, y1: 612 },
  },
  'garde-manger': {
    far: { x0: 275, y0: 31, x1: 1218, y1: 422 },
    ground: { x0: 0, y0: 487, x1: 1280, y1: 680 },
    mid: { x0: 3, y0: 0, x1: 472, y1: 720 },
  },
  parade: {
    far: { x0: 12, y0: 28, x1: 1264, y1: 377 },
    ground: { x0: 6, y0: 292, x1: 1280, y1: 592 },
    mid: { x0: 4, y0: 282, x1: 1269, y1: 594 },
  },
  eveil: {
    far: { x0: 7, y0: 4, x1: 1275, y1: 493 },
    ground: { x0: 8, y0: 230, x1: 1276, y1: 554 },
    mid: { x0: 17, y0: 216, x1: 1268, y1: 614 },
  },
};

/** World width the composition wants on screen, before the painted frame clamps it. */
export const FRAME: Record<ArtScene, { want: number; focusY: number; bias: number }> = {
  'camp-des-nuages': { want: 13.2, focusY: 0.4, bias: -0.75 },
  'iles-aux-glands': { want: 12.6, focusY: 0.72, bias: 0 },
  'garde-manger': { want: 12.4, focusY: 1.45, bias: 0 },
  parade: { want: 13.4, focusY: 0.62, bias: 0 },
  eveil: { want: 13.6, focusY: 0.32, bias: -0.35 },
};

export interface FrameCover {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const HALF_FOV = Math.tan((14 * Math.PI) / 180);

/** Distance and camera x that keep a painted frame covering the view. */
export function fitFrame(opts: {
  aspect: number;
  want: number;
  lookY: number;
  focusX: number;
  cover: FrameCover | null;
  minDistance?: number;
  maxDistance?: number;
}): { distance: number; x: number } {
  const aspect = Math.max(0.9, opts.aspect);
  let distance = opts.want / (2 * HALF_FOV * aspect);
  distance = Math.max(opts.minDistance ?? 9.4, Math.min(opts.maxDistance ?? 20, distance));
  if (!opts.cover) return { distance, x: opts.focusX };
  const margin = 0.24;
  const roomAbove = opts.cover.top - margin - opts.lookY;
  const roomBelow = opts.lookY - (opts.cover.bottom + margin);
  const maxHalf = Math.min(roomAbove, roomBelow);
  if (maxHalf > 0.7) distance = Math.min(distance, maxHalf / HALF_FOV);
  const halfW = HALF_FOV * distance * aspect;
  const minX = opts.cover.left + halfW + 0.08;
  const maxX = opts.cover.right - halfW - 0.08;
  const x = minX > maxX ? (opts.cover.left + opts.cover.right) / 2 : Math.min(maxX, Math.max(minX, opts.focusX));
  return { distance, x };
}

/** World rectangle of a full scene plate whose grass row sits on `groundY`. */
export function imageCover(span: number, groundY: number, grassFrac: number, centerX = 0): FrameCover {
  const height = planeHeight(span);
  const centerY = planeCenterY(span, groundY, grassFrac);
  return {
    left: centerX - span / 2,
    right: centerX + span / 2,
    top: centerY + height / 2,
    bottom: centerY - height / 2,
  };
}
