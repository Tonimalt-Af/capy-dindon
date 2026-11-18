import * as THREE from 'three';
import {
  barkTexture,
  basic,
  cliffMap,
  featherMaterial,
  GEO,
  grassMap,
  leafTexture,
  plankTexture,
  toon,
  waterMaterial,
  woodTexture,
} from './materials';

export type SkyTheme = 'meadow' | 'orchard' | 'camp' | 'party' | 'golden';

function mesh(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scale: [number, number, number],
  shadow = false,
): THREE.Mesh {
  const item = new THREE.Mesh(geo, material);
  item.position.set(x, y, z);
  item.scale.set(scale[0], scale[1], scale[2]);
  item.castShadow = shadow;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

export function island(width: number, depth = 2.5, thick = 1.35): THREE.Group {
  const group = new THREE.Group();
  const cliff = toon('#c4844a').clone();
  cliff.map = cliffMap(Math.max(1, width / 3), 1);
  mesh(GEO.box, cliff, group, 0, -thick / 2 - 0.05, 0, [width, thick, depth], true);
  const grass = toon('#3ea84a').clone();
  grass.map = grassMap(Math.max(1, width / 1.7), Math.max(1, depth / 1.7));
  mesh(GEO.box, grass, group, 0, 0.02, 0, [width * 1.03, 0.2, depth * 1.05], false);
  mesh(GEO.box, toon('#8fe06a'), group, 0, 0.1, 0.02, [width * 0.9, 0.06, depth * 0.82], false);
  const stones = Math.max(2, Math.round(width / 3));
  for (let i = 0; i < stones; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const rock = mesh(
      GEO.sphereSm,
      toon(i % 2 ? '#a86b3c' : '#d7a36a'),
      group,
      -width * 0.42 + (i * width * 0.84) / stones,
      -thick * 0.72,
      side * depth * 0.22,
      [0.16 + (i % 3) * 0.05, 0.22 + (i % 2) * 0.1, 0.14],
      false,
    );
    rock.rotation.z = (i - 2) * 0.2;
  }
  return group;
}

export function tree(scale = 1, fruit: string | null = null): THREE.Group {
  const group = new THREE.Group();
  group.userData.role = 'sway';
  group.userData.amp = 0.035;
  const bark = toon('#8d5430').clone();
  bark.map = barkTexture();
  const trunk = mesh(GEO.taper, bark, group, 0, 0.42 * scale, 0, [0.13 * scale, 0.84 * scale, 0.13 * scale], true);
  trunk.castShadow = true;
  const canopy: [string, number, number, number, number][] = [
    ['#2f9a3c', 0, 1.05, 0, 0.48],
    ['#57c84e', 0.22, 0.92, 0.08, 0.32],
    ['#1f7a32', -0.2, 0.88, -0.06, 0.3],
    ['#8ee56a', 0.08, 1.22, 0.04, 0.26],
  ];
  for (const [color, x, y, z, r] of canopy) {
    mesh(GEO.sphere, toon(color), group, x * scale, y * scale, z * scale, [r * scale, r * 0.86 * scale, r * 0.9 * scale], true);
  }
  const leafMat = toon('#3cb14a').clone();
  leafMat.map = leafTexture();
  leafMat.alphaTest = 0.4;
  leafMat.side = THREE.DoubleSide;
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(GEO.plane, leafMat);
    leaf.scale.setScalar(0.28 * scale);
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.34 * scale, (0.9 + (i % 2) * 0.2) * scale, Math.sin(a) * 0.2 * scale);
    leaf.rotation.z = a;
    group.add(leaf);
  }
  if (fruit) {
    for (let i = 0; i < 3; i++) {
      mesh(GEO.sphereSm, toon(fruit, fruit, 0.35), group, (-0.12 + i * 0.12) * scale, 0.78 * scale, 0.22 * scale, [0.06 * scale, 0.07 * scale, 0.06 * scale], false);
    }
  }
  return group;
}

export function bush(scale = 1): THREE.Group {
  const group = new THREE.Group();
  group.userData.role = 'sway';
  group.userData.amp = 0.05;
  mesh(GEO.sphere, toon('#2f9a3c'), group, 0, 0.18 * scale, 0, [0.28 * scale, 0.18 * scale, 0.22 * scale], true);
  mesh(GEO.sphere, toon('#7ed86a'), group, 0.12 * scale, 0.2 * scale, 0.06 * scale, [0.16 * scale, 0.12 * scale, 0.14 * scale], false);
  return group;
}

