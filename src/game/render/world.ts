import * as THREE from 'three';
import { basic, GEO, leafTexture, toon, trackTime, wallTexture } from './materials';
import {
  bird,
  butterfly,
  campfire,
  candle,
  cloud,
  flutter,
  jar,
  planet,
  bush,
  reed,
  rock,
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

interface Dust {
  obj: THREE.Object3D;
  base: THREE.Vector3;
  phase: number;
}

export class Rig {
  time = 0;
  private readonly seen = new Set<THREE.Object3D>();
  private readonly sways: { obj: THREE.Object3D; phase: number; amp: number; base: number }[] = [];
  private readonly clouds: CloudDrift[] = [];
  private readonly birds: BirdPath[] = [];
  private readonly bugs: Bob[] = [];
  private readonly flames: { obj: THREE.Object3D; base: THREE.Vector3 }[] = [];
  private readonly dusts: Dust[] = [];

  constructor(
    private readonly far: THREE.Group | null,
    private readonly mid: THREE.Group | null,
  ) {}

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
      } else if (role === 'dust') {
        this.seen.add(obj);
        this.dusts.push({ obj, base: obj.position.clone(), phase: Math.random() * 6 });
      }
    });
  }

  update(dt: number, reduced: boolean, cameraX: number): void {
    const pace = reduced ? 0.25 : 1;
    this.time += dt * pace;
    if (this.far) this.far.position.x = cameraX * 0.86;
    if (this.mid) this.mid.position.x = cameraX * 0.48;
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
    for (const mote of this.dusts) {
      const wobble = Math.sin(this.time * 0.7 + mote.phase);
      mote.obj.position.set(
        mote.base.x + Math.sin(this.time * 0.35 + mote.phase) * 0.35,
        mote.base.y + wobble * 0.22,
        mote.base.z,
      );
    }
  }
}

export function skyRig(parent: THREE.Object3D, theme: SkyTheme, span = 42): Rig {
  const far = new THREE.Group();
  const mid = new THREE.Group();
  const frame = new THREE.Group();
  far.name = 'far';
  mid.name = 'mid';
  frame.name = 'frame';
  parent.add(far, mid, frame);
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
  layHills(far, mid, theme);
  dressHorizon(mid, theme);
  const seaCount = Math.round(span / 3.2);
  for (let i = 0; i < seaCount; i++) {
    const puff = cloud();
    const tint = theme === 'golden' ? '#ffe0b8' : theme === 'party' ? '#ffe4f2' : '#fffaf6';
    puff.traverse((obj) => {
      const item = obj as THREE.Mesh;
      if (item.isMesh && item.material instanceof THREE.MeshToonMaterial) item.material = toon(tint);
    });
    puff.position.set(-span * 0.5 + i * 3.4, -0.85 + (i % 3) * 0.16, -7.2 - (i % 4) * 0.3);
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
  frameLeaves(frame, theme);
  const rig = new Rig(far, mid);
  rig.adopt(parent);
  return rig;
}

interface HillLayer {
  color: string;
  lift: string;
  z: number;
  y: number;
  amp: number;
  base: number;
  where: 'far' | 'mid' | 'near';
}

function hillPalette(theme: SkyTheme): HillLayer[] {
  if (theme === 'party') {
    return [
      { color: '#f7d8ee', lift: '#f8ecff', z: -50, y: 0.15, amp: 0.5, base: 0.85, where: 'far' },
      { color: '#eea8d0', lift: '#ffd8ef', z: -34, y: -0.05, amp: 0.65, base: 0.8, where: 'far' },
      { color: '#ff7eae', lift: '#ffd0b0', z: -20, y: -0.28, amp: 0.8, base: 0.7, where: 'mid' },
      { color: '#f25d90', lift: '#ffb0c8', z: -9.5, y: -0.55, amp: 1.05, base: 0.6, where: 'near' },
    ];
  }
  if (theme === 'golden') {
    return [
      { color: '#f8dcc0', lift: '#fff4e2', z: -50, y: 0.12, amp: 0.52, base: 0.88, where: 'far' },
      { color: '#eead68', lift: '#ffe0b4', z: -34, y: -0.08, amp: 0.68, base: 0.82, where: 'far' },
      { color: '#d4843c', lift: '#f6b56a', z: -20, y: -0.3, amp: 0.82, base: 0.72, where: 'mid' },
      { color: '#c46228', lift: '#e89848', z: -9.5, y: -0.55, amp: 1.02, base: 0.62, where: 'near' },
    ];
  }
  const orchard = theme === 'orchard';
  return [
    { color: orchard ? '#dce8cc' : '#d7eee6', lift: '#f4f8ff', z: -50, y: 0.18, amp: 0.55, base: 0.9, where: 'far' },
    { color: orchard ? '#a8cc86' : '#9cc8b2', lift: '#e8f7ee', z: -34, y: -0.02, amp: 0.72, base: 0.82, where: 'far' },
    { color: orchard ? '#62a84a' : '#4e9a62', lift: '#d4f2bc', z: -20, y: -0.26, amp: 0.86, base: 0.7, where: 'mid' },
    { color: orchard ? '#3d9234' : '#2f8640', lift: '#b4e67a', z: -9.5, y: -0.55, amp: 1.08, base: 0.62, where: 'near' },
  ];
}

function crestHeight(layer: HillLayer, t: number): number {
  return layer.base
    + Math.sin(t * Math.PI * 2.4) * layer.amp
    + Math.sin(t * Math.PI * 5.2 + 1.1) * layer.amp * 0.55
    + Math.sin(t * Math.PI * 11.0 + 0.4) * layer.amp * 0.18;
}

function hillRibbon(layer: HillLayer): THREE.Mesh {
  const seg = 72;
  const width = 110;
  const positions: number[] = [];
  const colors: number[] = [];
  const top = new THREE.Color(layer.color).lerp(new THREE.Color(layer.lift), 0.55);
  const bot = new THREE.Color(layer.color).multiplyScalar(0.62);
  const mix = new THREE.Color();
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg;
    const t1 = (i + 1) / seg;
    const x0 = -width / 2 + t0 * width;
    const x1 = -width / 2 + t1 * width;
    const h0 = crestHeight(layer, t0);
    const h1 = crestHeight(layer, t1);
    const yb = -3.4;
    const tri = (x: number, y: number, high: number) => {
      positions.push(x, y, 0);
      mix.copy(bot).lerp(top, high);
      colors.push(mix.r, mix.g, mix.b);
    };
    tri(x0, yb, 0);
    tri(x1, yb, 0);
    tri(x1, h1, 1);
    tri(x0, yb, 0);
    tri(x1, h1, 1);
    tri(x0, h0, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true }));
  mesh.position.set(0, layer.y, layer.z);
  return mesh;
}

