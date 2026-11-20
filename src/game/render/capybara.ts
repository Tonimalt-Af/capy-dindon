import * as THREE from 'three';
import { paintTexture } from './painted';

export type Mood = 'idle' | 'happy' | 'sleep' | 'wow';
export type Form = 'capy' | 'legend';

export interface SpriteLight {
  tint: string;
  rim: string;
  side: 1 | -1;
  shadow: string;
}

export const SCENE_LIGHT: Record<'day' | 'pantry' | 'party' | 'evolve', SpriteLight> = {
  day: { tint: '#fff3e6', rim: '#ffb15f', side: 1, shadow: '#163012' },
  pantry: { tint: '#ffe4c8', rim: '#ff9a42', side: -1, shadow: '#241008' },
  party: { tint: '#fff5f2', rim: '#ffb4c8', side: 1, shadow: '#1e3014' },
  evolve: { tint: '#ffe8c4', rim: '#ffc56a', side: -1, shadow: '#3d2410' },
};

/** Walk frames pass through idle so the body volume does not pulse. */
export const WALK_CYCLE = ['walk1', 'idle', 'walk2', 'idle'] as const;
export const WALK_BODY = { walk1: 0.985, idle: 1, walk2: 1.12 } as const;

const PX = 1.68 / 690;

function contactShadow(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const glow = ctx.createRadialGradient(64, 32, 4, 64, 34, 60);
    glow.addColorStop(0, 'rgba(255,255,255,0.55)');
    glow.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 128, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function spriteQuad(
  map: THREE.Texture,
  opts: {
    tint: THREE.Color | string;
    rim?: THREE.Color;
    side?: { value: number };
    opacity?: { value: number };
    depthTest: boolean;
    discard: boolean;
  },
): THREE.ShaderMaterial {
  const tint = opts.tint instanceof THREE.Color ? opts.tint : new THREE.Color(opts.tint);
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uTint: { value: tint },
      uRim: { value: opts.rim ?? new THREE.Color('#000000') },
      uSide: opts.side ?? { value: 0 },
      uOpacity: opts.opacity ?? { value: 1 },
      uRimOn: { value: opts.rim ? 1 : 0 },
      uDiscard: { value: opts.discard ? 1 : 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec3 uTint;
      uniform vec3 uRim;
      uniform float uSide;
      uniform float uOpacity;
      uniform float uRimOn;
      uniform float uDiscard;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(map, vUv);
        color.a *= uOpacity;
        if (uDiscard > 0.5 && color.a < 0.04) discard;
        float rim = 0.0;
        if (uRimOn > 0.5) {
          float sideA = texture2D(map, vUv + vec2(0.012 * uSide, 0.0015)).a;
          rim = clamp(color.a - sideA, 0.0, 1.0);
          float foot = smoothstep(0.22, 0.0, vUv.y);
          color.rgb *= mix(1.0, 0.78, foot);
        }
        color.rgb *= uTint;
        color.rgb += uRim * rim * 0.28;
        gl_FragColor = color;
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: opts.depthTest,
    toneMapped: false,
  });
}

let shadowTexture: THREE.Texture | null = null;

function shadowMap(): THREE.Texture {
  shadowTexture ??= contactShadow();
  return shadowTexture;
}

