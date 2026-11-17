import * as THREE from 'three';
import { AcornSim, acornIntent, sampleLevel } from '../logic/acorn';
import type { SimEvent } from '../logic/types';
import { Capybara } from '../render/capybara';
import { Particles } from '../render/particles';
import { acornModel, archway, backdrop, dress, island, pumpkinModel } from '../render/scenery';
import { HELP, PLACES, TEXT, VICTORY } from '../text';
import { hudChrome, wireHud } from '../ui';
import type { GameContext, Scene } from '../context';

export class AcornScene implements Scene {
  readonly id = 'glands' as const;
  readonly challengeId = 'glands' as const;
  private stop = new AbortController();
  private sim = new AcornSim();
  private capy = new Capybara();
  private acorns = new Map<string, THREE.Object3D>();
  private pumpkin: THREE.Object3D | null = null;
  private portal: THREE.Object3D | null = null;
  private glow: THREE.PointLight | null = null;
  private islands = new Map<string, THREE.Object3D>();
  private hold = 0;
  private sparks: Particles | null = null;
  private finished = false;
  private countEl: HTMLElement | null = null;

  constructor(private readonly ctx: GameContext) {}

  mount(): void {
    this.stop = new AbortController();
    this.sim = new AcornSim();
    if (this.ctx.flags.shot === 'glands') ['a1', 'a2', 'a3'].forEach((id) => this.sim.collected.add(id));
    const { stage, audio, save } = this.ctx;
    stage.clear();
    stage.mood('day');
    audio.playSong('glands');
    const root = stage.root;
    const sampled = sampleLevel(this.sim.level, 0, 0);
    this.sim.level.platforms.forEach((plat, index) => {
      const solid = sampled.solids[index];
      const land = island(plat.w, 2.4, 1.25);
      const top = solid.y + solid.h / 2;
      land.position.set(plat.x, top, 0);
      if (plat.w > 4) dress(land, plat.w);
      root.add(land);
      this.islands.set(plat.id, land);
    });
    for (const acorn of this.sim.level.acorns) {
      const model = acornModel();
      model.position.set(acorn.x, acorn.y, 0.2);
      root.add(model);
      this.acorns.set(acorn.id, model);
    }
    this.pumpkin = pumpkinModel();
    root.add(this.pumpkin);
    this.portal = archway(false);
    this.portal.position.set(this.sim.level.exit.x, this.sim.level.platforms.at(-1)?.top ?? 0, 0);
    this.glow = new THREE.PointLight('#ffd56a', 0, 5, 2);
    this.glow.position.y = 1.2;
    this.portal.add(this.glow);
    root.add(this.portal);
    backdrop(root);
    this.capy.stage = save.data.stage;
    this.capy.featherGrow = save.data.stage;
    root.add(this.capy.root);
    this.sparks = new Particles(root, this.ctx.reduced());
    this.ctx.ui.setHud(`
      ${hudChrome({
        place: PLACES.glands,
        testid: 'challenge-glands',
        extra: `<span data-role="count">0/8</span>`,
        help: HELP.glands,
        pips: undefined,
        muted: save.data.settings.muted,
      })}
    `);
    this.countEl = this.ctx.ui.hud.querySelector('[data-role="count"]');
    wireHud(this.ctx.ui.hud, this.stop.signal, {
      pause: () => this.ctx.requestPause(),
      mute: () => this.toggleMute(),
      details: () => this.details(HELP.glandsMore),
    });
    this.refreshCount();
  }

  private toggleMute(): string {
    this.ctx.save.patchSettings({ muted: !this.ctx.save.data.settings.muted });
    this.ctx.audio.muted = this.ctx.save.data.settings.muted;
    this.ctx.audio.applyGains();
    return this.ctx.audio.muted ? '🔇' : '🔊';
  }

