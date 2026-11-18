import * as THREE from 'three';
import { basic, GEO, toon, wallTexture } from './materials';
import {
  bird,
  butterfly,
  campfire,
  cloud,
  flutter,
  jar,
  planet,
  reed,
  tent,
  tree,
  type SkyTheme,
} from './scenery';

interface CloudDrift {
  obj: THREE.Object3D;
  baseX: number;
  baseY: number;
  speed: number;
  phase: number;
}

interface BirdPath {
  obj: THREE.Object3D;
  phase: number;
  radius: number;
  y: number;
  z: number;
}

interface Bob {
  obj: THREE.Object3D;
  base: number;
}

export class Rig {
  time = 0;
  private readonly seen = new Set<THREE.Object3D>();
  private readonly sways: { obj: THREE.Object3D; phase: number; amp: number; base: number }[] = [];
  private readonly clouds: CloudDrift[] = [];
  private readonly birds: BirdPath[] = [];
  private readonly bugs: Bob[] = [];
  private readonly flames: { obj: THREE.Object3D; base: THREE.Vector3 }[] = [];

  constructor(private readonly far: THREE.Group | null, private readonly mid: THREE.Group | null) {}

  adopt(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (this.seen.has(obj)) return;
      const role = obj.userData.role;
      if (role === 'sway') {
        this.seen.add(obj);
        this.sways.push({
          obj,
          phase: Math.random() * Math.PI * 2,
          amp: Number(obj.userData.amp) || 0.06,
          base: obj.rotation.z,
        });
      } else if (role === 'cloud') {
        this.seen.add(obj);
        this.clouds.push({
          obj,
          baseX: obj.position.x,
          baseY: obj.position.y,
          speed: 0.15 + Math.random() * 0.2,
          phase: Math.random() * 8,
        });
      } else if (role === 'bird') {
        this.seen.add(obj);
        this.birds.push({
          obj,
          phase: Math.random() * Math.PI * 2,
          radius: 6 + Math.random() * 8,
          y: obj.position.y,
          z: obj.position.z,
        });
      } else if (role === 'bug') {
        this.seen.add(obj);
        this.bugs.push({ obj, base: obj.position.y });
      } else if (role === 'flame') {
        this.seen.add(obj);
        this.flames.push({ obj, base: obj.scale.clone() });
      }
    });
  }

  update(dt: number, reduced: boolean, cameraX: number): void {
    const pace = reduced ? 0.25 : 1;
    this.time += dt * pace;
    if (this.far) this.far.position.x = cameraX * 0.78;
    if (this.mid) this.mid.position.x = cameraX * 0.46;
    for (const sway of this.sways) {
      sway.obj.rotation.z = sway.base + Math.sin(this.time * 1.7 + sway.phase) * sway.amp;
    }
    for (const puff of this.clouds) {
      puff.obj.position.x = puff.baseX + Math.sin(this.time * puff.speed + puff.phase) * 0.35;
      puff.obj.position.y = puff.baseY + Math.sin(this.time * 0.6 + puff.phase) * 0.12;
    }
    for (const flyer of this.birds) {
      const a = this.time * 0.35 + flyer.phase;
      flyer.obj.position.set(Math.cos(a) * flyer.radius, flyer.y + Math.sin(a * 2) * 0.35, flyer.z);
      flyer.obj.rotation.y = a + Math.PI / 2;
      flutter(flyer.obj, this.time * 2);
    }
    this.bugs.forEach((bug, i) => {
      bug.obj.position.y = bug.base + Math.sin(this.time * 2 + i) * 0.12;
      flutter(bug.obj, this.time + i);
    });
    for (const flame of this.flames) {
      const flicker = 0.88 + Math.sin(this.time * 17 + flame.obj.position.x) * 0.12;
      flame.obj.scale.copy(flame.base).multiplyScalar(flicker);
    }
  }
}

