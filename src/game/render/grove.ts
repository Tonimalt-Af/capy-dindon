import * as THREE from 'three';
import { Capybara, SCENE_LIGHT, createLegend } from './capybara';
import { featherModel } from './scenery';
import { PaintedBackdrop } from './painted';

export interface Grove {
  group: THREE.Group;
  capy: Capybara;
  feather: THREE.Object3D;
  vision: THREE.Group;
  legend: Capybara;
  backdrop: PaintedBackdrop;
}

export function createGrove(stage: 0 | 1): Grove {
  const group = new THREE.Group();
  const backdrop = new PaintedBackdrop('camp-des-nuages', { span: 24, groundY: 0.02 });
  group.add(backdrop.group);
  const capy = new Capybara();
  capy.stage = stage;
  capy.featherGrow = stage;
  capy.setLight(stage === 1 ? SCENE_LIGHT.evolve : SCENE_LIGHT.day);
  capy.root.position.set(1.7, 0, 0.5);
  group.add(capy.root);
  const feather = featherModel();
  feather.position.set(0.2, 3.3, 0.35);
  feather.visible = false;
  feather.scale.setScalar(1.6);
  group.add(feather);
  const vision = new THREE.Group();
  vision.visible = false;
  vision.position.set(3.6, 0.15, -0.4);
  const legend = createLegend();
  legend.setLight(SCENE_LIGHT.evolve);
  legend.root.scale.setScalar(1.2);
  legend.turn(-1);
  vision.add(legend.root);
  group.add(vision);
  return { group, capy, feather, vision, legend, backdrop };
}