function ridgeCover(parent: THREE.Object3D, layer: HillLayer, theme: SkyTheme): void {
  const count = layer.where === 'far' ? 18 : 14;
  const canopy = new THREE.Color(theme === 'party' ? '#ffb0d0' : theme === 'golden' ? '#e8a05a' : theme === 'orchard' ? '#6aaa3a' : '#2f8a40');
  if (layer.where === 'far') canopy.lerp(new THREE.Color('#d5e7f6'), layer.z < -36 ? 0.62 : 0.38);
  const mat = new THREE.MeshBasicMaterial({ color: canopy, fog: true });
  const trees = new THREE.InstancedMesh(GEO.sphere, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = -48 + t * 96;
    const h = crestHeight(layer, (x + 55) / 110);
    const s = (layer.where === 'far' ? 0.42 : layer.where === 'mid' ? 0.62 : 0.78) * (0.65 + (i % 4) * 0.16);
    dummy.position.set(x, layer.y + h + s * 0.15, layer.z + 0.35);
    dummy.scale.set(s * 1.3, s * (0.7 + (i % 3) * 0.15), s);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  }
  parent.add(trees);
  if (layer.where === 'near') scatterShelf(parent, theme, layer);
}

function scatterShelf(parent: THREE.Object3D, theme: SkyTheme, layer: HillLayer): void {
  const z = layer.z + 0.8;
  const ground = (x: number) => layer.y + crestHeight(layer, (x + 55) / 110);
  const fence = theme === 'party' ? '#fff1c4' : '#f3e2c4';
  for (let i = 0; i < 6; i++) {
    const x = -14 + i * 5.4;
    const y = ground(x);
    const post = new THREE.Mesh(GEO.box, toon(fence));
    post.scale.set(0.07, 0.42, 0.07);
    post.position.set(x, y + 0.2, z);
    const rail = new THREE.Mesh(GEO.box, toon(fence));
    rail.scale.set(2.2, 0.05, 0.05);
    rail.position.set(x + 1.1, y + 0.32, z);
    parent.add(post, rail);
  }
  const spots = [-11, -3.5, 5.5, 13, 19];
  spots.forEach((x, i) => {
    const y = ground(x);
    const rock = new THREE.Mesh(GEO.sphereSm, toon(i % 2 ? '#c4b4a4' : '#8d6a52'));
    rock.scale.set(0.28, 0.18, 0.22);
    rock.position.set(x, y + 0.08, z + 0.25);
    parent.add(rock);
    if (i % 2 === 0) {
      const cap = new THREE.Mesh(GEO.sphere, toon(i % 4 === 0 ? '#e23d4a' : '#f2c14a'));
      cap.scale.set(0.14, 0.08, 0.14);
      cap.position.set(x + 0.4, y + 0.1, z - 0.1);
      const stem = new THREE.Mesh(GEO.cyl, toon('#f7f1e4'));
      stem.scale.set(0.035, 0.14, 0.035);
      stem.position.set(x + 0.4, y + 0.02, z - 0.1);
      parent.add(cap, stem);
    }
  });
  for (const x of [-7.5, 10]) {
    const y = ground(x);
    const lamp = new THREE.Mesh(GEO.box, toon('#6e4124'));
    lamp.scale.set(0.06, 0.55, 0.06);
    lamp.position.set(x, y + 0.28, z + 0.35);
    const glow = new THREE.Mesh(GEO.sphere, toon('#ffe08a', '#fff1b0', 0.8));
    glow.scale.set(0.1, 0.1, 0.1);
    glow.position.set(x, y + 0.58, z + 0.35);
    parent.add(lamp, glow);
  }
  const fallX = -1.6;
  const fallY = ground(fallX);
  const fall = waterfall();
  fall.position.set(fallX, fallY - 0.15, z + 0.1);
  const pool = new THREE.Mesh(GEO.circle, toon(theme === 'party' ? '#ff9ec4' : '#3ec8c4'));
  pool.rotation.x = -Math.PI / 2;
  pool.scale.set(0.55, 0.28, 1);
  pool.position.set(fallX, fallY - 0.72, z + 0.35);
  const stream = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 0.16),
    new THREE.MeshBasicMaterial({
      color: theme === 'party' ? '#ffc0dc' : theme === 'golden' ? '#f0c48a' : '#8fd4ea',
      transparent: true,
      opacity: 0.88,
      fog: true,
    }),
  );
  stream.rotation.x = -Math.PI / 2;
  stream.position.set(4.2, ground(4.2) + 0.02, z + 0.2);
  parent.add(fall, pool, stream);
}