  private details(body: string): void {
    this.ctx.setPauseLocked(true);
    this.ctx.ui.setModal(`<div class="modal-back"><div class="modal-card panel" role="dialog"><h2>${PLACES.glands}</h2><p>${body}</p><button type="button" class="btn primary" data-action="ok">${TEXT.close}</button></div></div>`);
    this.ctx.ui.modal.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
      this.ctx.closeModal();
      this.ctx.setPauseLocked(false);
    }, { signal: this.stop.signal });
  }

  showVictory(): void {
    if (this.ctx.ui.modal.querySelector('[data-testid="challenge-complete"]')) return;
    this.finished = true;
    this.ctx.setPauseLocked(true);
    const already = this.ctx.save.data.challenges.glands;
    this.ctx.ui.setModal(`
      <div class="modal-back" data-testid="challenge-complete"><div class="modal-card panel" role="dialog">
        <h2>${already ? TEXT.already : TEXT.bravo}</h2>
        <p><strong>${TEXT.glandsGot}.</strong> ${VICTORY.glands}</p>
        <button type="button" class="btn primary" data-action="hub">${TEXT.hubReturn}</button>
      </div></div>`);
    this.ctx.ui.say(VICTORY.glands);
    this.ctx.ui.modal.querySelector('[data-action="hub"]')?.addEventListener('click', () => {
      this.ctx.setPauseLocked(false);
      this.ctx.goto('hub');
    }, { signal: this.stop.signal });
    if (this.ctx.flags.demo) window.setTimeout(() => this.ctx.goto('hub'), 1300);
  }

  getProgress() {
    return { won: this.sim.won, lost: false, progress: this.sim.collected.size, target: 8 };
  }

  update(dt: number): void {
    if (!this.finished) {
      const input = this.ctx.flags.demo ? this.bot(dt) : {
        left: this.ctx.input.frame.left,
        right: this.ctx.input.frame.right,
        jumpHeld: this.ctx.input.frame.jumpHeld,
        jumpPressed: this.ctx.input.frame.jumpPressed,
      };
      this.sim.step(input, dt);
      this.react(this.sim.events);
      if (this.sim.won) {
        this.ctx.grant('glands');
        this.ctx.audio.win();
        this.ctx.buzz([16, 40, 24]);
        this.showVictory();
      }
    }
    this.sync(dt);
  }

  private react(events: SimEvent[]): void {
    for (const event of events) {
      if (event.type === 'jump') {
        this.ctx.audio.jump();
        this.ctx.buzz(12);
      } else if (event.type === 'land') this.ctx.audio.land();
      else if (event.type === 'collect') {
        this.ctx.audio.collect();
        this.ctx.buzz([8, 24, 10]);
        this.sparks?.burst(event.x, event.y, 0.3, 10, '#ffd56a');
        this.capy.setMood('happy');
        window.setTimeout(() => this.capy.setMood('idle'), 500);
        this.refreshCount();
      } else if (event.type === 'bonk') {
        this.ctx.audio.bomb();
        this.ctx.stage.kick(0.12, this.ctx.reduced());
        if (this.ctx.subtitles()) this.ctx.ui.toast(TEXT.oups);
      } else if (event.type === 'respawn' && this.ctx.subtitles()) this.ctx.ui.toast(TEXT.oups);
    }
  }

  private refreshCount(): void {
    if (this.countEl) this.countEl.textContent = `${this.sim.collected.size}/8`;
  }

  private sync(dt: number): void {
    const player = this.sim.player;
    this.capy.root.position.set(player.x, player.y - player.h / 2, 0.35);
    this.capy.turn(player.facing);
    this.capy.update(dt, { speed: Math.abs(player.vx), vy: player.vy, grounded: player.grounded, landed: false });
    for (const [id, model] of this.acorns) {
      model.visible = !this.sim.collected.has(id);
      model.rotation.y += dt * 2;
      model.position.y = (this.sim.level.acorns.find((a) => a.id === id)?.y ?? 1) + Math.sin(this.sim.time * 3 + model.position.x) * 0.06;
    }
    const hazard = this.sim.hazards[0];
    if (this.pumpkin && hazard) {
      this.pumpkin.position.set(hazard.x, hazard.y, 0.3);
      this.pumpkin.rotation.z = Math.sin(this.sim.time * 4) * 0.2;
    }
    if (this.glow) this.glow.intensity = this.sim.collected.size >= 8 ? 2.2 : 0;
    this.sparks?.update(dt, player.x);
    this.ctx.stage.follow(player.x, Math.max(0.6, player.y), 11, player.facing * 1.1);
    for (const plat of this.sim.level.platforms) {
      if (!plat.mover) continue;
      const solid = this.sim.solids.find((s) => s.id === plat.id);
      const land = this.islands.get(plat.id);
      if (solid && land) land.position.y = solid.y + solid.h / 2;
    }
  }

  private bot(dt: number) {
    const intent = acornIntent(this.sim);
    if (intent.jump && this.sim.player.grounded) this.hold = 0.22;
    else this.hold = Math.max(0, this.hold - dt);
    return {
      left: intent.left,
      right: intent.right,
      jumpHeld: this.hold > 0,
      jumpPressed: intent.jump && this.sim.player.grounded,
    };
  }

  unmount(): void {
    this.stop.abort();
    this.ctx.ui.clearHud();
    this.ctx.setPauseLocked(false);
  }
}
