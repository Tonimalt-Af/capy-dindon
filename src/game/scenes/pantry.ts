import * as THREE from 'three';
import { PANTRY, PuzzleSim, puzzleIntent } from '../logic/puzzle';
import { Capybara } from '../render/capybara';
import { Particles } from '../render/particles';
import { toon } from '../render/materials';
import { crateModel, featherModel } from '../render/scenery';
import { PaintedBackdrop } from '../render/painted';
import { HELP, PLACES, TEXT, VICTORY } from '../text';
import { hudChrome, wireHud } from '../ui';
import type { GameContext, Scene } from '../context';

export class PantryScene implements Scene {
  readonly id = 'pantry' as const;
  readonly challengeId = 'pantry' as const;
  private stop = new AbortController();
  private sim = new PuzzleSim();
  private capy = new Capybara();
  private crates = new Map<string, THREE.Object3D>();
  private plates = new Map<string, THREE.Mesh>();
  private gate: THREE.Object3D | null = null;
  private feather: THREE.Object3D | null = null;
  private sparks: Particles | null = null;
  private backdrop: PaintedBackdrop | null = null;
  private finished = false;
  private hold = 0;

  constructor(private readonly ctx: GameContext) {}

  mount(): void {
    this.stop = new AbortController();
    this.sim = new PuzzleSim();
    const { stage, audio, save } = this.ctx;
    stage.clear();
    stage.mood('pantry');
    stage.paintMode();
    audio.playSong('pantry');
    const root = stage.root;
    this.backdrop = new PaintedBackdrop('garde-manger', { span: 26, groundY: 0 });
    root.add(this.backdrop.group);
    for (const plate of PANTRY.plates) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(plate.w, 0.08, 0.8), toon('#8d6bdb').clone());
      pad.position.set(plate.x, 0.06, 0.15);
      root.add(pad);
      this.plates.set(plate.id, pad);
    }
    for (const spec of this.sim.crates) {
      const model = crateModel();
      root.add(model);
      this.crates.set(spec.id, model);
    }
    this.gate = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 0.06), toon('#d7d3e8'));
      bar.position.set((i - 2) * 0.12, 1.3, 0);
      this.gate.add(bar);
    }
    this.gate.position.set(PANTRY.gate.x, 0, 0.2);
    root.add(this.gate);
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.8), toon('#e7c7a1'));
    pedestal.position.set(PANTRY.feather.x, 0.16, 0.1);
    root.add(pedestal);
    this.feather = featherModel();
    this.feather.position.set(PANTRY.feather.x, 0.7, 0.15);
    root.add(this.feather);
    this.capy.stage = save.data.stage;
    this.capy.featherGrow = save.data.stage;
    root.add(this.capy.root);
    this.sparks = new Particles(root, this.ctx.reduced());
    this.ctx.ui.setHud(`
      ${hudChrome({ place: PLACES.pantry, help: HELP.pantry, muted: save.data.settings.muted, testid: 'challenge-pantry' })}
      <button type="button" class="chip" data-action="reset" style="position:absolute;left:16px;top:118px">${TEXT.resetCrates}</button>
    `);
    wireHud(this.ctx.ui.hud, this.stop.signal, {
      pause: () => this.ctx.requestPause(),
      mute: () => this.toggleMute(),
      details: () => this.details(),
    });
    this.ctx.ui.hud.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      this.sim.resetCrates();
      this.ctx.audio.click();
    }, { signal: this.stop.signal });
  }

  private toggleMute(): string {
    this.ctx.save.patchSettings({ muted: !this.ctx.save.data.settings.muted });
    this.ctx.audio.muted = this.ctx.save.data.settings.muted;
    this.ctx.audio.applyGains();
    return this.ctx.audio.muted ? '🔇' : '🔊';
  }

  private details(): void {
    this.ctx.setPauseLocked(true);
    this.ctx.ui.setModal(`<div class="modal-back"><div class="modal-card panel" role="dialog"><h2>${PLACES.pantry}</h2><p>${HELP.pantryMore}</p><button type="button" class="btn primary" data-action="ok">${TEXT.close}</button></div></div>`);
    this.ctx.ui.modal.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
      this.ctx.closeModal();
      this.ctx.setPauseLocked(false);
    }, { signal: this.stop.signal });
  }

  showVictory(): void {
    if (this.ctx.ui.modal.querySelector('[data-testid="challenge-complete"]')) return;
    this.finished = true;
    this.ctx.setPauseLocked(true);
    this.ctx.ui.setModal(`
      <div class="modal-back" data-testid="challenge-complete"><div class="modal-card panel" role="dialog">
        <h2>${TEXT.bravo}</h2>
        <p><strong>${TEXT.featherGot}.</strong> ${VICTORY.pantry}</p>
        <button type="button" class="btn primary" data-action="hub">${TEXT.hubReturn}</button>
      </div></div>`);
    this.ctx.ui.say(VICTORY.pantry);
    this.ctx.ui.modal.querySelector('[data-action="hub"]')?.addEventListener('click', () => {
      this.ctx.setPauseLocked(false);
      this.ctx.goto('hub');
    }, { signal: this.stop.signal });
    if (this.ctx.flags.demo) window.setTimeout(() => this.ctx.goto('hub'), 1300);
  }

  getProgress() {
    return { won: this.sim.won, lost: false, progress: this.sim.gateOpen ? 1 : 0, target: 1 };
  }

  update(dt: number): void {
    if (!this.finished) {
      const frame = this.ctx.input.frame;
      let input = { left: frame.left, right: frame.right, jumpHeld: frame.jumpHeld, jumpPressed: frame.jumpPressed };
      if (this.ctx.flags.demo) {
        const intent = puzzleIntent(this.sim);
        if (intent.jumpPressed) this.hold = 0.1;
        else this.hold = Math.max(0, this.hold - dt);
        input = { ...intent, jumpHeld: intent.jumpHeld || this.hold > 0 };
      }
      const before = this.sim.events.length;
      this.sim.step(input, dt);
      void before;
      for (const event of this.sim.events) {
        if (event.type === 'jump') this.ctx.audio.jump();
        if (event.type === 'land') {
          this.ctx.audio.land();
          this.ctx.stage.nudge(0.1, this.ctx.reduced());
        }
        if (event.type === 'push') {
          this.ctx.audio.push();
          this.ctx.stage.kick(0.04, this.ctx.reduced());
        }
      }
      if (this.sim.won) {
        this.ctx.grant('pantry');
        this.ctx.audio.win();
        this.ctx.buzz([16, 30, 20]);
        this.ctx.stage.impact(0.06, 0.1, this.ctx.reduced());
        this.sparks?.burst(PANTRY.feather.x, 1.2, 0.2, 16, '#fff1c9');
        this.sparks?.ring(PANTRY.feather.x, 1.1, 0.2, '#fff6d0');
        this.showVictory();
      }
    }
    const player = this.sim.player;
    this.capy.root.position.set(player.x, player.y - player.h / 2, 0.45);
    this.capy.turn(player.facing);
    this.capy.calm = this.ctx.reduced();
    this.capy.update(dt, { speed: Math.abs(player.vx), vy: player.vy, grounded: player.grounded, landed: false });
    const pressed = this.sim.platesPressed();
    for (const [id, pad] of this.plates) {
      pad.position.y = pressed[id] ? 0.02 : 0.06;
      (pad.material as THREE.MeshToonMaterial).emissive?.set(pressed[id] ? '#d7c4ff' : '#000000');
      (pad.material as THREE.MeshToonMaterial).emissiveIntensity = pressed[id] ? 0.6 : 0;
    }
    for (const crate of this.sim.crates) this.crates.get(crate.id)?.position.set(crate.x, crate.y, 0.15);
    if (this.gate) this.gate.position.y += ((this.sim.gateOpen ? 2.8 : 0) - this.gate.position.y) * Math.min(1, dt * 4);
    if (this.feather) this.feather.rotation.z += dt;
    this.sparks?.update(dt, player.x);
    this.backdrop?.sync(this.ctx.stage.camera);
    const aspect = this.ctx.stage.camera.aspect || 1.33;
    const distance = 16.5;
    const halfW = Math.tan(THREE.MathUtils.degToRad(14)) * distance * aspect;
    const limit = Math.max(0, 13 - halfW);
    const camX = Math.max(-limit, Math.min(limit, player.x));
    this.ctx.stage.follow(camX, 0.85, distance, 0);
  }

  unmount(): void {
    this.stop.abort();
    this.ctx.ui.clearHud();
    this.ctx.setPauseLocked(false);
  }
}