const POSE = {
  idle: { file: 'characters/capy-idle.webp', w: 834, h: 690, foot: 16 },
  walk1: { file: 'characters/capy-walk-1.webp', w: 859, h: 683, foot: 17 },
  walk2: { file: 'characters/capy-walk-2.webp', w: 706, h: 683, foot: 17 },
  jump: { file: 'characters/capy-jump.webp', w: 685, h: 723, foot: 16 },
  joy: { file: 'characters/capy-joy.webp', w: 752, h: 807, foot: 17 },
  sleep: { file: 'characters/capy-sleep.webp', w: 926, h: 420, foot: 18 },
  plume: { file: 'characters/capyplume.webp', w: 926, h: 700, foot: 17 },
  legend: { file: 'characters/capydindon.webp', w: 928, h: 779, foot: 18 },
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
  private readonly mats = new Map<Pose, THREE.ShaderMaterial>();
  private readonly shadowOpacity: { value: number };
  private mood: Mood = 'idle';
  private facing: 1 | -1 = 1;
  private time = 0;
  private step = 0;
  private which = 0;
  private sq = 0;
  private sqv = 0;
  private body = 1;
  private light: SpriteLight = SCENE_LIGHT.day;
  private readonly tint = new THREE.Color(SCENE_LIGHT.day.tint);
  private readonly rim = new THREE.Color(SCENE_LIGHT.day.rim);

  constructor(form: Form = 'capy') {
    this.form = form;
    this.shadowOpacity = { value: 0.72 };
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      spriteQuad(shadowMap(), {
        tint: this.light.shadow,
        opacity: this.shadowOpacity,
        depthTest: false,
        discard: false,
      }),
    );
    this.shadow.renderOrder = 3;
    this.shadow.position.set(0, 0.015, 0.02);
    this.shadow.scale.set(1.55, 0.28, 1);
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

  setLight(light: SpriteLight): void {
    this.light = light;
    this.tint.set(light.tint);
    this.rim.set(light.rim);
    ((this.shadow.material as THREE.ShaderMaterial).uniforms.uTint.value as THREE.Color).set(light.shadow);
    for (const mat of this.mats.values()) this.pushLight(mat);
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
      const rate = this.calm ? 0.22 : 0.11;
      if (this.step >= rate) {
        this.step %= rate;
        this.which = (this.which + 1) % WALK_CYCLE.length;
      }
      pose = WALK_CYCLE[this.which] ?? 'walk1';
    } else {
      this.step = 0;
      this.which = 0;
      pose = 'idle';
    }
    this.applyPose(pose);
    const bodyTarget = pose === 'walk1' || pose === 'walk2' || pose === 'idle' ? WALK_BODY[pose] : 1;
    this.body += (bodyTarget - this.body) * Math.min(1, dt * 9);

    let stretch = 0;
    if (!motion.grounded && pose === 'jump') stretch = Math.max(-0.07, Math.min(0.09, motion.vy * 0.008));
    const walking = pose === 'walk1' || pose === 'walk2' || (pose === 'idle' && motion.speed > 0.4);
    const bob = this.calm || pose === 'sleep'
      ? 0
      : walking
        ? Math.sin(this.time * 10.5) * 0.028
        : Math.sin(this.time * 2.15) * (pose === 'joy' ? 0.04 : 0.018);
    this.pose.position.y = bob;
    const grown = this.body;
    this.pose.scale.set(this.facing * grown * (1 - this.sq * 0.6 - stretch * 0.45), grown * (1 + this.sq + stretch), 1);
    for (const mat of this.mats.values()) {
      const side = mat.userData.side as { value: number } | undefined;
      if (side) side.value = this.facing * this.light.side;
    }
    const wide = pose === 'sleep' ? 1.35 : pose === 'legend' ? 1.2 : 1;
    this.shadow.scale.set((motion.grounded ? 1.65 : 0.85) * wide, motion.grounded ? 0.26 : 0.14, 1);
    this.shadowOpacity.value = motion.grounded ? 0.72 : 0.28;
  }

  private applyPose(pose: Pose): void {
    const spec = POSE[pose];
    const h = spec.h * PX;
    const w = spec.w * PX;
    this.card.material = this.material(pose);
    this.card.scale.set(w, h, 1);
    const foot = (spec.foot / spec.h) * h;
    this.card.position.set(0, h * 0.5 - foot, 0.08);
  }

  private material(pose: Pose): THREE.ShaderMaterial {
    const found = this.mats.get(pose);
    if (found) return found;
    const side = { value: this.facing * this.light.side };
    const mat = spriteQuad(paintTexture(POSE[pose].file), {
      tint: this.tint,
      rim: this.rim,
      side,
      depthTest: true,
      discard: true,
    });
    mat.userData.side = side;
    this.mats.set(pose, mat);
    return mat;
  }

  private pushLight(mat: THREE.ShaderMaterial): void {
    const side = mat.userData.side as { value: number } | undefined;
    if (side) side.value = this.facing * this.light.side;
  }
}

export function createLegend(): Capybara {
  const capy = new Capybara('legend');
  capy.stage = 1;
  capy.featherGrow = 1;
  capy.setMood('happy');
  return capy;
}
