import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { basic, featherMaterial, GEO, OUTLINE, softCircle, toon } from './materials';

const barrel = new THREE.SphereGeometry(1, 32, 22);
const headBox = new RoundedBoxGeometry(0.32, 0.34, 0.4, 5, 0.105);
const muzzleBox = new RoundedBoxGeometry(0.2, 0.17, 0.3, 3, 0.06);

export type Mood = 'idle' | 'happy' | 'sleep' | 'wow';
export type Form = 'capy' | 'legend';

const PLUMES = ['#f6c453', '#fff3c4', '#e36b32', '#ffe08a', '#c84b3a', '#fffaf0', '#f0a04a'];

interface Leg {
  pivot: THREE.Group;
  phase: number;
  front: boolean;
}

export class Capybara {
  readonly root = new THREE.Group();
  stage: 0 | 1 = 0;
  featherGrow = 0;
  calm = false;
  private readonly form: Form;
  private readonly bob = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly legs: Leg[] = [];
  private readonly eyes: THREE.Object3D[] = [];
  private readonly pupils: THREE.Object3D[] = [];
  private readonly brows: THREE.Object3D[] = [];
  private readonly ears: THREE.Object3D[] = [];
  private readonly smile: THREE.Object3D[] = [];
  private readonly sleepMouth: THREE.Object3D[] = [];
  private readonly oh: THREE.Object3D[] = [];
  private readonly blush: THREE.Mesh[] = [];
  private readonly plumage: THREE.Group;
  private readonly crest: THREE.Group;
  private readonly wattle: THREE.Object3D;
  private readonly shadow: THREE.Mesh;
  private mood: Mood = 'idle';
  private facing: 1 | -1 = 1;
  private plumeTilt = 0.42;
  private time = 0;
  private blink = 1;
  private nextBlink = 2.4;
  private sq = 0;
  private sqv = 0;

