import * as THREE from 'three';
import { basic, GEO, softCircle } from './materials';

interface Spark {
  mesh: THREE.Mesh;
  v: THREE.Vector3;
  life: number;
  max: number;
  spin: number;
  gravity: number;
}

export class Particles {
  private readonly sparks: Spark[] = [];
  private readonly motes: THREE.Mesh[] = [];
  private readonly rings: { mesh: THREE.Mesh; life: number }[] = [];
  private readonly sprite: THREE.Texture;
  private readonly mats = new Map<string, THREE.MeshBasicMaterial>();

  constructor(parent: THREE.Object3D, private reduced: boolean) {
    this.sprite = softCircle();
    for (let i = 0; i < 56; i++) {
      const mesh = new THREE.Mesh(GEO.plane, this.mat('#fff6d4'));
      mesh.visible = false;
      mesh.scale.setScalar(0.12);
      parent.add(mesh);
      this.sparks.push({ mesh, v: new THREE.Vector3(), life: 0, max: 1, spin: 0, gravity: 3 });
    }
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.2, 16), this.mat('#fff1c4').clone());
      mesh.visible = false;
      mesh.rotation.x = -0.2;
      parent.add(mesh);
      this.rings.push({ mesh, life: 0 });
    }
    const moteCount = reduced ? 8 : 18;
    for (let i = 0; i < moteCount; i++) {
      const mesh = new THREE.Mesh(GEO.plane, basic(i % 3 === 0 ? '#fff1b8' : i % 3 === 1 ? '#ffffff' : '#c8ecff', 0.75));
      (mesh.material as THREE.MeshBasicMaterial).map = this.sprite;
      (mesh.material as THREE.MeshBasicMaterial).depthWrite = false;
      mesh.scale.setScalar(0.06 + Math.random() * 0.08);
      mesh.position.set((Math.random() - 0.5) * 12, 0.8 + Math.random() * 3.2, -1.2 - Math.random());
      mesh.userData.phase = Math.random() * Math.PI * 2;
      mesh.userData.base = mesh.position.clone();
      parent.add(mesh);
      this.motes.push(mesh);
    }
  }

  private mat(color: string): THREE.MeshBasicMaterial {
    const found = this.mats.get(color);
    if (found) return found;
    const material = new THREE.MeshBasicMaterial({
      map: this.sprite,
      color,
      transparent: true,
      depthWrite: false,
    });
    this.mats.set(color, material);
    return material;
  }

  burst(x: number, y: number, z: number, count: number, color: string): void {
    this.spawn(x, y, z, count, color, 3.2, 3, 0.16);
  }

  dust(x: number, y: number, z: number): void {
    this.spawn(x, y, z, this.reduced ? 3 : 7, '#f3e2c4', 1.6, 1.2, 0.12);
  }

  confetti(x: number, y: number, z: number): void {
    const colors = ['#ff7a45', '#ffe08a', '#7fd4ff', '#ff8fb8', '#c9a6ff'];
    colors.forEach((color, i) => this.spawn(x + (i - 2) * 0.15, y, z, 2, color, 2.4, 1.4, 0.1));
  }

  ring(x: number, y: number, z: number, color: string): void {
    const ring = this.rings.find((item) => item.life <= 0);
    if (!ring) return;
    (ring.mesh.material as THREE.MeshBasicMaterial).color.set(color);
    ring.mesh.visible = true;
    ring.mesh.position.set(x, y, z);
    ring.mesh.scale.setScalar(0.2);
    ring.life = 0.38;
  }

  private spawn(x: number, y: number, z: number, count: number, color: string, speed: number, gravity: number, size: number): void {
    const n = this.reduced ? Math.min(3, count) : count;
    const mat = this.mat(color);
    let left = n;
    for (const spark of this.sparks) {
      if (left <= 0) break;
      if (spark.life > 0) continue;
      spark.mesh.material = mat;
      spark.mesh.visible = true;
      spark.mesh.position.set(x, y, z);
      spark.v.set((Math.random() - 0.5) * speed, 0.8 + Math.random() * speed, (Math.random() - 0.5) * speed * 0.45);
      spark.max = 0.4 + Math.random() * 0.35;
      spark.life = spark.max;
      spark.spin = (Math.random() - 0.5) * 6;
      spark.gravity = gravity;
      spark.mesh.scale.setScalar(size);
      left -= 1;
    }
  }

  update(dt: number, originX: number): void {
    for (const spark of this.sparks) {
      if (spark.life <= 0) continue;
      spark.life -= dt;
      spark.v.y -= dt * spark.gravity;
      spark.mesh.position.addScaledVector(spark.v, dt);
      spark.mesh.rotation.z += spark.spin * dt;
      const k = Math.max(0, spark.life / spark.max);
      spark.mesh.scale.setScalar(0.16 * k + 0.03);
      spark.mesh.visible = spark.life > 0;
    }
    for (const ring of this.rings) {
      if (ring.life <= 0) continue;
      ring.life -= dt;
      const k = Math.max(0, ring.life / 0.38);
      ring.mesh.scale.setScalar(0.3 + (1 - k) * 1.6);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = k;
      ring.mesh.visible = ring.life > 0;
    }
    const speed = this.reduced ? 0.15 : 0.7;
    this.motes.forEach((mote, i) => {
      const phase = Number(mote.userData.phase);
      const base = mote.userData.base as THREE.Vector3;
      mote.position.x = originX + base.x + Math.sin(performance.now() * 0.0003 * speed + phase) * 0.45;
      mote.position.y = base.y + Math.sin(performance.now() * 0.0005 * speed + i) * 0.28;
      mote.lookAt(originX, mote.position.y, 12);
    });
  }
}
