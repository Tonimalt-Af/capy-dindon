import * as THREE from 'three';

export type ArtId = 'camp-des-nuages' | 'iles-aux-glands' | 'garde-manger' | 'parade' | 'eveil';

const MID_DY: Record<ArtId, number> = {
  'camp-des-nuages': -220,
  'iles-aux-glands': -220,
  'garde-manger': 0,
  parade: -170,
  eveil: -200,
};

const base = import.meta.env.BASE_URL;

function url(path: string): string {
  return `${base}assets/art/${path}`;
}

const textures = new Map<string, Promise<THREE.Texture>>();

export function paintTexture(path: string): Promise<THREE.Texture> {
  const hit = textures.get(path);
  if (hit) return hit;
  const pending = new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(url(path), (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      resolve(tex);
    }, undefined, () => reject(new Error(path)));
  });
  textures.set(path, pending);
  return pending;
}

const LAYER = ['sky', 'far', 'ground', 'mid'] as const;

export class PaintedBackdrop {
  readonly group = new THREE.Group();
  private readonly planes: { mesh: THREE.Mesh; kind: (typeof LAYER)[number]; stick: number }[] = [];

  constructor(id: ArtId) {
    this.group.name = 'painted-scene';
    const sticks = { sky: 1, far: 0.93, ground: 0.8, mid: 0.68 };
    LAYER.forEach((kind, index) => {
      const mat = new THREE.MeshBasicMaterial({
        transparent: kind !== 'sky',
        depthWrite: false,
        fog: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.renderOrder = -40 + index;
      mesh.position.z = -6 + index * 0.15;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.planes.push({ mesh, kind, stick: sticks[kind] });
      void paintTexture(`scenes/${id}/${kind}.webp`).then((tex) => {
        mat.map = tex;
        mat.needsUpdate = true;
      }).catch(() => undefined);
    });
    this.group.userData.dy = MID_DY[id];
  }

  layout(camera: THREE.PerspectiveCamera): void {
    const distance = camera.position.z - (-6);
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance * 1.02;
    const width = height * camera.aspect;
    const dy = Number(this.group.userData.dy) || 0;
    for (const plane of this.planes) {
      plane.mesh.scale.set(width, height, 1);
      const drift = (1 - plane.stick) * camera.position.x * 0.35;
      plane.mesh.position.x = camera.position.x - drift;
      plane.mesh.position.y = camera.position.y - 0.55;
      if (plane.kind === 'mid') plane.mesh.position.y -= (dy / 720) * height;
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const plane of this.planes) {
      plane.mesh.geometry.dispose();
      const mat = plane.mesh.material as THREE.MeshBasicMaterial;
      mat.dispose();
    }
  }
}

export type Pose = 'idle' | 'walk1' | 'walk2' | 'jump' | 'joy' | 'sleep' | 'capyplume' | 'capydindon';

const POSE_FILE: Record<Pose, string> = {
  idle: 'characters/capy-idle.webp',
  walk1: 'characters/capy-walk-1.webp',
  walk2: 'characters/capy-walk-2.webp',
  jump: 'characters/capy-jump.webp',
  joy: 'characters/capy-joy.webp',
  sleep: 'characters/capy-sleep.webp',
  capyplume: 'characters/capyplume.webp',
  capydindon: 'characters/capydindon.webp',
};

const poseTex = new Map<Pose, THREE.Texture>();
let posesReady: Promise<void> | null = null;

export function loadPoses(): Promise<void> {
  if (!posesReady) {
    posesReady = Promise.all(
      (Object.keys(POSE_FILE) as Pose[]).map(async (pose) => {
        poseTex.set(pose, await paintTexture(POSE_FILE[pose]));
      }),
    ).then(() => undefined);
  }
  return posesReady;
}

export function poseAspect(pose: Pose): number {
  const tex = poseTex.get(pose);
  const image = tex?.image as { width?: number; height?: number } | undefined;
  if (!image?.width || !image?.height) return 1.2;
  return image.width / image.height;
}

export function poseTexture(pose: Pose): THREE.Texture | undefined {
  return poseTex.get(pose);
}
