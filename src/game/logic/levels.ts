import type { LevelDef, LevelPlatform } from './level';
import { PANTRY } from './puzzle';
import type { Solid } from './types';

function solid(id: string, x: number, y: number, w: number, h: number): Solid {
  return { id, x, y, w, h, dx: 0, dy: 0 };
}

function chain(
  first: LevelPlatform,
  steps: { id: string; gap: number; rise: number; w: number; glide?: boolean; mover?: LevelPlatform['mover'] }[],
): LevelPlatform[] {
  const rows = [first];
  for (const step of steps) {
    const prev = rows[rows.length - 1];
    rows.push({
      id: step.id,
      x: prev.x + prev.w / 2 + step.gap + step.w / 2,
      top: +(prev.top + step.rise).toFixed(3),
      w: step.w,
      glide: step.glide,
      mover: step.mover,
    });
  }
  return rows;
}

function scatter(plats: LevelPlatform[]): { id: string; x: number; y: number }[] {
  const out: { id: string; x: number; y: number }[] = [];
  for (const plat of plats) {
    const spots = plat.w >= 7 ? 3 : plat.w >= 4.4 ? 2 : 1;
    const inset = Math.min(0.75, plat.w * 0.24);
    for (let i = 0; i < spots; i++) {
      const t = spots === 1 ? 0.5 : i / (spots - 1);
      const x = plat.x - plat.w / 2 + inset + t * (plat.w - inset * 2);
      out.push({ id: `a${out.length + 1}`, x: +x.toFixed(2), y: +(plat.top + 1.08).toFixed(2) });
    }
  }
  return out;
}

function byId(plats: LevelPlatform[], id: string): LevelPlatform {
  const found = plats.find((plat) => plat.id === id);
  if (!found) throw new Error(id);
  return found;
}

const cueillettePlats = chain({ id: 'left', x: -8.6, top: 0.12, w: 4.2 }, [
  { id: 'start', gap: 1.1, rise: -0.12, w: 7.4 },
  { id: 's1', gap: 1.05, rise: 0.4, w: 4.4 },
  { id: 's2', gap: 1.1, rise: 0.32, w: 4.2 },
  { id: 's3', gap: 1.1, rise: 0.28, w: 4.4 },
  { id: 'l1', gap: 1.7, rise: 0.8, w: 4.6 },
  { id: 'l2', gap: 1.75, rise: 0.6, w: 4.4 },
  { id: 'pump', gap: 0.7, rise: -1.1, w: 8.2 },
  { id: 'hop', gap: 1.15, rise: 0.5, w: 4.2 },
  { id: 'mv', gap: 1.15, rise: 0.1, w: 4.2, mover: { amp: 0.28, period: 3.8, phase: 0.2 } },
  { id: 'sh', gap: 1.1, rise: -0.12, w: 4.4 },
  { id: 'hi', gap: 1.25, rise: 1.25, w: 4.2 },
  { id: 'b1', gap: 1.1, rise: -0.3, w: 4.4 },
  { id: 'b2', gap: -1.2, rise: 1.25, w: 3.6 },
  { id: 'b3', gap: -1.05, rise: 1.1, w: 3.4 },
  { id: 'exitp', gap: 0.9, rise: -0.45, w: 5.2 },
]);

const startIsle = byId(cueillettePlats, 'start');
const pumpIsle = byId(cueillettePlats, 'pump');
const shIsle = byId(cueillettePlats, 'sh');
const hiIsle = byId(cueillettePlats, 'hi');
const leftIsle = byId(cueillettePlats, 'left');
const l1 = byId(cueillettePlats, 'l1');
const l2 = byId(cueillettePlats, 'l2');
const endIsle = cueillettePlats[cueillettePlats.length - 1];

