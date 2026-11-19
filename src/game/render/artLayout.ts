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
  'garde-manger': 0.925,
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