export function rock(scale = 1): THREE.Mesh {
  const item = mesh(GEO.sphereSm, toon('#c4b4a4'), new THREE.Group(), 0, 0.08 * scale, 0, [0.16 * scale, 0.1 * scale, 0.14 * scale], true);
  item.rotation.z = 0.2;
  return item;
}

export function flower(color: string): THREE.Group {
  const group = new THREE.Group();
  group.userData.role = 'sway';
  group.userData.amp = 0.12;
  mesh(GEO.cyl, toon('#2f8a38'), group, 0, 0.14, 0, [0.018, 0.28, 0.018], false);
  mesh(GEO.plane, toon('#3cb14a'), group, 0, 0.1, 0, [0.08, 0.1, 1], false).rotation.y = 0.6;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    mesh(GEO.sphereSm, toon(color), group, Math.cos(a) * 0.07, 0.3, Math.sin(a) * 0.07, [0.055, 0.035, 0.05], false);
  }
  mesh(GEO.sphereSm, toon('#ffe08a', '#fff1b0', 0.4), group, 0, 0.3, 0, [0.04, 0.04, 0.04], false);
  return group;
}

export function reed(): THREE.Group {
  const group = new THREE.Group();
  group.userData.role = 'sway';
  group.userData.amp = 0.16;
  mesh(GEO.cyl, toon('#2f8a38'), group, 0, 0.28, 0, [0.015, 0.56, 0.015], false);
  const tip = mesh(GEO.sphere, toon('#8d6a32'), group, 0.02, 0.58, 0, [0.03, 0.08, 0.02], false);
  tip.rotation.z = 0.4;
  return group;
}

export function cloud(): THREE.Group {
  const group = new THREE.Group();
  group.userData.role = 'cloud';
  const mat = toon('#fffaf6');
  mesh(GEO.sphere, mat, group, 0, 0, 0, [0.85, 0.42, 0.48], false);
  mesh(GEO.sphere, mat, group, 0.55, 0.08, 0.04, [0.52, 0.34, 0.38], false);
  mesh(GEO.sphere, mat, group, -0.5, 0.04, 0.02, [0.46, 0.3, 0.34], false);
  mesh(GEO.sphere, toon('#fff1e0'), group, 0.15, 0.16, 0.12, [0.36, 0.22, 0.26], false);
  return group;
}

export function planet(radius: number, tint: string): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.sphere, toon(tint), group, 0, 0, 0, [radius, radius, radius], false);
  mesh(GEO.sphereSm, toon('#7dce6a'), group, radius * 0.25, radius * 0.45, radius * 0.55, [radius * 0.42, radius * 0.22, radius * 0.36], false);
  mesh(GEO.sphereSm, toon('#e7c07a'), group, -radius * 0.35, radius * 0.05, radius * 0.62, [radius * 0.28, radius * 0.16, radius * 0.22], false);
  const band = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.35, radius * 0.05, 6, 24), toon('#fff1c9'));
  band.rotation.x = Math.PI / 2.4;
  group.add(band);
  const mini = tree(radius * 0.28);
  mini.position.set(radius * 0.05, radius * 0.82, radius * 0.15);
  group.add(mini);
  return group;
}

export function acornModel(): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.sphere, toon('#8a4e28'), group, 0, 0, 0, [0.13, 0.18, 0.13], false);
  mesh(GEO.sphere, toon('#f0c14a', '#ffe08a', 0.85), group, 0, 0.12, 0, [0.15, 0.1, 0.15], false);
  mesh(GEO.sphereSm, toon('#fff6d0', '#fff1b0', 1.3), group, 0.04, 0.2, 0.05, [0.035, 0.04, 0.035], false);
  const shine = mesh(GEO.sphereSm, basic('#fffaf0'), group, -0.04, 0.04, 0.08, [0.03, 0.05, 0.02], false);
  shine.material = basic('#fffaf0');
  return group;
}

export function crateModel(): THREE.Group {
  const group = new THREE.Group();
  const wood = toon('#e0a868').clone();
  wood.map = woodTexture();
  const box = mesh(GEO.box, wood, group, 0, 0, 0, [0.9, 0.9, 0.9], true);
  box.castShadow = true;
  mesh(GEO.box, toon('#8d5430'), group, 0, 0, 0.47, [0.72, 0.07, 0.04], false);
  mesh(GEO.box, toon('#8d5430'), group, 0, 0, 0.47, [0.07, 0.72, 0.04], false);
  mesh(GEO.box, toon('#f2c14e'), group, 0, 0.08, 0.48, [0.16, 0.16, 0.02], false);
  return group;
}

