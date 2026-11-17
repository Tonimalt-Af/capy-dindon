import * as THREE from 'three';
import { GEO, OUTLINE, toon } from './materials';

export type Mood = 'idle' | 'happy' | 'sleep' | 'wow';

export class Capybara {
  readonly root = new THREE.Group();
  stage: 0 | 1 = 0;
  featherGrow = 0;
  private readonly bob = new THREE.Group();
  private readonly face = new THREE.Group();
  private readonly legs: { pivot: THREE.Group; phase: number }[] = [];
  private readonly eyes: THREE.Object3D[] = [];
  private readonly smile: THREE.Object3D;
  private readonly oh: THREE.Object3D;
  private readonly plumage: THREE.Group;
  private readonly wattle: THREE.Object3D;
  private readonly shadow: THREE.Mesh;
  private mood: Mood = 'idle';
  private facing: 1 | -1 = 1;
  private time = 0;
  private blink = 1;
  private nextBlink = 2.2;
  private squash = 0;

  constructor() {
    this.root.add(this.bob);
    this.part('#c6864a', -0.02, 0.46, 0, [0.4, 0.3, 0.34], true);
    this.part('#f6d7b4', 0.08, 0.38, 0.16, [0.22, 0.16, 0.12], false);
    this.face.position.set(0.46, 0.7, 0.02);
    this.bob.add(this.face);
    this.part('#d39a62', 0, 0.02, 0, [0.24, 0.22, 0.22], true, this.face);
    this.part('#e8bc96', 0.2, -0.04, 0.04, [0.14, 0.1, 0.12], true, this.face);
    this.part('#5c3d32', 0.32, -0.01, 0.06, [0.055, 0.045, 0.045], false, this.face);
    this.part('#f2a3a3', 0.02, -0.06, 0.16, [0.07, 0.045, 0.04], false, this.face, 0.8);
    const ear = this.part('#c6864a', -0.02, 0.22, 0.06, [0.08, 0.11, 0.05], true, this.face);
    ear.rotation.z = -0.4;
    const earFar = this.part('#b87543', -0.04, 0.18, -0.08, [0.06, 0.08, 0.04], false, this.face);
    earFar.rotation.z = 0.5;
    this.eyes.push(this.eye(0.06, 0.06, 0.18, 1.35));
    this.smile = this.mouth();
    this.oh = new THREE.Mesh(GEO.sphereSm, toon('#5c3d32'));
    this.oh.scale.set(0.045, 0.05, 0.03);
    this.oh.position.set(0.28, -0.08, 0.08);
    this.oh.visible = false;
    this.face.add(this.oh);
    this.wattle = new THREE.Mesh(GEO.sphereSm, toon('#e85d4c'));
    this.wattle.scale.set(0.05, 0.07, 0.04);
    this.wattle.position.set(0.22, -0.14, 0.06);
    this.face.add(this.wattle);
    this.leg(0.16, 0.28, 0.14, 0);
    this.leg(0.16, 0.28, -0.1, Math.PI);
    this.leg(-0.2, 0.26, 0.12, Math.PI);
    this.leg(-0.2, 0.26, -0.1, 0);
    this.part('#a86b3c', -0.38, 0.42, 0, [0.07, 0.06, 0.06], false);
    this.plumage = this.feathers();
    this.bob.add(this.plumage);
    this.shadow = new THREE.Mesh(GEO.circle, new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.shadow.scale.set(0.55, 0.55, 1);
    this.root.add(this.shadow);
  }

  private part(color: string, x: number, y: number, z: number, scale: [number, number, number], outline: boolean, parent: THREE.Object3D = this.bob, opacity = 1): THREE.Mesh {
    const material = opacity < 1 ? toon(color).clone() : toon(color);
    if (opacity < 1) {
      material.transparent = true;
      material.opacity = opacity;
      material.depthWrite = false;
    }
    const mesh = new THREE.Mesh(GEO.sphere, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = outline;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (outline) {
      const rim = new THREE.Mesh(GEO.sphere, OUTLINE);
      rim.position.copy(mesh.position);
      rim.scale.set(scale[0] * 1.045, scale[1] * 1.045, scale[2] * 1.045);
      rim.castShadow = false;
      parent.add(rim);
    }
    return mesh;
  }

  private eye(x: number, y: number, z: number, s = 1): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const white = new THREE.Mesh(GEO.sphere, toon('#fffaf4'));
    white.scale.set(0.09 * s, 0.1 * s, 0.05);
    const pupil = new THREE.Mesh(GEO.sphere, toon('#2b211c'));
    pupil.scale.set(0.045 * s, 0.05 * s, 0.03);
    pupil.position.set(0.015, -0.005, 0.03);
    const glint = new THREE.Mesh(GEO.sphere, toon('#ffffff'));
    glint.scale.set(0.022, 0.022, 0.015);
    glint.position.set(-0.02, 0.025, 0.04);
    group.add(white, pupil, glint);
    this.face.add(group);
    return group;
  }

  private mouth(): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 10, Math.PI), toon('#5c3d32'));
    mesh.rotation.z = Math.PI;
    mesh.rotation.y = 0.3;
    mesh.position.set(0.26, -0.08, 0.1);
    this.face.add(mesh);
    return mesh;
  }

  private leg(x: number, y: number, z: number, phase: number): void {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const upper = new THREE.Mesh(GEO.sphere, toon('#b87543'));
    upper.scale.set(0.09, 0.14, 0.09);
    upper.position.y = -0.1;
    upper.castShadow = true;
    const foot = new THREE.Mesh(GEO.sphere, toon('#8d5a38'));
    foot.scale.set(0.1, 0.05, 0.12);
    foot.position.set(0.03, -0.24, 0);
    pivot.add(upper, foot);
    this.bob.add(pivot);
    this.legs.push({ pivot, phase });
  }

  private feathers(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(-0.42, 0.58, 0);
    const colors = ['#f2c14e', '#fff1c9', '#e07a3d', '#c9843a', '#ffe08a'];
    colors.forEach((color, i) => {
      const feather = new THREE.Mesh(GEO.sphere, toon(color, '#ffd56a', 0.25));
      feather.scale.set(0.06, 0.28, 0.02);
      feather.position.y = 0.18;
      const pivot = new THREE.Group();
      pivot.rotation.z = -0.7 + i * 0.32;
      pivot.position.z = (i - 2) * 0.02;
      pivot.add(feather);
      group.add(pivot);
    });
    return group;
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
    this.face.rotation.y = this.facing === 1 ? 0 : Math.PI;
    if (motion.landed) this.squash = 0.22;
    this.squash = Math.max(0, this.squash - dt * 1.3);
    const air = THREE.MathUtils.clamp(motion.vy * 0.012, -0.12, 0.16);
    const breathe = this.mood === 'sleep' ? Math.sin(this.time * 1.4) * 0.02 : Math.sin(this.time * 2) * 0.012;
    const moving = motion.grounded && motion.speed > 0.35;
    const freq = 7 + motion.speed;
    this.bob.position.y = moving ? Math.abs(Math.sin(this.time * freq)) * 0.045 : 0;
    const stretch = breathe + (moving ? 0 : air) - this.squash;
    this.bob.scale.set(1 - stretch * 0.45, 1 + stretch, 1 - stretch * 0.2);
    this.legs.forEach((leg) => {
      const swing = moving ? Math.sin(this.time * freq + leg.phase) * 0.55 : Math.sin(this.time * 1.5 + leg.phase) * 0.04;
      leg.pivot.rotation.z = motion.grounded ? swing : 0.4;
    });
    this.nextBlink -= dt;
    if (this.nextBlink <= 0 && this.mood !== 'sleep') {
      this.blink = 0;
      this.nextBlink = 2.2 + Math.random() * 2.4;
    }
    this.blink = Math.min(1, this.blink + dt * 8);
    const shut = this.mood === 'sleep' ? 0.08 : this.mood === 'happy' ? 0.42 : this.mood === 'wow' ? 1.15 : 1;
    this.eyes.forEach((eye) => eye.scale.set(1, Math.max(0.08, shut * (0.15 + 0.85 * this.blink)), 1));
    this.smile.visible = this.mood !== 'wow' && this.mood !== 'sleep';
    this.smile.scale.setScalar(this.mood === 'happy' ? 1.25 : 1);
    this.oh.visible = this.mood === 'wow';
    const grow = this.stage === 1 ? 1 : this.featherGrow;
    this.plumage.scale.setScalar(0.15 + grow * 0.85);
    this.plumage.visible = grow > 0.02;
    this.wattle.scale.set(0.06 * grow, 0.09 * grow, 0.05 * grow);
    this.shadow.scale.setScalar(motion.grounded ? 0.55 : 0.32);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = motion.grounded ? 0.22 : 0.1;
  }
}
