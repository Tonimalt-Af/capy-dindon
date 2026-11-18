import * as THREE from 'three';
import { Capybara, createLegend } from './capybara';
import { butterfly, dress, featherModel, flower, island, pond, reed, rock, totem, tree } from './scenery';
import { skyRig, type Rig } from './world';

export interface Grove {
  group: THREE.Group;
  capy: Capybara;
  feather: THREE.Object3D;
  bugs: THREE.Object3D[];
  vision: THREE.Group;
  mark: THREE.Object3D;
  rig: Rig;
  legend: Capybara;
}

export function createGrove(stage: 0 | 1): Grove {
  const group = new THREE.Group();
  const land = island(9.2, 3.8, 1.8);
  group.add(land);
  dress(land, 8.2);
  const extra = tree(1.25);
  extra.position.set(-3.3, 0, -1.05);
  land.add(extra);
  const pool = pond(0.72);
  pool.position.set(-0.15, 0.12, 0.55);
  land.add(pool);
  for (let i = 0; i < 5; i++) {
    const stem = reed();
    stem.position.set(-0.7 + i * 0.16, 0, 0.85);
    land.add(stem);
  }
  const stone = rock(1);
  stone.position.set(2.4, 0, 0.7);
  land.add(stone);
  const bloom = flower('#ff8fb8');
  bloom.position.set(2.8, 0, 0.2);
  land.add(bloom);
  const capy = new Capybara();
  capy.stage = stage;
  capy.featherGrow = stage;
  capy.root.position.set(1.7, 0, 0.45);
  group.add(capy.root);
  const feather = featherModel();
  feather.position.set(0.35, 3.4, 0.2);
  feather.visible = false;
  group.add(feather);
  const mark = totem(stage === 1 ? 3 : 0);
  mark.position.set(-2.15, 0, -0.55);
  mark.scale.setScalar(0.9);
  group.add(mark);
  const rig = skyRig(group, 'meadow', 36);
  const bugs = [0, 1].map((i) => {
    const bug = butterfly();
    bug.position.set(-1.8 + i * 3.4, 0.85, 0.85);
    group.add(bug);
    return bug;
  });
  const vision = new THREE.Group();
  vision.visible = false;
  vision.position.set(0.4, 3.5, -5.5);
  const legend = createLegend();
  legend.root.scale.setScalar(2.35);
  legend.root.traverse((obj) => {
    const item = obj as THREE.Mesh;
    if (!item.isMesh) return;
    const source = item.material as THREE.Material;
    const mat = source.clone();
    mat.transparent = true;
    mat.opacity = 0.9;
    if ('emissive' in mat) {
      (mat as THREE.MeshToonMaterial).emissive = new THREE.Color('#ffe08a');
      (mat as THREE.MeshToonMaterial).emissiveIntensity = 0.4;
    }
    item.material = mat;
  });
  vision.add(legend.root);
  group.add(vision);
  rig.adopt(group);
  return { group, capy, feather, bugs, vision, mark, rig, legend };
}