const GATE: Record<string, { stone: string; glow: string; cloth: string }> = {
  glands: { stone: '#e7c48a', glow: '#f0c14a', cloth: '#8fd48a' },
  pantry: { stone: '#cbb6e8', glow: '#efe6ff', cloth: '#8a6ad4' },
  parade: { stone: '#ffd0e4', glow: '#ff8fb8', cloth: '#ff7a45' },
};

export function archway(done: boolean, kind: 'glands' | 'pantry' | 'parade' = 'glands'): THREE.Group {
  const group = new THREE.Group();
  const theme = GATE[kind];
  const stone = done ? '#ffe08a' : theme.stone;
  mesh(GEO.box, toon(stone), group, -0.58, 0.75, 0, [0.24, 1.5, 0.32], true);
  mesh(GEO.box, toon(stone), group, 0.58, 0.75, 0, [0.24, 1.5, 0.32], true);
  mesh(GEO.box, toon(done ? '#fff1c4' : '#f7e6d0'), group, -0.58, 0.2, 0.12, [0.28, 0.16, 0.16], false);
  mesh(GEO.box, toon(done ? '#fff1c4' : '#f7e6d0'), group, 0.58, 0.2, 0.12, [0.28, 0.16, 0.16], false);
  const ring = new THREE.Mesh(GEO.torus, toon(done ? '#ffd15c' : theme.glow, done ? '#fff1b0' : '#000', done ? 0.55 : 0.15));
  ring.scale.set(0.66, 0.72, 0.66);
  ring.position.y = 1.45;
  ring.rotation.y = Math.PI / 2;
  group.add(ring);
  const curtain = new THREE.Mesh(GEO.plane, basic(done ? '#ffe9a8' : theme.cloth, 0.55));
  curtain.scale.set(0.72, 1.05, 1);
  curtain.position.y = 0.72;
  group.add(curtain);
  const emblem = kind === 'pantry' ? featherModel() : kind === 'parade' ? starModel() : acornModel();
  emblem.position.set(0, 2.05, 0.05);
  emblem.scale.setScalar(kind === 'glands' ? 1.4 : 0.7);
  group.add(emblem);
  const flagL = bannerFlag(theme.cloth);
  flagL.position.set(-0.58, 1.7, 0);
  const flagR = bannerFlag(theme.glow);
  flagR.position.set(0.58, 1.7, 0);
  group.add(flagL, flagR);
  return group;
}

function bannerFlag(color: string): THREE.Mesh {
  const flag = new THREE.Mesh(GEO.plane, toon(color));
  flag.scale.set(0.28, 0.18, 1);
  flag.position.x = 0.16;
  flag.userData.role = 'sway';
  flag.userData.amp = 0.2;
  return flag;
}