function waterfall(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float streak = 0.72 + 0.28 * sin(vUv.y * 7.0 - uTime * 3.4 + vUv.x * 5.0);
        float edge = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
        float fade = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.62, vUv.y);
        vec3 col = mix(vec3(0.45, 0.75, 0.92), vec3(0.94, 0.98, 1.0), streak);
        gl_FragColor = vec4(col, 0.5 * edge * fade);
        #include <colorspace_fragment>
      }
    `,
  });
  trackTime(material.uniforms.uTime as { value: number });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 1.15), material);
  return mesh;
}

function layHills(far: THREE.Group, mid: THREE.Group, theme: SkyTheme): void {
  for (const layer of hillPalette(theme)) {
    const band = hillRibbon(layer);
    const home = layer.where === 'far' ? far : mid;
    home.add(band);
    ridgeCover(home, layer, theme);
  }
  const peakMat = new THREE.MeshBasicMaterial({
    color: theme === 'party' ? '#e7d0f2' : theme === 'golden' ? '#f0d2b0' : '#d5e6ea',
  });
  for (let i = 0; i < 5; i++) {
    const group = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const peak = new THREE.Mesh(GEO.cone, peakMat);
      peak.scale.set(1.1 + k * 0.35, 1.6 + (2 - k) * 0.7, 0.3);
      peak.position.set((k - 1) * 0.7, k * 0.15, 0);
      group.add(peak);
    }
    group.position.set(-30 + i * 15, 1.55, -52);
    far.add(group);
  }
}

function dressHorizon(mid: THREE.Group, theme: SkyTheme): void {
  const fruit = theme === 'orchard' ? '#f0c14a' : theme === 'golden' ? '#e07a3a' : null;
  const spots = [-9.2, -5.6, -1.6, 2.6, 6.8, 10.4];
  const quiet = (obj: THREE.Object3D) => {
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = false;
    });
  };
  spots.forEach((x, i) => {
    if (i % 2 === 0) {
      const item = tree(0.58 + (i % 3) * 0.14, fruit);
      item.position.set(x, 0.02, -4.5);
      quiet(item);
      mid.add(item);
    } else {
      const shrub = bush(0.8 + (i % 3) * 0.2);
      shrub.position.set(x, 0, -4.05);
      quiet(shrub);
      mid.add(shrub);
      const stone = rock(0.65 + (i % 2) * 0.2);
      stone.position.set(x + 0.85, 0, -3.7);
      quiet(stone);
      mid.add(stone);
    }
  });
  const fall = waterfall();
  fall.scale.set(1.35, 1.7, 1);
  fall.position.set(0.6, 0.9, -4.15);
  const lamp = new THREE.Mesh(GEO.box, toon('#6e4124'));
  lamp.scale.set(0.07, 0.62, 0.07);
  lamp.position.set(4.4, 0.32, -3.85);
  const glow = new THREE.Mesh(GEO.sphere, toon('#ffe08a', '#fff1b0', 0.9));
  glow.scale.setScalar(0.11);
  glow.position.set(4.4, 0.7, -3.85);
  mid.add(fall, lamp, glow);
}

function frameLeaves(frame: THREE.Group, theme: SkyTheme): void {
  const mat = toon(theme === 'golden' ? '#e08a3a' : theme === 'party' ? '#ff8fb8' : '#3cb14a').clone();
  mat.map = leafTexture();
  mat.alphaTest = 0.35;
  mat.side = THREE.DoubleSide;
  mat.depthWrite = false;
  const spots: [number, number, number, number, number][] = [
    [-0.74, 0.62, 0.04, 0.7, 0.42],
    [0.78, 0.58, 0.02, -0.9, 0.46],
    [-0.8, -0.55, 0.04, 0.35, 0.36],
    [0.82, -0.52, 0.08, -0.4, 0.34],
  ];
  for (const [x, y, z, rot, s] of spots) {
    const leaf = new THREE.Mesh(GEO.plane, mat);
    leaf.scale.set(s * 0.72, s, 1);
    leaf.position.set(x, y, z);
    leaf.rotation.z = rot;
    frame.add(leaf);
  }
  const branch = new THREE.Mesh(GEO.cyl, toon('#6e4124'));
  branch.scale.set(0.02, 0.42, 0.02);
  branch.rotation.z = 1.2;
  branch.position.set(-0.92, 0.46, 0.08);
  frame.add(branch);
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
  for (const x of [-6.2, -3.6, -0.4, 2.6, 5.4]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.46), toon('#c4844a'));
    shelf.position.set(x, 1.85, -1.35);
    parent.add(shelf);
    const cheese = new THREE.Mesh(GEO.cyl, toon('#f0c14a', '#ffe08a', 0.15));
    cheese.scale.set(0.22, 0.12, 0.22);
    cheese.rotation.z = Math.PI / 2;
    cheese.position.set(x - 0.55, 2.02, -1.28);
    const hole = new THREE.Mesh(GEO.sphereSm, toon('#e0a040'));
    hole.scale.set(0.05, 0.05, 0.05);
    hole.position.set(x - 0.55, 2.02, -1.16);
    const loaf = new THREE.Mesh(GEO.sphere, toon('#e7b27a'));
    loaf.scale.set(0.18, 0.1, 0.14);
    loaf.position.set(x + 0.15, 1.98, -1.28);
    const pot = jar(x > 0 ? '#c9a6ff' : '#e07a5f');
    pot.position.set(x + 0.7, 1.95, -1.28);
    parent.add(cheese, hole, loaf, pot);
    const bunch = new THREE.Group();
    bunch.userData.role = 'sway';
    bunch.userData.amp = 0.08;
    const tie = new THREE.Mesh(GEO.sphereSm, toon('#f2c14a'));
    tie.scale.set(0.05, 0.05, 0.05);
    const herb = new THREE.Mesh(GEO.cone, toon(x % 2 ? '#2f8a38' : '#6aaa3a'));
    herb.scale.set(0.1, 0.32, 0.1);
    herb.position.y = -0.16;
    herb.rotation.z = Math.PI;
    bunch.add(tie, herb);
    bunch.position.set(x, 3.05, -1.25);
    parent.add(bunch);
  }
  for (const [x, y] of [[-5.6, 0.02], [-0.2, 0.88], [4.6, 0.02]] as const) {
    const light = candle();
    light.position.set(x, y, -1.08);
    parent.add(light);
  }
  for (const x of [-5.5, -1.5, 2.2, 6.1]) {
    const sack = new THREE.Mesh(GEO.sphere, toon('#e7d3b0'));
    sack.scale.set(0.28, 0.22, 0.22);
    sack.position.set(x, 0.28, -1.05);
    parent.add(sack);
  }
  const foreground = new THREE.Group();
  foreground.name = 'frame';
  const sprig = toon('#2f8a38').clone();
  sprig.side = THREE.DoubleSide;
  for (const [x, y, rot] of [[-0.86, 0.22, 0.6], [0.9, 0.34, -0.8], [-0.7, 0.5, 0.2]] as const) {
    const herb = new THREE.Mesh(GEO.cone, sprig);
    herb.scale.set(0.08, 0.28, 0.08);
    herb.position.set(x, y, 0.05);
    herb.rotation.z = Math.PI + rot;
    foreground.add(herb);
  }
  parent.add(foreground);
  for (let i = 0; i < 16; i++) {
    const mote = new THREE.Mesh(GEO.plane, basic('#ffe7b8', 0.55));
    mote.scale.setScalar(0.05 + (i % 3) * 0.02);
    mote.position.set(-7 + (i % 8) * 1.8, 1.2 + (i % 4) * 0.45, -0.8);
    mote.userData.role = 'dust';
    parent.add(mote);
  }
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