export function skyRig(parent: THREE.Object3D, theme: SkyTheme, span = 42): Rig {
  const far = new THREE.Group();
  const mid = new THREE.Group();
  far.name = 'far';
  mid.name = 'mid';
  parent.add(far, mid);
  const planets = theme === 'party'
    ? [
        { x: -14, y: 6.4, z: -26, r: 2.4, c: '#ff8fb8' },
        { x: 8, y: 7.2, z: -30, r: 3.2, c: '#7ec8f0' },
        { x: 22, y: 5.4, z: -24, r: 1.8, c: '#ffe08a' },
        { x: -28, y: 4.6, z: -28, r: 2.2, c: '#c9a6ff' },
      ]
    : theme === 'golden'
      ? [
          { x: -10, y: 6, z: -24, r: 2.2, c: '#f0b27a' },
          { x: 12, y: 7, z: -28, r: 2.8, c: '#ffd08a' },
          { x: -22, y: 5, z: -30, r: 1.7, c: '#e07a45' },
        ]
      : [
          { x: -12, y: 6.2, z: -26, r: 2.3, c: '#f0b27a' },
          { x: 10, y: 7.4, z: -32, r: 3.2, c: '#7ec8f0' },
          { x: 24, y: 5.2, z: -24, r: 1.7, c: '#f7d98a' },
          { x: -26, y: 4.8, z: -30, r: 2.1, c: '#d7b0f2' },
        ];
  for (const spec of planets) {
    const body = planet(spec.r, spec.c);
    body.position.set(spec.x, spec.y, spec.z);
    far.add(body);
  }
  const hills = theme === 'party' ? ['#ff8fb8', '#c9a6ff'] : theme === 'golden' ? ['#e0944a', '#c46a32'] : ['#2f6a38', '#3f8a48'];
  hills.forEach((color, i) => {
    const hill = new THREE.Mesh(GEO.sphere, toon(color));
    hill.scale.set(16 + i * 6, 4.2, 6);
    hill.position.set(-18 + i * 22, -1.2, -16 - i);
    far.add(hill);
  });
  const seaCount = Math.round(span / 3.2);
  for (let i = 0; i < seaCount; i++) {
    const puff = cloud();
    const tint = theme === 'golden' ? '#ffe0b8' : theme === 'party' ? '#ffe4f2' : '#fffaf6';
    puff.traverse((obj) => {
      const item = obj as THREE.Mesh;
      if (item.isMesh && item.material instanceof THREE.MeshToonMaterial) item.material = toon(tint);
    });
    puff.position.set(-span * 0.5 + i * 3.4, -1.55 + (i % 3) * 0.18, -1.2 - (i % 4) * 0.45);
    puff.scale.setScalar(1.3 + (i % 3) * 0.35);
    mid.add(puff);
  }
  const skyCount = Math.round(span / 4.5);
  for (let i = 0; i < skyCount; i++) {
    const puff = cloud();
    puff.position.set(-span * 0.45 + i * 4.8, i % 2 ? 4.4 : 3.1, -7 - (i % 3) * 1.4);
    puff.scale.setScalar(0.85 + (i % 4) * 0.28);
    mid.add(puff);
  }
  for (let i = 0; i < 3; i++) {
    const isle = new THREE.Group();
    const dirt = new THREE.Mesh(GEO.sphere, toon('#c4844a'));
    dirt.scale.set(1.15, 0.42, 0.7);
    dirt.position.y = -0.22;
    const top = new THREE.Mesh(GEO.sphere, toon('#3ea84a'));
    top.scale.set(1.25, 0.32, 0.78);
    const sap = tree(0.42, theme === 'orchard' ? '#f0c14a' : null);
    sap.position.y = 0.05;
    isle.add(dirt, top, sap);
    isle.position.set(-18 + i * 14, 1.8 + (i % 2) * 1.6, -10 - i);
    mid.add(isle);
  }
  for (let i = 0; i < 3; i++) {
    const flyer = bird();
    flyer.position.set(-6 + i * 5, 3.4 + (i % 2) * 0.6, -6);
    far.add(flyer);
  }
  for (let i = 0; i < 2; i++) {
    const bug = butterfly();
    bug.position.set(-9 + i * 12, 2.6 + i * 0.7, -3.2);
    bug.scale.multiplyScalar(0.8);
    mid.add(bug);
  }
  const rig = new Rig(far, mid);
  rig.adopt(parent);
  return rig;
}