export function totem(lit: number): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.cyl, toon('#8d5430'), group, 0, 0.15, 0, [0.34, 0.3, 0.34], true);
  mesh(GEO.box, toon('#6e4124'), group, 0, 0.32, 0, [0.5, 0.12, 0.4], true);
  const poleMat = toon('#a86b3c').clone();
  poleMat.map = barkTexture();
  mesh(GEO.taper, poleMat, group, 0, 0.95, 0, [0.2, 1.35, 0.2], true);
  mesh(GEO.torus, toon('#e7c48a'), group, 0, 0.55, 0, [0.16, 0.16, 0.08], false).rotation.x = Math.PI / 2;
  mesh(GEO.torus, toon('#c47c3c'), group, 0, 1.15, 0, [0.14, 0.14, 0.08], false).rotation.x = Math.PI / 2;
  mesh(GEO.sphere, toon('#d4924e'), group, 0.02, 1.78, 0, [0.2, 0.18, 0.2], true);
  mesh(GEO.box, toon('#f3d2b0'), group, 0.16, 1.7, 0, [0.12, 0.1, 0.16], true);
  mesh(GEO.sphereSm, basic('#4a2e24'), group, 0.22, 1.7, 0, [0.03, 0.028, 0.05], false);
  mesh(GEO.sphere, basic('#fffaf6'), group, 0.06, 1.84, 0.12, [0.07, 0.08, 0.045], false);
  mesh(GEO.sphereSm, basic('#6a432c'), group, 0.08, 1.83, 0.15, [0.04, 0.048, 0.03], false);
  mesh(GEO.sphereSm, basic('#1a120e'), group, 0.09, 1.82, 0.17, [0.024, 0.03, 0.02], false);
  mesh(GEO.sphere, toon('#c4783a'), group, -0.04, 1.98, 0.08, [0.05, 0.07, 0.035], false);
  mesh(GEO.sphere, toon('#e7a090'), group, -0.02, 1.96, 0.1, [0.025, 0.04, 0.02], false);
  const relics = [
    { color: '#f0c14a', y: 0.7 },
    { color: '#fff1c9', y: 0.95 },
    { color: '#8fd4ff', y: 1.2 },
  ];
  relics.forEach((relic, i) => {
    const on = i < lit;
    const gem = mesh(
      i === 1 ? GEO.feather : i === 2 ? GEO.cone : GEO.sphereSm,
      toon(on ? relic.color : '#efe0c4', on ? '#fff6d0' : '#000', on ? 0.9 : 0),
      group,
      0.22,
      relic.y,
      0,
      i === 1 ? [0.12, 0.22, 1] : [0.07, 0.07, 0.05],
      false,
    );
    if (i === 2) gem.rotation.z = Math.PI;
  });
  const ribbon = bannerFlag('#ff7a45');
  ribbon.position.set(0.2, 1.45, 0);
  group.add(ribbon);
  return group;
}

export function turkeyModel(): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.sphere, toon('#c4783a'), group, 0, 0.4, 0, [0.3, 0.24, 0.26], true);
  mesh(GEO.sphere, toon('#f6d7b0'), group, 0.04, 0.32, 0.04, [0.16, 0.1, 0.14], false);
  const fan = new THREE.Group();
  fan.position.set(-0.16, 0.48, 0);
  fan.rotation.z = 0.25;
  PLUMES.forEach((color, i) => {
    const t = i / (PLUMES.length - 1);
    const h = 0.55 + Math.sin(t * Math.PI) * 0.42;
    const card = new THREE.Mesh(GEO.feather, featherMaterial(color, 0.3));
    card.scale.set(h * 0.55, h, 1);
    card.position.y = h * 0.46;
    const vane = mesh(GEO.sphere, toon(color, color, 0.2), new THREE.Group(), 0, h * 0.4, -0.02, [h * 0.08, h * 0.4, 0.025], false);
    const pivot = new THREE.Group();
    pivot.rotation.z = -1.25 + t * 2.5;
    pivot.add(vane, card);
    fan.add(pivot);
  });
  group.add(fan);
  const neck = mesh(GEO.cyl, toon('#e0b080'), group, 0.22, 0.58, 0, [0.055, 0.22, 0.055], true);
  neck.rotation.z = -0.7;
  mesh(GEO.sphere, toon('#f3d2b0'), group, 0.36, 0.7, 0, [0.11, 0.1, 0.11], true);
  const beak = mesh(GEO.cone, toon('#f2c14a'), group, 0.48, 0.68, 0.02, [0.045, 0.12, 0.04], false);
  beak.rotation.z = -Math.PI / 2;
  mesh(GEO.sphereSm, toon('#e23d32', '#ff6a4a', 0.35), group, 0.38, 0.6, 0.04, [0.035, 0.07, 0.03], false);
  const eye = mesh(GEO.sphere, basic('#fffaf6'), group, 0.38, 0.74, 0.07, [0.05, 0.055, 0.03], false);
  mesh(GEO.sphereSm, basic('#1a120e'), eye, 0.35, -0.08, 0.45, [0.42, 0.48, 0.35], false);
  mesh(GEO.sphereSm, basic('#ffffff'), eye, -0.25, 0.28, 0.5, [0.28, 0.28, 0.2], false);
  mesh(GEO.cyl, toon('#8d5430'), group, -0.08, 0.12, 0.06, [0.03, 0.18, 0.03], false);
  mesh(GEO.cyl, toon('#8d5430'), group, 0.1, 0.12, 0.06, [0.03, 0.18, 0.03], false);
  return group;
}

const PLUMES = ['#f6c453', '#fff3c4', '#e36b32', '#ffe08a', '#c84b3a', '#fffaf0'];

