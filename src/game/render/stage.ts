import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Profile } from '../quality';

export type Mood = 'day' | 'dusk' | 'night' | 'pantry' | 'party' | 'evolve';

const MOOD: Record<Mood, { top: string; bottom: string; fog: string; sky: string; ground: string; key: number; keyColor: string }> = {
  day: { top: '#67c4ff', bottom: '#ffe3c4', fog: '#d7ecff', sky: '#fff8ec', ground: '#7fbf6a', key: 1.35, keyColor: '#fff7ea' },
  dusk: { top: '#6c9fe0', bottom: '#ff8d6a', fog: '#f3b498', sky: '#ffe3c8', ground: '#c4846a', key: 1.15, keyColor: '#ffe0c2' },
  night: { top: '#24356b', bottom: '#e09a86', fog: '#6d5c92', sky: '#c5d0ff', ground: '#6a4a62', key: 0.9, keyColor: '#d5e2ff' },
  pantry: { top: '#322c49', bottom: '#4a3d55', fog: '#3d364c', sky: '#d9d4f4', ground: '#6e5142', key: 0.62, keyColor: '#d7e2ff' },
  party: { top: '#7ecbff', bottom: '#ff9ec4', fog: '#ffd0e4', sky: '#fff4d2', ground: '#f0a0c0', key: 1.3, keyColor: '#fff6df' },
  evolve: { top: '#f2c98a', bottom: '#ff8d62', fog: '#ffe0b4', sky: '#fff8e6', ground: '#e2b56d', key: 1.5, keyColor: '#fff1cf' },
};

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(26, 1, 0.1, 180);
  readonly root = new THREE.Group();
  readonly key: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly skyMat: THREE.ShaderMaterial;
  private readonly sky: THREE.Mesh;
  private focus = new THREE.Vector3(0, 1.3, 0);
  private distance = 11;
  private lookahead = 0;
  private shake = 0;
  private useBloom = true;
  private fixed: { x: number; y: number } | null = null;
  dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(this.root);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color('#8fd4ff') },
        uBottom: { value: new THREE.Color('#ffb089') },
      },
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vPos; uniform vec3 uTop; uniform vec3 uBottom; void main(){ float h = normalize(vPos).y; gl_FragColor = vec4(mix(uBottom, uTop, smoothstep(-0.02, 0.28, h)), 1.0); }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(80, 20, 16), this.skyMat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.addStars();
    this.hemi = new THREE.HemisphereLight('#fff6e4', '#8fbf72', 0.85);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight('#fff4e2', 1.28);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.near = 0.5;
    this.key.shadow.camera.far = 40;
    this.key.shadow.bias = -0.00025;
    this.key.shadow.normalBias = 0.04;
    this.scene.add(this.key, this.key.target);
    const fill = new THREE.DirectionalLight('#fff1dc', 0.35);
    fill.position.set(4, 3, 8);
    this.scene.add(fill);
    this.scene.fog = new THREE.Fog('#ffd3b0', 42, 96);
    const pass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.22, 0.42, 0.86);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(pass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.camera.position.set(0, 2.4, 11);
  }

  private addStars(): void {
    const count = 160;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const y = 8 + Math.random() * 40;
      const r = 30 + Math.random() * 40;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r - 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fffaf0', size: 0.18, sizeAttenuation: true, fog: false }));
    this.sky.add(stars);
  }

  applyProfile(profile: Profile): void {
    this.dpr = profile.dpr;
    this.useBloom = profile.bloom;
    this.bloom.strength = profile.bloomStrength;
    this.bloom.enabled = profile.bloom;
    this.key.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
    this.key.shadow.map?.dispose();
    this.key.shadow.map = null;
    this.resize();
  }

  mood(name: Mood): void {
    const mood = MOOD[name];
    (this.skyMat.uniforms.uTop.value as THREE.Color).set(mood.top);
    (this.skyMat.uniforms.uBottom.value as THREE.Color).set(mood.bottom);
    this.hemi.color.set(mood.sky);
    this.hemi.groundColor.set(mood.ground);
    this.key.color.set(mood.keyColor);
    this.key.intensity = mood.key;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(mood.fog);
  }

  follow(x: number, y: number, distance = 11, lookahead = 0): void {
    this.fixed = null;
    this.lookahead = lookahead;
    this.distance = distance;
    this.focus.x = x;
    this.focus.y = y;
  }

  hold(x: number, y: number, distance = 12): void {
    this.fixed = { x, y };
    this.distance = distance;
  }

  kick(amount: number, reduced: boolean): void {
    if (!reduced) this.shake = Math.min(0.25, this.shake + amount);
  }

  resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    if (width < 2 || height < 2) return;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(width, height);
    this.bloom.resolution.set(width, height);
  }

  render(dt: number, reduced: boolean): void {
    const goalX = (this.fixed?.x ?? this.focus.x) + this.lookahead;
    const goalY = (this.fixed?.y ?? this.focus.y) + 1.15;
    const damp = 1 - Math.exp(-4.5 * dt);
    this.camera.position.x += (goalX - this.camera.position.x) * damp;
    this.camera.position.y += (goalY + 0.35 - this.camera.position.y) * damp;
    this.camera.position.z = this.distance;
    this.shake = Math.max(0, this.shake - dt * 1.4);
    const jx = reduced ? 0 : (Math.random() - 0.5) * this.shake;
    const jy = reduced ? 0 : (Math.random() - 0.5) * this.shake;
    this.camera.lookAt(this.camera.position.x + jx, this.camera.position.y - 0.55 + jy, 0);
    this.sky.position.x = this.camera.position.x;
    this.sky.position.y = this.camera.position.y * 0.2;
    const ortho = this.key.shadow.camera as THREE.OrthographicCamera;
    ortho.left = -9;
    ortho.right = 9;
    ortho.top = 8;
    ortho.bottom = -6;
    ortho.updateProjectionMatrix();
    this.key.position.set(this.camera.position.x - 6, this.camera.position.y + 8, 8);
    this.key.target.position.set(this.camera.position.x, this.camera.position.y - 1, 0);
    this.key.target.updateMatrixWorld();
    if (this.useBloom) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  clear(): void {
    this.root.clear();
  }

  project(x: number, y: number, z = 0): { x: number; y: number } {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    const canvas = this.renderer.domElement;
    return {
      x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-v.y * 0.5 + 0.5) * canvas.clientHeight,
    };
  }
}
