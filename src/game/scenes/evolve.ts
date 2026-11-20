import { Capybara, SCENE_LIGHT, createLegend } from '../render/capybara';
import { Particles } from '../render/particles';
import { PaintedBackdrop } from '../render/painted';
import { EVOLVE } from '../text';
import { typewrite } from '../ui';
import type { GameContext, Scene } from '../context';

export class EvolveScene implements Scene {
  readonly id = 'evolve' as const;
  private stop = new AbortController();
  private capy = new Capybara();
  private sparks: Particles | null = null;
  private backdrop: PaintedBackdrop | null = null;
  private legend: Capybara | null = null;
  private time = 0;
  private grown = false;
  private leaving = false;

  constructor(private readonly ctx: GameContext) {}

  mount(): void {
    this.stop = new AbortController();
    const { stage, audio } = this.ctx;
    stage.clear();
    stage.mood('evolve');
    stage.paintMode();
    stage.hold(1.6, 0.32, 14);
    audio.playSong('evolve');
    const root = stage.root;
    this.backdrop = new PaintedBackdrop('eveil', { span: 20, groundY: 0.02 });
    root.add(this.backdrop.group);
    this.capy.setLight(SCENE_LIGHT.evolve);
    this.capy.root.position.set(2.55, 0, 0.55);
    this.capy.turn(1);
    root.add(this.capy.root);
    this.legend = createLegend();
    this.legend.setLight(SCENE_LIGHT.evolve);
    this.legend.root.scale.setScalar(1.16);
    this.legend.root.position.set(5.05, 0, 0.25);
    this.legend.turn(-1);
    root.add(this.legend.root);
    this.sparks = new Particles(root, this.ctx.reduced());
    this.backdrop.sync(stage.camera);
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
    if (this.ctx.flags.shot !== 'evolve') {
      this.sparks?.burst(2.5, 1.2, 0.4, 20, '#fff1c9');
      this.sparks?.confetti(2.5, 1.6, 0.2);
      this.sparks?.ring(2.5, 0.8, 0.3, '#ffe08a');
    }
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
    const shot = this.backdrop?.place(this.ctx.stage.camera.aspect, 1.35);
    if (shot) this.ctx.stage.hold(shot.x, shot.y, shot.distance);
    this.backdrop?.sync(this.ctx.stage.camera, dt, this.ctx.reduced());
    this.sparks?.update(dt, 0);
  }

  unmount(): void {
    this.stop.abort();
    this.ctx.ui.clearHud();
  }
}
