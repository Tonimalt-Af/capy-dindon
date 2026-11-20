import { canEvolve, relicCount } from '../logic/evolution';
import { Platformer } from '../logic/physics';
import type { Solid } from '../logic/types';
import { Capybara, SCENE_LIGHT } from '../render/capybara';
import { PaintedBackdrop } from '../render/painted';
import { PLACES, TEXT } from '../text';
import { hudChrome, wireHud } from '../ui';
import type { ChallengeId } from '../logic/types';
import type { GameContext, Scene } from '../context';

const GATES: { id: ChallengeId | 'totem'; x: number }[] = [
  { id: 'glands', x: -6.8 },
  { id: 'totem', x: 0.15 },
  { id: 'pantry', x: 5.5 },
  { id: 'parade', x: 8.3 },
];

export class HubScene implements Scene {
  readonly id = 'hub' as const;
  private stop = new AbortController();
  private player = new Platformer(-3.4, 0.7);
  private capy = new Capybara();
  private solids: Solid[] = [];
  private backdrop: PaintedBackdrop | null = null;
  private prompt: HTMLElement | null = null;
  private near: (typeof GATES)[number] | null = null;
  private demoWait = 0;
  private leaving = false;

  constructor(private readonly ctx: GameContext) {}

  mount(): void {
    this.stop = new AbortController();
    const { stage, save, audio } = this.ctx;
    stage.clear();
    stage.mood(save.data.stage === 1 ? 'evolve' : 'day');
    stage.paintMode();
    audio.playSong('hub');
    const root = stage.root;
    this.backdrop = new PaintedBackdrop('camp-des-nuages', { span: 24, groundY: 0.02 });
    root.add(this.backdrop.group);
    const land = this.backdrop.bounds;
    const h = 1.4;
    this.solids.push({ id: 'ground', x: land.center, y: -h / 2, w: land.width, h, dx: 0, dy: 0 });
    this.capy.stage = save.data.stage;
    this.capy.featherGrow = save.data.stage;
    this.capy.setLight(save.data.stage === 1 ? SCENE_LIGHT.evolve : SCENE_LIGHT.day);
    root.add(this.capy.root);
    this.player = new Platformer(-3.4, 1.2);
    this.paint();
  }

  private paint(): void {
    const save = this.ctx.save.data;
    this.ctx.ui.setHud(`
      ${hudChrome({ place: PLACES.camp, pips: relicCount(save), muted: save.settings.muted, testid: 'hub' })}
      <div class="prompt panel" data-role="prompt" hidden></div>
    `);
    this.prompt = this.ctx.ui.hud.querySelector('[data-role="prompt"]');
    wireHud(this.ctx.ui.hud, this.stop.signal, {
      pause: () => this.ctx.requestPause(),
      mute: () => {
        this.ctx.save.patchSettings({ muted: !this.ctx.save.data.settings.muted });
        this.ctx.audio.muted = this.ctx.save.data.settings.muted;
        this.ctx.audio.applyGains();
        return this.ctx.audio.muted ? '🔇' : '🔊';
      },
    });
    this.ctx.ui.say(PLACES.camp);
  }

  private labelFor(id: (typeof GATES)[number]['id']): string {
    if (id === 'totem') {
      if (canEvolve(this.ctx.save.data)) return TEXT.actionEvolve;
      if (this.ctx.save.data.stage === 1) return TEXT.actionSoon;
      return TEXT.actionNeed;
    }
    return TEXT.actionEnter;
  }

  update(dt: number): void {
    const demo = this.ctx.flags.demo;
    const input = this.ctx.input.frame;
    let move = { left: input.left, right: input.right, jumpHeld: input.jumpHeld, jumpPressed: input.jumpPressed };
    const goal = this.demoGoal();
    if (demo && goal) {
      move = {
        left: goal.x < this.player.x - 0.25,
        right: goal.x > this.player.x + 0.25,
        jumpHeld: false,
        jumpPressed: false,
      };
    }
    const motion = this.player.step(move, this.solids, dt);
    if (motion.jumped) {
      this.ctx.audio.jump();
      this.ctx.buzz(12);
    }
    if (motion.landed) {
      this.ctx.audio.land();
      this.ctx.stage.nudge(0.14, this.ctx.reduced());
    }
    if (this.player.y < -4) {
      this.player.x = -3.4;
      this.player.y = 1.2;
      this.player.vx = 0;
      this.player.vy = 0;
    }
    this.capy.root.position.set(this.player.x, this.player.y - this.player.h / 2, 0.4);
    this.capy.turn(this.player.facing);
    this.capy.calm = this.ctx.reduced();
    this.capy.update(dt, { speed: Math.abs(this.player.vx), vy: this.player.vy, grounded: this.player.grounded, landed: motion.landed });
    const shot = this.backdrop?.place(this.ctx.stage.camera.aspect, this.player.x + this.player.facing * 0.16);
    if (shot) this.ctx.stage.follow(shot.x, shot.y, shot.distance, 0);
    this.backdrop?.sync(this.ctx.stage.camera, dt, this.ctx.reduced());
    this.near = GATES.find((gate) => Math.abs(this.player.x - gate.x) < 0.85) ?? null;
    if (this.prompt) {
      const hide = !this.near;
      if (this.prompt.hidden !== hide) {
        this.prompt.hidden = hide;
        this.prompt.textContent = this.near ? this.labelFor(this.near.id) : '';
      }
    }
    const use = input.actionPressed || (demo && this.near?.id === goal?.id);
    if (use && this.near) {
      if (demo) {
        this.demoWait += dt;
        if (this.demoWait < 0.35) return;
      }
      this.activate(this.near.id);
    } else this.demoWait = 0;
  }

  private demoGoal(): { id: string; x: number } | null {
    const save = this.ctx.save.data;
    if (!save.challenges.glands) return GATES[0];
    if (!save.challenges.pantry) return GATES[2];
    if (!save.challenges.parade) return GATES[3];
    if (canEvolve(save)) return GATES[1];
    this.ctx.flags.demo = false;
    return null;
  }

  private activate(id: (typeof GATES)[number]['id']): void {
    if (this.leaving) return;
    this.leaving = id !== 'totem' || canEvolve(this.ctx.save.data);
    this.ctx.audio.click();
    this.ctx.buzz(10);
    if (id === 'totem') {
      if (canEvolve(this.ctx.save.data)) this.ctx.goto('evolve');
      else if (this.ctx.save.data.stage === 1) {
        this.ctx.ui.setModal(`<div class="modal-back"><div class="modal-card panel" role="dialog"><h2>Capyplume</h2><p>${TEXT.actionSoon}. ${'Le Dindo-Capy, puis le CapyDindon.'}</p><button type="button" class="btn primary" data-action="ok">${TEXT.close}</button></div></div>`);
        this.ctx.ui.modal.querySelector('[data-action="ok"]')?.addEventListener('click', () => this.ctx.closeModal(), { signal: this.stop.signal });
      }
      return;
    }
    this.ctx.goto(id);
  }

  unmount(): void {
    this.stop.abort();
    this.ctx.ui.clearHud();
    this.solids = [];
  }
}
