import * as THREE from 'three';
import { GEO, basic, toon, woodTexture } from './materials';

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number, scale: [number, number, number], shadow = false): THREE.Mesh {
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
  mesh(GEO.box, toon('#c4895a'), group, 0, -thick / 2 - 0.02, 0, [width, thick, depth], true);
  mesh(GEO.box, toon('#6fbf62'), group, 0, -0.08, 0, [width * 1.02, 0.28, depth * 1.04], false);
  mesh(GEO.box, toon('#8ed67a'), group, 0, 0.04, 0, [width * 0.92, 0.12, depth * 0.9], false);
  mesh(GEO.sphereSm, toon('#a86d42'), group, width * 0.25, -thick * 0.85, 0.1, [0.28, 0.34, 0.24], false);
  mesh(GEO.sphereSm, toon('#b98355'), group, -width * 0.2, -thick * 0.7, -0.2, [0.22, 0.4, 0.2], false);
  return group;
}

export function tree(scale = 1): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.cyl, toon('#a56a3c'), group, 0, 0.32 * scale, 0, [0.1 * scale, 0.64 * scale, 0.1 * scale], true);
  mesh(GEO.sphere, toon('#67c85a'), group, 0, 0.86 * scale, 0, [0.42 * scale, 0.36 * scale, 0.38 * scale], true);
  mesh(GEO.sphere, toon('#8ee07a'), group, 0.18 * scale, 0.74 * scale, 0.08 * scale, [0.26 * scale, 0.24 * scale, 0.24 * scale], false);
  mesh(GEO.sphere, toon('#4eae55'), group, -0.16 * scale, 0.7 * scale, -0.06 * scale, [0.24 * scale, 0.22 * scale, 0.22 * scale], false);
  return group;
}

export function flower(color: string): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.cyl, toon('#3f9d45'), group, 0, 0.12, 0, [0.02, 0.24, 0.02], false);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    mesh(GEO.sphereSm, toon(color), group, Math.cos(a) * 0.08, 0.26, Math.sin(a) * 0.08, [0.06, 0.04, 0.06], false);
  }
  mesh(GEO.sphereSm, toon('#ffe08a'), group, 0, 0.26, 0, [0.045, 0.045, 0.045], false);
  return group;
}

export function cloud(): THREE.Group {
  const group = new THREE.Group();
  const mat = basic('#fffaf6', 0.92);
  mesh(GEO.sphere, mat, group, 0, 0, 0, [0.7, 0.38, 0.4], false);
  mesh(GEO.sphere, mat, group, 0.45, 0.05, 0, [0.45, 0.3, 0.32], false);
  mesh(GEO.sphere, mat, group, -0.4, 0.02, 0.05, [0.4, 0.28, 0.3], false);
  return group;
}

export function planet(radius: number, tint: string): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.sphere, toon(tint), group, 0, 0, 0, [radius, radius, radius], false);
  mesh(GEO.sphereSm, toon('#7dce6a'), group, radius * 0.3, radius * 0.55, radius * 0.4, [radius * 0.45, radius * 0.28, radius * 0.4], false);
  mesh(GEO.sphereSm, toon('#e7c07a'), group, -radius * 0.4, radius * 0.1, radius * 0.55, [radius * 0.3, radius * 0.2, radius * 0.2], false);
  const mini = tree(radius * 0.35);
  mini.position.set(radius * 0.1, radius * 0.72, radius * 0.2);
  group.add(mini);
  return group;
}

export function acornModel(): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.sphere, toon('#8a5a32'), group, 0, 0, 0, [0.16, 0.2, 0.16], false);
  mesh(GEO.sphere, toon('#f0c14a', '#ffd56a', 0.7), group, 0, 0.12, 0, [0.14, 0.1, 0.14], false);
  mesh(GEO.sphereSm, toon('#fff6d0', '#fff1b0', 1.2), group, 0.05, 0.2, 0.06, [0.04, 0.04, 0.04], false);
  return group;
}

export function crateModel(): THREE.Group {
  const group = new THREE.Group();
  const wood = toon('#e0b07a').clone();
  wood.map = woodTexture();
  const box = mesh(GEO.box, wood, group, 0, 0, 0, [0.88, 0.88, 0.88], true);
  box.castShadow = true;
  mesh(GEO.box, toon('#a86b3c'), group, 0, 0, 0.46, [0.7, 0.08, 0.04], false);
  mesh(GEO.box, toon('#a86b3c'), group, 0, 0, 0.46, [0.08, 0.7, 0.04], false);
  return group;
}

export function archway(done: boolean): THREE.Group {
  const group = new THREE.Group();
  const stone = done ? '#ffe08a' : '#f2d2b0';
  mesh(GEO.box, toon(stone), group, -0.55, 0.7, 0, [0.22, 1.4, 0.28], true);
  mesh(GEO.box, toon(stone), group, 0.55, 0.7, 0, [0.22, 1.4, 0.28], true);
  const ring = new THREE.Mesh(GEO.torus, toon(done ? '#ffd15c' : '#e7b98a', done ? '#ffd56a' : '#000', done ? 0.4 : 0));
  ring.scale.set(0.62, 0.62, 0.62);
  ring.position.y = 1.35;
  ring.rotation.y = Math.PI / 2;
  group.add(ring);
  const curtain = new THREE.Mesh(GEO.plane, basic(done ? '#ffe08a' : '#8fd4ff', 0.45));
  curtain.scale.set(0.7, 0.9, 1);
  curtain.position.y = 0.7;
  group.add(curtain);
  return group;
}