export function pumpkinModel(): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.sphere, toon('#ff7a32'), group, 0, 0.28, 0, [0.32, 0.26, 0.3], true);
  mesh(GEO.sphere, toon('#ffb15a'), group, 0.04, 0.3, 0.04, [0.16, 0.28, 0.28], false);
  mesh(GEO.sphere, toon('#e25820'), group, -0.1, 0.26, 0, [0.1, 0.24, 0.26], false);
  const stem = mesh(GEO.cyl, toon('#2f8a38'), group, 0, 0.52, 0, [0.035, 0.14, 0.035], false);
  stem.rotation.z = 0.3;
  mesh(GEO.sphereSm, basic('#2b211c'), group, 0.08, 0.34, 0.2, [0.045, 0.035, 0.03], false);
  mesh(GEO.sphereSm, basic('#2b211c'), group, -0.08, 0.34, 0.2, [0.045, 0.035, 0.03], false);
  const brow = mesh(GEO.box, basic('#2b211c'), group, 0, 0.4, 0.22, [0.2, 0.02, 0.02], false);
  brow.rotation.z = 0.15;
  mesh(GEO.box, basic('#5c3a28'), group, 0, 0.24, 0.22, [0.1, 0.025, 0.02], false);
  return group;
}

export function featherModel(): THREE.Group {
  const group = new THREE.Group();
  const card = new THREE.Mesh(GEO.feather, featherMaterial('#fff1c4', 0.8));
  card.scale.set(0.22, 0.55, 1);
  card.position.y = 0.22;
  card.rotation.z = 0.25;
  group.add(card);
  return group;
}

export function starModel(): THREE.Group {
  const group = new THREE.Group();
  const mat = toon('#fff3a0', '#fff6c2', 1.15);
  for (let i = 0; i < 4; i++) {
    const point = mesh(GEO.cone, mat, group, 0, 0, 0, [0.12, 0.42, 0.07], false);
    point.rotation.z = (i * Math.PI) / 2;
  }
  mesh(GEO.sphereSm, toon('#fffaf0', '#fff6c2', 1.2), group, 0, 0, 0, [0.08, 0.08, 0.08], false);
  return group;
}

export function candle(): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.cyl, toon('#f7f1e4'), group, 0, 0.18, 0, [0.07, 0.36, 0.07], true);
  mesh(GEO.box, toon('#e7d3b0'), group, 0, 0.02, 0, [0.16, 0.05, 0.16], false);
  const flame = mesh(GEO.sphere, toon('#ffb15a', '#ffd27a', 1.5), group, 0, 0.42, 0, [0.045, 0.09, 0.045], false);
  flame.name = 'flame';
  flame.userData.role = 'flame';
  const glow = new THREE.PointLight('#ffb15a', 1.6, 5.5, 2);
  glow.position.y = 0.46;
  group.add(glow);
  return group;
}

export function ghost(): THREE.Group {
  const group = new THREE.Group();
  group.userData.role = 'sway';
  group.userData.amp = 0.08;
  const body = mesh(GEO.sphere, basic('#fffaf8', 0.82), group, 0, 0.48, 0, [0.3, 0.36, 0.26], false);
  body.position.y = 0.5;
  mesh(GEO.sphere, basic('#fffaf8', 0.82), group, 0, 0.22, 0, [0.22, 0.16, 0.2], false);
  mesh(GEO.sphere, basic('#fffaf6'), group, -0.08, 0.58, 0.16, [0.055, 0.065, 0.04], false);
  mesh(GEO.sphere, basic('#fffaf6'), group, 0.08, 0.58, 0.16, [0.055, 0.065, 0.04], false);
  mesh(GEO.sphereSm, basic('#2b211c'), group, -0.08, 0.57, 0.2, [0.028, 0.034, 0.02], false);
  mesh(GEO.sphereSm, basic('#2b211c'), group, 0.08, 0.57, 0.2, [0.028, 0.034, 0.02], false);
  mesh(GEO.sphereSm, basic('#f2a3b5'), group, 0, 0.46, 0.18, [0.06, 0.035, 0.02], false);
  return group;
}

export function jar(color: string): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.cyl, toon('#f7f4ef'), group, 0, 0.16, 0, [0.11, 0.28, 0.11], false);
  mesh(GEO.sphere, toon(color, color, 0.2), group, 0, 0.12, 0, [0.075, 0.1, 0.075], false);
  mesh(GEO.cyl, toon('#e7d8c8'), group, 0, 0.32, 0, [0.065, 0.06, 0.065], false);
  return group;
}

