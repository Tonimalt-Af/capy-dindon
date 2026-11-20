import * as THREE from 'three';
import {
  type ArtScene,
  ART_H,
  ART_W,
  FRAME,
  GRASS_FRAC,
  LAYER_BOUNDS,
  MID_DY,
  type PxRect,
  WALK_FRAC,
  fitFrame,
  groundSpanFor,
  imageCover,
  midOffsetY,
  planeCenterY,
  planeHeight,
  walkBounds,
} from './artLayout';

export type { ArtScene };

const STAGE_Z = 0;
const FEET_Z = 0.45;
const SINK = 0.24;
const _point = new THREE.Vector3();
const swayTime = { value: 0 };
const swayAmount = { value: 1 };

export function artUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}assets/art/${file}`;
}

const textures = new Map<string, THREE.Texture>();

export function paintTexture(file: string, mipmap = false): THREE.Texture {
  const url = artUrl(file);
  const key = `${url}|${mipmap ? 'm' : 's'}`;
  const cached = textures.get(key);
  if (cached) return cached;
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = mipmap;
  texture.minFilter = mipmap ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  // Planes face the camera, so anisotropy only multiplies software-GL taps.
  texture.anisotropy = 1;
  textures.set(key, texture);
  return texture;
}

function sway(material: THREE.MeshBasicMaterial): void {
  material.customProgramCacheKey = () => 'paint-sway';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = swayTime;
    shader.uniforms.uSway = swayAmount;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uSway;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         #ifdef USE_MAP
           float swayLift = smoothstep(0.5, 0.95, uv.y);
           vMapUv.x += sin(uv.y * 15.0 + uTime * 1.2 + uv.x * 7.0) * 0.0032 * uSway * swayLift;
           vMapUv.y += sin(uv.x * 8.0 + uTime * 0.7) * 0.0011 * uSway * swayLift;
         #endif`,
      );
  };
}

/**
 * One textured quad. MeshBasicMaterial's fragment shader is long enough that
 * SwiftShader spends most of a tablet frame inside it.
 */
function plateMaterial(file: string, transparent: boolean, opts?: { mipmap?: boolean; sway?: boolean }): THREE.ShaderMaterial {
  return texturedQuad(paintTexture(file, opts?.mipmap ?? false), transparent, opts?.sway ?? false);
}