const rueePlats = chain({ id: 'r0', x: 0, top: 0, w: 6.6 }, [
  { id: 'r1', gap: 1.3, rise: 0.12, w: 6.2 },
  { id: 'r2', gap: 1.3, rise: -0.06, w: 6.0 },
  { id: 'r3', gap: 1.25, rise: 0, w: 6.4 },
  { id: 'r4', gap: 5.2, rise: 0, w: 6.8, glide: true },
  { id: 'r5', gap: 1.35, rise: 0.16, w: 6.2 },
  { id: 'r6', gap: 1.3, rise: 0.1, w: 7.4 },
  { id: 'r7', gap: 1.35, rise: -0.22, w: 6.0 },
  { id: 'r8', gap: 1.3, rise: 0.08, w: 6.2 },
  { id: 'r9', gap: 1.3, rise: 0, w: 7.2 },
]);

const r0 = byId(rueePlats, 'r0');
const r1 = byId(rueePlats, 'r1');
const r3 = byId(rueePlats, 'r3');
const r4 = byId(rueePlats, 'r4');
const r6 = byId(rueePlats, 'r6');
const r8 = byId(rueePlats, 'r8');
const r9 = rueePlats[rueePlats.length - 1];
const rueeEnd = r9.x + r9.w / 2;

function lamps(plats: LevelPlatform[], ids: string[]): { id: string; x: number; y: number }[] {
  return ids.map((id) => {
    const plat = byId(plats, id);
    return { id, x: +(plat.x - plat.w / 2 + 0.7).toFixed(2), y: plat.top };
  });
}

const shelf = { x: 2.4, top: 2.42, w: 3.8 };

export const CUEILLETTE: LevelDef = {
  id: 'glands',
  backdrop: 'iles-aux-glands',
  room: false,
  islands: true,
  body: { w: 0.5, h: 1 },
  spawn: { x: +(startIsle.x - 1.3).toFixed(2), y: startIsle.top + 0.55 },
  platforms: cueillettePlats,
  statics: [],
  plates: [],
  crates: [],
  gate: null,
  featherRect: null,
  glideFeather: null,
  acorns: scatter(cueillettePlats),
  babies: [
    { id: 'b-left', x: leftIsle.x, y: leftIsle.top + 0.02, pose: 'sit' },
    { id: 'b-path', x: +(pumpIsle.x + 2.4).toFixed(2), y: pumpIsle.top + 0.02, pose: 'idle' },
    { id: 'b-high', x: hiIsle.x, y: hiIsle.top + 0.02, pose: 'sit' },
  ],
  hazards: [
    {
      id: 'pump',
      y: +(pumpIsle.top + 0.36).toFixed(2),
      w: 0.72,
      h: 0.68,
      variant: 0,
      patrol: { min: pumpIsle.x - 2.3, max: pumpIsle.x + 2.2, speed: 1.5 },
    },
  ],
  mushrooms: [{ id: 'shroom', x: +(shIsle.x + 0.4).toFixed(2), y: shIsle.top }],
  winds: [
    {
      id: 'breeze',
      x: (l1.x + l1.w / 2 + (l2.x - l2.w / 2)) / 2,
      y: l1.top + 1.1,
      w: 2.2,
      h: 2.2,
      push: 12,
    },
  ],
  checkpoints: lamps(cueillettePlats, ['start', 'pump', 'sh', 'b1']),
  hatch: null,
  lumi: null,
  shelf: null,
  exit: { x: +(endIsle.x + endIsle.w / 2 - 0.7).toFixed(2), y: endIsle.top + 1.05 },
  requiresGate: false,
  fallY: -6,
  bounds: {
    minX: leftIsle.x - leftIsle.w / 2 - 2,
    maxX: endIsle.x + endIsle.w / 2 + 3,
    minY: -2.2,
    maxY: Math.max(...cueillettePlats.map((plat) => plat.top)) + 5,
  },
};

const pantryAcorns: { id: string; x: number; y: number }[] = [];
for (let x = -6.5; x <= 6.5; x += 0.72) {
  if (Math.abs(x - PANTRY.gate.x) < 0.5) continue;
  pantryAcorns.push({ id: `a${pantryAcorns.length + 1}`, x: +x.toFixed(2), y: 1.12 });
}
for (const x of [1.15, 2.15, 3.15, 4.05]) {
  pantryAcorns.push({ id: `a${pantryAcorns.length + 1}`, x, y: shelf.top + 0.7 });
}