  constructor(form: Form = 'capy') {
    this.form = form;
    this.root.add(this.bob);
    this.body();
    this.head.position.set(0.32, 0.64, 0);
    this.bob.add(this.head);
    this.buildHead();
    this.leg(0.1, 0.3, 0.12, 0, true);
    this.leg(0.1, 0.3, -0.12, Math.PI, true);
    this.leg(-0.28, 0.28, 0.12, Math.PI, false);
    this.leg(-0.28, 0.28, -0.12, 0, false);
    const legendary = form === 'legend';
    this.plumeTilt = legendary ? 0.18 : 0.48;
    this.plumage = new THREE.Group();
    this.plumage.add(this.fan(legendary ? 13 : 8, legendary ? 1.42 : 0.82, legendary ? 2.65 : 1.9, legendary ? 0.5 : 0.18));
    if (legendary) {
      const under = this.fan(9, 1.02, 2.15, 0.28);
      under.position.z = 0.05;
      under.rotation.z = -0.2;
      this.plumage.add(under);
    }
    this.plumage.position.set(-0.38, 0.54, 0);
    this.bob.add(this.plumage);
    this.crest = this.fan(legendary ? 5 : 3, legendary ? 0.52 : 0.22, legendary ? 1.15 : 0.85, 0.4);
    this.crest.position.set(-0.02, 0.2, 0);
    this.crest.rotation.z = -0.2;
    this.head.add(this.crest);
    this.wattle = new THREE.Mesh(GEO.sphereSm, toon('#e23d32', '#ff6a4a', 0.25));
    this.wattle.scale.set(0.055, 0.09, 0.045);
    this.wattle.position.set(0.22, -0.16, 0.05);
    this.head.add(this.wattle);
    const blob = new THREE.Mesh(
      GEO.circle,
      new THREE.MeshBasicMaterial({ map: softCircle(), color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.025;
    blob.scale.set(0.58, 0.72, 1);
    this.shadow = blob;
    this.root.add(blob);
  }

  private body(): void {
    this.part(barrel, '#c4783a', this.bob, -0.12, 0.4, 0, [0.4, 0.24, 0.3], true);
    this.part(GEO.sphere, '#f6d7b0', this.bob, -0.02, 0.26, 0, [0.24, 0.08, 0.18], false);
    this.part(GEO.sphere, '#8d4e28', this.bob, -0.14, 0.6, 0, [0.28, 0.05, 0.16], false);
    const tail = new THREE.Mesh(GEO.sphereSm, toon('#a8642e'));
    tail.scale.set(0.05, 0.04, 0.04);
    tail.position.set(-0.52, 0.44, 0);
    tail.name = 'nub';
    this.bob.add(tail);
  }

  private buildHead(): void {
    this.part(headBox, '#d4924e', this.head, 0, 0, 0, [1, 1, 1], true);
    this.part(muzzleBox, '#f3d2b0', this.head, 0.2, -0.07, 0, [1, 1, 1], true);
    this.part(GEO.sphereSm, '#4a2e24', this.head, 0.31, -0.06, 0, [0.045, 0.05, 0.09], false);
    for (const side of [1, -1]) {
      const nostril = new THREE.Mesh(GEO.sphereSm, basic('#3a2418'));
      nostril.scale.set(0.028, 0.022, 0.02);
      nostril.position.set(0.26, -0.07, side * 0.08);
      this.head.add(nostril);
      this.eye(0.0, 0.07, side * 0.185, 1);
      this.brow(0.0, 0.16, side * 0.19, side);
      this.ear(-0.08, 0.2, side * 0.09, side);
      const smile = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 10, Math.PI * 0.7), basic('#4a2e24'));
      smile.rotation.z = Math.PI;
      smile.rotation.y = side > 0 ? 0.15 : -0.15;
      smile.position.set(0.1, -0.05, side * 0.185);
      this.head.add(smile);
      this.smile.push(smile);
      const sleep = new THREE.Mesh(GEO.box, basic('#4a2e24'));
      sleep.scale.set(0.1, 0.012, 0.012);
      sleep.position.set(0.12, -0.06, side * 0.185);
      sleep.visible = false;
      this.head.add(sleep);
      this.sleepMouth.push(sleep);
      const oh = new THREE.Mesh(GEO.sphereSm, basic('#3a2418'));
      oh.scale.set(0.045, 0.055, 0.03);
      oh.position.set(0.16, -0.07, side * 0.16);
      oh.visible = false;
      this.head.add(oh);
      this.oh.push(oh);
      const blush = new THREE.Mesh(GEO.sphereSm, basic('#f2a0a8'));
      blush.scale.set(0.055, 0.035, 0.02);
      blush.position.set(0.02, -0.02, side * 0.19);
      const mat = blush.material as THREE.MeshBasicMaterial;
      mat.transparent = true;
      mat.opacity = 0.35;
      this.head.add(blush);
      this.blush.push(blush);
    }
  }

  private eye(x: number, y: number, z: number, s: number): void {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const sign = Math.sign(z || 1);
    const white = new THREE.Mesh(GEO.sphere, basic('#fffaf6'));
    white.scale.set(0.072 * s, 0.08 * s, 0.04);
    const iris = new THREE.Mesh(GEO.sphere, basic('#6a432c'));
    iris.scale.set(0.046 * s, 0.052 * s, 0.026);
    iris.position.set(0.01, -0.006, 0.028 * sign);
    const pupil = new THREE.Mesh(GEO.sphere, basic('#1a120e'));
    pupil.scale.set(0.026 * s, 0.032 * s, 0.018);
    pupil.position.set(0.016, -0.008, 0.038 * sign);
    const glint = new THREE.Mesh(GEO.sphere, basic('#ffffff'));
    glint.scale.set(0.02, 0.02, 0.012);
    glint.position.set(-0.02, 0.028, 0.046 * sign);
    group.add(white, iris, pupil, glint);
    this.head.add(group);
    this.eyes.push(group);
    this.pupils.push(pupil);
  }

  private brow(x: number, y: number, z: number, side: number): void {
    const brow = new THREE.Mesh(GEO.box, basic('#5c3a28'));
    brow.scale.set(0.07, 0.018, 0.02);
    brow.position.set(x, y, z);
    brow.rotation.z = side * 0.15;
    this.head.add(brow);
    this.brows.push(brow);
  }

  private ear(x: number, y: number, z: number, side: number): void {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const ear = new THREE.Mesh(GEO.sphere, toon('#c4783a'));
    ear.scale.set(0.05, 0.065, 0.032);
    const inner = new THREE.Mesh(GEO.sphere, toon('#e7a090'));
    inner.scale.set(0.028, 0.038, 0.018);
    inner.position.set(0.01, -0.01, side * 0.012);
    pivot.add(ear, inner);
    pivot.rotation.z = side > 0 ? -0.45 : 0.5;
    this.head.add(pivot);
    this.ears.push(pivot);
  }

  private leg(x: number, y: number, z: number, phase: number, front: boolean): void {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const upper = new THREE.Mesh(GEO.sphere, toon('#b56a32'));
    upper.scale.set(0.1, 0.12, 0.1);
    upper.position.y = -0.07;
    const shin = new THREE.Mesh(GEO.sphere, toon('#a8642e'));
    shin.scale.set(0.07, 0.09, 0.07);
    shin.position.y = -0.16;
    const foot = new THREE.Mesh(GEO.foot, toon('#8d5430'));
    foot.position.set(0.02, -0.25, 0);
    foot.scale.set(1.15, 1, 1.1);
    const toe = new THREE.Mesh(GEO.sphereSm, toon('#6e4124'));
    toe.scale.set(0.028, 0.018, 0.022);
    toe.position.set(0.08, -0.26, 0.02);
    pivot.add(upper, shin, foot, toe);
    this.bob.add(pivot);
    this.legs.push({ pivot, phase, front });
  }

  private fan(count: number, length: number, spread: number, glow: number): THREE.Group {
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const color = PLUMES[i % PLUMES.length];
      const card = new THREE.Mesh(GEO.feather, featherMaterial(color, glow));
      const h = length * (0.72 + Math.sin(t * Math.PI) * 0.5);
      card.scale.set(h * 0.62, h, 1);
      card.position.y = h * 0.48;
      const vane = new THREE.Mesh(GEO.sphere, toon(color, color, glow * 0.35));
      vane.scale.set(h * 0.09, h * 0.46, 0.03);
      vane.position.set(0, h * 0.42, -0.02);
      const pivot = new THREE.Group();
      pivot.rotation.z = -spread / 2 + t * spread;
      pivot.rotation.y = (t - 0.5) * 0.35;
      pivot.position.z = (t - 0.5) * 0.05;
      pivot.add(vane, card);
      group.add(pivot);
    }
    return group;
  }