export function totem(lit: number): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.cyl, toon('#a56a3c'), group, 0, 0.7, 0, [0.18, 1.4, 0.18], true);
  mesh(GEO.sphere, toon('#c6864a'), group, 0, 1.55, 0.02, [0.28, 0.22, 0.2], true);
  mesh(GEO.sphere, toon('#e7b48a'), group, 0.16, 1.5, 0.08, [0.12, 0.1, 0.1], false);
  mesh(GEO.sphereSm, toon('#fffaf4'), group, 0.08, 1.62, 0.16, [0.06, 0.07, 0.04], false);
  mesh(GEO.sphereSm, toon('#2b211c'), group, 0.1, 1.62, 0.19, [0.03, 0.035, 0.02], false);
  mesh(GEO.sphere, toon('#f2c14e', '#ffe08a', 0.4), group, -0.05, 1.95, 0, [0.08, 0.22, 0.03], false);
  const colors = ['#f0c14a', '#fff1c9', '#8fd4ff'];
  for (let i = 0; i < 3; i++) {
    const on = i < lit;
    mesh(GEO.sphereSm, toon(on ? colors[i] : '#efe0c4', on ? '#fff6d0' : '#000', on ? 0.8 : 0), group, -0.2 + i * 0.2, 0.95, 0.2, [0.07, 0.07, 0.05], false);
  }
  return group;
}

export function turkeyModel(): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.sphere, toon('#8d5a3c'), group, 0, 0.35, 0, [0.34, 0.28, 0.3], true);
  mesh(GEO.sphere, toon('#f0c9a0'), group, 0.05, 0.28, 0.12, [0.16, 0.14, 0.12], false);
  const colors = ['#e07a3d', '#f2c14e', '#fff1c9', '#c45a3a', '#ffe08a'];
  colors.forEach((color, i) => {
    const feather = mesh(GEO.sphere, toon(color), group, -0.05, 0.55, 0, [0.08, 0.22, 0.03], false);
    feather.position.set(Math.sin((i - 2) * 0.35) * 0.16, 0.48 + (i % 2) * 0.04, -0.08);
    feather.rotation.z = (i - 2) * 0.28;
  });
  mesh(GEO.sphere, toon('#a86b3c'), group, 0.28, 0.48, 0.05, [0.16, 0.14, 0.14], true);
  mesh(GEO.sphereSm, toon('#e85d4c'), group, 0.36, 0.4, 0.08, [0.05, 0.08, 0.04], false);
  mesh(GEO.cone, toon('#f2c14e'), group, 0.46, 0.46, 0.08, [0.06, 0.1, 0.06], false).rotation.z = -Math.PI / 2;
  const eyeA = mesh(GEO.sphereSm, toon('#fffaf4'), group, 0.34, 0.54, 0.12, [0.05, 0.06, 0.04], false);
  mesh(GEO.sphereSm, toon('#2b211c'), eyeA, 0.4, 0, 0.4, [0.4, 0.4, 0.4], false);
  const eyeB = mesh(GEO.sphereSm, toon('#fffaf4'), group, 0.3, 0.52, -0.02, [0.035, 0.05, 0.03], false);
  mesh(GEO.sphereSm, toon('#2b211c'), eyeB, 0.4, 0, 0.5, [0.45, 0.45, 0.4], false);
  return group;
}

export function pumpkinModel(): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.sphere, toon('#ff8a3d'), group, 0, 0.28, 0, [0.3, 0.26, 0.28], true);
  mesh(GEO.sphere, toon('#ff9d55'), group, 0, 0.28, 0, [0.16, 0.28, 0.3], false);
  mesh(GEO.cyl, toon('#3f9d45'), group, 0, 0.52, 0, [0.04, 0.12, 0.04], false);
  mesh(GEO.sphereSm, toon('#2b211c'), group, 0.1, 0.32, 0.22, [0.035, 0.04, 0.03], false);
  mesh(GEO.sphereSm, toon('#2b211c'), group, -0.08, 0.32, 0.22, [0.035, 0.04, 0.03], false);
  return group;
}

export function featherModel(): THREE.Group {
  const group = new THREE.Group();
  const vane = mesh(GEO.sphere, toon('#fff1c9', '#ffe08a', 0.8), group, 0, 0.2, 0, [0.08, 0.32, 0.03], false);
  vane.rotation.z = 0.3;
  mesh(GEO.cyl, toon('#e0b07a'), group, -0.06, 0, 0, [0.015, 0.28, 0.015], false);
  return group;
}

