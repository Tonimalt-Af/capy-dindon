import { canEvolve, relicCount } from '../logic/evolution';
import { Platformer } from '../logic/physics';
import type { Solid } from '../logic/types';
import { Capybara } from '../render/capybara';
import { Particles } from '../render/particles';
import { archway, dress, island, totem } from '../render/scenery';
import { dressCamp, skyRig, type Rig } from '../render/world';
import { PLACES, TEXT } from '../text';
import { hudChrome, wireHud } from '../ui';
import type { ChallengeId } from '../logic/types';
import type { GameContext, Scene } from '../context';

const FLOOR: { id: string; x: number; top: number; w: number }[] = [
  { id: 'ground', x: 0, top: 0, w: 18.5 },
  { id: 'stepL', x: -2.3, top: 0.3, w: 2.5 },
  { id: 'crest', x: 0.15, top: 0.58, w: 2.7 },
  { id: 'stepR', x: 2.55, top: 0.3, w: 2.3 },
];

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
  private sparks: Particles | null = null;
  private rig: Rig | null = null;
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
    stage.useArt(save.data.stage === 1 ? 'eveil' : 'camp-des-nuages');
    audio.playSong('hub');
    const root = stage.root;
    for (const plat of FLOOR) {
      const land = island(plat.w, plat.id === 'ground' ? 3.1 : 2.3, plat.id === 'ground' ? 1.5 : 0.7);
      land.position.set(plat.x, plat.top, 0);
      if (plat.id === 'ground') dress(land, plat.w, 'meadow');
      root.add(land);
      const h = 1.4;
      this.solids.push({ id: plat.id, x: plat.x, y: plat.top - h / 2, w: plat.w, h, dx: 0, dy: 0 });
    }
    const relics = relicCount(save.data);
    const mark = totem(relics);
    mark.position.set(0.15, 0.58, -0.35);
    root.add(mark);
    for (const gate of GATES) {
      if (gate.id === 'totem') continue;
      const arch = archway(save.data.challenges[gate.id], gate.id);
      arch.position.set(gate.x, 0, -0.2);
      root.add(arch);
    }
    dressCamp(root);
    this.rig = skyRig(root, save.data.stage === 1 ? 'golden' : 'camp', 40);
    this.rig.adopt(root);
    this.capy.stage = save.data.stage;
    this.capy.featherGrow = save.data.stage;
    root.add(this.capy.root);
    this.sparks = new Particles(root, this.ctx.reduced());
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
      this.sparks?.dust(this.player.x, 0.08, 0.4);
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
    this.ctx.stage.follow(this.player.x, 0.8, 10.6, this.player.facing * 0.8);
    this.rig?.update(dt, this.ctx.reduced(), this.player.x);
    this.sparks?.update(dt, this.player.x);
    this.near = GATES.find((gate) => Math.abs(this.player.x - gate.x) < 0.85) ?? null;
    if (this.prompt) {
      this.prompt.hidden = !this.near;
      this.prompt.textContent = this.near ? this.labelFor(this.near.id) : '';
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
