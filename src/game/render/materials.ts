import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const gradient = new THREE.DataTexture(new Uint8Array([148, 148, 148, 255, 214, 214, 214, 255, 255, 255, 255, 255]), 3, 1);
gradient.magFilter = THREE.NearestFilter;
gradient.minFilter = THREE.NearestFilter;
gradient.colorSpace = THREE.NoColorSpace;
gradient.needsUpdate = true;

const cache = new Map<string, THREE.MeshToonMaterial>();

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
  cache.set(key, material);
  return material;
}

export const GEO = {
  sphere: new THREE.SphereGeometry(1, 28, 20),
  sphereSm: new THREE.SphereGeometry(1, 14, 10),
  box: new RoundedBoxGeometry(1, 1, 1, 2, 0.12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 8),
  torus: new THREE.TorusGeometry(1, 0.18, 8, 18),
  plane: new THREE.PlaneGeometry(1, 1),
  circle: new THREE.CircleGeometry(1, 20),
};

export function softCircle(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function paintTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

export function woodTexture(): THREE.CanvasTexture {
  return paintTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#e4b27a';
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#d39a62' : '#efc492';
      ctx.fillRect(0, i * 22, 256, 20);
      ctx.fillStyle = 'rgba(110, 62, 28, 0.18)';
      ctx.fillRect(0, i * 22 + 18, 256, 4);
    }
    ctx.fillStyle = 'rgba(120, 70, 30, 0.28)';
    ctx.beginPath();
    ctx.ellipse(48, 36, 10, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(180, 78, 12, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }, 2, 1);
}

export function paperTexture(): THREE.CanvasTexture {
  return paintTexture(128, 256, (ctx) => {
    ctx.fillStyle = '#f4d7c2';
    ctx.fillRect(0, 0, 128, 256);
    for (let x = 0; x < 128; x += 32) {
      ctx.fillStyle = x % 64 === 0 ? '#f7e3d2' : '#e7c3aa';
      ctx.fillRect(x, 0, 32, 256);
    }
    ctx.fillStyle = '#d98b74';
    for (let y = 20; y < 256; y += 36) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(32, y + 10);
      ctx.lineTo(20, y + 20);
      ctx.fill();
    }
  }, 2, 1);
}

export function basic(color: string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
}

export const OUTLINE = new THREE.MeshBasicMaterial({ color: '#6a3b28', side: THREE.BackSide });
