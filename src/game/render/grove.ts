import { Capybara } from './capybara';
import { backdrop, butterfly, cloud, dress, featherModel, island, totem, tree, turkeyModel } from './scenery';
import * as THREE from 'three';

export function createGrove(stage: 0 | 1) {
  const group = new THREE.Group();
  const land = island(8.4, 3.4, 1.7);
  group.add(land);
  dress(land, 7.2);
  const extra = tree(1.05);
  extra.position.set(-3.1, 0, -0.95);
  land.add(extra);
  const capy = new Capybara();
  capy.stage = stage;
  capy.featherGrow = stage;
  capy.root.position.set(1.65, 0, 0.55);
  group.add(capy.root);
  const feather = featherModel();
  feather.position.set(0.15, 3.4, 0.4);
  feather.visible = false;
  group.add(feather);
  const mark = totem(stage === 1 ? 3 : 0);
  mark.position.set(-2.3, 0, -0.4);
  mark.scale.setScalar(0.85);
  group.add(mark);
  backdrop(group);
  const puff = cloud();
  puff.position.set(3.5, 2.4, -2);
  group.add(puff);
  const bugs = [0, 1, 2].map((i) => {
    const bug = butterfly();
    bug.position.set(-2 + i * 1.4, 1.3 + (i % 2) * 0.4, 0.6);
    group.add(bug);
    return bug;
  });
  const vision = new THREE.Group();
  vision.visible = false;
  vision.position.set(-1.2, 3.6, -6);
  const legend = turkeyModel();
  legend.scale.setScalar(2.6);
  legend.traverse((obj) => {
    const item = obj as THREE.Mesh;
    if (!item.isMesh) return;
    const mat = (item.material as THREE.MeshToonMaterial).clone();
    mat.transparent = true;
    mat.opacity = 0.72;
    mat.emissive = new THREE.Color('#ffe08a');
    mat.emissiveIntensity = 0.35;
    item.material = mat;
  });
  vision.add(legend);
  group.add(vision);
  return { group, capy, feather, bugs, vision, mark };
}