const WINGS = ['#ff8fb8', '#7ec8f0', '#ffe08a', '#c9a6ff'];
let wingCursor = 0;
const wingShape = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.08, 0.08, 0.05, 0.2);
  shape.quadraticCurveTo(0.02, 0.08, 0, 0.02);
  shape.quadraticCurveTo(0.1, 0.0, 0.07, -0.1);
  shape.quadraticCurveTo(0.02, -0.04, 0, 0);
  return new THREE.ShapeGeometry(shape);
})();

export function butterfly(): THREE.Group {
  const group = new THREE.Group();
  group.userData.role = 'bug';
  const color = WINGS[wingCursor % WINGS.length];
  wingCursor += 1;
  mesh(GEO.sphereSm, toon('#3a2418'), group, 0, 0, 0, [0.05, 0.03, 0.028], false);
  mesh(GEO.sphereSm, toon('#1a120e'), group, 0.04, 0.03, 0, [0.008, 0.03, 0.008], false);
  mesh(GEO.sphereSm, toon('#1a120e'), group, 0.02, 0.03, 0, [0.008, 0.028, 0.008], false);
  const paint = toon(color, color, 0.15).clone();
  paint.side = THREE.DoubleSide;
  const left = new THREE.Mesh(wingShape, paint);
  left.position.set(0.01, 0, 0.01);
  left.name = 'wingL';
  const right = new THREE.Mesh(wingShape, paint);
  right.scale.x = -1;
  right.position.set(-0.01, 0, 0.01);
  right.name = 'wingR';
  const spot = toon('#fffaf6');
  const dotL = new THREE.Mesh(GEO.circle, spot);
  dotL.scale.set(0.035, 0.035, 1);
  dotL.position.set(0.08, 0.02, 0.012);
  const dotR = dotL.clone();
  dotR.position.x = -0.08;
  group.add(left, right, dotL, dotR);
  group.scale.setScalar(1.35);
  return group;
}

export function bird(): THREE.Group {
  const group = new THREE.Group();
  group.userData.role = 'bird';
  mesh(GEO.sphere, toon('#4a3428'), group, 0, 0, 0, [0.12, 0.07, 0.07], false);
  mesh(GEO.cone, toon('#f2c14a'), group, 0.14, 0, 0, [0.03, 0.08, 0.03], false).rotation.z = -Math.PI / 2;
  const left = mesh(GEO.sphere, toon('#fff1c4'), group, -0.02, 0.02, 0.08, [0.1, 0.04, 0.05], false);
  const right = mesh(GEO.sphere, toon('#fff1c4'), group, -0.02, 0.02, -0.08, [0.1, 0.04, 0.05], false);
  left.name = 'wingL';
  right.name = 'wingR';
  return group;
}

export function tent(): THREE.Group {
  const group = new THREE.Group();
  const cloth = mesh(GEO.cone, toon('#ff7a45'), group, 0, 0.55, 0, [0.7, 0.9, 0.55], true);
  cloth.castShadow = true;
  mesh(GEO.cone, toon('#fff1c4'), group, 0.02, 0.55, 0.02, [0.48, 0.9, 0.18], false);
  mesh(GEO.cyl, toon('#8d5430'), group, 0, 0.95, 0, [0.03, 0.2, 0.03], false);
  mesh(GEO.box, toon('#6e4124'), group, 0, 0.08, 0.2, [0.7, 0.08, 0.16], false);
  return group;
}

export function campfire(): THREE.Group {
  const group = new THREE.Group();
  const logA = mesh(GEO.cyl, toon('#6e4124'), group, 0, 0.08, 0, [0.05, 0.36, 0.05], true);
  logA.rotation.z = Math.PI / 2;
  logA.rotation.y = 0.4;
  const logB = mesh(GEO.cyl, toon('#8d5430'), group, 0, 0.1, 0, [0.045, 0.32, 0.045], false);
  logB.rotation.z = Math.PI / 2.2;
  logB.rotation.y = -0.6;
  const flame = mesh(GEO.sphere, toon('#ffb15a', '#ffd27a', 0.55), group, 0, 0.28, 0, [0.08, 0.16, 0.08], false);
  flame.userData.role = 'flame';
  const inner = mesh(GEO.sphere, toon('#fff1c4', '#fff6d0', 0.7), group, 0, 0.26, 0, [0.04, 0.1, 0.04], false);
  inner.userData.role = 'flame';
  const light = new THREE.PointLight('#ff9a45', 0.7, 3.4, 2);
  light.position.y = 0.35;
  group.add(light);
  return group;
}

