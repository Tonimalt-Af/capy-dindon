import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const gradient = new THREE.DataTexture(
  new Uint8Array([
    36, 42, 58, 255,
    108, 102, 96, 255,
    206, 198, 186, 255,
    255, 255, 255, 255,
  ]),
  4,
  1,
);
gradient.magFilter = THREE.NearestFilter;
gradient.minFilter = THREE.NearestFilter;
gradient.colorSpace = THREE.NoColorSpace;
gradient.needsUpdate = true;

const cache = new Map<string, THREE.MeshToonMaterial>();
const clocks: { value: number }[] = [];

function rimLight(shader: { fragmentShader: string }): void {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    `float rimDot = max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
     outgoingLight += vec3(1.0, 0.9, 0.72) * pow(1.0 - rimDot, 2.5) * 0.42;
     #include <opaque_fragment>`,
  );
}

export function toon(color: string, emissive = '#000000', intensity = 0): THREE.MeshToonMaterial {
  const key = `${color}|${emissive}|${intensity}`;
  const found = cache.get(key);
  if (found) return found;
  const material = new THREE.MeshToonMaterial({
    color,
    gradientMap: gradient,
    emissive,
    emissiveIntensity: intensity,
  });
  material.onBeforeCompile = (shader) => rimLight(shader);
  cache.set(key, material);
  return material;
}

export function trackTime(uniform: { value: number }): void {
  clocks.push(uniform);
}

export function tickShaders(time: number): void {
  for (const clock of clocks) clock.value = time;
}

export const GEO = {
  sphere: new THREE.SphereGeometry(1, 28, 20),
  sphereSm: new THREE.SphereGeometry(1, 12, 10),
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.08),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  taper: new THREE.CylinderGeometry(0.62, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 8),
  torus: new THREE.TorusGeometry(1, 0.18, 8, 18),
  plane: new THREE.PlaneGeometry(1, 1),
  feather: new THREE.PlaneGeometry(0.46, 1),
  blade: new THREE.PlaneGeometry(0.08, 0.34, 1, 3),
  circle: new THREE.CircleGeometry(1, 20),
  torso: new RoundedBoxGeometry(0.86, 0.5, 0.62, 4, 0.14),
  skull: new RoundedBoxGeometry(0.36, 0.36, 0.44, 4, 0.1),
  snout: new RoundedBoxGeometry(0.28, 0.16, 0.3, 3, 0.035),
  foot: new RoundedBoxGeometry(0.16, 0.065, 0.14, 2, 0.02),
};

GEO.blade.translate(0, 0.17, 0);

