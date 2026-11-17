import * as THREE from 'three';
import { basic, GEO, softCircle } from './materials';

interface Spark {
  mesh: THREE.Mesh;
  v: THREE.Vector3;
  life: number;
  max: number;
}

export class Particles {
  private readonly sparks: Spark[] = [];
  private readonly motes: THREE.Mesh[] = [];
  private readonly sprite: THREE.Texture;

  constructor(parent: THREE.Object3D, private reduced: boolean) {
    this.sprite = softCircle();
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ map: this.sprite, color: '#fff6d4', transparent: true, depthWrite: false }));
      mesh.visible = false;
      mesh.scale.setScalar(0.12);
      parent.add(mesh);
      this.sparks.push({ mesh, v: new THREE.Vector3(), life: 0, max: 1 });
    }
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(GEO.plane, basic(i % 2 ? '#fff1b8' : '#ffffff', 0.8));
      (mesh.material as THREE.MeshBasicMaterial).map = this.sprite;
      mesh.scale.setScalar(0.08 + Math.random() * 0.08);
      mesh.position.set((Math.random() - 0.5) * 10, 1 + Math.random() * 3, -1 - Math.random());
      mesh.userData.phase = Math.random() * Math.PI * 2;
      mesh.userData.base = mesh.position.clone();
      parent.add(mesh);
      this.motes.push(mesh);
    }
  }

  burst(x: number, y: number, z: number, count: number, color: string): void {
    const n = this.reduced ? Math.min(3, count) : count;
    const mat = new THREE.MeshBasicMaterial({ map: this.sprite, color, transparent: true, depthWrite: false });
    let left = n;
    for (const spark of this.sparks) {
      if (left <= 0) break;
      if (spark.life > 0) continue;
      spark.mesh.material = mat;
      spark.mesh.visible = true;
      spark.mesh.position.set(x, y, z);
      spark.v.set((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.2, (Math.random() - 0.5) * 1.2);
      spark.max = 0.45 + Math.random() * 0.35;
      spark.life = spark.max;
      left -= 1;
    }
  }

  update(dt: number, originX: number): void {
    for (const spark of this.sparks) {
      if (spark.life <= 0) continue;
      spark.life -= dt;
      spark.v.y -= dt * 3;
      spark.mesh.position.addScaledVector(spark.v, dt);
      const k = Math.max(0, spark.life / spark.max);
      spark.mesh.scale.setScalar(0.18 * k);
      spark.mesh.visible = spark.life > 0;
    }
    this.motes.forEach((mote, i) => {
      const phase = Number(mote.userData.phase);
      const base = mote.userData.base as THREE.Vector3;
      const speed = this.reduced ? 0.15 : 0.7;
      mote.position.x = originX + base.x + Math.sin(performance.now() * 0.0003 * speed + phase) * 0.4;
      mote.position.y = base.y + Math.sin(performance.now() * 0.0005 * speed + i) * 0.25;
      mote.lookAt(originX, mote.position.y, 12);
    });
  }
}