export function dressGrove(parent: THREE.Object3D): void {
  const big = tree(1.35);
  big.position.set(-2.6, 0, -1.05);
  parent.add(big);
  const sapling = tree(0.75);
  sapling.position.set(3.1, 0, -0.9);
  parent.add(sapling);
  for (let i = 0; i < 4; i++) {
    const stem = reed();
    stem.position.set(-0.55 + i * 0.18, 0, 0.35);
    parent.add(stem);
  }
}

export function dressCamp(parent: THREE.Object3D): void {
  const home = tent();
  home.position.set(-4.7, 0, -1.05);
  parent.add(home);
  const fire = campfire();
  fire.position.set(-5.15, 0.02, -0.7);
  parent.add(fire);
  const pine = tree(1.15);
  pine.position.set(3.4, 0.3, -1.1);
  parent.add(pine);
  const farTree = tree(0.85);
  farTree.position.set(-8.2, 0, -0.9);
  parent.add(farTree);
  for (const x of [-8.6, 9.1]) {
    for (let i = 0; i < 5; i++) {
      const drop = new THREE.Mesh(GEO.sphereSm, basic('#b9f2ff', 0.65));
      drop.scale.set(0.04, 0.1, 0.04);
      drop.position.set(x, 0.4 - i * 0.28, 0.2);
      parent.add(drop);
    }
  }
}

export function dressParade(parent: THREE.Object3D): void {
  const stripes = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.2), carnivalCloth());
  stripes.position.set(0, 2.3, -1.6);
  parent.add(stripes);
  for (let i = 0; i < 10; i++) {
    const pennant = new THREE.Mesh(GEO.cone, toon(i % 2 ? '#ff7a45' : '#ffe08a'));
    pennant.scale.set(0.16, 0.28, 0.04);
    pennant.position.set(-4.2 + i * 0.95, 3.15, -1.2);
    pennant.rotation.z = Math.PI;
    pennant.userData.role = 'sway';
    pennant.userData.amp = 0.12;
    parent.add(pennant);
  }
  const rope = new THREE.Mesh(GEO.box, toon('#fffaf3'));
  rope.scale.set(9.2, 0.03, 0.03);
  rope.position.set(0, 3.35, -1.2);
  parent.add(rope);
  for (let i = 0; i < 5; i++) {
    const watcher = new THREE.Group();
    const body = new THREE.Mesh(GEO.sphere, toon(i % 2 ? '#6a4a86' : '#2f6f8f'));
    body.scale.set(0.22, 0.28, 0.2);
    body.position.y = 0.7;
    const hat = new THREE.Mesh(GEO.cone, toon(i % 2 ? '#ff7a45' : '#ffe08a'));
    hat.scale.set(0.12, 0.2, 0.12);
    hat.position.y = 1.02;
    watcher.add(body, hat);
    watcher.position.set(-3.2 + i * 1.6, 0, -1.15);
    watcher.userData.role = 'sway';
    watcher.userData.amp = 0.04;
    parent.add(watcher);
  }
}

function carnivalCloth(): THREE.MeshBasicMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = x % 64 === 0 ? '#ff7a45' : '#fff1c4';
      ctx.fillRect(x, 0, 32, 128);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return new THREE.MeshBasicMaterial({ map: tex });
}