function texturedQuad(map: THREE.Texture, transparent: boolean, swayOn: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uTime: swayTime,
      uSway: swayAmount,
      uSwayOn: { value: swayOn ? 1 : 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uSway;
      uniform float uSwayOn;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        if (uSwayOn > 0.5) {
          float lift = smoothstep(0.42, 0.58, uv.y) * (1.0 - smoothstep(0.74, 0.88, uv.y));
          vUv.x += sin(uv.y * 15.0 + uTime * 1.2 + uv.x * 7.0) * 0.0032 * uSway * lift;
          vUv.y += sin(uv.x * 8.0 + uTime * 0.7) * 0.0011 * uSway * lift;
        }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(map, vUv);
        ${transparent ? 'if (color.a < 0.04) discard;' : 'color.a = 1.0;'}
        gl_FragColor = color;
        #include <colorspace_fragment>
      }
    `,
    transparent,
    depthWrite: !transparent,
    depthTest: true,
    toneMapped: false,
  });
}

const WASH: Record<ArtScene, string> = {
  'camp-des-nuages': '#f0b07a',
  'iles-aux-glands': '#f4c48a',
  'garde-manger': '#c4894e',
  parade: '#f3d7b0',
  eveil: '#f6d48a',
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(url));
    image.src = url;
  });
}

/**
 * Sky, far, ground and mid stacked once. Sampling all four every pixel is what
 * kept the hub under a vsync on this GPU; the plate is one mipmapped draw.
 * Mid keeps the authored pixel shift. Foliage sway is a tiny UV wobble.
 */
function bakedPlate(scene: ArtScene, hasGround: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ART_W;
  canvas.height = ART_H;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = WASH[scene];
    ctx.fillRect(0, 0, ART_W, ART_H);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  const names = hasGround ? ['sky', 'far', 'ground', 'mid'] : ['sky', 'far', 'mid'];
  void Promise.all(names.map((name) => loadImage(artUrl(`scenes/${scene}/${name}.webp`)))).then((images) => {
    const draw = canvas.getContext('2d');
    if (!draw) return;
    images.forEach((image, index) => {
      const dy = names[index] === 'mid' ? MID_DY[scene] : 0;
      draw.drawImage(image, 0, dy);
    });
    texture.needsUpdate = true;
  });
  return texture;
}

function blobMaterial(
  map: THREE.Texture,
  opts: { color?: string; opacity?: number; additive?: boolean; depthTest?: boolean } = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uColor: { value: new THREE.Color(opts.color ?? '#ffffff') },
      uOpacity: { value: opts.opacity ?? 1 },
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
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(map, vUv);
        color.rgb *= uColor;
        color.a *= uOpacity;
        if (color.a < 0.02) discard;
        gl_FragColor = color;
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: opts.depthTest ?? true,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
}

export function paintMaterial(file: string, transparent: boolean, opts?: { mipmap?: boolean; sway?: boolean }): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    map: paintTexture(file, opts?.mipmap ?? false),
    transparent,
    depthWrite: !transparent,
    depthTest: true,
    toneMapped: false,
    premultipliedAlpha: false,
    fog: false,
    alphaTest: transparent ? 0.05 : 0,
    side: THREE.FrontSide,
  });
  if (opts?.sway) sway(material);
  return material;
}

export interface BackdropOptions {
  span: number;
  groundY?: number;
  centerX?: number;
  ground?: boolean;
  lockMid?: boolean;
  /** Extra floor below the plate so a tall view never shows the void. */
  apron?: number;
  apronColor?: string;
}

interface Layer {
  pivot: THREE.Group;
  kind: 'locked' | 'drift';
  factor: number;
  z: number;
  baseY: number;
}

interface Glow {
  mesh: THREE.Mesh;
  phase: number;
  base: number;
}

interface Mote {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  phase: number;
  radius: number;
}

const GLOWS: Partial<Record<ArtScene, { x: number; y: number; s: number }[]>> = {
  'camp-des-nuages': [
    { x: 623, y: 552, s: 1.5 },
    { x: 302, y: 332, s: 0.62 },
    { x: 368, y: 308, s: 0.52 },
    { x: 442, y: 386, s: 0.56 },
    { x: 486, y: 418, s: 0.5 },
    { x: 596, y: 446, s: 0.54 },
    { x: 744, y: 528, s: 0.46 },
  ],
  'garde-manger': [
    { x: 78, y: 392, s: 0.72 },
    { x: 118, y: 448, s: 0.48 },
  ],
};

const TINT: Record<ArtScene, { grass: string; cloud: string; mote: string }> = {
  'camp-des-nuages': { grass: '#6f8f34', cloud: '#fff4e2', mote: '#ffe7a4' },
  'iles-aux-glands': { grass: '#5f862c', cloud: '#fff6e8', mote: '#fff0b8' },
  'garde-manger': { grass: '#c4894e', cloud: '#f0d2a4', mote: '#ffd7a4' },
  parade: { grass: '#6d8c38', cloud: '#fff0f4', mote: '#ffd0e4' },
  eveil: { grass: '#d2a24a', cloud: '#ffe6b0', mote: '#ffe08a' },
};

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

let puffTexture: THREE.Texture | null = null;

function cloudTexture(): THREE.Texture {
  if (puffTexture) return puffTexture;
  puffTexture = canvasTexture(256, 128, (ctx) => {
    ctx.clearRect(0, 0, 256, 128);
    const blobs: [number, number, number, number][] = [[70, 70, 54, 0.55], [120, 62, 46, 0.5], [168, 74, 40, 0.42], [96, 78, 28, 0.35]];
    for (const [x, y, r, a] of blobs) {
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  return puffTexture;
}

function glowTexture(): THREE.Texture {
  return canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

/** Soft out-of-focus leaves along the bottom of the lens. No hard alpha cutoff. */
function foregroundTexture(pantry: boolean): THREE.Texture {
  return canvasTexture(256, 64, (ctx) => {
    ctx.clearRect(0, 0, 256, 64);
    const blobs: [number, number, number, string][] = pantry
      ? [
          [40, 50, 70, 'rgba(140,78,40,0.45)'],
          [128, 54, 90, 'rgba(110,58,30,0.5)'],
          [210, 48, 74, 'rgba(160,90,46,0.4)'],
        ]
      : [
          [28, 50, 48, 'rgba(42,88,34,0.5)'],
          [78, 42, 36, 'rgba(96,132,42,0.38)'],
          [130, 54, 54, 'rgba(34,74,28,0.55)'],
          [186, 40, 40, 'rgba(118,146,48,0.34)'],
          [232, 52, 46, 'rgba(48,92,32,0.48)'],
          [156, 34, 26, 'rgba(150,86,36,0.2)'],
        ];
    for (const [x, y, r, color] of blobs) {
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 64);
    }
  });
}

function apronTexture(color: string): THREE.Texture {
  return canvasTexture(8, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color);
    g.addColorStop(1, '#9a5a32');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 64);
  });
}

function trimmedGeometry(span: number, height: number, rect: PxRect): THREE.PlaneGeometry {
  const u0 = rect.x0 / ART_W;
  const u1 = rect.x1 / ART_W;
  const v1 = 1 - rect.y0 / ART_H;
  const v0 = 1 - rect.y1 / ART_H;
  const geo = new THREE.PlaneGeometry(span * (u1 - u0), height * ((rect.y1 - rect.y0) / ART_H));
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  return geo;
}

function trimOffset(span: number, height: number, rect: PxRect): { x: number; y: number } {
  const cx = (rect.x0 + rect.x1) / 2 / ART_W;
  const cy = (rect.y0 + rect.y1) / 2 / ART_H;
  return { x: (cx - 0.5) * span, y: (0.5 - cy) * height };
}

export class PaintedBackdrop {
  readonly group = new THREE.Group();
  readonly bounds: { left: number; right: number; center: number; width: number };
  private readonly span: number;
  private readonly centerX: number;
  private readonly groundY: number;
  private readonly scene: ArtScene;
  private readonly locked: boolean;
  private readonly layers: Layer[] = [];
  private readonly glows: Glow[] = [];
  private readonly motes: Mote[] = [];
  private readonly foreground: THREE.Mesh;
  private readonly clouds: THREE.Mesh[] = [];
  private readonly apronDrop: number;
  private time = 0;
  private still = false;

  constructor(scene: ArtScene, opts: BackdropOptions) {
    this.scene = scene;
    this.span = opts.span;
    this.centerX = opts.centerX ?? 0;
    const groundY = opts.groundY ?? 0;
    this.groundY = groundY;
    const showGround = opts.ground !== false;
    const lockMid = opts.lockMid ?? showGround;
    this.locked = showGround || lockMid;
    const height = planeHeight(opts.span);
    const centerY = planeCenterY(opts.span, groundY, GRASS_FRAC[scene]);
    const midY = centerY + midOffsetY(opts.span, MID_DY[scene]);
    this.bounds = walkBounds(scene, opts.span, this.centerX);
    this.apronDrop = opts.apron ? Math.max(0, opts.apron - 1.05) : 0;
    const tint = TINT[scene];

    const add = (y: number, kind: 'locked' | 'drift', factor: number, z: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(this.centerX, y, z);
      this.group.add(pivot);
      this.layers.push({ pivot, kind, factor, z, baseY: y });
      return pivot;
    };

    const ground = showGround ? add(centerY, 'locked', 1, STAGE_Z) : null;
    const mid = add(midY, lockMid ? 'locked' : 'drift', lockMid ? 1 : 0.58, lockMid ? STAGE_Z : -6.5);
    const plateAnchor = ground ?? add(centerY, 'locked', 1, STAGE_Z);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(opts.span, height),
      texturedQuad(bakedPlate(scene, showGround), false, scene !== 'garde-manger'),
    );
    plate.position.set(0, 0, 0);
    plate.renderOrder = -20;
    plate.frustumCulled = false;
    plateAnchor.add(plate);

    if (opts.apron && ground) {
      const apron = new THREE.Mesh(
        new THREE.PlaneGeometry(opts.span, opts.apron),
        blobMaterial(apronTexture(opts.apronColor ?? '#a86a3c'), { depthTest: false }),
      );
      apron.position.set(0, -height / 2 - opts.apron / 2 + 0.16, -0.5);
      apron.renderOrder = -22;
      ground.add(apron);
    }

    const glowMap = glowTexture();
    const spots = GLOWS[scene] ?? [];
    for (const spot of spots) {
      const mat = blobMaterial(glowMap, {
        color: scene === 'garde-manger' ? '#ffb15a' : '#ffc56a',
        additive: true,
        depthTest: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      const lx = (spot.x / ART_W - 0.5) * opts.span;
      const ly = (0.5 - spot.y / ART_H) * height;
      mesh.position.set(lx, ly, 0.18);
      mesh.scale.setScalar(spot.s);
      mesh.renderOrder = 2;
      mid.add(mesh);
      this.glows.push({ mesh, phase: spot.x * 0.01, base: spot.s });
    }

    // World-space puffs. Parenting them to the scaled sky plate blew one quad
    // up until its alpha edge sliced across the sun.
    // Éveil's sun fills the left sky. A puff there reads as a dark bite out of the glow.
    if (scene !== 'eveil') {
      const cloudMat = blobMaterial(cloudTexture(), { color: tint.cloud, opacity: 0.34, depthTest: false });
      for (let i = 0; i < 3; i++) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.82), cloudMat);
        mesh.renderOrder = -16;
        mesh.frustumCulled = false;
        plateAnchor.add(mesh);
        this.clouds.push(mesh);
      }
    }

    const moteCount = scene === 'garde-manger' ? 8 : 11;
    const moteMap = glowMap;
    for (let i = 0; i < moteCount; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        blobMaterial(moteMap, { color: tint.mote, opacity: 0.8, additive: true, depthTest: false }),
      );
      mesh.scale.setScalar(0.08 + (i % 3) * 0.03);
      mesh.renderOrder = 12;
      const origin = new THREE.Vector3((i - moteCount / 2) * 0.85, 0.8 + (i % 4) * 0.35, 0.7);
      mesh.position.copy(origin);
      this.group.add(mesh);
      this.motes.push({ mesh, origin, phase: i * 1.3, radius: 0.35 + (i % 3) * 0.15 });
    }

    this.foreground = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      blobMaterial(foregroundTexture(scene === 'garde-manger'), {
        opacity: scene === 'garde-manger' ? 0.26 : 0.4,
        depthTest: false,
      }),
    );
    this.foreground.renderOrder = 24;
    this.foreground.frustumCulled = false;
    this.group.add(this.foreground);
  }

  /** Camera x, focus y and distance that keep this plate covering the view. */
  place(aspect: number, focusX: number, focusY?: number): { x: number; y: number; distance: number } {
    const spec = FRAME[this.scene];
    const y = focusY ?? spec.focusY;
    const lookY = y + 0.78;
    const cover = this.locked ? imageCover(this.span, this.groundY, GRASS_FRAC[this.scene], this.centerX) : null;
    if (cover && this.apronDrop) cover.bottom -= this.apronDrop;
    const fit = fitFrame({
      aspect,
      want: spec.want,
      lookY,
      focusX: focusX + (focusY == null ? spec.bias : 0),
      cover,
      minDistance: this.scene === 'iles-aux-glands' ? 10.5 : 9.2,
      maxDistance: this.scene === 'iles-aux-glands' ? 15.5 : 19.5,
    });
    return { x: fit.x, y, distance: fit.distance };
  }

  sync(camera: THREE.PerspectiveCamera, dt = 0.016, still = false): void {
    this.time += still ? dt * 0.15 : dt;
    this.still = still;
    swayTime.value = this.time;
    swayAmount.value = still ? 0 : 1;
    const camX = camera.position.x;
    const lookY = camera.position.y - 0.42;
    const aspect = camera.aspect > 0 ? camera.aspect : 1.33;
    const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const shift = this.locked ? this.contactShift(camera) : 0;
    for (const layer of this.layers) {
      if (layer.kind === 'locked') {
        layer.pivot.position.x = this.centerX;
        layer.pivot.position.y = layer.baseY + shift;
        layer.pivot.scale.set(1, 1, 1);
        continue;
      }
      const dist = Math.max(1, camera.position.z - layer.z);
      const viewH = 2 * Math.tan(halfFov) * dist;
      const viewW = viewH * aspect;
      const margin = 1.12;
      const need = Math.max((viewW * margin) / this.span, (viewH * margin) / planeHeight(this.span), 1);
      layer.pivot.scale.set(need, need, 1);
      const follow = 1 - layer.factor;
      layer.pivot.position.x = this.centerX + (camX - this.centerX) * follow;
      layer.pivot.position.y = layer.baseY + (lookY - layer.baseY) * Math.min(0.72, follow);
    }
    const fgDist = Math.max(0.4, camera.position.z - 1.15);
    const fgH = 2 * Math.tan(halfFov) * fgDist;
    const fgW = fgH * aspect;
    const band = this.scene === 'garde-manger' ? 0.065 : 0.085;
    this.foreground.position.set(camX, lookY - fgH * 0.5 + fgH * band * 0.42, 1.15);
    this.foreground.scale.set(fgW * 1.15, fgH * band, 1);
    const height = planeHeight(this.span);
    this.clouds.forEach((cloud, i) => {
      const drift = this.still ? 0 : Math.sin(this.time * 0.07 + i * 1.7) * this.span * 0.04;
      const x0 = this.scene === 'eveil' ? 0.22 : -0.32;
      cloud.position.set((x0 + i * 0.28) * this.span + drift, height * 0.3, 0.55);
    });
    for (const glow of this.glows) {
      const pulse = this.still ? 1 : 0.86 + Math.sin(this.time * 7.5 + glow.phase) * 0.08 + Math.sin(this.time * 19 + glow.phase) * 0.04;
      glow.mesh.scale.setScalar(glow.base * pulse);
    }
    for (const mote of this.motes) {
      const wobble = this.still ? 0.2 : 1;
      mote.mesh.position.x = camX + mote.origin.x + Math.sin(this.time * 0.7 * wobble + mote.phase) * mote.radius;
      mote.mesh.position.y = this.groundY + mote.origin.y + Math.sin(this.time * 0.9 * wobble + mote.phase * 1.7) * 0.22;
    }
  }

  private contactShift(camera: THREE.PerspectiveCamera): number {
    camera.updateMatrixWorld();
    const row = (y: number, z: number) => {
      _point.set(this.centerX, y, z);
      return _point.project(camera).y;
    };
    const target = row(this.groundY, FEET_Z);
    const at = row(this.groundY, STAGE_Z);
    const step = row(this.groundY + 1, STAGE_Z) - at;
    const extra = this.scene === 'garde-manger' ? 0 : 0.85;
    if (Math.abs(step) < 1e-5) return SINK + extra;
    return (target - at) / step + SINK + extra;
  }
}

/** A painted island whose walkable grass is `walkWidth` wide and whose grass line is local y = `lift`. */
export function groundIsland(scene: ArtScene, walkWidth: number, lift = 0): THREE.Group {
  const span = groundSpanFor(scene, walkWidth);
  const height = planeHeight(span);
  const rect = LAYER_BOUNDS[scene].ground;
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    trimmedGeometry(span, height, rect),
    plateMaterial(`scenes/${scene}/ground.webp`, true, { mipmap: true }),
  );
  const off = trimOffset(span, height, rect);
  mesh.position.set(off.x, off.y, 0);
  mesh.renderOrder = -8;
  const walk = WALK_FRAC[scene];
  const mid = (walk.left + walk.right) / 2;
  const pivot = new THREE.Group();
  pivot.position.set(-(mid - 0.5) * span, lift - height * (0.5 - GRASS_FRAC[scene]), 0);
  pivot.add(mesh);
  group.add(pivot);
  return group;
}
