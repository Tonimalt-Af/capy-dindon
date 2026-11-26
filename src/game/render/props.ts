import * as THREE from 'three';
import { contactShadowMap, spriteQuad, type SpriteLight, SCENE_LIGHT } from './capybara';
import { paintTexture } from './painted';

/**
 * Painted gameplay props. Sizes are the world heights (or widths) from
 * public/assets/art/props/README.md. The group's origin is the sprite's feet,
 * so a scene can drop one on a floor without guessing the center.
 */
export type PropId =
  | 'crate'
  | 'plateUp'
  | 'plateDown'
  | 'gateClosed'
  | 'gateOpen'
  | 'pedestal'
  | 'feather'
  | 'acorn'
  | 'pumpkin'
  | 'pumpkinTrap'
  | 'turkeyIdle'
  | 'turkeyWalk1'
  | 'turkeyWalk2'
  | 'portalIdle'
  | 'portalOpen'
  | 'star'
  | 'babyIdle'
  | 'babySit'
  | 'lumi1'
  | 'lumi2'
  | 'mushroom'
  | 'mushroomSquash'
  | 'lanternOff'
  | 'lanternOn'
  | 'pumpkinA'
  | 'pumpkinB'
  | 'pumpkinC'
  | 'featherTemp'
  | 'hatchClosed'
  | 'hatchOpen'
  | 'shelf';

interface FrameSpec {
  file: string;
  w: number;
  h: number;
  height?: number;
  width?: number;
}

const FRAME: Record<PropId, FrameSpec> = {
  crate: { file: 'props/crate.webp', w: 779, h: 692, height: 0.88 },
  plateUp: { file: 'props/plate-up.webp', w: 958, h: 602, width: 1.2 },
  plateDown: { file: 'props/plate-pressed.webp', w: 967, h: 613, width: 1.2 },
  gateClosed: { file: 'props/gate-closed.webp', w: 590, h: 1045, height: 2.6 },
  gateOpen: { file: 'props/gate-open.webp', w: 596, h: 1057, height: 2.6 },
  pedestal: { file: 'props/pedestal.webp', w: 853, h: 519, height: 0.62 },
  feather: { file: 'props/feather.webp', w: 531, h: 946, height: 0.8 },
  acorn: { file: 'props/acorn-gold.webp', w: 658, h: 755, height: 0.35 },
  pumpkin: { file: 'props/pumpkin-normal.webp', w: 651, h: 609, height: 0.6 },
  pumpkinTrap: { file: 'props/pumpkin-trapped.webp', w: 649, h: 621, height: 0.6 },
  turkeyIdle: { file: 'props/turkey-idle.webp', w: 793, h: 876, height: 1.15 },
  turkeyWalk1: { file: 'props/turkey-walk-1.webp', w: 783, h: 827, height: 1.15 },
  turkeyWalk2: { file: 'props/turkey-walk-2.webp', w: 783, h: 833, height: 1.15 },
  portalIdle: { file: 'props/portal-idle.webp', w: 849, h: 1078, height: 1.6 },
  portalOpen: { file: 'props/portal-open.webp', w: 850, h: 1076, height: 1.6 },
  star: { file: 'props/star.webp', w: 730, h: 704, height: 0.45 },
  babyIdle: { file: 'phase1/characters/baby-capy-happy.webp', w: 776, h: 912, height: 0.85 },
  babySit: { file: 'phase1/characters/baby-capy-sleep.webp', w: 997, h: 533, height: 0.5 },
  lumi1: { file: 'phase1/characters/lumi-idle.webp', w: 647, h: 644, height: 0.42 },
  lumi2: { file: 'phase1/characters/lumi-sparkle.webp', w: 769, h: 776, height: 0.51 },
  mushroom: { file: 'phase1/props/mushroom-idle.webp', w: 812, h: 910, height: 1.1 },
  mushroomSquash: { file: 'phase1/props/mushroom-squashed.webp', w: 887, h: 667, height: 0.8 },
  lanternOff: { file: 'phase1/props/lantern-unlit.webp', w: 201, h: 877, height: 2 },
  lanternOn: { file: 'phase1/props/lantern-lit.webp', w: 248, h: 890, height: 2.03 },
  pumpkinA: { file: 'phase1/props/pumpkin-herd-small.webp', w: 933, h: 911, height: 0.5 },
  pumpkinB: { file: 'phase1/props/pumpkin-herd-medium.webp', w: 945, h: 930, height: 0.75 },
  pumpkinC: { file: 'phase1/props/pumpkin-herd-large.webp', w: 967, h: 925, height: 1.05 },
  featherTemp: { file: 'phase1/props/glide-feather.webp', w: 614, h: 1098, height: 0.7 },
  hatchClosed: { file: 'phase1/props/hatch-closed.webp', w: 967, h: 660, width: 1.6 },
  hatchOpen: { file: 'phase1/props/hatch-open.webp', w: 979, h: 928, width: 1.6 },
  shelf: { file: 'phase1/props/shelf-platform.webp', w: 1233, h: 513, width: 2.4 },
};