export const GARDE_MANGER: LevelDef = {
  id: 'pantry',
  backdrop: 'garde-manger',
  room: true,
  islands: false,
  body: { w: 0.48, h: 1 },
  spawn: { ...PANTRY.spawn },
  platforms: [],
  statics: [...PANTRY.statics, solid('shelf', shelf.x, shelf.top - 0.14, shelf.w, 0.28)],
  plates: PANTRY.plates.map((plate) => ({ ...plate })),
  crates: PANTRY.crates.map((crate) => ({ ...crate })),
  gate: { ...PANTRY.gate },
  featherRect: { ...PANTRY.feather },
  glideFeather: null,
  acorns: pantryAcorns,
  babies: [
    { id: 'b-path', x: 1.8, y: 0.02, pose: 'idle' },
    { id: 'b-hatch', x: -8.25, y: 0.02, pose: 'sit' },
    { id: 'b-shelf', x: 3.45, y: shelf.top + 0.02, pose: 'sit' },
  ],
  hazards: [],
  mushrooms: [],
  winds: [],
  checkpoints: [
    { id: 'door', x: PANTRY.spawn.x, y: 0 },
    { id: 'gate', x: 4.15, y: 0 },
  ],
  hatch: { x: -7.55, y: 0.85, w: 0.36, h: 1.7, zoneX: -6.85, zoneY: 0.7, zoneR: 1.15 },
  lumi: { x: -6.85, y: 1.45 },
  shelf,
  exit: { x: PANTRY.feather.x, y: PANTRY.feather.y },
  requiresGate: true,
  fallY: -5,
  bounds: { minX: -10, maxX: 10, minY: -1.4, maxY: 6.2 },
};

export const RUEE: LevelDef = {
  id: 'ruee',
  backdrop: 'la-ruee',
  room: false,
  islands: true,
  body: { w: 0.5, h: 1 },
  spawn: { x: r0.x - 1.6, y: r0.top + 0.55 },
  platforms: rueePlats,
  statics: [],
  plates: [],
  crates: [],
  gate: null,
  featherRect: null,
  glideFeather: { x: +(r3.x - 0.8).toFixed(2), y: r3.top + 1.05 },
  acorns: scatter(rueePlats),
  babies: [
    { id: 'b-path', x: r1.x, y: r1.top + 0.02, pose: 'idle' },
    { id: 'b-lip', x: +(r4.x - r4.w / 2 + 0.7).toFixed(2), y: r4.top + 0.02, pose: 'sit' },
    { id: 'b-hop', x: r8.x, y: r8.top + 1.35, pose: 'sit' },
  ],
  hazards: [0, 1, 2, 3, 4].map((index) => ({
    id: `herd-${index}`,
    y: 0.34,
    w: 0.74,
    h: 0.62,
    variant: (index % 3) as 0 | 1 | 2,
    roll: {
      min: -6,
      max: rueeEnd + 4,
      speed: 4.35,
      phase: (index * (rueeEnd + 10)) / 4.35 / 5,
    },
  })),
  mushrooms: [{ id: 'spring', x: +(r6.x - 2.1).toFixed(2), y: r6.top }],
  winds: [
    {
      id: 'rush',
      x: (r3.x + r3.w / 2 + (r4.x - r4.w / 2)) / 2,
      y: r3.top + 1.3,
      w: 5.4,
      h: 2.6,
      push: 16,
    },
  ],
  checkpoints: lamps(rueePlats, ['r0', 'r2', 'r3', 'r5', 'r7', 'r9']),
  hatch: null,
  lumi: null,
  shelf: null,
  exit: { x: +(r9.x + r9.w / 2 - 0.8).toFixed(2), y: r9.top + 1.05 },
  requiresGate: false,
  fallY: -6,
  bounds: {
    minX: r0.x - r0.w / 2 - 2,
    maxX: rueeEnd + 3,
    minY: -2.2,
    maxY: 5.5,
  },
};

export const LEVELS = {
  glands: CUEILLETTE,
  pantry: GARDE_MANGER,
  ruee: RUEE,
} as const;