export function starModel(): THREE.Group {
  const group = new THREE.Group();
  const mat = toon('#fff3a0', '#fff6c2', 1.1);
  const a = mesh(GEO.cone, mat, group, 0, 0, 0, [0.16, 0.42, 0.08], false);
  const b = mesh(GEO.cone, mat, group, 0, 0, 0, [0.16, 0.42, 0.08], false);
  b.rotation.z = Math.PI / 2;
  a.rotation.z = Math.PI / 2;
  const c = mesh(GEO.cone, mat, group, 0, 0, 0, [0.16, 0.42, 0.08], false);
  c.rotation.z = Math.PI;
  return group;
}

export function candle(): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.cyl, toon('#f7f1e4'), group, 0, 0.18, 0, [0.08, 0.36, 0.08], true);
  const flame = mesh(GEO.sphere, toon('#ffb15a', '#ffd27a', 1.4), group, 0, 0.42, 0, [0.05, 0.09, 0.05], false);
  flame.name = 'flame';
  const light = new THREE.PointLight('#ffb15a', 1.4, 4.5, 2);
  light.position.y = 0.45;
  group.add(light);
  return group;
}

export function ghost(): THREE.Group {
  const group = new THREE.Group();
  const body = mesh(GEO.sphere, basic('#fffaf8', 0.78), group, 0, 0.4, 0, [0.28, 0.34, 0.24], false);
  body.position.y = 0.45;
  mesh(GEO.sphereSm, toon('#2b211c'), group, -0.07, 0.5, 0.16, [0.035, 0.045, 0.03], false);
  mesh(GEO.sphereSm, toon('#2b211c'), group, 0.07, 0.5, 0.16, [0.035, 0.045, 0.03], false);
  mesh(GEO.sphereSm, toon('#f2a3a3'), group, 0, 0.4, 0.16, [0.05, 0.03, 0.02], false);
  return group;
}

export function jar(color: string): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.cyl, toon('#f7f4ef'), group, 0, 0.16, 0, [0.12, 0.28, 0.12], false);
  mesh(GEO.sphere, toon(color), group, 0, 0.12, 0, [0.08, 0.1, 0.08], false);
  mesh(GEO.cyl, toon('#e7d8c8'), group, 0, 0.32, 0, [0.07, 0.06, 0.07], false);
  return group;
}

export function butterfly(): THREE.Group {
  const group = new THREE.Group();
  mesh(GEO.sphereSm, toon('#5c3d32'), group, 0, 0, 0, [0.04, 0.025, 0.025], false);
  const left = mesh(GEO.sphere, toon('#ff8fb8'), group, -0.1, 0.02, 0, [0.12, 0.07, 0.015], false);
  const right = mesh(GEO.sphere, toon('#8fd4ff'), group, 0.1, 0.02, 0, [0.12, 0.07, 0.015], false);
  left.name = 'wingL';
  right.name = 'wingR';
  return group;
}

export function dress(parent: THREE.Object3D, width: number, z = -0.7): void {
  if (width > 4.2) {
    const item = tree(0.85 + Math.min(0.4, width * 0.03));
    item.position.set(-width * 0.22, 0, z);
    parent.add(item);
  }
  const colors = ['#ff8fb8', '#ffe08a', '#ffffff', '#c9a6ff'];
  const count = Math.max(2, Math.floor(width / 1.6));
  for (let i = 0; i < count; i++) {
    const bloom = flower(colors[i % colors.length]);
    bloom.position.set(-width * 0.35 + (i * width * 0.7) / count, 0, z + 0.35);
    parent.add(bloom);
  }
}

export function backdrop(parent: THREE.Object3D): void {
  const specs = [
    { x: -8, y: 6.2, z: -24, r: 2.2, c: '#f0b27a' },
    { x: 6, y: 7.4, z: -30, r: 3.1, c: '#8ec8f0' },
    { x: 14, y: 5.2, z: -22, r: 1.6, c: '#f7d98a' },
    { x: -16, y: 4.4, z: -28, r: 2.4, c: '#d7b0f2' },
  ];
  for (const spec of specs) {
    const body = planet(spec.r, spec.c);
    body.position.set(spec.x, spec.y, spec.z);
    parent.add(body);
  }
  for (let i = 0; i < 7; i++) {
    const puff = cloud();
    puff.position.set(-12 + i * 4.2, i % 2 ? 4.6 : -1.8, -8 - (i % 3));
    puff.scale.setScalar(0.8 + (i % 3) * 0.25);
    parent.add(puff);
  }
}

export function banner(text: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ff7a45';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#7a4b2b';
    ctx.lineWidth = 12;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#fffaf3';
    ctx.font = '700 64px Fredoka, Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const plane = new THREE.Mesh(GEO.plane, mat);
  plane.scale.set(3.2, 0.8, 1);
  return plane;
}

export function flutter(group: THREE.Object3D, time: number): void {
  const left = group.getObjectByName('wingL');
  const right = group.getObjectByName('wingR');
  const flap = Math.sin(time * 14) * 0.8;
  if (left) left.rotation.y = flap;
  if (right) right.rotation.y = -flap;
}