export function softCircle(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function paintTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function cloneMap(base: THREE.CanvasTexture, rx: number, ry: number): THREE.CanvasTexture {
  const map = base.clone();
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(rx, ry);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

let grassBase: THREE.CanvasTexture | null = null;
let cliffBase: THREE.CanvasTexture | null = null;
let woodBase: THREE.CanvasTexture | null = null;
let paperBase: THREE.CanvasTexture | null = null;
let barkBase: THREE.CanvasTexture | null = null;
let wallBase: THREE.CanvasTexture | null = null;
let plankBase: THREE.CanvasTexture | null = null;
let featherBase: THREE.CanvasTexture | null = null;
let leafBase: THREE.CanvasTexture | null = null;

function grassBaseTex(): THREE.CanvasTexture {
  grassBase ??= paintTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#2f9a3e';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.strokeStyle = i % 3 === 0 ? '#1f7a32' : i % 3 === 1 ? '#7ed85a' : '#46b84a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 2, y - 8, x + (i % 2 ? 3 : -2), y - 14);
      ctx.stroke();
    }
    const dots: [string, number][] = [['#ff8fb3', 18], ['#ffe08a', 16], ['#fffaf2', 14], ['#c9a6ff', 8]];
    for (const [color, n] of dots) {
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 256, 1.6 + Math.random() * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  return grassBase;
}

export function grassMap(rx = 2, ry = 2): THREE.CanvasTexture {
  return cloneMap(grassBaseTex(), rx, ry);
}

export function cliffMap(rx = 1, ry = 1): THREE.CanvasTexture {
  cliffBase ??= paintTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#c4844a';
    ctx.fillRect(0, 0, 256, 256);
    const bands = ['#a86832', '#d39658', '#8d552c', '#e0a86a', '#b87540'];
    let y = 0;
    for (let i = 0; i < 9; i++) {
      const h = 18 + (i % 3) * 8;
      ctx.fillStyle = bands[i % bands.length];
      ctx.fillRect(0, y, 256, h);
      ctx.fillStyle = 'rgba(70, 36, 16, 0.18)';
      ctx.fillRect(0, y + h - 4, 256, 4);
      y += h;
    }
    ctx.fillStyle = '#3f9a46';
    for (let i = 0; i < 26; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 36, 8 + Math.random() * 16, 4);
    }
    ctx.fillStyle = 'rgba(90, 50, 24, 0.35)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 256, 40 + Math.random() * 200, 4 + Math.random() * 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  return cloneMap(cliffBase, rx, ry);
}

export function woodTexture(): THREE.CanvasTexture {
  woodBase ??= paintTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#e7b27a';
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? '#d09658' : '#f0c48e';
      ctx.fillRect(0, i * 18, 256, 16);
      ctx.strokeStyle = 'rgba(120, 64, 28, 0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, i * 18 + 8);
      ctx.bezierCurveTo(60, i * 18 + 2, 140, i * 18 + 14, 256, i * 18 + 6);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(110, 62, 28, 0.32)';
    ctx.beginPath();
    ctx.ellipse(48, 36, 10, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(180, 78, 12, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  return woodBase;
}

export function paperTexture(): THREE.CanvasTexture {
  paperBase ??= paintTexture(128, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, '#6a3058');
    g.addColorStop(0.5, '#8a4468');
    g.addColorStop(1, '#5c284c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = 'rgba(255, 214, 170, 0.08)';
    for (let y = 0; y < 256; y += 8) ctx.fillRect(0, y, 128, 2);
    ctx.strokeStyle = 'rgba(255, 220, 180, 0.16)';
    ctx.lineWidth = 2;
    for (let y = 24; y < 256; y += 48) {
      ctx.beginPath();
      ctx.arc(64, y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  return paperBase;
}

export function barkTexture(): THREE.CanvasTexture {
  barkBase ??= paintTexture(128, 256, (ctx) => {
    ctx.fillStyle = '#8a542c';
    ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = '#5c3418';
    ctx.lineWidth = 3;
    for (let x = 8; x < 128; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 6, 80, x - 8, 160, x + 2, 256);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(60, 32, 14, 0.35)';
    for (let i = 0; i < 20; i++) ctx.fillRect(Math.random() * 128, Math.random() * 256, 10, 3);
  });
  return barkBase;
}

export function wallTexture(): THREE.CanvasTexture {
  wallBase ??= paintTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#3a2848';
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = x % 64 === 0 ? '#4a3058' : '#2e203c';
      ctx.fillRect(x, 0, 32, 256);
    }
    ctx.fillStyle = 'rgba(232, 196, 140, 0.05)';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
  });
  return wallBase;
}

export function plankTexture(): THREE.CanvasTexture {
  plankBase ??= paintTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#a86b3c';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? '#c4844e' : '#8d552c';
      ctx.fillRect(0, y, 256, 30);
      ctx.fillStyle = 'rgba(50, 24, 10, 0.35)';
      ctx.fillRect(0, y + 28, 256, 4);
      ctx.fillStyle = 'rgba(90, 48, 20, 0.25)';
      ctx.beginPath();
      ctx.ellipse(40 + (y % 80), y + 14, 8, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  return plankBase;
}

export function featherTexture(): THREE.CanvasTexture {
  if (featherBase) return featherBase;
  featherBase = paintTexture(128, 256, (ctx) => {
    ctx.clearRect(0, 0, 128, 256);
    const vane = ctx.createLinearGradient(0, 0, 128, 256);
    vane.addColorStop(0, '#fff6d4');
    vane.addColorStop(0.45, '#ffe08a');
    vane.addColorStop(1, '#f0a04a');
    ctx.fillStyle = vane;
    ctx.beginPath();
    ctx.moveTo(64, 6);
    ctx.bezierCurveTo(122, 70, 108, 180, 70, 248);
    ctx.quadraticCurveTo(64, 230, 58, 248);
    ctx.bezierCurveTo(20, 180, 6, 70, 64, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 78, 24, 0.45)';
    ctx.lineWidth = 1;
    for (let y = 28; y < 236; y += 7) {
      const w = 18 + Math.sin(y * 0.05) * 28;
      ctx.beginPath();
      ctx.moveTo(64, y);
      ctx.lineTo(64 + w, y + 10);
      ctx.moveTo(64, y);
      ctx.lineTo(64 - w, y + 10);
      ctx.stroke();
    }
    ctx.strokeStyle = '#a85a28';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(64, 12);
    ctx.lineTo(64, 250);
    ctx.stroke();
  });
  featherBase.format = THREE.RGBAFormat;
  return featherBase;
}

export function leafTexture(): THREE.CanvasTexture {
  leafBase ??= paintTexture(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#3cb14a';
    ctx.beginPath();
    ctx.ellipse(64, 64, 28, 54, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7ed86a';
    ctx.beginPath();
    ctx.ellipse(52, 58, 12, 28, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1f6e32';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(64, 14);
    ctx.lineTo(64, 116);
    ctx.stroke();
  });
  return leafBase;
}

const featherMats = new Map<string, THREE.MeshToonMaterial>();

export function featherMaterial(color: string, glow = 0.35): THREE.MeshToonMaterial {
  const key = `${color}|${glow}`;
  const found = featherMats.get(key);
  if (found) return found;
  const material = toon('#ffffff', color, glow).clone();
  material.map = featherTexture();
  material.color.set(color);
  material.alphaTest = 0.45;
  material.side = THREE.DoubleSide;
  featherMats.set(key, material);
  return material;
}

export function waterMaterial(color: string, deep: string): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uDeep: { value: new THREE.Color(deep) },
      uFog: { value: new THREE.Color('#b9dcff') },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec3 p = position;
        float w = sin(p.x * 1.7 + uTime * 1.4) * 0.045 + cos(p.y * 1.3 + uTime) * 0.03;
        p.z += w;
        vWave = w;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uDeep;
      uniform vec3 uFog;
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;
      varying vec3 vWorld;
      void main() {
        float spark = smoothstep(0.92, 1.0, sin(vUv.x * 46.0 + uTime * 2.2) * sin(vUv.y * 22.0 - uTime * 1.4));
        vec3 col = mix(uDeep, uColor, clamp(vUv.y + vWave * 2.0, 0.0, 1.0));
        col += vec3(0.85, 0.95, 1.0) * spark * 0.55;
        float dist = distance(vWorld, cameraPosition);
        col = mix(col, uFog, smoothstep(18.0, 70.0, dist));
        gl_FragColor = vec4(col, 0.9);
      }
    `,
  });
  trackTime(material.uniforms.uTime);
  waters.push(material);
  return material;
}

const waters: THREE.ShaderMaterial[] = [];

export function setShaderFog(color: string): void {
  for (const material of waters) material.uniforms.uFog.value.set(color);
}

export function basic(color: string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide,
  });
}

export const OUTLINE = new THREE.MeshBasicMaterial({ color: '#3f2416', side: THREE.BackSide });

export const GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    uSat: { value: 1.24 },
    uContrast: { value: 1.07 },
    uLift: { value: 0.015 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSat;
    uniform float uContrast;
    uniform float uLift;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, uSat);
      c.rgb = (c.rgb - 0.5) * uContrast + 0.5 + uLift;
      c.rgb += vec3(0.018, 0.006, -0.008);
      gl_FragColor = vec4(c.rgb, c.a);
    }
  `,
};
