import * as THREE from 'three';
import { AcornSim, acornIntent, sampleLevel } from '../logic/acorn';
import type { SimEvent } from '../logic/types';
import { Capybara, SCENE_LIGHT } from '../render/capybara';
import { Particles } from '../render/particles';
import { groundIsland, PaintedBackdrop } from '../render/painted';
import { paintedProp, type PropSprite } from '../render/props';
import { HELP, PLACES, TEXT, VICTORY } from '../text';
import { hudChrome, wireHud } from '../ui';
import type { GameContext, Scene } from '../context';

export class AcornScene implements Scene {
  readonly id = 'glands' as const;
  readonly challengeId = 'glands' as const;
  private stop = new AbortController();
  private sim = new AcornSim();
  private capy = new Capybara();
  private acorns = new Map<string, PropSprite>();
  private pumpkin: PropSprite | null = null;
  private portal: PropSprite | null = null;
  private glow: THREE.PointLight | null = null;
  private islands = new Map<string, THREE.Object3D>();
  private hold = 0;
  private sparks: Particles | null = null;
  private backdrop: PaintedBackdrop | null = null;
  private finished = false;
  private countEl: HTMLElement | null = null;

  constructor(private readonly ctx: GameContext) {}

  mount(): void {
    this.stop = new AbortController();
    this.sim = new AcornSim();
    if (this.ctx.flags.shot === 'glands') {
      ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].forEach((id) => this.sim.collected.add(id));
      // Stand on the island before the portal so a7, a8 and the gate share the frame.
      this.sim.player.x = 31.43;
      this.sim.player.y = 1.65;
    }
    const { stage, audio, save } = this.ctx;
    stage.clear();
    stage.mood('day');
    stage.paintMode();
    audio.playSong('glands');
    const root = stage.root;
    this.backdrop = new PaintedBackdrop('iles-aux-glands', { span: 22, groundY: 0.02, ground: false, lockMid: false });
    root.add(this.backdrop.group);
    const sampled = sampleLevel(this.sim.level, 0, 0);
    this.sim.level.platforms.forEach((plat, index) => {
      const solid = sampled.solids[index];
      const land = groundIsland('iles-aux-glands', plat.w, 0.18);
      const top = solid ? solid.y + solid.h / 2 : plat.top;
      land.position.set(plat.x, top, 0.43);
      root.add(land);
      this.islands.set(plat.id, land);
    });
    for (const acorn of this.sim.level.acorns) {
      const model = paintedProp('acorn', SCENE_LIGHT.day);
      model.root.position.set(acorn.x, acorn.y - model.height / 2, 0.2);
      root.add(model.root);
      this.acorns.set(acorn.id, model);
    }
    this.pumpkin = paintedProp('pumpkin', SCENE_LIGHT.day);
    root.add(this.pumpkin.root);
    const exitTop = this.sim.level.platforms.at(-1)?.top ?? 0;
    this.portal = paintedProp('portalIdle', SCENE_LIGHT.day);
    this.portal.root.position.set(this.sim.level.exit.x, exitTop, 0.18);
    this.glow = new THREE.PointLight('#ffd56a', 0, 5, 2);
    this.glow.position.set(0, 0.9, 0.2);
    this.portal.root.add(this.glow);
    root.add(this.portal.root);
    this.capy.stage = save.data.stage;
    this.capy.featherGrow = save.data.stage;
    this.capy.setLight(SCENE_LIGHT.day);
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
      } else if (event.type === 'land') {
        this.ctx.audio.land();
        this.ctx.stage.nudge(0.16, this.ctx.reduced());
      } else if (event.type === 'collect') {
        this.ctx.audio.collect();
        this.ctx.buzz([8, 24, 10]);
        this.ctx.stage.impact(0.045, 0.06, this.ctx.reduced());
        this.sparks?.burst(event.x, event.y, 0.3, 12, '#ffd56a');
        this.sparks?.ring(event.x, event.y, 0.3, '#fff1b0');
        this.capy.setMood('happy');
        window.setTimeout(() => this.capy.setMood('idle'), 500);
        this.refreshCount();
      } else if (event.type === 'bonk') {
        this.ctx.audio.bomb();
        this.ctx.stage.impact(0.07, 0.16, this.ctx.reduced());
        this.capy.setMood('wow');
        window.setTimeout(() => this.capy.setMood('idle'), 280);
        if (this.ctx.subtitles()) this.ctx.ui.toast(TEXT.oups);
      } else if (event.type === 'respawn' && this.ctx.subtitles()) this.ctx.ui.toast(TEXT.oups);
    }
  }

  private refreshCount(): void {
    if (this.countEl) {
      this.countEl.textContent = `${this.sim.collected.size}/8`;
      this.countEl.classList.remove('pop');
      void this.countEl.offsetWidth;
      this.countEl.classList.add('pop');
    }
  }

  private sync(dt: number): void {
    const player = this.sim.player;
    this.capy.root.position.set(player.x, player.y - player.h / 2, 0.35);
    this.capy.turn(player.facing);
    this.capy.calm = this.ctx.reduced();
    this.capy.update(dt, { speed: Math.abs(player.vx), vy: player.vy, grounded: player.grounded, landed: false });
    for (const [id, model] of this.acorns) {
      const spec = this.sim.level.acorns.find((a) => a.id === id);
      model.root.visible = !this.sim.collected.has(id);
      const bob = Math.sin(this.sim.time * 3 + model.root.position.x) * 0.06;
      model.root.position.y = (spec?.y ?? 1) - model.height / 2 + bob;
      model.sparkle(this.sim.time + model.root.position.x, model.root.visible ? 1 : 0);
    }
    const hazard = this.sim.hazards[0];
    if (this.pumpkin && hazard) {
      this.pumpkin.root.position.set(hazard.x, hazard.y - hazard.h / 2, 0.3);
      this.pumpkin.root.rotation.z = Math.sin(this.sim.time * 3) * 0.08;
    }
    if (this.glow && this.portal) {
      const open = this.sim.collected.size >= 8;
      this.portal.setFrame(open ? 'portalOpen' : 'portalIdle');
      this.glow.intensity = open ? 1.1 : 0.15;
      const pulse = open ? 1 + Math.sin(this.sim.time * 3.2) * 0.025 : 1;
      this.portal.squash(pulse, pulse);
    }
    this.sparks?.update(dt, player.x);
    const shot = this.backdrop?.place(this.ctx.stage.camera.aspect, player.x + player.facing * 0.22, Math.max(0.62, player.y * 0.55));
    if (shot) {
      // The showcase stands near the portal. Pull back so the last two acorns and the gate fit.
      const distance = this.ctx.flags.shot === 'glands' ? Math.max(shot.distance, 18) : shot.distance;
      this.ctx.stage.follow(shot.x, shot.y, distance, 0);
    }
    this.backdrop?.sync(this.ctx.stage.camera, dt, this.ctx.reduced());
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