  private part(
    geo: THREE.BufferGeometry,
    color: string,
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    scale: [number, number, number],
    outline: boolean,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, toon(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = outline;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (outline) {
      const rim = new THREE.Mesh(geo, OUTLINE);
      rim.position.copy(mesh.position);
      rim.scale.set(scale[0] * 1.035, scale[1] * 1.035, scale[2] * 1.035);
      rim.castShadow = false;
      parent.add(rim);
    }
    return mesh;
  }

  setMood(mood: Mood): void {
    this.mood = mood;
  }

  turn(dir: 1 | -1): void {
    this.facing = dir;
  }

  update(dt: number, motion: { speed: number; vy: number; grounded: boolean; landed: boolean }): void {
    this.time += dt;
    this.root.rotation.y = this.facing === 1 ? 0 : Math.PI;
    if (motion.landed && !this.calm) this.sqv = -9.5;
    const spring = this.calm ? 36 : 72;
    const damp = this.calm ? 14 : 10.5;
    this.sqv += (-spring * this.sq - damp * this.sqv) * dt;
    this.sq += this.sqv * dt;
    const airborne = !motion.grounded;
    const stretch = airborne ? THREE.MathUtils.clamp(motion.vy * 0.011, -0.08, 0.16) : 0;
    const moving = motion.grounded && motion.speed > 0.35;
    const breathe = Math.sin(this.time * (this.mood === 'sleep' ? 1.25 : 2.15)) * (this.mood === 'sleep' ? 0.028 : 0.012);
    let hop = 0;
    if (this.mood === 'happy' && motion.grounded && !moving && !this.calm) {
      const cycle = this.time % 1.28;
      if (cycle < 0.26) hop = Math.sin((cycle / 0.26) * Math.PI) * 0.11;
    }
    const freq = 8.2 + motion.speed * 0.65;
    const bob = moving && !this.calm ? Math.abs(Math.sin(this.time * freq)) * 0.055 : 0;
    this.bob.position.y = (this.mood === 'sleep' ? -0.03 : 0) + bob + hop;
    const sy = 1 + breathe + stretch * 0.85 + this.sq * 0.045 + hop * 0.35;
    const sx = 1 - (sy - 1) * 0.45;
    this.bob.scale.set(Math.max(0.82, sx), Math.max(0.82, sy), Math.max(0.86, 1 - (sy - 1) * 0.25));
    this.legs.forEach((leg) => {
      if (!motion.grounded) leg.pivot.rotation.z = leg.front ? -0.7 : 0.55;
      else if (moving && !this.calm) leg.pivot.rotation.z = Math.sin(this.time * freq + leg.phase) * 0.72;
      else leg.pivot.rotation.z = Math.sin(this.time * 1.5 + leg.phase) * 0.035;
    });
    const nod = this.mood === 'sleep'
      ? -0.32
      : this.mood === 'wow'
        ? 0.14
        : moving
          ? Math.sin(this.time * freq) * -0.06
          : Math.sin(this.time * 1.15) * 0.035;
    this.head.rotation.z = nod;
    const ear = moving && !this.calm ? Math.sin(this.time * freq) * 0.22 : this.mood === 'wow' ? -0.35 : 0;
    this.ears.forEach((item, i) => {
      const base = i === 0 ? -0.45 : 0.5;
      item.rotation.z = base + ear * (i === 0 ? 1 : -1);
    });
    this.nextBlink -= dt;
    if (this.nextBlink <= 0 && this.mood !== 'sleep') {
      this.blink = 0;
      this.nextBlink = 2.1 + Math.random() * 2.6;
    }
    this.blink = Math.min(1, this.blink + dt * (this.calm ? 4 : 9));
    const open = this.mood === 'sleep' ? 0.08 : this.mood === 'happy' ? 0.42 : this.mood === 'wow' ? 1.12 : 0.55;
    const lid = Math.max(0.07, open * (0.14 + 0.86 * this.blink));
    this.eyes.forEach((eye) => eye.scale.set(1, lid, 1));
    this.pupils.forEach((pupil) => {
      pupil.position.x = 0.02 + Math.sin(this.time * 0.7) * 0.004;
    });
    this.brows.forEach((brow, i) => {
      const lift = this.mood === 'wow' ? -0.45 : this.mood === 'happy' ? 0.35 : this.mood === 'sleep' ? 0.55 : 0.08;
      brow.rotation.z = (i === 0 ? 0.2 : -0.2) + lift;
    });
    const calmFace = this.mood !== 'wow' && this.mood !== 'sleep';
    this.smile.forEach((smile) => {
      smile.visible = calmFace;
      smile.scale.setScalar(this.mood === 'happy' ? 1.28 : 0.92);
    });
    this.sleepMouth.forEach((mouth) => {
      mouth.visible = this.mood === 'sleep';
    });
    this.oh.forEach((mouth) => {
      mouth.visible = this.mood === 'wow';
    });
    const blush = this.mood === 'happy' ? 0.9 : this.mood === 'wow' ? 0.55 : 0.28;
    this.blush.forEach((cheek) => {
      (cheek.material as THREE.MeshBasicMaterial).opacity = blush;
    });
    const grow = this.form === 'legend' ? 1 : this.stage === 1 ? 1 : this.featherGrow;
    const shown = Math.max(0, Math.min(1, grow));
    this.plumage.visible = shown > 0.02;
    this.crest.visible = shown > 0.08;
    this.plumage.scale.setScalar(0.2 + shown * 0.8);
    this.crest.scale.setScalar(0.2 + shown * 0.8);
    const sway = this.calm ? 0 : Math.sin(this.time * 2.1) * 0.05 * shown;
    this.plumage.rotation.z = this.plumeTilt + sway;
    this.wattle.scale.set(0.05 * shown, 0.09 * shown, 0.045 * shown);
    this.wattle.visible = shown > 0.05;
    const nub = this.bob.getObjectByName('nub');
    if (nub) nub.visible = shown < 0.4;
    const grounded = motion.grounded;
    this.shadow.scale.set(grounded ? 0.62 : 0.38, grounded ? 0.78 : 0.46, 1);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = grounded ? 0.3 : 0.12;
  }
}

export function createLegend(): Capybara {
  const capy = new Capybara('legend');
  capy.stage = 1;
  capy.featherGrow = 1;
  capy.setMood('happy');
  return capy;
}