function worldSize(spec: FrameSpec): { w: number; h: number } {
  const aspect = spec.w / spec.h;
  if (spec.width) return { w: spec.width, h: spec.width / aspect };
  const h = spec.height ?? 1;
  return { w: h * aspect, h };
}

let sparkTexture: THREE.Texture | null = null;

function sparkMap(): THREE.Texture {
  if (sparkTexture) return sparkTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const glow = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    glow.addColorStop(0, 'rgba(255,255,255,0.9)');
    glow.addColorStop(0.45, 'rgba(255,255,255,0.28)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  sparkTexture = texture;
  return texture;
}

export class PropSprite {
  readonly root = new THREE.Group();
  readonly id: PropId;
  private readonly pose = new THREE.Group();
  private readonly card: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private readonly mats = new Map<PropId, THREE.ShaderMaterial>();
  private readonly tint = new THREE.Color();
  private readonly rim = new THREE.Color();
  private readonly side = { value: 1 };
  private spark: THREE.Mesh | null = null;
  private sparkOpacity: { value: number } | null = null;
  private frame: PropId;

  constructor(id: PropId, light: SpriteLight = SCENE_LIGHT.day) {
    this.id = id;
    this.frame = id;
    this.tint.set(light.tint);
    this.rim.set(light.rim);
    this.side.value = light.side;
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      spriteQuad(contactShadowMap(), {
        tint: light.shadow,
        opacity: { value: 0.62 },
        depthTest: false,
        discard: false,
      }),
    );
    this.shadow.renderOrder = 3;
    this.shadow.position.set(0, 0.012, -0.02);
    this.card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material(id));
    this.card.frustumCulled = false;
    this.card.renderOrder = 5;
    this.pose.add(this.card);
    this.root.add(this.shadow, this.pose);
    this.applyFrame(id);
  }

  /** World height of the current frame, including the transparent padding. */
  get height(): number {
    return worldSize(FRAME[this.frame]).h;
  }

  get width(): number {
    return worldSize(FRAME[this.frame]).w;
  }

  setFrame(id: PropId): void {
    if (this.frame === id) return;
    this.applyFrame(id);
  }

  /** Feet stay put. A small pop reads as squash, not a new silhouette. */
  squash(x: number, y: number): void {
    this.pose.scale.set(x, y, 1);
  }

  /** Soft gold pulse behind relics that already carry a painted aura. */
  sparkle(time: number, amount = 1): void {
    if (!this.spark) {
      this.sparkOpacity = { value: 0.55 };
      this.spark = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        spriteQuad(sparkMap(), {
          tint: '#ffe7a0',
          opacity: this.sparkOpacity,
          depthTest: false,
          discard: false,
        }),
      );
      this.spark.renderOrder = 4;
      this.spark.position.z = -0.03;
      this.pose.add(this.spark);
    }
    const size = worldSize(FRAME[this.frame]);
    const pulse = 0.94 + Math.sin(time * 4.2) * 0.06 * amount;
    this.spark.scale.set(size.w * 1.22 * pulse, size.h * 1.18 * pulse, 1);
    this.spark.position.y = size.h * 0.5;
    if (this.sparkOpacity) this.sparkOpacity.value = (0.28 + Math.sin(time * 5.1) * 0.08) * amount;
  }

  private applyFrame(id: PropId): void {
    this.frame = id;
    const size = worldSize(FRAME[id]);
    this.card.material = this.material(id);
    this.card.scale.set(size.w, size.h, 1);
    this.card.position.set(0, size.h * 0.5, 0.04);
    this.shadow.scale.set(Math.max(0.22, size.w * 0.58), Math.max(0.07, Math.min(0.22, size.h * 0.16)), 1);
  }

  private material(id: PropId): THREE.ShaderMaterial {
    const found = this.mats.get(id);
    if (found) return found;
    const mat = spriteQuad(paintTexture(FRAME[id].file), {
      tint: this.tint,
      rim: this.rim,
      side: this.side,
      depthTest: true,
      discard: true,
    });
    this.mats.set(id, mat);
    return mat;
  }
}

export function paintedProp(id: PropId, light: SpriteLight = SCENE_LIGHT.day): PropSprite {
  return new PropSprite(id, light);
}
