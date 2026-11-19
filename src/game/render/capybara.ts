import * as THREE from 'three';
import { paintMaterial } from './painted';

export type Mood = 'idle' | 'happy' | 'sleep' | 'wow';
export type Form = 'capy' | 'legend';

const PX = 1.68 / 690;

function contactShadow(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const glow = ctx.createRadialGradient(32, 16, 2, 32, 16, 30);
    glow.addColorStop(0, 'rgba(20, 12, 6, 0.85)');
    glow.addColorStop(0.55, 'rgba(20, 12, 6, 0.35)');
    glow.addColorStop(1, 'rgba(20, 12, 6, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

const SHADOW = contactShadow();

const POSE = {
  idle: { file: 'characters/capy-idle.webp', w: 834, h: 690 },
  walk1: { file: 'characters/capy-walk-1.webp', w: 859, h: 683 },
  walk2: { file: 'characters/capy-walk-2.webp', w: 706, h: 683 },
  jump: { file: 'characters/capy-jump.webp', w: 685, h: 723 },
  joy: { file: 'characters/capy-joy.webp', w: 752, h: 807 },
  sleep: { file: 'characters/capy-sleep.webp', w: 926, h: 420 },
  plume: { file: 'characters/capyplume.webp', w: 926, h: 700 },
  legend: { file: 'characters/capydindon.webp', w: 928, h: 779 },
} as const;

type Pose = keyof typeof POSE;

export class Capybara {
  readonly root = new THREE.Group();
  stage: 0 | 1 = 0;
  featherGrow = 0;
  calm = false;
  private readonly form: Form;
  private readonly pose = new THREE.Group();
  private readonly card: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private readonly mats = new Map<Pose, THREE.MeshBasicMaterial>();
  private mood: Mood = 'idle';
  private facing: 1 | -1 = 1;
  private time = 0;
  private step = 0;
  private which = 0;
  private sq = 0;
  private sqv = 0;

  constructor(form: Form = 'capy') {
    this.form = form;
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: SHADOW, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }),
    );
    this.shadow.renderOrder = 3;
    this.shadow.position.set(0, 0.02, 0.02);
    this.shadow.scale.set(1.15, 0.32, 1);
    this.card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material('idle'));
    this.card.frustumCulled = false;
    this.card.renderOrder = 8;
    this.pose.add(this.card);
    this.root.add(this.shadow, this.pose);
    this.applyPose(form === 'legend' ? 'legend' : 'idle');
  }

  setMood(mood: Mood): void {
    this.mood = mood;
  }

  turn(dir: 1 | -1): void {
    this.facing = dir;
  }

  update(dt: number, motion: { speed: number; vy: number; grounded: boolean; landed: boolean }): void {
    this.time += dt;
    if (motion.landed && !this.calm) this.sqv = -7.5;
    const spring = this.calm ? 34 : 68;
    const damp = this.calm ? 12 : 10;
    this.sqv += (-spring * this.sq - damp * this.sqv) * dt;
    this.sq += this.sqv * dt;

    const evolved = this.form === 'legend' || this.stage === 1 || this.featherGrow >= 0.7;
    let pose: Pose;
    if (this.form === 'legend') pose = 'legend';
    else if (evolved) pose = 'plume';
    else if (this.mood === 'sleep') pose = 'sleep';
    else if (!motion.grounded) pose = 'jump';
    else if (this.mood === 'happy' || this.mood === 'wow') pose = 'joy';
    else if (motion.speed > 0.4) {
      this.step += dt;
      const rate = this.calm ? 0.26 : 0.15;
      if (this.step >= rate) {
        this.step %= rate;
        this.which = this.which === 0 ? 1 : 0;
      }
      pose = this.which === 0 ? 'walk1' : 'walk2';
    } else {
      this.step = 0;
      pose = 'idle';
    }
    this.applyPose(pose);

    let stretch = 0;
    if (!motion.grounded && pose === 'jump') stretch = Math.max(-0.07, Math.min(0.09, motion.vy * 0.008));
    const bob = this.calm || pose === 'sleep'
      ? 0
      : pose === 'walk1' || pose === 'walk2'
        ? Math.abs(Math.sin(this.time * 13)) * 0.045
        : Math.sin(this.time * 2.15) * (pose === 'joy' ? 0.04 : 0.018);
    this.pose.position.y = bob;
    this.pose.scale.set(this.facing * (1 - this.sq * 0.6 - stretch * 0.45), 1 + this.sq + stretch, 1);
    const wide = pose === 'sleep' ? 1.35 : pose === 'legend' ? 1.25 : 1;
    this.shadow.scale.set((motion.grounded ? 1.15 : 0.7) * wide, motion.grounded ? 0.32 : 0.18, 1);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = motion.grounded ? 0.9 : 0.35;
  }

  private applyPose(pose: Pose): void {
    const spec = POSE[pose];
    const h = spec.h * PX;
    const w = spec.w * PX;
    this.card.material = this.material(pose);
    this.card.scale.set(w, h, 1);
    this.card.position.set(0, h * 0.5, 0.08);
  }

  private material(pose: Pose): THREE.MeshBasicMaterial {
    const found = this.mats.get(pose);
    if (found) return found;
    const mat = paintMaterial(POSE[pose].file, true);
    mat.depthTest = true;
    this.mats.set(pose, mat);
    return mat;
  }
}

export function createLegend(): Capybara {
  const capy = new Capybara('legend');
  capy.stage = 1;
  capy.featherGrow = 1;
  capy.setMood('happy');
  return capy;
}