export function dress(parent: THREE.Object3D, width: number, theme: 'meadow' | 'orchard' = 'meadow'): void {
  const fruit = theme === 'orchard' ? '#f0c14a' : null;
  if (width > 3.2) {
    const item = tree(0.95 + Math.min(0.55, width * 0.04), fruit);
    item.position.set(-width * 0.28, 0, -0.85);
    parent.add(item);
  }
  if (width > 5) {
    const extra = tree(0.7, fruit);
    extra.position.set(width * 0.22, 0, -0.95);
    parent.add(extra);
    const shrub = bush(0.8);
    shrub.position.set(width * 0.05, 0, -0.55);
    parent.add(shrub);
  } else if (width > 2.4) {
    const shrub = bush(0.65);
    shrub.position.set(width * 0.18, 0, -0.55);
    parent.add(shrub);
  }
  const colors = theme === 'orchard' ? ['#f0c14a', '#ff8fb8', '#fffaf2'] : ['#ff8fb8', '#ffe08a', '#ffffff', '#c9a6ff'];
  const count = Math.max(2, Math.floor(width / 1.5));
  for (let i = 0; i < count; i++) {
    const bloom = flower(colors[i % colors.length]);
    bloom.position.set(-width * 0.38 + (i * width * 0.76) / count, 0, i % 2 ? 0.55 : -0.15);
    parent.add(bloom);
  }
  if (width > 4) {
    const stone = rock(0.8 + width * 0.02);
    stone.position.set(width * 0.36, 0, 0.35);
    parent.add(stone);
  }
  grassFringe(parent, width * 0.92, 1.12);
  grassFringe(parent, width * 0.86, -1.08);
}

const tuft = new THREE.PlaneGeometry(0.2, 0.26, 1, 3);
tuft.translate(0, 0.13, 0);

export function grassFringe(parent: THREE.Object3D, width: number, z: number): void {
  const count = Math.min(16, Math.max(5, Math.round(width * 1.2)));
  const greens = ['#2f9a3c', '#57c84e', '#1f8a38', '#8ee56a'];
  const mat = new THREE.MeshBasicMaterial({ color: greens[Math.abs(Math.round(z)) % greens.length], side: THREE.DoubleSide });
  const blades = new THREE.InstancedMesh(tuft, mat, count);
  blades.castShadow = false;
  blades.receiveShadow = false;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(-width * 0.46 + (i + 0.35) * ((width * 0.92) / count), 0.04, z);
    dummy.rotation.y = i % 2 === 0 ? -0.2 : 0.25;
    dummy.rotation.z = i % 2 === 0 ? -0.08 : 0.1;
    dummy.scale.set(0.38, 0.9 + (i % 3) * 0.28, 1);
    dummy.updateMatrix();
    blades.setMatrixAt(i, dummy.matrix);
  }
  blades.userData.role = 'sway';
  blades.userData.amp = 0.04;
  parent.add(blades);
}

export function pond(radius = 0.7): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 20);
  const mat = waterMaterial('#3ec8c4', '#147a92');
  const item = new THREE.Mesh(geo, mat);
  item.rotation.x = -Math.PI / 2;
  item.position.y = 0.12;
  return item;
}

export function banner(text: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#ff8a4a');
    g.addColorStop(1, '#e25820');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#6a3418';
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#fffaf3';
    ctx.font = '700 64px Fredoka, Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 70);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const plane = new THREE.Mesh(GEO.plane, mat);
  plane.scale.set(3.4, 0.85, 1);
  return plane;
}

export function flutter(group: THREE.Object3D, time: number): void {
  const left = group.getObjectByName('wingL');
  const right = group.getObjectByName('wingR');
  const flap = Math.sin(time * 14) * 0.8;
  if (left) left.rotation.y = flap;
  if (right) right.rotation.y = -flap;
}

export function plankMat(): THREE.MeshToonMaterial {
  const mat = toon('#a86b3c').clone();
  mat.map = plankTexture();
  return mat;
}
