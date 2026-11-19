import * as THREE from 'three';
import {
  type ArtScene,
  GRASS_FRAC,
  MID_DY,
  WALK_FRAC,
  groundSpanFor,
  midOffsetY,
  planeCenterY,
  planeHeight,
  walkBounds,
} from './artLayout';

export type { ArtScene };

const ORDER = { sky: -30, far: -20, ground: -10, mid: -4 } as const;
/** Locked ground and mid share this depth so the authored dy stays registered. */
const STAGE_Z = 0;
/** Character card depth the grass line is matched to, in screen space. */
const FEET_Z = 0.45;
/** Extra lift so the toes sit in the paint instead of on its mathematical line. */
const SINK = 0.16;
const _point = new THREE.Vector3();

export function artUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}assets/art/${file}`;
}

const textures = new Map<string, THREE.Texture>();

export function paintTexture(file: string): THREE.Texture {
  const url = artUrl(file);
  const cached = textures.get(url);
  if (cached) return cached;
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 1;
  textures.set(url, texture);
  return texture;
}

export function paintMaterial(file: string, transparent: boolean): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: paintTexture(file),
    transparent,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    premultipliedAlpha: true,
    alphaTest: transparent ? 0.02 : 0,
    side: THREE.DoubleSide,
  });
}

export interface BackdropOptions {
  span: number;
  /** World y of the painted grass or floor line. */
  groundY?: number;
  centerX?: number;
  /** Draw the ground layer. Off when each platform carries its own island. */
  ground?: boolean;
  /** Keep the mid layer glued to the ground. Off for a drifting backdrop. */
  lockMid?: boolean;
}

interface Layer {
  mesh: THREE.Mesh;
  kind: 'locked' | 'drift';
  factor: number;
  z: number;
  baseY: number;
}

export class PaintedBackdrop {
  readonly group = new THREE.Group();
  readonly bounds: { left: number; right: number; center: number; width: number };
  private readonly span: number;
  private readonly centerX: number;
  private readonly groundY: number;
  private readonly layers: Layer[] = [];

  constructor(scene: ArtScene, opts: BackdropOptions) {
    this.span = opts.span;
    this.centerX = opts.centerX ?? 0;
    const groundY = opts.groundY ?? 0;
    this.groundY = groundY;
    const showGround = opts.ground !== false;
    const lockMid = opts.lockMid ?? showGround;
    const height = planeHeight(opts.span);
    const centerY = planeCenterY(opts.span, groundY, GRASS_FRAC[scene]);
    const midY = centerY + midOffsetY(opts.span, MID_DY[scene]);
    this.bounds = walkBounds(scene, opts.span, this.centerX);
    const z = { sky: -28, far: -14, ground: STAGE_Z, mid: lockMid ? STAGE_Z : -6.5 };

    const add = (name: 'sky' | 'far' | 'ground' | 'mid', y: number, kind: 'locked' | 'drift', factor: number) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(opts.span, height), paintMaterial(`scenes/${scene}/${name}.webp`, name !== 'sky'));
      mesh.position.set(this.centerX, y, z[name]);
      mesh.renderOrder = ORDER[name];
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.layers.push({ mesh, kind, factor, z: z[name], baseY: y });
    };

    add('sky', centerY, 'drift', 0.16);
    add('far', centerY, 'drift', 0.4);
    if (showGround) add('ground', centerY, 'locked', 1);
    add('mid', midY, lockMid ? 'locked' : 'drift', lockMid ? 1 : 0.58);
  }

  sync(camera: THREE.PerspectiveCamera): void {
    const camX = camera.position.x;
    const lookY = camera.position.y - 0.42;
    const aspect = camera.aspect > 0 ? camera.aspect : 1.33;
    const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const shift = this.contactShift(camera);
    for (const layer of this.layers) {
      if (layer.kind === 'locked') {
        layer.mesh.position.x = this.centerX;
        layer.mesh.position.y = layer.baseY + shift;
        layer.mesh.scale.set(1, 1, 1);
        continue;
      }
      const dist = Math.max(1, camera.position.z - layer.z);
      const viewH = 2 * Math.tan(halfFov) * dist;
      const viewW = viewH * aspect;
      const margin = 1.16;
      const need = Math.max((viewW * margin) / this.span, (viewH * margin) / planeHeight(this.span), 1);
      layer.mesh.scale.set(need, need, 1);
      const follow = 1 - layer.factor;
      layer.mesh.position.x = this.centerX + (camX - this.centerX) * follow;
      layer.mesh.position.y = layer.baseY + (lookY - layer.baseY) * Math.min(0.72, follow);
    }
  }

  /** Move the stage card so its grass row shares the character's screen row. */
  private contactShift(camera: THREE.PerspectiveCamera): number {
    camera.updateMatrixWorld();
    const row = (y: number, z: number) => {
      _point.set(this.centerX, y, z);
      return _point.project(camera).y;
    };
    const target = row(this.groundY, FEET_Z);
    const at = row(this.groundY, STAGE_Z);
    const step = row(this.groundY + 1, STAGE_Z) - at;
    if (Math.abs(step) < 1e-5) return SINK;
    return (target - at) / step + SINK;
  }
}

/** A painted island whose walkable grass is `walkWidth` wide and whose grass line is local y = `lift`. */
export function groundIsland(scene: ArtScene, walkWidth: number, lift = 0): THREE.Group {
  const span = groundSpanFor(scene, walkWidth);
  const height = planeHeight(span);
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(span, height), paintMaterial(`scenes/${scene}/ground.webp`, true));
  const walk = WALK_FRAC[scene];
  const mid = (walk.left + walk.right) / 2;
  mesh.position.set(-(mid - 0.5) * span, lift - height * (0.5 - GRASS_FRAC[scene]), 0);
  mesh.renderOrder = -8;
  mesh.frustumCulled = false;
  group.add(mesh);
  return group;
}
