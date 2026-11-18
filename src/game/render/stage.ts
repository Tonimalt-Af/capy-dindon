import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Profile } from '../quality';
import { GRADE, setShaderFog, tickShaders } from './materials';

export type Mood = 'day' | 'dusk' | 'night' | 'pantry' | 'party' | 'evolve';

interface Look {
  top: string;
  bottom: string;
  fog: string;
  sky: string;
  ground: string;
  key: number;
  keyColor: string;
  hemi: number;
  rim: number;
  fogNear: number;
  fogFar: number;
  sun: number;
  sunColor: string;
}

const MOOD: Record<Mood, Look> = {
  day: {
    top: '#2f8fe6', bottom: '#ffc48a', fog: '#b7dcff', sky: '#fff6df', ground: '#2f7a38',
    key: 1.72, keyColor: '#fff4e0', hemi: 0.58, rim: 0.72, fogNear: 36, fogFar: 92, sun: 0.85, sunColor: '#fff1c8',
  },
  dusk: {
    top: '#5a4cb0', bottom: '#ff6d45', fog: '#e8a090', sky: '#ffd0c0', ground: '#a85a48',
    key: 1.25, keyColor: '#ffd0b0', hemi: 0.48, rim: 0.85, fogNear: 28, fogFar: 80, sun: 0.7, sunColor: '#ffb089',
  },
  night: {
    top: '#12183f', bottom: '#c46a78', fog: '#3a3568', sky: '#9aafef', ground: '#2a2038',
    key: 0.55, keyColor: '#c5d4ff', hemi: 0.32, rim: 0.45, fogNear: 22, fogFar: 70, sun: 0.15, sunColor: '#d5e2ff',
  },
  pantry: {
    top: '#1c1630', bottom: '#3a2a40', fog: '#2a2436', sky: '#b7c4ea', ground: '#4a3028',
    key: 0.55, keyColor: '#d5e0ff', hemi: 0.32, rim: 0.4, fogNear: 12, fogFar: 32, sun: 0.05, sunColor: '#dfe6ff',
  },
  party: {
    top: '#3ec6ff', bottom: '#ff7eb3', fog: '#ffd0ea', sky: '#fff3c8', ground: '#ef5d8a',
    key: 1.55, keyColor: '#fff6e2', hemi: 0.62, rim: 0.8, fogNear: 30, fogFar: 88, sun: 0.75, sunColor: '#fff1c2',
  },
  evolve: {
    top: '#ffb25a', bottom: '#ff6848', fog: '#ffd7a8', sky: '#fff3cc', ground: '#d4923c',
    key: 1.9, keyColor: '#fff1c8', hemi: 0.66, rim: 1.05, fogNear: 20, fogFar: 72, sun: 1.15, sunColor: '#fff6d4',
  },
};

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(28, 1, 0.1, 180);
  readonly root = new THREE.Group();
  readonly key: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private readonly rim: THREE.DirectionalLight;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly skyMat: THREE.ShaderMaterial;
  private readonly sky: THREE.Mesh;
  private readonly stars: THREE.Points;
  private focus = new THREE.Vector3(0, 1.3, 0);
  private distance = 12;
  private lookahead = 0;
  private shake = 0;
  private dip = 0;
  private hit = 0;
  private clock = 0;
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
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(this.root);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color('#2f8fe6') },
        uBottom: { value: new THREE.Color('#ffc48a') },
        uSun: { value: new THREE.Color('#fff1c8') },
        uGlow: { value: 0.85 },
      },
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 uTop;
        uniform vec3 uBottom;
        uniform vec3 uSun;
        uniform float uGlow;
        void main(){
          vec3 n = normalize(vPos);
          float h = smoothstep(-0.12, 0.55, n.y);
          vec3 col = mix(uBottom, uTop, h);
          float horizon = exp(-abs(n.y) * 5.5);
          col = mix(col, uBottom, horizon * 0.45);
          vec3 sunDir = normalize(vec3(0.42, 0.48, -0.18));
          float glow = pow(max(dot(n, sunDir), 0.0), 7.0);
          float disc = pow(max(dot(n, sunDir), 0.0), 220.0);
          col += uSun * glow * uGlow;
          col += vec3(1.0) * disc * uGlow;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16), this.skyMat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.stars = this.addStars();
    this.hemi = new THREE.HemisphereLight('#fff6df', '#2f7a38', 0.58);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight('#fff4e0', 1.72);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.near = 0.5;
    this.key.shadow.camera.far = 48;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.045;
    this.scene.add(this.key, this.key.target);
    this.rim = new THREE.DirectionalLight('#ffe0b4', 0.72);
    this.scene.add(this.rim);
    const fill = new THREE.DirectionalLight('#c5e4ff', 0.22);
    fill.position.set(-2, 4, 10);
    this.scene.add(fill);
    this.scene.fog = new THREE.Fog('#b7dcff', 36, 92);
    const pass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.2, 0.38, 0.82);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(pass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new ShaderPass(GRADE));
    this.composer.addPass(new OutputPass());
    this.camera.position.set(0, 2.4, 12);
  }

  private addStars(): THREE.Points {
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const y = 10 + Math.random() * 48;
      const r = 34 + Math.random() * 40;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r - 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fffaf0', size: 0.22, sizeAttenuation: true, fog: false }));
    stars.visible = false;
    this.sky.add(stars);
    return stars;
  }

  applyProfile(profile: Profile): void {
    this.dpr = profile.dpr;
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
    (this.skyMat.uniforms.uSun.value as THREE.Color).set(mood.sunColor);
    this.skyMat.uniforms.uGlow.value = mood.sun;
    this.hemi.color.set(mood.sky);
    this.hemi.groundColor.set(mood.ground);
    this.hemi.intensity = mood.hemi;
    this.key.color.set(mood.keyColor);
    this.key.intensity = mood.key;
    this.rim.intensity = mood.rim;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(mood.fog);
    fog.near = mood.fogNear;
    fog.far = mood.fogFar;
    setShaderFog(mood.fog);
    this.stars.visible = name === 'night' || name === 'pantry';
  }

  follow(x: number, y: number, distance = 12, lookahead = 0): void {
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
    if (!reduced) this.shake = Math.min(0.28, this.shake + amount);
  }

  impact(seconds: number, shake: number, reduced: boolean): void {
    this.kick(shake, reduced);
    if (!reduced) this.hit = Math.max(this.hit, seconds);
  }

  nudge(amount: number, reduced: boolean): void {
    if (!reduced) this.dip = Math.min(0.42, this.dip + amount);
  }

  scaleTime(dt: number): number {
    if (this.hit <= 0) return dt;
    this.hit = Math.max(0, this.hit - dt);
    return dt * 0.05;
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
    this.bloom.resolution.set(Math.max(1, width * 0.5), Math.max(1, height * 0.5));
  }

  render(dt: number, reduced: boolean): void {
    this.clock += dt;
    tickShaders(this.clock);
    const goalX = (this.fixed?.x ?? this.focus.x) + this.lookahead;
    const goalY = (this.fixed?.y ?? this.focus.y) + 1.05;
    const dampX = 1 - Math.exp(-7 * dt);
    const dampY = 1 - Math.exp(-4.4 * dt);
    this.camera.position.x += (goalX - this.camera.position.x) * dampX;
    this.dip = Math.max(0, this.dip - dt * 2.4);
    this.camera.position.y += (goalY + 0.15 - this.dip * 0.35 - this.camera.position.y) * dampY;
    this.camera.position.z = this.distance;
    this.shake = Math.max(0, this.shake - dt * 2.1);
    const jx = reduced ? 0 : Math.sin(this.clock * 54) * this.shake;
    const jy = reduced ? 0 : Math.cos(this.clock * 47) * this.shake * 0.65;
    this.camera.lookAt(this.camera.position.x + jx, this.camera.position.y - 0.42 + jy, 0);
    this.sky.position.x = this.camera.position.x;
    this.sky.position.y = this.camera.position.y * 0.15;
    const ortho = this.key.shadow.camera as THREE.OrthographicCamera;
    ortho.left = -10;
    ortho.right = 10;
    ortho.top = 8;
    ortho.bottom = -6;
    ortho.updateProjectionMatrix();
    this.key.position.set(this.camera.position.x - 5.5, this.camera.position.y + 8.5, 7);
    this.key.target.position.set(this.camera.position.x, this.camera.position.y - 1, 0);
    this.key.target.updateMatrixWorld();
    this.rim.position.set(this.camera.position.x + 3, this.camera.position.y + 5, -8);
    this.composer.render();
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