export function dressPantry(parent: THREE.Object3D): void {
  const wall = toon('#3a2848').clone();
  wall.map = wallTexture();
  const paper = new THREE.Mesh(new THREE.BoxGeometry(18.2, 3.4, 0.12), wall);
  paper.position.set(0, 4.3, -1.85);
  parent.add(paper);
  const wainscot = new THREE.Mesh(new THREE.BoxGeometry(18.2, 1.55, 0.18), toon('#6e4124'));
  wainscot.position.set(0, 0.78, -1.62);
  wainscot.receiveShadow = true;
  parent.add(wainscot);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.08, 0.22), toon('#e7c9a2'));
  rail.position.set(0, 1.55, -1.5);
  parent.add(rail);
  for (const x of [-7.4, -5.2, -2.2, 1.2, 4.2, 6.8]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.42), toon('#a86b3c'));
    shelf.position.set(x, 2.35, -1.45);
    parent.add(shelf);
    const pot = jar(x % 2 ? '#e07a5f' : '#7dce6a');
    pot.position.set(x - 0.25, 2.5, -1.4);
    parent.add(pot);
    const loaf = new THREE.Mesh(GEO.sphere, toon('#e0a060'));
    loaf.scale.set(0.16, 0.1, 0.12);
    loaf.position.set(x + 0.28, 2.48, -1.38);
    parent.add(loaf);
  }
  for (const x of [-8.2, 8.2]) {
    const barrel = new THREE.Mesh(GEO.cyl, toon('#a86b3c'));
    barrel.scale.set(0.28, 0.42, 0.28);
    barrel.position.set(x, 0.28, -1.05);
    parent.add(barrel);
    const band = new THREE.Mesh(GEO.torus, toon('#6e4124'));
    band.scale.set(0.3, 0.3, 0.3);
    band.rotation.x = Math.PI / 2;
    band.position.set(x, 0.32, -1.05);
    parent.add(band);
  }
  const frame = new THREE.Mesh(GEO.box, toon('#e7c9a2'));
  frame.scale.set(0.7, 0.9, 0.06);
  frame.position.set(-3.4, 3.15, -1.7);
  parent.add(frame);
  const portrait = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ map: portraitTexture() }));
  portrait.scale.set(0.52, 0.7, 1);
  portrait.position.set(-3.4, 3.15, -1.66);
  parent.add(portrait);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.7, 3.2, 12, 1, true),
    basic('#d5e4ff', 0.14),
  );
  beam.position.set(2.4, 2.2, -1.2);
  parent.add(beam);
  for (const [x, y] of [[-8.4, 3.4], [8.3, 3.2], [-8.2, 1.2]] as const) {
    const web = new THREE.Mesh(GEO.circle, webMaterial());
    web.scale.setScalar(0.45);
    web.position.set(x, y, -1.55);
    parent.add(web);
  }
  const herbs = new THREE.Mesh(GEO.cone, toon('#2f8a38'));
  herbs.scale.set(0.12, 0.28, 0.12);
  herbs.position.set(0.2, 2.7, -1.35);
  herbs.rotation.z = Math.PI;
  parent.add(herbs);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.72, 0.42), toon('#6a3a24'));
  counter.position.set(-1.1, 0.42, -1.22);
  counter.castShadow = true;
  parent.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 0.48), toon('#e7c9a2'));
  top.position.set(-1.1, 0.8, -1.2);
  parent.add(top);
  for (const [x, color] of [[-3.4, '#e07a5f'], [-2.2, '#7dce6a'], [-0.6, '#f0c14a'], [0.8, '#c9a6ff'], [1.6, '#fff1c4']] as const) {
    const bowl = new THREE.Mesh(GEO.sphere, toon(color));
    bowl.scale.set(0.16, 0.1, 0.14);
    bowl.position.set(x, 0.92, -1.18);
    parent.add(bowl);
  }
  const lamp = new THREE.PointLight('#ffc48a', 0.85, 7.5, 2);
  lamp.position.set(-2.2, 2.1, -0.2);
  parent.add(lamp);
}

function portraitTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2a2038';
    ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = '#c47c3c';
    ctx.beginPath();
    ctx.ellipse(58, 96, 36, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0d0ae';
    ctx.fillRect(78, 78, 28, 22);
    ctx.fillStyle = '#fffaf6';
    ctx.beginPath();
    ctx.arc(88, 74, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a120e';
    ctx.beginPath();
    ctx.arc(90, 75, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6c453';
    ctx.beginPath();
    ctx.moveTo(30, 70);
    ctx.lineTo(18, 28);
    ctx.lineTo(46, 58);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function webMaterial(): THREE.MeshBasicMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(64, 64);
      ctx.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60);
      ctx.stroke();
    }
    for (const r of [16, 30, 46]) {
      ctx.beginPath();
      ctx.arc(64, 64, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
}

export function mound(x: number): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.08, 8, 16), toon('#6b8f45'));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 0.08, 0.1);
  return ring;
}
