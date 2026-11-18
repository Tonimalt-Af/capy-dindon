import * as THREE from 'three';
import { Capybara, createLegend } from '../render/capybara';
import { Particles } from '../render/particles';
import { dress, featherModel, flower, island } from '../render/scenery';
import { skyRig, type Rig } from '../render/world';
import { EVOLVE } from '../text';
import { typewrite } from '../ui';
import type { GameContext, Scene } from '../context';

export class EvolveScene implements Scene {
  readonly id = 'evolve' as const;
  private stop = new AbortController();
  private capy = new Capybara();
  private sparks: Particles | null = null;
  private rig: Rig | null = null;
  private legend: Capybara | null = null;
  private orbit = new THREE.Group();
  private beam: THREE.Mesh | null = null;
  private time = 0;
  private grown = false;
  private leaving = false;

  constructor(private readonly ctx: GameContext) {}

  mount(): void {
    this.stop = new AbortController();
    const { stage, audio } = this.ctx;
    stage.clear();
    stage.mood('evolve');
    stage.hold(1.15, 0.7, 7.6);
    audio.playSong('evolve');
    const root = stage.root;
    const land = island(8.4, 3.6, 1.6);
    root.add(land);
    dress(land, 7.4, 'meadow');
    for (const x of [-2.2, -1.2, 2.4, 3.2]) {
      const bloom = flower('#ffe08a');
      bloom.position.set(x, 0, 0.4);
      land.add(bloom);
    }
    this.rig = skyRig(root, 'golden', 32);
    this.capy.root.position.set(1.15, 0, 0.7);
    root.add(this.capy.root);
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 1.6, 7.5, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff1c2', transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.beam.position.set(0.2, 3.2, -0.6);
    root.add(this.beam);
    const halo = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 2.4, 7.5, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
    );
    halo.position.copy(this.beam.position);
    root.add(halo);
    this.legend = createLegend();
    this.legend.root.scale.setScalar(1.7);
    this.legend.root.position.set(2.55, 1.7, -2.6);
    this.legend.root.traverse((obj) => {
      const item = obj as THREE.Mesh;
      if (!item.isMesh) return;
      const mat = (item.material as THREE.Material).clone();
      mat.transparent = true;
      mat.opacity = 0.92;
      if ('emissive' in mat) {
        (mat as THREE.MeshToonMaterial).emissive = new THREE.Color('#ffd27a');
        (mat as THREE.MeshToonMaterial).emissiveIntensity = 0.12;
      }
      item.material = mat;
    });
    root.add(this.legend.root);
    this.rig.adopt(root);
    for (let i = 0; i < 8; i++) {
      const feather = featherModel();
      feather.position.set(Math.cos((i / 8) * Math.PI * 2) * 1.4, 1.2, Math.sin((i / 8) * Math.PI * 2) * 0.4);
      this.orbit.add(feather);
    }
    root.add(this.orbit);
    this.sparks = new Particles(root, this.ctx.reduced());
    const instant = this.ctx.flags.shot === 'evolve' || this.ctx.reduced();
    if (instant) this.reveal();
    this.ctx.ui.setHud(`
      <div class="story-card side panel" data-testid="evolve-screen">
        <p class="subtitle" style="color:#7a4b2b;text-shadow:none">${EVOLVE.kicker}</p>
        <h2 style="font-family:Fredoka,Nunito,sans-serif;font-size:42px;margin:0 0 8px">${EVOLVE.title}</h2>
        <p data-role="body"></p>
        <p data-role="tease"></p>
        <button type="button" class="btn primary" data-testid="evolve-done" hidden>${EVOLVE.button}</button>
      </div>
    `);
    const body = this.ctx.ui.hud.querySelector('[data-role="body"]');
    const tease = this.ctx.ui.hud.querySelector('[data-role="tease"]');
    if (body instanceof HTMLElement && this.ctx.subtitles()) {
      void typewrite(body, EVOLVE.body, this.ctx.cps(), this.stop.signal, instant).then(() => {
        if (tease instanceof HTMLElement) tease.textContent = EVOLVE.tease;
        this.showButton();
      });
    } else this.showButton();
    this.ctx.ui.say(`${EVOLVE.title}. ${EVOLVE.body}`);
    this.ctx.ui.hud.querySelector('[data-testid="evolve-done"]')?.addEventListener('click', () => this.done(), { signal: this.stop.signal });
  }

  private reveal(): void {
    if (this.grown) return;
    this.grown = true;
    this.capy.featherGrow = 1;
    this.capy.stage = 1;
    this.capy.setMood('happy');
    this.ctx.reachStage();
    this.ctx.audio.evolve();
    this.ctx.buzz([20, 40, 20, 60]);
    this.ctx.stage.impact(0.1, 0.12, this.ctx.reduced());
    this.sparks?.burst(1.1, 1.2, 0.4, 20, '#fff1c9');
    this.sparks?.confetti(1.1, 1.6, 0.2);
    this.sparks?.ring(1.1, 0.8, 0.3, '#ffe08a');
  }

  private showButton(): void {
    const button = this.ctx.ui.hud.querySelector('[data-testid="evolve-done"]');
    if (button instanceof HTMLButtonElement) button.hidden = false;
    if (this.ctx.flags.demo) window.setTimeout(() => this.done(), 900);
  }

  private done(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.ctx.audio.click();
    this.ctx.goto('hub');
  }

  update(dt: number): void {
    this.time += dt;
    if (!this.grown && this.time > 1.3) {
      this.capy.featherGrow = Math.min(1, this.capy.featherGrow + dt * 0.7);
      if (this.capy.featherGrow >= 1) this.reveal();
    }
    this.capy.setMood(this.grown ? 'happy' : 'wow');
    this.capy.calm = this.ctx.reduced();
    this.capy.update(dt, { speed: 0, vy: 0, grounded: true, landed: false });
    this.legend?.update(dt, { speed: 0, vy: 0, grounded: true, landed: false });
    this.orbit.rotation.y += dt * (this.ctx.reduced() ? 0.2 : 1.1);
    this.rig?.update(dt, this.ctx.reduced(), 0);
    if (this.beam) this.beam.scale.x = this.beam.scale.z = 1 + Math.sin(this.time * 2) * 0.05;
    this.sparks?.update(dt, 0);
  }

  unmount(): void {
    this.stop.abort();
    this.ctx.ui.clearHud();
  }
}
